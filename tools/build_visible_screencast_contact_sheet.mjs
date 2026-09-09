import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');
const evidenceDir = process.env.DOMINION_EVIDENCE_DIR || 'C:/Users/noyan/Downloads/game/evidence-video';
const metadataPath = `${evidenceDir}/italy_focus_12pct_presentation_instrumented_evidence.json`;
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const frames = metadata.visibleScreencast.frames;
const operationEntries = metadata.operationTransitionId
    ? metadata.presentationTimeline.filter(entry => entry.transitionId === metadata.operationTransitionId)
    : metadata.presentationTimeline.filter(entry => Number(entry.newOwner) === 101);
const operationTransitionStart = operationEntries.reduce(
    (min, entry) => Math.min(min, Number(entry.transitionStartTime)),
    Number.POSITIVE_INFINITY,
);
const operationWallStart = metadata.visibleScreencast.startedAt
    + (operationTransitionStart - metadata.recordInfo.performanceNow);
const desired = Array.from({ length: 15 }, (_, index) => operationWallStart - 33 + index * 33);
const selected = [];
let cursor = 0;
for (const target of desired) {
    while (cursor + 1 < frames.length && Math.abs(frames[cursor + 1].receivedAt - target) <= Math.abs(frames[cursor].receivedAt - target)) {
        cursor++;
    }
    selected.push({ ...frames[cursor], targetWallTime: target });
}

const images = selected.map(frame => PNG.sync.read(fs.readFileSync(frame.path)));
const columns = 5;
const rows = 3;
const thumbWidth = 260;
const thumbHeight = Math.round(images[0].height * thumbWidth / images[0].width);
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
        const sy = Math.min(image.height - 1, Math.floor(y * image.height / thumbHeight));
        for (let x = 0; x < thumbWidth; x++) {
            const sx = Math.min(image.width - 1, Math.floor(x * image.width / thumbWidth));
            const sp = (sy * image.width + sx) * 4;
            const dp = ((y0 + y) * sheet.width + x0 + x) * 4;
            sheet.data[dp] = image.data[sp];
            sheet.data[dp + 1] = image.data[sp + 1];
            sheet.data[dp + 2] = image.data[sp + 2];
            sheet.data[dp + 3] = 255;
        }
    }
}

const outputPath = `${evidenceDir}/italy_focus_12pct_visible_screencast_contact_sheet.png`;
fs.writeFileSync(outputPath, PNG.sync.write(sheet));
fs.writeFileSync(
    `${evidenceDir}/italy_focus_12pct_visible_screencast_contact_sheet.json`,
    JSON.stringify({ operationWallStart, selected }, null, 2),
);
console.log(outputPath);
