/**
 * DOMINION OF SOL — AUTHORITATIVE UI STATE ENGINE
 * 
 * Strict separation of product presentation states:
 * - HOME_STATE: Serene, clean cartographic atlas background with civ selector & online hub. Zero combat HUD or country labels.
 * - CIV_INSPECT_STATE: Deep dive into civilization lore, commander, progression stages, and doctrine profile.
 * - CREATE_NATION_STATE: Sovereign vexillology and nation drafting suite.
 * - MATCH_QUEUE_STATE: Pre-battle matchmaking lobby / war entry room with radar scanner and queue roster.
 * - IN_GAME_STATE: Active military command interface (HUD, Command Blade, territory labels, war arrows, selection rings).
 * - LEAVE_MATCH_CONFIRM_STATE: Top-tier match exit verification sheet.
 */

import { AppSurface } from './AppSurface';
export { AppSurface };

export type UIState =
  | 'HOME_STATE'
  | 'CIV_INSPECT_STATE'
  | 'CREATE_NATION_STATE'
  | 'MATCH_QUEUE_STATE'
  | 'IN_GAME_STATE'
  | 'LEAVE_MATCH_CONFIRM_STATE';

export function getAppSurfaceForState(state: UIState): AppSurface {
  switch (state) {
    case 'HOME_STATE':
    case 'CIV_INSPECT_STATE':
    case 'CREATE_NATION_STATE':
      return AppSurface.HOME;
    case 'MATCH_QUEUE_STATE':
      return AppSurface.WAR_ROOM;
    case 'IN_GAME_STATE':
    case 'LEAVE_MATCH_CONFIRM_STATE':
      return AppSurface.MATCH;
    default:
      return AppSurface.HOME;
  }
}

class UIStateManager {
  private currentState: UIState = 'HOME_STATE';
  private previousState: UIState = 'HOME_STATE';
  private activeMatchAvailable: boolean = false;
  private listeners: Array<(state: UIState, prev: UIState) => void> = [];
  private surfaceListeners: Array<(surface: AppSurface, prev: AppSurface) => void> = [];

  constructor() {
    const initialSurface = this.getAppSurface();
    if (typeof window !== 'undefined') {
      (window as any).__DOMINION_UI_STATE__ = this.currentState;
      (window as any).__DOMINION_APP_SURFACE__ = initialSurface;
      (window as any).__DOMINION_UI_STATE_MANAGER__ = this;
    }
    if (typeof document !== 'undefined') {
      document.documentElement?.setAttribute('data-ui-state', this.currentState);
      document.documentElement?.setAttribute('data-app-surface', initialSurface);
    }
  }

  public getState(): UIState {
    return this.currentState;
  }

  public getAppSurface(): AppSurface {
    return getAppSurfaceForState(this.currentState);
  }

  public isInGame(): boolean {
    return this.currentState === 'IN_GAME_STATE';
  }

  public isHome(): boolean {
    return this.getAppSurface() === AppSurface.HOME;
  }

  public hasActiveMatch(): boolean {
    return this.activeMatchAvailable;
  }

  public setActiveMatchAvailable(available: boolean): void {
    this.activeMatchAvailable = available;
    if (typeof document !== 'undefined') {
      const btnContinue = document.getElementById('btn-civ-continue');
      if (btnContinue) {
        btnContinue.style.display = available ? 'inline-flex' : 'none';
      }
    }
  }

  public setState(nextState: UIState): void {
    if (this.currentState === nextState) return;

    const prevSurface = this.getAppSurface();
    this.previousState = this.currentState;
    this.currentState = nextState;
    const nextSurface = this.getAppSurface();

    if (typeof window !== 'undefined') {
      (window as any).__DOMINION_UI_STATE__ = nextState;
      (window as any).__DOMINION_APP_SURFACE__ = nextSurface;
      (window as any).__DOMINION_PRODUCT_MODE__ =
        nextState === 'IN_GAME_STATE' ? 'MATCH_ACTIVE' :
        nextState === 'CREATE_NATION_STATE' ? 'NATION_STUDIO' :
        nextState === 'MATCH_QUEUE_STATE' ? 'MATCH_HUB' : 'ATLAS_HOME';
    }

    const isModalOpen =
      nextState === 'CIV_INSPECT_STATE' ||
      nextState === 'CREATE_NATION_STATE' ||
      nextState === 'MATCH_QUEUE_STATE' ||
      nextState === 'LEAVE_MATCH_CONFIRM_STATE';

    if (typeof window !== 'undefined') {
      (window as any).__DOMINION_MODAL_OPEN__ = isModalOpen;
    }

    if (typeof document !== 'undefined') {
      document.documentElement?.setAttribute('data-ui-state', nextState);
      document.documentElement?.setAttribute('data-app-surface', nextSurface);
      if (document.body?.dataset) {
        document.body.dataset.modalOpen = isModalOpen ? 'true' : 'false';
      }

      // Apply strict DOM visibility across all subsystems
      this.applyDOMVisibility(nextState);

      // Notify state listeners
      this.listeners.forEach(cb => cb(nextState, this.previousState));
      document.dispatchEvent(new CustomEvent('dominion:ui-state-changed', {
        detail: { state: nextState, previous: this.previousState }
      }));

      // Notify surface listeners if surface transitioned
      if (nextSurface !== prevSurface) {
        this.surfaceListeners.forEach(cb => cb(nextSurface, prevSurface));
        document.dispatchEvent(new CustomEvent('dominion:app-surface-changed', {
          detail: { surface: nextSurface, previous: prevSurface }
        }));
      }
    } else {
      this.listeners.forEach(cb => cb(nextState, this.previousState));
      if (nextSurface !== prevSurface) {
        this.surfaceListeners.forEach(cb => cb(nextSurface, prevSurface));
      }
    }
  }

