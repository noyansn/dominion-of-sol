const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const shapefile = require('shapefile');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function runPowerShell(cmd) {
    console.log(`Running: ${cmd}`);
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { stdio: 'inherit' });
}

function downloadAndExtract(url, zipName, extractDir) {
    const zipPath = path.join(dataDir, zipName);
    const extractPath = path.join(dataDir, extractDir);
    
    if (!fs.existsSync(extractPath)) {
        if (!fs.existsSync(zipPath)) {
            runPowerShell(`Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}'`);
        }
        runPowerShell(`Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractPath}' -Force`);
    } else {
        console.log(`${extractDir} already exists, skipping download.`);
    }
    
    if (fs.existsSync(zipPath)) {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
        console.log(`${zipName} SHA-256: ${hash}`);
    }
}

async function processShapefile(shpPath, targetArray) {
    let inputFeatures = 0;
    const source = await shapefile.open(shpPath);
    let result;
    
    const WIDTH = 1024;
    const HEIGHT = 512;
    
    function convertRing(ring) {
        const points = [];
        for (const [lon, lat] of ring) {
            const x = (lon + 180) / 360 * WIDTH;
            const y = (90 - lat) / 180 * HEIGHT;
            points.push([Number(x.toFixed(3)), Number(y.toFixed(3))]);
        }
        return points;
    }
    
    function addPolygon(coords) {
        if (!coords || coords.length === 0) return;
        const outer = convertRing(coords[0]);
        const holes = [];
        for (let i = 1; i < coords.length; i++) {
            holes.push(convertRing(coords[i]));
        }
        targetArray.push({ outer, holes });
    }

    while (true) {
        result = await source.read();
        if (result.done) break;
        inputFeatures++;
        const feature = result.value;
        if (feature.geometry && feature.geometry.type === 'Polygon') {
            addPolygon(feature.geometry.coordinates);
        } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            for (const poly of feature.geometry.coordinates) {
                addPolygon(poly);
            }
        }
    }
    console.log(`Parsed ${inputFeatures} features from ${path.basename(shpPath)}`);
    return inputFeatures;
}


async function main() {
    try {
        console.log("Downloading Official Natural Earth 1:10m Physical Data...");
        downloadAndExtract(
            'https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip', 
            'ne_10m_land.zip', 
            'ne_10m_land'
        );
        downloadAndExtract(
            'https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_lakes.zip', 
            'ne_10m_lakes.zip', 
            'ne_10m_lakes'
        );
        
        let data = {
            land: [],
            waterBodies: []
        };
        
        console.log("Parsing ne_10m_land.shp...");
        const landFeatures = await processShapefile(path.join(dataDir, 'ne_10m_land', 'ne_10m_land.shp'), data.land);
        
        console.log("Parsing ne_10m_lakes.shp...");
        const lakeFeatures = await processShapefile(path.join(dataDir, 'ne_10m_lakes', 'ne_10m_lakes.shp'), data.waterBodies);
        
        // Validate antimeridian (spanning edges)
        let worldSpanningEdges = 0;
        function countSpanningEdges(polyArr) {
            for (const poly of polyArr) {
                for (const ring of [poly.outer, ...poly.holes]) {
                    for (let i = 0; i < ring.length; i++) {
                        const next = ring[(i + 1) % ring.length];
                        const dx = Math.abs(ring[i][0] - next[0]);
                        if (dx > 512) { // more than half the world width
                            worldSpanningEdges++;
                        }
                    }
                }
            }
        }
        countSpanningEdges(data.land);
        countSpanningEdges(data.waterBodies);

        const outCoastline = path.join(__dirname, '../client/src/assets/canonical_geography.json');
        fs.writeFileSync(outCoastline, JSON.stringify(data));
        
        let totalPolygons = data.land.length + data.waterBodies.length;
        let totalVertices = 0;
        [...data.land, ...data.waterBodies].forEach(p => {
            totalVertices += p.outer.length;
            p.holes.forEach(h => totalVertices += h.length);
        });

        console.log(`\n--- SHAPEFILE EXTRACTION REPORT ---`);
        console.log(`Land Features: ${landFeatures}`);
        console.log(`Lake Features: ${lakeFeatures}`);
        console.log(`Total Polygons Generated: ${totalPolygons}`);
        console.log(`Total Vertices Generated: ${totalVertices}`);
        console.log(`World Spanning Edges: ${worldSpanningEdges}`);
        console.log(`Wrote vector JSON to ${outCoastline}. File size: ${(fs.statSync(outCoastline).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch(e) {
        console.error("FATAL ERROR: ", e);
        process.exit(1);
    }
}

main();
