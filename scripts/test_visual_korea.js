const fs = require('fs');

const VISUAL_W = 4096, VISUAL_H = 2048;
const visualMask = fs.readFileSync('../client/src/assets/world_visual_mask.bin');

// Korea Strait: Lon 128 to 132, Lat 32 to 36
const minLon = 128, maxLon = 132, minLat = 32, maxLat = 36;
const minX = Math.floor((minLon + 180) / 360 * VISUAL_W);
const maxX = Math.floor((maxLon + 180) / 360 * VISUAL_W);
const minY = Math.floor((90 - maxLat) / 180 * VISUAL_H);
const maxY = Math.floor((90 - minLat) / 180 * VISUAL_H);

let connected = false;
// Simple BFS from Japan side to Korea side
let sx = -1, sy = -1;
let tx = -1, ty = -1;

for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        if (x > minX + (maxX-minX)*0.8 && visualMask[y * VISUAL_W + x] >= 128) {
            sx = x; sy = y; break;
        }
    }
    if (sx !== -1) break;
}

for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        if (x < minX + (maxX-minX)*0.2 && visualMask[y * VISUAL_W + x] >= 128) {
            tx = x; ty = y; break;
        }
    }
    if (tx !== -1) break;
}

const q = [[sx, sy]];
const visited = new Set();
visited.add(sy * VISUAL_W + sx);
let head = 0;

while (head < q.length) {
    const [cx, cy] = q[head++];
    if (cx === tx && cy === ty) {
        connected = true; break;
    }
    
    // We just need to check if ANY point on the left side is reached.
    if (cx < minX + (maxX-minX)*0.2) {
        connected = true; break;
    }
    
    const neighbors = [
        [cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]
    ];
    for (const [nx, ny] of neighbors) {
        if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
            if (visualMask[ny * VISUAL_W + nx] >= 128) {
                const nidx = ny * VISUAL_W + nx;
                if (!visited.has(nidx)) {
                    visited.add(nidx);
                    q.push([nx, ny]);
                }
            }
        }
    }
}
console.log("VISUAL_MASK_JAPAN_KOREA_CONNECTED = " + (connected ? "TRUE" : "FALSE"));
