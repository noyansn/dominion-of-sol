const https = require('https');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) {
            console.log(`${path.basename(dest)} already exists, skipping download.`);
            return resolve();
        }
        console.log(`Downloading ${url}...`);
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

const LAND_URL = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_land.json';
const LAKES_URL = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_lakes.json';

const landDest = path.join(dataDir, 'ne_10m_land.json');
const lakesDest = path.join(dataDir, 'ne_10m_lakes.json');

async function main() {
    try {
        await download(LAND_URL, landDest);
        await download(LAKES_URL, lakesDest);
        console.log('Download complete.');
        
        console.log('Processing GeoJSON...');
        const landData = JSON.parse(fs.readFileSync(landDest, 'utf8'));
        const lakesData = JSON.parse(fs.readFileSync(lakesDest, 'utf8'));
        
        let rings = []; 
        
        // Target base game resolution (the old visual geometry was in this coordinate space)
        const WIDTH = 1024;
        const HEIGHT = 512;
        
        function addPolygon(coords) {
            const polyRings = [];
            for (let i = 0; i < coords.length; i++) {
                const ring = coords[i];
                const points = [];
                for (const [lon, lat] of ring) {
                    const x = (lon + 180) / 360 * WIDTH;
                    const y = (90 - lat) / 180 * HEIGHT;
                    points.push([Number(x.toFixed(3)), Number(y.toFixed(3))]);
                }
                polyRings.push(points);
            }
            rings.push(polyRings);
        }
        
        for (const feature of landData.features) {
            if (feature.geometry.type === 'Polygon') {
                addPolygon(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'MultiPolygon') {
                for (const poly of feature.geometry.coordinates) {
                    addPolygon(poly);
                }
            }
        }
        
        for (const feature of lakesData.features) {
            if (feature.geometry.type === 'Polygon') {
                addPolygon(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'MultiPolygon') {
                for (const poly of feature.geometry.coordinates) {
                    addPolygon(poly);
                }
            }
        }
        
        const outCoastline = path.join(__dirname, '../client/src/assets/coastline_highres.json');
        fs.writeFileSync(outCoastline, JSON.stringify(rings));
        console.log(`Wrote ${rings.length} rings to ${outCoastline}. File size: ${(fs.statSync(outCoastline).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

main();
