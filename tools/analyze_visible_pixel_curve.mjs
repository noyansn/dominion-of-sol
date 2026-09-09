import fs from 'node:fs';
import { PNG } from 'pngjs';

const metadataPath = process.argv[2];
if (!metadataPath) throw new Error('Usage: node tools/analyze_visible_pixel_curve.mjs <metadata.json>');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const readPng = path => PNG.sync.read(fs.readFileSync(path));
const before = readPng(metadata.frames.before);
const probe = metadata.compositingProbe?.transitionMeshBounds;
const crop = {
  x: Math.max(0, Math.floor(probe?.x ?? 300)),
  y: Math.max(0, Math.floor(probe?.y ?? 60)),
  width: Math.min(before.width, Math.ceil(probe?.width ?? 360)),
  height: Math.min(before.height, Math.ceil(probe?.height ?? 360)),
};

function redScore(image, offset) {
  const r = image.data[offset];
  const g = image.data[offset + 1];
  const b = image.data[offset + 2];
  return Math.max(0, r - (g * 0.68 + b * 0.32));
}

function countNewPixels(image) {
  let count = 0;
  let equivalent = 0;
  for (let y = crop.y; y < crop.y + crop.height; y++) {
    for (let x = crop.x; x < crop.x + crop.width; x++) {
      const offset = (y * image.width + x) * 4;
      const baseline = redScore(before, offset);
      const current = redScore(image, offset);
      if (current > 42 && current > baseline + 18) count++;
      equivalent += Math.max(0, Math.min(1, (current - baseline) / 80));
    }
  }
  return { count, equivalent };
}

const frames = (metadata.visibleScreencast?.frames || []).map(frame => ({
  index: frame.index,
  wallTime: frame.receivedAt,
  image: readPng(frame.path),
}));
const counts = frames.map(frame => ({
  index: frame.index,
  wallTime: frame.wallTime,
  ...countNewPixels(frame.image),
}));
const operationEntries = (metadata.presentationTimeline || [])
  .filter(entry => entry.transitionId === metadata.operationTransitionId);
const operationStartPerformance = operationEntries[0]?.transitionStartTime ?? null;
const operationLastPerformance = operationEntries.at(-1)?.performanceNow ?? operationStartPerformance;
const operationStartWall = operationStartPerformance === null
  ? null
  : metadata.visibleScreencast.startedAt
    + (operationStartPerformance - metadata.recordInfo.performanceNow);
const operationEndWall = operationStartWall === null
  ? null
  : operationStartWall + Math.max(0, operationLastPerformance - operationStartPerformance);
const operationCounts = operationStartWall === null
  ? counts
  : counts.filter(frame => frame.wallTime >= operationStartWall - 34 && frame.wallTime <= operationEndWall + 34);
const firstGrowthIndex = operationCounts.findIndex(frame => frame.equivalent >= 8);
const active = firstGrowthIndex >= 0 ? operationCounts.slice(firstGrowthIndex) : operationCounts;
const deltas = active.slice(1).map((frame, index) => ({
  from: active[index].equivalent,
  to: frame.equivalent,
  delta: frame.equivalent - active[index].equivalent,
  binaryFrom: active[index].count,
  binaryTo: frame.count,
  index: frame.index,
  wallTime: frame.wallTime,
}));
const positiveDeltas = deltas.filter(item => item.delta > 0).map(item => item.delta).sort((a, b) => a - b);
const percentile = (values, p) => {
  if (!values.length) return 0;
  const index = (values.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return lower === upper ? values[lower] : values[lower] + (values[upper] - values[lower]) * (index - lower);
};
const layerArrivals = [];
let previousTextureRevision = null;
for (const entry of operationEntries) {
  if (entry.transitionTextureRevision !== previousTextureRevision) {
    layerArrivals.push({
      textureRevision: entry.transitionTextureRevision,
      operationElapsedMS: entry.performanceNow - operationEntries[0].transitionStartTime,
      authoritativeOwnerRevision: entry.authoritativeOwnerRevision,
      authorizedCellCount: entry.authorizedCellCount,
    });
    previousTextureRevision = entry.transitionTextureRevision;
  }
}

const result = {
  source: metadata.video,
  sourceCadence: 'actual Page.screencast frames',
  crop,
  firstGrowthFrame: active[0]?.index ?? null,
  operationWindow: { startWall: operationStartWall, endWall: operationEndWall },
  sampleCount: active.length,
  pixelCounts: active.map(item => ({
    frame: item.index,
    newOwnerPixels: item.newOwnerPixels,
    newOwnerPixelEquivalent: Number(item.equivalent.toFixed(2)),
    wallTime: item.wallTime,
  })),
  deltaPixelsPerFrame: {
    medianPositive: percentile(positiveDeltas, 0.5),
    p90Positive: percentile(positiveDeltas, 0.9),
    p95Positive: percentile(positiveDeltas, 0.95),
    largestPositive: positiveDeltas.at(-1) ?? 0,
    largestEvent: deltas.reduce((best, item) => item.delta > (best?.delta ?? 0) ? item : best, null),
  },
  layerArrivals,
};
const outputPath = metadataPath.replace(/\.json$/i, '.visible-pixel-curve.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ outputPath, summary: result.deltaPixelsPerFrame, layerArrivals, firstGrowthFrame: result.firstGrowthFrame }, null, 2));
