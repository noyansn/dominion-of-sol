import * as PIXI from 'pixi.js';
import { EventType, gameState } from '../game/GameState';
import { cellToWorld } from './WorldSpace';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';

export class SelectionRenderer {
  public container: PIXI.Container;
  private graphics: PIXI.Graphics;
  private currentScale = 1;
  private currentLOD: 'FAR' | 'MEDIUM' | 'CLOSE' = 'FAR';

  constructor(private surface?: PoliticalSurfaceCache) {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.eventMode = 'none';
    this.graphics.eventMode = 'none';
    this.container.label = 'SelectionOverlay';
    this.container.addChild(this.graphics);
  }

  public setSurface(surface: PoliticalSurfaceCache) {
    this.surface = surface;
    this.cachedSpotlightId = null;
    this.redraw();
  }

  public init() {
    // Initialization
  }

  public onGameStateUpdate(event: EventType) {
    if (event === 'SELECTION_CHANGED' || event === 'WORLD_SNAPSHOT' || event === 'CELL_DELTAS') {
      this.cachedSpotlightId = null; // Force edge recomputation on state changes
      this.syncState();
    }
  }

  private syncState() {
    this.redraw();
  }

  private cachedSpotlightId: number | null = null;
  private cachedSpotlightEdges: { x1: number; y1: number; x2: number; y2: number; isTopOrLeft: boolean }[] = [];

