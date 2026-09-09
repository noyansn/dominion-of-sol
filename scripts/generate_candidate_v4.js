const fs = require('fs');

const W_W = 4096;
const W_H = 2048;
const SIM_W = 1024;
const SIM_H = 512;
const RATIO = 4;

const buf = fs.readFileSync('../client/src/assets/world_visual_mask.bin');
function getVisualPixel(x, y) {
    if (x < 0) x += W_W;
    if (x >= W_W) x -= W_W;
    if (y < 0) y = 0;
    if (y >= W_H) y = W_H - 1;
    const idx = y * W_W + x;
    const byteIdx = Math.floor(idx / 8);
    const bitIdx = 7 - (idx % 8);
    return ((buf[byteIdx] >> bitIdx) & 1) === 1;
}

// 1. High-res component labeling
console.log("1. High-res visual LAND component labeling...");
const visVisited = new Uint8Array(W_W * W_H);
const visCompMap = new Int32Array(W_W * W_H);
visCompMap.fill(-1);

const landComps = [];
for (let y = 0; y < W_H; y++) {
    for (let x = 0; x < W_W; x++) {
        const idx = y * W_W + x;
        if (visVisited[idx] === 0 && getVisualPixel(x, y)) {
            const compId = landComps.length;
            const comp = { id: compId, size: 0, simCells: new Set() };
            
            const q = [x, y];
            visVisited[idx] = 1;
            visCompMap[idx] = compId;
            comp.size++;
            
            let qIdx = 0;
            while(qIdx < q.length) {
                const cx = q[qIdx++];
                const cy = q[qIdx++];
                
                const neighbors = [
                    [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]
                ];
                for (let [nx, ny] of neighbors) {
                    if (nx < 0) nx += W_W;
                    if (nx >= W_W) nx -= W_W;
                    if (ny < 0 || ny >= W_H) continue;
                    
                    const nidx = ny * W_W + nx;
                    if (visVisited[nidx] === 0 && getVisualPixel(nx, ny)) {
                        visVisited[nidx] = 1;
                        visCompMap[nidx] = compId;
                        comp.size++;
                        q.push(nx, ny);
                    }
                }
            }
            landComps.push(comp);
        }
    }
}
console.log("Found", landComps.length, "visual LAND components.");

// 2. Base Support Mask
console.log("2. Generating Base Support Mask...");
const simGrid = new Uint8Array(SIM_W * SIM_H);
const simCellStats = [];
let baseLandCount = 0;

for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        let landPixels = 0;
        const compCounts = new Map();
        let maxCompCount = 0;
        let primaryComp = -1;
        
        for (let dy = 0; dy < RATIO; dy++) {
            for (let dx = 0; dx < RATIO; dx++) {
                const vx = sx * RATIO + dx;
                const vy = sy * RATIO + dy;
                const vidx = vy * W_W + vx;
                const cid = visCompMap[vidx];
                
                if (cid !== -1) {
                    landPixels++;
                    const c = (compCounts.get(cid) || 0) + 1;
                    compCounts.set(cid, c);
                    if (c > maxCompCount) {
                        maxCompCount = c;
                        primaryComp = cid;
                    }
                }
            }
        }
        
        const simIdx = sy * SIM_W + sx;
        simCellStats[simIdx] = {
            landPixelCount: landPixels,
            comps: compCounts,
            primaryComp: primaryComp
        };
        
        for (let [cid, count] of compCounts.entries()) {
            landComps[cid].simCells.add(simIdx);
        }
        
        if (landPixels >= 1) {
            simGrid[simIdx] = 0; // LAND
            baseLandCount++;
        } else {
            simGrid[simIdx] = 2; // WATER
        }
    }
}
console.log("Base support cells:", baseLandCount);

