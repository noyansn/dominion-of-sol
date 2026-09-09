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

const straits = [
    { name: "Dover", p1: [487, 108], p2: [498, 151], expected: false },
    { name: "Gibraltar", p1: [484, 151], p2: [484, 172], expected: false },
    { name: "Bab-el-Mandeb", p1: [601, 237], p2: [608, 243], expected: false },
    { name: "Bering Strait", p1: [990, 127], p2: [20, 127], expected: false },
    { name: "Korea Strait", p1: [846, 170], p2: [857, 170], expected: false }
];

for (let s of straits) {
    const comp = floodFillTopology(s.p1[0], s.p1[1]);
    const p2Idx = s.p2[1] * SIM_W + s.p2[0];
    const isConnected = comp.has(p2Idx);
    console.log(`| ${s.name} | ${isConnected ? 'OPEN' : 'CLOSED'} | (EXPECTED ${s.expected ? 'OPEN' : 'CLOSED'})`);
}
