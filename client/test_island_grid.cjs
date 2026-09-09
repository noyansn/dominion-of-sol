const fs = require('fs');

const worldGrid = fs.readFileSync('../server/assets/world_grid.bin');
const simW = 1024, simH = 512;

function printGrid(name, minLon, maxLon, minLat, maxLat) {
    let minX = Math.floor((minLon + 180) / 360 * simW);
    let maxX = Math.floor((maxLon + 180) / 360 * simW);
    let minY = Math.floor((90 - maxLat) / 180 * simH);
    let maxY = Math.floor((90 - minLat) / 180 * simH);
    
    console.log(`\n${name} GRID (${minX},${minY} to ${maxX},${maxY}):`);
    let land = 0;
    for (let y = minY; y <= maxY; y++) {
        let row = "";
        for (let x = minX; x <= maxX; x++) {
            if (x >= 0 && x < simW && y >= 0 && y < simH) {
                if (worldGrid[y * simW + x] > 0) {
                    row += "L";
                    land++;
                } else {
                    row += ".";
                }
            }
        }
        console.log(row);
    }
    console.log(`Total Land: ${land}`);
}

printGrid('GB', -8.0, 1.7, 50.0, 58.7);
printGrid('Iceland', -24.5, -13.5, 63.3, 66.5);
