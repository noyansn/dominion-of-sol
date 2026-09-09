import fs from 'node:fs';
import { PNG } from 'pngjs';

const metadataPath = process.argv[2];
if (!metadataPath) throw new Error('Usage: node tools/analyze_raw_presentation_frames.mjs <metadata.json>');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const readPng = path => PNG.sync.read(fs.readFileSync(path));
const before = readPng(metadata.frames.before);
const bounds = metadata.compositingProbe?.transitionMeshBounds;
const crop = {
    x: Math.max(0, Math.floor(bounds?.x ?? 300)),
    y: Math.max(0, Math.floor(bounds?.y ?? 60)),
    width: Math.min(before.width, Math.ceil(bounds?.width ?? 360)),
    height: Math.min(before.height, Math.ceil(bounds?.height ?? 360)),
};

const redScore = (image, offset) => {
    const r = image.data[offset];
    const g = image.data[offset + 1];
    const b = image.data[offset + 2];
    return Math.max(0, r - (g * 0.68 + b * 0.32));
};

const measure = image => {
    let binary = 0;
    let equivalent = 0;
    for (let y = crop.y; y < crop.y + crop.height; y++) {
        for (let x = crop.x; x < crop.x + crop.width; x++) {
            const offset = (y * image.width + x) * 4;
            const baseline = redScore(before, offset);
            const current = redScore(image, offset);
            if (current > 42 && current > baseline + 18) binary++;
            equivalent += Math.max(0, Math.min(1, (current - baseline) / 80));
        }
    }
    return { binary, equivalent: Number(equivalent.toFixed(2)) };
};

const extracted = metadata.video30fpsExtraction?.frames ?? [];
const samples = extracted.map(frame => ({
    index: frame.index,
    tMs: frame.tMs,
    ...measure(readPng(frame.path)),
}));
const deltas = samples.slice(1).map((sample, index) => ({
    from: samples[index].equivalent,
    to: sample.equivalent,
    delta: Number((sample.equivalent - samples[index].equivalent).toFixed(2)),
    index: sample.index,
    tMs: sample.tMs,
}));
const positive = deltas.filter(item => item.delta > 0).map(item => item.delta).sort((a, b) => a - b);
const percentile = (values, p) => {
    if (!values.length) return 0;
    const at = (values.length - 1) * p;
    const lo = Math.floor(at);
    const hi = Math.ceil(at);
    if (lo === hi) return values[lo];
    return values[lo] + (values[hi] - values[lo]) * (at - lo);
};
const operationEntries = (metadata.presentationTimeline ?? [])
    .filter(entry => entry.transitionId === metadata.operationTransitionId);
const layerArrivals = [];
for (const entry of operationEntries) {
    const previous = layerArrivals.at(-1);
    if (!previous || entry.transitionTextureRevision !== previous.textureRevision) {
        layerArrivals.push({
            textureRevision: entry.transitionTextureRevision,
            operationElapsedMS: entry.operationElapsedMS,
            authorizedCellCount: entry.authorizedCellCount,
        });
    }
}
const result = {
    source: metadata.rawCanvasVideo,
    sourceCadence: 'raw canvas captureStream frames extracted in-browser at 30 FPS',
    crop,
    samples,
    deltaPixelsPerFrame: {
        medianPositive: Number(percentile(positive, 0.5).toFixed(2)),
        p90Positive: Number(percentile(positive, 0.9).toFixed(2)),
        p95Positive: Number(percentile(positive, 0.95).toFixed(2)),
        largestPositive: Number((positive.at(-1) ?? 0).toFixed(2)),
        largestEvent: deltas.reduce((largest, item) => item.delta > (largest?.delta ?? -Infinity) ? item : largest, null),
    },
    layerArrivals,
};
const outputPath = metadataPath.replace(/\.json$/i, '.raw-pixel-curve.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ outputPath, summary: result.deltaPixelsPerFrame, samples }, null, 2));
