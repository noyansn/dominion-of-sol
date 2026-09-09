const fs = require('fs');

const VIS_W = 4096;
const VIS_H = 2048;
const SIM_W = 1024;
const SIM_H = 512;

console.log("Loading visual mask...");
const visMask = fs.readFileSync('../client/src/assets/world_visual_mask.bin');
const simGrid = new Uint8Array(SIM_W * SIM_H);

console.log("1. High-resolution LAND component labeling...");
const landCompMap = new Uint32Array(VIS_W * VIS_H);
let nextLandCompId = 1;
const landComps = [null]; 
const visited = new Uint8Array(VIS_W * VIS_H);

for (let y = 0; y < VIS_H; y++) {
    for (let x = 0; x < VIS_W; x++) {
        const idx = y * VIS_W + x;
        if (visMask[idx] >= 128 && visited[idx] === 0) {
            let size = 0;
            const stack = [idx];
            visited[idx] = 1;
            landCompMap[idx] = nextLandCompId;
            
            while(stack.length > 0) {
                const curr = stack.pop();
                size++;
                const cx = curr % VIS_W;
                const cy = Math.floor(curr / VIS_W);
                const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                for (let n of nbs) {
                    if (n[0]>=0 && n[0]<VIS_W && n[1]>=0 && n[1]<VIS_H) {
                        const nidx = n[1]*VIS_W + n[0];
                        if (visMask[nidx] >= 128 && visited[nidx] === 0) {
                            visited[nidx] = 1;
                            landCompMap[nidx] = nextLandCompId;
                            stack.push(nidx);
                        }
                    }
                }
            }
            landComps.push({ id: nextLandCompId, size: size, simCells: new Set() });
            nextLandCompId++;
        }
    }
}
console.log(`Found ${landComps.length - 1} visual LAND components.`);

console.log("2. High-resolution WATER component labeling...");
const waterCompMap = new Uint32Array(VIS_W * VIS_H);
let nextWaterCompId = 1;
const waterComps = [null];
visited.fill(0);

for (let y = 0; y < VIS_H; y++) {
    for (let x = 0; x < VIS_W; x++) {
        const idx = y * VIS_W + x;
        if (visMask[idx] < 128 && visited[idx] === 0) {
            let size = 0;
            const stack = [idx];
            visited[idx] = 1;
            waterCompMap[idx] = nextWaterCompId;
            
            while(stack.length > 0) {
                const curr = stack.pop();
                size++;
                const cx = curr % VIS_W;
                const cy = Math.floor(curr / VIS_W);
                const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                for (let n of nbs) {
                    if (n[0]>=0 && n[0]<VIS_W && n[1]>=0 && n[1]<VIS_H) {
                        const nidx = n[1]*VIS_W + n[0];
                        if (visMask[nidx] < 128 && visited[nidx] === 0) {
                            visited[nidx] = 1;
                            waterCompMap[nidx] = nextWaterCompId;
                            stack.push(nidx);
                        }
                    }
                }
            }
            waterComps.push({ id: nextWaterCompId, size: size, simCells: new Set() });
            nextWaterCompId++;
        }
    }
}
console.log(`Found ${waterComps.length - 1} visual WATER components.`);

console.log("3. Generating Cell Stats & Initial Base Grid...");
const cellStats = new Array(SIM_W * SIM_H);

for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        let landPixelCount = 0;
        let waterPixelCount = 0;
        const lCounts = new Map();
        const wCounts = new Map();
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const vx = sx * 4 + dx;
                const vy = sy * 4 + dy;
                const vidx = vy * VIS_W + vx;
                if (visMask[vidx] >= 128) {
                    landPixelCount++;
                    const cid = landCompMap[vidx];
                    lCounts.set(cid, (lCounts.get(cid) || 0) + 1);
                } else {
                    waterPixelCount++;
                    const cid = waterCompMap[vidx];
                    wCounts.set(cid, (wCounts.get(cid) || 0) + 1);
                }
            }
        }
        
        let primaryLand = 0, maxL = 0;
        for (let [cid, count] of Array.from(lCounts.entries()).sort((a,b)=>a[0]-b[0])) {
            if (count > maxL) { maxL = count; primaryLand = cid; }
        }
        
        let primaryWater = 0, maxW = 0;
        for (let [cid, count] of Array.from(wCounts.entries()).sort((a,b)=>a[0]-b[0])) {
            if (count > maxW) { maxW = count; primaryWater = cid; }
        }
        
        cellStats[sy * SIM_W + sx] = { 
            landPixelCount, waterPixelCount,
            primaryLand, primaryWater,
            ambiguousLand: lCounts.size >= 2,
            ambiguousWater: wCounts.size >= 2,
            lCounts, wCounts
        };
        
        if (primaryLand > 0) landComps[primaryLand].simCells.add(sy * SIM_W + sx);
        if (primaryWater > 0) waterComps[primaryWater].simCells.add(sy * SIM_W + sx);
        
        // BASE GRID: Support Mask (landPixelCount >= 1 -> LAND)
        if (landPixelCount >= 1) {
            simGrid[sy * SIM_W + sx] = 0; // LAND
        } else {
            simGrid[sy * SIM_W + sx] = 2; // WATER
        }
    }
}
console.log("Base grid initialized.");

