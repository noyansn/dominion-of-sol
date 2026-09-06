import { gameState, EventType } from '../game/GameState';
import { gameClient } from '../game/GameClient';
import { uiStateManager, AppSurface } from './UIStateManager';
import { EventScope } from './AppSurface';

declare global {
  interface Window {
    __DOMINION_COMMAND_UI__?: CommandUI;
  }
}

function factionName(cell: number | null): string {
  if (cell === null) return '—';
  const factionId = gameState.cellOwners[cell];
  if (!factionId) return 'Unclaimed frontier';
  return gameState.factions.get(factionId)?.displayName ?? `Faction ${factionId}`;
}

function cellMeta(cell: number | null): string {
  if (cell === null) return 'Select land to issue a command';
  const factionId = gameState.cellOwners[cell];
  const terrain = gameState.cellTerrains[cell] === 2 ? 'Water' : 'Land';
  if (!factionId) return `Neutral · ${terrain}`;
  const faction = gameState.factions.get(factionId);
  const area = faction ? `${Math.round(faction.controlledAreaKm2).toLocaleString()} km²` : 'Unknown area';
  return `${area} · ${terrain}`;
}

function isCoastalLand(cell: number | null): boolean {
  if (cell === null || cell < 0 || cell >= gameState.totalCells || gameState.cellTerrains[cell] !== 0) return false;
  const x = cell % gameState.width;
  const y = Math.floor(cell / gameState.width);
  const neighbors = [
    y > 0 ? cell - gameState.width : -1,
    x + 1 < gameState.width ? cell + 1 : -1,
    y + 1 < gameState.height ? cell + gameState.width : -1,
    x > 0 ? cell - 1 : -1,
  ];
  return neighbors.some(neighbor => neighbor >= 0 && gameState.cellTerrains[neighbor] === 2);
}

type PresentationState =
  | 'IDLE'
  | 'OWN_TERRITORY_SELECTED'
  | 'OWN_COAST_SELECTED'
  | 'OWN_BORDER_SELECTED'
  | 'NEUTRAL_TERRITORY_SELECTED'
  | 'REMOTE_NEUTRAL_SELECTED'
  | 'HOSTILE_TERRITORY_SELECTED'
  | 'REMOTE_HOSTILE_SELECTED'
  | 'ALLY_SELECTED'
  | 'LEGAL_ATTACK'
  | 'ILLEGAL_ATTACK'
  | 'ACTIVE_OFFENSIVE'
  | 'DEFENDING'
  | 'DISCONNECTED'
  | 'PLAYER_DEFEATED'
  | 'MATCH_WON'
  | 'MATCH_ENDED';

export class CommandUI {
  private selectionPanel = document.getElementById('selection-panel');
  private mobileSheet = document.getElementById('mobile-sheet');
  private toast = document.getElementById('ui-toast');
  private infoPanel = document.getElementById('info-panel');
  private matchResult = document.getElementById('match-result');
  private onboardingHint = document.getElementById('new-player-hint');
  private toastTimer = 0;
  private resultDismissed = false;

