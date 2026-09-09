import type { PortStateInfo } from './Types';
import { isVisualLand, VISUAL_MASK_WIDTH, VISUAL_MASK_HEIGHT } from '../render/VisualLandMask';
import { getVisualGameplayMapping } from './VisualGameplayMapping';
import microGapAdjacencyAsset from '../assets/world_micro_gap_adjacency_v1.json';

export type SelectionRelation =
  | 'OWN_INTERIOR'
  | 'OWN_BORDER'
  | 'OWN_COAST'
  | 'ADJACENT_NEUTRAL'
  | 'ADJACENT_HOSTILE'
  | 'REMOTE_HOSTILE'
  | 'REMOTE_NEUTRAL'
  | 'ALLY'
  | 'INVALID/WATER';

export type ContextAction =
  | 'NONE'
  | 'NEUTRAL_EXPANSION'
  | 'LAUNCH_OFFENSIVE'
  | 'AMPHIBIOUS_COLONIZATION'
  | 'DEFEND'
  | 'BUILD_PORT'
  | 'ALLIANCE_INFO';

export interface TargetResolverState {
  width: number;
  height: number;
  totalCells: number;
  cellOwners: Uint8Array;
  cellTerrains: Uint8Array;
  cellFlags: Uint8Array;
  yourFactionId: number;
  visualLandMask?: Uint8Array | null;
  visualMaskReady?: boolean;
  ports?: readonly PortStateInfo[];
  alliances?: readonly { members: readonly number[] }[];
  strategicSites?: readonly { kind: string; cellA: number }[];
  isConnected?: boolean;
  isInitialized?: boolean;
}

export interface TargetResolution {
  screenX?: number;
  screenY?: number;
  worldX: number;
  worldY: number;
  longitude: number;
  latitude: number;
  canonicalLand: boolean;
  visualComponentId: string;
  rawCell: number;
  resolvedCell: number | null;
  clickedCell: number | null;
  ownerId: number;
  relation: SelectionRelation;
  action: ContextAction;
  sourceCell: number | null;
  targetCell: number | null;
  nearestLegalAnchor: number | null;
  rejectionReason: string | null;
}

const WATER_TERRAIN = 2;
const MEANINGFUL_OVERSEAS_FLAG = 1 << 4;
const DEEP_HOSTILE_SEARCH_RADIUS = 96;

const MICRO_GAP_NEIGHBOURS = new Map<number, number[]>();
for (const edge of microGapAdjacencyAsset.edges) {
  const a = edge.cell_a;
  const b = edge.cell_b;
  const aNeighbours = MICRO_GAP_NEIGHBOURS.get(a) ?? [];
  aNeighbours.push(b);
  MICRO_GAP_NEIGHBOURS.set(a, aNeighbours);
  const bNeighbours = MICRO_GAP_NEIGHBOURS.get(b) ?? [];
  bNeighbours.push(a);
  MICRO_GAP_NEIGHBOURS.set(b, bNeighbours);
}
for (const neighboursForCell of MICRO_GAP_NEIGHBOURS.values()) {
  neighboursForCell.sort((a, b) => a - b);
}

function cellIndex(state: TargetResolverState, x: number, y: number): number {
  return y * state.width + x;
}

function inBounds(state: TargetResolverState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

function neighbours(state: TargetResolverState, cell: number): number[] {
  if (cell < 0 || cell >= state.totalCells) return [];
  const x = cell % state.width;
  const y = Math.floor(cell / state.width);
  const result: number[] = [];
  if (y > 0) result.push(cell - state.width);
  if (x + 1 < state.width) result.push(cell + 1);
  if (y + 1 < state.height) result.push(cell + state.width);
  if (x > 0) result.push(cell - 1);
  return result;
}

function neighbours8(state: TargetResolverState, cell: number): number[] {
  if (cell < 0 || cell >= state.totalCells) return [];
  const x = cell % state.width;
  const y = Math.floor(cell / state.width);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= state.height) continue;
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + state.width) % state.width;
      result.push(ny * state.width + nx);
    }
  }
  return result;
}

function legalLandNeighbours(state: TargetResolverState, cell: number): number[] {
  const result = neighbours8(state, cell)
    .filter((neighbour) => hasLegalLandConnection(state, cell, neighbour));
  for (const neighbour of MICRO_GAP_NEIGHBOURS.get(cell) ?? []) {
    if (hasLegalLandConnection(state, cell, neighbour) && !result.includes(neighbour)) {
      result.push(neighbour);
    }
  }
  return result;
}

function isCoastal(state: TargetResolverState, cell: number): boolean {
  return neighbours(state, cell).some((index) => state.cellTerrains[index] === WATER_TERRAIN);
}

