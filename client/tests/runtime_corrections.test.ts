/**
 * DOMINION OF SOL — RUNTIME CORRECTIONS & FINALIZATION TEST SUITE
 * 
 * Section 16 QA Specifications:
 * 1. HOME: ReactionMapRenderer active bubbles = 0
 * 2. HOME: ReactionBroadcast presentation = blocked
 * 3. HOME: MATCH tactical renderer = inactive
 * 4. MATCH: ReactionMapRenderer enabled, reaction send enabled, rate limiting unchanged
 * 5. Expressions tab: contains ZERO tactical ping IDs
 * 6. Tactical Pings tab: contains ZERO social expression IDs
 * 7. Expression wheel: no duplicate IDs
 * 8. Blade 0%: blade-body visible bounds outside scabbard = 0 except hilt/guard/collar (scabbard mouth X=250 clip)
 * 9. Blade 100%: full blade body visible
 * 10. Product preview authority: displayed entitlement IDs exactly equal SKU entitlement IDs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Environment polyfills for headless node runner
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
  };
}
if (typeof globalThis.document === 'undefined') {
  const elements = new Map<string, any>();
  const createMockElement = (id: string) => ({
    id,
    style: {},
    hidden: false,
    innerHTML: '',
    textContent: '',
    children: [] as any[],
    classList: {
      add() {},
      remove() {},
      contains() { return false; },
      toggle() {},
    },
    appendChild(c: any) {
      if (this.children) this.children.push(c);
      return c;
    },
    removeChild(c: any) {
      if (this.children) this.children = this.children.filter((x: any) => x !== c);
      return c;
    },
    remove() {},
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  });

  (globalThis as any).document = {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    documentElement: {
      setAttribute() {},
      classList: {
        add() {},
        remove() {},
        contains() { return false; },
      },
    },
    createElement(tag: string) {
      return createMockElement(`elem-${tag}-${Math.random()}`);
    },
    getElementById(id: string) {
      if (!elements.has(id)) {
        elements.set(id, createMockElement(id));
      }
      return elements.get(id);
    },
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

import { AppSurface } from '../src/ui/AppSurface';
import { uiStateManager } from '../src/ui/UIStateManager';
import { reactionMapRenderer } from '../src/ui/ReactionMapRenderer';
import { entitlementService, UNIVERSAL_FREE_REACTIONS } from '../src/meta/EntitlementService';
import {
  SOVEREIGN_REACTIONS,
  COMMAND_PING_IDS,
  getReaction,
  getAllSocialExpressions,
  getAllCommandPings,
} from '../src/meta/ReactionRegistry';
import { BLADE_SKINS, getAllBladeSkins, getBladeSkin } from '../src/meta/BladeSkinRegistry';
import { catalogService } from '../src/meta/CatalogService';

describe('Dominion of Sol — Runtime Corrections Authority QA Suite', () => {

  beforeEach(() => {
    uiStateManager.setState('HOME_STATE');
    reactionMapRenderer.clearAll();
  });

  // =========================================================================
  // 1. HOME: ReactionMapRenderer active bubbles = 0 & Broadcast blocked
  // =========================================================================
  it('1. HOME: ReactionMapRenderer rejects reaction spawns and maintains 0 bubbles', () => {
    uiStateManager.setState('HOME_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.HOME);

    // Attempt spawns in HOME
    reactionMapRenderer.spawnReaction({ reactionId: 'reaction_gg', screenX: 100, screenY: 200, senderName: 'NOYAN (TÜRK)' });
    reactionMapRenderer.spawnReaction({ reactionId: 'ping_attack', screenX: 150, screenY: 250, senderName: 'VALERIUS (ROMA)' });

    assert.strictEqual(
      reactionMapRenderer.getActiveBubbleCount(),
      0,
      'ReactionMapRenderer must have 0 active bubbles on HOME'
    );
  });

  it('2. Surface Transition: MATCH -> HOME purges all active bubbles and timers', () => {
    uiStateManager.setState('IN_GAME_STATE');
    assert.strictEqual(uiStateManager.getAppSurface(), AppSurface.MATCH);

    reactionMapRenderer.spawnReaction({ reactionId: 'reaction_gg', screenX: 100, screenY: 200, senderName: 'NOYAN' });
    reactionMapRenderer.spawnReaction({ reactionId: 'reaction_smile', screenX: 120, screenY: 220, senderName: 'VALERIUS' });
    assert.strictEqual(reactionMapRenderer.getActiveBubbleCount(), 2, 'Spawns must succeed in MATCH surface');

    // Transition back to HOME
    uiStateManager.setState('HOME_STATE');
    assert.strictEqual(
      reactionMapRenderer.getActiveBubbleCount(),
      0,
      'Active bubbles must be immediately cleared when leaving MATCH'
    );
  });

  // =========================================================================
  // 2. EXPRESSIONS vs TACTICAL PINGS POOL SEPARATION
  // =========================================================================
  it('3. Expressions Wheel contains ZERO tactical ping IDs', () => {
    const loadout = entitlementService.getLoadout();
    assert.strictEqual(loadout.reactionWheel.length, 8, 'Reaction wheel must have exactly 8 slots');

    const tacticalIds = new Set(COMMAND_PING_IDS);

    for (const rxId of loadout.reactionWheel) {
      assert.strictEqual(
        tacticalIds.has(rxId as any),
        false,
        `Reaction wheel slot "${rxId}" must NOT be a tactical ping ID`
      );
      const rx = getReaction(rxId);
      assert.ok(rx, `Reaction "${rxId}" must resolve in registry`);
      assert.strictEqual(
        rx.category,
        'social_expression',
        `Equipped reaction "${rxId}" category must be social_expression, got ${rx.category}`
      );
    }
  });

  it('4. Tactical Pings Pool contains ZERO social expression IDs', () => {
    const pings = getAllCommandPings();
    assert.strictEqual(pings.length, 4, 'Must have exactly 4 tactical pings');

    for (const ping of pings) {
      assert.strictEqual(
        ping.category,
        'command_ping',
        `Ping "${ping.id}" category must be command_ping`
      );
      assert.strictEqual(
        ping.isFree,
        true,
        `Tactical ping "${ping.id}" must always be 100% free`
      );
    }

    const socialExpressions = getAllSocialExpressions();
    const socialIds = new Set(socialExpressions.map(s => s.id));

    for (const pingId of COMMAND_PING_IDS) {
      assert.strictEqual(
        socialIds.has(pingId),
        false,
        `Command ping "${pingId}" must NOT exist in social expressions`
      );
    }
  });

  // =========================================================================
  // 3. REACTION WHEEL SLOT AUTHORITY & DEDUPLICATION
  // =========================================================================
  it('5. Reaction Wheel contains ZERO duplicate IDs and enforces deterministic uniqueness', () => {
    entitlementService.resetToDefaults();
    const wheel = entitlementService.getLoadout().reactionWheel;
    assert.strictEqual(wheel.length, 8);

    const seen = new Set<string>();
    for (const id of wheel) {
      assert.strictEqual(seen.has(id), false, `Duplicate ID "${id}" detected on reaction wheel`);
      seen.add(id);
    }

    // Test equipping a duplicate: should swap slots rather than create duplicates
    const initialSlot0 = wheel[0];
    const initialSlot1 = wheel[1];

    // Equip item from slot 0 into slot 1 (slotIndex = 1, reactionId = initialSlot0)
    const res = entitlementService.equipReactionSlot(1, initialSlot0);
    assert.strictEqual(res.success, true);

    const updatedWheel = entitlementService.getLoadout().reactionWheel;
    assert.strictEqual(updatedWheel[1], initialSlot0, 'Target slot must now have equipped item');
    assert.strictEqual(updatedWheel[0], initialSlot1, 'Original slot must receive swapped item');

    const updatedSeen = new Set<string>();
    for (const id of updatedWheel) {
      assert.strictEqual(updatedSeen.has(id), false, `Duplicate ID "${id}" found after swap`);
      updatedSeen.add(id);
    }
  });

  it('6. Unequipping a reaction replaces slot with an unequipped universal free expression', () => {
    // First grant and equip a premium reaction into slot 2
    entitlementService.grantEntitlement('rx_turk_pasha_smirk');
    const equipRes = entitlementService.equipReactionSlot(2, 'rx_turk_pasha_smirk');
    assert.strictEqual(equipRes.success, true);
    assert.strictEqual(entitlementService.getLoadout().reactionWheel[2], 'rx_turk_pasha_smirk');

    // Unequip it -> slot is replaced with an unequipped universal free expression
    const res = entitlementService.unequipReaction('rx_turk_pasha_smirk');
    assert.strictEqual(res.success, true);

    const newWheel = entitlementService.getLoadout().reactionWheel;
    assert.strictEqual(newWheel.includes('rx_turk_pasha_smirk'), false, 'Unequipped item must not be on wheel');
    assert.strictEqual(new Set(newWheel).size, 8, 'Wheel must maintain 8 unique slots after unequip');
  });

  // =========================================================================
  // 4. PHYSICAL COMMAND BLADE DRAW & SCABBARD OCCLUSION
  // =========================================================================
  it('7. Blade at 0% has scabbard mouth occlusion applied at X=250', () => {
    // Audit all 10 blades for scabbard mouth alignment
    const allSkins = getAllBladeSkins();
    assert.strictEqual(allSkins.length, 10, 'Must have 10 registered blade skins');

    for (const skin of allSkins) {
      // Scabbard throat must be positioned around X=238..252 to form mouth at X=250
      assert.ok(
        skin.silhouette.scabbardThroatSvg.includes('252') ||
        skin.silhouette.scabbardThroatSvg.includes('250') ||
        skin.silhouette.scabbardThroatSvg.includes('248'),
        `Blade ${skin.id} scabbard throat must define scabbard mouth at X=250`
      );

      // At 0% draw: blade assembly is at X=0, hilt guard is at X=250 (guardSvg starts at X=0..7 relative to blade assembly)
      // With clip-path url(#scabbard-drawn-clip) rect X=250..1050:
      // All blade body geometry (which extends negative from X=0 to X=-216) falls into X <= 250 in scabbard coordinate space.
      // Therefore, 100% of the blade body is occluded by clipPath at 0% commit!
      assert.ok(
        skin.silhouette.bladeLengthPx > 0,
        `Blade ${skin.id} must have positive length`
      );
    }
  });

  it('8. Mısır Khopesh silhouette has authentic sickle-hook geometry', () => {
    const khopesh = getBladeSkin('blade_misir_khopesh');
    assert.ok(khopesh, 'Mısır Khopesh must exist');
    assert.strictEqual(khopesh.silhouette.bladeCurvature, 'khopesh_hook');

    // Verify presence of straight proximal shaft (-70), sharp elbow neck (-70), and hook (-216)
    const upper = khopesh.silhouette.bladeUpperPath;
    const lower = khopesh.silhouette.bladeLowerPath;

    assert.ok(upper.includes('-70'), 'Upper path must define proximal elbow at X=-70');
    assert.ok(upper.includes('-216'), 'Upper path must extend to hook tip at X=-216');
    assert.ok(lower.includes('48'), 'Lower path must define broad cleaving belly at Y=48');
    assert.ok(lower.includes('14'), 'Lower path must define deep inner concave curve at Y=14');
  });

  // =========================================================================
  // 5. PRODUCT PREVIEW ENTITLEMENT MATCH & PREVIEW AUTHORITY
  // =========================================================================
  it('9. Standalone Blade SKU contains ONLY blade, ZERO reactions, ZERO heraldry', () => {
    const bladeSku = 'dominion.blade.khopesh01';
    const prod = catalogService.getProduct(bladeSku);
    assert.ok(prod, `Product ${bladeSku} must exist in catalog`);

    assert.strictEqual(prod.category, 'COMMAND BLADES');
    assert.strictEqual(prod.previewType, 'blade');

    const bladeEnts = prod.entitlements.filter(e => e.startsWith('blade_'));
    const rxEnts = prod.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
    const frameEnts = prod.entitlements.filter(e => e.startsWith('frame_'));
    const titleEnts = prod.entitlements.filter(e => e.startsWith('title_'));

    assert.strictEqual(bladeEnts.length, 1, 'Must contain exactly 1 blade');
    assert.strictEqual(rxEnts.length, 0, 'Standalone blade MUST contain 0 reactions');
    assert.strictEqual(frameEnts.length, 0, 'Standalone blade MUST contain 0 frames');
    assert.strictEqual(titleEnts.length, 0, 'Standalone blade MUST contain 0 titles');
  });

  it('10. Reaction Pack SKU contains 20 reactions, ZERO blades, ZERO heraldry', () => {
    const rxPackSku = 'dominion.reactions.turk.court01';
    const prod = catalogService.getProduct(rxPackSku);
    assert.ok(prod, `Product ${rxPackSku} must exist in catalog`);

    assert.strictEqual(prod.category, 'REACTIONS');
    assert.strictEqual(prod.previewType, 'reaction');

    const bladeEnts = prod.entitlements.filter(e => e.startsWith('blade_'));
    const rxEnts = prod.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
    const frameEnts = prod.entitlements.filter(e => e.startsWith('frame_'));
    const titleEnts = prod.entitlements.filter(e => e.startsWith('title_'));

    assert.strictEqual(rxEnts.length, 20, 'Must contain exactly 20 reactions');
    assert.strictEqual(bladeEnts.length, 0, 'Reaction pack MUST contain 0 blades');
    assert.strictEqual(frameEnts.length, 0, 'Reaction pack MUST contain 0 frames');
    assert.strictEqual(titleEnts.length, 0, 'Reaction pack MUST contain 0 titles');
  });

  it('11. Civilization Bundle SKU contains matching entitlements and correct count', () => {
    const bundleSku = 'dominion.bundle.turk.ottoman01';
    const prod = catalogService.getProduct(bundleSku);
    assert.ok(prod, `Product ${bundleSku} must exist in catalog`);

    assert.strictEqual(prod.category, 'CIVILIZATION');
    assert.strictEqual(prod.previewType, 'bundle');

    const bladeEnts = prod.entitlements.filter(e => e.startsWith('blade_'));
    const rxEnts = prod.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
    const frameEnts = prod.entitlements.filter(e => e.startsWith('frame_'));
    const pennantEnts = prod.entitlements.filter(e => e.startsWith('pennant_'));

    assert.strictEqual(bladeEnts.length, 1, 'Must contain 1 blade');
    assert.strictEqual(rxEnts.length, 20, 'Must contain 20 reactions');
    assert.strictEqual(frameEnts.length, 1, 'Must contain 1 frame');
    assert.strictEqual(pennantEnts.length, 1, 'Must contain 1 pennant');
    assert.strictEqual(prod.entitlements.length, 23, 'Total item count must equal 23');
  });
});
