import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');
const dir = 'C:/Users/noyan/Downloads/game/evidence-video';
const metadata = JSON.parse(fs.readFileSync(`${dir}/italy_focus_12pct_presentation_instrumented_evidence.json`, 'utf8'));
const all = metadata.visibleScreencast.frames;
const selected = all.filter(frame => frame.index >= 15 && frame.index <= 29);
const crop = { x: 310, y: 185, width: 270, height: 250 };
const scale = 2;
const columns = 5;
const rows = Math.ceil(selected.length / columns);
const gap = 8;
const thumbWidth = crop.width * scale;
const thumbHeight = crop.height * scale;
const sheet = new PNG({
    width: columns * thumbWidth + (columns + 1) * gap,
    height: rows * thumbHeight + (rows + 1) * gap,
});
sheet.data.fill(18);
for (let n = 0; n < selected.length; n++) {
    const image = PNG.sync.read(fs.readFileSync(selected[n].path));
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
const output = `${dir}/italy_focus_12pct_observed_progress_closeup_contact_sheet.png`;
fs.writeFileSync(output, PNG.sync.write(sheet));
fs.writeFileSync(`${dir}/italy_focus_12pct_observed_progress_closeup_contact_sheet.json`, JSON.stringify({ selected }, null, 2));
console.log(output);
