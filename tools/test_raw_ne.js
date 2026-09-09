const shapefile = require('shapefile');
const path = require('path');

async function main() {
    const shpPath = path.join(__dirname, 'data', 'ne_10m_land', 'ne_10m_land.shp');
    const source = await shapefile.open(shpPath);
    let result;
    while (true) {
        result = await source.read();
        if (result.done) break;
        
        const feature = result.value;
        const polyCoords = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        
        for (let i = 0; i < polyCoords.length; i++) {
            const outer = polyCoords[i][0];
            let inJapan = false;
            let inKorea = false;
            
            for (const [lon, lat] of outer) {
                if (lon > 130 && lon < 145 && lat > 30 && lat < 45) inJapan = true;
                if (lon > 125 && lon < 130 && lat > 34 && lat < 38) inKorea = true;
            }
            
            if (inJapan && inKorea) {
                console.log(`Connected polygon found with ${outer.length} vertices!`);
                // Find where the longitude jumps from Japan (>130) to Korea (<130) or vice versa
                for (let j=0; j<outer.length-1; j++) {
                    const p1 = outer[j];
                    const p2 = outer[j+1];
                    if ((p1[0] >= 130 && p2[0] < 130) || (p1[0] < 130 && p2[0] >= 130)) {
                        // It crossed the 130 longitude line. Check if it's in the latitude of the strait (around 33-36)
                        if (p1[1] > 32 && p1[1] < 36 && p2[1] > 32 && p2[1] < 36) {
                            console.log(`Bridge found from [${p1[0]}, ${p1[1]}] to [${p2[0]}, ${p2[1]}]`);
                        }
                    }
                }
                return;
            }
        }
    }
}

main().catch(console.error);
