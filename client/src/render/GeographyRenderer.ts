import * as PIXI from 'pixi.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './WorldSpace';
import { worldLandMeshResource } from './WorldLandMeshResource';
import { worldReliefTexture } from './WorldReliefTexture';
import { worldBathymetryTexture } from './WorldBathymetryTexture';
import { terrainLodManager } from './TerrainLodManager';

export class GeographyRenderer {
  public container: PIXI.Container;
  private oceanMesh!: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;
  private landMesh!: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;

  constructor() {
    this.container = new PIXI.Container();
  }

  public init() {
    // 1. Dark Petrol & Deep Navy Strategic Ocean Mesh
    const oceanGeom = new PIXI.MeshGeometry({
        positions: new Float32Array([
            0, 0,
            WORLD_WIDTH, 0,
            WORLD_WIDTH, WORLD_HEIGHT,
            0, WORLD_HEIGHT
        ]),
        uvs: new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]),
        indices: new Uint32Array([
            0, 1, 2,
            0, 2, 3
        ])
    });

    const oceanVertexSrc = `
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

    const oceanFragmentSrc = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uWorldBathymetryTexture;

        void main() {
            vec4 bathy = texture2D(uWorldBathymetryTexture, vUv);
            float depth = bathy.r;      // 0.0 = abyss, 1.0 = shallow shelf
            float coastalAo = bathy.g;  // 0.0 = contact shadow, 1.0 = open sea
            float ridgeLight = bathy.b;

            // Deep Petrol & Dark Navy Strategic Ocean Palette
            vec3 cAbyss   = vec3(0.016, 0.067, 0.106); // #04111b Deep abyss
            vec3 cOcean   = vec3(0.024, 0.094, 0.133); // #061822 Open ocean
            vec3 cSlope   = vec3(0.031, 0.129, 0.173); // #08212c Continental slope
            vec3 cShelf   = vec3(0.043, 0.173, 0.216); // #0b2c37 Continental shelf
            vec3 cShallow = vec3(0.059, 0.227, 0.275); // #0f3a46 Muted shallow margin

            vec3 oceanColor;
            if (depth < 0.30) {
                oceanColor = mix(cAbyss, cOcean, depth / 0.30);
            } else if (depth < 0.65) {
                oceanColor = mix(cOcean, cSlope, (depth - 0.30) / 0.35);
            } else if (depth < 0.88) {
                oceanColor = mix(cSlope, cShelf, (depth - 0.65) / 0.23);
            } else {
                oceanColor = mix(cShelf, cShallow, (depth - 0.88) / 0.12);
            }

            // Subtle underwater structure
            oceanColor *= (0.97 + 0.06 * ridgeLight);

            // Coastal contact shadow
            oceanColor *= (0.80 + 0.20 * coastalAo);

            // Subtle 30° cartographic graticules
            float lat = (0.5 - vUv.y) * 180.0;
            float lon = (vUv.x - 0.5) * 360.0;
            float latLine = abs(fract((lat + 90.0) / 30.0) - 0.5);
            float lonLine = abs(fract((lon + 180.0) / 30.0) - 0.5);
            float grid = smoothstep(0.02, 0.0, min(latLine, lonLine));
            oceanColor = mix(oceanColor, oceanColor + vec3(0.02, 0.04, 0.05), grid * 0.20);

            gl_FragColor = vec4(oceanColor, 1.0);
        }
    `;

    const oceanShader = PIXI.Shader.from({
        gl: { vertex: oceanVertexSrc, fragment: oceanFragmentSrc },
        resources: {
            uWorldBathymetryTexture: worldBathymetryTexture.source,
        }
    } as any);

    this.oceanMesh = new PIXI.Mesh({
        geometry: oceanGeom,
        shader: oceanShader
    });
    this.container.addChild(this.oceanMesh);

    // 2. Global Base Land Mesh (4096x2048)
    if (!worldLandMeshResource.geometry) {
        console.error('[GeographyRenderer] World land mesh not initialized.');
        return;
    }

    const landVertexSrc = `
        attribute vec2 aPosition;
        attribute vec2 aUV;
        varying vec2 vUV;
        uniform mat3 uProjectionMatrix;
        uniform mat3 uWorldTransformMatrix;
        uniform mat3 uTransformMatrix;

        void main() {
            mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
            gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
            vUV = aUV;
        }
    `;

    const landFragmentSrc = `
        precision highp float;
        varying vec2 vUV;
        uniform sampler2D uWorldReliefTexture;

        void main() {
            vec4 relief = texture2D(uWorldReliefTexture, vUV);
            if (relief.a < 0.05) discard;
            gl_FragColor = vec4(relief.rgb, 1.0);
        }
    `;

    const landShader = PIXI.Shader.from({
        gl: { vertex: landVertexSrc, fragment: landFragmentSrc },
        resources: {
            uWorldReliefTexture: worldReliefTexture.source,
        }
    } as any);

    this.landMesh = new PIXI.Mesh({
        geometry: worldLandMeshResource.geometry,
        shader: landShader
    });

    this.landMesh.blendMode = 'normal';
    this.container.addChild(this.landMesh);

    // 3. Real 21.6K SRTM Plus Tiled LOD High-Res Detail Layer
    terrainLodManager.init();
    this.container.addChild(terrainLodManager.container);

    console.log('[GeographyRenderer] Initialized global 4K base map + 21.6K SRTM Tiled LOD layer.');
  }

  public updateViewport(
      viewportWorldBounds: { minX: number; minY: number; maxX: number; maxY: number },
      currentScale: number,
      worldFitScale: number
  ) {
      terrainLodManager.update(viewportWorldBounds, currentScale, worldFitScale);
  }

  public tick(deltaSeconds: number) {
      terrainLodManager.tick(deltaSeconds);
  }

  /** The smooth political land pass samples the same relief texture and
   * covers the identical land mesh. Keep the base pass available as a
   * fallback, but avoid drawing the redundant 1.27M-vertex mesh when the
   * authoritative political presentation is healthy. */
  public setBaseLandVisible(visible: boolean): void {
      if (this.landMesh) this.landMesh.visible = visible;
  }

  /** DEV-only layer inventory for diagnosing apparent rectangular terrain
   * patches without changing the render path. */
  public getDebugSnapshot() {
      const describe = (display: any | undefined) => {
          if (!display) return null;
          let bounds: any = null;
          try {
              const b = display.getBounds();
              bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
          } catch { /* stale display object */ }
          const source = ((display as any).shader?.resources?.uWorldReliefTexture
              || (display as any).shader?.resources?.uWorldBathymetryTexture
              || (display as any).texture?.source) as any;
          return {
              label: String((display as any).label ?? ''),
              type: display.constructor?.name ?? 'DisplayObject',
              visible: display.visible,
              renderable: display.renderable,
              alpha: display.alpha,
              tint: Number((display as any).tint ?? 0xffffff),
              blendMode: String((display as any).blendMode ?? 'inherit'),
              zIndex: Number((display as any).zIndex ?? 0),
              bounds,
              textureSource: source ? {
                  uid: Number(source.uid ?? 0),
                  width: Number(source.width ?? source.pixelWidth ?? 0),
                  height: Number(source.height ?? source.pixelHeight ?? 0),
                  label: String(source.label ?? ''),
                  resourceType: String(source.resource?.constructor?.name ?? ''),
              } : null,
          };
      };
      return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          layers: [describe(this.oceanMesh), describe(this.landMesh), describe(terrainLodManager.container)],
          terrainLod: terrainLodManager.getDebugSnapshot(),
      };
  }

  public updateLOD(_lod: 'FAR' | 'MEDIUM' | 'CLOSE') {}
}
