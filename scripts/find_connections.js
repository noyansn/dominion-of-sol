const fs = require('fs');

const SIM_W = 1024, SIM_H = 512;
const edgeMask = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin'));
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');

function findConnections(minX, maxX, minY, maxY) {
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            let bx = x;
            if (bx < 0) bx += SIM_W;
            if (bx >= SIM_W) bx -= SIM_W;
            const idx = y * SIM_W + bx;
            const e = edgeMask[idx];
            if (e & 2) {
                console.log(`X=${bx}, Y=${y} connects East to X=${bx+1}`);
            }
            if (e & 4) {
                console.log(`X=${bx}, Y=${y} connects South to Y=${y+1}`);
            }
        }
    }
}

console.log("Gibraltar (492-496, 151-156):");
findConnections(492, 496, 151, 156);

console.log("\nBering (1005-1023, 63-67):");
findConnections(1005, 1023, 63, 67);
console.log("\nBering (0-15, 63-67):");
findConnections(0, 15, 63, 67);

console.log("\nMessina (15.5E, 38.2N) -> X=556, Y=147");
findConnections(554, 558, 145, 149);

console.log("\nBonifacio (9.2E, 41.3N) -> X=538, Y=138");
findConnections(536, 540, 137, 140);
