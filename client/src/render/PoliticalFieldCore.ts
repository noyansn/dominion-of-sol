import { getVisualGameplayMapping, type VisualGameplayMapping } from '../game/VisualGameplayMapping';

export interface PoliticalFieldConfig {
    simulationWidth: number;
    simulationHeight: number;
    scale: number;
    landMask: Uint8Array;
    landMaskWidth: number;
    landMaskHeight: number;
    simulationTerrains?: Uint8Array;
}

export interface PoliticalFieldMetrics {
    buildMs: number;
    pixelsProcessed: number;
    relaxedPixels: number;
    ownedVisualWaterPixels: number;
    invalidOwnerIds: number;
    capitalOutsideVisualOwner: number;
    canonicalLandPixels?: number;
    mappedOwnedVisualLandPixels?: number;
    unmappedOwnedLandPixels?: number;
    wrongOwnerPixels?: number;
    seaBleedPixels?: number;
    unmappedCanonicalLandPixels?: number;
    raw90DegreeCorners?: number;
    smoothed90DegreeCorners?: number;
    rawTips?: number;
    smoothedTips?: number;
    rawPerimeter?: number;
    smoothedPerimeter?: number;
}

export interface VisualRect { minX: number; minY: number; maxX: number; maxY: number; }

const MAX_RELAX_PX = 2;
const KERNEL_RADIUS = 2;
const DEPENDENCY_RADIUS = 4; // MAX_RELAX_PX + KERNEL_RADIUS

export class PoliticalFieldCore {
    public readonly width: number;
    public readonly height: number;
    public readonly rawOwners: Uint8Array;
    public readonly owners: Uint8Array;
    public readonly land: Uint8Array;
    public readonly borders: Uint8Array;
    private visualMapping: VisualGameplayMapping | null = null;
    public metrics: PoliticalFieldMetrics = { buildMs: 0, pixelsProcessed: 0, relaxedPixels: 0, ownedVisualWaterPixels: 0, invalidOwnerIds: 0, capitalOutsideVisualOwner: 0 };
    private capitalProtection: Uint8Array;
    private simulationTerrains: Uint8Array | null;
    private protectedCapitals: number[] | null = null;

    constructor(private readonly config: PoliticalFieldConfig) {
        this.width = config.simulationWidth * config.scale;
        this.height = config.simulationHeight * config.scale;
        const size = this.width * this.height;
        this.rawOwners = new Uint8Array(size);
        this.owners = new Uint8Array(size);
        this.land = new Uint8Array(size);
        this.borders = new Uint8Array(size);
        this.capitalProtection = new Uint8Array(size);
        this.simulationTerrains = config.simulationTerrains ?? null;
        this.buildLandField();
        this.rebuildVisualToGameplayMap();
    }

    public setSimulationTerrains(terrains: Uint8Array | null): void {
        this.simulationTerrains = terrains;
        this.rebuildVisualToGameplayMap();
    }

    public fullBuild(cellOwners: Uint8Array, capitalCells: readonly number[] = []): void {
        const start = performance.now();
        this.metrics.pixelsProcessed = this.width * this.height;
        this.metrics.relaxedPixels = 0;
        this.rebuildCapitalProtection(capitalCells);
        
        const fullRect = { minX: 0, minY: 0, maxX: this.width, maxY: this.height };
        this.writeRawRect(cellOwners, fullRect);
        
        const rawMetrics = this.computeTopologyMetrics(this.rawOwners);
        this.metrics.raw90DegreeCorners = rawMetrics.corners;
        this.metrics.rawTips = rawMetrics.tips;
        this.metrics.rawPerimeter = rawMetrics.perimeter;

        this.smoothRect(fullRect);
        
        const smoothedMetrics = this.computeTopologyMetrics(this.owners);
        this.metrics.smoothed90DegreeCorners = smoothedMetrics.corners;
        this.metrics.smoothedTips = smoothedMetrics.tips;
        this.metrics.smoothedPerimeter = smoothedMetrics.perimeter;
        
        this.deriveBordersRect(fullRect);
        this.metrics.buildMs = performance.now() - start;
        this.validate(cellOwners, capitalCells);
        
        console.log(`[POLITICAL] RAW: corners=${rawMetrics.corners} tips=${rawMetrics.tips} perim=${rawMetrics.perimeter}`);
        console.log(`[POLITICAL] SMOOTHED: corners=${smoothedMetrics.corners} tips=${smoothedMetrics.tips} perim=${smoothedMetrics.perimeter}`);
    }

