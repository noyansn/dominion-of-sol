import * as PIXI from 'pixi.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from './WorldSpace';
import { POLITICAL_SCALE, POLITICAL_WIDTH, POLITICAL_HEIGHT } from './PoliticalSpace';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import type { VisualRect } from './PoliticalFieldCore';

const BORDER_CHUNK = 256;
type BorderPath = { points: { x: number; y: number }[]; closed: boolean };
type BorderChunk = { graphics: PIXI.Graphics; paths: BorderPath[]; rect: VisualRect };

export class PoliticalBorderRenderer {
    public container = new PIXI.Container();
    private graphics!: PIXI.Graphics;
    private currentScale: number = 1;

    // Cache of extracted paths (world coordinates)
    private paths: BorderPath[] = [];
    private chunks = new Map<number, BorderChunk>();
    private dirtyChunks = new Set<number>();
    public rebuiltChunks = 0;
    public get pendingChunkCount(): number { return this.dirtyChunks.size; }
    private viewportWorldBounds = { minX: 0, minY: 0, maxX: WORLD_WIDTH, maxY: WORLD_HEIGHT };

    constructor(private readonly surface: PoliticalSurfaceCache) {
    }

    public lastBuiltRevision: number = -1;

    public init(): void {
        this.updateContours();
    }

