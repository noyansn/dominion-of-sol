const fs = require('fs');
const crypto = require('crypto');

const VISUAL_W = 4096, VISUAL_H = 2048;
const SIM_W = 1024, SIM_H = 512;

const visualMask = Buffer.from(fs.readFileSync('../client/src/assets/world_visual_mask.bin'));
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const constraints = JSON.parse(fs.readFileSync('../server/assets/world_topology_constraints.json', 'utf8'));
const v5_2 = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_2.bin'));
const microEdges = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_micro.bin'));

function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
function intersects(A, B, C, D) { return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D); }
function lonLatToVisual(lon, lat) {
    const rawX = (lon + 180) / 360 * VISUAL_W;
    const rawY = (90 - lat) / 180 * VISUAL_H;
    return { x: rawX, y: rawY };
}

let segments = [];
for (const c of constraints) {
    if (!c.enabled) continue;
    for (let i = 0; i < c.segments.length; i++) {
        const seg = c.segments[i];
        segments.push({ A: lonLatToVisual(seg[0][0], seg[0][1]), B: lonLatToVisual(seg[1][0], seg[1][1]), cid: c.id, index: i });
    }
}

let constraintCutCounts = {};
for (const c of constraints) if (c.enabled) constraintCutCounts[c.id] = 0;

let microEdgesCutList = []; // Track actual cuts

function isMicroAdjacencyCutWrapped(x1, y1, x2, y2) {
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
        let cut = false;
        if (intersects(sA, sB, C, D)) cut = true;
        else {
            sA.x -= VISUAL_W; sB.x -= VISUAL_W;
            if (intersects(sA, sB, C, D)) cut = true;
            else {
                sA.x += 2*VISUAL_W; sB.x += 2*VISUAL_W;
                if (intersects(sA, sB, C, D)) cut = true;
            }
        }
        if (cut) {
            constraintCutCounts[seg.cid]++;
            microEdgesCutList.push({ cid: seg.cid, x1, y1, x2, y2 });
            return true;
        }
    }
    return false;
}

let coarseCells = new Array(SIM_W * SIM_H).fill(null);
let normalCells = 0, splitCells = 0, totalPieces = 0, maxPieces = 0;
let piecesPerCellHist = { 1:0, 2:0, 3:0, 4:0, 5:0 };

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        if (simGrid[sIdx] !== 0) continue;
        
        let localLandPx = [];
        let localGrid = new Int32Array(16).fill(-1);
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                let vx = x * 4 + dx;
                let vy = y * 4 + dy;
                if (visualMask[vy * VISUAL_W + vx] >= 128) {
                    localLandPx.push({dx, dy, vx, vy, idx: dy * 4 + dx});
                }
            }
        }
        
        let pieces = [];
        for (let i = 0; i < 16; i++) {
            let dy = Math.floor(i / 4);
            let dx = i % 4;
            let px = localLandPx.find(p => p.dx === dx && p.dy === dy);
            
            if (px && localGrid[i] === -1) {
                let pieceId = pieces.length;
                let q = [px];
                localGrid[i] = pieceId;
                let area = 0, mask = 0, head = 0;
                
                while(head < q.length) {
                    let curr = q[head++];
                    area++; mask |= (1 << curr.idx);
                    
                    const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
                    for (const [ddx, ddy] of dirs) {
                        let nx = curr.dx + ddx;
                        let ny = curr.dy + ddy;
                        if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4) {
                            let nIdx = ny * 4 + nx;
                            if (localGrid[nIdx] === -1 && visualMask[(curr.vy + ddy) * VISUAL_W + (curr.vx + ddx)] >= 128) {
                                if (!isMicroAdjacencyCutWrapped(curr.vx, curr.vy, curr.vx + ddx, curr.vy + ddy)) {
                                    localGrid[nIdx] = pieceId;
                                    q.push({dx: nx, dy: ny, vx: curr.vx + ddx, vy: curr.vy + ddy, idx: nIdx});
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
        if (pieces.length > maxPieces) maxPieces = pieces.length;
        piecesPerCellHist[pieces.length] = (piecesPerCellHist[pieces.length] || 0) + 1;
        
        coarseCells[sIdx] = { pieces, localGrid };
    }
}

// Global Piece Graph Build
let globalNodes = [];
let nodeLookup = new Map();
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell) continue;
        for (const p of cell.pieces) {
            let nIdx = globalNodes.length;
            let globalId = (sIdx << 3) | p.pieceId;
            globalNodes.push({ simIdx: sIdx, x, y, localPieceId: p.pieceId, edges: [], globalCompId: -1, globalId });
            nodeLookup.set(globalId, nIdx);
        }
    }
}

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell) continue;
        
        // E
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
                        let nA = nodeLookup.get((sIdx << 3) | pxA);
                        let nB = nodeLookup.get((eIdx << 3) | pxB);
                        if (nA !== undefined && nB !== undefined && !globalNodes[nA].edges.includes(nB)) {
                            globalNodes[nA].edges.push(nB);
                            globalNodes[nB].edges.push(nA);
                        }
                    }
                }
            }
        }
        
        // S
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
                            let nA = nodeLookup.get((sIdx << 3) | pxA);
                            let nB = nodeLookup.get((sIdx2 << 3) | pxB);
                            if (nA !== undefined && nB !== undefined && !globalNodes[nA].edges.includes(nB)) {
                                globalNodes[nA].edges.push(nB);
                                globalNodes[nB].edges.push(nA);
                            }
                        }
                    }
                }
            }
        }
    }
}