// 3. Supported Adjacency
console.log("3. Calculating Supported Adjacency...");
function hasSupportedHorizontalEdge(sxA, syA, sxB, syB) {
    for (let dy = 0; dy < RATIO; dy++) {
        const pA = getVisualPixel(sxA * RATIO + 3, syA * RATIO + dy);
        const pB = getVisualPixel(sxB * RATIO + 0, syB * RATIO + dy);
        if (pA && pB) return true;
    }
    return false;
}
function hasSupportedVerticalEdge(sxA, syA, sxB, syB) {
    for (let dx = 0; dx < RATIO; dx++) {
        const pA = getVisualPixel(sxA * RATIO + dx, syA * RATIO + 3);
        const pB = getVisualPixel(sxB * RATIO + dx, syB * RATIO + 0);
        if (pA && pB) return true;
    }
    return false;
}

const supportedEdges = new Set();
const unsupportedEdges = [];
let totalUnsupportedBefore = 0;

for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        const idxA = sy * SIM_W + sx;
        if (simGrid[idxA] !== 0) continue; // Only care about LAND-LAND
        
        // Right neighbor
        let nx = sx + 1;
        if (nx >= SIM_W) nx = 0;
        let idxB = sy * SIM_W + nx;
        if (simGrid[idxB] === 0) {
            if (hasSupportedHorizontalEdge(sx, sy, nx, sy)) {
                supportedEdges.add(`${Math.min(idxA, idxB)}-${Math.max(idxA, idxB)}`);
            } else {
                unsupportedEdges.push([idxA, idxB]);
                totalUnsupportedBefore++;
            }
        }
        
        // Bottom neighbor
        if (sy < SIM_H - 1) {
            let ny = sy + 1;
            idxB = ny * SIM_W + sx;
            if (simGrid[idxB] === 0) {
                if (hasSupportedVerticalEdge(sx, sy, sx, ny)) {
                    supportedEdges.add(`${Math.min(idxA, idxB)}-${Math.max(idxA, idxB)}`);
                } else {
                    unsupportedEdges.push([idxA, idxB]);
                    totalUnsupportedBefore++;
                }
            }
        }
    }
}
console.log("Unsupported edges before min-cut:", totalUnsupportedBefore);

// 4. Protection Weight
console.log("4. Assigning Protection Weights...");
const protectedCells = new Set();
for (let i = 0; i < landComps.length; i++) {
    const comp = landComps[i];
    if (comp.simCells.size === 1) {
        protectedCells.add(Array.from(comp.simCells)[0]);
    }
}

// 5. Max-Flow Min-Cut
console.log("5. Solving Max-Flow Min-Cut...");
const INF = Number.MAX_SAFE_INTEGER;
const source = SIM_W * SIM_H;
const sink = source + 1;
const adj = Array.from({ length: sink + 1 }, () => []);

function addEdge(u, v, cap) {
    const uEdges = adj[u];
    const vEdges = adj[v];
    uEdges.push({ to: v, cap: cap, rev: vEdges.length });
    vEdges.push({ to: u, cap: 0, rev: uEdges.length - 1 });
}

// Tie-breaker: use cell index. To prioritize removing higher indexed cells (or whatever deterministic order), we adjust weight.
// The primary weight is landPixelCount. To minimize landPixelCount removed, we use it directly.
// In Max-Flow, capacity should be integer.
// Cap = landPixelCount * SIM_W * SIM_H + idx
for (let i = 0; i < unsupportedEdges.length; i++) {
    const [u, v] = unsupportedEdges[i];
    const uy = Math.floor(u / SIM_W);
    const ux = u % SIM_W;
    const colorU = (ux + uy) % 2;
    
    let left = colorU === 0 ? u : v;
    let right = colorU === 0 ? v : u;
    
    addEdge(left, right, INF);
}

const activeNodes = new Set();
for (let [u, v] of unsupportedEdges) {
    activeNodes.add(u);
    activeNodes.add(v);
}

