import { gameState } from '../game/GameState';

/**
 * CountryDossier — Atlas identity plaque.
 *
 * DESIGN CONTRACT:
 * - The dossier is an EXPLICIT INSPECTION STATE, not a passive reflection of
 *   selectionContext. It opens only when the player deliberately clicks on a
 *   country (single-click pick) and the caller calls inspectFaction().
 * - Server ticks (CELL_DELTAS, etc.) update the CONTENT of an already-open
 *   dossier, but never open or close it.
 * - clearInspection() closes it.
 */
export class CountryDossier {
  private element: HTMLElement | null = null;
  private tailEl: HTMLElement | null = null;
  private flagEl: HTMLElement | null = null;
  private nameEl: HTMLElement | null = null;
  private subtitleEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private capitalEl: HTMLElement | null = null;
  private popEl: HTMLElement | null = null;
  private growthEl: HTMLElement | null = null;
  private growthInlineEl: HTMLElement | null = null;
  private terrEl: HTMLElement | null = null;
  private diploEl: HTMLElement | null = null;
  private shieldBgEl: SVGPathElement | null = null;
  private shieldBorderEl: SVGPathElement | null = null;
  private shieldEmblemEl: SVGGElement | null = null;

  /** The explicitly inspected faction. Only set by inspectFaction(). */
  private inspectedFactionId: number | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.element = document.getElementById('country-dossier');
    if (!this.element) return;

    this.tailEl         = document.getElementById('dossier-tail');
    this.flagEl         = document.getElementById('dossier-flag');
    this.nameEl         = document.getElementById('dossier-name');
    this.subtitleEl     = document.getElementById('dossier-subtitle');
    this.statusEl       = document.getElementById('dossier-status');
    this.capitalEl      = document.getElementById('dossier-capital');
    this.popEl          = document.getElementById('dossier-population');
    this.growthEl       = document.getElementById('dossier-growth');
    this.growthInlineEl = document.getElementById('dossier-growth-inline');
    this.terrEl         = document.getElementById('dossier-territory');
    this.diploEl        = document.getElementById('dossier-diplomacy');
    this.shieldBgEl     = document.getElementById('shield-bg') as SVGPathElement | null;
    this.shieldBorderEl = document.getElementById('shield-border') as SVGPathElement | null;
    this.shieldEmblemEl = document.getElementById('shield-emblem') as SVGGElement | null;

