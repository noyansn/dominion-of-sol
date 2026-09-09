const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');

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
            if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
                if (!visited.has(nidx)) {
                    visited.add(nidx);
                    q.push(nidx);
                }
            }
        }
    }
    return visited;
}

const africaLocal = floodFillLocal(601, 237, 601, 237, 608, 243);
console.log('Africa local component size:', africaLocal.size);
console.log('Is 608, 237 (Arabia) connected LOCALLY?', africaLocal.has(237 * SIM_W + 608));
console.log('Is 608, 243 (Arabia) connected LOCALLY?', africaLocal.has(243 * SIM_W + 608));
