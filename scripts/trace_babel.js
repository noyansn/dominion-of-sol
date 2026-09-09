const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');

let start = 237 * SIM_W + 601;
let target = 243 * SIM_W + 608;

const visited = new Int32Array(SIM_W*SIM_H).fill(-1);
const q = [start];
visited[start] = start;
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
        if (visited[nidx] === -1) {
            visited[nidx] = u;
            q.push(nidx);
            if (nidx === target) {
                let path = [];
                let curr = nidx;
                while(curr !== start) {
                    path.push({x: curr%SIM_W, y: Math.floor(curr/SIM_W)});
                    curr = visited[curr];
                }
                path.push({x: start%SIM_W, y: Math.floor(start/SIM_W)});
                path.reverse();
                console.log('Path found:', path);
                process.exit(0);
            }
        }
    }
}
console.log('No path');
