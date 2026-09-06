import { WORLD_WIDTH, WORLD_HEIGHT, Point2D } from './WorldSpace';

export const POLITICAL_SCALE = 4;
export const POLITICAL_WIDTH = WORLD_WIDTH * POLITICAL_SCALE;
export const POLITICAL_HEIGHT = WORLD_HEIGHT * POLITICAL_SCALE;
export const TOTAL_POLITICAL_CELLS = POLITICAL_WIDTH * POLITICAL_HEIGHT;

/**
 * Converts a world-space coordinate to political-space integer indices.
 */
export function worldToPolitical(worldX: number, worldY: number): Point2D {
  return {
    x: Math.floor(worldX * POLITICAL_SCALE),
    y: Math.floor(worldY * POLITICAL_SCALE),
  };
}

/**
 * Converts a political-space integer index (x,y) to world-space coordinates.
 */
export function politicalToWorld(polX: number, polY: number): Point2D {
  return {
    x: (polX + 0.5) / POLITICAL_SCALE,
    y: (polY + 0.5) / POLITICAL_SCALE,
  };
}

/**
 * Gets the 1D index for the political field array.
 */
export function politicalIndex(polX: number, polY: number): number {
  return polY * POLITICAL_WIDTH + polX;
}
