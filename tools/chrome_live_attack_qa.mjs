import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const port = Number(process.argv[2] || 9224);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(target => target.type === 'page' && target.url.startsWith('http://localhost:5173'));
if (!page) throw new Error(`No localhost page target on CDP port ${port}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
let sequence = 1;
const pending = new Map();
ws.on('message', raw => {
  const message = JSON.parse(raw.toString());
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
  return response.result?.result?.value;
}

const result = await evaluate(`(async()=>{
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const state = window.__DOMINION_GAME_STATE__;
  const client = window.__DOMINION_GAME_CLIENT__;
  const findBorder = () => {
    const owners = state?.cellOwners;
    const width = state?.width || 1024;
    const height = state?.height || 512;
    if (!owners) return null;
    const candidates = [];
    for (let i = 0; i < owners.length; i += 1) {
      if (owners[i] !== 101) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      for (const neighbor of [y > 0 ? i - width : -1, x + 1 < width ? i + 1 : -1, y + 1 < height ? i + width : -1, x > 0 ? i - 1 : -1]) {
        if (neighbor >= 0 && owners[neighbor] > 0 && owners[neighbor] !== 101) {
          const faction = state.factions.get(owners[neighbor]);
          candidates.push({ source: i, target: neighbor, defender: owners[neighbor], population: faction?.population || 0 });
        }
      }
    }
    candidates.sort((a, b) => b.population - a.population);
    return candidates[0] || null;
  };
  const findNeutral = () => {
    const owners = state?.cellOwners;
    const width = state?.width || 1024;
    const height = state?.height || 512;
    if (!owners) return null;
    for (let i = 0; i < owners.length; i += 1) {
      if (owners[i] !== 101) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      for (const neighbor of [y > 0 ? i - width : -1, x + 1 < width ? i + 1 : -1, y + 1 < height ? i + width : -1, x > 0 ? i - 1 : -1]) {
        if (neighbor >= 0 && owners[neighbor] === 0) return neighbor;
      }
    }
    return null;
  };
  const actions = [];
  for (let i = 0; i < 18 && !findBorder(); i += 1) {
    const target = findNeutral();
    if (target === null) break;
    actions.push({ target, sent: client?.sendExpand(target) });
    await wait(500);
  }
  const border = findBorder();
  if (!border) return JSON.stringify({ error: 'no_legal_border', actions, playerCells: [...state.cellOwners].filter(owner => owner === 101).length });
  const sent = client?.sendAttack(border.source, border.target, 0.5);
  await wait(250);
  const attackResult = state.lastAttackResult;
  const accepted = attackResult?.accepted === true;
  const frontId = attackResult?.frontId;
  const front = frontId ? state.fronts.get(frontId) : null;
  return JSON.stringify({
    actions,
    border,
    sent,
    attackResult,
    acceptedFront: front ? {
      frontId: front.frontId,
      attackerFaction: front.attackerFaction,
      factionA: front.factionA,
      factionB: front.factionB,
      sourceCellIndex: front.sourceCellIndex,
      targetCellIndex: front.targetCellIndex,
      centroidX: front.centroidX,
      centroidY: front.centroidY,
      isCombatActive: front.isCombatActive,
      deployedPopulationA: front.deployedPopulationA,
      deployedPopulationB: front.deployedPopulationB,
      operationKind: front.operationKind,
      terminationReason: front.terminationReason,
    } : null,
  });
})()`, true);

console.log(result);
ws.close();
