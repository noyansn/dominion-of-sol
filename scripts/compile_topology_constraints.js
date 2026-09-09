const fs = require('fs');

const SIM_W = 1024, SIM_H = 512;
const edgePath = '../server/assets/world_land_edges_candidate_v5_1.bin';
const constraintPath = '../server/assets/world_topology_constraints.json';
const outPath = '../server/assets/world_land_edges_candidate_v5_2.bin';

const edgeMask = Buffer.from(fs.readFileSync(edgePath));
const constraints = JSON.parse(fs.readFileSync(constraintPath, 'utf8'));

// Edge values: 1 = N, 2 = E, 4 = S, 8 = W

function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersects(A, B, C, D) {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function lonLatToSim(lon, lat) {
    const x = (lon + 180) / 360 * SIM_W;
    const y = (90 - lat) / 180 * SIM_H;
    return { x, y };
}

let totalClosed = 0;
let initialOpen = 0;
let finalOpen = 0;

for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e = edgeMask[i];
    if (e & 1) initialOpen++;
    if (e & 2) initialOpen++;
    if (e & 4) initialOpen++;
    if (e & 8) initialOpen++;
}

console.log(`V5.1 OPEN EDGE COUNT: ${initialOpen}`);
console.log("\nTOPOLOGY CONSTRAINTS:");

for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    let closedForThis = 0;
    
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
                
                // Path from center of (x, y) to center of (x+1, y)
                if (e & 2) {
                    const eIdx = y * SIM_W + ((bx + 1) % SIM_W);
                    const pathC = { x: x + 0.5, y: y + 0.5 };
                    const pathD = { x: x + 1.5, y: y + 0.5 };
                    
                    if (intersects(A, B, pathC, pathD)) {
                        edgeMask[idx] &= ~2; 
                        edgeMask[eIdx] &= ~8; 
                        closedForThis += 2;
                    }
                }
                
                // Path from center of (x, y) to center of (x, y+1)
                if ((e & 4) && y < SIM_H - 1) {
                    const eIdx = (y + 1) * SIM_W + bx;
                    const pathC = { x: x + 0.5, y: y + 0.5 };
                    const pathD = { x: x + 0.5, y: y + 1.5 };
                    
                    if (intersects(A, B, pathC, pathD)) {
                        edgeMask[idx] &= ~4; 
                        edgeMask[eIdx] &= ~1; 
                        closedForThis += 2;
                    }
                }
            }
        }
    }
    console.log(`| ${constraint.id} | ${constraint.name} | ${closedForThis} |`);
    totalClosed += closedForThis;
}

for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e = edgeMask[i];
    if (e & 1) finalOpen++;
    if (e & 2) finalOpen++;
    if (e & 4) finalOpen++;
    if (e & 8) finalOpen++;
}

console.log(`\nV5.2 OPEN EDGE COUNT: ${finalOpen}`);
console.log(`TOTAL CONSTRAINT-CLOSED EDGES: ${totalClosed}`);
console.log(`UNEXPLAINED EDGE CHANGES: ${initialOpen - finalOpen - totalClosed}`);

fs.writeFileSync(outPath, edgeMask);
console.log(`Wrote ${outPath}`);
