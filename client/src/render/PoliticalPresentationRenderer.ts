import * as PIXI from 'pixi.js';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { worldLandMeshResource } from './WorldLandMeshResource';
import { PoliticalOwnerIdTexture } from './PoliticalOwnerIdTexture';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';
import { worldReliefTexture } from './WorldReliefTexture';

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
            uniform sampler2D uWorldReliefTexture;

            const vec2 TEX_SIZE = vec2(2048.0, 1024.0);
            const float DISTANCE_FALLOFF = 3.0;

            vec2 ownerTexelUv(vec2 texelIndex) {
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
                vec4 relief = texture2D(uWorldReliefTexture, vUv);
                if (relief.a < 0.05) discard;

                vec2 pixel = vUv * TEX_SIZE;
                vec2 centerIndex = floor(pixel);
                vec2 local = fract(pixel) - vec2(0.5);

                float centerOwner = ownerAt(centerIndex);
                float ownerA = centerOwner;
                float ownerB = -1.0;
                bool hasThirdOwner = false;

                float scoreA = 0.0;
                float scoreB = 0.0;

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

                if (!hasThirdOwner && ownerB >= -0.5) {
                    if (scoreB > scoreA) {
                        finalOwner = ownerB;
                    } else {
                        finalOwner = ownerA;
                    }
                }

                // In POL mode: restrain/desaturate underlying physical terrain color contribution
                // while preserving clean topographic relief/luminance.
                float reliefLum = dot(relief.rgb, vec3(0.299, 0.587, 0.114));
                // Gentle topographic relief shading (0.75 in deep valleys to 1.25 in peaks):
                float reliefShading = 0.72 + reliefLum * 0.52;
                // Desaturated subtle terrain backdrop for neutral / unselected areas:
                vec3 neutralTerrain = mix(vec3(reliefLum * 0.90), relief.rgb, 0.20);

                if (finalOwner < 0.5) {
                    gl_FragColor = vec4(neutralTerrain, 1.0);
                    return;
                }

                vec4 factionColor = ownerColor(finalOwner);
                if (factionColor.a < 0.01) {
                    gl_FragColor = vec4(neutralTerrain, 1.0);
                    return;
                }

                // Pure, unpolluted political color modulated cleanly by topographic relief:
                vec3 politicalBase = factionColor.rgb * reliefShading;

                // Strategic Spotlight presentation:
                // factionColor.a conveys spotlight hierarchy:
                // Selected country: alpha = 1.0 -> full brilliant political identity!
                // Immediate neighbours: alpha ~ 0.70 -> slightly receded
                // Distant factions: alpha ~ 0.35 -> clearly receded, terrain visible
                vec3 presentedColor = mix(neutralTerrain, politicalBase, clamp(factionColor.a, 0.30, 1.0));

                float edge = 0.0;
                if (ownerAt(centerIndex + vec2(1.0, 0.0)) != finalOwner ||
                    ownerAt(centerIndex + vec2(-1.0, 0.0)) != finalOwner ||
                    ownerAt(centerIndex + vec2(0.0, 1.0)) != finalOwner ||
                    ownerAt(centerIndex + vec2(0.0, -1.0)) != finalOwner) {
                    edge = 1.0;
                }
                presentedColor *= (1.0 - edge * 0.20);

                gl_FragColor = vec4(presentedColor, 1.0);
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
                uWorldReliefTexture: worldReliefTexture.source,
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
