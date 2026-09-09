const fs = require('fs');
const crypto = require('crypto');

const VISUAL_W = 4096, VISUAL_H = 2048;
const SIM_W = 1024, SIM_H = 512;

const visualMask = Buffer.from(fs.readFileSync('../client/src/assets/world_visual_mask.bin'));
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const constraints = JSON.parse(fs.readFileSync('../server/assets/world_topology_constraints.json', 'utf8'));

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
    for (const seg of c.segments) {
        segments.push({ A: lonLatToVisual(seg[0][0], seg[0][1]), B: lonLatToVisual(seg[1][0], seg[1][1]), cid: c.id });
    }
}

let constraintCutCounts = {};
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
            constraintCutCounts[seg.cid] = (constraintCutCounts[seg.cid] || 0) + 1;
            return true;
        }
    }
    return false;
}

let coarseCells = new Array(SIM_W * SIM_H).fill(null);
let supportLandCells = 0, normalCells = 0, splitCells = 0, totalPieces = 0, maxPieces = 0;
let landPixels = 0, rawEdges = 0, separatorCuts = 0, finalEdges = 0;

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        if (simGrid[sIdx] !== 0) continue;
        supportLandCells++;
        
        let localLandPx = [];
        let localGrid = new Int32Array(16).fill(-1);
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                let vx = x * 4 + dx;
                let vy = y * 4 + dy;
                if (visualMask[vy * VISUAL_W + vx] >= 128) {
                    localLandPx.push({dx, dy, vx, vy, idx: dy * 4 + dx});
                    landPixels++;
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
                pieces.push({ pieceId, area, mask, globalId: (sIdx << 3) | pieceId, edges: [] });
            }
        }
        
        if (pieces.length === 1) normalCells++;
        else if (pieces.length >= 2) splitCells++;
        totalPieces += pieces.length;
        if (pieces.length > maxPieces) maxPieces = pieces.length;
        
        coarseCells[sIdx] = { pieces, localGrid };
    }
}

// Global Piece Graph Build
let nodeLookup = new Map();
let globalNodes = [];
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell) continue;
        for (const p of cell.pieces) {
            let nIdx = globalNodes.length;
            p.nIdx = nIdx;
            globalNodes.push({ sIdx, x, y, p });
            nodeLookup.set(p.globalId, nIdx);
        }
    }
}

let undirectedEdges = 0;
let splitNormalEdges = 0;
let splitSplitEdges = 0;
let normalNormalEdges = 0;

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell) continue;
        
        let eIdx = y * SIM_W + ((x + 1) % SIM_W);
        let eCell = coarseCells[eIdx];
        if (eCell) {
            for (let dy = 0; dy < 4; dy++) {
                let pxA = cell.localGrid[dy * 4 + 3];
                let pxB = eCell.localGrid[dy * 4 + 0];
                if (pxA !== -1 && pxB !== -1) {
                    rawEdges++;
                    let vxA = x * 4 + 3;
                    let vxB = ((x + 1) % SIM_W) * 4 + 0;
                    let vy = y * 4 + dy;
                    if (isMicroAdjacencyCutWrapped(vxA, vy, vxB, vy)) {
                        separatorCuts++;
                    } else {
                        let nA = nodeLookup.get((sIdx << 3) | pxA);
                        let nB = nodeLookup.get((eIdx << 3) | pxB);
                        if (nA !== undefined && nB !== undefined && !globalNodes[nA].p.edges.includes(globalNodes[nB].p.globalId)) {
                            globalNodes[nA].p.edges.push(globalNodes[nB].p.globalId);
                            globalNodes[nB].p.edges.push(globalNodes[nA].p.globalId);
                            undirectedEdges++;
                            let isSplitA = cell.pieces.length > 1;
                            let isSplitB = eCell.pieces.length > 1;
                            if (isSplitA && isSplitB) splitSplitEdges++;
                            else if (isSplitA || isSplitB) splitNormalEdges++;
                            else normalNormalEdges++;
                        }
                    }
                }
            }
        }
        
        if (y < SIM_H - 1) {
            let sIdx2 = (y + 1) * SIM_W + x;
            let sCell = coarseCells[sIdx2];
            if (sCell) {
                for (let dx = 0; dx < 4; dx++) {
                    let pxA = cell.localGrid[3 * 4 + dx];
                    let pxB = sCell.localGrid[0 * 4 + dx];
                    if (pxA !== -1 && pxB !== -1) {
                        rawEdges++;
                        let vx = x * 4 + dx;
                        let vyA = y * 4 + 3;
                        let vyB = (y + 1) * 4 + 0;
                        if (isMicroAdjacencyCutWrapped(vx, vyA, vx, vyB)) {
                            separatorCuts++;
                        } else {
                            let nA = nodeLookup.get((sIdx << 3) | pxA);
                            let nB = nodeLookup.get((sIdx2 << 3) | pxB);
                            if (nA !== undefined && nB !== undefined && !globalNodes[nA].p.edges.includes(globalNodes[nB].p.globalId)) {
                                globalNodes[nA].p.edges.push(globalNodes[nB].p.globalId);
                                globalNodes[nB].p.edges.push(globalNodes[nA].p.globalId);
                                undirectedEdges++;
                                let isSplitA = cell.pieces.length > 1;
                                let isSplitB = sCell.pieces.length > 1;
                                if (isSplitA && isSplitB) splitSplitEdges++;
                                else if (isSplitA || isSplitB) splitNormalEdges++;
                                else normalNormalEdges++;
                            }
                        }
                    }
                }
            }
        }
    }
}

