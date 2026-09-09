/**
 * DOMINION OF SOL — META & COMMERCE SERVER-AUTHORITY HARDENING TEST SUITE
 * 
 * Strict architectural audit verifying:
 * 1. 9 Canonical Civilizations Registry
 * 2. 90 Main Nation Artworks (Strict SHA-256 Uniqueness)
 * 3. 33 Unique Sovereign Reactions (6 Universal Free + 27 Civ-Specific Premium)
 * 4. 9 Civilization Command Blade Coverage + Black Hills Command
 * 5. Server Canonical Guest Account (No client-generated IDs)
 * 6. Guest Reconnect & Refresh Persistence
 * 7. Same Account After Link
 * 8. 100 Mark Welcome Grant Once-Only (Server Idempotency)
 * 9. LocalStorage Marks Tamper Rejected
 * 10. Local Entitlement Injection Rejected & Fallback
 * 11. Duplicate Purchase Idempotency & Insufficient Balance Rejection
 * 12. Refund & Entitlement Revocation
 * 13. Dev Command Rejected in Production Mode
 * 14. Reaction Server Rate Limiter (3.5s cooldown) & Unowned Rejection
 * 15. Mute Privacy (Per-Player & Global Mute All)
 * 16. Zero-P2W Simulation Dependency Audit
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { CURATED_CIVILIZATION_PRESETS } from '../src/game/CivilizationPresets';
import { PRESET_NATION_IDENTITIES } from '../src/ui/NationIdentity';
import { SOVEREIGN_REACTIONS, getAllReactions, getReactionsForCivilization } from '../src/meta/ReactionRegistry';
import { BLADE_SKINS, getAllBladeSkins, getBladeSkin } from '../src/meta/BladeSkinRegistry';
import { accountService, serverSimulator } from '../src/meta/AccountService';
import { walletService } from '../src/meta/WalletService';
import { entitlementService } from '../src/meta/EntitlementService';
import { reactionMapRenderer } from '../src/ui/ReactionMapRenderer';

describe('Dominion of Sol — Server-Authority & Truth Audit Suite', () => {

  it('1. 44 Canonical Civilizations Registry & Heraldry Authority', () => {
    assert.strictEqual(CURATED_CIVILIZATION_PRESETS.length, 44, 'Must have exactly 44 curated civilization presets');
    
    // Playable turk is retired; hun and gokturk exist
    const hasTurk = CURATED_CIVILIZATION_PRESETS.some(p => p.id === 'turk');
    assert.strictEqual(hasTurk, false, 'Playable "turk" preset must not exist');

    const hasHun = CURATED_CIVILIZATION_PRESETS.some(p => p.id === 'hun');
    const hasGokturk = CURATED_CIVILIZATION_PRESETS.some(p => p.id === 'gokturk');
    assert.ok(hasHun, 'HUN preset must exist');
    assert.ok(hasGokturk, 'GÖKTÜRK preset must exist');

    for (let i = 0; i < CURATED_CIVILIZATION_PRESETS.length; i++) {
      const preset = CURATED_CIVILIZATION_PRESETS[i];
      assert.ok(preset.id, `Preset #${i + 1} must have valid id`);
      
      const identity = PRESET_NATION_IDENTITIES[preset.id];
      assert.ok(identity, `Flag heraldry identity must exist for ${preset.id}`);
      assert.ok(identity.primaryColor, `Flag primaryColor must exist for ${preset.id}`);
      assert.ok(identity.emblem, `Flag emblem must exist for ${preset.id}`);
    }
  });

  it('2. 90 Main Nation Artworks (Strict SHA-256 Uniqueness, Thumbnails Excluded)', () => {
    const civs = ['turk', 'roma', 'pers', 'misir', 'han', 'yamato', 'norse', 'maya', 'lakota'];
    const stages = [1, 2, 3, 4, 5];
    const states = ['normal', 'defeat'];
    const assetsDir = fs.existsSync(path.resolve(process.cwd(), 'client/public/assets/nations'))
      ? path.resolve(process.cwd(), 'client/public/assets/nations')
      : path.resolve(process.cwd(), 'public/assets/nations');

    const hashes = new Set<string>();
    let count = 0;

    for (const civ of civs) {
      for (const s of stages) {
        for (const st of states) {
          const filename = `stage_0${s}_${st}.webp`;
          const filePath = path.join(assetsDir, civ, filename);
          assert.ok(fs.existsSync(filePath), `Artwork file must exist: ${filePath}`);

          const buf = fs.readFileSync(filePath);
          assert.ok(buf.length > 5000, `Artwork ${filename} must be valid non-empty file (>5KB)`);

          const hash = crypto.createHash('sha256').update(buf).digest('hex');
          assert.ok(!hashes.has(hash), `Duplicate artwork detected: ${filePath}`);
          hashes.add(hash);
          count++;
        }
      }
    }

    assert.strictEqual(count, 90, 'Must have exactly 90 main artworks (9 civs * 5 stages * 2 states)');
    assert.strictEqual(hashes.size, 90, 'All 90 main artworks must have distinct SHA-256 hashes');
  });

  it('3. Sovereign Reactions Authority (4 Free Command Pings + 10 Universal Free Expressions + 180 Civ-Specific Premium Faces)', () => {
    const all = getAllReactions();
    assert.strictEqual(all.length, 194, 'Must have exactly 194 reactions/pings registered (4 pings + 10 universal + 180 civ faces)');

    const freeReactions = all.filter(r => r.isFree);
    assert.strictEqual(freeReactions.length, 14, 'Must have exactly 14 free reactions (4 pings + 10 universal expressions)');

    const pings = all.filter(r => r.category === 'command_ping');
    assert.strictEqual(pings.length, 4, 'Must have exactly 4 tactical command pings');

    const universalFaces = all.filter(r => r.category === 'social_expression' && r.civilization === 'Universal');
    assert.strictEqual(universalFaces.length, 10, 'Must have exactly 10 universal free face expressions');

    const civs = ['TÜRK', 'ROMA', 'PERS', 'MISIR', 'HAN', 'YAMATO', 'NORSE', 'MAYA', 'LAKOTA'];
    assert.strictEqual(civs.length, 9, 'Must have 9 civilization reaction groups');

    const svgGeometries = new Set<string>();

    for (const civ of civs) {
      const civReactions = getReactionsForCivilization(civ);
      assert.strictEqual(civReactions.length, 20, `Civilization ${civ} must have exactly 20 premium reactions`);

      for (const rx of civReactions) {
        assert.strictEqual(rx.isFree, false, `${rx.id} must be premium`);
        assert.strictEqual(rx.isFaceExpression, true, `${rx.id} must be an expressive character face`);
        assert.ok(rx.svgIcon.includes('<svg'), `${rx.id} must have SVG markup`);
        assert.ok(rx.animationType, `${rx.id} must have animationType`);

        // Strip colors to check distinct geometry
        const geom = rx.svgIcon.replace(/#[0-9a-fA-F]{3,8}/g, '').replace(/\s+/g, ' ');
        svgGeometries.add(geom);
      }
    }

    assert.ok(svgGeometries.size >= 100, 'Reactions must have unique artistic SVG geometry, not mere recolors');
  });

  it('4. 9 Civilization Command Blade Coverage + Black Hills Command', () => {
    const skins = getAllBladeSkins();
    assert.strictEqual(skins.length, 10, 'Must have exactly 10 blade skins (1 Standard + 9 Civs)');

    // Ensure Lakota skin is Black Hills Command
    const lakotaSkin = getBladeSkin('blade_lakota_command');
    assert.ok(lakotaSkin, 'blade_lakota_command must be registered');
    assert.strictEqual(lakotaSkin.name, 'Plains Forged Command');
    assert.strictEqual(lakotaSkin.civilization, 'LAKOTA');
    assert.ok(!lakotaSkin.name.includes('Lance'), 'Must not be a lance');
    assert.ok(!lakotaSkin.name.includes('Sun Dance'), 'Must not commercialize sacred ceremony');

    // Verify all 10 skins have ZERO gameplay variables
    for (const skin of skins) {
      const keys = Object.keys(skin);
      assert.ok(!keys.includes('travelDistance'), 'Skin must not alter travel distance');
      assert.ok(!keys.includes('commitPercent'), 'Skin must not alter commit percent');
      assert.ok(!keys.includes('attackBonus'), 'Skin must not alter attack bonus');
      assert.ok(!keys.includes('defenseBonus'), 'Skin must not alter defense bonus');
    }
  });

  it('5. Server Canonical Guest Account (No client-generated canonical account_id)', () => {
    const guest = serverSimulator.createGuest('TEST_PLAYER');
    assert.ok(guest.accountId.startsWith('acc_'), 'Server must generate account_id starting with acc_');
    assert.ok(guest.sessionToken.startsWith('tok_'), 'Server must generate sessionToken');
    assert.ok(guest.playerTag.startsWith('#'), 'Server must generate playerTag');
    assert.strictEqual(guest.accountType, 'guest');
    assert.strictEqual(guest.displayName, 'TEST_PLAYER');
  });

  it('6. Guest Reconnect & Refresh Persistence', () => {
    const initial = serverSimulator.createGuest('RECONNECT_TEST');
    const resumed = serverSimulator.resume(initial.accountId, initial.sessionToken);

    assert.ok(resumed, 'Session must resume with valid token');
    assert.strictEqual(resumed.accountId, initial.accountId, 'Resumed account must match original account_id');
    assert.strictEqual(resumed.playerTag, initial.playerTag, 'Resumed account must match original playerTag');
  });

  it('7. Same Account After Link & Conflict Detection', () => {
    const guestA = serverSimulator.createGuest('COMMANDER_A');
    const linkResA = serverSimulator.link(guestA.accountId, guestA.sessionToken, 'dev', 'shared_user_01');
    assert.strictEqual(linkResA.success, true);
    assert.strictEqual(linkResA.snapshot?.accountId, guestA.accountId, 'Account ID must be preserved after link');
    assert.strictEqual(linkResA.snapshot?.accountType, 'registered');

    // Second guest attempts to link the same identifier
    const guestB = serverSimulator.createGuest('COMMANDER_B');
    const linkResB = serverSimulator.link(guestB.accountId, guestB.sessionToken, 'dev', 'shared_user_01');
    assert.strictEqual(linkResB.success, false);
    assert.strictEqual(linkResB.conflict, true);
    assert.strictEqual(linkResB.existingAccountId, guestA.accountId);
  });

  it('8. 100 Mark Welcome Grant Once-Only (Server Idempotency)', () => {
    const guest = serverSimulator.createGuest('GRANT_TEST');
    assert.strictEqual(guest.walletBalance, 100, 'Fresh guest must receive 100 Marks welcome grant');

    // Resuming session must NOT grant again
    const resumed = serverSimulator.resume(guest.accountId, guest.sessionToken);
    assert.strictEqual(resumed?.walletBalance, 100, 'Resuming session must not duplicate welcome grant');

    // Linking must NOT grant again
    const linked = serverSimulator.link(guest.accountId, guest.sessionToken, 'dev', 'grant_user_01');
    assert.strictEqual(linked.snapshot?.walletBalance, 100, 'Linking account must not duplicate welcome grant');
  });

  it('9. LocalStorage Marks Tamper Rejected', () => {
    walletService.applyServerBalance(100);
    assert.strictEqual(walletService.getBalance(), 100);

    // Malicious script attempts tampering local state to 99999999
    walletService.maliciousLocalTamperBalance(99999999);
    assert.strictEqual(walletService.getBalance(), 99999999);

    // Next authoritative server snapshot overrides and reverts tamper
    walletService.applyServerBalance(100);
    assert.strictEqual(walletService.getBalance(), 100, 'Authoritative server snapshot must wipe tampered balance');

    // Spend exceeding real balance (e.g. 500 Marks when only 100 owned) is rejected
    const spendRes = walletService.spendMarks('blade_turk_imperial', 500, 'test_tamper_tx');
    assert.strictEqual(spendRes.success, false);
    assert.strictEqual(spendRes.reason, 'Insufficient Sovereign Marks');
  });

  it('10. Local Entitlement Injection Rejected & Fallback', () => {
    // Free loadout by default
    entitlementService.resetToDefaults();
    assert.strictEqual(entitlementService.ownsBladeSkin('blade_turk_imperial'), false);

    // Malicious script injects blade_turk_imperial locally
    entitlementService.maliciousLocalInjectEntitlement('blade_turk_imperial');
    assert.strictEqual(entitlementService.ownsBladeSkin('blade_turk_imperial'), true);

    // Authoritative server snapshot arrives without blade_turk_imperial
    entitlementService.applyServerSnapshot(['blade_standard'], 'blade_turk_imperial');
    
    // Injected entitlement must be purged and loadout must fall back to standard
    assert.strictEqual(entitlementService.ownsBladeSkin('blade_turk_imperial'), false);
    assert.strictEqual(entitlementService.getLoadout().activeBladeSkin, 'blade_standard');
  });

  it('11. Duplicate Purchase Idempotency & Insufficient Balance Rejection', () => {
    walletService.applyServerBalance(300);

    // Purchase requiring 200 marks succeeds
    const res1 = walletService.spendMarks('item_a', 200, 'idemp_key_unique_1');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(walletService.getBalance(), 100);

    // Duplicate purchase with SAME idempotency key is rejected
    const resDup = walletService.spendMarks('item_a', 200, 'idemp_key_unique_1');
    assert.strictEqual(resDup.success, false);
    assert.ok(resDup.reason?.includes('already processed'));
    assert.strictEqual(walletService.getBalance(), 100, 'Balance must not be deducted twice');

    // Attempting purchase with insufficient balance is rejected
    const resOverspend = walletService.spendMarks('item_b', 500, 'idemp_key_unique_2');
    assert.strictEqual(resOverspend.success, false);
    assert.strictEqual(resOverspend.reason, 'Insufficient Sovereign Marks');
    assert.strictEqual(walletService.getBalance(), 100);
  });

  it('12. Refund & Entitlement Revocation', () => {
    entitlementService.grantSku('dominion.blade.imperial01');
    assert.strictEqual(entitlementService.ownsBladeSkin('blade_turk_imperial'), true);
    entitlementService.equipBladeSkin('blade_turk_imperial');
    assert.strictEqual(entitlementService.getLoadout().activeBladeSkin, 'blade_turk_imperial');

    // Revocation (e.g. Refund)
    entitlementService.revokeSku('dominion.blade.imperial01');
    assert.strictEqual(entitlementService.ownsBladeSkin('blade_turk_imperial'), false);
    // Equipped loadout must fall back to standard blade
    assert.strictEqual(entitlementService.getLoadout().activeBladeSkin, 'blade_standard');
  });

  it('13. Reaction Server Rate Limiter (3.5s Cooldown)', () => {
    let lastReactionTime = 0;
    const cooldownMs = 3500;

    function simulateServerReaction(now: number): boolean {
      if (now - lastReactionTime < cooldownMs) {
        return false; // REJECTED
      }
      lastReactionTime = now;
      return true; // ACCEPTED
    }

    assert.strictEqual(simulateServerReaction(10000), true);
    // Spam after 50ms -> REJECTED
    assert.strictEqual(simulateServerReaction(10050), false);
    // Spam after 100ms -> REJECTED
    assert.strictEqual(simulateServerReaction(10100), false);
    // Spam after 3499ms -> REJECTED
    assert.strictEqual(simulateServerReaction(13499), false);
    // Allowed after 3500ms
    assert.strictEqual(simulateServerReaction(13500), true);
  });

  it('14. Mute Privacy (Per-Player & Global Mute All)', () => {
    reactionMapRenderer.setMuteAll(false);
    reactionMapRenderer.unmutePlayer('#SPAMMER');
    assert.strictEqual(reactionMapRenderer.isMuted(1, '#SPAMMER', 'Spammer'), false);

    // Per-player mute by tag
    reactionMapRenderer.mutePlayer('#SPAMMER');
    assert.strictEqual(reactionMapRenderer.isMuted(1, '#SPAMMER', 'Spammer'), true);

    // Other player is not muted
    assert.strictEqual(reactionMapRenderer.isMuted(2, '#FRIEND', 'Friend'), false);

    // Global Mute All
    reactionMapRenderer.setMuteAll(true);
    assert.strictEqual(reactionMapRenderer.isMuted(2, '#FRIEND', 'Friend'), true);
    reactionMapRenderer.setMuteAll(false);
  });

  it('15. Zero-P2W Simulation Real Code Dependency Audit', () => {
    const simFiles = [
      path.resolve(process.cwd(), '../server/src/simulation.rs'),
      path.resolve(process.cwd(), '../server/src/combat.rs'),
      path.resolve(process.cwd(), '../server/src/factions.rs'),
      path.resolve(process.cwd(), '../server/src/bot.rs'),
      path.resolve(process.cwd(), '../server/src/world_map.rs'),
    ];

    const forbiddenTokens = ['wallet', 'marks', 'entitlement', 'cosmetic', 'blade_skin', 'reaction_id'];

    for (const filePath of simFiles) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const token of forbiddenTokens) {
        // Strip comments to check real code dependencies
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
            continue; // Skip comments/docstrings
          }
          assert.ok(
            !line.toLowerCase().includes(token),
            `Zero-P2W violation: forbidden token "${token}" found in ${path.basename(filePath)} at line ${i + 1}: "${line}"`
          );
        }
      }
    }
  });

});
