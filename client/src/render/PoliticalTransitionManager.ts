import * as PIXI from 'pixi.js';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';
import { PoliticalTextureSource } from './PoliticalTextureUpload';
import { worldReliefTexture } from './WorldReliefTexture';
import { focusDirectionForCells, focusEntryEdgeForCells, type FocusDirection, type FocusEntryEdge } from './FocusPropagation';
import { gameState } from '../game/GameState';
import { getVisualGameplayMapping, type VisualGameplayMapping } from '../game/VisualGameplayMapping';

/**
 * Presentation-only political reveal.
 *
 * The server still authorizes individual 1024x512 cells at its existing
 * cadence. The client deliberately does not turn those cells into meshes. A
 * dirty operation region is converted to two local signed-distance fields
 * (old ownership and newly-authorized ownership) and one shader morphs the
 * resulting contour. This keeps the authoritative grid out of the visible
 * boundary without inventing ownership ahead of the server.
 */
const FIELD_SCALE = 12;
const FIELD_PADDING_CELLS = 5;
// Local presentation smoothing only. The authoritative owner mask remains
// categorical; this radius rounds the rendered contour enough that a close
// camera does not expose a square cell silhouette.
const FIELD_SMOOTH_RADIUS_CELLS = 1.55;
// Authorization remains bounded by the already-authorized mask, but its
// presentation contour gets a much smaller local smoothing pass than the
// political field. This removes the hard square cap without allowing a whole
// future cell to become visible.
const FIELD_AUTHORIZED_SMOOTH_RADIUS_CELLS = 0.38;
const FIELD_RANGE = 8.0;
const FIELD_INFINITY = 1e6;
const PRESENTATION_DURATION_SECONDS = 0.38;
// Render-only coverage band. A narrow 0.16-cell band made an authorized
// visual sample become a solid square too quickly at close zoom. Widening
// the antialiased contour changes no authority or arrival timing; it only
// gives the moving front enough spatial room to read as a continuous edge.
const SDF_REVEAL_THRESHOLD = 0.28;
const DIRECTIONAL_FEATHER = 0.10;
const ARRIVAL_BAND_SECONDS = 0.08;
// Presentation-only screen-space speeds. The close value intentionally lets
// one Italy-sized authorized layer traverse several real 60 FPS frames; it
// does not alter when the server sends or commits ownership.
const FRONT_SPEED_CLOSE_PX_PER_SECOND = 50;
const FRONT_SPEED_REGIONAL_PX_PER_SECOND = 120;
const FRONT_SPEED_WORLD_PX_PER_SECOND = 220;
// Keep the screen-space intent above, but clamp the resulting world-cell
// speed so a newly-authorized cell cannot traverse in one or two browser
// frames at regional zoom.  This is presentation timing only: authoritative
// deltas and the server cadence are unchanged.
const FRONT_SPEED_MIN_CELLS_PER_SECOND = 1.5;
const FRONT_SPEED_MAX_CELLS_PER_SECOND = 10.0;
// Arrival offsets are presentation metadata only. Keep a large sentinel for
// samples outside the already-authorized domain: the soft authorized SDF may
// feather the geometry, but those samples must remain invisible for the whole
// operation. The server cadence and ownership timing are unchanged.
const ARRIVAL_OFFSET_MAX_SECONDS = 30.0;
const PLAYER_FACTION_ID = 101;
const VISUAL_MASK_WIDTH = 4096;
const VISUAL_MASK_HEIGHT = 2048;
export const MAX_ACTIVE_TRANSITIONS = 8;

export interface TransitionMetrics {
    activeTransitionCount: number;
    queuedTransitionCount: number;
    maxObservedTransitionCount: number;
    totalTransitionsSpawned: number;
    totalTransitionsFlushedEarly: number;
}

export interface TransitionDiagnostics {
    getAuthoritativeOwnershipRevision?: () => number;
    getOwnerBufferRevision?: () => number;
    getSurfaceMaskRevision?: () => number;
    getBasePoliticalTextureRevision?: () => number;
}

export interface TransitionFrameTelemetry {
    frame: number;
    transitionId: string;
    performanceNow: number;
    tickerDeltaMS: number;
    transitionStartTime: number;
    transitionProgress: number;
    shaderProgress: number;
    operationElapsedMS: number;
    minLayerProgress: number;
    maxLayerProgress: number;
    newestLayerProgress: number;
    layerProgresses: Array<{ cell: number; arrivalTime: number; localProgress: number }>;
    oldOwner: number;
    newOwner: number;
    authorizedCellCount: number;
    sdfThreshold: number;
    oldMaskRevision: number;
    newMaskRevision: number;
    authoritativeOwnerRevision: number;
    presentationCommittedRevision: number;
    ownerBufferRevision: number;
    surfaceMaskRevision: number;
    basePoliticalTextureRevision: number;
    transitionTextureRevision: number;
    transitionMeshVisible: boolean;
    transitionMeshAlpha: number;
    transitionContainerVisible: boolean;
    transitionParentVisible: boolean;
    transitionParentIndex: number;
    transitionParentChildCount: number;
    pixelsCurrentlyRevealed: number;
    finalRevealPixels: number;
    revealRatio: number;
    frontSpeedCellsPerSecond: number;
    latestArrivalTime: number;
    presentationMode: PresentationMode;
    frontAnchorCell: number | null;
    targetCell: number | null;
    directionVector: { dx: number; dy: number } | null;
    directionAngleDegrees: number | null;
    predecessorEdges: Array<{ cell: number; parentCell: number | null; entryEdge: EntryEdge }>;
    axisScanUsed: false;
}

export interface PresentationProfileBucket {
    calls: number;
    totalMs: number;
    maxMs: number;
    samples: number[];
    pixels: number;
}

const presentationProfile = new Map<string, PresentationProfileBucket>();

function profileStage(name: string, startedAt: number, pixels = 0): void {
    if (typeof window !== 'undefined' && (window as any).__DOMINION_PRESENTATION_PROFILE_ENABLED__ === false) return;
    const elapsed = Math.max(0, performance.now() - startedAt);
    const bucket = presentationProfile.get(name) ?? {
        calls: 0,
        totalMs: 0,
        maxMs: 0,
        samples: [],
        pixels: 0,
    };
    bucket.calls++;
    bucket.totalMs += elapsed;
    bucket.maxMs = Math.max(bucket.maxMs, elapsed);
    bucket.pixels += Math.max(0, pixels);
    if (bucket.samples.length >= 128) bucket.samples.shift();
    bucket.samples.push(elapsed);
    presentationProfile.set(name, bucket);
}

export function resetPoliticalPresentationProfile(): void {
    presentationProfile.clear();
}

export function getPoliticalPresentationProfile(): Record<string, PresentationProfileBucket> {
    const snapshot: Record<string, PresentationProfileBucket> = {};
    for (const [name, bucket] of presentationProfile) {
        snapshot[name] = {
            calls: bucket.calls,
            totalMs: Number(bucket.totalMs.toFixed(3)),
            maxMs: Number(bucket.maxMs.toFixed(3)),
            samples: [...bucket.samples],
            pixels: bucket.pixels,
        };
    }
    return snapshot;
}

type OwnershipChange = { index: number; oldOwner: number; newOwner: number };
type PresentationMode = 'FOCUS' | 'FRONTIER' | 'GENERIC';
type EntryEdge = FocusEntryEdge;

interface FocusPresentationIntent {
    mode: 'FOCUS' | 'FRONTIER';
    sourceCell: number | null;
    targetCell: number | null;
    resolvedAnchor?: number | null;
    sentAt?: number;
}

type PresentationDirection = FocusDirection;

function readPendingPresentationIntent(): FocusPresentationIntent | null {
    if (typeof window === 'undefined') return null;
    const raw = (window as any).__DOMINION_PENDING_PRESENTATION_OPERATION__;
    if (!raw || (raw.mode !== 'FOCUS' && raw.mode !== 'FRONTIER')) return null;
    if (raw.consumedAt !== undefined) return null;
    if (raw.sentAt !== undefined && performance.now() - Number(raw.sentAt) > 30_000) return null;
    return {
        mode: raw.mode,
        sourceCell: Number.isInteger(raw.sourceCell) ? raw.sourceCell : null,
        targetCell: Number.isInteger(raw.targetCell) ? raw.targetCell : null,
        resolvedAnchor: Number.isInteger(raw.resolvedAnchor) ? raw.resolvedAnchor : null,
        sentAt: Number(raw.sentAt ?? performance.now()),
    };
}

function worldCellCenter(cell: number): { x: number; y: number } {
    return {
        x: (cell % gameState.width) + 0.5,
        y: Math.floor(cell / gameState.width) + 0.5,
    };
}

function focusDirection(intent: FocusPresentationIntent | null): PresentationDirection | null {
    if (!intent || intent.mode !== 'FOCUS' || intent.targetCell === null) {
        return null;
    }
    const anchorCell = intent.sourceCell ?? intent.resolvedAnchor;
    if (anchorCell === null || anchorCell === undefined) return null;
    return focusDirectionForCells(anchorCell, intent.targetCell, gameState.width);
}

function entryEdgeForParent(parentCell: number | null, cell: number): EntryEdge {
    return focusEntryEdgeForCells(parentCell, cell, gameState.width);
}

function legalPresentationNeighbour(parentCell: number, cell: number): boolean {
    const parentX = parentCell % gameState.width;
    const parentY = Math.floor(parentCell / gameState.width);
    const cellX = cell % gameState.width;
    const cellY = Math.floor(cell / gameState.width);
    let dx = cellX - parentX;
    if (dx > gameState.width / 2) dx -= gameState.width;
    if (dx < -gameState.width / 2) dx += gameState.width;
    const dy = cellY - parentY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) return false;
    if (gameState.cellTerrains[parentCell] === 2 || gameState.cellTerrains[cell] === 2) return false;
    if (dx === 0 || dy === 0) return true;

    // Match the authoritative no-water-corner rule for diagonal land contact:
    // at least one of the two intermediate orthogonal cells must be land.
    const firstX = (parentX + dx + gameState.width) % gameState.width;
    const first = parentY * gameState.width + firstX;
    const secondY = parentY + dy;
    if (secondY < 0 || secondY >= gameState.height) return false;
    const second = secondY * gameState.width + parentX;
    return gameState.cellTerrains[first] !== 2 || gameState.cellTerrains[second] !== 2;
}

function neighbouringPresentationCells(cell: number): number[] {
    const x = cell % gameState.width;
    const y = Math.floor(cell / gameState.width);
    const result: number[] = [];
    for (const [dx, dy] of [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [1, -1], [-1, 1], [1, 1],
    ]) {
        const nx = (x + dx + gameState.width) % gameState.width;
        const ny = y + dy;
        if (ny < 0 || ny >= gameState.height) continue;
        const neighbour = ny * gameState.width + nx;
        if (legalPresentationNeighbour(cell, neighbour)) result.push(neighbour);
    }
    return result;
}

function splitConnectedChanges(changes: OwnershipChange[]): OwnershipChange[][] {
    const byCell = new Map(changes.map(change => [change.index, change]));
    const remaining = new Set(byCell.keys());
    const components: OwnershipChange[][] = [];
    while (remaining.size > 0) {
        const seed = remaining.values().next().value as number;
        remaining.delete(seed);
        const queue = [seed];
        const component: OwnershipChange[] = [];
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const cell = queue[cursor];
            const change = byCell.get(cell);
            if (change) component.push(change);
            for (const neighbour of neighbouringPresentationCells(cell)) {
                if (remaining.delete(neighbour)) queue.push(neighbour);
            }
        }
        components.push(component);
    }
    return components;
}

function presentationVisualMapping(): VisualGameplayMapping | null {
    if (!gameState.visualLandMask) return null;
    return getVisualGameplayMapping(
        gameState.visualLandMask,
        VISUAL_MASK_WIDTH,
        VISUAL_MASK_HEIGHT,
        gameState.width,
        gameState.height,
        gameState.cellTerrains,
    );
}

function presentationCellAtWorld(
    worldX: number,
    worldY: number,
    visualMapping: VisualGameplayMapping | null,
): number {
    const fallbackX = Math.min(gameState.width - 1, Math.max(0, Math.floor(worldX)));
    const fallbackY = Math.min(gameState.height - 1, Math.max(0, Math.floor(worldY)));
    const fallback = fallbackY * gameState.width + fallbackX;
    const mapped = visualMapping?.cellAtWorld(worldX, worldY) ?? fallback;
    return mapped >= 0 && mapped < gameState.totalCells ? mapped : fallback;
}

interface SharedEntryBoundary {
    start: { x: number; y: number };
    end: { x: number; y: number };
}