  private updateSpotlightEdges(spotlightId: number | null) {
    if (spotlightId === this.cachedSpotlightId) return;
    this.cachedSpotlightId = spotlightId;
    this.cachedSpotlightEdges = [];
    if (!spotlightId || spotlightId <= 0) return;

    // Use smoothed 4096x2048 field if available for organic, curved boundaries
    if (this.surface?.field?.owners && this.surface.field.land) {
      const field = this.surface.field;
      const owners = field.owners;
      const land = field.land;
      const edges: { x1: number; y1: number; x2: number; y2: number; isTopOrLeft: boolean }[] = [];

      // Find coarse bounding box first
      let minCx = 1024, maxCx = 0, minCy = 512, maxCy = 0;
      let found = false;
      const cellOwners = gameState.cellOwners;
      for (let cy = 0; cy < 512; cy++) {
        const row = cy * 1024;
        for (let cx = 0; cx < 1024; cx++) {
          if (cellOwners[row + cx] === spotlightId) {
            found = true;
            if (cx < minCx) minCx = cx;
            if (cx > maxCx) maxCx = cx;
            if (cy < minCy) minCy = cy;
            if (cy > maxCy) maxCy = cy;
          }
        }
      }
      if (!found) return;

      const minFx = Math.max(0, (minCx - 1) * 4);
      const maxFx = Math.min(4096, (maxCx + 2) * 4);
      const minFy = Math.max(0, (minCy - 1) * 4);
      const maxFy = Math.min(2048, (maxCy + 2) * 4);

      for (let fy = minFy; fy < maxFy; fy++) {
        const row = fy * 4096;
        for (let fx = minFx; fx < maxFx; fx++) {
          const i = row + fx;
          if (owners[i] !== spotlightId || land[i] === 0) continue;

          const x1 = fx * 0.25;
          const y1 = fy * 0.25;
          const x2 = (fx + 1) * 0.25;
          const y2 = (fy + 1) * 0.25;

          // Top
          if (fy === 0 || owners[i - 4096] !== spotlightId) {
            edges.push({ x1, y1, x2, y2: y1, isTopOrLeft: true });
          }
          // Left
          if (fx === 0 || owners[i - 1] !== spotlightId) {
            edges.push({ x1, y1, x2: x1, y2, isTopOrLeft: true });
          }
          // Bottom
          if (fy === 2047 || owners[i + 4096] !== spotlightId) {
            edges.push({ x1, y1: y2, x2, y2, isTopOrLeft: false });
          }
          // Right
          if (fx === 4095 || owners[i + 1] !== spotlightId) {
            edges.push({ x1: x2, y1, x2, y2, isTopOrLeft: false });
          }
        }
      }
      this.cachedSpotlightEdges = edges;
      return;
    }

    // Coarse fallback
    const cellOwners = gameState.cellOwners;
    const w = gameState.width;
    const h = gameState.height;
    const edges: { x1: number; y1: number; x2: number; y2: number; isTopOrLeft: boolean }[] = [];

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const i = rowOffset + x;
        if (cellOwners[i] !== spotlightId) continue;

        if (y === 0 || cellOwners[i - w] !== spotlightId) {
          edges.push({ x1: x, y1: y, x2: x + 1, y2: y, isTopOrLeft: true });
        }
        if (x === 0 || cellOwners[i - 1] !== spotlightId) {
          edges.push({ x1: x, y1: y, x2: x, y2: y + 1, isTopOrLeft: true });
        }
        if (y === h - 1 || cellOwners[i + w] !== spotlightId) {
          edges.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1, isTopOrLeft: false });
        }
        if (x === w - 1 || cellOwners[i + 1] !== spotlightId) {
          edges.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1, isTopOrLeft: false });
        }
      }
    }
    this.cachedSpotlightEdges = edges;
  }

  private projector: ((x: number, y: number) => PIXI.Point | null) | null = null;

  public updateScreenSpace(projector: (x: number, y: number) => PIXI.Point | null, scale: number, lod: 'FAR' | 'MEDIUM' | 'CLOSE') {
    this.projector = projector;
    this.currentScale = scale;
    this.currentLOD = lod;
    this.redraw();
  }

  public updateLOD(lod: 'FAR' | 'MEDIUM' | 'CLOSE') {
    this.currentLOD = lod;
    this.redraw();
  }

  public clear(): void {
    this.graphics.clear();
    this.cachedSpotlightId = null;
  }

  private toScreen(worldX: number, worldY: number): PIXI.Point | null {
    if (this.projector) {
      return this.projector(worldX, worldY);
    }
    return new PIXI.Point(worldX, worldY);
  }

  private redraw() {
    const g = this.graphics;
    const s = 1.0;
    const source = gameState.selectedSourceCell;
    const target = gameState.selectedTargetCell;
    g.clear();

    const spotlightId = gameState.spotlightFactionId;
    const action = gameState.selectionContext?.action;
    const isHostileAction = action === 'LAUNCH_OFFENSIVE';
    const activeCombatFront = spotlightId ? [...gameState.fronts.values()].some(f => 
      f.isCombatActive && (f.factionA === spotlightId || f.factionB === spotlightId) &&
      (f.factionA === gameState.yourFactionId || f.factionB === gameState.yourFactionId)
    ) : false;

    // Whole-country highlight only appears during purely informational single-click inspection in flat mode.
    // When an attack is authorized or active, whole-country glow is completely suppressed so local operation dominates!
    if (spotlightId && !isHostileAction && !activeCombatFront) {
      this.updateSpotlightEdges(spotlightId);
    } else {
      this.cachedSpotlightEdges = [];
    }

    // Country Tactical 3D Elevation & Luminous Spotlight (Flat Mode):
    if (this.cachedSpotlightEdges.length > 0) {
      const shadowDx = 2.4;
      const shadowDy = 3.6;
      const glowColor = 0xdfbc73;

      for (const e of this.cachedSpotlightEdges) {
        const p1 = this.toScreen(e.x1, e.y1);
        const p2 = this.toScreen(e.x2, e.y2);
        if (!p1 || !p2) continue;
        if (!e.isTopOrLeft) {
          g.moveTo(p1.x + shadowDx * 1.5, p1.y + shadowDy * 1.5)
            .lineTo(p2.x + shadowDx * 1.5, p2.y + shadowDy * 1.5)
            .stroke({ color: 0x000408, width: 6.8, alpha: 0.52 });
          g.moveTo(p1.x + shadowDx, p1.y + shadowDy)
            .lineTo(p2.x + shadowDx, p2.y + shadowDy)
            .stroke({ color: 0x010712, width: 3.8, alpha: 0.78 });
        }
        g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: glowColor, width: 5.8, alpha: 0.38 });
        g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0xf5d77f, width: 2.6, alpha: 0.88 });
        if (e.isTopOrLeft) {
          g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0xffffff, width: 1.9, alpha: 0.98 });
        } else {
          g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0xffe8a8, width: 1.2, alpha: 0.70 });
        }
      }
    }

    if (spotlightId && source === null && target === null) {
      const fac = gameState.factions.get(spotlightId);
      if (fac && fac.capitalCell !== undefined) {
        const cw = cellToWorld(fac.capitalCell);
        const p = this.toScreen(cw.x, cw.y);
        if (p) {
          const r = 10;
          g.circle(p.x, p.y, r * 0.45).stroke({ color: 0xf5d77f, width: 1.2, alpha: 0.75 });
        }
      }
    }

    if (source !== null) {
      const cw = cellToWorld(source);
      const p = this.toScreen(cw.x, cw.y);
      if (p) {
        const outer = 8;
        const inner = 4;
        g.circle(p.x, p.y, outer)
          .fill({ color: 0x07131c, alpha: 0.58 })
          .stroke({ color: 0x60a5fa, width: 1.25, alpha: 0.98 });
        g.circle(p.x, p.y, inner)
          .stroke({ color: 0xbfdbfe, width: 0.9, alpha: 0.9 });
        g.moveTo(p.x - outer - 3, p.y).lineTo(p.x - outer + 1, p.y)
          .moveTo(p.x + outer - 1, p.y).lineTo(p.x + outer + 3, p.y)
          .moveTo(p.x, p.y - outer - 3).lineTo(p.x, p.y - outer + 1)
          .moveTo(p.x, p.y + outer - 1).lineTo(p.x, p.y + outer + 3)
          .stroke({ color: 0x93c5fd, width: 0.9, alpha: 0.86 });
      }
    }

    if (target !== null) {
      const action = gameState.selectionContext?.action;
      const isActionable = action === 'LAUNCH_OFFENSIVE' || action === 'EXPAND_FRONTIER' || action === 'DEFEND' || action === 'BUILD_PORT';
      const cw = cellToWorld(target);
      const p = this.toScreen(cw.x, cw.y);
      if (p && isActionable) {
        const radius = 8;
        const color = action === 'LAUNCH_OFFENSIVE' ? 0xfb7185 : 0x10b981;
        g.circle(p.x, p.y, radius)
          .fill({ color: 0x180d12, alpha: 0.48 })
          .stroke({ color, width: 1.3, alpha: 0.98 });
        g.poly([p.x, p.y - radius - 2, p.x + 2, p.y - radius + 2, p.x, p.y - radius + 6, p.x - 2, p.y - radius + 2])
          .fill({ color, alpha: 0.9 });
      }
    }

    if (source !== null && target !== null) {
      const action = gameState.selectionContext?.action;
      const isOffensive = action === 'LAUNCH_OFFENSIVE';
      const isNeutralFocus = action === 'EXPAND_FRONTIER' && gameState.operationMode === 'FOCUS';
      const isNeutralFrontier = action === 'EXPAND_FRONTIER' && gameState.operationMode === 'FRONTIER';

      if (isOffensive || isNeutralFocus || isNeutralFrontier) {
        const sw = cellToWorld(source);
        const tw = cellToWorld(target);
        const a = this.toScreen(sw.x, sw.y);
        const b = this.toScreen(tw.x, tw.y);

        if (a && b) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;

          const themeColor = isOffensive ? 0xf43f5e : (isNeutralFocus || isNeutralFrontier ? 0x10b981 : 0x38bdf8);

          // 1. INTENT CORRIDOR: Directional pressure corridor towards objective
          const wStart = 4.0;
          const wEnd = Math.min(22.0, 8.0 + len * 0.12);
          const p1x = a.x - nx * wStart, p1y = a.y - ny * wStart;
          const p2x = b.x - nx * wEnd, p2y = b.y - ny * wEnd;
          const p3x = b.x + nx * wEnd, p3y = b.y + ny * wEnd;
          const p4x = a.x + nx * wStart, p4y = a.y + ny * wStart;

          g.poly([p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y])
            .fill({ color: themeColor, alpha: isNeutralFrontier ? 0.08 : 0.12 });
          g.moveTo(p1x, p1y).lineTo(p2x, p2y)
            .stroke({ color: themeColor, width: 0.8, alpha: 0.45 });
          g.moveTo(p4x, p4y).lineTo(p3x, p3y)
            .stroke({ color: themeColor, width: 0.8, alpha: 0.45 });

          // 2. MAIN INTENT AXIS
          g.moveTo(a.x, a.y).lineTo(b.x, b.y)
            .stroke({ color: 0x050b14, width: 2.6, alpha: 0.75 });
          g.moveTo(a.x, a.y).lineTo(b.x, b.y)
            .stroke({ color: themeColor, width: 1.4, alpha: 0.95 });

          // 3. DIRECTIONAL CHEVRONS
          const chevronLen = 4.0;
          const chevronWidth = 3.5;
          for (const frac of [0.35, 0.65]) {
            const cx = a.x + dx * frac;
            const cy = a.y + dy * frac;
            g.moveTo(cx - ux * chevronLen + nx * chevronWidth, cy - uy * chevronLen + ny * chevronWidth)
              .lineTo(cx, cy)
              .lineTo(cx - ux * chevronLen - nx * chevronWidth, cy - uy * chevronLen - ny * chevronWidth)
              .stroke({ color: 0xffffff, width: 1.2, alpha: 0.90 });
          }

          // 4. LEGAL ENTRY ANCHOR at a
          g.circle(a.x, a.y, 5.5)
            .fill({ color: 0x050b14, alpha: 0.80 })
            .stroke({ color: themeColor, width: 1.5, alpha: 0.95 });
          g.circle(a.x, a.y, 2.2)
            .fill({ color: 0xffffff, alpha: 0.95 });

          // 5. LOCAL FRONT SEGMENT (Transverse border barrier framing the combat front)
          const frontMidX = a.x + dx * 0.5;
          const frontMidY = a.y + dy * 0.5;
          const frontHalfLen = 9.5;
          const f1x = frontMidX - nx * frontHalfLen, f1y = frontMidY - ny * frontHalfLen;
          const f2x = frontMidX + nx * frontHalfLen, f2y = frontMidY + ny * frontHalfLen;

          g.moveTo(f1x, f1y).lineTo(f2x, f2y)
            .stroke({ color: 0x050b14, width: 4.2, alpha: 0.90 });
          g.moveTo(f1x, f1y).lineTo(f2x, f2y)
            .stroke({ color: isOffensive ? 0xf43f5e : themeColor, width: 2.2, alpha: 0.98 });
          const tickLen = 3.2;
          g.moveTo(f1x - ux * tickLen, f1y - uy * tickLen).lineTo(f1x + ux * tickLen, f1y + uy * tickLen)
            .stroke({ color: 0xffffff, width: 1.5, alpha: 0.95 });
          g.moveTo(f2x - ux * tickLen, f2y - uy * tickLen).lineTo(f2x + ux * tickLen, f2y + uy * tickLen)
            .stroke({ color: 0xffffff, width: 1.5, alpha: 0.95 });

          // 6. OBJECTIVE MARKER at b (precise diamond crosshair)
          const dSize = 4.5;
          g.poly([b.x, b.y - dSize, b.x + dSize, b.y, b.x, b.y + dSize, b.x - dSize, b.y])
            .fill({ color: themeColor, alpha: 0.95 })
            .stroke({ color: 0xffffff, width: 1.0, alpha: 0.95 });
          g.moveTo(b.x - dSize * 1.6, b.y).lineTo(b.x - dSize * 0.8, b.y).stroke({ color: 0xffffff, width: 0.9, alpha: 0.85 });
          g.moveTo(b.x + dSize * 0.8, b.y).lineTo(b.x + dSize * 1.6, b.y).stroke({ color: 0xffffff, width: 0.9, alpha: 0.85 });
          g.moveTo(b.x, b.y - dSize * 1.6).lineTo(b.x, b.y - dSize * 0.8).stroke({ color: 0xffffff, width: 0.9, alpha: 0.85 });
          g.moveTo(b.x, b.y + dSize * 0.8).lineTo(b.x, b.y + dSize * 1.6).stroke({ color: 0xffffff, width: 0.9, alpha: 0.85 });

          // 7. PROMINENT EXACT CLICKED TARGET MARKER (Guaranteed visual focus at clicked cell)
          const objectiveCell = gameState.selectionContext?.clickedCell ?? target;
          if (objectiveCell !== null) {
            const objWorld = cellToWorld(objectiveCell);
            const objP = this.toScreen(objWorld.x, objWorld.y);
            if (objP) {
              const p = objP;
              const bracketRadius = 7.5;
              const arm = 3.2;

              // Tactical target corner brackets ┌ ┐ └ ┘
              g.moveTo(p.x - bracketRadius, p.y - bracketRadius + arm)
                .lineTo(p.x - bracketRadius, p.y - bracketRadius)
                .lineTo(p.x - bracketRadius + arm, p.y - bracketRadius);
              g.moveTo(p.x + bracketRadius - arm, p.y - bracketRadius)
                .lineTo(p.x + bracketRadius, p.y - bracketRadius)
                .lineTo(p.x + bracketRadius, p.y - bracketRadius + arm);
              g.moveTo(p.x - bracketRadius, p.y + bracketRadius - arm)
                .lineTo(p.x - bracketRadius, p.y + bracketRadius)
                .lineTo(p.x - bracketRadius + arm, p.y + bracketRadius);
              g.moveTo(p.x + bracketRadius - arm, p.y + bracketRadius)
                .lineTo(p.x + bracketRadius, p.y + bracketRadius)
                .lineTo(p.x + bracketRadius, p.y + bracketRadius - arm);
              g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.98 });

              // Core objective crosshair diamond
              const dSize = 5.2;
              g.poly([p.x, p.y - dSize, p.x + dSize, p.y, p.x, p.y + dSize, p.x - dSize, p.y])
                .fill({ color: 0xf43f5e, alpha: 0.95 })
                .stroke({ color: 0xffffff, width: 1.2, alpha: 0.98 });
              g.circle(p.x, p.y, 1.8).fill({ color: 0xffffff, alpha: 0.98 });

              // Reticle ticks
              g.moveTo(p.x - dSize * 1.8, p.y).lineTo(p.x - dSize * 1.1, p.y).stroke({ color: 0xffffff, width: 1.0, alpha: 0.9 });
              g.moveTo(p.x + dSize * 1.1, p.y).lineTo(p.x + dSize * 1.8, p.y).stroke({ color: 0xffffff, width: 1.0, alpha: 0.9 });
              g.moveTo(p.x, p.y - dSize * 1.8).lineTo(p.x, p.y - dSize * 1.1).stroke({ color: 0xffffff, width: 1.0, alpha: 0.9 });
              g.moveTo(p.x, p.y + dSize * 1.1).lineTo(p.x, p.y + dSize * 1.8).stroke({ color: 0xffffff, width: 1.0, alpha: 0.9 });
            }
          }
        }
      }
    }
  }
}

