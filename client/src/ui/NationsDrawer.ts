/**
 * DOMINION OF SOL — AUTHORITATIVE NATIONS ATLAS DRAWER
 * 
 * Rules:
 * 1. Data authoritative from gameState.factions (101 factions on connected server).
 * 2. Real-time sorting by population, territory, and name.
 * 3. Search filter by faction name or civilization.
 * 4. Clicking a nation pans camera directly to its sovereign capital and selects the territory.
 * 5. Zero faking: Only living sovereign factions from snapshot are displayed.
 */

import { gameState } from '../game/GameState';

export class NationsDrawer {
  private drawerEl: HTMLElement | null = null;
  private isOpen = false;
  private searchQuery = '';
  private sortBy: 'population' | 'territory' | 'name' = 'population';

  constructor() {
    this.createUI();
    this.bindEvents();
    (window as any).__DOMINION_NATIONS_DRAWER__ = this;
  }

  private createUI(): void {
    const existing = document.getElementById('hud-nations-drawer');
    if (existing) existing.remove();

    const drawer = document.createElement('aside');
    drawer.id = 'hud-nations-drawer';
    drawer.className = 'hud-nations-drawer';
    drawer.hidden = true;
    drawer.setAttribute('aria-label', 'Sovereign Nations Atlas');

    drawer.innerHTML = `
      <div class="hud-nations-drawer-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: #dfbc73;">🏛</span>
          <div>
            <span class="command-eyebrow" style="font-size: 8.5px; color: #dfbc73;">SOVEREIGN ATLAS</span>
            <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: #f8fafc; letter-spacing: 0.04em;">NATIONS ROSTER</h3>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span id="nations-drawer-count-badge" style="font-size: 10px; font-weight: 800; color: #dfbc73; background: rgba(223,188,115,0.15); padding: 2px 8px; border-radius: 3px; border: 1px solid rgba(223,188,115,0.3); font-family: ui-monospace, monospace;">0 NATIONS</span>
          <button id="btn-close-nations-drawer" class="civ-modal-close" style="width: 24px; height: 24px; font-size: 11px;" type="button" aria-label="Close nations drawer">✕</button>
        </div>
      </div>

      <!-- Search & Sort Controls -->
      <div style="padding: 8px 12px; background: #060e18; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 6px;">
        <input id="nations-search-input" type="text" placeholder="Filter by nation or civilization..." style="
          width: 100%;
          box-sizing: border-box;
          padding: 6px 10px;
          background: #030810;
          border: 1px solid rgba(223,188,115,0.25);
          border-radius: 3px;
          color: #f8fafc;
          font-size: 11px;
          outline: none;
        " />
        <div style="display: flex; gap: 4px;">
          <button class="nations-sort-btn active" data-sort="population" style="flex: 1; padding: 4px; font-size: 9.5px; font-weight: 700; background: rgba(223,188,115,0.12); color: #dfbc73; border: 1px solid rgba(223,188,115,0.3); border-radius: 3px; cursor: pointer;">POPULATION</button>
          <button class="nations-sort-btn" data-sort="territory" style="flex: 1; padding: 4px; font-size: 9.5px; font-weight: 700; background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; cursor: pointer;">TERRITORY</button>
          <button class="nations-sort-btn" data-sort="name" style="flex: 1; padding: 4px; font-size: 9.5px; font-weight: 700; background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; cursor: pointer;">NAME</button>
        </div>
      </div>

      <!-- Factions List -->
      <div id="hud-nations-drawer-list" class="hud-nations-drawer-body">
        <!-- Rendered dynamically -->
      </div>
    `;

    document.body.appendChild(drawer);
    this.drawerEl = drawer;
  }

  private bindEvents(): void {
    // Close button
    document.getElementById('btn-close-nations-drawer')?.addEventListener('click', () => this.close());

    // Search input
    const searchInput = document.getElementById('nations-search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = (searchInput.value || '').trim().toLowerCase();
      this.renderList();
    });

