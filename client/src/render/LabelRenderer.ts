import * as PIXI from 'pixi.js';
import { gameState, EventType } from '../game/GameState';
import { POLITICAL_SCALE, POLITICAL_WIDTH, POLITICAL_HEIGHT } from './PoliticalSpace';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';

interface LabelVisual {
  container: PIXI.Container;
  text: PIXI.Text;
  factionId: number;
}

export class LabelRenderer {
  public container: PIXI.Container;
  private activeVisuals: Map<number, LabelVisual> = new Map();
  private visualPool: LabelVisual[] = [];
  private anchors = new Map<number, PIXI.Point>();
  private areas = new Map<number, number>();
  private lastAnchorBuildAt = 0;
  public visibleLabelCount = 0;
  public currentLOD: 'FAR' | 'MEDIUM' | 'CLOSE' = 'FAR';

  constructor(private readonly surface: PoliticalSurfaceCache) {
    this.container = new PIXI.Container();
  }

  public init() {
    for (let i = 0; i < 200; i++) {
      this.visualPool.push(this.createVisual());
    }
  }

  private createVisual(): LabelVisual {
    const cont = new PIXI.Container();
    
    // Grand Strategy Military Atlas Typography
    const style = new PIXI.TextStyle({
      fontFamily: 'Outfit, "Trebuchet MS", sans-serif',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 3,
      fill: '#e2e8f0', // Crisp off-white / parchment
      stroke: { color: '#050b14', width: 2.5 },
      dropShadow: {
        alpha: 0.85,
        angle: Math.PI / 4,
        blur: 3,
        color: '#020617',
        distance: 1.5,
      },
    });

    const text = new PIXI.Text({ text: '', style });
    text.anchor.set(0.5);

    cont.addChild(text);

    return { container: cont, text, factionId: -1 };
  }

  public onGameStateUpdate(event: EventType) {
    if (event === 'CELL_DELTAS' && performance.now() - this.lastAnchorBuildAt < 1000) return;
    if (event === 'WORLD_SNAPSHOT' || event === 'FACTIONS_CHANGED' || event === 'CELL_DELTAS') {
      this.syncState();
    }
  }

  public syncState() {
    this.rebuildTerritoryAnchors();
    const currentFactionIds = new Set<number>();

    for (const faction of gameState.factions.values()) {
      if (faction.capitalCell === undefined || faction.capitalCell < 0) continue;

      currentFactionIds.add(faction.factionId);

      let visual = this.activeVisuals.get(faction.factionId);
      if (!visual) {
        visual = this.visualPool.pop() || this.createVisual();
        visual.factionId = faction.factionId;
        this.activeVisuals.set(faction.factionId, visual);
        this.container.addChild(visual.container);
      }

      visual.text.text = faction.displayName.toUpperCase();
    }

    // Clean up inactive factions
    for (const [id, visual] of this.activeVisuals.entries()) {
      if (!currentFactionIds.has(id)) {
        this.container.removeChild(visual.container);
        this.visualPool.push(visual);
        this.activeVisuals.delete(id);
      }
    }
  }

  private rebuildTerritoryAnchors() {
    this.lastAnchorBuildAt = performance.now();
    const sumX = new Float64Array(256);
    const sumY = new Float64Array(256);
    const counts = new Uint32Array(256);
    const owners = gameState.cellOwners;
    const width = gameState.width;

    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      if (owner === 0) continue;
      counts[owner]++;
      sumX[owner] += (i % width) + 0.5;
      sumY[owner] += Math.floor(i / width) + 0.5;
    }

    this.anchors.clear();
    this.areas.clear();

