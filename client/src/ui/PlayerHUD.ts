import { gameState } from '../game/GameState';

declare global {
  interface Window {
    __DOMINION_PLAYER_HUD__?: PlayerHUD;
    __PLAYER_HUD_INSTANCE_COUNT__?: number;
  }
}

export class PlayerHUD {
  private dominionNameEl = document.getElementById('player-faction-name');
  private populationEl = document.getElementById('player-population');
  private populationBarEl = document.getElementById('player-population-bar');
  private growthEl = document.getElementById('player-growth');
  private territoryCountEl = document.getElementById('player-territory-count');
  private factionCountEl = document.getElementById('hud-faction-count');
  private connectionDotEl = document.getElementById('hud-connection-dot');

  constructor() {
    window.__PLAYER_HUD_INSTANCE_COUNT__ = (window.__PLAYER_HUD_INSTANCE_COUNT__ || 0) + 1;
    window.__DOMINION_PLAYER_HUD__ = this;
    gameState.subscribe(() => this.update());
    this.update();
  }

  public update(): void {
    const playerFaction = gameState.factions.get(gameState.yourFactionId);
    const playerHud = document.getElementById('player-hud');

    if ((window as any).__DOMINION_UI_STATE__ && (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE') {
      if (playerHud) playerHud.style.display = 'none';
      return;
    }

    if (playerFaction && this.dominionNameEl && this.populationEl && this.growthEl && this.territoryCountEl) {
      this.dominionNameEl.textContent = playerFaction.displayName;
      if (playerFaction.isEliminated) {
        this.populationEl.textContent = 'DEFEATED';
        this.growthEl.textContent = '0/s';
        this.territoryCountEl.textContent = '0';
        if (this.populationBarEl instanceof HTMLElement) this.populationBarEl.style.width = '0%';
        playerHud?.setAttribute('data-player-state', 'DEFEATED');
      } else {
        const population = Math.floor(playerFaction.population);
        const capacity = Math.max(1, Math.floor(playerFaction.populationCapacity));
        this.populationEl.textContent = population.toLocaleString();
        const growth = playerFaction.populationGrowthPerSecond;
        const growthStr = (growth >= 0 ? '+' : '') + Math.round(growth).toLocaleString() + '/s';
        const isNearLimit = population >= capacity * 0.90;
        this.growthEl.textContent = isNearLimit ? `${growthStr} (LAND LIMIT)` : growthStr;
        this.territoryCountEl.textContent = this.formatArea(playerFaction.controlledAreaKm2);
        if (this.populationBarEl instanceof HTMLElement) {
          this.populationBarEl.style.width = Math.max(0, Math.min(100, population / capacity * 100)).toFixed(1) + '%';
        }
        playerHud?.setAttribute('data-player-state', 'ACTIVE');
      }
    }

    if (this.factionCountEl) {
      const living = [...gameState.factions.values()].filter(faction => !faction.isEliminated).length;
      this.factionCountEl.textContent = living.toLocaleString();
    }

    if (this.connectionDotEl) {
      this.connectionDotEl.classList.toggle('is-connected', gameState.isConnected);
      this.connectionDotEl.setAttribute('aria-label', gameState.isConnected ? 'Connected to Dominion server' : 'Connection interrupted');
    }
  }

  private formatArea(areaKm2: number): string {
    if (!Number.isFinite(areaKm2) || areaKm2 <= 0) return '0 km²';
    if (areaKm2 >= 1_000_000) return `${(areaKm2 / 1_000_000).toFixed(1)}M km²`;
    if (areaKm2 >= 1_000) return `${Math.round(areaKm2 / 1_000).toLocaleString()}K km²`;
    return `${Math.round(areaKm2).toLocaleString()} km²`;
  }
}
