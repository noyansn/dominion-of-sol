const fs = require('fs');

const VIS_W = 4096;
const VIS_H = 2048;
const SIM_W = 1024;
const SIM_H = 512;

console.log("Loading high-res visual mask...");
const visMask = fs.readFileSync('../client/src/assets/world_visual_mask.bin');

const v0Grid = fs.readFileSync('../server/assets/world_grid.bin');
const v1Grid = fs.existsSync('../server/assets/world_grid_candidate_v1.bin') ? fs.readFileSync('../server/assets/world_grid_candidate_v1.bin') : null;
const v2Grid = fs.existsSync('../server/assets/world_grid_candidate_v2.bin') ? fs.readFileSync('../server/assets/world_grid_candidate_v2.bin') : null;
const v3Grid = fs.readFileSync('../server/assets/world_grid_candidate_v3.bin');

console.log("Finding high-res visual components...");
const visCompMap = new Uint32Array(VIS_W * VIS_H);
let nextVisCompId = 1;
const visComponents = [];
visComponents.push(null);
const visVisited = new Uint8Array(VIS_W * VIS_H);

for (let y = 0; y < VIS_H; y++) {
    for (let x = 0; x < VIS_W; x++) {
        const idx = y * VIS_W + x;
        if (visMask[idx] >= 128 && visVisited[idx] === 0) {
            let size = 0;
            const stack = [idx];
            visVisited[idx] = 1;
            visCompMap[idx] = nextVisCompId;
            
            while(stack.length > 0) {
                const curr = stack.pop();
                size++;
                const cx = curr % VIS_W;
                const cy = Math.floor(curr / VIS_W);
                const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
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
            visComponents.push({ id: nextVisCompId, size: size });
            nextVisCompId++;
        }
    }
}
const totalHighResComps = visComponents.length - 1;
let significantHighResComps = 0;
for (let i = 1; i < visComponents.length; i++) {
    if (visComponents[i].size > 16) significantHighResComps++;
}
console.log(`Total high-res visual components: ${totalHighResComps} (Significant >16px: ${significantHighResComps})`);

// Pre-calculate cell stats (base support mask)
const cellStats = new Array(SIM_W * SIM_H);
let totalVisualLandPixels = 0;
for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        let landPixelCount = 0;
        const compCounts = new Map();
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const vidx = (sy * 4 + dy) * VIS_W + (sx * 4 + dx);
                if (visMask[vidx] >= 128) {
                    landPixelCount++;
                    totalVisualLandPixels++;
                    const cid = visCompMap[vidx];
                    compCounts.set(cid, (compCounts.get(cid) || 0) + 1);
                }
            }
        }
        let primaryCompId = 0;
        let maxCompCount = 0;
        for (let [cid, count] of Array.from(compCounts.entries()).sort((a,b) => a[0]-b[0])) {
            if (count > maxCompCount) {
                maxCompCount = count;
                primaryCompId = cid;
            }
        }
        cellStats[sy * SIM_W + sx] = { landPixelCount, primaryCompId, compCounts };
    }
}

