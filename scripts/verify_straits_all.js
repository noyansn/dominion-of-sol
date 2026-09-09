const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');

function floodFillLocal(sx, sy, minX, minY, maxX, maxY) {
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
            let nx = nidx % SIM_W;
            let ny = Math.floor(nidx / SIM_W);
            
            // Handle wrap-around for Bering Strait
            let bx = nx;
            if (minX < 0 && nx > 800) bx -= SIM_W;
            
            if (bx >= minX && bx <= maxX && ny >= minY && ny <= maxY) {
                if (!visited.has(nidx)) {
                    visited.add(nidx);
                    q.push(nidx);
                }
            }
        }
    }
    return visited;
}

const straits = [
    { name: "Dover", p1: [488, 133], p2: [493, 134], box: [486, 126, 502, 137] }, // Added realistic points
    { name: "Gibraltar", p1: [486, 168], p2: [488, 171], box: [484, 163, 492, 172] },
    { name: "Bosphorus", p1: [564, 152], p2: [565, 154], box: [563, 151, 567, 155] },
    { name: "Dardanelles", p1: [559, 154], p2: [561, 157], box: [558, 153, 563, 158] },
    { name: "Bab-el-Mandeb", p1: [601, 237], p2: [608, 243], box: [601, 237, 608, 243] }, // Needs proper points, using bounding box corners
    { name: "Bering Strait", p1: [-20, 60], p2: [10, 60], box: [-24, 56, 15, 68] },
    { name: "Malacca", p1: [753, 261], p2: [765, 273], box: [753, 261, 765, 273] },
    { name: "Taiwan Strait", p1: [826, 203], p2: [836, 215], box: [826, 203, 836, 215] },
    { name: "Korea Strait", p1: [846, 170], p2: [856, 170], box: [846, 167, 856, 176] }
];

for (let s of straits) {
    let sx = s.p1[0], sy = s.p1[1];
    if (sx < 0) sx += SIM_W;
    
    let tx = s.p2[0], ty = s.p2[1];
    if (tx < 0) tx += SIM_W;
    const targetIdx = ty * SIM_W + tx;

    if (simGrid[targetIdx] !== 0) {
        console.log(`| ${s.name} | TARGET NOT LAND |`);
    } else if (simGrid[sy * SIM_W + sx] !== 0) {
        console.log(`| ${s.name} | START NOT LAND |`);
    } else {
        const comp = floodFillLocal(sx, sy, s.box[0], s.box[1], s.box[2], s.box[3]);
        const isConnected = comp.has(targetIdx);
        console.log(`| ${s.name} | ${isConnected ? 'OPEN' : 'CLOSED'} |`);
    }
}
