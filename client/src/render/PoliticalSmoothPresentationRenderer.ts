import * as PIXI from 'pixi.js';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { worldLandMeshResource } from './WorldLandMeshResource';
import { PoliticalColorTexture } from './PoliticalColorTexture';
import { worldReliefTexture } from './WorldReliefTexture';
import { WORLD_HEIGHT, WORLD_WIDTH } from './WorldSpace';

export class PoliticalSmoothPresentationRenderer {
    public readonly container = new PIXI.Container();
    public mesh!: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;
    public uA1Uniforms = new PIXI.UniformGroup({
        uDiagnosticMode: { value: 0.0, type: 'f32' },
    });

    public setDiagnosticMode(mode: 0 | 1 | 2) {
        this.uA1Uniforms.uniforms.uDiagnosticMode = mode;
    }

    public async init(
        _surface: PoliticalSurfaceCache,
        colorTexture: PoliticalColorTexture,
    ): Promise<void> {
        if (!worldLandMeshResource.geometry) {
            throw new Error(
                'worldLandMeshResource not initialized before PoliticalSmoothPresentationRenderer.init()',
            );
        }

        const vertexSrc = `
            attribute vec2 aPosition;
            attribute vec2 aUV;
            varying highp vec2 vUv;

            uniform mat3 uProjectionMatrix;
            uniform mat3 uWorldTransformMatrix;
            uniform mat3 uTransformMatrix;

            void main() {
                mat3 mvp =
                    uProjectionMatrix *
                    uWorldTransformMatrix *
                    uTransformMatrix;

                gl_Position = vec4(
                    (mvp * vec3(aPosition, 1.0)).xy,
                    0.0,
                    1.0
                );
                vUv = aUV;
            }
        `;

        const fragmentSrc = `
            // Political ink is an 8-bit presentation pass. Mediump is enough
            // for its color arithmetic and avoids forcing high-precision
            // fragment execution on integrated GPUs.
            precision mediump float;
            varying highp vec2 vUv;

            uniform sampler2D uPoliticalColorTexture;
            uniform sampler2D uWorldReliefTexture;
            uniform float uDiagnosticMode;

            void main() {
                if (uDiagnosticMode > 1.5) {
                    // F7 MESH COVERAGE
                    gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
                    return;
                }

                vec4 relief = texture2D(uWorldReliefTexture, vUv);
                if (relief.a < 0.05) {
                    discard;
                }
            
                vec4 factionColor = texture2D(uPoliticalColorTexture, vUv);
                if (factionColor.a < 0.01) {
                    if (uDiagnosticMode > 0.5) {
                        // F6 OWNER ZERO
                        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
                        return;
                    }
                    gl_FragColor = vec4(relief.rgb, 1.0);
                    return;
                }

                float reliefLum = dot(relief.rgb, vec3(0.299, 0.587, 0.114));
                float reliefShading = 0.64 + reliefLum * 0.68;
                // Modestly desaturate background terrain chroma in POL mode so red, blue, and violet hues stay pure:
                vec3 neutralTerrain = mix(vec3(reliefLum * 0.95), relief.rgb, 0.10);

                // Political identity color modulated cleanly by topographic relief:
                vec3 politicalBase = factionColor.rgb * reliefShading;

                // Dynamic spotlight contrast:
                // Selected country gets 1.0 (255), neighbors 0.78 (200), distant 0.60 (155).
                // Idle state: all countries receive balanced military atlas fill 0.92 (235).
                float spotFactor = factionColor.a;
                vec3 presentedColor = mix(neutralTerrain, politicalBase, clamp(spotFactor, 0.35, 1.0));
                if (spotFactor > 0.96) {
                    // Tactile luminous elevation and rich vibrance for the selected sovereign power
                    presentedColor = mix(presentedColor, politicalBase * 1.18 + vec3(0.04, 0.06, 0.12), 0.36);
                } else if (spotFactor < 0.90) {
                    // Non-selected countries gently recede in contrast and saturation so selected country dominates
                    presentedColor = mix(vec3(reliefLum * 0.88), presentedColor, 0.76);
                }
                gl_FragColor = vec4(presentedColor, 1.0);
            }
        `;

        const shader = PIXI.Shader.from({
            gl: {
                vertex: vertexSrc,
                fragment: fragmentSrc,
            },
            resources: {
                uPoliticalColorTexture: colorTexture.source,
                uWorldReliefTexture: worldReliefTexture.source,
                uA1Uniforms: this.uA1Uniforms,
            },
        });

        // The fragment shader already applies the canonical relief alpha mask
        // before it shades a pixel. Reusing the 1.27M-vertex coastline mesh
        // here therefore adds vertex work without changing the visible land
        // boundary. A four-corner world surface preserves the same UVs and
        // discard rule while keeping this presentation pass GPU-light.
        const politicalSurfaceGeometry = new PIXI.MeshGeometry({
            positions: new Float32Array([
                0, 0,
                WORLD_WIDTH, 0,
                WORLD_WIDTH, WORLD_HEIGHT,
                0, WORLD_HEIGHT,
            ]),
            uvs: new Float32Array([
                0, 0,
                1, 0,
                1, 1,
                0, 1,
            ]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        });

        this.mesh = new PIXI.Mesh({
            geometry: politicalSurfaceGeometry,
            shader,
        });

        this.mesh.blendMode = 'normal';
        this.mesh.visible = true;
        this.mesh.renderable = true;
        this.container.addChild(this.mesh);
    }
}
