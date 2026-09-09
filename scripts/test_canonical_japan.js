const fs = require('fs');
const geoData = JSON.parse(fs.readFileSync('../client/src/assets/canonical_geography.json', 'utf8'));

const WIDTH = 1024;
const HEIGHT = 512;

function findRegion(name, minLon, maxLon, minLat, maxLat) {
    const minX = (minLon + 180) / 360 * WIDTH;
    const maxX = (maxLon + 180) / 360 * WIDTH;
    const maxY = (90 - minLat) / 180 * HEIGHT;
    const minY = (90 - maxLat) / 180 * HEIGHT;
    
    let found = [];
    for (let i = 0; i < geoData.land.length; i++) {
        const poly = geoData.land[i].outer;
        let pointsInRegion = 0;
        for (const pt of poly) {
            if (pt[0] > minX && pt[0] < maxX && pt[1] > minY && pt[1] < maxY) {
                pointsInRegion++;
            }
        }
        if (pointsInRegion > 10) {
            found.push(i);
        }
    }
    console.log(`${name} found in polygons: ${found.join(', ')}`);
}

findRegion("Japan (Honshu)", 130, 142, 33, 41);
findRegion("Korea", 126, 130, 34, 38);
