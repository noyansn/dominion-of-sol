import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESET_NATION_IDENTITIES,
  renderFlagSvg,
  renderPennantSvg,
  renderMiniFlagSvg,
} from '../src/ui/NationIdentity.js';

test('Flags Authority — Dimensional Parity, Mini Flags, and Vexillology Correctness', async (t) => {
  const civKeys = ['turk', 'roma', 'pers', 'misir', 'han', 'yamato', 'norse', 'maya', 'lakota'];

  for (const key of civKeys) {
    const identity = PRESET_NATION_IDENTITIES[key];
    assert.ok(identity, `Preset identity must exist for ${key}`);

    // 1. Hero flag: 120x80
    const flagSvg = renderFlagSvg(identity, 120, 80);
    assert.ok(flagSvg.includes('width="120"'), `${key} flag must be width 120`);
    assert.ok(flagSvg.includes('height="80"'), `${key} flag must be height 80`);
    assert.ok(flagSvg.includes('viewBox="0 0 300 200"'), `${key} flag viewBox must be 0 0 300 200`);

    // 2. Command pennant: 48x80 (strict equal 80px visual height!)
    const pennantSvg = renderPennantSvg(identity, 48, 80);
    assert.ok(pennantSvg.includes('width="48"'), `${key} pennant must be width 48`);
    assert.ok(pennantSvg.includes('height="80"'), `${key} pennant must be height 80`);
    assert.ok(pennantSvg.includes('viewBox="0 0 48 80"'), `${key} pennant viewBox must be 0 0 48 80`);
    assert.ok(pennantSvg.includes('<polygon'), `${key} pennant must render swallowtail notched polygon`);

    // 3. Mini flag: 36x24 for ribbon tiles
    const miniSvg = renderMiniFlagSvg(identity, 36, 24);
    assert.ok(miniSvg.includes('width="36"'), `${key} mini flag must be width 36`);
    assert.ok(miniSvg.includes('height="24"'), `${key} mini flag must be height 24`);
    assert.ok(!miniSvg.includes('style="background-color:'), `${key} mini flag must not be a flat solid color block`);
  }

  // 4. Specific Yamato verification: white/off-white field with red sun disc, NEVER pink/red square
  const yamatoIdentity = PRESET_NATION_IDENTITIES['yamato'];
  const yamatoFlag = renderFlagSvg(yamatoIdentity, 120, 80);
  assert.ok(yamatoFlag.includes('fill="#f2ece4"'), 'Yamato field must be pristine parchment white (#f2ece4)');
  assert.ok(yamatoFlag.includes('<circle') && yamatoFlag.includes('fill="#b92828"'), 'Yamato flag must contain red sun disc circle');

  console.log('[TEST SUCCESS] Flags Authority test passed: 80px visual height parity, valid mini SVG heraldry, and authentic Yamato flag.');
});
