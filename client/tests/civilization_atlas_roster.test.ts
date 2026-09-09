/**
 * DOMINION OF SOL — CIVILIZATION ATLAS ROSTER & METADATA AUDIT TEST
 * Section 44 Acceptance Test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CIVILIZATION_ATLAS,
  CIVILIZATION_BY_ID,
  MACRO_REGIONS,
  CivilizationId,
} from '../src/meta/CivilizationAtlas';
import { CURATED_CIVILIZATION_PRESETS } from '../src/game/CivilizationPresets';
import { HOMELAND_REGIONS } from '../src/game/HomelandRegions';
import { PRESET_NATION_IDENTITIES } from '../src/ui/NationIdentity';

describe('Civilization Atlas — Global 44-Civilization Manifest Audit', () => {

  it('1. Exactly 44 total civilizations in manifest', () => {
    assert.strictEqual(CIVILIZATION_ATLAS.length, 44, 'Total civilizations must be exactly 44');
    assert.strictEqual(CURATED_CIVILIZATION_PRESETS.length, 44, 'Curated presets must be exactly 44');
  });

  it('2. Exact Macro-Region Distribution', () => {
    const counts: Record<string, number> = {};
    for (const civ of CIVILIZATION_ATLAS) {
      counts[civ.macroRegion] = (counts[civ.macroRegion] || 0) + 1;
    }

    assert.strictEqual(counts['EUROPE'], 5, 'Europe must have 5 civilizations');
    assert.strictEqual(counts['AFRICA'], 8, 'Africa must have 8 civilizations');
    assert.strictEqual(counts['WEST ASIA'], 4, 'West Asia must have 4 civilizations');
    assert.strictEqual(counts['CENTRAL ASIA'], 4, 'Central Asia must have 4 civilizations');
    assert.strictEqual(counts['SOUTH ASIA'], 3, 'South Asia must have 3 civilizations');
    assert.strictEqual(counts['EAST ASIA'], 4, 'East Asia must have 4 civilizations');
    assert.strictEqual(counts['SOUTHEAST ASIA'], 3, 'Southeast Asia must have 3 civilizations');
    assert.strictEqual(counts['NORTH AMERICA'], 5, 'North America must have 5 civilizations');
    assert.strictEqual(counts['SOUTH AMERICA'], 4, 'South America must have exactly 4 civilizations');
    assert.strictEqual(counts['AUSTRALIA'], 3, 'Australia must have exactly 3 civilizations');
    assert.strictEqual(counts['OCEANIA'], 1, 'Oceania must have exactly 1 civilization (Māori)');
  });

  it('3. Every civilization ID is unique and valid machine ID', () => {
    const ids = new Set<string>();
    for (const civ of CIVILIZATION_ATLAS) {
      assert.ok(!ids.has(civ.id), `Duplicate civilization ID detected: ${civ.id}`);
      ids.add(civ.id);
      assert.match(civ.id, /^[a-z0-9_]+$/, `Civilization ID must be lowercase ASCII: ${civ.id}`);
    }
  });

  it('4. Every civilization has exactly 3 identity traits', () => {
    for (const civ of CIVILIZATION_ATLAS) {
      assert.ok(Array.isArray(civ.identityTraits), `identityTraits must be array for ${civ.id}`);
      assert.strictEqual(
        civ.identityTraits.length,
        3,
        `Civilization ${civ.id} must have exactly 3 identity traits, found: ${civ.identityTraits.join(', ')}`
      );
      for (const trait of civ.identityTraits) {
        assert.ok(trait.trim().length > 0, `Trait cannot be empty for ${civ.id}`);
      }
    }
  });

  it('5. Every civilization has valid homeland center & organic polygon', () => {
    for (const civ of CIVILIZATION_ATLAS) {
      assert.ok(civ.homelandCenter, `Homeland center required for ${civ.id}`);
      assert.ok(civ.homelandCenter.lat >= -90 && civ.homelandCenter.lat <= 90, `Lat out of range for ${civ.id}`);
      assert.ok(civ.homelandCenter.lon >= -180 && civ.homelandCenter.lon <= 180, `Lon out of range for ${civ.id}`);

      assert.ok(Array.isArray(civ.homelandPolygon), `homelandPolygon must be array for ${civ.id}`);
      assert.ok(civ.homelandPolygon.length >= 4, `homelandPolygon must have at least 4 vertices for ${civ.id}`);

      // Verify all vertices have valid [lon, lat] coordinates
      for (const pt of civ.homelandPolygon) {
        assert.strictEqual(pt.length, 2, `Vertex must be [lon, lat] pair for ${civ.id}`);
        const [lon, lat] = pt;
        assert.ok(lon >= -180 && lon <= 180, `Vertex lon out of bounds for ${civ.id}: ${lon}`);
        assert.ok(lat >= -90 && lat <= 90, `Vertex lat out of bounds for ${civ.id}: ${lat}`);
      }
    }
  });

  it('6. Generic playable "turk" civilization is completely removed', () => {
    const atlasTurk = CIVILIZATION_ATLAS.find(c => c.id === 'turk');
    assert.strictEqual(atlasTurk, undefined, 'Playable TÜRK must not exist in CIVILIZATION_ATLAS');

    const presetTurk = CURATED_CIVILIZATION_PRESETS.find(p => p.id === 'turk');
    assert.strictEqual(presetTurk, undefined, 'Playable TÜRK must not exist in CURATED_CIVILIZATION_PRESETS');

    // Hun and Gokturk exist in their stead
    assert.ok(CIVILIZATION_BY_ID['hun'], 'HUN must exist');
    assert.ok(CIVILIZATION_BY_ID['gokturk'], 'GÖKTÜRK must exist');
  });

  it('7. Every civilization has complete nation heraldry & doctrine', () => {
    for (const civ of CIVILIZATION_ATLAS) {
      const identity = PRESET_NATION_IDENTITIES[civ.id];
      assert.ok(identity, `NationIdentity must exist for ${civ.id}`);
      assert.ok(identity.primaryColor, `primaryColor required for ${civ.id}`);
      assert.ok(identity.emblem, `emblem required for ${civ.id}`);

      const region = HOMELAND_REGIONS[civ.id];
      assert.ok(region, `HomelandRegion required for ${civ.id}`);

      const preset = CURATED_CIVILIZATION_PRESETS.find(p => p.id === civ.id);
      assert.ok(preset, `Curated preset required for ${civ.id}`);
      assert.strictEqual(preset.identityTraits.length, 3, `Preset must have 3 traits for ${civ.id}`);

      // Check zero-sum doctrine
      const sum = preset.doctrine.offense + preset.doctrine.defense + preset.doctrine.expansion + preset.doctrine.maritime;
      assert.strictEqual(sum, 0, `Doctrine must be zero-sum for ${civ.id}, got sum ${sum}`);
    }
  });
});
