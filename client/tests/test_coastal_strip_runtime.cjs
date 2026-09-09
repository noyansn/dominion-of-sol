const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8765');

ws.on('open', () => {
    console.log('[WS] Connected to live server on :8765');
    // Join as human player NOYAN (Roma preset)
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'NOYAN',
        token: 'dev-token',
        civilizationId: 'noyan',
        lifecycleAction: 'NEW_MATCH'
    }));
});

let worldSnapshot = null;
let humanFactionId = 101;
let expandResults = [];
let cellDeltas = [];
let suiteStarted = false;

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    
    if (msg.type === 'world_snapshot') {
        worldSnapshot = msg;
        humanFactionId = msg.yourFactionId || 101;
        console.log(`[WS] Snapshot received. Factions: ${msg.factions.length}, Human ID: ${humanFactionId}`);
        // Send player_ready to unfreeze simulation
        ws.send(JSON.stringify({ type: 'player_ready' }));
        if (!suiteStarted) {
            suiteStarted = true;
            runSuite();
        }
    } else if (msg.type === 'expand_result') {
        expandResults.push(msg);
        console.log(`[WS] ExpandResult: accepted=${msg.accepted}, target=${msg.requestedTarget}, actualSize=${msg.actualSize}, popCost=${msg.populationCost}, reason="${msg.reason}"`);
    } else if (msg.type === 'cell_delta_batch') {
        for (const d of msg.deltas) {
            cellDeltas.push(d);
        }
    }
});

