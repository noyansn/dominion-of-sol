import * as PIXI from 'pixi.js';
import { gameState, EventType } from '../game/GameState';
import { cellIndexToXY, cellToWorld, WORLD_WIDTH, WORLD_HEIGHT } from './WorldSpace';
import { isVisualLand, VISUAL_MASK_SCALE_X, VISUAL_MASK_SCALE_Y } from './VisualLandMask';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';

interface CapitalVisual {
  container: PIXI.Container;
  icon: PIXI.Graphics;
  factionId: number;
}

interface Point2D { x: number, y: number }

export class CapitalRenderer {
  public container: PIXI.Container;
  private activeVisuals: Map<number, CapitalVisual> = new Map();
  private visualPool: CapitalVisual[] = [];
  
  private anchorCache: Map<number, Point2D> = new Map();
  private debugInvalidAuthoritativeCapitalCells = 0;
  private debugCapitalMarkersInAuthoritativeWater = 0;
  private debugCapitalMarkersInVisualWater = 0;
  private debugVisualFallbackCount = 0;

  public get diagnostics() {
    return {
      invalidAuthoritativeCapitalCells: this.debugInvalidAuthoritativeCapitalCells,
      capitalMarkersInAuthoritativeWater: this.debugCapitalMarkersInAuthoritativeWater,
      capitalMarkersInVisualWaterOrWrongOwner: this.debugCapitalMarkersInVisualWater,
      visualFallbackCount: this.debugVisualFallbackCount,
    };
  }

  constructor(private readonly surface: PoliticalSurfaceCache) {
    this.container = new PIXI.Container();
  }

  public init() {
    for (let i = 0; i < 100; i++) {
      this.visualPool.push(this.createVisual());
    }
  }

  private createVisual(): CapitalVisual {
    const cont = new PIXI.Container();
    const icon = new PIXI.Graphics();
    
    cont.addChild(icon);

    return { container: cont, icon, factionId: -1 };
  }

  public onGameStateUpdate(event: EventType) {
    if (event === 'VISUAL_MASK_READY') {
      this.anchorCache.clear();
      this.syncState();
    } else if (event === 'WORLD_SNAPSHOT' || event === 'FACTIONS_CHANGED' || event === 'CELL_DELTAS') {
      this.anchorCache.clear();
      this.syncState();
    }
  }