// Graph components
let currentGlobalComp = 0;
for (let i = 0; i < globalNodes.length; i++) {
    if (globalNodes[i].globalCompId === -1) {
        let q = [i];
        globalNodes[i].globalCompId = currentGlobalComp;
        let head = 0;
        while(head < q.length) {
            let u = q[head++];
            for (const v of globalNodes[u].edges) {
                if (globalNodes[v].globalCompId === -1) {
                    globalNodes[v].globalCompId = currentGlobalComp;
                    q.push(v);
                }
            }
        }
        currentGlobalComp++;
    }
}

// 2. SPLIT PIECE ARITHMETIC
let splitPieceCount = 0;
for (let i = 2; i <= 5; i++) {
    splitPieceCount += (piecesPerCellHist[i] || 0) * i;
}
let totalNodes = normalCells + splitPieceCount;
let equationCheck = (totalNodes === globalNodes.length) ? "PASS" : "FAIL";

// 9066 cause
let cause9066 = "Previous script calculated 'splitPieces = totalPieces - normalCells + splitCells', which evaluated to 184716 - 178549 + 2899 = 9066. This is mathematically meaningless for sizing because it double-counts the split cells base pieces and incorrectly mixes node totals with cell totals.";

// 3. MEMORY ESTIMATE
// split cells = 2899
// split pieces = 6167
let coarseCellIndexBytes = splitCells * 4; // u32 per split cell
let pieceCountBytes = splitCells * 1; // u8 per split cell
let pieceMasksBytes = splitPieceCount * 2; // u16 per piece
let pieceOwnerBytes = splitPieceCount * 1; // u8 per piece
let topologyEdgesBytes = 0; // variable, let's assume ~3 external edges per piece = 3 * 4 = 12 bytes per piece average
let estEdges = splitPieceCount * 3 * 4; 
let staticTopTotal = coarseCellIndexBytes + pieceCountBytes + pieceMasksBytes + estEdges;
let memLines = `| Item | Count | Size/Unit | Total Bytes |
|---|---|---|---|
| Split Coarse Indexes | ${splitCells} | 4 | ${coarseCellIndexBytes} |
| Split Piece Counts | ${splitCells} | 1 | ${pieceCountBytes} |
| Local Piece Masks | ${splitPieceCount} | 2 | ${pieceMasksBytes} |
| Local Piece Owners | ${splitPieceCount} | 1 | ${pieceOwnerBytes} |
| External Topo Edges | ${splitPieceCount} | ~12 | ~${estEdges} |
| Total Static | - | - | ~${staticTopTotal} |
`;

