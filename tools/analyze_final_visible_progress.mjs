import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');

const dir = process.env.DOMINION_EVIDENCE_DIR || 'C:/Users/noyan/Downloads/game/evidence-video/final-close-zoom';
const metadata = JSON.parse(fs.readFileSync(`${dir}/italy_focus_12pct_presentation_instrumented_evidence.json`, 'utf8'));
const before = PNG.sync.read(fs.readFileSync(`${dir}/italy_focus_12pct_presentation_before.png`));
const frames = metadata.visibleScreencast.frames;
const operationEntries = metadata.operationTransitionId
    ? metadata.presentationTimeline.filter(entry => entry.transitionId === metadata.operationTransitionId)
    : metadata.presentationTimeline.filter(entry => Number(entry.newOwner) === 101);
const startPerf = Math.min(...operationEntries.map(entry => Number(entry.transitionStartTime)));
const endPerf = Math.max(...operationEntries.map(entry => Number(entry.performanceNow)));
const startWall = metadata.visibleScreencast.startedAt + (startPerf - Number(metadata.recordInfo.performanceNow));
const endWall = metadata.visibleScreencast.startedAt + (endPerf - Number(metadata.recordInfo.performanceNow));

const isRed = (data, offset) => {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    return r > 72 && r > g * 1.22 && r > b * 1.18;
};

function redCount(image) {
    let count = 0;
    // Exclude the HUD; this ROI covers only the close Italy operation region.
    const x0 = 260, x1 = Math.min(image.width, 700);
    const y0 = 95, y1 = Math.min(image.height, 500);
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            if (isRed(image.data, (y * image.width + x) * 4)) count++;
        }
    }
    return count;
}

const baseline = redCount(before);
const sampled = [];
for (let t = startWall - 33; t <= endWall + 33; t += 33.333) {
    let best = frames[0];
    for (const frame of frames) {
        if (Math.abs(frame.receivedAt - t) < Math.abs(best.receivedAt - t)) best = frame;
    }
    const image = PNG.sync.read(fs.readFileSync(best.path));
    const redPixels = redCount(image);
    sampled.push({
        tMS: Math.round(t - startWall),
        receivedOffsetMS: Math.round(best.receivedAt - startWall),
        frame: best.index,
        redPixels,
        visibleNewOwnerPixels: Math.max(0, redPixels - baseline),
    });
}

const result = {
    source: metadata.video,
    roi: { x: 260, y: 95, width: 440, height: 405 },
    baselineRedPixels: baseline,
    operationStartWall: startWall,
    operationEndWall: endWall,
    durationMS: endWall - startWall,
    sampled,
};
const output = `${dir}/visible_new_owner_pixel_progress.json`;
fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ output, durationMS: result.durationMS, baselineRedPixels: baseline, samples: sampled }, null, 2));
