const fs = require('fs');

const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_2.bin');
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const geoData = JSON.parse(fs.readFileSync('../client/src/assets/canonical_geography.json', 'utf8'));

// 1. Validating the entire grid for basic statistics
let bytes = edgeMask.length;
let highBitsNonZero = 0;
let symmetryMismatches = 0;
let waterViolations = 0;
let adjacentLandPairs = 0;
let openPairs = 0;
let closedPairs = 0;

for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e = edgeMask[i];
    if (e & 0xF0) highBitsNonZero++;
    if (simGrid[i] !== 0 && e !== 0) waterViolations++;
    
    const x = i % SIM_W;
    const y = Math.floor(i / SIM_W);
    
    // Check East (2)
    if (simGrid[i] === 0) {
        let ex = (x + 1) % SIM_W;
        let eIdx = y * SIM_W + ex;
        if (simGrid[eIdx] === 0) {
            adjacentLandPairs++;
            let hasEast = (e & 2) !== 0;
            let neighborHasWest = (edgeMask[eIdx] & 8) !== 0;
            if (hasEast !== neighborHasWest) symmetryMismatches++;
            if (hasEast && neighborHasWest) openPairs++;
            else closedPairs++;
        }
    }
    // Check South (4)
    if (simGrid[i] === 0 && y < SIM_H - 1) {
        let eIdx = (y + 1) * SIM_W + x;
        if (simGrid[eIdx] === 0) {
            adjacentLandPairs++;
            let hasSouth = (e & 4) !== 0;
            let neighborHasNorth = (edgeMask[eIdx] & 1) !== 0;
            if (hasSouth !== neighborHasNorth) symmetryMismatches++;
            if (hasSouth && neighborHasNorth) openPairs++;
            else closedPairs++;
        }
    }
}

console.log("EDGE ARTIFACT:");
console.log(`bytes = ${bytes}`);
console.log(`high bits nonzero count = ${highBitsNonZero}`);
console.log(`symmetry mismatches = ${symmetryMismatches}`);
console.log(`water violations = ${waterViolations}`);
console.log(`adjacent land pairs = ${adjacentLandPairs}`);
console.log(`open = ${openPairs}`);
console.log(`closed = ${closedPairs}\n`);

// 2. Automate finding coordinates for Straits
// Function to find the LARGEST land cell component inside a lat/lon box
function findLandCell(minLon, maxLon, minLat, maxLat) {
    const minX = Math.floor((minLon + 180) / 360 * SIM_W);
    const maxX = Math.floor((maxLon + 180) / 360 * SIM_W);
    const minY = Math.floor((90 - maxLat) / 180 * SIM_H);
    const maxY = Math.floor((90 - minLat) / 180 * SIM_H);
    
    let bestCell = null;
    let bestSize = -1;
    let tested = new Set();
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            let bx = x;
            if (bx < 0) bx += SIM_W;
            if (bx >= SIM_W) bx -= SIM_W;
            
            const idx = y * SIM_W + bx;
            if (simGrid[idx] === 0 && !tested.has(idx)) {
                // Find size
                const q = [idx];
                const visited = new Set([idx]);
                let head = 0;
                while(head < q.length) {
                    const u = q[head++];
                    tested.add(u);
                    const cx = u % SIM_W;
                    const cy = Math.floor(u / SIM_W);
                    const e = edgeMask[u];
                    
                    const neighbors = [];
                    if ((e & 1) && cy > 0) neighbors.push((cy-1)*SIM_W + cx);
                    if (e & 2) neighbors.push(cy*SIM_W + ((cx+1)%SIM_W));
                    if ((e & 4) && cy < SIM_H-1) neighbors.push((cy+1)*SIM_W + cx);
                    if (e & 8) neighbors.push(cy*SIM_W + ((cx-1+SIM_W)%SIM_W));
                    
                    for (let nidx of neighbors) {
                        if (!visited.has(nidx)) {
                            visited.add(nidx);
                            q.push(nidx);
                        }
                    }
                }
                if (visited.size > bestSize) {
                    bestSize = visited.size;
                    bestCell = {x: bx, y};
                }
            }
        }
    }
    return bestCell;
}

function floodFillLocalPathLength(sx, sy, tx, ty, minX, minY, maxX, maxY) {
    const q = [[sy * SIM_W + sx, 0]];
    const visited = new Set([q[0][0]]);
    let head = 0;
    while(head < q.length) {
        const [u, dist] = q[head++];
        if (u === ty * SIM_W + tx) return dist;
        
        const cx = u % SIM_W;
        const cy = Math.floor(u / SIM_W);
        const e = edgeMask[u];
        
        const neighbors = [];
        if ((e & 1) && cy > 0) neighbors.push((cy-1)*SIM_W + cx);
        if (e & 2) neighbors.push(cy*SIM_W + ((cx+1)%SIM_W));
        if ((e & 4) && cy < SIM_H-1) neighbors.push((cy+1)*SIM_W + cx);
        if (e & 8) neighbors.push(cy*SIM_W + ((cx-1+SIM_W)%SIM_W));
        
        for (let nidx of neighbors) {
            let nx = nidx % SIM_W;
            let ny = Math.floor(nidx / SIM_W);
            let bx = nx;
            if (minX < 0 && nx > 800) bx -= SIM_W;
            if (maxX > SIM_W && nx < 200) bx += SIM_W;
            
            if (bx >= minX && bx <= maxX && ny >= minY && ny <= maxY) {
                if (!visited.has(nidx)) {
                    visited.add(nidx);
                    q.push([nidx, dist + 1]);
                }
            }
        }
    }
    return -1; // No path
}