function sharedEntryBoundaryForParent(parentCell: number | null, cell: number): SharedEntryBoundary | null {
    if (parentCell === null || parentCell === undefined) return null;

    const parentX = parentCell % gameState.width;
    const parentY = Math.floor(parentCell / gameState.width);
    const cellX = cell % gameState.width;
    const cellY = Math.floor(cell / gameState.width);
    let dx = parentX - cellX;
    if (dx > gameState.width / 2) dx -= gameState.width;
    if (dx < -gameState.width / 2) dx += gameState.width;
    const dy = parentY - cellY;

    // Work in the child cell's local [0,1] x [0,1] bounds. For cardinal
    // neighbours the parent touches a real segment; for diagonal legal
    // neighbours the canonical grid contact is the actual shared corner.
    if (dx === -1 && dy === 0) {
        return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
    }
    if (dx === 1 && dy === 0) {
        return { start: { x: 1, y: 0 }, end: { x: 1, y: 1 } };
    }
    if (dx === 0 && dy === -1) {
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
    }
    if (dx === 0 && dy === 1) {
        return { start: { x: 0, y: 1 }, end: { x: 1, y: 1 } };
    }
    if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        const x = dx < 0 ? 0 : 1;
        const y = dy < 0 ? 0 : 1;
        return { start: { x, y }, end: { x, y } };
    }
    return null;
}

function pointToSegmentDistance(
    point: { x: number; y: number },
    segment: SharedEntryBoundary,
): number {
    const vx = segment.end.x - segment.start.x;
    const vy = segment.end.y - segment.start.y;
    const lengthSquared = vx * vx + vy * vy;
    if (lengthSquared < 0.000001) {
        return Math.hypot(point.x - segment.start.x, point.y - segment.start.y);
    }
    const projection = Math.max(0, Math.min(1,
        ((point.x - segment.start.x) * vx + (point.y - segment.start.y) * vy) / lengthSquared));
    return Math.hypot(
        point.x - (segment.start.x + projection * vx),
        point.y - (segment.start.y + projection * vy),
    );
}

function derivePresentationFrontAnchor(
    seed: OwnershipChange,
    pendingIntent: FocusPresentationIntent | null,
): FocusPresentationIntent | null {
    if (!pendingIntent || pendingIntent.mode !== 'FOCUS') return pendingIntent;
    if (pendingIntent.sourceCell !== null && pendingIntent.sourceCell !== undefined) return pendingIntent;

    const seedCell = seed.index;
    const seedX = seedCell % gameState.width;
    const seedY = Math.floor(seedCell / gameState.width);
    const candidates: Array<{ cell: number; score: number }> = [];
    const target = pendingIntent.targetCell;
    const targetX = target === null || target === undefined ? null : target % gameState.width;
    const targetY = target === null || target === undefined ? null : Math.floor(target / gameState.width);
    for (const [dx, dy] of [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [1, -1], [-1, 1], [1, 1],
    ]) {
        const nx = (seedX + dx + gameState.width) % gameState.width;
        const ny = seedY + dy;
        if (ny < 0 || ny >= gameState.height) continue;
        const candidate = ny * gameState.width + nx;
        if (candidate === seedCell || !legalPresentationNeighbour(candidate, seedCell)) continue;
        if ((gameState.cellOwners[candidate] ?? 0) !== seed.newOwner) continue;
        let score = dx * (targetX === null ? 0 : (targetX - seedX))
            + dy * (targetY === null ? 0 : (targetY - seedY));
        // Prefer a stable owned cardinal front when the target is ambiguous;
        // diagonal support remains legal and is selected when it faces target.
        if (dx === 0 || dy === 0) score += 0.001;
        candidates.push({ cell: candidate, score });
    }
    candidates.sort((a, b) => b.score - a.score || a.cell - b.cell);
    const derived = candidates[0]?.cell ?? null;
    return {
        ...pendingIntent,
        sourceCell: derived,
    };
}

const vertexShader = `
    attribute vec2 aPosition;
    attribute vec2 aUV;
    varying vec2 vUv;

    uniform mat3 uProjectionMatrix;
    uniform mat3 uWorldTransformMatrix;
    uniform mat3 uTransformMatrix;

    void main() {
        mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
        gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
        // The production flat-map texture path uses the same top-left world
        // row convention for this mesh's UVs. Keep the CPU field rows and the
        // screen-space field sampling aligned; do not apply a second Y flip.
        vUv = aUV;
    }
`;

const fragmentShader = `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uFieldTexture;
    uniform sampler2D uArrivalTexture;
    uniform sampler2D uWorldReliefTexture;
    uniform vec3 uNewOwnerRgb;
    uniform float uNewOwnerAlpha;
    uniform float uElapsed;
    uniform float uPresentationDuration;
    uniform float uArrivalBandSeconds;
    uniform float uArrivalOffsetMax;
    uniform float uDirectionalWipe;
    uniform float uDirectionalFeather;
    uniform float uFieldRange;
    uniform float uNewOwner;

    float decodeField(float encoded) {
        return encoded * (2.0 * uFieldRange) - uFieldRange;
    }

    void main() {
        // The operation mesh is rectangular only as a bounded render domain;
        // the visible pixels below are the continuous signed-distance contour.
        // buildSignedDistanceTexture already gates samples through the
        // authoritative visual-land mask. Do not apply a second world-relief
        // alpha gate here: the relief atlas uses a different coordinate
        // space and would discard valid political-cell coastline pixels.

        vec4 fieldTexel = texture2D(uFieldTexture, vUv);
        float oldField = decodeField(fieldTexel.r);
        float newField = decodeField(fieldTexel.g);

        // Each visual sample inherits the arrival time of its authorized
        // layer. This is not ownership interpolation: it only controls when
        // an already-authorized presentation sample becomes visible.
        // A slightly wider signed-distance band turns the authorized front
        // into one continuous rounded edge instead of exposing the local
        // raster cell's four hard corners. The field is still land-clipped
        // and the arrival texture remains the authority barrier.
        // Keep only a very small outside band. The previous symmetric band
        // made the animated tile silhouette visibly larger than the settled
        // political surface behind it. Most of the antialiasing now happens
        // inside the land-clipped field, so both states share one contour.
        float edgeOutside = 0.06;
        float edgeInside = 0.30;
        float oldCoverage = smoothstep(-edgeOutside, edgeInside, oldField);
        float targetCoverage = smoothstep(-edgeOutside, edgeInside, newField);

        // The base political surface remains on the old authoritative image
        // until completion. Draw only the positive ownership addition so
        // existing territory is never flashed twice and progress 0 is clean.
        float baseAdded = clamp(targetCoverage - oldCoverage, 0.0, 1.0);
        // Arrival texture green is the encoded signed-distance field of the
        // UNION of already-authorized layers. It is deliberately continuous:
        // a hard per-cell gate here recreates square/rectangular silhouettes
        // even when the political field itself is smooth. The union field is
        // built only from authoritative changed land cells, so this soft edge
        // cannot reveal a future cell.
        float authorizedField = decodeField(texture2D(uArrivalTexture, vUv).g);
        float arrivalValid = texture2D(uArrivalTexture, vUv).a;
        // The R channel is the authoritative presentation barrier. Samples
        // outside the already-authorized domain carry the 30 s sentinel, so
        // they cannot reveal during a normal operation. Do not multiply the
        // continuous contour by the separately smoothed authorization SDF:
        // that second mask cuts every newly-authorized cell back into a
        // rectangular cap at close zoom. The target field supplies geometry;
        // the per-sample arrival clock supplies timing and authority.

        // Timing is an arrival-time propagation field, not an interpolation
        // between two independently rebuilt shapes. Each already-authorized
        // presentation sample owns its own local arrival timestamp.
        float arrivalOffset = texture2D(uArrivalTexture, vUv).r * uArrivalOffsetMax;
        float arrivalReveal = smoothstep(
            0.0,
            uArrivalBandSeconds,
            uElapsed - arrivalOffset
        );
        float addedCoverage = baseAdded * arrivalReveal;

        // Player neutral expansion uses the same continuous old->new field
        // morph as the other political transitions. The former per-cell
        // directional coordinate made every newly authorized cell carry its
        // own rectangular cap into the compositing result. Keeping the
        // directional metadata for diagnostics is harmless, but it must not
        // be allowed to define the visible contour.
        if (uDirectionalWipe > 0.5) {
            // The same arrival-time field drives neutral FOCUS and every
            // other political transition. Directional metadata remains
            // diagnostic only; it cannot create a rectangular cap.
            // Keep the authoritative presentation-domain gate here too. The
            // FOCUS branch used to bypass it, so the smoothed target field
            // could paint across a neutral/future cell while its own arrival
            // clock was still zero. That is the detached square/gap artifact.
            addedCoverage = baseAdded * arrivalReveal;

            // A diagonal legal contact can land between presentation samples:
            // the new field starts at the exact parent/child corner while the
            // old owner's antialiased contour may end a few screen pixels
            // away. Add only a small source-side contact feather. It is gated
            // by oldCoverage, so it can never paint neutral/future territory;
            // it merely keeps the already-owned sovereign front visually
            // touching the first authorized reveal.
            // The diagonal shared corner can land between filtered samples at
            // close zoom. Use the same already-authorized contact domain, but
            // feather from the old political edge itself instead of the
            // narrow categorical coverage threshold. This closes the one-pixel
            // raster gap without admitting a neutral/future cell.
            addedCoverage = max(addedCoverage, baseAdded * arrivalReveal);
        }
        if (addedCoverage <= 0.001) discard;

        // Use the same relief-aware political ink as the settled surface. A
        // flat transition color was hiding the land shape and made the tile
        // edge look like a separate layer behind a smaller rounded border.
        vec4 relief = texture2D(uWorldReliefTexture, vUv);
        float reliefLum = dot(relief.rgb, vec3(0.299, 0.587, 0.114));
        float reliefShading = 0.68 + reliefLum * 0.62;
        vec3 animatedColor = clamp(uNewOwnerRgb * reliefShading, 0.0, 1.0);
        vec4 color = vec4(animatedColor, uNewOwnerAlpha);
        if (color.a < 0.01) discard;
        float outputAlpha = color.a * addedCoverage;
        gl_FragColor = vec4(color.rgb, outputAlpha);
    }
`;

export class PoliticalTransitionManager {
    public readonly container = new PIXI.Container();
    private activeTransitions: TransitionOverlay[] = [];
    private cellToTransition = new Map<number, TransitionOverlay>();
    private palette!: PoliticalPaletteTexture;
    private diagnostics: TransitionDiagnostics = {};
    private transitionSequence = 0;
    private frameSequence = 0;
    public onTransitionComplete?: (cells: number[]) => void;

    public metrics: TransitionMetrics = {
        activeTransitionCount: 0,
        queuedTransitionCount: 0,
        maxObservedTransitionCount: 0,
        totalTransitionsSpawned: 0,
        totalTransitionsFlushedEarly: 0,
    };

    public init(palette: PoliticalPaletteTexture, diagnostics: TransitionDiagnostics = {}): void {
        this.palette = palette;
        this.diagnostics = diagnostics;
        (window as any).__DEV_TRANSITION_METRICS__ = this.metrics;
        (window as any).__DEV_PRESENTATION_TIMELINE__ = [];
        (window as any).__DOMINION_PRESENTATION_TELEMETRY_ENABLED__ = false;
        (window as any).__DOMINION_PRESENTATION_PROFILE_ENABLED__ = true;
        (window as any).__DOMINION_PRESENTATION_PROFILE__ = getPoliticalPresentationProfile();
        (window as any).__DEV_PRESENTATION_STATE__ = {
            durationMS: PRESENTATION_DURATION_SECONDS * 1000,
            sdfThreshold: SDF_REVEAL_THRESHOLD,
            lastFrame: null,
        };
    }

    public update(dtSeconds: number): void {
        const now = performance.now();
        const deltaMS = dtSeconds * 1000;
        for (let i = this.activeTransitions.length - 1; i >= 0; i--) {
            const transition = this.activeTransitions[i];
            transition.elapsedSeconds = Math.max(0, (now - transition.startTime) / 1000);
            const presentationDuration = Math.max(
                ARRIVAL_BAND_SECONDS,
                (transition.latestArrivalTime - transition.startTime) / 1000 + ARRIVAL_BAND_SECONDS,
            );
            transition.progress = Math.min(1.0, transition.elapsedSeconds / presentationDuration);
            transition.shader.resources.uTransitionUniforms.uniforms.uElapsed = transition.elapsedSeconds;
            // Full pixel/layer telemetry is opt-in. It is useful for artifact
            // capture, but must not become part of normal render cadence.
            if ((window as any).__DOMINION_PRESENTATION_TELEMETRY_ENABLED__ === true) {
                this.recordFrame(now, deltaMS, transition);
            }

            if (transition.isComplete(now)) {
                this.completeTransition(i);
            }
        }
        this.updateMetrics();
        (window as any).__DOMINION_PRESENTATION_PROFILE__ = getPoliticalPresentationProfile();
    }

