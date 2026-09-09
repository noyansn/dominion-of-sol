import WebSocket from 'ws';

const port = Number(process.argv[2] || 9222);
const targetId = process.argv[3];
if (!targetId) throw new Error('target id required');
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
const id = 1;
ws.send(JSON.stringify({ id, method: 'Target.activateTarget', params: { targetId } }));
await new Promise((resolve, reject) => {
  ws.on('message', raw => {
    const message = JSON.parse(raw.toString());
    if (message.id !== id) return;
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message);
  });
});
console.log(JSON.stringify({ targetId, activated: true }));
ws.close();
