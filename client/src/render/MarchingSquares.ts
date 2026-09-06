import { Point2D } from './WorldSpace';

/**
 * A basic implementation of Marching Squares to extract boundary polygons 
 * from a 2D grid for a specific target value.
 */
export class MarchingSquares {
  private width: number;
  private height: number;
  private grid: Uint8Array;
  private terrains: Uint8Array;

  constructor(width: number, height: number, grid: Uint8Array, terrains: Uint8Array) {
    this.width = width;
    this.height = height;
    this.grid = grid;
    this.terrains = terrains;
  }

  private getVal(x: number, y: number, targetId: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const idx = y * this.width + x;
    if (this.terrains[idx] === 2) return false;
    return this.grid[idx] === targetId;
  }

  /**
   * Extracts simplified contour polygons for a specific faction ID within a bounding box.
   */
  public extract(targetId: number, minX: number, minY: number, maxX: number, maxY: number): Point2D[][] {
    // 1. Find all boundary edges
    const edges: { x0: number, y0: number, x1: number, y1: number }[] = [];
    
    // We iterate slightly outside the bounds to close borders
    for (let y = minY - 1; y <= maxY + 1; y++) {
      for (let x = minX - 1; x <= maxX + 1; x++) {
        const tl = this.getVal(x, y, targetId);
        const tr = this.getVal(x + 1, y, targetId);
        const bl = this.getVal(x, y + 1, targetId);
        const br = this.getVal(x + 1, y + 1, targetId);

        let state = 0;
        if (tl) state |= 8;
        if (tr) state |= 4;
        if (br) state |= 2;
        if (bl) state |= 1;

        const cx = x + 1;
        const cy = y + 1;
        const hx = x + 0.5;
        const hy = y + 0.5;

        // Add line segments based on marching squares state
        // 0.5 offsets ensure they run between cell centers
        switch (state) {
          case 1: edges.push({ x0: hx, y0: cy, x1: cx, y1: hy }); break;
          case 2: edges.push({ x0: cx, y0: hy, x1: hx + 1, y1: cy }); break;
          case 3: edges.push({ x0: hx, y0: cy, x1: hx + 1, y1: cy }); break;
          case 4: edges.push({ x0: hx + 1, y0: cy - 1, x1: cx, y1: hy }); break;
          case 5: 
            edges.push({ x0: hx, y0: cy, x1: cx, y1: hy - 1 });
            edges.push({ x0: hx + 1, y0: cy - 1, x1: cx, y1: hy }); 
            break;
          case 6: edges.push({ x0: hx + 1, y0: cy - 1, x1: hx + 1, y1: cy }); break;
          case 7: edges.push({ x0: hx, y0: cy, x1: hx + 1, y1: cy - 1 }); break;
          case 8: edges.push({ x0: cx, y0: hy - 1, x1: hx, y1: cy }); break;
          case 9: edges.push({ x0: cx, y0: hy - 1, x1: cx, y1: hy }); break;
          case 10: 
            edges.push({ x0: cx, y0: hy - 1, x1: hx + 1, y1: cy });
            edges.push({ x0: cx, y0: hy, x1: hx, y1: cy }); 
            break;
          case 11: edges.push({ x0: cx, y0: hy - 1, x1: hx + 1, y1: cy }); break;
          case 12: edges.push({ x0: hx + 1, y0: cy - 1, x1: hx, y1: cy }); break;
          case 13: edges.push({ x0: hx + 1, y0: cy - 1, x1: cx, y1: hy }); break;
          case 14: edges.push({ x0: cx, y0: hy - 1, x1: hx + 1, y1: cy }); break;
        }
      }
    }

    // 2. Stitch edges into polygons (omitted for brevity, we will implement naive stitching)
    return this.stitchEdges(edges);
  }

  private stitchEdges(edges: { x0: number, y0: number, x1: number, y1: number }[]): Point2D[][] {
    const polygons: Point2D[][] = [];
    if (edges.length === 0) return polygons;

    let currentPoly: Point2D[] = [];
    const used = new Set<number>();

    const getMatchingEdge = (ex: number, ey: number) => {
      for (let i = 0; i < edges.length; i++) {
        if (used.has(i)) continue;
        const e = edges[i];
        if (Math.abs(e.x0 - ex) < 0.01 && Math.abs(e.y0 - ey) < 0.01) return { idx: i, reverse: false };
        if (Math.abs(e.x1 - ex) < 0.01 && Math.abs(e.y1 - ey) < 0.01) return { idx: i, reverse: true };
      }
      return null;
    };

    while (used.size < edges.length) {
      // Find first unused
      let startIdx = 0;
      for (let i = 0; i < edges.length; i++) {
        if (!used.has(i)) {
          startIdx = i;
          break;
        }
      }

      used.add(startIdx);
      const startEdge = edges[startIdx];
      currentPoly = [{ x: startEdge.x0, y: startEdge.y0 }, { x: startEdge.x1, y: startEdge.y1 }];
      
      let searching = true;
      while (searching) {
        const lastPt = currentPoly[currentPoly.length - 1];
        const match = getMatchingEdge(lastPt.x, lastPt.y);
        
        if (match) {
          used.add(match.idx);
          const e = edges[match.idx];
          if (match.reverse) {
            currentPoly.push({ x: e.x0, y: e.y0 });
          } else {
            currentPoly.push({ x: e.x1, y: e.y1 });
          }
        } else {
          searching = false; // Closed or broken
        }
      }

      polygons.push(this.simplifyPolygon(currentPoly));
    }

    return polygons;
  }

  private simplifyPolygon(poly: Point2D[]): Point2D[] {
    // Simple Douglas-Peucker or just deduplication
    // For now, naive deduplication of collinear points
    if (poly.length < 3) return poly;
    const simplified: Point2D[] = [poly[0]];
    
    for (let i = 1; i < poly.length - 1; i++) {
      const p0 = simplified[simplified.length - 1];
      const p1 = poly[i];
      const p2 = poly[i + 1];
      
      // Check collinearity
      const cross = (p1.y - p0.y) * (p2.x - p1.x) - (p1.x - p0.x) * (p2.y - p1.y);
      if (Math.abs(cross) > 0.01) {
        simplified.push(p1);
      }
    }
    simplified.push(poly[poly.length - 1]);
    return simplified;
  }
}
