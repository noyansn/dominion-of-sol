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

class VisualGameplayMapping {
  constructor(mask, maskWidth, maskHeight, worldWidth, worldHeight, terrains) {
    this.mask = mask;
    this.maskWidth = maskWidth;
    this.maskHeight = maskHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.terrains = terrains;
    this.coast = new Map();
    this.radius = Math.ceil(8 * Math.max(maskWidth / worldWidth, maskHeight / worldHeight));
    this.side = this.radius * 2 + 1;
    this.visited = new Uint32Array(this.side * this.side);
    this.queue = new Int32Array(this.side * this.side);
    this.generation = 0;
  }

  coarse(pixel) {
    return Math.floor(Math.floor(pixel / this.maskWidth) * this.worldHeight / this.maskHeight) * this.worldWidth
      + Math.floor((pixel % this.maskWidth) * this.worldWidth / this.maskWidth);
  }

  cellAtWorld(x, y) {
    if (x < 0 || y < 0 || x >= this.worldWidth || y >= this.worldHeight) return -1;
    return this.cellAtPixel(Math.floor(x * this.maskWidth / this.worldWidth), Math.floor(y * this.maskHeight / this.worldHeight));
  }

  cellAtPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.maskWidth || y >= this.maskHeight) return -1;
    const pixel = y * this.maskWidth + x;
    const direct = this.coarse(pixel);
    if (this.terrains[direct] === 0) return direct;
    if (this.mask[pixel] < 128) return -1;
    const cached = this.coast.get(pixel);
    if (cached !== undefined) return cached;

    this.generation = (this.generation + 1) >>> 0;
    if (this.generation === 0) { this.visited.fill(0); this.generation = 1; }
    const stamp = this.generation;
    let head = 0, tail = 1;
    this.queue[0] = pixel;
    this.visited[this.radius * this.side + this.radius] = stamp;
    let answer = -1;

    while (head < tail) {
      const end = tail;
      while (head < end) {
        const current = this.queue[head++];
        const cell = this.coarse(current);
        if (this.terrains[cell] === 0) {
          if (answer < 0 || cell < answer) answer = cell;
          continue;
        }
        const cx = current % this.maskWidth, cy = Math.floor(current / this.maskWidth);
        for (let direction = 0; direction < 4; direction++) {
          const nx = cx + (direction === 0 ? -1 : direction === 1 ? 1 : 0);
          const ny = cy + (direction === 2 ? -1 : direction === 3 ? 1 : 0);
          if (nx < 0 || ny < 0 || nx >= this.maskWidth || ny >= this.maskHeight) continue;
          const lx = nx - x + this.radius, ly = ny - y + this.radius;
          if (lx < 0 || ly < 0 || lx >= this.side || ly >= this.side) continue;
          const local = ly * this.side + lx, next = ny * this.maskWidth + nx;
          if (this.visited[local] === stamp || this.mask[next] < 128) continue;
          this.visited[local] = stamp;
          this.queue[tail++] = next;
        }
      }
      if (answer >= 0) break;
    }
    if (answer >= 0) this.coast.set(pixel, answer);
    return answer;
  }
}

const vgm = new VisualGameplayMapping(maskBuf, MASK_WIDTH, MASK_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, gridBuf);

const testPoints = [
  { name: 'Rome West Coast (Lazio Coast)', wx: 547.0, wy: 137.0, expectedLand: true },
  { name: 'Naples Gulf (Campania Coast)', wx: 549.5, wy: 138.5, expectedLand: true },
  { name: 'Venice Lagoon Coast', wx: 547.0, wy: 126.0, expectedLand: true },
  { name: 'Genoa Ligurian Coast', wx: 540.5, wy: 130.5, expectedLand: true },
  { name: 'Calabria Narrow Section', wx: 558.5, wy: 144.5, expectedLand: true },
  { name: 'Adriatic Coast (Abruzzo)', wx: 554.5, wy: 137.0, expectedLand: true },
  { name: 'Tyrrhenian Sea Offshore (Deep Water)', wx: 539.0, wy: 137.0, expectedLand: false },
];

console.log('=== REAL ITALIAN COASTLINE TARGETING VERIFICATION ===\n');
let allPassed = true;

for (const pt of testPoints) {
  const mx = Math.floor((pt.wx / WORLD_WIDTH) * MASK_WIDTH);
  const my = Math.floor((pt.wy / WORLD_HEIGHT) * MASK_HEIGHT);
  const maskVal = maskBuf[my * MASK_WIDTH + mx];
  const isVisualLand = maskVal >= 128;

  const directCell = Math.floor(pt.wy) * WORLD_WIDTH + Math.floor(pt.wx);
  const authTerrain = gridBuf[directCell];
  const isAuthoritativeLand = authTerrain === 0;

  const resolvedCell = vgm.cellAtWorld(pt.wx, pt.wy);
  const resolvedTerrain = resolvedCell >= 0 ? gridBuf[resolvedCell] : 2;
  const commandLegal = resolvedCell >= 0 && resolvedTerrain === 0;

  let classification = 'OPEN_WATER';
  if (isAuthoritativeLand && isVisualLand) classification = 'CASE_A (Direct Visual + Auth Land)';
  else if (isAuthoritativeLand && !isVisualLand) classification = 'CASE_A (Subpixel Edge on Auth Land - FIXED)';
  else if (!isAuthoritativeLand && isVisualLand && commandLegal) classification = 'CASE_B (Supported High-Res Coastline -> Resolved Auth Land)';
  else if (!isAuthoritativeLand && isVisualLand && !commandLegal) classification = 'CASE_C (Unsupported Visual Fragment)';

  console.log(`POINT: ${pt.name} (wx: ${pt.wx}, wy: ${pt.wy})`);
  console.log(`  Visual Mask Alpha: ${maskVal} (isVisualLand: ${isVisualLand})`);
  console.log(`  Direct Cell: ${directCell} (terrain: ${authTerrain === 0 ? 'LAND' : 'WATER'})`);
  console.log(`  Classification: ${classification}`);
  console.log(`  Resolved Cell: ${resolvedCell} (terrain: ${resolvedTerrain === 0 ? 'LAND' : 'WATER'})`);
  console.log(`  Target Command Legality: ${commandLegal ? 'LEGAL LAND COMMAND' : 'WATER REJECTED'}`);

  if (pt.expectedLand !== commandLegal) {
    console.error(`  --> MISMATCH! Expected land=${pt.expectedLand}, got=${commandLegal}`);
    allPassed = false;
  } else {
    console.log(`  --> VERIFIED CORRECT`);
  }
  console.log('');
}

console.log(`COASTLINE MAPPING AUDIT RESULT: ${allPassed ? 'ALL PASS' : 'FAIL'}`);
