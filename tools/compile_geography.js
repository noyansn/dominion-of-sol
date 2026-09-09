const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const earcut = require('earcut').default || require('earcut');

const WIDTH = 1024;
const HEIGHT = 512;
const TOTAL_CELLS = WIDTH * HEIGHT;

const inputPath = path.join(__dirname, '../client/src/assets/canonical_geography.json');
const outputGridPath = path.join(__dirname, '../server/assets/world_grid_candidate.bin');
const outputGeoPath = path.join(__dirname, '../client/src/assets/world_land_mesh.bin'); // NOW BINARY
const outputMetaPath = path.join(__dirname, '../client/src/assets/world_geography.meta.json');

console.log(`Reading canonical geography from ${inputPath}...`);
const geoData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const landData = geoData.land;
const waterData = geoData.waterBodies;
console.log(`Processing ${landData.length} land polygons and ${waterData.length} water polygons...`);


function clipPolygon(poly, minX, minY, maxX, maxY) {
    let result = poly;
    let input;
    // Clip against left edge (x = minX)
    input = result; result = [];
    if (input.length > 0) {
        let S = input[input.length - 1];
        for (let i = 0; i < input.length; i++) {
            let E = input[i];
            if (E[0] >= minX) {
                if (S[0] < minX) result.push([minX, S[1] + (E[1] - S[1]) * (minX - S[0]) / (E[0] - S[0])]);
                result.push(E);
            } else if (S[0] >= minX) {
                result.push([minX, S[1] + (E[1] - S[1]) * (minX - S[0]) / (E[0] - S[0])]);
            }
            S = E;
        }
    }
    // Clip against right edge (x = maxX)
    input = result; result = [];
    if (input.length > 0) {
        let S = input[input.length - 1];
        for (let i = 0; i < input.length; i++) {
            let E = input[i];
            if (E[0] <= maxX) {
                if (S[0] > maxX) result.push([maxX, S[1] + (E[1] - S[1]) * (maxX - S[0]) / (E[0] - S[0])]);
                result.push(E);
            } else if (S[0] <= maxX) {
                result.push([maxX, S[1] + (E[1] - S[1]) * (maxX - S[0]) / (E[0] - S[0])]);
            }
            S = E;
        }
    }
    // Clip against top edge (y = minY)
    input = result; result = [];
    if (input.length > 0) {
        let S = input[input.length - 1];
        for (let i = 0; i < input.length; i++) {
            let E = input[i];
            if (E[1] >= minY) {
                if (S[1] < minY) result.push([S[0] + (E[0] - S[0]) * (minY - S[1]) / (E[1] - S[1]), minY]);
                result.push(E);
            } else if (S[1] >= minY) {
                result.push([S[0] + (E[0] - S[0]) * (minY - S[1]) / (E[1] - S[1]), minY]);
            }
            S = E;
        }
    }
    // Clip against bottom edge (y = maxY)
    input = result; result = [];
    if (input.length > 0) {
        let S = input[input.length - 1];
        for (let i = 0; i < input.length; i++) {
            let E = input[i];
            if (E[1] <= maxY) {
                if (S[1] > maxY) result.push([S[0] + (E[0] - S[0]) * (maxY - S[1]) / (E[1] - S[1]), maxY]);
                result.push(E);
            } else if (S[1] <= maxY) {
                result.push([S[0] + (E[0] - S[0]) * (maxY - S[1]) / (E[1] - S[1]), maxY]);
            }
            S = E;
        }
    }
    return result;
}

function unwrapRing(ring, refX) {
    if (ring.length === 0) return [];
    const unwrapped = [[ring[0][0], ring[0][1]]];
    
    // If refX is provided (for holes), shift the first point to be close to refX
    if (refX !== undefined) {
        let bestX = unwrapped[0][0];
        let minDx = Math.abs(bestX - refX);
        for (const shift of [-WIDTH, WIDTH, -2*WIDTH, 2*WIDTH]) {
            const testX = unwrapped[0][0] + shift;
            const dx = Math.abs(testX - refX);
            if (dx < minDx) {
                minDx = dx;
                bestX = testX;
            }
        }
        unwrapped[0][0] = bestX;
    }

    for (let i = 1; i < ring.length; i++) {
        let prevX = unwrapped[i-1][0];
        let x = ring[i][0];
        let y = ring[i][1];
        
        let bestX = x;
        let minDx = Math.abs(x - prevX);
        for (const shift of [-WIDTH, WIDTH, -2*WIDTH, 2*WIDTH]) {
            const testX = x + shift;
            const dx = Math.abs(testX - prevX);
            if (dx < minDx) {
                minDx = dx;
                bestX = testX;
            }
        }
        unwrapped.push([bestX, y]);
    }
    return unwrapped;
}

