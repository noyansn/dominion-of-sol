const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const WIDTH = 1024;
const HEIGHT = 512;
const TOTAL_CELLS = WIDTH * HEIGHT;

const inputPath = path.join(__dirname, '../client/src/assets/coastline.json');
const outputPath = path.join(__dirname, '../server/assets/world_grid.bin');

console.log(`Reading coastline data from ${inputPath}...`);
const coastlineData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

console.log(`Processing ${coastlineData.length} polygons...`);

// Pre-compute bounding boxes for polygons to massively speed up point-in-polygon tests
const polygons = coastlineData.map(poly => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of poly) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    return { poly, minX, maxX, minY, maxY };
});

function isPointInPolygon(px, py, polyObj) {
    if (px < polyObj.minX || px > polyObj.maxX || py < polyObj.minY || py > polyObj.maxY) {
        return false;
    }
    const poly = polyObj.poly;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        
        const intersect = ((yi > py) != (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

console.log(`Rasterizing ${WIDTH}x${HEIGHT} grid...`);
const grid = new Uint8Array(TOTAL_CELLS);
let landCount = 0;
let waterCount = 0;

for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        // Sample at the center of the cell
        const px = x + 0.5;
        const py = y + 0.5;
        
        let isLand = false;
        for (const polyObj of polygons) {
            if (isPointInPolygon(px, py, polyObj)) {
                isLand = !isLand; // Toggle for holes
            }
        }
        
        if (isLand) {
            grid[y * WIDTH + x] = 0; // Land
            landCount++;
        } else {
            grid[y * WIDTH + x] = 2; // Water
            waterCount++;
        }
    }
}

console.log(`Writing output to ${outputPath}...`);
// Ensure dir exists
if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}
fs.writeFileSync(outputPath, grid);

const hash = crypto.createHash('sha256').update(grid).digest('hex');

console.log('\n=== DETERMINISTIC VERIFICATION ===');
console.log(`Output Size: ${grid.length} bytes (Expected: ${TOTAL_CELLS})`);
console.log(`Land Cells: ${landCount}`);
console.log(`Water Cells: ${waterCount}`);
console.log(`SHA-256: ${hash}`);

// Deterministic Spot Checks
const tests = [
    { name: 'Europe (530, 110)', x: 530, y: 110, expected: 0 }, // Land
    { name: 'Central Africa (550, 260)', x: 550, y: 260, expected: 0 }, // Land
    { name: 'Pacific Ocean (200, 250)', x: 200, y: 250, expected: 2 }, // Water
    { name: 'Mediterranean (550, 160)', x: 550, y: 160, expected: 2 } // Water
];

let failed = false;
for (const t of tests) {
    const val = grid[t.y * WIDTH + t.x];
    const status = val === t.expected ? 'PASS' : 'FAIL';
    if (val !== t.expected) failed = true;
    console.log(`Test [${t.name}]: ${status} (Got ${val}, Expected ${t.expected})`);
}

if (failed) {
    console.error('Validation failed!');
    process.exit(1);
} else {
    console.log('All tests passed. world_grid.bin is ready.');
}
