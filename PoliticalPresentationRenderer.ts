import * as PIXI from 'pixi.js';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { worldLandMeshResource } from './WorldLandMeshResource';
import { PoliticalOwnerIdTexture } from './PoliticalOwnerIdTexture';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';

/**
 * Presentation-only political renderer.
 *
 * The authoritative semantic field remains PoliticalFieldCore.owners.
 * This shader never averages owner IDs. It only chooses between the at-most-two
 * categorical labels in a local 3x3 neighborhood. Three-way junctions fall back
 * to the center categorical owner.
 *
 * IMPORTANT: the texture dimensions are compile-time constants on purpose.
 * A previous implementation appended uTexSize to shader.resources *after*
 * PIXI.Shader.from(), which is not a safe Pixi v8 UniformGroup lifecycle and
 * caused the political layer to disappear in the browser.
 */
export class PoliticalPresentationRenderer {
    public readonly container = new PIXI.Container();
    public mesh!: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;

    public async init(
        _surface: PoliticalSurfaceCache,
        ownerIdTexture: PoliticalOwnerIdTexture,
        paletteTexture: PoliticalPaletteTexture,
    ): Promise<void> {
        if (!worldLandMeshResource.geometry) {
            throw new Error(
                'worldLandMeshResource not initialized before PoliticalPresentationRenderer.init()',
            );
        }

        const vertexSrc = `
            attribute vec2 aPosition;
            attribute vec2 aUV;
            varying vec2 vUv;

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
            precision highp float;
            varying vec2 vUv;

            uniform sampler2D uPoliticalOwnerIdTexture;
            uniform sampler2D uPoliticalPaletteTexture;

            const vec2 TEX_SIZE = vec2(4096.0, 2048.0);
            const float DISTANCE_FALLOFF = 3.0;

            vec2 ownerTexelUv(vec2 texelIndex) {
                // Political X is periodic at the antimeridian; Y is clamped.
                float x = mod(texelIndex.x + TEX_SIZE.x, TEX_SIZE.x);
                float y = clamp(texelIndex.y, 0.0, TEX_SIZE.y - 1.0);
                return (vec2(x, y) + vec2(0.5)) / TEX_SIZE;
            }

            float ownerAt(vec2 texelIndex) {
                float encoded = texture2D(
                    uPoliticalOwnerIdTexture,
                    ownerTexelUv(texelIndex)
                ).r;
                return floor(encoded * 255.0 + 0.5);
            }

            vec4 ownerColor(float ownerId) {
                float u = (ownerId + 0.5) / 256.0;
                return texture2D(
                    uPoliticalPaletteTexture,
                    vec2(u, 0.5)
                );
            }

            void main() {
                // The current categorical texel. Using floor(vUv * size) matches
                // nearest sampling and avoids ambiguous free-running UV reads.
                vec2 pixel = vUv * TEX_SIZE;
                vec2 centerIndex = floor(pixel);
                vec2 local = fract(pixel) - vec2(0.5);

                float centerOwner = ownerAt(centerIndex);
                float ownerA = centerOwner;
                float ownerB = -1.0;
                bool hasThirdOwner = false;

                float scoreA = 0.0;
                float scoreB = 0.0;

                // Fixed-size loops are WebGL1-safe and deterministic.
                for (int oy = -1; oy <= 1; oy++) {
                    for (int ox = -1; ox <= 1; ox++) {
                        vec2 offset = vec2(float(ox), float(oy));
                        float sampleOwner = ownerAt(centerIndex + offset);

                        if (abs(sampleOwner - ownerA) > 0.5) {
                            if (ownerB < -0.5) {
                                ownerB = sampleOwner;
                            } else if (abs(sampleOwner - ownerB) > 0.5) {
                                hasThirdOwner = true;
                            }
                        }

                        // Gaussian-like categorical reconstruction. IDs are never
                        // averaged; only one-hot label scores are accumulated.
                        vec2 d = offset - local;
                        float weight = exp(
                            -DISTANCE_FALLOFF * dot(d, d)
                        );

                        if (abs(sampleOwner - ownerA) < 0.5) {
                            scoreA += weight;
                        } else if (
                            ownerB >= -0.5 &&
                            abs(sampleOwner - ownerB) < 0.5
                        ) {
                            scoreB += weight;
                        }
                    }
                }

                float finalOwner = centerOwner;

                // At true 3-way junctions preserve the exact categorical field.
                if (!hasThirdOwner && ownerB >= -0.5) {
                    // Ties deliberately preserve the center owner so tiny nations,
                    // one-cell islands and narrow bridges cannot disappear merely
                    // because of presentation smoothing.
                    if (scoreB > scoreA) {
                        finalOwner = ownerB;
                    } else {
                        finalOwner = ownerA;
                    }
                }

                if (finalOwner < 0.5) {
                    discard;
                }

                vec4 color = ownerColor(finalOwner);
                if (color.a < 0.01) {
                    discard;
                }

                // A0: smooth sub-texel contour position, categorical color output.
                // No fwidth/coverage AA yet; this avoids another moving part while
                // still removing the 4x stair-step appearance of the raw field.
                gl_FragColor = vec4(color.rgb, 1.0);
            }
        `;

        const shader = PIXI.Shader.from({
            gl: {
                vertex: vertexSrc,
                fragment: fragmentSrc,
            },
            resources: {
                uPoliticalOwnerIdTexture: ownerIdTexture.source,
                uPoliticalPaletteTexture: paletteTexture.source,
            },
        });

        this.mesh = new PIXI.Mesh({
            geometry: worldLandMeshResource.geometry,
            shader,
        });

        this.mesh.blendMode = 'normal';
        this.mesh.visible = true;
        this.mesh.renderable = true;
        this.container.addChild(this.mesh);
    }
}
