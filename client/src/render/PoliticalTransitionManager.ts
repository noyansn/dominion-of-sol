import * as PIXI from 'pixi.js';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';
import { gameState } from '../game/GameState';

const CELL_SIZE = 4; // visual pixels per sim cell
export const MAX_ACTIVE_TRANSITIONS = 8;
const PLAYER_FACTION_ID = 101;

export interface TransitionMetrics {
    activeTransitionCount: number;
    queuedTransitionCount: number;
    maxObservedTransitionCount: number;
    totalTransitionsSpawned: number;
    totalTransitionsFlushedEarly: number;
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
        vUv = aUV;
    }
`;

const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform sampler2D uPoliticalPaletteTexture;
    uniform float uProgress;

    vec4 ownerColor(float ownerId) {
        float u = (ownerId + 0.5) / 256.0;
        return texture2D(uPoliticalPaletteTexture, vec2(u, 0.5));
    }

    void main() {
        vec4 texel = texture2D(uTex, vUv);
        if (texel.a < 0.5) discard;

        float oldOwner = floor(texel.r * 255.0 + 0.5);
        float newOwner = floor(texel.g * 255.0 + 0.5);
        float arrival = texel.b;

        float spread = 0.35;
        float wavePos = uProgress * (1.0 + spread);

        if (wavePos <= arrival) {
            if (oldOwner == 0.0) {
                discard;
            }
            gl_FragColor = ownerColor(oldOwner);
            return;
        }

        float factor = clamp((wavePos - arrival) / spread, 0.0, 1.0);
        float smoothAlpha = factor * factor * (3.0 - 2.0 * factor);

        vec4 colOld = (oldOwner > 0.0) ? ownerColor(oldOwner) : vec4(0.0);
        vec4 colNew = ownerColor(newOwner);

        vec4 col = mix(colOld, colNew, smoothAlpha);

        // Subtle active frontier luminous pulse along the wave crest
        float frontPulse = sin(smoothAlpha * 3.14159265);
        col.rgb += vec3(0.18, 0.22, 0.30) * frontPulse;

        gl_FragColor = col;
    }
`;

let cachedGlProgram: PIXI.GlProgram | null = null;
function getTransitionGlProgram(): PIXI.GlProgram {
    if (!cachedGlProgram) {
        cachedGlProgram = PIXI.GlProgram.from({
            vertex: vertexShader,
            fragment: fragmentShader,
        });
    }
    return cachedGlProgram;
}

export class PoliticalTransitionManager {
    public container = new PIXI.Container();
    private activeTransitions: TransitionOverlay[] = [];
    private cellToTransition = new Map<number, TransitionOverlay>();
    private palette!: PoliticalPaletteTexture;
    public onTransitionComplete?: (cells: number[]) => void;

    public metrics: TransitionMetrics = {
        activeTransitionCount: 0,
        queuedTransitionCount: 0,
        maxObservedTransitionCount: 0,
        totalTransitionsSpawned: 0,
        totalTransitionsFlushedEarly: 0,
    };

    public init(palette: PoliticalPaletteTexture) {
        this.palette = palette;
        (window as any).__DEV_TRANSITION_METRICS__ = this.metrics;
    }

    public update(dtSeconds: number) {
        const DURATION_SECONDS = 0.24; // 240ms fluid territorial spread
        for (let i = this.activeTransitions.length - 1; i >= 0; i--) {
            const t = this.activeTransitions[i];
            t.progress += dtSeconds / DURATION_SECONDS;
            
            if (t.progress >= 1.0) {
                this.completeTransition(i);
            } else {
                t.shader.resources.uniforms.uniforms.uProgress = t.progress;
            }
        }
        this.updateMetrics();
    }

    private completeTransition(i: number) {
        if (i < 0 || i >= this.activeTransitions.length) return;
        const t = this.activeTransitions[i];
        this.activeTransitions.splice(i, 1);
        for (const idx of t.comp) {
            if (this.cellToTransition.get(idx) === t) {
                this.cellToTransition.delete(idx);
            }
        }
        this.onTransitionComplete?.(t.comp);
        t.destroy();
        this.container.removeChild(t.mesh);
    }

