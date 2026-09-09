import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const css = read('src/ui/dominion.css');
assert.match(css, /#ui-shell > \.command-overlay\[data-open\]:not\(\[data-open="true"\]\)\s*\{[^}]*visibility:\s*hidden;[^}]*pointer-events:\s*none;/,
  'closed overlays must not intercept map input through the higher-specificity UI shell selector');
const command = read('src/ui/CommandUI.ts');
const attack = read('src/ui/AttackPanel.ts');

assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, 'production UI must not depend on Tailwind CDN');
assert.match(html, /id="player-hud"[^>]*class="command-bar command-bar--player"/);
assert.match(html, /id="match-hud"[^>]*class="command-bar command-bar--world"/);
assert.match(html, /id="selection-panel"[^>]*class="context-console"/);
assert.match(html, /id="attack-panel"[^>]*class="operation-console"/);
assert.match(html, /id="command-rail"[^>]*class="map-command-rail"/);

for (const id of [
  'player-population-bar', 'selection-state', 'selection-relation', 'selection-faction-facts', 'operation-title',
  'btn-launch-attack', 'btn-halt-attack', 'btn-expand-frontier', 'btn-defense-focus', 'btn-build-port', 'btn-amphibious-attack', 'btn-offer-alliance', 'match-result',
  'info-panel', 'mobile-sheet', 'mobile-command-toggle',
]) assert.match(html, new RegExp('id="' + id + '"'), 'missing UI surface: ' + id);

for (const state of [
  'IDLE', 'OWN_TERRITORY_SELECTED', 'NEUTRAL_TERRITORY_SELECTED',
  'HOSTILE_TERRITORY_SELECTED', 'LEGAL_ATTACK', 'ILLEGAL_ATTACK',
  'ACTIVE_OFFENSIVE', 'DEFENDING', 'DISCONNECTED', 'PLAYER_DEFEATED',
  'MATCH_WON', 'MATCH_ENDED',
]) assert.match(command, new RegExp("'" + state + "'"), 'missing presentation state: ' + state);

assert.equal((html.match(/id="btn-launch-attack"/g) || []).length, 1);
assert.equal((html.match(/id="btn-halt-attack"/g) || []).length, 1);
assert.match(command, /gameState\.expansionLegality/);
assert.match(command, /dataset\.uiState/);
assert.match(attack, /gameState\.sendCancelAttack|gameClient\.sendCancelAttack/);
assert.match(css, /button:focus-visible/);
assert.match(css, /min-height: 46px/);
assert.match(css, /safe-area-inset-(top|bottom|left|right)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /#flag-picker \{[\s\S]*opacity: 1;[\s\S]*pointer-events: auto;/);
assert.doesNotMatch(command, /alert\(/);
assert.match(html, /POPULATION/);
assert.doesNotMatch(html, /ARMY|RECOVERY|FAVORABLE|RISKY/);
assert.doesNotMatch(attack, /army|ARMY|forecast|FAVORABLE|RISKY|GOOD/);

console.log('PASS: Dominion command architecture, explicit UI states, mobile targets, and accessibility contract');
