/**
 * DOMINION OF SOL — DEV COMMERCE LAB (DEVELOPER ARMORY LABORATORY)
 * 
 * Accessible via shortcut: Ctrl + Shift + M (or Dev Menu button).
 * HARD-GATED: Only available in development builds.
 * 
 * 8 Dedicated Inspection Tabs:
 * 1. ACCOUNT
 * 2. STORE
 * 3. ENTITLEMENTS
 * 4. REACTIONS GALLERY
 * 5. COMMAND BLADE LAB
 * 6. PASS
 * 7. REGION
 * 8. PURCHASE EVENTS
 */

import { accountService } from '../meta/AccountService';
import { catalogService, PriceRegion, REGIONAL_CURRENCIES } from '../meta/CatalogService';
import { entitlementService } from '../meta/EntitlementService';
import { walletService } from '../meta/WalletService';
import { seasonPassService } from '../meta/SeasonPassService';
import { commercePipeline } from '../meta/CommerceProvider';
import { getAllBladeSkins, getBladeSkin } from '../meta/BladeSkinRegistry';
import { getAllReactions, getReaction } from '../meta/ReactionRegistry';
import { reactionMapRenderer } from './ReactionMapRenderer';
import { ArmoryBladePreview } from './ArmoryBladePreview';

export class DevCommerceLab {
  private modalEl: HTMLElement | null = null;
  private isOpen = false;
  private activeTab: 'ACCOUNT' | 'STORE' | 'ENTITLEMENTS' | 'REACTIONS' | 'BLADE' | 'PASS' | 'REGION' | 'LEDGER' = 'ACCOUNT';
  private reactionsFilter = 'ALL';
  private selectedBladeId = 'blade_turk_imperial';
  private bladePreviewInstance: ArmoryBladePreview | null = null;

  constructor() {
    // Only construct in dev mode
    if ((import.meta as any).env?.PROD) return;

    this.createUI();
    this.bindEvents();
    (window as any).__DEV_COMMERCE_LAB__ = this;
  }