class PriorityQueue {
    constructor() { this.heap = []; }
    enqueue(element, priority) {
        this.heap.push({element, priority});
        this.bubbleUp(this.heap.length - 1);
    }
    dequeue() {
        if (this.heap.length === 1) return this.heap.pop();
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.sinkDown(0);
        return min;
    }
    isEmpty() { return this.heap.length === 0; }
    bubbleUp(idx) {
        const element = this.heap[idx];
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            const parent = this.heap[parentIdx];
            if (element.priority >= parent.priority) break;
            this.heap[idx] = parent;
            this.heap[parentIdx] = element;
            idx = parentIdx;
        }
    }
    sinkDown(idx) {
        const length = this.heap.length;
        const element = this.heap[idx];
        while (true) {
            const leftChildIdx = 2 * idx + 1;
            const rightChildIdx = 2 * idx + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIdx < length) {
                leftChild = this.heap[leftChildIdx];
                if (leftChild.priority < element.priority) swap = leftChildIdx;
            }
            if (rightChildIdx < length) {
                rightChild = this.heap[rightChildIdx];
                if ((swap === null && rightChild.priority < element.priority) || 
                    (swap !== null && rightChild.priority < leftChild.priority)) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.heap[idx] = this.heap[swap];
            this.heap[swap] = element;
            idx = swap;
        }
    }
}

function resolveFalseJoins() {
    let broken = 0;
    let changed = true;
    while (changed) {
        changed = false;
        // LAND joins
        for (let sy = 0; sy < SIM_H; sy++) {
            for (let sx = 0; sx < SIM_W; sx++) {
                const idx1 = sy * SIM_W + sx;
                if (simGrid[idx1] !== 0) continue;
                const st1 = cellStats[idx1];
                if (st1.primaryLand === 0) continue;
                
                const nbs = [[sx-1, sy], [sx+1, sy], [sx, sy-1], [sx, sy+1]];
                for (let n of nbs) {
                    if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                        const idx2 = n[1]*SIM_W + n[0];
                        if (simGrid[idx2] === 0) {
                            const st2 = cellStats[idx2];
                            if (st2.primaryLand !== 0 && st2.primaryLand !== st1.primaryLand) {
                                let toBreak = (st1.landPixelCount < st2.landPixelCount) ? idx1 : idx2;
                                if (st1.landPixelCount === st2.landPixelCount) {
                                    if (st1.ambiguousLand && !st2.ambiguousLand) toBreak = idx1;
                                    else if (st2.ambiguousLand && !st1.ambiguousLand) toBreak = idx2;
                                    else toBreak = idx1 < idx2 ? idx1 : idx2;
                                }
                                simGrid[toBreak] = 2; // WATER
                                landComps[cellStats[toBreak].primaryLand].simCells.delete(toBreak);
                                waterComps[cellStats[toBreak].primaryWater].simCells.add(toBreak);
                                changed = true;
                                broken++;
                                break;
                            }
                        }
                    }
                }
                if (changed) break;
            }
            if (changed) break;
        }
    }
    return broken;
}
console.log(`4. LAND False JOIN resolution... Broken: ${resolveFalseJoins()}`);

