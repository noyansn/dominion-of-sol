import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { resolveTargetAtWorld, hasLegalLandConnection } from '../.test-build/TargetResolver.mjs';

console.log('================================================================');
console.log('DOMINION OF SOL: OPERATION LEGALITY & RUNTIME INVARIANT TEST');
console.log('================================================================');

// -------------------------------------------------------------
// PART 1: CLIENT TARGET RESOLVER TESTS
// -------------------------------------------------------------
console.log('\n--- PART 1: Client TargetResolver Invariants ---');

// Test 1: Diagonal corner over water must NOT connect
{
    const width = 10;
    const height = 10;
    const totalCells = width * height;
    const owners = new Uint8Array(totalCells);
    const terrains = new Uint8Array(totalCells);
    terrains.fill(2); // All water

    const a = 2 * width + 2; // (2, 2)
    const b = 3 * width + 3; // (3, 3)
    terrains[a] = 0; // Land
    terrains[b] = 0; // Land
    // Intermediate (3, 2) and (2, 3) remain WATER (2)

    const state = {
        width, height, totalCells,
        cellOwners: owners,
        cellTerrains: terrains,
        yourFactionId: 1,
        isInitialized: true,
        isConnected: true,
        ports: [],
        alliances: []
    };

    const connected = hasLegalLandConnection(state, a, b);
    assert.equal(connected, false, 'Diagonal corner over water must NOT connect!');
    console.log('  [PASS] Test 1: Diagonal corner over water rejected (no fake bridge)');
}

// Test 2: Valid diagonal land continuity connects
{
    const width = 10;
    const height = 10;
    const totalCells = width * height;
    const owners = new Uint8Array(totalCells);
    const terrains = new Uint8Array(totalCells);
    terrains.fill(2); // All water

    const a = 2 * width + 2; // (2, 2)
    const b = 3 * width + 3; // (3, 3)
    const intermediate = 2 * width + 3; // (3, 2)
    terrains[a] = 0; // Land
    terrains[b] = 0; // Land
    terrains[intermediate] = 0; // Land intermediate

    const state = {
        width, height, totalCells,
        cellOwners: owners,
        cellTerrains: terrains,
        yourFactionId: 1,
        isInitialized: true,
        isConnected: true,
        ports: [],
        alliances: []
    };

    const connected = hasLegalLandConnection(state, a, b);
    assert.equal(connected, true, 'Valid diagonal with land intermediate must connect');
    console.log('  [PASS] Test 2: Valid diagonal land continuity accepted');
}

// Test 3: Remote hostile across water (e.g. Italy to Greece)
{
    const width = 100;
    const height = 100;
    const totalCells = width * height;
    const owners = new Uint8Array(totalCells);
    const terrains = new Uint8Array(totalCells);
    terrains.fill(0); // Land base

    // Player 1 in Italy
    owners[50 * width + 20] = 1;
    owners[50 * width + 21] = 1;

    // Water channel between x=30 and x=40 (Mediterranean / Adriatic)
    for (let y = 0; y < 100; y++) {
        for (let x = 30; x <= 40; x++) {
            terrains[y * width + x] = 2; // Water
        }
    }

    // Enemy Player 2 in Greece (x=60, y=50)
    owners[50 * width + 60] = 2;
    owners[50 * width + 61] = 2;

    const state = {
        width, height, totalCells,
        cellOwners: owners,
        cellTerrains: terrains,
        yourFactionId: 1,
        isInitialized: true,
        isConnected: true,
        ports: [],
        alliances: []
    };

    const res = resolveTargetAtWorld(state, 60.5, 50.5);
    assert.equal(res.action, 'NONE', 'Hostile target across water must have action: NONE');
    assert.equal(res.sourceCell, null, 'Hostile target across water must have sourceCell: null');
    assert.match(res.rejectionReason, /local land contact/, 'Rejection reason must specify local land contact');
    console.log('  [PASS] Test 3: Italy -> Greece remote hostile across water returns action: NONE');
}

// Test 4: Local hostile border produces local offensive with front anchor
{
    const width = 20;
    const height = 20;
    const totalCells = width * height;
    const owners = new Uint8Array(totalCells);
    const terrains = new Uint8Array(totalCells);
    terrains.fill(0);

    // Player 1 at (5, 5) and (6, 5)
    owners[5 * width + 5] = 1;
    owners[5 * width + 6] = 1;

    // Enemy 2 at (7, 5) - direct shared border!
    owners[5 * width + 7] = 2;

    const state = {
        width, height, totalCells,
        cellOwners: owners,
        cellTerrains: terrains,
        yourFactionId: 1,
        isInitialized: true,
        isConnected: true,
        ports: [],
        alliances: []
    };

    const res = resolveTargetAtWorld(state, 7.5, 5.5);
    assert.equal(res.action, 'LAUNCH_OFFENSIVE', 'Adjacent hostile must be LAUNCH_OFFENSIVE');
    assert.equal(res.sourceCell, 5 * width + 6, 'Origin must be the shared border anchor');
    assert.equal(res.targetCell, 5 * width + 7, 'Target must be the local enemy cell');
    console.log('  [PASS] Test 4: Local hostile border resolves to local offensive with front anchor');
}

// -------------------------------------------------------------
// PART 2: LIVE WEBSOCKET SERVER INVARIANT TESTS
// -------------------------------------------------------------
console.log('\n--- PART 2: Live Server Runtime Invariants (ws://127.0.0.1:8765) ---');

