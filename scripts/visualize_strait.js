const fs = require('fs');

const SIM_W = 1024, SIM_H = 512;
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');

function drawStrait(minX, maxX, minY, maxY, segs) {
    let out = "   ";
    for (let x = minX; x <= maxX; x++) {
        out += (x % 10);
    }
    out += "\n";
    for (let y = minY; y <= maxY; y++) {
        out += String(y).padStart(3, ' ') + " ";
        for (let x = minX; x <= maxX; x++) {
            let bx = x;
            if (bx < 0) bx += SIM_W;
            if (bx >= SIM_W) bx -= SIM_W;
            const idx = y * SIM_W + bx;
            const isLand = simGrid[idx] === 0;
            out += isLand ? 'L' : '.';
        }
        out += "\n";
    }
    console.log(out);
}

console.log("DARDANELLES:");
drawStrait(580, 595, 138, 145);

console.log("\nBAB-EL-MANDEB:");
drawStrait(630, 642, 215, 225);

console.log("\nBERING SOUTH:");
drawStrait(1005, 1023, 62, 70);
drawStrait(0, 15, 62, 70);