  constructor() {
    window.__DOMINION_COMMAND_UI__ = this;
    this.bind('btn-mode-flat', () => this.renderer()?.setGlobeMode(false));
    this.bind('btn-mode-globe', () => this.renderer()?.setGlobeMode(true));
    this.bind('btn-rail-flat', () => this.renderer()?.setGlobeMode(false));
    this.bind('btn-rail-globe', () => this.renderer()?.setGlobeMode(true));
    this.bind('btn-mobile-flat', () => this.renderer()?.setGlobeMode(false));
    this.bind('btn-mobile-globe', () => this.renderer()?.setGlobeMode(true));
    this.bind('btn-mobile-globe-quick', () => this.renderer()?.toggleGlobe());
    this.bind('btn-map-political', () => this.renderer()?.setMapMode('POLITICAL'));
    this.bind('btn-map-terrain', () => this.renderer()?.setMapMode('TERRAIN'));
    this.bind('btn-mobile-map-political', () => this.renderer()?.setMapMode('POLITICAL'));
    this.bind('btn-mobile-map-terrain', () => this.renderer()?.setMapMode('TERRAIN'));
    this.bind('btn-info', () => this.toggleInfo());
    this.bind('btn-mobile-info', () => this.toggleInfo());
    this.bind('info-close', () => this.closeInfo());
    this.bind('btn-result-observe', () => this.dismissResult());
    this.bind('btn-center-map', () => this.renderer()?.centerOnPlayerCapital());
    this.bind('btn-mobile-center', () => this.renderer()?.centerOnPlayerCapital());
    this.bind('mobile-command-toggle', () => this.toggleMobileSheet());
    this.bind('mobile-sheet-close', () => this.closeMobileSheet());
    this.bind('btn-clear-selection', () => gameState.clearSelection());
    this.bind('btn-expand-frontier', () => this.expandFrontier());
    this.bind('btn-defense-focus', () => this.defenseFocus());
    this.bind('btn-build-port', () => this.buildPort());
    this.bind('btn-amphibious-attack', () => this.amphibiousAttack());
    this.bind('btn-offer-alliance', () => this.offerAlliance());
    this.bind('btn-alliance-accept', () => this.respondAlliance(true));
    this.bind('btn-alliance-reject', () => this.respondAlliance(false));

    gameState.subscribe((event: EventType) => {
      if (event === 'SELECTION_CHANGED' || event === 'WORLD_SNAPSHOT' || event === 'CELL_DELTAS' || event === 'FACTIONS_CHANGED' || event === 'MATCH_CHANGED' || event === 'ATTACK_RESULT' || event === 'PORT_RESULT' || event === 'ALLIANCE_PROPOSALS' || event === 'ALLIANCE_RESULT' || event === 'CONNECTION_CHANGED') this.update();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeMobileSheet();
        this.closeInfo();
      }
    });
    document.addEventListener('dominion:mode-changed', () => this.update());
    document.addEventListener('dominion:map-mode-changed', () => this.update());
    this.update();
  }

  private renderer(): any {
    return (window as any).__DOMINION_RENDERER__;
  }

  private bind(id: string, action: () => void): void {
    document.getElementById(id)?.addEventListener('click', (event) => {
      event.preventDefault();
      action();
    });
  }

  private toggleMobileSheet(): void {
    if (!this.mobileSheet) return;
    const open = this.mobileSheet.dataset.open !== 'true';
    this.mobileSheet.dataset.open = open ? 'true' : 'false';
    this.mobileSheet.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  private closeMobileSheet(): void {
    if (this.mobileSheet) {
      this.mobileSheet.dataset.open = 'false';
      this.mobileSheet.setAttribute('aria-hidden', 'true');
    }
  }

  private toggleInfo(): void {
    if (!this.infoPanel) return;
    const open = this.infoPanel.dataset.open !== 'true';
    this.infoPanel.dataset.open = open ? 'true' : 'false';
    this.infoPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  private closeInfo(): void {
    if (!this.infoPanel) return;
    this.infoPanel.dataset.open = 'false';
    this.infoPanel.setAttribute('aria-hidden', 'true');
  }

  private dismissResult(): void {
    this.resultDismissed = true;
    if (this.matchResult) this.matchResult.dataset.open = 'false';
  }

  private expandFrontier(): void {
    const target = gameState.selectedTargetCell;
    const legality = gameState.expansionLegality(target);
    if (!legality.legal || target === null) {
      this.showToast(`Expansion declined · ${legality.reason}`, 'warn');
      return;
    }
    if (gameClient.sendExpand(target)) {
      this.showToast('Frontier expansion requested', 'info');
      gameState.clearSelection();
    } else {
      this.showToast('Expansion declined · Disconnected', 'warn');
    }
  }

  private defenseFocus(): void {
    const cell = gameState.selectedSourceCell;
    const faction = gameState.factions.get(gameState.yourFactionId);
    if (cell === null || !faction) return;
    const amount = Math.max(100, faction.population * 0.10);
    if (gameClient.sendDefenseFocus(cell, amount)) {
      this.showToast('Defense Focus assigned · ' + Math.round(amount).toLocaleString() + ' Population', 'good');
    } else {
      this.showToast('Defense Focus declined · Disconnected', 'warn');
    }
  }

  private buildPort(): void {
    const cell = this.selectedOwnCell();
    if (cell === null) return;
    if (gameClient.sendBuildPort(cell)) this.showToast('Port construction started · 10 seconds', 'good');
    else this.showToast('Port order declined · Disconnected', 'warn');
  }

  private offerAlliance(): void {
    const target = gameState.selectedTargetCell;
    const factionId = target === null ? 0 : gameState.cellOwners[target];
    if (factionId > 0 && factionId !== gameState.yourFactionId && gameClient.sendAllianceOffer(factionId)) {
      this.showToast('Alliance offer sent', 'info');
    }
  }

  private respondAlliance(accept: boolean): void {
    const proposal = gameState.pendingAlliances.find(item => item.target === gameState.yourFactionId);
    if (!proposal) return;
    gameClient.sendAllianceResponse(proposal.proposalId, accept);
  }

  private amphibiousAttack(): void {
    const portCell = this.selectedOwnCell();
    const target = gameState.selectedTargetCell;
    if (portCell === null || target === null) return;
    const hasPort = gameState.ports.some(port => port.cellIndex === portCell && port.complete);
    const targetFaction = gameState.cellOwners[target];
    const coastal = isCoastalLand(target);
    if (!isCoastalLand(portCell) || targetFaction <= 0 || targetFaction === gameState.yourFactionId || !coastal) {
      this.showToast('Amphibious order requires an owned embarkation coast and coastal enemy target', 'warn');
      return;
    }
    const commitment = Math.min(gameState.populationCommitPercent / 100, hasPort ? 1 : 0.08);
    if (gameClient.sendAmphibiousAttack(portCell, target, commitment)) {
      this.showToast('Amphibious operation authorized', 'good');
      gameState.clearSelection();
    } else {
      this.showToast('Amphibious order declined · Disconnected', 'warn');
    }
  }

  private selectedOwnCell(): number | null {
    const source = gameState.selectedSourceCell;
    return source !== null && gameState.cellOwners[source] === gameState.yourFactionId ? source : null;
  }

  private activeFront(attacker: boolean): any {
    return [...gameState.fronts.values()].find(front => {
      if (!front.isCombatActive) return false;
      const involvesPlayer = front.factionA === gameState.yourFactionId || front.factionB === gameState.yourFactionId;
      if (!involvesPlayer) return false;
      return attacker
        ? front.attackerFaction === gameState.yourFactionId
        : front.attackerFaction !== gameState.yourFactionId;
    });
  }

  private derivePresentationState(source: number | null, target: number | null): PresentationState {
    if (!gameState.isConnected) return 'DISCONNECTED';
    const player = gameState.factions.get(gameState.yourFactionId);
    if (gameState.matchState.phase === 'FINISHED') {
      return gameState.matchState.winnerFactionId === gameState.yourFactionId ? 'MATCH_WON' : 'MATCH_ENDED';
    }
    if (!player || player.isEliminated) return 'PLAYER_DEFEATED';
    const context = gameState.selectionContext;
    if (context) {
      if (context.relation === 'OWN_COAST') return 'OWN_COAST_SELECTED';
      if (context.relation === 'OWN_BORDER') return 'OWN_BORDER_SELECTED';
      if (context.relation === 'ADJACENT_NEUTRAL') return 'NEUTRAL_TERRITORY_SELECTED';
      if (context.relation === 'REMOTE_NEUTRAL') return 'REMOTE_NEUTRAL_SELECTED';
      if (context.relation === 'ADJACENT_HOSTILE') return context.action === 'LAUNCH_OFFENSIVE' ? 'LEGAL_ATTACK' : 'HOSTILE_TERRITORY_SELECTED';
      if (context.relation === 'REMOTE_HOSTILE') return context.action === 'LAUNCH_OFFENSIVE' ? 'LEGAL_ATTACK' : 'REMOTE_HOSTILE_SELECTED';
      if (context.relation === 'ALLY') return 'ALLY_SELECTED';
      if (context.relation === 'OWN_INTERIOR') return 'OWN_TERRITORY_SELECTED';
    }
    if (!context && this.activeFront(true)) return 'ACTIVE_OFFENSIVE';
    if (!context && this.activeFront(false)) return 'DEFENDING';
    if (source === null && target === null) return 'IDLE';
    if (target === null) return 'OWN_TERRITORY_SELECTED';
    if (gameState.cellOwners[target] === 0) return 'NEUTRAL_TERRITORY_SELECTED';
    if (gameState.cellOwners[target] !== gameState.yourFactionId) {
      if (source === null) return 'HOSTILE_TERRITORY_SELECTED';
      return gameState.attackLegality(source, target).legal ? 'LEGAL_ATTACK' : 'ILLEGAL_ATTACK';
    }
    return 'OWN_TERRITORY_SELECTED';
  }

  private stateLabel(state: PresentationState): string {
    const labels: Record<PresentationState, string> = {
      IDLE: 'AWAITING ORDERS',
      OWN_TERRITORY_SELECTED: 'YOUR TERRITORY',
      OWN_COAST_SELECTED: 'OWN COAST',
      OWN_BORDER_SELECTED: 'OWN FRONTIER',
      NEUTRAL_TERRITORY_SELECTED: 'NEUTRAL FRONTIER',
      REMOTE_NEUTRAL_SELECTED: 'REMOTE NEUTRAL LAND',
      HOSTILE_TERRITORY_SELECTED: 'HOSTILE TERRITORY',
      REMOTE_HOSTILE_SELECTED: 'REMOTE HOSTILE LAND',
      ALLY_SELECTED: 'ALLIED TERRITORY',
      LEGAL_ATTACK: 'ATTACK READY',
      ILLEGAL_ATTACK: 'ORDER BLOCKED',
      ACTIVE_OFFENSIVE: 'ACTIVE OFFENSIVE',
      DEFENDING: 'DEFENSIVE CONTACT',
      DISCONNECTED: 'LINK INTERRUPTED',
      PLAYER_DEFEATED: 'COMMAND LOST',
      MATCH_WON: 'WORLD DOMINION',
      MATCH_ENDED: 'MATCH RESOLVED',
    };
    return labels[state];
  }

  private updateSelectionRelationship(source: number | null, target: number | null, state: PresentationState): void {
    const relation = document.getElementById('selection-relation');
    if (!relation) return;
    let label = 'NO CONTACT';
    let tone = '';
    const context = gameState.selectionContext;
    if (context?.relation === 'ALLY') {
      label = 'ALLY · NO ATTACK';
      tone = 'friendly';
    } else if (context?.relation === 'OWN_COAST') {
      label = 'OWN COAST';
      tone = 'friendly';
    } else if (context?.relation === 'OWN_BORDER') {
      label = 'OWN FRONTIER';
      tone = 'friendly';
    } else if (context?.relation === 'REMOTE_NEUTRAL') {
      label = 'REMOTE NEUTRAL';
      tone = 'neutral';
    } else if (context?.relation === 'REMOTE_HOSTILE') {
      label = 'REMOTE HOSTILE';
      tone = 'hostile';
    } else if (state === 'NEUTRAL_TERRITORY_SELECTED') {
      label = 'NEUTRAL FRONTIER';
      tone = 'neutral';
    } else if (state === 'LEGAL_ATTACK' || state === 'HOSTILE_TERRITORY_SELECTED' || state === 'ILLEGAL_ATTACK') {
      label = state === 'LEGAL_ATTACK' ? 'HOSTILE · LEGAL' : 'HOSTILE';
      tone = 'hostile';
    } else if (source !== null && target !== null && gameState.cellOwners[target] === gameState.yourFactionId) {
      label = 'YOUR TERRITORY';
      tone = 'friendly';
    } else if (source !== null) {
      label = 'ORIGIN LOCKED';
      tone = 'friendly';
    }
    relation.textContent = label;
    relation.dataset.tone = tone;
  }

  public showToast(message: string, tone: 'info' | 'good' | 'warn' = 'info', scope: EventScope = 'MATCH'): void {
    if (scope === 'MATCH' && uiStateManager.getAppSurface() !== AppSurface.MATCH) {
      // In HOME or WAR_ROOM, match event toasts are completely blocked from dispatch and presentation
      return;
    }
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.dataset.tone = tone;
    this.toast.classList.add('is-visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast?.classList.remove('is-visible'), 3200);
  }

  public dismissToast(): void {
    if (!this.toast) return;
    this.toast.classList.remove('is-visible');
    window.clearTimeout(this.toastTimer);
  }

  private factionFacts(cell: number | null): string {
    if (cell === null) return 'No faction intelligence available.';
    const factionId = gameState.cellOwners[cell];
    const faction = factionId > 0 ? gameState.factions.get(factionId) : undefined;
    if (!faction) return 'Neutral land · expansion cost confirmed by server.';
    const population = Math.floor(faction.population).toLocaleString();
    const area = Math.round(faction.controlledAreaKm2).toLocaleString();
    const capital = faction.capitalCell >= 0 ? 'CAPITAL ONLINE' : 'CAPITAL LOST';
    return 'POPULATION ' + population + ' · LAND AREA ' + area + ' km² · ' + capital;
  }

  public update(): void {
    if ((window as any).__DOMINION_UI_STATE__ && (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE') {
      if (this.selectionPanel) this.selectionPanel.style.display = 'none';
      if (this.onboardingHint) this.onboardingHint.style.display = 'none';
      return;
    }
    const source = gameState.selectedSourceCell;
    const target = gameState.selectedTargetCell;
    const context = gameState.selectionContext;
    const state = this.derivePresentationState(source, target);
    const proposalPanel = document.getElementById('alliance-proposal') as HTMLElement | null;
    const proposal = gameState.pendingAlliances.find(item => item.target === gameState.yourFactionId);
    if (proposalPanel) {
      proposalPanel.hidden = !proposal;
      if (proposal) {
        this.setText('alliance-proposal-name', gameState.factions.get(proposal.proposer)?.displayName ?? `Faction ${proposal.proposer}`);
        this.setText('alliance-proposal-meta', 'A real diplomatic offer is awaiting your response.');
      }
    }
    const hasSelection = Boolean(context) || source !== null || target !== null;
    const attack = gameState.attackLegality(source, target);
    const validAttack = attack.legal;
    const expansion = gameState.expansionLegality(target);
    const expandButton = document.getElementById('btn-expand-frontier') as HTMLButtonElement | null;
    const defenseButton = document.getElementById('btn-defense-focus') as HTMLButtonElement | null;
    const portButton = document.getElementById('btn-build-port') as HTMLButtonElement | null;
    const amphibiousButton = document.getElementById('btn-amphibious-attack') as HTMLButtonElement | null;
    const allianceButton = document.getElementById('btn-offer-alliance') as HTMLButtonElement | null;
    const isNeutralTarget = context?.relation === 'ADJACENT_NEUTRAL' || (target !== null && gameState.cellOwners[target] === 0 && gameState.cellTerrains[target] !== 2);
    document.body.dataset.uiState = state;
    this.selectionPanel?.setAttribute('data-state', state);
    this.setText('selection-state', this.stateLabel(state));
    this.updateSelectionRelationship(source, target, state);
    this.setText(
      'match-phase',
      state === 'MATCH_WON' || state === 'MATCH_ENDED'
        ? 'RESOLVED'
        : gameState.matchState.phase === 'RUNNING' ? 'ACTIVE' : 'STANDBY',
    );
    if (expandButton) {
      expandButton.style.display = context?.action === 'EXPAND_FRONTIER' && state !== 'MATCH_ENDED' && state !== 'MATCH_WON' ? '' : 'none';
      expandButton.disabled = !expansion.legal;
    }
    if (defenseButton) {
      const ownPoint = (context?.relation === 'OWN_BORDER' || context?.relation === 'OWN_COAST') && source !== null && gameState.cellOwners[source] === gameState.yourFactionId;
      defenseButton.style.display = ownPoint && context?.relation === 'OWN_BORDER' && state !== 'MATCH_ENDED' && state !== 'MATCH_WON' ? '' : 'none';
      defenseButton.disabled = !ownPoint || (gameState.factions.get(gameState.yourFactionId)?.population ?? 0) < 100;
    }
    const ownCell = this.selectedOwnCell();
    const portAvailable = context?.relation === 'OWN_COAST' && ownCell !== null && gameState.strategicSites.some(site => site.kind === 'PORT' && site.cellA === ownCell) && !gameState.ports.some(port => port.cellIndex === ownCell);
    if (portButton) {
      portButton.style.display = portAvailable && state !== 'MATCH_ENDED' && state !== 'MATCH_WON' ? '' : 'none';
      portButton.disabled = !portAvailable || (gameState.factions.get(gameState.yourFactionId)?.population ?? 0) < 12_000;
    }
    const targetFaction = target !== null ? gameState.cellOwners[target] : 0;
    const amphibiousAvailable = false;
    if (amphibiousButton) {
      amphibiousButton.style.display = 'none';
      amphibiousButton.disabled = true;
    }
    const allied = targetFaction > 0 && gameState.alliances.some(alliance => alliance.members.includes(gameState.yourFactionId) && alliance.members.includes(targetFaction));
    if (allianceButton) {
      allianceButton.style.display = context?.relation === 'ALLY' && targetFaction > 0 && targetFaction !== gameState.yourFactionId && !allied && state !== 'MATCH_ENDED' && state !== 'MATCH_WON' ? '' : 'none';
      allianceButton.disabled = targetFaction === 0;
    }

    if (this.selectionPanel) {
      const attackSheetOwnsContext = context?.action === 'LAUNCH_OFFENSIVE';
      this.selectionPanel.style.display = hasSelection && !attackSheetOwnsContext && state !== 'MATCH_ENDED' && state !== 'MATCH_WON' ? 'grid' : 'none';
    }
    this.setText('selection-source-name', factionName(source));
    this.setText('selection-source-meta', cellMeta(source));
    this.setText('selection-target-name', factionName(target));
    this.setText('selection-target-meta', cellMeta(target));
    this.setText('selection-faction-facts', this.factionFacts(target !== null ? target : source));
    this.setText(
      'selection-hint',
      context?.rejectionReason ?? (isNeutralTarget ? expansion.reason :
        state === 'ACTIVE_OFFENSIVE' ? 'Operation is active. HALT returns surviving deployed people.' :
            state === 'DEFENDING' ? 'Hostile pressure detected. Actual local forces are engaged.' :
              attack.reason),
    );

    const renderer = this.renderer();
    const globe = Boolean(renderer?.isGlobeMode);
    this.setActive('btn-mode-flat', !globe);
    this.setActive('btn-mode-globe', globe);
    this.setActive('btn-rail-flat', !globe);
    this.setActive('btn-rail-globe', globe);
    this.setActive('btn-mobile-flat', !globe);
    this.setActive('btn-mobile-globe', globe);
    this.setText('map-mode-label', globe ? 'GLOBE' : 'FLAT MAP');
    const mapMode = renderer?.mapMode ?? 'POLITICAL';
    this.setActive('btn-map-political', mapMode === 'POLITICAL');
    this.setActive('btn-map-terrain', mapMode === 'TERRAIN');
    this.setActive('btn-mobile-map-political', mapMode === 'POLITICAL');
    this.setActive('btn-mobile-map-terrain', mapMode === 'TERRAIN');
    if (this.onboardingHint) {
      const player = gameState.factions.get(gameState.yourFactionId);
      const hint = !gameState.isInitialized
        ? 'Establishing your command map…'
        : !gameState.isConnected
          ? 'Command link interrupted. Reconnecting to the authoritative world…'
        : player?.isEliminated
          ? 'Your faction has been defeated.'
          : context?.rejectionReason ?? (context?.action === 'LAUNCH_OFFENSIVE'
            ? 'Point confirmed. Choose Population deployment and launch the operation.'
            : context?.action === 'EXPAND_FRONTIER'
              ? 'Neutral frontier selected. Commit Population to expand.'
              : context?.action === 'DEFEND'
                ? 'Own frontier selected. Pre-position Population here.'
                : context?.action === 'BUILD_PORT'
                  ? 'Own coast selected. Build a permanent port here.'
                  : 'Select land to issue a command.');
      this.onboardingHint.textContent = hint;
      this.onboardingHint.style.display = gameState.matchState.phase === 'FINISHED' ? 'none' : '';
    }
    if (this.matchResult) {
      if (gameState.matchState.phase === 'FINISHED' && !this.resultDismissed) {
        const winner = gameState.matchState.winnerFactionId ? gameState.factions.get(gameState.matchState.winnerFactionId) : undefined;
        this.setText('result-winner', winner?.displayName ?? 'World Dominion resolved');
        const km2 = winner ? Math.round(winner.controlledAreaKm2 || (winner.territoryCount * 1280)) : 0;
        this.setText('result-land', winner ? `${km2 >= 1000 ? (km2 / 1000).toFixed(1) + 'M' : km2.toLocaleString()} km² sovereign territory` : 'Final state synchronized');
        this.matchResult.dataset.open = 'true';
      } else if (gameState.matchState.phase !== 'FINISHED') {
        this.resultDismissed = false;
        this.matchResult.dataset.open = 'false';
      }
    }
  }

  private setActive(id: string, active: boolean): void {
    document.getElementById(id)?.classList.toggle('active', active);
  }

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element && element.textContent !== value) element.textContent = value;
  }
}
