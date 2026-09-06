/** Shared, ownership-independent coast lookup. Only canonical LAND may be
 * traversed; disconnected islands are never assigned to a nearby mainland.
 * Exceptional coastal pixels are cached, not searched each render frame. */
export class VisualGameplayMapping {
  private readonly coast = new Map<number, number>();
  private readonly radius: number;
  private readonly side: number;
  private readonly visited: Uint32Array;
  private readonly queue: Int32Array;
  private generation = 0;

  constructor(
    readonly mask: Uint8Array,
    readonly maskWidth: number,
    readonly maskHeight: number,
    readonly worldWidth: number,
    readonly worldHeight: number,
    readonly terrains: Uint8Array,
  ) {
    // Narrow coastal inlets can require a short bend before reaching the
    // authoritative cell that owns the same connected visual land fragment.
    // Eight coarse cells remains geographically local and never crosses water.
    this.radius = Math.ceil(8 * Math.max(maskWidth / worldWidth, maskHeight / worldHeight));
    this.side = this.radius * 2 + 1;
    this.visited = new Uint32Array(this.side * this.side);
    this.queue = new Int32Array(this.side * this.side);
  }

  private coarse(pixel: number): number {
    return Math.floor(Math.floor(pixel / this.maskWidth) * this.worldHeight / this.maskHeight) * this.worldWidth
      + Math.floor((pixel % this.maskWidth) * this.worldWidth / this.maskWidth);
  }

  cellsShareVisualLand(a: number, b: number): boolean {
    const ax = a % this.worldWidth, ay = Math.floor(a / this.worldWidth);
    const bx = b % this.worldWidth, by = Math.floor(b / this.worldWidth);
    if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return false;
    if (ay === by) {
      const x = Math.floor(Math.max(ax, bx) * this.maskWidth / this.worldWidth);
      const start = Math.floor(ay * this.maskHeight / this.worldHeight);
      const end = Math.floor((ay + 1) * this.maskHeight / this.worldHeight);
      for (let y = start; y < end; y++) if (this.mask[y * this.maskWidth + x - 1] >= 128 && this.mask[y * this.maskWidth + x] >= 128) return true;
    } else {
      const y = Math.floor(Math.max(ay, by) * this.maskHeight / this.worldHeight);
      const start = Math.floor(ax * this.maskWidth / this.worldWidth);
      const end = Math.floor((ax + 1) * this.maskWidth / this.worldWidth);
      for (let x = start; x < end; x++) if (this.mask[(y - 1) * this.maskWidth + x] >= 128 && this.mask[y * this.maskWidth + x] >= 128) return true;
    }
    return false;
  }

  cellAtWorld(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.worldWidth || y >= this.worldHeight) return -1;
    return this.cellAtPixel(Math.floor(x * this.maskWidth / this.worldWidth), Math.floor(y * this.maskHeight / this.worldHeight));
  }

  cellAtPixel(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.maskWidth || y >= this.maskHeight) return -1;
    const pixel = y * this.maskWidth + x;
    if (this.mask[pixel] < 128) return -1;
    const direct = this.coarse(pixel);
    if (this.terrains[direct] === 0) return direct;
    const cached = this.coast.get(pixel);
    if (cached !== undefined) return cached;

    // Breadth-first geodesic distance on the visual land mask, with stable
    // authoritative-cell tie breaking. A strait is not a traversable edge.
    this.generation = (this.generation + 1) >>> 0;
    if (this.generation === 0) { this.visited.fill(0); this.generation = 1; }
    const stamp = this.generation;
    let head = 0, tail = 1;
    this.queue[0] = pixel;
    this.visited[this.radius * this.side + this.radius] = stamp;
    let answer = -1;
    // Geographic bounds stay four cells wide even when the land path must
    // bend around an inlet. Path length is not straight-line distance.
    while (head < tail) {
      const end = tail;
      while (head < end) {
        const current = this.queue[head++];
        const cell = this.coarse(current);
        if (this.terrains[cell] === 0) {
          if (answer < 0 || cell < answer) answer = cell;
          continue;
        }
        const cx = current % this.maskWidth, cy = Math.floor(current / this.maskWidth);
        for (let direction = 0; direction < 4; direction++) {
          const nx = cx + (direction === 0 ? -1 : direction === 1 ? 1 : 0);
          const ny = cy + (direction === 2 ? -1 : direction === 3 ? 1 : 0);
          if (nx < 0 || ny < 0 || nx >= this.maskWidth || ny >= this.maskHeight) continue;
          const lx = nx - x + this.radius, ly = ny - y + this.radius;
          if (lx < 0 || ly < 0 || lx >= this.side || ly >= this.side) continue;
          const local = ly * this.side + lx, next = ny * this.maskWidth + nx;
          if (this.visited[local] === stamp || this.mask[next] < 128) continue;
          this.visited[local] = stamp;
          this.queue[tail++] = next;
        }
      }
      if (answer >= 0) break;
    }
    this.coast.set(pixel, answer);
    return answer;
  }
}

const shared = new WeakMap<Uint8Array, WeakMap<Uint8Array, VisualGameplayMapping>>();
export function getVisualGameplayMapping(mask: Uint8Array, maskWidth: number, maskHeight: number,
  worldWidth: number, worldHeight: number, terrains: Uint8Array): VisualGameplayMapping {
  let byTerrain = shared.get(mask);
  if (!byTerrain) { byTerrain = new WeakMap(); shared.set(mask, byTerrain); }
  let mapping = byTerrain.get(terrains);
  if (!mapping || mapping.worldWidth !== worldWidth || mapping.worldHeight !== worldHeight
      || mapping.maskWidth !== maskWidth || mapping.maskHeight !== maskHeight) {
    mapping = new VisualGameplayMapping(mask, maskWidth, maskHeight, worldWidth, worldHeight, terrains);
    byTerrain.set(terrains, mapping);
  }
  return mapping;
}
