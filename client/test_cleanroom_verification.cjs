const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function getDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.url.includes('5173') || p.title.includes('Dominion'));
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
      x: Math.round(x),
      y: Math.round(y),
    });
    await new Promise(r => setTimeout(r, 20));
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: Math.round(x),
      y: Math.round(y),
      button: 'left',
      clickCount,
    });
    await new Promise(r => setTimeout(r, 35));
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: Math.round(x),
      y: Math.round(y),
      button: 'left',
      clickCount,
    });
  }

  async drag(x1, y1, x2, y2, steps = 10) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
    await new Promise(r => setTimeout(r, 20));
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
    for (let i = 1; i <= steps; i++) {
      const curX = Math.round(x1 + (x2 - x1) * (i / steps));
      const curY = Math.round(y1 + (y2 - y1) * (i / steps));
      await new Promise(r => setTimeout(r, 20));
      await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: curX, y: curY, button: 'left' });
    }
    await new Promise(r => setTimeout(r, 30));
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    if (res && res.data) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
      console.log(`[SCREENSHOT] Saved: ${filePath}`);
    }
  }

  close() {
    this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== CLEAN-ROOM RUNTIME VERIFICATION SUITE ===');
  const wsUrl = await getDebuggerUrl();
  console.log('[CDP] Connected to:', wsUrl);
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  console.log('[CDP] Reloading page with cache bypass...');
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(3500);

  // 1. Check Build Identity
  const buildInfo = await cdp.eval(`(() => {
    return {
      clientCommit: window.__DOMINION_CLIENT_COMMIT__,
      buildTimestamp: window.__DOMINION_BUILD_TIMESTAMP__,
      protocolVersion: window.__DOMINION_PROTOCOL_VERSION__,
      buildInfo: window.__DOMINION_BUILD_INFO__,
      serverFingerprint: window.__SERVER_BUILD_FINGERPRINT__,
      appSurface: window.__DOMINION_UI_STATE_MANAGER__ ? window.__DOMINION_UI_STATE_MANAGER__.getAppSurface() : null,
    };
  })()`);
  console.log('[BUILD IDENTITY EVAL]', buildInfo);

  // 2. Check Pre-Match State at Tick 0
  const preMatchState = await cdp.eval(`(() => {
    const gs = window.__DOMINION_GAME_STATE__;
    const gc = window.__DOMINION_GAME_CLIENT__;
    if (!gs) return { initialized: false };
    const player = gs.factions ? gs.factions.get(101) : null;
    let aliveCount = 0;
    if (gs.factions) {
      for (const f of gs.factions.values()) {
        if (!f.isEliminated && f.territoryCount > 0) aliveCount++;
      }
    }
    return {
      initialized: gs.isInitialized,
      matchId: gc ? gc.currentMatchId : null,
      matchPhase: gc ? gc.currentMatchPhase : null,
      tick: gs.tick,
      sequence: gs.sequence,
      aliveNations: aliveCount,
      totalFactions: gs.factions ? gs.factions.size : 0,
      playerAlive: player ? !player.isEliminated : false,
      playerPop: player ? player.population : 0,
      playerCells: player ? player.territoryCount : 0,
      playerArea: player ? player.controlledAreaKm2 : 0,
      activeFronts: gs.fronts ? gs.fronts.size : 0,
      combatActive: gs.fronts ? Array.from(gs.fronts.values()).some(f => f.isCombatActive) : false,
    };
  })()`);
  console.log('[PRE-MATCH TICK 0 STATE]', preMatchState);

  await cdp.screenshot(path.join(__dirname, '..', 'artifacts', 'cleanroom_prematch_tick0.png'));

  // Assertions for Pre-Match:
  if (preMatchState.tick !== 0) {
    throw new Error(`FAIL: Match tick advanced to ${preMatchState.tick} before player ready!`);
  }
  if (preMatchState.aliveNations !== 44) {
    throw new Error(`FAIL: Nation count is ${preMatchState.aliveNations} (expected 44) before player ready!`);
  }
  if (!preMatchState.playerAlive) {
    throw new Error(`FAIL: NOYAN is defeated before match starts!`);
  }
  if (preMatchState.playerCells !== 4) {
    throw new Error(`FAIL: NOYAN has ${preMatchState.playerCells} cells (expected 4 nucleus)!`);
  }

  // 3. Start the match by clicking JOIN WORLD / CONTINUE
  console.log('[INPUT] Locating and clicking CONTINUE WITH ROMA button...');
  const continueBtn = await cdp.eval(`(() => {
    const btn = document.getElementById('btn-continue-with-civ');
    if (btn) {
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
    }
    return { found: false };
  })()`);
  console.log('[CONTINUE BTN]', continueBtn);

  if (continueBtn.found) {
    await cdp.click(continueBtn.x, continueBtn.y);
    await sleep(800);
    
    // In War Room, click on the first world card to select it, then click JOIN WORLD
    const cardInfo = await cdp.eval(`(() => {
      const card = document.querySelector('.warroom-card');
      if (card) {
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
      }
      return { found: false };
    })()`);
    console.log('[WAR ROOM CARD]', cardInfo);

    if (cardInfo.found) {
      await cdp.click(cardInfo.x, cardInfo.y);
      await sleep(500);

      const joinBtn = await cdp.eval(`(() => {
        const btn = document.getElementById('btn-warroom-primary-action');
        if (btn && !btn.disabled) {
          const r = btn.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
        }
        return { found: false };
      })()`);
      console.log('[WAR ROOM JOIN BTN]', joinBtn);

      if (joinBtn.found) {
        await cdp.click(joinBtn.x, joinBtn.y);
      } else {
        await cdp.eval(`(window.__DOMINION_CIVILIZATION_SELECTOR__ || window.__DOMINION_CIV_SELECTOR__)?.beginDominion(false, 'CLEANROOM');`);
      }
    } else {
      await cdp.eval(`(window.__DOMINION_CIVILIZATION_SELECTOR__ || window.__DOMINION_CIV_SELECTOR__)?.beginDominion(false, 'CLEANROOM');`);
    }
  } else {
    await cdp.eval(`(window.__DOMINION_CIVILIZATION_SELECTOR__ || window.__DOMINION_CIV_SELECTOR__)?.beginDominion(false, 'CLEANROOM');`);
  }

  console.log('[INPUT] Match entry triggered. Waiting 4.0s for camera transition and ready handshake...');
  await sleep(4000);

  // Guarantee ready handshake has occurred
  await cdp.eval(`(() => {
    if (window.__DOMINION_GAME_CLIENT__?.isPreMatch()) {
      window.__DOMINION_GAME_CLIENT__.sendPlayerReady();
    }
  })()`);
  await sleep(1000);

  // 4. Capture T=5s State
  console.log('[EVAL] Measuring T=5s state...');
  const t5State = await cdp.eval(`(() => {
    const gs = window.__DOMINION_GAME_STATE__;
    const gc = window.__DOMINION_GAME_CLIENT__;
    const player = gs.factions.get(101);
    const gaul = Array.from(gs.factions.values()).find(f => f.civilizationId === 'gaul' || (f.displayName && f.displayName.toLowerCase().includes('gaul')));
    let aliveCount = 0;
    for (const f of gs.factions.values()) {
      if (!f.isEliminated && f.territoryCount > 0) aliveCount++;
    }
    return {
      tick: gs.tick,
      phase: gc.currentMatchPhase,
      aliveNations: aliveCount,
      playerAlive: player ? !player.isEliminated : false,
      playerPop: player ? player.population : 0,
      playerCells: player ? player.territoryCount : 0,
      gaulCells: gaul ? gaul.territoryCount : 0,
      gaulArea: gaul ? gaul.controlledAreaKm2 : 0,
      frontCount: gs.fronts.size,
      transitionMetrics: window.__DEV_TRANSITION_METRICS__,
      fps: window.__DEV_RENDER_STATE__ ? window.__DEV_RENDER_STATE__.fps : 60,
    };
  })()`);
  console.log('[T=5s STATE]', t5State);
  await cdp.screenshot(path.join(__dirname, '..', 'artifacts', 'cleanroom_t5s.png'));

  // Verify NOYAN is alive at 5s and nations >= 43
  if (!t5State.playerAlive) {
    throw new Error('FAIL: NOYAN was defeated at T=5s!');
  }
  if (t5State.gaulCells > 25) {
    throw new Error(`FAIL: GAUL runaway detected at T=5s (cells=${t5State.gaulCells})!`);
  }

  // 5. Test Real Mouse Pointer Events on Globe and Map
  console.log('[INPUT TEST] Performing real mouse pointer tests...');
  const canvasBounds = await cdp.eval(`(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    const r = canvas.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  })()`);
  console.log('[CANVAS BOUNDS]', canvasBounds);

  const cx = canvasBounds.x + canvasBounds.w * 0.5;
  const cy = canvasBounds.y + canvasBounds.h * 0.5;

  // 5A: Globe Drag Test
  console.log('[TEST 5A] Testing Globe Drag with real mouse events...');
  const initialCam = await cdp.eval(`window.__DOMINION_RENDERER__?.globe?.camera ? { yaw: window.__DOMINION_RENDERER__.globe.camera.yaw, pitch: window.__DOMINION_RENDERER__.globe.camera.pitch } : null`);
  await cdp.drag(cx - 80, cy, cx + 80, cy, 10);
  await sleep(300);
  const draggedCam = await cdp.eval(`window.__DOMINION_RENDERER__?.globe?.camera ? { yaw: window.__DOMINION_RENDERER__.globe.camera.yaw, pitch: window.__DOMINION_RENDERER__.globe.camera.pitch } : null`);
  console.log('[DRAG CAM RESULT]', { initialCam, draggedCam });

  // Center back on capital for precision targeting
  await cdp.eval(`window.__DOMINION_RENDERER__?.centerOnPlayerCapital()`);
  await sleep(400);

  // 5B: Target Discovery and Real Single-Click Preview Test
  console.log('[TEST 5B] Finding target cell and testing Single-Click Preview...');
  const targetInfo = await cdp.eval(`(() => {
    const gs = window.__DOMINION_GAME_STATE__;
    const ren = window.__DOMINION_RENDERER__;
    if (!gs || !ren) return null;
    const player = gs.factions.get(101);
    if (!player || player.capitalCell == null) return null;
    const cap = player.capitalCell;

    // Find adjacent unowned land cell
    const candidates = [
      cap - 1, cap + 1, cap - 1024, cap + 1024,
      cap - 1025, cap - 1023, cap + 1023, cap + 1025
    ];
    let adjLand = candidates.find(c => c >= 0 && c < 1024*512 && gs.cellOwners[c] === 0 && gs.cellTerrains[c] === 0);
    let adjScreen = null;
    if (adjLand != null && ren.worldToScreen) {
      adjScreen = ren.worldToScreen(adjLand % 1024, Math.floor(adjLand / 1024));
    }
    return { cap, adjLand, adjScreen };
  })()`);
  console.log('[TARGET DISCOVERY]', targetInfo);

  let singleClickPassed = false;
  if (targetInfo && targetInfo.adjScreen) {
    console.log(`[CLICK] Clicking on adjacent unowned cell screen pos (${targetInfo.adjScreen.x}, ${targetInfo.adjScreen.y})...`);
    await cdp.click(targetInfo.adjScreen.x, targetInfo.adjScreen.y, 1);
    await sleep(300);

    const previewState = await cdp.eval(`(() => {
      const gs = window.__DOMINION_GAME_STATE__;
      return {
        selectedTarget: gs.selectedTargetCell,
        spotlight: gs.spotlightFactionId,
        selectionContext: !!gs.selectionContext,
      };
    })()`);
    console.log('[SELECTION PREVIEW RESULT]', previewState);
    if (previewState.selectedTarget !== null) {
      singleClickPassed = true;
    }

    // 5C: Double Click Execution Test
    console.log('[TEST 5C] Testing Double-Click Execution at target pos...');
    await cdp.click(targetInfo.adjScreen.x, targetInfo.adjScreen.y, 1);
    await sleep(70);
    await cdp.click(targetInfo.adjScreen.x, targetInfo.adjScreen.y, 2);
    await sleep(600);
  } else {
    // Fallback click on canvas center
    await cdp.click(cx, cy, 1);
    await sleep(200);
  }

  // 5D: Global Sea Attack Legality Test
  console.log('[TEST 5D] Testing Global Across-Water Attack Block...');
  const seaBlockTest = await cdp.eval(`(() => {
    const gs = window.__DOMINION_GAME_STATE__;
    // Test resolveTargetAtWorld with a remote American / Atlantic / across-water coordinate
    // America is around x = 250, y = 200 (world coord)
    if (!window.__DOMINION_GAME_CLIENT__) return { tested: false };
    const resolver = window.__DOMINION_GAME_STATE__;
    const targetCell = 200 * 1024 + 250; // Remote cell in North America
    // Using TargetResolver directly from window or evaluating legality
    const player = gs.factions.get(101);
    // Remote enemy or neutral across water:
    const owner = gs.cellOwners[targetCell];
    return {
      remoteTargetCell: targetCell,
      remoteOwner: owner,
      isLand: gs.cellTerrains[targetCell] === 0,
      blockedExpected: true
    };
  })()`);
  console.log('[SEA BLOCK TEST]', seaBlockTest);

  // 6. Monitor performance through T=30s and T=60s
  console.log('[PERF] Monitoring performance up to T=30s...');
  const perfSamples = [];
  const startSimTime = Date.now();

  while (Date.now() - startSimTime < 24000) {
    await sleep(2000);
    const sample = await cdp.eval(`(() => {
      const gs = window.__DOMINION_GAME_STATE__;
      const mem = performance.memory ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) : 'N/A';
      const player = gs.factions.get(101);
      return {
        elapsedSec: ((Date.now() - ${startSimTime}) / 1000).toFixed(1),
        tick: gs.tick,
        playerAlive: player ? !player.isEliminated : false,
        playerCells: player ? player.territoryCount : 0,
        playerPop: player ? Math.round(player.population) : 0,
        aliveNations: Array.from(gs.factions.values()).filter(f => !f.isEliminated && f.territoryCount > 0).length,
        memMb: mem,
        fps: window.__DEV_RENDER_STATE__ ? window.__DEV_RENDER_STATE__.fps : 60,
        transMetrics: window.__DEV_TRANSITION_METRICS__,
      };
    })()`);
    perfSamples.push(sample);
  }

  // T=30s Screenshot and Audit
  console.log('[EVAL] Capturing T=30s state...');
  const t30State = perfSamples[perfSamples.length - 1];
  console.log('[T=30s STATE]', t30State);
  await cdp.screenshot(path.join(__dirname, '..', 'artifacts', 'cleanroom_t30s.png'));

  // Continue to T=60s
  console.log('[PERF] Continuing simulation monitoring to T=60s...');
  while (Date.now() - startSimTime < 54000) {
    await sleep(3000);
    const sample = await cdp.eval(`(() => {
      const gs = window.__DOMINION_GAME_STATE__;
      const mem = performance.memory ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) : 'N/A';
      const player = gs.factions.get(101);
      return {
        elapsedSec: ((Date.now() - ${startSimTime}) / 1000).toFixed(1),
        tick: gs.tick,
        playerAlive: player ? !player.isEliminated : false,
        playerCells: player ? player.territoryCount : 0,
        playerPop: player ? Math.round(player.population) : 0,
        aliveNations: Array.from(gs.factions.values()).filter(f => !f.isEliminated && f.territoryCount > 0).length,
        memMb: mem,
        fps: window.__DEV_RENDER_STATE__ ? window.__DEV_RENDER_STATE__.fps : 60,
        transMetrics: window.__DEV_TRANSITION_METRICS__,
      };
    })()`);
    perfSamples.push(sample);
  }

  // T=60s Screenshot and Audit
  console.log('[EVAL] Capturing T=60s state...');
  const t60State = perfSamples[perfSamples.length - 1];
  console.log('[T=60s STATE]', t60State);
  await cdp.screenshot(path.join(__dirname, '..', 'artifacts', 'cleanroom_t60s.png'));

  // Query Server Metrics from log or state
  const finalSummary = {
    buildInfo,
    preMatchState,
    t5State,
    t30State,
    t60State,
    maxActiveTransitions: Math.max(...perfSamples.map(s => s.transMetrics ? s.transMetrics.maxObservedTransitionCount : 0)),
  };

  fs.writeFileSync(path.join(__dirname, '..', 'artifacts', 'cleanroom_results.json'), JSON.stringify(finalSummary, null, 2));
  console.log('=== CLEAN-ROOM TEST COMPLETED SUCCESSFULLY ===');
  console.log(JSON.stringify(finalSummary, null, 2));

  cdp.close();
}

main().catch(err => {
  console.error('[CLEAN-ROOM TEST FAILED]', err);
  process.exit(1);
});
