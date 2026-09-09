const WebSocket = require('ws');
const fs = require('fs');

async function run() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/04196A58C0633499D2B12B35D4EB453E');
  
  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data);
    }
  });

  await new Promise(r => ws.on('open', r));
  console.log('Connected to CDP');

  async function evaluate(code) {
    const res = await send('Runtime.evaluate', {
      expression: code,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.result?.exceptionDetails) {
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    }
    return res.result?.value;
  }

  async function screenshot(filename) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`qa_screenshots/${filename}`, Buffer.from(shot.result.data, 'base64'));
    console.log(`Saved qa_screenshots/${filename}`);
  }

  // 1. Reload page to get fresh join
  console.log('Reloading page...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 3000));

  // 2. Check DOM and state
  let state = await evaluate(`
    (() => {
      const hud = document.body.innerText;
      const startBtn = document.querySelector('button.btn-primary, #btn-player-ready, #btn-launch-attack');
      return {
        title: document.title,
        hasStartBtn: !!startBtn,
        startBtnText: startBtn?.innerText,
        pop: document.querySelector('.pop-readout, #hud-population')?.innerText,
        growth: document.querySelector('.growth-readout, #hud-pop-growth')?.innerText,
        area: document.querySelector('.area-readout, #hud-land-area')?.innerText,
      };
    })()
  `);
  console.log('Post-reload state:', state);
  await screenshot('live_01_prematch.png');

  // If there is a start / deploy button, click it!
  console.log('Looking for deploy/start button...');
  const clicked = await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const deployBtn = buttons.find(b => /deploy|start|ready/i.test(b.innerText) && b.offsetParent !== null);
      if (deployBtn) {
        deployBtn.click();
        return deployBtn.innerText;
      }
      return null;
    })()
  `);
  console.log('Deploy button clicked:', clicked);

  // Wait 1.5s
  await new Promise(r => setTimeout(r, 1500));
  await screenshot('live_02_started.png');

  // Check state at T=0/1s
  let liveState = await evaluate(`
    (() => {
      // Find all HUD elements
      const elements = Array.from(document.querySelectorAll('*'));
      const textNodes = elements.filter(e => e.children.length === 0 && e.innerText);
      const popEl = document.querySelector('[id*="pop"], [class*="pop"]');
      return {
        bodyTextSummary: document.body.innerText.split('\\n').filter(s => s.trim().length > 0).slice(0, 15),
        canvas: !!document.querySelector('canvas')
      };
    })()
  `);
  console.log('Live state summary:', liveState);

  // Test Globe Drag (dispatch mouse events on canvas)
  console.log('Testing Globe Drag...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + 50, clientY: cy + 20, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 50, clientY: cy + 20 }));
      return true;
    })()
  `);

  // Wait 5 seconds to observe early pacing
  console.log('Waiting 5 seconds to measure early pacing...');
  await new Promise(r => setTimeout(r, 5000));
  await screenshot('live_03_t5s.png');

  // Test human expansion: double click near canvas center
  console.log('Testing human FOCUS expansion click...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Click to select/preview
      canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy }));
      // Double click to execute
      canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: cx, clientY: cy }));
      return true;
    })()
  `);

  await new Promise(r => setTimeout(r, 3000));
  await screenshot('live_04_after_expansion.png');

  // Test Flat / Globe toggle
  console.log('Testing Flat view toggle...');
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const flatBtn = buttons.find(b => b.innerText.includes('FLAT'));
      if (flatBtn) flatBtn.click();
    })()
  `);

  await new Promise(r => setTimeout(r, 1500));
  await screenshot('live_05_flat_view.png');

  // Test Flat Pan
  console.log('Testing Flat pan...');
  await evaluate(`
    (() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx - 100, clientY: cy, buttons: 1 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx - 100, clientY: cy }));
      return true;
    })()
  `);

  await new Promise(r => setTimeout(r, 1500));
  await screenshot('live_06_flat_panned.png');

  console.log('All tests executed successfully!');
  ws.close();
}

run().catch(e => { console.error(e); process.exit(1); });
