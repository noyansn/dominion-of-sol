import * as PIXI from 'pixi.js';
import { FactionInfo } from '../game/Types';

/**
 * Curated Grand-Strategy Mature Military Color Palette Table (256 Entries).
 * Designed for high territorial distinctiveness without neon/bright artifacts.
 */
const GRAND_STRATEGY_BASE_PALETTE: number[] = [
    // 0: Neutral / Unclaimed (Rendered with pure terrain relief)
    0x000000,
    
    // Core Major Powers / Faction Families (Hex RGB)
    0x2c4d6f, // 1: Prussian Blue / Slate Navy
    0x7c2d2d, // 2: Imperial Crimson / Oxblood
    0x3f4d34, // 3: Russian Khaki / Deep Olive
    0x784c36, // 4: Warm Terracotta / Sand Ochre
    0x424d54, // 5: Feldgrau / Steel Slate
    0x3d566e, // 6: French Horizon Blue
    0x7a5e38, // 7: Ottoman Amber / Burnt Ochre
    0x2e5241, // 8: Muted Pine / Spruce Green
    0x523d57, // 9: Dusky Plum / Royal Violet
    0x634c38, // 10: Iberian Bronze / Umber
    0x2c5252, // 11: Nordic Slate Teal
    0x7a6331, // 12: Imperial Gold / Brass
    0x853838, // 13: Rust Red / Carmine
    0x384e63, // 14: Arctic Navy / Cold Slate
    0x4d5e3f, // 15: Woodland Camo Green
    0x6e432f, // 16: Raw Sienna / Clay
    0x476480, // 17: Aegean Blue
    0x6b2228, // 18: Maroon / Dark Wine
    0x566946, // 19: Sage Green
    0x704d36, // 20: Desert Earth
    0x356161, // 21: Deep Petrol
    0x5f4665, // 22: Muted Amethyst
    0x735841, // 23: Leather Brown
    0x406e57, // 24: Emerald Moss
    0x8c6c40, // 25: Sandstone
    0x53636d, // 26: Heavy Iron
    0x943e3e, // 27: Brick Crimson
    0x1e405b, // 28: Midnight Blue
    0x4a5a3a, // 29: Taiga Khaki
    0x805037, // 30: Copper Brown
    0x527394, // 31: Glacier Blue
    0x66212b, // 32: Dark Garnet
];

/**
 * Deterministically maps any faction ID (1..255) to an art-directed grand-strategy color.
 */
function getStrategicColor(factionId: number, originalColorInt: number): { r: number, g: number, b: number } {
    if (factionId <= 0) return { r: 0, g: 0, b: 0 };
    
    // Check if within pre-crafted table
    if (factionId < GRAND_STRATEGY_BASE_PALETTE.length) {
        const hex = GRAND_STRATEGY_BASE_PALETTE[factionId];
        return {
            r: (hex >> 16) & 0xff,
            g: (hex >> 8) & 0xff,
            b: hex & 0xff
        };
    }
    
    // For factions >= 32, generate deterministic harmonious military tones
    // Golden ratio hue distribution + controlled saturation (35-50%) and lightness (32-46%)
    const goldenRatio = 0.618033988749895;
    const hue = ((factionId * goldenRatio) % 1.0) * 360.0;
    const sat = 0.38 + ((factionId * 17) % 15) / 100.0; // 0.38 to 0.52
    const lit = 0.30 + ((factionId * 31) % 16) / 100.0; // 0.30 to 0.45
    
    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * lit - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lit - c / 2;
    
    let r1 = 0, g1 = 0, b1 = 0;
    if (hue < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (hue < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (hue < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (hue < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (hue < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    
    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255)
    };
}

import { gameState } from '../game/GameState';

export class PoliticalPaletteTexture {
    public readonly paletteBuffer = new Uint8Array(256 * 4);

    public readonly source = new PIXI.BufferImageSource({
        resource: this.paletteBuffer,
        width: 256,
        height: 1,
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

    public update(factions: Map<number, FactionInfo>): void {
        const out = this.paletteBuffer;
        
        // Owner 0 is transparent/unclaimed
        out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0;

        const spotlightId = gameState.spotlightFactionId;
        const spotlightFaction = spotlightId ? factions.get(spotlightId) : null;

        for (let i = 1; i < 256; i++) {
            const p = i * 4;
            const faction = factions.get(i);

            let alpha = 220;
            if (spotlightId !== null && spotlightFaction) {
                if (i === spotlightId) {
                    alpha = 255;
                } else if (faction) {
                    const capA = spotlightFaction.capitalCell;
                    const capB = faction.capitalCell;
                    let dx = Math.abs((capA % 1024) - (capB % 1024));
                    if (dx > 512) dx = 1024 - dx;
                    const dy = Math.abs(Math.floor(capA / 1024) - Math.floor(capB / 1024));
                    const dist = Math.hypot(dx, dy);
                    if (dist < 130) {
                        alpha = 180;
                    } else {
                        alpha = 90;
                    }
                } else {
                    alpha = 90;
                }
            }

            if (faction && faction.colorInt) {
                const hex = faction.colorInt;
                out[p] = (hex >> 16) & 0xff;
                out[p + 1] = (hex >> 8) & 0xff;
                out[p + 2] = hex & 0xff;
                out[p + 3] = alpha;
            } else {
                const color = getStrategicColor(i, 0);
                out[p] = color.r;
                out[p + 1] = color.g;
                out[p + 2] = color.b;
                out[p + 3] = alpha;
            }
        }
        
        this.source.update();
    }
}