// 4. normal edge mask creation
let microEdges = new Uint8Array(SIM_W * SIM_H).fill(0);
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let sIdx = y * SIM_W + x;
        let cell = coarseCells[sIdx];
        if (!cell || cell.pieces.length !== 1) continue;
        
        let mask = 0;
        let nA = nodeLookup.get((sIdx << 3) | 0);
        if (nA !== undefined) {
            const dirs = [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]];
            for (const [dx, dy, flag] of dirs) {
                let nx = (x + dx + SIM_W) % SIM_W;
                let ny = y + dy;
                if (ny >= 0 && ny < SIM_H) {
                    let nIdx = ny * SIM_W + nx;
                    let nCell = coarseCells[nIdx];
                    if (nCell && nCell.pieces.length === 1) {
                        let nB = nodeLookup.get((nIdx << 3) | 0);
                        if (nB !== undefined && globalNodes[nA].p.edges.includes(globalNodes[nB].p.globalId)) {
                            mask |= flag;
                        }
                    }
                }
            }
        }
        microEdges[sIdx] = mask;
    }
}

// Validate normal mask
let normalMismatch = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (microEdges[i] !== 0) {
        if (!coarseCells[i] || coarseCells[i].pieces.length > 1) {
            console.error("FATAL: non-zero normal edge byte for water/split cell!"); process.exit(1);
        }
        if ((microEdges[i] & 240) !== 0) {
            console.error("FATAL: high bits set in normal edge byte!"); process.exit(1);
        }
    }
}

// 7. Split Binary Format
let splitCellsSorted = [];
for (let i = 0; i < coarseCells.length; i++) {
    if (coarseCells[i] && coarseCells[i].pieces.length > 1) {
        splitCellsSorted.push({ sIdx: i, cell: coarseCells[i] });
    }
}
splitCellsSorted.sort((a, b) => a.sIdx - b.sIdx);

let splitPieceCount = 0;
let numSplitRefs = 0;
for (const sc of splitCellsSorted) {
    splitPieceCount += sc.cell.pieces.length;
    for (const p of sc.cell.pieces) {
        p.edges.sort((a,b) => a - b); // Ascending order
        p.edges = [...new Set(p.edges)]; // Distinct
        numSplitRefs += p.edges.length;
    }
}

let bufSize = 8 + 8 + 16 + (splitCellsSorted.length * 8) + (splitPieceCount * 8) + (numSplitRefs * 4);
let splitBuf = Buffer.alloc(bufSize);
let offset = 0;

// Header
splitBuf.write("DOMSPLT1", offset, 8, "ascii"); offset += 8;
splitBuf.writeUInt16LE(1, offset); offset += 2;
splitBuf.writeUInt16LE(SIM_W, offset); offset += 2;
splitBuf.writeUInt16LE(SIM_H, offset); offset += 2;
splitBuf.writeUInt16LE(8, offset); offset += 2;
splitBuf.writeUInt32LE(splitCellsSorted.length, offset); offset += 4;
splitBuf.writeUInt32LE(splitPieceCount, offset); offset += 4;
splitBuf.writeUInt32LE(numSplitRefs, offset); offset += 4;
splitBuf.writeUInt32LE(0, offset); offset += 4;

for (const sc of splitCellsSorted) {
    splitBuf.writeUInt32LE(sc.sIdx, offset); offset += 4;
    splitBuf.writeUInt8(sc.cell.pieces.length, offset); offset += 1;
    splitBuf.writeUInt8(0, offset); offset += 1;
    splitBuf.writeUInt16LE(0, offset); offset += 2;
    for (const p of sc.cell.pieces) {
        splitBuf.writeUInt8(p.pieceId, offset); offset += 1;
        splitBuf.writeUInt8(p.area, offset); offset += 1;
        splitBuf.writeUInt16LE(p.mask, offset); offset += 2;
        splitBuf.writeUInt16LE(p.edges.length, offset); offset += 2;
        splitBuf.writeUInt16LE(0, offset); offset += 2;
        for (const ref of p.edges) {
            splitBuf.writeUInt32LE(ref, offset); offset += 4;
        }
    }
}

