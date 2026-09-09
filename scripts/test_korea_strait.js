const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');

function printGrid(minX, maxX, minY, maxY) {
    for (let y = minY; y <= Math.min(maxY, SIM_H-1); y++) {
        let sGrid = "";
        let sEdge = "";
        for (let x = minX; x <= Math.min(maxX, SIM_W-1); x++) {
            const idx = y * SIM_W + x;
            sGrid += (simGrid[idx] === 0 ? "L" : (simGrid[idx] === 2 ? "W" : "?"));
            
            const e = edgeMask[idx];
            sEdge += e.toString(16) + " ";
        }
        console.log(`Y=${y}\tGrid: ${sGrid}\tEdges: ${sEdge}`);
    }
}

console.log("True Korea Strait Region (X=877..885, Y=155..164):");
printGrid(877, 885, 155, 164);