function analyzeGrid(grid, name) {
    if (!grid) return null;
    let land = 0;
    let water = 0;
    let falseWater = 0; // WATER in sim, but has land pixel in vis
    let falseLand = 0;  // LAND in sim, but has 0 land pixels in vis
    let missedVisualLandPixels = 0;
    let claimedVisualWaterPixels = 0;
    let ambiguousCells = 0;
    
    // Component mapping
    const lowResComps = [];
    const lrVisited = new Uint8Array(SIM_W * SIM_H);
    for (let i = 0; i < SIM_W * SIM_H; i++) {
        if (grid[i] === 0) {
            land++;
            const st = cellStats[i];
            if (st.compCounts.size > 1) ambiguousCells++;
            if (st.landPixelCount === 0) falseLand++;
            claimedVisualWaterPixels += (16 - st.landPixelCount);
            
            if (lrVisited[i] === 0) {
                const cells = [];
                const q = [i];
                lrVisited[i] = 1;
                while(q.length > 0) {
                    const curr = q.shift();
                    cells.push(curr);
                    const cx = curr % SIM_W;
                    const cy = Math.floor(curr / SIM_W);
                    const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                    for (let n of nbs) {
                        if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                            const nidx = n[1]*SIM_W + n[0];
                            if (grid[nidx] === 0 && lrVisited[nidx] === 0) {
                                lrVisited[nidx] = 1;
                                q.push(nidx);
                            }
                        }
                    }
                }
                lowResComps.push(cells);
            }
        } else {
            water++;
            const st = cellStats[i];
            if (st.landPixelCount > 0) {
                falseWater++;
                missedVisualLandPixels += st.landPixelCount;
            }
        }
    }
    
    let falseJoins = 0;
    for (let comp of lowResComps) {
        const foundHighResComps = new Set();
        for (let idx of comp) {
            if (cellStats[idx].primaryCompId > 0) {
                foundHighResComps.add(cellStats[idx].primaryCompId);
            }
        }
        if (foundHighResComps.size > 1) {
            // Wait, this is a coarse count of components that incorrectly join different vis components.
            // A more exact count is the number of boundaries. But for metrics, we'll just count how many 
            // distinct vis components are glued together in this low-res component, minus 1.
            falseJoins += (foundHighResComps.size - 1);
        }
    }
    
    let falseSplits = 0;
    let unrepresented = 0;
    for (let i = 1; i < visComponents.length; i++) {
        if (visComponents[i].size > 16) {
            // Find how many low-res components claim this high-res component
            let parts = 0;
            for (let lrComp of lowResComps) {
                let hasIt = false;
                for (let idx of lrComp) {
                    if (cellStats[idx].primaryCompId === i) {
                        hasIt = true; break;
                    }
                }
                if (hasIt) parts++;
            }
            if (parts === 0) unrepresented++;
            else if (parts > 1) falseSplits += (parts - 1);
        }
    }
    
    return {
        name,
        land,
        water,
        falseWater,
        falseLand,
        missedVisualLandPixels,
        claimedVisualWaterPixels,
        lowResCompCount: lowResComps.length,
        falseJoins,
        falseSplits,
        unrepresented,
        ambiguousCells
    };
}

const stats = [
    analyzeGrid(v0Grid, "V0 (Pre-Candidate)"),
    analyzeGrid(v1Grid, "V1 (Threshold 1/25)"),
    analyzeGrid(v2Grid, "V2 (Topology-Safe)"),
    analyzeGrid(v3Grid, "V3 (True Topology)")
].filter(s => s !== null);

function printMetrics() {
    console.log("\n--- METRICS TABLE ---");
    console.log("Grid | Land | Water | F.Water | F.Land | MissedL_Pix | ClaimedW_Pix | L_Comps | F.Joins | F.Splits | Unrep | Ambig");
    for (let s of stats) {
        console.log(`${s.name.padEnd(20)} | ${s.land.toString().padEnd(5)} | ${s.water.toString().padEnd(6)} | ${s.falseWater.toString().padEnd(7)} | ${s.falseLand.toString().padEnd(6)} | ${s.missedVisualLandPixels.toString().padEnd(11)} | ${s.claimedVisualWaterPixels.toString().padEnd(12)} | ${s.lowResCompCount.toString().padEnd(7)} | ${s.falseJoins.toString().padEnd(7)} | ${s.falseSplits.toString().padEnd(8)} | ${s.unrepresented.toString().padEnd(5)} | ${s.ambiguousCells}`);
    }
}
printMetrics();

console.log("\nPOLITICALLY UNREPRESENTABLE VISUAL LAND PIXELS:");
for (let s of stats) {
    console.log(`${s.name}: ${s.missedVisualLandPixels}`);
}

function coordToIndex(lon, lat) {
    let nx = (lon + 180) / 360;
    let ny = (90 - lat) / 180;
    let x = Math.floor(nx * SIM_W);
    let y = Math.floor(ny * SIM_H);
    if (x < 0) x = 0; if (x >= SIM_W) x = SIM_W - 1;
    if (y < 0) y = 0; if (y >= SIM_H) y = SIM_H - 1;
    return y * SIM_W + x;
}

function areConnected(grid, idx1, idx2) {
    if (grid[idx1] !== 0 || grid[idx2] !== 0) return false;
    const q = [idx1];
    const visited = new Set();
    visited.add(idx1);
    while (q.length > 0) {
        const curr = q.shift();
        if (curr === idx2) return true;
        const cx = curr % SIM_W;
        const cy = Math.floor(curr / SIM_W);
        const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
        for (let n of nbs) {
            if (n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                const nidx = n[1]*SIM_W + n[0];
                if (grid[nidx] === 0 && !visited.has(nidx)) {
                    visited.add(nidx);
                    q.push(nidx);
                }
            }
        }
    }
    return false;
}

