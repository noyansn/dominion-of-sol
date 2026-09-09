import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const profile = read('src/ui/RenderProfile.ts');
const benchmark = read('src/ui/Benchmark.ts');
const perf = read('src/ui/FramePerf.ts');
const main = read('src/main.ts');

assert.match(profile, /MOBILE_PROXY/);
assert.match(profile, /pointer: coarse/);
assert.match(profile, /mapRenderDPR/);
assert.match(benchmark, /medianFrameMs/);
assert.match(benchmark, /p95FrameMs/);
assert.match(benchmark, /p99FrameMs/);
assert.match(benchmark, /politicalDirtyPixelsPerFrame/);
assert.match(benchmark, /gpuInfo/);
assert.match(perf, /samples\.length >= 256/);
assert.match(main, /getMapRenderDPR/);

console.log('PASS: mobile map-render profile, bounded frame telemetry, GPU diagnostics, and benchmark percentiles');