    private recordFrame(now: number, deltaMS: number, transition: TransitionOverlay): void {
        const shaderElapsed = Number(
            transition.shader?.resources?.uTransitionUniforms?.uniforms?.uElapsed ??
            transition.elapsedSeconds,
        );
        const shaderProgress = Math.max(
            0,
            Math.min(1, shaderElapsed / Math.max(
                ARRIVAL_BAND_SECONDS,
                (transition.latestArrivalTime - transition.startTime) / 1000 + ARRIVAL_BAND_SECONDS,
            )),
        );
        let revealed = 0;
        let finalReveal = 0;
        for (let i = 0; i < transition.oldField.length; i++) {
            const oldCoverage = coverageFromField(transition.oldField[i]);
            const arrivalOffset = transition.arrivalOffsetForSample(i);
            const newCoverage = coverageFromField(transition.newField[i]);
            const baseAdded = Math.max(0, newCoverage - oldCoverage);
            const localProgress = Math.max(0, Math.min(1,
                (transition.elapsedSeconds - arrivalOffset) / ARRIVAL_BAND_SECONDS,
            ));
            const arrivalReveal = localProgress * localProgress * (3 - 2 * localProgress);
            // Mirror the fragment shader: only samples with an arrival-valid
            // bit can reveal. The SDF controls the organic contour; the bit
            // keeps that contour from predicting into a future cell.
            const arrivalValid = (transition.arrivalData[i * 4 + 3] ?? 0) / 255;
            const visibleAdded = baseAdded * arrivalValid * arrivalReveal;
            revealed += visibleAdded;
            finalReveal += Math.max(0, newCoverage - oldCoverage) * arrivalValid;
        }
        const revealRatio = finalReveal > 0 ? Math.max(0, Math.min(1, revealed / finalReveal)) : transition.progress;
        const layerProgresses = transition.getLayerProgresses(now);
        const progressValues = layerProgresses.map(layer => layer.localProgress);
        const entry: TransitionFrameTelemetry = {
            frame: ++this.frameSequence,
            transitionId: transition.transitionId,
            performanceNow: now,
            tickerDeltaMS: deltaMS,
            transitionStartTime: transition.startTime,
            transitionProgress: transition.progress,
            shaderProgress,
            operationElapsedMS: transition.elapsedSeconds * 1000,
            minLayerProgress: progressValues.length ? Math.min(...progressValues) : 1,
            maxLayerProgress: progressValues.length ? Math.max(...progressValues) : 1,
            newestLayerProgress: progressValues.length ? progressValues[progressValues.length - 1] : 1,
            layerProgresses,
            oldOwner: transition.oldOwner,
            newOwner: transition.newOwner,
            authorizedCellCount: transition.changes.size,
            sdfThreshold: SDF_REVEAL_THRESHOLD,
            oldMaskRevision: transition.oldMaskRevision,
            newMaskRevision: transition.newMaskRevision,
            authoritativeOwnerRevision: this.diagnostics.getAuthoritativeOwnershipRevision?.() ?? -1,
            presentationCommittedRevision: this.diagnostics.getSurfaceMaskRevision?.() ?? -1,
            ownerBufferRevision: this.diagnostics.getOwnerBufferRevision?.() ?? -1,
            surfaceMaskRevision: this.diagnostics.getSurfaceMaskRevision?.() ?? -1,
            basePoliticalTextureRevision: this.diagnostics.getBasePoliticalTextureRevision?.() ?? -1,
            transitionTextureRevision: transition.transitionTextureRevision,
            transitionMeshVisible: Boolean(transition.mesh?.visible),
            transitionMeshAlpha: Number(transition.mesh?.alpha ?? 0),
            transitionContainerVisible: Boolean(this.container.visible),
            transitionParentVisible: Boolean(this.container.parent?.visible),
            transitionParentIndex: this.container.parent?.children.indexOf(this.container) ?? -1,
            transitionParentChildCount: this.container.parent?.children.length ?? 0,
            pixelsCurrentlyRevealed: Math.round(revealed),
            finalRevealPixels: Math.max(0, Math.round(finalReveal)),
            revealRatio,
            frontSpeedCellsPerSecond: transition.frontSpeedCellsPerSecond,
            latestArrivalTime: transition.latestArrivalTime,
            presentationMode: transition.presentationMode,
            frontAnchorCell: transition.focusIntent?.sourceCell
                ?? transition.focusIntent?.resolvedAnchor
                ?? null,
            targetCell: transition.focusIntent?.targetCell ?? null,
            directionVector: transition.direction,
            directionAngleDegrees: transition.direction?.angleDegrees ?? null,
            predecessorEdges: Array.from(transition.predecessorByCell.entries()).map(([cell, parentCell]) => ({
                cell,
                parentCell,
                entryEdge: entryEdgeForParent(parentCell, cell),
            })),
            axisScanUsed: false,
        };
        const timeline = (window as any).__DEV_PRESENTATION_TIMELINE__ as TransitionFrameTelemetry[] | undefined;
        if (timeline) timeline.push(entry);
        const state = (window as any).__DEV_PRESENTATION_STATE__;
        if (state) {
            state.lastFrame = entry;
            state.activeOperation = {
                transitionId: transition.transitionId,
                operationStartTime: transition.startTime,
                authoritativeAuthorizedMask: Array.from(transition.changes.keys()),
                presentationCommittedMask: [],
                arrivalTimes: layerProgresses.map(layer => ({ cell: layer.cell, arrivalTime: layer.arrivalTime })),
                currentVisualField: 'local-arrival-time SDF',
                targetVisualField: 'authoritative authorized mask clipped to visual land',
                activeDirtyRegion: {
                    width: transition.fieldWidth,
                    height: transition.fieldHeight,
                    textureRevision: transition.transitionTextureRevision,
                },
                frontSpeedCellsPerSecond: transition.frontSpeedCellsPerSecond,
                latestArrivalTime: transition.latestArrivalTime,
                presentationMode: transition.presentationMode,
                frontAnchorCell: transition.focusIntent?.sourceCell
                    ?? transition.focusIntent?.resolvedAnchor
                    ?? null,
                targetCell: transition.focusIntent?.targetCell ?? null,
                directionVector: transition.direction,
                directionAngleDegrees: transition.direction?.angleDegrees ?? null,
                predecessorEdges: Array.from(transition.predecessorByCell.entries()).map(([cell, parentCell]) => ({
                    cell,
                    parentCell,
                    entryEdge: entryEdgeForParent(parentCell, cell),
                })),
                axisScanUsed: false,
            };
        }
    }

    private completeTransition(index: number): void {
        if (index < 0 || index >= this.activeTransitions.length) return;
        const transition = this.activeTransitions[index];
        this.activeTransitions.splice(index, 1);

        for (const cell of transition.changes.keys()) {
            if (this.cellToTransition.get(cell) === transition) {
                this.cellToTransition.delete(cell);
            }
        }
        const cells = Array.from(transition.changes.keys());
        this.onTransitionComplete?.(cells);
        this.container.removeChild(transition.mesh);
        transition.destroy();
    }

    public clear(): void {
        for (const transition of this.activeTransitions) {
            this.onTransitionComplete?.(Array.from(transition.changes.keys()));
            this.container.removeChild(transition.mesh);
            transition.destroy();
        }
        this.activeTransitions = [];
        this.cellToTransition.clear();
        this.updateMetrics();
    }

    public isCellActive(index: number): boolean {
        return this.cellToTransition.has(index);
    }

    public handleDeltas(changes: OwnershipChange[], ownershipRevision: number): Set<number> {
        const handled = new Set<number>();
        if (changes.length === 0) return handled;
        const arrivalTime = performance.now();

        const groups = new Map<string, OwnershipChange[]>();
        for (const change of changes) {
            const key = `${change.oldOwner}_${change.newOwner}`;
            const group = groups.get(key) ?? [];
            group.push(change);
            groups.set(key, group);
        }

        for (const [ownerPair, ownerPairGroup] of groups) {
          for (const group of splitConnectedChanges(ownerPairGroup)) {
            const bookkeepingStartedAt = performance.now();
            const isPlayerInvolved = group.some(
                change => change.oldOwner === PLAYER_FACTION_ID || change.newOwner === PLAYER_FACTION_ID,
            );

            if (isPlayerInvolved) {
                this.flushBackgroundTransitionsForPlayerFront();
            }

            // Owner ids are not an operation id. Two wars involving the same
            // pair can be thousands of kilometres apart; merging them made a
            // giant dirty rectangle and was the source of the vertical tower
            // and stale-field artifacts. Extend only a spatially touching
            // local presentation operation.
            let transition = this.findTouchingTransition(ownerPair, group);
            const newlyAuthorized: OwnershipChange[] = [];
            if (!transition) {
                const created = this.createTransition(group[0], ownerPair, isPlayerInvolved, ownershipRevision, arrivalTime);
                if (!created) continue;
                transition = created;
            }

            for (const change of group) {
                const previous = this.cellToTransition.get(change.index);
                if (previous && previous !== transition) {
                    previous.changes.delete(change.index);
                    previous.arrivalTimes.delete(change.index);
                    if (previous.changes.size > 0) this.rebuildTransition(previous);
                }
                transition.changes.set(change.index, change);
                // Never overwrite an existing arrival time. This is the
                // invariant that prevents a late layer from inheriting the
                // older layer's progress or restarting the older layer.
                if (!transition.arrivalTimes.has(change.index)) {
                    transition.arrivalTimes.set(change.index, arrivalTime);
                    newlyAuthorized.push(change);
                }
                this.cellToTransition.set(change.index, transition);
                handled.add(change.index);
            }

            transition.newMaskRevision = ownershipRevision;
            this.resolvePresentationArrivalTimes(
                transition,
                newlyAuthorized,
                transition.frontSpeedCellsPerSecond || presentationFrontSpeedCellsPerSecond(),
            );

            this.rebuildTransition(transition, arrivalTime, newlyAuthorized);
            profileStage('transition.operationBookkeeping', bookkeepingStartedAt, group.length);
          }
        }

        return handled;
    }

    private findTouchingTransition(
        ownerPair: string,
        group: OwnershipChange[],
    ): TransitionOverlay | undefined {
        const candidates = this.activeTransitions.filter(
            transition => transition.ownerPair === ownerPair,
        );
        for (const transition of candidates) {
            for (const change of group) {
                if (transition.changes.has(change.index)) return transition;
                if (neighbouringPresentationCells(change.index).some(
                    neighbour => transition.changes.has(neighbour),
                )) return transition;
            }
        }
        return undefined;
    }

    private hasActivePlayerTransition(): boolean {
        return this.activeTransitions.some(
            transition => transition.oldOwner === PLAYER_FACTION_ID || transition.newOwner === PLAYER_FACTION_ID,
        );
    }

    private flushBackgroundTransitionsForPlayerFront(): void {
        for (let index = this.activeTransitions.length - 1; index >= 0; index--) {
            const transition = this.activeTransitions[index];
            if (transition.oldOwner === PLAYER_FACTION_ID || transition.newOwner === PLAYER_FACTION_ID) continue;
            this.completeTransition(index);
        }
    }