  private createUI(): void {
    const existing = document.getElementById('dev-commerce-lab-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dev-commerce-lab-modal';
    modal.className = 'civ-modal-backdrop';
    modal.hidden = true;
    modal.style.display = 'none';
    modal.style.zIndex = '200'; // Very top layer

    modal.innerHTML = `
      <div class="civ-modal-frame" role="dialog" aria-modal="true" style="
        max-width: 1100px;
        width: 96vw;
        max-height: 92vh;
        background: #050b14;
        border: 2px solid #ef4444;
        box-shadow: 0 24px 64px rgba(0,0,0,0.98);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Lab Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #0c0204; border-bottom: 1px solid #dc2626;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="background: #dc2626; color: #fff; font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.1em;">DEV LAB</span>
            <h3 style="margin: 0; font-family: ui-monospace, monospace; font-size: 16px; font-weight: 800; color: #f8fafc;">DOMINION COMMERCE & EXPRESSION LABORATORY</h3>
          </div>
          <button id="btn-close-dev-lab" class="civ-modal-close" style="color: #ef4444;" type="button">✕</button>
        </div>

        <!-- 8 Tabs Strip -->
        <div style="display: flex; background: #080305; border-bottom: 1px solid rgba(239,68,68,0.25); padding: 6px 16px; gap: 4px; overflow-x: auto;">
          ${[
            ['ACCOUNT', '1. ACCOUNT'],
            ['STORE', '2. STORE'],
            ['ENTITLEMENTS', '3. ENTITLEMENTS'],
            ['REACTIONS', '4. REACTIONS GALLERY'],
            ['BLADE', '5. COMMAND BLADE'],
            ['PASS', '6. SOVEREIGN PASS'],
            ['REGION', '7. REGION PRICING'],
            ['LEDGER', '8. PURCHASE EVENTS'],
          ].map(([key, label]) => `
            <button class="dev-lab-tab-btn ${key === 'ACCOUNT' ? 'active' : ''}" data-tab="${key}" type="button" style="
              background: transparent;
              border: none;
              padding: 8px 14px;
              color: #94a3b8;
              font-family: ui-monospace, monospace;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              border-radius: 3px;
              white-space: nowrap;
            ">
              ${label}
            </button>
          `).join('')}
        </div>

        <!-- Tab Body -->
        <div id="dev-lab-body" style="padding: 20px; overflow-y: auto; flex: 1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <!-- Content rendered dynamically -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
  }

  private bindEvents(): void {
    // Shortcut Ctrl + Shift + M
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        this.toggle();
      }
    });

    document.getElementById('btn-close-dev-lab')?.addEventListener('click', () => this.close());
    this.modalEl?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'dev-commerce-lab-modal') this.close();
    });

    this.modalEl?.querySelectorAll('.dev-lab-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab as any;
        this.render();
      });
    });
  }

  public toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  public open(): void {
    if ((import.meta as any).env?.PROD) return;
    if (!this.modalEl) this.createUI();
    if (!this.modalEl) return;
    this.isOpen = true;
    this.modalEl.hidden = false;
    this.modalEl.style.display = 'flex';
    this.render();
  }

  public close(): void {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.hidden = true;
    this.modalEl.style.display = 'none';
    this.bladePreviewInstance = null;
  }

  private render(): void {
    this.modalEl?.querySelectorAll('.dev-lab-tab-btn').forEach(btn => {
      const active = (btn as HTMLElement).dataset.tab === this.activeTab;
      btn.classList.toggle('active', active);
      (btn as HTMLElement).style.background = active ? 'rgba(239, 68, 68, 0.2)' : 'transparent';
      (btn as HTMLElement).style.color = active ? '#ffffff' : '#94a3b8';
      (btn as HTMLElement).style.borderBottom = active ? '2px solid #ef4444' : 'none';
    });

    const body = document.getElementById('dev-lab-body');
    if (!body) return;

    switch (this.activeTab) {
      case 'ACCOUNT': this.renderAccountTab(body); break;
      case 'STORE': this.renderStoreTab(body); break;
      case 'ENTITLEMENTS': this.renderEntitlementsTab(body); break;
      case 'REACTIONS': this.renderReactionsTab(body); break;
      case 'BLADE': this.renderBladeTab(body); break;
      case 'PASS': this.renderPassTab(body); break;
      case 'REGION': this.renderRegionTab(body); break;
      case 'LEDGER': this.renderLedgerTab(body); break;
    }
  }

  // 1. ACCOUNT TAB
  private renderAccountTab(body: HTMLElement): void {
    const acc = accountService.getAccount();
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="background: #0c141f; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 18px;">
          <h4 style="margin: 0 0 12px 0; color: #dfbc73; font-family: ui-monospace, monospace;">ACCOUNT SNAPSHOT</h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px; font-family: ui-monospace, monospace;">
            <div><span style="color: #64748b;">ACCOUNT ID:</span> <strong style="color: #f8fafc;">${acc.accountId}</strong></div>
            <div><span style="color: #64748b;">TYPE:</span> <strong style="color: ${acc.accountType === 'guest' ? '#dfbc73' : '#38bdf8'};">${acc.accountType.toUpperCase()}</strong></div>
            <div><span style="color: #64748b;">NATION NAME:</span> <strong style="color: #f8fafc;">${acc.displayName}</strong></div>
            <div><span style="color: #64748b;">PLAYER TAG:</span> <strong style="color: #dfbc73;">${acc.playerTag}</strong></div>
            <div><span style="color: #64748b;">CREATED AT:</span> <strong style="color: #f8fafc;">${new Date(acc.createdAt).toLocaleTimeString()}</strong></div>
            <div><span style="color: #64748b;">FAVORITE CIV:</span> <strong style="color: #f8fafc;">${acc.favoriteCivilization.toUpperCase()}</strong></div>
          </div>
        </div>

        <div style="background: #0c141f; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 18px;">
          <h4 style="margin: 0 0 12px 0; color: #38bdf8; font-family: ui-monospace, monospace;">LINKED IDENTITIES (${acc.linkedIdentities.length})</h4>
          ${acc.linkedIdentities.length === 0 ? `
            <div style="color: #64748b; font-size: 12px;">No linked identities. Running as persistent anonymous guest.</div>
          ` : `
            <ul style="padding-left: 18px; margin: 0; font-size: 12px; color: #f8fafc; font-family: ui-monospace, monospace;">
              ${acc.linkedIdentities.map(li => `<li>[${li.provider.toUpperCase()}] ${li.identifier} (linked ${new Date(li.linkedAt).toLocaleDateString()})</li>`).join('')}
            </ul>
          `}
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <button id="dev-btn-fresh-guest" class="prof-action-btn prof-action-btn--equip" type="button">CREATE FRESH GUEST</button>
          <button id="dev-btn-sim-link" class="prof-action-btn prof-action-btn--preview" type="button">SIMULATE ACCOUNT LINK</button>
          <button id="dev-btn-unlink" class="prof-cat-btn" type="button">UNLINK DEV PROVIDER</button>
          <button id="dev-btn-reset-prof" class="prof-cat-btn" type="button">RESET META PROFILE</button>
        </div>
      </div>
    `;

    document.getElementById('dev-btn-fresh-guest')?.addEventListener('click', () => {
      accountService.devCreateFreshGuest();
      this.render();
    });
    document.getElementById('dev-btn-sim-link')?.addEventListener('click', async () => {
      const email = prompt('Enter test email:', 'test_commander@sol.net');
      if (email) await accountService.linkIdentity('email', email);
      this.render();
    });
    document.getElementById('dev-btn-unlink')?.addEventListener('click', () => {
      accountService.devUnlinkAll();
      this.render();
    });
    document.getElementById('dev-btn-reset-prof')?.addEventListener('click', () => {
      accountService.devResetProfile();
      this.render();
    });
  }

  // 2. STORE TAB
  private renderStoreTab(body: HTMLElement): void {
    const products = catalogService.getProducts();

    body.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4 style="margin: 0; color: #dfbc73; font-family: ui-monospace, monospace;">STORE TESTING & OWNERSHIP MODES</h4>
          <div style="display: flex; gap: 6px;">
            <button class="dev-btn-mode prof-cat-btn" data-mode="NORMAL" type="button">NORMAL</button>
            <button class="dev-btn-mode prof-cat-btn" data-mode="OWNS_NOTHING" type="button">OWNS NOTHING</button>
            <button class="dev-btn-mode prof-cat-btn" data-mode="OWNS_SOME" type="button">OWNS SOME</button>
            <button class="dev-btn-mode prof-cat-btn" data-mode="OWNS_EVERYTHING" type="button">OWNS EVERYTHING</button>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: ui-monospace, monospace; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
              <th style="padding: 6px;">SKU</th>
              <th style="padding: 6px;">NAME</th>
              <th style="padding: 6px;">CATEGORY</th>
              <th style="padding: 6px;">PRICE</th>
              <th style="padding: 6px;">MARKS</th>
              <th style="padding: 6px;">OWNED?</th>
              <th style="padding: 6px;">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const owned = entitlementService.ownsSku(p.sku);
              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1;">
                  <td style="padding: 6px; color: #38bdf8;">${p.sku}</td>
                  <td style="padding: 6px; font-weight: 700;">${p.displayName}</td>
                  <td style="padding: 6px;">${p.category}</td>
                  <td style="padding: 6px;">$${p.basePriceUsd}</td>
                  <td style="padding: 6px;">${p.premiumCurrencyPrice ?? '—'}</td>
                  <td style="padding: 6px; color: ${owned ? '#10b981' : '#ef4444'}; font-weight: 700;">${owned ? 'YES' : 'NO'}</td>
                  <td style="padding: 6px; display: flex; gap: 4px;">
                    ${owned ? `
                      <button class="dev-btn-sku-revoke" data-sku="${p.sku}" style="background: #450a0a; color: #fca5a5; border: 1px solid #dc2626; padding: 2px 6px; border-radius: 2px; cursor: pointer;">REVOKE</button>
                      <button class="dev-btn-sku-refund" data-sku="${p.sku}" style="background: #172554; color: #93c5fd; border: 1px solid #3b82f6; padding: 2px 6px; border-radius: 2px; cursor: pointer;">REFUND</button>
                    ` : `
                      <button class="dev-btn-sku-grant" data-sku="${p.sku}" style="background: #064e3b; color: #6ee7b7; border: 1px solid #059669; padding: 2px 6px; border-radius: 2px; cursor: pointer;">GRANT</button>
                      <button class="dev-btn-sku-sim-buy" data-sku="${p.sku}" style="background: #78350f; color: #fde047; border: 1px solid #d97706; padding: 2px 6px; border-radius: 2px; cursor: pointer;">BUY (MOCK)</button>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('.dev-btn-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as any;
        entitlementService.devApplyOwnershipMode(mode);
        this.render();
      });
    });

    body.querySelectorAll('.dev-btn-sku-grant').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) entitlementService.grantSku(sku);
        this.render();
      });
    });

    body.querySelectorAll('.dev-btn-sku-revoke').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) entitlementService.revokeSku(sku);
        this.render();
      });
    });

    body.querySelectorAll('.dev-btn-sku-refund').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) commercePipeline.refund(sku);
        this.render();
      });
    });

    body.querySelectorAll('.dev-btn-sku-sim-buy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sku = (btn as HTMLElement).dataset.sku;
        if (sku) await commercePipeline.purchaseWithRealCurrency(sku);
        this.render();
      });
    });
  }

  // 3. ENTITLEMENTS TAB
  private renderEntitlementsTab(body: HTMLElement): void {
    const snap = entitlementService.getSnapshot();
    const marks = walletService.getBalance();

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="background: #0c141f; padding: 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 10px; color: #94a3b8; font-family: ui-monospace, monospace;">WALLET BALANCE</span>
            <div style="font-size: 22px; font-weight: 900; color: #fef08a; font-family: ui-monospace, monospace;">${marks.toLocaleString()} SOVEREIGN MARKS</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button id="dev-grant-500-marks" class="prof-cat-btn" type="button">+500 MARKS</button>
            <button id="dev-spend-200-marks" class="prof-cat-btn" type="button">-200 MARKS</button>
            <button id="dev-reset-marks" class="prof-cat-btn" type="button">RESET MARKS</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Owned Blades -->
          <div style="background: #0a1017; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 4px;">
            <h5 style="margin: 0 0 10px 0; color: #dfbc73; font-family: ui-monospace, monospace;">BLADE SKINS (${snap.ownedBladeSkins.length})</h5>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${getAllBladeSkins().map(b => {
                const owned = snap.ownedBladeSkins.includes(b.id);
                const equipped = snap.loadout.activeBladeSkin === b.id;
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 4px 8px; background: #03060a; border-radius: 3px;">
                    <div>
                      <span style="color: ${equipped ? '#fde047' : '#f8fafc'}; font-weight: 700;">${b.name}</span>
                      <small style="color: #64748b; margin-left: 6px;">${b.id}</small>
                    </div>
                    <div style="display: flex; gap: 4px;">
                      ${owned ? `
                        ${equipped ? `<span style="color: #fde047; font-size: 10px;">EQUIPPED</span>` : `
                          <button class="dev-equip-blade" data-id="${b.id}" style="font-size: 9px; padding: 1px 5px; cursor: pointer;">EQUIP</button>
                        `}
                        <button class="dev-revoke-blade" data-id="${b.id}" style="font-size: 9px; padding: 1px 5px; background: #450a0a; color: #fca5a5; cursor: pointer;">REVOKE</button>
                      ` : `
                        <button class="dev-grant-blade" data-id="${b.id}" style="font-size: 9px; padding: 1px 5px; background: #064e3b; color: #6ee7b7; cursor: pointer;">GRANT</button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Owned Reactions -->
          <div style="background: #0a1017; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 4px;">
            <h5 style="margin: 0 0 10px 0; color: #38bdf8; font-family: ui-monospace, monospace;">REACTIONS (${snap.ownedReactions.length} / ${getAllReactions().length})</h5>
            <div style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
              ${getAllReactions().map(r => {
                const owned = snap.ownedReactions.includes(r.id);
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 3px 6px; background: #03060a; border-radius: 2px;">
                    <div>
                      <span style="color: #f8fafc;">${r.name}</span>
                      <span style="color: #64748b; font-size: 9px; margin-left: 4px;">[${r.civilization}]</span>
                    </div>
                    <div style="display: flex; gap: 4px;">
                      ${owned ? `
                        <button class="dev-revoke-rx" data-id="${r.id}" style="font-size: 9px; padding: 1px 5px; background: #450a0a; color: #fca5a5; cursor: pointer;">REVOKE</button>
                      ` : `
                        <button class="dev-grant-rx" data-id="${r.id}" style="font-size: 9px; padding: 1px 5px; background: #064e3b; color: #6ee7b7; cursor: pointer;">GRANT</button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dev-grant-500-marks')?.addEventListener('click', () => {
      walletService.grantMarks(500, 'dev_grant_500', `dev_tx_${Date.now()}`);
      this.render();
    });
    document.getElementById('dev-spend-200-marks')?.addEventListener('click', () => {
      walletService.spendMarks('dev_spend_200', 200, `dev_tx_spend_${Date.now()}`);
      this.render();
    });
    document.getElementById('dev-reset-marks')?.addEventListener('click', () => {
      walletService.devResetWallet();
      this.render();
    });

    body.querySelectorAll('.dev-grant-blade').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) entitlementService.grantEntitlement(id);
        this.render();
      });
    });
    body.querySelectorAll('.dev-revoke-blade').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) entitlementService.revokeEntitlement(id);
        this.render();
      });
    });
    body.querySelectorAll('.dev-equip-blade').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) entitlementService.equipBladeSkin(id);
        this.render();
      });
    });

    body.querySelectorAll('.dev-grant-rx').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) entitlementService.grantEntitlement(id);
        this.render();
      });
    });
    body.querySelectorAll('.dev-revoke-rx').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) entitlementService.revokeEntitlement(id);
        this.render();
      });
    });
  }

  // 4. REACTIONS GALLERY (MANDATORY PART 38)
  private renderReactionsTab(body: HTMLElement): void {
    const reactions = getAllReactions();
    const filter = this.reactionsFilter;

    const filtered = reactions.filter(r => {
      if (filter === 'ALL') return true;
      if (filter === 'FREE') return r.isFree;
      if (filter === 'PREMIUM') return !r.isFree;
      return r.civilization.toLowerCase() === filter.toLowerCase();
    });

    body.innerHTML = `
      <div>
        <div style="display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 6px;">
          ${['ALL', 'FREE', 'PREMIUM', 'TÜRK', 'ROMA', 'PERS', 'MISIR', 'HAN', 'YAMATO', 'NORSE', 'MAYA', 'LAKOTA'].map(f => `
            <button class="dev-rx-filter-btn ${f === filter ? 'active' : ''}" data-filter="${f}" style="
              background: ${f === filter ? '#dc2626' : '#0f172a'};
              color: ${f === filter ? '#ffffff' : '#94a3b8'};
              border: 1px solid rgba(255,255,255,0.1);
              padding: 4px 10px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: 700;
              cursor: pointer;
              white-space: nowrap;
            " type="button">
              ${f}
            </button>
          `).join('')}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px;">
          ${filtered.map(r => {
            const owned = entitlementService.ownsReaction(r.id);
            return `
              <div style="background: #08111c; border: 1.5px solid ${owned ? 'rgba(223, 188, 115, 0.4)' : 'rgba(255,255,255,0.06)'}; border-radius: 4px; padding: 14px; display: flex; flex-direction: column; align-items: center; text-align: center;">
                <div style="width: 60px; height: 60px; margin-bottom: 8px;">${r.svgIcon}</div>
                <h5 style="margin: 0; font-size: 13px; font-weight: 700; color: #f8fafc;">${r.name}</h5>
                <span style="font-size: 9px; color: #dfbc73; margin: 2px 0;">${r.civilization} · ${r.isFree ? 'FREE' : 'PREMIUM'}</span>
                <p style="font-size: 10px; color: #94a3b8; margin: 4px 0 10px 0; line-height: 1.3;">${r.tagline}</p>

                <div style="display: flex; gap: 4px; width: 100%;">
                  <button class="dev-btn-rx-sim-map" data-id="${r.id}" style="flex: 1; background: #0f172a; border: 1px solid #38bdf8; color: #38bdf8; font-size: 9px; padding: 4px 2px; border-radius: 2px; cursor: pointer;">
                    SIMULATE ON MAP
                  </button>
                  <button class="dev-btn-rx-equip-slot" data-id="${r.id}" style="background: #172554; border: 1px solid #3b82f6; color: #93c5fd; font-size: 9px; padding: 4px 6px; border-radius: 2px; cursor: pointer;">
                    EQUIP
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    body.querySelectorAll('.dev-rx-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.reactionsFilter = (btn as HTMLElement).dataset.filter || 'ALL';
        this.render();
      });
    });

    body.querySelectorAll('.dev-btn-rx-sim-map').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          reactionMapRenderer.spawnReaction({
            reactionId: id,
            senderName: 'DEV COMMANDER',
            senderTag: '#DEV01',
            factionId: 1,
            screenX: window.innerWidth / 2,
            screenY: window.innerHeight / 2 - 60,
          });
        }
      });
    });

    body.querySelectorAll('.dev-btn-rx-equip-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          const slot = prompt('Equip to reaction wheel slot (0..7):', '0');
          if (slot !== null) {
            entitlementService.equipReactionSlot(parseInt(slot, 10), id);
          }
        }
      });
    });
  }

  // 5. COMMAND BLADE LAB (MANDATORY PART 39)
  private renderBladeTab(body: HTMLElement): void {
    const allBlades = getAllBladeSkins();
    const current = getBladeSkin(this.selectedBladeId);
    const standard = getBladeSkin('blade_standard');

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 240px 1fr; gap: 20px;">
        <!-- Blade List Sidebar -->
        <div style="background: #08111c; border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 4px; max-height: 520px; overflow-y: auto;">
          <span style="font-size: 10px; font-weight: 800; color: #dfbc73; display: block; margin-bottom: 8px;">SELECT BLADE SKIN</span>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${allBlades.map(b => `
              <button class="dev-blade-select-btn ${b.id === this.selectedBladeId ? 'active' : ''}" data-id="${b.id}" style="
                text-align: left;
                background: ${b.id === this.selectedBladeId ? '#1e293b' : '#03070d'};
                border: 1px solid ${b.id === this.selectedBladeId ? '#dfbc73' : 'rgba(255,255,255,0.05)'};
                padding: 8px 10px;
                border-radius: 3px;
                cursor: pointer;
              ">
                <div style="font-size: 12px; font-weight: 700; color: #f8fafc;">${b.name}</div>
                <div style="font-size: 9px; color: #dfbc73;">${b.civilization} · ${b.rarity.toUpperCase()}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Interactive Preview & Inspection Panel -->
        <div style="background: #08111c; border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 4px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <h3 style="margin: 0; font-family: 'Cinzel', serif; font-size: 20px; color: #fef08a;">${current.name}</h3>
              <span style="font-size: 11px; font-weight: 700; color: #dfbc73;">${current.civilization}</span>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">${current.description}</p>

            <!-- Interactive Mini Blade Stage -->
            <div id="dev-blade-preview-stage" style="background: #03060a; border: 1px solid rgba(223,188,115,0.25); border-radius: 4px; padding: 20px; margin-bottom: 20px;"></div>

            <!-- Material Profile Inspection -->
            <div style="background: #03060a; padding: 12px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 11px; color: #94a3b8; margin-bottom: 20px;">
              <div style="color: #dfbc73; font-weight: 700; margin-bottom: 6px;">MATERIAL PROFILE & GRADIENTS</div>
              <div>Spine: ${current.material.bladeSpineColor} | Fuller: ${current.material.fullerColor}</div>
              <div>Scabbard Body: [${current.material.scabbardGrad.join(', ')}]</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="dev-btn-equip-current-blade" class="civ-btn-continue-hero" style="height: 38px; padding: 0 18px; font-size: 11px;" type="button">EQUIP SKIN</button>
            <button id="dev-btn-grant-current-blade" class="prof-cat-btn" style="height: 38px;" type="button">GRANT ENTITLEMENT</button>
            <button id="dev-btn-revoke-current-blade" class="prof-cat-btn" style="height: 38px;" type="button">REVOKE ENTITLEMENT</button>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('.dev-blade-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedBladeId = (btn as HTMLElement).dataset.id || 'blade_standard';
        this.render();
      });
    });

    const stage = document.getElementById('dev-blade-preview-stage');
    if (stage) {
      this.bladePreviewInstance = new ArmoryBladePreview(stage, current.id, 560, 54);
    }

    document.getElementById('dev-btn-equip-current-blade')?.addEventListener('click', () => {
      entitlementService.grantEntitlement(current.id);
      entitlementService.equipBladeSkin(current.id);
      alert(`Equipped ${current.name}!`);
    });
    document.getElementById('dev-btn-grant-current-blade')?.addEventListener('click', () => {
      entitlementService.grantEntitlement(current.id);
      alert(`Granted ${current.name}`);
    });
    document.getElementById('dev-btn-revoke-current-blade')?.addEventListener('click', () => {
      entitlementService.revokeEntitlement(current.id);
      alert(`Revoked ${current.name}`);
    });
  }

  // 6. SOVEREIGN PASS TAB
  private renderPassTab(body: HTMLElement): void {
    const state = seasonPassService.getState();
    const currentTier = seasonPassService.getCurrentTier();
    const tiers = seasonPassService.getTiers();

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="background: #08111c; padding: 16px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="margin: 0; color: #dfbc73; font-family: 'Cinzel', serif;">SEASON 1: AGE OF SOVEREIGNS</h4>
            <div style="font-size: 12px; color: #f8fafc; font-family: ui-monospace, monospace; margin-top: 4px;">
              CURRENT XP: ${state.currentXp.toLocaleString()} | TIER: ${currentTier} / 20 | STATUS: ${state.isPlus ? 'PASS PLUS' : state.isPremium ? 'PASS PREMIUM' : 'FREE TRACK'}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button id="dev-pass-add-xp" class="prof-cat-btn" type="button">+2,500 XP</button>
            <button id="dev-pass-jump-tier" class="prof-cat-btn" type="button">JUMP TO TIER 10</button>
            <button id="dev-pass-toggle-prem" class="prof-cat-btn" type="button">${state.isPremium ? 'MAKE FREE' : 'GRANT PREMIUM'}</button>
            <button id="dev-pass-reset" class="prof-cat-btn" type="button">RESET PASS</button>
          </div>
        </div>

        <!-- 20 Tiers Track Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: ui-monospace, monospace;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; color: #94a3b8; text-align: left;">
              <th style="padding: 6px;">TIER</th>
              <th style="padding: 6px;">FREE REWARD</th>
              <th style="padding: 6px;">CLAIMED?</th>
              <th style="padding: 6px;">PREMIUM REWARD</th>
              <th style="padding: 6px;">CLAIMED?</th>
              <th style="padding: 6px;">ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${tiers.map(t => {
              const reached = t.tierNumber <= currentTier;
              const freeClaimed = state.claimedFreeTiers.includes(t.tierNumber);
              const premClaimed = state.claimedPremiumTiers.includes(t.tierNumber);
              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: ${reached ? '#f8fafc' : '#64748b'};">
                  <td style="padding: 6px; font-weight: 700; color: ${reached ? '#fde047' : '#64748b'};">TIER ${t.tierNumber}</td>
                  <td style="padding: 6px;">${t.freeReward?.displayName || '—'}</td>
                  <td style="padding: 6px; color: ${freeClaimed ? '#10b981' : '#f59e0b'};">${freeClaimed ? 'CLAIMED' : reached ? 'AVAILABLE' : 'LOCKED'}</td>
                  <td style="padding: 6px; color: ${state.isPremium ? '#38bdf8' : '#64748b'};">${t.premiumReward?.displayName || '—'}</td>
                  <td style="padding: 6px; color: ${premClaimed ? '#10b981' : '#f59e0b'};">${premClaimed ? 'CLAIMED' : reached && state.isPremium ? 'AVAILABLE' : 'LOCKED'}</td>
                  <td style="padding: 6px;">
                    <button class="dev-claim-tier-btn" data-tier="${t.tierNumber}" style="font-size: 9px; padding: 2px 6px; cursor: pointer;">SIMULATE CLAIM</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('dev-pass-add-xp')?.addEventListener('click', () => {
      seasonPassService.addXp(2500);
      this.render();
    });
    document.getElementById('dev-pass-jump-tier')?.addEventListener('click', () => {
      seasonPassService.devJumpTier(10);
      this.render();
    });
    document.getElementById('dev-pass-toggle-prem')?.addEventListener('click', () => {
      seasonPassService.setPremiumOwned(!state.isPremium);
      this.render();
    });
    document.getElementById('dev-pass-reset')?.addEventListener('click', () => {
      seasonPassService.devResetProgress();
      this.render();
    });

    body.querySelectorAll('.dev-claim-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = parseInt((btn as HTMLElement).dataset.tier || '1', 10);
        seasonPassService.claimReward(tier, false);
        if (state.isPremium) seasonPassService.claimReward(tier, true);
        this.render();
      });
    });
  }

  // 7. REGION TAB (MANDATORY PART 41)
  private renderRegionTab(body: HTMLElement): void {
    const currentRegion = catalogService.getRegion();
    const regions: PriceRegion[] = ['US', 'TR', 'EU', 'UK', 'JP'];
    const products = catalogService.getProducts();

    body.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h4 style="margin: 0; color: #dfbc73; font-family: ui-monospace, monospace;">REGIONAL PRICING SIMULATION</h4>
          <div style="display: flex; gap: 8px;">
            ${regions.map(r => `
              <button class="dev-region-switch-btn ${r === currentRegion ? 'active' : ''}" data-region="${r}" style="
                background: ${r === currentRegion ? '#dfbc73' : '#0a1017'};
                color: ${r === currentRegion ? '#050b14' : '#f8fafc'};
                border: 1px solid #dfbc73;
                padding: 6px 14px;
                border-radius: 3px;
                font-family: ui-monospace, monospace;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
              " type="button">
                ${r} (${REGIONAL_CURRENCIES[r].currencySymbol})
              </button>
            `).join('')}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: ui-monospace, monospace; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
              <th style="padding: 6px;">SKU</th>
              <th style="padding: 6px;">NAME</th>
              <th style="padding: 6px;">BASE USD</th>
              <th style="padding: 6px;">DISPLAY LOCALIZED PRICE</th>
              <th style="padding: 6px;">CURRENCY</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1;">
                <td style="padding: 6px; color: #38bdf8;">${p.sku}</td>
                <td style="padding: 6px; font-weight: 700;">${p.displayName}</td>
                <td style="padding: 6px;">$${p.basePriceUsd}</td>
                <td style="padding: 6px; font-size: 13px; font-weight: 800; color: #fef08a;">${catalogService.formatPrice(p)}</td>
                <td style="padding: 6px;">${REGIONAL_CURRENCIES[currentRegion].currencyCode}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('.dev-region-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = (btn as HTMLElement).dataset.region as PriceRegion;
        if (r) {
          catalogService.setRegion(r);
          this.render();
        }
      });
    });
  }

  // 8. PURCHASE EVENTS LEDGER (MANDATORY PART 42)
  private renderLedgerTab(body: HTMLElement): void {
    const txs = walletService.getLedger();

    body.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4 style="margin: 0; color: #dfbc73; font-family: ui-monospace, monospace;">CHRONOLOGICAL PURCHASE & WALLET LEDGER (${txs.length})</h4>
          <span style="font-size: 10px; color: #64748b;">IMMUTABLE TRANSACTION EVENTS</span>
        </div>

        ${txs.length === 0 ? `
          <div style="color: #64748b; font-size: 12px;">No transactions recorded yet. Execute purchases or grants to populate ledger.</div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: ui-monospace, monospace; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
                <th style="padding: 6px;">TIME</th>
                <th style="padding: 6px;">TX ID</th>
                <th style="padding: 6px;">TYPE</th>
                <th style="padding: 6px;">SKU / REF</th>
                <th style="padding: 6px;">AMOUNT</th>
                <th style="padding: 6px;">IDEMPOTENCY KEY</th>
              </tr>
            </thead>
            <tbody>
              ${txs.map(t => {
                const color = t.type === 'ENTITLEMENT_GRANTED' || t.type === 'PAYMENT_SUCCESS'
                  ? '#10b981'
                  : t.type === 'WALLET_SPENT'
                  ? '#f59e0b'
                  : t.type === 'FAILED'
                  ? '#ef4444'
                  : '#38bdf8';
                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1;">
                    <td style="padding: 6px; color: #64748b;">${new Date(t.timestamp).toLocaleTimeString()}</td>
                    <td style="padding: 6px; color: #94a3b8;">${t.transactionId}</td>
                    <td style="padding: 6px; font-weight: 700; color: ${color};">${t.type}</td>
                    <td style="padding: 6px; color: #f8fafc;">${t.sku}</td>
                    <td style="padding: 6px; font-weight: 700; color: ${t.amount >= 0 ? '#10b981' : '#f59e0b'};">
                      ${t.amount !== 0 ? (t.amount > 0 ? `+${t.amount}` : String(t.amount)) : '—'}
                    </td>
                    <td style="padding: 6px; color: #64748b;">${t.idempotencyKey}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  }
}

export const devCommerceLab = new DevCommerceLab();
