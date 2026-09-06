import { AllianceInfo, AllianceProposalInfo, AllianceResultMessage, AttackResultMessage, FactionInfo, FrontInfo, MatchStateInfo, PortResultMessage, PortStateInfo, StrategicSiteInfo, ServerMetricsMessage, WorldSnapshotMessage, CellDelta, ReinforceResultMessage } from './Types';
import type { TargetResolution } from './TargetResolver';

export const DEFAULT_MAP_WIDTH = 1024;
export const DEFAULT_MAP_HEIGHT = 512;
export const CHUNK_SIZE = 32;

export type EventType =
  | 'WORLD_SNAPSHOT'
  | 'CELL_DELTAS'
  | 'FACTIONS_CHANGED'
  | 'FRONTS_CHANGED'
  | 'SELECTION_CHANGED'
  | 'METRICS_CHANGED'
  | 'CONNECTION_CHANGED'
  | 'VISUAL_MASK_READY'
  | 'MATCH_CHANGED'
  | 'ATTACK_RESULT'
  | 'PORT_RESULT'
  | 'ALLIANCE_RESULT'
  | 'ALLIANCE_PROPOSALS';

export type Listener = (event: EventType, data?: any) => void;

declare global {
  interface Window {
    __DOMINION_GAME_STATE__?: GameState;
    __GAME_STATE_INSTANCE_COUNT__?: number;
  }
}

export class GameState {
  public tick: number = 0;
  public sequence: number = 0;
  public width: number = DEFAULT_MAP_WIDTH;
  public height: number = DEFAULT_MAP_HEIGHT;
  public totalCells: number = DEFAULT_MAP_WIDTH * DEFAULT_MAP_HEIGHT;

  public yourFactionId: number = 101; // Custom human nation is the 101st faction
  public get playerFaction(): FactionInfo | undefined {
    return this.factions.get(this.yourFactionId);
  }
  public get playerFactionId(): number {
    return this.yourFactionId;
  }
  public factions: Map<number, FactionInfo> = new Map();
  public fronts: Map<number, FrontInfo> = new Map();
  public strategicSites: StrategicSiteInfo[] = [];
  public ports: PortStateInfo[] = [];
  public alliances: AllianceInfo[] = [];
  public pendingAlliances: AllianceProposalInfo[] = [];
  public activeFrontId: number = 0;
  public matchState: MatchStateInfo = { phase: 'WAITING', winnerFactionId: null };
  public lastAttackResult: AttackResultMessage | null = null;

  public cellOwners: Uint8Array = new Uint8Array(DEFAULT_MAP_WIDTH * DEFAULT_MAP_HEIGHT);
  public cellFlags: Uint8Array = new Uint8Array(DEFAULT_MAP_WIDTH * DEFAULT_MAP_HEIGHT);
  public cellTerrains: Uint8Array = new Uint8Array(DEFAULT_MAP_WIDTH * DEFAULT_MAP_HEIGHT);

  public visualLandMask: Uint8Array | null = null;
  public visualMaskReady: boolean = false;

  public dirtyChunks: Set<number> = new Set();
  public dirtyFactions: Set<number> = new Set();
  public dirtyCells: CellDelta[] = [];
  public ownershipChanges: { index: number, oldOwner: number, newOwner: number }[] = [];

  public metrics: ServerMetricsMessage = {
    type: 'server_metrics',
    tick: 0,
    tickTimeMs: 0,
    activePlayers: 0,
    botCount: 100,
    deltasCount: 0,
    activeFronts: 0,
    ramUsageMb: 0,
  };

  public deltasReceivedTotal: number = 0;
  public isConnected: boolean = false;
  public isInitialized: boolean = false;
  public connectionStatusText: string = 'Connecting...';

