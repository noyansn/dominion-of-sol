import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lod = fs.readFileSync(path.join(root, 'src/render/TerrainLodManager.ts'), 'utf8');
const geography = fs.readFileSync(path.join(root, 'src/render/GeographyRenderer.ts'), 'utf8');

assert.match(lod, /worldReliefTexture/);
assert.match(lod, /texture2D\(uWorldReliefTexture, vWorldUV\)\.a < 0\.05\) discard/);
assert.match(lod, /vWorldUV = \(uTileOrigin \+ aPosition\)/);
assert.match(lod, /const ready = this\.visibleTileKeys\.every/);
assert.match(lod, /if \(targetLevel === 'DETAIL'.*estimatedTiles\('DETAIL'\) > this\.maxResidentTiles/s);
assert.match(lod, /terrainMaskClip: 'world_relief_alpha'/);
assert.match(geography, /terrainLodManager\.container/);

console.log('PASS: streamed terrain is coastline-clipped and revealed only with complete visible coverage');