const finalTriangles = []; // Array of [x, y]
const featuresForRaster = []; // Array of rings for scanline

let antimeridianRingsDetected = 0;
let antimeridianRingsSplit = 0;
let worldSpanningEdges = 0;
let worldSpanningTriangles = 0;

for (const rawPoly of landData) {
    if (!rawPoly || !rawPoly.outer || rawPoly.outer.length === 0) continue;
    
    const outerRaw = rawPoly.outer;

    if (!outerRaw || outerRaw.length === 0) continue;
    
    const unwrappedOuter = unwrapRing(outerRaw);
    let didWrap = false;
    for (let i = 1; i < unwrappedOuter.length; i++) {
        if (Math.abs(unwrappedOuter[i][0] - outerRaw[i][0]) > WIDTH / 2) didWrap = true;
    }
    if (didWrap) antimeridianRingsDetected++;

    const minX = Math.min(...unwrappedOuter.map(p => p[0]));
    const maxX = Math.max(...unwrappedOuter.map(p => p[0]));
    const avgY = unwrappedOuter.reduce((sum, p) => sum + p[1], 0) / unwrappedOuter.length;
    const isWorldSpanning = maxX - minX >= WIDTH * 0.9;
    
    if (isWorldSpanning) {
        const poleY = avgY > HEIGHT / 2 ? HEIGHT : 0;
        unwrappedOuter.push([unwrappedOuter[unwrappedOuter.length - 1][0], poleY]);
        unwrappedOuter.push([unwrappedOuter[0][0], poleY]);
    }

    const unwrappedHoles = [];
    for (const hole of rawPoly.holes || []) {
        unwrappedHoles.push(unwrapRing(hole, unwrappedOuter[0][0]));
    }

    // Triangulate
    const flattenData = [];
    const holeIndices = [];
    for (const pt of unwrappedOuter) flattenData.push(pt[0], pt[1]);
    for (const hole of unwrappedHoles) {
        holeIndices.push(flattenData.length / 2);
        for (const pt of hole) flattenData.push(pt[0], pt[1]);
    }

    const indices = earcut(flattenData, holeIndices);
    
    // Gather all rings for rasterizer
    const allUnwrappedRings = [unwrappedOuter, ...unwrappedHoles];
    for (const offset of [-WIDTH, 0, WIDTH]) {
        const featureRings = [];
        for (const ring of allUnwrappedRings) {
            const shifted = ring.map(pt => [pt[0] + offset, pt[1]]);
            const clipped = clipPolygon(shifted, 0, 0, WIDTH, HEIGHT);
            if (clipped.length >= 3) {
                featureRings.push(clipped);
            }
        }
        if (featureRings.length > 0) {
            featuresForRaster.push(featureRings);
        }
    }

    // Process triangles for mesh
    for (let i = 0; i < indices.length; i += 3) {
        const p1 = [flattenData[indices[i]*2], flattenData[indices[i]*2+1]];
        const p2 = [flattenData[indices[i+1]*2], flattenData[indices[i+1]*2+1]];
        const p3 = [flattenData[indices[i+2]*2], flattenData[indices[i+2]*2+1]];
        
        const tri = [p1, p2, p3];
        for (const offset of [-WIDTH, 0, WIDTH]) {
            const shiftedTri = tri.map(pt => [pt[0] + offset, pt[1]]);
            const clipped = clipPolygon(shiftedTri, 0, 0, WIDTH, HEIGHT);
            if (clipped.length >= 3) {
                if (didWrap) antimeridianRingsSplit++;
                // Triangulate the clipped convex polygon
                for (let j = 1; j < clipped.length - 1; j++) {
                    finalTriangles.push(clipped[0][0], clipped[0][1]);
                    finalTriangles.push(clipped[j][0], clipped[j][1]);
                    finalTriangles.push(clipped[j+1][0], clipped[j+1][1]);
                }
            }
        }
    }
}

