export const WORLD_WIDTH = 1024;
export const WORLD_HEIGHT = 512;
export const TOTAL_CELLS = WORLD_WIDTH * WORLD_HEIGHT;

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Converts a 1D cell index into 2D cell coordinates.
 */
export function cellIndexToXY(index: number): Point2D {
  return {
    x: index % WORLD_WIDTH,
    y: Math.floor(index / WORLD_WIDTH),
  };
}

/**
 * Converts 2D cell coordinates into a 1D cell index.
 */
export function cellXYToIndex(x: number, y: number): number {
  return y * WORLD_WIDTH + x;
}

/**
 * Converts a cell index or (x,y) cell coordinates into world units.
 * In this architecture, 1 Cell = 1 World Unit. 
 * This returns the center of the cell in world space.
 */
export function cellToWorld(indexOrX: number, y?: number): Point2D {
  let cx = 0;
  let cy = 0;
  
  if (y !== undefined) {
    cx = indexOrX;
    cy = y;
  } else {
    const pt = cellIndexToXY(indexOrX);
    cx = pt.x;
    cy = pt.y;
  }

  return {
    x: cx + 0.5,
    y: cy + 0.5,
  };
}

/**
 * Converts world units back into a specific cell X/Y coordinate.
 */
export function worldToCell(worldX: number, worldY: number): Point2D {
  return {
    x: Math.floor(worldX),
    y: Math.floor(worldY),
  };
}

/**
 * Converts world units directly into a 1D cell index.
 */
export function worldToCellIndex(worldX: number, worldY: number): number {
  const cx = Math.floor(worldX);
  const cy = Math.floor(worldY);
  
  if (cx < 0 || cx >= WORLD_WIDTH || cy < 0 || cy >= WORLD_HEIGHT) {
    return -1; // Out of bounds
  }
  
  return cy * WORLD_WIDTH + cx;
}
