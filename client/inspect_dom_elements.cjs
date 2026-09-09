const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const tab = tabs.find(t => t.title.includes('Dominion of Sol') || t.url.includes('5174'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let reqId = 1;
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (msg) => {
        const res = JSON.parse(msg);
        if (res.id === id) {
          ws.off('message', handler);
          if (res.error) reject(res.error);
          else resolve(res.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const res = await call('Runtime.evaluate', {
    expression: `(() => {
      const pts = [
        [800, 400],
        [400, 300],
        [900, 500],
        [100, 100],
        [864, 432]
      ];
      return pts.map(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return {
          point: [x, y],
          tag: el ? el.tagName : null,
          id: el ? el.id : null,
          className: el ? el.className : null,
          pointerEvents: el ? window.getComputedStyle(el).pointerEvents : null
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('ELEMENTS AT POINTS:', JSON.stringify(res.result.value, null, 2));

  const canvasInfo = await call('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('canvas');
      const cs = window.getComputedStyle(canvas);
      return {
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        pointerEvents: cs.pointerEvents,
        touchAction: cs.touchAction,
        zIndex: cs.zIndex
      };
    })()`,
    returnByValue: true
  });
  console.log('CANVAS INFO:', canvasInfo.result.value);

  ws.close();
}

main().catch(console.error);
