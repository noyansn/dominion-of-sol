import * as PIXI from 'pixi.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './WorldSpace';
import { worldReliefTexture } from './WorldReliefTexture';

// Centralized Visual Quality Target Constants
export const TARGET_DENSITY = 2.50;
export const HYSTERESIS_DOWNGRADE = 2.75;

interface ActiveTile {
    key: string;
    col: number;
    row: number;
    level: 'REGIONAL' | 'DETAIL';
    mesh: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;
    debugText?: PIXI.Text;
    texture?: PIXI.Texture;
    currentAlpha: number;
    targetAlpha: number;
    lastUsedFrame: number;
    requestedUrl: string;
    createdAt: number;
    loadedAt?: number;
}

interface CachedTexture {
    texture: PIXI.Texture;
    lastUsedFrame: number;
    byteLength: number;
}

export class TerrainLodManager {
    public readonly container = new PIXI.Container();
    public readonly debugContainer = new PIXI.Container();
    
    private activeTiles = new Map<string, ActiveTile>();
    private tilePool: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>[] = [];
    // Keep decoded GPU textures bounded as well as the active mesh pool. The
    // detail pyramid contains hundreds of tiles, so an unbounded map would
    // quietly retain every tile visited during a long pan session.
    private textureCache = new Map<string, CachedTexture>();
    
    private currentFrame = 0;
    public maxResidentTiles = 32;
    
    public currentLevel: 'GLOBAL' | 'REGIONAL' | 'DETAIL' = 'GLOBAL';
    public cameraScale = 1.0;
    public worldFitScale = 1.0;
    public normalizedZoom = 1.0;
    public screenWorldWidthPx = 1024.0;
    
    public globalDensity = 4.0;
    public regionalDensity = 8.0;
    public nativeDensity = 21.09;
    
    public visibleTileCount = 0;
    public residentTileCount = 0;
    public residentTextureBytes = 0;
    public cachedTextureCount = 0;
    public tileLoadCount = 0;
    public tileCacheHitCount = 0;
    public tileEvictionCount = 0;
    public visibleTileKeys: string[] = [];
    // `visibleTileKeys` intentionally remains the complete atomic coverage
    // set: all of these tiles must be decoded before a streamed LOD appears.
    // The smaller set below is the subset that actually intersects the current
    // viewport and therefore needs a GPU draw call this frame. Its one-tile
    // coverage margin stays resident/preloaded but is not rendered offscreen.
    private displayTileKeys = new Set<string>();
    private lastViewportWorldBounds = { minX: 0, minY: 0, maxX: WORLD_WIDTH, maxY: WORLD_HEIGHT };
    private lastEstimatedRegionalTiles = 0;
    private lastEstimatedDetailTiles = 0;
    private hasTileTransitions = false;
    
    public debugMode = false;
    public forceGlobal = false;

    private tileVertexSrc = `
        attribute vec2 aPosition;
        attribute vec2 aUV;
        varying vec2 vUV;
        uniform mat3 uProjectionMatrix;
        uniform mat3 uWorldTransformMatrix;
        uniform mat3 uTransformMatrix;
        uniform vec2 uTileOrigin;
        varying vec2 vWorldUV;

        void main() {
            mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
            gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
            vUV = aUV;
            vWorldUV = (uTileOrigin + aPosition) / vec2(1024.0, 512.0);
        }
    `;

