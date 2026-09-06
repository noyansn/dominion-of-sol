import * as PIXI from 'pixi.js';
import { EventType, gameState } from '../game/GameState';
import { FrontInfo } from '../game/Types';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { flagAtlas } from '../ui/FlagAtlas';

interface WarVisual {
    container: PIXI.Container;
    arrow: PIXI.Graphics;
    motion: PIXI.Graphics;
    bubble: PIXI.Graphics;
    info: PIXI.Container;
    card: PIXI.Graphics;
    populationA: PIXI.Text;
    populationB: PIXI.Text;
    flagA: PIXI.Sprite;
    flagB: PIXI.Sprite;
    statusText: PIXI.Text;
    frontId: number;
    lastFront?: FrontInfo;
    presentationUntil: number;
}

export class WarRenderer {
    public container = new PIXI.Container();
    private activeVisuals = new Map<number, WarVisual>();
    private visualPool: WarVisual[] = [];
    private currentLOD: 'FAR' | 'MEDIUM' | 'CLOSE' = 'FAR';
    private animPhase: number = 0;
    // Keep a real combat event readable through a slow capture or a short
    // render hitch, while remaining a restrained transient presentation.
    private readonly presentationLifetimeMs = 3800;
    private readonly visualRefreshIntervalMs = 90;
    private lastVisualSyncAt = 0;
    private currentScale = 1;
    private worldOverview = false;

    constructor(private readonly surface: PoliticalSurfaceCache) {}

    public init(): void {
        for (let i = 0; i < 50; i++) {
            this.visualPool.push(this.createVisual());
        }
    }

    public onGameStateUpdate(event: EventType): void {
        if (event === 'WORLD_SNAPSHOT' || event === 'FRONTS_CHANGED' || event === 'CELL_DELTAS') {
            this.syncState(performance.now());
        }
    }

    private createVisual(): WarVisual {
        const container = new PIXI.Container();
        const arrow = new PIXI.Graphics();
        const motion = new PIXI.Graphics();
        const bubble = new PIXI.Graphics();
        const info = new PIXI.Container();
        const card = new PIXI.Graphics();
        
        const styleA = new PIXI.TextStyle({
            fontFamily: 'Outfit, monospace',
            fontSize: 12,
            fontWeight: '700',
            fill: '#f3b2b2',
            stroke: { color: '#090d16', width: 1.5 }
        });
        const styleB = new PIXI.TextStyle({
            fontFamily: 'Outfit, monospace',
            fontSize: 12,
            fontWeight: '700',
            fill: '#b8e7c8',
            stroke: { color: '#090d16', width: 1.5 }
        });

        const populationA = new PIXI.Text({ text: '', style: styleA });
        const populationB = new PIXI.Text({ text: '', style: styleB });
        populationA.anchor.set(0.5);
        populationB.anchor.set(0.5);
        const flagA = new PIXI.Sprite(flagAtlas.getTexture('flag_sol'));
        const flagB = new PIXI.Sprite(flagAtlas.getTexture('flag_sol'));
        for (const flag of [flagA, flagB]) {
            flag.anchor.set(0.5);
            flag.width = 30;
            flag.height = 20;
        }

        const statusStyle = new PIXI.TextStyle({
            fontFamily: 'Cinzel, Outfit, sans-serif',
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 1.0,
            fill: '#38bdf8',
            stroke: { color: '#090d16', width: 2 }
        });
        const statusText = new PIXI.Text({ text: 'CONTESTED', style: statusStyle });
        statusText.anchor.set(0.5);
        statusText.position.set(0, 41);

        info.addChild(card, flagA, flagB, populationA, populationB, statusText);
        container.addChild(arrow, motion, bubble, info);
        return { container, arrow, motion, bubble, info, card, populationA, populationB, flagA, flagB, statusText, frontId: -1, presentationUntil: 0 };
    }