// Compute world spanning metrics
for (let i = 0; i < finalTriangles.length; i += 6) {
    const x1 = finalTriangles[i];
    const x2 = finalTriangles[i+2];
    const x3 = finalTriangles[i+4];
    
    const dx1 = Math.abs(x2 - x1);
    const dx2 = Math.abs(x3 - x2);
    const dx3 = Math.abs(x1 - x3);
    
    if (dx1 > WIDTH * 0.9 || dx2 > WIDTH * 0.9 || dx3 > WIDTH * 0.9) {
        worldSpanningTriangles++;
        worldSpanningEdges += (dx1 > WIDTH * 0.9 ? 1 : 0) + (dx2 > WIDTH * 0.9 ? 1 : 0) + (dx3 > WIDTH * 0.9 ? 1 : 0);
    }
}

console.log('--- COMPILER INVARIANTS ---');
console.log(`sourceLandCount: ${landData.length}`);
console.log(`outputTriangleCount: ${finalTriangles.length / 6}`);
console.log(`antimeridianRingsDetected: ${antimeridianRingsDetected}`);
console.log(`worldSpanningTriangles: ${worldSpanningTriangles}`);
console.log(`worldSpanningEdges: ${worldSpanningEdges}`);

if (worldSpanningTriangles > 0) {
    console.error("Validation failed: worldSpanningTriangles > 0");
    process.exit(1);
}

// Generate Mesh Binary
const vertexCount = finalTriangles.length / 2;
// Buffer structure: (x: float32, y: float32, u: float32, v: float32) per vertex
const meshBuffer = new ArrayBuffer(16 + vertexCount * 16);
const headerView = new DataView(meshBuffer);
headerView.setUint32(0, 0x4D455348, true); // 'MESH' magic
headerView.setUint32(4, 1, true);          // version 1
headerView.setUint32(8, vertexCount, true);
headerView.setUint32(12, vertexCount, true); // indexCount = vertexCount for unindexed

const vertexView = new Float32Array(meshBuffer, 16);
for (let i = 0; i < vertexCount; i++) {
    const x = finalTriangles[i * 2];
    const y = finalTriangles[i * 2 + 1];
    vertexView[i * 4 + 0] = x;
    vertexView[i * 4 + 1] = y;
    vertexView[i * 4 + 2] = x / WIDTH; // UV u
    vertexView[i * 4 + 3] = y / HEIGHT; // UV v
}