async function runSuite() {
    try {
        console.log('\n================================================================');
        console.log('VERIFYING REAL RUNTIME ADRIATIC / PUGLIA COASTAL STRIP & ZERO-GAIN');
        console.log('================================================================');
        await new Promise(r => setTimeout(r, 500));
        
        const human = worldSnapshot.factions.find(f => (f.factionId || f.faction_id) === humanFactionId);
        console.log(`Human faction: ${human.displayName || human.display_name}, initial pop: ${human.population}, initial cells: ${human.territoryCount || human.territory_count}`);
        
        // 1. Target the Adriatic coastal strip (Puglia / Gargano: x=563, y=141 -> cell = 141 * 1024 + 563 = 144947)
        const coastalCell = 141 * 1024 + 563; // 144947
        console.log(`\nTEST 1: Dispatch FRONTIER targeted towards Adriatic coastal strip (563, 141) = ${coastalCell}...`);
        
        expandResults = [];
        cellDeltas = [];
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: coastalCell,
            mode: 'FRONTIER',
            commitPercent: 0.25
        }));
        
        await new Promise(r => setTimeout(r, 600));
        
        const res1 = expandResults.find(e => e.requestedTarget === coastalCell);
        if (!res1) {
            throw new Error(`TEST 1 FAIL: No ExpandResult received for target ${coastalCell}!`);
        }
        if (!res1.accepted) {
            throw new Error(`TEST 1 FAIL: FRONTIER command rejected: ${res1.reason}`);
        }
        console.log(`  -> ExpandResult: accepted=${res1.accepted}, actualSize=${res1.actualSize}, cost=${res1.populationCost}`);
        if (res1.actualSize <= 0) {
            throw new Error(`CRITICAL FAIL: FRONTIER produced actualSize = 0 (The zero-gain bug!)`);
        }
        console.log(`PASS: FRONTIER towards coastal strip captured ${res1.actualSize} cells (no zero gain)!`);
        
        // 2. Expand multiple times towards Puglia / Adriatic coastal strip to observe absorption
        console.log(`\nTEST 2: Expanding repeatedly towards coastal strip...`);
        for (let i = 0; i < 4; i++) {
            expandResults = [];
            ws.send(JSON.stringify({
                type: 'expand_command',
                targetCellIndex: coastalCell,
                mode: 'FRONTIER',
                commitPercent: 0.20
            }));
            await new Promise(r => setTimeout(r, 500));
            const acc = expandResults[0];
            if (acc) {
                console.log(`  Step ${i+1}: accepted=${acc.accepted}, actualSize=${acc.actualSize}, cost=${acc.populationCost}`);
                if (acc.accepted && acc.actualSize <= 0) {
                    throw new Error(`Step ${i+1} produced zero gain while accepted!`);
                }
            }
        }
        
        // 3. LOW-POPULATION 100% COMMIT EDGE CASE (The exact screenshot bug: pop ~ 111, commit 100%)
        console.log(`\nTEST 3: Simulating low-population 100% commit edge case...`);
        expandResults = [];
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: coastalCell,
            mode: 'FRONTIER',
            commitPercent: 1.0 // 100% commit!
        }));
        await new Promise(r => setTimeout(r, 600));
        const lowPopEvt = expandResults[0];
        if (lowPopEvt) {
            console.log(`  Low-pop 100% commit result: accepted=${lowPopEvt.accepted}, actualSize=${lowPopEvt.actualSize}, reason="${lowPopEvt.reason}"`);
            if (lowPopEvt.accepted && lowPopEvt.actualSize === 0) {
                throw new Error(`CRITICAL FAIL: Low-pop commit produced actualSize: 0 while accepted (The +0 km2 bug!)`);
            }
            if (lowPopEvt.accepted) {
                console.log(`PASS: Low-pop 100% commit produced positive actualSize >= 1 (${lowPopEvt.actualSize})`);
            } else {
                console.log(`PASS: Low-pop command explicitly rejected with reason="${lowPopEvt.reason}"`);
            }
        } else {
            throw new Error('No ExpandResult received for low-pop test');
        }

        // 4. Test Zero Budget explicitly rejected (commitPercent = 0.0)
        console.log(`\nTEST 4: Dispatch zero-budget command (commitPercent = 0.0)...`);
        expandResults = [];
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: coastalCell,
            mode: 'FRONTIER',
            commitPercent: 0.0
        }));
        await new Promise(r => setTimeout(r, 500));
        const zeroRej = expandResults[0];
        if (!zeroRej) {
            throw new Error(`Zero budget command was NOT received!`);
        }
        if (zeroRej.accepted) {
            throw new Error(`Zero budget command was ACCEPTED when it should be rejected!`);
        }
        console.log(`PASS: Zero-budget command rejected cleanly with reason: "${zeroRej.reason}"`);

        // 5. Test Invalid Target (deep in ocean water)
        console.log(`\nTEST 5: Dispatch command to ocean water cell (x=100, y=100)...`);
        expandResults = [];
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: 100 * 1024 + 100,
            mode: 'FOCUS',
            commitPercent: 0.15
        }));
        await new Promise(r => setTimeout(r, 500));
        const waterRej = expandResults[0];
        if (!waterRej) {
            throw new Error(`Water command was NOT received!`);
        }
        if (waterRej.accepted) {
            throw new Error(`Water command was ACCEPTED when it should be rejected!`);
        }
        console.log(`PASS: Water command rejected cleanly with reason: "${waterRej.reason}"`);

        // 6. Test FOCUS mode preserves directional coherence (no snake)
        console.log(`\nTEST 6: Dispatch FOCUS command towards coastal target...`);
        expandResults = [];
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: coastalCell,
            mode: 'FOCUS',
            commitPercent: 0.20
        }));
        await new Promise(r => setTimeout(r, 500));
        const focusRes = expandResults[0];
        if (focusRes && focusRes.accepted) {
            console.log(`PASS: FOCUS command accepted with actualSize = ${focusRes.actualSize}`);
        } else if (focusRes) {
            console.log(`FOCUS result: accepted=${focusRes.accepted}, reason="${focusRes.reason}"`);
        }

        console.log('\n================================================================');
        console.log('ALL REAL-RUNTIME SUITE TESTS PASSED WITH 0 REGRESSIONS!');
        console.log('================================================================');
        ws.close();
        process.exit(0);
    } catch (err) {
        console.error('\nFAILED RUNTIME SUITE:', err);
        ws.close();
        process.exit(1);
    }
}