    public updateDirty(cellOwners: Uint8Array, dirtyCells: readonly number[], capitalCells: readonly number[] = []): VisualRect | null {
        if (dirtyCells.length === 0) return null;
        const start = performance.now();
        this.metrics.relaxedPixels = 0;
        this.rebuildCapitalProtection(capitalCells);
        let minCellX = this.config.simulationWidth, minCellY = this.config.simulationHeight, maxCellX = -1, maxCellY = -1;
        for (const index of dirtyCells) {
            if (index < 0 || index >= cellOwners.length) continue;
            const x = index % this.config.simulationWidth;
            const y = Math.floor(index / this.config.simulationWidth);
            minCellX = Math.min(minCellX, x); minCellY = Math.min(minCellY, y);
            maxCellX = Math.max(maxCellX, x); maxCellY = Math.max(maxCellY, y);
        }
        if (maxCellX < 0) return null;
        
        const s = this.config.scale;
        const changedVisual = {
            minX: minCellX * s,
            minY: minCellY * s,
            maxX: (maxCellX + 1) * s,
            maxY: (maxCellY + 1) * s,
        };
        
        // A changed coastal anchor can own visual fragments up to four cells
        // away. Refresh that dependency footprint as well as contour support.
        const outputRect = this.clampRect(this.expandRect(changedVisual, DEPENDENCY_RADIUS + 4 * s));
        const rawReadRect = this.clampRect(this.expandRect(outputRect, KERNEL_RADIUS));
        
        this.writeRawRect(cellOwners, rawReadRect);
        
        this.smoothRect(outputRect);
        
        this.deriveBordersRect(this.clampRect(this.expandRect(outputRect, 1)));
        
        this.metrics.pixelsProcessed = (outputRect.maxX - outputRect.minX) * (outputRect.maxY - outputRect.minY);
        this.metrics.buildMs = performance.now() - start;
        // `validate()` is a full 4096x2048 diagnostic scan. Running it for
        // every small ownership delta dominated the live client frame budget
        // even though it did not contribute to the rendered field. Full
        // validation remains part of `fullBuild()`; the incremental path only
        // mutates and redraws the dependency-expanded dirty rectangle.
        return outputRect;
    }

    /** Spatially separated deltas must not become a world-sized union. */
    public updateDirtyRegions(cellOwners: Uint8Array, dirtyCells: readonly number[], capitalCells: readonly number[] = []): VisualRect[] {
        const chunks = new Map<number, number[]>();
        const columns = Math.ceil(this.config.simulationWidth / 16);
        for (const cell of dirtyCells) {
            if (cell < 0 || cell >= cellOwners.length) continue;
            const key = Math.floor(Math.floor(cell / this.config.simulationWidth) / 16) * columns
                + Math.floor((cell % this.config.simulationWidth) / 16);
            let chunk = chunks.get(key);
            if (!chunk) { chunk = []; chunks.set(key, chunk); }
            chunk.push(cell);
        }
        const rectangles: VisualRect[] = [];
        let pixels = 0, milliseconds = 0;
        for (const cells of chunks.values()) {
            const rect = this.updateDirty(cellOwners, cells, capitalCells);
            if (rect) rectangles.push(rect);
            pixels += this.metrics.pixelsProcessed;
            milliseconds += this.metrics.buildMs;
        }
        this.metrics.pixelsProcessed = pixels;
        this.metrics.buildMs = milliseconds;
        return rectangles;
    }

    public ownerAtWorld(worldX: number, worldY: number): number {
        const x = Math.max(0, Math.min(this.width - 1, Math.floor(worldX * this.config.scale)));
        const y = Math.max(0, Math.min(this.height - 1, Math.floor(worldY * this.config.scale)));
        return this.owners[y * this.width + x];
    }

    public rawOwnerAtWorld(worldX: number, worldY: number): number {
        const x = Math.max(0, Math.min(this.width - 1, Math.floor(worldX * this.config.scale)));
        const y = Math.max(0, Math.min(this.height - 1, Math.floor(worldY * this.config.scale)));
        return this.rawOwners[y * this.width + x];
    }