// Convert to Uint8Array for file write
fs.writeFileSync(outputGeoPath, Buffer.from(meshBuffer));
console.log(`Wrote versioned vector mesh to ${outputGeoPath} (${(meshBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);

// Semantic Rasterizer
function prepareFeatures(polyList) {
    const featureList = [];
    for (const rawPoly of polyList) {
        if (!rawPoly || !rawPoly.outer || rawPoly.outer.length === 0) continue;
        const outerRaw = rawPoly.outer;
        const unwrappedOuter = unwrapRing(outerRaw);
        const unwrappedHoles = (rawPoly.holes || []).map(h => unwrapRing(h, unwrappedOuter[0][0]));
        const allUnwrappedRings = [unwrappedOuter, ...unwrappedHoles];
        
        for (const offset of [-WIDTH, 0, WIDTH]) {
            const featureRings = [];
            for (const ring of allUnwrappedRings) {
                const shifted = ring.map(pt => [pt[0] + offset, pt[1]]);
                const clipped = clipPolygon(shifted, 0, 0, WIDTH, HEIGHT);
                if (clipped.length >= 3) featureRings.push(clipped);
            }
            if (featureRings.length > 0) {
                const polygons = featureRings.map(poly => {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    for (const [x, y] of poly) {
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    }
                    return { poly, minX, maxX, minY, maxY };
                });
                let fMinY = Infinity, fMaxY = -Infinity;
                for (const p of polygons) {
                    if (p.minY < fMinY) fMinY = p.minY;
                    if (p.maxY > fMaxY) fMaxY = p.maxY;
                }
                featureList.push({ polygons, fMinY, fMaxY });
            }
        }
    }
    return featureList;
}
const landRasterFeatures = prepareFeatures(landData);
const waterRasterFeatures = prepareFeatures(waterData);

const getIntersections = (featureList, py) => {
    const featureIntersections = [];
    for (const feature of featureList) {
        if (py < feature.fMinY || py > feature.fMaxY) continue;
        const intersections = [];
        for (const polyObj of feature.polygons) {
            if (py < polyObj.minY || py > polyObj.maxY) continue;
            const poly = polyObj.poly;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1];
                const xj = poly[j][0], yj = poly[j][1];
                if ((yi > py) !== (yj > py)) {
                    intersections.push((xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi);
                }
            }
        }
        if (intersections.length > 0) {
            intersections.sort((a, b) => a - b);
            featureIntersections.push(intersections);
        }
    }
    return featureIntersections;
};

console.log(`Rasterizing 1024x512 grid...`);
const grid = new Uint8Array(TOTAL_CELLS);
let landCount = 0;
let waterCount = 0;

for (let y = 0; y < HEIGHT; y++) {
    const py = y + 0.5;
    
    const landIntersections = getIntersections(landRasterFeatures, py);
    const waterIntersections = getIntersections(waterRasterFeatures, py);
    
    for (let x = 0; x < WIDTH; x++) {
        const px = x + 0.5;
        const isInside = (px, intersectionsList) => {
            for (const intersections of intersectionsList) {
                let insideFeature = false;
                for (let i = 0; i < intersections.length; i++) {
                    if (px < intersections[i]) {
                        insideFeature = (i % 2) !== 0;
                        break;
                    }
                }
                if (insideFeature) return true;
            }
            return false;
        };
        
        const inLand = isInside(px, landIntersections);
        const inWater = isInside(px, waterIntersections);
        const isLand = inLand && !inWater;

        
        if (isLand) {
            grid[y * WIDTH + x] = 0; landCount++;
        } else {
            grid[y * WIDTH + x] = 2; waterCount++;
        }
    }
}

console.log(`Rasterizing 4096x2048 visual mask with 2x2 supersampling...`);
const VISUAL_WIDTH = 4096;
const VISUAL_HEIGHT = 2048;
const visualGrid = new Uint8Array(VISUAL_WIDTH * VISUAL_HEIGHT);
const offsets = [ {dx:0.25, dy:0.25}, {dx:0.75, dy:0.25}, {dx:0.25, dy:0.75}, {dx:0.75, dy:0.75} ];

for (let y = 0; y < VISUAL_HEIGHT; y++) {
    const basePy = y / 4;
    const py1 = basePy + 0.25 / 4;
    const py2 = basePy + 0.75 / 4;
    
    const landFInters1 = getIntersections(landRasterFeatures, py1);
    const waterFInters1 = getIntersections(waterRasterFeatures, py1);
    const landFInters2 = getIntersections(landRasterFeatures, py2);
    const waterFInters2 = getIntersections(waterRasterFeatures, py2);
    
    for (let x = 0; x < VISUAL_WIDTH; x++) {
        const basePx = x / 4;
        let landSamples = 0;
        const isInside = (px, intersectionsList) => {
            for (const intersections of intersectionsList) {
                let insideFeature = false;
                for (let i = 0; i < intersections.length; i++) {
                    if (px < intersections[i]) {
                        insideFeature = (i % 2) !== 0;
                        break;
                    }
                }
                if (insideFeature) return true;
            }
            return false;
        };

        for (const off of offsets) {
            const px = basePx + (off.dx / 4);
            const landInters = (off.dy === 0.25) ? landFInters1 : landFInters2;
            const waterInters = (off.dy === 0.25) ? waterFInters1 : waterFInters2;
            
            const inLand = isInside(px, landInters);
            const inWater = isInside(px, waterInters);
            const isLand = inLand && !inWater;
            
            if (isLand) landSamples++;
        }
        visualGrid[y * VISUAL_WIDTH + x] = Math.floor(landSamples * 63.75);
    }
}

const outputVisualMaskPath = path.join(__dirname, '../client/src/assets/world_visual_mask.bin');
fs.writeFileSync(outputVisualMaskPath, visualGrid);

fs.writeFileSync(outputGridPath, grid);
const hash = crypto.createHash('sha256').update(grid).digest('hex');

const meta = {
    width: WIDTH, height: HEIGHT, totalCells: TOTAL_CELLS,
    landCells: landCount, waterCells: waterCount, gridChecksum: hash,
    triangleCount: finalTriangles.length / 6,
    generatedAt: new Date().toISOString()
};
fs.writeFileSync(outputMetaPath, JSON.stringify(meta, null, 2));

console.log('All tests passed. Canonical geography compiler finished.');
