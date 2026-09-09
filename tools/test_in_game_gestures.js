const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/04196A58C0633499D2B12B35D4EB453E');
  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          resolve(msg);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.on('open', r));

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.result?.value;
  }

  async function screenshot(filename) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`qa_screenshots/${filename}`, Buffer.from(shot.result.data, 'base64'));
    console.log(`Saved qa_screenshots/${filename}`);
  }

  // 1. Get initial HUD values
  const hud0 = await evaluate(`
    (() => {
      return {
        pop: document.getElementById('hud-population')?.textContent?.trim(),
        growth: document.getElementById('hud-pop-growth')?.textContent?.trim(),
        area: document.getElementById('hud-land-area')?.textContent?.trim(),
        readout: document.getElementById('attack-population-readout')?.textContent?.trim(),
        commitPercent: document.getElementById('attack-percent')?.textContent?.trim(),
        canvasRect: (() => {
          const c = document.querySelector('canvas');
          if (!c) return null;
          const r = c.getBoundingClientRect();
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        })()
      };
    })()
  `);
  console.log('T=0 HUD:', hud0);

  const rect = hud0.canvasRect;
  // Center of canvas is roughly where Europe/Noyan is centered
  const cx = rect.left + rect.width * 0.50;
  const cy = rect.top + rect.height * 0.45;

  // 2. Test Globe Drag (yaw/pitch)
  console.log('Testing Globe Drag...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      const cx = ${cx}, cy = ${cy};
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + 80, clientY: cy + 30, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 80, clientY: cy + 30 }));
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 600));
  await screenshot('live_09_globe_dragged.png');

  // Drag back slightly
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      const cx = ${cx}, cy = ${cy};
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx + 80, clientY: cy + 30, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx, clientY: cy, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx, clientY: cy }));
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  // 3. Test Single Click Preview on cell near Noyan
  console.log('Testing Single Click Preview on neutral cell near Noyan...');
  // Click slightly north of Noyan (e.g. Alps / Austria direction)
  const targetX = cx + 5;
  const targetY = cy - 25;
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: ${targetX}, clientY: ${targetY} }));
      canvas.dispatchEvent(new MouseEvent('click', { clientX: ${targetX}, clientY: ${targetY}, bubbles: true }));
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 800));
  await screenshot('live_10_single_click_preview.png');

  // 4. Test Double Click Execute (12% FOCUS order)
  console.log('Testing Double Click Execute (12% FOCUS)...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: ${targetX}, clientY: ${targetY}, bubbles: true }));
      return true;
    })()
  `);

  console.log('Waiting 3 seconds for expansion operation to execute...');
  await new Promise(r => setTimeout(r, 3000));
  await screenshot('live_11_after_12pct_focus.png');

  const hud1 = await evaluate(`
    (() => {
      return {
        pop: document.getElementById('hud-population')?.textContent?.trim(),
        growth: document.getElementById('hud-pop-growth')?.textContent?.trim(),
        area: document.getElementById('hud-land-area')?.textContent?.trim(),
        readout: document.getElementById('attack-population-readout')?.textContent?.trim()
      };
    })()
  `);
  console.log('After 12% FOCUS HUD:', hud1);

  // 5. Test 50% Commitment Expansion
  console.log('Testing 50% Commitment Expansion...');
  // Set slider / commit to 50%
  await evaluate(`
    (() => {
      // Find 50% detent or click on slider
      const slider = document.getElementById('drawn-sword-assembly') || document.querySelector('input[type="range"]');
      // If gameState exists in window:
      if (window.gameState) {
        window.gameState.setCommitPercent(50);
      }
      const btn50 = Array.from(document.querySelectorAll('*')).find(e => e.textContent === '50');
      if (btn50) btn50.click();
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  // Double click to the north-east (Balkans / Hungary direction)
  const targetX2 = cx + 30;
  const targetY2 = cy - 20;
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: ${targetX2}, clientY: ${targetY2}, bubbles: true }));
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));
  await screenshot('live_12_after_50pct_focus.png');

  const hud2 = await evaluate(`
    (() => {
      return {
        pop: document.getElementById('hud-population')?.textContent?.trim(),
        growth: document.getElementById('hud-pop-growth')?.textContent?.trim(),
        area: document.getElementById('hud-land-area')?.textContent?.trim(),
        readout: document.getElementById('attack-population-readout')?.textContent?.trim()
      };
    })()
  `);
  console.log('After 50% FOCUS HUD:', hud2);

  // 6. Test Flat View Toggle
  console.log('Testing Flat View Toggle...');
  await evaluate(`
    (() => {
      const flatBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'FLAT');
      if (flatBtn) flatBtn.click();
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 1200));
  await screenshot('live_13_flat_projection.png');

  // 7. Test Flat Pan
  console.log('Testing Flat Pan...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      const cx = ${cx}, cy = ${cy};
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx - 120, clientY: cy - 40, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx - 120, clientY: cy - 40 }));
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));
  await screenshot('live_14_flat_panned.png');

  // 8. Test Flat Single Click & Double Click
  console.log('Testing Flat Single Click & Double Click...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      const cx = ${cx}, cy = ${cy};
      canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 500));
  await screenshot('live_15_flat_clicked.png');

  console.log('All live tests complete!');
  ws.close();
}

main().catch(console.error);