    private resolvePresentationArrivalTimes(
        transition: TransitionOverlay,
        newlyAuthorized: OwnershipChange[],
        frontSpeedCellsPerSecond: number,
    ): void {
        if (newlyAuthorized.length === 0) return;

        if (transition.presentationMode === 'FOCUS') {
            this.resolveFocusArrivalTimes(transition, newlyAuthorized, frontSpeedCellsPerSecond);
            return;
        }

        const travelMS = 1000 / Math.max(0.1, frontSpeedCellsPerSecond);
        const operationCells = new Set(transition.changes.keys());
        const depth = new Map<number, number>();
        const queue: number[] = [];
        const neighbours = (index: number): number[] => {
            const x = index % gameState.width;
            const y = Math.floor(index / gameState.width);
            const result: number[] = [];
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < gameState.width && ny >= 0 && ny < gameState.height) {
                    result.push(ny * gameState.width + nx);
                }
            }
            return result;
        };

        // Cells touching the already-owned domain are the roots of the
        // presentation front. The BFS depth is screen-space travel through
        // the already-authorized operation domain, not server time.
        for (const cell of operationCells) {
            if (neighbours(cell).some(neighbour =>
                !operationCells.has(neighbour)
                && (gameState.cellOwners[neighbour] ?? 0) === transition.newOwner)) {
                depth.set(cell, 0);
                queue.push(cell);
            }
        }
        if (queue.length === 0) {
            for (const change of newlyAuthorized) {
                depth.set(change.index, 0);
                queue.push(change.index);
            }
        }
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const cell = queue[cursor];
            const nextDepth = (depth.get(cell) ?? 0) + 1;
            for (const neighbour of neighbours(cell)) {
                if (!operationCells.has(neighbour) || depth.has(neighbour)) continue;
                depth.set(neighbour, nextDepth);
                queue.push(neighbour);
            }
        }

        const ordered = [...newlyAuthorized].sort((a, b) =>
            (depth.get(a.index) ?? 0) - (depth.get(b.index) ?? 0));
        for (const change of ordered) {
            const rawArrival = transition.arrivalTimes.get(change.index) ?? transition.startTime;
            let resolved = rawArrival;
            const currentDepth = depth.get(change.index) ?? 0;
            if (currentDepth > 0) {
                for (const neighbour of neighbours(change.index)) {
                    if ((depth.get(neighbour) ?? -1) !== currentDepth - 1) continue;
                    const parentArrival = transition.arrivalTimes.get(neighbour);
                    if (parentArrival !== undefined) {
                        resolved = Math.max(resolved, parentArrival + travelMS);
                    }
                }
            }
            transition.arrivalTimes.set(change.index, resolved);
        }
    }

    private resolveFocusArrivalTimes(
        transition: TransitionOverlay,
        newlyAuthorized: OwnershipChange[],
        frontSpeedCellsPerSecond: number,
    ): void {
        const ordered = [...newlyAuthorized];
        const direction = transition.direction ?? { dx: 0, dy: 0, angleDegrees: 0 };

        // Deltas normally arrive one topological layer at a time. If a batch
        // contains several cells, resolve them in the same target-facing
        // order so later cells can only use an already-known predecessor.
        ordered.sort((a, b) => {
            const ac = worldCellCenter(a.index);
            const bc = worldCellCenter(b.index);
            const at = ac.x * direction.dx + ac.y * direction.dy;
            const bt = bc.x * direction.dx + bc.y * direction.dy;
            return at - bt;
        });

        for (const change of ordered) {
            const parent = this.resolveFocusPredecessor(transition, change.index, direction);
            transition.predecessorByCell.set(change.index, parent);
            const rawArrival = transition.arrivalTimes.get(change.index) ?? transition.startTime;
            let resolved = rawArrival;
            if (parent !== null) {
                const parentArrival = transition.arrivalTimes.get(parent);
                if (parentArrival !== undefined) {
                    // The directional arrival field below owns the visual
                    // front timing. Do not add a separate parent-delay step:
                    // that turned one continuous front into a sequence of
                    // cell-sized pulses. Keep predecessor metadata for the
                    // legal contact/diagnostic path, but let every pixel use
                    // the same anchor-to-target arrival plane.
                    resolved = Math.max(resolved, parentArrival);
                }
            }
            transition.arrivalTimes.set(change.index, resolved);
        }
    }

    private resolveFocusPredecessor(
        transition: TransitionOverlay,
        cell: number,
        direction: PresentationDirection,
    ): number | null {
        const frontAnchor = transition.focusIntent?.sourceCell
            ?? transition.focusIntent?.resolvedAnchor
            ?? null;
        if (transition.predecessorByCell.size === 0 && frontAnchor !== null
            && sharedEntryBoundaryForParent(frontAnchor, cell) !== null
            && legalPresentationNeighbour(frontAnchor, cell)) {
            // The first captured cell must start at the actual legal local
            // front anchor. Do not let a different equally-near owned edge
            // win merely because it has a slightly better target projection.
            return frontAnchor;
        }
        const cellX = cell % gameState.width;
        const cellY = Math.floor(cell / gameState.width);
        const candidates: Array<{ cell: number; score: number; arrival: number }> = [];
        for (const [dx, dy] of [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [1, -1], [-1, 1], [1, 1],
        ]) {
            const nx = (cellX + dx + gameState.width) % gameState.width;
            const ny = cellY + dy;
            if (ny < 0 || ny >= gameState.height) continue;
            const neighbour = ny * gameState.width + nx;
            if (!legalPresentationNeighbour(neighbour, cell)) continue;
            const inOperation = transition.changes.has(neighbour);
            const isCurrentOwner = (gameState.cellOwners[neighbour] ?? 0) === transition.newOwner;
            if (!inOperation && !isCurrentOwner) continue;

            const knownArrival = transition.arrivalTimes.get(neighbour);
            // A cell arriving in the same authoritative batch cannot be used
            // as a predecessor unless it was already assigned above.
            if (inOperation && !transition.predecessorByCell.has(neighbour)) continue;
            const score = dx * direction.dx + dy * direction.dy;
            candidates.push({
                cell: neighbour,
                score,
                arrival: knownArrival ?? transition.startTime,
            });
        }
        candidates.sort((a, b) => b.score - a.score || a.arrival - b.arrival);
        return candidates[0]?.cell ?? null;
    }

    private createTransition(
        seed: OwnershipChange,
        ownerPair: string,
        isPlayerInvolved: boolean,
        ownershipRevision: number,
        arrivalTime: number,
    ): TransitionOverlay | null {
        if (this.activeTransitions.length >= MAX_ACTIVE_TRANSITIONS && !isPlayerInvolved) {
            this.metrics.totalTransitionsFlushedEarly++;
            const flushIndex = this.activeTransitions.findIndex(
                transition => transition.oldOwner !== PLAYER_FACTION_ID && transition.newOwner !== PLAYER_FACTION_ID,
            );
            if (flushIndex < 0) return null;
            this.completeTransition(flushIndex);
        }

        const pendingIntent = derivePresentationFrontAnchor(seed, readPendingPresentationIntent());
        const transition = new TransitionOverlay(
            `transition-${++this.transitionSequence}`,
            ownerPair,
            seed.oldOwner,
            seed.newOwner,
            Math.max(0, ownershipRevision - 1),
            ownershipRevision,
            arrivalTime,
            pendingIntent,
        );
        if (pendingIntent && pendingIntent.mode === 'FOCUS' && isPlayerInvolved) {
            // Consume the intent only when a real authoritative player delta
            // creates the presentation operation. No server state is changed.
            const raw = (window as any).__DOMINION_PENDING_PRESENTATION_OPERATION__;
            if (raw) raw.consumedAt = performance.now();
        }
        this.activeTransitions.push(transition);
        this.metrics.totalTransitionsSpawned++;
        this.updateMetrics();
        return transition;
    }

    private rebuildTransition(
        transition: TransitionOverlay,
        now = performance.now(),
        newlyAuthorized: OwnershipChange[] = [],
    ): void {
        if (transition.changes.size === 0) return;

        // Once the operation has a stable presentation domain, an incoming
        // authoritative layer only extends that domain locally. The previous
        // field and all prior arrival times stay intact; no target-shape
        // retarget is performed for the whole operation.
        if (transition.presentationInitialized && newlyAuthorized.length > 0
            && this.extendTransitionLocally(transition, newlyAuthorized, now)) {
            return;
        }

        const retargetStartedAt = performance.now();
        const previousFieldWidth = transition.fieldWidth;
        const previousFieldHeight = transition.fieldHeight;
        const previousRegionWidth = transition.regionWidth;
        const previousRegionHeight = transition.regionHeight;
        const field = buildSignedDistanceTexture(
            transition.changes,
            transition.newOwner,
            transition.arrivalTimes,
            transition.startTime,
            transition.fieldRegion,
            transition.presentationMode,
            transition.predecessorByCell,
            transition.direction,
            transition.focusIntent?.sourceCell ?? transition.focusIntent?.resolvedAnchor ?? null,
        );
        const canPreservePriorField = transition.oldField.length === field.oldField.length
            && transition.newField.length === field.newField.length
            && previousFieldWidth === field.width
            && previousFieldHeight === field.height;
        if (canPreservePriorField) {
            // A later authoritative layer extends the same operation. Keep
            // the scalar field that is already on screen and union the new
            // target into it, instead of replacing the whole local solution.
            // Arrival times still give the new layer local age zero, so this
            // preserves A's motion while B enters from its own start.
            for (let i = 0; i < field.oldField.length; i++) {
                field.oldField[i] = transition.oldField[i];
                field.newField[i] = Math.max(field.newField[i], transition.newField[i]);
                field.authorizedField[i] = Math.max(field.authorizedField[i], transition.authorizedField[i]);
                const pixel = i * 4;
                field.data[pixel] = encodeField(field.oldField[i]);
                field.data[pixel + 1] = encodeField(field.newField[i]);
                field.arrivalData[pixel + 1] = encodeField(field.authorizedField[i]);
            }
        }
        transition.oldField = field.oldField;
        transition.newField = field.newField;
        transition.authorizedField = field.authorizedField;
        transition.directionalField = field.directionalField;
        transition.directionalValid = field.directionalValid;
        transition.arrivalData = field.arrivalData;
        transition.latestArrivalTime = Math.max(field.maxArrivalTime, ...transition.arrivalTimes.values(), transition.startTime);
        transition.presentationInitialized = true;
        transition.frontSpeedCellsPerSecond = field.frontSpeedCellsPerSecond;
        transition.fieldWidth = field.width;
        transition.fieldHeight = field.height;
        transition.finalRevealPixels = countFinalRevealPixels(
            field.oldField,
            field.newField,
            field.authorizedField,
            field.arrivalData,
        );
        transition.transitionTextureRevision++;
        const sameSizedResources = transition.texture
            && transition.arrivalTexture
            && transition.texture.source.width === field.width
            && transition.texture.source.height === field.height
            && transition.arrivalTexture.source.width === field.width
            && transition.arrivalTexture.source.height === field.height;

        const texturePrepareStartedAt = performance.now();

        let texture: PIXI.Texture;
        let arrivalTexture: PIXI.Texture;
        let source: PoliticalTextureSource;
        let arrivalSource: PoliticalTextureSource;
        if (sameSizedResources) {
            texture = transition.texture;
            arrivalTexture = transition.arrivalTexture;
            source = texture.source as PoliticalTextureSource;
            arrivalSource = arrivalTexture.source as PoliticalTextureSource;
            (source.resource as Uint8Array).set(field.data);
            (arrivalSource.resource as Uint8Array).set(field.arrivalData);
            source.markFull();
            arrivalSource.markFull();
            source.update();
            arrivalSource.update();
            profileStage('transition.textureUpload.prepare', texturePrepareStartedAt, field.width * field.height * 2);
        } else {
            source = new PoliticalTextureSource({
                resource: field.data,
                width: field.width,
                height: field.height,
                format: 'rgba8unorm',
                alphaMode: 'no-premultiply-alpha',
                autoGenerateMipmaps: false,
            });
            source.style.scaleMode = 'linear';
            source.update();

            texture = new PIXI.Texture({ source });
            arrivalSource = new PoliticalTextureSource({
                resource: field.arrivalData,
                width: field.width,
                height: field.height,
                format: 'rgba8unorm',
                alphaMode: 'no-premultiply-alpha',
                autoGenerateMipmaps: false,
            });
            arrivalSource.style.scaleMode = 'linear';
            arrivalSource.update();
            arrivalTexture = new PIXI.Texture({ source: arrivalSource });
            profileStage('transition.textureUpload.create', texturePrepareStartedAt, field.width * field.height * 2);
        }
        const paletteOffset = Math.max(0, Math.min(255, transition.newOwner)) * 4;
        const paletteBuffer = this.palette.paletteBuffer;
        const ownerRgb = [
            (paletteBuffer[paletteOffset] ?? 0) / 255,
            (paletteBuffer[paletteOffset + 1] ?? 0) / 255,
            (paletteBuffer[paletteOffset + 2] ?? 0) / 255,
        ];
        const ownerAlpha = (paletteBuffer[paletteOffset + 3] ?? 0) / 255;
        const needsNewMesh = !transition.mesh
            || previousFieldWidth !== field.width
            || previousFieldHeight !== field.height
            || previousRegionWidth !== field.regionWidth
            || previousRegionHeight !== field.regionHeight;
        let mesh = transition.mesh;
        let shader = transition.shader;
        if (needsNewMesh) {
            const geometry = new PIXI.MeshGeometry({
                positions: new Float32Array([
                    0, 0,
                    field.regionWidth, 0,
                    field.regionWidth, field.regionHeight,
                    0, field.regionHeight,
                ]),
                uvs: new Float32Array([
                    0, 0,
                    1, 0,
                    1, 1,
                    0, 1,
                ]),
                indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
            });

            // Use Pixi's resource-aware constructor so sampler resources and
            // the non-UBO UniformGroup stay bound to the same presentation
            // object for every retarget with an unchanged dirty region.
            shader = PIXI.Shader.from({
                gl: {
                    vertex: vertexShader,
                    fragment: fragmentShader,
                },
                resources: {
                    uFieldTexture: texture.source,
                    uArrivalTexture: arrivalTexture.source,
                    uWorldReliefTexture: worldReliefTexture.source,
                    uTransitionUniforms: new PIXI.UniformGroup({
                        uElapsed: { value: Math.max(0, (now - transition.startTime) / 1000), type: 'f32' },
                        uPresentationDuration: { value: PRESENTATION_DURATION_SECONDS, type: 'f32' },
                        uArrivalBandSeconds: { value: ARRIVAL_BAND_SECONDS, type: 'f32' },
                        uArrivalOffsetMax: { value: ARRIVAL_OFFSET_MAX_SECONDS, type: 'f32' },
                        uDirectionalWipe: { value: transition.directionalWipe ? 1 : 0, type: 'f32' },
                        uDirectionalFeather: { value: DIRECTIONAL_FEATHER, type: 'f32' },
                        uFieldRange: { value: FIELD_RANGE, type: 'f32' },
                        uNewOwner: { value: transition.newOwner, type: 'f32' },
                        uNewOwnerRgb: { value: ownerRgb, type: 'vec3<f32>' },
                        uNewOwnerAlpha: { value: ownerAlpha, type: 'f32' },
                    }),
                },
            });

            mesh = new PIXI.Mesh({ geometry, shader: shader as any });
            mesh.blendMode = 'normal';
            mesh.visible = true;
            mesh.alpha = 1;
        } else {
            shader.resources.uFieldTexture = texture.source;
            shader.resources.uArrivalTexture = arrivalTexture.source;
        }
        mesh.x = field.minX;
        mesh.y = field.minY;

        const previousMesh = transition.mesh;
        const previousTexture = transition.texture;
        const previousArrivalTexture = transition.arrivalTexture;
        // Add the replacement before removing the old render object. Both
        // are presentation-only and occupy the same bounded dirty region, so
        // a retarget cannot produce a one-frame hole or restart flash.
        if (needsNewMesh) this.container.addChild(mesh);
        if (previousMesh && previousMesh !== mesh) {
            this.container.removeChild(previousMesh);
            previousMesh.destroy();
            if (previousTexture && previousTexture !== texture) previousTexture.destroy(true);
            if (previousArrivalTexture && previousArrivalTexture !== arrivalTexture) previousArrivalTexture.destroy(true);
        }
        transition.mesh = mesh;
        transition.shader = shader;
        transition.texture = texture;
        transition.arrivalTexture = arrivalTexture;
        transition.fieldRegion = {
            minX: field.minX,
            minY: field.minY,
            maxX: field.minX + field.regionWidth,
            maxY: field.minY + field.regionHeight,
        };
        transition.regionWidth = field.regionWidth;
        transition.regionHeight = field.regionHeight;
        profileStage('transition.retarget', retargetStartedAt, field.width * field.height);
    }

    private extendTransitionLocally(
        transition: TransitionOverlay,
        newlyAuthorized: OwnershipChange[],
        now: number,
    ): boolean {
        const region = transition.fieldRegion;
        if (!region || !transition.texture || !transition.arrivalTexture) return false;

        let minCellX = gameState.width;
        let minCellY = gameState.height;
        let maxCellX = -1;
        let maxCellY = -1;
        const newCells = new Map<number, OwnershipChange>();
        for (const change of newlyAuthorized) {
            const cellX = change.index % gameState.width;
            const cellY = Math.floor(change.index / gameState.width);
            minCellX = Math.min(minCellX, cellX);
            minCellY = Math.min(minCellY, cellY);
            maxCellX = Math.max(maxCellX, cellX);
            maxCellY = Math.max(maxCellY, cellY);
            newCells.set(change.index, change);
        }
        if (maxCellX < 0) return true;

        // A local patch is intentionally smaller than the operation field. If
        // the operation grows beyond its padded mesh, the safe fallback is a
        // one-time full rebuild; normal 250 ms layers stay inside this margin.
        const patchPaddingCells = 2;
        const patchMinX = Math.max(region.minX, minCellX - patchPaddingCells);
        const patchMinY = Math.max(region.minY, minCellY - patchPaddingCells);
        const patchMaxX = Math.min(region.maxX, maxCellX + patchPaddingCells + 1);
        const patchMaxY = Math.min(region.maxY, maxCellY + patchPaddingCells + 1);
        if (patchMinX >= patchMaxX || patchMinY >= patchMaxY) return false;
        if (patchMinX !== minCellX - patchPaddingCells
            || patchMinY !== minCellY - patchPaddingCells
            || patchMaxX !== maxCellX + patchPaddingCells + 1
            || patchMaxY !== maxCellY + patchPaddingCells + 1) {
            return false;
        }

        const startedAt = performance.now();
        const fieldWidth = transition.fieldWidth;
        const fieldHeight = transition.fieldHeight;
        const localMinPx = Math.max(0, Math.floor((patchMinX - region.minX) * FIELD_SCALE));
        const localMinPy = Math.max(0, Math.floor((patchMinY - region.minY) * FIELD_SCALE));
        const localMaxPx = Math.min(fieldWidth, Math.ceil((patchMaxX - region.minX) * FIELD_SCALE));
        const localMaxPy = Math.min(fieldHeight, Math.ceil((patchMaxY - region.minY) * FIELD_SCALE));
        const patchWidth = Math.max(1, localMaxPx - localMinPx);
        const patchHeight = Math.max(1, localMaxPy - localMinPy);
        const localAuthorizedMask = new Uint8Array(patchWidth * patchHeight);
        const visualMapping = presentationVisualMapping();
        for (let patchY = 0; patchY < patchHeight; patchY++) {
            const worldY = region.minY + (localMinPy + patchY + 0.5) / FIELD_SCALE;
            for (let patchX = 0; patchX < patchWidth; patchX++) {
                const worldX = region.minX + (localMinPx + patchX + 0.5) / FIELD_SCALE;
                const cellIndex = presentationCellAtWorld(worldX, worldY, visualMapping);
                localAuthorizedMask[patchY * patchWidth + patchX] =
                    isVisualLand(worldX, worldY) && transition.changes.has(cellIndex) ? 1 : 0;
            }
        }
        // Keep incremental layers geometrically identical to the initial
        // field build. A later diagonal child must carry its real legal
        // parent/child contact into this local patch too; otherwise the first
        // layer is connected while a later layer can appear as an island.
        const diagonalContactPixels = connectLegalDiagonalPresentationMask(
            localAuthorizedMask,
            newCells,
            transition.newOwner,
            patchMinX,
            patchMinY,
            patchWidth,
            patchHeight,
        );
        // New layers must enter with the same continuous contour quality as
        // the initial operation field. The prior implementation patched a
        // raw one-cell square SDF, which made an otherwise smooth front grow
        // a rectangular/vertical cap at each authoritative layer.
        const localAuthorizedRawField = signedDistance(localAuthorizedMask, patchWidth, patchHeight);
        const localAuthorizedSmoothField = smoothDistanceField(
            localAuthorizedRawField,
            patchWidth,
            patchHeight,
            FIELD_AUTHORIZED_SMOOTH_RADIUS_CELLS,
        );
        for (const contact of diagonalContactPixels) {
            const index = contact.y * patchWidth + contact.x;
            localAuthorizedSmoothField[index] = Math.max(localAuthorizedSmoothField[index], 0.22);
        }
        const frontSpeed = transition.frontSpeedCellsPerSecond || presentationFrontSpeedCellsPerSecond();
        let changedPixels = 0;
        let latestArrival = transition.latestArrivalTime;

        for (let py = localMinPy; py < localMaxPy; py++) {
            const worldY = region.minY + (py + 0.5) / FIELD_SCALE;
            for (let px = localMinPx; px < localMaxPx; px++) {
                const worldX = region.minX + (px + 0.5) / FIELD_SCALE;
                const cellIndex = presentationCellAtWorld(worldX, worldY, visualMapping);
                const cellX = cellIndex % gameState.width;
                const cellY = Math.floor(cellIndex / gameState.width);
                const sampleIndex = py * fieldWidth + px;
                const land = isVisualLand(worldX, worldY);
                const patchIndex = (py - localMinPy) * patchWidth + (px - localMinPx);
                const candidate = land ? localAuthorizedSmoothField[patchIndex] : -FIELD_RANGE;
                const rawCandidate = land ? localAuthorizedRawField[patchIndex] : -FIELD_RANGE;
                const previousNewField = transition.newField[sampleIndex];
                const previousAuthorizedField = transition.authorizedField[sampleIndex];
                // Keep the containment invariant during a local layer update
                // as well as during the initial field build. Without this
                // floor a newly authorized diagonal layer can make the old
                // sovereign neck disappear for one or two frames while its
                // replacement contour is being retargeted.
                const nextNewField = Math.max(
                    transition.oldField[sampleIndex],
                    transition.newField[sampleIndex],
                    candidate,
                );
                const nextAuthorizedField = Math.max(
                    previousAuthorizedField,
                    localAuthorizedSmoothField[patchIndex],
                );
                transition.newField[sampleIndex] = nextNewField;
                transition.authorizedField[sampleIndex] = nextAuthorizedField;

                if (nextNewField <= previousNewField + 0.0001
                    && nextAuthorizedField <= previousAuthorizedField + 0.0001) {
                    continue;
                }

                // Preserve the arrival time of pixels that were already part
                // of the visible field. Extending the authorized domain may
                // increase the local scalar field around them, but it must
                // not rewrite their clock to the later layer's arrival time;
                // doing so makes the visible pixel count dip at each 250 ms
                // authority update and creates a layer-pulse.
                const hasExistingVisualCoverage = previousNewField > 0.0001;
                // Include the legal diagonal contact feather in the same
                // local arrival field as the newly-authorized child cell.
                const sampleIsNewlyAuthorized = localAuthorizedMask[patchIndex] !== 0;
                const arrivalTime = hasExistingVisualCoverage || !sampleIsNewlyAuthorized
                    ? null
                    : propagatedArrivalTimeForSample(
                            worldX,
                            worldY,
                            cellX,
                            cellY,
                            newCells,
                            transition.arrivalTimes,
                            transition.newOwner,
                            frontSpeed,
                            transition.presentationMode,
                            transition.predecessorByCell,
                            transition.direction,
                            transition.focusIntent?.sourceCell
                                ?? transition.focusIntent?.resolvedAnchor
                                ?? null,
                            transition.startTime,
                        );
                if (arrivalTime !== null) {
                    latestArrival = Math.max(latestArrival, arrivalTime);
                }
                const pixel = sampleIndex * 4;
                if (arrivalTime !== null) {
                    transition.arrivalData[pixel] = Math.round(
                        Math.max(0, Math.min(ARRIVAL_OFFSET_MAX_SECONDS,
                            (arrivalTime - transition.startTime) / 1000))
                        / ARRIVAL_OFFSET_MAX_SECONDS * 255,
                    );
                } else if (!sampleIsNewlyAuthorized) {
                    // A smoothed target field may cover neighbouring samples,
                    // but only the newly-authorized visual cell receives an
                    // arrival clock. This prevents the smooth contour from
                    // predicting into a future/neutral cell.
                    transition.arrivalData[pixel] = 255;
                }
                transition.arrivalData[pixel + 1] = encodeField(nextAuthorizedField);
                transition.arrivalData[pixel + 3] = Math.round(
                    authorizedRevealDomain(nextAuthorizedField) * 255,
                );
                // The old field is deliberately untouched. This is what
                // prevents an authoritative owner update from bypassing the
                // presentation state before the local front arrives.
                const fieldBytes = transition.texture.source.resource as Uint8Array;
                const arrivalBytes = transition.arrivalTexture.source.resource as Uint8Array;
                fieldBytes[pixel] = encodeField(transition.oldField[sampleIndex]);
                fieldBytes[pixel + 1] = encodeField(nextNewField);
                arrivalBytes[pixel] = transition.arrivalData[pixel];
                arrivalBytes[pixel + 1] = transition.arrivalData[pixel + 1];
                arrivalBytes[pixel + 3] = transition.arrivalData[pixel + 3];
                changedPixels++;
            }
        }

        const uploadMinX = localMinPx;
        const uploadMinY = localMinPy;
        const uploadMaxX = localMaxPx;
        const uploadMaxY = localMaxPy;
        const source = transition.texture.source as PoliticalTextureSource;
        const arrivalSource = transition.arrivalTexture.source as PoliticalTextureSource;
        source.markPixelRect(uploadMinX, uploadMinY, uploadMaxX, uploadMaxY);
        arrivalSource.markPixelRect(uploadMinX, uploadMinY, uploadMaxX, uploadMaxY);
        const uploadStartedAt = performance.now();
        source.update();
        arrivalSource.update();
        profileStage('transition.arrivalField.localUpdate', startedAt, changedPixels);
        profileStage('transition.textureUpload.subregion', uploadStartedAt,
            (uploadMaxX - uploadMinX) * (uploadMaxY - uploadMinY) * 2);
        transition.latestArrivalTime = latestArrival;
        transition.finalRevealPixels = countFinalRevealPixels(
            transition.oldField,
            transition.newField,
            transition.authorizedField,
            transition.arrivalData,
        );
        transition.transitionTextureRevision++;
        return true;
    }

    private updateMetrics(): void {
        this.metrics.activeTransitionCount = this.activeTransitions.length;
        this.metrics.queuedTransitionCount = 0;
        this.metrics.maxObservedTransitionCount = Math.max(
            this.metrics.maxObservedTransitionCount,
            this.metrics.activeTransitionCount,
        );
    }
}

