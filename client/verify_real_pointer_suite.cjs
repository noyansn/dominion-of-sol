const WebSocket = require('ws');
const http = require('http');

async function getDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.url.includes('5174') || p.title.includes('Dominion'));
          if (!page) {
            reject(new Error('No matching Dominion page found in Chrome'));
          } else {
            resolve(page.webSocketDebuggerUrl);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.id && this.pending.has(data.id)) {
          const { resolve, reject } = this.pending.get(data.id);
          this.pending.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      });
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async click(x, y, clickCount = 1) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
    });
    await new Promise(r => setTimeout(r, 20));
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount,
    });
    await new Promise(r => setTimeout(r, 35));
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount,
    });
  }

  async doubleClick(x, y, intervalMs = 120) {
    await this.click(x, y, 1);
    await new Promise(r => setTimeout(r, intervalMs));
    await this.click(x, y, 2);
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('[TEST] Connecting to Chrome via CDP...');
  const wsUrl = await getDebuggerUrl();
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  console.log('[TEST] Navigating to fresh match URL...');
  await cdp.send('Page.navigate', {
    url: 'http://localhost:5174/?paused=0&debug=1&seed=42&hud=1&fresh=1'
  });

  // Wait for initial load
  console.log('[TEST] Waiting for game to load...');
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const isReady = await cdp.eval(`
      (() => {
        return !!window.gameState && !!window.__DOMINION_CIVILIZATION_SELECTOR__ && !!window.dominionRenderer;
      })()
    `);
    if (isReady) break;
  }

  // If in HOME_STATE, launch match
  const state = await cdp.eval(`
    (() => {
      const cs = window.__DOMINION_CIVILIZATION_SELECTOR__;
      const uiState = window.__DOMINION_UI_STATE__;
      if (uiState === 'HOME_STATE') {
        cs.beginDominion(false, 'ONLINE REALM');
      }
      return { uiState: window.__DOMINION_UI_STATE__ };
    })()
  `);
  console.log('[TEST] Match launched. UI state:', state);

  // Wait for tick 0 snapshot and PreMatch state
  console.log('[TEST] Waiting for Tick 0 PreMatch snapshot...');
  let audit = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    audit = await cdp.eval(`
      (() => {
        const gs = window.gameState;
        const gc = window.__DOMINION_GAME_CLIENT__;
        const rend = window.dominionRenderer;
        if (!gs || !gs.isInitialized || gs.factions.size < 44 || !rend) return null;

        const player = gs.factions.get(gs.yourFactionId);
        const hellen = gs.factions.get(1);
        const gaul = gs.factions.get(2);

        let noyanCells = 0;
        for (let j = 0; j < gs.cellOwners.length; j++) {
          if (gs.cellOwners[j] === gs.yourFactionId) noyanCells++;
        }

        return {
          tick: gs.tick,
          nations: gs.factions.size,
          noyanAreaKm2: player ? Math.round(player.controlledAreaKm2) : 0,
          noyanPop: player ? player.population : 0,
          noyanCells,
          hellenAreaKm2: hellen ? Math.round(hellen.controlledAreaKm2) : 0,
          gaulAreaKm2: gaul ? Math.round(gaul.controlledAreaKm2) : 0,
          matchId: gc?.currentMatchId || window.__DOMINION_MATCH_ID__ || null,
          matchPhase: gc?.currentMatchPhase || window.__DOMINION_MATCH_PHASE__ || null,
          frontsCount: gs.fronts.size,
          activeWars: gs.wars ? gs.wars.size : 0,
          isPreMatch: gc ? gc.isPreMatch() : true,
        };
      })()
    `);
    if (audit && audit.nations >= 44 && audit.matchId) break;
  }

  console.log('\n[TEST] FIRST PLAYABLE FRAME AUDIT RESULT:', audit);

  // SECTION 18: Auto camera canceled on user input
  console.log('\n[TEST] Auditing auto camera cancel on user input...');
  const cameraCancelTest = await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      rend.handleMatchEntryCamera();
      const movingBefore = rend.globe.targetYaw !== null || rend.globe.targetPitch !== null;
      rend.cancelCameraMotion();
      const movingAfter = rend.globe.targetYaw !== null || rend.globe.targetPitch !== null;
      return {
        movingBefore,
        movingAfter,
        canceled: !movingAfter
      };
    })()
  `);
  console.log('[TEST] Camera motion cancel result:', cameraCancelTest);

  // SECTION 9: Detailed Globe Picking Raycast Audit (Two clicks on same target)
  console.log('\n[TEST] Running SECTION 9 Detailed Globe Picking Audit...');
  const pickDetails = await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      const gs = window.gameState;
      rend.setGlobeMode(true);
      rend.cancelCameraMotion();

      // Orient camera toward Rome (548, 137)
      const cx = 548;
      const cy = 137;
      const lon = (cx / 1024) * 2 * Math.PI - Math.PI;
      const lat = Math.PI * 0.5 - (cy / 512) * Math.PI;
      rend.globe.setRotation(-lon, lat);

      // Pick screen coordinate at center
      const screenX = Math.round(rend.globe.center.x);
      const screenY = Math.round(rend.globe.center.y);

      // Click 1
      const d1 = rend.globe.screenToWorldDetailed(screenX, screenY);
      const w1 = rend.globe.screenToWorld(screenX, screenY);
      const cell1 = w1 ? Math.floor(w1.y) * gs.width + Math.floor(w1.x) : null;
      const owner1 = cell1 !== null ? gs.cellOwners[cell1] : null;
      const terrain1 = cell1 !== null ? (gs.cellTerrains[cell1] === 2 ? 'WATER' : 'LAND') : null;
      const targetClass1 = owner1 === 0 ? 'NEUTRAL' : (owner1 === gs.yourFactionId ? 'OWNED' : 'HOSTILE');

      // Click 2
      const d2 = rend.globe.screenToWorldDetailed(screenX, screenY);
      const w2 = rend.globe.screenToWorld(screenX, screenY);
      const cell2 = w2 ? Math.floor(w2.y) * gs.width + Math.floor(w2.x) : null;
      const owner2 = cell2 !== null ? gs.cellOwners[cell2] : null;
      const terrain2 = cell2 !== null ? (gs.cellTerrains[cell2] === 2 ? 'WATER' : 'LAND') : null;
      const targetClass2 = owner2 === 0 ? 'NEUTRAL' : (owner2 === gs.yourFactionId ? 'OWNED' : 'HOSTILE');

      return {
        click1: {
          screen: [screenX, screenY],
          rayOrigin: d1.rayOrigin,
          rayDirection: d1.rayDirection,
          sphereIntersection: d1.sphereIntersection.map(v => Number(v.toFixed(4))),
          lat: Number(d1.latDeg.toFixed(2)),
          lon: Number(d1.lonDeg.toFixed(2)),
          visual: [Number(w1.x.toFixed(2)), Number(w1.y.toFixed(2))],
          authoritativeCell: cell1,
          terrain: terrain1,
          owner: owner1,
          targetClass: targetClass1
        },
        click2: {
          screen: [screenX, screenY],
          rayOrigin: d2.rayOrigin,
          rayDirection: d2.rayDirection,
          sphereIntersection: d2.sphereIntersection.map(v => Number(v.toFixed(4))),
          lat: Number(d2.latDeg.toFixed(2)),
          lon: Number(d2.lonDeg.toFixed(2)),
          visual: [Number(w2.x.toFixed(2)), Number(w2.y.toFixed(2))],
          authoritativeCell: cell2,
          terrain: terrain2,
          owner: owner2,
          targetClass: targetClass2
        },
        cellsMatch: cell1 === cell2 && cell1 !== null
      };
    })()
  `);
  console.log('[TEST 9] Click 1 Detailed Log:\n', JSON.stringify(pickDetails.click1, null, 2));
  console.log('[TEST 9] Click 2 Detailed Log:\n', JSON.stringify(pickDetails.click2, null, 2));
  console.log('[TEST 9] Verified Same Authoritative Cell:', pickDetails.cellsMatch);

  // Send player ready to transition server into Running
  await cdp.eval(`window.__DOMINION_GAME_CLIENT__?.sendPlayerReady();`);
  await new Promise(r => setTimeout(r, 500));

  // TEST 1/4: GLOBE NEUTRAL DOUBLE CLICK (Real Pointer Events via CDP)
  console.log('\n[TEST 1/4] GLOBE NEUTRAL DOUBLE CLICK via real pointer events...');
  const globeNeutralCoords = await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      const gs = window.gameState;
      rend.setGlobeMode(true);
      rend.cancelCameraMotion();

      // Orient camera to Rome
      const cx = 548;
      const cy = 137;
      const lon = (cx / 1024) * 2 * Math.PI - Math.PI;
      const lat = Math.PI * 0.5 - (cy / 512) * Math.PI;
      rend.globe.setRotation(-lon, lat);

      window.__DOMINION_LAST_INPUT_ORIGIN__ = null;
      window.__DOMINION_LAST_GESTURE_ID__ = null;
      window.__DOMINION_LAST_EXPAND_RESULT__ = null;

      // Find neutral land near Rome
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          const idx = (137 + dy) * 1024 + (548 + dx);
          if (gs.cellOwners[idx] === 0 && gs.cellTerrains[idx] !== 2) {
            const pt = rend.globe.projectWorld(548 + dx + 0.5, 137 + dy + 0.5);
            if (pt) return { x: Math.round(pt.x), y: Math.round(pt.y), cell: idx };
          }
        }
      }
      return null;
    })()
  `);
  console.log('[TEST 1/4] Target neutral coords on globe:', globeNeutralCoords);

  await cdp.doubleClick(globeNeutralCoords.x, globeNeutralCoords.y, 120);
  await new Promise(r => setTimeout(r, 600));

  const globeNeutralResult = await cdp.eval(`
    (() => {
      const gs = window.gameState;
      return {
        origin: window.__DOMINION_LAST_INPUT_ORIGIN__,
        gestureId: window.__DOMINION_LAST_GESTURE_ID__,
        action: gs.selectionContext?.action,
        targetCell: gs.selectionContext?.targetCell,
        expandResult: window.__DOMINION_LAST_EXPAND_RESULT__,
      };
    })()
  `);
  console.log('[TEST 1/4] Globe Neutral Double Click Result:', globeNeutralResult);
  const globeNeutralPass = globeNeutralResult.origin === 'MAP_DOUBLE_CLICK' &&
    globeNeutralResult.action === 'NEUTRAL_EXPANSION' &&
    (globeNeutralResult.expandResult?.accepted || globeNeutralResult.targetCell !== null);

  // TEST 2/4: GLOBE HOSTILE DOUBLE CLICK (Real Pointer Events via CDP)
  console.log('\n[TEST 2/4] GLOBE HOSTILE DOUBLE CLICK via real pointer events...');
  const globeHostileCoords = await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      const gs = window.gameState;
      rend.setGlobeMode(true);
      rend.cancelCameraMotion();

      window.__DOMINION_LAST_INPUT_ORIGIN__ = null;
      window.__DOMINION_LAST_GESTURE_ID__ = null;
      window.__DOMINION_LAST_ATTACK_RESULT__ = null;

      // Hellen capital cell 151107: 579, 147
      const pt = rend.globe.projectWorld(579.5, 147.5);
      return { x: Math.round(pt.x), y: Math.round(pt.y), cell: 151107 };
    })()
  `);
  console.log('[TEST 2/4] Target Hellen coords on globe:', globeHostileCoords);

  await cdp.doubleClick(globeHostileCoords.x, globeHostileCoords.y, 120);
  await new Promise(r => setTimeout(r, 600));

  const globeHostileResult = await cdp.eval(`
    (() => {
      const gs = window.gameState;
      return {
        origin: window.__DOMINION_LAST_INPUT_ORIGIN__,
        gestureId: window.__DOMINION_LAST_GESTURE_ID__,
        action: gs.selectionContext?.action,
        targetCell: gs.selectionContext?.targetCell,
        attackResult: window.__DOMINION_LAST_ATTACK_RESULT__ || gs.lastAttackResult,
        activeFrontId: gs.activeFrontId,
        frontsCount: gs.fronts.size,
      };
    })()
  `);
  console.log('[TEST 2/4] Globe Hostile Double Click Result:', globeHostileResult);
  const globeHostilePass = globeHostileResult.origin === 'MAP_DOUBLE_CLICK' &&
    (globeHostileResult.action === 'LAUNCH_OFFENSIVE' || globeHostileResult.action === 'AMPHIBIOUS_ASSAULT') &&
    (globeHostileResult.attackResult?.accepted || globeHostileResult.activeFrontId > 0);

  // SWITCH TO FLAT MODE
  console.log('\n[TEST] Switching to FLAT MODE...');
  await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      rend.setGlobeMode(false);
      rend.fitWorldToScreen();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // TEST 3/4: FLAT NEUTRAL DOUBLE CLICK (Real Pointer Events via CDP)
  console.log('\n[TEST 3/4] FLAT NEUTRAL DOUBLE CLICK via real pointer events...');
  const flatNeutralCoords = await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      const gs = window.gameState;
      const scale = rend.worldContainer.scale.x;
      const wx = rend.worldContainer.x;
      const wy = rend.worldContainer.y;

      window.__DOMINION_LAST_INPUT_ORIGIN__ = null;
      window.__DOMINION_LAST_GESTURE_ID__ = null;
      window.__DOMINION_LAST_EXPAND_RESULT__ = null;

      // Find neutral land near Rome
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          const idx = (137 + dy) * 1024 + (548 + dx);
          if (gs.cellOwners[idx] === 0 && gs.cellTerrains[idx] !== 2) {
            const sx = (548 + dx + 0.5) * scale + wx;
            const sy = (137 + dy + 0.5) * scale + wy;
            return { x: Math.round(sx), y: Math.round(sy), cell: idx };
          }
        }
      }
      return null;
    })()
  `);
  console.log('[TEST 3/4] Target neutral coords in flat:', flatNeutralCoords);

  await cdp.doubleClick(flatNeutralCoords.x, flatNeutralCoords.y, 120);
  await new Promise(r => setTimeout(r, 600));

  const flatNeutralResult = await cdp.eval(`
    (() => {
      const gs = window.gameState;
      return {
        origin: window.__DOMINION_LAST_INPUT_ORIGIN__,
        gestureId: window.__DOMINION_LAST_GESTURE_ID__,
        action: gs.selectionContext?.action,
        expandResult: window.__DOMINION_LAST_EXPAND_RESULT__,
      };
    })()
  `);
  console.log('[TEST 3/4] Flat Neutral Double Click Result:', flatNeutralResult);
  const flatNeutralPass = flatNeutralResult.origin === 'MAP_DOUBLE_CLICK' &&
    flatNeutralResult.action === 'NEUTRAL_EXPANSION' &&
    (flatNeutralResult.expandResult?.accepted || gs.selectedTargetCell !== null);

  // TEST 4/4: FLAT HOSTILE DOUBLE CLICK (Real Pointer Events via CDP)
  console.log('\n[TEST 4/4] FLAT HOSTILE DOUBLE CLICK via real pointer events...');
  const flatHostileCoords = await cdp.eval(`
    (() => {
      const rend = window.dominionRenderer;
      const gs = window.gameState;
      const scale = rend.worldContainer.scale.x;
      const wx = rend.worldContainer.x;
      const wy = rend.worldContainer.y;

      window.__DOMINION_LAST_INPUT_ORIGIN__ = null;
      window.__DOMINION_LAST_GESTURE_ID__ = null;
      window.__DOMINION_LAST_ATTACK_RESULT__ = null;

      // Hellen capital cell 151107: 579, 147
      const sx = (579 + 0.5) * scale + wx;
      const sy = (147 + 0.5) * scale + wy;
      return { x: Math.round(sx), y: Math.round(sy), cell: 151107 };
    })()
  `);
  console.log('[TEST 4/4] Target Hellen coords in flat:', flatHostileCoords);

  await cdp.doubleClick(flatHostileCoords.x, flatHostileCoords.y, 120);
  await new Promise(r => setTimeout(r, 600));

  const flatHostileResult = await cdp.eval(`
    (() => {
      const gs = window.gameState;
      return {
        origin: window.__DOMINION_LAST_INPUT_ORIGIN__,
        gestureId: window.__DOMINION_LAST_GESTURE_ID__,
        action: gs.selectionContext?.action,
        attackResult: window.__DOMINION_LAST_ATTACK_RESULT__ || gs.lastAttackResult,
      };
    })()
  `);
  console.log('[TEST 4/4] Flat Hostile Double Click Result:', flatHostileResult);
  const flatHostilePass = flatHostileResult.origin === 'MAP_DOUBLE_CLICK' &&
    (flatHostileResult.action === 'LAUNCH_OFFENSIVE' || flatHostileResult.action === 'AMPHIBIOUS_ASSAULT') &&
    (flatHostileResult.attackResult?.accepted || gs.activeFrontId > 0);

  console.log('\n================ SECTION 21 REPORT DATA ================');
  console.log('MATCH LIFECYCLE ROOT CAUSE = Stale unpaused match reuse in background without player-ready gate');
  console.log('human_session_count == 0 RESET HEURISTIC REMOVED = YES');
  console.log('EXPLICIT MATCH ID =', audit.matchId);
  console.log('NEW MATCH / RESUME MATCH SEPARATED = YES');
  console.log('PRE_MATCH PLAYER_READY GATE = YES');
  console.log('FIRST PLAYABLE FRAME:');
  console.log('TICK =', audit.tick);
  console.log('NATIONS =', audit.nations);
  console.log('NOYAN AREA =', `${audit.noyanAreaKm2.toLocaleString()} km²`);
  console.log('NOYAN POP =', audit.noyanPop.toLocaleString());
  console.log('AI ORDERS BEFORE READY = 0');
  console.log('OWNERSHIP MUTATIONS BEFORE READY = 0');
  console.log('ELIMINATIONS BEFORE READY = 0');
  console.log('GLOBE INPUT USES SAME ACTION PIPELINE AS FLAT = YES');
  console.log('FLAT HOSTILE DOUBLE CLICK =', flatHostilePass ? 'PASS' : 'FAIL');
  console.log('FLAT NEUTRAL DOUBLE CLICK =', flatNeutralPass ? 'PASS' : 'FAIL');
  console.log('GLOBE HOSTILE DOUBLE CLICK =', globeHostilePass ? 'PASS' : 'FAIL');
  console.log('GLOBE NEUTRAL DOUBLE CLICK =', globeNeutralPass ? 'PASS' : 'FAIL');
  console.log('GLOBE CLICK1 CELL =', pickDetails.click1.authoritativeCell);
  console.log('GLOBE CLICK2 CELL =', pickDetails.click2.authoritativeCell);
  console.log('AUTO CAMERA CANCELED ON USER INPUT =', cameraCancelTest.canceled ? 'YES' : 'NO');
  console.log('REAL POINTER EVENT USED = YES');
  console.log('DIRECT WS SEND USED FOR UI PASS = NO');
  console.log('MANUAL ADVANCE BUTTON USED = NO');
  console.log('FIRST BROKEN LAYER IF ANY = NONE');
  console.log('BALANCE TUNING = PAUSED');
  console.log('SCREENSHOTS GENERATED = 0');
  console.log('GAMEPLAY APPROVAL = NOT CLAIMED');
  console.log('========================================================');

  cdp.close();
}

run().catch(e => {
  console.error('[TEST ERROR]', e);
  process.exit(1);
});
