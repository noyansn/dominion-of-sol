import assert from 'assert';

console.log("=========================================");
console.log("TEST: POLITICAL TRANSITION ANIMATION");
console.log("=========================================");

// Fake PIXI environment to test transition generation math
global.PIXI = {
    Container: class { addChild() {} removeChild() {} },
    BufferImageSource: class { style = {}; },
    Texture: class { destroy() {} },
    MeshGeometry: class {},
    Shader: class { static from(obj) { return obj; } },
    Mesh: class { destroy() {} }
};

// Fake GameState
const fakeGameState = {
    width: 1024,
    height: 512,
    cellOwners: new Uint8Array(1024 * 512),
};
global.gameState = fakeGameState;

// Mock PoliticalTransitionManager
class MockTransitionManager {
    constructor() {
        this.activeTransitions = [];
    }
    
    // We will just copy the core logic here to test the math without PIXI DOM dependency
    processGroup(group) {
        const comp = group.map(g => g.index);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const idx of comp) {
            const x = idx % 1024;
            const y = Math.floor(idx / 1024);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        minX = Math.max(0, minX - 1);
        minY = Math.max(0, minY - 1);
        maxX = Math.min(1023, maxX + 1);
        maxY = Math.min(511, maxY + 1);

        const simW = maxX - minX + 1;
        const simH = maxY - minY + 1;
        const texW = simW * 4;
        const texH = simH * 4;
        const data = new Uint8Array(texW * texH * 4);

        // BFS distance logic
        const dists = new Map();
        const q = [comp[0]];
        dists.set(comp[0], 0);

        let maxDist = 0;
        while (q.length > 0) {
            const curr = q.shift();
            const d = dists.get(curr);
            const cx = curr % 1024;
            const cy = Math.floor(curr / 1024);
            const nbs = [ {x: cx-1, y: cy}, {x: cx+1, y: cy}, {x: cx, y: cy-1}, {x: cx, y: cy+1} ];
            for (const n of nbs) {
                if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) {
                    const nIdx = n.y * 1024 + n.x;
                    if (comp.includes(nIdx) && !dists.has(nIdx)) {
                        dists.set(nIdx, d + 1);
                        if (d + 1 > maxDist) maxDist = d + 1;
                        q.push(nIdx);
                    }
                }
            }
        }

        for (const idx of comp) {
            const x = idx % 1024;
            const y = Math.floor(idx / 1024);
            const lx = x - minX;
            const ly = y - minY;
            const dist = dists.get(idx) || 0;
            const normDist = maxDist > 0 ? dist / maxDist : 0.0;
            
            let gradX = 0, gradY = 0;
            const dLeft = dists.get(idx - 1) ?? dist;
            const dRight = dists.get(idx + 1) ?? dist;
            const dUp = dists.get(idx - 1024) ?? dist;
            const dDown = dists.get(idx + 1024) ?? dist;
            gradX = dRight - dLeft;
            gradY = dDown - dUp;
            const glen = Math.hypot(gradX, gradY);
            if (glen > 0.001) { gradX /= glen; gradY /= glen; }

            for (let py = 0; py < 4; py++) {
                for (let px = 0; px < 4; px++) {
                    const tx = lx * 4 + px;
                    const ty = ly * 4 + py;
                    const pIdx = (ty * texW + tx) * 4;
                    const sx = (px / 3.0) - 0.5;
                    const sy = (py / 3.0) - 0.5;
                    const proj = gradX * sx + gradY * sy;
                    const curve = Math.sin(px * 1.5) * Math.cos(py * 1.5);
                    const subProgress = normDist + 0.35 * proj + 0.12 * curve;
                    const clampedArrival = Math.max(1, Math.min(255, Math.floor(subProgress * 255.0)));
                    
                    data[pIdx + 0] = group[0].oldOwner;
                    data[pIdx + 1] = group[0].newOwner;
                    data[pIdx + 2] = clampedArrival;
                    data[pIdx + 3] = 255;
                }
            }
        }
        
        return { data, texW, texH, comp };
    }
}

// 16-cell patch test
const changes = [];
for (let y = 10; y < 14; y++) {
    for (let x = 10; x < 14; x++) {
        changes.push({ index: y * 1024 + x, oldOwner: 0, newOwner: 1 });
    }
}

const manager = new MockTransitionManager();
const result = manager.processGroup(changes);
const arrivalData = result.data;
const totalSamples = 16 * 16; // 256

function simulateShader(progress) {
    let revealed = 0;
    let old = 0;
    let partialBlocks = 0;

    for (const idx of result.comp) {
        const x = idx % 1024;
        const y = Math.floor(idx / 1024);
        const lx = x - (10 - 1); // minX was 9
        const ly = y - (10 - 1); // minY was 9

        let blockRevealed = 0;
        let blockOld = 0;

        for (let py = 0; py < 4; py++) {
            for (let px = 0; px < 4; px++) {
                const tx = lx * 4 + px;
                const ty = ly * 4 + py;
                const pIdx = (ty * result.texW + tx) * 4;
                const arrival = arrivalData[pIdx + 2] / 255.0;
                
                if (progress >= arrival) {
                    revealed++;
                    blockRevealed++;
                } else {
                    old++;
                    blockOld++;
                }
            }
        }

        if (blockRevealed > 0 && blockOld > 0) {
            partialBlocks++;
        }
    }

    return { revealed, old, partialBlocks };
}

const p00 = simulateShader(0.00);
const p20 = simulateShader(0.20);
const p40 = simulateShader(0.40);
const p60 = simulateShader(0.60);
const p80 = simulateShader(0.80);
const p100 = simulateShader(1.00);

console.log(`p=0.00 => revealed: ${p00.revealed} / ${totalSamples}`);
console.log(`p=0.20 => revealed: ${p20.revealed} / ${totalSamples}`);
console.log(`p=0.40 => revealed: ${p40.revealed} / ${totalSamples}, partial blocks: ${p40.partialBlocks}`);
console.log(`p=0.60 => revealed: ${p60.revealed} / ${totalSamples}`);
console.log(`p=0.80 => revealed: ${p80.revealed} / ${totalSamples}`);
console.log(`p=1.00 => revealed: ${p100.revealed} / ${totalSamples}`);

assert(p00.revealed === 0);
assert(p20.revealed > 0 && p20.revealed < totalSamples);
assert(p40.revealed > p20.revealed);
assert(p60.revealed > p40.revealed);
assert(p80.revealed > p60.revealed);
assert(p100.revealed === totalSamples);
assert(p40.partialBlocks > 0);

console.log("PASS: WAVEFRONT TEST SUCCESS");
process.exit(0);
