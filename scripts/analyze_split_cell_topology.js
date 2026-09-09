const fs = require('fs');
const crypto = require('crypto');

const VISUAL_W = 4096;
const VISUAL_H = 2048;
const SIM_W = 1024;
const SIM_H = 512;

const visualMask = Buffer.from(fs.readFileSync('../client/src/assets/world_visual_mask.bin'));
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const constraints = JSON.parse(fs.readFileSync('../server/assets/world_topology_constraints.json', 'utf8'));
const v5_2 = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_2.bin'));

function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersects(A, B, C, D) {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function lonLatToVisual(lon, lat) {
    const rawX = (lon + 180) / 360 * VISUAL_W;
    const rawY = (90 - lat) / 180 * VISUAL_H;
    return { x: rawX, y: rawY };
}

// Prepare semantic constraints
let segments = [];
for (const c of constraints) {
    if (!c.enabled) continue;
    for (const seg of c.segments) {
        segments.push({ A: lonLatToVisual(seg[0][0], seg[0][1]), B: lonLatToVisual(seg[1][0], seg[1][1]), cid: c.id });
    }
}

// Micro adjacency
// A and B are adjacent visual pixels. Does any segment cut them?
function isMicroAdjacencyCut(x1, y1, x2, y2) {
    const C = { x: x1 + 0.5, y: y1 + 0.5 };
    const D = { x: x2 + 0.5, y: y2 + 0.5 };
    let minx = Math.min(x1, x2) - 1; let maxx = Math.max(x1, x2) + 2;
    let miny = Math.min(y1, y2) - 1; let maxy = Math.max(y1, y2) + 2;
    
    // Quick bounding box check is hard since segments could be long.
    for (const seg of segments) {
        if (intersects(seg.A, seg.B, C, D)) return true;
    }
    return false;
}

// For Bering straight wrap
function isMicroAdjacencyCutWrapped(x1, y1, x2, y2) {
    // If x1 and x2 wrap
    let wrapped = false;
    let cx1 = x1, cx2 = x2;
    if (Math.abs(x1 - x2) > VISUAL_W / 2) {
        if (x1 > x2) cx2 += VISUAL_W;
        else cx1 += VISUAL_W;
    }
    const C = { x: cx1 + 0.5, y: y1 + 0.5 };
    const D = { x: cx2 + 0.5, y: y2 + 0.5 };
    for (const seg of segments) {
        let sA = {x: seg.A.x, y: seg.A.y}, sB = {x: seg.B.x, y: seg.B.y};
        if (Math.abs(sA.x - sB.x) > VISUAL_W / 2) {
            if (sA.x > sB.x) sB.x += VISUAL_W;
            else sA.x += VISUAL_W;
        }
        // Test intersection both normally and shifted by W
        if (intersects(sA, sB, C, D)) return true;
        sA.x -= VISUAL_W; sB.x -= VISUAL_W;
        if (intersects(sA, sB, C, D)) return true;
        sA.x += 2*VISUAL_W; sB.x += 2*VISUAL_W;
        if (intersects(sA, sB, C, D)) return true;
    }
    return false;
}

// 4. COARSE CELL LOCAL COMPONENTS
let coarseCells = new Array(SIM_W * SIM_H).fill(null);
let totalSupportLand = 0;
let normalCells = 0;
let splitCells = 0;
let totalPieces = 0;

let piecesPerCellHist = new Map();
let pieceAreaHist = new Map();

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        if (simGrid[sIdx] !== 0) continue; // Only process support land cells
        totalSupportLand++;
        
        let localLandPx = [];
        let localGrid = []; // 4x4 array of piece IDs
        for (let i = 0; i < 16; i++) localGrid[i] = -1;
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                let vx = x * 4 + dx;
                let vy = y * 4 + dy;
                if (visualMask[vy * VISUAL_W + vx] >= 128) {
                    localLandPx.push({dx, dy, vx, vy});
                }
            }
        }
        
        // Find local components
        let pieces = [];
        for (const px of localLandPx) {
            if (localGrid[px.dy * 4 + px.dx] === -1) {
                let pieceId = pieces.length;
                let q = [px];
                localGrid[px.dy * 4 + px.dx] = pieceId;
                let area = 0;
                let mask = 0;
                let head = 0;
                
                while(head < q.length) {
                    let curr = q[head++];
                    area++;
                    mask |= (1 << (curr.dy * 4 + curr.dx));
                    
                    const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
                    for (const [ddx, ddy] of dirs) {
                        let nx = curr.dx + ddx;
                        let ny = curr.dy + ddy;
                        if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4) {
                            if (localGrid[ny * 4 + nx] === -1 && visualMask[(curr.vy + ddy) * VISUAL_W + (curr.vx + ddx)] >= 128) {
                                // check micro cut
                                if (!isMicroAdjacencyCut(curr.vx, curr.vy, curr.vx + ddx, curr.vy + ddy)) {
                                    localGrid[ny * 4 + nx] = pieceId;
                                    q.push({dx: nx, dy: ny, vx: curr.vx + ddx, vy: curr.vy + ddy});
                                }
                            }
                        }
                    }
                }
                pieces.push({ pieceId, area, mask });
            }
        }
        
        if (pieces.length === 1) normalCells++;
        else if (pieces.length >= 2) splitCells++;
        
        totalPieces += pieces.length;
        piecesPerCellHist.set(pieces.length, (piecesPerCellHist.get(pieces.length) || 0) + 1);
        
        for (const p of pieces) {
            pieceAreaHist.set(p.area, (pieceAreaHist.get(p.area) || 0) + 1);
        }
        
        coarseCells[sIdx] = { pieces, localGrid };
    }
}

