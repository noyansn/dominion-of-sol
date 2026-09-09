const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
for (let y = 0; y < 65; y += 1) {
    let out = String(y).padStart(3, ' ') + " ";
    for (let x = 1005; x < 1024; x++) {
        out += (simGrid[y * SIM_W + x] === 0) ? 'L' : '.';
    }
    for (let x = 0; x < 10; x++) {
        out += (simGrid[y * SIM_W + x] === 0) ? 'L' : '.';
    }
    console.log(out);
}
