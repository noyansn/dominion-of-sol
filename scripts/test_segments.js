const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin'));

const constraints = [
  { id: "gibraltar", segments: [[[-8.0, 36.0], [-4.0, 35.8]]] },
  { id: "messina", segments: [[[15.2, 38.6], [16.0, 37.8]]] },
  { id: "bonifacio", segments: [[[8.0, 41.5], [10.0, 41.1]]] },
  { id: "bering", segments: [[[-172.0, 75.0], [-168.0, 55.0]]] },
  { id: "bosphorus", segments: [[[28.0, 41.8], [29.5, 40.8]]] },
  { id: "dardanelles", segments: [[[25.5, 40.5], [26.8, 39.8]]] },
  { id: "bab-el-mandeb", segments: [[[42.5, 12.0], [44.0, 13.5]]] },
  { id: "cook", segments: [[[173.8, -40.8], [175.5, -42.0]]] }
];

function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
function intersects(A, B, C, D) { return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D); }
function lonLatToSim(lon, lat) { return { x: (lon + 180) / 360 * SIM_W, y: (90 - lat) / 180 * SIM_H }; }

for (const constraint of constraints) {
    let closed = 0;
    for (const segment of constraint.segments) {
        const A = lonLatToSim(segment[0][0], segment[0][1]);
        const B = lonLatToSim(segment[1][0], segment[1][1]);
        const minX = Math.floor(Math.min(A.x, B.x)) - 1;
        const maxX = Math.ceil(Math.max(A.x, B.x)) + 1;
        const minY = Math.floor(Math.min(A.y, B.y)) - 1;
        const maxY = Math.ceil(Math.max(A.y, B.y)) + 1;
        
        for (let y = minY; y <= maxY; y++) {
            if (y < 0 || y >= SIM_H) continue;
            for (let x = minX; x <= maxX; x++) {
                let bx = x;
                if (bx < 0) bx += SIM_W;
                if (bx >= SIM_W) bx -= SIM_W;
                
                const idx = y * SIM_W + bx;
                const e = edgeMask[idx];
                
                if (e & 2) {
                    if (intersects(A, B, {x: x+1, y}, {x: x+1, y: y+1})) {
                        closed += 2;
                    }
                }
                if ((e & 4) && y < SIM_H - 1) {
                    if (intersects(A, B, {x, y: y+1}, {x: x+1, y: y+1})) {
                        closed += 2;
                    }
                }
            }
        }
    }
    console.log(`${constraint.id}: ${closed} edges closed`);
}
