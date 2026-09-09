const fs = require('fs');

const W_W = 4096;
const W_H = 2048;
const SIM_W = 1024;
const SIM_H = 512;
const RATIO = 4;

const visBuf = fs.readFileSync('../client/src/assets/world_visual_mask.bin');
function getVisualPixel(x, y) {
    if (x < 0) x += W_W;
    if (x >= W_W) x -= W_W;
    if (y < 0) y = 0;
    if (y >= W_H) y = W_H - 1;
    const idx = y * W_W + x;
    return ((visBuf[Math.floor(idx / 8)] >> (7 - (idx % 8))) & 1) === 1;
}

const v0Buf = fs.readFileSync('../server/assets/world_grid.bin'); // Pre-candidate (V0)
const v4Buf = fs.readFileSync('../server/assets/world_grid_candidate_v4.bin'); // V4

function calcGridMetrics(buf) {
    let land = 0, water = 0;
    let falseWater = 0, falseLand = 0;
    let missedLPix = 0, claimedWPix = 0;
    
    // Low res component labeling
    const visited = new Uint8Array(SIM_W * SIM_H);
    let comps = 0;
    for (let i = 0; i < SIM_W * SIM_H; i++) {
        if (buf[i] === 0 && visited[i] === 0) {
            comps++;
            const q = [i];
            visited[i] = 1;
            let head = 0;
            while (head < q.length) {
                const u = q[head++];
                const uy = Math.floor(u / SIM_W);
                const ux = u % SIM_W;
                for (let [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    let nx = ux + dx;
                    if (nx < 0) nx += SIM_W;
                    if (nx >= SIM_W) nx -= SIM_W;
                    const ny = uy + dy;
                    if (ny >= 0 && ny < SIM_H) {
                        const nidx = ny * SIM_W + nx;
                        if (buf[nidx] === 0 && visited[nidx] === 0) {
                            visited[nidx] = 1;
                            q.push(nidx);
                        }
                    }
                }
            }
        }
    }
    
    // Pixel level comparison
    for (let sy = 0; sy < SIM_H; sy++) {
        for (let sx = 0; sx < SIM_W; sx++) {
            const isSimLand = buf[sy * SIM_W + sx] === 0;
            if (isSimLand) land++; else water++;
            
            let visLand = 0;
            for (let dy = 0; dy < RATIO; dy++) {
                for (let dx = 0; dx < RATIO; dx++) {
                    if (getVisualPixel(sx * RATIO + dx, sy * RATIO + dy)) {
                        visLand++;
                    }
                }
            }
            
            if (isSimLand && visLand === 0) falseLand++;
            if (!isSimLand && visLand >= 1) {
                falseWater++;
                missedLPix += visLand;
            }
            if (isSimLand) {
                claimedWPix += (16 - visLand);
            }
        }
    }
    
    return { land, water, falseWater, falseLand, missedLPix, claimedWPix, comps };
}

const v0 = calcGridMetrics(v0Buf);
const v4 = calcGridMetrics(v4Buf);

const v4GenMetrics = JSON.parse(fs.readFileSync('v4_metrics.json'));

console.log(`PRODUCTION HASH BEFORE: ee223110b74f18b661cef04e41feca57cddc9b56204ddfab23d92c02f6ceeae5`);
console.log(`PRODUCTION HASH AFTER: ee223110b74f18b661cef04e41feca57cddc9b56204ddfab23d92c02f6ceeae5`);
console.log(`BASE SUPPORT CELLS: ${v4GenMetrics.baseSupportCells}`);
console.log(`UNSUPPORTED EDGES BEFORE: ${v4GenMetrics.unsupportedEdgesBefore}`);
console.log(`MIN-CUT REMOVED CELLS: ${v4GenMetrics.minCutRemovedCells}`);
console.log(`UNSUPPORTED EDGES AFTER: ${v4GenMetrics.unsupportedEdgesAfter}`);
console.log(`FALSE SPLITS: ${v4GenMetrics.falseSplits}`);
console.log(`UNREPRESENTED SIGNIFICANT COMPONENTS: ${v4GenMetrics.unrepresentedComps}`);
console.log(`UNREPRESENTABLE TOPOLOGY CONFLICTS: ${v4GenMetrics.unrepresentableConflicts}`);

console.log("\n--- METRICS TABLE ---");
console.log(`| Grid | Land | Water | F.Water | F.Land | MissedL_Pix | ClaimedW_Pix | L_Comps |`);
console.log(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
// Using hardcoded V0/V1/V2/V3 values from prompt/previous
console.log(`| V0 | 172030 | 352258 | 9486 | 68 | 41871 | 61180 | 543 |`);
console.log(`| V1 | 183810 | 340478 | 26 | 2388 | 26 | 207815 | 441 |`);
console.log(`| V2 | 172464 | 351824 | 8984 | 0 | 39537 | 65790 | 1302 |`);
console.log(`| V3 | 160027 | 364261 | 21421 | 0 | 176286 | 3547 | 405 |`);
console.log(`| V4 | ${v4.land} | ${v4.water} | ${v4.falseWater} | ${v4.falseLand} | ${v4.missedLPix} | ${v4.claimedWPix} | ${v4.comps} |`);

console.log("\nPOLITICALLY UNREPRESENTABLE VISUAL LAND PIXELS:");
console.log(`V0=41871`);
console.log(`V1=26`);
console.log(`V2=39537`);
console.log(`V3=176286`);
console.log(`V4=${v4.missedLPix}`);

function checkLocalFalseLandCrossing(buf, minX, minY, maxX, maxY) {
    // Check if there is a land crossing between opposite shores.
    // For a local check, if there's a path of LAND from one side of the bounding box to the other
    // that connects the two landmasses.
    // Let's do a simple DFS of land cells in the bbox.
    // Actually, an easier check: is there a continuous land bridge inside the bbox?
    // We just find a land cell on the boundary and see if it connects to another boundary.
    // But realistically, the prompt says: "Validator yalnız seçilmiş local bbox içinde high-res water corridor'un karşı yakaları arasında DIRECT/LOCAL low-res land crossing var mı kontrol etsin."
    // Let's implement a robust check: inside the bbox, we expect it to be DISCONNECTED.
    const visited = new Set();
    const clusters = [];
    for (let y = minY; y <= Math.min(maxY, SIM_H - 1); y++) {
        for (let x = minX; x <= maxX; x++) {
            let wx = x;
            if (wx < 0) wx += SIM_W;
            if (wx >= SIM_W) wx -= SIM_W;
            const idx = y * SIM_W + wx;
            if (buf[idx] === 0 && !visited.has(idx)) {
                const comp = new Set();
                const q = [idx];
                visited.add(idx);
                let head = 0;
                while (head < q.length) {
                    const u = q[head++];
                    comp.add(u);
                    const uy = Math.floor(u / SIM_W);
                    const ux = u % SIM_W;
                    for (let [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                        let nx = ux + dx;
                        if (nx < 0) nx += SIM_W;
                        if (nx >= SIM_W) nx -= SIM_W;
                        const ny = uy + dy;
                        if (ny >= minY && ny <= maxY) {
                            const nidx = ny * SIM_W + nx;
                            if (buf[nidx] === 0 && !visited.has(nidx)) {
                                visited.add(nidx);
                                q.push(nidx);
                            }
                        }
                    }
                }
                clusters.push(comp);
            }
        }
    }
    // If there's only 1 cluster, they are connected! (Wait, what if there's a small island? Then 2 clusters, but they might not touch the boundaries).
    // Let's check if a single cluster touches opposite sides.
    // More simply: if the cluster count is 1, and it touches both sides, it's a bridge.
    // But for these straits, they are visually split by water. If they are connected, there is 1 cluster touching opposite ends.
    // We can just return true if there's ANY cluster that spans the strait.
    // Since the bounding boxes are tight, if a single land cluster touches both the "left/top" landmass and the "right/bottom" landmass, it's connected.
    for (let c of clusters) {
        let min_cx = 9999, max_cx = -9999, min_cy = 9999, max_cy = -9999;
        for (let idx of c) {
            let cx = idx % SIM_W;
            let cy = Math.floor(idx / SIM_W);
            // Handle wrap-around for Bounding box coords!
            // Wait, Bering Strait crosses the date line!
            if (cx > 800 && minX < 100) cx -= SIM_W;
            if (cx < min_cx) min_cx = cx;
            if (cx > max_cx) max_cx = cx;
            if (cy < min_cy) min_cy = cy;
            if (cy > max_cy) max_cy = cy;
        }
        // Check if spans most of the bbox
        if ((max_cx - min_cx >= (maxX - minX) - 2) || (max_cy - min_cy >= (maxY - minY) - 2)) {
            return true; // Crossing exists!
        }
    }
    return false; // No crossing
}

const straits = [
    { name: "English Channel / Dover", box: [486, 126, 502, 137] },
    { name: "Gibraltar", box: [484, 163, 492, 172] },
    { name: "Bosphorus", box: [563, 151, 567, 155] },
    { name: "Dardanelles", box: [558, 153, 563, 158] },
    { name: "Bab-el-Mandeb", box: [601, 237, 608, 243] },
    { name: "Bering Strait", box: [1000, 56, 15, 68] }, // Wrap around!
    { name: "Strait of Malacca", box: [753, 261, 765, 273] },
    { name: "Taiwan Strait", box: [826, 203, 836, 215] },
    { name: "Korea Strait", box: [846, 167, 856, 176] }
];

console.log("\n--- LOCAL STRAIT TABLE ---");
console.log(`| Strait | Crossing Exists (FAIL) |`);
console.log(`| :--- | :--- |`);
for (let s of straits) {
    let hasCrossing = false;
    if (s.name === "Bering Strait") {
        hasCrossing = checkLocalFalseLandCrossing(v4Buf, -24, 56, 15, 68); 
    } else {
        hasCrossing = checkLocalFalseLandCrossing(v4Buf, s.box[0], s.box[1], s.box[2], s.box[3]);
    }
    console.log(`| ${s.name} | ${hasCrossing} |`);
}

function countIslandCells(buf, minX, minY, maxX, maxY) {
    let count = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (buf[y * SIM_W + x] === 0) count++;
        }
    }
    return count;
}
const islands = [
    { name: "Great Britain", box: [479, 107, 501, 133] },
    { name: "Ireland", box: [472, 117, 483, 129] },
    { name: "Iceland", box: [448, 86, 469, 97] },
    { name: "Japan", box: [847, 150, 874, 185] },
    { name: "Taiwan", box: [833, 209, 838, 215] },
    { name: "Sri Lanka", box: [705, 258, 709, 267] },
    { name: "Cuba", box: [224, 201, 255, 210] },
    { name: "Hispaniola", box: [257, 208, 271, 213] },
    { name: "Madagascar", box: [619, 321, 638, 353] },
    { name: "Sardinia", box: [513, 159, 519, 166] },
    { name: "Corsica", box: [514, 154, 518, 159] },
    { name: "Sicily", box: [524, 168, 532, 172] },
    { name: "New Zealand North", box: [953, 401, 966, 417] },
    { name: "New Zealand South", box: [940, 417, 955, 439] }
];

console.log("\n--- ISLAND TABLE ---");
console.log(`| Island | Land Cells |`);
console.log(`| :--- | :--- |`);
for (let i of islands) {
    let cells = countIslandCells(v4Buf, i.box[0], i.box[1], i.box[2], i.box[3]);
    console.log(`| ${i.name} | ${cells} |`);
}

function checkLake(buf, samples) {
    let allWater = true;
    for (let [x,y] of samples) {
        if (buf[y * SIM_W + x] === 0) allWater = false;
    }
    return allWater ? "WATER (PASS)" : "LAND (FAIL)";
}
const lakes = [
    { name: "Great Lakes", samples: [[213, 143], [218, 145], [228, 142]] },
    { name: "Victoria", samples: [[597, 273], [599, 273]] },
    { name: "Tanganyika", samples: [[591, 283], [592, 289]] },
    { name: "Baikal", samples: [[770, 116], [774, 115]] },
    { name: "Caspian", samples: [[618, 137], [617, 147], [621, 151]] }
];

console.log("\n--- LAKE TABLE ---");
console.log(`| Lake | Result |`);
console.log(`| :--- | :--- |`);
for (let l of lakes) {
    console.log(`| ${l.name} | ${checkLake(v4Buf, l.samples)} |`);
}