interface FieldTexture {
    data: Uint8Array;
    arrivalData: Uint8Array;
    width: number;
    height: number;
    minX: number;
    minY: number;
    regionWidth: number;
    regionHeight: number;
    oldField: Float32Array<ArrayBufferLike>;
    newField: Float32Array<ArrayBufferLike>;
    authorizedField: Float32Array<ArrayBufferLike>;
    directionalField: Float32Array<ArrayBufferLike>;
    directionalValid: Uint8Array<ArrayBufferLike>;
    maxArrivalTime: number;
    frontSpeedCellsPerSecond: number;
    region: { minX: number; minY: number; maxX: number; maxY: number };
}

function buildSignedDistanceTexture(
    changes: ReadonlyMap<number, OwnershipChange>,
    newOwner: number,
    arrivalTimes: ReadonlyMap<number, number>,
    operationStartTime: number,
    previousRegion?: { minX: number; minY: number; maxX: number; maxY: number },
    presentationMode: PresentationMode = 'GENERIC',
    predecessors: ReadonlyMap<number, number | null> = new Map(),
    direction: PresentationDirection | null = null,
    focusAnchorCell: number | null = null,
): FieldTexture {
    const dirtyRegionStartedAt = performance.now();
    let minCellX = gameState.width;
    let minCellY = gameState.height;
    let maxCellX = -1;
    let maxCellY = -1;

    for (const index of changes.keys()) {
        const x = index % gameState.width;
        const y = Math.floor(index / gameState.width);
        minCellX = Math.min(minCellX, x);
        minCellY = Math.min(minCellY, y);
        maxCellX = Math.max(maxCellX, x);
        maxCellY = Math.max(maxCellY, y);
    }

    const requestedMinX = Math.max(0, minCellX - FIELD_PADDING_CELLS);
    const requestedMinY = Math.max(0, minCellY - FIELD_PADDING_CELLS);
    const requestedMaxX = Math.min(gameState.width, maxCellX + FIELD_PADDING_CELLS + 1);
    const requestedMaxY = Math.min(gameState.height, maxCellY + FIELD_PADDING_CELLS + 1);
    // Keep the previous padded domain stable while layers are appended. If a
    // later authoritative layer falls outside it, expand once; never shrink
    // or replace the active field with a new tight bounding box.
    const minX = Math.max(0, Math.min(requestedMinX, previousRegion?.minX ?? requestedMinX));
    const minY = Math.max(0, Math.min(requestedMinY, previousRegion?.minY ?? requestedMinY));
    const maxX = Math.min(gameState.width, Math.max(requestedMaxX, previousRegion?.maxX ?? requestedMaxX));
    const maxY = Math.min(gameState.height, Math.max(requestedMaxY, previousRegion?.maxY ?? requestedMaxY));
    const regionWidth = Math.max(1, maxX - minX);
    const regionHeight = Math.max(1, maxY - minY);
    const width = Math.max(1, regionWidth * FIELD_SCALE);
    const height = Math.max(1, regionHeight * FIELD_SCALE);
    const sampleCount = width * height;
    const oldMask = new Uint8Array(sampleCount);
    const newMask = new Uint8Array(sampleCount);
    const authorizedMask = new Uint8Array(sampleCount);
    const directionalField = new Float32Array(sampleCount);
    const directionalValid = new Uint8Array(sampleCount);
    const arrivalData = new Uint8Array(sampleCount * 4);
    // Presentation samples must use the same high-resolution visual-to-cell
    // mapping as the political surface and pointer resolver. Falling back to
    // floor(world) here makes a coastal visual fragment inherit the wrong
    // square cell and leaves holes at cell seams.
    const visualMapping = presentationVisualMapping();

    const maskStartedAt = performance.now();
    for (let py = 0; py < height; py++) {
        const worldY = minY + (py + 0.5) / FIELD_SCALE;
        for (let px = 0; px < width; px++) {
            const worldX = minX + (px + 0.5) / FIELD_SCALE;
            const cell = presentationCellAtWorld(worldX, worldY, visualMapping);
            const cellX = cell % gameState.width;
            const cellY = Math.floor(cell / gameState.width);
            const change = changes.get(cell);
            const currentOwner = gameState.cellOwners[cell] ?? 0;
            const oldCellOwner = change?.oldOwner ?? currentOwner;
            const index = py * width + px;
            const land = isVisualLand(worldX, worldY);
            oldMask[index] = land && oldCellOwner === newOwner ? 1 : 0;
            newMask[index] = land && currentOwner === newOwner ? 1 : 0;
            authorizedMask[index] = land && change && change.newOwner === newOwner && change.oldOwner !== newOwner ? 1 : 0;
            if (land && change && change.newOwner === newOwner && change.oldOwner !== newOwner) {
                const direction = directionalCoordinateForCell(cellX, cellY, newOwner, changes);
                if (direction) {
                    const localX = worldX - cellX;
                    const localY = worldY - cellY;
                    directionalField[index] = direction.dx !== 0
                        ? (direction.dx < 0 ? localX : 1 - localX)
                        : (direction.dy < 0 ? localY : 1 - localY);
                    directionalValid[index] = 255;
                }
            }
        }
    }
    const diagonalContactPixels = connectLegalDiagonalPresentationMask(
        newMask,
        changes,
        newOwner,
        minX,
        minY,
        width,
        height,
    );
    // A legal diagonal source/child contact is part of the already-authorized
    // presentation domain as well as the final political contour.  Keeping it
    // only in newMask lets the far side of the child reveal before the source
    // corner is eligible for the same arrival clock, which is the detached
    // target-side blob seen in the HUN/SW runtime capture.  The helper is
    // restricted to mapped land in the two owner cells, so this does not admit
    // a neutral or future cell.
    for (const contact of diagonalContactPixels) {
        authorizedMask[contact.y * width + contact.x] = 1;
    }
    profileStage('transition.dirtyRegion', dirtyRegionStartedAt, changes.size);
    profileStage('transition.maskGeneration', maskStartedAt, sampleCount * 4);
    // Land-mask sampling is part of the mask pass, but is reported separately
    // so the benchmark makes the inclusive cost explicit instead of hiding it
    // inside the SDF number.
    profileStage('transition.landMask', maskStartedAt, sampleCount);

    const arrivalStartedAt = performance.now();
    const frontSpeedCellsPerSecond = presentationFrontSpeedCellsPerSecond();
    let maxArrivalTime = operationStartTime;
    for (let py = 0; py < height; py++) {
        const worldY = minY + (py + 0.5) / FIELD_SCALE;
        for (let px = 0; px < width; px++) {
            const worldX = minX + (px + 0.5) / FIELD_SCALE;
            const mappedCell = presentationCellAtWorld(worldX, worldY, visualMapping);
            const cellX = mappedCell % gameState.width;
            const cellY = Math.floor(mappedCell / gameState.width);
            const index = py * width + px;
            const change = changes.get(mappedCell);
            // The diagonal source/child contact feather is an already-legal
            // presentation sample too. It has no direct ownership-change
            // record because it lies on the shared corner, so use the
            // composed authorized mask rather than only the mapped cell
            // change when assigning its arrival clock.
            const sampleAuthorized = authorizedMask[index] !== 0;
            const arrivalTime = sampleAuthorized
                ? propagatedArrivalTimeForSample(
                    worldX,
                    worldY,
                    cellX,
                    cellY,
                    changes,
                    arrivalTimes,
                    newOwner,
                    frontSpeedCellsPerSecond,
                    presentationMode,
                    predecessors,
                    direction,
                    focusAnchorCell,
                    operationStartTime,
                )
                : null;
            if (arrivalTime !== null && change && change.newOwner === newOwner) {
                maxArrivalTime = Math.max(maxArrivalTime, arrivalTime);
            }
            const arrivalOffsetSeconds = arrivalTime === null
                ? ARRIVAL_OFFSET_MAX_SECONDS
                : Math.max(0, Math.min(ARRIVAL_OFFSET_MAX_SECONDS, (arrivalTime - operationStartTime) / 1000));
            arrivalData[index * 4] = Math.round((arrivalOffsetSeconds / ARRIVAL_OFFSET_MAX_SECONDS) * 255);
            // Green is filled after the continuous authorization field is
            // built. Alpha remains a categorical diagnostic bit for the
            // directional anchor and is never used as the reveal boundary.
        }
    }
    if (maxArrivalTime > operationStartTime) {
        // The smoothed old/new contour can contribute a narrow presentation
        // feather just outside the categorical cell. Keep the transition alive
        // for that bounded tail so the feather cannot be committed in a later
        // one-frame base update.
        maxArrivalTime += (FIELD_SMOOTH_RADIUS_CELLS / Math.max(0.1, frontSpeedCellsPerSecond)) * 1000;
    }
    profileStage('transition.arrivalField', arrivalStartedAt, sampleCount);

    const sdfStartedAt = performance.now();
    const oldRawField = signedDistance(oldMask, width, height);
    const newRawField = signedDistance(newMask, width, height);
    const oldField = preservePositiveSupport(
        smoothDistanceField(oldRawField, width, height),
        oldRawField,
    );
    const newField = preservePositiveSupport(
        smoothDistanceField(newRawField, width, height),
        newRawField,
    );
    // Ownership is monotonic during a reveal: the new presentation field is
    // a superset of the old sovereign field. Independent Gaussian passes can
    // otherwise average a one-cell neck below the old field at a diagonal or
    // concave corner. The shader then computes
    // `max(0, targetCoverage - oldCoverage)` and leaves a neutral-looking
    // hole in an otherwise connected country. Preserve the old field as a
    // presentation floor. It can only retain territory that was already
    // owned before this transition, so it cannot reveal future authority or
    // cross the authorization barrier.
    for (let i = 0; i < newField.length; i++) {
        if (oldField[i] > newField[i]) newField[i] = oldField[i];
    }
    // The smoothing kernel is intentionally wide enough to hide the cell
    // grid, but it can erase a legal diagonal's one-point contact. Restore
    // only those already-authorized contact samples after smoothing; this is
    // a geometric presentation seam, not an ownership expansion.
    for (const contact of diagonalContactPixels) {
        const index = contact.y * width + contact.x;
        newField[index] = Math.max(newField[index], 0.22);
    }
    // The authorized domain is already a presentation-time signed-distance
    // gate. Do not apply the large contour smoothing kernel here: a single
    // newly-authorized cell can otherwise be averaged back below zero before
    // the reveal shader sees it. Geometry remains smooth through the shader
    // feather and the separately smoothed old/new political fields.
    const authorizedField = smoothDistanceField(
        signedDistance(authorizedMask, width, height),
        width,
        height,
        FIELD_AUTHORIZED_SMOOTH_RADIUS_CELLS,
    );
    profileStage('transition.sdf', sdfStartedAt, sampleCount * 3);
    const data = new Uint8Array(sampleCount * 4);

    for (let i = 0; i < sampleCount; i++) {
        const p = i * 4;
        data[p] = encodeField(oldField[i]);
        data[p + 1] = encodeField(newField[i]);
        data[p + 2] = Math.round(Math.max(0, Math.min(1, directionalField[i])) * 255);
        data[p + 3] = directionalValid[i];
        arrivalData[p + 1] = encodeField(authorizedField[i]);
            // The alpha channel carries the soft authorized presentation
            // domain. Its red-channel arrival time is still the authority
            // barrier: samples in a smoothed halo receive the 30s sentinel
            // unless their visual cell has already been authorized.
            arrivalData[p + 3] = Math.round(authorizedRevealDomain(authorizedField[i]) * 255);
    }

    return {
        data,
        arrivalData,
        width,
        height,
        minX,
        minY,
        regionWidth,
        regionHeight,
        oldField,
        newField,
        authorizedField,
        directionalField,
        directionalValid,
        maxArrivalTime,
        frontSpeedCellsPerSecond,
        region: { minX, minY, maxX, maxY },
    };
}