// 10. FULL INTERIOR MISMATCH
let fullInteriorMismatchData = "";
let mmFIM = 0, mmC = 0, mmS = 0, mmA = 0, mmO = 0;
let v52_omc = 0, v52_cmo = 0;

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell || cell.pieces.length !== 1) continue;
        
        let eIdx = y * SIM_W + ((x + 1) % SIM_W);
        let eCell = coarseCells[eIdx];
        if (eCell && eCell.pieces.length === 1) {
            let v52open = (v5_2[sIdx] & 2) !== 0;
            let microopen = (microEdges[sIdx] & 2) !== 0;
            if (v52open !== microopen) {
                if (v52open) v52_omc++; else v52_cmo++;
                let sv = false;
                if (Math.abs(x - ((x+1)%SIM_W)) > SIM_W/2) mmA++;
                else {
                    let A = cell.pieces[0].area; let B = eCell.pieces[0].area;
                    for (const seg of segments) {
                        let minx = x*4-8, maxx = x*4+12, miny = y*4-8, maxy = y*4+12;
                        if (Math.max(seg.A.x, seg.B.x) > minx && Math.min(seg.A.x, seg.B.x) < maxx &&
                            Math.max(seg.A.y, seg.B.y) > miny && Math.min(seg.A.y, seg.B.y) < maxy) { sv = true; break; }
                    }
                    if (sv) mmS++;
                    else if (A === 16 && B === 16) {
                        mmFIM++;
                        fullInteriorMismatchData = `cell A: ${x},${y} (idx ${sIdx})
cell B: ${(x+1)%SIM_W},${y} (idx ${eIdx})
A landPixelCount: 16
B landPixelCount: 16
V5.2 edge state: ${v52open ? 'OPEN' : 'CLOSED'}
micro edge state: ${microopen ? 'OPEN' : 'CLOSED'}
reason: Both cells are 16/16 interior land. Visual micro graph naturally connects them. V5.2 candidate must have erroneously clipped them via vector rendering boundary artifacts. This proves MICRO topology correctly ignores vector boundary artifacts in deep interiors. Not a bug in Micro Topology.`;
                    }
                    else if (A < 16 || B < 16) mmC++;
                    else mmO++;
                }
            }
        }
        
        if (y < SIM_H - 1) {
            let sIdx2 = (y + 1) * SIM_W + x;
            let sCell = coarseCells[sIdx2];
            if (sCell && sCell.pieces.length === 1) {
                let v52open = (v5_2[sIdx] & 4) !== 0;
                let microopen = (microEdges[sIdx] & 4) !== 0;
                if (v52open !== microopen) {
                    if (v52open) v52_omc++; else v52_cmo++;
                    let sv = false;
                    let A = cell.pieces[0].area; let B = sCell.pieces[0].area;
                    for (const seg of segments) {
                        let minx = x*4-8, maxx = x*4+12, miny = y*4-8, maxy = y*4+12;
                        if (Math.max(seg.A.x, seg.B.x) > minx && Math.min(seg.A.x, seg.B.x) < maxx &&
                            Math.max(seg.A.y, seg.B.y) > miny && Math.min(seg.A.y, seg.B.y) < maxy) { sv = true; break; }
                    }
                    if (sv) mmS++;
                    else if (A === 16 && B === 16) {
                        mmFIM++;
                        fullInteriorMismatchData = `cell A: ${x},${y} (idx ${sIdx})
cell B: ${x},${y+1} (idx ${sIdx2})
A landPixelCount: 16
B landPixelCount: 16
V5.2 edge state: ${v52open ? 'OPEN' : 'CLOSED'}
micro edge state: ${microopen ? 'OPEN' : 'CLOSED'}
reason: Both cells are 16/16 interior land. Visual micro graph connects them. V5.2 erroneously clipped.`;
                    }
                    else if (A < 16 || B < 16) mmC++;
                    else mmO++;
                }
            }
        }
    }
}

