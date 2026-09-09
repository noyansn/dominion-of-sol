import { readFileSync } from 'node:fs';

const visualWidth = 4096;
const mask = new Uint8Array(readFileSync(new URL('../src/assets/world_visual_mask.bin', import.meta.url)));
const terrains = new Uint8Array(readFileSync(new URL('../../server/assets/world_grid.bin', import.meta.url)));
const split = new Uint8Array(readFileSync(new URL('../../server/assets/world_split_topology_v1.bin', import.meta.url)));

if (new TextDecoder().decode(split.slice(0, 8)) !== 'DOMSPLT1') throw new Error('Invalid split topology asset');
const splitCells = new Map();
const count = new DataView(split.buffer, split.byteOffset, split.byteLength).getUint32(16, true);
let offset = 32;
for (let i = 0; i < count; i++) {
  const view = new DataView(split.buffer, split.byteOffset + offset);
  const cell = view.getUint32(0, true);
  const pieces = split[offset + 4];
  offset += 8;
  let unionMask = 0;
  for (let p = 0; p < pieces; p++) {
    const piece = new DataView(split.buffer, split.byteOffset + offset);
    unionMask |= piece.getUint16(2, true);
    const neighbors = piece.getUint16(4, true);
    offset += 8 + neighbors * 4;
  }
  splitCells.set(cell, unionMask);
}

let visualLandInWaterCells = 0;
let waterCellsWithVisualLand = 0;
let representedBySplit = 0;
let fullyRepresentedBySplit = 0;
for (let cell = 0; cell < terrains.length; cell++) {
  if (terrains[cell] === 0) continue;
  const cx = cell % 1024;
  const cy = Math.floor(cell / 1024);
  let visualMask = 0;
  for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
    if (mask[(cy * 4 + dy) * visualWidth + cx * 4 + dx] >= 128) visualMask |= 1 << (dy * 4 + dx);
  }
  if (!visualMask) continue;
  waterCellsWithVisualLand++;
  visualLandInWaterCells += visualMask.toString(2).split('1').length - 1;
  const splitMask = splitCells.get(cell);
  if (splitMask !== undefined) {
    representedBySplit++;
    if ((visualMask & ~splitMask) === 0) fullyRepresentedBySplit++;
  }
}

console.log(JSON.stringify({
  splitCells: splitCells.size,
  waterCellsWithVisualLand,
  visualLandInWaterCells,
  representedBySplit,
  fullyRepresentedBySplit,
  missingSplitRepresentation: waterCellsWithVisualLand - fullyRepresentedBySplit,
}, null, 2));