    private tileFragmentSrc = `
        precision highp float;
        varying vec2 vUV;
        varying vec2 vWorldUV;
        uniform sampler2D uTileTexture;
        uniform sampler2D uWorldReliefTexture;
        uniform float uAlpha;
        uniform float uDebugMode;
        uniform vec3 uDebugTint;

        const vec2 TEXEL = vec2(1.0 / 512.0);

        void main() {
            // Streamed SRTM tiles are rectangular textures, while the
            // canonical world is land-only. Without the same alpha mask used
            // by the global relief pass, an otherwise complete tile paints a
            // visible rectangular patch across ocean. Clip that presentation
            // layer at the canonical coastline before applying relief.
            if (texture2D(uWorldReliefTexture, vWorldUV).a < 0.05) discard;

            vec4 col = texture2D(uTileTexture, vUV);
            float srtm = col.r;

            // Slope-aware relief modulation
            float sLeft  = texture2D(uTileTexture, vUV - vec2(TEXEL.x, 0.0)).r;
            float sRight = texture2D(uTileTexture, vUV + vec2(TEXEL.x, 0.0)).r;
            float sUp    = texture2D(uTileTexture, vUV - vec2(0.0, TEXEL.y)).r;
            float sDown  = texture2D(uTileTexture, vUV + vec2(0.0, TEXEL.y)).r;

            float dx = (sRight - sLeft) * 2.0;
            float dy = (sDown - sUp) * 2.0;
            float slope = clamp(sqrt(dx * dx + dy * dy) * 3.2, 0.0, 1.0);

            // Slope-gated: flat plains stay smooth; mountain slopes gain crisp ridge definition
            float reliefMod = 1.0 + (srtm - 0.50) * 0.36 * (0.16 + 0.84 * slope);
            vec3 tileColor = vec3(clamp(reliefMod, 0.65, 1.35));

            // F8 Tile Debug Mode: Obvious alternating magenta / cyan overlay + red border
            if (uDebugMode > 0.5) {
                float borderX = step(0.025, vUV.x) * step(vUV.x, 0.975);
                float borderY = step(0.025, vUV.y) * step(vUV.y, 0.975);
                float isBorder = 1.0 - (borderX * borderY);

                tileColor = mix(tileColor, uDebugTint, 0.45);
                if (isBorder > 0.5) {
                    tileColor = vec3(1.0, 0.1, 0.1);
                }
            }

            gl_FragColor = vec4(tileColor, uAlpha);
        }
    `;

    public init(): void {
        this.container.label = 'TerrainLodTiles';
        this.container.blendMode = 'multiply';
        this.debugContainer.label = 'TerrainLodDebug';
        this.debugContainer.visible = false;
        console.log('[TerrainLodManager] Initialized Quality-Driven SRTM Tiled LOD subsystem (TARGET_DENSITY = 2.50).');
    }

    public toggleDebugMode(): boolean {
        this.debugMode = !this.debugMode;
        this.debugContainer.visible = this.debugMode;
        
        for (const active of this.activeTiles.values()) {
            if (active.mesh.shader) {
                (active.mesh.shader.resources as any).uDebugMode = this.debugMode ? 1.0 : 0.0;
            }
            if (active.debugText) {
                active.debugText.visible = this.debugMode;
            }
        }
        if (this.debugMode) {
            console.log('[LOD_FORENSICS]', JSON.stringify(this.getDebugSnapshot()));
        }
        return this.debugMode;
    }

