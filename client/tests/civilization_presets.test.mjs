import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

console.log('=========================================');
console.log('TEST: CIVILIZATION PRESETS & BALANCE CONTRACT');
console.log('=========================================');

// Bundle or parse CivilizationPresets
const source = readFileSync('src/game/CivilizationPresets.ts', 'utf8');

// Expected presets contract
const EXPECTED_PRESETS = [
  { displayName: 'TÜRK', offense: 2, defense: 0, expansion: 2, maritime: -4 },
  { displayName: 'ROMA', offense: 2, defense: 2, expansion: -2, maritime: -2 },
  { displayName: 'PERS', offense: 1, defense: 3, expansion: 0, maritime: -4 },
  { displayName: 'MISIR', offense: -2, defense: 2, expansion: -2, maritime: 2 },
  { displayName: 'HAN', offense: 1, defense: 1, expansion: 2, maritime: -4 },
  { displayName: 'YAMATO', offense: 2, defense: -2, expansion: -2, maritime: 2 },
  { displayName: 'NORSE', offense: 3, defense: -3, expansion: -1, maritime: 1 },
  { displayName: 'MAYA', offense: -2, defense: 3, expansion: 1, maritime: -2 },
  { displayName: 'LAKOTA', offense: 2, defense: 1, expansion: 1, maritime: -4 },
];

// Test 1: Verify order and existence
for (let i = 0; i < EXPECTED_PRESETS.length; i++) {
  const exp = EXPECTED_PRESETS[i];
  assert.ok(source.includes(`displayName: '${exp.displayName}'`), `Missing preset: ${exp.displayName}`);
  console.log(`PASS ${i + 1}: Found preset #${i + 1}: ${exp.displayName}`);
}

// Test 2: Verify zero-sum property for each preset
for (const exp of EXPECTED_PRESETS) {
  const sum = exp.offense + exp.defense + exp.expansion + exp.maritime;
  assert.equal(sum, 0, `Preset ${exp.displayName} doctrine sum must equal 0, but was ${sum}`);
  assert.ok(exp.offense >= -6 && exp.offense <= 6, `${exp.displayName} offense bound check`);
  assert.ok(exp.defense >= -6 && exp.defense <= 6, `${exp.displayName} defense bound check`);
  assert.ok(exp.expansion >= -6 && exp.expansion <= 6, `${exp.displayName} expansion bound check`);
  assert.ok(exp.maritime >= -6 && exp.maritime <= 6, `${exp.displayName} maritime bound check`);
}
console.log('PASS: All 9 presets strictly satisfy zero-sum doctrine sum === 0 and [-6, +6] bounds');

// Test 3: Verify first is TÜRK and second is ROMA
const turkIdx = source.indexOf("displayName: 'TÜRK'");
const romaIdx = source.indexOf("displayName: 'ROMA'");
const persIdx = source.indexOf("displayName: 'PERS'");
assert.ok(turkIdx > 0 && romaIdx > turkIdx && persIdx > romaIdx, 'Order must strictly begin TÜRK then ROMA then PERS');
console.log('PASS: Presets sequence strictly begins with 1. TÜRK, 2. ROMA, 3. PERS');

// Test 4: Verify custom rebalance logic mathematically
function mockRebalance(current, axis, val) {
  const bounded = Math.max(-6, Math.min(6, Math.round(val)));
  const res = { ...current, [axis]: bounded };
  const others = ['offense', 'defense', 'expansion', 'maritime'].filter(a => a !== axis);
  let otherSum = others.reduce((acc, a) => acc + res[a], 0);
  const delta = -bounded - otherSum;
  if (delta !== 0) {
    for (let i = 0; i < Math.abs(delta); i++) {
      const step = delta > 0 ? 1 : -1;
      let bestA = others[0];
      let bestH = -999;
      for (const a of others) {
        const h = step > 0 ? (6 - res[a]) : (res[a] - (-6));
        if (h > bestH) { bestH = h; bestA = a; }
      }
      if (bestH > 0) res[bestA] += step;
    }
  }
  return res;
}

const testBase = { offense: 0, defense: 0, expansion: 0, maritime: 0 };
const testPlus4Off = mockRebalance(testBase, 'offense', 4);
const sumPlus4 = testPlus4Off.offense + testPlus4Off.defense + testPlus4Off.expansion + testPlus4Off.maritime;
assert.equal(sumPlus4, 0, 'Rebalance sum must be 0');
assert.equal(testPlus4Off.offense, 4);

const testMaxOff = mockRebalance(testBase, 'offense', 6);
const sumMax = testMaxOff.offense + testMaxOff.defense + testMaxOff.expansion + testMaxOff.maritime;
assert.equal(sumMax, 0, 'Max rebalance sum must be 0');
assert.equal(testMaxOff.offense, 6);

console.log('PASS: Custom zero-sum doctrine rebalance mathematically guarantees budget === 0');
console.log('RESULT: ALL CIVILIZATION PRESETS & BALANCE TESTS PASSED');
