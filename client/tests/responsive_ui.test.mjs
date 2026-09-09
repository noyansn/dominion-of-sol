import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/ui/dominion.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main.ts'), 'utf8');
const input = fs.readFileSync(path.join(root, 'src/render/WorldInputController.ts'), 'utf8');

for (const id of [
  'mobile-sheet', 'mobile-command-toggle', 'btn-mobile-center', 'btn-mobile-info',
  'btn-mobile-globe-quick', 'btn-mobile-map-political', 'btn-mobile-map-terrain',
  'info-panel', 'attack-panel', 'btn-launch-attack', 'btn-halt-attack',
]) assert.match(html, new RegExp(`id=["']${id}["']`), `missing responsive control: ${id}`);

assert.match(css, /env\(safe-area-inset-(top|bottom|left|right)\)/);
assert.match(css, /@media \(max-width: 700px\)/);
assert.match(css, /@media \(max-width: 700px\), \(max-height: 600px\)/);
assert.ok((css.match(/#mobile-sheet\s*\{/g) || []).length >= 2, 'mobile sheet must override desktop display rule in media CSS');
assert.match(main, /window\.addEventListener\('resize'/);
assert.match(main, /app\.renderer\.resize\(window\.innerWidth, window\.innerHeight\)/);
assert.match(input, /removeEventListener\('pointerdown'/);
assert.match(input, /removeEventListener\('pointermove'/);
assert.match(input, /removeEventListener\('pointerup'/);

console.log('PASS: responsive UI contract, safe areas, mobile command sheet, and resize lifecycle');