const ws = new WebSocket('ws://127.0.0.1:8765');

ws.on('open', () => {
    console.log('  [WS] Connected to server. Joining as NOYAN (Roma)...');
    ws.send(JSON.stringify({
        type: 'player_join',
        protocolVersion: '1.0.0',
        playerName: 'NOYAN',
        token: 'test-token',
        civilizationId: 'noyan',
        lifecycleAction: 'NEW_MATCH'
    }));
});

let worldSnapshot = null;
let humanFactionId = 101;
let expandResults = [];
let attackResults = [];
let suiteDone = false;

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'world_snapshot') {
        worldSnapshot = msg;
        humanFactionId = msg.yourFactionId || 101;
        ws.send(JSON.stringify({ type: 'player_ready' }));
        if (!suiteDone) {
            runServerSuite();
        }
    } else if (msg.type === 'expand_result') {
        expandResults.push(msg);
    } else if (msg.type === 'attack_result') {
        attackResults.push(msg);
    }
});

async function runServerSuite() {
    suiteDone = true;
    try {
        await new Promise(r => setTimeout(r, 400));
        const human = worldSnapshot.factions.find(f => (f.factionId || f.faction_id) === humanFactionId);
        assert(human, 'Human faction found in snapshot');
        console.log(`  Human Faction: ${human.displayName || human.display_name}, Initial Pop: ${human.population}, Capital: ${human.capitalCell || human.capital_cell}`);
        assert.equal(worldSnapshot.factions.length, 44, 'Must have 44 civilization roster');
        assert(Math.abs(human.population - 10000) <= 5, 'Must start with 10,000 population');

        // TEST CASE A: Hostile attack from Roma to Hellen in Greece (cell 151107) across Adriatic Sea
        console.log('\n  TEST CASE A: Hostile Attack Command from Roma to Hellen in Greece (cell 151107)...');
        attackResults = [];
        const popBefore = human.population;
        ws.send(JSON.stringify({
            type: 'attack_command',
            sourceCellIndex: human.capitalCell || human.capital_cell,
            targetCellIndex: 151107, // Hellen capital in Greece
            attackType: 'LAND',
            commitPercent: 0.25
        }));

        await new Promise(r => setTimeout(r, 600));

        // Must receive attack_result with accepted: false or no_shared_front
        const attRes = attackResults[0];
        assert(attRes, 'Server must respond to attack command');
        console.log(`    Server Attack Response: accepted=${attRes.accepted}, reason="${attRes.reason}", deployedPop=${attRes.deployedPopulation}`);
        assert.equal(attRes.accepted, false, 'Hostile attack across water MUST be rejected');
        assert.equal(attRes.deployedPopulation, 0, 'Invalid attack across water MUST cost 0 population');
        console.log('  [PASS] CASE A: Server strictly rejected illegal global attack across sea with 0 population cost');

        // TEST CASE B: Legal FOCUS Expansion
        console.log('\n  TEST CASE B: Legal FOCUS Expansion from Italian border...');
        expandResults = [];
        const cap = human.capitalCell || human.capital_cell;
        const targetCell = cap + 1024 + 1; // 1 cell south, 1 cell east in Italy
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: targetCell,
            mode: 'FOCUS',
            commitPercent: 0.20
        }));

        await new Promise(r => setTimeout(r, 600));
        const focusRes = expandResults[0];
        assert(focusRes, 'Server must respond with expand_result');
        console.log(`    Server FOCUS Response: accepted=${focusRes.accepted}, actualSize=${focusRes.actualSize}, popCost=${focusRes.populationCost}`);
        assert.equal(focusRes.accepted, true, 'Legal FOCUS expansion must be accepted');
        assert(focusRes.actualSize > 0, 'FOCUS expansion must capture cells');
        assert(focusRes.populationCost > 0, 'Legal expansion permanently spends population');
        console.log('  [PASS] CASE B: Legal FOCUS expansion accepted and executed');

        // TEST CASE C: Legal FRONTIER Expansion
        console.log('\n  TEST CASE C: Legal FRONTIER Expansion...');
        expandResults = [];
        const frontierTarget = 141 * 1024 + 563; // Puglia neutral cell
        ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: frontierTarget,
            mode: 'FRONTIER',
            commitPercent: 0.20
        }));

        await new Promise(r => setTimeout(r, 600));
        const frontierRes = expandResults[0];
        assert(frontierRes, 'Server must respond with expand_result');
        console.log(`    Server FRONTIER Response: accepted=${frontierRes.accepted}, actualSize=${frontierRes.actualSize}, popCost=${frontierRes.populationCost}, reason="${frontierRes.reason}"`);
        assert.equal(frontierRes.accepted, true, 'Legal FRONTIER expansion must be accepted');
        assert(frontierRes.actualSize > 0, 'FRONTIER expansion must capture cells');
        assert(frontierRes.populationCost > 0, 'FRONTIER permanently spends population');
        console.log('  [PASS] CASE C: Legal FRONTIER expansion accepted and executed');

        console.log('\n================================================================');
        console.log('ALL RUNTIME INVARIANT TESTS PASSED CLEANLY');
        console.log('================================================================');
        ws.close();
        process.exit(0);
    } catch (err) {
        console.error('\nRUNTIME TEST FAILED:', err);
        ws.close();
        process.exit(1);
    }
}
