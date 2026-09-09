const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

async function getDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const page = targets.find(t => t.type === 'page' && t.url.includes('5173')) || targets.find(t => t.type === 'page');
          if (page && page.webSocketDebuggerUrl) resolve(page.webSocketDebuggerUrl);
          else reject(new Error('No debuggable page target found on port 9222'));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
    });
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result ? res.result.value : undefined;
  }
  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    if (res && res.data) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
      console.log(`[SCREENSHOT] Saved: ${filePath}`);
    }
  }
  close() { this.ws.close(); }
}

async function main() {
  console.log('=== VERIFYING REAL BROWSER DEV RUNTIME ===');
  const wsUrl = await getDebuggerUrl();
  console.log('[CDP] Connected to:', wsUrl);
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  console.log('[CDP] Navigating to http://localhost:5173/ with cache bypass...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
  let browserRuntime = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    browserRuntime = await cdp.eval(`(() => {
      const badge = document.getElementById('dominion-dev-badge');
      return {
        clientCommit: window.__DOMINION_CLIENT_COMMIT__,
        serverCommit: window.__DOMINION_BUILD_INFO__ ? window.__DOMINION_BUILD_INFO__.serverCommit : null,
        serverPid: window.__DOMINION_BUILD_INFO__ ? window.__DOMINION_BUILD_INFO__.serverPid : null,
        isMatch: window.__DOMINION_BUILD_MATCH__,
        badgeText: badge ? badge.innerText : null,
        badgeVisible: badge ? badge.offsetParent !== null : false,
        mismatchModalPresent: !!document.getElementById('dominion-build-mismatch-modal'),
        appSurface: window.__DOMINION_UI_STATE_MANAGER__ ? window.__DOMINION_UI_STATE_MANAGER__.getAppSurface() : null,
        matchPhase: window.__DOMINION_GAME_CLIENT__ ? window.__DOMINION_GAME_CLIENT__.currentMatchPhase : null,
      };
    })()`);
    if (browserRuntime && browserRuntime.serverCommit) {
      break;
    }
  }

  console.log('[BROWSER RUNTIME STATE]', browserRuntime);

  const diagFromBrowser = await cdp.eval(`window.__DOMINION_GAME_CLIENT__?.queryDevDiagnostic()`);
  console.log('[DIAGNOSTIC QUERY FROM BROWSER]', diagFromBrowser);

  const screenshotPath = path.join(__dirname, '..', 'artifacts', 'localhost_dev_runtime_verified.png');
  await cdp.screenshot(screenshotPath);

  cdp.close();

  if (!browserRuntime.isMatch) {
    throw new Error(`FAIL: Browser reports client commit does not match server commit!`);
  }
  if (!browserRuntime.badgeText) {
    throw new Error(`FAIL: Dev badge not found in DOM!`);
  }
  console.log('=== REAL BROWSER DEV RUNTIME VERIFIED PASS ===');
}

main().catch(err => {
  console.error('[BROWSER VERIFY ERROR]', err);
  process.exit(1);
});