  public subscribe(listener: (state: UIState, prev: UIState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public subscribeSurface(listener: (surface: AppSurface, prev: AppSurface) => void): () => void {
    this.surfaceListeners.push(listener);
    return () => {
      this.surfaceListeners = this.surfaceListeners.filter(l => l !== listener);
    };
  }

  private applyDOMVisibility(state: UIState): void {
    if (typeof document === 'undefined') return;
    const isCombat = state === 'IN_GAME_STATE';
    const isHome = state === 'HOME_STATE';
    const isInspect = state === 'CIV_INSPECT_STATE';
    const isStudio = state === 'CREATE_NATION_STATE';
    const isQueue = state === 'MATCH_QUEUE_STATE';

    // 1. In-game combat HUD elements
    const playerHud = document.getElementById('player-hud');
    const matchHud = document.getElementById('match-hud');
    const attackPanel = document.getElementById('attack-panel');
    const combatDeck = document.getElementById('combat-engagement-deck');
    const commandRail = document.getElementById('command-rail');
    const mobileControls = document.getElementById('mobile-controls');
    const mobileSheet = document.getElementById('mobile-sheet');
    const newPlayerHint = document.getElementById('new-player-hint');
    const countryDossier = document.getElementById('country-dossier');

    if (playerHud) {
      playerHud.style.display = isCombat ? '' : 'none';
      playerHud.style.pointerEvents = isCombat ? 'auto' : 'none';
    }
    if (matchHud) {
      matchHud.style.display = isCombat ? '' : 'none';
      matchHud.style.pointerEvents = isCombat ? 'auto' : 'none';
    }
    if (attackPanel) {
      attackPanel.style.display = isCombat ? '' : 'none';
      attackPanel.style.pointerEvents = isCombat ? 'auto' : 'none';
    }
    if (combatDeck) {
      combatDeck.style.display = isCombat ? '' : 'none';
    }
    if (commandRail) commandRail.style.display = 'none';
    if (mobileControls) mobileControls.style.display = 'none';
    if (mobileSheet) mobileSheet.style.display = 'none';
    if (newPlayerHint) newPlayerHint.style.display = isCombat ? '' : 'none';

    // If not combat, immediately close and hide floating country dossier and nations drawer
    if (!isCombat) {
      if (countryDossier) {
        countryDossier.classList.remove('visible');
        countryDossier.hidden = true;
        countryDossier.style.display = 'none';
      }
      const nationsDrawer = document.getElementById('hud-nations-drawer');
      if (nationsDrawer) nationsDrawer.hidden = true;
      (window as any).__DOMINION_COMMAND_UI__?.dismissToast();
    }

    // 2. Atlas Home Master Layer (container passes pointer events through to globe canvas)
    const homeLayer = document.getElementById('civilization-selection-layer');
    if (homeLayer) {
      homeLayer.style.display = isCombat ? 'none' : 'flex';
      homeLayer.style.pointerEvents = 'none';
    }

    // Homeland beacon and boundary: ONLY visible on Atlas Home, strictly hidden in-game
    const beaconEl = document.getElementById('globe-start-region-beacon');
    if (beaconEl) {
      if (isCombat) {
        beaconEl.style.opacity = '0';
        beaconEl.style.pointerEvents = 'none';
        beaconEl.style.display = 'none';
      } else {
        beaconEl.style.display = '';
      }
    }
    const renderer = (window as any).__DOMINION_RENDERER__;
    if (isCombat && renderer) {
      renderer.clearHomelandHalo();
    }

    // 3. Inspect Dossier Modal
    const inspectModal = document.getElementById('civ-detail-modal');
    if (inspectModal) {
      inspectModal.hidden = !isInspect;
      inspectModal.style.display = isInspect ? 'flex' : 'none';
      inspectModal.style.pointerEvents = isInspect ? 'auto' : 'none';
    }

    // 4. Nation Studio
    const studioModal = document.getElementById('civ-nation-studio');
    if (studioModal) {
      studioModal.hidden = !isStudio;
      studioModal.style.display = isStudio ? 'flex' : 'none';
      studioModal.style.pointerEvents = isStudio ? 'auto' : 'none';
    }

    // 5. Match Queue / War Entry Room
    const queueModal = document.getElementById('match-queue-modal');
    if (queueModal) {
      queueModal.hidden = !isQueue;
      queueModal.style.display = isQueue ? 'flex' : 'none';
      queueModal.style.pointerEvents = isQueue ? 'auto' : 'none';
    }
  }
}

export const uiStateManager = new UIStateManager();
