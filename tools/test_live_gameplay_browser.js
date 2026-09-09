const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/04196A58C0633499D2B12B35D4EB453E');
  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.on('open', r));
  console.log('[CDP] Connected to Chrome DevTools');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async function screenshot(filename) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`qa_screenshots/${filename}`, Buffer.from(shot.data, 'base64'));
    console.log(`[SCREENSHOT] Saved qa_screenshots/${filename}`);
  }

  // 1. Reload the page to load the fresh client bundle
  console.log('[STEP 1] Reloading page to load latest client code...');
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));

  // 2. Click "CONTINUE WITH ROMA"
  console.log('[STEP 2] Entering game as ROMA...');
  const clickHero = await evaluate(`
    (() => {
      const heroBtn = document.getElementById('btn-continue-with-civ');
      if (heroBtn) {
        heroBtn.click();
        return 'Clicked heroBtn: ' + heroBtn.innerText;
      }
      return 'No heroBtn';
    })()
  `);
  console.log('  Hero button:', clickHero);
  await new Promise(r => setTimeout(r, 1200));

  // 2b. Select a World card in War Room
  const clickCard = await evaluate(`
    (() => {
      const card = document.querySelector('.warroom-world-card');
      if (card) {
        card.click();
        return 'Card clicked: ' + card.className;
      }
      return 'No world card';
    })()
  `);
  console.log('  World card:', clickCard);
  await new Promise(r => setTimeout(r, 1200));

  // 2c. Click "JOIN WORLD"
  const clickJoin = await evaluate(`
    (() => {
      const btn = document.getElementById('btn-warroom-primary-action');
      if (btn && !btn.disabled) {
        btn.click();
        return 'Clicked JOIN WORLD: ' + btn.innerText;
      }
      return 'Join world button not ready: ' + (btn?.innerText || 'null');
    })()
  `);
  console.log('  Join World action:', clickJoin);

  // Wait for game entry
  console.log('  Waiting 4s for globe and match entry...');
  await new Promise(r => setTimeout(r, 4500));

  // Click player ready if visible
  await evaluate(`
    (() => {
      const readyBtn = document.getElementById('btn-player-ready');
      if (readyBtn) readyBtn.click();
      const readyBtn2 = document.querySelector('.btn-ready, #hud-btn-ready, .btn-battle-ready');
      if (readyBtn2) readyBtn2.click();
    })()
  `);

  await new Promise(r => setTimeout(r, 2000));
  await screenshot('live_01_in_realm.png');

  // 3. Inspect in-game state
  const gameStateInfo = await evaluate(`
    (() => {
      const gs = window.gameState;
      const app = window.__DOMINION_APP__ || window.dominionApp;
      const client = window.__DOMINION_CLIENT__ || window.gameClient;
      return {
        hasGameState: !!gs,
        hasApp: !!app,
        yourFactionId: gs?.yourFactionId,
        factionsCount: gs?.factions?.size,
        hudPop: document.getElementById('hud-population')?.textContent?.trim(),
        hudArea: document.getElementById('hud-land-area')?.textContent?.trim(),
        canvas: (() => {
          const c = document.querySelector('canvas');
          if (!c) return null;
          const r = c.getBoundingClientRect();
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        })()
      };
    })()
  `);
  console.log('[STEP 3] Game State Info:', gameStateInfo);

  // 4. TEST CASE A: CLICK GREECE (HELLEN) ACROSS WATER
  // Roma capital is at (560, 137). Greece/Hellen is at (600, 147).
  // On canvas, let's trigger picking/target resolving for Greece!
  console.log('\n[STEP 4] CASE A: Testing Greece (Hellen) across water targeting...');
  const greeceTargetResult = await evaluate(`
    (() => {
      const gs = window.gameState;
      const input = window.__DOMINION_INPUT__ || window.inputController;
      const resolver = window.__DOMINION_RESOLVER__;
      
      // Let's resolve target for Hellen capital (cell 151107: x = 151107 % 1024 = 579, y = Math.floor(151107 / 1024) = 147)
      // Or Hellen capital cell
      const hellenFaction = Array.from(gs?.factions?.values() || []).find(f => f.name?.toLowerCase().includes('hellen') || f.displayName?.toLowerCase().includes('hellen'));
      const hellenCap = hellenFaction?.capitalCell || 151107;
      const hx = (hellenCap % 1024) + 0.5;
      const hy = Math.floor(hellenCap / 1024) + 0.5;

      // Call TargetResolver directly on gameState
      if (typeof window.resolveTargetAtWorld === 'function') {
        const res = window.resolveTargetAtWorld(gs, hx, hy);
        return { method: 'window.resolveTargetAtWorld', res, hellenCap };
      }

      // Check input controller resolution
      if (input && typeof input.resolveContextAtWorld === 'function') {
        const ctx = input.resolveContextAtWorld(hx, hy);
        return { method: 'input.resolveContextAtWorld', ctx, hellenCap };
      }

      return { hellenCap, hx, hy };
    })()
  `);
  console.log('  Greece Target Resolution:', JSON.stringify(greeceTargetResult, null, 2));

  // Let's click on the canvas east of Italy towards Greece (screen coordinates)
  const rect = gameStateInfo.canvas;
  if (rect) {
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    // In globe view centered on Rome, Greece is slightly to the right (east)
    const greeceScreenX = cx + rect.width * 0.08;
    const greeceScreenY = cy + rect.height * 0.04;

    console.log(`  Dispatching pointer click at (${greeceScreenX.toFixed(1)}, ${greeceScreenY.toFixed(1)}) towards Greece...`);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: greeceScreenX,
      y: greeceScreenY,
      button: 'left',
      clickCount: 1
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: greeceScreenX,
      y: greeceScreenY,
      button: 'left'
    });

    await new Promise(r => setTimeout(r, 600));
    await screenshot('live_02_click_greece.png');

    // Inspect HUD & selection state
    const selectionAfterGreece = await evaluate(`
      (() => {
        const gs = window.gameState;
        return {
          selection: gs?.currentSelection,
          pendingAttack: gs?.pendingAttack,
          hudAction: document.getElementById('command-action-label')?.textContent?.trim(),
          hudStatus: document.getElementById('command-status')?.textContent?.trim(),
          toast: document.querySelector('.toast, .notification-toast')?.textContent?.trim()
        };
      })()
    `);
    console.log('  Selection after clicking Greece:', JSON.stringify(selectionAfterGreece, null, 2));

    // Double click towards Greece - must NOT start an attack!
    console.log('  Dispatching double-click towards Greece (must be blocked)...');
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: greeceScreenX,
      y: greeceScreenY,
      button: 'left',
      clickCount: 2
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: greeceScreenX,
      y: greeceScreenY,
      button: 'left'
    });

    await new Promise(r => setTimeout(r, 800));
    await screenshot('live_03_double_click_greece_blocked.png');
  }

  // 5. TEST CASE B: LOCAL ITALIAN FRONTIER EXPANSION
  // Click on southern/eastern Italy near Rome
  if (rect) {
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    // Slightly south of center in Italy
    const italyTargetX = cx + rect.width * 0.015;
    const italyTargetY = cy + rect.height * 0.035;

    console.log(`\n[STEP 5] CASE B: Single-click Italian frontier at (${italyTargetX.toFixed(1)}, ${italyTargetY.toFixed(1)})...`);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: italyTargetX,
      y: italyTargetY,
      button: 'left',
      clickCount: 1
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: italyTargetX,
      y: italyTargetY,
      button: 'left'
    });

    await new Promise(r => setTimeout(r, 600));
    await screenshot('live_04_local_frontier_preview.png');

    const previewState = await evaluate(`
      (() => {
        const gs = window.gameState;
        return {
          selection: gs?.currentSelection,
          hudAction: document.getElementById('command-action-label')?.textContent?.trim(),
          popReadout: document.getElementById('attack-population-readout')?.textContent?.trim()
        };
      })()
    `);
    console.log('  Local Frontier Preview State:', JSON.stringify(previewState, null, 2));

    // Double-click to execute local expansion
    console.log('\n[STEP 6] CASE C: Double-click to execute local expansion...');
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: italyTargetX,
      y: italyTargetY,
      button: 'left',
      clickCount: 2
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: italyTargetX,
      y: italyTargetY,
      button: 'left'
    });

    // Capture during wavefront animation (~120ms)
    await new Promise(r => setTimeout(r, 120));
    await screenshot('live_05_expansion_animating.png');

    // Wait for animation to settle
    await new Promise(r => setTimeout(r, 1200));
    await screenshot('live_06_expansion_settled.png');

    const settledState = await evaluate(`
      (() => {
        const gs = window.gameState;
        const myFaction = gs?.factions?.get(gs?.yourFactionId);
        return {
          cells: myFaction?.cellCount,
          landAreaKm2: myFaction?.landAreaKm2,
          population: myFaction?.population,
          hudPop: document.getElementById('hud-population')?.textContent?.trim(),
          hudArea: document.getElementById('hud-land-area')?.textContent?.trim()
        };
      })()
    `);
    console.log('  Settled State after Expansion:', JSON.stringify(settledState, null, 2));
  }

  // 6. Switch to Flat View
  console.log('\n[STEP 7] CASE D: Switching to Flat View...');
  await evaluate(`
    (() => {
      const flatBtn = document.getElementById('btn-view-flat') || document.querySelector('[data-view="flat"], .view-mode-flat');
      if (flatBtn) flatBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));
  await screenshot('live_07_flat_projection.png');

  console.log('\n=== REAL RUNTIME BROWSER SUITE COMPLETE ===');
  ws.close();
}

main().catch(err => {
  console.error('Fatal error in live browser test:', err);
  process.exit(1);
});
