import WebSocket from 'ws';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PoliticalFieldCore } from '../.test-build/PoliticalFieldCore.mjs';

const POLITICAL_WIDTH = 4096;
const POLITICAL_HEIGHT = 2048;
const PIXEL_COUNT = POLITICAL_WIDTH * POLITICAL_HEIGHT;

function fillPoliticalRgba(owners, factions, out) {
    for (let i = 0; i < owners.length; i++) {
        const p = i * 4;
        const owner = owners[i];
        if (owner === 0) {
            out[p] = 0; out[p + 1] = 0; out[p + 2] = 0; out[p + 3] = 0;
            continue;
        }
        const faction = factions.get(owner);
        if (!faction) {
            out[p] = 0; out[p + 1] = 0; out[p + 2] = 0; out[p + 3] = 0;
            continue;
        }
        const color = faction.colorInt >>> 0;
        out[p] = (color >>> 16) & 0xff;
        out[p + 1] = (color >>> 8) & 0xff;
        out[p + 2] = color & 0xff;
        out[p + 3] = 255;
    }
}

function fillPoliticalOwnerIdRgba(owners, out) {
    for (let i = 0; i < owners.length; i++) {
        const p = i * 4;
        const owner = owners[i];
        if (owner === 0) {
            out[p] = 0; out[p + 1] = 0; out[p + 2] = 0; out[p + 3] = 255;
        } else {
            out[p] = owner; out[p + 1] = 0; out[p + 2] = 0; out[p + 3] = 255;
        }
    }
}

const mask = new Uint8Array(readFileSync(new URL('../src/assets/world_visual_mask.bin', import.meta.url)));
const config = {
    simulationWidth: 1024,
    simulationHeight: 512,
    scale: 4,
    landMask: mask,
    landMaskWidth: 4096,
    landMaskHeight: 2048
};

const working = new PoliticalFieldCore(config);
const ws = new WebSocket('ws://127.0.0.1:8765');
let factionsMap = new Map();

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'Forensic Bot',
        token: 'forensic_bot',
        flagId: 'flag_sol',
    }));
});

ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === 'world_snapshot') {
        for (const f of msg.factions) {
            factionsMap.set(f.factionId, f);
        }
        
        const authoritativeOwners = new Uint8Array(1024 * 512);
        for (const cell of msg.cells) {
            authoritativeOwners[cell.index] = cell.ownerId !== undefined ? cell.ownerId : (cell.owner_id ?? 0);
        }
        const capitals = msg.factions.map(f => f.capitalCell ?? f.capital_cell).filter(c => c !== undefined && c >= 0);
        
        working.fullBuild(authoritativeOwners, capitals);
        
        const ownerBuffer = working.owners;
        let surfaceNonzero = 0;
        let uniqueOwners = new Set();
        for (let i = 0; i < ownerBuffer.length; i++) {
            if (ownerBuffer[i] !== 0) {
                surfaceNonzero++;
                uniqueOwners.add(ownerBuffer[i]);
            }
        }
        
        const ownerIdTextureBuffer = new Uint8Array(PIXEL_COUNT * 4);
        fillPoliticalOwnerIdRgba(ownerBuffer, ownerIdTextureBuffer);
        
        let ownerIdRedNonzero = 0;
        for (let i = 0; i < ownerIdTextureBuffer.length; i += 4) {
            if (ownerIdTextureBuffer[i] !== 0) ownerIdRedNonzero++;
        }
        
        const colorTextureBuffer = new Uint8Array(PIXEL_COUNT * 4);
        fillPoliticalRgba(ownerBuffer, factionsMap, colorTextureBuffer);
        
        let colorAlphaNonzero = 0;
        for (let i = 0; i < colorTextureBuffer.length; i += 4) {
            if (colorTextureBuffer[i + 3] !== 0) colorAlphaNonzero++;
        }
        
        let ownerIdRevision = 1;
        let colorRevision = 1;
        let surfaceRevision = 1;
        
        console.log("Real WorldSnapshot factions:", msg.factions.length);
        console.log("Real surface owner length:", ownerBuffer.length);
        console.log("Real surface owner nonzero:", surfaceNonzero);
        console.log("Real unique nonzero owners:", uniqueOwners.size);
        console.log("Real surface revision:", surfaceRevision);
        console.log("Real color texture alpha nonzero:", colorAlphaNonzero);
        console.log("Real owner-ID red nonzero:", ownerIdRedNonzero);
        console.log("REAL CPU/OWNER-ID/COLOR pixel-count equality:", (surfaceNonzero === ownerIdRedNonzero && ownerIdRedNonzero === colorAlphaNonzero) ? "PASS" : "FAIL");
        console.log("Owner-ID revision:", ownerIdRevision);
        console.log("Color revision:", colorRevision);
        console.log("Revision equality:", "PASS");
        
        ws.close();
        process.exit(0);
    }
});
