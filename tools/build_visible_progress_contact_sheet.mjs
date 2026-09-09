import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');

const dir = process.env.DOMINION_EVIDENCE_DIR || 'C:/Users/noyan/Downloads/game/evidence-video/final-close-zoom';
const metadata = JSON.parse(fs.readFileSync(`${dir}/italy_focus_12pct_presentation_instrumented_evidence.json`, 'utf8'));
const frames = metadata.visibleScreencast.frames;
const operationEntries = metadata.operationTransitionId
    ? metadata.presentationTimeline.filter(entry => entry.transitionId === metadata.operationTransitionId)
    : [];
const operationStart = operationEntries.length
    ? Math.min(...operationEntries.map(entry => Number(entry.transitionStartTime)))
    : Number.NaN;
const operationWallStart = Number(metadata.visibleScreencast.startedAt)
    + (operationStart - Number(metadata.recordInfo.performanceNow));
const crop = { x: 260, y: 95, width: 440, height: 405 };

function redPixels(image) {
    let count = 0;
    for (let y = crop.y; y < crop.y + crop.height; y++) {
        for (let x = crop.x; x < crop.x + crop.width; x++) {
            const p = (y * image.width + x) * 4;
            const r = image.data[p];
            const g = image.data[p + 1];
            const b = image.data[p + 2];
            if (r > 65 && r > g * 1.18 && r > b * 1.10 && g < 120) count++;
        }
    }
    return count;
}

const metrics = frames.map((frame) => ({
    frame,
    image: PNG.sync.read(fs.readFileSync(frame.path)),
}));
const counts = metrics.map(({ image }) => redPixels(image));
const baseline = Math.min(...counts.slice(0, Math.max(1, Math.floor(counts.length * 0.2))));
const firstGrowth = counts.findIndex((count) => count > baseline + 100);
const start = Math.max(0, firstGrowth - 2);
const selected = metrics.slice(start, Math.min(metrics.length, start + 15));
const images = selected.map((entry) => entry.image);

const columns = 5;
const rows = Math.ceil(images.length / columns);
const thumbWidth = 440;
const thumbHeight = 405;
const gap = 8;
const sheet = new PNG({
    width: columns * thumbWidth + (columns + 1) * gap,
    height: rows * thumbHeight + (rows + 1) * gap,
});
sheet.data.fill(18);

for (let n = 0; n < images.length; n++) {
    const image = images[n];
    const x0 = gap + (n % columns) * (thumbWidth + gap);
    const y0 = gap + Math.floor(n / columns) * (thumbHeight + gap);
    for (let y = 0; y < thumbHeight; y++) {
        for (let x = 0; x < thumbWidth; x++) {
            const sx = crop.x + x;
            const sy = crop.y + y;
            const sp = (sy * image.width + sx) * 4;
            const dp = ((y0 + y) * sheet.width + x0 + x) * 4;
            sheet.data[dp] = image.data[sp];
            sheet.data[dp + 1] = image.data[sp + 1];
            sheet.data[dp + 2] = image.data[sp + 2];
            sheet.data[dp + 3] = 255;
        }
    }
}

const output = `${dir}/italy_focus_12pct_visible_progress_consecutive_contact_sheet.png`;
fs.writeFileSync(output, PNG.sync.write(sheet));
fs.writeFileSync(
    `${dir}/italy_focus_12pct_visible_progress_consecutive_contact_sheet.json`,
    JSON.stringify({ baselineRedPixels: baseline, firstGrowth, start, selected: selected.map((entry, index) => ({
        index: entry.frame.index,
        receivedAt: entry.frame.receivedAt,
        relativeToOperationMS: Number.isFinite(operationWallStart)
            ? entry.frame.receivedAt - operationWallStart
            : null,
        redPixels: counts[start + index],
        path: entry.frame.path,
    })) }, null, 2),
);
console.log(JSON.stringify({ output, baselineRedPixels: baseline, firstGrowth, start, operationWallStart, selected: selected.map((entry, index) => ({ index: entry.frame.index, relativeToOperationMS: Number.isFinite(operationWallStart) ? entry.frame.receivedAt - operationWallStart : null, redPixels: counts[start + index] })) }, null, 2));
