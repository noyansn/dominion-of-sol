import * as PIXI from 'pixi.js';
import { gameState } from '../game/GameState';

export const CELL_SIZE = 6;

// 32-bit ABGR colors (Little-endian: 0xAABBGGRR)
export const COLOR_PALETTE_RGBA: number[] = [
  0xff281c15, // 0: Neutral / Unclaimed Land (#151c28 - Matte Dark Slate)
  0xfff6823b, // 1: Dominion of Sol (#3B82F6 - Vibrant Blue)
  0xff4444ef, // 2: Vanguard Coalition (#EF4444 - Crimson Red)
  0xff81b910, // 3: Verdant Enclave (#10B981 - Emerald Green)
  0xff0b9ef5, // 4: Solaris Dominion (#F59E0B - Amber Gold)
  0xfff65c8b, // 5: Aetherium Syndicate (#8B5CF6 - Royal Purple)
  0xff9948ec, // 6: Crimson Pact (#EC4899 - Neon Rose)
  0xffd4b606, // 7: Nordic Ironclads (#06B6D4 - Arctic Cyan)
  0xff16cc84, // 8: Obsidian Imperium (#84CC16 - Toxic Lime)
];

export const WATER_COLOR_RGBA = 0xff160d09; // #090d16 - Deep Matte Ocean Navy

export class TerritoryRenderer {
  public container: PIXI.Container;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imgData: ImageData;
  private buf32: Uint32Array;
  private texture: PIXI.Texture;
  private sprite: PIXI.Sprite;
  private selectionGraphics: PIXI.Graphics;
  private curWidth: number = 0;
  private curHeight: number = 0;

  constructor() {
    this.container = new PIXI.Container();

    this.canvas = document.createElement('canvas');
    this.canvas.width = gameState.width;
    this.canvas.height = gameState.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.imgData = this.ctx.createImageData(gameState.width, gameState.height);
    this.buf32 = new Uint32Array(this.imgData.data.buffer);
    this.curWidth = gameState.width;
    this.curHeight = gameState.height;

    this.buf32.fill(WATER_COLOR_RGBA);
    this.ctx.putImageData(this.imgData, 0, 0);

    this.texture = PIXI.Texture.from(this.canvas);
    this.texture.source.scaleMode = 'nearest';

    this.sprite = new PIXI.Sprite(this.texture);
    this.sprite.width = gameState.width * CELL_SIZE;
    this.sprite.height = gameState.height * CELL_SIZE;

    this.selectionGraphics = new PIXI.Graphics();

    this.container.addChild(this.sprite);
    this.container.addChild(this.selectionGraphics);
  }

  private ensureDimensions() {
    if (this.curWidth !== gameState.width || this.curHeight !== gameState.height) {
      this.curWidth = gameState.width;
      this.curHeight = gameState.height;
      this.canvas.width = this.curWidth;
      this.canvas.height = this.curHeight;
      this.imgData = this.ctx.createImageData(this.curWidth, this.curHeight);
      this.buf32 = new Uint32Array(this.imgData.data.buffer);
      this.sprite.width = this.curWidth * CELL_SIZE;
      this.sprite.height = this.curHeight * CELL_SIZE;
      this.texture.source.resize(this.curWidth, this.curHeight);
    }
  }

  public renderFullGrid() {
    this.ensureDimensions();
    const total = gameState.width * gameState.height;

    for (let i = 0; i < total; i++) {
      const terrain = gameState.cellTerrains[i];
      const owner = gameState.cellOwners[i] || 0;

      if (terrain === 2) {
        this.buf32[i] = WATER_COLOR_RGBA;
      } else {
        this.buf32[i] = COLOR_PALETTE_RGBA[owner % COLOR_PALETTE_RGBA.length];
      }
    }

    this.ctx.putImageData(this.imgData, 0, 0);
    this.texture.source.update();
    this.renderSelections();
  }

  public updateDeltas(deltas: Array<{ index: number; ownerId: number }>) {
    for (const delta of deltas) {
      if (delta.index < this.buf32.length) {
        this.buf32[delta.index] = COLOR_PALETTE_RGBA[delta.ownerId % COLOR_PALETTE_RGBA.length];
      }
    }
    this.ctx.putImageData(this.imgData, 0, 0);
    this.texture.source.update();
  }

  public renderSelections() {
    this.selectionGraphics.clear();

    if (gameState.selectedSourceCell !== null) {
      const sx = (gameState.selectedSourceCell % gameState.width) * CELL_SIZE;
      const sy = Math.floor(gameState.selectedSourceCell / gameState.width) * CELL_SIZE;
      this.selectionGraphics.rect(sx - 1, sy - 1, CELL_SIZE + 2, CELL_SIZE + 2);
      this.selectionGraphics.stroke({ color: 0x60a5fa, width: 2 });
    }

    if (gameState.selectedTargetCell !== null) {
      const tx = (gameState.selectedTargetCell % gameState.width) * CELL_SIZE;
      const ty = Math.floor(gameState.selectedTargetCell / gameState.width) * CELL_SIZE;
      this.selectionGraphics.rect(tx - 1, ty - 1, CELL_SIZE + 2, CELL_SIZE + 2);
      this.selectionGraphics.stroke({ color: 0xf87171, width: 2 });
    }
  }
}