    public clear() {
        for (const t of this.activeTransitions) {
            this.onTransitionComplete?.(t.comp);
            t.destroy();
            this.container.removeChild(t.mesh);
        }
        this.activeTransitions = [];
        this.cellToTransition.clear();
        this.updateMetrics();
    }

    private updateMetrics() {
        this.metrics.activeTransitionCount = this.activeTransitions.length;
        this.metrics.queuedTransitionCount = 0;
        if (this.metrics.activeTransitionCount > this.metrics.maxObservedTransitionCount) {
            this.metrics.maxObservedTransitionCount = this.metrics.activeTransitionCount;
        }
    }

    public handleDeltas(changes: {index: number, oldOwner: number, newOwner: number}[], sequence: number): Set<number> {
        const handled = new Set<number>();
        if (changes.length === 0) return handled;

        // Group by (oldOwner, newOwner)
        const groups = new Map<string, {index: number, oldOwner: number, newOwner: number}[]>();
        for (const c of changes) {
            const key = `${c.oldOwner}_${c.newOwner}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(c);
        }

        for (const [, group] of groups.entries()) {
            const isPlayerInvolved = group[0].oldOwner === PLAYER_FACTION_ID || group[0].newOwner === PLAYER_FACTION_ID;
            // If already at max active transitions and not player-involved, bypass overlay to prevent backlog
            if (this.activeTransitions.length >= MAX_ACTIVE_TRANSITIONS && !isPlayerInvolved) {
                continue;
            }

            const groupHandled = this.processGroup(group, sequence);
            for (const idx of groupHandled) {
                handled.add(idx);
            }
        }
        return handled;
    }

    private processGroup(group: {index: number, oldOwner: number, newOwner: number}[], sequence: number): Set<number> {
        const handled = new Set<number>();
        const components: number[][] = [];
        const visited = new Set<number>();
        const groupSet = new Set<number>(group.map(c => c.index));

        const getNeighbors = (idx: number) => {
            const n = [];
            const x = idx % gameState.width;
            const y = Math.floor(idx / gameState.width);
            if (x > 0) n.push(idx - 1);
            if (x < gameState.width - 1) n.push(idx + 1);
            if (y > 0) n.push(idx - gameState.width);
            if (y < gameState.height - 1) n.push(idx + gameState.width);
            return n;
        };

        for (const idx of groupSet) {
            if (visited.has(idx)) continue;
            
            const comp: number[] = [];
            const q = [idx];
            visited.add(idx);
            
            while (q.length > 0) {
                const curr = q.shift()!;
                comp.push(curr);
                for (const n of getNeighbors(curr)) {
                    if (groupSet.has(n) && !visited.has(n)) {
                        visited.add(n);
                        q.push(n);
                    }
                }
            }
            components.push(comp);
        }

        const oldOwner = group[0].oldOwner;
        const newOwner = group[0].newOwner;

        for (const comp of components) {
            const spawned = this.spawnTransition(comp, oldOwner, newOwner, sequence);
            if (spawned) {
                for (const idx of comp) handled.add(idx);
            }
        }
        return handled;
    }

    private spawnTransition(comp: number[], oldOwner: number, newOwner: number, sequence: number): boolean {
        // Enforce upper bound: flush oldest transition if at budget cap
        if (this.activeTransitions.length >= MAX_ACTIVE_TRANSITIONS) {
            this.metrics.totalTransitionsFlushedEarly++;
            this.completeTransition(0);
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const idx of comp) {
            const x = idx % gameState.width;
            const y = Math.floor(idx / gameState.width);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        // 1 cell halo
        minX = Math.max(0, minX - 1);
        minY = Math.max(0, minY - 1);
        maxX = Math.min(gameState.width - 1, maxX + 1);
        maxY = Math.min(gameState.height - 1, maxY + 1);

        const simW = maxX - minX + 1;
        const simH = maxY - minY + 1;
        
        const texW = simW * CELL_SIZE;
        const texH = simH * CELL_SIZE;

        const data = new Uint8Array(texW * texH * 4);

        // BFS to find arrival distance
        const dists = new Map<number, number>();
        const q: number[] = [];
        
        for (const idx of comp) {
            const cx = idx % gameState.width;
            const cy = Math.floor(idx / gameState.width);
            
            let isBorder = false;
            const nbs = [
                {x: cx - 1, y: cy}, {x: cx + 1, y: cy},
                {x: cx, y: cy - 1}, {x: cx, y: cy + 1}
            ];

            for (const n of nbs) {
                if (n.x >= 0 && n.x < gameState.width && n.y >= 0 && n.y < gameState.height) {
                    const nIdx = n.y * gameState.width + n.x;
                    if (!comp.includes(nIdx)) {
                        if (gameState.cellOwners[nIdx] === newOwner) isBorder = true;
                    }
                }
            }
            if (isBorder || comp.length === 1) {
                dists.set(idx, 0);
                q.push(idx);
            }
        }

        if (q.length === 0 && comp.length > 0) {
            dists.set(comp[0], 0);
            q.push(comp[0]);
        }

        let maxDist = 0;
        while (q.length > 0) {
            const curr = q.shift()!;
            const d = dists.get(curr)!;
            
            const cx = curr % gameState.width;
            const cy = Math.floor(curr / gameState.width);
            const nbs = [
                {x: cx - 1, y: cy}, {x: cx + 1, y: cy},
                {x: cx, y: cy - 1}, {x: cx, y: cy + 1}
            ];

            for (const n of nbs) {
                if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) {
                    const nIdx = n.y * gameState.width + n.x;
                    if (comp.includes(nIdx) && !dists.has(nIdx)) {
                        dists.set(nIdx, d + 1);
                        if (d + 1 > maxDist) maxDist = d + 1;
                        q.push(nIdx);
                    }
                }
            }
        }

        // Fill texture
        for (const idx of comp) {
            const x = idx % gameState.width;
            const y = Math.floor(idx / gameState.width);
            const lx = x - minX;
            const ly = y - minY;
            
            const dist = dists.get(idx) || 0;
            const normDist = maxDist > 0 ? dist / maxDist : 0.0;
            const arr = Math.floor(normDist * 255.0);

            for (let py = 0; py < CELL_SIZE; py++) {
                for (let px = 0; px < CELL_SIZE; px++) {
                    const tx = lx * CELL_SIZE + px;
                    const ty = ly * CELL_SIZE + py;
                    const ptr = (ty * texW + tx) * 4;
                    data[ptr] = oldOwner;
                    data[ptr + 1] = newOwner;
                    data[ptr + 2] = arr;
                    data[ptr + 3] = 255;
                }
            }
        }

        const source = new PIXI.BufferImageSource({
            resource: data,
            width: texW,
            height: texH,
            format: 'rgba8unorm',
            alphaMode: 'no-premultiply-alpha',
        });
        source.style.scaleMode = 'nearest';
        const texture = new PIXI.Texture({ source });

        const geometry = new PIXI.MeshGeometry({
            positions: new Float32Array([
                0, 0,
                simW, 0,
                simW, simH,
                0, simH
            ]),
            uvs: new Float32Array([
                0, 0,
                1, 0,
                1, 1,
                0, 1
            ]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3])
        });

        const glProgram = getTransitionGlProgram();
        const shader = new PIXI.Shader({
            glProgram,
            resources: {
                uTex: texture.source,
                uPoliticalPaletteTexture: this.palette.texture.source,
                uniforms: {
                    uProgress: { value: 0.0, type: 'f32' }
                }
            }
        });

        const mesh = new PIXI.Mesh({ geometry, shader: shader as any });
        mesh.x = minX;
        mesh.y = minY;

        this.container.addChild(mesh);
        const overlay = new TransitionOverlay(mesh, shader, texture, comp);
        
        // Handle superseding for any overlapping cells
        for (const idx of comp) {
            const existing = this.cellToTransition.get(idx);
            if (existing && existing !== overlay) {
                existing.comp = existing.comp.filter(c => c !== idx);
            }
            this.cellToTransition.set(idx, overlay);
        }

        this.activeTransitions.push(overlay);
        this.metrics.totalTransitionsSpawned++;
        this.updateMetrics();
        return true;
    }
}

class TransitionOverlay {
    public progress = 0.0;
    constructor(
        public mesh: PIXI.Mesh<any, any>,
        public shader: PIXI.Shader,
        public texture: PIXI.Texture,
        public comp: number[],
    ) {}
    
    public destroy() {
        this.mesh.destroy();
        this.texture.destroy(true);
    }
}