    private syncState(now = performance.now()): void {
        this.lastVisualSyncAt = now;
        const current = new Set<number>();
        for (const front of gameState.fronts.values()) {
            let visual = this.activeVisuals.get(front.frontId);
            if (front.isCombatActive) {
                if (!visual) {
                    visual = this.visualPool.pop() || this.createVisual();
                    visual.frontId = front.frontId;
                    this.activeVisuals.set(front.frontId, visual);
                    this.container.addChild(visual.container);
                    if ((import.meta as any).env?.DEV) console.log(`[WAR_RENDER] real active front=${front.frontId} attacker=${front.attackerFaction}`);
                }
                // This is a presentation hold for a real authoritative combat
                // event. It does not create or prolong simulation state.
                visual.lastFront = { ...front };
                visual.presentationUntil = now + this.presentationLifetimeMs;
            } else if (visual?.lastFront && visual.presentationUntil > now) {
                // Keep the last real payload readable for a restrained moment
                // after the server clears the active flag.
            } else {
                continue;
            }

            if (!visual) continue;
            current.add(front.frontId);
            const presentedFront = front.isCombatActive ? front : visual.lastFront!;

            if (!visual.container.parent) {
                this.container.addChild(visual.container);
            }

            const point = this.surface.field.findNearestBorderPoint(
                presentedFront.factionA,
                presentedFront.factionB,
                presentedFront.centroidX,
                presentedFront.centroidY,
            ) || this.safeCentroid(presentedFront);
            if (!point) {
                visual.container.visible = false;
                continue;
            }

            visual.container.visible = !this.worldOverview;
            visual.container.position.set(point.x, point.y);
            // The operational vector remains in world space, while the
            // tactical card stays a restrained screen-space annotation.
            visual.info.scale.set(1 / Math.max(0.25, this.currentScale));
            // At world and regional scales the map labels already identify
            // the two factions. Keep numeric combat detail for close
            // inspection so it never masks the country label or terrain.
            const detailed = this.currentScale >= 1.25;
            visual.info.visible = detailed;
            visual.arrow.visible = detailed;
            visual.motion.visible = detailed;

            const attackerIsA = presentedFront.attackerFaction === presentedFront.factionA;
            const factionA = gameState.factions.get(presentedFront.factionA);
            const factionB = gameState.factions.get(presentedFront.factionB);
            // Use the authoritative faction descriptors rather than the
            // generic fallback icon; close inspection must identify sides.
            visual.flagA.texture = factionA?.flagDescriptor
                ? flagAtlas.getTextureForDescriptor(factionA.flagDescriptor)
                : flagAtlas.getTexture(factionA?.flagId || 'flag_sol');
            visual.flagB.texture = factionB?.flagDescriptor
                ? flagAtlas.getTextureForDescriptor(factionB.flagDescriptor)
                : flagAtlas.getTexture(factionB?.flagId || 'flag_sol');
            visual.flagA.width = visual.flagB.width = 30;
            visual.flagA.height = visual.flagB.height = 20;
            // The map already supplies faction names. The tactical bubble is
            // intentionally icon + real engaged force only, avoiding the old
            // world-space markers stay compact; detailed values remain in the
            // command console so geography remains the hero.
            visual.populationA.text = this.formatPower(presentedFront.deployedPopulationA);
            visual.populationB.text = this.formatPower(presentedFront.deployedPopulationB);

            const status = presentedFront.frontStatus || 'CONTESTED';
            visual.statusText.text = status;
            let statusColor = '#38bdf8';
            if (status === 'ISOLATED') statusColor = '#ef4444';
            else if (status === 'ADVANCING') statusColor = '#22c55e';
            else if (status === 'RETREATING') statusColor = '#f97316';
            visual.statusText.style.fill = statusColor;

            let nx = presentedFront.normalX, ny = presentedFront.normalY;
            const length = Math.hypot(nx, ny) || 1;
            nx /= length;
            ny /= length;

            const scale = Math.max(0.25, this.currentScale);
            // Keep the two compact tactical plates clear of the center marker
            // so the actual engagement remains visible between them.
            const gapPx = 48;
            // info already cancels camera scale. Its children use CSS pixels;
            // dividing a second time collapses both force labels together.
            const gap = gapPx;
            // A single horizontal information row sits BELOW the operation,
            // clear of its directional arrows and the country-name baseline.
            visual.populationA.position.set(-gap + 16, 41);
            visual.populationB.position.set(gap + 16, 41);
            visual.flagA.position.set(-gap - 16, 41);
            visual.flagB.position.set(gap - 16, 41);

            visual.arrow.clear();
            visual.bubble.clear();
            visual.card.clear();
            visual.motion.clear();

            // Compact engagement ring + diamond: readable at regional zoom,
            // quiet at world zoom, and never a large UI panel over the map.
            const markerRadius = (detailed ? 6 : 5) / scale;
            const innerRadius = 2 / scale;
            visual.bubble.circle(0, 0, markerRadius);
            visual.bubble.fill({ color: 0x07131c, alpha: 0.92 });
            visual.bubble.stroke({ color: presentedFront.attackerFaction === presentedFront.factionA ? 0x38bdf8 : 0xc084fc, width: 1.5 / scale, alpha: 0.95 });
            visual.bubble.circle(0, 0, innerRadius);
            visual.bubble.fill({ color: presentedFront.deployedPopulationA >= presentedFront.deployedPopulationB ? 0x15803d : 0xb91c1c, alpha: 0.96 });
            visual.bubble.stroke({ color: 0xf8fafc, width: 1.0 / scale, alpha: 0.9 });
            const diamondTip = 6 / scale;
            const diamondShoulder = 3 / scale;
            visual.bubble.poly([0, -diamondTip, diamondShoulder, -diamondShoulder, 0, -3 / scale, -diamondShoulder, -diamondShoulder]);
            visual.bubble.fill({ color: 0xf8fafc, alpha: 0.9 });
            const totalPopulation = Math.max(1, presentedFront.deployedPopulationA + presentedFront.deployedPopulationB);
            const populationRatio = Math.max(0.08, Math.min(0.92, presentedFront.deployedPopulationA / totalPopulation));
            visual.bubble.arc(0, 0, 8 / scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * populationRatio)
                .stroke({ color: attackerIsA ? 0x38bdf8 : 0xc084fc, width: 1.1 / scale, alpha: 0.9 });

            this.drawTacticalPlate(visual.card, visual.populationA, visual.populationA.position.x, visual.populationA.position.y, attackerIsA ? 0x38bdf8 : 0x94a3b8);
            this.drawTacticalPlate(visual.card, visual.populationB, visual.populationB.position.x, visual.populationB.position.y, attackerIsA ? 0x94a3b8 : 0xc084fc);

            // Operational vector follows the authoritative A→B normal, or
            // reverses it when the server says B is the attacker.
            // Single authoritative operational spearhead oriented strictly toward
            // the player's intended target corridor or objective.
            let attackDirX = presentedFront.attackerFaction === presentedFront.factionA ? -nx : nx;
            let attackDirY = presentedFront.attackerFaction === presentedFront.factionA ? -ny : ny;
            if (presentedFront.intentTargetCellIndex) {
                const tx = (presentedFront.intentTargetCellIndex % 1024) + 0.5;
                const ty = Math.floor(presentedFront.intentTargetCellIndex / 1024) + 0.5;
                let cdx = tx - point.x;
                if (cdx > 512) cdx -= 1024;
                if (cdx < -512) cdx += 1024;
                const cdy = ty - point.y;
                const clen = Math.hypot(cdx, cdy);
                if (clen > 0.5) {
                    attackDirX = cdx / clen;
                    attackDirY = cdy / clen;
                }
            }

            const arrowSpan = 22 / scale;
            const arrowColor = attackerIsA ? 0x38bdf8 : 0xf43f5e;
            if (detailed) {
                this.drawOperationalArrow(
                    visual.arrow,
                    -attackDirX * arrowSpan * 0.45,
                    -attackDirY * arrowSpan * 0.45,
                    attackDirX * arrowSpan * 0.55,
                    attackDirY * arrowSpan * 0.55,
                    arrowColor,
                    scale,
                );
                visual.motion.moveTo(-3 / scale, -2.5 / scale).lineTo(0, 0).lineTo(-3 / scale, 2.5 / scale)
                    .stroke({ color: 0xf8fafc, width: 1.2 / scale, alpha: 0.95 });
            }
        }

        for (const [id, visual] of this.activeVisuals) {
            if (!current.has(id) || visual.presentationUntil <= now) {
                this.container.removeChild(visual.container);
                visual.container.visible = false;
                visual.lastFront = undefined;
                visual.presentationUntil = 0;
                this.visualPool.push(visual);
                this.activeVisuals.delete(id);
            }
        }
    }