function hasDirectCrossing(sCells, tCells) {
    for (const [sx, sy] of sCells) {
        const u = sy * SIM_W + sx;
        const e = edgeMask[u];
        const neighbors = [];
        if ((e & 1) && sy > 0) neighbors.push((sy-1)*SIM_W + sx);
        if (e & 2) neighbors.push(sy*SIM_W + ((sx+1)%SIM_W));
        if ((e & 4) && sy < SIM_H-1) neighbors.push((sy+1)*SIM_W + sx);
        if (e & 8) neighbors.push(sy*SIM_W + ((sx-1+SIM_W)%SIM_W));
        
        for (const n of neighbors) {
            let nx = n % SIM_W;
            let ny = Math.floor(n / SIM_W);
            for (const [tx, ty] of tCells) {
                if (tx === nx && ty === ny) return true;
            }
        }
    }
    return false;
}

const straits = [
    { name: "Dover", sBox: [-2, -1, 50.5, 51.5], tBox: [1, 2.5, 50.5, 51.5], bbox: [-2, 2.5, 50, 52] },
    { name: "Gibraltar", sBox: [-6, -5, 35.8, 36.5], tBox: [-6, -5, 35.5, 35.8], bbox: [-7, -4, 35, 37] },
    { name: "Bosphorus", sBox: [28.8, 29, 41, 41.2], tBox: [29.1, 29.3, 41, 41.2], bbox: [28, 30, 40.5, 41.5] },
    { name: "Dardanelles", sBox: [26, 26.3, 40.2, 40.4], tBox: [26.4, 26.8, 40.2, 40.4], bbox: [25, 27, 40, 41] },
    { name: "Bab-el-Mandeb", sBox: [43, 43.5, 12, 13], tBox: [43.6, 44, 12, 13], bbox: [42, 45, 11, 14] },
    { name: "Bering Strait", sBox: [-171, -169, 65, 67], tBox: [169, -171 + 360, 65, 67], bbox: [169, 191, 64, 68] },
    { name: "Malacca", sBox: [100, 102, 2, 4], tBox: [100, 102, 0, 2], bbox: [99, 103, -1, 5] },
    { name: "Taiwan Strait", sBox: [119, 120, 24, 26], tBox: [120.5, 121.5, 24, 26], bbox: [118, 122, 23, 27] },
    { name: "Korea Strait", sBox: [129, 129.5, 34.5, 35.5], tBox: [129.5, 131, 33, 34], bbox: [128, 132, 32, 36] }
];

console.log("STRAIT TABLE:");
console.log("| Strait | Seed A | Seed B | Direct Crossing | Local Path Length | Result |");
console.log("|---|---|---|---|---|---|");

for (const s of straits) {
    const sA = findLandCell(s.sBox[0], s.sBox[1], s.sBox[2], s.sBox[3]);
    const sB = findLandCell(s.tBox[0], s.tBox[1], s.tBox[2], s.tBox[3]);
    if (!sA || !sB) {
        console.log(`| ${s.name} | INVALID TEST SEED | - | - | - | - |`);
        continue;
    }
    
    // Direct crossing check
    const direct = hasDirectCrossing([[sA.x, sA.y]], [[sB.x, sB.y]]);
    
    const minX = Math.floor((s.bbox[0] + 180) / 360 * SIM_W);
    const maxX = Math.floor((s.bbox[1] + 180) / 360 * SIM_W);
    const minY = Math.floor((90 - s.bbox[3]) / 180 * SIM_H);
    const maxY = Math.floor((90 - s.bbox[2]) / 180 * SIM_H);
    
    const pathLen = floodFillLocalPathLength(sA.x, sA.y, sB.x, sB.y, minX, minY, maxX, maxY);
    const result = (direct || pathLen !== -1) ? "OPEN" : "CLOSED";
    
    console.log(`| ${s.name} | ${sA.x},${sA.y} | ${sB.x},${sB.y} | ${direct ? 'OPEN' : 'NONE'} | ${pathLen === -1 ? 'NONE' : pathLen} | ${result} |`);
}

