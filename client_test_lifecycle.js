const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ws = new WebSocket('ws://127.0.0.1:8765');
let firstSnapshot = null;
let deltaBatchesCount = 0;
let botDecisions = 0; // Not explicitly sent, but we can infer from deltas
let ownershipChanges = 0;

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'Lifecycle Headless',
        token: 'token_player_test',
        flagId: 'flag_sol'
    }));
});

ws.on('message', (data) => {
    const text = data.toString();
    const msg = JSON.parse(text);

    if (msg.type === 'world_snapshot') {
        if (!firstSnapshot) {
            firstSnapshot = msg;
            
            let totalLand = 0;
            let totalOwned = 0;
            let factionCounts = new Array(101).fill(0);
            
            const ownersGridBuffer = Buffer.alloc(msg.cells.length);
            for (let i = 0; i < msg.cells.length; i++) {
                const c = msg.cells[i];
                if (c.terrain === 0) {
                    totalLand++;
                    if (c.ownerId !== 0) {
                        totalOwned++;
                        factionCounts[c.ownerId]++;
                        ownersGridBuffer.writeUInt8(c.ownerId, i);
                    }
                }
            }
            
            const sha256 = crypto.createHash('sha256').update(ownersGridBuffer).digest('hex');
            
            let minLand = Infinity, maxLand = 0;
            let activeFactions = [];
            for (let i = 1; i <= 100; i++) {
                const count = factionCounts[i];
                if (count > 0) {
                    activeFactions.push(count);
                    if (count < minLand) minLand = count;
                    if (count > maxLand) maxLand = count;
                }
            }
            activeFactions.sort((a, b) => a - b);
            const medianLand = activeFactions[Math.floor(activeFactions.length / 2)];
            const meanLand = activeFactions.reduce((a, b) => a + b, 0) / activeFactions.length;
            
            const snapshotData = {
                matchId: "fresh",
                matchSeed: "N/A (check server logs)",
                tick: msg.tick,
                factions: msg.factions.length,
                cells: msg.cells.length,
                totalLand,
                totalOwned,
                totalNeutralLand: totalLand - totalOwned,
                neutralPercent: ((totalLand - totalOwned) / totalLand) * 100,
                factionLandMin: minLand,
                factionLandMedian: medianLand,
                factionLandMean: meanLand,
                factionLandMax: maxLand,
                ownerGridSha256: sha256
            };
            
            const dir = path.join(__dirname, 'tests', 'artifacts');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'fresh_first_snapshot.json'), JSON.stringify(snapshotData, null, 2));
            
            console.log("=== FIRST SNAPSHOT RECORDED ===");
            console.log(JSON.stringify(snapshotData, null, 2));
            
            setTimeout(() => {
                console.log("=== AFTER 5 SECONDS ===");
                console.log(`Delta Batches: ${deltaBatchesCount}`);
                console.log(`Ownership Changes: ${ownershipChanges}`);
                process.exit(0);
            }, 5000);
        }
    } else if (msg.type === 'cell_delta_batch') {
        deltaBatchesCount++;
        ownershipChanges += msg.deltas.length;
    }
});

ws.on('error', (err) => {
    console.error(err);
    process.exit(1);
});
