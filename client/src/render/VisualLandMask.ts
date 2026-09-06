import { WORLD_WIDTH, WORLD_HEIGHT } from './WorldSpace';

export const VISUAL_MASK_WIDTH = 4096;
export const VISUAL_MASK_HEIGHT = 2048;

export const VISUAL_MASK_SCALE_X = VISUAL_MASK_WIDTH / WORLD_WIDTH;   // 4
export const VISUAL_MASK_SCALE_Y = VISUAL_MASK_HEIGHT / WORLD_HEIGHT; // 4

export function sampleVisualLandAlpha(
    mask: Uint8Array,
    worldX: number,
    worldY: number,
): number {
    if (
        worldX < 0 || worldX >= WORLD_WIDTH ||
        worldY < 0 || worldY >= WORLD_HEIGHT
    ) {
        return 0;
    }

    const vx = Math.min(
        VISUAL_MASK_WIDTH - 1,
        Math.max(0, Math.floor(worldX * VISUAL_MASK_SCALE_X))
    );

    const vy = Math.min(
        VISUAL_MASK_HEIGHT - 1,
        Math.max(0, Math.floor(worldY * VISUAL_MASK_SCALE_Y))
    );

    return mask[vy * VISUAL_MASK_WIDTH + vx];
}

export function isVisualLand(
    mask: Uint8Array,
    worldX: number,
    worldY: number,
    threshold = 128,
): boolean {
    return sampleVisualLandAlpha(mask, worldX, worldY) >= threshold;
}