    public getDebugSnapshot() {
        const visible = new Set(this.visibleTileKeys);
        const tiles = this.visibleTileKeys.map(key => {
            const parts = key.split('_');
            const col = Number(parts.at(-2));
            const row = Number(parts.at(-1));
            const level = key.startsWith('regional_') ? 'REGIONAL' : 'DETAIL';
            const cols = level === 'REGIONAL' ? 16 : 43;
            const rows = level === 'REGIONAL' ? 8 : 22;
            const tileWorldWidth = WORLD_WIDTH / cols;
            const tileWorldHeight = WORLD_HEIGHT / rows;
            const active = this.activeTiles.get(key);
            const source = active?.texture?.source as any;
            const neighborKeys = [
                `${level === 'REGIONAL' ? 'regional' : 'detail'}_${col - 1}_${row}`,
                `${level === 'REGIONAL' ? 'regional' : 'detail'}_${col + 1}_${row}`,
                `${level === 'REGIONAL' ? 'regional' : 'detail'}_${col}_${row - 1}`,
                `${level === 'REGIONAL' ? 'regional' : 'detail'}_${col}_${row + 1}`,
            ].filter(neighbor => visible.has(neighbor));

            let screenBounds: { x: number; y: number; width: number; height: number } | null = null;
            try {
                const bounds = active?.mesh.getBounds();
                if (bounds) {
                    screenBounds = {
                        x: Number(bounds.x.toFixed(3)),
                        y: Number(bounds.y.toFixed(3)),
                        width: Number(bounds.width.toFixed(3)),
                        height: Number(bounds.height.toFixed(3)),
                    };
                }
            } catch {
                // Diagnostic-only bounds; a stale pooled mesh must not affect rendering.
            }
            const mesh = active?.mesh as any;
            const textureSource = active?.texture?.source as any;
            return {
                id: key,
                lod: level,
                requestedLod: active?.level ?? level,
                requestedUrl: active?.requestedUrl ?? this.tileUrl(level, col, row),
                worldBounds: {
                    minX: col * tileWorldWidth,
                    minY: row * tileWorldHeight,
                    maxX: (col + 1) * tileWorldWidth,
                    maxY: (row + 1) * tileWorldHeight,
                },
                textureSize: active?.texture ? {
                    width: Number(source?.width || source?.pixelWidth || 0),
                    height: Number(source?.height || source?.pixelHeight || 0),
                } : null,
                textureSourceIdentity: textureSource ? {
                    uid: Number(textureSource.uid ?? 0),
                    label: String(textureSource.label ?? ''),
                    resourceType: String(textureSource.resource?.constructor?.name ?? ''),
                } : null,
                alpha: active?.currentAlpha ?? 0,
                meshAlpha: Number(mesh?.alpha ?? 1),
                tint: Number(mesh?.tint ?? 0xffffff),
                blendMode: String(mesh?.blendMode ?? this.container.blendMode),
                zIndex: Number(mesh?.zIndex ?? 0),
                visible: Boolean(mesh?.visible),
                transitioning: Boolean(active && Math.abs(active.currentAlpha - active.targetAlpha) > 0.001),
                loaded: Boolean(active?.texture),
                fallback: false,
                createdAt: active?.createdAt ?? 0,
                loadedAt: active?.loadedAt ?? null,
                neighbors: neighborKeys,
            };
        });

        return {
            level: this.currentLevel,
            cameraScale: this.cameraScale,
            normalizedZoom: this.normalizedZoom,
            viewportWorldBounds: this.lastViewportWorldBounds,
            estimatedRequiredTiles: {
                regional: this.lastEstimatedRegionalTiles,
                detail: this.lastEstimatedDetailTiles,
            },
            visibleTileCount: this.visibleTileCount,
            residentTileCount: this.residentTileCount,
            cacheBytes: this.residentTextureBytes,
            coverageReady: this.currentLevel === 'GLOBAL' || (
                this.visibleTileKeys.length > 0 &&
                this.visibleTileKeys.every(key => Boolean(this.activeTiles.get(key)?.texture))
            ),
            terrainMaskClip: 'world_relief_alpha',
            container: {
                visible: this.container.visible,
                alpha: this.container.alpha,
                tint: Number((this.container as any).tint ?? 0xffffff),
                blendMode: String(this.container.blendMode),
                zIndex: this.container.zIndex,
                childCount: this.container.children.length,
            },
            tiles,
        };
    }

    public toggleForceGlobal(): boolean {
        this.forceGlobal = !this.forceGlobal;
        return this.forceGlobal;
    }

