import * as PIXI from 'pixi.js';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { worldLandMeshResource } from './WorldLandMeshResource';
import { PoliticalColorTexture } from './PoliticalColorTexture';
import { PoliticalOwnerIdTexture } from './PoliticalOwnerIdTexture';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';
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
        ownerIdTexture: PoliticalOwnerIdTexture,
        paletteTexture: PoliticalPaletteTexture,
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

        // The color texture is the authoritative 4x visual ownership field.
        // Linear sampling is presentation-only: it interpolates already
        // uploaded owner colors at the political edge without changing the
        // categorical owner grid or inventing a future cell.
        colorTexture.source.style.scaleMode = 'linear';
        colorTexture.source.update();

        const fragmentSrc = `
            // Political ink is an 8-bit presentation pass. Mediump is enough
            // for its color arithmetic and avoids forcing high-precision
            // fragment execution on integrated GPUs.
            precision mediump float;
            varying highp vec2 vUv;

            uniform sampler2D uPoliticalColorTexture;
            uniform sampler2D uWorldReliefTexture;
            uniform float uDiagnosticMode;

            vec3 terrainColor(vec4 relief) {
                float reliefLum = dot(relief.rgb, vec3(0.299, 0.587, 0.114));
                return mix(vec3(reliefLum * 0.95), relief.rgb, 0.10);
            }

            // Return premultiplied political color plus coverage. The source
            // texture is 4x the simulation grid, so this local field spans
            // sub-cell visual texels rather than snapping every fragment to
            // one 1024x512 owner cell.
            vec4 politicalFieldSample(vec2 uv) {
                vec4 sample = texture2D(uPoliticalColorTexture, uv);
                return vec4(sample.rgb * sample.a, sample.a);
            }

            vec3 unpremultipliedFactionColor(vec4 sample) {
                return sample.rgb / max(sample.a, 0.001);
            }

            bool sameFaction(vec4 a, vec4 b) {
                // politicalFieldSample is premultiplied. Compare the actual
                // faction colors, not alpha-darkened RGB values; otherwise
                // equal-owner samples are classified inconsistently and the
                // bridge becomes gray or clips to cyan.
                return a.a > 0.18 && b.a > 0.18
                    && distance(unpremultipliedFactionColor(a), unpremultipliedFactionColor(b)) < 0.035;
            }

            vec3 politicalColor(vec3 factionColor, float spotFactor, vec4 relief) {
                float reliefLum = dot(relief.rgb, vec3(0.299, 0.587, 0.114));
                // Keep the country readable while preserving terrain relief;
                // avoid pushing blue channels over 1.0, which creates the
                // electric-cyan patches visible on narrow transition seams.
                float reliefShading = 0.68 + reliefLum * 0.62;
                vec3 politicalBase = clamp(factionColor * reliefShading, 0.0, 1.0);
                vec3 presented = mix(terrainColor(relief), politicalBase, clamp(spotFactor, 0.40, 0.96));
                if (spotFactor > 0.96) {
                    presented = mix(presented, clamp(politicalBase * 1.04 + vec3(0.01, 0.015, 0.02), 0.0, 1.0), 0.22);
                } else if (spotFactor < 0.90) {
                    presented = mix(vec3(reliefLum * 0.88), presented, 0.76);
                }
                return clamp(presented, 0.0, 1.0);
            }

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

                // A compact multi-ring continuous field over the already-
                // authoritative high-resolution field removes the visible
                // four-sided cell plateaus. The owner texture remains
                // discrete; only this presentation sample is spatially
                // reconstructed. The second ring is intentional: a single
                // 9-tap ring still leaves a short two-cell FOCUS chain looking
                // like an L-shaped stack at close zoom. This widens the
                // cartographic interpolation without changing ownership or
                // allowing a transition to paint an unauthorized cell.
                vec2 cellUv = vec2(1.0 / 1024.0, 1.0 / 512.0);
                // The nearer ring is intentionally sub-cell and the outer
                // ring is only a little wider than one authority cell. This
                // rounds narrow diagonal shoulders without turning adjacent
                // countries into one blurred blob.
                float nearRadius = 0.82;
                float farRadius = 1.55;
                vec4 centerField = politicalFieldSample(vUv);
                vec4 field = centerField * 0.22;
                float nearAxisWeight = 0.10;
                float nearDiagonalWeight = 0.055;
                float farAxisWeight = 0.03;
                float farDiagonalWeight = 0.01;
                field += politicalFieldSample(vUv + vec2(cellUv.x * nearRadius, 0.0)) * nearAxisWeight;
                field += politicalFieldSample(vUv - vec2(cellUv.x * nearRadius, 0.0)) * nearAxisWeight;
                field += politicalFieldSample(vUv + vec2(0.0, cellUv.y * nearRadius)) * nearAxisWeight;
                field += politicalFieldSample(vUv - vec2(0.0, cellUv.y * nearRadius)) * nearAxisWeight;
                field += politicalFieldSample(vUv + vec2(cellUv.x * nearRadius, cellUv.y * nearRadius)) * nearDiagonalWeight;
                field += politicalFieldSample(vUv + vec2(-cellUv.x * nearRadius, cellUv.y * nearRadius)) * nearDiagonalWeight;
                field += politicalFieldSample(vUv + vec2(cellUv.x * nearRadius, -cellUv.y * nearRadius)) * nearDiagonalWeight;
                field += politicalFieldSample(vUv - vec2(cellUv.x * nearRadius, cellUv.y * nearRadius)) * nearDiagonalWeight;
                field += politicalFieldSample(vUv + vec2(cellUv.x * farRadius, 0.0)) * farAxisWeight;
                field += politicalFieldSample(vUv - vec2(cellUv.x * farRadius, 0.0)) * farAxisWeight;
                field += politicalFieldSample(vUv + vec2(0.0, cellUv.y * farRadius)) * farAxisWeight;
                field += politicalFieldSample(vUv - vec2(0.0, cellUv.y * farRadius)) * farAxisWeight;
                field += politicalFieldSample(vUv + vec2(cellUv.x * farRadius, cellUv.y * farRadius)) * farDiagonalWeight;
                field += politicalFieldSample(vUv + vec2(-cellUv.x * farRadius, cellUv.y * farRadius)) * farDiagonalWeight;
                field += politicalFieldSample(vUv + vec2(cellUv.x * farRadius, -cellUv.y * farRadius)) * farDiagonalWeight;
                field += politicalFieldSample(vUv - vec2(cellUv.x * farRadius, cellUv.y * farRadius)) * farDiagonalWeight;

                // A legal diagonal contact can land exactly between four
                // visual samples.  The weighted average above then makes the
                // same faction look like two islands joined by a one-pixel
                // neck.  Add only a narrow, same-colour corner bridge when
                // opposite diagonal samples prove that this is one faction
                // on both sides.  This is a presentation reconstruction of
                // already-committed owner samples; it cannot create a bridge
                // between different factions or a future owner.
                vec4 diagNE = politicalFieldSample(vUv + vec2(cellUv.x * nearRadius, -cellUv.y * nearRadius));
                vec4 diagSW = politicalFieldSample(vUv - vec2(cellUv.x * nearRadius, -cellUv.y * nearRadius));
                vec4 diagNW = politicalFieldSample(vUv + vec2(-cellUv.x * nearRadius, -cellUv.y * nearRadius));
                vec4 diagSE = politicalFieldSample(vUv + vec2(cellUv.x * nearRadius, cellUv.y * nearRadius));
                float bridgeAlpha = 0.0;
                vec3 bridgeColor = vec3(0.0);
                if (sameFaction(diagNE, diagSW)) {
                    bridgeAlpha = max(bridgeAlpha, min(diagNE.a, diagSW.a) * 0.72);
                    bridgeColor = mix(unpremultipliedFactionColor(diagNE), unpremultipliedFactionColor(diagSW), 0.5);
                }
                if (sameFaction(diagNW, diagSE)) {
                    float candidateAlpha = min(diagNW.a, diagSE.a) * 0.72;
                    if (candidateAlpha > bridgeAlpha) {
                        bridgeAlpha = candidateAlpha;
                        bridgeColor = mix(unpremultipliedFactionColor(diagNW), unpremultipliedFactionColor(diagSE), 0.5);
                    }
                }
                // The same one-cell pinch can occur on a cardinal seam when
                // a visual land fragment falls exactly between two samples.
                // Use only opposite samples of the already-owned faction and
                // keep the bridge deliberately weaker than the diagonal one;
                // this closes a presentation notch without inventing a new
                // owner or changing the authoritative grid.
                vec4 axisE = politicalFieldSample(vUv + vec2(cellUv.x * nearRadius, 0.0));
                vec4 axisW = politicalFieldSample(vUv - vec2(cellUv.x * nearRadius, 0.0));
                vec4 axisN = politicalFieldSample(vUv + vec2(0.0, -cellUv.y * nearRadius));
                vec4 axisS = politicalFieldSample(vUv + vec2(0.0, cellUv.y * nearRadius));
                if (sameFaction(axisE, axisW)) {
                    float candidateAlpha = min(axisE.a, axisW.a) * 0.64;
                    if (candidateAlpha > bridgeAlpha) {
                        bridgeAlpha = candidateAlpha;
                        bridgeColor = mix(unpremultipliedFactionColor(axisE), unpremultipliedFactionColor(axisW), 0.5);
                    }
                }
                if (sameFaction(axisN, axisS)) {
                    float candidateAlpha = min(axisN.a, axisS.a) * 0.64;
                    if (candidateAlpha > bridgeAlpha) {
                        bridgeAlpha = candidateAlpha;
                        bridgeColor = mix(unpremultipliedFactionColor(axisN), unpremultipliedFactionColor(axisS), 0.5);
                    }
                }
                if (centerField.a < 0.18 && bridgeAlpha > field.a) {
                    field.rgb = bridgeColor * bridgeAlpha;
                    field.a = bridgeAlpha;
                }

                // Preserve a narrow country's interior even when the wider
                // cartographic ring averages it with neutral pixels. The
                // center sample is already authoritative presentation data;
                // this is a support floor, not a new owner or a neighbor
                // fill. It prevents a diagonal expansion from visually
                // thinning until the country appears disconnected.
                float fieldAlpha = max(clamp(field.a, 0.0, 1.0), centerField.a * 0.92);
                if (fieldAlpha < 0.01) {
                    if (uDiagnosticMode > 0.5) {
                        // F6 OWNER ZERO
                        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
                        return;
                    }
                    gl_FragColor = vec4(terrainColor(relief), 1.0);
                    return;
                }

                vec3 fieldColor = clamp(field.rgb / max(field.a, 0.001), 0.0, 1.0);
                if (centerField.a > 0.70 && field.a < centerField.a * 0.92) {
                    vec3 centerColor = centerField.rgb / max(centerField.a, 0.001);
                    fieldColor = mix(fieldColor, centerColor, 0.82);
                }
                float ownershipCoverage = smoothstep(0.04, 0.82, fieldAlpha);
                float spotlight = clamp(fieldAlpha / max(ownershipCoverage, 0.001), 0.35, 1.0);
                vec3 presentedColor = politicalColor(fieldColor, spotlight, relief);
                presentedColor = mix(terrainColor(relief), presentedColor, ownershipCoverage);
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
