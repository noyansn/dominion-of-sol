import { BufferImageSource, extensions, ExtensionType } from 'pixi.js';
import type { VisualRect } from './PoliticalFieldCore';

const BLOCK = 64;

export interface PoliticalUploadMetrics {
  calls: number;
  fullUploads: number;
  subUploads: number;
  uploadedPixels: number;
  largestUploadWidth: number;
  largestUploadHeight: number;
  largestUploadPixels: number;
}

const uploadMetrics: PoliticalUploadMetrics = {
  calls: 0,
  fullUploads: 0,
  subUploads: 0,
  uploadedPixels: 0,
  largestUploadWidth: 0,
  largestUploadHeight: 0,
  largestUploadPixels: 0,
};

export function resetPoliticalUploadMetrics(): void {
  uploadMetrics.calls = 0;
  uploadMetrics.fullUploads = 0;
  uploadMetrics.subUploads = 0;
  uploadMetrics.uploadedPixels = 0;
  uploadMetrics.largestUploadWidth = 0;
  uploadMetrics.largestUploadHeight = 0;
  uploadMetrics.largestUploadPixels = 0;
}

export function getPoliticalUploadMetrics(): PoliticalUploadMetrics {
  return { ...uploadMetrics };
}

/** RGBA staging remains full-size; incremental GPU transfers are bounded
 * blocks. Register before Pixi creates its WebGL texture system. */
export class PoliticalTextureSource extends BufferImageSource {
  override uploadMethodId = 'dominion-political-buffer';
  readonly dirtyBlocks = new Set<number>();
  fullUpload = true;
  uploadedPixels = 0;
  readonly uploadScratch = new Uint8Array(BLOCK * BLOCK * 4);

  markFull(): void { this.fullUpload = true; this.dirtyBlocks.clear(); }

  markVisualRect(rect: VisualRect, scale = 2): void {
    const columns = Math.ceil(this.width / BLOCK);
    const minX = Math.max(0, Math.floor(rect.minX / scale / BLOCK));
    const minY = Math.max(0, Math.floor(rect.minY / scale / BLOCK));
    const maxX = Math.min(columns, Math.ceil(rect.maxX / scale / BLOCK));
    const maxY = Math.min(Math.ceil(this.height / BLOCK), Math.ceil(rect.maxY / scale / BLOCK));
    for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) this.dirtyBlocks.add(y * columns + x);
  }

  /** Mark a rectangle already expressed in this source's pixel space. */
  markPixelRect(minX: number, minY: number, maxX: number, maxY: number): void {
    const columns = Math.ceil(this.width / BLOCK);
    const firstX = Math.max(0, Math.floor(minX / BLOCK));
    const firstY = Math.max(0, Math.floor(minY / BLOCK));
    const lastX = Math.min(columns, Math.ceil(maxX / BLOCK));
    const lastY = Math.min(Math.ceil(this.height / BLOCK), Math.ceil(maxY / BLOCK));
    for (let y = firstY; y < lastY; y++) {
      for (let x = firstX; x < lastX; x++) this.dirtyBlocks.add(y * columns + x);
    }
  }
}

// Pixi owns binding, alpha state, allocation lifecycle and context restoration.
// The uploader only replaces the default whole-buffer texSubImage2D call.
export const politicalBufferUploader = {
  extension: { type: ExtensionType.TextureUploaderWebGL, name: 'dominion-political-buffer' },
  upload(source: PoliticalTextureSource, texture: { target: number; width: number; height: number; internalFormat: number; format: number; type: number },
    gl: WebGLRenderingContext): void {
    const bytes = source.resource as Uint8Array;
    uploadMetrics.calls++;
    if (texture.width !== source.width || texture.height !== source.height) {
      gl.texImage2D(texture.target, 0, texture.internalFormat, source.width, source.height, 0, texture.format, texture.type, bytes);
      source.uploadedPixels += source.width * source.height;
      uploadMetrics.fullUploads++;
      uploadMetrics.uploadedPixels += source.width * source.height;
      uploadMetrics.largestUploadWidth = Math.max(uploadMetrics.largestUploadWidth, source.width);
      uploadMetrics.largestUploadHeight = Math.max(uploadMetrics.largestUploadHeight, source.height);
      uploadMetrics.largestUploadPixels = Math.max(uploadMetrics.largestUploadPixels, source.width * source.height);
    } else if (source.fullUpload) {
      gl.texSubImage2D(texture.target, 0, 0, 0, source.width, source.height, texture.format, texture.type, bytes);
      source.uploadedPixels += source.width * source.height;
      uploadMetrics.fullUploads++;
      uploadMetrics.uploadedPixels += source.width * source.height;
      uploadMetrics.largestUploadWidth = Math.max(uploadMetrics.largestUploadWidth, source.width);
      uploadMetrics.largestUploadHeight = Math.max(uploadMetrics.largestUploadHeight, source.height);
      uploadMetrics.largestUploadPixels = Math.max(uploadMetrics.largestUploadPixels, source.width * source.height);
    } else {
      const columns = Math.ceil(source.width / BLOCK);
      for (const key of source.dirtyBlocks) {
        const x = (key % columns) * BLOCK, y = Math.floor(key / columns) * BLOCK;
        const width = Math.min(BLOCK, source.width - x), height = Math.min(BLOCK, source.height - y);
        for (let row = 0; row < height; row++) {
          const offset = ((y + row) * source.width + x) * 4;
          source.uploadScratch.set(bytes.subarray(offset, offset + width * 4), row * width * 4);
        }
        gl.texSubImage2D(texture.target, 0, x, y, width, height, texture.format, texture.type,
          source.uploadScratch.subarray(0, width * height * 4));
        source.uploadedPixels += width * height;
        uploadMetrics.subUploads++;
        uploadMetrics.uploadedPixels += width * height;
        uploadMetrics.largestUploadWidth = Math.max(uploadMetrics.largestUploadWidth, width);
        uploadMetrics.largestUploadHeight = Math.max(uploadMetrics.largestUploadHeight, height);
        uploadMetrics.largestUploadPixels = Math.max(uploadMetrics.largestUploadPixels, width * height);
      }
    }
    texture.width = source.width;
    texture.height = source.height;
    source.fullUpload = false;
    source.dirtyBlocks.clear();
  },
};

extensions.add(politicalBufferUploader);