    document.getElementById('dossier-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearInspection();
      gameState.clearSelection();
    });

    document.getElementById('btn-dossier-inspect-civ')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.inspectedFactionId !== null) {
        const faction = gameState.factions.get(this.inspectedFactionId);
        document.dispatchEvent(new CustomEvent('dominion:inspect-civilization', {
          detail: {
            factionId: this.inspectedFactionId,
            displayName: faction?.displayName || '',
            flagId: faction?.flagId || '',
          },
        }));
      }
    });

    // Server ticks only REFRESH content — they never open/close.
    gameState.subscribe(() => this._refreshContent());

    // ESC clears inspection
    window.addEventListener('keydown', (e) => {
      if ((window as any).__DOMINION_MODAL_OPEN__) return;
      if (e.key === 'Escape') this.clearInspection();
    });

    // Outside click clears inspection UI only (never destroy map selectionContext on pointerdown)
    document.addEventListener('pointerdown', (e) => {
      if ((window as any).__DOMINION_MODAL_OPEN__) return;
      if (!this.element || this.element.hidden || this.inspectedFactionId === null) return;
      const target = e.target as HTMLElement | null;
      if (this.element.contains(target) || target?.closest('#attack-panel, #player-hud, #match-hud, .command-module')) {
        return;
      }
      this.clearInspection();
      gameState.spotlightFactionId = null;
    });
  }

  // ==================================================================
  // PUBLIC API
  // ==================================================================

  /**
   * Open the dossier for a specific faction, anchored near a screen point.
   * Called by DominionRenderer on single-click pick.
   */
  public inspectFaction(factionId: number, screenX: number, screenY: number): void {
    if ((window as any).__DOMINION_UI_STATE__ && (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE') {
      return;
    }
    if (!this.element) return;
    this.inspectedFactionId = factionId;
    this._refreshContent();
    this.updatePosition(screenX, screenY);
  }

  /**
   * Close the dossier. Called on neutral/water click, ESC, or clear selection.
   */
  public clearInspection(): void {
    if (!this.element) return;
    this.inspectedFactionId = null;
    this.element.classList.remove('visible');
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (this.element && !this.element.classList.contains('visible')) {
        this.element.hidden = true;
      }
    }, 180);
  }

  /**
   * Move the dossier anchor. Anchors near the selected country with a speech-bubble tail pointing directly to it.
   */
  public updatePosition(screenX: number, screenY: number): void {
    if (!this.element || this.element.hidden) return;

    const width = 252;
    const height = 152;
    const padding = 20;

    // Prefer placing to upper-right of target, matching Photo 1 exactly
    let placeRight = (screenX + width + 36 <= window.innerWidth);
    let left = placeRight ? screenX + 26 : screenX - width - 26;
    let top = screenY - height + 36;

    // Boundary constraints
    if (top < 70) top = screenY + 24;
    if (top + height > window.innerHeight - 80) top = window.innerHeight - 80 - height;
    left = Math.max(padding, Math.min(window.innerWidth - width - padding, left));

    this.element.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;

    // Position speech-bubble pointer tail
    if (this.tailEl) {
      if (placeRight) {
        // Pointer on bottom-left pointing toward screenX, screenY
        this.tailEl.style.left = '-6px';
        this.tailEl.style.right = 'auto';
        const targetOffset = Math.max(16, Math.min(height - 20, screenY - top));
        this.tailEl.style.top = `${Math.round(targetOffset)}px`;
        this.tailEl.style.bottom = 'auto';
      } else {
        // Pointer on bottom-right pointing toward screenX, screenY
        this.tailEl.style.right = '-6px';
        this.tailEl.style.left = 'auto';
        const targetOffset = Math.max(16, Math.min(height - 20, screenY - top));
        this.tailEl.style.top = `${Math.round(targetOffset)}px`;
        this.tailEl.style.bottom = 'auto';
      }
    }
  }

  // ==================================================================
  // INTERNAL
  // ==================================================================

  private _refreshContent(): void {
    if (!this.element || this.inspectedFactionId === null) return;

    const factionId = this.inspectedFactionId;
    const faction = gameState.factions.get(factionId);
    if (!faction) return; // faction left game; leave card as-is

    // Clear any pending hide
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }

    const isPlayer = factionId === gameState.yourFactionId;
    const front = [...gameState.fronts.values()].find(f =>
      f.isCombatActive && (f.factionA === factionId || f.factionB === factionId));

    // -- Name --
    if (this.nameEl) this.nameEl.textContent = faction.displayName.toUpperCase();

    // -- Subtitle (ACTIVE NATION in gold for player, or INDEPENDENT POWER) --
    if (this.subtitleEl) {
      if (isPlayer) {
        this.subtitleEl.textContent = 'ACTIVE NATION';
        this.subtitleEl.style.color = '#dfbc73';
      } else if (front) {
        this.subtitleEl.textContent = 'WAR ENGAGED';
        this.subtitleEl.style.color = '#f87171';
      } else {
        this.subtitleEl.textContent = 'INDEPENDENT POWER';
        this.subtitleEl.style.color = '#dfbc73';
      }
    }

    // -- Status label --
    if (this.statusEl) {
      this.statusEl.textContent = isPlayer ? 'SOVEREIGN POWER' : front ? 'WAR ENGAGED' : 'INDEPENDENT POWER';
      this.statusEl.style.color = '#dfbc73';
    }

    // -- Heraldic Shield Crest --
    if (this.shieldBgEl && this.shieldBorderEl && this.shieldEmblemEl) {
      if (isPlayer) {
        this.shieldBgEl.setAttribute('fill', '#1d4ed8');
        this.shieldBorderEl.setAttribute('stroke', '#dfbc73');
      } else if (faction.factionColor) {
        this.shieldBgEl.setAttribute('fill', faction.factionColor);
        this.shieldBorderEl.setAttribute('stroke', '#dfbc73');
      }
    }

    // -- Flag badge fallback for tests/scripts --
    if (this.flagEl) {
      const flagText = (faction.flagId || 'eny').replace('flag_', '').slice(0, 3).toUpperCase();
      this.flagEl.textContent = flagText;
    }

    // -- Capital --
    if (this.capitalEl) {
      this.capitalEl.textContent = faction.homelandRegion || `Sector ${faction.capitalCell % 1024}`;
    }

    // -- Population --
    const popVal = this._fmt(faction.population);
    if (this.popEl) this.popEl.textContent = popVal;

    // -- Growth --
    const g = faction.populationGrowthPerSecond ?? 0;
    const gText = (g >= 0 ? '+' : '') + g.toFixed(1) + '/s';
    if (this.growthEl) this.growthEl.textContent = gText;
    if (this.growthInlineEl) this.growthInlineEl.textContent = gText;

    // -- Territory --
    if (this.terrEl) {
      const km2 = Math.round(faction.controlledAreaKm2 || (faction.territoryCount * 1.28));
      this.terrEl.textContent = km2 >= 1000 ? `${(km2 / 1000).toFixed(1)}M km²` : `${km2}K km²`;
    }

    // -- Diplomacy --
    if (this.diploEl) {
      const alliance = gameState.alliances.find(a => a.members?.includes(factionId));
      this.diploEl.textContent = isPlayer ? 'Player Core' : alliance ? 'Allied' : 'Independent';
    }

    // -- Show --
    this.element.hidden = false;
    requestAnimationFrame(() => {
      this.element?.classList.add('visible');
    });
  }

  private _fmt(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(3);
    return Math.max(0, Math.round(num)).toString();
  }

  // Legacy shim — DominionRenderer may call update() on some paths
  public update(): void { this._refreshContent(); }
}
