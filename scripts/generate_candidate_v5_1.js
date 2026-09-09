const fs = require('fs');

const SIM_W = 1024;
const SIM_H = 512;
const EPSILON = 1e-4;
const SAMPLES_PER_EDGE = 64;
const MIN_CONSECUTIVE = 2;

console.log("Loading datasets...");
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const canonical = JSON.parse(fs.readFileSync('../client/src/assets/canonical_geography.json', 'utf8'));

console.log(`Land polygons: ${canonical.land.length}, Waterbodies: ${canonical.waterBodies.length}`);

// Build spatial index
const landGrid = new Array(SIM_W * SIM_H);
const waterGrid = new Array(SIM_W * SIM_H);
for (let i = 0; i < SIM_W * SIM_H; i++) {
    landGrid[i] = [];
    waterGrid[i] = [];
}

function computeBBox(poly) {
    let minX = 9999, minY = 9999, maxX = -9999, maxY = -9999;
    for (const p of poly) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
    }
    return { minX, minY, maxX, maxY };
}

function addToGrid(grid, polyObj, index) {
    const box = computeBBox(polyObj.outer);
    const startX = Math.max(0, Math.floor(box.minX));
    const endX = Math.min(SIM_W - 1, Math.floor(box.maxX));
    const startY = Math.max(0, Math.floor(box.minY));
    const endY = Math.min(SIM_H - 1, Math.floor(box.maxY));
    
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            grid[y * SIM_W + x].push(index);
        }
    }
}

canonical.land.forEach((l, i) => addToGrid(landGrid, l, i));
canonical.waterBodies.forEach((w, i) => addToGrid(waterGrid, w, i));

function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function isPointCanonicalLand(x, y) {
    // Handle world wrapping for querying
    let wx = x;
    if (wx < 0) wx += SIM_W;
    if (wx >= SIM_W) wx -= SIM_W;
    
    const cx = Math.floor(wx);
    const cy = Math.floor(y);
    if (cy < 0 || cy >= SIM_H) return false;
    
    const cellIdx = cy * SIM_W + cx;
    
    // Check land
    let inLand = false;
    for (const idx of landGrid[cellIdx]) {
        const l = canonical.land[idx];
        if (pointInPolygon(wx, y, l.outer)) {
            let inHole = false;
            if (l.holes) {
                for (const h of l.holes) {
                    if (pointInPolygon(wx, y, h)) {
                        inHole = true; break;
                    }
                }
            }
            if (!inHole) {
                inLand = true;
                break;
            }
        }
    }
    
    if (!inLand) return false;
    
    // Check waterbodies
    for (const idx of waterGrid[cellIdx]) {
        const w = canonical.waterBodies[idx];
        if (pointInPolygon(wx, y, w.outer)) {
            // Assume water bodies might have islands inside them? The canonical schema says waterbodies can have holes.
            let inWaterHole = false;
            if (w.holes) {
                for (const h of w.holes) {
                    if (pointInPolygon(wx, y, h)) {
                        inWaterHole = true; break;
                    }
                }
            }
            if (!inWaterHole) {
                return false;
            }
        }
    }
    
    return true;
}

// Geometric Edge Tester
function testSharedEdge(x_edge, y_start, y_end, isVertical) {
    let consecutive = 0;
    for (let i = 0; i < SAMPLES_PER_EDGE; i++) {
        let px, py;
        if (isVertical) {
            // Testing East/West edge
            px = x_edge;
            py = y_start + (i + 0.5) / SAMPLES_PER_EDGE;
            const sideA = isPointCanonicalLand(px - EPSILON, py);
            const sideB = isPointCanonicalLand(px + EPSILON, py);
            if (sideA && sideB) consecutive++; else consecutive = 0;
        } else {
            // Testing North/South edge (x_edge is actually y_edge here)
            py = x_edge;
            px = y_start + (i + 0.5) / SAMPLES_PER_EDGE;
            const sideA = isPointCanonicalLand(px, py - EPSILON);
            const sideB = isPointCanonicalLand(px, py + EPSILON);
            if (sideA && sideB) consecutive++; else consecutive = 0;
        }
        if (consecutive >= MIN_CONSECUTIVE) return true;
    }
    return false;
}

