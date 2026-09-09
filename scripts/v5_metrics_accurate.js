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

const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5.bin');

// Flood Fill from Seed
function floodFill(sx, sy) {
    const visited = new Set();
    const q = [sy * SIM_W + sx];
    visited.add(q[0]);
    
    let head = 0;
    while(head < q.length) {
        const u = q[head++];
        const cx = u % SIM_W;
        const cy = Math.floor(u / SIM_W);
        
        const neighbors = [
            {x: cx, y: cy-1},
            {x: cx+1, y: cy},
            {x: cx, y: cy+1},
            {x: cx-1, y: cy}
        ];
        
        for (let n of neighbors) {
            if (n.y >= 0 && n.y < SIM_H) {
                let nx = n.x;
                if (nx < 0) nx += SIM_W;
                if (nx >= SIM_W) nx -= SIM_W;
                const nidx = n.y * SIM_W + nx;
                if (simGrid[nidx] === 0 && !visited.has(nidx)) {
                    visited.add(nidx);
                    q.push(nidx);
                }
            }
        }
    }
    return visited;
}

console.log("--- PHASE 13: CONTINENT DEEP INTERIOR ---");
// Seeds found by manually inspecting coordinates
const continents = {
    "Eurasia/Africa": {x: 498, y: 151}, // France
    "North America": {x: 215, y: 160},
    "South America": {x: 330, y: 310},
    "Australia": {x: 870, y: 347}
};

for (let [name, seed] of Object.entries(continents)) {
    const comp = floodFill(seed.x, seed.y);
    // Count open edges among ALL cells in this connected component
    let totalEdges = 0;
    let openEdges = 0;
    
    for (let u of comp) {
        const cy = Math.floor(u / SIM_W);
        const cx = u % SIM_W;
        const e = edgeMask[u];
        
        // N
        if (cy > 0 && simGrid[(cy-1)*SIM_W + cx] === 0) {
            totalEdges++;
            if ((e & 1) !== 0) openEdges++;
        }
        // E
        let ex = cx+1; if (ex>=SIM_W) ex-=SIM_W;
        if (simGrid[cy*SIM_W + ex] === 0) {
            totalEdges++;
            if ((e & 2) !== 0) openEdges++;
        }
        // S
        if (cy < SIM_H-1 && simGrid[(cy+1)*SIM_W + cx] === 0) {
            totalEdges++;
            if ((e & 4) !== 0) openEdges++;
        }
        // W
        let wx = cx-1; if (wx<0) wx+=SIM_W;
        if (simGrid[cy*SIM_W + wx] === 0) {
            totalEdges++;
            if ((e & 8) !== 0) openEdges++;
        }
    }
    console.log(`| ${name} | cells: ${comp.size} | edges_open_internal: ${openEdges} / ${totalEdges} |`);
}

console.log("\n--- PHASE 14: ISLAND CELLS ---");
const islands = {
    "Great Britain": {x: 489, y: 110},
    "Ireland": {x: 477, y: 110},
    "Iceland": {x: 458, y: 91},
    "Japan (Honshu)": {x: 854, y: 160},
    "Taiwan": {x: 825, y: 202},
    "Sri Lanka": {x: 731, y: 232},
    "Cuba": {x: 224, y: 201}, // need check
    "Hispaniola": {x: 257, y: 208}, // need check
    "Madagascar": {x: 625, y: 330},
    "New Zealand South": {x: 947, y: 446},
    "New Zealand North": {x: 955, y: 420},
    "Sardinia": {x: 516, y: 160}
};

for (let [name, seed] of Object.entries(islands)) {
    if (simGrid[seed.y * SIM_W + seed.x] === 0) {
        const comp = floodFill(seed.x, seed.y);
        console.log(`| ${name} | ${comp.size} |`);
    } else {
        // Try to find a nearby cell
        let found = false;
        for (let r=1; r<=20; r++) {
            for (let dy=-r; dy<=r; dy++) {
                for (let dx=-r; dx<=r; dx++) {
                    if (seed.y+dy >= 0 && seed.y+dy < SIM_H) {
                        let nx = seed.x+dx; if(nx<0) nx+=SIM_W; if(nx>=SIM_W) nx-=SIM_W;
                        if (simGrid[(seed.y+dy)*SIM_W + nx] === 0) {
                            const comp = floodFill(nx, seed.y+dy);
                            console.log(`| ${name} | ${comp.size} | (seed adjusted to ${nx},${seed.y+dy})`);
                            found = true;
                            break;
                        }
                    }
                }
                if(found) break;
            }
            if(found) break;
        }
        if (!found) console.log(`| ${name} | 0 | (NOT FOUND)`);
    }
}
