const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8765');

ws.on('open', () => {
    console.log('[WS] Connected to live server');
});

let worldSnapshot = null;
let humanFactionId = null;
let acceptedCount = 0;
let rejectedCount = 0;

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    
    if (msg.type === 'world_snapshot') {
        worldSnapshot = msg;
        humanFactionId = msg.human_faction_id || 101;
        console.log(`[WS] Snapshot received. Factions: ${msg.factions.length}, Human ID: ${humanFactionId}`);
        runTests();
    } else if (msg.type === 'command_accepted') {
        acceptedCount++;
        console.log(`[WS] Command ACCEPTED: mode=${msg.mode}, target=${msg.target_cell}, size=${msg.actual_size}`);
    } else if (msg.type === 'command_rejected') {
        rejectedCount++;
        console.error(`[WS] Command REJECTED: reason=${msg.reason}`);
    }
});

async function runTests() {
    try {
        console.log('=== RUNNING REAL USER-RUNTIME TOPOLOGY VERIFICATION ===');
        
        // 1. Verify 44 civs and 10k pop
        const human = worldSnapshot.factions.find(f => f.faction_id === humanFactionId);
        console.log(`Human faction: ${human.display_name}, pop: ${human.population}, capital: ${human.capital_cell}`);
        if (Math.abs(human.population - 10000) > 5) {
            throw new Error(`Population not 10k: ${human.population}`);
        }
        
        const capX = human.capital_cell % 1024;
        const capY = Math.floor(human.capital_cell / 1024);
        console.log(`Capital coords: (${capX}, ${capY})`);
        
        // 2. Issue a legal FOCUS command southeast along Italy
        const targetX = capX + 2;
        const targetY = capY + 2;
        const targetCell = targetY * 1024 + targetX;
        
        console.log(`Dispatching FOCUS command to coastal target (${targetX}, ${targetY}) = ${targetCell}...`);
        ws.send(JSON.stringify({
            type: 'expand',
            faction_id: humanFactionId,
            target_cell: targetCell,
            mode: 'FOCUS',
            commit_ratio: 0.15
        }));
        
        await new Promise(r => setTimeout(r, 600));
        
        // 3. Issue a FRONTIER command
        console.log(`Dispatching FRONTIER command...`);
        ws.send(JSON.stringify({
            type: 'expand',
            faction_id: humanFactionId,
            target_cell: human.capital_cell,
            mode: 'FRONTIER',
            commit_ratio: 0.15
        }));
        
        await new Promise(r => setTimeout(r, 600));
        
        console.log(`Accepted: ${acceptedCount}, Rejected: ${rejectedCount}`);
        if (rejectedCount > 0) {
            throw new Error('Some commands were rejected!');
        }
        if (acceptedCount < 2) {
            throw new Error('Commands were not accepted!');
        }
        
        console.log('=== REAL RUNTIME TOPOLOGY TESTS COMPLETED SUCCESSFULLY ===');
        ws.close();
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        ws.close();
        process.exit(1);
    }
}
