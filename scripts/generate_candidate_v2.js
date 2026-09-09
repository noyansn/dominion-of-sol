const fs = require('fs');

const VIS_W = 4096;
const VIS_H = 2048;
const SIM_W = 1024;
const SIM_H = 512;

console.log("Loading visual mask...");
const visMask = fs.readFileSync('../client/src/assets/world_visual_mask.bin');
const simGrid = new Uint8Array(SIM_W * SIM_H);
simGrid.fill(2); // Default to WATER (2)

console.log("Finding visual components...");
const visVisited = new Uint8Array(VIS_W * VIS_H);
const visComponents = [];
let nextVisCompId = 1;
const visCompMap = new Uint32Array(VIS_W * VIS_H);

// To avoid recursion limit, use a stack
for (let y = 0; y < VIS_H; y++) {
    for (let x = 0; x < VIS_W; x++) {
        const idx = y * VIS_W + x;
        if (visMask[idx] >= 128 && visVisited[idx] === 0) {
            let size = 0;
            const stack = [idx];
            visVisited[idx] = 1;
            visCompMap[idx] = nextVisCompId;
            
            while (stack.length > 0) {
                const curr = stack.pop();
                size++;
                const cx = curr % VIS_W;
                const cy = Math.floor(curr / VIS_W);
                
                // 4-way neighbors
                const nbs = [
                    [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]
                ];
                for (let n of nbs) {
                    if (n[0]>=0 && n[0]<VIS_W && n[1]>=0 && n[1]<VIS_H) {
                        const nidx = n[1]*VIS_W + n[0];
                        if (visMask[nidx] >= 128 && visVisited[nidx] === 0) {
                            visVisited[nidx] = 1;
                            visCompMap[nidx] = nextVisCompId;
                            stack.push(nidx);
                        }
                    }
                }
            }
            visComponents.push({ id: nextVisCompId, size: size, simCells: new Set() });
            nextVisCompId++;
        }
    }
}
console.log(`Found ${visComponents.length} visual land components.`);

console.log("Building base sim grid and mapping components...");
const cellStats = new Array(SIM_W * SIM_H);

for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        let landPixels = 0;
        const compCounts = new Map();
        
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const vx = sx * 4 + dx;
                const vy = sy * 4 + dy;
                const vidx = vy * VIS_W + vx;
                if (visMask[vidx] >= 128) {
                    landPixels++;
                    const cid = visCompMap[vidx];
                    compCounts.set(cid, (compCounts.get(cid) || 0) + 1);
                }
            }
        }
        
        let primaryCompId = 0;
        let maxCompCount = 0;
        for (let [cid, count] of compCounts.entries()) {
            if (count > maxCompCount) {
                maxCompCount = count;
                primaryCompId = cid;
            }
        }
        
        cellStats[sy * SIM_W + sx] = { landPixels, primaryCompId, allComps: Array.from(compCounts.keys()) };
        
        // Base threshold: >= 8 pixels (50%) -> LAND
        if (landPixels >= 8) {
            simGrid[sy * SIM_W + sx] = 0; // LAND
            if (primaryCompId > 0) {
                visComponents[primaryCompId - 1].simCells.add(sy * SIM_W + sx);
            }
        }
    }
}

console.log("Pass: Island Preservation");
let preserved = 0;
for (let comp of visComponents) {
    if (comp.simCells.size === 0) {
        // Find the sim cell with the most pixels for this component
        let bestCell = -1;
        let bestCount = 0;
        for (let sy = 0; sy < SIM_H; sy++) {
            for (let sx = 0; sx < SIM_W; sx++) {
                const stats = cellStats[sy * SIM_W + sx];
                if (stats.primaryCompId === comp.id && stats.landPixels > bestCount) {
                    bestCount = stats.landPixels;
                    bestCell = sy * SIM_W + sx;
                }
            }
        }
        if (bestCell !== -1) {
            simGrid[bestCell] = 0; // Force LAND
            comp.simCells.add(bestCell);
            preserved++;
        }
    }
}
console.log(`Preserved ${preserved} small visual components.`);

console.log("Pass: False Bridge Prevention (Topology Check)");
let bridgesBroken = 0;
let changed = true;
while (changed) {
    changed = false;
    for (let sy = 0; sy < SIM_H; sy++) {
        for (let sx = 0; sx < SIM_W; sx++) {
            const idx1 = sy * SIM_W + sx;
            if (simGrid[idx1] !== 0) continue; // Only check LAND cells
            
            const stats1 = cellStats[idx1];
            if (stats1.primaryCompId === 0) continue;
            
            const nbs = [
                [sx-1, sy], [sx+1, sy], [sx, sy-1], [sx, sy+1]
            ];
            
            for (let n of nbs) {
                if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                    const idx2 = n[1]*SIM_W + n[0];
                    if (simGrid[idx2] === 0) {
                        const stats2 = cellStats[idx2];
                        if (stats2.primaryCompId !== 0 && stats2.primaryCompId !== stats1.primaryCompId) {
                            // False bridge detected! Two 4-connected sim cells belong to different visual components.
                            // Break the bridge by converting the weaker cell to WATER, UNLESS it's the last cell of its component.
                            const comp1 = visComponents[stats1.primaryCompId - 1];
                            const comp2 = visComponents[stats2.primaryCompId - 1];
                            
                            let canBreak1 = comp1.simCells.size > 1;
                            let canBreak2 = comp2.simCells.size > 1;
                            
                            if (canBreak1 || canBreak2) {
                                let toBreak = -1;
                                if (canBreak1 && canBreak2) {
                                    toBreak = stats1.landPixels < stats2.landPixels ? idx1 : idx2;
                                } else if (canBreak1) {
                                    toBreak = idx1;
                                } else {
                                    toBreak = idx2;
                                }
                                
                                if (toBreak !== -1) {
                                    simGrid[toBreak] = 2; // WATER
                                    bridgesBroken++;
                                    if (toBreak === idx1) {
                                        comp1.simCells.delete(idx1);
                                    } else {
                                        comp2.simCells.delete(idx2);
                                    }
                                    changed = true;
                                    break; // Restart loop for this cell
                                }
                            }
                        }
                    }
                }
            }
            if (changed) break;
        }
        if (changed) break;
    }
}
console.log(`Broken ${bridgesBroken} false bridges between disconnected components.`);

fs.writeFileSync('../server/assets/world_grid_candidate_v2.bin', simGrid);
console.log("Wrote server/assets/world_grid_candidate_v2.bin");
