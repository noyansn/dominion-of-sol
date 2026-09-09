const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8765');

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'Headless Tester',
        token: 'token_tester_1',
        flagId: 'flag_sol'
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'world_snapshot' || msg.type === 'WorldSnapshot') {
        const yourId = msg.yourFactionId ?? msg.your_faction_id;
        const noyan = msg.factions.find(f => (f.factionId ?? f.id) === yourId);
        const hellen = msg.factions.find(f => (f.name || f.displayName || '').toLowerCase().includes('hellen'));
        console.log('NOYAN:', { id: noyan?.factionId, capital: noyan?.capitalCell, pop: noyan?.population });
        console.log('HELLEN:', { id: hellen?.factionId, capital: hellen?.capitalCell, pop: hellen?.population });

        const noyanCells = [];
        const hellenCells = [];
        for (let i = 0; i < msg.cells.length; i++) {
            const owner = msg.cells[i].ownerId ?? msg.cells[i].owner_id;
            if (owner === yourId) noyanCells.push(i);
            if (hellen && owner === (hellen.factionId ?? hellen.id)) hellenCells.push(i);
        }

        const noyanCoastal = [];
        const hellenCoastal = [];
        for (const cell of noyanCells) {
            const card = [cell - 1024, cell + 1, cell + 1024, cell - 1];
            const isCoast = card.some(n => n >= 0 && n < msg.cells.length && msg.cells[n].terrain === 2);
            if (isCoast) noyanCoastal.push(cell);
        }
        for (const cell of hellenCells) {
            const card = [cell - 1024, cell + 1, cell + 1024, cell - 1];
            const isCoast = card.some(n => n >= 0 && n < msg.cells.length && msg.cells[n].terrain === 2);
            if (isCoast) hellenCoastal.push(cell);
        }
        console.log('NOYAN coastal cells:', noyanCoastal);
        console.log('HELLEN coastal cells:', hellenCoastal);

        if (noyanCoastal.length > 0 && hellenCoastal.length > 0) {
            const port = noyanCoastal[0];
            const target = hellenCoastal[0];
            console.log(`Sending AmphibiousAttack port=${port} target=${target}`);
            ws.send(JSON.stringify({
                type: 'amphibious_attack',
                portCellIndex: port,
                targetCellIndex: target,
                commitPercent: 0.5
            }));
        }
    } else if (msg.type === 'attack_result' || msg.type === 'AttackResult') {
        console.log('AttackResult:', msg);
        process.exit(0);
    }
});

ws.on('error', (err) => {
    console.error(err);
    process.exit(1);
});
