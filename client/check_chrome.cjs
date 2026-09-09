const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let d = ''; res.on('data', c => d += c); res.on('end', async () => {
    const list = JSON.parse(d);
    const p = list.find(x => x.url.includes('5174') || x.title.includes('Dominion'));
    const ws = new WebSocket(p.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 4, method: 'Page.reload' }));
    });
    ws.on('message', m => {
      const data = JSON.parse(m.toString());
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map(a => a.value || a.description || '').join(' ');
        console.log(`[CONSOLE ${data.params.type}]`, text);
      } else if (data.method === 'Log.entryAdded') {
        console.log(`[LOG ${data.params.entry.level}]`, data.params.entry.text);
      } else if (data.method === 'Runtime.exceptionThrown') {
        console.log('[EXCEPTION]', data.params.exceptionDetails);
      }
    });
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          expression: `JSON.stringify({
            hasGs: !!window.gameState,
            hasGc: !!window.__DOMINION_GAME_CLIENT__,
            hasCiv: !!window.__DOMINION_CIVILIZATION_SELECTOR__,
            hasRend: !!window.dominionRenderer,
            telemetry: window.__DEV_BOOT_TELEMETRY__,
          })`,
          returnByValue: true
        }
      }));
    }, 4000);
    setTimeout(() => process.exit(0), 5000);
  });
});