// 9. GLOBAL PIECE GRAPH
let globalNodes = [];
let nodeLookup = new Map(); // "simIdx_pieceId" -> globalNodeIdx

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell) continue;
        for (const p of cell.pieces) {
            let nIdx = globalNodes.length;
            globalNodes.push({ simIdx: sIdx, x, y, localPieceId: p.pieceId, mask: p.mask, area: p.area, edges: [], globalCompId: -1 });
            nodeLookup.set(`${sIdx}_${p.pieceId}`, nIdx);
        }
    }
}

let totalEdges = 0;

// Connect nodes
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell) continue;
        
        // East connection
        let eIdx = y * SIM_W + ((x + 1) % SIM_W);
        let eCell = coarseCells[eIdx];
        if (eCell) {
            for (let dy = 0; dy < 4; dy++) {
                let pxA = cell.localGrid[dy * 4 + 3];
                let pxB = eCell.localGrid[dy * 4 + 0];
                if (pxA !== -1 && pxB !== -1) {
                    let vxA = x * 4 + 3;
                    let vxB = ((x + 1) % SIM_W) * 4 + 0;
                    let vy = y * 4 + dy;
                    if (!isMicroAdjacencyCutWrapped(vxA, vy, vxB, vy)) {
                        let nA = nodeLookup.get(`${sIdx}_${pxA}`);
                        let nB = nodeLookup.get(`${eIdx}_${pxB}`);
                        if (nA !== undefined && nB !== undefined && !globalNodes[nA].edges.includes(nB)) {
                            globalNodes[nA].edges.push(nB);
                            globalNodes[nB].edges.push(nA);
                            totalEdges++;
                        }
                    }
                }
            }
        }
        
        // South connection
        if (y < SIM_H - 1) {
            let sIdx2 = (y + 1) * SIM_W + x;
            let sCell = coarseCells[sIdx2];
            if (sCell) {
                for (let dx = 0; dx < 4; dx++) {
                    let pxA = cell.localGrid[3 * 4 + dx];
                    let pxB = sCell.localGrid[0 * 4 + dx];
                    if (pxA !== -1 && pxB !== -1) {
                        let vx = x * 4 + dx;
                        let vyA = y * 4 + 3;
                        let vyB = (y + 1) * 4 + 0;
                        if (!isMicroAdjacencyCutWrapped(vx, vyA, vx, vyB)) {
                            let nA = nodeLookup.get(`${sIdx}_${pxA}`);
                            let nB = nodeLookup.get(`${sIdx2}_${pxB}`);
                            if (nA !== undefined && nB !== undefined && !globalNodes[nA].edges.includes(nB)) {
                                globalNodes[nA].edges.push(nB);
                                globalNodes[nB].edges.push(nA);
                                totalEdges++;
                            }
                        }
                    }
                }
            }
        }
    }
}

