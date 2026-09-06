import * as PIXI from 'pixi.js';
import { PoliticalTextureSource } from './PoliticalTextureUpload';
import type { FactionInfo } from '../game/Types';
import {
    POLITICAL_HEIGHT,
    POLITICAL_WIDTH,
} from './PoliticalSpace';

// Keep coast lookup texels identical to the 4x CPU field. Dirty block uploads
// avoid whole-texture transfers without throwing away coastal ownership.
const GPU_WIDTH = POLITICAL_WIDTH;
const GPU_HEIGHT = POLITICAL_HEIGHT;

const PIXEL_COUNT =
    POLITICAL_WIDTH * POLITICAL_HEIGHT;

import { gameState } from '../game/GameState';

function computeSpotlightAlphas(factions: ReadonlyMap<number, FactionInfo>): Uint8Array {
    const table = new Uint8Array(256);
    const spotlightId = gameState?.spotlightFactionId ?? null;
    const spotlightFaction = spotlightId ? factions.get(spotlightId) : null;

    if (spotlightId && spotlightFaction) {
        table.fill(155); // Distant factions receded to 60% presentation strength
        const capA = spotlightFaction.capitalCell;
        const ax = capA % 1024;
        const ay = Math.floor(capA / 1024);
        for (const [id, f] of factions) {
            if (id === spotlightId) {
                table[id] = 255; // Selected country gets 100% full brilliance
            } else {
                const capB = f.capitalCell;
                let dx = Math.abs((capB % 1024) - ax);
                if (dx > 512) dx = 1024 - dx;
                const dy = Math.abs(Math.floor(capB / 1024) - ay);
                if (Math.hypot(dx, dy) < 130) {
                    table[id] = 200; // Immediate neighbors get 78% presence
                }
            }
        }
    } else {
        table.fill(235); // 92% full atlas saturation for all nations when idle
    }
    table[0] = 0;
    return table;
}

export function fillPoliticalRgba(
    owners: Uint8Array,
    factions: ReadonlyMap<number, FactionInfo>,
    out: Uint8Array,
): void {
    if (owners.length !== PIXEL_COUNT) {
        throw new Error(
            `Owner buffer size mismatch: ` +
            `${owners.length} != ${PIXEL_COUNT}`,
        );
    }
    if (out.length !== PIXEL_COUNT * 4) {
        throw new Error(
            `RGBA buffer size mismatch: ` +
            `${out.length} != ${PIXEL_COUNT * 4}`,
        );
    }
    const alphas = computeSpotlightAlphas(factions);
    for (let i = 0; i < owners.length; i++) {
        const p = i * 4;
        const owner = owners[i];

        if (owner === 0) {
            out[p] = 0;
            out[p + 1] = 0;
            out[p + 2] = 0;
            out[p + 3] = 0;
            continue;
        }

        const faction = factions.get(owner);

        if (!faction) {
            out[p] = 0;
            out[p + 1] = 0;
            out[p + 2] = 0;
            out[p + 3] = 0;
            continue;
        }

        const color = faction.colorInt >>> 0;

        out[p] = (color >>> 16) & 0xff;
        out[p + 1] = (color >>> 8) & 0xff;
        out[p + 2] = color & 0xff;
        out[p + 3] = alphas[owner];
    }
}

export class PoliticalColorTexture {
    public sourceRevision = 0;
    public hasData = false;
    private pendingUpload = false;
    private lastUploadAt = 0;
    public readonly colorBuffer =
        new Uint8Array(PIXEL_COUNT * 4);
    public readonly gpuColorBuffer = this.colorBuffer;

    public readonly source =
        new PoliticalTextureSource({
            resource: this.gpuColorBuffer,
            width: GPU_WIDTH,
            height: GPU_HEIGHT,
            format: 'rgba8unorm',
            alphaMode: 'no-premultiply-alpha',
            autoGenerateMipmaps: false,
        });

    public readonly texture =
        new PIXI.Texture({
            source: this.source,
        });

    constructor() {
        this.source.style.scaleMode = 'nearest';
    }

    public update(
        owners: Uint8Array,
        factions: ReadonlyMap<number, FactionInfo>,
        revision: number,
    ): void {
        this.sourceRevision = revision;
        fillPoliticalRgba(
            owners,
            factions,
            this.colorBuffer,
        );
        this.source.markFull();
        this.source.update();
        this.pendingUpload = false;
        this.lastUploadAt = performance.now();
        this.hasData = true;
    }

    /** Update only the ownership rectangle changed by the simulation. */
    public updateRect(
        owners: Uint8Array,
        factions: ReadonlyMap<number, FactionInfo>,
        revision: number,
        rect: { minX: number; minY: number; maxX: number; maxY: number } | null,
    ): void {
        if (owners.length !== PIXEL_COUNT) {
            throw new Error(
                `Owner buffer size mismatch: ${owners.length} != ${PIXEL_COUNT}`,
            );
        }
        this.sourceRevision = revision;
        if (!rect) return;

        const minX = Math.max(0, Math.floor(rect.minX));
        const minY = Math.max(0, Math.floor(rect.minY));
        const maxX = Math.min(POLITICAL_WIDTH, Math.ceil(rect.maxX));
        const maxY = Math.min(POLITICAL_HEIGHT, Math.ceil(rect.maxY));

        const alphas = computeSpotlightAlphas(factions);
        for (let y = minY; y < maxY; y++) {
            let i = y * POLITICAL_WIDTH + minX;
            const end = y * POLITICAL_WIDTH + maxX;
            for (; i < end; i++) {
                const p = i * 4;
                const owner = owners[i];
                const faction = owner === 0 ? undefined : factions.get(owner);
                const color = faction?.colorInt ?? 0;
                this.colorBuffer[p] = (color >>> 16) & 0xff;
                this.colorBuffer[p + 1] = (color >>> 8) & 0xff;
                this.colorBuffer[p + 2] = color & 0xff;
                this.colorBuffer[p + 3] = faction ? alphas[owner] : 0;
            }
        }

        this.source.markVisualRect(rect, 1);

        // One coalesced dirty-block upload in the render frame.
        this.pendingUpload = true;
        this.hasData = true;
    }

    public updateSpotlight(owners: Uint8Array, factions: ReadonlyMap<number, FactionInfo>): void {
        const alphas = computeSpotlightAlphas(factions);
        for (let i = 0; i < owners.length; i++) {
            const owner = owners[i];
            if (owner > 0) {
                this.colorBuffer[i * 4 + 3] = alphas[owner];
            }
        }
        this.source.markFull();
        this.source.update();
    }

    public flushPending(now = performance.now(), minIntervalMs = 0): void {
        if (!this.pendingUpload || now - this.lastUploadAt < minIntervalMs) return;
        this.source.update();
        this.pendingUpload = false;
        this.lastUploadAt = now;
    }

}
