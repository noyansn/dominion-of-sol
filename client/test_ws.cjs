const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:8765');
ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'Dominion Commander',
        token: 'token_player_1',
        flagId: 'flag_sol'
    }));
});
ws.on('message', (data) => {
    try {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'world_snapshot') {
            console.log(`WorldSnapshot tick: ${payload.tick}`);
            console.log(`WorldSnapshot totalCells: ${payload.totalCells}`);
            console.log(`WorldSnapshot factions: ${payload.factions.length}`);
            console.log(`WorldSnapshot cells array length: ${payload.cells.length}`);
            console.log(`First 10 cell ownerships: ${payload.cells.slice(0, 10).map(c => c.ownerId).join(',')}`);
            ws.close();
        }
    } catch(e) {
        console.error(e);
    }
});
