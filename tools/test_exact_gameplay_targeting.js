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

  // 1. Query projection of Rome, Greece, and nearby Italy frontier
  console.log('[STEP 1] Querying exact screen coordinates via __DOMINION_RENDERER__...');
  const coords = await evaluate(`
    (() => {
      const r = window.__DOMINION_RENDERER__ || window.dominionRenderer;
      const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
      if (!r || !gs) return { error: 'No renderer or game state' };

      const romaCap = 140836;
      const hellenCap = 151107;
      // Italian frontier cell south of Rome
      const italyFrontier = romaCap + 1024 + 1; // (561, 138)

      // Project cell coordinates to screen
      function projectCell(cell) {
        const wx = (cell % 1024) + 0.5;
        const wy = Math.floor(cell / 1024) + 0.5;
        if (r.isGlobeMode && r.globe) {
          const pt = r.globe.projectWorld(wx, wy);
          if (pt) return { x: pt.x, y: pt.y, visible: true };
        }
        const pt = r.worldContainer.toGlobal(new PIXI.Point(wx, wy));
        return { x: pt.x, y: pt.y, visible: true };
      }

      return {
        roma: projectCell(romaCap),
        hellen: projectCell(hellenCap),
        frontier: projectCell(italyFrontier),
        pop: gs.factions.get(gs.yourFactionId)?.population,
        factions: gs.factions.size
      };
    })()
  `);
  console.log('[COORDS]', JSON.stringify(coords, null, 2));

  // 2. CASE A: CLICK GREECE (HELLEN) ACROSS WATER
  if (coords.hellen && coords.hellen.visible) {
    console.log(`\n[STEP 2] CASE A: Single-click Greece (Hellen) across water at (${coords.hellen.x.toFixed(1)}, ${coords.hellen.y.toFixed(1)})...`);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.hellen.x,
      y: coords.hellen.y,
      button: 'left',
      clickCount: 1
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.hellen.x,
      y: coords.hellen.y,
      button: 'left'
    });

    await new Promise(r => setTimeout(r, 600));
    await screenshot('real_greece_blocked.png');

    const selectionState = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
        const r = window.__DOMINION_RENDERER__ || window.dominionRenderer;
        return {
          currentSelection: gs?.currentSelection,
          hasCorridor: !!r?.selection?.activeCorridor,
          popCost: document.getElementById('attack-population-readout')?.textContent?.trim()
        };
      })()
    `);
    console.log('  Selection after clicking Greece:', JSON.stringify(selectionState, null, 2));

    // Double-click Greece - must NOT spend population or start attack!
    console.log('  Double-clicking Greece (must be blocked)...');
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.hellen.x,
      y: coords.hellen.y,
      button: 'left',
      clickCount: 2
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.hellen.x,
      y: coords.hellen.y,
      button: 'left'
    });

    await new Promise(r => setTimeout(r, 800));
    await screenshot('real_greece_double_click_blocked.png');
  }

  // 3. CASE B: CLICK LEGAL ITALIAN FRONTIER
  if (coords.frontier && coords.frontier.visible) {
    console.log(`\n[STEP 3] CASE B: Single-click legal Italian frontier at (${coords.frontier.x.toFixed(1)}, ${coords.frontier.y.toFixed(1)})...`);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.frontier.x,
      y: coords.frontier.y,
      button: 'left',
      clickCount: 1
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.frontier.x,
      y: coords.frontier.y,
      button: 'left'
    });

    await new Promise(r => setTimeout(r, 600));
    await screenshot('real_frontier_preview.png');

    const frontierPreview = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
        return {
          selection: gs?.currentSelection,
          popReadout: document.getElementById('attack-population-readout')?.textContent?.trim()
        };
      })()
    `);
    console.log('  Frontier Preview State:', JSON.stringify(frontierPreview, null, 2));

    // Double-click Italian frontier to execute expansion
    console.log('\n[STEP 4] CASE C: Double-click to expand territory...');
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.frontier.x,
      y: coords.frontier.y,
      button: 'left',
      clickCount: 2
    });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.frontier.x,
      y: coords.frontier.y,
      button: 'left'
    });

    // Capture during wavefront animation (~120ms)
    await new Promise(r => setTimeout(r, 120));
    await screenshot('real_expansion_animating.png');

    // Wait for expansion to settle
    await new Promise(r => setTimeout(r, 1500));
    await screenshot('real_expansion_settled.png');

    const afterExpansion = await evaluate(`
      (() => {
        const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
        const myFaction = gs.factions.get(gs.yourFactionId);
        return {
          cells: myFaction?.cellCount,
          landAreaKm2: myFaction?.landAreaKm2,
          population: myFaction?.population,
          hudPop: document.getElementById('hud-population')?.textContent?.trim(),
          hudArea: document.getElementById('hud-land-area')?.textContent?.trim()
        };
      })()
    `);
    console.log('  After Expansion State:', JSON.stringify(afterExpansion, null, 2));
  }

  // 4. Switch to Flat View and capture
  console.log('\n[STEP 5] Switching to Flat View...');
  await evaluate(`
    (() => {
      // Find FLAT toggle button
      const btns = Array.from(document.querySelectorAll('button, div, span'));
      const flatBtn = btns.find(b => b.innerText?.trim() === 'FLAT');
      if (flatBtn) flatBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1800));
  await screenshot('real_flat_view.png');

  console.log('\n=== REAL USER RUNTIME VERIFICATION COMPLETE ===');
  ws.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
