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
    const val = visBuf[y * W_W + x];
    return val >= 128;
}

// PHASE 4: KNOWN COORDINATE SANITY
console.log("--- PHASE 4: COORDINATE SANITY ---");
const sanityPoints = {
    "Central France": [498, 153], 
    "Central Germany": [515, 140],
    "Sahara interior": [520, 200],
    "Central Brazil": [330, 310],
    "Central Australia": [870, 370],
    "Central Siberia": [750, 100],
    "mid Atlantic": [400, 200],
    "mid Pacific": [100, 250],
    "Indian Ocean": [700, 320]
};

for (let [name, coords] of Object.entries(sanityPoints)) {
    const sx = coords[0];
    const sy = coords[1];
    let landPix = 0;
    let vals = [];
    for (let dy = 0; dy < RATIO; dy++) {
        for (let dx = 0; dx < RATIO; dx++) {
            const vx = sx * RATIO + dx;
            const vy = sy * RATIO + dy;
            const val = visBuf[vy * W_W + vx];
            vals.push(val);
            if (val >= 128) landPix++;
        }
    }
    console.log(`${name} [${sx},${sy}]: landPixelCount=${landPix} raw=[${vals.join(',')}]`);
}

// PHASE 5 & 6: EXACT 4x4 SUPPORT MASK
console.log("\n--- PHASE 5 & 6: SUPPORT MASK ---");
const simGrid = new Uint8Array(SIM_W * SIM_H);
const landPixelCountHist = new Array(17).fill(0);
let baseLandCount = 0;
let baseWaterCount = 0;
const pixelCounts = new Int32Array(SIM_W * SIM_H);

for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        let landPix = 0;
        for (let dy = 0; dy < RATIO; dy++) {
            for (let dx = 0; dx < RATIO; dx++) {
                if (getVisualPixel(sx * RATIO + dx, sy * RATIO + dy)) {
                    landPix++;
                }
            }
        }
        landPixelCountHist[landPix]++;
        pixelCounts[sy * SIM_W + sx] = landPix;
        
        if (landPix >= 1) {
            simGrid[sy * SIM_W + sx] = 0; // LAND
            baseLandCount++;
        } else {
            simGrid[sy * SIM_W + sx] = 2; // WATER
            baseWaterCount++;
        }
    }
}
console.log("LAND cells:", baseLandCount);
console.log("WATER cells:", baseWaterCount);
for(let i=0; i<=16; i++) {
    console.log(`count[${i}]=${landPixelCountHist[i]}`);
}
fs.writeFileSync('../server/assets/world_grid_candidate_v5_support.bin', simGrid);

// False water / False land against visual mask (by definition should be 0)
let falseWater = 0, falseLand = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    const isLand = simGrid[i] === 0;
    const hasPix = pixelCounts[i] >= 1;
    if (isLand && !hasPix) falseLand++;
    if (!isLand && hasPix) falseWater++;
}
console.log("falseWater against SAME visual mask =", falseWater);
console.log("falseLand against SAME visual mask =", falseLand);

// PHASE 8 & 9: EDGE MASK
console.log("\n--- PHASE 8 & 9: EDGE MASK ---");
const edgeMask = new Uint8Array(SIM_W * SIM_H);
let openN = 0, openE = 0, openS = 0, openW = 0;

function checkH(sxA, syA, sxB, syB) {
    for (let dy = 0; dy < RATIO; dy++) {
        if (getVisualPixel(sxA * RATIO + 3, syA * RATIO + dy) && 
            getVisualPixel(sxB * RATIO + 0, syB * RATIO + dy)) {
            return true;
        }
    }
    return false;
}
function checkV(sxA, syA, sxB, syB) {
    for (let dx = 0; dx < RATIO; dx++) {
        if (getVisualPixel(sxA * RATIO + dx, syA * RATIO + 3) && 
            getVisualPixel(sxB * RATIO + dx, syB * RATIO + 0)) {
            return true;
        }
    }
    return false;
}

