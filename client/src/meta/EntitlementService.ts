/**
 * DOMINION OF SOL — ENTITLEMENTS & COSMETIC LOADOUT SERVICE
 * 
 * Rules:
 * 1. Zero pay-to-win: All entitlements are strictly cosmetic.
 * 2. Free players have useful starter kit: 6 universal free reactions, standard blade, default frame/title.
 * 3. Cannot equip unowned items.
 * 4. Revocation (e.g. refund) gracefully falls back equipped loadout to standard items.
 */

import { accountService } from './AccountService';
import { catalogService, CatalogProduct } from './CatalogService';
import { BLADE_SKINS, getBladeSkin } from './BladeSkinRegistry';
import { SOVEREIGN_REACTIONS, getReaction } from './ReactionRegistry';
import { telemetry } from './Telemetry';
import { safeStorage } from './StorageHelper';

export interface CosmeticLoadout {
  activeBladeSkin: string; // id from BLADE_SKINS
  activeProfileFrame: string; // e.g. 'frame_default'
  activeTitle: string; // e.g. 'title_commander'
  reactionWheel: string[]; // 8 reaction IDs
}

export interface EntitlementSnapshot {
  accountId: string;
  ownedSkus: string[];
  ownedReactions: string[];
  ownedBladeSkins: string[];
  ownedProfileFrames: string[];
  ownedTitles: string[];
  ownedPennants: string[];
  loadout: CosmeticLoadout;
}

const STORAGE_KEY_ENTITLEMENTS = 'dominion.commerce.entitlements';

export const UNIVERSAL_FREE_REACTIONS = [
  'reaction_gg',
  'reaction_smile',
  'reaction_laugh',
  'reaction_angry',
  'reaction_surprised',
  'reaction_cry',
  'reaction_smirk',
  'reaction_applause',
  'reaction_facepalm',
  'reaction_bored',
];

const DEFAULT_LOADOUT: CosmeticLoadout = {
  activeBladeSkin: 'blade_standard',
  activeProfileFrame: 'frame_default',
  activeTitle: 'title_commander',
  reactionWheel: [
    'reaction_gg',
    'reaction_smile',
    'reaction_laugh',
    'reaction_angry',
    'reaction_surprised',
    'reaction_cry',
    'reaction_smirk',
    'reaction_applause',
  ],
};

const DEFAULT_FREE_ENTITLEMENTS = {
  reactions: [
    'reaction_gg',
    'reaction_smile',
    'reaction_laugh',
    'reaction_angry',
    'reaction_surprised',
    'reaction_cry',
    'reaction_smirk',
    'reaction_applause',
    'reaction_facepalm',
    'reaction_bored',
  ],
  bladeSkins: ['blade_standard'],
  profileFrames: ['frame_default'],
  titles: ['title_commander', 'title_sovereign'],
};

class EntitlementService {
  private ownedSkus = new Set<string>();
  private ownedReactions = new Set<string>(DEFAULT_FREE_ENTITLEMENTS.reactions);
  private ownedBladeSkins = new Set<string>(DEFAULT_FREE_ENTITLEMENTS.bladeSkins);
  private ownedProfileFrames = new Set<string>(DEFAULT_FREE_ENTITLEMENTS.profileFrames);
  private ownedTitles = new Set<string>(DEFAULT_FREE_ENTITLEMENTS.titles);
  private ownedPennants = new Set<string>();
  private loadout: CosmeticLoadout = { ...DEFAULT_LOADOUT, reactionWheel: [...DEFAULT_LOADOUT.reactionWheel] };

  constructor() {
    this.loadState();
  }

  private getAccountId(): string {
    try {
      return accountService?.getAccount?.()?.accountId || 'default';
    } catch {
      return 'default';
    }
  }

