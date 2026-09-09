import assert from 'node:assert/strict';
import { build } from 'esbuild';

await build({
  entryPoints: ['src/render/FocusPropagation.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.test-build/FocusPropagation.mjs',
});

const { focusDirectionForCells, focusEntryEdgeForCells } = await import('../.test-build/FocusPropagation.mjs');
const width = 1024;
const source = 200 * width + 500;
const sourceX = source % width;
const sourceY = Math.floor(source / width);

const cases = [
  ['EAST', 1, 0],
  ['WEST', -1, 0],
  ['NORTH', 0, -1],
  ['SOUTH', 0, 1],
  ['NORTH_EAST', 1, -1],
  ['NORTH_WEST', -1, -1],
  ['SOUTH_EAST', 1, 1],
  ['SOUTH_WEST', -1, 1],
];

for (const [name, dx, dy] of cases) {
  const target = (sourceY + dy) * width + sourceX + dx;
  const direction = focusDirectionForCells(source, target, width);
  assert.ok(direction, `${name} should produce a direction`);
  assert.equal(Math.sign(direction.dx), Math.sign(dx), `${name} dx follows target`);
  assert.equal(Math.sign(direction.dy), Math.sign(dy), `${name} dy follows target`);
}

assert.equal(focusEntryEdgeForCells(source, source + 1, width), 'WEST');
assert.equal(focusEntryEdgeForCells(source, source - 1, width), 'EAST');
assert.equal(focusEntryEdgeForCells(source, source - width, width), 'SOUTH');
assert.equal(focusEntryEdgeForCells(source, source + width, width), 'NORTH');
assert.equal(focusEntryEdgeForCells(source, source - width - 1, width), 'SOUTH_EAST');
assert.equal(focusEntryEdgeForCells(source, source - width + 1, width), 'SOUTH_WEST');
assert.equal(focusEntryEdgeForCells(source, source + width - 1, width), 'NORTH_EAST');
assert.equal(focusEntryEdgeForCells(source, source + width + 1, width), 'NORTH_WEST');

// Wrapped horizontal direction must use the short path across the map seam.
const seamSource = 120 * width + 2;
const seamTarget = 120 * width + (width - 2);
assert.ok(focusDirectionForCells(seamSource, seamTarget, width).dx < 0);

console.log('focus propagation direction tests passed');
