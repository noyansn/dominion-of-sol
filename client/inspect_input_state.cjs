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
  if (!tab) {
    console.error('No game tab found!');
    process.exit(1);
  }

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
      const rend = window.__DOMINION_RENDERER__;
      return {
        modalOpen: window.__DOMINION_MODAL_OPEN__,
        uiState: window.__DOMINION_UI_STATE__,
        productMode: window.__DOMINION_PRODUCT_MODE__,
        matchId: window.__DOMINION_MATCH_ID__,
        isGlobeMode: rend ? rend.isGlobeMode : null,
        inputGlobeMode: rend && rend.inputController ? rend.inputController.globeMode : null,
        yaw: rend && rend.globe ? rend.globe.yaw : null,
        pitch: rend && rend.globe ? rend.globe.pitch : null,
        morph: rend && rend.globe ? rend.globe.getMorph() : null,
        selectionVisible: rend && rend.selection ? rend.selection.container.visible : null,
        selectionParent: rend && rend.selection ? rend.selection.container.parent?.label : null,
        selectionSelectedTarget: window.gameState ? window.gameState.selectedTargetCell : null,
        selectionContext: window.gameState ? window.gameState.selectionContext : null,
      };
    })()`,
    returnByValue: true
  });

  console.log('INPUT INSPECT RESULT:', JSON.stringify(res.result.value, null, 2));

  // Force globe mode to test globe dragging
  await call('Runtime.evaluate', {
    expression: `window.__DOMINION_RENDERER__.setGlobeMode(true)`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 200));

  const initialRot = await call('Runtime.evaluate', {
    expression: `(() => {
      const rend = window.__DOMINION_RENDERER__;
      return {
        isGlobeMode: rend.isGlobeMode,
        inputGlobeMode: rend.inputController.globeMode,
        yaw: rend.globe.yaw,
        pitch: rend.globe.pitch
      };
    })()`,
    returnByValue: true
  });
  console.log('State before drag in globe mode:', initialRot.result.value);

  await call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 800,
    y: 400,
    button: 'left',
    buttons: 1,
    clickCount: 1
  });

  for (let i = 1; i <= 10; i++) {
    await call('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 800 + i * 10,
      y: 400,
      buttons: 1
    });
    await new Promise(r => setTimeout(r, 16));
  }

  await call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 900,
    y: 400,
    button: 'left',
    buttons: 0,
    clickCount: 1
  });

  await new Promise(r => setTimeout(r, 100));

  const afterDragRot = await call('Runtime.evaluate', {
    expression: `[window.__DOMINION_RENDERER__.globe.yaw, window.__DOMINION_RENDERER__.globe.pitch]`,
    returnByValue: true
  });
  console.log('Rotation after drag:', afterDragRot.result.value);

  ws.close();
}

main().catch(console.error);
