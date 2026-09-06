/**
 * DOMINION OF SOL — SOVEREIGN ARMORY (STOREFRONT & ITEM PREVIEW)
 * 
 * Aesthetic Direction:
 * - Deep navy black, charcoal, warm muted gold (#dfbc73), ivory, restrained crimson.
 * - 6 Clean Tabs: FEATURED, BLADES, REACTIONS, IDENTITY, PASS, MARKS.
 * - Visually dominant cards: large blade visuals, actual reaction faces, live identity previews.
 * - Type-aware preview renderers deriving strictly from each SKU's actual entitlement list.
 * - ZERO Pay-to-Win: pure identity, cosmetics, collection.
 * - Usability Target: Player understands item, appearance, ownership, equipped state, contents, price in < 2s.
 */

import { catalogService, CatalogProduct, CatalogCategory } from '../meta/CatalogService';
import { walletService } from '../meta/WalletService';
import { entitlementService } from '../meta/EntitlementService';
import { accountService } from '../meta/AccountService';
import { commercePipeline } from '../meta/CommerceProvider';
import { getBladeSkin, getAllBladeSkins } from '../meta/BladeSkinRegistry';
import { getReaction, getReactionsForCivilization } from '../meta/ReactionRegistry';
import { ArmoryBladePreview } from './ArmoryBladePreview';
import { playerProfileModal } from './PlayerProfileModal';
import { telemetry } from '../meta/Telemetry';
import { PRESET_NATION_IDENTITIES, renderPennantSvg } from './NationIdentity';
import { regionalPricingService } from '../meta/RegionalPricingService';

export const TACTILE_HOOKS = {
  onPreviewHover: (type: string, id: string) => {
    /* Audio hook for preview hover */
  },
  onReactionPlay: (rxId: string, cue: string) => {
    /* Audio hook for reaction animation */
  },
  onBladeDetent: (pct: number) => {
    /* Audio hook for blade slider notch */
  },
  onPurchaseSuccess: (sku: string) => {
    /* Audio hook for purchase acquisition */
  },
};
if (typeof window !== 'undefined') {
  (window as any).__DOMINION_TACTILE_HOOKS__ = TACTILE_HOOKS;
  (window as any).__DOMINION_SERVICES__ = {
    catalogService,
    entitlementService,
    accountService,
    regionalPricingService,
    walletService,
  };
}

const ARMORY_TABS: CatalogCategory[] = [
  'FEATURED',
  'BLADES',
  'REACTIONS',
  'IDENTITY',
  'PASS',
  'MARKS',
];

interface CivShowcaseItem {
  civ: string;
  name: string;
  bladeId: string;
  bladeName: string;
  bundleSku: string;
  rxPackSku: string;
  accent: string;
  expressionCount: number;
  tagline: string;
}

const CIV_SHOWCASE: CivShowcaseItem[] = [
  { civ: 'OTTOMAN', name: 'OTTOMAN', bladeId: 'blade_turk_imperial', bladeName: 'Imperial Crescent', bundleSku: 'dominion.bundle.turk.ottoman01', rxPackSku: 'dominion.reactions.turk.court01', accent: '#ef4444', expressionCount: 20, tagline: 'Mock · Laugh · Taunt · Rage' },
  { civ: 'ROMA', name: 'ROMA', bladeId: 'blade_roma_legion', bladeName: 'Legion Spatha', bundleSku: 'dominion.bundle.roma.triumph01', rxPackSku: 'dominion.reactions.roma.legion01', accent: '#a855f7', expressionCount: 20, tagline: 'Triumph · Mock · Challenge' },
  { civ: 'PERS', name: 'PERS', bladeId: 'blade_pers_shamshir', bladeName: 'Solar Shamshir', bundleSku: 'dominion.bundle.pers01', rxPackSku: 'dominion.reactions.pers01', accent: '#3b82f6', expressionCount: 20, tagline: 'Smirk · Taunt · Command' },
  { civ: 'MISIR', name: 'MISIR', bladeId: 'blade_misir_khopesh', bladeName: 'Pharaonic Khopesh', bundleSku: 'dominion.bundle.misir01', rxPackSku: 'dominion.reactions.misir01', accent: '#eab308', expressionCount: 20, tagline: 'Glory · Wisdom · Challenge' },
  { civ: 'HAN', name: 'HAN', bladeId: 'blade_han_celestial', bladeName: 'Celestial Jian', bundleSku: 'dominion.bundle.han.dynasty01', rxPackSku: 'dominion.reactions.han.dynasty01', accent: '#10b981', expressionCount: 20, tagline: 'Order · Strategy · Power' },
  { civ: 'YAMATO', name: 'YAMATO', bladeId: 'blade_yamato_shogunate', bladeName: 'Shogunate Katana', bundleSku: 'dominion.bundle.yamato01', rxPackSku: 'dominion.reactions.yamato.honor01', accent: '#f43f5e', expressionCount: 20, tagline: 'Honor · Silence · Strike' },
  { civ: 'NORSE', name: 'NORSE', bladeId: 'blade_norse_raven', bladeName: 'Raven Forge Blade', bundleSku: 'dominion.bundle.norse01', rxPackSku: 'dominion.reactions.norse.valhalla01', accent: '#06b6d4', expressionCount: 20, tagline: 'Thunder · Valor · Feasting' },
  { civ: 'MAYA', name: 'MAYA', bladeId: 'blade_maya_macuahuitl', bladeName: 'Obsidian Macuahuitl', bundleSku: 'dominion.bundle.maya01', rxPackSku: 'dominion.reactions.maya01', accent: '#84cc16', expressionCount: 20, tagline: 'Solar · Mystery · Fury' },
  { civ: 'LAKOTA', name: 'LAKOTA', bladeId: 'blade_lakota_command', bladeName: 'Plains Command', bundleSku: 'dominion.bundle.lakota01', rxPackSku: 'dominion.reactions.lakota01', accent: '#f97316', expressionCount: 20, tagline: 'Valor · Plains · Spirit' },
];

export class SovereignArmory {
  private modalEl: HTMLElement | null = null;
  private previewModalEl: HTMLElement | null = null;
  private isOpen = false;
  private activeCategory: CatalogCategory = 'FEATURED';
  private bladePreviewInstance: ArmoryBladePreview | null = null;
  private featuredCivOverride: string | null = null;

  constructor() {
    this.createUI();
    this.bindEvents();
    (window as any).__SOVEREIGN_ARMORY__ = this;
  }

  private createUI(): void {
    const existing = document.getElementById('dominion-sovereign-armory');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dominion-sovereign-armory';
    modal.className = 'civ-modal-backdrop';
    modal.hidden = true;
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="civ-modal-frame civ-modal-frame--armory" role="dialog" aria-modal="true" style="
        max-width: 1040px;
        width: 94vw;
        max-height: 88vh;
        height: 88vh;
        background: #040912;
        border: 1.5px solid #dfbc73;
        box-shadow: 0 20px 60px rgba(0,0,0,0.95);
        display: flex;
        flex-direction: column;
        border-radius: 4px;
        overflow: hidden;
      ">
        <!-- Armory Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(223, 188, 115, 0.25); background: #07101b;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid #dfbc73; display: flex; align-items: center; justify-content: center; background: #03060a;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div>
              <h2 style="margin: 0; font-family: 'Cinzel', serif; font-size: 19px; font-weight: 900; color: #f8fafc; letter-spacing: 0.08em;">SOVEREIGN ARMORY</h2>
              <div style="font-size: 10px; font-weight: 700; color: #dfbc73; letter-spacing: 0.1em;">IDENTITY · EXPRESSION · COLLECTION</div>
            </div>
          </div>

          <!-- Currency Display & Actions -->
          <div style="display: flex; align-items: center; gap: 14px;">
            <div id="armory-wallet-pill" style="
              display: flex;
              align-items: center;
              gap: 8px;
              background: #091422;
              border: 1px solid rgba(223, 188, 115, 0.4);
              border-radius: 4px;
              padding: 6px 14px;
              cursor: pointer;
            " title="Your Sovereign Marks treasury (Click to buy Marks)">
              <span style="font-size: 14px; color: #dfbc73;">◆</span>
              <strong id="armory-wallet-val" style="font-family: ui-monospace, monospace; font-size: 14px; color: #fef08a;">0</strong>
              <span style="font-size: 10px; font-weight: 800; color: #dfbc73; letter-spacing: 0.05em;">MARKS</span>
            </div>

            <button id="btn-close-armory" class="civ-modal-close" type="button" aria-label="Close armory">✕</button>
          </div>
        </div>

        <!-- Category Nav Strip (6 Clean Tabs) -->
        <div style="display: flex; gap: 4px; padding: 8px 24px; background: #050b14; border-bottom: 1px solid rgba(255,255,255,0.06); overflow-x: auto;">
          ${ARMORY_TABS.map(cat => `
            <button class="armory-cat-btn ${cat === 'FEATURED' ? 'active' : ''}" data-cat="${cat}" type="button">
              ${cat}
            </button>
          `).join('')}
        </div>

        <!-- Armory Catalog Body -->
        <div id="armory-catalog-body" style="padding: 20px 24px; overflow-y: auto; overflow-x: hidden; flex: 1;">
          <!-- Rendered dynamically -->
        </div>

        <!-- Acquired Feedback Banner -->
        <div id="armory-acquired-banner" style="
          display: none;
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #091626;
          border: 1.5px solid #dfbc73;
          box-shadow: 0 12px 32px rgba(0,0,0,0.9);
          border-radius: 4px;
          padding: 12px 24px;
          align-items: center;
          gap: 16px;
          z-index: 10;
        ">
          <div>
            <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73;">ACQUIRED</span>
            <div id="armory-acquired-item-name" style="font-size: 13px; font-weight: 700; color: #f8fafc;">ITEM NAME</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-armory-equip-now" class="civ-btn-continue-hero" style="height: 32px; padding: 0 14px; font-size: 10px;" type="button">EQUIP NOW</button>
            <button id="btn-armory-view-collection" class="prof-cat-btn" style="height: 32px;" type="button">VIEW COLLECTION</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Create item preview modal
    this.createPreviewModal();
  }

