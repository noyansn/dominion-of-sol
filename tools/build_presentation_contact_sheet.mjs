import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');

const inputDir = process.env.DOMINION_EVIDENCE_DIR || 'C:/Users/noyan/Downloads/game/evidence-video';
const outputPath = `${inputDir}/italy_focus_12pct_presentation_video30fps_contact_sheet.png`;
const inputPaths = Array.from({ length: 16 }, (_, index) =>
    `${inputDir}/italy_focus_12pct_presentation_video30fps_${String(index).padStart(2, '0')}.png`,
);

const source = inputPaths.map(path => PNG.sync.read(fs.readFileSync(path)));
const columns = 4;
const rows = Math.ceil(source.length / columns);
const thumbWidth = 260;
const thumbHeight = Math.round(source[0].height * thumbWidth / source[0].width);
const gap = 8;
const sheet = new PNG({
    width: columns * thumbWidth + (columns + 1) * gap,
    height: rows * thumbHeight + (rows + 1) * gap,
});
sheet.data.fill(18);

for (let n = 0; n < source.length; n++) {
    const image = source[n];
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

fs.writeFileSync(outputPath, PNG.sync.write(sheet));
console.log(outputPath);
