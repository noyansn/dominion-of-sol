import WebSocket from 'ws';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gameState } from '../src/game/GameState.js';
import { PoliticalSurfaceCache } from '../src/render/PoliticalSurfaceCache.js';
import { PoliticalColorTexture } from '../src/render/PoliticalColorTexture.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock performance.now
globalThis.performance = { now: () => Date.now() } as any;

const ws = new WebSocket('ws://127.0.0.1:8765');

let snapshotSeen = false;
let deltaBatches = 0;

// Removed gameState instantiation
const surface = new PoliticalSurfaceCache();
const colorTexture = new PoliticalColorTexture();

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'Political Regression',
        token: 'political_regression',
        flagId: 'flag_sol',
    }));
});

ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    
    if (msg.type === 'world_snapshot') {
        // Load visual mask
        const maskBuf = readFileSync(path.join(__dirname, '../src/assets/world_visual_mask.bin'));
        gameState.visualLandMask = new Uint8Array(maskBuf.buffer, maskBuf.byteOffset, maskBuf.byteLength);
        gameState.visualMaskReady = true;

        gameState.applySnapshot(msg);
        surface.init();
        surface.fullSync();
        colorTexture.update(surface.ownerBuffer, gameState.factions, surface.surfaceRevision);

        assert.equal(msg.width, 1024);
        assert.equal(msg.height, 512);
        assert.equal(msg.totalCells, 524288);
        assert.equal(msg.factions.length, 101);

        snapshotSeen = true;

        // Dump initial PNGs
        console.log('Dumping snapshot artifacts...');
        dumpOwnerPng('raw_owner_1024x512.png', 1024, 512, gameState.cellOwners, getPalette(gameState.factions));
        dumpOwnerPng('political_raw_4096x2048.png', 4096, 2048, surface.rawOwnerBuffer, getPalette(gameState.factions));
        dumpOwnerPng('political_smoothed_4096x2048.png', 4096, 2048, surface.ownerBuffer, getPalette(gameState.factions));
        dumpRgbaPng('political_rgba_4096x2048.png', 4096, 2048, colorTexture.colorBuffer);
        
        writeFileSync('political_rgba.bin', colorTexture.colorBuffer);
        const sha = createHash('sha256').update(colorTexture.colorBuffer).digest('hex');
        writeFileSync('political_rgba.sha256.txt', sha + '\n');
        writeFileSync('first-delta.json', JSON.stringify({ tick: msg.tick }, null, 2));

        console.log('Snapshot artifacts generated.');
    }
    
    if (msg.type === 'cell_delta_batch' && snapshotSeen) {
        deltaBatches++;
        
        gameState.applyDeltas(msg.deltas, msg.tick, msg.sequence, msg.fronts);
        
        surface.syncDirtyCells(gameState.dirtyCells.map(delta => delta.index));
        colorTexture.update(surface.ownerBuffer, gameState.factions, surface.surfaceRevision);

        // Verification invariant
        assert.equal(gameState.factions.size, 101);
        assert.equal(gameState.cellOwners.length, 524288);
        assert.equal(surface.rawOwnerBuffer.length, 8388608);
        assert.equal(surface.ownerBuffer.length, 8388608);
        assert.equal(colorTexture.colorBuffer.length, 33554432);

        // check invalid owner
        let invalid = 0;
        for (let i = 0; i < surface.ownerBuffer.length; i++) {
            if (surface.ownerBuffer[i] > 101) invalid++;
        }
        assert.equal(invalid, 0, 'invalid owner count');

        if (deltaBatches === 20) {
            console.log('PASS: 20 DELTA BATCHES');
            ws.close();
            process.exit(0);
        }
    }
});

function getPalette(factions) {
    return (owner) => {
        const f = factions.get(owner);
        if (!f) return [0,0,0];
        const c = f.colorInt;
        return [(c >>> 16) & 0xff, (c >>> 8) & 0xff, c & 0xff];
    };
}

function dumpOwnerPng(p, width, height, owners, colorForOwner) {
    if (owners.length !== width * height) throw new Error('mismatch');
    const png = new PNG({ width, height });
    for (let i = 0; i < owners.length; i++) {
        const p2 = i * 4;
        const owner = owners[i];
        if (owner === 0) {
            png.data[p2] = 0; png.data[p2+1] = 0; png.data[p2+2] = 0; png.data[p2+3] = 255;
            continue;
        }
        const [r,g,b] = colorForOwner(owner);
        png.data[p2] = r; png.data[p2+1] = g; png.data[p2+2] = b; png.data[p2+3] = 255;
    }
    writeFileSync(p, PNG.sync.write(png));
}

function dumpRgbaPng(p, width, height, rgba) {
    const png = new PNG({ width, height });
    png.data.set(rgba);
    // ensure alpha is 255 for opaque viewing
    for (let i = 3; i < png.data.length; i += 4) {
        png.data[i] = 255;
    }
    writeFileSync(p, PNG.sync.write(png));
}