function presentationFrontSpeedCellsPerSecond(): number {
    const scale = Number((window as any).__DOMINION_RENDERER__?.worldContainer?.scale?.x ?? 1);
    const zoomRatio = scale / Math.max(0.0001, Number((window as any).__DOMINION_RENDERER__?.fitScale ?? 1));
    const pixelsPerSecond = zoomRatio >= 2.75
        ? FRONT_SPEED_CLOSE_PX_PER_SECOND
        : zoomRatio >= 1.35
            ? FRONT_SPEED_REGIONAL_PX_PER_SECOND
            : FRONT_SPEED_WORLD_PX_PER_SECOND;
    return Math.max(
        FRONT_SPEED_MIN_CELLS_PER_SECOND,
        Math.min(FRONT_SPEED_MAX_CELLS_PER_SECOND, pixelsPerSecond / Math.max(1, scale)),
    );
}

function connectLegalDiagonalPresentationMask(
    mask: Uint8Array,
    changes: ReadonlyMap<number, OwnershipChange>,
    newOwner: number,
    minX: number,
    minY: number,
    fieldWidth: number,
    fieldHeight: number,
): Array<{ x: number; y: number }> {
    const processed = new Set<string>();
    const contactPixels: Array<{ x: number; y: number }> = [];
    const visualMapping = gameState.visualLandMask
        ? getVisualGameplayMapping(
            gameState.visualLandMask,
            4096,
            2048,
            gameState.width,
            gameState.height,
            gameState.cellTerrains,
        )
        : null;
    for (const cell of changes.keys()) {
        const cellX = cell % gameState.width;
        const cellY = Math.floor(cell / gameState.width);
        for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
            const neighbourY = cellY + dy;
            if (neighbourY < 0 || neighbourY >= gameState.height) continue;
            const neighbourX = (cellX + dx + gameState.width) % gameState.width;
            const neighbour = neighbourY * gameState.width + neighbourX;
            const pairKey = cell < neighbour ? `${cell}:${neighbour}` : `${neighbour}:${cell}`;
            if (processed.has(pairKey)) continue;
            const neighbourOwner = changes.get(neighbour)?.newOwner
                ?? gameState.cellOwners[neighbour]
                ?? 0;
            if ((changes.get(cell)?.newOwner ?? gameState.cellOwners[cell] ?? 0) !== newOwner
                || neighbourOwner !== newOwner
                || !legalPresentationNeighbour(cell, neighbour)) continue;
            processed.add(pairKey);

            const cornerX = dx > 0 ? cellX + 1 : cellX;
            const cornerY = dy > 0 ? cellY + 1 : cellY;
            const centerX = Math.round((cornerX - minX) * FIELD_SCALE - 0.5);
            const centerY = Math.round((cornerY - minY) * FIELD_SCALE - 0.5);
            const contactRadiusSamples = Math.ceil(FIELD_SMOOTH_RADIUS_CELLS * FIELD_SCALE * 0.55);
            // The visual-land -> gameplay mapping is intentionally conservative
            // around coastlines and diagonal corners.  At an inland diagonal
            // sovereign contact it can therefore leave the exact shared corner
            // unmapped even though both authoritative cells are legal
            // neighbours.  Keep the normal pair-cell restriction for the
            // rounded contact, but allow a very small land-only corner feather
            // to bridge that sampling hole.  This is presentation coverage
            // inside the already-authorized source/child contact; it does not
            // authorize or reveal a future cell.
            const cornerFeatherSamples = Math.ceil(FIELD_SCALE * 0.24);
            for (let oy = -contactRadiusSamples; oy <= contactRadiusSamples; oy++) for (let ox = -contactRadiusSamples; ox <= contactRadiusSamples; ox++) {
                if (ox * ox + oy * oy > contactRadiusSamples * contactRadiusSamples) continue;
                const px = centerX + ox;
                const py = centerY + oy;
                if (px < 0 || px >= fieldWidth || py < 0 || py >= fieldHeight) continue;
                const worldX = minX + (px + 0.5) / FIELD_SCALE;
                const worldY = minY + (py + 0.5) / FIELD_SCALE;
                const mappedCell = visualMapping?.cellAtWorld(worldX, worldY) ?? -1;
                const pairCell = mappedCell === cell || mappedCell === neighbour;
                const nearSharedCorner = Math.hypot(ox, oy) <= cornerFeatherSamples;
                const insideAuthorizedCellBounds =
                    ((worldX >= cellX && worldX <= cellX + 1)
                        && (worldY >= cellY && worldY <= cellY + 1))
                    || ((worldX >= neighbourX && worldX <= neighbourX + 1)
                        && (worldY >= neighbourY && worldY <= neighbourY + 1));
                // The second clause is deliberately tiny and only applies to
                // the legal shared corner and stays within the geometric
                // bounds of the two authorized cells.  Without it a
                // one-sample mapping hole turns a rounded diagonal sovereign
                // contact into two separately visible red islands with a hard
                // square seam.
                if (isVisualLand(worldX, worldY)
                    && (pairCell || (nearSharedCorner && insideAuthorizedCellBounds))) {
                    mask[py * fieldWidth + px] = 1;
                    contactPixels.push({ x: px, y: py });
                }
            }
        }
    }
    return contactPixels;
}

