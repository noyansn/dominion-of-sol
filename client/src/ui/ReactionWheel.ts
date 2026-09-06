/**
 * DOMINION OF SOL — RADIAL REACTION WHEEL & TACTICAL PINGS
 * 
 * Strict separation:
 * 1. SOCIAL EXPRESSIONS (8 slots from player's equipped loadout)
 * 2. COMMAND PINGS (4 tactical communication pings: Attack Here, Defend Here, Danger, Look Here - 100% Free)
 * 
 * Features:
 * - Hold E (>250ms) to radial quick-cast or tap E to toggle open.
 * - Map-anchored spawn with authoritative cooldown (3.5s).
 * - z-index: 3200 (renders above all HUD & modal backdrops).
 */

import { entitlementService, UNIVERSAL_FREE_REACTIONS } from '../meta/EntitlementService';
import { getReaction, SovereignReaction, COMMAND_PING_IDS } from '../meta/ReactionRegistry';
import { reactionMapRenderer } from './ReactionMapRenderer';
import { accountService } from '../meta/AccountService';
import { gameState } from '../game/GameState';
import { gameClient } from '../game/GameClient';
import { telemetry } from '../meta/Telemetry';
import { uiStateManager, AppSurface } from './UIStateManager';

const COOLDOWN_MS = 3500;

export class ReactionWheel {
  private overlay: HTMLElement | null = null;
  private isOpen = false;
  private currentMode: 'EXPRESSIONS' | 'PINGS' = 'EXPRESSIONS';
  private selectedSlotIndex = -1;
  private lastSentTime = 0;
  private pointerX = 0;
  private pointerY = 0;
  private wheelCenterX = 0;
  private wheelCenterY = 0;
  private keyPressStartTime = 0;
  private isHoldingKey = false;

  constructor() {
    this.createUI();
    this.bindEvents();
    (window as any).__DOMINION_REACTION_WHEEL__ = this;
  }

  private createUI(): void {
    const existing = document.getElementById('dominion-reaction-wheel-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dominion-reaction-wheel-overlay';
    overlay.className = 'sov-reaction-wheel-overlay';
    overlay.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 3200;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(2, 6, 12, 0.72);
      backdrop-filter: blur(6px);
      pointer-events: auto;
      user-select: none;
    `;

    overlay.innerHTML = `
      <div id="sov-wheel-disc" class="sov-wheel-disc" style="
        position: relative;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, #091522 0%, #03060a 100%);
        border: 2px solid #dfbc73;
        box-shadow: 0 16px 48px rgba(0,0,0,0.95), 0 0 36px rgba(223, 188, 115, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Close Button -->
        <button id="sov-wheel-close-btn" type="button" aria-label="Close reaction wheel" style="
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(223,188,115,0.4);
          color: #dfbc73;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 120ms ease;
        ">✕</button>

        <!-- Mode Toggle Pill at Top -->
        <div style="
          position: absolute;
          top: -38px;
          display: flex;
          gap: 4px;
          background: #040912;
          border: 1px solid rgba(223,188,115,0.4);
          border-radius: 20px;
          padding: 3px 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.8);
          z-index: 10;
        ">
          <button id="btn-wheel-mode-expr" type="button" style="
            padding: 4px 12px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
            border-radius: 14px;
            border: none;
            background: rgba(223,188,115,0.2);
            color: #dfbc73;
            cursor: pointer;
            transition: all 120ms ease;
          ">EXPRESSIONS</button>
          <button id="btn-wheel-mode-pings" type="button" style="
            padding: 4px 12px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
            border-radius: 14px;
            border: none;
            background: transparent;
            color: #94a3b8;
            cursor: pointer;
            transition: all 120ms ease;
          ">TACTICAL PINGS</button>
        </div>

        <div id="sov-wheel-slots-container" style="position: absolute; width: 100%; height: 100%;"></div>
        
        <!-- Center Hub -->
        <div id="sov-wheel-center-hub" style="
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: #0b1624;
          border: 1.5px solid #dfbc73;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 2;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.85);
          cursor: pointer;
        ">
          <span id="sov-wheel-center-category" style="font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73;">SOVEREIGN</span>
          <span id="sov-wheel-center-name" style="font-size: 9.5px; font-weight: 700; color: #f8fafc; margin-top: 2px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">SELECT</span>
          <span style="font-size: 8px; color: #64748b; margin-top: 2px;">CLICK OR [E]</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private bindEvents(): void {
    // Keyboard 'E' support (Tap to toggle open, hold >250ms to radial cast)
    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        if (uiStateManager.getAppSurface() !== AppSurface.MATCH) return;
        if (!this.isOpen) {
          this.keyPressStartTime = Date.now();
          this.isHoldingKey = true;
          this.openWheel();
        }
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.closeWheel();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'e' || e.key === 'E') {
        if (this.isOpen && this.isHoldingKey) {
          const holdDuration = Date.now() - this.keyPressStartTime;
          if (holdDuration > 250 && this.selectedSlotIndex >= 0) {
            this.closeAndSend();
          }
          this.isHoldingKey = false;
        }
      }
    });

