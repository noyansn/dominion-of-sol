import * as PIXI from 'pixi.js';

export class WorldBathymetryTexture {
    public width = 8192;
    public height = 4096;

    public source!: PIXI.BufferImageSource;
    public texture!: PIXI.Texture;
    public isLoaded = false;

    public async load(url: string): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`[WorldBathymetryTexture] Bathymetry fetch failed (${response.status}), fallback to procedural depth.`);
                this.initFallback();
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const pixels = new Uint8Array(arrayBuffer);

            if (pixels.length === 16384 * 8192 * 4) {
                this.width = 16384;
                this.height = 8192;
            } else if (pixels.length === 8192 * 4096 * 4) {
                this.width = 8192;
                this.height = 4096;
            } else if (pixels.length === 4096 * 2048 * 4) {
                this.width = 4096;
                this.height = 2048;
            } else {
                console.warn(`[WorldBathymetryTexture] Unexpected RGBA byte length ${pixels.length}, using fallback.`);
                this.initFallback();
                return;
            }

            this.source = new PIXI.BufferImageSource({
                resource: pixels,
                width: this.width,
                height: this.height,
                format: 'rgba8unorm',
                alphaMode: 'no-premultiply-alpha',
                autoGenerateMipmaps: false,
            });
            this.source.style.scaleMode = 'linear';

            this.texture = new PIXI.Texture({
                source: this.source,
            });

            this.isLoaded = true;
            console.log(`[WorldBathymetryTexture] Preloaded ${this.width}x${this.height} master ocean bathymetry buffer.`);
        } catch (e: any) {
            console.warn(`[WorldBathymetryTexture] Load error (${e.message}), using fallback.`);
            this.initFallback();
        }
    }

    private initFallback(): void {
        const dummy = new Uint8Array(256 * 128 * 4);
        for (let i = 0; i < 256 * 128; i++) {
            const p = i * 4;
            dummy[p] = 72;      // deep, restrained navy depth
            dummy[p + 1] = 220; // open-water coastal AO
            dummy[p + 2] = 128; // neutral ridge-light channel
            dummy[p + 3] = 255;
        }
        this.width = 256;
        this.height = 128;
        this.source = new PIXI.BufferImageSource({
            resource: dummy,
            width: 256,
            height: 128,
            format: 'rgba8unorm',
            alphaMode: 'no-premultiply-alpha',
            autoGenerateMipmaps: false,
        });
        this.source.style.scaleMode = 'linear';
        this.texture = new PIXI.Texture({
            source: this.source,
        });
        this.isLoaded = true;
    }
}

export const worldBathymetryTexture = new WorldBathymetryTexture();
