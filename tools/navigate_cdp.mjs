import WebSocket from 'ws';

const port = Number(process.argv[2] || 9222);
const url = process.argv[3] || 'http://127.0.0.1:5173/';
const targetId = process.argv[4] || '';
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(target => target.type === 'page' && target.id === targetId)
  || targets.find(target => target.type === 'page' && target.url.includes('5173'))
  || targets.find(target => target.type === 'page');
if (!page) throw new Error('No page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const commandId = ++id;
  const onMessage = raw => {
    const message = JSON.parse(raw.toString());
    if (message.id !== commandId) return;
    ws.off('message', onMessage);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message);
  };
  ws.on('message', onMessage);
  ws.send(JSON.stringify({ id: commandId, method, params }));
});
await command('Page.navigate', { url });
console.log(JSON.stringify({ url, target: page.url }));
ws.close();
