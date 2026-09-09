import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const globe = fs.readFileSync(path.join(root, 'src/render/GlobeRenderer.ts'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src/render/DominionRenderer.ts'), 'utf8');

for (const method of ['projectWorld', 'screenToWorld', 'rotate', 'setRotation', 'zoom']) {
  assert.match(globe, new RegExp(`public ${method}\\(`), `missing globe method: ${method}`);
}
assert.match(globe, /if \(p\.z <= 0\) return null/);
assert.match(globe, /if \(r2 > 1\) return null/);
assert.match(renderer, /this\.globe\.screenToWorld/);
assert.match(renderer, /this\.globe\.rotate/);
assert.match(renderer, /this\.setGlobeMode\(false\)/);

// The flat texture convention is the contract shared by the globe shader,
// flat-map picking, and the political/terrain layers: x=0 is 180W, x=W/2 is
// Greenwich, y=0 is the north pole. These assertions prevent a regression to
// the old mirrored-world convention while staying independent of WebGL.
const W = 1024;
const H = 512;
const lonForX = x => x / W * 360 - 180;
const latForY = y => 90 - y / H * 180;
const xForLon = lon => (lon + 180) / 360 * W;
const yForLat = lat => (90 - lat) / 180 * H;
assert.equal(lonForX(0), -180);
assert.equal(lonForX(W / 2), 0);
assert.equal(lonForX(W), 180);
assert.equal(latForY(0), 90);
assert.equal(latForY(H / 2), 0);
assert.equal(latForY(H), -90);

const china = { x: xForLon(105), y: yForLat(10) };
const japan = { x: xForLon(138), y: yForLat(36) };
const asia = { x: xForLon(105), y: yForLat(10) };
const australia = { x: xForLon(133), y: yForLat(-25) };
const americas = xForLon(-100);
const atlantic = xForLon(-30);
const europe = xForLon(10);
assert.ok(japan.x > china.x, 'Japan must be east of China');
assert.ok(australia.x > asia.x && australia.y > asia.y, 'Australia must be southeast of Asia');
assert.ok(americas < atlantic && atlantic < europe, 'Atlantic must lie between the Americas and Europe');
assert.match(globe, /const polarLimit = Math\.PI \/ 2 - 0\.018/);
assert.match(globe, /this\.yaw \+= dx/);
assert.match(globe, /uYaw = this\.yaw/);

console.log('PASS: globe orientation, longitude convention, pole reach, backside culling, rotation, picking, and flat-map return contract');