// 10. PIECE GRAPH CONNECTED COMPONENTS
let currentGlobalComp = 0;
let compSizes = {};

for (let i = 0; i < globalNodes.length; i++) {
    if (globalNodes[i].globalCompId === -1) {
        let q = [i];
        globalNodes[i].globalCompId = currentGlobalComp;
        let head = 0;
        let count = 0;
        while(head < q.length) {
            let u = q[head++];
            count++;
            for (const v of globalNodes[u].edges) {
                if (globalNodes[v].globalCompId === -1) {
                    globalNodes[v].globalCompId = currentGlobalComp;
                    q.push(v);
                }
            }
        }
        compSizes[currentGlobalComp] = count;
        currentGlobalComp++;
    }
}

// 11. SAME-CELL MULTI-GLOBAL-COMPONENT
let diffGlobal = 0, sameGlobalDisconnected = 0, semanticSplit = 0;

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (cell && cell.pieces.length >= 2) {
            let compIds = new Set();
            for (const p of cell.pieces) {
                compIds.add(globalNodes[nodeLookup.get(`${sIdx}_${p.pieceId}`)].globalCompId);
            }
            if (compIds.size > 1) {
                diffGlobal++;
            } else {
                // Same global comp, but why are they split locally? 
                // Let's check if there is a semantic separator inside the cell that caused the split.
                let hasInternalSemanticCut = false;
                for (let pA of cell.pieces) {
                    for (let pB of cell.pieces) {
                        if (pA.pieceId < pB.pieceId) {
                            // Find any adjacent pixels between the two pieces
                            for(let dy=0; dy<4; dy++){
                                for(let dx=0; dx<4; dx++){
                                    if(cell.localGrid[dy*4+dx] === pA.pieceId) {
                                        let curr_vx = x*4 + dx, curr_vy = y*4 + dy;
                                        const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
                                        for (const [ddx, ddy] of dirs) {
                                            let nx = dx + ddx, ny = dy + ddy;
                                            if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4) {
                                                if (cell.localGrid[ny*4+nx] === pB.pieceId) {
                                                    let next_vx = x*4 + nx, next_vy = y*4 + ny;
                                                    if (isMicroAdjacencyCut(curr_vx, curr_vy, next_vx, next_vy)) {
                                                        hasInternalSemanticCut = true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                if (hasInternalSemanticCut) {
                    semanticSplit++;
                } else {
                    sameGlobalDisconnected++; // Same global comp, disconnected locally by water (diagonals, etc.)
                }
            }
        }
    }
}

// 12. OWNERSHIP AMBIGUITY
let ownershipAmbiguousCells = splitCells;
let semanticOwnershipAmbiguousCells = semanticSplit; // Simplified approximation

// 13. NAMED SUBCELL REGIONS
const straits = {
    "Dover": { lon: 1.5, lat: 51.0 }, 
    "Gibraltar": { lon: -5.5, lat: 36.0 }, 
    "Bosphorus": { lon: 29.0, lat: 41.05 },
    "Dardanelles": { lon: 26.3, lat: 40.1 },
    "Bab-el-Mandeb": { lon: 43.5, lat: 12.5 }, 
    "Bering Strait": { lon: 180.0, lat: 66.0 }, 
    "Malacca": { lon: 101.5, lat: 2.5 }, 
    "Taiwan Strait": { lon: 120.0, lat: 25.0 }, 
    "Korea Strait": { lon: 129.8, lat: 34.5 }, 
    "Messina": { lon: 15.5, lat: 38.2 }, 
    "Bonifacio": { lon: 9.1, lat: 41.3 }, 
    "Irish Sea": { lon: -5.0, lat: 53.5 }, 
    "Cook Strait": { lon: 174.2, lat: -41.2 }, 
};

function getCoarse(lon, lat) {
    const rawX = (lon + 180) / 360 * SIM_W;
    const rawY = (90 - lat) / 180 * SIM_H;
    return { x: Math.floor(rawX), y: Math.floor(rawY) };
}

let straitStats = {};
for (const [name, pos] of Object.entries(straits)) {
    let cp = getCoarse(pos.lon, pos.lat);
    // Find nearby split cells
    let affected = 0;
    let tPieces = 0;
    let mxPieces = 0;
    let masks = [];
    for(let dy = -5; dy <= 5; dy++) {
        for(let dx = -5; dx <= 5; dx++) {
            let cy = cp.y + dy;
            let cx = ((cp.x + dx) % SIM_W + SIM_W) % SIM_W;
            if(cy >= 0 && cy < SIM_H) {
                let sIdx = cy * SIM_W + cx;
                let cell = coarseCells[sIdx];
                if(cell && cell.pieces.length >= 2) {
                    affected++;
                    tPieces += cell.pieces.length;
                    mxPieces = Math.max(mxPieces, cell.pieces.length);
                    masks.push(cell.pieces.map(p => p.mask.toString(2).padStart(16, '0')).join(', '));
                }
            }
        }
    }
    straitStats[name] = { affected, tPieces, mxPieces, masks: masks.slice(0, 2) };
}

// 15. V5.2 NORMAL-CELL COMPATIBILITY
let normNormComps = 0;
let matches = 0;
let mismatches = 0;

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell || cell.pieces.length !== 1) continue;
        
        let eIdx = y * SIM_W + ((x + 1) % SIM_W);
        let eCell = coarseCells[eIdx];
        if (eCell && eCell.pieces.length === 1) {
            normNormComps++;
            let v52_open = (v5_2[sIdx] & 2) !== 0;
            let pg_open = false;
            let nA = nodeLookup.get(`${sIdx}_0`);
            let nB = nodeLookup.get(`${eIdx}_0`);
            if (nA !== undefined && nB !== undefined && globalNodes[nA].edges.includes(nB)) {
                pg_open = true;
            }
            if (v52_open === pg_open) matches++;
            else mismatches++;
        }
        
        if (y < SIM_H - 1) {
            let sIdx2 = (y + 1) * SIM_W + x;
            let sCell = coarseCells[sIdx2];
            if (sCell && sCell.pieces.length === 1) {
                normNormComps++;
                let v52_open = (v5_2[sIdx] & 4) !== 0;
                let pg_open = false;
                let nA = nodeLookup.get(`${sIdx}_0`);
                let nB = nodeLookup.get(`${sIdx2}_0`);
                if (nA !== undefined && nB !== undefined && globalNodes[nA].edges.includes(nB)) {
                    pg_open = true;
                }
                if (v52_open === pg_open) matches++;
                else mismatches++;
            }
        }
    }
}

// Prepare JSON
let results = {
    global: {
        totalSupportLand, normalCells, splitCells, splitPct: (splitCells / totalSupportLand * 100).toFixed(2),
        totalPieces, extraPieces: totalPieces - totalSupportLand, maxPiecesPerCell: Math.max(...Array.from(piecesPerCellHist.keys()))
    },
    hist: {
        pieces: Object.fromEntries(piecesPerCellHist),
        area: Object.fromEntries(pieceAreaHist)
    },
    splitClassification: { diffGlobal, sameGlobalDisconnected, semanticSplit },
    ownershipAmbiguity: { cells: ownershipAmbiguousCells, semanticCells: semanticOwnershipAmbiguousCells },
    straits: straitStats,
    graph: {
        nodes: globalNodes.length, edges: totalEdges, components: currentGlobalComp,
        largest20: Object.values(compSizes).sort((a,b)=>b-a).slice(0,20)
    },
    v52_compat: {
        comparisons: normNormComps, matches, mismatches
    }
};

fs.writeFileSync('split_cell_topology_analysis.json', JSON.stringify(results, null, 2));

// PRINT FOR FINAL REPORT
console.log(`GLOBAL:`);
console.log(`support land cells = ${totalSupportLand}`);
console.log(`normal cells = ${normalCells}`);
console.log(`split cells = ${splitCells}`);
console.log(`split %= ${results.global.splitPct}%`);

console.log(`\nPIECES:`);
console.log(`total pieces = ${totalPieces}`);
console.log(`extra pieces = ${results.global.extraPieces}`);
console.log(`max pieces/cell = ${results.global.maxPiecesPerCell}`);

console.log(`\nPIECE COUNT HISTOGRAM:`);
console.log(`| Pieces | Count |`);
console.log(`|---|---|`);
for(let i=1; i<=results.global.maxPiecesPerCell; i++) {
    console.log(`| ${i} | ${piecesPerCellHist.get(i) || 0} |`);
}

console.log(`\nPIECE AREA HISTOGRAM:`);
console.log(`| Area (pixels) | Count |`);
console.log(`|---|---|`);
let total1=0, total2=0, total3=0, total4plus=0;
for(let i=1; i<=16; i++) {
    let count = pieceAreaHist.get(i) || 0;
    if(i===1) total1 += count;
    else if(i===2) total2 += count;
    else if(i===3) total3 += count;
    else total4plus += count;
}
console.log(`| 1 | ${total1} |`);
console.log(`| 2 | ${total2} |`);
console.log(`| 3 | ${total3} |`);
console.log(`| >=4 | ${total4plus} |`);

console.log(`\nSPLIT CLASSIFICATION:`);
console.log(`different-global-component = ${diffGlobal}`);
console.log(`same-global-component = ${sameGlobalDisconnected}`);
console.log(`semantic-separator = ${semanticSplit}`);

console.log(`\nOWNERSHIP AMBIGUITY:`);
console.log(`cells = ${ownershipAmbiguousCells}`);
console.log(`semantic cells = ${semanticOwnershipAmbiguousCells}`);

console.log(`\nNAMED STRAITS:`);
console.log(`| Strait | affected coarse cell count | total pieces | max pieces/cell | sample piece masks |`);
console.log(`|---|---|---|---|---|`);
for (const [name, s] of Object.entries(straitStats)) {
    console.log(`| ${name} | ${s.affected} | ${s.tPieces} | ${s.mxPieces} | ${s.masks.join('; ')} |`);
}

console.log(`\nGLOBAL PIECE GRAPH:`);
console.log(`nodes = ${globalNodes.length}`);
console.log(`edges = ${totalEdges}`);
console.log(`components = ${currentGlobalComp}`);
console.log(`largest20 = ${results.graph.largest20.join(', ')}`);

console.log(`\nV5.2 NORMAL-CELL COMPATIBILITY:`);
console.log(`comparisons = ${normNormComps}`);
console.log(`matches = ${matches}`);
console.log(`mismatches = ${mismatches}`);

// MEMORY ESTIMATE
// coarse cell index: 4 bytes
// piece count: 1 byte
// per piece mask: 2 bytes
// per piece owner: 1 byte
// topology neighbor references: average ~2.5 edges per piece, 4 bytes each = 10 bytes
let staticPerPiece = 2 + 10; 
let statePerPiece = 1;
let staticTopBytes = splitCells * 5 + (totalPieces - normalCells) * staticPerPiece; 
let ownerStateBytes = splitCells * 5 + (totalPieces - normalCells) * statePerPiece; 
console.log(`\nMEMORY ESTIMATE:`);
console.log(`static topology = ~${(staticTopBytes/1024).toFixed(1)} KB`);
console.log(`owner state = ~${(ownerStateBytes/1024).toFixed(1)} KB`);
console.log(`total = ~${((staticTopBytes + ownerStateBytes)/1024).toFixed(1)} KB`);

let splitOwBytes = splitCells * 6; 
console.log(`\nNETWORK ESTIMATE:`);
console.log(`full split snapshot = ~${(splitOwBytes/1024).toFixed(1)} KB`);
console.log(`1% delta = ~${Math.ceil((splitCells * 0.01) * 6)} bytes`);
console.log(`5% delta = ~${Math.ceil((splitCells * 0.05) * 6)} bytes`);
console.log(`10% delta = ~${Math.ceil((splitCells * 0.10) * 6)} bytes`);

// CLIENT OPTIONS
let fullTexture = 4096 * 2048; // 8MB
let sparseBlock = splitCells * 16; 
console.log(`\nCLIENT OPTIONS:`);
console.log(`4096 R8 = ${fullTexture} bytes (8MB)`);
console.log(`sparse blocks = ~${sparseBlock} bytes`);
console.log(`recommendation = Sparse blocks (via SSBO or UBO) is significantly more memory efficient.`);
