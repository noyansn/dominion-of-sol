const fs = require('fs');

const data = JSON.parse(fs.readFileSync('../client/src/assets/canonical_geography.json', 'utf8'));

const WIDTH = 1024;
const HEIGHT = 512;
const SUPERSAMPLE = 5;
const THRESHOLD = 1;

const grid = new Uint8Array(WIDTH * HEIGHT);

function extractEdges(features) {
    const edges = [];
    for (let f of features) {
        const rings = [f.outer, ...(f.holes || [])];
        for (let ring of rings) {
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const y1 = ring[j][1], y2 = ring[i][1];
                const x1 = ring[j][0], x2 = ring[i][0];
                if (y1 !== y2) {
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);
                    edges.push({ y1, x1, y2, x2, minY, maxY });
                }
            }
        }
    }
    return edges;
}

console.log("Extracting edges...");
const landEdges = extractEdges(data.land || []);
const waterEdges = extractEdges(data.waterBodies || []);

function getIntersections(edges, py) {
    const ints = [];
    for (let e of edges) {
        if (py >= e.minY && py < e.maxY) {
            const ix = e.x1 + (e.x2 - e.x1) * (py - e.y1) / (e.y2 - e.y1);
            ints.push(ix);
        }
    }
    ints.sort((a,b) => a - b);
    return ints;
}

function isInside(px, ints) {
    let count = 0;
    for (let ix of ints) {
        if (px > ix) count++;
        else break;
    }
    return count % 2 === 1;
}

console.log("Rasterizing...");
let landCount = 0;
for (let y = 0; y < HEIGHT; y++) {
    if (y % 50 === 0) console.log(`Row ${y}/${HEIGHT}...`);
    
    const landInts = [];
    const waterInts = [];
    for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        const py = y + (sy + 0.5) / SUPERSAMPLE;
        landInts.push(getIntersections(landEdges, py));
        waterInts.push(getIntersections(waterEdges, py));
    }
    
    for (let x = 0; x < WIDTH; x++) {
        let hits = 0;
        for (let sy = 0; sy < SUPERSAMPLE; sy++) {
            for (let sx = 0; sx < SUPERSAMPLE; sx++) {
                const px = x + (sx + 0.5) / SUPERSAMPLE;
                
                const inLand = isInside(px, landInts[sy]);
                if (inLand) {
                    const inWater = isInside(px, waterInts[sy]);
                    if (!inWater) {
                        hits++;
                    }
                }
            }
        }
        
        if (hits >= THRESHOLD) {
            grid[y * WIDTH + x] = 0; // LAND
            landCount++;
        } else {
            grid[y * WIDTH + x] = 2; // WATER
        }
    }
}

console.log(`Total candidate land cells: ${landCount}`);
fs.writeFileSync('../server/assets/world_grid_candidate.bin', grid);
console.log("Wrote server/assets/world_grid_candidate.bin");