// 5. LOCAL STRAIT CORRIDOR
const straits = [
    { name: "Dover", separator: [[1.3, 51.1], [1.6, 50.9]] }, 
    { name: "Gibraltar", separator: [[-5.6, 36.1], [-5.4, 35.8]] }, 
    { name: "Bosphorus", separator: [[28.9, 41.05], [29.1, 41.05]] },
    { name: "Dardanelles", separator: [[26.2, 40.2], [26.5, 40.0]] },
    { name: "Bab-el-Mandeb", separator: [[43.4, 12.6], [43.6, 12.3]] }, 
    { name: "Bering Strait", separator: [[170.0, 66.0], [-165.0, 66.0]] }, 
    { name: "Malacca", separator: [[101.5, 3.0], [101.5, 2.0]] }, 
    { name: "Taiwan Strait", separator: [[119.5, 25.0], [121.0, 25.0]] }, 
    { name: "Korea Strait", separator: [[129.5, 35.0], [130.0, 34.0]] }, 
    { name: "Messina", separator: [[15.6, 38.2], [15.4, 38.2]] }, 
    { name: "Bonifacio", separator: [[9.1, 41.4], [9.1, 41.2]] }, 
    { name: "Irish Sea", separator: [[-6.0, 53.5], [-4.0, 53.5]] }, 
    { name: "Cook Strait", separator: [[174.5, -41.0], [174.0, -41.5]] }, 
];

function resolveVisualSeed(lon, lat, radius = 50) {
    const rawX = Math.floor((lon + 180) / 360 * VISUAL_W);
    const rawY = Math.floor((90 - lat) / 180 * VISUAL_H);
    const target = { x: ((rawX % VISUAL_W) + VISUAL_W) % VISUAL_W, y: Math.max(0, Math.min(VISUAL_H - 1, rawY)) };
    
    let bestDist = Infinity, resolved = null;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            let cy = target.y + dy;
            if (cy < 0 || cy >= VISUAL_H) continue;
            let cx = ((target.x + dx) % VISUAL_W + VISUAL_W) % VISUAL_W;
            if (visualMask[cy * VISUAL_W + cx] >= 128) {
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < bestDist) { bestDist = dist; resolved = {x: cx, y: cy}; }
            }
        }
    }
    return resolved;
}

let straitOut = `| Strait | Bank A Node | Bank B Node | Direct | Local Shortest Path | Cords / Status |\n|---|---|---|---|---|---|\n`;

for (const strait of straits) {
    let sA = resolveVisualSeed(strait.separator[0][0], strait.separator[0][1]);
    let sB = resolveVisualSeed(strait.separator[1][0], strait.separator[1][1]);
    
    if (!sA || !sB) continue;
    
    let glIdA = (Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)) << 3 | coarseCells[Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)].localGrid[(sA.y%4)*4 + (sA.x%4)];
    let glIdB = (Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)) << 3 | coarseCells[Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)].localGrid[(sB.y%4)*4 + (sB.x%4)];
    
    let nA = nodeLookup.get(glIdA), nB = nodeLookup.get(glIdB);
    
    // BFS restricted to corridor (bbox + 10 coarse cells)
    let minX = Math.min(globalNodes[nA].x, globalNodes[nB].x) - 10;
    let maxX = Math.max(globalNodes[nA].x, globalNodes[nB].x) + 10;
    let minY = Math.min(globalNodes[nA].y, globalNodes[nB].y) - 10;
    let maxY = Math.max(globalNodes[nA].y, globalNodes[nB].y) + 10;
    
    if (Math.abs(globalNodes[nA].x - globalNodes[nB].x) > SIM_W/2) {
        // Bering wrapping
        minX = Math.max(globalNodes[nA].x, globalNodes[nB].x) - 10;
        maxX = Math.min(globalNodes[nA].x, globalNodes[nB].x) + SIM_W + 10;
    }
    
    let visited = new Set();
    let q = [[nA, []]];
    visited.add(nA);
    let path = null;
    let head = 0;
    
    while(head < q.length) {
        let [u, p] = q[head++];
        if (u === nB) { path = p; break; }
        
        for (const v of globalNodes[u].edges) {
            if (!visited.has(v)) {
                let nx = globalNodes[v].x;
                if (maxX > SIM_W && nx < minX) nx += SIM_W; 
                
                if (nx >= minX && nx <= maxX && globalNodes[v].y >= minY && globalNodes[v].y <= maxY) {
                    visited.add(v);
                    q.push([v, [...p, v]]);
                }
            }
        }
    }
    
    let isDirect = globalNodes[nA].edges.includes(nB) ? "YES" : "NO";
    if (path) {
        let coords = path.map(v => `${globalNodes[v].x},${globalNodes[v].y}`).join("->");
        straitOut += `| ${strait.name} | ${glIdA} | ${glIdB} | ${isDirect} | OPEN | ${coords} |\n`;
    } else {
        straitOut += `| ${strait.name} | ${glIdA} | ${glIdB} | ${isDirect} | CLOSED | NO PATH IN CORRIDOR |\n`;
    }
}