function relationIsAlly(state: TargetResolverState, factionId: number): boolean {
  if (factionId <= 0 || factionId === state.yourFactionId) return false;
  return Boolean(state.alliances?.some((alliance) =>
    alliance.members.includes(state.yourFactionId) && alliance.members.includes(factionId),
  ));
}

function completeOwnPort(state: TargetResolverState, targetCell: number): number | null {
  const ports = (state.ports ?? []).filter((port) => port.ownerId === state.yourFactionId && port.complete);
  if (ports.length === 0) return null;
  return [...ports].sort((a, b) => {
    const da = cellDistance(a.cellIndex, targetCell, state.width);
    const db = cellDistance(b.cellIndex, targetCell, state.width);
    return da - db || a.cellIndex - b.cellIndex;
  })[0].cellIndex;
}

function cellDistance(a: number, b: number, width: number): number {
  return Math.abs((a % width) - (b % width)) + Math.abs(Math.floor(a / width) - Math.floor(b / width));
}

export function hasLegalLandConnection(state: TargetResolverState, a: number, b: number): boolean {
  if (a < 0 || b < 0 || a >= state.totalCells || b >= state.totalCells) return false;
  if (state.cellTerrains[a] === WATER_TERRAIN || state.cellTerrains[b] === WATER_TERRAIN) return false;
  if (a === b) return true;
  if (MICRO_GAP_NEIGHBOURS.get(a)?.includes(b) === true) return true;

  const ax = a % state.width;
  const ay = Math.floor(a / state.width);
  const bx = b % state.width;
  const by = Math.floor(b / state.width);

  let dx = bx - ax;
  if (dx > state.width / 2) dx -= state.width;
  else if (dx < -state.width / 2) dx += state.width;
  const dy = by - ay;

  if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
    return true;
  }

  if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
    const i1 = ay * state.width + ((bx + state.width) % state.width);
    const i2 = by * state.width + ((ax + state.width) % state.width);
    return state.cellTerrains[i1] !== WATER_TERRAIN || state.cellTerrains[i2] !== WATER_TERRAIN;
  }

  return false;
}

function nearestOwnNeighbour(state: TargetResolverState, cell: number, allowMicroGapTopology = false): number | null {
  const direct = neighbours(state, cell)
    .filter((index) => state.cellOwners[index] === state.yourFactionId && state.cellTerrains[index] !== WATER_TERRAIN && visualNeighbours(state, cell, index))
    .sort((a, b) => a - b)[0];
  if (direct !== undefined) return direct;

  // Fallback to legal diagonal neighbors (at least one intermediate orthogonal cell must be land)
  const candidates = allowMicroGapTopology ? legalLandNeighbours(state, cell) : neighbours8(state, cell);
  return candidates
    .filter((index) => state.cellOwners[index] === state.yourFactionId && hasLegalLandConnection(state, cell, index))
    .sort((a, b) => a - b)[0] ?? null;
}

function visualNeighbours(state: TargetResolverState, a: number, b: number): boolean {
  if (!state.visualMaskReady || !state.visualLandMask) return true;
  return getVisualGameplayMapping(state.visualLandMask, VISUAL_MASK_WIDTH, VISUAL_MASK_HEIGHT,
    state.width, state.height, state.cellTerrains).cellsShareVisualLand(a, b);
}

function nearestHostileAnchor(state: TargetResolverState, clickedCell: number, enemyId: number): { source: number; target: number } | null {
  // Search through this enemy's contiguous territory, never across neutral
  // land or water to a different enclave owned by the same faction.
  const visited = new Set<number>([clickedCell]);
  let frontier = [clickedCell];
  for (let distance = 0; frontier.length && distance <= DEEP_HOSTILE_SEARCH_RADIUS; distance++) {
    let best: { source: number; target: number; dist: number } | null = null;
    const next: number[] = [];
    for (const target of frontier) {
      const source = nearestOwnNeighbour(state, target);
      if (source !== null) {
        const d = cellDistance(target, clickedCell, state.width);
        if (!best || d < best.dist || (d === best.dist && target < best.target)) {
          best = { source, target, dist: d };
        }
      }
      for (const neighbour of neighbours(state, target)) {
        if (visited.has(neighbour) || state.cellOwners[neighbour] !== enemyId || state.cellTerrains[neighbour] === WATER_TERRAIN
            || !visualNeighbours(state, target, neighbour)) continue;
        visited.add(neighbour);
        next.push(neighbour);
      }
    }
    if (best) return { source: best.source, target: best.target };
    frontier = next;
  }
  return null;
}

