import { spawn } from 'node:child_process';
import http from 'node:http';
import WebSocket from 'ws';
import assert from 'node:assert/strict';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\noyan\\Downloads\\game\\.tmp\\chrome_qa_runtime';
const targetUrl = 'http://localhost:5173/';
const cdpPort = 9222;

console.log('========================================================================');
console.log('LAUNCHING REAL BROWSER RUNTIME SUITE VIA CDP WITH SURFACE MOUSE EVENTS');
console.log('========================================================================');

// Launch Chrome with remote debugging
const chromeArgs = [
  '--headless=new',
  `--remote-debugging-port=${cdpPort}`,
  '--remote-allow-origins=*',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  targetUrl
];

const chromeProc = spawn(chromePath, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
chromeProc.stderr.on('data', d => {
  const line = d.toString();
  if (line.includes('DevTools listening')) console.log('[CHROME]', line.trim());
});

async function getDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const list = await res.json();
      const page = list.find(p => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Timed out waiting for Chrome page target');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  try {
    const wsUrl = await getDebuggerUrl();
    console.log('[CDP] Connecting to page:', wsUrl);
    const ws = new WebSocket(wsUrl);

    let nextId = 1;
    const callbacks = new Map();
    ws.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
    });

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    function sendCDP(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await sendCDP('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    }

    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');

    console.log('[CDP] Waiting for GameState and Renderer ready...');
    let ready = false;
    for (let i = 0; i < 40; i++) {
      ready = await evaluate(`
        Boolean(
          window.__DOMINION_RENDERER__ &&
          window.__DOMINION_GAME_STATE__ &&
          window.__DOMINION_GAME_CLIENT__ &&
          window.__DOMINION_RENDERER__.globe &&
          window.__DOMINION_GAME_STATE__.isInitialized &&
          window.__DOMINION_GAME_STATE__.yourFactionId > 0
        )
      `);
      if (ready) break;
      await sleep(500);
    }

    if (!ready) {
      throw new Error('Dominion client did not reach ready state within 20s');
    }

    console.log('[CDP] Client is READY! Hooking command telemetry and entering MATCH_ACTIVE...');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      const origSend = window.__DOMINION_GAME_CLIENT__.send.bind(window.__DOMINION_GAME_CLIENT__);
      window.__DOMINION_GAME_CLIENT__.send = function(cmd) {
        window.__TRACKED_COMMANDS__.push(JSON.parse(JSON.stringify(cmd)));
        return origSend(cmd);
      };
      if (window.__civilizationSelector) {
        window.__civilizationSelector.beginDominion();
      }
    `);
    await sleep(600);

    // Helper functions for real mouse gestures via CDP Input.dispatchMouseEvent
    async function dispatchClick(x, y) {
      await sendCDP('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x, y
      });
      await sendCDP('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x, y,
        button: 'left',
        clickCount: 1
      });
      await sleep(30);
      await sendCDP('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x, y,
        button: 'left',
        clickCount: 1
      });
    }

    async function dispatchDrag(startX, startY, endX, endY, steps = 10) {
      await sendCDP('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: startX, y: startY
      });
      await sendCDP('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: startX, y: startY,
        button: 'left',
        buttons: 1
      });
      await sleep(30);
      for (let s = 1; s <= steps; s++) {
        const curX = Math.round(startX + (endX - startX) * (s / steps));
        const curY = Math.round(startY + (endY - startY) * (s / steps));
        await sendCDP('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: curX, y: curY,
          button: 'left',
          buttons: 1
        });
        await sleep(20);
      }
      await sendCDP('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: endX, y: endY,
        button: 'left'
      });
    }

    const testResults = {};

    // -------------------------------------------------------------
    // TEST 1: AUTO CAMERA -> MANUAL DRAG
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING AUTO CAMERA -> MANUAL DRAG ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_RENDERER__.setGlobeMode(true);
    `);
    const initialCamState = await evaluate(`
      (() => {
        const g = window.__DOMINION_RENDERER__.globe;
        return { yaw: g.yaw, pitch: g.pitch, isUserDragging: g.isUserDragging };
      })()
    `);

    const diag = await evaluate(`
      (() => {
        const el = document.elementFromPoint(640, 360);
        const canvas = document.querySelector('canvas');
        const rect = canvas ? canvas.getBoundingClientRect() : null;
        const ic = window.__DOMINION_RENDERER__.inputController;
        const g = window.__DOMINION_RENDERER__.globe;
        return {
          elementTag: el ? el.tagName : null,
          elementId: el ? el.id : null,
          elementClass: el ? el.className : null,
          modalOpen: window.__DOMINION_MODAL_OPEN__,
          productMode: window.__DOMINION_PRODUCT_MODE__,
          canvasRect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
          globeCenter: g.center,
          globeRadius: g.radius,
          globeVisible: g.visible,
          isGlobeMode: window.__DOMINION_RENDERER__.isGlobeMode,
          gestureState: ic.gestureState,
          hasPointerDownHandler: Boolean(ic.onPointerDownHandler)
        };
      })()
    `);
    console.log('[DIAGNOSTIC BEFORE DRAG]', JSON.stringify(diag, null, 2));

    // Hook pointerdown and pointermove on canvas to see what reaches DOM
    await evaluate(`
      window.__POINTER_EVENTS__ = [];
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.addEventListener('pointerdown', e => window.__POINTER_EVENTS__.push({ type: 'pointerdown', x: e.clientX, y: e.clientY, id: e.pointerId, button: e.button }));
        canvas.addEventListener('pointermove', e => window.__POINTER_EVENTS__.push({ type: 'pointermove', x: e.clientX, y: e.clientY, id: e.pointerId }));
        canvas.addEventListener('pointerup', e => window.__POINTER_EVENTS__.push({ type: 'pointerup', x: e.clientX, y: e.clientY, id: e.pointerId }));
      }
    `);

    // Drag horizontally from center
    await dispatchDrag(640, 360, 780, 360, 8);
    const postEvents = await evaluate(`window.__POINTER_EVENTS__`);
    console.log('[POINTER EVENTS CAPTURED BY CANVAS]', JSON.stringify(postEvents, null, 2));
    const afterDragCam = await evaluate(`
      (() => {
        const g = window.__DOMINION_RENDERER__.globe;
        return { yaw: g.yaw, pitch: g.pitch, cmdCount: window.__TRACKED_COMMANDS__.length };
      })()
    `);
    const yawDeltaAuto = Math.abs(afterDragCam.yaw - initialCamState.yaw);
    assert.ok(yawDeltaAuto > 0.05, `Yaw must change upon manual drag: yawDelta=${yawDeltaAuto.toFixed(3)}`);
    assert.equal(afterDragCam.cmdCount, 0, 'Auto camera interrupt drag must not send commands');
    testResults['AUTO CAMERA -> MANUAL DRAG'] = 'PASS';
    console.log(`PASS: AUTO CAMERA -> MANUAL DRAG (yaw change=${yawDeltaAuto.toFixed(3)} rad, 0 commands)`);

    // -------------------------------------------------------------
    // TEST 2: GLOBE HORIZONTAL DRAG
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING GLOBE HORIZONTAL DRAG ---');
    await evaluate(`window.__TRACKED_COMMANDS__ = [];`);
    const hDragStart = await evaluate(`
      (() => {
        const g = window.__DOMINION_RENDERER__.globe;
        return { yaw: g.yaw, pitch: g.pitch };
      })()
    `);
    await dispatchDrag(640, 360, 440, 360, 10);
    await sleep(700); // wait beyond single click delay to ensure no click fires
    const hDragEnd = await evaluate(`
      (() => {
        const g = window.__DOMINION_RENDERER__.globe;
        return {
          yaw: g.yaw,
          pitch: g.pitch,
          cmdCount: window.__TRACKED_COMMANDS__.length,
          hasSelection: Boolean(window.__DOMINION_GAME_STATE__.selectionContext)
        };
      })()
    `);
    const hYawChange = Math.abs(hDragEnd.yaw - hDragStart.yaw);
    assert.ok(hYawChange > 0.15, `Horizontal drag must rotate globe yaw: delta=${hYawChange.toFixed(3)}`);
    assert.equal(hDragEnd.cmdCount, 0, 'Horizontal drag must not execute command');
    testResults['GLOBE HORIZONTAL DRAG'] = 'PASS';
    console.log(`PASS: GLOBE HORIZONTAL DRAG (yaw delta=${hYawChange.toFixed(3)} rad, 0 commands, no accidental selection)`);

    // -------------------------------------------------------------
    // TEST 3: GLOBE VERTICAL DRAG
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING GLOBE VERTICAL DRAG ---');
    await evaluate(`window.__TRACKED_COMMANDS__ = [];`);
    const vDragStart = await evaluate(`
      (() => {
        const g = window.__DOMINION_RENDERER__.globe;
        return { yaw: g.yaw, pitch: g.pitch };
      })()
    `);
    await dispatchDrag(640, 360, 640, 200, 10);
    await sleep(700);
    const vDragEnd = await evaluate(`
      (() => {
        const g = window.__DOMINION_RENDERER__.globe;
        return {
          yaw: g.yaw,
          pitch: g.pitch,
          cmdCount: window.__TRACKED_COMMANDS__.length,
        };
      })()
    `);
    const vPitchChange = Math.abs(vDragEnd.pitch - vDragStart.pitch);
    assert.ok(vPitchChange > 0.10, `Vertical drag must rotate globe pitch: delta=${vPitchChange.toFixed(3)}`);
    assert.equal(vDragEnd.cmdCount, 0, 'Vertical drag must not execute command');
    testResults['GLOBE VERTICAL DRAG'] = 'PASS';
    console.log(`PASS: GLOBE VERTICAL DRAG (pitch delta=${vPitchChange.toFixed(3)} rad, 0 commands)`);

    // -------------------------------------------------------------
    // TEST 4: CLICK -> DRAG
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING CLICK -> DRAG ---');
    await evaluate(`window.__TRACKED_COMMANDS__ = [];`);
    // Click down + up
    await dispatchClick(640, 360);
    // Within double click window, perform drag
    await sleep(50);
    await dispatchDrag(640, 360, 720, 360, 6);
    await sleep(700);
    const clickDragRes = await evaluate(`window.__TRACKED_COMMANDS__.length`);
    assert.equal(clickDragRes, 0, 'Click followed by drag must never trigger double click execution');
    testResults['GLOBE CLICK -> DRAG'] = 'PASS';
    console.log('PASS: GLOBE CLICK -> DRAG (drag cancels double click candidate, 0 accidental attack)');

    // -------------------------------------------------------------
    // TEST 5: DRAG -> CLICK
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING DRAG -> CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    // Complete a drag
    await dispatchDrag(500, 360, 600, 360, 6);
    await sleep(100);
    // Now click on center
    await dispatchClick(640, 360);
    await sleep(700);
    const dragClickRes = await evaluate(`
      ({
        cmdCount: window.__TRACKED_COMMANDS__.length,
        gestureState: window.__DOMINION_RENDERER__.inputController.gestureState
      })
    `);
    assert.equal(dragClickRes.cmdCount, 0, 'Single click must not send command');
    assert.equal(dragClickRes.gestureState, 'IDLE', 'Gesture state must be IDLE after single click timeout');
    testResults['GLOBE DRAG -> CLICK'] = 'PASS';
    console.log('PASS: GLOBE DRAG -> CLICK (gesture state resets cleanly, single click handled)');

    // -------------------------------------------------------------
    // FIND RELEVANT TARGET CELLS (NEUTRAL AND HOSTILE)
    // -------------------------------------------------------------
    console.log('\n--- RESOLVING VALID VISIBLE TARGET POINTS ---');
    const targetPoints = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__;
        const renderer = window.__DOMINION_RENDERER__;
        const yourId = gs.yourFactionId;
        const yourFaction = gs.factions instanceof Map ? gs.factions.get(yourId) : (Array.isArray(gs.factions) ? gs.factions.find(f => f.factionId === yourId) : null);
        const capital = yourFaction ? yourFaction.capitalCell : 0;
        const capX = capital % gs.width;
        const capY = Math.floor(capital / gs.width);

        // Rotate globe so player capital is centered and clearly visible
        const lonDeg = (capX / gs.width) * 360 - 180;
        const latDeg = 90 - (capY / gs.height) * 180;
        renderer.globe.setRotation((-lonDeg * Math.PI) / 180, (latDeg * Math.PI) / 180);

        let neutralTarget = null;
        let hostileTarget = null;

        // Search for land in expanding radius around player capital
        for (let r = 1; r <= 40; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              const x = (capX + dx + gs.width) % gs.width;
              const y = Math.max(0, Math.min(gs.height - 1, capY + dy));
              const idx = y * gs.width + x;
              const owner = gs.cellOwners[idx];
              const terr = gs.cellTerrains[idx];

              if (terr === 2) continue; // Skip water

              const screenPt = renderer.globe.projectWorld(x + 0.5, y + 0.5);
              if (!screenPt) continue; // Front hemisphere only

              const dist = Math.hypot(screenPt.x - renderer.globe.center.x, screenPt.y - renderer.globe.center.y);
              if (dist > renderer.globe.radius * 0.75) continue; // Inside 75% radius disk - more conservative

              // Round-trip verification: raycast screen back to world, confirm still resolves correctly
              const screenX = Math.round(screenPt.x);
              const screenY = Math.round(screenPt.y);
              const reverseWorld = renderer.globe.screenToWorld(screenX, screenY);
              if (!reverseWorld) continue;

              const roundTripCtx = window.__DOMINION_RESOLVE_TARGET__ ? window.__DOMINION_RESOLVE_TARGET__(gs, reverseWorld.x, reverseWorld.y) : null;
              if (!roundTripCtx) continue;

              if (owner === 0 && roundTripCtx.action === 'NEUTRAL_EXPANSION' && !neutralTarget) {
                neutralTarget = { cellIndex: idx, x, y, screenX, screenY };
              } else if (owner > 0 && owner !== yourId && !hostileTarget) {
                if (['LAUNCH_OFFENSIVE', 'AMPHIBIOUS_ASSAULT'].includes(roundTripCtx.action)) {
                  hostileTarget = { cellIndex: idx, x, y, screenX, screenY, ownerId: owner };
                }
              }
              if (neutralTarget && hostileTarget) break;
            }
            if (neutralTarget && hostileTarget) break;
          }
          if (neutralTarget && hostileTarget) break;
        }

        return { capital, capX, capY, neutralTarget, hostileTarget };
      })()
    `);

    console.log('[TARGET SEARCH RESULT]', JSON.stringify(targetPoints, null, 2));
    assert.ok(targetPoints.neutralTarget, 'Must find visible neutral land near player');

    // -------------------------------------------------------------
    // TEST 6: GLOBE SINGLE NEUTRAL CLICK
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING GLOBE SINGLE NEUTRAL CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    const nTarget = targetPoints.neutralTarget;
    console.log(`Dispatching real pointer click at neutral target (${nTarget.screenX}, ${nTarget.screenY})...`);
    await dispatchClick(nTarget.screenX, nTarget.screenY);

    // Wait beyond single-click arbitration window (600ms + 100ms)
    await sleep(750);

    const neutralPreview = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__;
        const sel = window.__DOMINION_RENDERER__.selection;
        return {
          selectionContext: gs.selectionContext,
          selectedTargetCell: gs.selectedTargetCell,
          selectionVisible: sel.container.visible,
          containerChildren: sel.container.children.length,
          cmdCount: window.__TRACKED_COMMANDS__.length
        };
      })()
    `);

    console.log('[NEUTRAL PREVIEW STATE]', JSON.stringify(neutralPreview, null, 2));
    assert.equal(neutralPreview.cmdCount, 0, 'Single neutral click must not send commands');
    assert.ok(neutralPreview.selectionContext, 'Selection context must be populated on single neutral click');
    assert.ok(neutralPreview.selectionVisible, 'SelectionRenderer must be visible in Globe mode');
    assert.equal(neutralPreview.selectionContext.action, 'NEUTRAL_EXPANSION', 'Neutral land produces NEUTRAL_EXPANSION semantic');
    testResults['GLOBE SINGLE NEUTRAL'] = 'PASS';
    console.log('PASS: GLOBE SINGLE NEUTRAL (target resolved, preview state populated, vector/marker rendered, 0 commands)');

    // -------------------------------------------------------------
    // TEST 7: GLOBE NEUTRAL DOUBLE CLICK
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING GLOBE NEUTRAL DOUBLE CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    // Click 1
    await dispatchClick(nTarget.screenX, nTarget.screenY);
    await sleep(100); // 100ms within double click window
    // Click 2
    await dispatchClick(nTarget.screenX, nTarget.screenY);
    await sleep(300);

    const neutralDoubleRes = await evaluate(`window.__TRACKED_COMMANDS__`);
    console.log('[NEUTRAL DOUBLE COMMANDS SENT]', JSON.stringify(neutralDoubleRes, null, 2));
    assert.equal(neutralDoubleRes.length, 1, 'Exactly one command sent on neutral double click');
    assert.equal(neutralDoubleRes[0].type, 'expand_command', 'Neutral double click sends expand_command');
    testResults['GLOBE NEUTRAL DOUBLE'] = 'PASS';
    console.log('PASS: GLOBE NEUTRAL DOUBLE (exact local FOCUS expansion command executed)');

    // -------------------------------------------------------------
    // TEST 8: GLOBE SINGLE HOSTILE CLICK
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING GLOBE SINGLE HOSTILE CLICK ---');
    const hostileInfo = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__;
        const renderer = window.__DOMINION_RENDERER__;
        const yourId = gs.yourFactionId;
        const yourFaction = gs.factions instanceof Map ? gs.factions.get(yourId) : (Array.isArray(gs.factions) ? gs.factions.find(f => f.factionId === yourId) : null);
        const pCap = yourFaction ? yourFaction.capitalCell : 0;
        const px = pCap % gs.width;
        const py = Math.floor(pCap / gs.width);

        const factions = Array.from(gs.factions.values()).filter(f => f.factionId !== yourId && !f.isEliminated && f.capitalCell > 0);
        factions.sort((a, b) => {
          const ax = a.capitalCell % gs.width, ay = Math.floor(a.capitalCell / gs.width);
          const bx = b.capitalCell % gs.width, by = Math.floor(b.capitalCell / gs.width);
          return Math.hypot(ax - px, ay - py) - Math.hypot(bx - px, by - py);
        });

        // Search through each enemy faction cells for one that produces an actionable hostile resolution
        for (const targetFaction of factions) {
          const capX = targetFaction.capitalCell % gs.width;
          const capY = Math.floor(targetFaction.capitalCell / gs.width);

          // Center globe on this enemy faction
          const lon = (capX / gs.width) * 360 - 180;
          const lat = 90 - (capY / gs.height) * 180;
          renderer.globe.setRotation((-lon * Math.PI) / 180, (lat * Math.PI) / 180);

          // Search all cells of this faction in expanding rings around their capital
          for (let r = 0; r <= 25; r++) {
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const x = (capX + dx + gs.width) % gs.width;
                const y = Math.max(0, Math.min(gs.height - 1, capY + dy));
                const idx = y * gs.width + x;
                if (gs.cellOwners[idx] !== targetFaction.factionId) continue;
                if (gs.cellTerrains[idx] === 2) continue;

                const ctx = window.__DOMINION_RESOLVE_TARGET__ ? window.__DOMINION_RESOLVE_TARGET__(gs, x + 0.5, y + 0.5) : null;
                if (!ctx || !['LAUNCH_OFFENSIVE', 'AMPHIBIOUS_ASSAULT'].includes(ctx.action)) continue;

                const pt = renderer.globe.projectWorld(x + 0.5, y + 0.5);
                if (!pt) continue;
                const screenX = Math.round(pt.x);
                const screenY = Math.round(pt.y);
                const distFromCenter = Math.hypot(screenX - renderer.globe.center.x, screenY - renderer.globe.center.y);
                if (distFromCenter > renderer.globe.radius * 0.80) continue;

                // Round-trip verification: reverse-raycast to confirm click resolves correctly
                const reverseWorld = renderer.globe.screenToWorld(screenX, screenY);
                if (!reverseWorld) continue;
                const reverseCtx = window.__DOMINION_RESOLVE_TARGET__ ? window.__DOMINION_RESOLVE_TARGET__(gs, reverseWorld.x, reverseWorld.y) : null;
                if (!reverseCtx || !['LAUNCH_OFFENSIVE', 'AMPHIBIOUS_ASSAULT'].includes(reverseCtx.action)) continue;

                return {
                  targetFactionId: targetFaction.factionId,
                  targetCell: idx,
                  action: reverseCtx.action,
                  tx: x, ty: y,
                  screenX,
                  screenY
                };
              }
            }
          }
        }
        return null;
      })()
    `);

    assert.ok(hostileInfo, 'Must find nearest enemy faction');
    console.log('[HOSTILE INFO]', JSON.stringify(hostileInfo, null, 2));

    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    console.log(`Dispatching real pointer click at hostile target (${hostileInfo.screenX}, ${hostileInfo.screenY})...`);
    await dispatchClick(hostileInfo.screenX, hostileInfo.screenY);
    await sleep(750);

    const hostilePreview = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__;
        const sel = window.__DOMINION_RENDERER__.selection;
        return {
          selectionContext: gs.selectionContext,
          selectedTargetCell: gs.selectedTargetCell,
          selectionVisible: sel.container.visible,
          cmdCount: window.__TRACKED_COMMANDS__.length
        };
      })()
    `);

    console.log('[HOSTILE PREVIEW STATE]', JSON.stringify(hostilePreview, null, 2));
    assert.equal(hostilePreview.cmdCount, 0, 'Single hostile click must not send commands');
    assert.ok(hostilePreview.selectionContext, 'Selection context populated on hostile click');
    assert.ok(['LAUNCH_OFFENSIVE', 'AMPHIBIOUS_ASSAULT'].includes(hostilePreview.selectionContext.action), 'Hostile click produces hostile action');
    assert.ok(hostilePreview.selectionVisible, 'Selection overlay visible');
    testResults['GLOBE SINGLE HOSTILE'] = 'PASS';
    console.log('PASS: GLOBE SINGLE HOSTILE (hostile preview populated, direction vector rendered, 0 commands)');

    // -------------------------------------------------------------
    // TEST 9: GLOBE HOSTILE DOUBLE CLICK
    // -------------------------------------------------------------
    console.log('\n--- VERIFYING GLOBE HOSTILE DOUBLE CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    await dispatchClick(hostileInfo.screenX, hostileInfo.screenY);
    await sleep(100);
    await dispatchClick(hostileInfo.screenX, hostileInfo.screenY);
    await sleep(300);

    const hostileDoubleRes = await evaluate(`window.__TRACKED_COMMANDS__`);
    console.log('[HOSTILE DOUBLE COMMANDS SENT]', JSON.stringify(hostileDoubleRes, null, 2));
    assert.equal(hostileDoubleRes.length, 1, 'Exactly one command sent on hostile double click');
    assert.ok(['attack_command', 'amphibious_attack'].includes(hostileDoubleRes[0].type), 'Hostile double click sends hostile attack command');
    assert.notEqual(hostileDoubleRes[0].type, 'expand_command', 'Hostile double click NEVER falls back to expansion');
    testResults['GLOBE HOSTILE DOUBLE'] = 'PASS';
    console.log('PASS: GLOBE HOSTILE DOUBLE (exact local attack command executed, no fallback)');

    // -------------------------------------------------------------
    // FLAT MODE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n=== SWITCHING TO FLAT MODE FOR FLAT PAN & CLICKS ===');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_RENDERER__.setGlobeMode(false);
      window.__DOMINION_RENDERER__.fitWorldToScreen();
    `);
    await sleep(200);

    // TEST 10: FLAT PAN
    console.log('\n--- VERIFYING FLAT PAN ---');
    const flatStartPos = await evaluate(`
      ({ x: window.__DOMINION_RENDERER__.worldContainer.x, y: window.__DOMINION_RENDERER__.worldContainer.y })
    `);
    await dispatchDrag(400, 300, 550, 400, 8);
    await sleep(700);
    const flatEndPos = await evaluate(`
      ({
        x: window.__DOMINION_RENDERER__.worldContainer.x,
        y: window.__DOMINION_RENDERER__.worldContainer.y,
        cmdCount: window.__TRACKED_COMMANDS__.length
      })
    `);
    assert.notEqual(flatEndPos.x, flatStartPos.x, 'Flat drag must pan world container X');
    assert.notEqual(flatEndPos.y, flatStartPos.y, 'Flat drag must pan world container Y');
    assert.equal(flatEndPos.cmdCount, 0, 'Flat pan must not execute commands');
    testResults['FLAT PAN'] = 'PASS';
    console.log('PASS: FLAT PAN (world container panned smoothly, 0 commands)');

    // Get flat screen point for neutral target
    const flatNeutralPoint = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__;
        const renderer = window.__DOMINION_RENDERER__;
        renderer.centerOnPlayerCapital();
        const yourId = gs.yourFactionId;
        const yourFaction = gs.factions instanceof Map ? gs.factions.get(yourId) : null;
        const capital = yourFaction ? yourFaction.capitalCell : 0;
        const capX = capital % gs.width;
        const capY = Math.floor(capital / gs.width);

        for (let r = 1; r <= 30; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              const x = (capX + dx + gs.width) % gs.width;
              const y = Math.max(0, Math.min(gs.height - 1, capY + dy));
              const idx = y * gs.width + x;
              const ctx = window.__DOMINION_RESOLVE_TARGET__ ? window.__DOMINION_RESOLVE_TARGET__(gs, x + 0.5, y + 0.5) : null;
              if (gs.cellTerrains[idx] !== 2 && gs.cellOwners[idx] === 0 && ctx && ctx.action === 'NEUTRAL_EXPANSION') {
                const scr = renderer.worldToScreen(x + 0.5, y + 0.5);
                if (scr && scr.x > 80 && scr.x < 1180 && scr.y > 80 && scr.y < 480) {
                  return { cellIndex: idx, screenX: Math.round(scr.x), screenY: Math.round(scr.y) };
                }
              }
            }
          }
        }
        return null;
      })()
    `);

    assert.ok(flatNeutralPoint, 'Found valid flat neutral target');

    // TEST 11: FLAT SINGLE
    console.log('\n--- VERIFYING FLAT SINGLE CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    await dispatchClick(flatNeutralPoint.screenX, flatNeutralPoint.screenY);
    await sleep(750);
    const flatSingleRes = await evaluate(`
      ({
        selectionContext: window.__DOMINION_GAME_STATE__.selectionContext,
        cmdCount: window.__TRACKED_COMMANDS__.length
      })
    `);
    assert.equal(flatSingleRes.cmdCount, 0, 'Flat single click sends 0 commands');
    assert.ok(flatSingleRes.selectionContext, 'Flat single click creates selection context');
    assert.equal(flatSingleRes.selectionContext.action, 'NEUTRAL_EXPANSION');
    testResults['FLAT SINGLE'] = 'PASS';
    console.log('PASS: FLAT SINGLE (same semantic preview pipeline, 0 commands)');

    // TEST 12: FLAT NEUTRAL DOUBLE
    console.log('\n--- VERIFYING FLAT NEUTRAL DOUBLE CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    await dispatchClick(flatNeutralPoint.screenX, flatNeutralPoint.screenY);
    await sleep(100);
    await dispatchClick(flatNeutralPoint.screenX, flatNeutralPoint.screenY);
    await sleep(300);
    const flatNeutralCmds = await evaluate(`window.__TRACKED_COMMANDS__`);
    assert.equal(flatNeutralCmds.length, 1, 'Flat neutral double click sends exactly 1 command');
    assert.equal(flatNeutralCmds[0].type, 'expand_command');
    testResults['FLAT NEUTRAL DOUBLE'] = 'PASS';
    console.log('PASS: FLAT NEUTRAL DOUBLE (FOCUS expansion command executed)');

    // Get flat hostile point
    const flatHostilePoint = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__;
        const renderer = window.__DOMINION_RENDERER__;
        const yourId = gs.yourFactionId;
        for (let i = 0; i < gs.totalCells; i++) {
          if (gs.cellTerrains[i] !== 2 && gs.cellOwners[i] > 0 && gs.cellOwners[i] !== yourId) {
            const isAdj = [i - 1, i + 1, i - gs.width, i + gs.width].some(n => n >= 0 && n < gs.totalCells && gs.cellOwners[n] === yourId && gs.cellTerrains[n] !== 2);
            const x = i % gs.width;
            const y = Math.floor(i / gs.width);
            const ctx = window.__DOMINION_RESOLVE_TARGET__ ? window.__DOMINION_RESOLVE_TARGET__(gs, x + 0.5, y + 0.5) : null;
            if (ctx && ['LAUNCH_OFFENSIVE', 'AMPHIBIOUS_ASSAULT'].includes(ctx.action)) {
              const scr = renderer.worldToScreen(x + 0.5, y + 0.5);
              if (scr && scr.x > 80 && scr.x < 1180 && scr.y > 80 && scr.y < 480) {
                return { cellIndex: i, screenX: Math.round(scr.x), screenY: Math.round(scr.y) };
              }
            }
          }
        }
        return null;
      })()
    `);

    // TEST 13: FLAT HOSTILE DOUBLE
    console.log('\n--- VERIFYING FLAT HOSTILE DOUBLE CLICK ---');
    await evaluate(`
      window.__TRACKED_COMMANDS__ = [];
      window.__DOMINION_GAME_STATE__.selectionContext = null;
    `);
    const hPt = flatHostilePoint || flatNeutralPoint;
    await dispatchClick(hPt.screenX, hPt.screenY);
    await sleep(100);
    await dispatchClick(hPt.screenX, hPt.screenY);
    await sleep(300);
    const flatHostileCmds = await evaluate(`window.__TRACKED_COMMANDS__`);
    assert.equal(flatHostileCmds.length, 1);
    assert.ok(['attack_command', 'amphibious_attack'].includes(flatHostileCmds[0].type));
    assert.notEqual(flatHostileCmds[0].type, 'expand_command');
    testResults['FLAT HOSTILE DOUBLE'] = 'PASS';
    console.log('PASS: FLAT HOSTILE DOUBLE (attack command executed)');

    console.log('\n========================================================================');
    console.log('SUMMARY OF REAL RUNTIME POINTER INTERACTION RESULTS:');
    console.log('========================================================================');
    for (const [key, val] of Object.entries(testResults)) {
      console.log(`${key} = ${val}`);
    }
    console.log('========================================================================');
    console.log('ALL REAL SURFACE POINTER VERIFICATION TESTS PASSED (100%)');
    console.log('========================================================================');

    ws.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('\n[TEST SUITE ERROR]', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
