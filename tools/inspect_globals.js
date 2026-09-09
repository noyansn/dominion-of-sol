const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/04196A58C0633499D2B12B35D4EB453E');
ws.on('open', async () => {
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1e9);
    const handler = (d) => {
      const m = JSON.parse(d);
      if (m.id === id) { ws.off('message', handler); resolve(m.result); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const res = await send('Runtime.evaluate', {
    expression: `Object.keys(window).filter(k => k.toLowerCase().includes('dominion') || k.toLowerCase().includes('game') || k.toLowerCase().includes('render'))`,
    returnByValue: true
  });
  console.log('Keys:', res?.result?.value);
  ws.close();
});