    public markDirty(rectangles?: readonly VisualRect[]): void {
        const columns = Math.ceil(POLITICAL_WIDTH / BORDER_CHUNK);
        const regions = rectangles ?? [{ minX: 0, minY: 0, maxX: POLITICAL_WIDTH, maxY: POLITICAL_HEIGHT }];
        for (const rect of regions) {
            const minX = Math.max(0, Math.floor((rect.minX - 1) / BORDER_CHUNK));
            const minY = Math.max(0, Math.floor((rect.minY - 1) / BORDER_CHUNK));
            const maxX = Math.min(columns, Math.ceil((rect.maxX + 1) / BORDER_CHUNK));
            const maxY = Math.min(Math.ceil(POLITICAL_HEIGHT / BORDER_CHUNK), Math.ceil((rect.maxY + 1) / BORDER_CHUNK));
            for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) this.dirtyChunks.add(y * columns + x);
        }
    }

    public updateIfNeeded(now = performance.now(), budgetMs = 4): void {
        for (const key of this.dirtyChunks) {
            this.rebuildChunk(key);
            this.dirtyChunks.delete(key);
            if (performance.now() - now >= budgetMs) break;
        }
        if (!this.dirtyChunks.size) this.lastBuiltRevision = this.surface.surfaceRevision;
    }
    
    public updateContours(): void {
        if (this.lastBuiltRevision === this.surface.surfaceRevision) return;
        this.markDirty();
        for (const key of this.dirtyChunks) this.rebuildChunk(key);
        this.dirtyChunks.clear();
        this.lastBuiltRevision = this.surface.surfaceRevision;
    }

    private rebuildChunk(key: number): void {
        const columns = Math.ceil(POLITICAL_WIDTH / BORDER_CHUNK);
        const x = (key % columns) * BORDER_CHUNK, y = Math.floor(key / columns) * BORDER_CHUNK;
        let chunk = this.chunks.get(key);
        if (!chunk) {
            chunk = { graphics: new PIXI.Graphics(), paths: [], rect: {
                minX: x, minY: y, maxX: Math.min(POLITICAL_WIDTH, x + BORDER_CHUNK), maxY: Math.min(POLITICAL_HEIGHT, y + BORDER_CHUNK),
            } };
            this.chunks.set(key, chunk);
            this.container.addChild(chunk.graphics);
        }
        this.graphics = chunk.graphics;
        this.extractContours(chunk.rect);
        chunk.paths = this.paths;
        this.redraw();
        this.updateChunkVisibility(chunk);
        this.rebuiltChunks++;
    }

    private extractContours(rect: VisualRect): void {
        const field = this.surface.field;
        const w = field.width;
        const h = field.height;
        const owners = field.owners;
        const land = field.land;

        // Adjacency list: vertexIndex -> Set<vertexIndex>
        // Vertex index = vy * (w + 1) + vx
        const adj = new Map<number, Set<number>>();
        
        const addEdge = (v1: number, v2: number) => {
            if (!adj.has(v1)) adj.set(v1, new Set());
            if (!adj.has(v2)) adj.set(v2, new Set());
            adj.get(v1)!.add(v2);
            adj.get(v2)!.add(v1);
        };

        for (let y = rect.minY; y < rect.maxY; y++) {
            for (let x = rect.minX; x < rect.maxX; x++) {
                const i = y * w + x;
                const owner = owners[i];
                const isLand = land[i];
                
                // Right neighbor
                if (x + 1 < w) {
                    const r_i = i + 1;
                    const r_owner = owners[r_i];
                    if (isLand && land[r_i] && owner !== r_owner && (owner !== 0 || r_owner !== 0)) {
                        // Vertical edge between (x+1, y) and (x+1, y+1)
                        const v1 = y * (w + 1) + (x + 1);
                        const v2 = (y + 1) * (w + 1) + (x + 1);
                        addEdge(v1, v2);
                    }
                }
                
                // Bottom neighbor
                if (y + 1 < h) {
                    const b_i = i + w;
                    const b_owner = owners[b_i];
                    if (isLand && land[b_i] && owner !== b_owner && (owner !== 0 || b_owner !== 0)) {
                        // Horizontal edge between (x, y+1) and (x+1, y+1)
                        const v1 = (y + 1) * (w + 1) + x;
                        const v2 = (y + 1) * (w + 1) + (x + 1);
                        addEdge(v1, v2);
                    }
                }
            }
        }

        this.paths = [];

        // Find junctions (degree !== 2)
        const junctions = new Set<number>();
        for (const [v, edges] of adj.entries()) {
            if (edges.size !== 2) junctions.add(v);
        }

        // Trace open paths from junctions
        for (const startV of junctions) {
            const edges = adj.get(startV)!;
            const neighbors = Array.from(edges);
            for (const nextV of neighbors) {
                const path = [startV];
                let curr = nextV;
                let prev = startV;

                // Remove edge from both
                adj.get(startV)!.delete(nextV);
                adj.get(nextV)!.delete(startV);

                path.push(curr);

                while (!junctions.has(curr)) {
                    const currEdges = adj.get(curr)!;
                    if (currEdges.size === 0) break;
                    // degree 2, so one of them is prev, the other is next
                    let next = -1;
                    for (const n of currEdges) {
                        if (n !== prev) { next = n; break; }
                    }
                    if (next === -1) break;

                    adj.get(curr)!.delete(next);
                    adj.get(next)!.delete(curr);

                    prev = curr;
                    curr = next;
                    path.push(curr);
                }

                this.paths.push({ points: this.toWorldPoints(path, w + 1), closed: false });
            }
        }

        // Trace remaining closed loops
        for (const [startV, edges] of adj.entries()) {
            if (edges.size > 0) {
                const path = [startV];
                let curr = Array.from(edges)[0];
                let prev = startV;

                adj.get(startV)!.delete(curr);
                adj.get(curr)!.delete(startV);

                path.push(curr);

                while (curr !== startV) {
                    const currEdges = adj.get(curr)!;
                    let next = -1;
                    for (const n of currEdges) {
                        if (n !== prev) { next = n; break; }
                    }
                    if (next === -1) break; // Should not happen in valid loops

                    adj.get(curr)!.delete(next);
                    adj.get(next)!.delete(curr);

                    prev = curr;
                    curr = next;
                    path.push(curr);
                }

                this.paths.push({ points: this.toWorldPoints(path, w + 1), closed: true });
            }
        }

        // Apply one conservative cartographic pass. The categorical owner
        // field remains untouched; only the rendered contour is softened.
        this.paths = this.paths.map(p => {
            const compact = this.removeCollinearRuns(p.points, p.closed);
            let points = this.chaikinSmooth(compact, p.closed);
            // A second pass is reserved for long inland contours. Its
            // midpoint construction stays within the local contour band and
            // removes residual staircase rhythm without cartographic drift.
            if (points.length > 8) points = this.chaikinSmooth(points, p.closed);
            return { points, closed: p.closed };
        });
    }

    private toWorldPoints(indices: number[], stride: number) {
        return indices.map(i => ({
            x: (i % stride) / POLITICAL_SCALE,
            y: Math.floor(i / stride) / POLITICAL_SCALE
        }));
    }

    private chaikinSmooth(pts: {x: number, y: number}[], closed: boolean) {
        if (pts.length < 3) return pts;
        const newPts = [];
        
        if (!closed) newPts.push(pts[0]);
        
        const len = closed ? pts.length - 1 : pts.length - 1;
        for (let i = 0; i < len; i++) {
            const p0 = pts[i];
            const p1 = pts[(i + 1) % pts.length]; // wraps if closed and i == len-1 (which is length-2)
            
            newPts.push({
                x: 0.75 * p0.x + 0.25 * p1.x,
                y: 0.75 * p0.y + 0.25 * p1.y
            });
            newPts.push({
                x: 0.25 * p0.x + 0.75 * p1.x,
                y: 0.25 * p0.y + 0.75 * p1.y
            });
        }
        
        if (!closed) newPts.push(pts[pts.length - 1]);
        else newPts.push(newPts[0]); // close it perfectly
        
        return newPts;
    }

    private currentLod: 'FAR' | 'MEDIUM' | 'CLOSE' = 'MEDIUM';

    public updateStrokeWidth(scale: number, lod?: 'FAR' | 'MEDIUM' | 'CLOSE'): void {
        const lodChanged = lod !== undefined && lod !== this.currentLod;
        const scaleChanged = Math.abs(scale - this.currentScale) > 0.0005;
        this.currentScale = scale;
        if (lod) this.currentLod = lod;
        // Camera overlays can be refreshed by the 500 ms game-state tick even
        // when neither the camera scale nor the LOD changed. Rebuilding every
        // Graphics path in that case is pure churn; ownership changes and
        // actual zoom/LOD changes still redraw through the normal paths.
        if (scaleChanged || lodChanged) for (const chunk of this.chunks.values()) {
            this.graphics = chunk.graphics;
            this.paths = chunk.paths;
            this.redraw();
        }
    }

    public updateViewport(viewportWorldBounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
        this.viewportWorldBounds = { ...viewportWorldBounds };
        for (const chunk of this.chunks.values()) this.updateChunkVisibility(chunk);
    }

    private updateChunkVisibility(chunk: BorderChunk): void {
        const v = this.viewportWorldBounds, r = chunk.rect;
        chunk.graphics.visible = r.maxX / POLITICAL_SCALE >= v.minX && r.minX / POLITICAL_SCALE <= v.maxX
            && r.maxY / POLITICAL_SCALE >= v.minY && r.minY / POLITICAL_SCALE <= v.maxY;
    }

    private redraw(): void {
        this.graphics.clear();
        
        let desiredScreenPixels = 0.78;
        if (this.currentLod === 'FAR') desiredScreenPixels = 0.64;
        else if (this.currentLod === 'CLOSE') desiredScreenPixels = 0.96;

        const worldWidth = desiredScreenPixels / this.currentScale;
        
        const worldTolerance = Math.max(0.012, Math.min(0.35 / Math.max(0.25, this.currentScale), 0.35));

        for (const path of this.paths) {
            const pts = this.simplifyForScreen(path.points, worldTolerance, path.closed);
            if (pts.length === 0) continue;

            this.drawCartographicSpline(pts, path.closed);
        }

        this.graphics.stroke({
            width: worldWidth,
            color: 0x24434a,
            alpha: this.currentLod === 'FAR' ? 0.68 : this.currentLod === 'CLOSE' ? 0.72 : 0.74,
            join: 'round',
            cap: 'round'
        });
    }

    /**
     * Remove only contour samples that are visually subpixel at the current
     * zoom. This is a presentation optimisation: categorical ownership and
     * the authoritative extracted path remain untouched.
     */
    private simplifyForScreen(pts: { x: number; y: number }[], tolerance: number, closed: boolean): { x: number; y: number }[] {
        if (pts.length < 4) return pts;
        const source = closed && pts.length > 1 ? pts.slice(0, -1) : pts;
        if (source.length < 3) return pts;

        const keep = new Uint8Array(source.length);
        keep[0] = 1;
        keep[source.length - 1] = 1;
        const toleranceSq = tolerance * tolerance;
        const simplify = (start: number, end: number) => {
            let best = toleranceSq;
            let bestIndex = -1;
            const a = source[start];
            const b = source[end];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const denom = dx * dx + dy * dy;
            for (let i = start + 1; i < end; i++) {
                const p = source[i];
                const t = denom > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / denom)) : 0;
                const qx = a.x + t * dx;
                const qy = a.y + t * dy;
                const ex = p.x - qx;
                const ey = p.y - qy;
                const error = ex * ex + ey * ey;
                if (error > best) {
                    best = error;
                    bestIndex = i;
                }
            }
            if (bestIndex >= 0) {
                keep[bestIndex] = 1;
                simplify(start, bestIndex);
                simplify(bestIndex, end);
            }
        };
        simplify(0, source.length - 1);

        const result = source.filter((_point, index) => keep[index] === 1);
        if (closed && result.length > 2) result.push(result[0]);
        return result;
    }

    private cullPath(pts: { x: number; y: number }[], viewport: { minX: number; minY: number; maxX: number; maxY: number }): { x: number; y: number }[] {
        if (pts.length < 2) return pts;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const point of pts) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        const margin = 2.0 / Math.max(0.25, this.currentScale);
        if (maxX < viewport.minX - margin || minX > viewport.maxX + margin ||
            maxY < viewport.minY - margin || minY > viewport.maxY + margin) return [];
        return pts;
    }

    private removeCollinearRuns(pts: { x: number; y: number }[], closed: boolean): { x: number; y: number }[] {
        if (pts.length < 4) return pts;
        const source = closed && pts.length > 1 ? pts.slice(0, -1) : pts;
        const result: { x: number; y: number }[] = [];
        const epsilon = 0.001;
        for (let i = 0; i < source.length; i++) {
            if (!closed && (i === 0 || i === source.length - 1)) {
                result.push(source[i]);
                continue;
            }
            const prev = source[(i - 1 + source.length) % source.length];
            const curr = source[i];
            const next = source[(i + 1) % source.length];
            const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
            const dot = (curr.x - prev.x) * (next.x - curr.x) + (curr.y - prev.y) * (next.y - curr.y);
            if (Math.abs(cross) > epsilon || dot < 0) result.push(curr);
        }

        if (closed && result.length > 2) result.push(result[0]);
        return result.length >= (closed ? 4 : 2) ? result : pts;
    }

    /**
     * Draw the pre-smoothed cartographic contour as a compact polyline.
     * Keeping the final primitive linear is intentional: Pixi triangulates
     * quadratic Graphics paths into many more vertices. The two conservative
     * midpoint passes above already remove the visible staircase while this
     * representation keeps the frame cost bounded.
     */
    private drawCartographicSpline(pts: { x: number; y: number }[], closed: boolean): void {
        if (pts.length < 2) return;
        this.graphics.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) this.graphics.lineTo(pts[i].x, pts[i].y);
        if (closed && (pts[pts.length - 1].x !== pts[0].x || pts[pts.length - 1].y !== pts[0].y)) {
            this.graphics.lineTo(pts[0].x, pts[0].y);
        }
    }
}
