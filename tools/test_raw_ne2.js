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
            let inHonshu = false;
            let inKorea = false;
            
            for (const [lon, lat] of outer) {
                if (lon > 134 && lon < 140 && lat > 34 && lat < 38) inHonshu = true;
                if (lon > 126.5 && lon < 129 && lat > 35 && lat < 38) inKorea = true;
            }
            
            if (inHonshu && inKorea) {
                console.log(`RAW_NE_JAPAN_KOREA_CONNECTED = TRUE`);
                return;
            }
        }
    }
    console.log("RAW_NE_JAPAN_KOREA_CONNECTED = FALSE");
}

main().catch(console.error);
