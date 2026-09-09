const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/04196A58C0633499D2B12B35D4EB453E');
  
  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.on('open', async () => {
    console.log('Connected to CDP');
    try {
      // 1. Evaluate game state
      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const hudPop = document.getElementById('hud-population')?.textContent;
            const hudRate = document.getElementById('hud-pop-growth')?.textContent;
            const hudLand = document.getElementById('hud-land-area')?.textContent;
            const factionName = document.getElementById('hud-faction-name')?.textContent;
            const attackPercent = document.getElementById('attack-percent')?.textContent;
            const attackPopReadout = document.getElementById('attack-population-readout')?.textContent;
            
            // Check window.gameState or similar if exposed
            const gs = window.gameState;
            let internal = null;
            if (gs) {
              const myFaction = gs.factions.get(gs.yourFactionId);
              internal = {
                yourFactionId: gs.yourFactionId,
                population: myFaction?.population,
                growthPerSecond: myFaction?.growthPerSecond,
                cells: myFaction?.cellCount,
                landAreaKm2: myFaction?.landAreaKm2,
                factionsCount: gs.factions.size,
                phase: gs.lifecyclePhase
              };
            }
            return {
              hud: { factionName, hudPop, hudRate, hudLand, attackPercent, attackPopReadout },
              internal
            };
          })()
        `,
        returnByValue: true
      });

      console.log('DOM & HUD State:', JSON.stringify(evalRes.result.value, null, 2));

      // 2. Capture screenshot via Page.captureScreenshot
      const shotRes = await send('Page.captureScreenshot', { format: 'png' });
      if (shotRes.result?.data) {
        fs.writeFileSync('qa_screenshots/live_verify_10k.png', Buffer.from(shotRes.result.data, 'base64'));
        console.log('Saved qa_screenshots/live_verify_10k.png');
      }

      ws.close();
      process.exit(0);
    } catch (e) {
      console.error(e);
      ws.close();
      process.exit(1);
    }
  });

  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data);
    }
  });
}

main().catch(console.error);
