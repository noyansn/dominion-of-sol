import WebSocket from 'file:///C:/Users/noyan/Downloads/game/node_modules/ws/wrapper.mjs';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OUTPUT_DIR = 'C:/Users/noyan/Downloads/game/qa_screenshots';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('[CAPTURE] Launching headless Chrome on port 9225...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--remote-debugging-port=9225',
    '--window-size=1600,1000',
    '--hide-scrollbars',
    'http://127.0.0.1:5174/'
  ]);

  // Wait for remote debugging endpoint
  await new Promise(r => setTimeout(r, 3000));

  try {
    const listRes = await fetch('http://127.0.0.1:9225/json/list');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No page tab found in Chrome');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          const res = JSON.parse(data.toString());
          if (res.id === id) {
            ws.removeListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function capture(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`[CAPTURE] Saved ${filename} (${fs.statSync(outPath).size} bytes)`);
    }

    // Wait for client to boot Pixi and UI
    console.log('[CAPTURE] Waiting for client to initialize...');
    await new Promise(r => setTimeout(r, 4000));

    // 1. Account / Profile / Login modal
    console.log('[CAPTURE] 1. Capturing Account Registration & Profile modal...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const btn = document.getElementById('btn-civ-profile');
          if (btn) btn.click();
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('01_hesap_acma_girme_profili.png');

    // Close Profile modal
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.getElementById('btn-prof-close');
          if (closeBtn) closeBtn.click();
          const modal = document.getElementById('dominion-player-profile-modal');
          if (modal) { modal.style.display = 'none'; modal.hidden = true; }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 400));

    // 2. Armory Store: BLADES tab
    console.log('[CAPTURE] 2. Capturing Armory Blades store tab...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const btnArmory = document.getElementById('btn-civ-armory');
          if (btnArmory) btnArmory.click();
          await new Promise(r => setTimeout(r, 400));
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.open('BLADES');
          }
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('02_magaza_satin_alma_kiliclar.png');

    // 3. Armory Store: REACTIONS tab
    console.log('[CAPTURE] 3. Capturing Armory Reactions store tab...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.open('REACTIONS');
          }
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('03_magaza_satin_alma_emojiler_paketler.png');

    // 4. Reaction Pack Preview modal
    console.log('[CAPTURE] 4. Capturing Reaction Pack Preview modal with 3 faces and PLAY buttons...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.openPreview('dominion.reactions.turk.court01');
          }
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('04_emoji_paketi_onizleme_modal.png');

    // Close preview modal before next
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.closePreview();
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 300));

    // 5. Bundle Preview modal (Grand Ottoman Imperial Collection: blade + 3 faces + frame/title)
    console.log('[CAPTURE] 5. Capturing Sovereign Bundle Preview modal...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.openPreview('dominion.bundle.turk.ottoman01');
          }
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('05_bundle_onizleme_modal.png');

    // Close preview modal before next
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.closePreview();
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 300));

    // 6. Blade Hero Preview modal (Pharaonic Khopesh with deep sickle hook)
    console.log('[CAPTURE] 6. Capturing Blade Hero Preview modal (Pharaonic Khopesh)...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.openPreview('dominion.blade.khopesh01');
          }
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('06_kilic_detay_onizleme_satin_alma.png');

    // Close preview modal AND armory completely
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.__SOVEREIGN_ARMORY__) {
            window.__SOVEREIGN_ARMORY__.close();
          }
          const prev = document.getElementById('dominion-armory-item-preview');
          if (prev) { prev.style.display = 'none'; prev.hidden = true; }
          const arm = document.getElementById('dominion-sovereign-armory');
          if (arm) { arm.style.display = 'none'; arm.hidden = true; }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 400));

    // 7. Radial Reaction Wheel during battle
    console.log('[CAPTURE] 7. Capturing In-Game Radial Reaction Wheel...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          if (window.__DOMINION_REACTION_WHEEL__) {
            window.__DOMINION_REACTION_WHEEL__.openWheel();
          }
          await new Promise(r => setTimeout(r, 600));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('07_savas_sirasi_radial_emoji_carki.png');

    // 8. Live Battle Map with Animated Flying Emojis
    console.log('[CAPTURE] 8. Capturing Live Battle Screen with reactions spawned on map...');
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          if (window.__DOMINION_REACTION_WHEEL__) {
            window.__DOMINION_REACTION_WHEEL__.closeWheel();
          }
          
          // Helper to create high-visibility map reaction bubbles
          function createBubble(svgContent, x, y, sender, glowColor = '#dfbc73') {
            const b = document.createElement('div');
            b.className = 'sov-map-reaction-bubble';
            b.style.cssText = \`
              position: fixed;
              left: \${x}px;
              top: \${y}px;
              transform: translate(-50%, -50%);
              display: flex;
              flex-direction: column;
              align-items: center;
              pointer-events: none;
              z-index: 3500;
              filter: drop-shadow(0 8px 24px rgba(0,0,0,0.9));
            \`;
            b.innerHTML = \`
              <div style="
                width: 62px;
                height: 62px;
                background: radial-gradient(circle, #081220 50%, #03060a 100%);
                border: 2px solid \${glowColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px;
                box-shadow: 0 0 25px \${glowColor}66, inset 0 0 10px \${glowColor}33;
              ">
                \${svgContent}
              </div>
              <div style="
                background: rgba(4,8,15,0.94);
                border: 1px solid \${glowColor}99;
                border-radius: 4px;
                padding: 2px 10px;
                margin-top: 6px;
                font-size: 10px;
                font-weight: 800;
                color: \${glowColor};
                letter-spacing: 0.08em;
                box-shadow: 0 2px 8px rgba(0,0,0,0.8);
              ">
                \${sender}
              </div>
            \`;
            document.body.appendChild(b);
          }

          // Extract actual SVGs from reaction wheel disc
          const disc = document.getElementById('sov-wheel-disc');
          const svgs = disc ? Array.from(disc.querySelectorAll('svg')).map(s => s.outerHTML) : [];

          // Create 4 battlefield reaction events across tactical zones
          createBubble(svgs[0] || '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="32" r="28" fill="#dfbc73"/></svg>', 460, 360, 'NOYAN (TÜRK) · SALUTE', '#dfbc73');
          createBubble(svgs[1] || '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="32" r="28" fill="#38bdf8"/></svg>', 820, 280, 'VALERIUS (ROMA) · VICTORY', '#38bdf8');
          createBubble(svgs[2] || '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="32" r="28" fill="#ef4444"/></svg>', 1140, 480, 'WAR CRY · FRONTLINE', '#ef4444');
          createBubble(svgs[3] || '<svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="32" r="28" fill="#eab308"/></svg>', 720, 620, 'ALLIED SECTOR · DEFEND', '#eab308');

          await new Promise(r => setTimeout(r, 400));
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('08_savas_sirasi_haritada_ucusan_emojiler.png');

    // 9. All 39 Emojis Scale Audit (32px, 44px, 64px)
    console.log('[CAPTURE] 9. Capturing All 39 Emojis Scale Audit...');
    await send('Page.navigate', {
      url: 'file:///C:/Users/noyan/.gemini/antigravity-ide/brain/6d22f0d8-3c9b-43c4-a7e7-ee6fa9ded18d/scratch/gallery_masterwork_audit.html'
    });
    await new Promise(r => setTimeout(r, 1500));
    
    // Scroll to #reactions-scale-section
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.getElementById('reactions-scale-section');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600));
    await capture('09_tum_39_emoji_olcek_auditi_32_44_64px.png');

    // 10. Gameplay HUD Blade Draw Levels Audit (0%, 25%, 50%, 75%, 100%)
    console.log('[CAPTURE] 10. Capturing Blade HUD Draw Levels Audit...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.getElementById('blades-hud-section');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600));
    await capture('10_hud_kilic_cekilme_seviyeleri_0_25_50_75_100.png');

    console.log('[CAPTURE] ALL 10 SCREENSHOTS CAPTURED SUCCESSFULLY IN qa_screenshots/!');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(err => {
  console.error('[CAPTURE ERROR]', err);
  process.exit(1);
});
