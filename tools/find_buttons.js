const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/04196A58C0633499D2B12B35D4EB453E');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `Array.from(document.querySelectorAll('*')).filter(el => el.children.length === 0 && el.innerText && (el.innerText.includes('ROMA') || el.innerText.includes('CONTINUE'))).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        text: el.innerText,
        parentId: el.parentElement?.id,
        parentClass: el.parentElement?.className
      }))`,
      returnByValue: true
    }
  }));
});
ws.on('message', (d) => {
  const msg = JSON.parse(d);
  if (msg.id === 1) {
    console.log(JSON.stringify(msg.result?.result?.value, null, 2));
    process.exit(0);
  }
});