    public update(
        viewportWorldBounds: { minX: number; minY: number; maxX: number; maxY: number },
        currentScale: number,
        worldFitScale: number
    ): void {
        this.currentFrame++;
        this.lastViewportWorldBounds = { ...viewportWorldBounds };
        const previousLevel = this.currentLevel;
        this.cameraScale = currentScale;
        this.worldFitScale = worldFitScale;
        this.normalizedZoom = currentScale / (worldFitScale || 1.0);
        this.screenWorldWidthPx = WORLD_WIDTH * currentScale;

        // True Screen Texel Density Calculation:
        this.globalDensity = 4096.0 / this.screenWorldWidthPx;
        this.regionalDensity = 8192.0 / this.screenWorldWidthPx;
        this.nativeDensity = 21600.0 / this.screenWorldWidthPx;

        // Quality-Driven LOD Selection Policy with Asymmetric Hysteresis (TARGET_DENSITY = 2.50):
        let targetLevel = this.currentLevel;

        if (this.forceGlobal) {
            targetLevel = 'GLOBAL';
        } else if (this.currentLevel === 'GLOBAL') {
            // UPGRADE when current source falls below TARGET_DENSITY (2.50)
            if (this.globalDensity < TARGET_DENSITY) {
                targetLevel = this.regionalDensity >= TARGET_DENSITY ? 'REGIONAL' : 'DETAIL';
            }
        } else if (this.currentLevel === 'REGIONAL') {
            // DOWNGRADE only when lower resolution source satisfies HYSTERESIS_DOWNGRADE (2.75)
            if (this.globalDensity > HYSTERESIS_DOWNGRADE) {
                targetLevel = 'GLOBAL';
            } else if (this.regionalDensity < TARGET_DENSITY) {
                // UPGRADE to native detail when regional falls below 2.50
                targetLevel = 'DETAIL';
            }
        } else if (this.currentLevel === 'DETAIL') {
            // DOWNGRADE only when regional satisfies HYSTERESIS_DOWNGRADE (2.75)
            if (this.regionalDensity > HYSTERESIS_DOWNGRADE) {
                targetLevel = this.globalDensity > HYSTERESIS_DOWNGRADE ? 'GLOBAL' : 'REGIONAL';
            }
        }

        // Never place a partial high-resolution layer over the complete
        // global base. At the Europe framing the detail pyramid can expose
        // ~168 tiles while the bounded cache holds 32, which creates a
        // rectangular high-LOD island. Use the existing lower LOD until its
        // visible coverage fits the same bounded resident budget.
        const estimatedTiles = (level: 'REGIONAL' | 'DETAIL'): number => {
            const cols = level === 'REGIONAL' ? 16 : 43;
            const rows = level === 'REGIONAL' ? 8 : 22;
            const tileWorldWidth = WORLD_WIDTH / cols;
            const tileWorldHeight = WORLD_HEIGHT / rows;
            const minCol = Math.max(0, Math.floor(viewportWorldBounds.minX / tileWorldWidth) - 1);
            const maxCol = Math.min(cols - 1, Math.floor(viewportWorldBounds.maxX / tileWorldWidth) + 1);
            const minRow = Math.max(0, Math.floor(viewportWorldBounds.minY / tileWorldHeight) - 1);
            const maxRow = Math.min(rows - 1, Math.floor(viewportWorldBounds.maxY / tileWorldHeight) + 1);
            return Math.max(0, maxCol - minCol + 1) * Math.max(0, maxRow - minRow + 1);
        };

        this.lastEstimatedRegionalTiles = estimatedTiles('REGIONAL');
        this.lastEstimatedDetailTiles = estimatedTiles('DETAIL');

        if (targetLevel === 'DETAIL' && estimatedTiles('DETAIL') > this.maxResidentTiles) {
            targetLevel = 'REGIONAL';
        }
        if (targetLevel === 'REGIONAL' && estimatedTiles('REGIONAL') > this.maxResidentTiles) {
            targetLevel = 'GLOBAL';
        }

        this.currentLevel = targetLevel;
        if (targetLevel !== previousLevel) this.recycleActiveTiles();

        let cols = 0;
        let rows = 0;
        let folder = '';

        if (targetLevel === 'REGIONAL') {
            cols = 16;
            rows = 8;
            folder = 'regional';
        } else if (targetLevel === 'DETAIL') {
            cols = 43;
            rows = 22;
            folder = 'detail';
        }

        if (targetLevel === 'GLOBAL') {
            this.container.visible = false;
            this.debugContainer.visible = false;
            this.visibleTileCount = 0;
            this.visibleTileKeys = [];
            this.displayTileKeys.clear();
            this.pruneUnused(0);
            this.residentTileCount = this.activeTiles.size;
            this.updateCacheTelemetry();
            return;
        }

        this.container.visible = false;
        this.debugContainer.visible = this.debugMode;

        const tileWorldWidth = WORLD_WIDTH / cols;
        const tileWorldHeight = WORLD_HEIGHT / rows;

        // Keep a one-tile margin for atomic, no-pop coverage, but draw only
        // tiles which really intersect the camera. This avoids paying extra
        // WebGL draw calls for prefetch tiles outside the clip rectangle.
        const minCol = Math.max(0, Math.floor(viewportWorldBounds.minX / tileWorldWidth) - 1);
        const maxCol = Math.min(cols - 1, Math.floor(viewportWorldBounds.maxX / tileWorldWidth) + 1);
        const minRow = Math.max(0, Math.floor(viewportWorldBounds.minY / tileWorldHeight) - 1);
        const maxRow = Math.min(rows - 1, Math.floor(viewportWorldBounds.maxY / tileWorldHeight) + 1);
        const displayMinCol = Math.max(0, Math.floor(viewportWorldBounds.minX / tileWorldWidth));
        const displayMaxCol = Math.min(cols - 1, Math.floor(viewportWorldBounds.maxX / tileWorldWidth));
        const displayMinRow = Math.max(0, Math.floor(viewportWorldBounds.minY / tileWorldHeight));
        const displayMaxRow = Math.min(rows - 1, Math.floor(viewportWorldBounds.maxY / tileWorldHeight));

        const neededKeys = new Set<string>();
        const currentVisibleKeys: string[] = [];
        this.displayTileKeys.clear();

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const key = `${folder}_${c}_${r}`;
                neededKeys.add(key);
                currentVisibleKeys.push(key);
                if (c >= displayMinCol && c <= displayMaxCol && r >= displayMinRow && r <= displayMaxRow) {
                    this.displayTileKeys.add(key);
                }

                let active = this.activeTiles.get(key);
                if (active) {
                    active.lastUsedFrame = this.currentFrame;
                    active.targetAlpha = 1.0;
                } else if (this.activeTiles.size < this.maxResidentTiles) {
                    this.spawnTile(targetLevel, folder, c, r, tileWorldWidth, tileWorldHeight, key);
                }
            }
        }

        this.visibleTileCount = this.displayTileKeys.size;
        this.visibleTileKeys = currentVisibleKeys;

        // Prune out-of-viewport tiles
        this.pruneUnused(this.currentFrame);
        this.residentTileCount = this.activeTiles.size;
        this.updateCacheTelemetry();
        this.activateCompleteCoverage();
    }

    public tick(deltaSeconds: number): void {
        if (!this.hasTileTransitions) return;
        // Crossfade animation step (~200ms smooth fade-in)
        const fadeSpeed = deltaSeconds / 0.20;
        let transitioning = false;
        for (const active of this.activeTiles.values()) {
            if (active.currentAlpha < active.targetAlpha) {
                transitioning = true;
                active.currentAlpha = Math.min(active.targetAlpha, active.currentAlpha + fadeSpeed);
                if (active.mesh.shader) {
                    try {
                        const uniforms = (active.mesh.shader.resources as any).uTileUniforms;
                        if (uniforms?.uniforms && !uniforms.destroyed) {
                            uniforms.uniforms.uAlpha = active.currentAlpha;
                        }
                    } catch {
                        // Ignore a stale pooled shader; the tile remains hidden
                        // until its next successful texture bind.
                    }
                }
            }
        }
        this.hasTileTransitions = transitioning || [...this.activeTiles.values()].some((active) => active.currentAlpha < active.targetAlpha);
    }

    private spawnTile(
        level: 'REGIONAL' | 'DETAIL',
        folder: string,
        col: number,
        row: number,
        tileWidth: number,
        tileHeight: number,
        key: string
    ): void {
        const x = col * tileWidth;
        const y = row * tileHeight;

        // Alternating debug tint: Magenta vs Cyan
        const isEven = (col + row) % 2 === 0;
        const debugTint = isEven ? [1.0, 0.1, 0.9] : [0.1, 0.9, 1.0];

        let mesh = this.tilePool.pop();
        if (!mesh) {
            const geom = new PIXI.MeshGeometry({
                positions: new Float32Array([
                    0, 0,
                    tileWidth, 0,
                    tileWidth, tileHeight,
                    0, tileHeight
                ]),
                uvs: new Float32Array([
                    0, 0,
                    1, 0,
                    1, 1,
                    0, 1
                ]),
                indices: new Uint32Array([
                    0, 1, 2,
                    0, 2, 3
                ])
            });

            const shader = PIXI.Shader.from({
                gl: {
                    vertex: this.tileVertexSrc,
                    fragment: this.tileFragmentSrc
                },
                resources: {
                    uTileTexture: PIXI.Texture.WHITE.source,
                    uWorldReliefTexture: worldReliefTexture.source,
                    uTileUniforms: new PIXI.UniformGroup({
                        uAlpha: { value: this.debugMode ? 1.0 : 0.0, type: 'f32' },
                        uDebugMode: { value: this.debugMode ? 1.0 : 0.0, type: 'f32' },
                        uDebugTint: { value: debugTint, type: 'vec3<f32>' },
                        uTileOrigin: { value: [x, y], type: 'vec2<f32>' },
                    })
                }
            } as any);

            mesh = new PIXI.Mesh({
                geometry: geom,
                shader
            });
        } else {
            mesh.geometry.getBuffer('aPosition').data.set(new Float32Array([
                0, 0,
                tileWidth, 0,
                tileWidth, tileHeight,
                0, tileHeight
            ]));
            (mesh.geometry.getBuffer('aPosition') as any).update();

            if (mesh.shader) {
                try {
                    const uniforms = (mesh.shader.resources as any).uTileUniforms;
                    if (uniforms?.uniforms && !uniforms.destroyed) {
                        uniforms.uniforms.uAlpha = this.debugMode ? 1.0 : 0.0;
                        uniforms.uniforms.uDebugMode = this.debugMode ? 1.0 : 0.0;
                        uniforms.uniforms.uDebugTint = debugTint;
                        uniforms.uniforms.uTileOrigin = [x, y];
                    }
                } catch {
                    // A stale pooled shader will be replaced on a future spawn.
                }
            }
        }

        mesh.position.set(x, y);
        mesh.visible = false;
        this.container.addChild(mesh);

        // Keep the request identity with the active visual for DEV forensics.
        const url = this.tileUrl(level, col, row);

        // F8 Debug Label
        const debugText = new PIXI.Text({
            text: `${key}`,
            style: {
                fontFamily: 'monospace',
                fontSize: 10,
                fill: 0xffff00,
                stroke: { color: 0x000000, width: 3 }
            }
        });
        debugText.position.set(x + 4, y + 4);
        debugText.visible = this.debugMode;
        this.debugContainer.addChild(debugText);

        const activeTile: ActiveTile = {
            key,
            col,
            row,
            level,
            mesh,
            debugText,
            currentAlpha: this.debugMode ? 1.0 : 0.0,
            targetAlpha: 1.0,
            lastUsedFrame: this.currentFrame,
            requestedUrl: url,
            createdAt: performance.now(),
        };
        this.activeTiles.set(key, activeTile);
        this.hasTileTransitions = !this.debugMode;

        // Fetch tile asynchronously
        this.loadTileTexture(url).then(tex => {
            if (this.activeTiles.has(key)) {
                activeTile.texture = tex;
                activeTile.loadedAt = performance.now();
                this.setTileTexture(mesh, tex.source);
                mesh.visible = false;
                this.activateCompleteCoverage();
            }
        }).catch(() => {
            mesh.visible = false;
        });
    }

    /**
     * A streamed LOD is an atomic presentation set. Showing ready tiles one
     * by one leaves the global source visible through a rectangular subset of
     * the viewport. Keep the lower source as the only visible terrain until
     * every required tile for this camera has decoded, then reveal the whole
     * set on the same frame.
     */
    private activateCompleteCoverage(): void {
        if (this.currentLevel === 'GLOBAL' || this.visibleTileKeys.length === 0) {
            this.container.visible = false;
            return;
        }

        const ready = this.visibleTileKeys.every(key => {
            const active = this.activeTiles.get(key);
            return Boolean(active?.texture);
        });
        if (!ready) {
            this.container.visible = false;
            for (const key of this.visibleTileKeys) {
                const active = this.activeTiles.get(key);
                if (active) active.mesh.visible = false;
            }
            return;
        }

        for (const key of this.visibleTileKeys) {
            const active = this.activeTiles.get(key);
            if (!active) continue;
            active.currentAlpha = 1.0;
            active.targetAlpha = 1.0;
            active.mesh.visible = this.displayTileKeys.has(key);
            try {
                const uniforms = (active.mesh.shader?.resources as any)?.uTileUniforms;
                if (uniforms?.uniforms && !uniforms.destroyed) uniforms.uniforms.uAlpha = 1.0;
            } catch {
                // A diagnostic/pooled shader must not interrupt presentation.
            }
        }
        this.container.visible = true;
        this.hasTileTransitions = false;
    }

    private async loadTileTexture(url: string): Promise<PIXI.Texture> {
        const cached = this.textureCache.get(url);
        if (cached) {
            this.tileCacheHitCount++;
            cached.lastUsedFrame = this.currentFrame;
            return cached.texture;
        }

        this.tileLoadCount++;
        const texture = await PIXI.Assets.load<PIXI.Texture>(url);
        const source = texture.source as any;
        // Keep streamed visual geography smooth at the close gameplay zoom.
        // This is presentation-only filtering; tile data never participates
        // in authoritative terrain or ownership decisions.
        if (source?.style) source.style.scaleMode = 'linear';
        const width = Number(source?.width || source?.pixelWidth || 512);
        const height = Number(source?.height || source?.pixelHeight || 512);
        this.textureCache.set(url, {
            texture,
            lastUsedFrame: this.currentFrame,
            byteLength: Math.max(1, width) * Math.max(1, height) * 4,
        });
        this.evictTextureCache();
        this.updateCacheTelemetry();
        return texture;
    }

    private evictTextureCache(): void {
        if (this.textureCache.size <= this.maxResidentTiles) return;

        const activeUrls = new Set<string>();
        for (const active of this.activeTiles.values()) {
            // Protect both ready and still-loading tiles. The latter must stay
            // resident until its async load callback binds the texture.
            activeUrls.add(this.tileUrl(active.level, active.col, active.row));
        }

        const candidates = Array.from(this.textureCache.entries())
            .filter(([url]) => !activeUrls.has(url))
            .sort((a, b) => a[1].lastUsedFrame - b[1].lastUsedFrame);

        for (const [url] of candidates) {
            if (this.textureCache.size <= this.maxResidentTiles) break;
            this.textureCache.delete(url);
            this.tileEvictionCount++;
            // Assets owns loaded texture sources; unload through the asset cache
            // instead of destroying the source directly (which triggers a Pixi
            // warning and leaves the loader cache inconsistent).
            void PIXI.Assets.unload(url).catch(() => undefined);
        }
        this.updateCacheTelemetry();
    }

    private setTileTexture(mesh: PIXI.Mesh<any, any>, source: any): void {
        try {
            if (mesh.shader) {
                (mesh.shader.resources as any).uTileTexture = source;
            }
        } catch {
            // A pooled mesh can outlive a failed asset load. It will remain
            // invisible until a later load binds a fresh texture.
        }
    }

    private updateCacheTelemetry(): void {
        this.cachedTextureCount = this.textureCache.size;
        this.residentTextureBytes = Array.from(this.textureCache.values())
            .reduce((sum, cached) => sum + cached.byteLength, 0);
    }

    private recycleActiveTiles(): void {
        this.hasTileTransitions = false;
        for (const active of this.activeTiles.values()) {
            this.container.removeChild(active.mesh);
            this.setTileTexture(active.mesh, PIXI.Texture.WHITE.source);
            if (active.debugText) {
                this.debugContainer.removeChild(active.debugText);
                active.debugText.destroy();
            }
            this.tilePool.push(active.mesh);
        }
        this.activeTiles.clear();
    }

    private tileUrl(level: 'REGIONAL' | 'DETAIL', col: number, row: number): string {
        const folder = level === 'REGIONAL' ? 'regional' : 'detail';
        return `/tiles/${folder}/${col}_${row}.png`;
    }

    private pruneUnused(currentFrame: number): void {
        for (const [key, active] of this.activeTiles.entries()) {
            if (active.lastUsedFrame < currentFrame) {
                this.container.removeChild(active.mesh);
                // Detach the pooled mesh before LRU eviction can unload its
                // managed texture source from Pixi Assets.
                this.setTileTexture(active.mesh, PIXI.Texture.WHITE.source);
                if (active.debugText) {
                    this.debugContainer.removeChild(active.debugText);
                    active.debugText.destroy();
                }
                this.tilePool.push(active.mesh);
                this.activeTiles.delete(key);
            }
        }
        if (this.activeTiles.size === 0) this.hasTileTransitions = false;
    }
}

export const terrainLodManager = new TerrainLodManager();