for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        const u = sy * SIM_W + sx;
        if (simGrid[u] !== 0) continue; // WATER cells have 0 open edges
        
        // North
        if (sy > 0) {
            const n_sx = sx; const n_sy = sy - 1;
            const v = n_sy * SIM_W + n_sx;
            if (simGrid[v] === 0 && checkV(n_sx, n_sy, sx, sy)) {
                edgeMask[u] |= (1 << 0);
                openN++;
            }
        }
        // East
        let e_sx = sx + 1; if (e_sx >= SIM_W) e_sx -= SIM_W;
        const e_sy = sy;
        const v_e = e_sy * SIM_W + e_sx;
        if (simGrid[v_e] === 0 && checkH(sx, sy, e_sx, e_sy)) {
            edgeMask[u] |= (1 << 1);
            openE++;
        }
        // South
        if (sy < SIM_H - 1) {
            const s_sx = sx; const s_sy = sy + 1;
            const v_s = s_sy * SIM_W + s_sx;
            if (simGrid[v_s] === 0 && checkV(sx, sy, s_sx, s_sy)) {
                edgeMask[u] |= (1 << 2);
                openS++;
            }
        }
        // West
        let w_sx = sx - 1; if (w_sx < 0) w_sx += SIM_W;
        const w_sy = sy;
        const v_w = w_sy * SIM_W + w_sx;
        if (simGrid[v_w] === 0 && checkH(w_sx, w_sy, sx, sy)) {
            edgeMask[u] |= (1 << 3);
            openW++;
        }
    }
}
fs.writeFileSync('../server/assets/world_land_edges_candidate_v5.bin', edgeMask);

// PHASE 10: SYMMETRY
console.log("\n--- PHASE 10: SYMMETRY ---");
let symMismatch = 0;
let waterOpen = 0;
for (let sy = 0; sy < SIM_H; sy++) {
    for (let sx = 0; sx < SIM_W; sx++) {
        const u = sy * SIM_W + sx;
        const e = edgeMask[u];
        if (simGrid[u] !== 0 && e !== 0) waterOpen++;
        
        let n_e = 0, e_e = 0, s_e = 0, w_e = 0;
        
        if (sy > 0) {
            n_e = edgeMask[(sy-1)*SIM_W + sx];
        }
        let e_sx = sx + 1; if (e_sx >= SIM_W) e_sx -= SIM_W;
        e_e = edgeMask[sy*SIM_W + e_sx];
        
        if (sy < SIM_H - 1) {
            s_e = edgeMask[(sy+1)*SIM_W + sx];
        }
        let w_sx = sx - 1; if (w_sx < 0) w_sx += SIM_W;
        w_e = edgeMask[sy*SIM_W + w_sx];
        
        const my_n = (e >> 0) & 1;
        const my_e = (e >> 1) & 1;
        const my_s = (e >> 2) & 1;
        const my_w = (e >> 3) & 1;
        
        const their_s = (n_e >> 2) & 1;
        const their_w = (e_e >> 3) & 1;
        const their_n = (s_e >> 0) & 1;
        const their_e = (w_e >> 1) & 1;
        
        if (sy > 0 && my_n !== their_s) symMismatch++;
        if (my_e !== their_w) symMismatch++;
        if (sy < SIM_H - 1 && my_s !== their_n) symMismatch++;
        if (my_w !== their_e) symMismatch++;
    }
}
console.log("symmetry mismatches =", symMismatch);
console.log("water-cell open-edge violations =", waterOpen);

// PHASE 13: CONTINENT INTERIOR
console.log("\n--- PHASE 13: DEEP INTERIOR ---");
const continents = {
    "France": [498, 153],
    "Germany": [515, 140],
    "Poland": [525, 135],
    "Sahara": [520, 200],
    "Siberia": [750, 100],
    "Brazil": [330, 310],
    "central USA": [215, 160],
    "Australia": [870, 370]
};
for (let [name, coords] of Object.entries(continents)) {
    const sx = coords[0];
    const sy = coords[1];
    
    // Sample a 10x10 block
    let totalEdges = 0;
    let openEdges = 0;
    for (let y = sy - 5; y < sy + 5; y++) {
        for (let x = sx - 5; x < sx + 5; x++) {
            if (y >= 0 && y < SIM_H) {
                const u = y * SIM_W + x;
                if (simGrid[u] === 0) {
                    const e = edgeMask[u];
                    
                    // Check North
                    if (y > 0 && simGrid[(y-1)*SIM_W + x] === 0) { totalEdges++; if ((e & 1) !== 0) openEdges++; }
                    // East
                    if (simGrid[y*SIM_W + (x+1)] === 0) { totalEdges++; if ((e & 2) !== 0) openEdges++; }
                    // South
                    if (y < SIM_H-1 && simGrid[(y+1)*SIM_W + x] === 0) { totalEdges++; if ((e & 4) !== 0) openEdges++; }
                    // West
                    if (simGrid[y*SIM_W + (x-1)] === 0) { totalEdges++; if ((e & 8) !== 0) openEdges++; }
                }
            }
        }
    }
    console.log(`| ${name} | ${openEdges} / ${totalEdges} |`);
}