  private loadState(): void {
    const accountId = this.getAccountId();
    try {
      const raw = safeStorage.getItem(`${STORAGE_KEY_ENTITLEMENTS}_${accountId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as EntitlementSnapshot;
        if (parsed) {
          this.ownedSkus = new Set(parsed.ownedSkus || []);
          this.ownedReactions = new Set([
            ...DEFAULT_FREE_ENTITLEMENTS.reactions,
            ...(parsed.ownedReactions || []),
          ]);
          this.ownedBladeSkins = new Set([
            ...DEFAULT_FREE_ENTITLEMENTS.bladeSkins,
            ...(parsed.ownedBladeSkins || []),
          ]);
          this.ownedProfileFrames = new Set([
            ...DEFAULT_FREE_ENTITLEMENTS.profileFrames,
            ...(parsed.ownedProfileFrames || []),
          ]);
          this.ownedTitles = new Set([
            ...DEFAULT_FREE_ENTITLEMENTS.titles,
            ...(parsed.ownedTitles || []),
          ]);
          this.ownedPennants = new Set(parsed.ownedPennants || []);
          if (parsed.loadout) {
            this.loadout = {
              activeBladeSkin: parsed.loadout.activeBladeSkin || 'blade_standard',
              activeProfileFrame: parsed.loadout.activeProfileFrame || 'frame_default',
              activeTitle: parsed.loadout.activeTitle || 'title_commander',
              reactionWheel: Array.isArray(parsed.loadout.reactionWheel) && parsed.loadout.reactionWheel.length === 8
                ? [...parsed.loadout.reactionWheel]
                : [...DEFAULT_LOADOUT.reactionWheel],
            };
          }
          this.validateLoadoutFallback();
          return;
        }
      }
    } catch (e) {
      console.warn('[ENTITLEMENT] Error loading state from storage:', e);
    }

    // Default initialization
    this.resetToDefaults();
  }

  private saveState(): void {
    const accountId = this.getAccountId();
    const snapshot: EntitlementSnapshot = {
      accountId,
      ownedSkus: Array.from(this.ownedSkus),
      ownedReactions: Array.from(this.ownedReactions),
      ownedBladeSkins: Array.from(this.ownedBladeSkins),
      ownedProfileFrames: Array.from(this.ownedProfileFrames),
      ownedTitles: Array.from(this.ownedTitles),
      ownedPennants: Array.from(this.ownedPennants),
      loadout: {
        ...this.loadout,
        reactionWheel: [...this.loadout.reactionWheel],
      },
    };

    try {
      safeStorage.setItem(`${STORAGE_KEY_ENTITLEMENTS}_${accountId}`, JSON.stringify(snapshot));
    } catch (e) {
      console.error('[ENTITLEMENT] Failed to persist state:', e);
    }
    this.notify();
  }

  private notify(): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dominion:entitlements-changed', {
        detail: this.getSnapshot()
      }));
    }
  }

  public getSnapshot(): EntitlementSnapshot {
    return {
      accountId: this.getAccountId(),
      ownedSkus: Array.from(this.ownedSkus),
      ownedReactions: Array.from(this.ownedReactions),
      ownedBladeSkins: Array.from(this.ownedBladeSkins),
      ownedProfileFrames: Array.from(this.ownedProfileFrames),
      ownedTitles: Array.from(this.ownedTitles),
      ownedPennants: Array.from(this.ownedPennants),
      loadout: {
        ...this.loadout,
        reactionWheel: [...this.loadout.reactionWheel],
      },
    };
  }

  public resetToDefaults(): void {
    this.ownedSkus.clear();
    this.ownedReactions = new Set(DEFAULT_FREE_ENTITLEMENTS.reactions);
    this.ownedBladeSkins = new Set(DEFAULT_FREE_ENTITLEMENTS.bladeSkins);
    this.ownedProfileFrames = new Set(DEFAULT_FREE_ENTITLEMENTS.profileFrames);
    this.ownedTitles = new Set(DEFAULT_FREE_ENTITLEMENTS.titles);
    this.ownedPennants = new Set();
    this.loadout = { ...DEFAULT_LOADOUT, reactionWheel: [...DEFAULT_LOADOUT.reactionWheel] };
    this.saveState();
  }

  /**
   * Applies authoritative entitlements from the server snapshot.
   * Completely purges any client-injected or tampered entitlements.
   */
  public applyServerSnapshot(entitlements: string[], equippedBladeSkin?: string, reactionWheel?: string[]): void {
    this.ownedBladeSkins = new Set([...DEFAULT_FREE_ENTITLEMENTS.bladeSkins]);
    this.ownedReactions = new Set([...DEFAULT_FREE_ENTITLEMENTS.reactions]);
    this.ownedProfileFrames = new Set([...DEFAULT_FREE_ENTITLEMENTS.profileFrames]);
    this.ownedTitles = new Set([...DEFAULT_FREE_ENTITLEMENTS.titles]);
    this.ownedPennants = new Set();

    for (const ent of entitlements) {
      const skin = getBladeSkin(ent);
      if (skin && (skin.id !== 'blade_standard' || ent === 'blade_standard')) {
        this.ownedBladeSkins.add(skin.id);
        this.ownedBladeSkins.add(ent);
      } else if (BLADE_SKINS[ent]) {
        this.ownedBladeSkins.add(ent);
      } else if (SOVEREIGN_REACTIONS[ent]) {
        this.ownedReactions.add(ent);
      } else if (ent.startsWith('frame_')) {
        this.ownedProfileFrames.add(ent);
      } else if (ent.startsWith('title_')) {
        this.ownedTitles.add(ent);
      } else if (ent.startsWith('pennant_')) {
        this.ownedPennants.add(ent);
      }
    }

    if (equippedBladeSkin && this.ownsBladeSkin(equippedBladeSkin)) {
      const skin = getBladeSkin(equippedBladeSkin);
      this.loadout.activeBladeSkin = skin ? skin.id : equippedBladeSkin;
    } else {
      this.loadout.activeBladeSkin = 'blade_standard';
    }

    if (reactionWheel && Array.isArray(reactionWheel) && reactionWheel.length === 8) {
      for (let i = 0; i < 8; i++) {
        const r = reactionWheel[i];
        this.loadout.reactionWheel[i] = (r && this.ownsReaction(r)) ? r : (DEFAULT_LOADOUT.reactionWheel[i] || 'reaction_gg');
      }
    }

    this.validateLoadoutFallback();
    this.saveState();
  }

  /**
   * Simulates local entitlement injection (e.g. tampering in client storage/console).
   * Used for security verification that unowned items get purged by server snapshot.
   */
  public maliciousLocalInjectEntitlement(entitlementId: string): void {
    if (BLADE_SKINS[entitlementId]) {
      this.ownedBladeSkins.add(entitlementId);
    } else if (SOVEREIGN_REACTIONS[entitlementId]) {
      this.ownedReactions.add(entitlementId);
    } else if (entitlementId.startsWith('pennant_')) {
      this.ownedPennants.add(entitlementId);
    }
  }

  // ============================================================
  // OWNERSHIP QUERIES
  // ============================================================

  public ownsSku(sku: string): boolean {
    return this.ownedSkus.has(sku);
  }

  public ownsBladeSkin(skinId: string): boolean {
    if (this.ownedBladeSkins.has(skinId)) return true;
    if (BLADE_SKINS[skinId] || skinId.startsWith('blade_') || skinId.startsWith('dominion.blade.')) {
      const skin = getBladeSkin(skinId);
      return skin ? this.ownedBladeSkins.has(skin.id) : false;
    }
    return false;
  }

  public ownsReaction(reactionId: string): boolean {
    if (this.ownedReactions.has(reactionId)) return true;
    if (SOVEREIGN_REACTIONS[reactionId] || reactionId.startsWith('reaction_') || reactionId.startsWith('rx_') || reactionId.startsWith('ping_') || reactionId.startsWith('dominion.reactions.')) {
      const rx = getReaction(reactionId);
      if (rx && this.ownedReactions.has(rx.id)) return true;
      const rxKey = reactionId.replace(/^reaction_/, 'rx_');
      if (this.ownedReactions.has(rxKey)) return true;
      const revKey = reactionId.replace(/^rx_/, 'reaction_');
      if (this.ownedReactions.has(revKey)) return true;
    }
    return false;
  }

  public ownsProfileFrame(frameId: string): boolean {
    return this.ownedProfileFrames.has(frameId);
  }

  public ownsTitle(titleId: string): boolean {
    return this.ownedTitles.has(titleId);
  }

  public ownsPennant(pennantId: string): boolean {
    return this.ownedPennants.has(pennantId);
  }

  public grantPennant(pennantId: string): void {
    this.ownedPennants.add(pennantId);
    this.saveState();
  }

  public grantReaction(reactionId: string): void {
    this.grantEntitlement(reactionId);
  }

  public grantProfileFrame(frameId: string): void {
    this.grantEntitlement(frameId);
  }

  public grantTitle(titleId: string): void {
    this.grantEntitlement(titleId);
  }

  public ownsEntitlement(entitlementId: string): boolean {
    if (entitlementId.startsWith('pennant_')) return this.ownedPennants.has(entitlementId);
    if (entitlementId.startsWith('frame_')) return this.ownedProfileFrames.has(entitlementId);
    if (entitlementId.startsWith('title_')) return this.ownedTitles.has(entitlementId);
    if (entitlementId.startsWith('blade_') || entitlementId.startsWith('dominion.blade.')) return this.ownsBladeSkin(entitlementId);
    if (entitlementId.startsWith('reaction_') || entitlementId.startsWith('rx_') || entitlementId.startsWith('ping_')) return this.ownsReaction(entitlementId);
    if (this.ownedSkus.has(entitlementId)) return true;
    if (this.ownedReactions.has(entitlementId)) return true;
    if (this.ownedBladeSkins.has(entitlementId)) return true;
    if (this.ownedProfileFrames.has(entitlementId)) return true;
    if (this.ownedTitles.has(entitlementId)) return true;
    if (this.ownedPennants.has(entitlementId)) return true;
    return false;
  }

  // ============================================================
  // LOADOUT SELECTION & FALLBACK
  // ============================================================

  public getLoadout(): CosmeticLoadout {
    return {
      ...this.loadout,
      reactionWheel: [...this.loadout.reactionWheel],
    };
  }

  public equipBladeSkin(skinId: string): { success: boolean; reason?: string } {
    const skin = getBladeSkin(skinId);
    const canonicalId = skin ? skin.id : skinId;
    if (!BLADE_SKINS[canonicalId]) {
      return { success: false, reason: 'Unknown blade skin' };
    }
    if (!this.ownsBladeSkin(skinId) && !this.ownsBladeSkin(canonicalId)) {
      return { success: false, reason: 'Skin not owned' };
    }

    this.loadout.activeBladeSkin = canonicalId;
    this.saveState();
    telemetry.track('item_equipped', { type: 'blade', id: canonicalId });
    return { success: true };
  }

  public equipProfileFrame(frameId: string): { success: boolean; reason?: string } {
    if (!this.ownsProfileFrame(frameId)) {
      return { success: false, reason: 'Frame not owned' };
    }

    this.loadout.activeProfileFrame = frameId;
    this.saveState();
    telemetry.track('item_equipped', { type: 'frame', id: frameId });
    return { success: true };
  }

  public equipTitle(titleId: string): { success: boolean; reason?: string } {
    if (!this.ownsTitle(titleId)) {
      return { success: false, reason: 'Title not owned' };
    }

    this.loadout.activeTitle = titleId;
    this.saveState();
    telemetry.track('item_equipped', { type: 'title', id: titleId });
    return { success: true };
  }

  public equipReactionSlot(slotIndex: number, reactionId: string): { success: boolean; reason?: string } {
    if (slotIndex < 0 || slotIndex >= 8) {
      return { success: false, reason: 'Invalid wheel slot (0..7)' };
    }
    const rx = getReaction(reactionId);
    if (!rx) {
      return { success: false, reason: 'Unknown reaction' };
    }
    if (rx.category !== 'social_expression') {
      return { success: false, reason: 'Tactical pings cannot be equipped in expression wheel' };
    }
    if (!this.ownsReaction(reactionId) && !this.ownsReaction(rx.id)) {
      return { success: false, reason: 'Reaction not owned' };
    }

    const canonicalId = rx.id;

    // Check if canonicalId or reactionId is already equipped in another slot
    const existingIdx = this.loadout.reactionWheel.findIndex(id => id === canonicalId || id === reactionId);
    if (existingIdx >= 0 && existingIdx !== slotIndex) {
      // Swap slots so no duplicate IDs exist on wheel
      const prevAtSlot = this.loadout.reactionWheel[slotIndex];
      this.loadout.reactionWheel[existingIdx] = prevAtSlot;
    }

    this.loadout.reactionWheel[slotIndex] = reactionId;
    this.validateLoadoutFallback();
    this.saveState();
    telemetry.track('item_equipped', { type: 'reaction', id: canonicalId, slot: slotIndex });
    return { success: true };
  }

  public unequipReaction(reactionId: string): { success: boolean } {
    const rx = getReaction(reactionId);
    const targetId = rx ? rx.id : reactionId;
    let idx = this.loadout.reactionWheel.indexOf(reactionId);
    if (idx < 0) idx = this.loadout.reactionWheel.indexOf(targetId);
    if (idx < 0) return { success: false };

    // Replace with first unused owned universal reaction
    const unusedUniversal = UNIVERSAL_FREE_REACTIONS.find(id => !this.loadout.reactionWheel.includes(id));
    if (unusedUniversal) {
      this.loadout.reactionWheel[idx] = unusedUniversal;
    } else {
      this.loadout.reactionWheel[idx] = DEFAULT_LOADOUT.reactionWheel[idx];
    }

    this.validateLoadoutFallback();
    this.saveState();
    return { success: true };
  }

  private validateLoadoutFallback(): void {
    if (!this.ownsBladeSkin(this.loadout.activeBladeSkin)) {
      this.loadout.activeBladeSkin = 'blade_standard';
    }
    if (!this.ownsProfileFrame(this.loadout.activeProfileFrame)) {
      this.loadout.activeProfileFrame = 'frame_default';
    }
    if (!this.ownsTitle(this.loadout.activeTitle)) {
      this.loadout.activeTitle = 'title_commander';
    }

    // Ensure exactly 8 slots, all valid owned social_expression, with zero duplicates
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      let rId = this.loadout.reactionWheel[i];
      let rx = getReaction(rId);

      // Must exist, be owned, be social_expression, and not be a duplicate
      if (!rx || rx.category !== 'social_expression' || (!this.ownsReaction(rId) && !this.ownsReaction(rx.id)) || seen.has(rx.id)) {
        // Find first unused universal free reaction
        const fallback = UNIVERSAL_FREE_REACTIONS.find(id => !seen.has(id)) || UNIVERSAL_FREE_REACTIONS[i] || 'reaction_gg';
        rId = fallback;
        rx = getReaction(rId);
      }

      const canonical = rx ? rx.id : rId;
      seen.add(canonical);
      this.loadout.reactionWheel[i] = rId;
    }
  }

  // ============================================================
  // ENTITLEMENT GRANT & REVOKE
  // ============================================================

  public grantSku(sku: string): boolean {
    const product = catalogService.getProduct(sku);
    if (!product) return false;

    this.ownedSkus.add(sku);

    // Grant individual entitlements listed in product
    for (const ent of product.entitlements) {
      this.grantEntitlement(ent);
    }

    this.saveState();
    return true;
  }

  public grantEntitlement(entitlementId: string): void {
    if (entitlementId.startsWith('reaction_') || entitlementId.startsWith('rx_') || entitlementId.startsWith('ping_') || getReaction(entitlementId)) {
      const rx = getReaction(entitlementId);
      if (rx) this.ownedReactions.add(rx.id);
      this.ownedReactions.add(entitlementId);
    } else if (entitlementId.startsWith('blade_') || entitlementId.startsWith('dominion.blade.') || BLADE_SKINS[entitlementId]) {
      const skin = getBladeSkin(entitlementId);
      if (skin) this.ownedBladeSkins.add(skin.id);
      this.ownedBladeSkins.add(entitlementId);
    } else if (entitlementId.startsWith('frame_')) {
      this.ownedProfileFrames.add(entitlementId);
    } else if (entitlementId.startsWith('title_')) {
      this.ownedTitles.add(entitlementId);
    } else if (entitlementId.startsWith('pennant_')) {
      this.ownedPennants.add(entitlementId);
    }
    this.saveState();
  }

  public revokeSku(sku: string): boolean {
    const product = catalogService.getProduct(sku);
    if (!product) return false;

    this.ownedSkus.delete(sku);

    for (const ent of product.entitlements) {
      this.revokeEntitlement(ent);
    }

    this.validateLoadoutFallback();
    this.saveState();
    return true;
  }

  public revokeEntitlement(entitlementId: string): void {
    if (entitlementId !== 'blade_standard') {
      this.ownedBladeSkins.delete(entitlementId);
    }
    if (!DEFAULT_FREE_ENTITLEMENTS.reactions.includes(entitlementId)) {
      this.ownedReactions.delete(entitlementId);
    }
    if (entitlementId !== 'frame_default') {
      this.ownedProfileFrames.delete(entitlementId);
    }
    if (entitlementId !== 'title_commander') {
      this.ownedTitles.delete(entitlementId);
    }
    if (entitlementId.startsWith('pennant_')) {
      this.ownedPennants.delete(entitlementId);
    }

    this.validateLoadoutFallback();
    this.saveState();
  }

  // ============================================================
  // DEV COMMERCE TESTING MODES
  // ============================================================

  public devApplyOwnershipMode(mode: 'NORMAL' | 'OWNS_NOTHING' | 'OWNS_SOME' | 'OWNS_EVERYTHING'): void {
    if (mode === 'OWNS_NOTHING') {
      this.resetToDefaults();
      this.ownedBladeSkins = new Set(['blade_standard']);
      this.ownedReactions = new Set(DEFAULT_FREE_ENTITLEMENTS.reactions);
    } else if (mode === 'OWNS_EVERYTHING') {
      for (const prod of catalogService.getProducts()) {
        this.ownedSkus.add(prod.sku);
      }
      for (const skin of Object.keys(BLADE_SKINS)) {
        this.ownedBladeSkins.add(skin);
      }
      for (const rx of Object.keys(SOVEREIGN_REACTIONS)) {
        this.ownedReactions.add(rx);
      }
      this.ownedProfileFrames.add('frame_founder');
      this.ownedProfileFrames.add('frame_imperial_sun');
      this.ownedProfileFrames.add('frame_turk_divan');
      this.ownedProfileFrames.add('frame_roma_aquila');
      this.ownedProfileFrames.add('frame_han_jade');
      this.ownedTitles.add('title_founder');
      this.ownedTitles.add('title_padishah');
      this.ownedTitles.add('title_imperator');
      this.ownedTitles.add('title_celestial_heir');
      this.ownedTitles.add('title_grand_strategos');
      this.ownedTitles.add('title_vanguard');
    } else if (mode === 'OWNS_SOME') {
      this.resetToDefaults();
      this.grantSku('dominion.starter.founder01');
      this.grantSku('dominion.blade.imperial01');
      this.grantSku('dominion.reactions.turk.court01');
    }
    this.validateLoadoutFallback();
    this.saveState();
  }
}

export const entitlementService = new EntitlementService();
if (typeof window !== 'undefined') {
  (window as any).__ENTITLEMENT_SERVICE__ = entitlementService;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__ENTITLEMENT_SERVICE__ = entitlementService;
}