for (let node of activeNodes) {
    const y = Math.floor(node / SIM_W);
    const x = node % SIM_W;
    const color = (x + y) % 2;
    
    let cap = simCellStats[node].landPixelCount * (SIM_W * SIM_H) + node;
    if (protectedCells.has(node)) cap = INF;
    
    if (color === 0) {
        addEdge(source, node, cap);
    } else {
        addEdge(node, sink, cap);
    }
}

// Dinic's Algorithm
const level = new Int32Array(sink + 1);
function bfs() {
    level.fill(-1);
    level[source] = 0;
    const q = [source];
    let head = 0;
    while (head < q.length) {
        const u = q[head++];
        const edges = adj[u];
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            if (edge.cap > 0 && level[edge.to] === -1) {
                level[edge.to] = level[u] + 1;
                q.push(edge.to);
            }
        }
    }
    return level[sink] !== -1;
}

const ptr = new Int32Array(sink + 1);
function dfs(u, pushed) {
    if (pushed === 0) return 0;
    if (u === sink) return pushed;
    
    const edges = adj[u];
    for (let i = ptr[u]; i < edges.length; i++) {
        ptr[u] = i;
        const edge = edges[i];
        if (level[u] + 1 !== level[edge.to] || edge.cap === 0) continue;
        
        const tr = dfs(edge.to, Math.min(pushed, edge.cap));
        if (tr === 0) continue;
        
        edge.cap -= tr;
        adj[edge.to][edge.rev].cap += tr;
        return tr;
    }
    return 0;
}

let flow = 0;
while (bfs()) {
    ptr.fill(0);
    while (true) {
        const pushed = dfs(source, INF);
        if (pushed === 0) break;
        flow += pushed;
    }
}

// Find minimum cut
bfs(); // Any node reachable from source is in the source-side cut
const minCutNodes = new Set();
for (let node of activeNodes) {
    const y = Math.floor(node / SIM_W);
    const x = node % SIM_W;
    const color = (x + y) % 2;
    
    // A node is in the min-cut if it's the bottleneck.
    // For color 0 (source side), it's in the cut if it's NOT reachable from source.
    // For color 1 (sink side), it's in the cut if it IS reachable from source.
    if (color === 0 && level[node] === -1) {
        minCutNodes.add(node);
    } else if (color === 1 && level[node] !== -1) {
        minCutNodes.add(node);
    }
}

let removedCellsCount = 0;
let visualPixelsLost = 0;
for (let node of minCutNodes) {
    if (protectedCells.has(node)) {
        // Unrepresentable Topology Conflict!
        // We will deal with this later.
    }
    simGrid[node] = 2; // Make WATER
    removedCellsCount++;
    visualPixelsLost += simCellStats[node].landPixelCount;
}
console.log("Min-cut removed cells:", removedCellsCount);
console.log("Visual pixels lost by min-cut:", visualPixelsLost);

// Verify unsupported edges after cut
let unsupportedEdgesAfter = 0;
let unrepresentableConflicts = 0;
for (let [u, v] of unsupportedEdges) {
    if (simGrid[u] === 0 && simGrid[v] === 0) {
        unsupportedEdgesAfter++;
        unrepresentableConflicts++;
    }
}
console.log("Unsupported edges after min-cut:", unsupportedEdgesAfter);