// PHASE 12: LOCAL STRAITS
console.log("\n--- PHASE 12: LOCAL STRAITS ---");
// Re-use logic: for edge crossing, do any two cells on opposite banks connect via an edge path?
function hasEdgeCrossing(minX, minY, maxX, maxY) {
    const visited = new Set();
    const clusters = [];
    for (let y = minY; y <= Math.min(maxY, SIM_H - 1); y++) {
        for (let x = minX; x <= maxX; x++) {
            let wx = x;
            if (wx < 0) wx += SIM_W;
            if (wx >= SIM_W) wx -= SIM_W;
            const idx = y * SIM_W + wx;
            if (simGrid[idx] === 0 && !visited.has(idx)) {
                const comp = new Set();
                const q = [idx];
                visited.add(idx);
                let head = 0;
                while (head < q.length) {
                    const u = q[head++];
                    comp.add(u);
                    const uy = Math.floor(u / SIM_W);
                    const ux = u % SIM_W;
                    const e = edgeMask[u];
                    
                    const neighbors = [];
                    if ((e & 1) && uy > 0) neighbors.push((uy-1)*SIM_W + ux);
                    if ((e & 2)) neighbors.push(uy*SIM_W + ((ux+1)%SIM_W));
                    if ((e & 4) && uy < SIM_H-1) neighbors.push((uy+1)*SIM_W + ux);
                    if ((e & 8)) neighbors.push(uy*SIM_W + ((ux-1+SIM_W)%SIM_W));
                    
                    for (let nidx of neighbors) {
                        const nx = nidx % SIM_W;
                        const ny = Math.floor(nidx / SIM_W);
                        // Convert nx to unbounded x for bbox check
                        // Bering strait wrapper:
                        let bx = nx;
                        if (bx > 800 && minX < 100) bx -= SIM_W;
                        
                        if (bx >= minX && bx <= maxX && ny >= minY && ny <= maxY) {
                            if (!visited.has(nidx)) {
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
    for (let c of clusters) {
        let min_cx = 9999, max_cx = -9999, min_cy = 9999, max_cy = -9999;
        for (let idx of c) {
            let cx = idx % SIM_W;
            let cy = Math.floor(idx / SIM_W);
            if (cx > 800 && minX < 100) cx -= SIM_W;
            if (cx < min_cx) min_cx = cx;
            if (cx > max_cx) max_cx = cx;
            if (cy < min_cy) min_cy = cy;
            if (cy > max_cy) max_cy = cy;
        }
        if ((max_cx - min_cx >= (maxX - minX) - 2) || (max_cy - min_cy >= (maxY - minY) - 2)) {
            return true;
        }
    }
    return false;
}

const straits = [
    { name: "Dover", box: [486, 126, 502, 137] },
    { name: "Gibraltar", box: [484, 163, 492, 172] },
    { name: "Bosphorus", box: [563, 151, 567, 155] },
    { name: "Dardanelles", box: [558, 153, 563, 158] },
    { name: "Bab-el-Mandeb", box: [601, 237, 608, 243] },
    { name: "Bering Strait", box: [-24, 56, 15, 68] },
    { name: "Malacca", box: [753, 261, 765, 273] },
    { name: "Taiwan Strait", box: [826, 203, 836, 215] },
    { name: "Korea Strait", box: [846, 167, 856, 176] }
];
for (let s of straits) {
    console.log(`| ${s.name} | ${hasEdgeCrossing(s.box[0], s.box[1], s.box[2], s.box[3])} |`);
}

// PHASE 14: ISLAND CELLS
console.log("\n--- PHASE 14: ISLANDS ---");
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
for (let i of islands) {
    let cells = 0;
    for (let y = i.box[1]; y <= i.box[3]; y++) {
        for (let x = i.box[0]; x <= i.box[2]; x++) {
            if (simGrid[y * SIM_W + x] === 0) cells++;
        }
    }
    console.log(`| ${i.name} | ${cells} |`);
}

// PHASE 15: POLITICAL KPI
let polUnrep = 0;
for (let y = 0; y < W_H; y++) {
    for (let x = 0; x < W_W; x++) {
        if (getVisualPixel(x, y)) {
            const sx = Math.floor(x / RATIO);
            const sy = Math.floor(y / RATIO);
            if (simGrid[sy * SIM_W + sx] !== 0) {
                polUnrep++;
            }
        }
    }
}
console.log(`politicallyUnrepresentablePixels = ${polUnrep}`);

fs.writeFileSync('v5_metrics.json', JSON.stringify({
    baseLandCount, baseWaterCount,
    landPixelCountHist, falseWater, falseLand,
    openN, openE, openS, openW, symMismatch, waterOpen, polUnrep
}));
