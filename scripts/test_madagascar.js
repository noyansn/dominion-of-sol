const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const edgeMask = fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin');
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');

const minLon = 43, maxLon = 50, minLat = -25, maxLat = -12;
const minX = Math.floor((minLon + 180) / 360 * SIM_W);
const maxX = Math.floor((maxLon + 180) / 360 * SIM_W);
const minY = Math.floor((90 - maxLat) / 180 * SIM_H);
const maxY = Math.floor((90 - minLat) / 180 * SIM_H);

console.log("Madagascar edges:");
for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        if (simGrid[y * SIM_W + x] === 0) {
            console.log(`X=${x}, Y=${y}, Edge=${edgeMask[y * SIM_W + x].toString(16)}`);
        }
    }
}