  private createPreviewModal(): void {
    const prev = document.createElement('div');
    prev.id = 'armory-item-preview-modal';
    prev.className = 'civ-modal-backdrop';
    prev.hidden = true;
    prev.style.display = 'none';
    prev.style.zIndex = '3100';

    prev.innerHTML = `
      <div class="civ-modal-frame civ-modal-frame--preview reaction-preview-dialog" style="
        max-width: 760px;
        width: 92vw;
        max-height: 84vh;
        background: #060d17;
        border: 1.5px solid #dfbc73;
        box-shadow: 0 24px 64px rgba(0,0,0,0.95);
        border-radius: 4px;
        padding: 0;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <button id="btn-close-item-preview" class="civ-modal-close" style="position: absolute; right: 16px; top: 16px; z-index: 30;" type="button">✕</button>
        <div id="item-preview-mount" style="display: flex; flex-direction: column; height: 100%; max-height: 84vh; overflow: hidden;"></div>
      </div>
    `;

    document.body.appendChild(prev);
    this.previewModalEl = prev;

    prev.addEventListener('click', (e) => {
      if (e.target === prev) this.closePreview();
    });

    document.getElementById('btn-close-item-preview')?.addEventListener('click', () => {
      this.closePreview();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !prev.hidden && prev.style.display !== 'none') {
        this.closePreview();
      }
    });
  }

  private bindEvents(): void {
    document.getElementById('btn-close-armory')?.addEventListener('click', () => this.close());
    this.modalEl?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'dominion-sovereign-armory') this.close();
    });

    document.getElementById('armory-wallet-pill')?.addEventListener('click', () => {
      this.activeCategory = 'MARKS';
      this.render();
    });

    // Category button clicks
    this.modalEl?.querySelectorAll('.armory-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.cat as CatalogCategory;
        this.render();
      });
    });

    // Reactive updates
    document.addEventListener('dominion:wallet-changed', () => {
      this.updateWalletPill();
      if (this.isOpen) this.render();
    });
    document.addEventListener('dominion:entitlements-changed', () => {
      if (this.isOpen) this.render();
    });
    document.addEventListener('dominion:catalog-region-changed', () => {
      if (this.isOpen) this.render();
    });
  }

  public open(category?: CatalogCategory, contextSku?: string): void {
    if (!this.modalEl) this.createUI();
    if (!this.modalEl) return;
    if (category) this.activeCategory = category;
    this.isOpen = true;
    this.modalEl.hidden = false;
    this.modalEl.style.display = 'flex';
    (window as any).__DOMINION_MODAL_OPEN__ = true;
    telemetry.track('armory_opened');
    this.updateWalletPill();
    this.render();
    if (contextSku) {
      setTimeout(() => this.openPreview(contextSku), 50);
    }
  }

  public close(): void {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.hidden = true;
    this.modalEl.style.display = 'none';
    this.closePreview();
    (window as any).__DOMINION_MODAL_OPEN__ = false;
  }

  private updateWalletPill(): void {
    const valEl = document.getElementById('armory-wallet-val');
    if (valEl) {
      valEl.textContent = walletService.getBalance().toLocaleString();
    }
  }

  private render(): void {
    this.modalEl?.querySelectorAll('.armory-cat-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.cat === this.activeCategory);
    });

    const body = document.getElementById('armory-catalog-body');
    if (!body) return;

    if (this.activeCategory === 'FEATURED') {
      this.renderFeatured(body);
    } else {
      this.renderGrid(body, this.activeCategory);
    }
  }

  private renderFeatured(body: HTMLElement): void {
    const account = accountService.getAccount();
    const favCiv = (this.featuredCivOverride || account.favoriteCivilization || 'turk').toLowerCase();

    const CIV_BUNDLE_MAP: Record<string, {
      sku: string;
      bladeId: string;
      bladeName: string;
      tag: string;
      title: string;
      frameId: string;
      frameName: string;
      pennantId: string;
      pennantName: string;
    }> = {
      ottoman: {
        sku: 'dominion.bundle.turk.ottoman01',
        bladeId: 'blade_turk_imperial',
        bladeName: 'Imperial Crescent',
        tag: 'Mock · Laugh · Taunt · Rage',
        title: 'PADISHAH',
        frameId: 'frame_turk_divan',
        frameName: 'Divan Frame',
        pennantId: 'pennant_ottoman',
        pennantName: 'OTTOMAN Pennant',
      },
      turk: {
        sku: 'dominion.bundle.turk.ottoman01',
        bladeId: 'blade_turk_imperial',
        bladeName: 'Imperial Crescent',
        tag: 'Mock · Laugh · Taunt · Rage',
        title: 'PADISHAH',
        frameId: 'frame_turk_divan',
        frameName: 'Divan Frame',
        pennantId: 'pennant_ottoman',
        pennantName: 'OTTOMAN Pennant',
      },
      roma: {
        sku: 'dominion.bundle.roma.triumph01',
        bladeId: 'blade_roma_legion',
        bladeName: 'Legion Command Blade',
        tag: 'Triumph · Mock · Challenge',
        title: 'IMPERATOR',
        frameId: 'frame_roma_laurel',
        frameName: 'Imperial Laurel Frame',
        pennantId: 'pennant_roma',
        pennantName: 'ROMA Pennant',
      },
      pers: {
        sku: 'dominion.bundle.pers01',
        bladeId: 'blade_pers_shamshir',
        bladeName: 'Solar Shamshir',
        tag: 'Smirk · Taunt · Command',
        title: 'SHAHANSHAH',
        frameId: 'frame_pers_apadana',
        frameName: 'Royal Apadana Frame',
        pennantId: 'pennant_pers',
        pennantName: 'PERS Pennant',
      },
      misir: {
        sku: 'dominion.bundle.misir01',
        bladeId: 'blade_misir_khopesh',
        bladeName: 'Pharaonic Khopesh',
        tag: 'Glory · Wisdom · Challenge',
        title: 'PHARAOH',
        frameId: 'frame_misir_dynastic',
        frameName: 'Dynastic Frame',
        pennantId: 'pennant_misir',
        pennantName: 'MISIR Pennant',
      },
      han: {
        sku: 'dominion.bundle.han.dynasty01',
        bladeId: 'blade_han_celestial',
        bladeName: 'Celestial Steel Jian',
        tag: 'Order · Strategy · Power',
        title: 'SON OF HEAVEN',
        frameId: 'frame_han_celestial',
        frameName: 'Celestial Court Frame',
        pennantId: 'pennant_han',
        pennantName: 'HAN Pennant',
      },
      yamato: {
        sku: 'dominion.bundle.yamato01',
        bladeId: 'blade_yamato_shogunate',
        bladeName: 'Shogunate Edge Katana',
        tag: 'Honor · Silence · Strike',
        title: 'SHOGUN',
        frameId: 'frame_yamato_shogunate',
        frameName: 'Shogunate Frame',
        pennantId: 'pennant_yamato',
        pennantName: 'YAMATO Pennant',
      },
      norse: {
        sku: 'dominion.bundle.norse01',
        bladeId: 'blade_norse_raven',
        bladeName: 'Raven Forge Blade',
        tag: 'Thunder · Valor · Feasting',
        title: 'JARL',
        frameId: 'frame_norse_raven',
        frameName: 'Raven Hall Frame',
        pennantId: 'pennant_norse',
        pennantName: 'NORSE Pennant',
      },
      maya: {
        sku: 'dominion.bundle.maya01',
        bladeId: 'blade_maya_macuahuitl',
        bladeName: 'Obsidian Sun Macuahuitl',
        tag: 'Solar · Mystery · Fury',
        title: 'AHAU',
        frameId: 'frame_maya_solar',
        frameName: 'Solar Court Frame',
        pennantId: 'pennant_maya',
        pennantName: 'MAYA Pennant',
      },
      lakota: {
        sku: 'dominion.bundle.lakota01',
        bladeId: 'blade_lakota_command',
        bladeName: 'Plains Forged Command',
        tag: 'Valor · Plains · Spirit',
        title: 'WAR CHIEF',
        frameId: 'frame_lakota_council',
        frameName: 'Plains Council Frame',
        pennantId: 'pennant_lakota',
        pennantName: 'LAKOTA Pennant',
      },
    };

    const CIV_COLLECTION_MAP: Record<string, {
      eyebrow: string;
      title: string;
      tagline: string;
      contents: string;
      accent: string;
    }> = {
      ottoman: {
        eyebrow: 'OTTOMAN',
        title: 'OTTOMAN IMPERIAL COLLECTION',
        tagline: 'MOCK · LAUGH · TAUNT · RAGE',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#ef4444',
      },
      turk: {
        eyebrow: 'OTTOMAN',
        title: 'OTTOMAN IMPERIAL COLLECTION',
        tagline: 'MOCK · LAUGH · TAUNT · RAGE',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#ef4444',
      },
      roma: {
        eyebrow: 'ROMA',
        title: 'ROMAN TRIUMPHAL COLLECTION',
        tagline: 'TRIUMPH · MOCK · CHALLENGE',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#a855f7',
      },
      pers: {
        eyebrow: 'PERS',
        title: 'PERSIAN ROYAL COLLECTION',
        tagline: 'SMIRK · TAUNT · COMMAND',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#3b82f6',
      },
      misir: {
        eyebrow: 'MISIR',
        title: 'PHARAONIC ROYAL COLLECTION',
        tagline: 'GLORY · WISDOM · CHALLENGE',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#eab308',
      },
      han: {
        eyebrow: 'HAN',
        title: 'GRAND HAN COLLECTION',
        tagline: 'ORDER · STRATEGY · POWER',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#10b981',
      },
      yamato: {
        eyebrow: 'YAMATO',
        title: 'YAMATO SHOGUNATE COLLECTION',
        tagline: 'HONOR · SILENCE · STRIKE',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#f43f5e',
      },
      norse: {
        eyebrow: 'NORSE',
        title: 'NORSE HIGH KING COLLECTION',
        tagline: 'THUNDER · VALOR · FEASTING',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#06b6d4',
      },
      maya: {
        eyebrow: 'MAYA',
        title: 'MAYA SOLAR COLLECTION',
        tagline: 'SOLAR · MYSTERY · FURY',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#84cc16',
      },
      lakota: {
        eyebrow: 'LAKOTA',
        title: 'LAKOTA PLAINS COLLECTION',
        tagline: 'VALOR · PLAINS · SPIRIT',
        contents: 'Blade · 20 Reactions · Identity Set',
        accent: '#f97316',
      },
    };

    const civData = CIV_BUNDLE_MAP[favCiv] || CIV_BUNDLE_MAP.turk;
    const civMeta = CIV_COLLECTION_MAP[favCiv] || CIV_COLLECTION_MAP.turk;
    const heroProd = catalogService.getProduct(civData.sku) || catalogService.getProduct('dominion.bundle.turk.ottoman01')!;
    const heroCiv = heroProd.civilizationRestriction || civMeta.eyebrow;
    const heroSkin = getBladeSkin(civData.bladeId);
    const heroPennant = this.getPennantSvg(heroCiv);
    const heroFaces = getReactionsForCivilization(heroCiv).slice(0, 3);

    // Calculate authoritative collection ownership state
    const ownershipState = catalogService.getBundleOwnershipState(heroProd.sku);
    const breakdown = catalogService.getBundleValueBreakdown(heroProd.sku);
    const ownedCount = ownershipState.ownedEntitlements.length;
    const isComplete = ownedCount === ownershipState.totalEntitlements;

    const firstHeritageAvailable = !regionalPricingService.isFirstHeritageClaimed();

    const secondaries = catalogService.getProducts().filter(p => p.sku !== heroProd.sku && (p.category === 'FEATURED' || p.category === 'COMMAND BLADES' || p.category === 'PASS' || p.category === 'REACTIONS')).slice(0, 3);

    body.innerHTML = `
      <div style="display: flex; flex-direction: column;">
        <!-- FIRST VIEWPORT LAYER: HERO + COMPACT SELECTOR RAIL -->
        <div class="armory-featured-first-viewport" style="min-height: calc(88vh - 90px); display: flex; flex-direction: column; justify-content: flex-start;">
          <!-- 1. SOVEREIGN SHOWROOM HERO BUNDLE (Dominant Visual Eye Seduction) -->
          <div class="armory-showroom-hero" style="position: relative;">
            <div>
              <!-- Eyebrow: Civilization Name + Minimal Bronze Best Value Chip -->
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; color: #dfbc73; text-transform: uppercase;">
                  ${civMeta.eyebrow}
                </span>
                ${breakdown.savings > 0 && !isComplete ? `
                  <span class="armory-best-value-chip">
                    BEST VALUE
                  </span>
                ` : ''}
              </div>

              <!-- Large Collection Title -->
              <h3 style="margin: 0 0 6px 0; font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #fef08a; letter-spacing: 0.04em; text-transform: uppercase;">
                ${civMeta.title}
              </h3>

              <!-- Short Emotional Identity -->
              <div style="font-size: 11px; font-weight: 700; color: #dfbc73; margin-bottom: 6px; letter-spacing: 0.06em;">
                ${civMeta.tagline}
              </div>

              <!-- Compact Contents Row -->
              <div style="font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 14px; letter-spacing: 0.04em;">
                ${civMeta.contents}
              </div>

              <!-- Single-Line Micro Price & Savings -->
              ${!isComplete ? `
                <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px;">
                  <span style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #f8fafc;">
                    ${ownedCount > 0
                      ? regionalPricingService.formatPrice(ownershipState.upgradePrice)
                      : catalogService.formatStorefrontPrice(heroProd)}
                  </span>
                  ${breakdown.savings > 0 ? `
                    <span style="font-size: 9.5px; font-weight: 600; color: #94a3b8; letter-spacing: 0.04em;">
                      ${regionalPricingService.formatPrice(breakdown.componentValue)} separately · save ${breakdown.savingsPercent}%
                    </span>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Transaction CTAs / Owned State (One Dominant Gold CTA + View Collection Link) -->
              <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
                ${isComplete ? `
                  <div style="display: flex; align-items: center; gap: 6px; background: rgba(56,189,248,0.12); border: 1.5px solid #38bdf8; border-radius: 4px; padding: 8px 16px;">
                    <span style="color: #38bdf8; font-size: 14px; font-weight: 900;">✓</span>
                    <span style="font-family: 'Cinzel', serif; font-size: 11px; font-weight: 900; color: #f8fafc; letter-spacing: 0.08em;">HERITAGE COMPLETE</span>
                  </div>
                  <button class="btn-preview-sku" data-sku="${heroProd.sku}" style="background: none; border: none; color: #dfbc73; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;" type="button">
                    CUSTOMIZE LOADOUT →
                  </button>
                ` : ownedCount > 0 ? `
                  <button class="civ-btn-continue-hero btn-buy-sku" data-sku="${heroProd.sku}" style="height: 40px; padding: 0 24px; font-size: 12px; font-weight: 900;" type="button">
                    COMPLETE SET · ${regionalPricingService.formatPrice(ownershipState.upgradePrice)}
                  </button>
                  <button class="btn-preview-sku" data-sku="${heroProd.sku}" style="background: none; border: none; color: #dfbc73; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;" type="button">
                    VIEW COLLECTION →
                  </button>
                ` : `
                  <button class="civ-btn-continue-hero btn-buy-sku" data-sku="${heroProd.sku}" style="height: 40px; padding: 0 26px; font-size: 12px; font-weight: 900;" type="button">
                    GET SET · ${catalogService.formatStorefrontPrice(heroProd)}
                  </button>
                  <button class="btn-preview-sku" data-sku="${heroProd.sku}" style="background: none; border: none; color: #dfbc73; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;" type="button">
                    VIEW COLLECTION →
                  </button>
                `}
              </div>

              <!-- Integrated First Heritage Offer Line (Quiet Inline Row, Zero Boxiness) -->
              ${firstHeritageAvailable ? `
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 2px 0;">
                  <span style="font-size: 8.5px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em; text-transform: uppercase;">FIRST HERITAGE</span>
                  <span style="font-size: 9.5px; color: #94a3b8;">20 Reactions + Pennant · ${regionalPricingService.formatPrice(0.99)}</span>
                  <button id="btn-hero-claim-first-heritage" class="btn-hero-first-heritage-action" type="button" style="background: none; border: none; color: #fef08a; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 3px; text-decoration: underline; text-underline-offset: 2px; transition: color 0.15s ease;">
                    START ${heroCiv} HERITAGE →
                  </button>
                </div>
              ` : ''}

              <!-- Complete Your Heritage Progress Bar (if partially owned) -->
              ${ownedCount > 0 ? `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(223,188,115,0.15);">
                  <div style="display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 800; color: #dfbc73; margin-bottom: 3px;">
                    <span>YOUR ${heroCiv} COLLECTION</span>
                    <span>${ownedCount} / 23${isComplete ? ' (COMPLETE)' : ''}</span>
                  </div>
                  <div style="height: 4px; background: #0c1624; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(ownedCount / 23) * 100}%; height: 100%; background: linear-gradient(90deg, #dfbc73, #38bdf8);"></div>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Hero Showroom Visual Stage (Artwork is the Hero, +15% Scale, Restrained Staging) -->
            <div style="
              background: radial-gradient(ellipse at 50% 32%, ${civMeta.accent}0a 0%, rgba(223, 188, 115, 0.05) 45%, rgba(3, 6, 10, 0) 75%), #040810;
              border: 1px solid rgba(223, 188, 115, 0.16);
              border-radius: 4px;
              padding: 16px 18px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              box-shadow: inset 0 0 24px rgba(0,0,0,0.85);
              position: relative;
              overflow: hidden;
            ">
              <!-- Idle Specular Sweep across Blade -->
              <div class="hero-blade-idle-sweep"></div>

              <!-- Blade Dominates Visual Stage (~62-68% importance) -->
              <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 72px; transform: scale(1.16); transform-origin: center center; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.95));">
                ${heroSkin?.silhouette?.heroPreviewSvg || `
                  <svg viewBox="0 0 540 50" width="100%" height="52">
                    <line x1="40" y1="25" x2="500" y2="25" stroke="#dfbc73" stroke-width="2"/>
                  </svg>
                `}
              </div>

              <!-- Content Row: Asymmetric 3-Face Cluster + Pennant + Profile Frame Badge -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; border-top: 1px solid rgba(223,188,115,0.1); padding-top: 10px;">
                <!-- 3 Expressive Character Faces: asymmetric elevation -->
                <div style="display: flex; gap: 10px; align-items: center;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <div style="width: 42px; height: 42px; transform: translateY(2px) rotate(-3deg); filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8)); opacity: 0.9;" class="hero-cluster-face">${heroFaces[1]?.svgIcon || ''}</div>
                    <span style="font-size: 7px; font-weight: 700; color: #94a3b8; max-width: 44px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${heroFaces[1]?.name || ''}</span>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <div style="width: 58px; height: 58px; transform: translateY(-3px); filter: drop-shadow(0 4px 12px rgba(223,188,115,0.25)) drop-shadow(0 2px 8px rgba(0,0,0,0.9));" class="hero-cluster-face">${heroFaces[0]?.svgIcon || ''}</div>
                    <span style="font-size: 7.5px; font-weight: 800; color: #dfbc73; max-width: 60px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${heroFaces[0]?.name || ''}</span>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <div style="width: 42px; height: 42px; transform: translateY(1px) rotate(3deg); filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8)); opacity: 0.9;" class="hero-cluster-face">${heroFaces[2]?.svgIcon || ''}</div>
                    <span style="font-size: 7px; font-weight: 700; color: #94a3b8; max-width: 44px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${heroFaces[2]?.name || ''}</span>
                  </div>
                </div>

                <!-- Ceremonial Pennant Artwork (Subtle Breathing Motion) -->
                <div class="hero-pennant-breathe" style="width: 40px; height: 64px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${heroPennant}
                </div>

                <!-- Profile Frame & Title Miniature Badge -->
                <div class="hero-frame-sheen" style="
                  border: 1px solid rgba(223, 188, 115, 0.35);
                  border-radius: 4px;
                  padding: 6px 10px;
                  background: rgba(223,188,115,0.05);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 2px;
                  flex-shrink: 0;
                ">
                  <span style="font-size: 8px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em;">${civData.frameName.toUpperCase()}</span>
                  <span style="font-size: 7.5px; font-weight: 800; color: #38bdf8; letter-spacing: 0.06em;">${civData.title}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. EXPLORE CIVILIZATIONS HORIZONTAL RAIL (Selector Navigation) -->
          <div style="margin-top: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73;">
                  EXPLORE CIVILIZATIONS
                </span>
                <span style="font-size: 8.5px; font-weight: 700; color: #64748b; letter-spacing: 0.08em;">
                  · 9 NATIONS · 20 REACTIONS EACH
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button id="btn-civ-rail-prev" class="civ-rail-arrow-btn" type="button" aria-label="Previous civilizations">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button id="btn-civ-rail-next" class="civ-rail-arrow-btn" type="button" aria-label="Next civilizations">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            <div class="armory-civ-rail">
              ${CIV_SHOWCASE.map(item => {
                const isSelected = item.civ.toLowerCase() === favCiv;
                const pSvg = this.getPennantSvg(item.civ);
                const civFaces = getReactionsForCivilization(item.civ);
                const bSkin = getBladeSkin(item.bladeId);
                const bladeSil = bSkin?.silhouette?.heroPreviewSvg || '';
                return `
                  <div class="armory-civ-card ${isSelected ? 'armory-civ-card--selected' : ''}" data-civ="${item.civ.toLowerCase()}" data-sku="${item.bundleSku || item.rxPackSku}">
                    <!-- Card Header: Pennant + Civ Name -->
                    <div class="armory-civ-card-header">
                      <div style="display: flex; align-items: center; gap: 7px;">
                        <div style="width: 14px; height: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          ${pSvg}
                        </div>
                        <strong class="armory-civ-card-name" style="font-family: 'Cinzel', serif; font-size: 12px; font-weight: 900; letter-spacing: 0.06em;">${item.name}</strong>
                      </div>
                    </div>

                    <!-- Visual Zone: Character Trio with Faint Blade Silhouette Background -->
                    <div class="armory-civ-card-visual">
                      <div class="armory-civ-blade-faint-bg">
                        ${bladeSil}
                      </div>

                      <div class="armory-shelf-container">
                        <div class="armory-civ-support-face armory-civ-support-left" title="${civFaces[1]?.name || ''}">
                          ${civFaces[1]?.svgIcon || ''}
                        </div>
                        <div class="armory-civ-hero-face" title="${civFaces[0]?.name || ''}">
                          ${civFaces[0]?.svgIcon || ''}
                        </div>
                        <div class="armory-civ-support-face armory-civ-support-right" title="${civFaces[2]?.name || ''}">
                          ${civFaces[2]?.svgIcon || ''}
                        </div>
                      </div>
                    </div>

                    <!-- Card Footer: Short 2-3 word personality phrase -->
                    <div class="armory-civ-card-footer">
                      <span style="color: #94a3b8; font-size: 8px; letter-spacing: 0.04em;">
                        ${item.tagline}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- 3. QUICK CATEGORY NAVIGATION TILES (Below Fold) -->
        <div class="armory-below-fold-sections" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(223, 188, 115, 0.08);">
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73; display: block; margin-bottom: 12px;">
            ARMORY SECTIONS
          </span>
          <div class="armory-category-tiles">
            <div class="armory-tile-card" data-switch-cat="BLADES">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
                <line x1="14.5" y1="17.5" x2="3" y2="6"/>
                <path d="M7 3l14 14"/>
                <path d="M12 12l2 2"/>
              </svg>
              <strong style="font-size: 12px; color: #f8fafc; letter-spacing: 0.06em;">COMMAND BLADES</strong>
              <span style="font-size: 9px; color: #94a3b8;">10 Unique Blades</span>
            </div>

            <div class="armory-tile-card" data-switch-cat="REACTIONS">
              <div style="display: flex; gap: 4px; align-items: center;">
                <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="24" fill="#0d1b2a" stroke="#dfbc73" stroke-width="3"/>
                  <circle cx="24" cy="28" r="3" fill="#dfbc73"/>
                  <circle cx="40" cy="28" r="3" fill="#dfbc73"/>
                  <path d="M22 38 Q32 48 42 38" stroke="#dfbc73" stroke-width="3" fill="none"/>
                </svg>
                <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="24" fill="#0d1b2a" stroke="#ef4444" stroke-width="3"/>
                  <line x1="20" y1="24" x2="28" y2="28" stroke="#ef4444" stroke-width="3"/>
                  <line x1="44" y1="24" x2="36" y2="28" stroke="#ef4444" stroke-width="3"/>
                  <rect x="24" y="38" width="16" height="6" rx="2" fill="#ef4444"/>
                </svg>
                <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="24" fill="#0d1b2a" stroke="#38bdf8" stroke-width="3"/>
                  <ellipse cx="24" cy="28" rx="4" ry="5" fill="#38bdf8"/>
                  <ellipse cx="40" cy="28" rx="4" ry="5" fill="#38bdf8"/>
                  <circle cx="32" cy="40" r="4" fill="#38bdf8"/>
                </svg>
              </div>
              <strong style="font-size: 12px; color: #f8fafc; letter-spacing: 0.06em;">REACTIONS</strong>
              <span style="font-size: 9px; color: #94a3b8;">20-Expression Sets</span>
            </div>

            <div class="armory-tile-card" data-switch-cat="IDENTITY">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <strong style="font-size: 12px; color: #f8fafc; letter-spacing: 0.06em;">IDENTITY</strong>
              <span style="font-size: 9px; color: #94a3b8;">Frames, Titles & Pennants</span>
            </div>

            <div class="armory-tile-card" data-switch-cat="PASS">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
                <circle cx="12" cy="8" r="7"/>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
              </svg>
              <strong style="font-size: 12px; color: #f8fafc; letter-spacing: 0.06em;">SOVEREIGN PASS</strong>
              <span style="font-size: 9px; color: #94a3b8;">Season 1 Vanguard</span>
            </div>
          </div>
        </div>

        <!-- 4. FEATURED ACQUISITIONS (High Art Ratio, Below Fold) -->
        <div style="margin-top: 32px;">
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73; display: block; margin-bottom: 12px;">
            FEATURED ACQUISITIONS
          </span>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px;">
            ${secondaries.map(prod => this.renderProductCardHtml(prod)).join('')}
          </div>
        </div>
      </div>
    `;

    // Wire Claim First Heritage button inside hero
    body.querySelector('#btn-hero-claim-first-heritage')?.addEventListener('click', () => {
      const success = regionalPricingService.claimFirstHeritage(heroCiv);
      if (success) {
        const item = CIV_SHOWCASE.find(c => c.civ.toUpperCase() === heroCiv.toUpperCase()) || CIV_SHOWCASE[0];
        entitlementService.grantSku(item.rxPackSku);
        if (civData?.pennantId) {
          entitlementService.grantPennant(civData.pennantId);
        }
        const prod = catalogService.getProduct(item.rxPackSku);
        if (prod) {
          this.showInstantEquipModal(prod);
        }
        this.render();
      }
    });

    const railEl = body.querySelector('.armory-civ-rail') as HTMLElement;
    body.querySelector('#btn-civ-rail-prev')?.addEventListener('click', () => {
      railEl?.scrollBy({ left: -240, behavior: 'smooth' });
    });
    body.querySelector('#btn-civ-rail-next')?.addEventListener('click', () => {
      railEl?.scrollBy({ left: 240, behavior: 'smooth' });
    });

    // Wire Card Clicks to select civilization and re-render hero
    railEl?.querySelectorAll('.armory-civ-card').forEach(card => {
      card.addEventListener('click', () => {
        const civ = (card as HTMLElement).dataset.civ;
        if (civ) {
          this.featuredCivOverride = civ.toLowerCase();
          accountService.setFavoriteCivilization(civ.toLowerCase());
          this.render();
        }
      });
    });

    // Auto-scroll rail so selected civilization card is prominent (1st or 2nd card)
    setTimeout(() => {
      const selectedCard = railEl?.querySelector(`.armory-civ-card[data-civ="${favCiv}"]`) as HTMLElement;
      if (selectedCard && railEl) {
        const scrollTarget = Math.max(0, selectedCard.offsetLeft - 20);
        railEl.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      }
    }, 40);

    // Support horizontal scroll with mouse wheel and touchpad on rail
    railEl?.addEventListener('wheel', (e) => {
      if (e.deltaX !== 0) {
        e.preventDefault();
        railEl.scrollLeft += e.deltaX;
      } else if (e.deltaY !== 0) {
        e.preventDefault();
        railEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // Touch swipe support on rail
    let touchStartX = 0;
    let touchScrollLeft = 0;
    railEl?.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchScrollLeft = railEl.scrollLeft;
      }
    }, { passive: true });
    railEl?.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const dx = touchStartX - e.touches[0].clientX;
        railEl.scrollLeft = touchScrollLeft + dx;
      }
    }, { passive: true });

    body.querySelectorAll('[data-switch-cat]').forEach(tile => {
      tile.addEventListener('click', () => {
        const cat = (tile as HTMLElement).dataset.switchCat as CatalogCategory;
        if (cat) {
          this.activeCategory = cat;
          this.render();
        }
      });
    });

    this.bindProductCardActions(body);
  }

  private renderGrid(body: HTMLElement, category: CatalogCategory): void {
    const products = catalogService.getProducts(category);

    let categoryBanner = '';
    let gridContent = '';

    if (category === 'REACTIONS') {
      categoryBanner = `
        <div style="
          background: linear-gradient(90deg, #071322 0%, #0c2038 50%, #071322 100%);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 4px;
          padding: 14px 20px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        ">
          <div>
            <div style="display: flex; align-items: baseline; gap: 10px;">
              <span style="font-family: 'Cinzel', serif; font-size: 16px; font-weight: 900; color: #f8fafc; letter-spacing: 0.04em;">
                20 EXPRESSIONS · ${regionalPricingService.formatPrice(2.99)}
              </span>
              <span style="font-size: 11px; font-weight: 800; color: #dfbc73; letter-spacing: 0.04em;">
                ≈ ${regionalPricingService.formatPrice(0.15)} EACH
              </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
              Tactical pings (Attack Here, Defend Here, Danger, Look Here) and 8 universal faces are 100% free forever. Packs below contain culture-authentic moments.
            </div>
          </div>
          <button id="btn-armory-open-wheel" style="
            padding: 8px 16px;
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid #38bdf8;
            border-radius: 3px;
            color: #38bdf8;
            font-size: 10.5px;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
          " type="button">TEST WHEEL (E)</button>
        </div>
      `;
      gridContent = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px;">
          ${products.map(prod => this.renderProductCardHtml(prod)).join('')}
        </div>
      `;
    } else if (category === 'BLADES' || category === 'COMMAND BLADES') {
      // VISUAL PRICING ANCHOR ROW (Section 31: $0.49 Entry, $3.99 Standard, $9.99 Masterwork)
      const entryBlade = products.find(p => p.basePriceUsd === 0.49) || products[0];
      const standardBlade = products.find(p => p.basePriceUsd >= 2.99 && p.basePriceUsd <= 3.99 && p.sku !== entryBlade?.sku) || products[1];
      const masterworkBlade = products.find(p => p.basePriceUsd === 9.99 || p.sku === 'dominion.blade.imperial01') || products[2];

      const anchorSkus = new Set([entryBlade?.sku, standardBlade?.sku, masterworkBlade?.sku].filter(Boolean));
      const anchorProducts = [entryBlade, standardBlade, masterworkBlade].filter(Boolean) as CatalogProduct[];
      const remainingProducts = products.filter(p => !anchorSkus.has(p.sku));

      categoryBanner = `
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73;">
              COMMAND BLADE VALUE LADDER · CHOOSE YOUR STEEL
            </span>
            <span style="font-size: 9px; color: #94a3b8;">${regionalPricingService.formatPrice(0.49)} Entry · ${regionalPricingService.formatPrice(3.99)} Standard · ${regionalPricingService.formatPrice(9.99)} Masterwork</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${anchorProducts.map(prod => this.renderProductCardHtml(prod)).join('')}
          </div>
        </div>
      `;

      gridContent = `
        <div>
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73; display: block; margin-bottom: 12px;">
            ALL COMMAND BLADES
          </span>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px;">
            ${remainingProducts.map(prod => this.renderProductCardHtml(prod)).join('')}
          </div>
        </div>
      `;
    } else {
      gridContent = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px;">
          ${products.map(prod => this.renderProductCardHtml(prod)).join('')}
        </div>
      `;
    }

    body.innerHTML = `
      ${categoryBanner}
      ${gridContent}
    `;

    document.getElementById('btn-armory-open-wheel')?.addEventListener('click', () => {
      (window as any).__DOMINION_REACTION_WHEEL__?.openWheel();
    });

    this.bindProductCardActions(body);
  }

  private renderProductCardHtml(prod: CatalogProduct): string {
    const owned = entitlementService.ownsSku(prod.sku);
    const loadout = entitlementService.getLoadout();

    // Check if blade item is active
    const bladeEnt = prod.entitlements.find(e => e.startsWith('blade_'));
    const isEquipped = Boolean(bladeEnt && loadout.activeBladeSkin === bladeEnt);

    // Render Type-Aware Visual Block (55-65% Area)
    let visualHtml = '';

    if (prod.category === 'BLADES' || prod.category === 'COMMAND BLADES' || prod.previewType === 'blade') {
      const skinId = bladeEnt || prod.previewReferenceId;
      const skin = getBladeSkin(skinId);
      const isMasterwork = prod.sku === 'dominion.blade.imperial01' || skinId === 'blade_turk_imperial';
      const isEntry = prod.basePriceUsd === 0.49;

      if (isMasterwork) {
        visualHtml = `
          <div class="masterwork-showcase-box" style="background: #020509; border: 1.5px solid #dfbc73; border-radius: 4px; padding: 14px 10px; margin: 6px 0; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 105px; box-shadow: 0 0 24px rgba(223, 188, 115, 0.25);">
            <div class="masterwork-specular-bar"></div>
            <div style="position: absolute; top: 6px; right: 8px; font-size: 8px; font-weight: 900; letter-spacing: 0.12em; color: #fef08a; background: rgba(223, 188, 115, 0.25); border: 1px solid #dfbc73; padding: 2px 8px; border-radius: 2px;">
              MASTERWORK
            </div>
            <div style="width: 100%; display: flex; align-items: center; justify-content: center; transform: scale(1.04);">
              ${skin?.silhouette?.heroPreviewSvg || ''}
            </div>
            <!-- Three Material Callouts -->
            <div style="display: flex; gap: 8px; margin-top: 8px; font-size: 7.5px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em;">
              <span style="background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px; border: 1px solid rgba(223,188,115,0.3);">DAMASCUS STEEL</span>
              <span style="background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px; border: 1px solid rgba(223,188,115,0.3);">HORN GRIP</span>
              <span style="background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px; border: 1px solid rgba(223,188,115,0.3);">GILT FITTINGS</span>
            </div>
          </div>
        `;
      } else {
        visualHtml = `
          <div class="armory-product-art-box" style="background: #03060a; border: 1px solid rgba(223,188,115,0.2); border-radius: 4px; padding: 12px; margin: 6px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90px; position: relative;">
            ${isEntry ? `
              <div style="position: absolute; top: 6px; right: 8px; font-size: 7.5px; font-weight: 900; letter-spacing: 0.08em; color: #38bdf8; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; padding: 2px 6px; border-radius: 2px;">
                ENTRY OFFER
              </div>
            ` : ''}
            ${skin?.silhouette?.heroPreviewSvg || `
              <svg viewBox="0 0 540 50" width="100%" height="48">
                <line x1="40" y1="25" x2="500" y2="25" stroke="#dfbc73" stroke-width="2"/>
              </svg>
            `}
            <span style="font-size: 8.5px; color: #94a3b8; margin-top: 6px;">${skin?.silhouette?.bladeTypeLabel || 'Command Blade'}</span>
          </div>
        `;
      }
    } else if (prod.category === 'REACTIONS' || prod.previewType === 'reaction') {
      let rxList = prod.entitlements
        .map(id => getReaction(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
      if (rxList.length === 0 && prod.civilizationRestriction) {
        rxList = getReactionsForCivilization(prod.civilizationRestriction);
      }
      const displayFaces = rxList.slice(0, 5);

      // Sticker Pack Cluster Layout (1 dominant ~74px, 2 medium ~52px, 2 small ~38px)
      visualHtml = `
        <div class="armory-product-art-box" style="background: radial-gradient(circle, #091522 0%, #03060a 100%); border: 1px solid rgba(223,188,115,0.3); border-radius: 4px; padding: 10px 8px; margin: 6px 0; min-height: 110px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; top: 6px; right: 8px; font-size: 8px; font-weight: 800; color: #fef08a; background: rgba(223,188,115,0.2); border: 1px solid #dfbc73; padding: 2px 6px; border-radius: 2px; letter-spacing: 0.06em; z-index: 5;">
            20 REACTIONS
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; position: relative;">
            <div style="width: 38px; height: 38px; transform: translateY(6px) rotate(-6deg); filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8)); opacity: 0.9;" title="${displayFaces[3]?.name || ''}">
              ${displayFaces[3]?.svgIcon || ''}
            </div>
            <div style="width: 52px; height: 52px; transform: translateY(-4px) rotate(-3deg); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.85));" title="${displayFaces[1]?.name || ''}">
              ${displayFaces[1]?.svgIcon || ''}
            </div>
            <div style="width: 74px; height: 74px; transform: scale(1.05); filter: drop-shadow(0 6px 16px rgba(0,0,0,0.9)); z-index: 2;" title="${displayFaces[0]?.name || ''}">
              ${displayFaces[0]?.svgIcon || ''}
            </div>
            <div style="width: 52px; height: 52px; transform: translateY(-4px) rotate(3deg); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.85));" title="${displayFaces[2]?.name || ''}">
              ${displayFaces[2]?.svgIcon || ''}
            </div>
            <div style="width: 38px; height: 38px; transform: translateY(6px) rotate(6deg); filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8)); opacity: 0.9;" title="${displayFaces[4]?.name || ''}">
              ${displayFaces[4]?.svgIcon || ''}
            </div>
          </div>
        </div>
      `;
    } else if (prod.category === 'IDENTITY' || prod.previewType === 'frame' || prod.previewType === 'title') {
      visualHtml = `
        <div class="armory-product-art-box" style="background: #03060a; border: 1px solid rgba(223,188,115,0.2); border-radius: 4px; padding: 14px; margin: 6px 0; min-height: 90px; display: flex; align-items: center; justify-content: center; gap: 14px;">
          <div style="padding: 8px 14px; border: 1.5px solid #dfbc73; border-radius: 4px; background: rgba(223,188,115,0.1); display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span style="font-size: 8.5px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em;">PROFILE FRAME</span>
            <span style="font-size: 8px; font-weight: 800; color: #38bdf8; letter-spacing: 0.06em;">HERALDIC TITLE</span>
          </div>
          <span style="font-size: 9.5px; font-weight: 800; color: #dfbc73; background: rgba(223,188,115,0.15); padding: 4px 10px; border-radius: 3px; border: 1px solid rgba(223,188,115,0.3);">
            ${prod.displayName.toUpperCase()}
          </span>
        </div>
      `;
    } else if (prod.category === 'PASS') {
      visualHtml = `
        <div class="armory-product-art-box" style="background: #03060a; border: 1px solid rgba(223,188,115,0.2); border-radius: 4px; padding: 12px; margin: 6px 0; min-height: 90px; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
          <!-- Strict 4-Column Track Milestone Layout (Zero Collision) -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; font-size: 8.5px; font-weight: 800; color: #dfbc73; letter-spacing: 0.04em;">
            <div>TIER 1</div>
            <div>TIER 15</div>
            <div>TIER 30</div>
            <div>TIER 50</div>
          </div>
          <div style="height: 6px; background: #0f1c2d; border-radius: 3px; overflow: hidden;">
            <div style="width: 60%; height: 100%; background: linear-gradient(90deg, #dfbc73, #f59e0b);"></div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; font-size: 8px; color: #94a3b8;">
            <div>Banner</div>
            <div>Marks</div>
            <div>Blade</div>
            <div>Crown</div>
          </div>
        </div>
      `;
    } else if (prod.previewType === 'bundle') {
      const hasBlade = prod.entitlements.some(e => e.startsWith('blade_'));
      const rxCount = prod.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_')).length;
      const hasMarks = prod.entitlements.some(e => e.startsWith('marks_grant_'));
      const hasFrame = prod.entitlements.some(e => e.startsWith('frame_'));

      visualHtml = `
        <div class="armory-product-art-box" style="background: #03060a; border: 1px solid rgba(223,188,115,0.2); border-radius: 4px; padding: 12px; margin: 6px 0; min-height: 90px; display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap;">
          ${hasBlade ? `<span style="font-size: 9px; font-weight: 800; color: #dfbc73; background: rgba(223,188,115,0.15); border: 1px solid #dfbc73; padding: 4px 10px; border-radius: 3px;">⚔ COMMAND BLADE</span>` : ''}
          ${rxCount > 0 ? `<span style="font-size: 9px; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; padding: 4px 10px; border-radius: 3px;">✨ ${rxCount} EXPRESSIONS</span>` : ''}
          ${hasFrame ? `<span style="font-size: 9px; font-weight: 800; color: #a855f7; background: rgba(168,85,247,0.15); border: 1px solid #a855f7; padding: 4px 10px; border-radius: 3px;">◆ FRAME & TITLE</span>` : ''}
          ${hasMarks ? `<span style="font-size: 9px; font-weight: 800; color: #fef08a; background: rgba(254,240,138,0.15); border: 1px solid #fef08a; padding: 4px 10px; border-radius: 3px;">◆ MARKS</span>` : ''}
        </div>
      `;
    } else {
      visualHtml = `
        <div class="armory-product-art-box" style="background: #03060a; border: 1px solid rgba(223,188,115,0.2); border-radius: 4px; padding: 14px; margin: 6px 0; min-height: 90px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span style="font-size: 24px; color: #dfbc73;">◆</span>
          <span style="font-size: 16px; font-weight: 900; color: #fef08a; font-family: ui-monospace, monospace;">MARKS TREASURY</span>
        </div>
      `;
    }

    const isReactionPack = prod.category === 'REACTIONS' || prod.previewType === 'reaction';
    const isBundle = prod.previewType === 'bundle' || prod.category === 'CIVILIZATION';
    const formattedPrice = catalogService.formatStorefrontPrice(prod);
    const unitPriceNotice = isReactionPack ? ` (≈ ${regionalPricingService.formatPrice(0.15)} each)` : '';

    return `
      <div style="background: #08111c; border: 1.5px solid ${owned ? 'rgba(223, 188, 115, 0.4)' : 'rgba(255,255,255,0.08)'}; border-radius: 4px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- High Art Area (60-70% Visual Presentation) -->
          ${visualHtml}

          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px;">
            <span style="font-size: 8.5px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em;">${prod.civilizationRestriction || prod.category}</span>
            <span style="font-size: 8px; color: #64748b; text-transform: uppercase;">${prod.rarity}</span>
          </div>
          <h4 style="margin: 4px 0 2px 0; font-family: 'Cinzel', serif; font-size: 14px; font-weight: 700; color: #f8fafc;">${prod.displayName}</h4>
          ${isReactionPack ? `
            <div style="font-size: 10px; color: #dfbc73; font-weight: 800; letter-spacing: 0.04em;">20 EXPRESSIONS · ${formattedPrice}${unitPriceNotice}</div>
          ` : `
            <div style="font-size: 10.5px; color: #dfbc73; font-weight: 600;">${prod.description}</div>
          `}
        </div>

        <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
          <!-- Single Optical Block (Section 41 & 42: Price attached to CTA) -->
          <div style="display: flex; gap: 8px;">
            <button class="prof-action-btn prof-action-btn--preview btn-preview-sku" data-sku="${prod.sku}" style="flex: 1;" type="button">
              ${isBundle ? 'VIEW SET' : 'VIEW'}
            </button>
            ${isEquipped ? `
              <button class="prof-action-btn prof-action-btn--equipped" style="flex: 1.3;" disabled type="button">EQUIPPED</button>
            ` : owned ? `
              <button class="prof-action-btn prof-action-btn--equip btn-equip-card" data-sku="${prod.sku}" style="flex: 1.3; background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #6ee7b7;" type="button">EQUIP</button>
            ` : `
              <button class="civ-btn-continue-hero btn-buy-sku" data-sku="${prod.sku}" style="flex: 1.4; padding: 0 10px; font-size: 11px; font-weight: 900; white-space: nowrap;" type="button">
                ${isBundle ? 'GET SET · ' : 'GET · '}${formattedPrice}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  private bindProductCardActions(container: HTMLElement): void {
    container.querySelectorAll('.btn-preview-sku').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) this.openPreview(sku);
      });
    });

    container.querySelectorAll('.btn-buy-sku').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) this.handleBuy(sku);
      });
    });

    container.querySelectorAll('.btn-equip-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) {
          const prod = catalogService.getProduct(sku);
          if (prod) {
            const bladeId = prod.entitlements.find(e => e.startsWith('blade_'));
            if (bladeId) {
              entitlementService.equipBladeSkin(bladeId);
              this.render();
            }
          }
        }
      });
    });
  }

  public openPreview(sku: string): void {
    const prod = catalogService.getProduct(sku);
    if (!prod || !this.previewModalEl) return;

    this.previewModalEl.hidden = false;
    this.previewModalEl.style.display = 'flex';

    const mount = document.getElementById('item-preview-mount');
    if (!mount) return;

    mount.innerHTML = `
      <!-- Sticky Modal Header -->
      <div class="reaction-preview-header" style="padding: 16px 24px 12px 24px; border-bottom: 1px solid rgba(223, 188, 115, 0.25); background: #07101b; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <div>
          <span style="font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: #dfbc73; display: block; margin-bottom: 2px;">
            ${prod.civilizationRestriction || prod.category} · ${prod.rarity.toUpperCase()}
          </span>
          <h3 style="margin: 0; font-family: 'Cinzel', serif; font-size: 20px; font-weight: 900; color: #f8fafc;">
            ${prod.displayName}
          </h3>
        </div>
        <div style="font-family: 'Cinzel', serif; font-size: 14px; font-weight: 900; color: #fef08a; background: rgba(223,188,115,0.15); border: 1px solid #dfbc73; padding: 4px 12px; border-radius: 3px;">
          ${catalogService.formatStorefrontPrice(prod)}
        </div>
      </div>

      <!-- Single Scrollable Body Container (Zero Nested Vertical Scrollbars) -->
      <div id="armory-preview-stage" class="reaction-preview-scroll-body" style="flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 16px;"></div>

      <!-- Sticky Bottom Purchase Bar -->
      <div class="reaction-preview-purchase-bar" style="padding: 12px 24px; border-top: 1px solid rgba(223, 188, 115, 0.25); background: #050a12; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-shrink: 0; z-index: 10;">
        <div style="font-size: 11px; color: #dfbc73; font-weight: 700;">
          ${prod.entitlements.length} ITEMS INCLUDED · PERMANENT ENTITLEMENT
        </div>
        <div>
          ${entitlementService.ownsSku(prod.sku) ? `
            <button id="btn-prev-equip" class="civ-btn-continue-hero" style="height: 38px; padding: 0 20px;" type="button">EQUIP LOADOUT</button>
          ` : `
            <button id="btn-prev-buy" class="civ-btn-continue-hero" style="height: 38px; padding: 0 24px;" type="button">
              ACQUIRE · ${catalogService.formatStorefrontPrice(prod)}
            </button>
          `}
        </div>
      </div>
    `;

    const stage = document.getElementById('armory-preview-stage');
    if (stage) {
      // PRODUCT PREVIEW AUTHORITY:
      // Strictly derive content from SKU category and actual entitlements:
      const bladeEnt = prod.entitlements.find(e => e.startsWith('blade_'));
      const rxEnts = prod.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
      const frameEnt = prod.entitlements.find(e => e.startsWith('frame_'));
      const titleEnt = prod.entitlements.find(e => e.startsWith('title_'));

      const isStarter = prod.sku === 'dominion.starter.founder01';
      const isPass = prod.previewType === 'pass' || prod.category === 'PASS';
      const isBundle = prod.previewType === 'bundle' || (prod.category === 'CIVILIZATION' && prod.entitlements.length > 1);
      const isReactionPack = !isBundle && (prod.previewType === 'reaction' || prod.category === 'REACTIONS' || (prod.entitlements.length > 0 && prod.entitlements.every(e => e.startsWith('reaction_') || e.startsWith('rx_'))));
      const isBlade = !isBundle && !isReactionPack && !isPass && !isStarter;

      if (isStarter) {
        // First Dominion Pack (Frame + Title + 300 Marks - ZERO BLADE, Clean Commercial Display)
        stage.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 24px; width: 100%; padding: 16px 0;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
              <div style="padding: 12px 22px; border: 2px solid #dfbc73; border-radius: 6px; background: rgba(223,188,115,0.12); box-shadow: 0 0 20px rgba(223,188,115,0.25);">
                <div style="font-size: 10px; font-weight: 800; color: #dfbc73; letter-spacing: 0.1em; text-align: center;">PIONEER FRAME</div>
              </div>
              <span style="font-size: 10px; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.15); padding: 3px 10px; border-radius: 3px;">FOUNDER OF REALMS</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: #071322; border: 1px solid rgba(223,188,115,0.4); border-radius: 6px; padding: 14px 22px;">
              <span style="font-size: 24px; color: #dfbc73;">◆</span>
              <span style="font-size: 20px; font-weight: 900; color: #fef08a; font-family: ui-monospace, monospace;">+300</span>
              <span style="font-size: 9px; font-weight: 800; color: #dfbc73; letter-spacing: 0.1em;">SOVEREIGN MARKS</span>
            </div>
          </div>
          <div style="width: 100%; text-align: center; font-family: 'Cinzel', serif; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; color: #dfbc73; margin-top: 14px; padding-top: 8px; border-top: 1px solid rgba(223,188,115,0.2);">
            ${prod.entitlements.length} ITEMS INCLUDED
          </div>
        `;
      } else if (isBlade) {
        // STANDALONE BLADE SKU: ONLY hero blade, matching scabbard, interactive 0-100% draw.
        const isMasterwork = prod.sku === 'dominion.blade.imperial01' || bladeEnt === 'blade_turk_imperial';
        stage.innerHTML = `
          <div style="width: 100%; display: flex; flex-direction: column; gap: 16px; align-items: center;">
            ${isMasterwork ? `
              <div style="width: 100%; text-align: center; margin-bottom: 4px;">
                <span style="font-size: 8.5px; font-weight: 900; letter-spacing: 0.16em; color: #fef08a; background: rgba(223, 188, 115, 0.2); border: 1px solid #dfbc73; padding: 3px 12px; border-radius: 2px;">
                  MASTERWORK SPECIFICATION · IMPERIAL ARMORER CRAFT
                </span>
              </div>
            ` : ''}

            <!-- Interactive Blade Canvas (1.2x scale for Masterwork) -->
            <div id="blade-interactive-container" style="width: 100%; display: flex; justify-content: center; ${isMasterwork ? 'transform: scale(1.15); margin: 16px 0;' : ''}"></div>

            ${isMasterwork ? `
              <!-- Three Close-up Material Inspection Windows (Section 29: Damascus, Horn, Gilt) -->
              <div style="width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px;">
                <div class="masterwork-inspection-window" data-material="damascus">
                  <span class="mat-label" style="font-family: 'Cinzel', serif; font-size: 10px; font-weight: 900; color: #dfbc73; letter-spacing: 0.1em;">DAMASCUS</span>
                  <span class="mat-desc" style="font-size: 8.5px; color: #94a3b8; line-height: 1.3;">320-layer folded water steel</span>
                </div>
                <div class="masterwork-inspection-window" data-material="horn">
                  <span class="mat-label" style="font-family: 'Cinzel', serif; font-size: 10px; font-weight: 900; color: #dfbc73; letter-spacing: 0.1em;">HORN</span>
                  <span class="mat-desc" style="font-size: 8.5px; color: #94a3b8; line-height: 1.3;">Carved buffalo horn thumb-grip</span>
                </div>
                <div class="masterwork-inspection-window" data-material="gilt">
                  <span class="mat-label" style="font-family: 'Cinzel', serif; font-size: 10px; font-weight: 900; color: #dfbc73; letter-spacing: 0.1em;">GILT</span>
                  <span class="mat-desc" style="font-size: 8.5px; color: #94a3b8; line-height: 1.3;">24k mercury-amalgam gold inlay</span>
                </div>
              </div>
            ` : ''}

            <!-- Try on HUD Button (Section 20) -->
            <div style="display: flex; gap: 12px; margin-top: 10px;">
              <button id="btn-prev-try-hud" class="prof-action-btn prof-action-btn--preview" style="height: 38px; padding: 0 20px; font-size: 11px; font-weight: 800; border-color: #38bdf8; color: #38bdf8;" type="button">
                TRY ON HUD
              </button>
            </div>
          </div>
        `;

        const bladeHost = document.getElementById('blade-interactive-container') || stage;
        this.bladePreviewInstance = new ArmoryBladePreview(bladeHost, bladeEnt || prod.previewReferenceId || 'blade_standard', 560, 54);

        if (isMasterwork) {
          stage.querySelectorAll('.masterwork-inspection-window').forEach(win => {
            win.addEventListener('mouseenter', () => {
              const mat = (win as HTMLElement).dataset.material as 'damascus' | 'horn' | 'gilt';
              this.bladePreviewInstance?.highlightMaterial(mat);
            });
            win.addEventListener('mouseleave', () => {
              this.bladePreviewInstance?.highlightMaterial(null);
            });
          });
        }

        document.getElementById('btn-prev-try-hud')?.addEventListener('click', () => {
          this.showBladeHudPreview(bladeEnt || prod.previewReferenceId || 'blade_standard');
        });
      } else if (isReactionPack) {
        // 20-EXPRESSION REACTION PACK PREVIEW MODAL — INTERACTIVE PLAYGROUND (Sections 18, 19, 33)
        let rxList = rxEnts.map(id => getReaction(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
        if (rxList.length === 0 && prod.civilizationRestriction) {
          rxList = getReactionsForCivilization(prod.civilizationRestriction);
        }
        let currentIdx = 0;
        let currentActiveHero = rxList[0] || getReaction('rx_turk_pasha_laugh');
        const thumbs = rxList.slice(1, 5);

        stage.innerHTML = `
          <div style="width: 100%; display: flex; flex-direction: column; gap: 16px;">
            <!-- TOP HERO PREVIEW: 1 Large Selected Reaction (~120px) + Counter + Actions -->
            <div style="background: radial-gradient(circle, #0a1728 0%, #03060a 100%); border: 1.5px solid rgba(223,188,115,0.35); border-radius: 6px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
              <!-- Large Hero Reaction Stage -->
              <div style="display: flex; align-items: center; gap: 18px;">
                <div id="rx-modal-hero-box" style="width: 125px; height: 125px; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.9)); transition: transform 0.25s ease; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Click to play animation">
                  ${currentActiveHero?.svgIcon || ''}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 9px; font-weight: 800; color: #dfbc73; letter-spacing: 0.12em; text-transform: uppercase;">FEATURED EXPRESSION</span>
                    <span id="rx-hero-counter" style="font-size: 9.5px; font-weight: 800; color: #38bdf8; letter-spacing: 0.08em; background: rgba(56,189,248,0.15); padding: 1px 6px; border-radius: 2px;">
                      1 / ${rxList.length}
                    </span>
                  </div>
                  <h3 id="rx-modal-hero-name" style="margin: 3px 0 2px 0; font-family: 'Cinzel', serif; font-size: 20px; font-weight: 900; color: #f8fafc;">
                    ${currentActiveHero?.name || 'Reaction'}
                  </h3>
                  <div id="rx-modal-hero-tagline" style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
                    ${currentActiveHero?.tagline || 'Cultural Character Expression'}
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button id="btn-play-large-hero" class="civ-btn-continue-hero" style="padding: 0 16px; height: 32px; font-size: 10px; font-weight: 800;" type="button">
                      ▶ PLAY ANIMATION
                    </button>
                    <button id="btn-prev-try-wheel" class="prof-action-btn prof-action-btn--preview" style="padding: 0 14px; height: 32px; font-size: 10px; font-weight: 800; border-color: #38bdf8; color: #38bdf8;" type="button">
                      TRY IN WHEEL
                    </button>
                  </div>
                </div>
              </div>

              <!-- Clean Prev/Next Navigation Controls (Option A: Zero Overflow) -->
              <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end; flex-shrink: 0;">
                <span style="font-size: 8px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em; text-transform: uppercase;">CYCLE EXPRESSIONS</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <button id="btn-hero-prev-rx" class="civ-rail-arrow-btn" type="button" aria-label="Previous expression" title="Previous expression (←)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button id="btn-hero-next-rx" class="civ-rail-arrow-btn" type="button" aria-label="Next expression" title="Next expression (→)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 20-ITEM COMPACT GRID -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73;">
                  ALL ${rxList.length} MASTERWORK REACTIONS (← / → KEYS OR SCROLL TO CYCLE)
                </span>
                <span style="font-size: 8.5px; color: #94a3b8;">Click reaction to preview</span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(115px, 1fr)); gap: 8px;">
                ${rxList.map((rx, idx) => `
                  <div class="btn-select-grid-rx" data-rx-id="${rx.id}" data-idx="${idx}" style="display: flex; flex-direction: column; align-items: center; gap: 6px; background: ${idx === 0 ? 'rgba(223,188,115,0.08)' : '#040912'}; border: 1px solid ${idx === 0 ? '#dfbc73' : 'rgba(255,255,255,0.08)'}; border-radius: 4px; padding: 10px 4px; cursor: pointer; transition: all 0.15s ease;" title="${rx.name} · ${rx.tagline}">
                    <div id="grid-prev-icon-${idx}" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transition: transform 0.25s ease;">
                      ${rx.svgIcon}
                    </div>
                    <span style="font-size: 8.5px; font-weight: 700; color: #f8fafc; text-align: center; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${rx.name}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Value Footer -->
            <div style="width: 100%; text-align: center; font-family: 'Cinzel', serif; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; color: #dfbc73; padding-top: 10px; border-top: 1px solid rgba(223,188,115,0.2);">
              ${rxList.length} CULTURAL EXPRESSIONS · PERMANENT
            </div>
          </div>
        `;

        const updateHeroDisplay = (idx: number, playAnim = true) => {
          if (idx < 0) idx = rxList.length - 1;
          if (idx >= rxList.length) idx = 0;
          currentIdx = idx;
          currentActiveHero = rxList[currentIdx];
          if (!currentActiveHero) return;

          const heroBox = document.getElementById('rx-modal-hero-box');
          const heroName = document.getElementById('rx-modal-hero-name');
          const heroTagline = document.getElementById('rx-modal-hero-tagline');
          const heroCounter = document.getElementById('rx-hero-counter');
          if (heroBox) heroBox.innerHTML = currentActiveHero.svgIcon;
          if (heroName) heroName.textContent = currentActiveHero.name;
          if (heroTagline) heroTagline.textContent = currentActiveHero.tagline || 'Cultural Character Expression';
          if (heroCounter) heroCounter.textContent = `${currentIdx + 1} / ${rxList.length}`;

          // Highlight selected grid card
          stage.querySelectorAll('.btn-select-grid-rx').forEach((c, i) => {
            (c as HTMLElement).style.borderColor = i === currentIdx ? '#dfbc73' : 'rgba(255,255,255,0.08)';
            (c as HTMLElement).style.background = i === currentIdx ? 'rgba(223,188,115,0.08)' : '#040912';
          });

          if (playAnim) {
            const cue = currentActiveHero.animationCue || 'rx-playing-laugh';
            if (heroBox) {
              heroBox.classList.remove(cue);
              void heroBox.offsetWidth;
              heroBox.classList.add(cue);
              setTimeout(() => { heroBox?.classList.remove(cue); }, 1100);
            }
            (window as any).__DOMINION_TACTILE_HOOKS__?.onReactionPlay?.(cue);
          }
        };

        // Wire chevron previous/next selection
        document.getElementById('btn-hero-prev-rx')?.addEventListener('click', () => {
          updateHeroDisplay(currentIdx - 1, true);
        });
        document.getElementById('btn-hero-next-rx')?.addEventListener('click', () => {
          updateHeroDisplay(currentIdx + 1, true);
        });

        // Wire grid card selection to hero (hover switches hero, click plays animation)
        stage.querySelectorAll('.btn-select-grid-rx').forEach(card => {
          card.addEventListener('mouseenter', () => {
            const targetIdx = parseInt((card as HTMLElement).dataset.idx || '0', 10);
            updateHeroDisplay(targetIdx, false);
          });
          card.addEventListener('click', () => {
            const targetIdx = parseInt((card as HTMLElement).dataset.idx || '0', 10);
            updateHeroDisplay(targetIdx, true);
          });
        });

        // Wire large hero play button & click
        document.getElementById('btn-play-large-hero')?.addEventListener('click', () => {
          updateHeroDisplay(currentIdx, true);
        });

        const heroBox = document.getElementById('rx-modal-hero-box');
        heroBox?.addEventListener('click', () => {
          updateHeroDisplay(currentIdx, true);
        });

        // Mousewheel inside preview hero cycles expressions
        heroBox?.addEventListener('wheel', (e) => {
          e.preventDefault();
          if (e.deltaY > 0) updateHeroDisplay(currentIdx + 1, false);
          else updateHeroDisplay(currentIdx - 1, false);
        });

        // Keyboard arrow navigation
        const keyHandler = (e: KeyboardEvent) => {
          if (this.previewModalEl?.hidden) {
            window.removeEventListener('keydown', keyHandler);
            return;
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            updateHeroDisplay(currentIdx + 1, true);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            updateHeroDisplay(currentIdx - 1, true);
          }
        };
        window.addEventListener('keydown', keyHandler);

        // Try in Wheel button (Section 19)
        document.getElementById('btn-prev-try-wheel')?.addEventListener('click', () => {
          this.showWheelPreviewModal(rxList);
        });
      } else if (isBundle) {
        // CIVILIZATION BUNDLE SKU: Real blade preview, 20 reaction faces (hero strip + grid), visual profile frame, pennant art, title preview, and clean summary!
        let rxList = rxEnts.map(id => getReaction(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
        if (rxList.length === 0 && prod.civilizationRestriction) {
          rxList = getReactionsForCivilization(prod.civilizationRestriction);
        }
        const titleLabel = titleEnt ? titleEnt.replace(/^title_/, '').replace(/_/g, ' ').toUpperCase() : 'SOVEREIGN';
        const frameLabel = frameEnt ? frameEnt.replace(/^frame_/, '').replace(/_/g, ' ').toUpperCase() : 'IMPERIAL FRAME';
        const pennantSvg = this.getPennantSvg(prod.civilizationRestriction);
        const heroFaces = rxList.slice(0, 5);

        stage.innerHTML = `
          <div style="width: 100%; display: flex; flex-direction: column; gap: 14px;">
            <!-- 1. Interactive Command Blade & Scabbard -->
            ${bladeEnt ? `
              <div style="background: #060b13; border: 1px solid rgba(223,188,115,0.25); border-radius: 4px; padding: 10px;">
                <span style="font-size: 9px; font-weight: 800; color: #dfbc73; letter-spacing: 0.12em; display: block; margin-bottom: 6px;">1. COMMAND BLADE & SHEATH</span>
                <div id="bundle-blade-container" style="width: 100%;"></div>
              </div>
            ` : ''}

            <!-- 2. Included Cultural Reaction Faces (${rxList.length} Expressions) -->
            ${rxList.length > 0 ? `
              <div style="background: #060b13; border: 1px solid rgba(223,188,115,0.25); border-radius: 4px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                  <span style="font-size: 9px; font-weight: 800; color: #38bdf8; letter-spacing: 0.12em;">2. CULTURAL CHARACTER EXPRESSIONS (${rxList.length} INCLUDED)</span>
                  <span style="font-size: 8.5px; color: #dfbc73; font-weight: 700;">COMPLETE CULTURAL VOCABULARY</span>
                </div>
                <!-- Hero 5 faces preview -->
                <div style="display: flex; justify-content: space-around; align-items: center; gap: 8px; margin-bottom: 8px;">
                  ${heroFaces.map((rx, idx) => `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; background: rgba(0,0,0,0.35); border: 1px solid rgba(56,189,248,0.2); border-radius: 4px; padding: 6px 4px;">
                      <div id="bundle-rx-icon-${idx}" style="width: 48px; height: 48px;">${rx.svgIcon}</div>
                      <span style="font-size: 8.5px; font-weight: 800; color: #dfbc73; text-align: center; max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rx.name}</span>
                      <button class="btn-play-bundle-rx" data-rx-idx="${idx}" data-cue="${rx.animationCue}" style="margin-top: 2px; padding: 2px 8px; font-size: 8px; font-weight: 800; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 2px; cursor: pointer;" type="button">▶ PLAY</button>
                    </div>
                  `).join('')}
                </div>
                ${rxList.length > 5 ? `
                  <div style="font-size: 8.5px; color: #94a3b8; text-align: center; margin-top: 4px;">+ ${rxList.length - 5} additional expressions included in pack</div>
                ` : ''}
              </div>
            ` : ''}

            <!-- 3. Visual Identity Previews: Live Frame, Pennant Art & Title Preview -->
            <div style="background: #060b13; border: 1px solid rgba(223,188,115,0.25); border-radius: 4px; padding: 12px;">
              <span style="font-size: 9px; font-weight: 800; color: #fef08a; letter-spacing: 0.12em; display: block; margin-bottom: 8px;">3. SOVEREIGN PRESTIGE & HERALDRY</span>
              <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 14px;">
                <!-- Actual Pennant Artwork -->
                <div style="background: #070e17; border: 1px solid rgba(223,188,115,0.35); border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                  <div style="width: 58px; height: 74px; display: flex; align-items: center; justify-content: center;">
                    ${pennantSvg}
                  </div>
                  <span style="font-size: 9px; font-weight: 800; color: #dfbc73; letter-spacing: 0.08em; text-align: center;">CEREMONIAL PENNANT</span>
                </div>

                <!-- Miniature Profile Card with Frame Applied -->
                <div style="background: #070e17; border: 2px solid #dfbc73; border-radius: 6px; padding: 10px 14px; box-shadow: 0 0 16px rgba(223,188,115,0.25); text-align: center; min-width: 120px;">
                  <div style="font-size: 8px; font-weight: 800; color: #dfbc73; letter-spacing: 0.1em; margin-bottom: 4px;">PROFILE FRAME</div>
                  <div style="width: 40px; height: 40px; margin: 0 auto 6px auto; border-radius: 50%; border: 2px solid #dfbc73; background: #0c1828; display: flex; align-items: center; justify-content: center; color: #dfbc73; box-shadow: inset 0 0 8px rgba(0,0,0,0.8);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div style="font-family: 'Cinzel', serif; font-size: 11px; font-weight: 800; color: #f8fafc;">NOYAN</div>
                  <div style="font-size: 8.5px; font-weight: 700; color: #dfbc73; margin-top: 2px;">${frameLabel}</div>
                </div>

                <!-- Title Preview: NOYAN <TITLE> -->
                <div style="background: #070e17; border: 1.5px solid #dfbc73; border-radius: 6px; padding: 10px 14px; text-align: center; min-width: 120px;">
                  <div style="font-size: 8px; font-weight: 800; color: #dfbc73; letter-spacing: 0.1em; margin-bottom: 6px;">SOVEREIGN TITLE</div>
                  <div style="font-family: 'Cinzel', serif; font-size: 14px; font-weight: 900; color: #f8fafc; letter-spacing: 0.08em;">NOYAN</div>
                  <div style="font-size: 10.5px; font-weight: 800; color: #38bdf8; letter-spacing: 0.12em; margin-top: 4px;">${titleLabel}</div>
                </div>
              </div>
            </div>

            <!-- Bundle Value Communication -->
            <div style="width: 100%; text-align: center; font-family: 'Cinzel', serif; font-size: 11.5px; font-weight: 900; letter-spacing: 0.14em; color: #dfbc73; padding-top: 8px; border-top: 1px solid rgba(223,188,115,0.2);">
              ${prod.entitlements.length} ITEMS INCLUDED
            </div>
          </div>
        `;

        stage.querySelectorAll('.btn-play-bundle-rx').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = (btn as HTMLElement).dataset.rxIdx;
            const cue = (btn as HTMLElement).dataset.cue || 'rx-playing-laugh';
            const icon = document.getElementById(`bundle-rx-icon-${idx}`);
            if (icon) {
              icon.classList.remove(cue);
              void icon.offsetWidth;
              icon.classList.add(cue);
              setTimeout(() => { icon.classList.remove(cue); }, 1100);
            }
          });
        });

        if (bladeEnt) {
          const bladeContainer = document.getElementById('bundle-blade-container');
          if (bladeContainer) {
            this.bladePreviewInstance = new ArmoryBladePreview(bladeContainer, bladeEnt, 560, 54);
          }
        }
      } else if (isPass) {
        stage.innerHTML = `
          <div style="width: 100%; padding: 12px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; color: #dfbc73; margin-bottom: 8px;">
              <span>TIER 1: Pioneer Standard</span>
              <span>TIER 10: 250 Marks</span>
              <span>TIER 25: Cold Titanium Blade</span>
              <span>TIER 50: Sovereign Crown</span>
            </div>
            <div style="height: 8px; background: #0e1a29; border-radius: 4px; overflow: hidden;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #dfbc73, #f59e0b, #38bdf8);"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-top: 6px;">
              <span>Instant Unlock</span>
              <span>50 Match Progression Tiers</span>
              <span>Seasonal Exclusive Cosmetics</span>
            </div>
          </div>
        `;
      } else {
        stage.innerHTML = `
          <div style="color: #dfbc73; font-size: 14px; font-weight: 700;">
            ${prod.displayName}
          </div>
        `;
      }
    }

    document.getElementById('btn-prev-buy')?.addEventListener('click', () => {
      this.closePreview();
      this.handleBuy(sku);
    });

    document.getElementById('btn-prev-equip')?.addEventListener('click', () => {
      this.closePreview();
      const bladeEnt = prod.entitlements.find(e => e.startsWith('blade_'));
      if (bladeEnt) {
        entitlementService.equipBladeSkin(bladeEnt);
      }
      this.render();
    });
  }

  public showWheelPreviewModal(rxList: any[]): void {
    const existing = document.getElementById('armory-wheel-preview-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'armory-wheel-preview-overlay';
    overlay.className = 'wheel-preview-overlay';

    const first8 = rxList.slice(0, 8);
    const radius = 135;
    const centerOffset = 180;

    const slotsHtml = first8.map((rx, i) => {
      const angleDeg = -90 + i * 45;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = Math.round(centerOffset + radius * Math.cos(angleRad) - 28);
      const y = Math.round(centerOffset + radius * Math.sin(angleRad) - 28);

      return `
        <div class="wheel-preview-slot" data-rx-idx="${i}" data-cue="${rx.animationCue}" style="
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 56px;
          height: 56px;
          background: transparent;
          border: none;
          box-shadow: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.15s ease;
        " title="${rx.name}">
          <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; pointer-events: none;">${rx.svgIcon}</div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="wheel-preview-modal-card" style="
        background: radial-gradient(circle, #081525 0%, #03060a 85%);
        border: 1.5px solid #dfbc73;
        border-radius: 8px;
        padding: 24px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 0 40px rgba(0,0,0,0.95);
      ">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 12px;">
          <div>
            <span style="font-size: 8px; font-weight: 900; color: #fef08a; background: rgba(223,188,115,0.2); border: 1px solid #dfbc73; padding: 2px 7px; border-radius: 2px; letter-spacing: 0.08em;">
              PREVIEW ONLY
            </span>
            <strong style="margin-left: 8px; font-family: 'Cinzel', serif; font-size: 13px; color: #f8fafc;">IN-MATCH RADIAL WHEEL PREVIEW</strong>
          </div>
          <button id="btn-close-wheel-prev" style="background: none; border: 1px solid rgba(255,255,255,0.2); color: #94a3b8; font-size: 11px; cursor: pointer; padding: 4px 10px; border-radius: 3px;" type="button">✕ EXIT PREVIEW</button>
        </div>

        <!-- 8-Slot Radial Wheel Stage (360x360) -->
        <div style="position: relative; width: 360px; height: 360px; margin: 10px 0;">
          <!-- SVG Decorative Spokes & Ring -->
          <svg width="360" height="360" viewBox="0 0 360 360" style="position: absolute; top: 0; left: 0; pointer-events: none;">
            <circle cx="180" cy="180" r="135" stroke="rgba(223, 188, 115, 0.2)" stroke-width="1.5" fill="none" stroke-dasharray="4 4" />
            <circle cx="180" cy="180" r="48" stroke="rgba(223, 188, 115, 0.35)" stroke-width="1.5" fill="rgba(6, 13, 22, 0.8)" />
          </svg>

          <!-- Center Hub -->
          <div id="wheel-prev-center-hub" style="
            position: absolute;
            top: 135px;
            left: 135px;
            width: 90px;
            height: 90px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            pointer-events: none;
          ">
            <span style="font-size: 8px; font-weight: 900; color: #dfbc73; letter-spacing: 0.1em;">PREVIEW</span>
            <span id="wheel-prev-hub-name" style="font-size: 9px; font-weight: 800; color: #f8fafc; margin-top: 2px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Hover Slot</span>
          </div>

          <!-- The 8 radial slots -->
          ${slotsHtml}
        </div>

        <div style="font-size: 10.5px; color: #94a3b8; margin-top: 6px; text-align: center;">
          Click any slot to test the reaction animation in its actual combat radial wheel position.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-wheel-prev')?.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelectorAll('.wheel-preview-slot').forEach(slot => {
      const el = slot as HTMLElement;
      const idx = parseInt(el.dataset.rxIdx || '0', 10);
      const rx = first8[idx];
      const cue = el.dataset.cue || 'rx-playing-laugh';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.18)';
        el.style.filter = 'drop-shadow(0 0 14px rgba(223, 188, 115, 0.95)) drop-shadow(0 0 4px #fef08a)';
        const hubName = document.getElementById('wheel-prev-hub-name');
        if (hubName && rx) hubName.textContent = rx.name;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.filter = '';
      });
      el.addEventListener('click', () => {
        el.classList.remove(cue);
        void el.offsetWidth;
        el.classList.add(cue);
        setTimeout(() => el.classList.remove(cue), 1100);
        (window as any).__DOMINION_TACTILE_HOOKS__?.onReactionPlay?.(cue);
      });
    });
  }

  public showBladeHudPreview(bladeId: string): void {
    const existing = document.getElementById('armory-blade-hud-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'armory-blade-hud-overlay';
    overlay.className = 'wheel-preview-overlay';

    const skin = getBladeSkin(bladeId);

    overlay.innerHTML = `
      <div style="
        width: 90%;
        max-width: 900px;
        background: #03060a;
        border: 1.5px solid #dfbc73;
        border-radius: 8px;
        padding: 20px 28px;
        box-shadow: 0 0 50px rgba(0,0,0,0.95);
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(223,188,115,0.25); padding-bottom: 10px;">
          <div>
            <span style="font-size: 8px; font-weight: 900; color: #38bdf8; background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; padding: 2px 8px; border-radius: 2px; letter-spacing: 0.08em;">
              HUD SIMULATION · PREVIEW ONLY
            </span>
            <strong style="margin-left: 8px; font-family: 'Cinzel', serif; font-size: 14px; color: #f8fafc;">
              ${skin?.name || 'Command Blade'} IN COMBAT HUD
            </strong>
          </div>
          <button id="btn-close-hud-prev" style="background: none; border: 1px solid rgba(255,255,255,0.2); color: #94a3b8; font-size: 11px; cursor: pointer; padding: 4px 10px; border-radius: 3px;" type="button">✕ CLOSE HUD PREVIEW</button>
        </div>

        <!-- Mock In-Match Top Combat HUD Status Strip -->
        <div style="background: #07101c; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 8px; color: #94a3b8;">COMMAND STANCE</span>
              <span style="font-size: 11px; font-weight: 800; color: #dfbc73;">READY</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 8px; color: #94a3b8;">DOCTRINE REINFORCEMENTS</span>
              <span style="font-size: 11px; font-weight: 800; color: #38bdf8;">PHASE II ACTIVE</span>
            </div>
          </div>
          <div style="font-family: 'Cinzel', serif; font-size: 12px; font-weight: 900; color: #dfbc73;">
            TURN 12 · TACTICAL ENGAGEMENT
          </div>
        </div>

        <!-- In-Match Bottom Blade Stage (Interactive Draw with Detents) -->
        <div style="background: #020408; border: 1px solid rgba(223,188,115,0.3); border-radius: 6px; padding: 18px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: inset 0 0 30px rgba(0,0,0,0.8);">
          <div style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73;">
            DRAG TO TEST DRAW FEEL (0% - 25% - 50% - 75% - 100%)
          </div>
          <div id="mock-hud-blade-host" style="width: 100%;"></div>
        </div>

        <div style="font-size: 10px; color: #94a3b8; text-align: center;">
          The blade appears anchored at the bottom edge during matches, unsheathing dynamically as tactical orders are committed.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-hud-prev')?.addEventListener('click', () => {
      overlay.remove();
    });

    const host = overlay.querySelector('#mock-hud-blade-host') as HTMLElement;
    if (host) {
      new ArmoryBladePreview(host, bladeId, 700, 60);
    }
  }

  public showInstantEquipModal(prod: CatalogProduct): void {
    const existing = document.getElementById('armory-instant-equip-dialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'armory-instant-equip-dialog';
    overlay.className = 'armory-instant-equip-dialog';

    const bladeEnt = prod.entitlements.find(e => e.startsWith('blade_'));
    const rxEnts = prod.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
    const frameEnt = prod.entitlements.find(e => e.startsWith('frame_'));
    const titleEnt = prod.entitlements.find(e => e.startsWith('title_'));

    let visualHtml = '';
    let primaryCtaLabel = 'EQUIP NOW';
    let onEquipAction = () => {};

    if (bladeEnt) {
      const skin = getBladeSkin(bladeEnt);
      visualHtml = `
        <div class="instant-equip-blade-stage" style="width: 390px; max-width: 100%; height: 70px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #020509; border: 1px solid rgba(223,188,115,0.3); border-radius: 4px; padding: 6px 14px; box-sizing: border-box; box-shadow: inset 0 0 20px rgba(0,0,0,0.85);">
          <div class="hero-blade-idle-sweep"></div>
          <div style="width: 100%; display: flex; align-items: center; justify-content: center; transform: scale(1.18);">
            ${skin?.silhouette?.heroPreviewSvg || ''}
          </div>
        </div>
      `;
      primaryCtaLabel = 'EQUIP BLADE';
      onEquipAction = () => {
        entitlementService.equipBladeSkin(bladeEnt);
      };
    } else if (rxEnts.length > 0) {
      const firstRx = getReaction(rxEnts[0]) || getReactionsForCivilization(prod.civilizationRestriction || 'TÜRK')[0];
      visualHtml = `<div style="width: 80px; height: 80px; filter: drop-shadow(0 4px 16px rgba(0,0,0,0.9));">${firstRx?.svgIcon || ''}</div>`;
      primaryCtaLabel = 'EQUIP TO WHEEL';
      onEquipAction = () => {
        if (firstRx) {
          entitlementService.equipReactionSlot(0, firstRx.id);
        }
      };
    } else if (frameEnt) {
      visualHtml = `
        <div style="border: 2px solid #dfbc73; border-radius: 4px; padding: 12px 24px; background: rgba(223,188,115,0.15);">
          <span style="font-size: 12px; font-weight: 800; color: #dfbc73;">${prod.displayName}</span>
        </div>
      `;
      primaryCtaLabel = 'USE FRAME';
      onEquipAction = () => {
        entitlementService.equipProfileFrame(frameEnt);
      };
    } else if (titleEnt) {
      visualHtml = `
        <div style="border: 1.5px solid #38bdf8; border-radius: 4px; padding: 12px 24px; background: rgba(56,189,248,0.15);">
          <span style="font-size: 13px; font-weight: 900; color: #38bdf8;">${prod.displayName}</span>
        </div>
      `;
      primaryCtaLabel = 'USE TITLE';
      onEquipAction = () => {
        entitlementService.equipTitle(titleEnt);
      };
    } else {
      visualHtml = `<span style="font-size: 32px; color: #dfbc73;">◆</span>`;
    }

    overlay.innerHTML = `
      <div class="armory-instant-equip-card" style="
        background: radial-gradient(circle, #091729 0%, #03060a 90%);
        border: 1.5px solid #dfbc73;
        border-radius: 8px;
        padding: 28px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        max-width: 480px;
        width: 92vw;
        box-sizing: border-box;
        box-shadow: 0 0 50px rgba(0,0,0,0.95);
        gap: 16px;
      ">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 9px; font-weight: 900; letter-spacing: 0.16em; color: #dfbc73; text-transform: uppercase;">
            ACQUISITION CONFIRMED
          </span>
          <h3 style="margin: 0; font-family: 'Cinzel', serif; font-size: 20px; font-weight: 900; color: #f8fafc;">
            ${prod.displayName}
          </h3>
        </div>

        <!-- Cosmetic Visual Stage -->
        <div style="margin: 8px 0; display: flex; align-items: center; justify-content: center; width: 100%;">
          ${visualHtml}
        </div>

        <!-- Gold line draws underneath -->
        <div style="width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #dfbc73, transparent);"></div>

        <span style="font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.06em;">
          ADDED TO YOUR ARMORY
        </span>

        <div class="armory-instant-equip-buttons-grid" style="display: grid; grid-template-columns: minmax(0, 2fr) minmax(120px, 0.7fr); gap: 10px; width: 100%; margin-top: 6px; box-sizing: border-box;">
          <button id="btn-instant-equip-primary" class="civ-btn-continue-hero" style="height: 38px; font-size: 11px; font-weight: 900; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 12px; width: 100%;" type="button">
            ${primaryCtaLabel}
          </button>
          <button id="btn-instant-equip-continue" class="prof-action-btn prof-action-btn--preview" style="height: 38px; font-size: 11px; box-sizing: border-box; white-space: nowrap; padding: 0 8px; width: 100%;" type="button">
            CONTINUE
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    (window as any).__DOMINION_TACTILE_HOOKS__?.onPurchaseSuccess?.(prod.sku);

    overlay.querySelector('#btn-instant-equip-primary')?.addEventListener('click', () => {
      onEquipAction();
      overlay.remove();
      this.render();
    });

    overlay.querySelector('#btn-instant-equip-continue')?.addEventListener('click', () => {
      overlay.remove();
      this.render();
    });
  }

  private getPennantSvg(civ?: string): string {
    const key = (civ || 'turk').toLowerCase();
    const identity = PRESET_NATION_IDENTITIES[key] || PRESET_NATION_IDENTITIES.turk;
    return renderPennantSvg(identity, 48, 80);
  }

  public closePreview(): void {
    if (!this.previewModalEl) return;
    this.previewModalEl.hidden = true;
    this.previewModalEl.style.display = 'none';
    this.bladePreviewInstance = null;
  }

  private async handleBuy(sku: string): Promise<void> {
    const prod = catalogService.getProduct(sku);
    if (!prod) return;

    if (accountService.isGuest()) {
      const proceed = confirm(
        'SECURE YOUR PURCHASES\n\nCreate or link your account before purchasing so your items are protected on every device.\n\nClick OK to secure your account, or Cancel to continue as guest.'
      );
      if (proceed) {
        playerProfileModal.open();
        return;
      }
    }

    const marksPrice = prod.premiumCurrencyPrice;
    if (marksPrice && walletService.getBalance() >= marksPrice) {
      const useMarks = confirm(
        `ACQUIRE WITH SOVEREIGN MARKS?\n\nItem: ${prod.displayName}\nCost: ${marksPrice} Marks\nYour Balance: ${walletService.getBalance()} Marks\n\nClick OK to spend Marks, or Cancel to use real currency.`
      );
      if (useMarks) {
        const idempKey = `spend_${prod.sku}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const spendRes = walletService.spendMarks(prod.sku, marksPrice, idempKey);
        if (spendRes.success) {
          entitlementService.grantSku(prod.sku);
          this.showInstantEquipModal(prod);
          this.render();
          return;
        }
      }
    }

    const purchaseRes = await commercePipeline.purchaseWithRealCurrency(prod.sku);
    if (purchaseRes.success) {
      entitlementService.grantSku(prod.sku);
      this.showInstantEquipModal(prod);
      this.render();
    } else if (purchaseRes.outcome !== 'USER_CANCELLED') {
      alert(`Payment error: ${purchaseRes.error || 'Transaction incomplete'}`);
    }
  }

  private showAcquiredBanner(prod: CatalogProduct): void {
    this.showInstantEquipModal(prod);
  }
}

export const sovereignArmory = new SovereignArmory();
if (typeof window !== 'undefined') {
  (window as any).__SOVEREIGN_ARMORY__ = sovereignArmory;
}
