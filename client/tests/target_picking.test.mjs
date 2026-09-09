import assert from 'node:assert/strict';
import { resolveTargetAtWorld } from '../.test-build/TargetResolver.mjs';

const width = 7;
const height = 5;
const totalCells = width * height;
const owners = new Uint8Array(totalCells);
const terrains = new Uint8Array(totalCells);
owners[2 * width + 2] = 1;
owners[1 * width + 2] = 1;
owners[2 * width + 3] = 2;
owners[2 * width + 4] = 2;
terrains[2 * width + 1] = 2;

const state = {
  width, height, totalCells,
  cellOwners: owners,
  cellTerrains: terrains,
  yourFactionId: 1,
  isInitialized: true,
  isConnected: true,
  ports: [],
  alliances: [],
};

const neutral = resolveTargetAtWorld(state, 2.5, 3.5);
assert.equal(neutral.relation, 'ADJACENT_NEUTRAL');
assert.equal(neutral.action, 'NEUTRAL_EXPANSION');
assert.equal(neutral.sourceCell, 2 * width + 2);
assert.equal(neutral.targetCell, 3 * width + 2);

const hostile = resolveTargetAtWorld(state, 3.5, 2.5);
assert.equal(hostile.relation, 'ADJACENT_HOSTILE');
assert.equal(hostile.action, 'LAUNCH_OFFENSIVE');
assert.equal(hostile.sourceCell, 2 * width + 2);
assert.equal(hostile.targetCell, 2 * width + 3);

const deep = resolveTargetAtWorld(state, 4.5, 2.5);
assert.equal(deep.relation, 'REMOTE_HOSTILE');
assert.equal(deep.action, 'LAUNCH_OFFENSIVE');
assert.equal(deep.nearestLegalAnchor, 2 * width + 3);
assert.equal(deep.sourceCell, 2 * width + 2);

const water = resolveTargetAtWorld(state, 1.5, 2.5);
assert.equal(water.relation, 'INVALID/WATER');
assert.equal(water.action, 'NONE');
assert.match(water.rejectionReason, /Water/);

console.log('PASS: target-first contextual picking, deep hostile anchor resolution, and explicit water rejection');

owners[2 * width + 4] = 0;
owners[2 * width + 5] = 2;
const enclave = resolveTargetAtWorld(state, 5.5, 2.5);
assert.notEqual(enclave.action, 'LAUNCH_OFFENSIVE', 'deep selection must not jump a neutral gap to another enemy enclave');
owners[2 * width + 4] = 2;
terrains[2 * width + 4] = 2;
assert.notEqual(resolveTargetAtWorld(state, 5.5, 2.5).action, 'LAUNCH_OFFENSIVE', 'deep selection must not jump water');