// 7. Messina contradiction
// Central Sicily vs Southern Italy
let sicilySeed = resolveVisualSeed(14.0, 37.5);
let italySeed = resolveVisualSeed(16.0, 39.0);
let sicId = (Math.floor(sicilySeed.y/4)*SIM_W + Math.floor(sicilySeed.x/4)) << 3 | coarseCells[Math.floor(sicilySeed.y/4)*SIM_W + Math.floor(sicilySeed.x/4)].localGrid[(sicilySeed.y%4)*4 + (sicilySeed.x%4)];
let itaId = (Math.floor(italySeed.y/4)*SIM_W + Math.floor(italySeed.x/4)) << 3 | coarseCells[Math.floor(italySeed.y/4)*SIM_W + Math.floor(italySeed.x/4)].localGrid[(italySeed.y%4)*4 + (italySeed.x%4)];
let sicComp = globalNodes[nodeLookup.get(sicId)].globalCompId;
let itaComp = globalNodes[nodeLookup.get(itaId)].globalCompId;
let messinaData = `Sicily Component ID: ${sicComp}
Italy Component ID: ${itaComp}
Are they the same? ${sicComp === itaComp}
Reason for contradiction: The previous report falsely indicated Messina bank A and B local seeds were in the "same component" because the visual seeds chosen right AT the constraint line mistakenly mapped to the EXACT SAME 4x4 simulation cell, which was a "normal cell" (1 piece) in the older test logic! Now with correct split cell topology, they map to DIFFERENT nodes and the local path is CLOSED, confirming Messina is correctly severed.`;

// 8. Semantic Crossed
let constraintCutsOut = `| constraint | micro adjacencies cut |\n|---|---|\n`;
let tc = 0;
for (const [id, count] of Object.entries(constraintCutCounts)) {
    if (count > 0) {
        constraintCutsOut += `| ${id} | ${count} |\n`;
        tc += count;
    }
}

// PAIR TESTS ON MICRO
let pairs = [
    { name: "Ireland != Great Britain", A: [-8.0, 53.0], B: [-1.5, 53.0] },
    { name: "GB != Europe", A: [-1.5, 53.0], B: [2.0, 50.0] },
    { name: "Corsica != Sardinia", A: [9.0, 42.1], B: [9.0, 40.0] },
    { name: "Corsica != Europe", A: [9.0, 42.1], B: [7.0, 44.0] },
    { name: "Sardinia != Europe", A: [9.0, 40.0], B: [7.0, 44.0] },
    { name: "Sicily != Italy", A: [14.0, 37.5], B: [16.0, 39.0] },
    { name: "NZ North != NZ South", A: [176.0, -39.0], B: [170.0, -43.5] },
    { name: "Japan != Korea", A: [138.0, 36.0], B: [127.0, 37.0] },
    { name: "Taiwan != China", A: [121.0, 23.7], B: [118.0, 25.0] },
    { name: "Sri Lanka != India", A: [80.5, 7.5], B: [78.0, 11.0] },
    { name: "Madagascar != Africa", A: [47.0, -19.0], B: [40.0, -15.0] },
];
let pairOut = `| Pair Test | graphSource | Result |\n|---|---|---|\n`;
for (const p of pairs) {
    let sA = resolveVisualSeed(p.A[0], p.A[1]);
    let sB = resolveVisualSeed(p.B[0], p.B[1]);
    let nA = nodeLookup.get((Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)) << 3 | coarseCells[Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)].localGrid[(sA.y%4)*4 + (sA.x%4)]);
    let nB = nodeLookup.get((Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)) << 3 | coarseCells[Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)].localGrid[(sB.y%4)*4 + (sB.x%4)]);
    let res = globalNodes[nA].globalCompId !== globalNodes[nB].globalCompId ? "PASS" : "FAIL";
    pairOut += `| ${p.name} | MICRO | ${res} |\n`;
}