// Graph symmetry validation
let symmetryErrs = 0;
for (let i = 0; i < globalNodes.length; i++) {
    let uId = globalNodes[i].p.globalId;
    for (const vId of globalNodes[i].p.edges) {
        let vNode = globalNodes[nodeLookup.get(vId)];
        if (!vNode.p.edges.includes(uId)) {
            symmetryErrs++;
        }
    }
}
if (symmetryErrs > 0) { console.error("FATAL: hybrid graph not symmetric!"); process.exit(1); }

// Final strait gate
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
    { name: "Cook Strait", separator: [[174.5, -41.0], [174.0, -41.5]] }
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

let straitFailed = false;
let straitOut = {};
for (const strait of straits) {
    let sA = resolveVisualSeed(strait.separator[0][0], strait.separator[0][1]);
    let sB = resolveVisualSeed(strait.separator[1][0], strait.separator[1][1]);
    if (!sA || !sB) continue;
    
    let glIdA = (Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)) << 3 | coarseCells[Math.floor(sA.y/4)*SIM_W + Math.floor(sA.x/4)].localGrid[(sA.y%4)*4 + (sA.x%4)];
    let glIdB = (Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)) << 3 | coarseCells[Math.floor(sB.y/4)*SIM_W + Math.floor(sB.x/4)].localGrid[(sB.y%4)*4 + (sB.x%4)];
    
    let nA = nodeLookup.get(glIdA), nB = nodeLookup.get(glIdB);
    
    let minX = Math.min(globalNodes[nA].x, globalNodes[nB].x) - 10;
    let maxX = Math.max(globalNodes[nA].x, globalNodes[nB].x) + 10;
    let minY = Math.min(globalNodes[nA].y, globalNodes[nB].y) - 10;
    let maxY = Math.max(globalNodes[nA].y, globalNodes[nB].y) + 10;
    
    if (Math.abs(globalNodes[nA].x - globalNodes[nB].x) > SIM_W/2) {
        minX = Math.max(globalNodes[nA].x, globalNodes[nB].x) - 10;
        maxX = Math.min(globalNodes[nA].x, globalNodes[nB].x) + SIM_W + 10;
    }
    
    let visited = new Set();
    let q = [nA];
    visited.add(nA);
    let path = false;
    let head = 0;
    while(head < q.length) {
        let u = q[head++];
        if (u === nB) { path = true; break; }
        for (const vId of globalNodes[u].p.edges) {
            let v = nodeLookup.get(vId);
            if (!visited.has(v)) {
                let nx = globalNodes[v].x;
                if (maxX > SIM_W && nx < minX) nx += SIM_W; 
                if (nx >= minX && nx <= maxX && globalNodes[v].y >= minY && globalNodes[v].y <= maxY) {
                    visited.add(v);
                    q.push(v);
                }
            }
        }
    }
    
    let isDirect = globalNodes[nA].p.edges.includes(glIdB);
    straitOut[strait.name] = (path || isDirect) ? "OPEN" : "CLOSED";
    if (path || isDirect) {
        console.error(`FATAL: Strait ${strait.name} is OPEN`);
        straitFailed = true;
    }
}
if (straitFailed) process.exit(1);

// Write outputs
fs.writeFileSync('../server/assets/world_land_edges_micro_v1.bin', microEdges);
fs.writeFileSync('../server/assets/world_split_topology_v1.bin', splitBuf);

function hash(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
let tc = 0; for(const count of Object.values(constraintCutCounts)) tc += count;

let meta = {
    schemaVersion: 1,
    width: SIM_W,
    height: SIM_H,
    supportGridSha256: hash(simGrid),
    visualMaskSha256: hash(visualMask),
    constraintsSha256: hash(fs.readFileSync('../server/assets/world_topology_constraints.json')),
    microEdgeAssetSha256: hash(microEdges),
    splitAssetSha256: hash(splitBuf),
    visualLandPixels: landPixels,
    supportLandCells: supportLandCells,
    normalCells: normalCells,
    splitCells: splitCellsSorted.length,
    splitPieces: splitPieceCount,
    extraPieces: splitPieceCount - splitCellsSorted.length,
    totalTopologyNodes: normalCells + splitPieceCount,
    maxPiecesPerCell: maxPieces,
    microGraphUndirectedEdges: undirectedEdges,
    normalNormalEdges: normalNormalEdges,
    splitNormalEdges: splitNormalEdges,
    splitSplitEdges: splitSplitEdges,
    semanticMicroCuts: tc,
    namedStraitValidation: straitOut
};

fs.writeFileSync('../server/assets/world_topology_micro_v1.meta.json', JSON.stringify(meta, null, 2));

console.log("Compilation complete and verified!");
