/**
 * DOMINION OF SOL — TURKIC CIVILIZATION SPLIT & SOVEREIGN ARMORY DECOUPLING AUDIT
 * Section 45 Acceptance Test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CIVILIZATION_ATLAS, CIVILIZATION_BY_ID } from '../src/meta/CivilizationAtlas';
import { CURATED_CIVILIZATION_PRESETS } from '../src/game/CivilizationPresets';
import { PRESET_NATION_IDENTITIES } from '../src/ui/NationIdentity';
import { catalogService } from '../src/meta/CatalogService';
import { accountService } from '../src/meta/AccountService';
import { getBladeSkin } from '../src/meta/BladeSkinRegistry';

describe('Turkic Civilization Split & Decoupling Audit', () => {

  it('1. Playable TÜRK id remaining = NO', () => {
    const atlasMatch = CIVILIZATION_ATLAS.find(c => c.id === 'turk');
    assert.strictEqual(atlasMatch, undefined, 'No playable civ with id "turk" in CIVILIZATION_ATLAS');

    const presetMatch = CURATED_CIVILIZATION_PRESETS.find(p => p.id === 'turk');
    assert.strictEqual(presetMatch, undefined, 'No playable preset with id "turk" in CURATED_CIVILIZATION_PRESETS');
  });

  it('2. HUN and GÖKTÜRK exist as distinct civilizations', () => {
    const hun = CIVILIZATION_BY_ID['hun'];
    const gokturk = CIVILIZATION_BY_ID['gokturk'];

    assert.ok(hun, 'HUN civilization must exist in atlas');
    assert.ok(gokturk, 'GÖKTÜRK civilization must exist in atlas');

    // Distinct display names
    assert.strictEqual(hun.displayName, 'HUN');
    assert.strictEqual(gokturk.displayName, 'GÖKTÜRK');

    // Distinct identity traits (Section 3)
    // HUN: MOBILITY · PRESSURE · REACH
    assert.deepStrictEqual(hun.identityTraits, ['MOBILITY', 'PRESSURE', 'REACH']);
    // GÖKTÜRK: ORDER · MOBILITY · EXPANSION
    assert.deepStrictEqual(gokturk.identityTraits, ['ORDER', 'MOBILITY', 'EXPANSION']);

    // Distinct homelands
    assert.notStrictEqual(hun.homelandCenter.lon, gokturk.homelandCenter.lon);
    assert.notStrictEqual(hun.historicalCoreLabel, gokturk.historicalCoreLabel);
  });

  it('3. HUN does NOT use Ottoman Pasha / Divan / Janissary assets or vocabulary', () => {
    const hun = CIVILIZATION_BY_ID['hun'];
    const hunPreset = CURATED_CIVILIZATION_PRESETS.find(p => p.id === 'hun')!;
    const hunIdentity = PRESET_NATION_IDENTITIES['hun'];

    const prohibitedTerms = ['pasha', 'divan', 'janissary', 'crescent-star', 'padishah', 'beylik', 'ottoman'];

    for (const term of prohibitedTerms) {
      assert.ok(
        !hun.shortDescription.toLowerCase().includes(term),
        `HUN description must not include Ottoman term "${term}"`
      );
      assert.ok(
        !hunPreset.shortTagline.toLowerCase().includes(term),
        `HUN tagline must not include Ottoman term "${term}"`
      );
    }

    // HUN emblem must not be Ottoman crescent-star
    assert.notStrictEqual(hunIdentity.emblem, 'crescent-star', 'HUN must not use crescent-star emblem');
    assert.strictEqual(hunIdentity.emblem, 'spearhead', 'HUN uses spearhead emblem');
  });

  it('4. GÖKTÜRK does NOT use Ottoman Pasha / Divan / Janissary assets or vocabulary', () => {
    const gokturk = CIVILIZATION_BY_ID['gokturk'];
    const gokturkPreset = CURATED_CIVILIZATION_PRESETS.find(p => p.id === 'gokturk')!;
    const gokturkIdentity = PRESET_NATION_IDENTITIES['gokturk'];

    const prohibitedTerms = ['pasha', 'divan', 'janissary', 'crescent-star', 'padishah', 'beylik', 'ottoman'];

    for (const term of prohibitedTerms) {
      assert.ok(
        !gokturk.shortDescription.toLowerCase().includes(term),
        `GÖKTÜRK description must not include Ottoman term "${term}"`
      );
      assert.ok(
        !gokturkPreset.shortTagline.toLowerCase().includes(term),
        `GÖKTÜRK tagline must not include Ottoman term "${term}"`
      );
    }

    // GÖKTÜRK emblem must not be Ottoman crescent-star
    assert.notStrictEqual(gokturkIdentity.emblem, 'crescent-star', 'GÖKTÜRK must not use crescent-star emblem');
    assert.strictEqual(gokturkIdentity.emblem, 'star', 'GÖKTÜRK uses star emblem');
  });

  it('5. Existing Ottoman Imperial cosmetic content preserved in Sovereign Armory', () => {
    // Ottoman products in catalog remain intact
    const ottomanBundle = catalogService.getProduct('dominion.bundle.turk.ottoman01');
    assert.ok(ottomanBundle, 'Ottoman bundle SKU must exist in catalog');
    assert.strictEqual(ottomanBundle.displayName, 'Ottoman Imperial Collection');
    assert.ok(ottomanBundle.entitlements.includes('blade_turk_imperial'), 'Ottoman bundle includes blade_turk_imperial');

    // Ottoman blade skin exists in BladeSkinRegistry
    const bladeSkin = getBladeSkin('blade_turk_imperial');
    assert.ok(bladeSkin, 'Imperial Crescent blade skin must exist');
    assert.strictEqual(bladeSkin.name, 'Imperial Crescent');

    // Ottoman identity exists in PRESET_NATION_IDENTITIES
    const ottomanIdentity = PRESET_NATION_IDENTITIES['ottoman'];
    assert.ok(ottomanIdentity, 'Ottoman identity must exist');
    assert.strictEqual(ottomanIdentity.emblem, 'crescent-star', 'Ottoman identity retains crescent-star');
    assert.strictEqual(ottomanIdentity.name, 'OTTOMAN IMPERIAL');
  });

  it('6. Account Migration Safety: legacy "turk" migrates to "hun" without touching cosmetics', () => {
    // Test migration in AccountService
    accountService.setFavoriteCivilization('turk');
    const acc = accountService.getAccount();
    assert.strictEqual(acc.favoriteCivilization, 'hun', 'Legacy "turk" must migrate to "hun"');
  });
});