// 6. False Split Validation
console.log("6. False Split Validation...");
let falseSplits = 0;
for (let i = 0; i < landComps.length; i++) {
    const comp = landComps[i];
    const isSignificant = comp.size >= 16 || Array.from(comp.simCells).some(idx => simCellStats[idx].comps.get(comp.id) >= 4);
    if (!isSignificant) continue;
    
    const remainingCells = Array.from(comp.simCells).filter(idx => simGrid[idx] === 0);
    if (remainingCells.length <= 1) continue;
    
    const visited = new Set();
    const q = [remainingCells[0]];
    visited.add(remainingCells[0]);
    
    let head = 0;
    while(head < q.length) {
        const u = q[head++];
        const uy = Math.floor(u / SIM_W);
        const ux = u % SIM_W;
        
        const neighbors = [
            [ux-1, uy], [ux+1, uy], [ux, uy-1], [ux, uy+1]
        ];
        for (let [nx, ny] of neighbors) {
            if (nx < 0) nx += SIM_W;
            if (nx >= SIM_W) nx -= SIM_W;
            if (ny < 0 || ny >= SIM_H) continue;
            
            const nidx = ny * SIM_W + nx;
            if (remainingCells.includes(nidx) && !visited.has(nidx)) {
                // Must be connected by SUPPORTED ADJACENCY
                const edgeKey = `${Math.min(u, nidx)}-${Math.max(u, nidx)}`;
                if (supportedEdges.has(edgeKey)) {
                    visited.add(nidx);
                    q.push(nidx);
                }
            }
        }
    }
    
    if (visited.size < remainingCells.length) {
        falseSplits++;
        
        // Try to repair
        // We need to connect all sub-components of this component
        const subComps = [];
        const cVisited = new Set();
        for (let cell of remainingCells) {
            if (!cVisited.has(cell)) {
                const sub = [];
                const sq = [cell];
                cVisited.add(cell);
                let shead = 0;
                while(shead < sq.length) {
                    const u = sq[shead++];
                    sub.push(u);
                    const uy = Math.floor(u / SIM_W);
                    const ux = u % SIM_W;
                    const neighbors = [[ux-1, uy], [ux+1, uy], [ux, uy-1], [ux, uy+1]];
                    for (let [nx, ny] of neighbors) {
                        if (nx < 0) nx += SIM_W;
                        if (nx >= SIM_W) nx -= SIM_W;
                        if (ny < 0 || ny >= SIM_H) continue;
                        const nidx = ny * SIM_W + nx;
                        if (remainingCells.includes(nidx) && !cVisited.has(nidx)) {
                            const edgeKey = `${Math.min(u, nidx)}-${Math.max(u, nidx)}`;
                            if (supportedEdges.has(edgeKey)) {
                                cVisited.add(nidx);
                                sq.push(nidx);
                            }
                        }
                    }
                }
                subComps.push(sub);
            }
        }
        
        subComps.sort((a,b) => b.length - a.length);
        let repFailed = false;
        
        for (let j = 1; j < subComps.length; j++) {
            const targetSet = new Set(subComps[0]);
            
            // Priority Queue for Dijkstra
            class PQ {
                constructor() { this.data = []; }
                enqueue(val, p) { this.data.push({val, p}); this.data.sort((a,b)=>a.p-b.p); }
                dequeue() { return this.data.shift().val; }
                isEmpty() { return this.data.length === 0; }
            }
            const pq = new PQ();
            const costSoFar = new Map();
            const parent = new Map();
            
            for (let startIdx of subComps[j]) {
                pq.enqueue(startIdx, 0);
                costSoFar.set(startIdx, 0);
            }
            
            let foundTarget = null;
            while(!pq.isEmpty()) {
                const curr = pq.dequeue();
                if (targetSet.has(curr)) {
                    foundTarget = curr;
                    break;
                }
                
                const cy = Math.floor(curr / SIM_W);
                const cx = curr % SIM_W;
                const neighbors = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                
                for (let [nx, ny] of neighbors) {
                    if (nx < 0) nx += SIM_W;
                    if (nx >= SIM_W) nx -= SIM_W;
                    if (ny < 0 || ny >= SIM_H) continue;
                    
                    const nidx = ny * SIM_W + nx;
                    
                    // Can only use BASE_SUPPORT == LAND
                    // And it must belong to this component? "Aynı visual component'i içeren support-cell graph üzerinde"
                    // Yes, it must have this compId in its stats
                    if (!simCellStats[nidx].comps.has(comp.id)) continue;
                    
                    // Connection must be supported visually
                    const edgeKey = `${Math.min(curr, nidx)}-${Math.max(curr, nidx)}`;
                    if (!supportedEdges.has(edgeKey)) continue;
                    
                    const stepCost = simGrid[nidx] === 0 ? 0 : (16 - simCellStats[nidx].landPixelCount);
                    const totalCost = costSoFar.get(curr) + stepCost;
                    
                    if (!costSoFar.has(nidx) || totalCost < costSoFar.get(nidx)) {
                        costSoFar.set(nidx, totalCost);
                        parent.set(nidx, curr);
                        pq.enqueue(nidx, totalCost);
                    }
                }
            }
            
            if (foundTarget !== null) {
                // Verify path doesn't create new unsupported edges
                const path = [];
                let curr = foundTarget;
                while (parent.has(curr)) {
                    curr = parent.get(curr);
                    if (simGrid[curr] === 2) path.push(curr); // Needs restore
                }
                
                let pathValid = true;
                for (let rcell of path) {
                    // If we restore rcell, does it create unsupported edge with ANY adjacent active LAND cell?
                    const ry = Math.floor(rcell / SIM_W);
                    const rx = rcell % SIM_W;
                    const rneighbors = [[rx-1, ry], [rx+1, ry], [rx, ry-1], [rx, ry+1]];
                    for (let [rnx, rny] of rneighbors) {
                        if (rnx < 0) rnx += SIM_W;
                        if (rnx >= SIM_W) rnx -= SIM_W;
                        if (rny < 0 || rny >= SIM_H) continue;
                        const rnidx = rny * SIM_W + rnx;
                        if (simGrid[rnidx] === 0 || path.includes(rnidx)) {
                            const rEdgeKey = `${Math.min(rcell, rnidx)}-${Math.max(rcell, rnidx)}`;
                            if (!supportedEdges.has(rEdgeKey)) {
                                pathValid = false;
                                break;
                            }
                        }
                    }
                    if (!pathValid) break;
                }
                
                if (pathValid) {
                    for (let rcell of path) {
                        simGrid[rcell] = 0;
                        subComps[0].push(rcell);
                        remainingCells.push(rcell); // So future subComps can use it
                    }
                } else {
                    repFailed = true;
                }
            } else {
                repFailed = true;
            }
        }
        
        if (repFailed) {
            unrepresentableConflicts++;
        }
    }
}
console.log("False splits detected:", falseSplits);
console.log("Unrepresentable topology conflicts:", unrepresentableConflicts);

