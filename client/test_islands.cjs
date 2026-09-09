const fs = require('fs');

const worldGrid = fs.readFileSync('../server/assets/world_grid.bin');
const visualMask = fs.readFileSync('src/assets/world_visual_mask.bin');

function lonLatToWorld1024(lon, lat) {
    return {
        x: Math.floor((lon + 180) / 360 * 1024),
        y: Math.floor((90 - lat) / 180 * 512)
    };
}

function lonLatToWorld4096(lon, lat) {
    return {
        x: Math.floor((lon + 180) / 360 * 4096),
        y: Math.floor((90 - lat) / 180 * 2048)
    };
}

function probe1024(lon, lat) {
    const pt = lonLatToWorld1024(lon, lat);
    let landCount = 0;
    let waterCount = 0;
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            let px = pt.x + dx;
            let py = pt.y + dy;
            if (px >= 0 && px < 1024 && py >= 0 && py < 512) {
                if (worldGrid[py * 1024 + px] > 0) landCount++;
                else waterCount++;
            }
        }
    }
    return { isLand: worldGrid[pt.y * 1024 + pt.x] > 0, landCount, waterCount };
}

function probe4096(lon, lat) {
    const pt = lonLatToWorld4096(lon, lat);
    let landCount = 0;
    let waterCount = 0;
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            let px = pt.x + dx;
            let py = pt.y + dy;
            if (px >= 0 && px < 4096 && py >= 0 && py < 2048) {
                if (visualMask[py * 4096 + px] > 0) landCount++;
                else waterCount++;
            }
        }
    }
    return { isLand: visualMask[pt.y * 4096 + pt.x] > 0, landCount, waterCount };
}

const points = [
    { name: 'Great Britain', lon: -2.5, lat: 54.0 },
    { name: 'Ireland', lon: -8.0, lat: 53.0 },
    { name: 'Iceland', lon: -19.0, lat: 65.0 },
    { name: 'Sardinia', lon: 9.0, lat: 40.0 },
    { name: 'Corsica', lon: 9.0, lat: 42.0 },
    { name: 'Sicily', lon: 14.0, lat: 37.5 },
    { name: 'Japan', lon: 138.0, lat: 36.0 },
    { name: 'New Zealand', lon: 174.0, lat: -41.0 }
];

for (let p of points) {
    const sim = probe1024(p.lon, p.lat);
    const vis = probe4096(p.lon, p.lat);
    console.log(`${p.name} | Sim: ${sim.isLand} (${sim.landCount}/${sim.waterCount}) | Vis: ${vis.isLand} (${vis.landCount}/${vis.waterCount})`);
}