console.log("\n--- STRAIT VALIDATION (MUST BE DISCONNECTED) ---");
const straits = [
    { name: 'Great Britain ↔ France', p1: {lon: 1.5, lat: 51.0}, p2: {lon: 2.0, lat: 50.0} },
    { name: 'Ireland ↔ Great Britain', p1: {lon: -6.0, lat: 53.0}, p2: {lon: -4.0, lat: 53.0} },
    { name: 'Sicily ↔ mainland Italy', p1: {lon: 15.5, lat: 38.2}, p2: {lon: 15.6, lat: 38.2} },
    { name: 'Sardinia ↔ Corsica', p1: {lon: 9.0, lat: 41.0}, p2: {lon: 9.0, lat: 41.5} },
    { name: 'Corsica ↔ mainland Europe', p1: {lon: 9.0, lat: 42.5}, p2: {lon: 9.0, lat: 43.5} },
    { name: 'Japan ↔ Korea', p1: {lon: 130.0, lat: 33.0}, p2: {lon: 129.0, lat: 35.0} },
    { name: 'Hokkaido ↔ Sakhalin', p1: {lon: 142.0, lat: 45.5}, p2: {lon: 142.0, lat: 46.5} },
    { name: 'Taiwan ↔ mainland China', p1: {lon: 121.0, lat: 24.0}, p2: {lon: 119.0, lat: 25.0} },
    { name: 'Cuba ↔ Florida', p1: {lon: -81.0, lat: 23.5}, p2: {lon: -81.0, lat: 25.0} },
    { name: 'Hispaniola ↔ Cuba', p1: {lon: -73.5, lat: 19.5}, p2: {lon: -74.5, lat: 20.0} },
    { name: 'Madagascar ↔ Africa', p1: {lon: 44.0, lat: -15.0}, p2: {lon: 41.0, lat: -15.0} },
    { name: 'Sri Lanka ↔ India', p1: {lon: 80.5, lat: 8.0}, p2: {lon: 78.5, lat: 10.0} },
    { name: 'Alaska ↔ Russia', p1: {lon: -164.0, lat: 65.0}, p2: {lon: 175.0, lat: 65.0} },
    { name: 'Spain ↔ Morocco', p1: {lon: -5.0, lat: 36.5}, p2: {lon: -5.0, lat: 35.5} },
    { name: 'Bosphorus', p1: {lon: 28.9, lat: 41.1}, p2: {lon: 29.1, lat: 41.0} },
    { name: 'Dardanelles', p1: {lon: 26.2, lat: 40.2}, p2: {lon: 26.5, lat: 40.0} },
    { name: 'Bab-el-Mandeb', p1: {lon: 43.0, lat: 12.5}, p2: {lon: 43.5, lat: 12.0} }
];

let allStraitsPass = true;
for (let s of straits) {
    const idx1 = coordToIndex(s.p1.lon, s.p1.lat);
    const idx2 = coordToIndex(s.p2.lon, s.p2.lat);
    const connected = areConnected(v3Grid, idx1, idx2);
    console.log(`${s.name}: ${connected ? 'CONNECTED (FAIL)' : 'DISCONNECTED (PASS)'}`);
    if (connected) allStraitsPass = false;
}

console.log("\n--- CRITICAL LAKES (MUST BE WATER) ---");
const lakes = [
    { name: 'Great Lakes', lon: -82.0, lat: 45.0 },
    { name: 'Lake Victoria', lon: 33.0, lat: -1.0 },
    { name: 'Lake Tanganyika', lon: 29.5, lat: -6.0 },
    { name: 'Lake Baikal', lon: 108.0, lat: 53.0 },
    { name: 'Caspian Sea', lon: 50.0, lat: 42.0 }
];

let allLakesPass = true;
for (let l of lakes) {
    const idx = coordToIndex(l.lon, l.lat);
    const isWater = v3Grid[idx] !== 0;
    console.log(`${l.name}: ${isWater ? 'WATER (PASS)' : 'LAND (FAIL)'}`);
    if (!isWater) allLakesPass = false;
}

console.log("\n--- V3 PASS CONDITIONS ---");
console.log(`VISUAL SUPPORT MASK: ${v3Grid.some((c, i) => cellStats[i].landPixelCount === 0 && c === 0) ? "FAIL (FalseLand > 0)" : "PASS"}`);
const v3Stats = stats.find(s => s.name.startsWith("V3"));
console.log(`FALSE LAND: ${v3Stats.falseLand}`);
console.log(`FALSE WATER: ${v3Stats.falseWater}`);
console.log(`STRAITS PASS: ${allStraitsPass}`);
console.log(`LAKES PASS: ${allLakesPass}`);
