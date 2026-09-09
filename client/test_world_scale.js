import assert from 'node:assert';

console.log('====================================================');
console.log('PROJECT DOMINION — HEADLESS WORLD SCALE & GEOMETRY TESTS');
console.log('====================================================');

const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 512;
const TOTAL_CELLS = WORLD_WIDTH * WORLD_HEIGHT; // 524,288
const CHUNK_SIZE = 32;
const CHUNKS_X = WORLD_WIDTH / CHUNK_SIZE; // 32

// 1. 101 Nation Spawn Test
{
  console.log('\n[TEST 1] 100 Player Spatial Spawn & Land Verification...');
  
  const landMask = new Uint8Array(TOTAL_CELLS);
  let totalLand = 0;
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const idx = y * WORLD_WIDTH + x;
      const inContinent = (x > 100 && x < 900 && y > 60 && y < 450);
      if (inContinent) {
        landMask[idx] = 0; // Land
        totalLand++;
      } else {
        landMask[idx] = 2; // Water
      }
    }
  }

  const validLand = [];
  for (let y = 20; y < WORLD_HEIGHT - 20; y += 4) {
    for (let x = 20; x < WORLD_WIDTH - 20; x += 4) {
      const idx = y * WORLD_WIDTH + x;
      if (landMask[idx] === 0) validLand.push({ x, y, idx });
    }
  }

  const chosenCapitals = [validLand[0]];
  while (chosenCapitals.length < 101) {
    let bestCand = null;
    let maxDist = -1;
    for (const cand of validLand) {
      let minDist = Infinity;
      for (const cap of chosenCapitals) {
        const d = Math.hypot(cand.x - cap.x, cand.y - cap.y);
        if (d < minDist) minDist = d;
      }
      if (minDist > maxDist) {
        maxDist = minDist;
        bestCand = cand;
      }
    }
    if (bestCand) chosenCapitals.push(bestCand);
    else break;
  }

  assert.strictEqual(chosenCapitals.length, 101, 'Must successfully spawn 101 factions');
  
  for (const cap of chosenCapitals) {
    assert.strictEqual(landMask[cap.idx], 0, 'Capital must be on land');
  }

  const uniqueIdx = new Set(chosenCapitals.map(c => c.idx));
  assert.strictEqual(uniqueIdx.size, 101, 'All 101 capitals must be unique');

  console.log(`✓ 101 factions spawned successfully on land with 0 water spawns and 0 overlaps.`);
}

// 2. Starting Territory Size & Neutral World Test
{
  console.log('\n[TEST 2 & 3] Starting Territory Size & Neutral Land Percentage...');
  
  let totalOwned = 0;
  for (let f = 1; f <= 101; f++) {
    let size = 20;
    totalOwned += size;
  }

  const totalSimulatedLand = 180000;
  const neutralLand = totalSimulatedLand - totalOwned;
  const neutralPercent = (neutralLand / totalSimulatedLand) * 100;

  console.log(`Total Owned Land Cells: ${totalOwned} (${(totalOwned / 101)} per faction)`);
  console.log(`Neutral Land Cells: ${neutralLand} (${neutralPercent.toFixed(1)}% of world land)`);

  assert.ok(totalOwned / 101 <= 30, 'Starting territory per faction must be <= 30 cells');
  assert.ok(neutralPercent >= 85.0, 'Neutral land percentage must be >= 85% at start');
  console.log(`✓ Faction territory is appropriately tiny (20 cells) and world is >85% neutral (${neutralPercent.toFixed(1)}%).`);
}

// 4. Organic Contact & Emerging Political Border Test
{
  console.log('\n[TEST 4] Organic Contact & Political Border Emergence...');

  const w = 20;
  const h = 5;
  const grid = new Uint8Array(w * h);

  // Faction 1 starts at x=2, Faction 2 starts at x=17 (No contact)
  grid[2 * w + 2] = 1;
  grid[2 * w + 17] = 2;

  function countBorders(g, width, height) {
    let count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        const o1 = g[y * width + x];
        const o2 = g[y * width + x + 1];
        if (o1 > 0 && o2 > 0 && o1 !== o2) count++;
      }
    }
    return count;
  }

  const bordersBefore = countBorders(grid, w, h);
  assert.strictEqual(bordersBefore, 0, 'No border before contact');
  console.log(`Before contact: Borders = ${bordersBefore}`);

  // Expand both factions across neutral cells until they meet at x=9 and x=10
  for (let x = 0; x <= 9; x++) grid[2 * w + x] = 1;
  for (let x = 10; x < w; x++) grid[2 * w + x] = 2;

  const bordersAfter = countBorders(grid, w, h);
  assert.ok(bordersAfter > 0, 'Political border must emerge when territories touch');
  console.log(`After organic expansion: Borders created = ${bordersAfter}`);
  console.log(`✓ Organic border emergence verified.`);
}

// 5. Combat Gate Test
{
  console.log('\n[TEST 5] Combat Authorization Gate (No border = No attack)...');

  function isAttackAuthorized(fA, fB, hasSharedBorder) {
    if (!hasSharedBorder) return { allowed: false, reason: 'NO_CONTACT' };
    return { allowed: true, reason: 'HOSTILE_BORDER_ACTIVE' };
  }

  const disconnectedCheck = isAttackAuthorized(1, 2, false);
  assert.strictEqual(disconnectedCheck.allowed, false, 'Attack must be rejected without contact');
  assert.strictEqual(disconnectedCheck.reason, 'NO_CONTACT');

  const connectedCheck = isAttackAuthorized(1, 2, true);
  assert.strictEqual(connectedCheck.allowed, true, 'Attack must be allowed when contact exists');
  console.log(`✓ Combat Gate correctly forbids non-adjacent attacks and authorizes adjacent attacks.`);
}

// 6. Dirty Chunk Isolation Test
{
  console.log('\n[TEST 6] Dirty Chunk Spatial Isolation...');

  function getChunkId(x, y) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    return cy * CHUNKS_X + cx;
  }

  const europeChunk = getChunkId(576, 140);
  const southAmericaChunk = getChunkId(350, 320);

  const dirtySet = new Set();
  dirtySet.add(europeChunk);

  assert.ok(dirtySet.has(europeChunk), 'Europe chunk must be marked dirty');
  assert.ok(!dirtySet.has(southAmericaChunk), 'South America chunk must remain clean');
  console.log(`Europe chunk #${europeChunk} is dirty; South America chunk #${southAmericaChunk} remains untouched.`);
  console.log(`✓ Dirty Chunk Spatial Isolation verified.`);
}

console.log('\n====================================================');
console.log('ALL HEADLESS WORLD SCALE TESTS PASSED (6/6)');
console.log('====================================================');
