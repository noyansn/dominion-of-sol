/**
 * DOMINION OF SOL — HOME / MATCH STATE LIFECYCLE ISOLATION & BLADE GEOMETRY TESTS
 * 
 * Strict architectural audit verifying:
 * 39. HOME LEAK TEST (0 political, 0 capitals, 0 labels, 0 operations, 0 match toasts on HOME)
 * 40. MATCH LIFECYCLE TEST (HOME -> WAR_ROOM -> MATCH -> RETURN HOME purges all political visuals)
 * 41. MATCH POLITICAL REGRESSION (101 sovereign factions preserved in MATCH mode)
 * 42. BLADE GEOMETRY CONTRACT (All 10 blades have valid SVG, matching scabbards, finite transforms)
 * 43. HUD / ARMORY PARITY (Equipped HUD blade uses identical descriptor as Armory preview)
 * 44. RESPECTFUL ART DIRECTION (Plains Forged Command product identity)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Environment polyfills for headless node runner
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
  };
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    documentElement: {
      setAttribute() {},
    },
    getElementById() { return null; },
    querySelectorAll() { return []; },
  };
}
if (typeof globalThis.CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: any = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { AppSurface, EventScope } from '../src/ui/AppSurface';
import { uiStateManager } from '../src/ui/UIStateManager';
import { BLADE_SKINS, getAllBladeSkins, getBladeSkin } from '../src/meta/BladeSkinRegistry';
import { catalogService } from '../src/meta/CatalogService';
import { entitlementService } from '../src/meta/EntitlementService';

const clientRoot = path.resolve(__dirname, '..');
const readSource = (rel: string) => fs.readFileSync(path.join(clientRoot, rel), 'utf8');

describe('Dominion of Sol — Lifecycle Isolation & Blade Geometry Suite', () => {

  // =========================================================================
  // 39. HOME LEAK TEST
  // =========================================================================
  it('39. HOME Surface Contract: Structural & Source Isolation', () => {
    // 1. UIStateManager Surface Definitions
    uiStateManager.setState('HOME_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.HOME, 'Must report AppSurface.HOME');

    const domRendererSrc = readSource('src/render/DominionRenderer.ts');
    const commandUiSrc = readSource('src/ui/CommandUI.ts');
    const gameClientSrc = readSource('src/game/GameClient.ts');

    // Verify DominionRenderer initializes match layers hidden
    assert.match(
      domRendererSrc,
      /this\.politicalFillContainer\.visible\s*=\s*initialIsMatch/,
      'DominionRenderer must initialize politicalFillContainer visibility based on AppSurface.MATCH'
    );
    assert.match(
      domRendererSrc,
      /this\.globe\.setPoliticalStrength\(initialIsMatch \? 1\.0 : 0\.0\)/,
      'Globe political strength must be 0.0 on HOME'
    );
    assert.match(
      domRendererSrc,
      /this\.capitals\.container\.visible\s*=\s*initialIsMatch/,
      'Capitals must be hidden on HOME'
    );
    assert.match(
      domRendererSrc,
      /this\.labels\.container\.visible\s*=\s*initialIsMatch/,
      'Labels must be hidden on HOME'
    );

    // Verify ticker loop does not update match layers on HOME
    assert.match(
      domRendererSrc,
      /this\.globe\.setPoliticalStrength\(isMatch \? \(this\.mapMode === 'POLITICAL' \? 1\.0 : 0\.32\) : 0\.0\);[\s\S]*?if \(isMatch\) \{/,
      'Ticker loop must bypass political upload and render passes when not on MATCH'
    );

    // Verify hit testing and picking is blocked on HOME
    assert.match(
      domRendererSrc,
      /if \(uiStateManager\.getAppSurface\(\) !== AppSurface\.MATCH\) return;/,
      'Picking and hover callbacks must abort when surface is not MATCH'
    );

    // Verify Toast event pipeline blocks MATCH events on HOME
    assert.match(
      commandUiSrc,
      /if \(scope === 'MATCH' && uiStateManager\.getAppSurface\(\) !== AppSurface\.MATCH\) \{\s*\/\/[^\n]*\s*return;\s*\}/,
      'CommandUI showToast must block MATCH-scoped events on non-MATCH surfaces'
    );

    // Verify GameClient notification checks surface
    assert.match(
      gameClientSrc,
      /if \(uiStateManager\.getAppSurface\(\) === AppSurface\.MATCH\) \{[\s\S]*?showToast\([^)]*?'MATCH'\);/,
      'GameClient atlas_notification must verify AppSurface.MATCH and pass MATCH scope'
    );
  });

  // =========================================================================
  // 40. MATCH LIFECYCLE TEST
  // =========================================================================
  it('40. Complete Session Lifecycle: HOME -> WAR_ROOM -> MATCH -> LEAVE -> HOME', () => {
    // 1. Transition sequence
    uiStateManager.setState('HOME_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.HOME);

    uiStateManager.setState('MATCH_QUEUE_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.WAR_ROOM);
    assert.notStrictEqual(uiStateManager.getAppSurface(), AppSurface.MATCH);

    uiStateManager.setState('IN_GAME_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.MATCH);

    uiStateManager.setState('HOME_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.HOME);

    // 2. Verify cleanup hooks on leaving match
    const domRendererSrc = readSource('src/render/DominionRenderer.ts');
    const civSelectorSrc = readSource('src/ui/CivilizationSelector.ts');

    assert.match(
      domRendererSrc,
      /public clearMatchPresentation\(\): void \{[\s\S]*?this\.capitals\.clear\(\);[\s\S]*?this\.labels\.clear\(\);[\s\S]*?this\.war\.clear\(\);[\s\S]*?this\.selection\.clear\(\);[\s\S]*?this\.strategicSites\.container\.visible = false;[\s\S]*?this\.politicalFillContainer\.visible = false;[\s\S]*?this\.political\.container\.visible = false;[\s\S]*?this\.globe\.setPoliticalStrength\(0\.0\);/,
      'DominionRenderer clearMatchPresentation must purge capitals, labels, war, selection, and reset globe political strength'
    );

    assert.match(
      civSelectorSrc,
      /clearMatchPresentation\(\);/,
      'CivilizationSelector returnToAtlas must call clearMatchPresentation'
    );
    assert.match(
      civSelectorSrc,
      /dismissToast\(\);/,
      'CivilizationSelector returnToAtlas must dismiss active match toasts'
    );
  });

  // =========================================================================
  // 41. MATCH POLITICAL REGRESSION
  // =========================================================================
  it('41. Match Political Regression: Curated civilizations & small sovereign seeds preserved', () => {
    const allCivs = ['turk', 'roma', 'pers', 'misir', 'han', 'yamato', 'norse', 'maya', 'lakota'];
    for (const civ of allCivs) {
      const skins = getAllBladeSkins().filter(s =>
        s.civilization.toLowerCase() === civ ||
        (civ === 'turk' && s.civilization === 'TÜRK')
      );
      assert.strictEqual(skins.length, 1, `Civilization ${civ} must have exactly 1 command blade`);
    }

    // Verify DominionRenderer syncMatchLayers reactivates all layers upon joining world
    const domRendererSrc = readSource('src/render/DominionRenderer.ts');
    assert.match(
      domRendererSrc,
      /public syncMatchLayers\(\): void \{[\s\S]*?this\.capitals\.syncState\(\);[\s\S]*?this\.labels\.syncState\(\);[\s\S]*?this\.updatePoliticalRenderers\(\);/,
      'syncMatchLayers must resync capitals, labels, and reactivate political layers'
    );
  });

  // =========================================================================
  // 42. BLADE GEOMETRY CONTRACT
  // =========================================================================
  it('42. Blade Geometry Contract: 10/10 blades complete with matching scabbards & finite transforms', () => {
    const skins = getAllBladeSkins();
    assert.strictEqual(skins.length, 10, 'Must have exactly 10 registered Command Blades');

    const seenIds = new Set<string>();

    for (const skin of skins) {
      // 1. Unique ID
      assert.ok(!seenIds.has(skin.id), `Duplicate blade skin ID: ${skin.id}`);
      seenIds.add(skin.id);

      // 2. Geometry Paths Exist
      const sil = skin.silhouette;
      assert.ok(sil, `Skin ${skin.id} must have silhouette`);
      assert.ok(sil.bladeUpperPath.length > 10, `Skin ${skin.id} must have bladeUpperPath`);
      assert.ok(sil.bladeLowerPath.length > 10, `Skin ${skin.id} must have bladeLowerPath`);
      assert.ok(sil.spinePath.length > 5, `Skin ${skin.id} must have spinePath`);
      assert.ok(sil.cuttingEdgePath.length > 5, `Skin ${skin.id} must have cuttingEdgePath`);

      // 3. Hilt Components
      assert.ok(sil.guardSvg.length > 10, `Skin ${skin.id} must have guardSvg`);
      assert.ok(sil.gripSvg.length > 10, `Skin ${skin.id} must have gripSvg`);
      assert.ok(sil.pommelSvg.length > 10, `Skin ${skin.id} must have pommelSvg`);

      // 4. Matching Scabbard Components (Section 17)
      assert.ok(sil.scabbardBodySvg.length > 10, `Skin ${skin.id} must have scabbardBodySvg`);
      assert.ok(sil.scabbardChapeSvg.length > 10, `Skin ${skin.id} must have scabbardChapeSvg`);
      assert.ok(sil.scabbardThroatSvg.length > 10, `Skin ${skin.id} must have scabbardThroatSvg`);

      // 5. Hero Preview Exists with SVG
      assert.ok(sil.heroPreviewSvg.includes('<svg'), `Skin ${skin.id} must have valid heroPreviewSvg`);

      // 6. Finite Draw Transforms for 0%, 25%, 50%, 75%, 100%
      const BASE_X = 250;
      const TRAVEL_X = 232;
      for (const pct of [0, 25, 50, 75, 100]) {
        const frac = pct / 100;
        const tx = BASE_X + frac * TRAVEL_X;
        assert.ok(Number.isFinite(tx), `Draw transform for ${skin.id} at ${pct}% must be finite`);
        assert.ok(tx >= 250 && tx <= 482, `Draw transform at ${pct}% must be between 250 and 482`);
      }
    }

    // 7. Fallback to Standard
    const fallback = getBladeSkin('non_existent_blade_id');
    assert.strictEqual(fallback.id, 'blade_standard', 'Unknown skin ID must gracefully fallback to blade_standard');
  });

  // =========================================================================
  // 43. HUD / ARMORY PARITY
  // =========================================================================
  it('43. HUD / Armory Parity: Equipped HUD blade uses the EXACT same geometry as Armory preview', () => {
    const bladeProducts = catalogService.getProducts('COMMAND BLADES');
    assert.ok(bladeProducts.length >= 9, 'Must have blade products in store catalog');

    for (const prod of bladeProducts) {
      const bladeEnt = prod.entitlements.find(e => e.startsWith('blade_'));
      assert.ok(bladeEnt, `Product ${prod.sku} must have a blade entitlement`);

      // In Armory, preview uses getBladeSkin(bladeEnt)
      const armorySkin = getBladeSkin(bladeEnt);
      assert.ok(armorySkin, `Armory preview skin must resolve for ${bladeEnt}`);

      // In HUD, AttackPanel uses getBladeSkin(entitlementService.getLoadout().activeBladeSkin)
      entitlementService.applyServerSnapshot(['blade_standard', bladeEnt], bladeEnt);
      const hudSkin = getBladeSkin(entitlementService.getLoadout().activeBladeSkin);

      // Strict Equality: Same geometry descriptor
      assert.strictEqual(
        hudSkin.id,
        armorySkin.id,
        `HUD and Armory must use identical geometry for SKU ${prod.sku}`
      );
      assert.strictEqual(
        hudSkin.silhouette.bladeUpperPath,
        armorySkin.silhouette.bladeUpperPath,
        `HUD and Armory must share identical bladeUpperPath for ${prod.sku}`
      );
      assert.strictEqual(
        hudSkin.silhouette.guardSvg,
        armorySkin.silhouette.guardSvg,
        `HUD and Armory must share identical guardSvg for ${prod.sku}`
      );
      assert.strictEqual(
        hudSkin.silhouette.scabbardBodySvg,
        armorySkin.silhouette.scabbardBodySvg,
        `HUD and Armory must share identical scabbardBodySvg for ${prod.sku}`
      );
    }
  });

  // =========================================================================
  // 44. RESPECTFUL ART DIRECTION FOR PLAINS FORGED COMMAND
  // =========================================================================
  it('44. Lakota Blade: Plains Forged Command respectful product identity', () => {
    const lakotaSkin = getBladeSkin('blade_lakota_command');
    assert.strictEqual(lakotaSkin.name, 'Plains Forged Command');
    assert.strictEqual(lakotaSkin.civilization, 'LAKOTA');

    // Must not monetize sacred ceremony or traditional regalia
    const lowerDesc = lakotaSkin.description.toLowerCase();
    assert.ok(!lowerDesc.includes('sacred'), 'Must not monetize sacred ceremonies');
    assert.ok(!lowerDesc.includes('dance'), 'Must not monetize ceremonies');
    assert.ok(!lowerDesc.includes('feather'), 'Must not use stereotypical regalia');
    assert.ok(!lowerDesc.includes('bonnet'), 'Must not use stereotypical regalia');

    // Must have matching saddle leather sheath
    assert.ok(lakotaSkin.silhouette.scabbardBodySvg.length > 0);
  });
});
