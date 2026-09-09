import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const port = Number(process.argv[2] || 9222);
const view = String(process.argv[3] || 'WORLD').toUpperCase();
const preserveState = String(process.argv[4] || '').toLowerCase() === 'preserve';
const pagePrefix = String(process.argv[5] || 'http://localhost:5173');
const profilingMode = String(process.argv[6] || 'on').toLowerCase();
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(target => target.type === 'page' && target.url.startsWith(pagePrefix));
if (!page) throw new Error(`No page target for ${pagePrefix} on CDP port ${port}`);

const ws = new WebSocket(page.webSocketDebuggerUrl);
let sequence = 1;
const pending = new Map();
const events = [];
ws.on('message', raw => {
  const message = JSON.parse(raw.toString());
  if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled') {
    events.push(message);
  }
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message);
  }
});
await new Promise((resolve, reject) => {
  ws.once('open', resolve);
  ws.once('error', reject);
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = sequence++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression, awaitPromise = false) {
  const response = await command('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  return response.result?.result;
}

await command('Runtime.enable');
await command('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
await command('Page.bringToFront').catch(() => {});
if (!preserveState) {
  await command('Page.reload', { ignoreCache: true });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const ready = await evaluate('Boolean(window.__DOMINION_BENCHMARK__ && window.__DOMINION_GAME_STATE__?.isInitialized)');
    if (ready?.value === true) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
} else {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

const before = await evaluate(`JSON.stringify({
  visibility: document.visibilityState,
  focus: document.hasFocus(),
  benchmark: !!window.__DOMINION_BENCHMARK__,
  running: window.__DOMINION_BENCHMARK__?.running,
  state: (() => {
    const state = window.__DOMINION_GAME_STATE__;
    const fronts = state?.fronts instanceof Map ? [...state.fronts.values()] : [];
    return {
      connected: state?.isConnected,
      initialized: state?.isInitialized,
      factions: state?.factions instanceof Map ? state.factions.size : 0,
      activeFronts: fronts.filter(front => front.isCombatActive).map(front => ({
        frontId: front.frontId,
        attackerFaction: front.attackerFaction,
        factionA: front.factionA,
        factionB: front.factionB,
        sourceCellIndex: front.sourceCellIndex,
        targetCellIndex: front.targetCellIndex,
        centroidX: front.centroidX,
        centroidY: front.centroidY,
        operationKind: front.operationKind,
      })),
    };
  })(),
})`);
await evaluate(`(()=>{
  const enabled = ${JSON.stringify(profilingMode !== 'off')};
  window.__DOMINION_FRAME_PROFILING_ENABLED__ = enabled;
  window.__DOMINION_PRESENTATION_PROFILE_ENABLED__ = enabled;
  window.__DOMINION_PRESENTATION_TELEMETRY_ENABLED__ = false;
  return enabled;
})()`);
const raf = await evaluate(`Promise.race([
  new Promise(resolve => requestAnimationFrame(now => resolve(JSON.stringify({ ok: true, now })))),
  new Promise(resolve => setTimeout(() => resolve(JSON.stringify({ ok: false, timeout: true })), 1200)),
])`, true);
const camera = await evaluate(`(()=>{
  const renderer = window.__DOMINION_RENDERER__;
  if (!renderer) return 'renderer-missing';
  renderer.setGlobeMode(false);
  const views = {
    WORLD: null,
    REGIONAL: { x: 540, y: 145, scale: 10 },
    CLOSE: { x: 612, y: 145, scale: 30 },
    WARFARE: { x: 612, y: 145, scale: 30 },
  };
  const liveFront = ${JSON.stringify(view)} === 'WARFARE'
    ? [...(window.__DOMINION_GAME_STATE__?.fronts?.values?.() || [])].find(front => front.isCombatActive)
    : null;
  const target = liveFront
    ? { x: liveFront.centroidX, y: liveFront.centroidY, scale: 30 }
    : (views[${JSON.stringify(view)}] || views.WORLD);
  if (!target) renderer.fitWorldToScreen();
  else {
    renderer.worldContainer.scale.set(target.scale);
    renderer.worldContainer.x = innerWidth * 0.5 - target.x * target.scale;
    renderer.worldContainer.y = innerHeight * 0.5 - target.y * target.scale;
    renderer.updateScreenSpaceOverlays();
  }
  return JSON.stringify({ view: ${JSON.stringify(view)}, cameraScale: renderer.worldContainer.scale.x, liveFront: liveFront ? { frontId: liveFront.frontId, attackerFaction: liveFront.attackerFaction, factionA: liveFront.factionA, factionB: liveFront.factionB, centroidX: liveFront.centroidX, centroidY: liveFront.centroidY } : null });
})()`);
await new Promise(resolve => setTimeout(resolve, 2500));
const started = await evaluate(`(()=>{
  window.__dominionProbeErrors = [];
  window.addEventListener('error', event => window.__dominionProbeErrors.push(String(event.error || event.message)));
  window.addEventListener('unhandledrejection', event => window.__dominionProbeErrors.push(String(event.reason)));
  try { window.__DOMINION_BENCHMARK__.start(10000); return 'started'; }
  catch (error) { return String(error); }
})()`);

const samples = [];
for (let i = 0; i < 15; i += 1) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const state = await evaluate(`JSON.stringify({
    t: performance.now(),
    visibility: document.visibilityState,
    running: window.__DOMINION_BENCHMARK__?.running,
    errors: window.__dominionProbeErrors || [],
  })`);
  samples.push(state?.value ?? null);
}

const output = await evaluate(`document.querySelector('[data-benchmark-output]')?.value || ''`);
console.log(JSON.stringify({ port, view, before: before?.value, raf: raf?.value, camera: camera?.value, started: started?.value, benchmark: output?.value || null, samples, eventCount: events.length }, null, 2));
ws.close();
