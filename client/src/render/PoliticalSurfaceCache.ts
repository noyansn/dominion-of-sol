import { gameState } from '../game/GameState';
import { WORLD_HEIGHT, WORLD_WIDTH } from './WorldSpace';
import {
    VISUAL_MASK_HEIGHT,
    VISUAL_MASK_WIDTH,
} from './VisualLandMask';
import {
    PoliticalFieldCore,
    VisualRect,
} from './PoliticalFieldCore';
import { POLITICAL_SCALE } from './PoliticalSpace';

export class PoliticalSurfaceCache {
    public field!: PoliticalFieldCore;

    public surfaceRevision = 0;
    public fullBuildCount = 0;
    public dirtyBuildCount = 0;
    public lastDirtyRect: VisualRect | null = null;
    public lastDirtyRects: VisualRect[] = [];
    public totalDirtyPixels = 0;
    // This is the committed presentation ownership source. It intentionally
    // lags authoritative GameState for cells that are still inside an active
    // political reveal. Keeping it explicit prevents an expanded dirty rect
    // from accidentally painting a newly-authorized cell into the base fill.
    private presentationCellOwners = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);

    public get presentationRevision(): number { return this.surfaceRevision; }

    public isPresentationOwnerCommitted(cell: number): boolean {
        return this.presentationCellOwners[cell] === (gameState.cellOwners[cell] ?? 0);
    }

    public get ownerBuffer(): Uint8Array {
        return this.field.owners;
    }

    public get rawOwnerBuffer(): Uint8Array {
        return this.field.rawOwners;
    }

    public get borderBuffer(): Uint8Array {
        return this.field.borders;
    }

    public init(): void {
        if (!gameState.visualLandMask) {
            throw new Error(
                'Visual land mask must be loaded first'
            );
        }

        this.field = new PoliticalFieldCore({
            simulationWidth: WORLD_WIDTH,
            simulationHeight: WORLD_HEIGHT,
            scale: POLITICAL_SCALE,
            landMask: gameState.visualLandMask,
            landMaskWidth: VISUAL_MASK_WIDTH,
            landMaskHeight: VISUAL_MASK_HEIGHT,
        });
    }

    public fullSync(): void {
        // The visual mask can be initialized before the network snapshot.
        // Refresh the cached coarse-cell -> visual-land mapping whenever the
        // authoritative terrain array becomes available, so coastal fragments
        // are never graded from the pre-snapshot all-zero buffer.
        this.field.setSimulationTerrains(gameState.cellTerrains);
        this.presentationCellOwners.set(gameState.cellOwners);
        this.field.fullBuild(this.presentationCellOwners, this.capitalCells());

        this.fullBuildCount++;
        this.surfaceRevision++;
    }

    public getCoastDiagnostics() {
        const metrics = this.field.metrics;
        const regions: Record<string, {
            canonicalLandPixels: number;
            mappedOwnedPixels: number;
            unmappedOwnedLandPixels: number;
            wrongOwnerPixels: number;
            seaBleedPixels: number;
        }> = {};
        const boxes: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {
            Aegean: { minX: 568, minY: 126, maxX: 600, maxY: 160 },
            Anatolia: { minX: 582, minY: 126, maxX: 644, maxY: 164 },
            'Black Sea': { minX: 584, minY: 118, maxX: 636, maxY: 145 },
            Bosphorus: { minX: 590, minY: 128, maxX: 602, maxY: 146 },
            Dardanelles: { minX: 580, minY: 136, maxX: 595, maxY: 153 },
            Japan: { minX: 862, minY: 126, maxX: 932, maxY: 178 },
            Norway: { minX: 520, minY: 48, maxX: 610, maxY: 100 },
            Indonesia: { minX: 770, minY: 232, maxX: 932, maxY: 294 },
            Philippines: { minX: 832, minY: 190, maxX: 884, maxY: 246 },
            Caribbean: { minX: 266, minY: 174, maxX: 348, maxY: 232 },
            'British Isles': { minX: 478, minY: 82, maxX: 520, maxY: 120 },
            Archipelagos: { minX: 760, minY: 180, maxX: 940, maxY: 310 },
        };
        for (const [name, box] of Object.entries(boxes)) regions[name] = this.auditBox(box);
        return {
            canonicalLandPixels: metrics.canonicalLandPixels ?? 0,
            mappedOwnedPixels: metrics.mappedOwnedVisualLandPixels ?? 0,
            unmappedOwnedLandPixels: metrics.unmappedOwnedLandPixels ?? 0,
            wrongOwnerPixels: metrics.wrongOwnerPixels ?? 0,
            seaBleedPixels: metrics.seaBleedPixels ?? metrics.ownedVisualWaterPixels,
            presentationRelabeledPixels: this.countPresentationRelabels(),
            unmappedCanonicalLandPixels: metrics.unmappedCanonicalLandPixels ?? 0,
            regions,
        };
    }

    private auditBox(box: { minX: number; minY: number; maxX: number; maxY: number }) {
        const minX = Math.max(0, Math.floor(box.minX * POLITICAL_SCALE));
        const minY = Math.max(0, Math.floor(box.minY * POLITICAL_SCALE));
        const maxX = Math.min(this.field.width, Math.ceil(box.maxX * POLITICAL_SCALE));
        const maxY = Math.min(this.field.height, Math.ceil(box.maxY * POLITICAL_SCALE));
        let canonicalLandPixels = 0;
        let mappedOwnedPixels = 0;
        let unmappedOwnedLandPixels = 0;
        let wrongOwnerPixels = 0;
        let seaBleedPixels = 0;
        let unmappedCanonicalLandPixels = 0;
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const i = y * this.field.width + x;
                if (!this.field.land[i]) {
                    if (this.field.rawOwners[i] > 0) seaBleedPixels++;
                    continue;
                }
                canonicalLandPixels++;
                const cell = this.field.gameplayCellForVisualPixel(x, y);
                if (cell < 0) unmappedCanonicalLandPixels++;
                const expected = cell >= 0 ? (gameState.cellOwners[cell] ?? 0) : 0;
                if (expected > 0 && this.field.rawOwners[i] > 0) mappedOwnedPixels++;
                if (expected > 0 && this.field.rawOwners[i] === 0) unmappedOwnedLandPixels++;
                if (this.field.rawOwners[i] !== expected && (expected > 0 || this.field.rawOwners[i] > 0)) wrongOwnerPixels++;
            }
        }
        return { canonicalLandPixels, mappedOwnedPixels, unmappedOwnedLandPixels, unmappedCanonicalLandPixels, wrongOwnerPixels, seaBleedPixels };
    }

    private countPresentationRelabels(): number {
        let count = 0;
        for (let i = 0; i < this.field.owners.length; i++) {
            if (this.field.owners[i] !== this.field.rawOwners[i]) count++;
        }
        return count;
    }

    public syncDirtyCells(
        indices: readonly number[],
        blockedCells: ReadonlySet<number> = new Set(),
    ): void {
        const committed = indices.filter(index => !blockedCells.has(index));
        if (committed.length === 0) return;
        for (const index of committed) {
            if (index >= 0 && index < this.presentationCellOwners.length) {
                this.presentationCellOwners[index] = gameState.cellOwners[index] ?? 0;
            }
        }
        this.lastDirtyRects =
            this.field.updateDirtyRegions(
                this.presentationCellOwners,
                committed,
                this.capitalCells(),
            );
        this.lastDirtyRect = this.lastDirtyRects[0] ?? null;

        if (!this.lastDirtyRect) return;

        this.dirtyBuildCount++;
        this.totalDirtyPixels +=
            this.field.metrics.pixelsProcessed;

        this.surfaceRevision++;
    }

    private capitalCells(): number[] {
        return Array.from(
            gameState.factions.values(),
        )
        .map((f) => f.capitalCell)
        .filter(
            (cell): cell is number =>
                cell !== undefined && cell >= 0,
        );
    }
}