    public gameplayCellForVisualPixel(pixelX: number, pixelY: number): number {
        if (pixelX < 0 || pixelY < 0 || pixelX >= this.width || pixelY >= this.height) return -1;
        if (!this.land[pixelY * this.width + pixelX]) return -1;
        if (this.visualMapping) return this.visualMapping.cellAtWorld(
            (pixelX + 0.5) / this.config.scale, (pixelY + 0.5) / this.config.scale);
        return Math.floor(pixelY / this.config.scale) * this.config.simulationWidth + Math.floor(pixelX / this.config.scale);
    }

    public findNearestOwnedPoint(owner: number, worldX: number, worldY: number, maxRadius = 64): { x: number; y: number } | null {
        const sx = Math.max(0, Math.min(this.width - 1, Math.floor(worldX * this.config.scale)));
        const sy = Math.max(0, Math.min(this.height - 1, Math.floor(worldY * this.config.scale)));
        for (let radius = 0; radius <= maxRadius; radius++) {
            const minX = Math.max(0, sx - radius), maxX = Math.min(this.width - 1, sx + radius);
            const minY = Math.max(0, sy - radius), maxY = Math.min(this.height - 1, sy + radius);
            for (let x = minX; x <= maxX; x++) for (const y of [minY, maxY]) if (this.owners[y * this.width + x] === owner) return this.toWorldPoint(x, y);
            for (let y = minY + 1; y < maxY; y++) for (const x of [minX, maxX]) if (this.owners[y * this.width + x] === owner) return this.toWorldPoint(x, y);
        }
        return null;
    }