const outBuf = Buffer.alloc(SIM_W * SIM_H);
for (let i = 0; i < SIM_W * SIM_H; i++) {
    outBuf[i] = simGrid[i];
}
fs.writeFileSync('../server/assets/world_grid_candidate_v4.bin', outBuf);
console.log("Wrote server/assets/world_grid_candidate_v4.bin");

let unrepresentedComps = 0;
for (let i = 0; i < landComps.length; i++) {
    const comp = landComps[i];
    const isSignificant = comp.size >= 16 || Array.from(comp.simCells).some(idx => simCellStats[idx].comps.get(comp.id) >= 4);
    if (!isSignificant) continue;
    
    const remainingCells = Array.from(comp.simCells).filter(idx => simGrid[idx] === 0);
    if (remainingCells.length === 0) {
        unrepresentedComps++;
    }
}
console.log("Unrepresented significant components:", unrepresentedComps);

fs.writeFileSync('v4_metrics.json', JSON.stringify({
    baseSupportCells: baseLandCount,
    unsupportedEdgesBefore: totalUnsupportedBefore,
    minCutRemovedCells: removedCellsCount,
    visualPixelsLost: visualPixelsLost,
    unsupportedEdgesAfter: unsupportedEdgesAfter,
    falseSplits: falseSplits,
    unrepresentedComps: unrepresentedComps,
    unrepresentableConflicts: unrepresentableConflicts
}));