function cellSignedDistance(localX: number, localY: number): number {
    const outsideX = Math.max(0, -localX, localX - 1);
    const outsideY = Math.max(0, -localY, localY - 1);
    if (outsideX > 0 || outsideY > 0) return -Math.min(FIELD_RANGE, Math.hypot(outsideX, outsideY));
    return Math.min(localX, 1 - localX, localY, 1 - localY);
}

function changeArrivalTime(
    change: OwnershipChange,
    cellX: number,
    cellY: number,
    localX: number,
    localY: number,
    arrivalTimes: ReadonlyMap<number, number>,
    changes: ReadonlyMap<number, OwnershipChange>,
    newOwner: number,
    frontSpeedCellsPerSecond: number,
): number {
    const distance = sharedEdgeDistance(cellX, cellY, localX, localY, changes, newOwner);
    return (arrivalTimes.get(change.index) ?? performance.now())
        + (distance / Math.max(0.1, frontSpeedCellsPerSecond)) * 1000;
}

function propagatedArrivalTimeForSample(
    worldX: number,
    worldY: number,
    cellX: number,
    cellY: number,
    changes: ReadonlyMap<number, OwnershipChange>,
    arrivalTimes: ReadonlyMap<number, number>,
    newOwner: number,
    frontSpeedCellsPerSecond: number,
    presentationMode: PresentationMode = 'GENERIC',
    predecessors: ReadonlyMap<number, number | null> = new Map(),
    direction: PresentationDirection | null = null,
    focusAnchorCell: number | null = null,
    operationStartTime = performance.now(),
): number | null {
    const directCell = cellY * gameState.width + cellX;
    const directChange = changes.get(directCell);
    if (directChange?.newOwner === newOwner) {
        const directX = directChange.index % gameState.width;
        const directY = Math.floor(directChange.index / gameState.width);
        const directDistance = presentationMode === 'FOCUS' && direction && focusAnchorCell !== null
            ? directionalFrontDistance(worldX, worldY, focusAnchorCell, direction)
            : presentationMode === 'FOCUS' && direction
                ? focusEntryDistance(
                    worldX,
                    worldY,
                    directX,
                    directY,
                    predecessors.get(directChange.index) ?? null,
                    direction,
                )
            : genericPropagationDistance(
                worldX,
                worldY,
                directX,
                directY,
                cellX,
                cellY,
                changes,
                newOwner,
            );
        const authorityTime = arrivalTimes.get(directChange.index) ?? operationStartTime;
        const frontTime = operationStartTime
            + (directDistance / Math.max(0.1, frontSpeedCellsPerSecond)) * 1000;
        return presentationMode === 'FOCUS' && direction && focusAnchorCell !== null
            ? Math.max(authorityTime, frontTime)
            : authorityTime + (directDistance / Math.max(0.1, frontSpeedCellsPerSecond)) * 1000;
    }

    let nearest: number | null = null;
    for (const change of changes.values()) {
        if (change.newOwner !== newOwner) continue;
        const authorizedX = change.index % gameState.width;
        const authorizedY = Math.floor(change.index / gameState.width);
        const distance = presentationMode === 'FOCUS' && direction && focusAnchorCell !== null
            ? directionalFrontDistance(worldX, worldY, focusAnchorCell, direction)
            : presentationMode === 'FOCUS' && direction
                ? focusEntryDistance(
                    worldX,
                    worldY,
                    authorizedX,
                    authorizedY,
                    predecessors.get(change.index) ?? null,
                    direction,
                )
            : genericPropagationDistance(
                worldX,
                worldY,
                authorizedX,
                authorizedY,
                cellX,
                cellY,
                changes,
                newOwner,
            );
        const authorityTime = arrivalTimes.get(change.index) ?? operationStartTime;
        const frontTime = operationStartTime
            + (distance / Math.max(0.1, frontSpeedCellsPerSecond)) * 1000;
        const arrival = presentationMode === 'FOCUS' && direction && focusAnchorCell !== null
            ? Math.max(authorityTime, frontTime)
            : authorityTime + (distance / Math.max(0.1, frontSpeedCellsPerSecond)) * 1000;
        if (nearest === null || arrival < nearest) nearest = arrival;
    }
    return nearest;
}

function genericPropagationDistance(
    worldX: number,
    worldY: number,
    authorizedX: number,
    authorizedY: number,
    cellX: number,
    cellY: number,
    changes: ReadonlyMap<number, OwnershipChange>,
    newOwner: number,
): number {
    const outsideX = Math.max(0, authorizedX - worldX, worldX - (authorizedX + 1));
    const outsideY = Math.max(0, authorizedY - worldY, worldY - (authorizedY + 1));
    const closestX = Math.max(0, Math.min(1, worldX - authorizedX));
    const closestY = Math.max(0, Math.min(1, worldY - authorizedY));
    const edgeDistance = sharedEdgeDistance(
        authorizedX,
        authorizedY,
        cellX === authorizedX && cellY === authorizedY ? worldX - cellX : closestX,
        cellX === authorizedX && cellY === authorizedY ? worldY - cellY : closestY,
        changes,
        newOwner,
    );
    return Math.hypot(outsideX, outsideY) + edgeDistance;
}

function directionalFrontDistance(
    worldX: number,
    worldY: number,
    anchorCell: number,
    direction: PresentationDirection,
): number {
    const anchor = worldCellCenter(anchorCell);
    let dx = worldX - anchor.x;
    if (dx > gameState.width / 2) dx -= gameState.width;
    if (dx < -gameState.width / 2) dx += gameState.width;
    const dy = worldY - anchor.y;
    // The command direction is the only timing axis for FOCUS. Clamp the
    // source-side half-plane so a front never arrives before its anchor.
    return Math.max(0, dx * direction.dx + dy * direction.dy);
}

function focusEntryDistance(
    worldX: number,
    worldY: number,
    cellX: number,
    cellY: number,
    parentCell: number | null,
    direction: PresentationDirection,
): number {
    const localX = worldX - cellX;
    const localY = worldY - cellY;
    const clampedX = Math.max(0, Math.min(1, localX));
    const clampedY = Math.max(0, Math.min(1, localY));
    const outsideDistance = Math.hypot(localX - clampedX, localY - clampedY);
    const entryBoundary = sharedEntryBoundaryForParent(
        parentCell,
        cellY * gameState.width + cellX,
    );
    if (entryBoundary) {
        // Arrival starts at the actual parent/child contact geometry. This is
        // intentionally independent of compass enum names and texture UV
        // orientation: a diagonal legal contact is a point, while a cardinal
        // contact is the shared side segment.
        return outsideDistance + pointToSegmentDistance(
            { x: clampedX, y: clampedY },
            entryBoundary,
        );
    }

    // Malformed/remote intents use a bounded target-vector fallback, never a
    // texture-row or world-axis scan.
    const fallbackPoint = {
        x: direction.dx < 0 ? 1 : 0.5,
        y: direction.dy < 0 ? 1 : 0.5,
    };
    const vx = clampedX - fallbackPoint.x;
    const vy = clampedY - fallbackPoint.y;
    const forward = Math.max(0, vx * direction.dx + vy * direction.dy);
    return outsideDistance + forward;
}

function focusParentContactDelayMS(
    parentCell: number,
    childCell: number,
    predecessors: ReadonlyMap<number, number | null>,
    frontSpeedCellsPerSecond: number,
): number {
    const speed = Math.max(0.1, frontSpeedCellsPerSecond);
    const parentParent = predecessors.get(parentCell);
    const parentEntry = sharedEntryBoundaryForParent(parentParent ?? null, parentCell);
    const childContact = sharedEntryBoundaryForParent(parentCell, childCell);
    if (!parentEntry || !childContact) return (Math.SQRT2 / speed) * 1000;

    const parentX = parentCell % gameState.width;
    const parentY = Math.floor(parentCell / gameState.width);
    const childX = childCell % gameState.width;
    const childY = Math.floor(childCell / gameState.width);
    let dx = childX - parentX;
    if (dx > gameState.width / 2) dx -= gameState.width;
    if (dx < -gameState.width / 2) dx += gameState.width;
    const dy = childY - parentY;

    // Convert the child's shared contact segment into parent-local space.
    // The maximum endpoint distance is the conservative time at which every
    // pixel on that contact is visible, so the next cell cannot detach.
    const maxDistance = Math.max(...[childContact.start, childContact.end].map(point =>
        pointToSegmentDistance({ x: dx + point.x, y: dy + point.y }, parentEntry)));
    // Even when the child's contact point lies on the parent's entry edge,
    // the rasterized/smoothed contour needs to finish its farthest cell
    // sample and its existing smoothing tail before the child can be shown.
    // This prevents a later blob from starting beside a still-thin parent
    // edge. It changes presentation timing only.
    const parentVisualSettleDistance = Math.SQRT2 + FIELD_SMOOTH_RADIUS_CELLS;
    return (
        Math.max(1, Math.min(Math.SQRT2, maxDistance), parentVisualSettleDistance)
        / speed
    ) * 1000;
}

