import assert from 'node:assert/strict';
import { PoliticalTextureSource, politicalBufferUploader } from '../.test-build/PoliticalTextureUpload.mjs';

const width = 2048, height = 1024;
const resource = new Uint8Array(width * height * 4);
const source = new PoliticalTextureSource({ resource, width, height, format: 'rgba8unorm', autoGenerateMipmaps: false });
const texture = { target: 3553, width: 0, height: 0, internalFormat: 6408, format: 6408, type: 5121 };
const calls = [];
const gpu = new Uint8Array(resource.length);
const gl = {
  texImage2D(...args) { calls.push(['allocate', args[3], args[4]]); gpu.set(args[8]); },
  texSubImage2D(_target, _level, x, y, w, h, _format, _type, bytes) {
    calls.push(['update', x, y, w, h]);
    for (let row = 0; row < h; row++) gpu.set(bytes.subarray(row * w * 4, (row + 1) * w * 4), ((y + row) * width + x) * 4);
  },
};
politicalBufferUploader.upload(source, texture, gl);
assert.equal(calls[0][0], 'allocate');
calls.length = 0;
resource[(90 * width + 120) * 4] = 101;
source.markVisualRect({ minX: 240, minY: 180, maxX: 242, maxY: 182 });
source.markVisualRect({ minX: 240, minY: 180, maxX: 242, maxY: 182 });
politicalBufferUploader.upload(source, texture, gl);
assert.deepEqual(calls, [['update', 64, 64, 64, 64]], 'duplicate deltas make one 64x64 transfer, not a full texture');
assert.deepEqual(gpu, resource);
assert.equal(source.dirtyBlocks.size, 0);
// Context restoration must upload the complete latest staging data.
texture.width = 0;
politicalBufferUploader.upload(source, texture, gl);
assert.equal(calls.at(-1)[0], 'allocate');
assert.deepEqual(gpu, resource);
source.destroy();
console.log('PASS: bounded/coalesced GPU upload, exact pixel contents, and context restoration');