    public findNearestBorderPoint(ownerA: number, ownerB: number, worldX: number, worldY: number, maxRadius = 96): { x: number; y: number } | null {
        const sx = Math.max(0, Math.min(this.width - 1, Math.floor(worldX * this.config.scale)));
        const sy = Math.max(0, Math.min(this.height - 1, Math.floor(worldY * this.config.scale)));
        for (let radius = 0; radius <= maxRadius; radius++) {
            const minX = Math.max(0, sx - radius), maxX = Math.min(this.width - 2, sx + radius);
            const minY = Math.max(0, sy - radius), maxY = Math.min(this.height - 2, sy + radius);
            for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
                if (radius > 0 && x > minX && x < maxX && y > minY && y < maxY) continue;
                const i = y * this.width + x, a = this.owners[i];
                if (this.isPair(a, this.owners[i + 1], ownerA, ownerB) || this.isPair(a, this.owners[i + this.width], ownerA, ownerB)) return this.toWorldPoint(x, y);
            }
        }
        return null;
    }

    private buildLandField(): void {
        const { landMask, landMaskWidth, landMaskHeight } = this.config;
        for (let y = 0; y < this.height; y++) {
            const my = Math.min(landMaskHeight - 1, Math.floor((y + 0.5) * landMaskHeight / this.height));
            for (let x = 0; x < this.width; x++) {
                const mx = Math.min(landMaskWidth - 1, Math.floor((x + 0.5) * landMaskWidth / this.width));
                this.land[y * this.width + x] = landMask[my * landMaskWidth + mx] >= 128 ? 1 : 0;
            }
        }
    }

    private rebuildVisualToGameplayMap(): void {
        const c = this.config;
        this.visualMapping = this.simulationTerrains ? getVisualGameplayMapping(c.landMask,
            c.landMaskWidth, c.landMaskHeight, c.simulationWidth, c.simulationHeight, this.simulationTerrains) : null;
    }

    private writeRawRect(cellOwners: Uint8Array, rect: VisualRect): void {
        for (let y = rect.minY; y < rect.maxY; y++) {
            for (let x = rect.minX; x < rect.maxX; x++) {
                const i = y * this.width + x;
                if (!this.land[i]) {
                    this.rawOwners[i] = 0;
                    continue;
                }
                const mapped = this.gameplayCellForVisualPixel(x, y);
                this.rawOwners[i] = mapped >= 0 ? (cellOwners[mapped] ?? 0) : 0;
            }
        }
    }

    private copyRawToOwners(rect: VisualRect): void {
        for (let y = rect.minY; y < rect.maxY; y++) {
            for (let x = rect.minX; x < rect.maxX; x++) {
                const i = y * this.width + x;
                this.owners[i] = this.rawOwners[i];
            }
        }
    }

    private buildBoundaryBand(rawOwners: Uint8Array, rect: VisualRect, maxRelaxPx: number): Uint8Array {
        const rectWidth = rect.maxX - rect.minX;
        const rectHeight = rect.maxY - rect.minY;
        const band = new Uint8Array(rectWidth * rectHeight);
        for (let y = rect.minY; y < rect.maxY; y++) {
            for (let x = rect.minX; x < rect.maxX; x++) {
                const i = y * this.width + x;
                const o = rawOwners[i];
                if (o >= 0) {
                    let isBoundary = false;
                    if (x > 0 && rawOwners[i - 1] !== o) isBoundary = true;
                    if (x < this.width - 1 && rawOwners[i + 1] !== o) isBoundary = true;
                    if (y > 0 && rawOwners[i - this.width] !== o) isBoundary = true;
                    if (y < this.height - 1 && rawOwners[i + this.width] !== o) isBoundary = true;
                    
                    if (isBoundary) {
                        for (let dy = -maxRelaxPx; dy <= maxRelaxPx; dy++) {
                            for (let dx = -maxRelaxPx; dx <= maxRelaxPx; dx++) {
                                const nx = x + dx;
                                const ny = y + dy;
                                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                                    if (nx >= rect.minX && nx < rect.maxX && ny >= rect.minY && ny < rect.maxY) {
                                        band[(ny - rect.minY) * rectWidth + (nx - rect.minX)] = 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return band;
    }

    private smoothRect(rect: VisualRect): void {
        this.copyRawToOwners(rect);
        
        const work = this.clampRect(this.expandRect(rect, DEPENDENCY_RADIUS));
        
        const boundaryBand = this.buildBoundaryBand(
            this.rawOwners,
            work,
            MAX_RELAX_PX,
        );
        const boundaryBandWidth = work.maxX - work.minX;

        for (let y = rect.minY; y < rect.maxY; y++) {
            for (let x = rect.minX; x < rect.maxX; x++) {
                const i = y * this.width + x;

                if (!this.land[i]) {
                    this.owners[i] = 0;
                    continue;
                }

                const rawOwner = this.rawOwners[i];

                const bandIndex = (y - work.minY) * boundaryBandWidth + (x - work.minX);
                // Coast pixels are an exact ownership lookup. Inland contour
                // relaxation must not shrink ownership away from the shore.
                const touchesWater = (x > 0 && !this.land[i - 1]) || (x + 1 < this.width && !this.land[i + 1])
                    || (y > 0 && !this.land[i - this.width]) || (y + 1 < this.height && !this.land[i + this.width]);
                if (!boundaryBand[bandIndex] || this.capitalProtection[i] || touchesWater) {
                    this.owners[i] = rawOwner;
                    continue;
                }

                const candidates = this.collectLocalLabels(x, y, KERNEL_RADIUS);

                if (candidates.length > 2) {
                    this.owners[i] = rawOwner;
                    continue;
                }

                const proposed = this.weightedLocalWinner(x, y, candidates, rawOwner);

                if (proposed !== rawOwner && this.isSimpleRelabel(x, y, rawOwner, proposed)) {
                    this.owners[i] = proposed;
                    this.metrics.relaxedPixels++;
                } else {
                    this.owners[i] = rawOwner;
                }
            }
        }
    }

    private collectLocalLabels(x: number, y: number, r: number): number[] {
        const labels = new Set<number>();
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) {
                    continue;
                }
                labels.add(this.rawOwners[ny * this.width + nx]);
            }
        }
        return [...labels].sort((a, b) => a - b);
    }

    private weightedLocalWinner(x: number, y: number, candidates: number[], rawOwner: number): number {
        const K = [1, 4, 6, 4, 1];
        const scores = new Map<number, number>();
        for (const c of candidates) scores.set(c, 0);

        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
                
                const label = this.rawOwners[ny * this.width + nx];
                if (scores.has(label)) {
                    const weight = K[dx + 2] * K[dy + 2];
                    scores.set(label, scores.get(label)! + weight);
                }
            }
        }

        let bestOwner = -1;
        let maxScore = -1;

        for (const [owner, score] of scores.entries()) {
            if (score > maxScore) {
                maxScore = score;
                bestOwner = owner;
            } else if (score === maxScore) {
                if (owner === rawOwner) {
                    bestOwner = owner;
                } else if (bestOwner !== rawOwner && owner < bestOwner) {
                    bestOwner = owner;
                }
            }
        }
        return bestOwner;
    }

    private isSimpleRelabel(x: number, y: number, from: number, to: number): boolean {
        if (from === to) return true;

        if (this.localComponentCount(x, y, to, to === 0 ? 8 : 4, 2) !== 1) {
            return false;
        }

        const remainingFrom = this.localComponentCount(x, y, from, from === 0 ? 8 : 4, 2);
        if (remainingFrom > 1) {
            return false;
        }

        return true;
    }

    private localComponentCount(x: number, y: number, owner: number, connectivity: 4 | 8, r: number): number {
        const size = 2 * r + 1;
        const visited = new Uint8Array(size * size);
        let components = 0;

        const dx4 = [0, 1, 0, -1];
        const dy4 = [-1, 0, 1, 0];
        const dx8 = [-1, 0, 1, 1, 1, 0, -1, -1];
        const dy8 = [-1, -1, -1, 0, 1, 1, 1, 0];
        const dx = connectivity === 8 ? dx8 : dx4;
        const dy = connectivity === 8 ? dy8 : dy4;

        for (let j = -r; j <= r; j++) {
            for (let i = -r; i <= r; i++) {
                if (i === 0 && j === 0) continue;

                const nx = x + i;
                const ny = y + j;
                if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;

                const localIdx = (j + r) * size + (i + r);
                if (visited[localIdx]) continue;

                if (this.rawOwners[ny * this.width + nx] === owner) {
                    components++;
                    const queue: [number, number][] = [[nx, ny]];
                    visited[localIdx] = 1;
                    
                    let head = 0;
                    while (head < queue.length) {
                        const [cx, cy] = queue[head++];
                        
                        for (let k = 0; k < dx.length; k++) {
                            const nnx = cx + dx[k];
                            const nny = cy + dy[k];
                            
                            if (nnx < 0 || nny < 0 || nnx >= this.width || nny >= this.height) continue;
                            if (Math.abs(nnx - x) > r || Math.abs(nny - y) > r) continue;
                            if (nnx === x && nny === y) continue;
                            
                            const nLocalIdx = (nny - y + r) * size + (nnx - x + r);
                            if (!visited[nLocalIdx] && this.rawOwners[nny * this.width + nnx] === owner) {
                                visited[nLocalIdx] = 1;
                                queue.push([nnx, nny]);
                            }
                        }
                    }
                }
            }
        }
        return components;
    }

    private deriveBordersRect(rect: VisualRect): void {
        for (let y = rect.minY; y < rect.maxY; y++) {
            for (let x = rect.minX; x < rect.maxX; x++) {
                const i = y * this.width + x;
                let edge = false;
                if (this.land[i]) {
                    const owner = this.owners[i];
                    if (x + 1 < this.width && this.land[i + 1] && owner !== this.owners[i + 1] && (owner > 0 || this.owners[i + 1] > 0)) edge = true;
                    if (y + 1 < this.height && this.land[i + this.width] && owner !== this.owners[i + this.width] && (owner > 0 || this.owners[i + this.width] > 0)) edge = true;
                }
                this.borders[i] = edge ? 255 : 0;
            }
        }
    }

    private rebuildCapitalProtection(capitalCells: readonly number[]): void {
        if (this.protectedCapitals && capitalCells.length === this.protectedCapitals.length
            && capitalCells.every((cell, index) => cell === this.protectedCapitals![index])) return;
        this.protectedCapitals = [...capitalCells];
        this.capitalProtection.fill(0); const s = this.config.scale;
        for (const cell of capitalCells) if (cell >= 0 && cell < this.config.simulationWidth * this.config.simulationHeight) {
            const cx = cell % this.config.simulationWidth, cy = Math.floor(cell / this.config.simulationWidth);
            for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) this.capitalProtection[(cy * s + dy) * this.width + cx * s + dx] = 1;
        }
    }

    private validate(cellOwners: Uint8Array, capitalCells: readonly number[]): void {
        let water = 0;
        let invalid = 0;
        let canonicalLandPixels = 0;
        let mappedOwnedVisualLandPixels = 0;
        let unmappedOwnedLandPixels = 0;
        let wrongOwnerPixels = 0;
        let unmappedCanonicalLandPixels = 0;
        for (let i = 0; i < this.owners.length; i++) {
            if (!this.land[i] && this.owners[i] !== 0) water++;
            if (this.owners[i] < 0) invalid++; 
            if (this.land[i]) {
                canonicalLandPixels++;
                const mappedCell = this.gameplayCellForVisualPixel(i % this.width, Math.floor(i / this.width));
                if (mappedCell < 0) unmappedCanonicalLandPixels++;
                const expected = mappedCell >= 0 ? (cellOwners[mappedCell] ?? 0) : 0;
                if (expected > 0 && this.rawOwners[i] > 0) mappedOwnedVisualLandPixels++;
                if (expected > 0 && this.rawOwners[i] === 0) unmappedOwnedLandPixels++;
                if (this.rawOwners[i] !== expected && (this.rawOwners[i] > 0 || expected > 0)) wrongOwnerPixels++;
            }
        }
        let capitalOutside = 0;
        for (const cell of capitalCells) if (cell >= 0 && cell < cellOwners.length) {
            const owner = cellOwners[cell], cx = cell % this.config.simulationWidth, cy = Math.floor(cell / this.config.simulationWidth);
            let found = false;
            for (let dy = 0; dy < this.config.scale; dy++) for (let dx = 0; dx < this.config.scale; dx++) {
                const i = (cy * this.config.scale + dy) * this.width + cx * this.config.scale + dx;
                if (this.land[i] && this.owners[i] === owner) found = true;
            }
            if (!found) capitalOutside++;
        }
        this.metrics.ownedVisualWaterPixels = water;
        this.metrics.invalidOwnerIds = invalid;
        this.metrics.capitalOutsideVisualOwner = capitalOutside;
        this.metrics.canonicalLandPixels = canonicalLandPixels;
        this.metrics.mappedOwnedVisualLandPixels = mappedOwnedVisualLandPixels;
        this.metrics.unmappedOwnedLandPixels = unmappedOwnedLandPixels;
        this.metrics.wrongOwnerPixels = wrongOwnerPixels;
        this.metrics.seaBleedPixels = water;
        this.metrics.unmappedCanonicalLandPixels = unmappedCanonicalLandPixels;
    }

    private computeTopologyMetrics(field: Uint8Array): { corners: number, tips: number, perimeter: number } {
        let corners = 0, tips = 0, perimeter = 0;
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                const i = y * this.width + x;
                const o = field[i];
                if (o === 0 || !this.land[i]) continue;
                
                let sameNeighbors = 0;
                let isPerimeter = false;
                
                const top = field[i - this.width] === o;
                const bot = field[i + this.width] === o;
                const left = field[i - 1] === o;
                const right = field[i + 1] === o;
                
                if (top) sameNeighbors++;
                if (bot) sameNeighbors++;
                if (left) sameNeighbors++;
                if (right) sameNeighbors++;
                
                if (sameNeighbors < 4) isPerimeter = true;
                if (isPerimeter) perimeter++;
                if (sameNeighbors === 1) tips++;
                
                const tr = field[i - this.width + 1] === o;
                const br = field[i + this.width + 1] === o;
                const bl = field[i + this.width - 1] === o;
                const tl = field[i - this.width - 1] === o;
                
                if (right && bot && !br) corners++;
                if (left && bot && !bl) corners++;
                if (right && top && !tr) corners++;
                if (left && top && !tl) corners++;
            }
        }
        return { corners, tips, perimeter };
    }

    private clampRect(rect: VisualRect): VisualRect { return { minX: Math.max(0, Math.floor(rect.minX)), minY: Math.max(0, Math.floor(rect.minY)), maxX: Math.min(this.width, Math.ceil(rect.maxX)), maxY: Math.min(this.height, Math.ceil(rect.maxY)) }; }
    private expandRect(rect: VisualRect, amount: number): VisualRect { return this.clampRect({ minX: rect.minX - amount, minY: rect.minY - amount, maxX: rect.maxX + amount, maxY: rect.maxY + amount }); }
    private toWorldPoint(x: number, y: number): { x: number; y: number } { return { x: (x + 0.5) / this.config.scale, y: (y + 0.5) / this.config.scale }; }
    private isPair(a: number, b: number, ownerA: number, ownerB: number): boolean { return (a === ownerA && b === ownerB) || (a === ownerB && b === ownerA); }
}
