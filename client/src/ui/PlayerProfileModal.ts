/**
 * DOMINION OF SOL — PLAYER PROFILE & COLLECTION SUITE
 * 
 * Rules:
 * 1. Lightweight persistent player profile.
 * 2. Prominently offers "SECURE ACCOUNT" for guests.
 * 3. Integrates Collection tab (Blades, Reactions, Frames, Titles, Pennants).
 * 4. Allows real-time equipping and loadout management.
 */

import { accountService, PlayerAccount, AuthProviderType } from '../meta/AccountService';
import { entitlementService, CosmeticLoadout, UNIVERSAL_FREE_REACTIONS } from '../meta/EntitlementService';
import { getBladeSkin, getAllBladeSkins } from '../meta/BladeSkinRegistry';
import { getReaction, getAllReactions } from '../meta/ReactionRegistry';
import { walletService } from '../meta/WalletService';

export class PlayerProfileModal {
  private modalEl: HTMLElement | null = null;
  private isOpen = false;
  private activeTab: 'PROFILE' | 'COLLECTION' = 'PROFILE';
  private collectionCategory: 'BLADES' | 'REACTIONS' | 'FRAMES' | 'TITLES' = 'BLADES';

  constructor() {
    this.createUI();
    this.bindEvents();
    accountService.getAccount(); // Ensure initialized
    (window as any).__PLAYER_PROFILE_MODAL__ = this;
  }

