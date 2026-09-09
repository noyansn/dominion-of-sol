import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');
const dir = process.env.DOMINION_EVIDENCE_DIR || 'C:/Users/noyan/Downloads/game/evidence-video';
const selected = JSON.parse(fs.readFileSync(`${dir}/italy_focus_12pct_visible_screencast_contact_sheet.json`, 'utf8')).selected;
const images = selected.map(frame => PNG.sync.read(fs.readFileSync(frame.path)));
// Include the whole Italy front and its northern arrival edge; the old crop
// started below the most informative part of the close-up.
const crop = { x: 390, y: 105, width: 250, height: 210 };
const columns = 5;
const rows = 3;
const scale = 2;
const thumbWidth = crop.width * scale;
const thumbHeight = crop.height * scale;
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
        const sy = Math.min(image.height - 1, crop.y + Math.floor(y / scale));
        for (let x = 0; x < thumbWidth; x++) {
            const sx = Math.min(image.width - 1, crop.x + Math.floor(x / scale));
            const sp = (sy * image.width + sx) * 4;
            const dp = ((y0 + y) * sheet.width + x0 + x) * 4;
            sheet.data[dp] = image.data[sp];
            sheet.data[dp + 1] = image.data[sp + 1];
            sheet.data[dp + 2] = image.data[sp + 2];
            sheet.data[dp + 3] = 255;
        }
    }
}
const output = `${dir}/italy_focus_12pct_visible_screencast_closeup_contact_sheet.png`;
fs.writeFileSync(output, PNG.sync.write(sheet));
console.log(output);
