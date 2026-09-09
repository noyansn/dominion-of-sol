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

  // 1. Click card
  const cardResult = await evaluate(`
    (() => {
      const card = document.querySelector('.warroom-world-card');
      if (card) {
        card.click();
        return 'Card clicked: ' + card.className;
      }
      return 'No .warroom-world-card';
    })()
  `);
  console.log(cardResult);

  await new Promise(r => setTimeout(r, 400));

  // 2. Click primary action
  const primaryResult = await evaluate(`
    (() => {
      const btn = document.getElementById('btn-warroom-primary-action');
      if (btn && !btn.disabled) {
        btn.click();
        return 'Primary action clicked: ' + btn.innerText;
      }
      return 'Primary button disabled or missing: ' + (btn?.innerText || 'null');
    })()
  `);
  console.log(primaryResult);

  // Wait 3s for world entry
  await new Promise(r => setTimeout(r, 3000));

  // Check if player ready button exists
  const readyResult = await evaluate(`
    (() => {
      const btn = document.getElementById('btn-player-ready');
      if (btn) {
        btn.click();
        return 'Player ready clicked!';
      }
      const allBtns = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
      return 'Player ready not found, all buttons: ' + allBtns.join(', ');
    })()
  `);
  console.log(readyResult);

  await new Promise(r => setTimeout(r, 1000));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('qa_screenshots/live_08_in_realm.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved qa_screenshots/live_08_in_realm.png');

  ws.close();
}

main().catch(console.error);
