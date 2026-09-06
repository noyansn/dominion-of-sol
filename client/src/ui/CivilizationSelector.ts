import {
  CURATED_CIVILIZATION_PRESETS,
  CivilizationPreset,
  DoctrineAxis,
  DOCTRINE_AXES,
  rebalanceCustomDoctrine,
  DoctrineModifiers,
  getDoctrineRuleDescription,
} from '../game/CivilizationPresets';
import { gameState } from '../game/GameState';
import { gameClient } from '../game/GameClient';
import {
  NationIdentity,
  FlagLayout,
  EmblemType,
  PRESET_NATION_IDENTITIES,
  renderFlagSvg,
  renderPennantSvg,
  renderMiniFlagSvg,
} from './NationIdentity';
import {
  CIVILIZATION_ATLAS,
  CIVILIZATION_BY_ID,
  searchCivilizations,
  MACRO_REGIONS,
  MacroRegion,
} from '../meta/CivilizationAtlas';
import { getStageArtwork } from '../game/ArtworkManifest';
import {
  matchmakingHub,
  MatchWorldSummary,
  ContestSchedule,
} from '../net/MatchmakingHub';
import { matchWithdrawalDialog } from './MatchWithdrawalDialog';
import { uiStateManager, UIState } from './UIStateManager';
import { warRoomManager, WarWorldInstance } from './WarRoomManager';
import { accountService } from '../meta/AccountService';
import { walletService } from '../meta/WalletService';

