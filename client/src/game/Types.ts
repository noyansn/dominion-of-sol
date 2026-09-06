export interface FlagDescriptor {
  layout: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emblem: string;
}

export interface FactionInfo {
  factionId: number;
  displayName: string;
  factionColor: string;
  colorInt: number;
  flagId: string;
  flagDescriptor?: FlagDescriptor | null;
  nationPresetId?: string;
  homelandRegion?: string;
  capitalCell: number;
  population: number;
  populationCapacity: number;
  populationGrowthPerSecond: number;
  deployedPopulation: number;
  totalLivingPopulation: number;
  controlledAreaKm2: number;
  effectiveControlledAreaKm2: number;
  portsCount: number;
  doctrineOffense: number;
  doctrineDefense: number;
  doctrineExpansion: number;
  doctrineMaritime: number;
  territoryCount: number;
  isHuman: boolean;
  isEliminated: boolean;
}

export interface FrontInfo {
  frontId: number;
  factionA: number;
  factionB: number;
  deployedPopulationA: number;
  deployedPopulationB: number;
  pressure: number; // -1.0 to +1.0
  centroidX: number;
  centroidY: number;
  normalX: number;
  normalY: number;
  isCombatActive: boolean;
  attackerFaction: number;
  attackMode: string;
  startedTick: number;
  capturedCells: number;
  terminationReason: string;
  sourceCellIndex: number;
  targetCellIndex: number;
  /** Original clicked destination retained by the authoritative operation. */
  intentTargetCellIndex?: number;
  localDefensePopulation: number;
  defenseFocusPopulation: number;
  sharedLocalForcePopulation?: number;
  casualties: number;
  operationKind: string;
  survivorsReturned?: boolean;
  cohesion?: number;
  supplyEfficiency?: number;
  frontStatus?: string;
}

export interface MatchStateInfo {
  phase: 'WAITING' | 'RUNNING' | 'FINISHED' | string;
  winnerFactionId?: number | null;
  matchId?: string;
  match_id?: string;
}

export interface StrategicSiteInfo {
  id: string;
  name: string;
  kind: 'PORT' | 'STRAIT' | 'CANAL';
  cellA: number;
  cellB?: number | null;
  strategicValue: number;
}

export interface PortStateInfo {
  cellIndex: number;
  ownerId: number;
  complete: boolean;
  remainingSeconds: number;
}

export interface AllianceInfo {
  allianceId: number;
  members: number[];
}

export interface AllianceProposalInfo {
  proposalId: number;
  proposer: number;
  target: number;
}

export interface CellState {
  index: number;
  ownerId: number;
  terrain: number;
  flags: number;
}

export interface CellDelta {
  index: number;
  ownerId: number;
  flags: number;
}

export interface WorldSnapshotMessage {
  type: 'world_snapshot';
  tick: number;
  sequence: number;
  width: number;
  height: number;
  totalCells: number;
  yourFactionId: number;
  factions: FactionInfo[];
  fronts: FrontInfo[];
  matchState: MatchStateInfo;
  strategicSites: StrategicSiteInfo[];
  ports: PortStateInfo[];
  alliances: AllianceInfo[];
  pendingAlliances?: AllianceProposalInfo[];
  cells: CellState[];
}

export interface CellDeltaBatchMessage {
  type: 'cell_delta_batch';
  tick: number;
  sequence: number;
  deltas: CellDelta[];
  fronts: FrontInfo[];
  matchState: MatchStateInfo;
  pendingAlliances?: AllianceProposalInfo[];
}

export interface ServerMetricsMessage {
  type: 'server_metrics';
  tick: number;
  tickTimeMs: number;
  activePlayers: number;
  botCount: number;
  deltasCount: number;
  activeFronts: number;
  ramUsageMb: number;
}

export interface FactionUpdateMessage {
  type: 'faction_update';
  factions: FactionInfo[];
  ports?: PortStateInfo[];
  alliances?: AllianceInfo[];
  pendingAlliances?: AllianceProposalInfo[];
}

export interface FirstContactMessage {
  type: 'first_contact';
  factionA: number;
  factionB: number;
  location: number;
}

export interface ExpandResultMessage {
  type: 'expand_result';
  accepted: boolean;
  requestedTarget: number;
  resolvedAnchor?: number | null;
  actualSize: number;
  populationCost: number;
  reason: string;
}

export interface AttackResultMessage {
  type: 'attack_result';
  accepted: boolean;
  sourceCellIndex: number;
  targetCellIndex: number;
  frontId?: number | null;
  deployedPopulation: number;
  reason: string;
}

export interface PortResultMessage {
  type: 'port_result';
  accepted: boolean;
  cellIndex: number;
  populationCost: number;
  remainingSeconds: number;
  reason: string;
}

export interface AllianceResultMessage {
  type: 'alliance_result';
  accepted: boolean;
  factionId: number;
  allianceId?: number | null;
  pending?: boolean;
  reason: string;
}

export interface ReinforceResultMessage {
  type: 'reinforce_result';
  accepted: boolean;
  frontId: number;
  deployedPopulation: number;
  reason: string;
}

export interface AtlasNotificationMessage {
  type: 'atlas_notification';
  eventType: string;
  factionId: number;
  cellIndex: number;
  message: string;
}

export interface ReactionBroadcastMessage {
  type: 'reaction_broadcast';
  playerFactionId: number;
  playerName: string;
  playerTag: string;
  reactionId: string;
  anchorType?: string;
  cellIndex?: number;
  frontId?: number;
  timestamp: number;
}

export interface AuthSnapshotMessage {
  type: 'auth_snapshot';
  accountId: string;
  sessionToken: string;
  playerTag: string;
  displayName: string;
  accountType: 'guest' | 'registered';
  walletBalance: number;
  entitlements: string[];
  equippedBladeSkin: string;
  reactionWheel: string[];
  isDevMode: boolean;
}

export interface AuthConflictMessage {
  type: 'auth_conflict';
  message: string;
  existingAccountId: string;
}

export interface CommerceResultMessage {
  type: 'commerce_result';
  success: boolean;
  sku: string;
  balanceAfter: number;
  error?: string;
}

export interface MetaErrorMessage {
  type: 'meta_error';
  code: string;
  message: string;
}

export type ServerMessage =
  | WorldSnapshotMessage
  | CellDeltaBatchMessage
  | ServerMetricsMessage
  | FactionUpdateMessage
  | FirstContactMessage
  | ExpandResultMessage
  | AttackResultMessage
  | PortResultMessage
  | AllianceResultMessage
  | ReinforceResultMessage
  | AtlasNotificationMessage
  | ReactionBroadcastMessage
  | AuthSnapshotMessage
  | AuthConflictMessage
  | CommerceResultMessage
  | MetaErrorMessage;
