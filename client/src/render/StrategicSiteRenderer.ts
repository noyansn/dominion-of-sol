import * as PIXI from 'pixi.js';
import { EventType, gameState } from '../game/GameState';
import { StrategicSiteInfo } from '../game/Types';
import { WORLD_WIDTH } from './WorldSpace';

interface SiteVisual {
  root: PIXI.Container;
  glyph: PIXI.Graphics;
  label: PIXI.Text;
}

export class StrategicSiteRenderer {
  public readonly container = new PIXI.Container();
  private readonly visuals = new Map<string, SiteVisual>();
  private lod: 'FAR' | 'MEDIUM' | 'CLOSE' = 'FAR';
  private currentScale = 1;

  public init(): void { this.sync(); }

  public onGameStateUpdate(event: EventType): void {
    if (event === 'WORLD_SNAPSHOT' || event === 'CELL_DELTAS' || event === 'FACTIONS_CHANGED' || event === 'PORT_RESULT') this.sync();
  }

  private ownerColor(site: StrategicSiteInfo, portOwnerId?: number): number {
    if (portOwnerId && portOwnerId > 0) return gameState.factions.get(portOwnerId)?.colorInt ?? 0x9aa8b8;
    const ownerA = gameState.cellOwners[site.cellA] ?? 0;
    const ownerB = site.cellB == null ? ownerA : (gameState.cellOwners[site.cellB] ?? 0);
    if (ownerA === 0 || ownerA !== ownerB) return 0x9aa8b8;
    return gameState.factions.get(ownerA)?.colorInt ?? 0x9aa8b8;
  }

  private anchor(site: StrategicSiteInfo): { x: number; y: number } {
    const point = (cell: number) => ({ x: cell % WORLD_WIDTH + 0.5, y: Math.floor(cell / WORLD_WIDTH) + 0.5 });
    const a = point(site.cellA);
    if (site.cellB == null) return a;
    const b = point(site.cellB);
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  }

  private create(site: StrategicSiteInfo): SiteVisual {
    const root = new PIXI.Container();
    const glyph = new PIXI.Graphics();
    const label = new PIXI.Text({
      text: site.name,
      style: new PIXI.TextStyle({
        fontFamily: 'Outfit, "Trebuchet MS", sans-serif',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1.2,
        fill: 0xd7e0e8,
        stroke: { color: 0x050b14, width: 3.2 }
      }),
    });
    label.anchor.set(0.5, 1);
    root.addChild(glyph, label);
    this.container.addChild(root);
    return { root, glyph, label };
  }

  private sync(): void {
    const live = new Set<string>();
    const invScale = 1 / Math.max(0.25, this.currentScale);
    const textScale = (8.5 / 16) * invScale;

    for (const site of gameState.strategicSites) {
      live.add(site.id);
      const visual = this.visuals.get(site.id) ?? this.create(site);
      this.visuals.set(site.id, visual);
      const p = this.anchor(site);
      visual.root.position.set(p.x, p.y);
      visual.glyph.clear();
      const port = site.kind === 'PORT' ? gameState.ports.find(item => item.cellIndex === site.cellA) : undefined;

      // A static PORT site is not a built or under-construction port. Keep
      // those sites out of the production map so the symbol communicates a
      // real player construction, not a decorative harbor promise.
      if (site.kind === 'PORT' && !port) {
        visual.root.visible = false;
        visual.label.visible = false;
        continue;
      }

      const color = this.ownerColor(site, port?.ownerId);
      if (site.kind === 'PORT') {
        const radius = this.lod === 'CLOSE' ? 2.7 : this.lod === 'MEDIUM' ? 2.35 : 2.0;
        visual.glyph.circle(0, 0, radius).fill({ color: 0x07111e, alpha: 0.96 }).stroke({ color, width: 0.9 });
        visual.glyph.moveTo(-radius * 0.58, 0).lineTo(radius * 0.58, 0)
          .moveTo(0, -radius * 0.58).lineTo(0, radius * 0.58)
          .stroke({ color, width: 0.75 });
        if (port && !port.complete) {
          const progress = Math.max(0, Math.min(1, 1 - port.remainingSeconds / 10));
          visual.glyph.arc(0, 0, radius + 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
            .stroke({ color: 0xf0b35b, width: 1.1 });
        }
      } else {
        visual.glyph.poly([0, -2.8, 2.8, 0, 0, 2.8, -2.8, 0]).fill({ color: 0x07111e, alpha: 0.92 }).stroke({ color, width: 1 });
      }
      if (port) {
        visual.label.text = port.complete ? 'PORT' : `HARBOR · ${Math.ceil(port.remainingSeconds)}s`;
      } else {
        visual.label.text = site.name;
      }
      visual.label.scale.set(textScale);
      visual.label.position.set(0, -5 * invScale);

      // Semantic Zoom: Hide geographic landmark labels at FAR and MEDIUM LOD to prevent
      // screen domination. Only show crisp text when zoomed into CLOSE LOD.
      visual.label.visible = port ? (this.lod === 'CLOSE' || this.lod === 'MEDIUM') : (this.lod === 'CLOSE');
      visual.root.visible = this.lod !== 'FAR' || site.strategicValue >= 90;
    }
    for (const [id, visual] of this.visuals) if (!live.has(id)) {
      visual.root.destroy({ children: true });
      this.visuals.delete(id);
    }
  }

  public updateLOD(lod: 'FAR' | 'MEDIUM' | 'CLOSE', scale: number = 1): void {
    const scaleChanged = Math.abs(scale - this.currentScale) > 0.05;
    const lodChanged = lod !== this.lod;
    this.lod = lod;
    this.currentScale = scale;
    if (scaleChanged || lodChanged) {
      this.sync();
    }
  }
}
