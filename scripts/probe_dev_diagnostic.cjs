const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8765');
const timeout = setTimeout(() => {
  console.error(JSON.stringify({ error: 'timeout waiting for dev_diagnostic' }));
  process.exit(1);
}, 4000);

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'dev_diagnostic' }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'dev_diagnostic') {
      clearTimeout(timeout);
      console.log(JSON.stringify(msg));
      ws.close();
      process.exit(0);
    }
  } catch (err) {
    clearTimeout(timeout);
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
});

ws.on('error', (err) => {
  clearTimeout(timeout);
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
