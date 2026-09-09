const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');

function printGrid(minX, maxX, minY, maxY) {
    for (let y = minY; y <= maxY; y++) {
        let sGrid = "";
        let sEdge = "";
        for (let x = minX; x <= maxX; x++) {
            const idx = y * SIM_W + x;
            sGrid += (simGrid[idx] === 0 ? "L" : (simGrid[idx] === 2 ? "W" : "?"));
            sEdge += edgeMask[idx].toString(16) + " ";
        }
        console.log(`Y=${y}\tGrid: ${sGrid}\tEdges: ${sEdge}`);
    }
}
printGrid(490, 500, 150, 160);
