import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VisualGameplayMapping } from '../.test-build/VisualGameplayMapping.mjs';

const width = 4096, height = 2048;
const mask = new Uint8Array(readFileSync(new URL('../src/assets/world_visual_mask.bin', import.meta.url)));
const terrains = new Uint8Array(readFileSync(new URL('../../server/assets/world_grid.bin', import.meta.url)));
assert.equal(mask.length, width * height);
assert.equal(terrains.length, 1024 * 512);
const mapping = new VisualGameplayMapping(mask, width, height, 1024, 512, terrains);
const boxes = {
  Aegean: [22, 34, 30, 41], Anatolia: [26, 35, 45, 42], BlackSea: [27, 40, 42, 47],
  Bosphorus: [28.8, 40.8, 29.3, 41.4], Dardanelles: [26, 39.8, 27, 40.6],
  Japan: [128, 30, 146, 46], Norway: [4, 57, 32, 72], Indonesia: [95, -11, 141, 6],
  Philippines: [117, 5, 127, 20], Caribbean: [-90, 9, -58, 28], BritishIsles: [-11, 49, 3, 61],
};
const regionPixels = {};
let land = 0, unmapped = 0, mappedWater = 0, coastalMapped = 0;
const start = performance.now();
const unmappedPixels = [];
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (mask[y * width + x] < 128) continue;
  land++;
  const cell = mapping.cellAtPixel(x, y);
  if (cell < 0) { unmapped++; unmappedPixels.push(y * width + x); }
  else if (terrains[cell] !== 0) mappedWater++;
  else if (cell !== Math.floor(y / 4) * 1024 + Math.floor(x / 4)) coastalMapped++;
}
for (const [name, [west, south, east, north]] of Object.entries(boxes)) {
  let land = 0, unmapped = 0;
  for (let y = Math.floor((90 - north) / 180 * height); y < Math.ceil((90 - south) / 180 * height); y++) {
    for (let x = Math.floor((west + 180) / 360 * width); x < Math.ceil((east + 180) / 360 * width); x++) {
      if (mask[y * width + x] < 128) continue;
      land++;
      if (mapping.cellAtPixel(x, y) < 0) unmapped++;
    }
  }
  regionPixels[name] = { canonicalLandPixels: land, unmappedCanonicalLandPixels: unmapped };
}
assert.equal(mappedWater, 0);
// Independent component flood fill: distinguish bounded-search misses from
// islands with no authoritative land at all. No owner lookup is used here.
const visited = new Uint8Array(mask.length);
const queue = new Uint32Array(mask.length);
let unanchoredComponents = 0, unanchoredPixels = 0, boundedSearchMisses = 0;
const unresolved = new Set(unmappedPixels);
for (const seed of unmappedPixels) {
  if (visited[seed]) continue;
  let head = 0, tail = 1, hasAnchor = false, unresolvedInComponent = 0;
  queue[0] = seed; visited[seed] = 1;
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width, y = Math.floor(pixel / width);
    if (unresolved.has(pixel)) unresolvedInComponent++;
    if (terrains[Math.floor(y / 4) * 1024 + Math.floor(x / 4)] === 0) hasAnchor = true;
    for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1, y > 0 ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
      if (next < 0 || visited[next] || mask[next] < 128) continue;
      visited[next] = 1; queue[tail++] = next;
    }
  }
  if (!hasAnchor) { unanchoredComponents++; unanchoredPixels += tail; }
  else boundedSearchMisses += unresolvedInComponent;
}
// Deliberately report unmapped islands. This audit must never silently treat
// an unmapped visual fragment as a correctly neutral authoritative territory.
console.log(JSON.stringify({ canonicalLandPixels: land, unmappedCanonicalLandPixels: unmapped,
  coastalMappedPixels: coastalMapped, mappedWaterCells: mappedWater, durationMs: performance.now() - start,
  unanchoredComponents, unanchoredPixels, boundedSearchMisses,
  regions: regionPixels }, null, 2));
