import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const state = read('src/game/GameState.ts');
const client = read('src/game/GameClient.ts');
const command = read('src/ui/CommandUI.ts');
const attack = read('src/ui/AttackPanel.ts');
const input = read('src/render/WorldInputController.ts');
const resolver = read('src/game/TargetResolver.ts');
const html = read('index.html');

assert.match(state, /public attackLegality\(/);
assert.match(state, /public expansionLegality\(/);
assert.match(state, /public checkNeutralAdjacency\(/);
assert.match(client, /public sendAttack\(/);
assert.match(client, /public sendCancelAttack\(/);
assert.match(client, /public sendExpand\(/);
assert.match(client, /attack_result/);
assert.match(client, /reconnectTimer/);
assert.match(client, /readyState === WebSocket\.OPEN/);
assert.match(command, /btn-expand-frontier/);
assert.match(command, /gameClient\.sendExpand/);
assert.match(attack, /gameClient\.sendCancelAttack/);
assert.match(attack, /gameState\.attackLegality/);
assert.match(input, /onFlatPick/);
assert.match(input, /onFlatHover/);
assert.match(resolver, /ADJACENT_NEUTRAL/);
assert.match(resolver, /REMOTE_HOSTILE/);
assert.doesNotMatch(html, /Select one of your territories to begin command/);
assert.doesNotMatch(html, /then an exact adjacent enemy/);

console.log('PASS: selection, legal attack, expansion, cancellation, and authoritative result contract');