function findLegalNeutralFrontier(state: TargetResolverState, targetCell: number): { source: number; target: number } | null {
  if (targetCell < 0 || targetCell >= state.totalCells || state.cellTerrains[targetCell] === WATER_TERRAIN || state.cellOwners[targetCell] !== 0) {
    return null;
  }
  const targetX = targetCell % state.width;
  const targetY = Math.floor(targetCell / state.width);

  const visited = new Set<number>([targetCell]);
  const queue: number[] = [targetCell];
  let head = 0;

  let best: { source: number; target: number; dist: number } | null = null;
  let steps = 0;
  const maxSteps = 15000;

  while (head < queue.length && steps < maxSteps) {
    steps++;
    const curr = queue[head++];
    const cx = curr % state.width;
    const cy = Math.floor(curr / state.width);

    for (const n of legalLandNeighbours(state, curr)) {
      if (state.cellOwners[n] === state.yourFactionId) {
        let dx = Math.abs(cx - targetX);
        if (dx > state.width / 2) dx = state.width - dx;
        const dy = Math.abs(cy - targetY);
        const dist = Math.hypot(dx, dy);
        if (!best || dist < best.dist) {
          best = { source: n, target: curr, dist };
        }
      }
    }

    if (best) {
      break;
    }

    for (const n of legalLandNeighbours(state, curr)) {
      if (!visited.has(n) && state.cellOwners[n] === 0) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  // If no contiguous neutral land path reaches friendly territory, it is unreachable.
  return best ? { source: best.source, target: best.target } : null;
}

function baseResult(state: TargetResolverState, worldX: number, worldY: number): TargetResolution {
  const longitude = worldX / state.width * 360 - 180;
  const latitude = 90 - worldY / state.height * 180;
  const rawX = Math.floor(worldX);
  const rawY = Math.floor(worldY);
  const rawCell = inBounds(state, rawX, rawY) ? cellIndex(state, rawX, rawY) : -1;
  const isAuthoritativeLand = inBounds(state, rawX, rawY) && state.cellTerrains[rawCell] !== WATER_TERRAIN;
  const isVisualLandPixel = Boolean(
    inBounds(state, rawX, rawY) &&
    state.visualMaskReady && state.visualLandMask &&
    isVisualLand(state.visualLandMask, worldX, worldY),
  );
  const canonicalLand = isAuthoritativeLand || isVisualLandPixel;
  return {
    worldX, worldY, longitude, latitude, canonicalLand,
    visualComponentId: canonicalLand ? 'UNAVAILABLE (visual mask has no component IDs)' : 'water',
    rawCell, resolvedCell: null, clickedCell: null, ownerId: 0,
    relation: 'INVALID/WATER', action: 'NONE', sourceCell: null, targetCell: null,
    nearestLegalAnchor: null, rejectionReason: null,
  };
}

export function resolveTargetAtWorld(
  state: TargetResolverState,
  worldX: number,
  worldY: number,
  screenX?: number,
  screenY?: number,
): TargetResolution {
  const result = baseResult(state, worldX, worldY);
  result.screenX = screenX;
  result.screenY = screenY;
  if (state.isInitialized === false) {
    result.rejectionReason = 'World snapshot is still loading.';
    return result;
  }
  if (state.isConnected === false) {
    result.rejectionReason = 'Command link is disconnected.';
    return result;
  }
  if (!result.canonicalLand) {
    result.rejectionReason = 'Water is not a legal land command target.';
    return result;
  }

  let resolvedCell: number | null = null;
  if (state.visualMaskReady && state.visualLandMask) {
    resolvedCell = getVisualGameplayMapping(state.visualLandMask, VISUAL_MASK_WIDTH, VISUAL_MASK_HEIGHT,
      state.width, state.height, state.cellTerrains).cellAtWorld(worldX, worldY);
  }
  // If the mapping didn't find an alternate cell but the clicked cell itself is authoritative land, use it directly
  if ((resolvedCell === null || resolvedCell < 0) && result.rawCell >= 0 && state.cellTerrains[result.rawCell] !== WATER_TERRAIN) {
    resolvedCell = result.rawCell;
  }
  if (resolvedCell === null || resolvedCell < 0) {
    result.rejectionReason = 'The visible coastal fragment has no mapped gameplay land component.';
    return result;
  }
  result.resolvedCell = resolvedCell;
  result.clickedCell = resolvedCell;
  result.ownerId = state.cellOwners[resolvedCell] ?? 0;

  if (result.ownerId === state.yourFactionId) {
    if (isCoastal(state, resolvedCell)) {
      result.relation = 'OWN_COAST';
      result.sourceCell = resolvedCell;
      const port = state.ports?.find(port => port.cellIndex === resolvedCell);
      const validPortSite = state.strategicSites?.some(site => site.kind === 'PORT' && site.cellA === resolvedCell);
      if (validPortSite && !port) {
        result.action = 'BUILD_PORT';
        result.rejectionReason = 'Valid own port site selected. Construction spends Population permanently.';
      } else {
        result.rejectionReason = port ? (port.complete ? 'This coast already has a completed port.' : 'Port construction is in progress here.')
          : 'Own coast selected. A port can only be built at a marked harbor site.';
      }
    } else if (neighbours(state, resolvedCell).some((index) => state.cellOwners[index] !== state.yourFactionId && state.cellTerrains[index] !== WATER_TERRAIN)) {
      result.relation = 'OWN_BORDER';
      result.action = 'DEFEND';
      result.sourceCell = resolvedCell;
      result.rejectionReason = 'Own frontier selected. Population can be pre-positioned here.';
    } else {
      result.relation = 'OWN_INTERIOR';
      result.sourceCell = resolvedCell;
      result.rejectionReason = 'This is your interior. Select a frontier or coast to issue a command.';
    }
    result.targetCell = null;
    return result;
  }

  if (result.ownerId === 0) {
    const source = nearestOwnNeighbour(state, resolvedCell, true);
    if (source !== null) {
      result.relation = 'ADJACENT_NEUTRAL';
      result.action = 'NEUTRAL_EXPANSION';
      result.sourceCell = source;
      result.targetCell = resolvedCell;
      result.nearestLegalAnchor = resolvedCell;
      result.rejectionReason = 'Nearby unclaimed land selected. Choose Population to expand here.';
    } else {
      const legalAnchor = findLegalNeutralFrontier(state, resolvedCell);
      if (legalAnchor !== null) {
        result.relation = 'REMOTE_NEUTRAL';
        result.action = 'NEUTRAL_EXPANSION';
        result.sourceCell = legalAnchor.source;
        result.targetCell = resolvedCell;
        result.nearestLegalAnchor = legalAnchor.target;
        result.rejectionReason = 'Objective direction recorded. Expansion starts from legal frontier.';
      } else {
        result.relation = 'REMOTE_NEUTRAL';
        result.targetCell = resolvedCell;
        const sourcePort = isCoastal(state, resolvedCell)
          && (state.cellFlags[resolvedCell] & MEANINGFUL_OVERSEAS_FLAG) !== 0
          ? completeOwnPort(state, resolvedCell)
          : null;
        if (sourcePort !== null) {
          result.action = 'AMPHIBIOUS_COLONIZATION';
          result.sourceCell = sourcePort;
          result.nearestLegalAnchor = resolvedCell;
          result.rejectionReason = 'Explicit overseas landing ready: completed port to selected neutral coast.';
        } else {
          result.action = 'NONE';
          result.rejectionReason = (state.cellFlags[resolvedCell] & MEANINGFUL_OVERSEAS_FLAG) !== 0
            ? 'This meaningful overseas coast requires a completed marked port.'
            : 'No legal neutral land route reaches this unsupported fragment.';
        }
      }
    }
    return result;
  }

  if (relationIsAlly(state, result.ownerId)) {
    result.relation = 'ALLY';
    result.targetCell = resolvedCell;
    result.action = 'ALLIANCE_INFO';
    result.rejectionReason = 'Allied land cannot be attacked.';
    return result;
  }

  // Micro-gap topology simplifies neutral archipelago expansion only. A
  // hostile operation still needs a physically local land border; it must
  // never turn an island simplification into a cross-water attack.
  const directSource = nearestOwnNeighbour(state, resolvedCell, false);
  if (directSource !== null) {
    result.relation = 'ADJACENT_HOSTILE';
    result.action = 'LAUNCH_OFFENSIVE';
    result.sourceCell = directSource;
    result.targetCell = resolvedCell;
    result.nearestLegalAnchor = resolvedCell;
    result.rejectionReason = 'Attack point ready. Choose Population deployment.';
    return result;
  }

  const deepAnchor = nearestHostileAnchor(state, resolvedCell, result.ownerId);
  if (deepAnchor) {
    result.relation = 'REMOTE_HOSTILE';
    result.action = 'LAUNCH_OFFENSIVE';
    result.sourceCell = deepAnchor.source;
    result.targetCell = deepAnchor.target;
    result.nearestLegalAnchor = deepAnchor.target;
    result.rejectionReason = 'Target direction recorded. The attack will begin at the nearest legal border.';
    return result;
  }

  result.relation = 'REMOTE_HOSTILE';
  result.action = 'NONE';
  result.sourceCell = null;
  result.targetCell = resolvedCell;
  result.nearestLegalAnchor = null;
  result.rejectionReason = 'Hostile attack requires local land contact.';
  return result;
}

export function resolveTargetAtScreen(
  state: TargetResolverState,
  worldX: number,
  worldY: number,
  screenX: number,
  screenY: number,
): TargetResolution {
  return resolveTargetAtWorld(state, worldX, worldY, screenX, screenY);
}