    private safeCentroid(front: FrontInfo): { x: number; y: number } | null {
        if (!Number.isFinite(front.centroidX) || !Number.isFinite(front.centroidY)) return null;
        if (front.centroidX < 0 || front.centroidX > 1024 || front.centroidY < 0 || front.centroidY > 512) return null;
        return { x: front.centroidX, y: front.centroidY };
    }

    private formatPower(power: number): string {
        if (!Number.isFinite(power)) return '0';
        if (power >= 1000) return `${(power / 1000).toFixed(1)}k`;
        return Math.max(0, Math.floor(power)).toString();
    }

    private drawTacticalPlate(g: PIXI.Graphics, text: PIXI.Text, x: number, y: number, accent: number): void {
        const bounds = text.getLocalBounds();
        const padX = 4.5;
        const padY = 2.5;
        g.roundRect(
            x + bounds.x - padX,
            y + bounds.y - padY,
            bounds.width + padX * 2,
            bounds.height + padY * 2,
            3,
        );
        g.fill({ color: 0x07131c, alpha: 0.88 });
        g.stroke({ color: accent, width: 0.9, alpha: 0.76 });
    }

    private drawOperationalArrow(g: PIXI.Graphics, fromX: number, fromY: number, toX: number, toY: number, color: number, scale: number): void {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        
        // Curved lateral control point
        const arc = len * 0.20;
        const cx = (fromX + toX) * 0.5 + nx * arc;
        const cy = (fromY + toY) * 0.5 + ny * arc;

        // Outer dark silhouette / casing
        g.moveTo(fromX, fromY).quadraticCurveTo(cx, cy, toX, toY).stroke({ color: 0x030712, width: 2.6 / scale, alpha: 0.72 });
        // Restrained steel/cyan tactical ribbon.
        g.moveTo(fromX, fromY).quadraticCurveTo(cx, cy, toX, toY).stroke({ color, width: 1.4 / scale, alpha: 0.94 });

        // Tangent angle at arrow head
        const tangentX = toX - cx;
        const tangentY = toY - cy;
        const a = Math.atan2(tangentY, tangentX);
        const headLen = 4.5 / scale;
        const headWidth = Math.PI / 5.0;

        // Arrow head casing & fill
        const leftX = toX - headLen * Math.cos(a - headWidth);
        const leftY = toY - headLen * Math.sin(a - headWidth);
        const rightX = toX - headLen * Math.cos(a + headWidth);
        const rightY = toY - headLen * Math.sin(a + headWidth);

        g.poly([toX, toY, leftX, leftY, (toX + (leftX + rightX) * 0.5) * 0.5, (toY + (leftY + rightY) * 0.5) * 0.5, rightX, rightY]);
        g.fill({ color });
        g.stroke({ color: 0x030712, width: 0.9 / scale });
    }

