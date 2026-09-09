import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:8765');

ws.on('open', () => {
    console.log('Connected to server, sending PlayerJoin...');
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'Probe User',
        token: 'probe_token',
        flagId: 'flag_sol'
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log(`[PROBE] Received message type: ${msg.type}`);
    
    if (msg.type === 'world_snapshot') {
        const { width, height, totalCells, factions, cells, yourFactionId, tick } = msg;
        console.log(`WorldSnapshot details:`);
        console.log(`- width: ${width}`);
        console.log(`- height: ${height}`);
        console.log(`- totalCells: ${totalCells}`);
        console.log(`- factions.length: ${factions.length}`);
        console.log(`- cells.length: ${cells.length}`);
        console.log(`- yourFactionId: ${yourFactionId}`);
        console.log(`- tick: ${tick}`);

        let totalOwned = 0;
        let humanOwned = 0;
        const uniqueOwners = new Set();
        for (let i = 0; i < cells.length; i++) {
            const owner = cells[i].ownerId;
            if (owner !== 0) {
                totalOwned++;
                uniqueOwners.add(owner);
                if (owner === yourFactionId) {
                    humanOwned++;
                }
            }
        }

        console.log(`- totalOwned: ${totalOwned}`);
        console.log(`- humanOwned: ${humanOwned}`);
        console.log(`- uniqueOwners: ${uniqueOwners.size}`);

        console.assert(width === 1024, "width should be 1024");
        console.assert(height === 512, "height should be 512");
        console.assert(totalCells === 524288, "totalCells should be 524288");
        console.assert(factions.length === 101, "factions length should be 101");
        console.assert(cells.length === 524288, "cells length should be 524288");
        console.assert(yourFactionId > 0 && yourFactionId <= 101, "yourFactionId should be in 1..101");

        if (uniqueOwners.size === 101 && humanOwned > 0 && totalOwned > 0) {
            console.log("SNAPSHOT PROBE PASSED");
            process.exit(0);
        } else {
            console.log("SNAPSHOT PROBE FAILED: Invalid initial state.");
            process.exit(1);
        }
    }
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    process.exit(1);
});

ws.on('close', () => {
    console.log('Connection closed.');
});

setTimeout(() => {
    console.log("Timeout waiting for snapshot");
    process.exit(1);
}, 5000);