console.log("Generating edges...");
const edgeMask = new Uint8Array(SIM_W * SIM_H);
let adjacentLandPairs = 0;
let openEdges = 0;
let closedEdges = 0;
let uncertainEdges = 0; // Not uncertain because we have perfect canonical test

for (let cy = 0; cy < SIM_H; cy++) {
    for (let cx = 0; cx < SIM_W; cx++) {
        const u = cy * SIM_W + cx;
        if (simGrid[u] !== 0) continue; // Water cell has 0 edges
        
        // North
        if (cy > 0 && simGrid[(cy - 1) * SIM_W + cx] === 0) {
            adjacentLandPairs++;
            if (testSharedEdge(cy, cx, cx + 1, false)) {
                edgeMask[u] |= 1;
                openEdges++;
            } else {
                closedEdges++;
            }
        }
        
        // East
        let ex = cx + 1; if (ex >= SIM_W) ex -= SIM_W;
        if (simGrid[cy * SIM_W + ex] === 0) {
            adjacentLandPairs++;
            if (testSharedEdge(cx + 1, cy, cy + 1, true)) {
                edgeMask[u] |= 2;
                openEdges++;
            } else {
                closedEdges++;
            }
        }
        
        // South
        if (cy < SIM_H - 1 && simGrid[(cy + 1) * SIM_W + cx] === 0) {
            adjacentLandPairs++;
            if (testSharedEdge(cy + 1, cx, cx + 1, false)) {
                edgeMask[u] |= 4;
                openEdges++;
            } else {
                closedEdges++;
            }
        }
        
        // West
        let wx = cx - 1; if (wx < 0) wx += SIM_W;
        if (simGrid[cy * SIM_W + wx] === 0) {
            adjacentLandPairs++;
            if (testSharedEdge(cx, cy, cy + 1, true)) {
                edgeMask[u] |= 8;
                openEdges++;
            } else {
                closedEdges++;
            }
        }
    }
}

// Since we checked both N and S for A and B respectively using exactly the same line, symmetry is guaranteed.
// Let's verify symmetry
let symMismatch = 0;
let waterOpen = 0;
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        const u = y * SIM_W + x;
        const e = edgeMask[u];
        if (simGrid[u] !== 0 && e !== 0) waterOpen++;
        
        let n_e = 0, e_e = 0, s_e = 0, w_e = 0;
        if (y > 0) n_e = edgeMask[(y-1)*SIM_W + x];
        let ex = x + 1; if (ex >= SIM_W) ex -= SIM_W;
        e_e = edgeMask[y*SIM_W + ex];
        if (y < SIM_H - 1) s_e = edgeMask[(y+1)*SIM_W + x];
        let wx = x - 1; if (wx < 0) wx += SIM_W;
        w_e = edgeMask[y*SIM_W + wx];
        
        const my_n = (e >> 0) & 1;
        const my_e = (e >> 1) & 1;
        const my_s = (e >> 2) & 1;
        const my_w = (e >> 3) & 1;
        
        const their_s = (n_e >> 2) & 1;
        const their_w = (e_e >> 3) & 1;
        const their_n = (s_e >> 0) & 1;
        const their_e = (w_e >> 1) & 1;
        
        if (y > 0 && my_n !== their_s) symMismatch++;
        if (my_e !== their_w) symMismatch++;
        if (y < SIM_H - 1 && my_s !== their_n) symMismatch++;
        if (my_w !== their_e) symMismatch++;
    }
}

console.log("Writing output...");
fs.writeFileSync('../server/assets/world_land_edges_candidate_v5_1.bin', edgeMask);

fs.writeFileSync('v5_1_metrics.json', JSON.stringify({
    adjacentLandPairs, openEdges, closedEdges, uncertainEdges,
    symMismatch, waterOpen, EPSILON, SAMPLES_PER_EDGE, MIN_CONSECUTIVE
}));
console.log("Done generating.");
