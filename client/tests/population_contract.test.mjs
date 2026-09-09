import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const gameState = read('src/game/GameState.ts');
const gameClient = read('src/game/GameClient.ts');
const nationCreator = read('src/ui/NationCreator.ts');
const flagAtlas = read('src/ui/FlagAtlas.ts');
const index = read('index.html');
const warRenderer = read('src/render/WarRenderer.ts');

assert.match(gameState, /populationCommitPercent/);
assert.match(gameState, /totalLivingPopulation/);
assert.match(gameClient, /reinforce_front/);
assert.match(gameClient, /alliance_response/);
assert.match(nationCreator, /startCell/);
assert.match(nationCreator, /doctrine/);
assert.match(flagAtlas, /serializeDescriptor/);
assert.match(index, /id="nation-creator"/);
assert.doesNotMatch(warRenderer, /ATK|DEF/);
assert.doesNotMatch(index, /Army|Reserve|Available/);

console.log('PASS: client Population contract, custom nation flow, flag serialization, diplomacy response, and non-debug war labels');
