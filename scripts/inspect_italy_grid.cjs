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

console.log('--- ITALY RECTANGLE IN WORLD GRID ---');
for (let cy = 125; cy <= 148; cy++) {
  let row = `Y=${cy.toString().padStart(3)}: `;
  for (let cx = 536; cx <= 560; cx++) {
    const idx = cy * WORLD_WIDTH + cx;
    const t = gridBuf[idx]; // 0 = land, 2 = water
    row += t === 0 ? 'L' : '.';
  }
  console.log(row);
}
