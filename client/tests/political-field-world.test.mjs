import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { PoliticalFieldCore } from '../.test-build/PoliticalFieldCore.mjs';

const simWidth = 1024, simHeight = 512, scale = 4;
const mask = new Uint8Array(readFileSync(new URL('../src/assets/world_visual_mask.bin', import.meta.url)));
assert.equal(mask.length, 4096 * 2048);
const owners = new Uint8Array(simWidth * simHeight);
for (let y = 0; y < simHeight; y++) for (let x = 0; x < simWidth; x++) owners[y * simWidth + x] = ((Math.floor(x / 64) + Math.floor(y / 48) * 16) % 100) + 1;
const config = { simulationWidth: simWidth, simulationHeight: simHeight, scale, landMask: mask, landMaskWidth: 4096, landMaskHeight: 2048 };
const field = new PoliticalFieldCore(config);
const fullStart = performance.now(); field.fullBuild(owners); const fullMs = performance.now() - fullStart;
const changed = owners.slice(), dirty = [];
for (let i = 0; i < 100; i++) { const index = (50 + i * 37) % changed.length; changed[index] = (changed[index] % 100) + 1; dirty.push(index); }
const dirtyStart = performance.now(); field.updateDirty(changed, dirty); const dirtyMs = performance.now() - dirtyStart;
const reference = new PoliticalFieldCore(config); reference.fullBuild(changed);
assert.deepEqual(field.owners, reference.owners); assert.deepEqual(field.borders, reference.borders);
console.log(JSON.stringify({ resolution: `${field.width}x${field.height}`, ownerBytes: field.owners.byteLength, fullMs: +fullMs.toFixed(2), dirty100Ms: +dirtyMs.toFixed(2), dirtyPixelsProcessed: field.metrics.pixelsProcessed, relaxedPixelsReference: reference.metrics.relaxedPixels, ownedVisualWaterPixels: field.metrics.ownedVisualWaterPixels, dirtyEqualsFull: true }));
