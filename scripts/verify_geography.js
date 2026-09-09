const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 512;
const EXPECTED_SIZE = WORLD_WIDTH * WORLD_HEIGHT;

function getSHA256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Simple seeded PRNG for deterministic sampling
function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

// Fixed seed
const prng = sfc32(0xdeadbeef, 0xcafebabe, 0x8badf00d, 0x12345678);

function pointInPolygon(point, vs) {
    let px = point[0], py = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > py) != (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function verifyGeography() {
    const coastlinePath = path.join(__dirname, '..', 'client', 'src', 'assets', 'coastline.json');
    const geomPath = path.join(__dirname, '..', 'client', 'src', 'assets', 'world_land_geometry.json');
    const gridPath = path.join(__dirname, '..', 'server', 'assets', 'world_grid.bin');

    let coastlineBuf, geomBuf, gridBuf;
    try {
        coastlineBuf = fs.readFileSync(coastlinePath);
        geomBuf = fs.readFileSync(geomPath);
        gridBuf = fs.readFileSync(gridPath);
    } catch(e) {
        console.error("Missing geography files!", e.message);
        process.exit(1);
    }

    const coastlineHash = getSHA256(coastlineBuf);
    const geomHash = getSHA256(geomBuf);
    const gridHash = getSHA256(gridBuf);

    console.log("=== GEOGRAPHY VERIFICATION REPORT ===");
    console.log(`coastline.json SHA-256:         ${coastlineHash}`);
    console.log(`world_land_geometry.json SHA:   ${geomHash}`);
    console.log(`world_grid.bin SHA-256:         ${gridHash}`);

    if (gridBuf.length !== EXPECTED_SIZE) {
        console.error(`ERROR: world_grid.bin length ${gridBuf.length} != ${EXPECTED_SIZE}`);
        process.exit(1);
    }
    console.log(`world_grid.bin size:            ${gridBuf.length} bytes (EXPECTED)`);

    let landCount = 0;
    let waterCount = 0;
    for (let i = 0; i < gridBuf.length; i++) {
        if (gridBuf[i] === 0) landCount++;
        else waterCount++;
    }

    console.log(`Grid Land cells:                ${landCount}`);
    console.log(`Grid Water cells:               ${waterCount}`);

    let geom;
    try {
        geom = JSON.parse(geomBuf.toString());
    } catch(e) {
        console.error("Failed to parse world_land_geometry.json");
        process.exit(1);
    }
    
    // geom should be an array of polygons
    const polygons = Array.isArray(geom) ? geom : (geom.polygons || []);
    console.log(`Vector Polygon Count:           ${polygons.length}`);

    // Pre-compute bounding boxes to match rasterizer
    const polygonsWithBounds = polygons.map(poly => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [x, y] of poly) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        return { poly, minX, maxX, minY, maxY };
    });

    console.log(`Coordinate Bounds:              [X: ${Math.min(...polygonsWithBounds.map(p => p.minX)).toFixed(2)} - ${Math.max(...polygonsWithBounds.map(p => p.maxX)).toFixed(2)}, Y: ${Math.min(...polygonsWithBounds.map(p => p.minY)).toFixed(2)} - ${Math.max(...polygonsWithBounds.map(p => p.maxY)).toFixed(2)}]`);

    // Deterministic sampling
    console.log("Sampling 50,000 deterministic cell-center comparisons...");
    let mismatches = 0;
    const SAMPLE_COUNT = 50000;

    for (let i = 0; i < SAMPLE_COUNT; i++) {
        // Generate random cell index using PRNG
        const cellIdx = Math.floor(prng() * EXPECTED_SIZE);
        const cx = cellIdx % WORLD_WIDTH;
        const cy = Math.floor(cellIdx / WORLD_WIDTH);
        
        // Target cell center
        const pt = [cx + 0.5, cy + 0.5];

        let inVectorLand = false;
        for (const polyObj of polygonsWithBounds) {
            if (pt[0] >= polyObj.minX && pt[0] <= polyObj.maxX && pt[1] >= polyObj.minY && pt[1] <= polyObj.maxY) {
                if (pointInPolygon(pt, polyObj.poly)) {
                    inVectorLand = !inVectorLand;
                }
            }
        }

        const isRasterLand = gridBuf[cellIdx] === 0;

        if (inVectorLand !== isRasterLand) {
            mismatches++;
        }
    }

    console.log(`Mismatches:                     ${mismatches}`);
    
    if (mismatches > 0) {
        console.error("FAIL: Mismatches found between vector geometry and rasterized grid!");
        process.exit(1);
    } else {
        console.log("PASS: Vector and Raster geography are perfectly aligned.");
        process.exit(0);
    }
}

verifyGeography();
