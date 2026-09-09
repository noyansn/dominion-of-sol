const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const path = require('path');

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', async () => {
    try {
      const list = JSON.parse(d);
      const page = list.find(t => t.type === 'page' && t.url.includes('5173')) || list.find(t => t.type === 'page');
      if (!page) { console.error('No page found'); process.exit(1); }
      console.log('[CDP TARGET]', page.url, page.webSocketDebuggerUrl);
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise(r => ws.on('open', r));
      let id = 1;
      function send(method, params = {}) {
        return new Promise((resolve) => {
          const msgId = id++;
          const onMsg = (data) => {
            const m = JSON.parse(data);
            if (m.id === msgId) {
              ws.off('message', onMsg);
              resolve(m.result);
            }
          };
          ws.on('message', onMsg);
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });
      }
      console.log('[CDP] Navigating to http://localhost:5173/ ...');
      await send('Page.navigate', { url: 'http://localhost:5173/' });
      await new Promise(r => setTimeout(r, 4000));
      
      const expr = `({
        clientCommit: window.__DOMINION_CLIENT_COMMIT__,
        serverCommit: window.__DOMINION_BUILD_INFO__ ? window.__DOMINION_BUILD_INFO__.serverCommit : null,
        serverPid: window.__DOMINION_BUILD_INFO__ ? window.__DOMINION_BUILD_INFO__.serverPid : null,
        isMatch: window.__DOMINION_BUILD_MATCH__,
        badge: document.getElementById('dominion-dev-badge') ? document.getElementById('dominion-dev-badge').innerText : null
      })`;
      
      const evalRes = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true
      });
      console.log('[BROWSER EVAL]', evalRes.result ? evalRes.result.value : evalRes);
      
      const snap = await send('Page.captureScreenshot', { format: 'png' });
      if (snap && snap.data) {
        const outPath = path.join(__dirname, '..', 'artifacts', 'localhost_dev_runtime_verified.png');
        fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
        console.log('[SAVED]', outPath);
      }
      ws.close();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
});