function resolveFalseSplits(comps, isLand) {
    let fixed = 0;
    const targetVal = isLand ? 0 : 2;
    const supportCheck = isLand ? (st => st.landPixelCount >= 1) : (st => st.waterPixelCount >= 1);
    const costFunc = isLand ? (st => 16 - st.landPixelCount) : (st => 16 - st.waterPixelCount);

    for (let cid = 1; cid < comps.length; cid++) {
        const comp = comps[cid];
        if (comp.simCells.size <= 1) continue;
        
        const cells = Array.from(comp.simCells);
        const cVisited = new Set();
        const subComps = [];
        
        for (let startIdx of cells) {
            if (!cVisited.has(startIdx)) {
                const sub = [];
                const q = [startIdx];
                cVisited.add(startIdx);
                
                while(q.length > 0) {
                    const curr = q.shift();
                    sub.push(curr);
                    const cx = curr % SIM_W;
                    const cy = Math.floor(curr / SIM_W);
                    const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                    for (let n of nbs) {
                        if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                            const nidx = n[1]*SIM_W + n[0];
                            if (simGrid[nidx] === targetVal && comp.simCells.has(nidx) && !cVisited.has(nidx)) {
                                cVisited.add(nidx);
                                q.push(nidx);
                            }
                        }
                    }
                }
                subComps.push(sub);
            }
        }
        
        if (subComps.length > 1) {
            subComps.sort((a,b) => b.length - a.length);
            for (let i = 1; i < subComps.length; i++) {
                const targetSet = new Set(subComps[0]);
                const pq = new PriorityQueue();
                const costSoFar = new Map();
                const parent = new Map();
                
                for (let startIdx of subComps[i]) {
                    pq.enqueue(startIdx, 0);
                    costSoFar.set(startIdx, 0);
                }
                
                let foundPath = null;
                while (!pq.isEmpty()) {
                    const currentObj = pq.dequeue();
                    const curr = currentObj.element;
                    if (targetSet.has(curr)) {
                        foundPath = curr; break;
                    }
                    const cx = curr % SIM_W;
                    const cy = Math.floor(curr / SIM_W);
                    const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                    for (let n of nbs) {
                        if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                            const nidx = n[1]*SIM_W + n[0];
                            if (supportCheck(cellStats[nidx])) {
                                const stepCost = costFunc(cellStats[nidx]);
                                const totalCost = costSoFar.get(curr) + stepCost + (simGrid[nidx] === targetVal ? 0 : 0.01);
                                if (!costSoFar.has(nidx) || totalCost < costSoFar.get(nidx)) {
                                    costSoFar.set(nidx, totalCost);
                                    parent.set(nidx, curr);
                                    pq.enqueue(nidx, totalCost);
                                }
                            }
                        }
                    }
                }
                
                if (foundPath !== null) {
                    let c = parent.get(foundPath);
                    while(c !== undefined) {
                        if (simGrid[c] !== targetVal) {
                            simGrid[c] = targetVal;
                            comp.simCells.add(c);
                            if (isLand) waterComps[cellStats[c].primaryWater].simCells.delete(c);
                            else landComps[cellStats[c].primaryLand].simCells.delete(c);
                            fixed++;
                        }
                        c = parent.get(c);
                    }
                    for (let item of subComps[i]) subComps[0].push(item);
                }
            }
        }
    }
    return fixed;
}
console.log(`5. LAND False SPLIT resolution... Restored: ${resolveFalseSplits(landComps, true)}`);
console.log(`6. WATER False SPLIT resolution... Restored: ${resolveFalseSplits(waterComps, false)}`);

console.log(`7. Post-Split LAND False JOIN resolution... Broken: ${resolveFalseJoins()}`);

console.log("8. Preservation of Unrepresented Entities...");
let lPreserved = 0, wPreserved = 0;
for (let cid = 1; cid < landComps.length; cid++) {
    const comp = landComps[cid];
    let isRep = false;
    for (let idx of comp.simCells) { if (simGrid[idx] === 0) { isRep = true; break; } }
    if (!isRep) {
        let bestCell = -1, maxL = 0;
        for (let idx of comp.simCells) {
            if (cellStats[idx].landPixelCount >= 1 && cellStats[idx].primaryLand === cid) {
                // Must not cause false join
                let safe = true;
                const cx = idx % SIM_W; const cy = Math.floor(idx / SIM_W);
                const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                for(let n of nbs) {
                    if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                        const nidx = n[1]*SIM_W + n[0];
                        if (simGrid[nidx] === 0 && cellStats[nidx].primaryLand !== cid) { safe = false; break; }
                    }
                }
                if (safe && cellStats[idx].landPixelCount > maxL) {
                    maxL = cellStats[idx].landPixelCount; bestCell = idx;
                }
            }
        }
        if (bestCell !== -1) { simGrid[bestCell] = 0; lPreserved++; comp.simCells.add(bestCell); waterComps[cellStats[bestCell].primaryWater].simCells.delete(bestCell); }
    }
}
for (let cid = 1; cid < waterComps.length; cid++) {
    const comp = waterComps[cid];
    let isRep = false;
    for (let idx of comp.simCells) { if (simGrid[idx] === 2) { isRep = true; break; } }
    if (!isRep) {
        let bestCell = -1, maxW = 0;
        for (let idx of comp.simCells) {
            if (cellStats[idx].waterPixelCount >= 1 && cellStats[idx].primaryWater === cid) {
                if (cellStats[idx].waterPixelCount > maxW) {
                    maxW = cellStats[idx].waterPixelCount; bestCell = idx;
                }
            }
        }
        if (bestCell !== -1) { simGrid[bestCell] = 2; wPreserved++; comp.simCells.add(bestCell); landComps[cellStats[bestCell].primaryLand].simCells.delete(bestCell); }
    }
}
console.log(`Preserved ${lPreserved} LAND components and ${wPreserved} WATER components.`);

fs.writeFileSync('../server/assets/world_grid_candidate_v3.bin', simGrid);
console.log("Wrote server/assets/world_grid_candidate_v3.bin");
