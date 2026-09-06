import * as PIXI from 'pixi.js';

export class WorldReliefTexture {
    public width = 8192;
    public height = 4096;

    public source!: PIXI.BufferImageSource;
    public texture!: PIXI.Texture;
    public isLoaded = false;

    public async load(url: string): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }

            const pixels = new Uint8Array(await response.arrayBuffer());
            const dimensions = this.dimensionsForByteLength(pixels.length);
            if (!dimensions) {
                throw new Error(`unexpected RGBA byte length ${pixels.length}`);
            }

            this.createTexture(pixels, dimensions.width, dimensions.height);
            console.log(`[WorldReliefTexture] Preloaded ${this.width}x${this.height} master shaded relief buffer into GPU.`);
        } catch (error: any) {
            // Terrain is an optional presentation layer. Keep the map and
            // authoritative network usable when the art asset is unavailable.
            console.warn(`[WorldReliefTexture] Load failed (${error?.message || error}); using muted fallback.`);
            this.initFallback();
        }
    }

    private dimensionsForByteLength(byteLength: number): { width: number; height: number } | null {
        if (byteLength === 16384 * 8192 * 4) return { width: 16384, height: 8192 };
        if (byteLength === 8192 * 4096 * 4) return { width: 8192, height: 4096 };
        if (byteLength === 4096 * 2048 * 4) return { width: 4096, height: 2048 };
        return null;
    }

    private createTexture(pixels: Uint8Array, width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.source = new PIXI.BufferImageSource({
            resource: pixels,
            width,
            height,
            format: 'rgba8unorm',
            alphaMode: 'no-premultiply-alpha',
            autoGenerateMipmaps: false,
        });
        this.source.style.scaleMode = 'linear';
        this.texture = new PIXI.Texture({ source: this.source });
        this.isLoaded = true;
    }

    private initFallback(): void {
        const width = 512;
        const height = 256;
        const pixels = new Uint8Array(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            const p = i * 4;
            pixels[p] = 49;
            pixels[p + 1] = 63;
            pixels[p + 2] = 57;
            pixels[p + 3] = 255;
        }
        this.createTexture(pixels, width, height);
    }
}

export const worldReliefTexture = new WorldReliefTexture();
