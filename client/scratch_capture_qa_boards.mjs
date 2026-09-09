import WebSocket from 'file:///C:/Users/noyan/Downloads/game/node_modules/ws/wrapper.mjs';
import fs from 'fs';
import { spawn } from 'child_process';

const ARTIFACTS_DIR = 'C:/Users/noyan/.gemini/antigravity-ide/brain/6d22f0d8-3c9b-43c4-a7e7-ee6fa9ded18d';

async function main() {
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--remote-debugging-port=9226',
    '--window-size=1600,1000',
    '--hide-scrollbars',
    'http://127.0.0.1:5174/'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9226/json/list');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No page tab found');

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

    // Wait for page to finish loading and Pixi to boot
    await new Promise(r => setTimeout(r, 3500));

    async function evaluate(fnStr) {
      return await send('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        awaitPromise: true
      });
    }

    async function capture(filename) {
      await new Promise(r => setTimeout(r, 600));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`${ARTIFACTS_DIR}/${filename}`, Buffer.from(shot.data, 'base64'));
      console.log(`Captured ${filename}`);
    }

    // BOARD A: Featured — selected TÜRK
    await evaluate(`async () => {
      const acc = window.__DOMINION_SERVICES__?.accountService || window.accountService;
      const armory = window.__SOVEREIGN_ARMORY__;
      if (acc) acc.setFavoriteCivilization('turk');
      if (armory) {
        armory.close();
        armory.open('FEATURED');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_A_featured_turk.png');

    // BOARD B: Featured — selected ROMA
    await evaluate(`async () => {
      const acc = window.__DOMINION_SERVICES__?.accountService || window.accountService;
      const armory = window.__SOVEREIGN_ARMORY__;
      if (acc) acc.setFavoriteCivilization('roma');
      if (armory) {
        armory.close();
        armory.open('FEATURED');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_B_featured_roma.png');

    // BOARD C: Featured — selected PERS
    await evaluate(`async () => {
      const acc = window.__DOMINION_SERVICES__?.accountService || window.accountService;
      const armory = window.__SOVEREIGN_ARMORY__;
      if (acc) acc.setFavoriteCivilization('pers');
      if (armory) {
        armory.close();
        armory.open('FEATURED');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_C_featured_pers.png');

    // BOARD D: Featured — selected HAN
    await evaluate(`async () => {
      const acc = window.__DOMINION_SERVICES__?.accountService || window.accountService;
      const armory = window.__SOVEREIGN_ARMORY__;
      if (acc) acc.setFavoriteCivilization('han');
      if (armory) {
        armory.close();
        armory.open('FEATURED');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_D_featured_han.png');

    // BOARD E: $0.49 Entry Ladder (Command Blades Tab with Price Anchor Row)
    await evaluate(`async () => {
      const armory = window.__SOVEREIGN_ARMORY__;
      if (armory) {
        armory.closePreview();
        armory.open('BLADES');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_E_blades_pricing_ladder.png');

    // BOARD F: $9.99 Masterwork Presentation (DAMASCUS, HORN, GILT windows + Try on HUD)
    await evaluate(`async () => {
      const armory = window.__SOVEREIGN_ARMORY__;
      if (armory) {
        armory.openPreview('dominion.blade.imperial01');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_F_masterwork_presentation.png');

    // BOARD G: 20-Expression Reaction Pack Preview (Hero ~120px, 1/20 counter, Cycle controls)
    await evaluate(`async () => {
      const armory = window.__SOVEREIGN_ARMORY__;
      if (armory) {
        armory.closePreview();
        armory.openPreview('dominion.reactions.turk.court01');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_G_reaction_pack_preview.png');

    // BOARD H: TRY IN WHEEL (In-modal 8-slot radial wheel preview overlay)
    await evaluate(`async () => {
      const armory = window.__SOVEREIGN_ARMORY__;
      if (armory) {
        armory.close();
        armory.openPreview('dominion.reactions.turk.court01');
      }
      await new Promise(r => setTimeout(r, 500));
      const tryBtn = document.getElementById('btn-prev-try-wheel');
      if (tryBtn) tryBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_H_try_in_wheel.png');

    // Close Wheel Preview Overlay
    await evaluate(`async () => {
      const closeBtn = document.getElementById('btn-close-wheel-prev');
      if (closeBtn) closeBtn.click();
      const armory = window.__SOVEREIGN_ARMORY__;
      if (armory) armory.closePreview();
      await new Promise(r => setTimeout(r, 400));
    }`);

    // BOARD I: Purchase Success & Instant Equip Dialog (ADDED TO YOUR ARMORY)
    await evaluate(`async () => {
      const armory = window.__SOVEREIGN_ARMORY__;
      const cat = window.__DOMINION_SERVICES__?.catalogService || window.catalogService;
      if (armory && cat) {
        armory.open('BLADES');
        const prod = cat.getProduct('dominion.blade.imperial01');
        if (prod) armory.showInstantEquipModal(prod);
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_I_purchase_instant_equip.png');

    // Close Instant Equip Dialog
    await evaluate(`async () => {
      const closeBtn = document.getElementById('btn-instant-equip-continue');
      if (closeBtn) closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }`);

    // BOARD J: Equipped Reaction in Combat Radial Wheel
    await evaluate(`async () => {
      const ent = window.__DOMINION_SERVICES__?.entitlementService || window.entitlementService;
      const wheel = window.__DOMINION_REACTION_WHEEL__;
      const armory = window.__SOVEREIGN_ARMORY__;
      const sm = window.__DOMINION_UI_STATE_MANAGER__;
      if (armory) armory.close();
      if (sm) sm.setState('IN_GAME_STATE');
      if (ent) ent.equipReactionSlot(0, 'rx_turk_pasha_laugh');
      if (wheel) wheel.openWheel();
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_J_match_wheel_equipped.png');

    // Close Reaction Wheel and return to HOME
    await evaluate(`async () => {
      const wheel = window.__DOMINION_REACTION_WHEEL__;
      const sm = window.__DOMINION_UI_STATE_MANAGER__;
      if (wheel) wheel.closeWheel();
      if (sm) sm.setState('HOME_STATE');
      await new Promise(r => setTimeout(r, 400));
    }`);

    // BOARD K: Collection Progress After Purchase ("YOUR TÜRK COLLECTION 6 / 23")
    await evaluate(`async () => {
      const ent = window.__DOMINION_SERVICES__?.entitlementService || window.entitlementService;
      const acc = window.__DOMINION_SERVICES__?.accountService || window.accountService;
      const armory = window.__SOVEREIGN_ARMORY__;
      if (acc) acc.setFavoriteCivilization('turk');
      if (ent) {
        ent.grantSku('dominion.blade.solar01');
        ent.grantSku('dominion.reactions.turk.court01');
      }
      if (armory) {
        armory.close();
        armory.open('FEATURED');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_K_collection_progress.png');

    // BOARD L: Regional Price Tier Mock (USD 1.0x, EU 0.92x, TR 0.40x natural pricing)
    await evaluate(`async () => {
      const armory = window.__SOVEREIGN_ARMORY__;
      const cat = window.__DOMINION_SERVICES__?.catalogService || window.catalogService;
      const rps = window.__DOMINION_SERVICES__?.regionalPricingService || window.regionalPricingService;
      if (cat) cat.setRegion('TR');
      if (rps) rps.setRegion('TR');
      if (armory) {
        armory.close();
        armory.open('BLADES');
      }
      await new Promise(r => setTimeout(r, 600));
    }`);
    await capture('board_L_regional_tier_tr_040.png');

    // SECTION 51: REACTION MICRO-AUDIT BOARD (Color + Monochrome Silhouettes)
    await send('Page.navigate', {
      url: 'file:///C:/Users/noyan/.gemini/antigravity-ide/brain/6d22f0d8-3c9b-43c4-a7e7-ee6fa9ded18d/scratch/reaction_micro_audit.html'
    });
    await new Promise(r => setTimeout(r, 1500));
    await capture('board_section51_micro_audit_turk_roma.png');

    // Scroll down to capture more civs
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1100)' });
    await new Promise(r => setTimeout(r, 500));
    await capture('board_section51_micro_audit_pers_misir.png');

    console.log('All QA boards A-L captured successfully!');
    ws.close();
  } finally {
    chromeProc.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