    for (let owner = 1; owner < 256; owner++) {
      if (!counts[owner]) continue;
      const wx = sumX[owner] / counts[owner];
      const wy = sumY[owner] / counts[owner];
      const safe = this.surface.field.findNearestOwnedPoint(owner, wx, wy, 128);
      if (safe) this.anchors.set(owner, new PIXI.Point(safe.x, safe.y));
      this.areas.set(owner, counts[owner]);
    }
  }

  public updateScreenSpace(projector: (x: number, y: number) => PIXI.Point, scale: number, lod: 'FAR' | 'MEDIUM' | 'CLOSE') {
    this.updateProjected(projector, scale, lod, false);
  }

  public updateGlobe(projector: (x: number, y: number) => PIXI.Point | null, globeCenter?: PIXI.Point, globeRadius?: number) {
    this.updateProjected((x, y) => projector(x, y) ?? new PIXI.Point(-10000, -10000), 1, 'MEDIUM', true, globeCenter, globeRadius);
  }

  private updateProjected(projector: (x: number, y: number) => PIXI.Point, scale: number, lod: 'FAR' | 'MEDIUM' | 'CLOSE', globe: boolean, globeCenter?: PIXI.Point, globeRadius?: number) {
    this.currentLOD = lod;
    this.visibleLabelCount = 0;

    const screenPositions = new Map<number, PIXI.Point>();
    const screenCenter = new PIXI.Point(window.innerWidth * 0.5, window.innerHeight * 0.5);
    const screenDiagonal = Math.hypot(window.innerWidth, window.innerHeight) || 1;
    for (const visual of this.activeVisuals.values()) {
      const worldPos = this.anchors.get(visual.factionId);
      if (worldPos) screenPositions.set(visual.factionId, projector(worldPos.x, worldPos.y));
    }

    const sortedFactions = Array.from(this.activeVisuals.values()).sort((a, b) => {
      const areaA = this.areas.get(a.factionId) || 0;
      const areaB = this.areas.get(b.factionId) || 0;
      const posA = screenPositions.get(a.factionId);
      const posB = screenPositions.get(b.factionId);
      const proximityA = posA ? 1 - Math.min(1, Math.hypot(posA.x - screenCenter.x, posA.y - screenCenter.y) / screenDiagonal) : 0;
      const proximityB = posB ? 1 - Math.min(1, Math.hypot(posB.x - screenCenter.x, posB.y - screenCenter.y) / screenDiagonal) : 0;
      const scoreA = (a.factionId === gameState.yourFactionId ? 1e12 : 0) + areaA * (1 + proximityA * 0.20) + proximityA * 96;
      const scoreB = (b.factionId === gameState.yourFactionId ? 1e12 : 0) + areaB * (1 + proximityB * 0.20) + proximityB * 96;
      return scoreB - scoreA;
    });

    const occupiedRects: PIXI.Rectangle[] = [];
    const labelBudget = lod === 'FAR'
      ? Math.max(8, Math.min(18, Math.floor(window.innerWidth / 90)))
      : lod === 'MEDIUM'
        ? Math.max(22, Math.min(34, Math.floor(window.innerWidth / 38)))
        : Math.max(26, Math.min(38, Math.floor(window.innerWidth / 34)));

    for (let rank = 0; rank < sortedFactions.length; rank++) {
      const visual = sortedFactions[rank];
      const faction = gameState.factions.get(visual.factionId);
      if (!faction || faction.capitalCell === undefined) continue;

      const area = this.areas.get(visual.factionId) || 10;
      
      // Dynamic Size Scaling based on Land Area
      let baseFontSize = 11;
      if (area > 1500) baseFontSize = 16;
      else if (area > 600) baseFontSize = 14;
      else if (area > 200) baseFontSize = 12;
      else baseFontSize = 10;

      const isPlayer = visual.factionId === gameState.yourFactionId;
      const isMajor = area > 600;
      const isRegional = area > 200;

      if (globe) {
        visual.text.style.fontSize = isPlayer ? 11 : isMajor ? 10 : 9;
        visual.text.style.letterSpacing = isPlayer ? 2.2 : 1.6;
        visual.container.alpha = isPlayer ? 1.0 : isMajor ? 0.82 : 0.62;
        if (rank >= 18 && !isPlayer) {
          visual.container.visible = false;
          continue;
        }
      }

      if (lod === 'FAR') {
        visual.text.style.fontSize = Math.min(14, Math.max(9, baseFontSize - 2));
        visual.text.style.letterSpacing = isPlayer ? 3.0 : 2.2;
        visual.container.alpha = isPlayer ? 1.0 : isMajor ? 0.88 : 0.70;
        if (rank >= labelBudget && !isPlayer) {
            visual.container.visible = false;
            continue;
        }
      } else if (lod === 'MEDIUM') {
        visual.text.style.fontSize = Math.min(isPlayer ? 14 : isMajor ? 12 : 10, Math.max(9, baseFontSize - (isMajor ? 2 : 1)));
        visual.text.style.letterSpacing = isPlayer ? 3.4 : isMajor ? 2.8 : 2.2;
        visual.container.alpha = isPlayer ? 1.0 : isMajor ? 0.90 : isRegional ? 0.76 : 0.62;
      } else {
        visual.text.style.fontSize = Math.min(isPlayer ? 14 : isMajor ? 12 : 10, Math.max(9, baseFontSize - (isPlayer ? 0 : 1)));
        visual.text.style.letterSpacing = isPlayer ? 3.2 : isMajor ? 2.6 : 2.0;
        visual.container.alpha = isPlayer ? 1.0 : isMajor ? 0.86 : isRegional ? 0.70 : 0.58;
        if (rank >= labelBudget && !isPlayer) {
            visual.container.visible = false;
            continue;
        }
      }

      if (globe) {
        visual.text.style.fontSize = isPlayer ? 11 : isMajor ? 10 : 9;
        visual.text.style.letterSpacing = isPlayer ? 2.2 : 1.6;
        visual.container.alpha = isPlayer ? 1.0 : isMajor ? 0.82 : 0.62;
        if (rank >= 18 && !isPlayer) {
          visual.container.visible = false;
          continue;
        }
      }

      const screenPos = screenPositions.get(visual.factionId);
      if (!screenPos) { visual.container.visible = false; continue; }

      const bounds = visual.text.getLocalBounds();
      const pad = 6;
      // Keep labels out of the fixed command bars and do not let off-screen
      // labels consume collision slots needed by labels that are visible.
      const safeTop = 70;
      const safeBottom = 48;
      const safeLeft = 16;
      const safeRight = 16;
      const labelLeft = screenPos.x + bounds.x - pad;
      const labelRight = screenPos.x + bounds.x + bounds.width + pad;
      const labelTop = screenPos.y + bounds.y - pad;
      const labelBottom = screenPos.y + bounds.y + bounds.height + pad;
      const outsideViewport = globe
        ? (screenPos.x < -5000 || screenPos.y < -5000 || Boolean(globeCenter && globeRadius && Math.hypot(screenPos.x - globeCenter.x, screenPos.y - globeCenter.y) > globeRadius * 0.84))
        : (labelLeft < safeLeft ||
          labelRight > window.innerWidth - safeRight ||
          labelTop < safeTop ||
          labelBottom > window.innerHeight - safeBottom);
      if (outsideViewport) {
          visual.container.visible = false;
          continue;
      }

      visual.container.x = screenPos.x;
      visual.container.y = screenPos.y;

      const rect = new PIXI.Rectangle(
          bounds.x + screenPos.x - pad, 
          bounds.y + screenPos.y - pad, 
          bounds.width + pad * 2, 
          bounds.height + pad * 2
      );

      let overlaps = false;
      for (const r of occupiedRects) {
          if (rect.intersects(r)) {
              overlaps = true;
              break;
          }
      }

      if (overlaps && visual.factionId !== gameState.yourFactionId) {
          visual.container.visible = false;
      } else {
          visual.container.visible = true;
          this.visibleLabelCount++;
          occupiedRects.push(rect);
      }
    }
  }

  public clear(): void {
    for (const visual of this.activeVisuals.values()) {
      visual.container.visible = false;
      this.container.removeChild(visual.container);
      this.visualPool.push(visual);
    }
    this.activeVisuals.clear();
    this.anchors.clear();
    this.areas.clear();
    this.visibleLabelCount = 0;
  }
}