  private findNearestValidCell(factionId: number, startCell: number): number {
    const visited = new Uint8Array(gameState.totalCells);
    const queue = [startCell];
    visited[startCell] = 1;
    let head = 0;
    while (head < queue.length) {
        const c = queue[head++];
        if (gameState.cellTerrains[c] !== 2 && gameState.cellOwners[c] === factionId) {
            return c;
        }
        const cx = c % 1024;
        const cy = Math.floor(c / 1024);
        const neighbors = [[cx, cy - 1], [cx, cy + 1], [cx - 1, cy], [cx + 1, cy]];
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < 1024 && ny >= 0 && ny < 512) {
                const nc = ny * 1024 + nx;
                if (!visited[nc]) {
                    visited[nc] = 1;
                    queue.push(nc);
                }
            }
        }
    }
    return startCell;
  }

  private findVisualLandInCell(factionId: number, cellIndex: number): Point2D {
    const cx = cellIndex % WORLD_WIDTH;
    const cy = Math.floor(cellIndex / WORLD_WIDTH);
    const centerWorld = { x: cx + 0.5, y: cy + 0.5 };
    
    if (!gameState.visualMaskReady || !gameState.visualLandMask) {
        return centerWorld;
    }
    
    const mask = gameState.visualLandMask;
    
    let bestPoint = centerWorld;
    let bestDist = Infinity;
    let foundVisualLand = false;
    
    for (let sy = 0; sy < VISUAL_MASK_SCALE_Y; sy++) {
        for (let sx = 0; sx < VISUAL_MASK_SCALE_X; sx++) {
            const worldX = cx + (sx + 0.5) / VISUAL_MASK_SCALE_X;
            const worldY = cy + (sy + 0.5) / VISUAL_MASK_SCALE_Y;
            if (isVisualLand(mask, worldX, worldY) && this.surface.field.ownerAtWorld(worldX, worldY) === factionId) {
                foundVisualLand = true;
                const dist = Math.hypot(worldX - centerWorld.x, worldY - centerWorld.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestPoint = { x: worldX, y: worldY };
                }
            }
        }
    }
    
    if (foundVisualLand) {
        return bestPoint;
    }
    
    // Fallback search
    const visited = new Uint8Array(gameState.totalCells);
    const queue = [cellIndex];
    visited[cellIndex] = 1;
    let head = 0;
    while (head < queue.length && head < 2000) {
        const c = queue[head++];
        if (gameState.cellTerrains[c] !== 2 && gameState.cellOwners[c] === factionId) {
            const ncx = c % WORLD_WIDTH;
            const ncy = Math.floor(c / WORLD_WIDTH);
            let hasVLand = false;
            let pBest = centerWorld;
            let dBest = Infinity;
            
            for (let sy = 0; sy < VISUAL_MASK_SCALE_Y; sy++) {
                for (let sx = 0; sx < VISUAL_MASK_SCALE_X; sx++) {
                    const worldX = ncx + (sx + 0.5) / VISUAL_MASK_SCALE_X;
                    const worldY = ncy + (sy + 0.5) / VISUAL_MASK_SCALE_Y;
                    if (isVisualLand(mask, worldX, worldY) && this.surface.field.ownerAtWorld(worldX, worldY) === factionId) {
                        hasVLand = true;
                        const d = Math.hypot(worldX - centerWorld.x, worldY - centerWorld.y);
                        if (d < dBest) { dBest = d; pBest = { x: worldX, y: worldY }; }
                    }
                }
            }
            if (hasVLand) {
                this.debugVisualFallbackCount++;
                return pBest;
            }
        }
        
        const cx2 = c % WORLD_WIDTH;
        const cy2 = Math.floor(c / WORLD_WIDTH);
        const neighbors = [[cx2, cy2 - 1], [cx2, cy2 + 1], [cx2 - 1, cy2], [cx2 + 1, cy2]];
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
                const nc = ny * WORLD_WIDTH + nx;
                if (!visited[nc]) {
                    visited[nc] = 1;
                    queue.push(nc);
                }
            }
        }
    }
    
    return centerWorld;
  }

  private getVisualAnchor(factionId: number, requestedCell: number): Point2D {
      if (this.anchorCache.has(factionId)) {
          return this.anchorCache.get(factionId)!;
      }

      let validCell = requestedCell;
      const isAuthValid = (gameState.cellTerrains[validCell] !== 2 && gameState.cellOwners[validCell] === factionId);
      
      if (!isAuthValid) {
          validCell = this.findNearestValidCell(factionId, requestedCell);
          if (gameState.cellTerrains[requestedCell] === 2) {
              this.debugCapitalMarkersInAuthoritativeWater++;
          }
          if (gameState.cellOwners[requestedCell] !== factionId || gameState.cellTerrains[requestedCell] === 2) {
              this.debugInvalidAuthoritativeCapitalCells++;
          }
      }
      
      const anchor = this.findVisualLandInCell(factionId, validCell);
      this.anchorCache.set(factionId, anchor);
      return anchor;
  }

  private drawTacticalMarker(g: PIXI.Graphics, colorInt: number, isHuman: boolean) {
    g.clear();
    
    // Outer shadow / dark boundary rim
    g.poly([0, -6, 6, 0, 0, 6, -6, 0]);
    g.fill({ color: 0x050b14, alpha: 0.85 });
    g.stroke({ color: 0x1e293b, width: 1.5 });

    // Inner Diamond Core
    g.poly([0, -4, 4, 0, 0, 4, -4, 0]);
    g.fill({ color: colorInt });
    g.stroke({ color: 0xf1f5f9, width: 1.0 });

    // Central Precision Dot
    g.circle(0, 0, 1.2);
    g.fill({ color: 0xffffff });

    if (isHuman) {
      // Sovereign Headquarters: Gold Command Reticle
      g.poly([0, -10, 10, 0, 0, 10, -10, 0]);
      g.stroke({ color: 0xf59e0b, width: 1.5, alpha: 0.9 });
      
      // Corner Command Ticks
      g.moveTo(0, -12).lineTo(0, -15).stroke({ color: 0xfbbf24, width: 1.5 });
      g.moveTo(0, 12).lineTo(0, 15).stroke({ color: 0xfbbf24, width: 1.5 });
      g.moveTo(-12, 0).lineTo(-15, 0).stroke({ color: 0xfbbf24, width: 1.5 });
      g.moveTo(12, 0).lineTo(15, 0).stroke({ color: 0xfbbf24, width: 1.5 });
    }
  }

  public syncState() {
    if (!gameState.visualMaskReady) return;
    const currentFactionIds = new Set<number>();

    this.debugInvalidAuthoritativeCapitalCells = 0;
    this.debugCapitalMarkersInAuthoritativeWater = 0;
    this.debugCapitalMarkersInVisualWater = 0;
    this.debugVisualFallbackCount = 0;

    for (const faction of gameState.factions.values()) {
      if (faction.capitalCell === undefined || faction.capitalCell < 0) continue;

      currentFactionIds.add(faction.factionId);

      const anchor = this.getVisualAnchor(faction.factionId, faction.capitalCell);

      let visual = this.activeVisuals.get(faction.factionId);
      if (!visual) {
        visual = this.visualPool.pop() || this.createVisual();
        visual.factionId = faction.factionId;
        this.activeVisuals.set(faction.factionId, visual);
        this.container.addChild(visual.container);
      }

      this.drawTacticalMarker(visual.icon, faction.colorInt, faction.isHuman);
    }

    for (const [id, anchor] of this.anchorCache.entries()) {
        const mask = gameState.visualLandMask;
        if (mask) {
            if (!isVisualLand(mask, anchor.x, anchor.y) || this.surface.field.ownerAtWorld(anchor.x, anchor.y) !== id) {
                this.debugCapitalMarkersInVisualWater++;
            }
        }
    }

    for (const [id, visual] of this.activeVisuals.entries()) {
      if (!currentFactionIds.has(id)) {
        this.container.removeChild(visual.container);
        this.visualPool.push(visual);
        this.activeVisuals.delete(id);
      }
    }
  }

  public animate(delta: number) {
    const time = Date.now() / 350;
    const pulse = 1.0 + Math.sin(time) * 0.12;
    
    const humanVisual = this.activeVisuals.get(gameState.yourFactionId);
    if (humanVisual) {
      humanVisual.icon.scale.set(pulse);
    }
  }

  public updateScreenSpace(projector: (x: number, y: number) => PIXI.Point, scale: number, lod: 'FAR' | 'MEDIUM' | 'CLOSE') {
    for (const visual of this.activeVisuals.values()) {
      const faction = gameState.factions.get(visual.factionId);
      if (!faction || faction.capitalCell === undefined) continue;

      const worldPos = this.getVisualAnchor(visual.factionId, faction.capitalCell);
      const screenPos = projector(worldPos.x, worldPos.y);
      
      visual.container.x = screenPos.x;
      visual.container.y = screenPos.y;

      const isHuman = visual.factionId === gameState.yourFactionId;
      if (lod === 'FAR') {
        // At world fit, drawing every capital marker adds a large amount of
        // tiny overdraw and makes the strategic composition noisy. Keep the
        // player's capital as the macro anchor; all capitals return at the
        // first regional scale where they can be read as geography.
        visual.container.visible = true;
        visual.icon.scale.set(isHuman ? 1.0 : 0.65);
        visual.container.alpha = isHuman ? 1.0 : 0.80;
      } else if (lod === 'MEDIUM') {
        visual.container.visible = true;
        visual.icon.scale.set(isHuman ? 1.05 : 0.85);
        visual.container.alpha = 0.95;
      } else {
        visual.container.visible = true;
        visual.icon.scale.set(isHuman ? 1.15 : 1.0);
        visual.container.alpha = 1.0;
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
    this.anchorCache.clear();
  }
}
