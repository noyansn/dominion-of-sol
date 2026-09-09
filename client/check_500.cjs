const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    const list = JSON.parse(d);
    const p = list.find(x => x.url.includes('5174') || x.title.includes('Dominion'));
    const ws = new WebSocket(p.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Page.reload' }));
    });
    ws.on('message', m => {
      const data = JSON.parse(m.toString());
      if (data.method === 'Network.responseReceived') {
        const resp = data.params.response;
        if (resp.status >= 400) {
          console.log(`[HTTP ${resp.status}]`, resp.url);
        }
      }
    });
    setTimeout(() => process.exit(0), 4000);
  });
});
