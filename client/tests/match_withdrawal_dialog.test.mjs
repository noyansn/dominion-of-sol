import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const css = read('src/ui/dominion.css');
const dialogTs = read('src/ui/MatchWithdrawalDialog.ts');
const worldInputTs = read('src/render/WorldInputController.ts');
const attackPanelTs = read('src/ui/AttackPanel.ts');
const dossierTs = read('src/ui/CountryDossier.ts');
const civSelectorTs = read('src/ui/CivilizationSelector.ts');

console.log('============================================================');
console.log('TEST: MATCH WITHDRAWAL DIALOG & INPUT ISOLATION CONTRACT');
console.log('============================================================');

// 1. Z-Index Tier Verification
assert.match(css, /\.dom-withdrawal-backdrop\s*\{[^}]*z-index:\s*2500;/, 'Backdrop must have top-tier z-index 2500');
assert.match(css, /\.dom-withdrawal-backdrop\s*\{[^}]*pointer-events:\s*auto\s*!important;/, 'Open backdrop must own pointer-events');
assert.match(css, /\.dom-withdrawal-backdrop\[hidden\]\s*\{[^}]*pointer-events:\s*none\s*!important;/, 'Hidden backdrop must never intercept pointer-events');
console.log('PASS 1: Z-index tier (2500) and pointer-events contract verified');

// 2. Visual Design & Dimensions
assert.match(css, /\.dom-withdrawal-sheet\s*\{[^}]*max-width:\s*430px;/, 'Sheet max-width must be within 400-480px target');
assert.match(css, /\.dom-withdrawal-sheet\s*\{[^}]*border:\s*1px solid rgba\(223,\s*188,\s*115,/, 'Sheet must use restrained warm-metal gold accent border');
assert.match(css, /\.dom-withdrawal-btn--leave\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*#7f1d1d/, 'Leave button must use muted deep crimson, not neon red');
console.log('PASS 2: Restrained visual design, compact width, and deep crimson palette verified');

// 3. Exact Content Hierarchy
assert.match(dialogTs, /ACTIVE WORLD · SOVEREIGN COMMAND/, 'Eyebrow must reference Active World sovereign command');
assert.match(dialogTs, /LEAVE MATCH/, 'Title must be LEAVE MATCH');
assert.match(dialogTs, /Leaving ends your participation in this match/, 'Direct message copy verified');
assert.match(dialogTs, /Your active operations will stop/, 'Direct consequence copy verified');
assert.match(dialogTs, /id="btn-withdrawal-cancel"/, 'Cancel button ID present');
assert.match(dialogTs, /id="btn-withdrawal-leave"/, 'Leave button ID present');
console.log('PASS 3: Content copy and hierarchy verified');

// 4. Input Ownership & Isolation in Canvas and Blade
assert.match(worldInputTs, /if \(\(window as any\)\.__DOMINION_MODAL_OPEN__\) return;/, 'WorldInputController pointerdown must be blocked when modal open');
assert.match(worldInputTs, /if \(\(window as any\)\.__DOMINION_MODAL_OPEN__\) \{\s*e\.preventDefault\(\);\s*wheelTelemetry\.ignoredForUiScroll = true;\s*return;\s*\}/, 'WorldInputController wheel zoom must be blocked when modal open');
assert.match(attackPanelTs, /if \(\(window as any\)\.__DOMINION_MODAL_OPEN__\) return;/, 'AttackPanel Enter/ESC shortcuts must be blocked when modal open');
assert.match(dossierTs, /if \(\(window as any\)\.__DOMINION_MODAL_OPEN__\) return;/, 'CountryDossier outside click/ESC must be blocked when modal open');
console.log('PASS 4: Canvas, Command Blade, and Dossier input isolation verified');

// 5. Double-Click & Re-entry Prevention
assert.match(dialogTs, /if \(this\.isLeaving\) return;/, 'Double-submission guard must exist in executeLeave()');
assert.match(dialogTs, /this\.isLeaving = true;/, 'Submission flag must lock on first click');
assert.match(dialogTs, /this\.leaveBtn\.disabled = true;/, 'Leave button must disable upon click');
assert.match(dialogTs, /LEAVING\.\.\./, 'Pending text state must display while leaving');
console.log('PASS 5: Single execution and double-submission protection verified');

// 6. Keyboard Accessibility & ESC Cancel
assert.match(dialogTs, /this\.cancelBtn\?\.focus\(\);/, 'Cancel button must receive initial focus on modal open');
assert.match(dialogTs, /if \(e\.key === 'Escape'\)\s*\{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*this\.close\(\);\s*return;\s*\}/, 'ESC must cancel and close modal');
assert.match(dialogTs, /e\.key === 'Tab'/, 'Tab trap must cycle within modal controls');
console.log('PASS 6: Keyboard accessibility, initial focus, Tab cycle, and ESC cancel verified');

// 7. Clean Wiring to Shell & Exit Button
assert.match(civSelectorTs, /matchWithdrawalDialog\.open\(\);/, 'ESC in MATCH_ACTIVE must open MatchWithdrawalDialog');
assert.match(civSelectorTs, /document\.getElementById\('btn-match-exit'\)\?\.addEventListener\('click'/, 'Match exit HUD button must open MatchWithdrawalDialog');
assert.match(civSelectorTs, /matchWithdrawalDialog\.setOnLeave\(\(\) => \{\s*this\.returnToAtlas\(\);\s*\}\);/, 'Confirmed leave must trigger returnToAtlas');
console.log('PASS 7: Integration with CivilizationSelector and Return to Atlas verified');

// 8. Civilization Detail Modal & Universal [hidden] Contract
assert.match(css, /\[hidden\][^{]*\{[^}]*display:\s*none\s*!important;/, 'Universal [hidden] must enforce display: none !important');
assert.match(css, /\.civ-modal-backdrop\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/, 'civ-modal-backdrop[hidden] must be display: none !important');
assert.match(css, /\.civ-btn-begin--modal\s*\{[^}]*pointer-events:\s*auto\s*!important;/, 'civ-btn-begin--modal must have pointer-events: auto !important');
assert.match(civSelectorTs, /modalPlayOnlineBtn\?\.addEventListener\('click'/, 'Detail modal play online must have click listener');
assert.match(civSelectorTs, /closeCivBtn\?\.addEventListener\('click'/, 'Detail modal close must have click listener');
console.log('PASS 8: Civilization Detail Modal button responsiveness and [hidden] contract verified');

console.log('============================================================');
console.log('ALL MATCH WITHDRAWAL & MODAL INPUT TESTS PASSED CLEANLY');
console.log('============================================================');
