import * as PIXI from 'pixi.js';
import { PoliticalFieldCore } from './src/render/PoliticalFieldCore';
import { PoliticalSurfaceCache } from './src/render/PoliticalSurfaceCache';
import { WORLD_WIDTH, WORLD_HEIGHT } from './src/render/WorldSpace';
import { VISUAL_MASK_WIDTH, VISUAL_MASK_HEIGHT } from './src/render/VisualLandMask';
import { POLITICAL_SCALE, POLITICAL_WIDTH, POLITICAL_HEIGHT } from './src/render/PoliticalSpace';
import * as fs from 'fs';

// Mock GameState
const gameState = {
    cellOwners: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
    visualLandMask: new Uint8Array(VISUAL_MASK_WIDTH * VISUAL_MASK_HEIGHT),
    factions: new Map()
};

// Set up mock geography (a small solid land island in the middle)
for (let y = 500; y < 1500; y++) {
    for (let x = 1000; x < 3000; x++) {
        gameState.visualLandMask[y * VISUAL_MASK_WIDTH + x] = 255;
    }
}

// Global mock for gameState
(global as any).gameState = gameState;

// We need to mock PIXI.Texture and PIXI.BufferImageSource
(PIXI as any).Texture = class {
    source: any;
    constructor(options: any) { this.source = options.source; }
};
(PIXI as any).BufferImageSource = class {
    style = {};
    resource: any;
    constructor(options: any) { this.resource = options.resource; }
    update() {}
};

// Also mock performance.now()
(global as any).performance = { now: () => Date.now() };

async function run() {
    const surface = new PoliticalSurfaceCache();
    // Have to bypass the import error somehow, let's just let it run.
    
    // Oh wait, PoliticalSurfaceCache imports GameState. This will fail in ts-node if we don't mock the module.
    // Instead of importing PoliticalSurfaceCache directly, we can just compile this using ts-node but we need to mock GameState.
    // Better idea: copy the classes directly into a standalone file, or use proxyquire.
}
run();