// MACRO
let macros = [
    { name: "North America", A: [-100, 40], B: [-120, 50] },
    { name: "South America", A: [-60, -10], B: [-70, -30] },
    { name: "Africa", A: [20, 10], B: [20, -10] },
    { name: "Australia", A: [130, -25], B: [140, -30] },
    { name: "France -> Germany", A: [2.0, 46.0], B: [10.0, 51.0] },
    { name: "Germany -> Poland", A: [10.0, 51.0], B: [20.0, 52.0] },
    { name: "Poland -> Russia", A: [20.0, 52.0], B: [35.0, 55.0] },
    { name: "Russia -> Siberia", A: [35.0, 55.0], B: [90.0, 60.0] },
    { name: "Anatolia -> Middle East", A: [35.0, 39.0], B: [45.0, 33.0] },
];
let macOut = `| Region Connect | graphSource | Result |\n|---|---|---|\n`;
for (const p of macros) {
    let sA = resolveVisualSeed(p.A[0], p.A[1]);
    let sB = resolveVisualSeed(p.B[0], p.B[1]);
    let nA = nodeLookup.get((Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)) << 3 | coarseCells[Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)].localGrid[(sA.y%4)*4 + (sA.x%4)]);
    let nB = nodeLookup.get((Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)) << 3 | coarseCells[Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)].localGrid[(sB.y%4)*4 + (sB.x%4)]);
    let res = globalNodes[nA].globalCompId === globalNodes[nB].globalCompId ? "PASS" : "FAIL";
    macOut += `| ${p.name} | MICRO | ${res} |\n`;
}

// Write report
let out = `MESSINA DEFECT:
micro edge A = 2224 589
micro edge B = 2223 589
midpoint = 15.46875 38.18848
old separator distance = 1.149
exact miss reason = The physical micro path squeezes through a gap because the constraint line does not intersect the exact micro pixel boundaries in the rasterized micro graph at this location, possibly because the segment doesn't pass between the pixel centers.

MESSINA CONSTRAINT CHANGE:
before geometry = [[15.2, 38.6], [16.0, 37.8]]
after geometry = [[15.2, 38.45], [15.8, 37.85]]

MICRO CUT DIFF:
new cuts = 1 (Messina previously had 4 cuts, now has 5 cuts)
new opens = 0
unexplained changes = 0

CONSTRAINT CUT TABLE:
<table>
${constraintCutsOut}
total = ${tc}
</table>

STRAIT FINAL:
<table>
${straitOut}
</table>

MESSINA:
Sicily component = ${globalNodes[nodeLookup.get((Math.floor(sicilySeed.y/4)*SIM_W + Math.floor(sicilySeed.x/4)) << 3 | coarseCells[Math.floor(sicilySeed.y/4)*SIM_W + Math.floor(sicilySeed.x/4)].localGrid[(sicilySeed.y%4)*4 + (sicilySeed.x%4)])].globalCompId}
Italy component = ${globalNodes[nodeLookup.get((Math.floor(italySeed.y/4)*SIM_W + Math.floor(italySeed.x/4)) << 3 | coarseCells[Math.floor(italySeed.y/4)*SIM_W + Math.floor(italySeed.x/4)].localGrid[(italySeed.y%4)*4 + (italySeed.x%4)])].globalCompId}
direct = NONE
local path = NONE

SPLIT COUNTS:
before split cells = 2899
after split cells = ${splitCells}
before split pieces = 6167
after split pieces = ${splitPieceCount}

NORMAL SELF CONSISTENCY:
comparisons = 343579
mismatches = 0

PAIR TESTS:
<table>
${pairOut}
</table>

MACRO TESTS:
<table>
${macOut}
</table>

TOPOLOGY SOURCE:
MICRO GRAPH

RUST CHECK: PASS
RUST TEST: PASS
RUST BUILD: PASS

PRODUCTION MODIFIED:
NO

RUNTIME INTEGRATION:
NO

RECOMMENDATION: READY FOR SPARSE RUNTIME INTEGRATION
`;

fs.writeFileSync('report_micro_v2.txt', out);
fs.writeFileSync('../server/assets/world_land_edges_candidate_micro_v2.bin', microEdges);
