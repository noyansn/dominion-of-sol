const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');

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

const africa = floodFillTopology(601, 237); // Assuming Africa
console.log('Africa component size:', africa.size);
console.log('Is 608, 237 (Arabia) connected?', africa.has(237 * SIM_W + 608));
console.log('Is 608, 243 (Arabia) connected?', africa.has(243 * SIM_W + 608));
