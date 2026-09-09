import assert from 'node:assert/strict';
import { PoliticalFieldCore } from '../.test-build/PoliticalFieldCore.mjs';

const scale = 4;
const width = 3;
const height = 1;
const mask = new Uint8Array(width * scale * height * scale).fill(255);
const terrains = Uint8Array.from([2, 0, 2]);
const owners = Uint8Array.from([0, 7, 0]);

const field = new PoliticalFieldCore({
  simulationWidth: width,
  simulationHeight: height,
  scale,
  landMask: mask,
  landMaskWidth: width * scale,
  landMaskHeight: height * scale,
  simulationTerrains: terrains,
});
field.fullBuild(owners);

assert.equal(field.gameplayCellForVisualPixel(0, 0), 1, 'connected coastal land must resolve to authoritative land');
assert.equal(field.rawOwners[0], 7, 'resolved coastal visual land must use the mapped owner');
assert.equal(field.metrics.unmappedOwnedLandPixels, 0);
assert.equal(field.metrics.wrongOwnerPixels, 0);
assert.equal(field.metrics.seaBleedPixels, 0);
assert.equal(field.gameplayCellForVisualPixel(0, 0), 1);

console.log('PASS: deterministic visual-land to authoritative coastal-cell mapping has no neutral halo or sea bleed');

// Two disconnected fragments inside ONE coarse-water cell must not receive
// the same nearest-cell owner. The horizontal water channel is authoritative
// visual separation, even when both fragments are in the same coarse square.
const splitMask = new Uint8Array(12 * 12);
for (let y = 0; y <= 5; y++) for (let x = 4; x < 8; x++) splitMask[y * 12 + x] = 255;
for (let y = 7; y < 12; y++) for (let x = 4; x < 8; x++) splitMask[y * 12 + x] = 255;
const splitTerrains = new Uint8Array(9).fill(2);
splitTerrains[1] = splitTerrains[7] = 0;
const splitOwners = new Uint8Array(9);
splitOwners[1] = 3; splitOwners[7] = 8;
const split = new PoliticalFieldCore({ simulationWidth: 3, simulationHeight: 3, scale: 4,
  landMask: splitMask, landMaskWidth: 12, landMaskHeight: 12, simulationTerrains: splitTerrains });
split.fullBuild(splitOwners);
assert.equal(split.gameplayCellForVisualPixel(5, 5), 1);
assert.equal(split.gameplayCellForVisualPixel(5, 7), 7);
assert.equal(split.rawOwners[5 * 12 + 5], 3);
assert.equal(split.rawOwners[7 * 12 + 5], 8);
assert.equal(split.gameplayCellForVisualPixel(5, 6), -1, 'sea never snaps');
splitOwners[7] = 9;
split.updateDirty(splitOwners, [7]);
assert.equal(split.rawOwners[7 * 12 + 5], 9, 'coastal dependent pixels update with their anchor');
assert.equal(split.rawOwners[6 * 12 + 5], 0, 'dirty update preserves the strait');

// An isolated island without an authoritative anchor must be reported as
// unmapped, not silently colored as a different island/mainland.
const isolatedMask = new Uint8Array(12 * 4);
isolatedMask[1] = 255;
isolatedMask[6] = 255;
const isolated = new PoliticalFieldCore({ simulationWidth: 3, simulationHeight: 1, scale: 4,
  landMask: isolatedMask, landMaskWidth: 12, landMaskHeight: 4, simulationTerrains: terrains });
isolated.fullBuild(owners);
assert.equal(isolated.gameplayCellForVisualPixel(1, 0), -1);
assert.equal(isolated.rawOwners[1], 0);
assert.equal(isolated.metrics.unmappedCanonicalLandPixels, 1);
console.log('PASS: split coastal components, sea barrier, isolated island, and anchor-delta propagation');
