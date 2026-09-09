const fs = require('fs');

const SIM_W = 1024;
const SIM_H = 512;

const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');

// Flood Fill from Seed (Using Edges for Topology)
function floodFillTopology(sx, sy) {
    const visited = new Set();
    const q = [sy * SIM_W + sx];
    visited.add(q[0]);
    
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
    return visited;
}

// Flood Fill using only Support Grid (for Islands base sizes)
function floodFillSupport(sx, sy) {
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

console.log("--- 11. LOCAL STRAIT VALIDATION ---");
// Check if crossing exists directly via edges
function hasEdgeCrossing(minX, minY, maxX, maxY) {
    // Just find components strictly within the bbox (or slightly outside for wrap)
    // Actually, straits logic can be simple: if I start flood-fill topology from one side, does it reach the other?
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
                        let nx = nidx % SIM_W;
                        const ny = Math.floor(nidx / SIM_W);
                        let bx = nx;
                        if (bx > 800 && minX < 100) bx -= SIM_W; // Bering wrap
                        
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
            return true; // CLOSED strait implies they are separated, so passing this box means they are connected (OPEN)
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
    const isConnected = hasEdgeCrossing(s.box[0], s.box[1], s.box[2], s.box[3]);
    console.log(`| ${s.name} | ${isConnected ? 'OPEN' : 'CLOSED'} | (EXPECTED CLOSED)`);
}

console.log("\n--- 12. DEEP INTERIOR VALIDATOR ---");
const interiorSeeds = {
    "France": {x: 498, y: 151},
    "Germany": {x: 515, y: 142},
    "Poland": {x: 525, y: 135},
    "Sahara": {x: 520, y: 200},
    "Central Siberia": {x: 750, y: 100},
    "Central USA": {x: 215, y: 160},
    "Central Brazil": {x: 330, y: 310},
    "Central Australia": {x: 870, y: 347}
};

for (let [name, seed] of Object.entries(interiorSeeds)) {
    let tested = 0, open = 0, closed = 0;
    // Walk out using BFS, gather up to 1000 pairs
    const visited = new Set();
    const q = [seed.y * SIM_W + seed.x];
    visited.add(q[0]);
    let head = 0;
    
    while(head < q.length && tested < 1000) {
        const u = q[head++];
        const cx = u % SIM_W;
        const cy = Math.floor(u / SIM_W);
        const e = edgeMask[u];
        
        // N
        if (cy > 0 && simGrid[(cy-1)*SIM_W + cx] === 0) {
            tested++;
            if (e & 1) open++; else closed++;
            const nidx = (cy-1)*SIM_W + cx;
            if(!visited.has(nidx)) { visited.add(nidx); q.push(nidx); }
        }
        // E
        let ex = cx+1; if(ex>=SIM_W) ex-=SIM_W;
        if (simGrid[cy*SIM_W + ex] === 0) {
            tested++;
            if (e & 2) open++; else closed++;
            const nidx = cy*SIM_W + ex;
            if(!visited.has(nidx)) { visited.add(nidx); q.push(nidx); }
        }
        // S
        if (cy < SIM_H-1 && simGrid[(cy+1)*SIM_W + cx] === 0) {
            tested++;
            if (e & 4) open++; else closed++;
            const nidx = (cy+1)*SIM_W + cx;
            if(!visited.has(nidx)) { visited.add(nidx); q.push(nidx); }
        }
        // W
        let wx = cx-1; if(wx<0) wx+=SIM_W;
        if (simGrid[cy*SIM_W + wx] === 0) {
            tested++;
            if (e & 8) open++; else closed++;
            const nidx = cy*SIM_W + wx;
            if(!visited.has(nidx)) { visited.add(nidx); q.push(nidx); }
        }
    }
    const percent = ((open / tested) * 100).toFixed(2);
    console.log(`| ${name} | tested: ${tested} | OPEN: ${open} | CLOSED: ${closed} | %: ${percent} |`);
}

console.log("\n--- 13. ISLAND VALIDATOR ---");
const islandSeeds = {
    "Great Britain": {x: 487, y: 108},
    "Ireland": {x: 482, y: 107},
    "Iceland": {x: 454, y: 75},
    "Japan (Honshu)": {x: 854, y: 160},
    "Taiwan": {x: 825, y: 202},
    "Sri Lanka": {x: 731, y: 232},
    "Cuba": {x: 235, y: 205},
    "Hispaniola": {x: 260, y: 210},
    "Madagascar": {x: 635, y: 320},
    "Sardinia": {x: 516, y: 160},
    "Corsica": {x: 516, y: 156},
    "Sicily": {x: 527, y: 170},
    "New Zealand North": {x: 963, y: 411},
    "New Zealand South": {x: 949, y: 450}
};
for (let [name, seed] of Object.entries(islandSeeds)) {
    if (simGrid[seed.y * SIM_W + seed.x] === 0) {
        // Use topological flood fill to find the actual island size
        const comp = floodFillTopology(seed.x, seed.y);
        console.log(`| ${name} | Topology Component Size: ${comp.size} |`);
    } else {
        console.log(`| ${name} | Seed is not land! |`);
    }
}

console.log("\n--- 15. CONTINENT CONNECTIVITY ---");
const visitedTop = new Set();
const components = [];
for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (simGrid[i] === 0 && !visitedTop.has(i)) {
        const cx = i % SIM_W;
        const cy = Math.floor(i / SIM_W);
        const comp = floodFillTopology(cx, cy);
        components.push(comp.size);
        for(let u of comp) visitedTop.add(u);
    }
}
components.sort((a,b) => b - a);
console.log(`Total traversal components: ${components.length}`);
console.log(`Largest 20: ${components.slice(0, 20).join(', ')}`);

const macroSeeds = {
    "North America": {x: 215, y: 160},
    "South America": {x: 330, y: 310},
    "Africa": {x: 550, y: 250},
    "Australia": {x: 870, y: 347},
    "Eurasia interiors": {x: 750, y: 100}
};
for (let [name, seed] of Object.entries(macroSeeds)) {
    const comp = floodFillTopology(seed.x, seed.y);
    console.log(`${name} component size: ${comp.size}`);
}