    // Close button
    document.getElementById('sov-wheel-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWheel();
    });

    // Backdrop click
    this.overlay?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'dominion-reaction-wheel-overlay') {
        this.closeWheel();
      }
    });

    // Mode Toggle Buttons
    document.getElementById('btn-wheel-mode-expr')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setMode('EXPRESSIONS');
    });
    document.getElementById('btn-wheel-mode-pings')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setMode('PINGS');
    });

    // Pointer move for radial hover tracking
    window.addEventListener('pointermove', (e) => {
      if (!this.isOpen) return;
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      this.updateHoverSlice();
    });

    // Direct and delegated click listener for HUD Emoji button (IN MATCH ONLY)
    const rxBtn = document.getElementById('btn-hud-reaction') || document.querySelector('.tactical-btn-reaction');
    rxBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('#btn-hud-reaction') || target?.closest('.tactical-btn-reaction')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    });
  }

  public setMode(mode: 'EXPRESSIONS' | 'PINGS'): void {
    this.currentMode = mode;
    const btnExpr = document.getElementById('btn-wheel-mode-expr');
    const btnPings = document.getElementById('btn-wheel-mode-pings');
    const catEl = document.getElementById('sov-wheel-center-category');

    if (btnExpr && btnPings) {
      if (mode === 'EXPRESSIONS') {
        btnExpr.style.background = 'rgba(223,188,115,0.2)';
        btnExpr.style.color = '#dfbc73';
        btnPings.style.background = 'transparent';
        btnPings.style.color = '#94a3b8';
        if (catEl) catEl.textContent = 'EXPRESSION';
      } else {
        btnPings.style.background = 'rgba(56, 189, 248, 0.2)';
        btnPings.style.color = '#38bdf8';
        btnExpr.style.background = 'transparent';
        btnExpr.style.color = '#94a3b8';
        if (catEl) catEl.textContent = 'TACTICAL PING';
      }
    }

    this.selectedSlotIndex = -1;
    this.renderSlots();
    this.updateCenterLabel('SELECT');
  }

  public toggle(): void {
    if (this.isOpen) this.closeWheel();
    else this.openWheel();
  }

  public openWheel(): void {
    if (uiStateManager.getAppSurface() !== AppSurface.MATCH) return;
    if (!this.overlay) this.createUI();
    if (!this.overlay) return;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.selectedSlotIndex = -1;

    const disc = document.getElementById('sov-wheel-disc');
    if (disc) {
      const rect = disc.getBoundingClientRect();
      this.wheelCenterX = rect.left + rect.width / 2;
      this.wheelCenterY = rect.top + rect.height / 2;
    } else {
      this.wheelCenterX = window.innerWidth / 2;
      this.wheelCenterY = window.innerHeight / 2;
    }

    this.renderSlots();
    this.updateCenterLabel('SELECT');
  }

  public closeWheel(): void {
    if (!this.overlay) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.selectedSlotIndex = -1;
    this.isHoldingKey = false;
  }

  public close(): void {
    this.closeWheel();
  }

  private getExpressionSlots(): SovereignReaction[] {
    const loadout = entitlementService.getLoadout();
    const slots: SovereignReaction[] = [];
    const seenIds = new Set<string>();

    // 1. Equipped social reactions from loadout
    for (const rId of loadout.reactionWheel) {
      const rx = getReaction(rId);
      if (rx && rx.category === 'social_expression' && !seenIds.has(rx.id)) {
        slots.push(rx);
        seenIds.add(rx.id);
      }
    }

    // 2. Deterministic fallback to universal free social expressions
    for (const freeId of UNIVERSAL_FREE_REACTIONS) {
      if (slots.length >= 8) break;
      const rx = getReaction(freeId);
      if (rx && rx.category === 'social_expression' && !seenIds.has(rx.id)) {
        slots.push(rx);
        seenIds.add(rx.id);
      }
    }

    return slots.slice(0, 8);
  }

  private closeAndSend(): void {
    const slotIdx = this.selectedSlotIndex;
    this.closeWheel();

    if (slotIdx >= 0) {
      if (this.currentMode === 'EXPRESSIONS') {
        const slots = this.getExpressionSlots();
        const reaction = slots[slotIdx];
        if (reaction && reaction.category === 'social_expression') {
          this.dispatchReaction(reaction.id);
        }
      } else {
        const pingId = COMMAND_PING_IDS[slotIdx];
        if (pingId) {
          this.dispatchReaction(pingId);
        }
      }
    }
  }

  private renderSlots(): void {
    const container = document.getElementById('sov-wheel-slots-container');
    if (!container) return;
    container.innerHTML = '';

    const radius = 105;
    const centerX = 160;
    const centerY = 160;

    if (this.currentMode === 'EXPRESSIONS') {
      const slots = this.getExpressionSlots();
      for (let i = 0; i < 8; i++) {
        const reaction = slots[i];
        const angle = (i * 45 - 90) * (Math.PI / 180);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const slotEl = this.createSlotElement(i, x, y, reaction);
        container.appendChild(slotEl);
      }
    } else {
      // 4 Tactical Command Pings: Top, Right, Bottom, Left (100% Free, ZERO social faces)
      for (let i = 0; i < 4; i++) {
        const pingId = COMMAND_PING_IDS[i];
        const reaction = getReaction(pingId);
        const angle = (i * 90 - 90) * (Math.PI / 180);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const slotEl = this.createSlotElement(i, x, y, reaction);
        container.appendChild(slotEl);
      }
    }
  }

  private createSlotElement(
    index: number,
    x: number,
    y: number,
    reaction?: SovereignReaction
  ): HTMLElement {
    const slotEl = document.createElement('div');
    slotEl.className = 'sov-wheel-slot-node';
    slotEl.dataset.slotIdx = String(index);
    const isExpr = this.currentMode === 'EXPRESSIONS';

    slotEl.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      transform: translate(-50%, -50%);
      width: 64px;
      height: 64px;
      border-radius: ${isExpr ? '0' : '50%'};
      background: ${isExpr ? 'transparent' : '#091422'};
      border: ${isExpr ? 'none' : `1.5px solid ${reaction ? reaction.accentColor : '#475569'}`};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${isExpr ? 'none' : '0 4px 14px rgba(0,0,0,0.6)'};
      transition: transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.16s ease;
      cursor: pointer;
    `;

    if (reaction) {
      slotEl.innerHTML = reaction.svgIcon;
      const svg = slotEl.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', isExpr ? '58' : '42');
        svg.setAttribute('height', isExpr ? '58' : '42');
        svg.style.pointerEvents = 'none';
        svg.style.transition = 'transform 0.16s ease';
      }
    }

    slotEl.addEventListener('pointerenter', () => {
      this.selectedSlotIndex = index;
      this.highlightSlot(index);
      this.updateCenterLabel(
        reaction ? reaction.name : 'EMPTY',
        reaction?.civilization || (isExpr ? 'EXPRESSION' : 'PING')
      );
    });

    slotEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectedSlotIndex = index;
      this.closeAndSend();
    });

    return slotEl;
  }

  private updateHoverSlice(): void {
    const dx = this.pointerX - this.wheelCenterX;
    const dy = this.pointerY - this.wheelCenterY;
    const dist = Math.hypot(dx, dy);

    if (dist < 32) {
      this.selectedSlotIndex = -1;
      this.highlightSlot(-1);
      this.updateCenterLabel('SELECT', this.currentMode === 'EXPRESSIONS' ? 'EXPRESSION' : 'PING');
      return;
    }

    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (this.currentMode === 'EXPRESSIONS') {
      const sliceIndex = Math.floor(((deg + 22.5) % 360) / 45);
      this.selectedSlotIndex = sliceIndex;
      this.highlightSlot(sliceIndex);

      const slots = this.getExpressionSlots();
      const rx = slots[sliceIndex];
      this.updateCenterLabel(rx ? rx.name : 'EMPTY', rx ? rx.civilization : 'EXPRESSION');
    } else {
      // 4 pings: slice 0 centered at 0 deg (315 to 45), slice 1 at 90 deg, etc.
      const sliceIndex = Math.floor(((deg + 45) % 360) / 90);
      this.selectedSlotIndex = sliceIndex;
      this.highlightSlot(sliceIndex);

      const rx = getReaction(COMMAND_PING_IDS[sliceIndex]);
      this.updateCenterLabel(rx ? rx.name : 'PING', 'TACTICAL PING');
    }
  }

  private highlightSlot(slotIdx: number): void {
    const slots = document.querySelectorAll<HTMLElement>('.sov-wheel-slot-node');
    const isExpr = this.currentMode === 'EXPRESSIONS';
    slots.forEach((node, i) => {
      if (i === slotIdx) {
        node.style.transform = 'translate(-50%, -50%) scale(1.15)';
        if (isExpr) {
          node.style.filter = 'drop-shadow(0 0 14px rgba(223, 188, 115, 0.95)) drop-shadow(0 0 4px #fef08a)';
        } else {
          node.style.borderColor = '#38bdf8';
          node.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.8), 0 4px 14px rgba(0,0,0,0.8)';
        }
      } else {
        node.style.transform = 'translate(-50%, -50%) scale(1.0)';
        if (isExpr) {
          node.style.filter = '';
        } else {
          node.style.borderColor = '';
          node.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
        }
      }
    });
  }

  private updateCenterLabel(text: string, category?: string): void {
    const el = document.getElementById('sov-wheel-center-name');
    if (el) el.textContent = text;
    if (category) {
      const catEl = document.getElementById('sov-wheel-center-category');
      if (catEl) catEl.textContent = category;
    }
  }

  public dispatchReaction(reactionId: string): boolean {
    if (uiStateManager.getAppSurface() !== AppSurface.MATCH) {
      return false;
    }
    const now = Date.now();
    if (now - this.lastSentTime < COOLDOWN_MS) {
      console.log('[REACTION] Cooldown active');
      return false;
    }

    const reaction = getReaction(reactionId);
    if (!reaction) return false;

    this.lastSentTime = now;
    const account = accountService.getAccount();

    // Determine spatial anchor on screen
    let screenX = window.innerWidth / 2;
    let screenY = window.innerHeight / 2 - 40;

    const renderer = (window as any).__DOMINION_RENDERER__;
    if (renderer) {
      const cell = gameState.selectedTargetCell ?? gameState.selectedSourceCell ?? (gameState.playerFaction?.capitalCell ?? null);
      if (cell !== null) {
        const wx = cell % gameState.width;
        const wy = Math.floor(cell / gameState.width);
        const scr = renderer.worldToScreen ? renderer.worldToScreen(wx, wy) : null;
        if (scr) {
          screenX = scr.x;
          screenY = scr.y;
        }
      }
    }

    // Spawn locally on map layer
    reactionMapRenderer.spawnReaction({
      reactionId,
      senderName: account.displayName,
      senderTag: account.playerTag,
      factionId: gameState.playerFactionId,
      screenX,
      screenY,
    });

    // Send over network if connected
    try {
      gameClient.sendReaction(reactionId);
    } catch {
      // Offline fallback
    }

    telemetry.track('reaction_sent', {
      reactionId,
      civilization: reaction.civilization,
      category: reaction.category,
      isFree: reaction.isFree,
    });

    return true;
  }
}

export const reactionWheel = new ReactionWheel();