// 3. Deep Interior Validator
function validateInterior(name, minLon, maxLon, minLat, maxLat) {
    const minX = Math.floor((minLon + 180) / 360 * SIM_W);
    const maxX = Math.floor((maxLon + 180) / 360 * SIM_W);
    const minY = Math.floor((90 - maxLat) / 180 * SIM_H);
    const maxY = Math.floor((90 - minLat) / 180 * SIM_H);
    
    let tested = 0;
    let open = 0;
    let closed = 0;
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const idx = y * SIM_W + x;
            if (simGrid[idx] !== 0) continue;
            
            // Check East
            if (x < maxX) {
                const eIdx = y * SIM_W + (x + 1);
                if (simGrid[eIdx] === 0) {
                    tested++;
                    if (edgeMask[idx] & 2) open++; else closed++;
                }
            }
            // Check South
            if (y < maxY) {
                const eIdx = (y + 1) * SIM_W + x;
                if (simGrid[eIdx] === 0) {
                    tested++;
                    if (edgeMask[idx] & 4) open++; else closed++;
                }
            }
            
            if (tested >= 1000) break;
        }
        if (tested >= 1000) break;
    }
    const openPct = tested > 0 ? ((open / tested) * 100).toFixed(1) : 0;
    console.log(`| ${name} | ${tested} | ${open} | ${closed} | ${openPct}% |`);
}

console.log("\nDEEP INTERIOR TABLE:");
console.log("| Region | tested | open | closed | open% |");
console.log("|---|---|---|---|---|");
validateInterior("France", 0, 5, 45, 48);
validateInterior("Germany", 8, 13, 49, 52);
validateInterior("Poland", 16, 22, 50, 53);
validateInterior("Sahara", 10, 25, 15, 25);
validateInterior("Central Siberia", 90, 110, 60, 65);
validateInterior("Central USA", -105, -95, 35, 45);
validateInterior("Central Brazil", -60, -50, -15, -5);
validateInterior("Central Australia", 130, 140, -28, -22);

// 4. Island Tests
function getComponentSize(sx, sy) {
    const q = [sy * SIM_W + sx];
    const visited = new Set([q[0]]);
    let head = 0;
    while(head < q.length) {
        const u = q[head++];
        const cx = u % SIM_W;
        const cy = Math.floor(u / SIM_W);
        const e = edgeMask[u];
        
        const neighbors = [];
        if ((e & 1) && cy > 0) neighbors.push((cy-1)*SIM_W + cx);
        if (e & 2) neighbors.push(cy*SIM_W + ((cx+1)%SIM_W));
        if ((e & 4) && cy < SIM_H-1) neighbors.push((cy+1)*SIM_W + cx);
        if (e & 8) neighbors.push(cy*SIM_W + ((cx-1+SIM_W)%SIM_W));
        
        for (let nidx of neighbors) {
            if (!visited.has(nidx)) {
                visited.add(nidx);
                q.push(nidx);
            }
        }
    }
    return visited.size;
}

function countSupportCells(minLon, maxLon, minLat, maxLat) {
    const minX = Math.floor((minLon + 180) / 360 * SIM_W);
    const maxX = Math.floor((maxLon + 180) / 360 * SIM_W);
    const minY = Math.floor((90 - maxLat) / 180 * SIM_H);
    const maxY = Math.floor((90 - minLat) / 180 * SIM_H);
    let count = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (simGrid[y * SIM_W + x] === 0) count++;
        }
    }
    return count;
}

const islands = [
    { name: "Great Britain", box: [-5, 1, 51, 58] },
    { name: "Ireland", box: [-10, -6, 51.5, 55.2] },
    { name: "Iceland", box: [-24, -14, 63, 66.5] },
    { name: "Japan", box: [130, 142, 33, 41] },
    { name: "Taiwan", box: [120, 122, 22, 25] },
    { name: "Sri Lanka", box: [79.5, 81.5, 6, 9.5] },
    { name: "Cuba", box: [-84, -74, 19.5, 23.5] },
    { name: "Hispaniola", box: [-74, -68, 18, 20] },
    { name: "Madagascar", box: [43, 50, -25, -12] },
    { name: "Sardinia", box: [8, 10, 39, 41] },
    { name: "Corsica", box: [8.5, 9.5, 41.5, 43] },
    { name: "Sicily", box: [12, 15.5, 36.5, 38.5] },
    { name: "New Zealand North", box: [172, 178, -41.5, -34.5] },
    { name: "New Zealand South", box: [166, 174, -47, -40.5] }
];

console.log("\nISLAND TABLE:");
console.log("| Island | Support Cells | Traversal Comp Size | Connected to Mainland |");
console.log("|---|---|---|---|");

for (const isl of islands) {
    const seed = findLandCell(isl.box[0], isl.box[1], isl.box[2], isl.box[3]);
    if (!seed) {
        console.log(`| ${isl.name} | INVALID SEED | - | - |`);
        continue;
    }
    const sCells = countSupportCells(isl.box[0], isl.box[1], isl.box[2], isl.box[3]);
    const compSize = getComponentSize(seed.x, seed.y);
    const connected = compSize > 50000 ? "YES" : "NO";
    console.log(`| ${isl.name} | ${sCells} | ${compSize} | ${connected} |`);
}
