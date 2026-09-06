/**
 * DOMINION OF SOL — MAP-NATIVE REACTION PRESENTATION
 * 
 * Rules:
 * 1. Strictly MATCH-scoped presentation:
 *    Renders world-space reactions ONLY when AppSurface === AppSurface.MATCH.
 *    HOME, WAR_ROOM, PROFILE, ARMORY, CIV_INSPECT are 100% isolated.
 * 2. Cleans up all bubbles, labels, and timers on MATCH -> LEAVE -> HOME.
 * 3. Footprint: max 5 bounded concurrent bubbles; vertical offset for overlapping triggers.
 * 4. Lifespan: ~1.6s, clutter-free (large icon + compact player/country label, zero long prose).
 * 5. Respects recipient mute settings.
 */

import { getReaction } from '../meta/ReactionRegistry';
import { uiStateManager, AppSurface } from './UIStateManager';

export interface ReactionMapEvent {
  reactionId: string;
  senderName: string;
  senderTag: string;
  factionId: number;
  screenX: number;
  screenY: number;
  anchorLabel?: string;
}

interface ActiveBubble {
  el: HTMLElement;
  timerId: any;
  x: number;
  y: number;
}

const MAX_CONCURRENT_BUBBLES = 5;
const BUBBLE_LIFETIME_MS = 1600;

class ReactionMapRenderer {
  private container: HTMLElement | null = null;
  private mutedFactions = new Set<number>();
  private mutedPlayers = new Set<string>();
  private muteAll = false;
  private activeBubbles: ActiveBubble[] = [];

  constructor() {
    this.initContainer();
    this.bindLifecycleEvents();
  }

  private initContainer(): void {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('dominion-reactions-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dominion-reactions-layer';
      el.style.position = 'fixed';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '2600'; // Visible over map and HUD
      document.body.appendChild(el);
    }
    this.container = el;
  }

  private bindLifecycleEvents(): void {
    // Strict lifecycle isolation: when leaving MATCH, clear all bubbles immediately
    uiStateManager.subscribeSurface((surface) => {
      if (surface !== AppSurface.MATCH) {
        this.clearAll();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('dominion:match-left', () => this.clearAll());
      window.addEventListener('dominion:leave-match', () => this.clearAll());
    }
  }

  public getActiveBubbleCount(): number {
    return this.activeBubbles.length;
  }

  public clearAll(): void {
    for (const b of this.activeBubbles) {
      clearTimeout(b.timerId);
      b.el.remove();
    }
    this.activeBubbles = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  public setMuteAll(mute: boolean): void {
    this.muteAll = mute;
  }

  public isMuteAll(): boolean {
    return this.muteAll;
  }

  public mutePlayer(playerTagOrName: string): void {
    this.mutedPlayers.add(playerTagOrName);
  }

  public unmutePlayer(playerTagOrName: string): void {
    this.mutedPlayers.delete(playerTagOrName);
  }

  public isMuted(factionId?: number, playerTag?: string, playerName?: string): boolean {
    if (this.muteAll) return true;
    if (factionId !== undefined && this.mutedFactions.has(factionId)) return true;
    if (playerTag && this.mutedPlayers.has(playerTag)) return true;
    if (playerName && this.mutedPlayers.has(playerName)) return true;
    return false;
  }

  public toggleMuteFaction(factionId: number): boolean {
    if (this.mutedFactions.has(factionId)) {
      this.mutedFactions.delete(factionId);
      return false;
    } else {
      this.mutedFactions.add(factionId);
      return true;
    }
  }

  public isFactionMuted(factionId: number): boolean {
    return this.muteAll || this.mutedFactions.has(factionId);
  }

  public spawnReaction(event: ReactionMapEvent): void {
    // 1. STRICT SURFACE GATE: Reject if not in active MATCH
    if (uiStateManager.getAppSurface() !== AppSurface.MATCH) {
      return;
    }

    if (this.isMuted(event.factionId, event.senderTag, event.senderName)) {
      return;
    }
    if (!this.container) this.initContainer();
    if (!this.container) return;

    const reaction = getReaction(event.reactionId);
    if (!reaction) return;

    // 2. Bounded Concurrency
    if (this.activeBubbles.length >= MAX_CONCURRENT_BUBBLES) {
      const oldest = this.activeBubbles.shift();
      if (oldest) {
        clearTimeout(oldest.timerId);
        oldest.el.remove();
      }
    }

    // 3. Position Clamping & Anti-Overlap Vertical Offset
    const baseX = Math.max(64, Math.min(window.innerWidth - 64, event.screenX));
    let finalY = Math.max(64, Math.min(window.innerHeight - 80, event.screenY));

    for (const b of this.activeBubbles) {
      const dist = Math.hypot(b.x - baseX, b.y - finalY);
      if (dist < 60) {
        finalY -= 46; // Stagger upwards so bubbles don't occlude each other
      }
    }
    finalY = Math.max(50, Math.min(window.innerHeight - 80, finalY));

    const bubble = document.createElement('div');
    bubble.className = 'sov-map-reaction-bubble';
    bubble.style.cssText = `
      position: absolute;
      left: ${baseX}px;
      top: ${finalY}px;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      user-select: none;
      z-index: 2650;
      animation: sov-reaction-float 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    bubble.innerHTML = `
      <div class="sov-reaction-pulse" style="
        position: absolute;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: radial-gradient(circle, ${reaction.accentColor}44 0%, transparent 70%);
        animation: sov-reaction-pulse-glow 0.6s ease-out forwards;
      "></div>
      <div class="sov-reaction-icon-frame" style="
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #070e17;
        box-shadow: 0 4px 20px rgba(0,0,0,0.85), 0 0 12px ${reaction.accentColor}66;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid ${reaction.accentColor};
      ">
        ${reaction.svgIcon}
      </div>
      <div class="sov-reaction-nametag" style="
        margin-top: 3px;
        background: rgba(7, 14, 23, 0.88);
        border: 1px solid rgba(223, 188, 115, 0.4);
        border-radius: 3px;
        padding: 1px 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #f8fafc;
        white-space: nowrap;
        backdrop-filter: blur(4px);
      ">
        ${event.senderName}${event.senderTag ? ` <span style="color: #94a3b8; font-size: 8.5px;">${event.senderTag}</span>` : ''}
      </div>
    `;

    this.container.appendChild(bubble);

    const timerId = setTimeout(() => {
      bubble.remove();
      this.activeBubbles = this.activeBubbles.filter(b => b.el !== bubble);
    }, BUBBLE_LIFETIME_MS);

    this.activeBubbles.push({
      el: bubble,
      timerId,
      x: baseX,
      y: finalY,
    });
  }
}

export const reactionMapRenderer = new ReactionMapRenderer();
if (typeof window !== 'undefined') {
  (window as any).__REACTION_MAP_RENDERER__ = reactionMapRenderer;
}
