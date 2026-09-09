const fs = require('fs');

const worldGrid = fs.readFileSync('../server/assets/world_grid.bin');
const simW = 1024, simH = 512;

function checkBounds(name, minLon, maxLon, minLat, maxLat) {
    let minX = Math.floor((minLon + 180) / 360 * simW);
    let maxX = Math.floor((maxLon + 180) / 360 * simW);
    let minY = Math.floor((90 - maxLat) / 180 * simH);
    let maxY = Math.floor((90 - minLat) / 180 * simH);
    
    let land = 0;
    let water = 0;
    let candidates = 0;
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (x >= 0 && x < simW && y >= 0 && y < simH) {
                candidates++;
                if (worldGrid[y * simW + x] > 0) land++;
                else water++;
            }
        }
    }
    
    console.log(`\n${name} sim cells: LAND ${land} / WATER ${water} (total ${candidates})`);
}

// Great Britain: ~ -8.0 to 1.7, 50.0 to 58.7
checkBounds('GB', -8.0, 1.7, 50.0, 58.7);

// Ireland: ~ -10.5 to -5.5, 51.4 to 55.4
checkBounds('Ireland', -10.5, -5.5, 51.4, 55.4);

// Iceland: ~ -24.5 to -13.5, 63.3 to 66.5
checkBounds('Iceland', -24.5, -13.5, 63.3, 66.5);