    // Sort buttons
    const sortButtons = this.drawerEl?.querySelectorAll('.nations-sort-btn');
    sortButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const sortMode = target.dataset.sort as 'population' | 'territory' | 'name';
        if (sortMode) {
          this.sortBy = sortMode;
          sortButtons.forEach(b => {
            b.classList.remove('active');
            (b as HTMLElement).style.background = 'transparent';
            (b as HTMLElement).style.color = '#94a3b8';
            (b as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
          });
          target.classList.add('active');
          target.style.background = 'rgba(223,188,115,0.12)';
          target.style.color = '#dfbc73';
          target.style.borderColor = 'rgba(223,188,115,0.3)';
          this.renderList();
        }
      });
    });

    // Subscribe to state updates
    gameState.subscribe(() => {
      if (this.isOpen) {
        this.renderList();
      }
    });

    // Direct and delegated click listener for HUD Nations pill
    const pill = document.getElementById('hud-nations-pill') || document.querySelector('.world-population');
    pill?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('#hud-nations-pill') || target?.closest('.world-population')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    });
  }

  public toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  public open(): void {
    if (!this.drawerEl) this.createUI();
    if (!this.drawerEl) return;
    this.isOpen = true;
    this.drawerEl.hidden = false;
    this.renderList();
  }

  public close(): void {
    if (!this.drawerEl) return;
    this.isOpen = false;
    this.drawerEl.hidden = true;
  }

  private renderList(): void {
    const listEl = document.getElementById('hud-nations-drawer-list');
    const badgeEl = document.getElementById('nations-drawer-count-badge');
    if (!listEl) return;

    const allFactions = [...gameState.factions.values()].filter(f => !f.isEliminated);
    if (badgeEl) {
      badgeEl.textContent = `${allFactions.length} NATIONS`;
    }

    // Filter
    let filtered = allFactions;
    if (this.searchQuery) {
      filtered = filtered.filter(f =>
        f.displayName.toLowerCase().includes(this.searchQuery) ||
        (f.nationPresetId || '').toLowerCase().includes(this.searchQuery) ||
        (f.homelandRegion || '').toLowerCase().includes(this.searchQuery)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (this.sortBy === 'population') {
        return b.population - a.population;
      } else if (this.sortBy === 'territory') {
        return b.controlledAreaKm2 - a.controlledAreaKm2;
      } else {
        return a.displayName.localeCompare(b.displayName);
      }
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #64748b; font-size: 11px;">
          No sovereign nations match your search.
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(f => {
      const isPlayer = f.factionId === gameState.yourFactionId;
      const popStr = Math.floor(f.population).toLocaleString();
      const areaStr = this.formatArea(f.controlledAreaKm2);
      const colorHex = f.factionColor || '#3b82f6';
      const civTag = f.nationPresetId ? f.nationPresetId.toUpperCase() : (f.homelandRegion || 'SOV');

      return `
        <div class="nation-drawer-item ${isPlayer ? 'is-player' : ''}" data-faction-id="${f.factionId}">
          <div style="
            width: 12px;
            height: 12px;
            transform: rotate(45deg);
            background: ${colorHex};
            border: 1px solid #ffffff;
            box-shadow: 0 0 6px ${colorHex};
            flex-shrink: 0;
          "></div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 8.5px; font-weight: 800; color: #dfbc73; background: rgba(223,188,115,0.12); padding: 1px 4px; border-radius: 2px;">${civTag}</span>
              <span style="font-size: 11.5px; font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${f.displayName} ${isPlayer ? '<span style="color: #38bdf8; font-size: 9px;">(YOU)</span>' : ''}
              </span>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 2px; font-size: 9.5px; color: #94a3b8; font-family: ui-monospace, monospace;">
              <span>POP: <strong style="color: #e2edf6;">${popStr}</strong></span>
              <span>AREA: <strong style="color: #e2edf6;">${areaStr}</strong></span>
            </div>
          </div>
          <button class="nation-drawer-nav-btn" data-faction-id="${f.factionId}" title="Focus camera on ${f.displayName}" style="
            padding: 4px 8px;
            background: rgba(223,188,115,0.1);
            border: 1px solid rgba(223,188,115,0.25);
            border-radius: 3px;
            color: #dfbc73;
            font-size: 9.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 120ms ease;
          ">
            LOCATE
          </button>
        </div>
      `;
    }).join('');

    // Attach click listeners to row and locate button
    listEl.querySelectorAll('.nation-drawer-item').forEach(item => {
      item.addEventListener('click', () => {
        const factionId = Number((item as HTMLElement).dataset.factionId);
        this.locateFaction(factionId);
      });
    });
  }

  private locateFaction(factionId: number): void {
    const faction = gameState.factions.get(factionId);
    if (!faction) return;

    // If faction has a capital, focus on capital cell
    if (faction.capitalCell && faction.capitalCell >= 0) {
      gameState.selectCell(faction.capitalCell);
      (window as any).__DOMINION_RENDERER__?.focusOnCell(faction.capitalCell);
    }
  }

  private formatArea(areaKm2: number): string {
    if (!Number.isFinite(areaKm2) || areaKm2 <= 0) return '0 km²';
    if (areaKm2 >= 1_000_000) return `${(areaKm2 / 1_000_000).toFixed(1)}M km²`;
    if (areaKm2 >= 1_000) return `${Math.round(areaKm2 / 1_000).toLocaleString()}K km²`;
    return `${Math.round(areaKm2).toLocaleString()} km²`;
  }
}

export const nationsDrawer = new NationsDrawer();
