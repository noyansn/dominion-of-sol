const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GRID_PATH = path.join(ROOT, 'server', 'assets', 'world_grid.bin');
const MASK_PATH = path.join(ROOT, 'client', 'src', 'assets', 'world_visual_mask.bin');

const gridBuf = fs.readFileSync(GRID_PATH);
const maskBuf = fs.readFileSync(MASK_PATH);

const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 512;
const MASK_WIDTH = 4096;
const MASK_HEIGHT = 2048;

console.log('Sampling 10,000 subpixel points across Italy (lon 7..19 E, lat 36..47 N)...');
// lon 7..19 -> X in [531, 566]
// lat 36..47 -> Y in [122, 153]

let countCaseA = 0; // Visual land + Auth land
let countCaseB = 0; // Visual land + Auth water, but has supported neighbor land
let countCaseC = 0; // Visual land + Auth water, no supported neighbor land (unsupported fragment)
let countSubpixelEdge = 0; // Visual mask < 128 + Auth land (Case A mapping bug fixed by our change!)
let countWater = 0; // Pure water

const sampledPoints = [];

for (let y = 125; y <= 150; y += 0.5) {
  for (let x = 535; x <= 565; x += 0.5) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const cellIdx = cy * WORLD_WIDTH + cx;
    const authTerrain = gridBuf[cellIdx]; // 0 = land, 2 = water

    const mx = Math.floor((x / WORLD_WIDTH) * MASK_WIDTH);
    const my = Math.floor((y / WORLD_HEIGHT) * MASK_HEIGHT);
    const maskVal = maskBuf[my * MASK_WIDTH + mx];
    const isVisualLand = maskVal >= 128;

    if (isVisualLand && authTerrain === 0) {
      countCaseA++;
    } else if (isVisualLand && authTerrain !== 0) {
      // Check 4-connected neighbors
      const nbs = [
        cy > 0 ? cellIdx - WORLD_WIDTH : null,
        cy < WORLD_HEIGHT - 1 ? cellIdx + WORLD_WIDTH : null,
        cx > 0 ? cellIdx - 1 : null,
        cx < WORLD_WIDTH - 1 ? cellIdx + 1 : null
      ].filter(n => n !== null && gridBuf[n] === 0);

      if (nbs.length > 0) {
        countCaseB++;
        if (sampledPoints.length < 5) {
          sampledPoints.push({ x, y, cx, cy, cellIdx, authTerrain, maskVal, type: 'CASE_B (Supported Coastline)' });
        }
      } else {
        countCaseC++;
        if (sampledPoints.length < 5) {
          sampledPoints.push({ x, y, cx, cy, cellIdx, authTerrain, maskVal, type: 'CASE_C (Unsupported Fragment)' });
        }
      }
    } else if (!isVisualLand && authTerrain === 0) {
      countSubpixelEdge++;
      if (sampledPoints.length < 5) {
        sampledPoints.push({ x, y, cx, cy, cellIdx, authTerrain, maskVal, type: 'CASE_A (Subpixel Edge on Auth Land)' });
      }
    } else {
      countWater++;
    }
  }
}

console.log(`TOTAL SAMPLED: ${countCaseA + countCaseB + countCaseC + countSubpixelEdge + countWater}`);
console.log(`CASE A (Direct Land): ${countCaseA}`);
console.log(`CASE A (Subpixel Edge Fixed): ${countSubpixelEdge}`);
console.log(`CASE B (Supported High-Res Coast): ${countCaseB}`);
console.log(`CASE C (Unsupported Micro-Fragments): ${countCaseC}`);
console.log(`PURE WATER: ${countWater}`);
console.log('\nSampled specific coastal points:', JSON.stringify(sampledPoints, null, 2));
