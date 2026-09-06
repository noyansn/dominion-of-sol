import * as PIXI from 'pixi.js';

export interface CachedTile {
    key: string;
    col: number;
    row: number;
    texture: PIXI.Texture;
    source: PIXI.BufferImageSource;
    lastUsed: number;
}

export class TerrainTileCache {
    private cache = new Map<string, CachedTile>();
    private pendingFetches = new Map<string, Promise<PIXI.Texture | null>>();
    private maxResidentTiles: number;

    constructor(maxResidentTiles = 10) {
        this.maxResidentTiles = maxResidentTiles;
    }

    public getTileKey(col: number, row: number): string {
        return `${col}_${row}`;
    }

    public has(col: number, row: number): boolean {
        return this.cache.has(this.getTileKey(col, row));
    }

    public get(col: number, row: number): PIXI.Texture | null {
        const key = this.getTileKey(col, row);
        const entry = this.cache.get(key);
        if (entry) {
            entry.lastUsed = Date.now();
            return entry.texture;
        }
        return null;
    }

    public async requestTile(col: number, row: number): Promise<PIXI.Texture | null> {
        const key = this.getTileKey(col, row);
        const existing = this.cache.get(key);
        if (existing) {
            existing.lastUsed = Date.now();
            return existing.texture;
        }

        if (this.pendingFetches.has(key)) {
            return this.pendingFetches.get(key)!;
        }

        const fetchPromise = this.loadTileAsync(col, row, key);
        this.pendingFetches.set(key, fetchPromise);
        return fetchPromise;
    }

    private async loadTileAsync(col: number, row: number, key: string): Promise<PIXI.Texture | null> {
        try {
            const url = `/assets/terrain/lod2/tile_${col}_${row}.rgba`;
            const res = await fetch(url);
            if (!res.ok) {
                return null;
            }
            const buffer = await res.arrayBuffer();
            const pixels = new Uint8Array(buffer);
            if (pixels.length !== 1024 * 1024 * 4) {
                return null;
            }

            const source = new PIXI.BufferImageSource({
                resource: pixels,
                width: 1024,
                height: 1024,
                format: 'rgba8unorm',
                alphaMode: 'no-premultiply-alpha',
                autoGenerateMipmaps: false,
            });
            source.style.scaleMode = 'linear';

            const texture = new PIXI.Texture({ source });

            const cached: CachedTile = {
                key,
                col,
                row,
                texture,
                source,
                lastUsed: Date.now(),
            };

            this.cache.set(key, cached);
            this.pendingFetches.delete(key);
            this.enforceCapacity();

            return texture;
        } catch {
            this.pendingFetches.delete(key);
            return null;
        }
    }

    private enforceCapacity(): void {
        if (this.cache.size <= this.maxResidentTiles) {
            return;
        }

        // Sort by least recently used
        const entries = Array.from(this.cache.values()).sort((a, b) => a.lastUsed - b.lastUsed);
        const excess = this.cache.size - this.maxResidentTiles;

        for (let i = 0; i < excess; i++) {
            const toEvict = entries[i];
            if (toEvict) {
                this.cache.delete(toEvict.key);
                toEvict.texture.destroy(true);
            }
        }
    }

    public getResidentCount(): number {
        return this.cache.size;
    }

    public getEstimatedVramBytes(): number {
        return this.cache.size * (1024 * 1024 * 4);
    }
}