function getAdvantageIconSvg(icon: string, isPenalty = false): string {
  const strokeColor = isPenalty ? '#ef4444' : '#dfbc73';
  switch (icon) {
    case 'offense':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>`;
    case 'defense':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case 'expansion':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
    case 'maritime':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
    default:
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
}

export type ProductMode =
  | 'ATLAS_HOME'
  | 'NATION_STUDIO'
  | 'MATCH_HUB'
  | 'MATCH_ACTIVE';

export interface MatchQueueDefinition {
  id: string;
  title: string;
  tagline: string;
  type: string;
  playerCount: string;
  maxPlayers: number;
  latencyMs: number;
  rules: string;
  isContest?: boolean;
}

export const MATCH_QUEUES: MatchQueueDefinition[] = [
  {
    id: 'riverlands',
    title: '2v2 RIVERLANDS',
    tagline: 'Casual Duo Front · Danube & Rhine basins',
    type: 'Casual 2v2',
    playerCount: '12 / 200 players',
    maxPlayers: 4,
    latencyMs: 18,
    rules: 'Victory: 65% Land Domination or Capital Capture',
  },
  {
    id: 'steppe',
    title: '2v2 STEPPE FRONTIER',
    tagline: 'Tactical Maneuver · Eurasian high plains',
    type: 'Ranked 2v2',
    playerCount: '8 / 200 players',
    maxPlayers: 4,
    latencyMs: 22,
    rules: 'Victory: 65% Land Domination or Capital Capture',
  },
  {
    id: 'continental',
    title: '4 PLAYER FFA CONTINENTAL CLASH',
    tagline: 'Imperial Sovereignty · Central Continental Heartland',
    type: 'Ranked FFA',
    playerCount: '24 / 200 players',
    maxPlayers: 4,
    latencyMs: 14,
    rules: 'Victory: Sovereign Continental Hegemony or Elimination of All Rivals',
  },
  {
    id: 'sol',
    title: '3v3 ISLANDS OF SOL',
    tagline: 'Maritime Hegemony · Mediterranean & Aegean archipelagos',
    type: 'Strategic 3v3',
    playerCount: '16 / 200 players',
    maxPlayers: 6,
    latencyMs: 34,
    rules: 'Victory: Naval Port Control & Archipelago Domination',
  },
  {
    id: 'pass',
    title: '1v1 ANCIENT PASS',
    tagline: 'Highland Chokepoint Duel · Alpine & Taurus gorges',
    type: 'Competitive Duel',
    playerCount: '6 / 200 players',
    maxPlayers: 2,
    latencyMs: 12,
    rules: 'Victory: Decisive Capital Conquest',
  },
  {
    id: 'contest',
    title: 'WORLD CONTEST · ARENA OF SOL',
    tagline: 'Global Championship Event · High-stakes sovereign realm',
    type: 'Global Tournament',
    playerCount: '101 / 101 Players',
    maxPlayers: 101,
    latencyMs: 16,
    rules: 'Special Rule: Synchronized 10-Minute World Clock & Ranked Points',
    isContest: true,
  },
];

export class CivilizationSelector {
  private root: HTMLElement | null = null;
  private selectedIndex = 0;
  private currentMode: ProductMode = 'ATLAS_HOME';
  private selectedQueueId: string = 'continental';
  private isDetailModalOpen = false;

  private customIdentity: NationIdentity = {
    id: 'custom',
    name: 'Sol Commonwealth',
    layout: 'triband-h',
    primaryColor: '#0369a1',
    secondaryColor: '#f59e0b',
    accentColor: '#ffffff',
    emblem: 'star',
    emblemColor: '#ffffff',
  };

  private customNation = {
    startCell: 145 * 1024 + 625,
    regionName: 'Custom Homeland (Map Selected)',
    politicalColor: '#0284c7',
    doctrine: {
      offense: 0,
      defense: 0,
      expansion: 0,
      maritime: 0,
    } as DoctrineModifiers,
  };

  private activeAtlasFilter: string = 'ALL';
  private atlasSearchQuery: string = '';
  private isAtlasOpen: boolean = false;
  private unsubHub?: () => void;

  constructor() {
    this.createUI();
    this.bindEvents();

    // Migration Safety: Check for saved session & migrate legacy 'turk' -> 'hun'
    const savedNation = localStorage.getItem('dominion.nation');
    if (savedNation && (savedNation.toLowerCase() === 'türk' || savedNation.toLowerCase() === 'turk')) {
      localStorage.setItem('dominion.nation', 'HUN');
      localStorage.setItem('dominion.flag', 'flag_hun');
      localStorage.setItem('dominion.color', '#78350f');
    }

    // URL param or hash support: e.g. ?civ=han or #han with migration for turk -> hun
    const urlParams = new URLSearchParams(window.location.search);
    const rawCivParam = urlParams.get('civ') || window.location.hash.replace('#', '');
    const civParam = rawCivParam.toLowerCase() === 'turk' ? 'hun' : rawCivParam.toLowerCase();
    const foundIdx = civParam ? CURATED_CIVILIZATION_PRESETS.findIndex(p => p.id.toLowerCase() === civParam) : -1;
    const initialIdx = foundIdx >= 0 ? foundIdx : 0;
    this.selectPreset(initialIdx, foundIdx >= 0);
    this.setProductMode('ATLAS_HOME');

    // Subscribe to matchmaking and contest schedule clock
    this.unsubHub = matchmakingHub.subscribe(() => {
      this.updateHubView();
      this.updateContestPill();
    });

    // Wire authoritative match exit sheet
    matchWithdrawalDialog.setOnLeave(() => {
      this.returnToAtlas();
    });

    // Check for saved session
    const hasSave = Boolean(localStorage.getItem('dominion.sessionStarted') || localStorage.getItem('dominion.nation'));
    uiStateManager.setActiveMatchAvailable(hasSave);

    (window as any).__civilizationSelector = this;
    (window as any).warRoomManager = warRoomManager;
    (window as any).__warRoomManager = warRoomManager;
  }

  private renderer(): any {
    return (window as any).__DOMINION_RENDERER__;
  }

  public getProductMode(): ProductMode {
    return this.currentMode;
  }

  public setProductMode(mode: ProductMode): void {
    this.currentMode = mode;

    let targetUIState: UIState = 'HOME_STATE';
    if (mode === 'MATCH_ACTIVE') {
      targetUIState = 'IN_GAME_STATE';
    } else if (mode === 'NATION_STUDIO') {
      targetUIState = 'CREATE_NATION_STATE';
    } else if (mode === 'MATCH_HUB') {
      targetUIState = 'MATCH_QUEUE_STATE';
    } else if (this.isDetailModalOpen) {
      targetUIState = 'CIV_INSPECT_STATE';
    }

    uiStateManager.setState(targetUIState);

    if (mode === 'MATCH_HUB') {
      this.renderWarRoomContent();
    }
  }

  private createUI(): void {
    const existing = document.getElementById('civilization-selection-layer');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'civilization-selection-layer';
    container.className = 'civ-selection-layer';

    const hasSave = Boolean(localStorage.getItem('dominion.sessionStarted') || localStorage.getItem('dominion.nation'));

    container.innerHTML = `
      <!-- Top Cartographic Bar -->
      <header class="civ-top-bar">
        <!-- Game Logo & Authoritative Title -->
        <div class="civ-identity-box">
          <div class="civ-emblem-wrap">
            <svg class="civ-sun-emblem" width="34" height="34" viewBox="0 0 40 40" fill="none">
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#fffbeb" stop-opacity="1"/>
                  <stop offset="45%" stop-color="#dfbc73" stop-opacity="0.9"/>
                  <stop offset="100%" stop-color="#9a7522" stop-opacity="0.4"/>
                </radialGradient>
              </defs>
              <!-- Outer Radiant Sunburst Ray Points (16 rays) -->
              <path d="M20 2L22.5 12L32.7 7.3L27.3 17.5L38 20L27.3 22.5L32.7 32.7L22.5 27.3L20 38L17.5 27.3L7.3 32.7L12.7 22.5L2 20L12.7 17.5L7.3 7.3L17.5 12Z" stroke="#dfbc73" stroke-width="1.2" fill="none" opacity="0.85"/>
              <!-- Solar Halo Ring -->
              <circle cx="20" cy="20" r="10.5" stroke="#fef08a" stroke-width="1.2" fill="none" opacity="0.9"/>
              <!-- Radiant Golden Core -->
              <circle cx="20" cy="20" r="6" fill="url(#sunGlow)"/>
              <circle cx="20" cy="20" r="2.5" fill="#ffffff"/>
            </svg>
          </div>
          <div class="civ-identity-text">
            <div class="civ-game-title">DOMINION OF SOL</div>
            <div class="civ-game-subtitle">GRAND STRATEGY ATLAS</div>
          </div>
        </div>

        <!-- Synchronized World Contest Pill -->
        <div id="civ-contest-pill" class="civ-contest-pill" role="button" tabindex="0" title="Synchronized global contest every 10 minutes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <polygon points="12 6 13.5 10 18 10 14.5 12.5 16 17 12 14 8 17 9.5 12.5 6 10 10.5 10"/>
          </svg>
          <span id="civ-contest-countdown" class="civ-contest-text">WORLD CONTEST • 08:53</span>
          <span id="civ-contest-action-tag" class="civ-contest-action">JOIN</span>
        </div>

        <div class="civ-top-controls" style="display: flex; align-items: center; gap: 8px;">
          <!-- Profile Button with Nation Name & Player Tag -->
          <button id="btn-civ-profile" class="civ-btn-meta" type="button" title="View Sovereign Profile and Collection">
            <span style="font-size: 11px; font-weight: 800; color: #f8fafc;" id="civ-top-profile-name">COMMANDER</span>
            <span style="font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; color: #dfbc73;" id="civ-top-profile-tag">#7F42A</span>
          </button>

          <!-- Emojis & Expressions Button -->
          <button id="btn-civ-reactions" class="civ-btn-meta" type="button" title="Open Sovereign Emojis & Expressions">
            <span style="color: #38bdf8; font-size: 11px;">✨</span>
            <span style="font-size: 9.5px; font-weight: 800; color: #38bdf8;">EMOJIS</span>
          </button>

          <!-- Armory Button with Marks Balance -->
          <button id="btn-civ-armory" class="civ-btn-meta" type="button" title="Open Sovereign Armory">
            <span style="color: #dfbc73; font-size: 12px;">◆</span>
            <span style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 800; color: #fef08a;" id="civ-top-armory-marks">0</span>
            <span style="font-size: 9px; font-weight: 800; color: #dfbc73;">ARMORY</span>
          </button>

          <!-- Dev Commerce Lab Button (gated in dev mode) -->
          <button id="btn-civ-dev-lab" class="civ-btn-meta civ-btn-meta--dev" type="button" title="Open Developer Commerce Lab (Ctrl+Shift+M)">
            <span style="color: #ef4444; font-size: 10px; font-weight: 900;">DEV LAB</span>
          </button>

          <button id="btn-civ-settings" class="civ-btn-icon" title="Settings" aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- 3D Globe Projected Start Region Beacon & Label Overlay -->
      <div id="globe-start-region-beacon" class="globe-beacon-overlay"></div>

      <!-- Bottom Civilization Console -->
      <footer class="civ-bottom-console">
        <!-- Primary Hero CTA standing prominent on top of the card -->
        <div class="civ-primary-cta-wrap" style="display: flex; flex-direction: column; align-items: center;">
          <!-- First-time entry / Persistent Nation Name Input -->
          <div class="civ-nation-entry-box" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; background: rgba(4, 9, 16, 0.85); border: 1px solid rgba(223, 188, 115, 0.4); border-radius: 4px; padding: 4px 10px; backdrop-filter: blur(8px);">
            <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #dfbc73;">YOUR NATION</span>
            <div style="position: relative; display: flex; align-items: center;">
              <input id="civ-input-nation-name" type="text" placeholder="Enter a name..." maxlength="24" autocomplete="off" spellcheck="false" style="
                background: #08111c;
                border: 1px solid rgba(223, 188, 115, 0.5);
                color: #f8fafc;
                padding: 4px 8px;
                padding-right: 68px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.05em;
                outline: none;
                width: 180px;
                text-transform: uppercase;
              " />
              <span id="civ-player-tag-pill" style="
                position: absolute;
                right: 6px;
                font-family: ui-monospace, monospace;
                font-size: 10px;
                font-weight: 700;
                color: #dfbc73;
                pointer-events: none;
                opacity: 0.9;
              ">#7F42A</span>
            </div>
          </div>

          <button id="btn-continue-with-civ" class="civ-btn-continue-hero" type="button">
            <span id="civ-continue-label">CONTINUE WITH ROMA</span>
            <span class="civ-cta-arrow">→</span>
          </button>
        </div>

        <!-- Selected Preset Identity Capsule -->
        <section id="civ-selected-capsule" class="civ-selected-capsule">
          <!-- Duo Vexillology: 120x80 Rectangular Flag + 48x80 Command Pennant -->
          <div id="civ-hero-flag-duo" class="civ-hero-flag-duo">
            <div id="civ-hero-flag-rect-wrap" class="identity-flag-frame"></div>
            <div id="civ-hero-flag-pennant-wrap" class="identity-pennant-frame"></div>
          </div>

          <div class="civ-capsule-info">
            <div class="civ-capsule-header">
              <span id="civ-capsule-name" class="civ-capsule-name">ROMA</span>
              <span class="civ-capsule-star">☆</span>
              <span id="civ-capsule-playstyle" class="civ-capsule-playstyle">FORTIFIED ADVANCE</span>
            </div>
            <div class="civ-capsule-region-row">
              <span class="civ-region-eyebrow">Start region:</span>
              <span id="civ-capsule-region" class="civ-capsule-region">Central Mediterranean / Italian Peninsula</span>
            </div>
            <p id="civ-capsule-tagline" class="civ-capsule-tagline">Frontier expansion through disciplined legions and fortified infrastructure. Roma excels at securing territory, absorbing pressure, and building an empire that endures.</p>
          </div>

          <!-- 4-Lane Strategic Military Doctrine Instrument -->
          <div class="civ-capsule-doctrine">
            <div class="civ-doctrine-header">
              <span class="civ-doctrine-title">DOCTRINE PROFILE</span>
            </div>
            <div id="civ-doctrine-bars" class="civ-doctrine-instrument">
              <!-- Rendered via JS -->
            </div>
          </div>

          <!-- Actions: View Details -->
          <div class="civ-capsule-actions">
            <button id="btn-inspect-civ" class="civ-btn-inspect" type="button" title="View civilization details">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>VIEW<br/>CIVILIZATION</span>
            </button>
          </div>
        </section>

        <!-- Home Civilization Miniaturized Carousel (Strictly 3 Compact Cards) -->
        <div class="civ-home-carousel-dock" aria-label="Civilization Selection Carousel">
          <button id="btn-carousel-prev" class="civ-carousel-nav-btn" type="button" aria-label="Previous Civilization">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div id="civ-home-carousel" class="civ-home-carousel" role="region" aria-label="Civilization Carousel">
            <!-- Exactly 3 compact cards rendered dynamically: [prev, selected, next] -->
          </div>

          <button id="btn-carousel-next" class="civ-carousel-nav-btn" type="button" aria-label="Next Civilization">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <!-- Carousel Footer Actions: Explore Full Atlas (44) + Custom Nation Studio -->
        <div class="civ-home-dock-footer">
          <button id="btn-open-atlas" class="civ-btn-open-atlas" type="button" title="Explore all 44 global civilizations">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span>EXPLORE CIVILIZATIONS ATLAS (44)</span>
            <span class="civ-atlas-arrow">→</span>
          </button>
          <button id="btn-open-custom-studio" class="civ-btn-open-studio-quiet" type="button">
            + CUSTOM NATION
          </button>
        </div>
      </footer>

      <!-- ============================================================
           CIVILIZATION ATLAS FULL SCREEN SELECTION (CIVILIZATION_ATLAS)
           ============================================================ -->
      <div id="civ-atlas-screen" class="civ-atlas-screen" hidden>
        <!-- Top Bar: Title, Subtitle, Search, Return to Home -->
        <header class="civ-atlas-header">
          <div class="civ-atlas-header-left">
            <button id="btn-atlas-back-home" class="civ-atlas-back-btn" type="button">
              <span>← RETURN TO HOME</span>
            </button>
            <div class="civ-atlas-title-block">
              <h1 class="civ-atlas-title">CIVILIZATION ATLAS</h1>
              <span class="civ-atlas-subtitle">Choose a heritage · Explore the world</span>
            </div>
          </div>

          <!-- Atlas Search Box -->
          <div class="civ-atlas-search-wrap">
            <svg class="civ-atlas-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input id="civ-atlas-search-input" class="civ-atlas-search-input" type="text" placeholder="Search civilization, region, or trait..." autocomplete="off" spellcheck="false" />
            <button id="btn-atlas-search-clear" class="civ-atlas-search-clear" type="button" hidden>✕</button>
          </div>
        </header>

        <!-- Regional Geographic Filter Rail (12 tabs) -->
        <nav class="civ-atlas-filter-rail" aria-label="Regional Filters">
          <div id="civ-atlas-filters" class="civ-atlas-filters-track">
            <!-- Rendered dynamically: ALL, EUROPE, AFRICA, ... -->
          </div>
        </nav>

        <!-- Atlas Body: Left 65% Globe Space, Right 35% Selected Inspector -->
        <main class="civ-atlas-body">
          <div class="civ-atlas-globe-zone" id="civ-atlas-globe-zone">
            <div class="civ-atlas-globe-hint">
              <span>DRAG TO ROTATE GLOBE · CLICK HOMELAND POLYGON TO SELECT</span>
            </div>
          </div>

          <aside class="civ-atlas-inspector-wrap">
            <div id="civ-atlas-inspector" class="civ-atlas-inspector">
              <!-- Rendered dynamically by renderAtlasInspector() -->
            </div>
          </aside>
        </main>

        <!-- Bottom Compact Filtered Civilization Card Strip -->
        <footer class="civ-atlas-bottom-bar">
          <div class="civ-atlas-strip-header">
            <span id="civ-atlas-count-label" class="civ-atlas-count-label">44 CIVILIZATIONS</span>
          </div>
          <div id="civ-atlas-cards-strip" class="civ-atlas-cards-strip">
            <!-- Compact Cards for all filtered civs -->
          </div>
        </footer>
      </div>

      <!-- Civilization Detail Dossier Modal -->
      <div id="civ-detail-modal" class="civ-modal-backdrop" hidden>
        <div class="civ-modal-frame civ-modal-frame--dossier" role="dialog" aria-modal="true" aria-labelledby="civ-modal-title">
          <!-- Modal Top Header Block: Two levels: Large Serif Name, Subtitle with Region -->
          <div class="civ-modal-header-block">
            <div class="civ-modal-header-left">
              <div id="civ-modal-flag-badge" class="civ-modal-flag-badge"></div>
              <div class="civ-modal-header-titles">
                <h2 id="civ-modal-title" class="civ-modal-title">ROMA</h2>
                <div id="civ-modal-subtitle" class="civ-modal-subtitle">FORTIFIED ADVANCE · SOUTHERN EUROPE / CENTRAL MEDITERRANEAN</div>
              </div>
            </div>
            <button id="btn-close-civ-modal" class="civ-modal-close" type="button" aria-label="Close dossier">✕</button>
          </div>

          <div class="civ-modal-columns">
            <!-- Left Column: Visuals & Progression Stages (Artwork Focused, No Commander) -->
            <div class="civ-modal-left-col">
              <!-- Segmented Switch directly ABOVE the Hero Image with Era Title on the right -->
              <div class="civ-stage-segmented-bar">
                <div class="civ-stage-state-toggle" role="group" aria-label="Era State">
                  <button id="btn-stage-normal" class="civ-stage-state-btn active" type="button">PROSPERITY</button>
                  <button id="btn-stage-defeat" class="civ-stage-state-btn" type="button">WAR DEFEAT</button>
                </div>
                <div id="civ-modal-stage-badge" class="civ-modal-stage-badge">STAGE IV · PAX ROMANA ZENITH</div>
              </div>

              <!-- 16:9 Landscape Artwork Hero Card -->
              <div class="civ-modal-stage-card">
                <div class="civ-stage-img-wrap">
                  <img id="civ-modal-culture-img" class="civ-modal-culture-img" alt="Civilization Culture Visual" src="" />
                  <div id="civ-modal-stage-pending" class="civ-stage-pending-wrap" hidden></div>
                </div>
                <div class="civ-stage-caption-row">
                  <span id="civ-modal-stage-brief-title" class="civ-stage-caption-title">ETERNAL IMPERIAL METROPOLIS</span>
                  <span id="civ-modal-stage-pop-scale" class="civ-stage-caption-pop">STAGE IV · ~100M POPULATION SCALE</span>
                </div>
              </div>

              <!-- Progression Stages (5 Equal-Width Thumbnails with Clean STAGE I - V Labels) -->
              <div class="civ-progression-panel">
                <div id="civ-progression-row" class="civ-progression-row">
                  <!-- 5 equal-width real artwork thumbnails rendered dynamically -->
                </div>
              </div>
            </div>

            <!-- Right Column: Strategic Attributes & Doctrine Profile (Canonical Values & Lighter Lists) -->
            <div class="civ-modal-right-col">
              <div class="civ-attributes-panel">
                <h3 class="civ-panel-section-title">DOCTRINE PROFILE</h3>
                <div id="civ-modal-doctrine-display" class="civ-modal-doctrine-display">
                  <!-- Rendered via unified DoctrineGauge: 4 long bipolar rails with visible illuminated beads -->
                </div>

                <h3 class="civ-panel-section-title civ-panel-section-title--strengths">STRENGTHS</h3>
                <ul id="civ-modal-adv-list" class="civ-bullet-list">
                  <!-- Rendered via JS -->
                </ul>

                <h3 class="civ-panel-section-title civ-panel-section-title--tradeoffs">TRADEOFFS</h3>
                <ul id="civ-modal-pen-list" class="civ-bullet-list">
                  <!-- Rendered via JS -->
                </ul>
              </div>
            </div>
          </div>

          <!-- Modal Bottom Action Bar: Spanning across full width with safe area -->
          <div class="civ-modal-footer">
            <button id="btn-modal-close-footer" class="civ-btn-inspect civ-btn-close-dossier" type="button">CLOSE</button>
            <button id="btn-modal-enter-warroom" class="civ-btn-continue-hero civ-btn-modal-enter-war" type="button">
              <span>ENTER WAR ROOM →</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================
           WAR ROOM / REALM SELECTION FULL-SCREEN SCREEN (MATCH_QUEUE_STATE)
           ============================================================ -->
      <div id="match-queue-modal" class="warroom-screen" hidden>
        <div class="warroom-vignette-overlay"></div>

        <!-- Top Header Bar (Height 64px) -->
        <header class="warroom-top-bar">
          <div class="warroom-header-left">
            <h1 class="warroom-title">WAR ROOM <span class="warroom-title-sep">/</span> REALM SELECTION</h1>
            <span class="warroom-sub">SYNCHRONIZED CONTINENTAL REALMS · 1-MINUTE CYCLES</span>
          </div>
          <div class="warroom-header-right">
            <div class="warroom-cycle-indicator">
              <span class="warroom-indicator-label">NEXT WORLD IN</span>
              <strong id="warroom-next-world-timer" class="warroom-indicator-val">00:42</strong>
            </div>
            <div id="warroom-contest-timer-pill" class="warroom-contest-pill">
              <span class="warroom-indicator-label">NEXT WORLD CONTEST</span>
              <strong id="warroom-contest-timer-val" class="warroom-indicator-val">08:14</strong>
            </div>
          </div>
        </header>

        <!-- Main Viewport Body (Height calc(100vh - 128px), overflow: hidden) -->
        <div id="civ-warroom-content" class="warroom-main-viewport">
          <!-- Rendered dynamically by renderWarRoomContent() -->
        </div>

        <!-- Bottom Navigation & Primary Action Bar (Height 64px) -->
        <footer class="warroom-bottom-bar">
          <div class="warroom-bottom-left">
            <button id="btn-warroom-back-atlas" class="warroom-btn-back" type="button">
              <span>← RETURN TO ATLAS</span>
            </button>
          </div>
          <div class="warroom-bottom-right">
            <button id="btn-warroom-primary-action" class="warroom-btn-primary" type="button" disabled>
              <span id="warroom-primary-action-label">JOIN WORLD →</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- ============================================================
           CUSTOM NATION STUDIO (CREATE_NATION_STATE) — LUXURY FORGE
           ============================================================ -->
      <div id="civ-nation-studio" class="civ-nation-studio" hidden>
        <div class="nation-studio-frame">
          <!-- Studio Header Bar -->
          <div class="nation-studio-header">
            <div class="nation-studio-title-block">
              <div class="nation-studio-badge">★ SOVEREIGN COMMISSION FORGE ★</div>
              <h2 class="nation-studio-title">CUSTOM NATION STUDIO</h2>
              <div class="nation-studio-subtitle">ZERO-SUM DOCTRINE DRAFTING · HERALDIC VEXILLOLOGY · STRATEGIC CAPITAL</div>
            </div>
            <button id="btn-close-studio" class="civ-modal-close" aria-label="Close studio">✕</button>
          </div>

          <!-- Studio Two-Column Grid Body -->
          <div class="nation-studio-body">
            <!-- Left Column: Forge Controls & Doctrine Engine -->
            <div class="nation-studio-controls">
              <!-- Section 1: Sovereign Identity & Capital Province -->
              <div class="nation-card-section">
                <div class="nation-section-header">
                  <span class="nation-section-icon">🏛</span>
                  <span class="nation-section-title">SOVEREIGN DESIGNATION & CAPITAL</span>
                </div>
                <div class="nation-input-group">
                  <label class="nation-label" for="studio-input-name">NATION NAME</label>
                  <input id="studio-input-name" class="nation-text-input" type="text" value="Sol Commonwealth" maxlength="32" placeholder="Enter nation title..." />
                </div>
                <div class="nation-input-group">
                  <label class="nation-label">HOMELAND CAPITAL PROVINCE</label>
                  <div class="nation-region-picker-row">
                    <div class="nation-region-badge-wrap">
                      <span class="nation-region-dot">●</span>
                      <span id="studio-region-status" class="nation-region-status">HOMELAND INTENT: SECTOR [625, 145]</span>
                    </div>
                    <button id="studio-btn-pick-region" class="nation-btn-pick" type="button">
                      <span>✛ CALIBRATE ON GLOBE</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Section 2: State Color Palette -->
              <div class="nation-card-section">
                <div class="nation-section-header">
                  <span class="nation-section-icon">🎨</span>
                  <span class="nation-section-title">STATE COLOR HARMONY</span>
                </div>
                <div class="nation-color-pickers-row">
                  <div class="color-chip-wrap">
                    <input id="studio-color-primary" type="color" value="#0369a1" />
                    <span class="color-chip-label">PRIMARY</span>
                  </div>
                  <div class="color-chip-wrap">
                    <input id="studio-color-secondary" type="color" value="#f59e0b" />
                    <span class="color-chip-label">SECONDARY</span>
                  </div>
                  <div class="color-chip-wrap">
                    <input id="studio-color-accent" type="color" value="#ffffff" />
                    <span class="color-chip-label">ACCENT</span>
                  </div>
                </div>
              </div>

              <!-- Section 3: Flag Field Layout -->
              <div class="nation-card-section">
                <div class="nation-section-header">
                  <span class="nation-section-icon">🚩</span>
                  <span class="nation-section-title">FLAG FIELD LAYOUT</span>
                </div>
                <div id="studio-layout-grid" class="nation-options-grid">
                  <button class="nation-opt-btn active" data-layout="triband-h" type="button">Triband H</button>
                  <button class="nation-opt-btn" data-layout="triband-v" type="button">Triband V</button>
                  <button class="nation-opt-btn" data-layout="bicolor-h" type="button">Bicolor H</button>
                  <button class="nation-opt-btn" data-layout="bicolor-v" type="button">Bicolor V</button>
                  <button class="nation-opt-btn" data-layout="cross" type="button">Cross</button>
                  <button class="nation-opt-btn" data-layout="center-field" type="button">Center</button>
                  <button class="nation-opt-btn" data-layout="solid" type="button">Solid</button>
                  <button class="nation-opt-btn" data-layout="canton" type="button">Canton</button>
                </div>
              </div>

              <!-- Section 4: Heraldic Emblem -->
              <div class="nation-card-section">
                <div class="nation-section-header">
                  <span class="nation-section-icon">⚔</span>
                  <span class="nation-section-title">HERALDIC EMBLEM</span>
                </div>
                <div id="studio-emblem-grid" class="nation-options-grid">
                  <button class="nation-opt-btn active" data-emblem="star" type="button">Star</button>
                  <button class="nation-opt-btn" data-emblem="crescent-star" type="button">Crescent</button>
                  <button class="nation-opt-btn" data-emblem="eagle" type="button">Eagle</button>
                  <button class="nation-opt-btn" data-emblem="lion" type="button">Lion</button>
                  <button class="nation-opt-btn" data-emblem="sun" type="button">Sun</button>
                  <button class="nation-opt-btn" data-emblem="dragon" type="button">Dragon</button>
                  <button class="nation-opt-btn" data-emblem="spearhead" type="button">Spear</button>
                  <button class="nation-opt-btn" data-emblem="pyramid" type="button">Pyramid</button>
                </div>
              </div>

              <!-- Section 5: Strategic Military Doctrine Vector -->
              <div class="nation-card-section">
                <div class="nation-section-header nation-section-header--space">
                  <div class="nation-header-lead">
                    <span class="nation-section-icon">⚖</span>
                    <span class="nation-section-title">MILITARY DOCTRINE BUDGET</span>
                  </div>
                  <span id="studio-budget-indicator" class="nation-budget-pill">BUDGET BALANCED: 0 / 0</span>
                </div>
                <div class="nation-sliders-list">
                  <div class="nation-slider-row">
                    <span class="nation-axis-tag">OFFENSE</span>
                    <input id="studio-slider-offense" type="range" min="-6" max="6" value="0" />
                    <span id="studio-val-offense" class="nation-val-tag">0</span>
                  </div>
                  <div class="nation-slider-row">
                    <span class="nation-axis-tag">DEFENSE</span>
                    <input id="studio-slider-defense" type="range" min="-6" max="6" value="0" />
                    <span id="studio-val-defense" class="nation-val-tag">0</span>
                  </div>
                  <div class="nation-slider-row">
                    <span class="nation-axis-tag">EXPANSION</span>
                    <input id="studio-slider-expansion" type="range" min="-6" max="6" value="0" />
                    <span id="studio-val-expansion" class="nation-val-tag">0</span>
                  </div>
                  <div class="nation-slider-row">
                    <span class="nation-axis-tag">MARITIME</span>
                    <input id="studio-slider-maritime" type="range" min="-6" max="6" value="0" />
                    <span id="studio-val-maritime" class="nation-val-tag">0</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Dual Vexillology Pedestal & Commission -->
            <div class="nation-studio-preview">
              <div class="nation-preview-top">
                <span class="nation-preview-title">AUTHORITATIVE DUAL VEXILLOLOGY</span>
                <span class="nation-preview-subtitle">ENSIGN & COMMAND STANDARD</span>
              </div>

              <div class="nation-studio-stage">
                <!-- Standard Rectangular Flag (3:2) -->
                <div class="nation-stage-pedestal">
                  <span class="nation-pedestal-label">NATIONAL ENSIGN (3:2)</span>
                  <div id="studio-flag-rect-hero" class="nation-studio-rect-hero"></div>
                </div>
                <!-- Vertical Command Pennant -->
                <div class="nation-stage-pedestal">
                  <span class="nation-pedestal-label">COMMAND PENNANT</span>
                  <div id="studio-flag-pennant-hero" class="nation-studio-pennant-hero"></div>
                </div>
              </div>

              <!-- Action CTAs -->
              <div class="nation-studio-actions">
                <button id="btn-studio-save-use" class="civ-btn-continue-hero" style="width: 100%; height: 48px;" type="button">
                  <span>DEPLOY CUSTOM NATION →</span>
                </button>
                <button id="btn-studio-cancel" class="nation-btn-cancel" type="button">
                  <span>DISCARD & RETURN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Minimized Bar Shown When Picking Region Directly on Map -->
      <div id="studio-minim-banner" class="civ-minim-region-banner" style="display: none; position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 130;">
        <span class="civ-minim-text">✛ CLICK ANY PLAYABLE LAND REGION ON THE ATLAS</span>
        <button type="button" id="btn-studio-restore" class="civ-btn-restore">RETURN TO STUDIO</button>
      </div>
    `;

    document.body.appendChild(container);
    this.root = container;

    // Populate carousel and contest pill
    this.renderHomeCarousel();
    this.updateContestPill();
  }

  private renderHomeCarousel(): void {
    const container = document.getElementById('civ-home-carousel');
    if (!container) return;

    container.innerHTML = '';
    const total = CURATED_CIVILIZATION_PRESETS.length;
    if (total === 0) return;

    const prevIdx = (this.selectedIndex - 1 + total) % total;
    const currIdx = this.selectedIndex;
    const nextIdx = (this.selectedIndex + 1) % total;

    const indices = [prevIdx, currIdx, nextIdx];

    indices.forEach(idx => {
      const preset = CURATED_CIVILIZATION_PRESETS[idx];
      const isSelected = idx === currIdx;
      const identity = PRESET_NATION_IDENTITIES[preset.id] || {
        id: preset.id,
        name: preset.displayName,
        layout: (preset.flagDescriptor.layout as FlagLayout) || 'solid',
        primaryColor: preset.flagDescriptor.primaryColor,
        secondaryColor: preset.flagDescriptor.secondaryColor,
        accentColor: preset.flagDescriptor.accentColor,
        emblem: (preset.flagDescriptor.emblem as EmblemType) || 'star',
      };

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `civ-home-card ${isSelected ? 'civ-home-card--selected' : ''}`;
      card.dataset.index = String(idx);
      card.setAttribute('aria-label', `${preset.displayName}: ${preset.identityTraits.join(', ')}`);

      // Exactly 3 traits
      const traitsStr = preset.identityTraits.join(' · ');

      // Art mark: check if stage 1 normal artwork thumb exists, else render mini flag
      const stage1Art = getStageArtwork(preset.id, 1, false);
      const hasThumb = stage1Art && stage1Art.status === 'COMPLETED' && stage1Art.thumbUrl;

      const artHtml = hasThumb
        ? `<img src="${stage1Art.thumbUrl}" alt="${preset.displayName}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : renderMiniFlagSvg(identity, 32, 22);

      card.innerHTML = `
        <div class="civ-home-card-header">
          <div class="civ-home-card-pennant">
            ${renderPennantSvg(identity, 12, 20)}
          </div>
          <strong class="civ-home-card-name">${preset.displayName}</strong>
        </div>
        <div class="civ-home-card-body">
          <div class="civ-home-card-art">
            ${artHtml}
          </div>
          <div class="civ-home-card-traits">
            ${traitsStr}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (idx !== this.selectedIndex) {
          this.selectPreset(idx, true);
        } else {
          this.openDetailModal();
        }
      });

      container.appendChild(card);
    });
  }

  public openCivilizationAtlas(): void {
    this.isAtlasOpen = true;
    const screen = document.getElementById('civ-atlas-screen');
    const bottomConsole = document.querySelector('.civ-bottom-console') as HTMLElement | null;
    if (screen) {
      screen.hidden = false;
      screen.style.display = 'flex';
    }
    if (bottomConsole) {
      bottomConsole.style.visibility = 'hidden';
      bottomConsole.style.pointerEvents = 'none';
    }

    this.renderer()?.globe.setAtlasMode(true);
    this.renderAtlasFilters();
    this.updateAtlasVisibleRegions();
    this.renderAtlasInspector();
    this.renderAtlasCardsStrip();

    // Rotate to current selection
    const preset = CURATED_CIVILIZATION_PRESETS[this.selectedIndex];
    if (preset?.homelandCoords) {
      this.renderer()?.globe.rotateToLocation(
        preset.homelandCoords.lon,
        preset.homelandCoords.lat,
        850
      );
      const [label, subRegion] = preset.homelandRegionName.split(' / ');
      this.renderer()?.globe.setHomelandAnchor({
        civId: preset.id,
        lon: preset.homelandCoords.lon,
        lat: preset.homelandCoords.lat,
        label: label ? label.trim() : preset.displayName,
        subRegion: subRegion ? subRegion.trim() : undefined,
      });
    }
  }

  public closeCivilizationAtlas(): void {
    this.isAtlasOpen = false;
    const screen = document.getElementById('civ-atlas-screen');
    const bottomConsole = document.querySelector('.civ-bottom-console') as HTMLElement | null;
    if (screen) {
      screen.hidden = true;
      screen.style.display = 'none';
    }
    if (bottomConsole) {
      bottomConsole.style.visibility = 'visible';
      bottomConsole.style.pointerEvents = 'auto';
    }

    this.renderer()?.globe.setAtlasMode(false);
    this.renderer()?.globe.setHoveredRegion(null);
    this.selectPreset(this.selectedIndex, false);
  }

  private updateAtlasVisibleRegions(): void {
    const results = searchCivilizations(this.atlasSearchQuery, this.activeAtlasFilter);
    const civIds = results.map(r => r.id);
    this.renderer()?.globe.setAtlasVisibleRegions(civIds);
  }

  private renderAtlasFilters(): void {
    const track = document.getElementById('civ-atlas-filters');
    if (!track) return;
    track.innerHTML = '';

    const filterList = ['ALL', ...MACRO_REGIONS];

    filterList.forEach(region => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `civ-atlas-filter-chip ${region === this.activeAtlasFilter ? 'civ-atlas-filter-chip--active' : ''}`;
      chip.textContent = region;
      chip.addEventListener('click', () => {
        this.activeAtlasFilter = region;
        this.renderAtlasFilters();
        this.updateAtlasVisibleRegions();
        this.renderAtlasCardsStrip();
      });
      track.appendChild(chip);
    });
  }

  private renderAtlasInspector(): void {
    const inspector = document.getElementById('civ-atlas-inspector');
    if (!inspector) return;

    const preset = CURATED_CIVILIZATION_PRESETS[this.selectedIndex];
    const civRegion = CIVILIZATION_BY_ID[preset.id];
    const identity = PRESET_NATION_IDENTITIES[preset.id] || {
      id: preset.id,
      name: preset.displayName,
      layout: (preset.flagDescriptor.layout as FlagLayout) || 'solid',
      primaryColor: preset.flagDescriptor.primaryColor,
      secondaryColor: preset.flagDescriptor.secondaryColor,
      accentColor: preset.flagDescriptor.accentColor,
      emblem: (preset.flagDescriptor.emblem as EmblemType) || 'star',
    };

    const traits = preset.identityTraits;
    const desc = preset.shortTagline;

    inspector.innerHTML = `
      <div class="civ-atlas-insp-header">
        <div class="civ-atlas-insp-titles">
          <span class="civ-atlas-insp-region-badge">${civRegion?.macroRegion || 'GLOBAL'}</span>
          <h2 class="civ-atlas-insp-name">${preset.displayName}</h2>
          <span class="civ-atlas-insp-core">${civRegion?.historicalCoreLabel || preset.homelandRegionName}</span>
        </div>
        <div class="civ-atlas-insp-flag-duo">
          <div class="identity-flag-frame" style="width: 72px; height: 48px;">
            ${renderFlagSvg(identity, 72, 48)}
          </div>
          <div class="identity-pennant-frame" style="width: 28px; height: 48px;">
            ${renderPennantSvg(identity, 28, 48)}
          </div>
        </div>
      </div>

      <div class="civ-atlas-insp-traits-row">
        ${traits.map(t => `<span class="civ-atlas-trait-pill">${t}</span>`).join('')}
      </div>

      <p class="civ-atlas-insp-desc">
        ${desc}
      </p>

      <div class="civ-atlas-insp-doctrine-box">
        <span class="civ-atlas-doctrine-title">DOCTRINE PROFILE</span>
        <div class="civ-warroom-doctrine-gauge">
          ${CivilizationSelector.renderDoctrineGaugeHtml(preset.doctrine, 'compact')}
        </div>
      </div>

      <div class="civ-atlas-insp-actions">
        <button id="btn-atlas-inspect-detail" class="civ-atlas-btn-view-civ" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>VIEW CIVILIZATION</span>
        </button>
        <button id="btn-atlas-continue" class="civ-btn-continue-hero civ-atlas-btn-continue" type="button">
          <span>CONTINUE WITH ${preset.displayName} →</span>
        </button>
      </div>
    `;

    inspector.querySelector('#btn-atlas-inspect-detail')?.addEventListener('click', () => {
      this.openDetailModal();
    });

    inspector.querySelector('#btn-atlas-continue')?.addEventListener('click', () => {
      this.closeCivilizationAtlas();
      this.openMatchQueueModal();
    });
  }

  private renderAtlasCardsStrip(): void {
    const strip = document.getElementById('civ-atlas-cards-strip');
    const countLabel = document.getElementById('civ-atlas-count-label');
    if (!strip) return;

    const filtered = searchCivilizations(this.atlasSearchQuery, this.activeAtlasFilter);
    if (countLabel) {
      countLabel.textContent = `${filtered.length} CIVILIZATIONS`;
    }

    strip.innerHTML = '';

    filtered.forEach(civ => {
      const idx = CURATED_CIVILIZATION_PRESETS.findIndex(p => p.id === civ.id);
      const isSelected = idx === this.selectedIndex;
      const identity = PRESET_NATION_IDENTITIES[civ.id];

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `civ-atlas-strip-card ${isSelected ? 'civ-atlas-strip-card--selected' : ''}`;
      card.dataset.civId = civ.id;

      card.innerHTML = `
        <div class="civ-atlas-strip-card-top">
          <div style="width: 12px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${identity ? renderPennantSvg(identity, 12, 18) : ''}
          </div>
          <strong class="civ-atlas-strip-card-name">${civ.displayName}</strong>
        </div>
        <div class="civ-atlas-strip-card-traits">
          ${civ.identityTraits.join(' · ')}
        </div>
      `;

      card.addEventListener('click', () => {
        if (idx >= 0) {
          this.selectPreset(idx, true);
        }
      });

      strip.appendChild(card);
    });

    this.updateAtlasCardsStripSelection();
  }

  private updateAtlasCardsStripSelection(): void {
    const strip = document.getElementById('civ-atlas-cards-strip');
    if (!strip) return;

    const currentCivId = CURATED_CIVILIZATION_PRESETS[this.selectedIndex]?.id;
    strip.querySelectorAll('.civ-atlas-strip-card').forEach(c => {
      const el = c as HTMLElement;
      if (el.dataset.civId === currentCivId) {
        el.classList.add('civ-atlas-strip-card--selected');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        el.classList.remove('civ-atlas-strip-card--selected');
      }
    });
  }

  public getSelectedIndex(): number {
    return this.selectedIndex;
  }

  public selectPreset(index: number, panCamera = true): void {
    this.selectedIndex = Math.max(0, Math.min(CURATED_CIVILIZATION_PRESETS.length - 1, index));

    const preset = CURATED_CIVILIZATION_PRESETS[this.selectedIndex];
    const identity = PRESET_NATION_IDENTITIES[preset.id] || {
      id: preset.id,
      name: preset.displayName,
      layout: (preset.flagDescriptor.layout as FlagLayout) || 'solid',
      primaryColor: preset.flagDescriptor.primaryColor,
      secondaryColor: preset.flagDescriptor.secondaryColor,
      accentColor: preset.flagDescriptor.accentColor,
      emblem: (preset.flagDescriptor.emblem as EmblemType) || 'star',
    };

    // Update capsule UI
    const nameEl = document.getElementById('civ-capsule-name');
    const playstyleEl = document.getElementById('civ-capsule-playstyle');
    const regionEl = document.getElementById('civ-capsule-region');
    const taglineEl = document.getElementById('civ-capsule-tagline');
    const rectHeroWrap = document.getElementById('civ-hero-flag-rect-wrap');
    const pennantHeroWrap = document.getElementById('civ-hero-flag-pennant-wrap');
    const continueLabel = document.getElementById('civ-continue-label');

    if (nameEl) nameEl.textContent = preset.displayName;
    if (playstyleEl) playstyleEl.textContent = preset.playstyleLabel;
    if (regionEl) regionEl.textContent = preset.homelandRegionName;
    if (taglineEl) taglineEl.textContent = preset.shortTagline;
    if (continueLabel) continueLabel.textContent = `CONTINUE WITH ${preset.displayName}`;

    // Render authoritative 120x80 Rectangular Flag and Matching 48x80 Command Pennant
    if (rectHeroWrap) {
      rectHeroWrap.innerHTML = renderFlagSvg(identity, 120, 80);
    }
    if (pennantHeroWrap) {
      pennantHeroWrap.innerHTML = renderPennantSvg(identity, 48, 80);
    }

    // Re-render compact 3-card carousel
    this.renderHomeCarousel();

    // If Atlas is open, update Atlas inspector and cards strip highlight
    if (this.isAtlasOpen) {
      this.renderAtlasInspector();
      this.updateAtlasCardsStripSelection();
    }

    // Update doctrine visualizer
    this.renderDoctrineBars(preset.doctrine);

    // Smoothly rotate globe toward this civilization's homeland using shortest rotational path
    if (panCamera && preset.homelandCoords) {
      this.renderer()?.globe.rotateToLocation(
        preset.homelandCoords.lon,
        preset.homelandCoords.lat,
        850
      );
      const [label, subRegion] = preset.homelandRegionName.split(' / ');
      this.renderer()?.globe.setHomelandAnchor({
        civId: preset.id,
        lon: preset.homelandCoords.lon,
        lat: preset.homelandCoords.lat,
        label: label ? label.trim() : preset.displayName,
        subRegion: subRegion ? subRegion.trim() : undefined,
      });
    }
  }

  /**
   * Unified DoctrineGauge renderer ensuring single visual contract across Home, Dossier, and War Room.
   */
  public static renderDoctrineGaugeHtml(doctrine: Record<DoctrineAxis, number>, variant: 'home' | 'detail' | 'compact'): string {
    const isDetail = variant === 'detail';
    const isCompact = variant === 'compact';
    const prefix = isDetail ? 'civ-modal-doc' : isCompact ? 'civ-warroom-doc' : 'civ-doctrine';

    const icons: Record<DoctrineAxis, string> = {
      offense: `<svg width="${isCompact ? 12 : 15}" height="${isCompact ? 12 : 15}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>`,
      defense: `<svg width="${isCompact ? 12 : 15}" height="${isCompact ? 12 : 15}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      expansion: `<svg width="${isCompact ? 12 : 15}" height="${isCompact ? 12 : 15}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
      maritime: `<svg width="${isCompact ? 12 : 15}" height="${isCompact ? 12 : 15}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
    };

    return DOCTRINE_AXES.map(axis => {
      const val = doctrine[axis] ?? 0;
      const sign = val > 0 ? `+${val}` : `${val}`;
      // Linear mapping from [-6, +6] to percentage [0%, 100%]. Zero tick is exactly at 50%.
      const pct = Math.max(6, Math.min(94, ((val + 6) / 12) * 100));
      const desc = getDoctrineRuleDescription(axis, val);
      const isPos = val > 0;
      const isNeg = val < 0;
      const label = isDetail ? axis.toUpperCase() : axis.slice(0, 3).toUpperCase();
      const beadClass = isPos ? 'bead-gold' : isNeg ? 'bead-crimson' : 'bead-neutral';
      const valClass = isPos ? 'val-gold' : isNeg ? 'val-crimson' : '';

      return `
        <div class="${prefix}-lane" title="${desc}">
          <div class="${prefix}-icon">${icons[axis]}</div>
          <span class="${prefix}-label">${label}</span>
          <div class="${prefix}-rail">
            <div class="${prefix}-center-tick"></div>
            <div class="civ-doctrine-illuminated-bead ${beadClass}" style="left: ${pct}%;"></div>
          </div>
          <span class="${prefix}-val ${valClass}">${sign}</span>
        </div>
      `;
    }).join('');
  }

  private renderDoctrineBars(doctrine: DoctrineModifiers = CURATED_CIVILIZATION_PRESETS[this.selectedIndex].doctrine): void {
    const container = document.getElementById('civ-doctrine-bars');
    if (!container) return;
    container.innerHTML = CivilizationSelector.renderDoctrineGaugeHtml(doctrine, 'home');
  }

  private updateContestPill(): void {
    const contest = warRoomManager.getContestState();
    const countdownEl = document.getElementById('civ-contest-countdown');
    const tagEl = document.getElementById('civ-contest-action-tag');
    if (!countdownEl || !tagEl) return;

    if (contest.isContestWindowActive) {
      countdownEl.textContent = `CONTEST ACTIVE · ${contest.countdownStr}`;
      tagEl.textContent = 'ENTER NOW';
      tagEl.style.backgroundColor = 'rgba(245, 158, 11, 0.25)';
      tagEl.style.color = '#f59e0b';
    } else {
      countdownEl.textContent = `WORLD CONTEST · ${contest.countdownStr}`;
      tagEl.textContent = 'JOIN';
      tagEl.style.backgroundColor = '';
      tagEl.style.color = '';
    }
  }

  private updateHubView(): void {
    this.updateContestPill();
    if (this.currentMode === 'MATCH_HUB') {
      this.renderWarRoomContent();
    }
  }

  public openMatchQueueModal(queueId?: string): void {
    if (queueId) this.selectedQueueId = queueId;
    warRoomManager.resetSelection(); // Do NOT auto-select; user must deliberately click
    this.setProductMode('MATCH_HUB');
    this.renderWarRoomContent();
  }

  private renderWarRoomContent(): void {
    const container = document.getElementById('civ-warroom-content');
    if (!container) return;

    const contest = warRoomManager.getContestState();
    const nextWorld = warRoomManager.getNextWorldCountdown();
    const preset = CURATED_CIVILIZATION_PRESETS[this.selectedIndex];
    const identity = PRESET_NATION_IDENTITIES[preset.id] || {
      id: preset.id,
      name: preset.displayName,
      layout: (preset.flagDescriptor.layout as FlagLayout) || 'solid',
      primaryColor: preset.flagDescriptor.primaryColor,
      secondaryColor: preset.flagDescriptor.secondaryColor,
      accentColor: preset.flagDescriptor.accentColor,
      emblem: (preset.flagDescriptor.emblem as EmblemType) || 'star',
    };

    // Update Top Header Timers
    const nwTimer = document.getElementById('warroom-next-world-timer');
    const ctTimer = document.getElementById('warroom-contest-timer-val');
    const ctPill = document.getElementById('warroom-contest-timer-pill');
    if (nwTimer) nwTimer.textContent = nextWorld.countdownStr;
    if (ctTimer) ctTimer.textContent = contest.countdownStr;
    if (ctPill) {
      if (contest.isContestWindowActive) {
        ctPill.classList.add('warroom-contest-pill--active');
      } else {
        ctPill.classList.remove('warroom-contest-pill--active');
      }
    }

    // Bottom Action Buttons
    const backBtn = document.getElementById('btn-warroom-back-atlas');
    const primaryBtn = document.getElementById('btn-warroom-primary-action') as HTMLButtonElement | null;
    const primaryLabel = document.getElementById('warroom-primary-action-label');

    if (backBtn) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        this.closeMatchQueueModal();
      };
    }

    if (contest.isContestWindowActive) {
      // ============================================================
      // CONTEST TAKEOVER STATE (3-Column Ceremonial Fullscreen Event)
      // Normal 4 worlds are completely hidden
      // ============================================================
      if (primaryBtn && primaryLabel) {
        primaryBtn.disabled = false;
        primaryLabel.textContent = 'PREPARE FOR BATTLE →';
        primaryBtn.onclick = (e) => {
          e.preventDefault();
          this.beginDominion(false, 'WORLD CONTEST');
        };
      }

      container.innerHTML = `
        <div class="warroom-contest-screen-layout">
          <!-- Left Column: Championship Countdown & Event Phase (~24%) -->
          <aside class="warroom-contest-col warroom-contest-col--left">
            <div class="contest-eyebrow">★ SYNCHRONIZED CHAMPIONSHIP ★</div>
            <h2 class="contest-headline">WORLD CONTEST</h2>
            <div class="contest-subtitle">THE ULTIMATE REALM</div>

            <div class="contest-timer-card">
              <span class="contest-timer-label">ENTRY CLOSES IN</span>
              <div class="contest-timer-digits">${contest.countdownStr}</div>
              <div class="contest-timer-sub-units">
                <span>MIN</span>
                <span>SEC</span>
              </div>
              <div class="contest-phase-track-wrap">
                <div class="contest-phase-track">
                  <div class="contest-phase-line"></div>
                  <div class="contest-phase-dot active" style="left: 45%;"></div>
                </div>
                <div class="contest-phase-labels">
                  <span>ENTRY OPEN</span>
                  <span>LOCK</span>
                  <span>START</span>
                </div>
              </div>
            </div>

            <p class="contest-lore-text">
              All sovereign civilizations converge into a single persistent continental world.
              Every province conquered alters the permanent geopolitical ledger. One world,
              one battlefield, one sovereign empire etched into history.
            </p>
          </aside>

          <!-- Center Column: Hero Ceremonial Golden World (~50%) -->
          <main class="warroom-contest-col warroom-contest-col--center">
            <div class="contest-hero-globe-wrap">
              <div class="contest-hero-globe-halo"></div>
              <img src="/assets/worlds/contest_golden_world.jpg" class="contest-hero-globe-img" alt="Ceremonial Golden World" />
              <div class="contest-hero-ceremonial-ring"></div>
            </div>
            <div class="contest-hero-cta-wrap">
              <button id="btn-contest-hero-action" class="contest-hero-primary-cta" type="button">
                <span>PREPARE FOR BATTLE →</span>
              </button>
            </div>
          </main>

          <!-- Right Column: Specs & Eternal Rewards (~26%) -->
          <aside class="warroom-contest-col warroom-contest-col--right">
            <div class="contest-specs-card">
              <div class="contest-specs-header">ENTRY STATUS</div>
              <div class="contest-spec-item">
                <span class="k">CURRENT PLAYERS</span>
                <strong class="v">237 / 400</strong>
              </div>
              <div class="contest-occupancy-track">
                <div class="contest-occupancy-fill" style="width: 59%;"></div>
              </div>
              <div class="contest-occupancy-sub">59% REALM CAPACITY COMMITTED</div>

              <div class="contest-spec-grid">
                <div class="contest-spec-item"><span class="k">CAPACITY</span><strong class="v">400 PLAYERS</strong></div>
                <div class="contest-spec-item"><span class="k">MAP</span><strong class="v">WORLD DOMINION</strong></div>
                <div class="contest-spec-item"><span class="k">VICTORY</span><strong class="v">TOTAL DOMINATION</strong></div>
                <div class="contest-spec-item"><span class="k">EXPECTED MATCH</span><strong class="v">15–25 MIN</strong></div>
              </div>

              <div class="contest-rewards-box">
                <span class="rewards-box-label">ETERNAL REWARDS</span>
                <ul class="rewards-bullet-list">
                  <li><span class="reward-icon">★</span><div><strong>LEGENDARY TITLE</strong><span>Sovereign of Sol</span></div></li>
                  <li><span class="reward-icon">🛡</span><div><strong>EXCLUSIVE HERALDRY</strong><span>Contest laurels & imperial crest</span></div></li>
                  <li><span class="reward-icon">📜</span><div><strong>ETERNAL RECORD</strong><span>Permanently inscribed on command ledger</span></div></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      `;

      // Wire Hero CTA in Contest screen
      const heroBtn = document.getElementById('btn-contest-hero-action');
      if (heroBtn) {
        heroBtn.onclick = (e) => {
          e.preventDefault();
          this.beginDominion(false, 'WORLD CONTEST');
        };
      }
    } else {
      // ============================================================
      // NORMAL WAR ROOM STATE (Civ Identity + 2x2 Grid + Detail Strip)
      // ============================================================
      const worlds = warRoomManager.getUpcomingWorlds();
      const selectedId = warRoomManager.getSelectedWorldId();
      const selectedWorld = worlds.find(w => w.id === selectedId) || null;

      // Update Primary CTA Button in Bottom Bar
      if (primaryBtn && primaryLabel) {
        if (!selectedWorld) {
          primaryBtn.disabled = true;
          primaryLabel.textContent = 'JOIN WORLD →';
          primaryBtn.onclick = null;
        } else {
          primaryBtn.disabled = false;
          primaryLabel.textContent = `JOIN ${selectedWorld.name} →`;
          primaryBtn.onclick = (e) => {
            e.preventDefault();
            this.beginDominion(false, selectedWorld.name);
          };
        }
      }

      const getCardStatus = (w: WarWorldInstance) => {
        const diffSec = Math.max(0, Math.floor((w.openTimestamp - Date.now()) / 1000));
        const mm = String(Math.floor(diffSec / 60)).padStart(2, '0');
        const ss = String(diffSec % 60).padStart(2, '0');
        if (w.status === 'STARTING') {
          return { statusText: 'STARTING SOON', timerStr: `${mm}:${ss}`, cls: 'status-starting' };
        } else if (w.status === 'OPEN') {
          const openSec = Math.min(59, Math.max(1, 60 - diffSec));
          const oss = String(openSec).padStart(2, '0');
          return { statusText: 'OPEN', timerStr: `00:${oss}`, cls: 'status-open' };
        } else {
          return { statusText: 'FORMING', timerStr: `${mm}:${ss}`, cls: 'status-forming' };
        }
      };

      const nextWorldTimer = warRoomManager.getNextWorldCountdown().countdownStr;

      const miniIcons: Record<DoctrineAxis, string> = {
        offense: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/></svg>`,
        defense: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        expansion: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
        maritime: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dfbc73" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
      };

      container.innerHTML = `
        <div class="warroom-normal-screen-layout">
          <!-- Left Column: Compact Civilization Identity (~280px width) -->
          <aside class="warroom-civ-sidebar">
            <div class="warroom-civ-card">
              <span class="warroom-sidebar-eyebrow">SOVEREIGN IDENTITY</span>
              <div class="warroom-civ-heraldry-row">
                <div class="identity-flag-frame">${renderFlagSvg(identity, 100, 66)}</div>
                <div class="identity-pennant-frame">${renderPennantSvg(identity, 38, 66)}</div>
              </div>
              <div class="warroom-civ-meta">
                <h3 class="warroom-civ-name">${preset.displayName}</h3>
                <div class="warroom-civ-playstyle">${preset.playstyleLabel}</div>
                <div class="warroom-civ-region">${preset.homelandRegionName}</div>
              </div>

              <!-- Compact Doctrine Rails -->
              <div class="warroom-doctrine-section">
                <span class="warroom-section-label">DOCTRINE PROFILE</span>
                <div class="civ-warroom-doctrine-gauge">
                  ${CivilizationSelector.renderDoctrineGaugeHtml(preset.doctrine, 'compact')}
                </div>
              </div>

              <button id="btn-warroom-change-civ" class="warroom-btn-change-civ" type="button">
                <span>← CHANGE CIVILIZATION</span>
              </button>
            </div>
          </aside>

          <!-- Right Column: UPCOMING WORLDS (2x2 Grid with Large Cinematic Images ~65% of Card) -->
          <section class="warroom-realms-section">
            <div class="warroom-section-header-bar">
              <span class="warroom-section-title">UPCOMING WORLDS</span>
              <div class="warroom-header-next-timer">
                <span class="next-label">NEXT WORLD IN:</span>
                <span class="next-countdown">${nextWorldTimer}</span>
              </div>
            </div>

            <!-- 2x2 Grid of 4 Scheduled Worlds -->
            <div class="warroom-grid-2x2">
              ${worlds.map(w => {
                const isSel = w.id === selectedId;
                const status = getCardStatus(w);

                return `
                  <div class="warroom-world-card ${isSel ? 'warroom-world-card--selected' : ''}" data-world-id="${w.id}">
                    <!-- Top: Large Cinematic World/Terrain Image (~65% of card) -->
                    <div class="warroom-card-image-wrap">
                      <img src="${w.thumbnailUrl}" class="warroom-card-image" alt="${w.name}" />
                      <div class="warroom-card-image-overlay"></div>
                      <div class="warroom-card-status-badge ${status.cls}">${status.statusText}</div>
                      ${isSel ? `<div class="warroom-card-selected-pip">✦ SELECTED</div>` : ''}
                    </div>

                    <!-- Bottom: Compact Specs & Info (~35% of card) -->
                    <div class="warroom-card-info-pane">
                      <div class="warroom-card-row-1">
                        <strong class="warroom-card-world-id">${w.name}</strong>
                        <span class="warroom-card-ping-badge">${w.latencyMs} ms</span>
                      </div>
                      <div class="warroom-card-theater-name">${w.theaterName}</div>
                      <div class="warroom-card-row-2">
                        <div class="warroom-card-starts-in">
                          <span class="warroom-card-starts-label">STARTS IN</span>
                          <span class="warroom-card-starts-val">${status.timerStr}</span>
                        </div>
                        <div class="warroom-card-players-count">
                          <span>${w.playerCount} / ${w.maxPlayers} PLAYERS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Bottom Selected World Detail Rail (74-85px) -->
            <div class="warroom-bottom-prompt-bar">
              ${selectedWorld ? `
                <div class="warroom-selected-specs-summary">
                  <div class="specs-summary-lead">
                    <strong class="specs-title">${selectedWorld.name}</strong>
                    <span class="specs-theater-badge">${selectedWorld.theaterName}</span>
                  </div>
                  <div class="specs-rail-items">
                    <div class="specs-rail-cell"><span class="k">MAP</span><span class="v">${selectedWorld.mapSize.toUpperCase()}</span></div>
                    <div class="specs-rail-cell"><span class="k">PLAYERS</span><span class="v">${selectedWorld.playerCount} / ${selectedWorld.maxPlayers}</span></div>
                    <div class="specs-rail-cell"><span class="k">START</span><span class="v">${getCardStatus(selectedWorld).timerStr}</span></div>
                    <div class="specs-rail-cell"><span class="k">CLIMATE</span><span class="v">${selectedWorld.climate.toUpperCase()}</span></div>
                    <div class="specs-rail-cell"><span class="k">VICTORY</span><span class="v">DOMINATION</span></div>
                    <div class="specs-rail-cell"><span class="k">PING</span><span class="v" style="color:#38bdf8">${selectedWorld.latencyMs} ms</span></div>
                  </div>
                </div>
              ` : `
                <span class="warroom-unselected-prompt">Select a world to inspect strategic terrain and join the realm.</span>
              `}
            </div>
          </section>
        </div>
      `;

      // Attach Card Click Selection Handlers
      container.querySelectorAll('.warroom-world-card').forEach(card => {
        card.addEventListener('click', () => {
          const wId = (card as HTMLElement).dataset.worldId;
          if (wId) {
            warRoomManager.selectWorld(wId);
            this.renderWarRoomContent();
          }
        });
      });

      // Change Civ Button
      document.getElementById('btn-warroom-change-civ')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeMatchQueueModal();
      });
    }
  }

  private closeMatchQueueModal(): void {
    this.setProductMode('ATLAS_HOME');
  }

  private openNationStudio(): void {
    this.setProductMode('NATION_STUDIO');
    this.updateStudioPreview();
  }

  private closeNationStudio(): void {
    this.setProductMode('ATLAS_HOME');
    this.selectPreset(this.selectedIndex, false);
  }

  private updateStudioPreview(): void {
    const nameInput = document.getElementById('studio-input-name') as HTMLInputElement | null;
    const colorPrim = document.getElementById('studio-color-primary') as HTMLInputElement | null;
    const colorSec = document.getElementById('studio-color-secondary') as HTMLInputElement | null;
    const colorAcc = document.getElementById('studio-color-accent') as HTMLInputElement | null;

    if (nameInput) this.customIdentity.name = nameInput.value || 'Sol Commonwealth';
    if (colorPrim) {
      this.customIdentity.primaryColor = colorPrim.value;
      this.customNation.politicalColor = colorPrim.value;
    }
    if (colorSec) this.customIdentity.secondaryColor = colorSec.value;
    if (colorAcc) this.customIdentity.accentColor = colorAcc.value;

    // Render Large Rectangular Flag (Hero) + Command Pennant (Hero)
    const rectStage = document.getElementById('studio-flag-rect-hero');
    const pennantStage = document.getElementById('studio-flag-pennant-hero');

    if (rectStage) rectStage.innerHTML = renderFlagSvg(this.customIdentity, 270, 180);
    if (pennantStage) pennantStage.innerHTML = renderPennantSvg(this.customIdentity, 80, 224);

    // Update Sliders
    for (const axis of DOCTRINE_AXES) {
      const slider = document.getElementById(`studio-slider-${axis}`) as HTMLInputElement | null;
      const valEl = document.getElementById(`studio-val-${axis}`);
      if (slider && valEl) {
        const val = this.customNation.doctrine[axis];
        slider.value = String(val);
        valEl.textContent = val > 0 ? `+${val}` : `${val}`;
        valEl.className = `nation-val-tag ${val > 0 ? 'pos' : val < 0 ? 'neg' : ''}`;
      }
    }

    const indicator = document.getElementById('studio-budget-indicator');
    if (indicator) {
      const sum = this.customNation.doctrine.offense +
                  this.customNation.doctrine.defense +
                  this.customNation.doctrine.expansion +
                  this.customNation.doctrine.maritime;
      indicator.textContent = sum === 0 ? 'BUDGET BALANCED: 0 / 0' : `BUDGET IMBALANCE: ${sum}`;
      indicator.className = `nation-budget-pill ${sum === 0 ? 'balanced' : 'imbalance'}`;
    }
  }

  public openDetailModal(): void {
    const idx = (typeof this.selectedIndex === 'number' && this.selectedIndex >= 0 && this.selectedIndex < CURATED_CIVILIZATION_PRESETS.length) ? this.selectedIndex : 0;
    const preset = CURATED_CIVILIZATION_PRESETS[idx];
    const modal = document.getElementById('civ-detail-modal');
    if (!modal) return;

    const titleEl = document.getElementById('civ-modal-title');
    const subEl = document.getElementById('civ-modal-subtitle');
    const cultureImg = document.getElementById('civ-modal-culture-img') as HTMLImageElement | null;
    const stagePending = document.getElementById('civ-modal-stage-pending');
    const stageBadge = document.getElementById('civ-modal-stage-badge');
    const briefTitleEl = document.getElementById('civ-modal-stage-brief-title');
    const popScaleEl = document.getElementById('civ-modal-stage-pop-scale');
    const flagBadge = document.getElementById('civ-modal-flag-badge');
    const progRow = document.getElementById('civ-progression-row');
    const docDisplay = document.getElementById('civ-modal-doctrine-display');
    const advList = document.getElementById('civ-modal-adv-list');
    const penList = document.getElementById('civ-modal-pen-list');

    if (titleEl) titleEl.textContent = preset.displayName;
    if (subEl) subEl.textContent = `${preset.playstyleLabel} · ${preset.homelandRegionName.toUpperCase()}`;

    if (flagBadge) {
      flagBadge.style.backgroundColor = 'transparent';
      flagBadge.style.boxShadow = 'none';
      const identity = PRESET_NATION_IDENTITIES[preset.id] || {
        id: preset.id,
        name: preset.displayName,
        layout: (preset.flagDescriptor.layout as FlagLayout) || 'solid',
        primaryColor: preset.flagDescriptor.primaryColor,
        secondaryColor: preset.flagDescriptor.secondaryColor,
        accentColor: preset.flagDescriptor.accentColor,
        emblem: (preset.flagDescriptor.emblem as EmblemType) || 'star',
      };
      flagBadge.innerHTML = renderFlagSvg(identity, 48, 32);
    }

    // Progression Tiers (Strict 5 Era Stages)
    const normalTiers = preset.progressionTiers.filter(t => !t.isDefeat).slice(0, 5);
    let selectedStageIndex = 3; // Default to Stage IV
    let isDefeatState = false;

    const btnNormal = document.getElementById('btn-stage-normal');
    const btnDefeat = document.getElementById('btn-stage-defeat');

    // Authoritative stage display updater - SYNCHRONOUS AND DETERMINISTIC
    const updateStageDisplay = () => {
      const tier = normalTiers[selectedStageIndex] || normalTiers[0];
      const stageNum = selectedStageIndex + 1;
      const artwork = getStageArtwork(preset.id, stageNum, isDefeatState);

      if (artwork.status === 'COMPLETED' && artwork.artUrl) {
        if (cultureImg) {
          cultureImg.src = artwork.artUrl;
          cultureImg.style.display = 'block';
          cultureImg.style.filter = 'none';
        }
        if (stagePending) {
          stagePending.style.display = 'none';
        }
      } else {
        if (cultureImg) {
          cultureImg.style.display = 'none';
        }
        if (stagePending) {
          stagePending.style.display = 'flex';
          stagePending.innerHTML = `
            <div class="civ-stage-pending-card">
              <div class="civ-stage-pending-eyebrow">
                <span class="civ-stage-pending-tag">AI GENERATION QUEUED</span>
              </div>
              <h4 class="civ-stage-pending-title">${artwork.stageTitle}</h4>
              <p class="civ-stage-pending-brief">${artwork.architecturalBrief}</p>
            </div>
          `;
        }
      }

      if (stageBadge && tier) {
        stageBadge.textContent = `STAGE ${tier.numeral} · ${isDefeatState ? 'WAR DEFEAT RUIN' : artwork.eraName.toUpperCase()}`;
        stageBadge.className = `civ-modal-stage-badge ${isDefeatState ? 'badge-defeat' : 'badge-normal'}`;
      }

      if (briefTitleEl) {
        briefTitleEl.textContent = artwork.stageTitle;
      }
      if (popScaleEl) {
        popScaleEl.textContent = `STAGE ${tier.numeral} · ~100M POPULATION SCALE`;
      }

      btnNormal?.classList.toggle('active', !isDefeatState);
      btnDefeat?.classList.toggle('active', isDefeatState);
    };

    // Progression thumbnails: rendered with equal width, clean STAGE I-V numerals only
    const renderProgressionThumbs = () => {
      if (!progRow) return;
      progRow.innerHTML = normalTiers.map((tier, idx) => {
        const stageNum = idx + 1;
        const artwork = getStageArtwork(preset.id, stageNum, isDefeatState);
        const isActive = idx === selectedStageIndex;

        const thumbContent = (artwork.status === 'COMPLETED' && artwork.thumbUrl)
          ? `<img src="${artwork.thumbUrl}" alt="${tier.name}" class="civ-prog-thumb-img" />`
          : `<div class="civ-prog-thumb-pending"><span>${tier.numeral}</span><span style="font-size:7px;opacity:0.7">QUEUED</span></div>`;

        return `
          <div class="civ-prog-thumb ${isActive ? 'civ-prog-thumb--active' : ''} ${isDefeatState ? 'civ-prog-thumb--defeat' : ''}" data-tier-idx="${idx}">
            <div class="civ-prog-thumb-img-box">
              ${thumbContent}
            </div>
            <div class="civ-prog-thumb-label">
              <span class="civ-prog-numeral">STAGE ${tier.numeral}</span>
            </div>
          </div>
        `;
      }).join('');

      progRow.querySelectorAll('.civ-prog-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
          progRow.querySelectorAll('.civ-prog-thumb').forEach(t => t.classList.remove('civ-prog-thumb--active'));
          thumb.classList.add('civ-prog-thumb--active');
          selectedStageIndex = Number((thumb as HTMLElement).dataset.tierIdx || '0');
          updateStageDisplay();
        });
      });
    };

    // Wire up Prosperity / War Defeat Segmented Buttons
    if (btnNormal) {
      btnNormal.onclick = (e) => {
        e.preventDefault();
        isDefeatState = false;
        renderProgressionThumbs();
        updateStageDisplay();
      };
    }

    if (btnDefeat) {
      btnDefeat.onclick = (e) => {
        e.preventDefault();
        isDefeatState = true;
        renderProgressionThumbs();
        updateStageDisplay();
      };
    }

    renderProgressionThumbs();
    updateStageDisplay();

    // 4-Lane Doctrine Profile Rails (Unified DoctrineGauge with illuminated beads)
    if (docDisplay) {
      docDisplay.innerHTML = CivilizationSelector.renderDoctrineGaugeHtml(preset.doctrine, 'detail');
    }

    // Strengths (Lighter rows without individual heavy box frames)
    if (advList && preset.advantages) {
      advList.innerHTML = preset.advantages.map(a => {
        const parts = a.text.split(': ');
        const headline = parts[0] || 'Strength';
        const body = parts.slice(1).join(': ') || a.text;
        return `
          <li class="civ-bullet-item civ-bullet-item--adv">
            <span class="civ-bullet-icon civ-bullet-icon--adv">${getAdvantageIconSvg(a.icon, false)}</span>
            <div class="civ-bullet-content">
              <strong class="civ-bullet-headline">${headline}</strong>
              <span class="civ-bullet-desc">${body}</span>
            </div>
          </li>
        `;
      }).join('');
    }

    // Tradeoffs (Lighter rows without individual heavy box frames)
    if (penList && preset.penalties) {
      penList.innerHTML = preset.penalties.map(p => {
        const parts = p.text.split(': ');
        const headline = parts[0] || 'Tradeoff';
        const body = parts.slice(1).join(': ') || p.text;
        return `
          <li class="civ-bullet-item civ-bullet-item--pen">
            <span class="civ-bullet-icon civ-bullet-icon--pen">${getAdvantageIconSvg(p.icon, true)}</span>
            <div class="civ-bullet-content">
              <strong class="civ-bullet-headline">${headline}</strong>
              <span class="civ-bullet-desc">${body}</span>
            </div>
          </li>
        `;
      }).join('');
    }

    this.isDetailModalOpen = true;
    uiStateManager.setState('CIV_INSPECT_STATE');
  }

  public closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.setProductMode(this.currentMode);
  }

  public beginDominion(isCustom = false, matchContext = 'ONLINE REALM'): void {
    let chosenStartCell: number;
    if (isCustom) {
      chosenStartCell = this.customNation.startCell;
    } else {
      chosenStartCell = CURATED_CIVILIZATION_PRESETS[this.selectedIndex].candidateStartCell;
    }

    const userNationName = accountService.getAccount().displayName;
    const chosenPreset = CURATED_CIVILIZATION_PRESETS[this.selectedIndex];
    if (!isCustom && chosenPreset) {
      accountService.setFavoriteCivilization(chosenPreset.displayName);
    }

    const nationData = isCustom ? {
      name: this.customIdentity.name || userNationName,
      flagId: 'flag_custom',
      color: this.customNation.politicalColor,
      startCell: chosenStartCell,
      doctrine: this.customNation.doctrine,
    } : {
      name: userNationName || chosenPreset.displayName,
      flagId: chosenPreset.flagId,
      color: chosenPreset.politicalColor,
      startCell: chosenStartCell,
      doctrine: chosenPreset.doctrine,
    };

    localStorage.setItem('dominion.nation', nationData.name);
    localStorage.setItem('dominion.flag', nationData.flagId);
    localStorage.setItem('dominion.color', nationData.color);
    localStorage.setItem('dominion.startCell', String(nationData.startCell));
    localStorage.setItem('dominion.sessionStarted', 'true');

    for (const axis of DOCTRINE_AXES) {
      const val = nationData.doctrine[axis];
      localStorage.setItem(`dominion.doctrine.${axis}`, (val / 100).toFixed(4));
    }

    this.isDetailModalOpen = false;
    matchmakingHub.leaveQueue();

    // Clear homeland halo and globe boundary immediately
    this.renderer()?.clearHomelandHalo();
    this.renderer()?.globe.setHomelandAnchor(null);

    console.log(`[DOMINION] Match launched into ${matchContext} for nation ${nationData.name} at startCell ${nationData.startCell}`);
    this.setProductMode('MATCH_ACTIVE');

    window.setTimeout(() => {
      this.renderer()?.centerOnPlayerCapital();
    }, 300);

    try {
      gameClient.sendPlayerJoin('NEW_MATCH');
    } catch (e) {
      console.warn('[CIV] GameClient sendPlayerJoin call:', e);
    }
  }

  public returnToAtlas(): void {
    matchWithdrawalDialog.close();
    gameState.activeFrontId = 0;
    gameState.spotlightFactionId = null;
    gameState.clearSelection();
    gameClient.currentMatchId = null;
    (window as any).__DOMINION_MATCH_ID__ = null;
    this.renderer()?.clearMatchPresentation();
    (window as any).__DOMINION_COMMAND_UI__?.dismissToast();
    this.setProductMode('ATLAS_HOME');
    this.selectPreset(this.selectedIndex, false);
    this.renderer()?.fitWorldToScreen();
  }

  private bindEvents(): void {
    // First-Time Entry & Meta Account binding
    const inputNationName = document.getElementById('civ-input-nation-name') as HTMLInputElement | null;
    const tagPill = document.getElementById('civ-player-tag-pill');
    const topProfName = document.getElementById('civ-top-profile-name');
    const topProfTag = document.getElementById('civ-top-profile-tag');
    const topMarks = document.getElementById('civ-top-armory-marks');

    const refreshMetaUI = () => {
      const acc = accountService.getAccount();
      if (inputNationName && document.activeElement !== inputNationName) {
        inputNationName.value = acc.displayName;
      }
      if (tagPill) tagPill.textContent = acc.playerTag;
      if (topProfName) topProfName.textContent = acc.displayName;
      if (topProfTag) topProfTag.textContent = acc.playerTag;
      if (topMarks) topMarks.textContent = walletService.getBalance().toLocaleString();
    };

    refreshMetaUI();

    inputNationName?.addEventListener('input', () => {
      accountService.setNationDisplayName(inputNationName.value);
      const acc = accountService.getAccount();
      if (topProfName) topProfName.textContent = acc.displayName;
    });

    inputNationName?.addEventListener('blur', () => {
      accountService.setNationDisplayName(inputNationName.value);
      refreshMetaUI();
    });

    document.getElementById('btn-civ-profile')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { playerProfileModal } = await import('./PlayerProfileModal');
      playerProfileModal.open();
    });

    document.getElementById('btn-civ-reactions')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { playerProfileModal } = await import('./PlayerProfileModal');
      playerProfileModal.open('COLLECTION', 'REACTIONS');
    });

    document.getElementById('btn-civ-armory')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { sovereignArmory } = await import('./SovereignArmory');
      sovereignArmory.open();
    });

    document.getElementById('btn-civ-dev-lab')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { devCommerceLab } = await import('./DevCommerceLab');
      devCommerceLab.open();
    });

    document.addEventListener('dominion:account-changed', refreshMetaUI);
    document.addEventListener('dominion:wallet-changed', refreshMetaUI);

    // Primary CTA: CONTINUE WITH [CIV] -> opens War Room
    document.getElementById('btn-continue-with-civ')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openMatchQueueModal();
    });

    // 3-Card Carousel Navigation Buttons
    document.getElementById('btn-carousel-prev')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const total = CURATED_CIVILIZATION_PRESETS.length;
      this.selectPreset((this.selectedIndex - 1 + total) % total, true);
    });

    document.getElementById('btn-carousel-next')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const total = CURATED_CIVILIZATION_PRESETS.length;
      this.selectPreset((this.selectedIndex + 1) % total, true);
    });

    // Horizontal Mouse Wheel & Touch on Home Carousel
    const homeCarousel = document.getElementById('civ-home-carousel');
    homeCarousel?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const total = CURATED_CIVILIZATION_PRESETS.length;
      if (e.deltaY > 8 || e.deltaX > 8) {
        this.selectPreset((this.selectedIndex + 1) % total, true);
      } else if (e.deltaY < -8 || e.deltaX < -8) {
        this.selectPreset((this.selectedIndex - 1 + total) % total, true);
      }
    }, { passive: false });

    let touchStartX = 0;
    homeCarousel?.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    homeCarousel?.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      const total = CURATED_CIVILIZATION_PRESETS.length;
      if (diff > 25) {
        this.selectPreset((this.selectedIndex + 1) % total, true);
      } else if (diff < -25) {
        this.selectPreset((this.selectedIndex - 1 + total) % total, true);
      }
    }, { passive: true });

    // Open Atlas Button
    document.getElementById('btn-open-atlas')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openCivilizationAtlas();
    });

    // Custom Nation Studio Button
    document.getElementById('btn-open-custom-studio')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openNationStudio();
    });

    // Atlas Header: Return to Home
    document.getElementById('btn-atlas-back-home')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeCivilizationAtlas();
    });

    // Atlas Search Bar
    const searchInput = document.getElementById('civ-atlas-search-input') as HTMLInputElement | null;
    const searchClear = document.getElementById('btn-atlas-search-clear') as HTMLButtonElement | null;
    searchInput?.addEventListener('input', () => {
      this.atlasSearchQuery = searchInput.value;
      if (searchClear) searchClear.hidden = !this.atlasSearchQuery;
      this.updateAtlasVisibleRegions();
      this.renderAtlasCardsStrip();
    });
    searchClear?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.atlasSearchQuery = '';
      searchClear.hidden = true;
      this.updateAtlasVisibleRegions();
      this.renderAtlasCardsStrip();
    });

    // Interactive Globe Clicking & Hover in Atlas Mode
    const globeCanvas = document.querySelector('canvas');
    if (globeCanvas) {
      globeCanvas.addEventListener('pointermove', (e: PointerEvent) => {
        if (!this.isAtlasOpen) return;
        const results = searchCivilizations(this.atlasSearchQuery, this.activeAtlasFilter);
        const civIds = results.map(r => r.id);
        const hitCivId = this.renderer()?.globe.getHomelandRegionAtScreen(e.clientX, e.clientY, civIds);
        this.renderer()?.globe.setHoveredRegion(hitCivId);
        globeCanvas.style.cursor = hitCivId ? 'pointer' : '';
      });

      globeCanvas.addEventListener('click', (e: MouseEvent) => {
        if (!this.isAtlasOpen) return;
        const results = searchCivilizations(this.atlasSearchQuery, this.activeAtlasFilter);
        const civIds = results.map(r => r.id);
        const hitCivId = this.renderer()?.globe.getHomelandRegionAtScreen(e.clientX, e.clientY, civIds);
        if (hitCivId) {
          const foundIdx = CURATED_CIVILIZATION_PRESETS.findIndex(p => p.id === hitCivId);
          if (foundIdx >= 0) {
            this.selectPreset(foundIdx, true);
          }
        }
      });
    }

    // War Room Change Civilization button -> returns to Home
    document.getElementById('btn-warroom-change-civ')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeMatchQueueModal();
    });

    // Inspect
    document.getElementById('btn-inspect-civ')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openDetailModal();
    });

    // Modal Close Footer
    const closeCivFooterBtn = document.getElementById('btn-modal-close-footer');
    closeCivFooterBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeDetailModal();
    });

    // Modal Enter War Room Footer
    const modalPlayOnlineBtn = document.getElementById('btn-modal-enter-warroom');
    modalPlayOnlineBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeDetailModal();
      this.openMatchQueueModal();
    });

    // Top Bar Projection Toggles
    const btnFlat = document.getElementById('btn-top-flat');
    const btnGlobe = document.getElementById('btn-top-globe');
    btnFlat?.addEventListener('click', () => {
      this.renderer()?.setGlobeMode(false);
      btnFlat.classList.add('active');
      btnGlobe?.classList.remove('active');
    });
    btnGlobe?.addEventListener('click', () => {
      this.renderer()?.setGlobeMode(true);
      btnGlobe.classList.add('active');
      btnFlat?.classList.remove('active');
    });

    // Top Bar Layer Toggles
    const btnPol = document.getElementById('btn-top-pol');
    const btnTer = document.getElementById('btn-top-ter');
    btnPol?.addEventListener('click', () => {
      this.renderer()?.setMapMode('POLITICAL');
      btnPol.classList.add('active');
      btnTer?.classList.remove('active');
    });
    btnTer?.addEventListener('click', () => {
      this.renderer()?.setMapMode('TERRAIN');
      btnTer.classList.add('active');
      btnPol?.classList.remove('active');
    });



    // Listen for map country inspect clicks
    document.addEventListener('dominion:inspect-civilization', (e: any) => {
      const detail = e.detail;
      const name = (detail?.displayName || '').toUpperCase();
      const foundIdx = CURATED_CIVILIZATION_PRESETS.findIndex(p =>
        name.includes(p.displayName) || p.displayName.includes(name) || p.id === detail?.flagId?.replace('flag_', '')
      );
      if (foundIdx >= 0) {
        this.selectPreset(foundIdx, false);
      }
      this.openDetailModal();
    });

    // Detail Modal Frame: stop propagation so clicks never leak to canvas or backdrop
    const modalFrame = document.querySelector('.civ-modal-frame');
    modalFrame?.addEventListener('pointerdown', (e) => e.stopPropagation());
    modalFrame?.addEventListener('click', (e) => e.stopPropagation());

    // Detail Modal Close Button
    const closeCivBtn = document.getElementById('btn-close-civ-modal');
    closeCivBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeDetailModal();
    });

    // Detail Modal Backdrop Click
    document.getElementById('civ-detail-modal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'civ-detail-modal') {
        e.preventDefault();
        e.stopPropagation();
        this.closeDetailModal();
      }
    });

    // Play Online -> Opens War Entry Lobby
    document.getElementById('btn-play-online')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openMatchQueueModal();
    });

    // World Contest Pill
    document.getElementById('civ-contest-pill')?.addEventListener('click', () => {
      this.openMatchQueueModal('contest');
    });

    // Queue Modal Actions
    document.getElementById('btn-close-queue')?.addEventListener('click', () => {
      this.closeMatchQueueModal();
    });
    document.getElementById('btn-cancel-queue')?.addEventListener('click', () => {
      this.closeMatchQueueModal();
    });
    document.getElementById('btn-enter-battle')?.addEventListener('click', () => {
      this.beginDominion(false, 'WAR ENTRY QUEUE');
    });

    // Nation Studio Controls
    document.getElementById('btn-close-studio')?.addEventListener('click', () => {
      this.closeNationStudio();
    });
    document.getElementById('btn-studio-cancel')?.addEventListener('click', () => {
      this.closeNationStudio();
    });
    document.getElementById('btn-studio-save-use')?.addEventListener('click', () => {
      this.closeNationStudio();
      this.beginDominion(true, 'CUSTOM NATION');
    });

    // Layout selection buttons
    const layoutBtns = document.querySelectorAll('#studio-layout-grid .nation-opt-btn');
    layoutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        layoutBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.customIdentity.layout = (btn.getAttribute('data-layout') as FlagLayout) || 'triband-h';
        this.updateStudioPreview();
      });
    });

    // Emblem selection buttons
    const emblemBtns = document.querySelectorAll('#studio-emblem-grid .nation-opt-btn');
    emblemBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        emblemBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.customIdentity.emblem = (btn.getAttribute('data-emblem') as EmblemType) || 'star';
        this.updateStudioPreview();
      });
    });

    // Studio Inputs
    document.getElementById('studio-input-name')?.addEventListener('input', () => this.updateStudioPreview());
    document.getElementById('studio-color-primary')?.addEventListener('input', () => this.updateStudioPreview());
    document.getElementById('studio-color-secondary')?.addEventListener('input', () => this.updateStudioPreview());
    document.getElementById('studio-color-accent')?.addEventListener('input', () => this.updateStudioPreview());

    // Studio Doctrine Sliders
    for (const axis of DOCTRINE_AXES) {
      document.getElementById(`studio-slider-${axis}`)?.addEventListener('input', (e) => {
        const val = Number((e.target as HTMLInputElement).value);
        this.customNation.doctrine = rebalanceCustomDoctrine(this.customNation.doctrine, axis, val);
        this.updateStudioPreview();
      });
    }

    // Studio Minimize to Pick Region on Live Atlas
    document.getElementById('studio-btn-pick-region')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const studio = document.getElementById('civ-nation-studio');
      const minBanner = document.getElementById('studio-minim-banner');
      if (studio) studio.hidden = true;
      if (minBanner) minBanner.style.display = 'flex';
    });

    document.getElementById('btn-studio-restore')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const studio = document.getElementById('civ-nation-studio');
      const minBanner = document.getElementById('studio-minim-banner');
      if (studio) studio.hidden = false;
      if (minBanner) minBanner.style.display = 'none';
    });

    // Match HUD Exit Button
    document.getElementById('btn-match-exit')?.addEventListener('click', () => {
      matchWithdrawalDialog.open();
    });

    // Keyboard navigation & ESC
    window.addEventListener('keydown', (e) => {
      if (matchWithdrawalDialog.isDialogOpen()) {
        return; // Handled within MatchWithdrawalDialog
      }

      if (e.key === 'Escape') {
        if (this.isAtlasOpen) {
          this.closeCivilizationAtlas();
          return;
        }
        if (this.currentMode === 'MATCH_ACTIVE') {
          e.preventDefault();
          matchWithdrawalDialog.open();
          return;
        }
        if (this.currentMode === 'MATCH_HUB') {
          this.closeMatchQueueModal();
          return;
        }
        if (this.currentMode === 'NATION_STUDIO') {
          this.closeNationStudio();
          return;
        }
        if (this.isDetailModalOpen) {
          this.closeDetailModal();
          return;
        }
      }

      if (this.isAtlasOpen && !this.isDetailModalOpen) {
        const filtered = searchCivilizations(this.atlasSearchQuery, this.activeAtlasFilter);
        if (filtered.length > 0) {
          const curCivId = CURATED_CIVILIZATION_PRESETS[this.selectedIndex].id;
          const currentFilteredIdx = filtered.findIndex(c => c.id === curCivId);
          if (e.key === 'ArrowRight') {
            const nextFilteredIdx = (currentFilteredIdx + 1) % filtered.length;
            const targetCiv = filtered[nextFilteredIdx];
            const nextIdx = CURATED_CIVILIZATION_PRESETS.findIndex(p => p.id === targetCiv.id);
            if (nextIdx >= 0) this.selectPreset(nextIdx, true);
          } else if (e.key === 'ArrowLeft') {
            const prevFilteredIdx = (currentFilteredIdx - 1 + filtered.length) % filtered.length;
            const targetCiv = filtered[prevFilteredIdx];
            const prevIdx = CURATED_CIVILIZATION_PRESETS.findIndex(p => p.id === targetCiv.id);
            if (prevIdx >= 0) this.selectPreset(prevIdx, true);
          } else if (e.key === 'Enter') {
            this.closeCivilizationAtlas();
            this.openMatchQueueModal();
          }
        }
        return;
      }

      if (this.currentMode === 'ATLAS_HOME' && !this.isDetailModalOpen) {
        if (e.key === 'ArrowRight') {
          this.selectPreset((this.selectedIndex + 1) % CURATED_CIVILIZATION_PRESETS.length);
        } else if (e.key === 'ArrowLeft') {
          this.selectPreset((this.selectedIndex - 1 + CURATED_CIVILIZATION_PRESETS.length) % CURATED_CIVILIZATION_PRESETS.length);
        } else if (e.key === 'Enter') {
          this.openMatchQueueModal();
        }
      }
    });

    // Map Click Listener for picking start region
    gameState.subscribe((event) => {
      if (event === 'SELECTION_CHANGED' && this.currentMode === 'NATION_STUDIO') {
        const cell = gameState.selectedTargetCell ?? gameState.selectedSourceCell;
        if (cell !== null && cell >= 0) {
          this.customNation.startCell = cell;
          const wx = cell % 1024;
          const wy = Math.floor(cell / 1024);
          this.customNation.regionName = `Custom Sector (${wx}, ${wy})`;
          const status = document.getElementById('studio-region-status');
          if (status) status.textContent = `HOMELAND INTENT: SECTOR [${wx}, ${wy}]`;
          this.renderer()?.focusOnCivilizationHomeland(wx, wy, 400);

          const studio = document.getElementById('civ-nation-studio');
          const minBanner = document.getElementById('studio-minim-banner');
          if (studio) studio.hidden = false;
          if (minBanner) minBanner.style.display = 'none';
        }
      }
    });
  }

  public destroy(): void {
    if (this.unsubHub) this.unsubHub();
  }
}
