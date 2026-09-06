import * as PIXI from 'pixi.js';
import { PoliticalTextureSource } from './PoliticalTextureUpload';
import {
    POLITICAL_HEIGHT,
    POLITICAL_WIDTH,
} from './PoliticalSpace';
import type { VisualRect } from './PoliticalFieldCore';

const PIXEL_COUNT = POLITICAL_WIDTH * POLITICAL_HEIGHT;
const GPU_WIDTH = POLITICAL_WIDTH;
const GPU_HEIGHT = POLITICAL_HEIGHT;

/**
 * RGBA8 transport for categorical owner IDs.
 * R = ownerId, G/B = 0, A = 255. RGBA8 is used deliberately because this
 * project previously observed unreliable R8 upload behavior through Pixi v8.
 */
export class PoliticalOwnerIdTexture {
    public sourceRevision = 0;
    public sourceUploadCount = 0;
    public readonly ownerIdBuffer = new Uint8Array(PIXEL_COUNT * 4);
    public readonly gpuOwnerIdBuffer = this.ownerIdBuffer;
    private pendingUpload = false;
    private lastUploadAt = 0;

    public readonly source = new PoliticalTextureSource({
        resource: this.gpuOwnerIdBuffer,
        width: GPU_WIDTH,
        height: GPU_HEIGHT,
        format: 'rgba8unorm',
        alphaMode: 'no-premultiply-alpha',
        autoGenerateMipmaps: false,
    });

    public readonly texture = new PIXI.Texture({
        source: this.source,
    });

    constructor() {
        this.source.style.scaleMode = 'nearest';
    }

    private writePixel(i: number, owner: number): void {
        const p = i * 4;
        this.ownerIdBuffer[p] = owner;
        this.ownerIdBuffer[p + 1] = 0;
        this.ownerIdBuffer[p + 2] = 0;
        this.ownerIdBuffer[p + 3] = 255;
    }

    public update(owners: Uint8Array, revision: number): void {
        if (owners.length !== PIXEL_COUNT) {
            throw new Error(
                `Owner buffer size mismatch: ${owners.length} != ${PIXEL_COUNT}`,
            );
        }

        for (let i = 0; i < owners.length; i++) {
            this.writePixel(i, owners[i]);
        }

        this.sourceRevision = revision;
        this.source.markFull();
        this.source.update();
        this.sourceUploadCount++;
        this.pendingUpload = false;
        this.lastUploadAt = performance.now();
    }

    /**
     * Update staging only in the dirty rectangle. The registered Pixi uploader
     * transfers the corresponding GPU blocks, retaining full coast precision.
     */
    public updateRect(
        owners: Uint8Array,
        revision: number,
        rect: VisualRect | null,
    ): void {
        if (owners.length !== PIXEL_COUNT) {
            throw new Error(
                `Owner buffer size mismatch: ${owners.length} != ${PIXEL_COUNT}`,
            );
        }

        if (!rect) {
            this.sourceRevision = revision;
            return;
        }

        const minX = Math.max(0, Math.floor(rect.minX));
        const minY = Math.max(0, Math.floor(rect.minY));
        const maxX = Math.min(POLITICAL_WIDTH, Math.ceil(rect.maxX));
        const maxY = Math.min(POLITICAL_HEIGHT, Math.ceil(rect.maxY));

        for (let y = minY; y < maxY; y++) {
            let i = y * POLITICAL_WIDTH + minX;
            const end = y * POLITICAL_WIDTH + maxX;
            for (; i < end; i++) {
                this.writePixel(i, owners[i]);
            }
        }
        this.source.markVisualRect(rect, 1);

        this.sourceRevision = revision;
        // The custom uploader transfers only coalesced dirty GPU blocks.
        this.pendingUpload = true;
    }

    public flushPending(now = performance.now(), minIntervalMs = 0): void {
        if (!this.pendingUpload || now - this.lastUploadAt < minIntervalMs) return;
        this.source.update();
        this.sourceUploadCount++;
        this.pendingUpload = false;
        this.lastUploadAt = now;
    }

}
