import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import WebSocket from 'ws';

import { PoliticalFieldCore } from './src/render/PoliticalFieldCore';
import { PoliticalSurfaceCache } from './src/render/PoliticalSurfaceCache';
import { PoliticalColorTexture } from './src/render/PoliticalColorTexture';
import { gameState } from './src/game/GameState';
import { POLITICAL_SCALE, POLITICAL_WIDTH, POLITICAL_HEIGHT } from './src/render/PoliticalSpace';
import { WORLD_WIDTH, WORLD_HEIGHT } from './src/render/WorldSpace';
import { VISUAL_MASK_WIDTH, VISUAL_MASK_HEIGHT } from './src/render/VisualLandMask';

async function runAudit() {
    console.log('Loading visual land mask...');
    const landMaskBuf = fs.readFileSync(path.join(process.cwd(), 'src', 'assets', 'world_visual_mask.bin'));
    const landMask = new Uint8Array(landMaskBuf);
    gameState.visualLandMask = landMask;
    
    console.log(`Land mask loaded: ${landMask.length} bytes (expected ${VISUAL_MASK_WIDTH * VISUAL_MASK_HEIGHT})`);

    const core = new PoliticalFieldCore({
        simulationWidth: WORLD_WIDTH,
        simulationHeight: WORLD_HEIGHT,
        scale: POLITICAL_SCALE,
        landMask: landMask,
        landMaskWidth: VISUAL_MASK_WIDTH,
        landMaskHeight: VISUAL_MASK_HEIGHT,
    });

    console.log('Connecting to server...');
    const ws = new WebSocket('ws://127.0.0.1:8765');

    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'player_join',
            protocolVersion: '1.0.0',
            playerName: 'Audit Bot',
            token: 'audit_1',
            flagId: 'flag_sol'
        }));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'world_snapshot') {
            console.log(`Snapshot received. Factions: ${msg.factions.length}`);
            const cellOwners = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
            for (const cell of msg.cells) {
                const idx = cell.index;
                const owner = cell.ownerId !== undefined ? cell.ownerId : cell.owner_id ?? 0;
                if (idx < WORLD_WIDTH * WORLD_HEIGHT) {
                    cellOwners[idx] = owner;
                }
            }
            
            // Generate CPU RAW ownership image (1024x512)
            console.log('Generating raw ownership PNG (1024x512)...');
            const rawPng = new PNG({ width: WORLD_WIDTH, height: WORLD_HEIGHT });
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    const idx = (WORLD_WIDTH * y + x);
                    const owner = cellOwners[idx];
                    const outIdx = idx * 4;
                    if (owner === 0) {
                        rawPng.data[outIdx] = 0;
                        rawPng.data[outIdx+1] = 0;
                        rawPng.data[outIdx+2] = 0;
                        rawPng.data[outIdx+3] = 255;
                    } else {
                        // random-ish colors based on owner ID
                        rawPng.data[outIdx] = (owner * 50) % 255;
                        rawPng.data[outIdx+1] = (owner * 100) % 255;
                        rawPng.data[outIdx+2] = (owner * 150) % 255;
                        rawPng.data[outIdx+3] = 255;
                    }
                }
            }
            fs.writeFileSync('raw_owners.png', PNG.sync.write(rawPng));
            console.log('Wrote raw_owners.png');

            // Generate CPU FINAL political image (4096x2048)
            console.log('Building PoliticalFieldCore fullBuild...');
            core.fullBuild(cellOwners, []);
            
            console.log('Generating final political ownership PNG (4096x2048)...');
            const finalPng = new PNG({ width: POLITICAL_WIDTH, height: POLITICAL_HEIGHT });
            for (let y = 0; y < POLITICAL_HEIGHT; y++) {
                for (let x = 0; x < POLITICAL_WIDTH; x++) {
                    const idx = (POLITICAL_WIDTH * y + x);
                    const owner = core.owners[idx];
                    const outIdx = idx * 4;
                    if (owner === 0) {
                        finalPng.data[outIdx] = 0;
                        finalPng.data[outIdx+1] = 0;
                        finalPng.data[outIdx+2] = 0;
                        finalPng.data[outIdx+3] = 255;
                    } else {
                        finalPng.data[outIdx] = (owner * 50) % 255;
                        finalPng.data[outIdx+1] = (owner * 100) % 255;
                        finalPng.data[outIdx+2] = (owner * 150) % 255;
                        finalPng.data[outIdx+3] = 255;
                    }
                }
            }
            fs.writeFileSync('final_owners.png', PNG.sync.write(finalPng));
            console.log('Wrote final_owners.png');

            // Test A: 4x mapping test
            let mappingPassed = true;
            for (let y = 0; y < WORLD_HEIGHT && mappingPassed; y++) {
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    const rawOwner = cellOwners[y * WORLD_WIDTH + x];
                    // Pick the top-left visual pixel for this cell in rawOwners
                    const vX = x * POLITICAL_SCALE;
                    const vY = y * POLITICAL_SCALE;
                    const vIdx = vY * POLITICAL_WIDTH + vX;
                    const vOwner = core.rawOwners[vIdx]; // Note: rawOwners contains the 4x expansion BEFORE smoothing
                    // If land mask permits, it should match
                    if (core.land[vIdx]) {
                        if (vOwner !== rawOwner) {
                            console.error(`4x mapping test failed at sim(${x},${y}) expected ${rawOwner}, got visual raw ${vOwner}`);
                            mappingPassed = false;
                            break;
                        }
                    }
                }
            }
            for (const f of msg.factions) {
                const fId = f.factionId ?? f.faction_id;
                gameState.factions.set(fId, { colorInt: f.colorInt ?? f.color_int, id: fId, capitalCell: -1, flagId: '' });
            }

            console.log('Building PoliticalColorTexture...');
            const colorTexture = new PoliticalColorTexture();
            colorTexture.update(core.owners);
            
            const rgba = colorTexture.colorBuffer;
            
            console.log('Generating RGBA PNG (4096x2048)...');
            const rgbaPng = new PNG({ width: POLITICAL_WIDTH, height: POLITICAL_HEIGHT, colorType: 6 });
            rgbaPng.data = Buffer.from(rgba);
            fs.writeFileSync('rgba_owners.png', PNG.sync.write(rgbaPng));
            console.log('Wrote rgba_owners.png');
            
            // 5. TEXTURE TEST
            let mappingPass = true;
            for (let i = 0; i < 1000; i++) {
                const rnd = Math.floor(Math.random() * core.owners.length);
                const owner = core.owners[rnd];
                if (owner > 0) {
                    if (rgba[rnd*4+3] !== 255) {
                        console.error(`FAIL: owner=${owner}, but alpha=${rgba[rnd*4+3]} at index ${rnd}. Faction exists in map? ${gameState.factions.has(owner)}`);
                        mappingPass = false;
                        break;
                    }
                } else {
                    if (rgba[rnd*4+3] !== 0) {
                        console.error(`FAIL: owner=0, but alpha=${rgba[rnd*4+3]} at index ${rnd}`);
                        mappingPass = false;
                        break;
                    }
                }
            }
            console.log(`Random owner->RGBA mapping: ${mappingPass ? 'PASS' : 'FAIL'}`);
            
            // Audit 10 representative points
            console.log('\n--- AUDIT 10 POINTS ---');
            let totalSimOwners = 0;
            for (let i = 0; i < cellOwners.length; i++) if (cellOwners[i] > 0) totalSimOwners++;
            console.log(`Total non-zero cellOwners: ${totalSimOwners}`);

            let pointsFound = 0;
            for (let visualIndex = 0; visualIndex < core.owners.length && pointsFound < 10; visualIndex++) {
                if (core.owners[visualIndex] > 0) {
                    const visualY = Math.floor(visualIndex / POLITICAL_WIDTH);
                    const visualX = visualIndex % POLITICAL_WIDTH;
                    const simX = Math.floor(visualX / 4);
                    const simY = Math.floor(visualY / 4);
                    const simIndex = simY * 1024 + simX;
                    const rawOwner = cellOwners[simIndex];
                    const visualOwner = core.owners[visualIndex];
                    
                    if (pointsFound % 1 === 0) {
                        console.log(`(x, y) = (${visualX}, ${visualY})`);
                        console.log(`expected simulation cell x/y = ${simX}/${simY}`);
                        console.log(`simulation index = ${simIndex}`);
                        console.log(`raw owner = ${rawOwner}`);
                        console.log(`visual index = ${visualIndex}`);
                        console.log(`visual owner = ${visualOwner}`);
                        console.log('---');
                    }
                    pointsFound++;
                }
            }

            process.exit(0);
        }
    });

    ws.on('error', (err) => {
        console.error(err);
        process.exit(1);
    });
}

runAudit().catch(console.error);