function sharedEdgeDistance(
    cellX: number,
    cellY: number,
    localX: number,
    localY: number,
    changes: ReadonlyMap<number, OwnershipChange>,
    newOwner: number,
): number {
    let distance = Number.POSITIVE_INFINITY;
    const neighbours = [
        { dx: -1, dy: 0, edge: localX },
        { dx: 1, dy: 0, edge: 1 - localX },
        { dx: 0, dy: -1, edge: localY },
        { dx: 0, dy: 1, edge: 1 - localY },
    ];
    for (const neighbour of neighbours) {
        const x = cellX + neighbour.dx;
        const y = cellY + neighbour.dy;
        if (x < 0 || x >= gameState.width || y < 0 || y >= gameState.height) continue;
        const index = y * gameState.width + x;
        const neighbourOwner = changes.get(index)?.newOwner ?? gameState.cellOwners[index] ?? 0;
        if (neighbourOwner === newOwner) distance = Math.min(distance, neighbour.edge);
    }
    return Number.isFinite(distance) ? distance : 0;
}

function sampleArrivalTime(
    cellX: number,
    cellY: number,
    arrivalTimes: ReadonlyMap<number, number>,
): number | null {
    const direct = arrivalTimes.get(cellY * gameState.width + cellX);
    if (direct !== undefined) return direct;

    // SDF samples immediately outside an authorized cell use the closest
    // layer's age. This preserves one moving contour while keeping an
    // arriving layer at local progress zero.
    let closest: number | null = null;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const x = cellX + dx;
            const y = cellY + dy;
            if (x < 0 || x >= gameState.width || y < 0 || y >= gameState.height) continue;
            const time = arrivalTimes.get(y * gameState.width + x);
            if (time !== undefined && (closest === null || time < closest)) closest = time;
        }
    }
    return closest;
}

function directionalCoordinateForCell(
    cellX: number,
    cellY: number,
    newOwner: number,
    changes: ReadonlyMap<number, OwnershipChange>,
): { dx: number; dy: number } | null {
    const neighbours = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
    ];
    const fallback = [] as typeof neighbours;
    for (const neighbour of neighbours) {
        const nx = cellX + neighbour.dx;
        const ny = cellY + neighbour.dy;
        if (nx < 0 || nx >= gameState.width || ny < 0 || ny >= gameState.height) continue;
        const neighbourIndex = ny * gameState.width + nx;
        if ((gameState.cellOwners[neighbourIndex] ?? 0) !== newOwner) continue;
        if (!changes.has(neighbourIndex)) return neighbour;
        fallback.push(neighbour);
    }
    if (fallback.length > 0) return fallback[0];
    return null;
}

function isVisualLand(worldX: number, worldY: number): boolean {
    const mask = gameState.visualLandMask;
    if (!mask || worldX < 0 || worldY < 0 || worldX >= gameState.width || worldY >= gameState.height) {
        return true;
    }
    const maskWidth = 4096;
    const maskHeight = 2048;
    const x = Math.min(maskWidth - 1, Math.max(0, Math.floor(worldX * maskWidth / gameState.width)));
    const y = Math.min(maskHeight - 1, Math.max(0, Math.floor(worldY * maskHeight / gameState.height)));
    return mask[y * maskWidth + x] >= 128;
}

function signedDistance(mask: Uint8Array, width: number, height: number): Float32Array {
    const distances = new Float32Array(mask.length);
    distances.fill(FIELD_INFINITY);
    const diagonal = Math.SQRT2;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const value = mask[i];
            let boundary = false;
            if (x > 0 && mask[i - 1] !== value) boundary = true;
            if (x + 1 < width && mask[i + 1] !== value) boundary = true;
            if (y > 0 && mask[i - width] !== value) boundary = true;
            if (y + 1 < height && mask[i + width] !== value) boundary = true;
            if (boundary) distances[i] = 0;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            let d = distances[i];
            if (x > 0) d = Math.min(d, distances[i - 1] + 1);
            if (y > 0) d = Math.min(d, distances[i - width] + 1);
            if (x > 0 && y > 0) d = Math.min(d, distances[i - width - 1] + diagonal);
            if (x + 1 < width && y > 0) d = Math.min(d, distances[i - width + 1] + diagonal);
            distances[i] = d;
        }
    }
    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            const i = y * width + x;
            let d = distances[i];
            if (x + 1 < width) d = Math.min(d, distances[i + 1] + 1);
            if (y + 1 < height) d = Math.min(d, distances[i + width] + 1);
            if (x + 1 < width && y + 1 < height) d = Math.min(d, distances[i + width + 1] + diagonal);
            if (x > 0 && y + 1 < height) d = Math.min(d, distances[i + width - 1] + diagonal);
            distances[i] = d;
        }
    }

    const signed = new Float32Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
        const d = Math.min(FIELD_RANGE, distances[i] / FIELD_SCALE);
        signed[i] = mask[i] ? d : -d;
    }
    return signed;
}

/** Smooth the signed field, not the categorical owner texture. */
function smoothDistanceField(
    field: Float32Array,
    width: number,
    height: number,
    radiusCells = FIELD_SMOOTH_RADIUS_CELLS,
): Float32Array {
    const radius = Math.max(1, Math.ceil(radiusCells * FIELD_SCALE));
    const sigma = Math.max(1, radius * 0.55);
    const weights = new Float32Array(radius * 2 + 1);
    let weightSum = 0;
    for (let i = -radius; i <= radius; i++) {
        const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
        weights[i + radius] = weight;
        weightSum += weight;
    }
    for (let i = 0; i < weights.length; i++) weights[i] /= weightSum;

    const horizontal = new Float32Array(field.length);
    const output = new Float32Array(field.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let value = 0;
            for (let k = -radius; k <= radius; k++) {
                const sx = Math.min(width - 1, Math.max(0, x + k));
                value += field[y * width + sx] * weights[k + radius];
            }
            horizontal[y * width + x] = value;
        }
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let value = 0;
            for (let k = -radius; k <= radius; k++) {
                const sy = Math.min(height - 1, Math.max(0, y + k));
                value += horizontal[sy * width + x] * weights[k + radius];
            }
            output[y * width + x] = Math.max(-FIELD_RANGE, Math.min(FIELD_RANGE, value));
        }
    }
    return output;
}

/**
 * Gaussian smoothing is useful for the outer contour, but it can also
 * average a one-cell diagonal neck below zero. Keep the visual field's
 * already-authorized interior support positive so smoothing cannot make a
 * sovereign land component look cut in half. This does not add any samples:
 * it only restores support that was present in the same categorical mask.
 */
function preservePositiveSupport(
    smoothed: Float32Array,
    raw: Float32Array,
): Float32Array {
    const preserved = new Float32Array(smoothed);
    for (let i = 0; i < preserved.length; i++) {
        if (raw[i] > 0) preserved[i] = Math.max(preserved[i], raw[i]);
    }
    return preserved;
}

function encodeField(value: number): number {
    return Math.max(0, Math.min(255, Math.round(((value + FIELD_RANGE) / (2 * FIELD_RANGE)) * 255)));
}

function decodeFieldValue(encoded: number): number {
    return (encoded / 255) * (2 * FIELD_RANGE) - FIELD_RANGE;
}

function smoothStepFloat(edge0: number, edge1: number, value: number): number {
    const t = Math.max(0, Math.min(1, (value - edge0) / Math.max(0.0001, edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function coverageFromField(field: number): number {
    // Keep CPU telemetry aligned with the asymmetric shader edge band. The
    // animated contour now has only a small outside feather and therefore
    // cannot report a larger silhouette than the player sees.
    return smoothStepFloat(-0.06, 0.30, field);
}

function authorizedRevealDomain(field: number): number {
    // Keep the outside feather bounded to the small presentation contour
    // smoothing pass. This mirrors the GLSL authorized-domain gate and makes
    // CPU telemetry answer the same question as the rendered transition.
    return smoothStepFloat(-0.04, 0.24, field);
}

function directionalReveal(progress: number, distanceFromAnchor: number): number {
    if (progress >= 0.999) return 1;
    const t = Math.max(0, Math.min(1, (progress - distanceFromAnchor) / DIRECTIONAL_FEATHER));
    return t * t * (3 - 2 * t);
}

function countFinalRevealPixels(
    oldField: Float32Array<ArrayBufferLike>,
    newField: Float32Array<ArrayBufferLike>,
    authorizedField: Float32Array<ArrayBufferLike>,
    arrivalData?: Uint8Array,
): number {
    let total = 0;
    for (let i = 0; i < oldField.length; i++) {
        const authorized = arrivalData
            ? (arrivalData[i * 4 + 3] ?? 0) / 255
            : authorizedRevealDomain(authorizedField[i]);
        total += Math.max(0, coverageFromField(newField[i]) - coverageFromField(oldField[i]))
            * authorized;
    }
    return Math.round(total);
}

class TransitionOverlay {
    public progress = 0;
    public elapsedSeconds = 0;
    public mesh!: PIXI.Mesh<any, any>;
    public shader!: PIXI.Shader;
    public texture!: PIXI.Texture;
    public arrivalTexture!: PIXI.Texture;
    public readonly changes = new Map<number, OwnershipChange>();
    public readonly arrivalTimes = new Map<number, number>();
    public startTime = performance.now();
    public oldMaskRevision = -1;
    public newMaskRevision = -1;
    public transitionTextureRevision = 0;
    public oldField: Float32Array<ArrayBufferLike> = new Float32Array();
    public newField: Float32Array<ArrayBufferLike> = new Float32Array();
    public authorizedField: Float32Array<ArrayBufferLike> = new Float32Array();
    public directionalField: Float32Array<ArrayBufferLike> = new Float32Array();
    public directionalValid: Uint8Array<ArrayBufferLike> = new Uint8Array();
    public arrivalData: Uint8Array = new Uint8Array();
    public readonly directionalWipe: boolean;
    public fieldWidth = 0;
    public fieldHeight = 0;
    public regionWidth = 0;
    public regionHeight = 0;
    public fieldRegion?: { minX: number; minY: number; maxX: number; maxY: number };
    public finalRevealPixels = 0;
    public latestArrivalTime = this.startTime;
    public frontSpeedCellsPerSecond = 0;
    public presentationInitialized = false;
    public readonly focusIntent: FocusPresentationIntent | null;
    public readonly presentationMode: PresentationMode;
    public readonly direction: PresentationDirection | null;
    public readonly predecessorByCell = new Map<number, number | null>();

    constructor(
        public readonly transitionId: string,
        public readonly ownerPair: string,
        public readonly oldOwner: number,
        public readonly newOwner: number,
        oldMaskRevision: number,
        newMaskRevision: number,
        startTime: number,
        pendingIntent: FocusPresentationIntent | null,
    ) {
        this.oldMaskRevision = oldMaskRevision;
        this.newMaskRevision = newMaskRevision;
        this.startTime = startTime;
        this.focusIntent = newOwner === PLAYER_FACTION_ID && pendingIntent?.mode === 'FOCUS'
            ? pendingIntent
            : null;
        this.presentationMode = this.focusIntent
            ? 'FOCUS'
            : newOwner === PLAYER_FACTION_ID && pendingIntent?.mode === 'FRONTIER'
                ? 'FRONTIER'
                : 'GENERIC';
        this.direction = focusDirection(this.focusIntent);
        this.directionalWipe = this.presentationMode === 'FOCUS';
    }

    public arrivalOffsetForSample(sampleIndex: number): number {
        return ((this.arrivalData[sampleIndex * 4] ?? 0) / 255) * ARRIVAL_OFFSET_MAX_SECONDS;
    }

    public getLayerProgresses(now: number): Array<{ cell: number; arrivalTime: number; localProgress: number }> {
        return Array.from(this.arrivalTimes.entries()).map(([cell, arrivalTime]) => ({
            cell,
            arrivalTime,
            localProgress: Math.max(0, Math.min(1, (now - arrivalTime) / (ARRIVAL_BAND_SECONDS * 1000))),
        }));
    }

    public isComplete(now: number): boolean {
        if (this.arrivalTimes.size === 0) return true;
        return now >= this.latestArrivalTime + ARRIVAL_BAND_SECONDS * 1000;
    }

    public destroy(): void {
        this.mesh?.destroy();
        this.texture?.destroy(true);
        this.arrivalTexture?.destroy(true);
    }
}