    public animate(_delta: number): void {
        const now = performance.now();
        this.animPhase = (now / 1800) % 1;
        const pulse = 1.0 + Math.sin(now / 550) * 0.035;
        for (const visual of this.activeVisuals.values()) {
            visual.bubble.scale.set(pulse);
            const front = visual.lastFront;
            if (front && visual.motion.visible && visual.container.visible) {
                const sign = front.attackerFaction === front.factionA ? 1 : -1;
                const length = Math.hypot(front.normalX, front.normalY) || 1;
                const nx = sign * front.normalX / length, ny = sign * front.normalY / length;
                const t = this.animPhase, scale = Math.max(.25, this.currentScale);
                const along = (-18 + 36 * t) / scale, bend = 14.4 * (1-t) * t / scale;
                visual.motion.position.set(nx * along - ny * bend, ny * along + nx * bend);
                visual.motion.rotation = Math.atan2(ny, nx) + Math.atan2(17.6*(1-2*t),44);
                visual.motion.alpha = Math.sin(Math.PI*t);
            }
        }
        if (this.activeVisuals.size > 0 && now - this.lastVisualSyncAt >= this.visualRefreshIntervalMs) {
            this.syncState(now);
        }
    }

    public updateLOD(lod: 'FAR' | 'MEDIUM' | 'CLOSE', scale = 1): void {
        const overview = scale <= ((window as any).__DOMINION_RENDERER__?.fitScale || 1) * 1.18;
        const changed = this.currentLOD !== lod || Math.abs(scale - this.currentScale) > .001 || overview !== this.worldOverview;
        this.currentLOD = lod;
        this.currentScale = scale;
        this.worldOverview = overview;
        if (changed && this.activeVisuals.size) this.syncState(performance.now());
        this.container.alpha = lod === 'FAR' ? 0.85 : 1.0;
    }

    public clear(): void {
        for (const visual of this.activeVisuals.values()) {
            visual.container.visible = false;
            this.container.removeChild(visual.container);
            this.visualPool.push(visual);
        }
        this.activeVisuals.clear();
    }
}