  public selectedSourceCell: number | null = null;
  public selectedTargetCell: number | null = null;
  /** The last contextual land pick. Source/target cells are resolved from this target intent. */
  public selectionContext: TargetResolution | null = null;
  public hoveredNeutralCell: number | null = null;
  public populationCommitPercent = 12;
  public operationMode: 'FOCUS' | 'FRONTIER' = 'FOCUS';
  public spotlightFactionId: number | null = null;

  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.__GAME_STATE_INSTANCE_COUNT__ = (window.__GAME_STATE_INSTANCE_COUNT__ || 0) + 1;
      window.__DOMINION_GAME_STATE__ = this;
    }
  }

  public async loadVisualMask(url: string) {
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      this.visualLandMask = new Uint8Array(buffer);
      this.visualMaskReady = true;
      console.log(`[GAMESTATE] High-res visual land mask loaded.`);
      this.notify('VISUAL_MASK_READY');
    } catch (e) {
      console.error('[GAMESTATE] Failed to load visual land mask:', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(event: EventType, data?: any) {
    for (const listener of this.listeners) {
      listener(event, data);
    }
  }

  public applySnapshot(msg: WorldSnapshotMessage) {
    this.tick = msg.tick;
    this.sequence = msg.sequence;
    if (msg.width && msg.height) {
      this.width = msg.width;
      this.height = msg.height;
      this.totalCells = msg.totalCells || (msg.width * msg.height);
    }
    if (msg.yourFactionId) {
      this.yourFactionId = msg.yourFactionId;
    }
    this.isInitialized = true;

    if (this.cellOwners.length !== this.totalCells) {
      this.cellOwners = new Uint8Array(this.totalCells);
      this.cellFlags = new Uint8Array(this.totalCells);
      this.cellTerrains = new Uint8Array(this.totalCells);
    }

    this.factions.clear();
    for (const faction of msg.factions) {
      const fId = faction.factionId ?? (faction as any).faction_id;
      this.factions.set(fId, {
        ...faction,
        factionId: fId,
        displayName: faction.displayName ?? (faction as any).display_name,
        factionColor: faction.factionColor ?? (faction as any).faction_color,
        colorInt: faction.colorInt ?? (faction as any).color_int,
        flagId: faction.flagId ?? (faction as any).flag_id,
        capitalCell: faction.capitalCell ?? (faction as any).capital_cell,
        population: faction.population ?? (faction as any).population ?? 0,
        populationCapacity: faction.populationCapacity ?? (faction as any).population_capacity ?? 0,
        populationGrowthPerSecond: faction.populationGrowthPerSecond ?? (faction as any).population_growth_per_second ?? 0,
        deployedPopulation: faction.deployedPopulation ?? (faction as any).deployed_population ?? 0,
        totalLivingPopulation: faction.totalLivingPopulation ?? (faction as any).total_living_population ?? 0,
        controlledAreaKm2: faction.controlledAreaKm2 ?? (faction as any).controlled_area_km2 ?? 0,
        effectiveControlledAreaKm2: faction.effectiveControlledAreaKm2 ?? (faction as any).effective_controlled_area_km2 ?? 0,
        portsCount: faction.portsCount ?? (faction as any).ports_count ?? 0,
        doctrineOffense: faction.doctrineOffense ?? (faction as any).doctrine_offense ?? 0,
        doctrineDefense: faction.doctrineDefense ?? (faction as any).doctrine_defense ?? 0,
        doctrineExpansion: faction.doctrineExpansion ?? (faction as any).doctrine_expansion ?? 0,
        doctrineMaritime: faction.doctrineMaritime ?? (faction as any).doctrine_maritime ?? 0,
        flagDescriptor: faction.flagDescriptor ?? (faction as any).flag_descriptor ?? null,
        nationPresetId: faction.nationPresetId ?? (faction as any).nation_preset_id ?? 'custom',
        territoryCount: faction.territoryCount ?? (faction as any).territory_count,
        isHuman: faction.isHuman ?? (faction as any).is_human,
        isEliminated: faction.isEliminated ?? (faction as any).is_eliminated ?? false,
      });
    }

    this.fronts.clear();
    if (msg.fronts) {
      for (const front of msg.fronts) {
        const frontId = front.frontId ?? (front as any).front_id;
        this.fronts.set(frontId, {
          ...front,
          frontId: frontId,
          factionA: front.factionA ?? (front as any).faction_a,
          factionB: front.factionB ?? (front as any).faction_b,
          deployedPopulationA: front.deployedPopulationA ?? (front as any).deployed_population_a ?? 0,
          deployedPopulationB: front.deployedPopulationB ?? (front as any).deployed_population_b ?? 0,
          pressure: front.pressure ?? 0,
          centroidX: front.centroidX ?? (front as any).centroid_x,
          centroidY: front.centroidY ?? (front as any).centroid_y,
          normalX: front.normalX ?? (front as any).normal_x ?? 1,
          normalY: front.normalY ?? (front as any).normal_y ?? 0,
          isCombatActive: front.isCombatActive ?? (front as any).is_combat_active ?? false,
          attackerFaction: front.attackerFaction ?? (front as any).attacker_faction ?? 0,
          attackMode: front.attackMode ?? (front as any).attack_mode ?? 'none',
          startedTick: front.startedTick ?? (front as any).started_tick ?? 0,
          capturedCells: front.capturedCells ?? (front as any).captured_cells ?? 0,
          terminationReason: front.terminationReason ?? (front as any).termination_reason ?? 'IDLE',
          sourceCellIndex: front.sourceCellIndex ?? (front as any).source_cell_index ?? 0,
          targetCellIndex: front.targetCellIndex ?? (front as any).target_cell_index ?? 0,
          intentTargetCellIndex: front.intentTargetCellIndex ?? (front as any).intent_target_cell_index ?? front.targetCellIndex ?? (front as any).target_cell_index ?? 0,
          localDefensePopulation: front.localDefensePopulation ?? (front as any).local_defense_population ?? 0,
          defenseFocusPopulation: front.defenseFocusPopulation ?? (front as any).defense_focus_population ?? 0,
          sharedLocalForcePopulation: front.sharedLocalForcePopulation ?? (front as any).shared_local_force_population ?? 0,
          casualties: front.casualties ?? 0,
          operationKind: front.operationKind ?? (front as any).operation_kind ?? 'LAND_OFFENSIVE',
        });
      }
    }

    this.strategicSites = (msg.strategicSites ?? []).map(site => ({
      ...site,
      cellA: site.cellA ?? (site as any).cell_a,
      cellB: site.cellB ?? (site as any).cell_b,
      strategicValue: site.strategicValue ?? (site as any).strategic_value ?? 0,
    }));
    this.ports = (msg.ports ?? []).map(port => ({
      ...port,
      cellIndex: port.cellIndex ?? (port as any).cell_index,
      ownerId: port.ownerId ?? (port as any).owner_id,
      remainingSeconds: port.remainingSeconds ?? (port as any).remaining_seconds ?? 0,
    }));
    this.alliances = (msg.alliances ?? []).map(alliance => ({
      ...alliance,
      allianceId: alliance.allianceId ?? (alliance as any).alliance_id,
      members: alliance.members ?? [],
    }));
    this.pendingAlliances = (msg.pendingAlliances ?? (msg as any).pending_alliances ?? []).map((proposal: any) => ({
      proposalId: proposal.proposalId ?? proposal.proposal_id,
      proposer: proposal.proposer,
      target: proposal.target,
    }));
    this.matchState = msg.matchState ?? (msg as any).match_state ?? { phase: 'RUNNING', winnerFactionId: null };
    const rawMatchId = (this.matchState as any).match_id ?? (this.matchState as any).matchId;
    if (rawMatchId && typeof window !== 'undefined') {
      (window as any).__DOMINION_MATCH_ID__ = rawMatchId;
      if ((window as any).__DOMINION_GAME_CLIENT__) {
        (window as any).__DOMINION_GAME_CLIENT__.currentMatchId = rawMatchId;
      }
    }
    const rawPhase = (this.matchState as any).phase;
    if (rawPhase && typeof window !== 'undefined') {
      (window as any).__DOMINION_MATCH_PHASE__ = rawPhase;
      if ((window as any).__DOMINION_GAME_CLIENT__) {
        (window as any).__DOMINION_GAME_CLIENT__.currentMatchPhase = rawPhase;
      }
    }

    let solOwnedCount = 0;
    let totalOwnedCount = 0;
    let ownedWaterCellCount = 0;

    for (const cell of msg.cells) {
      const idx = cell.index;
      const owner = cell.ownerId !== undefined ? cell.ownerId : (cell as any).owner_id ?? 0;
      const terrain = cell.terrain !== undefined ? cell.terrain : (cell as any).terrain ?? 0;
      const flags = cell.flags !== undefined ? cell.flags : (cell as any).flags ?? 0;

      if (idx < this.totalCells) {
        this.cellOwners[idx] = owner;
        this.cellFlags[idx] = flags;
        this.cellTerrains[idx] = terrain;

        if (owner === this.yourFactionId) solOwnedCount++;
        if (owner > 0) {
            totalOwnedCount++;
            if (terrain === 2) {
                ownedWaterCellCount++;
            }
        }
      }
    }

    // Mark all chunks dirty on full snapshot
    const totalChunks = (this.width / CHUNK_SIZE) * (this.height / CHUNK_SIZE);
    for (let c = 0; c < totalChunks; c++) {
      this.dirtyChunks.add(c);
    }

    console.log(`[DOMINION 101-NATION] Snapshot: ${this.width}x${this.height} (${this.totalCells} cells), Player(${this.yourFactionId})=${solOwnedCount} cells, Total Owned=${totalOwnedCount}`);
    console.log(`[DOMINION SERVER INVARIANT] Owned WATER cells: ${ownedWaterCellCount}`);

    this.notify('WORLD_SNAPSHOT');
  }

  public applyDeltas(deltas: CellDelta[], tick: number, sequence: number, fronts?: FrontInfo[], matchState?: MatchStateInfo, pendingAlliances?: AllianceProposalInfo[]) {
    this.tick = tick;
    this.sequence = sequence;
    this.deltasReceivedTotal += deltas.length;

    const chunksX = this.width / CHUNK_SIZE;
    this.ownershipChanges = [];

    for (const delta of deltas) {
      const idx = delta.index;
      const owner = delta.ownerId !== undefined ? delta.ownerId : (delta as any).owner_id ?? 0;
      const flags = delta.flags !== undefined ? delta.flags : (delta as any).flags ?? 0;

      if (idx < this.totalCells) {
        const oldOwner = this.cellOwners[idx];
        if (oldOwner !== owner) {
            if (oldOwner > 0) this.dirtyFactions.add(oldOwner);
            if (owner > 0) this.dirtyFactions.add(owner);
            this.ownershipChanges.push({ index: idx, oldOwner, newOwner: owner });
        }
        this.cellOwners[idx] = owner;
        this.cellFlags[idx] = flags;

        // Mark local chunk and its 3x3 neighborhood dirty
        const x = idx % this.width;
        const y = Math.floor(idx / this.width);
        const cx = Math.floor(x / CHUNK_SIZE);
        const cy = Math.floor(y / CHUNK_SIZE);
        const chunksY = Math.ceil(this.height / CHUNK_SIZE);
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < chunksX && ny >= 0 && ny < chunksY) {
                    const chunkId = ny * chunksX + nx;
                    this.dirtyChunks.add(chunkId);
                }
            }
        }
      }
    }

    if (fronts) {
      const activeIds = new Set<number>();
      for (const front of fronts) {
        const frontId = front.frontId ?? (front as any).front_id;
        const isActive = front.isCombatActive ?? (front as any).is_combat_active ?? false;
        const termReason = front.terminationReason ?? (front as any).termination_reason ?? 'IDLE';

        if (isActive && termReason === 'IDLE') {
          activeIds.add(frontId);
          this.fronts.set(frontId, {
            ...front,
            frontId: frontId,
            factionA: front.factionA ?? (front as any).faction_a,
            factionB: front.factionB ?? (front as any).faction_b,
            deployedPopulationA: front.deployedPopulationA ?? (front as any).deployed_population_a ?? 0,
            deployedPopulationB: front.deployedPopulationB ?? (front as any).deployed_population_b ?? 0,
            pressure: front.pressure ?? 0,
            centroidX: front.centroidX ?? (front as any).centroid_x,
            centroidY: front.centroidY ?? (front as any).centroid_y,
            normalX: front.normalX ?? (front as any).normal_x ?? 1,
            normalY: front.normalY ?? (front as any).normal_y ?? 0,
            isCombatActive: true,
            attackerFaction: front.attackerFaction ?? (front as any).attacker_faction ?? 0,
            attackMode: front.attackMode ?? (front as any).attack_mode ?? 'none',
            startedTick: front.startedTick ?? (front as any).started_tick ?? 0,
            capturedCells: front.capturedCells ?? (front as any).captured_cells ?? 0,
            terminationReason: 'IDLE',
            sourceCellIndex: front.sourceCellIndex ?? (front as any).source_cell_index ?? 0,
            targetCellIndex: front.targetCellIndex ?? (front as any).target_cell_index ?? 0,
            intentTargetCellIndex: front.intentTargetCellIndex ?? (front as any).intent_target_cell_index ?? front.targetCellIndex ?? (front as any).target_cell_index ?? 0,
            localDefensePopulation: front.localDefensePopulation ?? (front as any).local_defense_population ?? 0,
            defenseFocusPopulation: front.defenseFocusPopulation ?? (front as any).defense_focus_population ?? 0,
            sharedLocalForcePopulation: front.sharedLocalForcePopulation ?? (front as any).shared_local_force_population ?? 0,
            casualties: front.casualties ?? 0,
            operationKind: front.operationKind ?? (front as any).operation_kind ?? 'LAND_OFFENSIVE',
            frontStatus: front.frontStatus ?? (front as any).front_status ?? 'CONTESTED',
            cohesion: front.cohesion ?? (front as any).cohesion ?? 1.0,
            supplyEfficiency: front.supplyEfficiency ?? (front as any).supply_efficiency ?? 1.0,
          });
        } else {
          this.fronts.delete(frontId);
        }
      }
      for (const existingId of [...this.fronts.keys()]) {
        if (!activeIds.has(existingId)) {
          this.fronts.delete(existingId);
        }
      }
      if (this.activeFrontId > 0 && !activeIds.has(this.activeFrontId)) {
        this.activeFrontId = 0;
      }
    }

    if (matchState) {
      this.matchState = matchState;
      this.notify('MATCH_CHANGED');
    }
    this.applyAllianceProposals(pendingAlliances);

    this.dirtyCells = deltas;

    // Ownership progressed while the player was looking at an old border.
    // Do not leave a hostile-order card pointing at newly owned land.
    if (this.selectionContext && this.selectedTargetCell !== null
        && this.cellOwners[this.selectedTargetCell] === this.yourFactionId) {
      this.selectionContext = null;
      this.selectedSourceCell = null;
      this.selectedTargetCell = null;
    }

    this.notify('CELL_DELTAS');
    this.dirtyChunks.clear();
    this.dirtyFactions.clear();
    this.dirtyCells = [];
  }

  public applyAllianceProposals(proposals: AllianceProposalInfo[] | undefined) {
    if (!proposals) return;
    this.pendingAlliances = proposals.map((proposal: any) => ({
      proposalId: proposal.proposalId ?? proposal.proposal_id,
      proposer: proposal.proposer,
      target: proposal.target,
    }));
    this.notify('ALLIANCE_PROPOSALS');
  }

  public applyMetrics(msg: ServerMetricsMessage) {
    this.metrics = msg;
    this.notify('METRICS_CHANGED');
  }

  public setConnectionStatus(connected: boolean, statusText: string) {
    this.isConnected = connected;
    this.connectionStatusText = statusText;
    this.notify('CONNECTION_CHANGED');
  }

  public applyAttackResult(result: AttackResultMessage) {
    this.lastAttackResult = result;
    if (result.accepted && result.frontId) this.activeFrontId = result.frontId;
    this.notify('ATTACK_RESULT', result);
  }

  public applyPortResult(result: PortResultMessage) {
    if (result.accepted) {
      const existing = this.ports.find(port => port.cellIndex === result.cellIndex);
      if (existing) {
        existing.remainingSeconds = result.remainingSeconds;
        existing.complete = result.remainingSeconds <= 0;
      } else {
        this.ports.push({
          cellIndex: result.cellIndex,
          ownerId: this.yourFactionId,
          complete: result.remainingSeconds <= 0,
          remainingSeconds: result.remainingSeconds,
        });
      }
    }
    this.notify('PORT_RESULT', result);
  }

  public applyAllianceResult(result: AllianceResultMessage) {
    if (result.accepted && result.allianceId && !this.alliances.some(alliance => alliance.allianceId === result.allianceId)) {
      this.alliances.push({ allianceId: result.allianceId, members: [this.yourFactionId, result.factionId] });
    }
    this.notify('ALLIANCE_RESULT', result);
  }

  public applyReinforceResult(result: ReinforceResultMessage) {
    this.notify('ATTACK_RESULT', result);
  }

  public attackLegality(source: number | null, target: number | null): { legal: boolean; reason: string } {
    if (!this.isConnected) return { legal: false, reason: 'Disconnected' };
    if (this.matchState.phase === 'FINISHED') return { legal: false, reason: 'Match finished' };
    if (source === null || target === null) return { legal: false, reason: 'Select hostile land to choose an attack point' };
    if (this.cellOwners[source] !== this.yourFactionId) return { legal: false, reason: 'This attack point is no longer yours' };
    if (this.cellTerrains[target] === 2 || this.cellOwners[target] === 0) return { legal: false, reason: 'Target must be enemy land' };
    if (this.cellOwners[target] === this.yourFactionId) return { legal: false, reason: 'Choose an opposing territory' };
    if (!this.factions.get(this.yourFactionId) || this.factions.get(this.yourFactionId)?.isEliminated) return { legal: false, reason: 'Your faction is defeated' };
    if (this.factions.get(this.cellOwners[target])?.isEliminated) return { legal: false, reason: 'Target faction is defeated' };
    const x = target % this.width;
    const y = Math.floor(target / this.width);
    const neighbors: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= this.height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (x + dx + this.width) % this.width;
        neighbors.push(ny * this.width + nx);
      }
    }
    if (!neighbors.includes(source)) return { legal: false, reason: 'No legal shared frontier at this point' };
    const population = this.factions.get(this.yourFactionId)?.population ?? 0;
    if (population * (this.populationCommitPercent / 100) < 50) return { legal: false, reason: 'Insufficient Population' };
    return { legal: true, reason: 'Attack point confirmed · choose Population deployment' };
  }

  public expansionLegality(target: number | null): { legal: boolean; reason: string } {
    if (!this.isConnected) return { legal: false, reason: 'Disconnected' };
    if (this.matchState.phase === 'FINISHED') return { legal: false, reason: 'Match finished' };
    if (target === null) return { legal: false, reason: 'Select neutral land' };
    if (target < 0 || target >= this.totalCells) return { legal: false, reason: 'Invalid frontier' };
    if (this.cellOwners[target] !== 0) return { legal: false, reason: 'Frontier is already claimed' };
    if (this.cellTerrains[target] === 2) return { legal: false, reason: 'Water cannot be claimed' };
    const player = this.factions.get(this.yourFactionId);
    if (!player || player.isEliminated) return { legal: false, reason: 'Your faction is defeated' };
    if (!this.checkNeutralAdjacency(target)) return { legal: false, reason: 'No reachable frontier' };
    if ((player.population ?? 0) < 450) return { legal: false, reason: 'Insufficient Population' };
    return { legal: true, reason: 'Neutral point reachable · commit Population' };
  }

  public selectCell(cellIndex: number) {
    const owner = this.cellOwners[cellIndex];
    if (this.selectedSourceCell === null) {
      if (owner === this.yourFactionId) {
        this.selectedSourceCell = cellIndex;
      }
    } else if (this.selectedTargetCell === null) {
      if (owner !== this.yourFactionId && owner > 0) {
        this.selectedTargetCell = cellIndex;
      } else if (owner === 0 && this.cellTerrains[cellIndex] !== 2) {
        this.selectedTargetCell = cellIndex;
      } else {
        this.selectedSourceCell = cellIndex;
      }
    } else {
      this.selectedSourceCell = cellIndex;
      this.selectedTargetCell = null;
    }
    this.spotlightFactionId = (this.selectedTargetCell !== null && this.cellOwners[this.selectedTargetCell] > 0)
      ? this.cellOwners[this.selectedTargetCell]
      : (this.selectedSourceCell !== null && this.cellOwners[this.selectedSourceCell] > 0)
        ? this.cellOwners[this.selectedSourceCell]
        : null;
    this.notify('SELECTION_CHANGED');
  }

  /**
   * Apply the deterministic target-first selection result produced by the
   * visual-to-gameplay resolver. The legacy selectCell/selectTarget methods
   * remain available only for old test fixtures; production pointer input
   * enters through this method.
   */
  public selectContext(context: TargetResolution, keepSpotlight: boolean = true): void {
    this.selectionContext = context;
    this.selectedSourceCell = context.sourceCell;
    this.selectedTargetCell = context.targetCell;
    const isHostile = context.action === 'LAUNCH_OFFENSIVE' || context.action === 'EXPAND_FRONTIER';
    this.spotlightFactionId = (keepSpotlight && !isHostile && context.ownerId > 0) ? context.ownerId : null;
    this.notify('SELECTION_CHANGED', context);
  }

  public clearSelection() {
    this.selectedSourceCell = null;
    this.selectedTargetCell = null;
    this.selectionContext = null;
    this.spotlightFactionId = null;
    if (typeof window !== 'undefined') {
      (window as any).__DOMINION_COUNTRY_DOSSIER__?.clearInspection();
    }
    this.notify('SELECTION_CHANGED');
  }

  public selectTarget(index: number) {
    this.selectedTargetCell = index;
    this.selectionContext = null;
    this.spotlightFactionId = index >= 0 && this.cellOwners[index] > 0 ? this.cellOwners[index] : null;
    this.notify('SELECTION_CHANGED');
  }

  public checkNeutralAdjacency(cellIndex: number): boolean {
    if (cellIndex < 0 || cellIndex >= this.totalCells) return false;
    
    const owner = this.cellOwners[cellIndex];
    const terrain = this.cellTerrains[cellIndex];

    if (owner !== 0 || terrain === 2) return false;

    const cx = cellIndex % this.width;
    const cy = Math.floor(cellIndex / this.width);

    for (let dy = -1; dy <= 1; dy++) {
      const ny = cy + dy;
      if (ny < 0 || ny >= this.height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (cx + dx + this.width) % this.width;
        const nIdx = ny * this.width + nx;
        if (this.cellOwners[nIdx] === this.yourFactionId && this.cellTerrains[nIdx] !== 2) {
          return true;
        }
      }
    }
    return false;
  }

}

export const gameState: GameState = (typeof window !== 'undefined' && window.__DOMINION_GAME_STATE__) || new GameState();