  private createUI(): void {
    const existing = document.getElementById('dominion-player-profile-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dominion-player-profile-modal';
    modal.className = 'civ-modal-backdrop';
    modal.hidden = true;
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="civ-modal-frame civ-modal-frame--profile" role="dialog" aria-modal="true" style="
        max-width: 860px;
        width: 92vw;
        max-height: 88vh;
        background: #070e17;
        border: 1.5px solid #dfbc73;
        box-shadow: 0 16px 48px rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        border-radius: 4px;
        overflow: hidden;
      ">
        <!-- Modal Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(223, 188, 115, 0.2); background: #0a1421;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid #dfbc73; display: flex; align-items: center; justify-content: center; background: #03070c;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h2 id="prof-modal-nation-name" style="margin: 0; font-family: 'Cinzel', serif; font-size: 18px; font-weight: 900; color: #f8fafc; letter-spacing: 0.05em;">DOMINION COMMANDER</h2>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                <span id="prof-modal-player-tag" style="font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #dfbc73;">#7F42A</span>
                <span id="prof-modal-status-badge" style="font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 3px; letter-spacing: 0.08em; background: rgba(223,188,115,0.15); color: #dfbc73; border: 1px solid rgba(223,188,115,0.3);">GUEST DOMINION</span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <!-- Tabs -->
            <div style="display: flex; background: #040912; border: 1px solid rgba(223,188,115,0.2); border-radius: 4px; padding: 2px;">
              <button id="btn-prof-tab-profile" class="prof-tab-btn active" type="button">PROFILE</button>
              <button id="btn-prof-tab-collection" class="prof-tab-btn" type="button">COLLECTION</button>
            </div>
            <button id="btn-close-prof-modal" class="civ-modal-close" type="button" aria-label="Close profile">✕</button>
          </div>
        </div>

        <!-- Modal Body -->
        <div id="prof-modal-body" style="padding: 24px; overflow-y: auto; flex: 1;">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
  }

  private bindEvents(): void {
    document.getElementById('btn-close-prof-modal')?.addEventListener('click', () => this.close());
    this.modalEl?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'dominion-player-profile-modal') {
        this.close();
      }
    });

    document.getElementById('btn-prof-tab-profile')?.addEventListener('click', () => {
      this.activeTab = 'PROFILE';
      this.renderContent();
    });

    document.getElementById('btn-prof-tab-collection')?.addEventListener('click', () => {
      this.activeTab = 'COLLECTION';
      this.renderContent();
    });

    // Reactive subscription
    document.addEventListener('dominion:account-changed', () => {
      if (this.isOpen) this.renderContent();
    });
    document.addEventListener('dominion:entitlements-changed', () => {
      if (this.isOpen) this.renderContent();
    });
    document.addEventListener('dominion:wallet-changed', () => {
      if (this.isOpen) this.renderContent();
    });
  }

  public open(tab: 'PROFILE' | 'COLLECTION' = 'PROFILE', collectionCat: 'BLADES' | 'REACTIONS' | 'FRAMES' | 'TITLES' = 'BLADES'): void {
    if (!this.modalEl) this.createUI();
    if (!this.modalEl) return;
    this.activeTab = tab;
    this.collectionCategory = collectionCat;
    this.isOpen = true;
    this.modalEl.hidden = false;
    this.modalEl.style.display = 'flex';
    (window as any).__DOMINION_MODAL_OPEN__ = true;
    this.renderContent();
  }

  public close(): void {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.hidden = true;
    this.modalEl.style.display = 'none';
    (window as any).__DOMINION_MODAL_OPEN__ = false;
  }

  private renderContent(): void {
    const account = accountService.getAccount();
    const loadout = entitlementService.getLoadout();
    const marks = walletService.getBalance();

    // Update Header
    const nameEl = document.getElementById('prof-modal-nation-name');
    const tagEl = document.getElementById('prof-modal-player-tag');
    const badgeEl = document.getElementById('prof-modal-status-badge');

    if (nameEl) nameEl.textContent = account.displayName;
    if (tagEl) tagEl.textContent = account.playerTag;
    if (badgeEl) {
      if (account.accountType === 'guest') {
        badgeEl.textContent = 'GUEST DOMINION';
        badgeEl.style.color = '#dfbc73';
        badgeEl.style.borderColor = 'rgba(223,188,115,0.4)';
        badgeEl.style.background = 'rgba(223,188,115,0.1)';
      } else {
        badgeEl.textContent = 'SECURED DOMINION';
        badgeEl.style.color = '#38bdf8';
        badgeEl.style.borderColor = 'rgba(56,189,248,0.4)';
        badgeEl.style.background = 'rgba(56,189,248,0.1)';
      }
    }

    // Toggle tab active styles
    const tabProf = document.getElementById('btn-prof-tab-profile');
    const tabColl = document.getElementById('btn-prof-tab-collection');
    tabProf?.classList.toggle('active', this.activeTab === 'PROFILE');
    tabColl?.classList.toggle('active', this.activeTab === 'COLLECTION');

    const body = document.getElementById('prof-modal-body');
    if (!body) return;

    if (this.activeTab === 'PROFILE') {
      this.renderProfileTab(body, account, loadout, marks);
    } else {
      this.renderCollectionTab(body, account, loadout);
    }
  }

  private renderProfileTab(body: HTMLElement, account: PlayerAccount, loadout: CosmeticLoadout, marks: number): void {
    const isGuest = account.accountType === 'guest';
    const blade = getBladeSkin(loadout.activeBladeSkin);

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
        <!-- Left: Sovereign Status & Account Security -->
        <div>
          <!-- Guest Security Banner -->
          ${isGuest ? `
            <div style="background: linear-gradient(135deg, rgba(223, 188, 115, 0.12) 0%, rgba(7, 14, 23, 0.85) 100%); border: 1.5px solid #dfbc73; border-radius: 4px; padding: 18px; margin-bottom: 20px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                <div>
                  <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73; display: block; margin-bottom: 4px;">ACCOUNT LINKING — DEVELOPMENT</span>
                  <h3 style="margin: 0; font-size: 16px; font-family: 'Cinzel', serif; font-weight: 700; color: #ffffff;">SECURE YOUR DOMINION</h3>
                  <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
                    Production OAuth providers (Google, Apple, Email) are pending deployment. Guest session and local persistence are active. Multi-device linking can be tested via SIMULATE LINK (DEV).
                  </p>
                </div>
              </div>

              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px;">
                <button id="btn-sec-google" class="prof-auth-btn" type="button" title="Google OAuth2 (Development)">GOOGLE <span style="font-size: 9px; opacity: 0.6;">(UNAVAILABLE)</span></button>
                <button id="btn-sec-apple" class="prof-auth-btn" type="button" title="Sign in with Apple (Development)">APPLE <span style="font-size: 9px; opacity: 0.6;">(UNAVAILABLE)</span></button>
                <button id="btn-sec-email" class="prof-auth-btn" type="button" title="Email Verification (Development)">EMAIL <span style="font-size: 9px; opacity: 0.6;">(UNAVAILABLE)</span></button>
                <button id="btn-sec-dev" class="prof-auth-btn prof-auth-btn--dev" type="button">SIMULATE LINK (DEV)</button>
              </div>
            </div>
          ` : `
            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #38bdf8;">SECURED ACCOUNT</span>
                <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-top: 2px;">
                  Linked via ${account.linkedIdentities.map(li => li.provider.toUpperCase()).join(', ')}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                  ${account.linkedIdentities[0]?.identifier || ''}
                </div>
              </div>
              <span style="font-size: 20px; color: #38bdf8;">✓</span>
            </div>
          `}

          <!-- Edit Nation Name Box -->
          <div style="background: #0a131f; border: 1px solid rgba(223, 188, 115, 0.2); border-radius: 4px; padding: 16px; margin-bottom: 20px;">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73; display: block; margin-bottom: 8px;">NATION IDENTITY</span>
            <div style="display: flex; gap: 8px;">
              <input id="prof-input-nation-name" type="text" value="${account.displayName}" maxlength="24" style="
                flex: 1;
                background: #040810;
                border: 1px solid rgba(223, 188, 115, 0.4);
                color: #f8fafc;
                padding: 8px 12px;
                border-radius: 3px;
                font-family: inherit;
                font-size: 13px;
              " />
              <button id="btn-prof-save-name" class="civ-btn-continue-hero" style="height: 38px; padding: 0 16px; font-size: 11px;" type="button">
                SAVE
              </button>
            </div>
            <div id="prof-name-feedback" style="font-size: 11px; margin-top: 4px; color: #ef4444;" hidden></div>
          </div>

          <!-- Current Loadout Summary -->
          <div style="background: #0a131f; border: 1px solid rgba(223, 188, 115, 0.2); border-radius: 4px; padding: 16px;">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73; display: block; margin-bottom: 12px;">ACTIVE LOADOUT</span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: #060b12; padding: 10px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.06);">
                <span style="font-size: 9px; color: #64748b; display: block;">COMMAND BLADE</span>
                <strong style="font-size: 12px; color: #dfbc73;">${blade.name}</strong>
              </div>
              <div style="background: #060b12; padding: 10px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.06);">
                <span style="font-size: 9px; color: #64748b; display: block;">PROFILE TITLE</span>
                <strong style="font-size: 12px; color: #f8fafc;">${loadout.activeTitle.replace('title_', '').toUpperCase()}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Player Statistics & Armory Reserves -->
        <div>
          <!-- Sovereign Marks Treasury -->
          <div style="background: radial-gradient(circle at 100% 0%, rgba(223, 188, 115, 0.15) 0%, #0a131f 70%); border: 1px solid #dfbc73; border-radius: 4px; padding: 18px; margin-bottom: 20px;">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73; display: block;">TREASURY RESERVES</span>
            <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 4px;">
              <span style="font-family: 'Cinzel', serif; font-size: 28px; font-weight: 900; color: #fef08a;">${marks.toLocaleString()}</span>
              <span style="font-size: 12px; font-weight: 700; color: #dfbc73;">SOVEREIGN MARKS</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Account cosmetic currency. Zero gameplay advantage.</div>
          </div>

          <!-- Career Statistics -->
          <div style="background: #0a131f; border: 1px solid rgba(223, 188, 115, 0.2); border-radius: 4px; padding: 18px;">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #dfbc73; display: block; margin-bottom: 12px;">STRATEGIC RECORD</span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: #060b12; padding: 10px; border-radius: 3px;">
                <span style="font-size: 9px; color: #64748b; display: block;">MATCHES PLAYED</span>
                <strong style="font-size: 18px; color: #f8fafc;">${account.stats.matchesPlayed}</strong>
              </div>
              <div style="background: #060b12; padding: 10px; border-radius: 3px;">
                <span style="font-size: 9px; color: #64748b; display: block;">MATCH VICTORIES</span>
                <strong style="font-size: 18px; color: #38bdf8;">${account.stats.matchesWon}</strong>
              </div>
              <div style="background: #060b12; padding: 10px; border-radius: 3px;">
                <span style="font-size: 9px; color: #64748b; display: block;">CONTEST REALMS</span>
                <strong style="font-size: 18px; color: #dfbc73;">${account.stats.contestParticipations}</strong>
              </div>
              <div style="background: #060b12; padding: 10px; border-radius: 3px;">
                <span style="font-size: 9px; color: #64748b; display: block;">TOTAL AREA HELD</span>
                <strong style="font-size: 14px; color: #f8fafc;">${Math.round(account.stats.totalControlledAreaKm2).toLocaleString()} km²</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire Save Name button
    const saveBtn = document.getElementById('btn-prof-save-name');
    const inputName = document.getElementById('prof-input-nation-name') as HTMLInputElement | null;
    const feedback = document.getElementById('prof-name-feedback');

    saveBtn?.addEventListener('click', () => {
      if (!inputName) return;
      const res = accountService.setNationDisplayName(inputName.value);
      if (!res.success) {
        if (feedback) {
          feedback.textContent = res.reason || 'Invalid name';
          feedback.hidden = false;
        }
      } else {
        if (feedback) feedback.hidden = true;
        this.renderContent();
      }
    });

    // Wire Auth linking buttons
    const wireLink = (btnId: string, provider: AuthProviderType, defaultId: string) => {
      document.getElementById(btnId)?.addEventListener('click', async () => {
        if (provider !== 'dev') {
          alert(`Authentication Provider Unavailable: Real ${provider.toUpperCase()} credentials are not configured in this environment. Use SIMULATE LINK (DEV) for multi-device testing.`);
          return;
        }

        const id = prompt(`Enter DEV account identifier:`, defaultId);
        if (!id) return;
        const res = await accountService.linkIdentity(provider, id);
        if (res.conflict && res.existingAccountId) {
          this.showConflictDialog(res.existingAccountId, async () => {
            if (res.existingAccountId) await accountService.loadExistingAccount(res.existingAccountId);
            this.renderContent();
          });
          return;
        }
        this.renderContent();
      });
    };

    wireLink('btn-sec-google', 'google', 'user@gmail.com');
    wireLink('btn-sec-apple', 'apple', 'commander@icloud.com');
    wireLink('btn-sec-email', 'email', 'player@dominion.com');
    wireLink('btn-sec-dev', 'dev', 'dev_commander_01');
  }

  public showConflictDialog(existingAccountId: string, onConfirm: () => void): void {
    const existingModal = document.getElementById('dom-auth-conflict-dialog');
    if (existingModal) existingModal.remove();

    const dialog = document.createElement('div');
    dialog.id = 'dom-auth-conflict-dialog';
    dialog.className = 'civ-modal-backdrop';
    dialog.style.cssText = 'display: flex; align-items: center; justify-content: center; z-index: 300; background: rgba(2, 6, 12, 0.92); position: fixed; inset: 0;';

    dialog.innerHTML = `
      <div class="civ-modal-frame" style="
        max-width: 480px;
        width: 90vw;
        background: #070e17;
        border: 1.5px solid #ef4444;
        box-shadow: 0 20px 60px rgba(0,0,0,0.95);
        padding: 24px;
        border-radius: 4px;
        text-align: center;
      ">
        <h3 style="font-family: 'Cinzel', serif; font-size: 16px; font-weight: 800; color: #ef4444; margin: 0 0 10px 0; letter-spacing: 0.08em;">
          THIS SIGN-IN BELONGS TO AN EXISTING DOMINION
        </h3>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.45; margin: 0 0 20px 0;">
          This credential is already associated with sovereign account <strong style="color: #f8fafc; font-family: monospace;">${existingAccountId}</strong>.<br/><br/>
          Would you like to load that existing account, or cancel and keep your current session?
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="btn-conflict-load" class="civ-btn-continue-hero" style="height: 38px; padding: 0 16px; font-size: 11px;" type="button">
            LOAD EXISTING ACCOUNT
          </button>
          <button id="btn-conflict-cancel" class="prof-cat-btn" style="height: 38px; padding: 0 16px; font-size: 11px;" type="button">
            CANCEL
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('#btn-conflict-load')?.addEventListener('click', () => {
      dialog.remove();
      onConfirm();
    });

    dialog.querySelector('#btn-conflict-cancel')?.addEventListener('click', () => {
      dialog.remove();
    });
  }

  private renderCollectionTab(body: HTMLElement, account: PlayerAccount, loadout: CosmeticLoadout): void {
    body.innerHTML = `
      <div>
        <!-- Category Nav -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid rgba(223,188,115,0.2); padding-bottom: 12px;">
          ${['BLADES', 'REACTIONS', 'FRAMES', 'TITLES'].map(cat => `
            <button class="prof-cat-btn ${this.collectionCategory === cat ? 'active' : ''}" data-cat="${cat}" type="button">
              ${cat}
            </button>
          `).join('')}
        </div>

        <div id="prof-collection-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
          <!-- Category items rendered dynamically below -->
        </div>
      </div>
    `;

    body.querySelectorAll('.prof-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.collectionCategory = (btn as HTMLElement).dataset.cat as any;
        this.renderCollectionTab(body, account, loadout);
      });
    });

    const grid = document.getElementById('prof-collection-grid');
    if (!grid) return;

    if (this.collectionCategory === 'BLADES') {
      const blades = getAllBladeSkins();
      grid.innerHTML = blades.map(b => {
        const owned = entitlementService.ownsBladeSkin(b.id);
        const equipped = loadout.activeBladeSkin === b.id;
        return `
          <div style="background: #0a131f; border: 1.5px solid ${equipped ? '#dfbc73' : owned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}; border-radius: 4px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: 9px; font-weight: 800; color: #dfbc73;">${b.civilization.toUpperCase()}</span>
                <span style="font-size: 8px; color: #64748b; text-transform: uppercase;">${b.rarity}</span>
              </div>
              <h4 style="margin: 4px 0 6px 0; font-size: 14px; font-weight: 700; color: #f8fafc;">${b.name}</h4>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.3;">${b.description}</p>
            </div>
            <div style="margin-top: 12px;">
              ${equipped ? `
                <button class="prof-action-btn prof-action-btn--equipped" disabled type="button">EQUIPPED</button>
              ` : owned ? `
                <button class="prof-action-btn prof-action-btn--equip" data-blade-id="${b.id}" type="button">EQUIP</button>
              ` : `
                <span style="font-size: 10px; color: #64748b;">UNOWNED (AVAILABLE IN ARMORY)</span>
              `}
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-blade-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.bladeId;
          if (id) {
            entitlementService.equipBladeSkin(id);
            this.renderContent();
          }
        });
      });
    } else if (this.collectionCategory === 'REACTIONS') {
      const reactions = getAllReactions().filter(r => r.category === 'social_expression');
      const wheelIds = loadout.reactionWheel;

      // 1. Top Section: 8-Slot Reaction Wheel Manager
      const wheelSlotsHtml = `
        <div style="grid-column: 1 / -1; background: #040810; border: 1.5px solid rgba(223, 188, 115, 0.35); border-radius: 6px; padding: 16px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73;">MATCH LOADOUT CONFIGURATION</span>
              <h3 style="margin: 2px 0 0 0; font-family: 'Cinzel', serif; font-size: 15px; font-weight: 900; color: #f8fafc;">EQUIPPED REACTION WHEEL (8 SLOTS)</h3>
            </div>
            <span style="font-size: 9px; color: #94a3b8;">Click slot or reaction below to reassign</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px;">
            ${wheelIds.map((rxId, idx) => {
              const rx = getReaction(rxId);
              return `
                <div class="sov-wheel-slot-builder" style="background: #08121f; border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 4px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; min-height: 94px; justify-content: space-between;">
                  <span style="font-size: 8px; font-weight: 800; color: #38bdf8;">SLOT ${idx + 1}</span>
                  <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">${rx?.svgIcon || ''}</div>
                  <span style="font-size: 8px; font-weight: 700; color: #dfbc73; max-width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rx?.name || 'Empty'}</span>
                  <button class="btn-slot-unequip" data-rx-id="${rxId}" style="position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; border-radius: 50%; background: rgba(239, 68, 68, 0.3); border: 1px solid #ef4444; color: #fca5a5; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Unequip reaction">✕</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // 2. Collection Reactions Grid
      const cardsHtml = reactions.map(r => {
        const owned = entitlementService.ownsReaction(r.id);
        const slotIndex = wheelIds.indexOf(r.id);
        const inWheel = slotIndex >= 0;

        return `
          <div class="prof-rx-card" style="background: #0a131f; border: 1.5px solid ${inWheel ? '#38bdf8' : owned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}; border-radius: 4px; padding: 14px; display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: space-between;">
            <div>
              <div class="prof-rx-icon-btn" data-rx-preview="${r.id}" data-cue="${r.animationCue}" style="width: 54px; height: 54px; margin: 0 auto 8px auto; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);" title="Click to test micro-animation">${r.svgIcon}</div>
              <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #f8fafc;">${r.name}</h4>
              <span style="font-size: 9px; color: #dfbc73; margin-top: 2px; display: block;">${r.civilization} · ${r.isFree ? 'FREE' : 'PREMIUM'}</span>
            </div>

            <div style="width: 100%; margin-top: 12px;">
              ${inWheel ? `
                <div style="display: flex; gap: 6px;">
                  <button class="prof-action-btn prof-action-btn--preview btn-preview-rx" data-rx-preview="${r.id}" data-cue="${r.animationCue}" style="flex: 1; height: 32px; font-size: 10px;" type="button">TEST</button>
                  <button class="prof-action-btn btn-unequip-rx" data-rx-id="${r.id}" style="flex: 1.2; height: 32px; font-size: 9.5px; background: rgba(56, 189, 248, 0.15); border: 1.5px solid #38bdf8; color: #38bdf8;" type="button" title="Click to unequip">SLOT ${slotIndex + 1} ✕</button>
                </div>
              ` : owned ? `
                <div style="display: flex; gap: 6px;">
                  <button class="prof-action-btn prof-action-btn--preview btn-preview-rx" data-rx-preview="${r.id}" data-cue="${r.animationCue}" style="flex: 1; height: 32px; font-size: 10px;" type="button">TEST</button>
                  <button class="prof-action-btn prof-action-btn--equip btn-equip-rx" data-rx-id="${r.id}" style="flex: 1; height: 32px; font-size: 10px;" type="button">EQUIP</button>
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 9px; font-weight: 800; color: #ef4444; letter-spacing: 0.06em;">LOCKED</span>
                  <button class="prof-action-btn btn-view-pack" data-sku="${r.entitlementSku || 'dominion.reactions.turk.court01'}" style="width: 100%; height: 28px; font-size: 9px; background: rgba(223,188,115,0.15); border: 1px solid #dfbc73; color: #dfbc73;" type="button">
                    VIEW PACK →
                  </button>
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');

      grid.innerHTML = wheelSlotsHtml + cardsHtml;

      // Wire preview animation clicks
      grid.querySelectorAll('[data-rx-preview]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const cue = (el as HTMLElement).dataset.cue || 'rx-playing-laugh';
          const card = el.closest('.prof-rx-card');
          const icon = card?.querySelector('.prof-rx-icon-btn') as HTMLElement | null;
          if (icon) {
            icon.classList.remove(cue);
            void icon.offsetWidth;
            icon.classList.add(cue);
            setTimeout(() => { icon.classList.remove(cue); }, 1100);
          }
        });
      });

      // Wire equip clicks
      grid.querySelectorAll('.btn-equip-rx').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.rxId;
          if (id) {
            // Find first free slot or swap into slot 0
            const freeSlot = wheelIds.findIndex(s => UNIVERSAL_FREE_REACTIONS.includes(s as any));
            const targetSlot = freeSlot >= 0 ? freeSlot : 0;
            entitlementService.equipReactionSlot(targetSlot, id);
            this.renderContent();
          }
        });
      });

      // Wire unequip clicks
      grid.querySelectorAll('.btn-unequip-rx, .btn-slot-unequip').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.rxId;
          if (id) {
            entitlementService.unequipReaction(id);
            this.renderContent();
          }
        });
      });

      // Wire view pack clicks to open Armory
      grid.querySelectorAll('.btn-view-pack').forEach(btn => {
        btn.addEventListener('click', () => {
          const sku = (btn as HTMLElement).dataset.sku;
          this.close();
          const armory = (window as any).__SOVEREIGN_ARMORY__;
          if (armory) {
            armory.open('REACTIONS');
            if (sku) armory.openPreview(sku);
          }
        });
      });
    } else {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; color: #64748b;">
          Frames and Titles can be unlocked via the Sovereign Pass or Sovereign Armory.
        </div>
      `;
    }
  }
}

export const playerProfileModal = new PlayerProfileModal();
