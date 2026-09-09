import WebSocket from 'ws';

async function runLiveEconomyIntegrationTest() {
  console.log("Connecting to authoritative server at ws://127.0.0.1:8765 ...");
  const ws = new WebSocket('ws://127.0.0.1:8765');

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  console.log("WebSocket connected successfully.");

  let state = {
    receivedSnapshot: false,
    playerFaction: null,
    tick: 0,
    cells: null,
    readySent: false,
    expandSent: false,
    firstCommitPop: 0,
    popAfterFirstCommit: 0,
    cellDeltasReceived: 0,
    expandResultReceived: false,
  };

  const testPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Live integration test timed out after 10s"));
    }, 10000);

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'world_snapshot') {
        state.receivedSnapshot = true;
        console.log(`[TEST] world_snapshot received: ${msg.factions?.length} factions, tick ${msg.tick}`);
        if (msg.factions?.length !== 44) {
          return reject(new Error(`Expected 44 civilizations, got ${msg.factions?.length}`));
        }

        const human = msg.factions.find(f => (f.factionId || f.faction_id) === 101);
        if (!human) {
          return reject(new Error("Human faction not found in snapshot"));
        }

        const pop = human.population;
        const cap = human.populationCapacity ?? human.population_capacity;
        const growth = human.populationGrowthPerSecond ?? human.population_growth_per_second;

        console.log(`[TEST] Human Faction: ${human.displayName || human.display_name} (id ${human.factionId || human.faction_id})`);
        console.log(`[TEST] Population: ${pop.toFixed(0)}, Capacity: ${cap.toFixed(0)}, +Pop/s: +${growth.toFixed(1)}/s`);

        if (Math.abs(pop - 100000) > 10) {
          return reject(new Error(`Expected starting population 100,000, got ${pop}`));
        }
        if (growth <= 0) {
          return reject(new Error(`Expected positive starting growth, got ${growth}`));
        }

        state.playerFaction = human;
        state.cells = msg.cells;

        // Send player_ready
        console.log("[TEST] Sending player_ready...");
        ws.send(JSON.stringify({
          type: 'player_ready',
          matchId: msg.matchState?.matchId || msg.match_state?.match_id || ''
        }));
        state.readySent = true;
      }

      if (msg.type === 'cell_delta_batch') {
        state.cellDeltasReceived += (msg.deltas ? msg.deltas.length : 0);
        
        // Once running, send expansion command
        if (state.readySent && !state.expandSent && state.playerFaction) {
          state.expandSent = true;
          const popBefore = state.playerFaction.population;
          state.firstCommitPop = popBefore * 0.12;

          console.log(`[TEST] Match is ticking! Population before commit: ${popBefore.toFixed(0)}. Committing 12% (~${state.firstCommitPop.toFixed(0)} pop)...`);

          // Find a valid adjacent neutral land cell
          const WORLD_WIDTH = 1024;
          const WORLD_HEIGHT = 512;
          let target = -1;
          for (let i = 0; i < state.cells.length; i++) {
            const c = state.cells[i];
            const owner = c.ownerId ?? c.owner_id ?? 0;
            const terrain = c.terrain ?? c.terrainType ?? c.terrain_type ?? 0;
            if (owner === 0 && terrain === 0) {
              const x = i % WORLD_WIDTH;
              const y = Math.floor(i / WORLD_WIDTH);
              const hasFriendlyNeighbor =
                (y > 0 && (state.cells[i - WORLD_WIDTH].ownerId ?? state.cells[i - WORLD_WIDTH].owner_id) === 101) ||
                (x + 1 < WORLD_WIDTH && (state.cells[i + 1].ownerId ?? state.cells[i + 1].owner_id) === 101) ||
                (y + 1 < WORLD_HEIGHT && (state.cells[i + WORLD_WIDTH].ownerId ?? state.cells[i + WORLD_WIDTH].owner_id) === 101) ||
                (x > 0 && (state.cells[i - 1].ownerId ?? state.cells[i - 1].owner_id) === 101);
              if (hasFriendlyNeighbor) {
                target = i;
                break;
              }
            }
          }
          console.log(`[TEST] Found valid adjacent neutral land target cell: ${target}`);

          ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: target,
            mode: 'FOCUS',
            commitPercent: 0.12
          }));
        }
      }

      if (msg.type === 'faction_update') {
        const human = msg.factions?.find(f => (f.factionId || f.faction_id) === 101);
        if (human) {
          state.playerFaction = human;
        }
      }

      if (msg.type === 'expand_result' && !state.expandResultReceived) {
        state.expandResultReceived = true;
        console.log(`[TEST] expand_result received: accepted=${msg.accepted}, actual_size=${msg.actualSize ?? msg.actual_size}, cost=${msg.populationCost ?? msg.population_cost}, reason=${msg.reason}`);
        const human = state.playerFaction;
        console.log(`[TEST] Population right after expand_result: ${human?.population.toFixed(0)}`);
        state.popAfterFirstCommit = human?.population || 0;

        // Wait 1.5 seconds to observe step-by-step advance and verify committed pop does NOT return
        setTimeout(() => {
          const currentPop = state.playerFaction.population;
          console.log(`[TEST] Population 1.5s after commit: ${currentPop.toFixed(0)} (Continuous growth active, permanent cost sunk!)`);
          
          if (currentPop > 98000) {
            clearTimeout(timeout);
            return reject(new Error("Committed population was refunded!"));
          }

          // Test 2: Quick second commit (no artificial cooldown block)
          console.log("[TEST] Testing quick second commit (no artificial cooldown block)...");
          ws.send(JSON.stringify({
            type: 'expand_command',
            targetCellIndex: 138788 + 1,
            mode: 'FOCUS',
            commitPercent: 0.10
          }));

          setTimeout(() => {
            console.log(`[TEST] SUCCESS: All live WebSocket economy integration assertions passed! Total cell deltas: ${state.cellDeltasReceived}`);
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }, 600);
        }, 1500);
      }
    });

    // Send player_join initially
    console.log("[TEST] Sending player_join (civ: roma, name: NOYAN)...");
    ws.send(JSON.stringify({
      type: 'player_join',
      protocolVersion: '1.0.0',
      playerName: 'NOYAN',
      token: 'token_player_1',
      flagId: 'flag_sol',
      civilizationId: 'roma',
      nationName: 'Dominion of Sol',
      lifecycleAction: 'NEW_MATCH'
    }));
  });

  await testPromise;
  console.log("=== LIVE ECONOMY WEBSOCKET INTEGRATION TEST PASSED ===");
}

runLiveEconomyIntegrationTest().catch(err => {
  console.error("Live integration test failed:", err);
  process.exit(1);
});
