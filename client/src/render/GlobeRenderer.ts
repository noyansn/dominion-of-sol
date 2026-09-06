import * as PIXI from 'pixi.js';
import { worldReliefTexture } from './WorldReliefTexture';
import { worldBathymetryTexture } from './WorldBathymetryTexture';
import { PoliticalOwnerIdTexture } from './PoliticalOwnerIdTexture';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';
import { PoliticalColorTexture } from './PoliticalColorTexture';
import coastline from '../assets/coastline.json';
import { HomelandRegion, HOMELAND_REGIONS } from '../game/HomelandRegions';

interface GlobePoint { x: number; y: number; }

export class GlobeRenderer {
  public readonly container = new PIXI.Container();
  public readonly coastlineDiagnostic = new PIXI.Graphics();
  public readonly flatCoastlineDiagnostic = new PIXI.Graphics();
  public visible = false;
  public yaw = 0;
  public pitch = 0.08;

  private mesh!: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;
  private shell = new PIXI.Graphics();
  private radius = 240;
  private center: GlobePoint = { x: 0, y: 0 };
  private debugCoastline = false;
  private focalWorldX = 512;
  private focalWorldY = 256;
  private flatScale = 1.0;
  private vpHalfW = window.innerWidth * 0.5;
  private vpHalfH = window.innerHeight * 0.5;
  private morph: number = 0.0;
  private userZoom: number = 1.0;

  public readonly homelandLayer = new PIXI.Graphics();
  private sunSprite: PIXI.Sprite | null = null;
  private sunTexture: PIXI.Texture | null = null;
  private nebulaSprite: PIXI.Sprite | null = null;
  private nebulaTexture: PIXI.Texture | null = null;
  private homelandCoords: { civId?: string; lon: number; lat: number; label?: string; subRegion?: string } | null = null;
  private activeHomeland: HomelandRegion | null = null;
  private prevHomeland: HomelandRegion | null = null;
  private homelandFadeStartTime: number = 0;
  private homelandRevealStartTime: number = 0;
  private homelandFadeDuration: number = 220;
  private homelandTransitioning: boolean = false;
  private atlasVisibleRegions: string[] = [];
  private hoveredRegionId: string | null = null;
  private isAtlasMode: boolean = false;
  private targetYaw: number | null = null;
  private targetPitch: number | null = null;
  private startYaw: number = 0;
  private startPitch: number = 0;
  private yawDelta: number = 0;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 800;
  private startZoom: number = 1.0;
  private targetZoom: number | null = null;
  private isUserDragging: boolean = false;
  private lastDragEndTime: number = 0;
  private ambientRotationSpeed: number = 0.035;

  // Inertial momentum & ease-out physics
  private dragVelocityYaw: number = 0;
  private dragVelocityPitch: number = 0;
  private lastDragMoveTime: number = 0;
  private isInertiaActive: boolean = false;
  public onRotationChange?: () => void;

  private uniforms = new PIXI.UniformGroup({
    uYaw:              { value: 0.0,   type: 'f32' },
    uPitch:            { value: 0.08,  type: 'f32' },
    uPoliticalStrength:{ value: 0.40,  type: 'f32' },
    uMorph:            { value: 0.0,   type: 'f32' },
    uTime:             { value: 0.0,   type: 'f32' },
    uGlobeCenterX:     { value: 0.0,   type: 'f32' },
    uGlobeCenterY:     { value: 0.0,   type: 'f32' },
    uGlobeRadius:      { value: 240.0, type: 'f32' },
    uFlatFocalX:       { value: 512.0, type: 'f32' },
    uFlatFocalY:       { value: 256.0, type: 'f32' },
    uFlatScale:        { value: 1.0,   type: 'f32' },
    uVpHalfW:          { value: 0.0,   type: 'f32' },
    uVpHalfH:          { value: 0.0,   type: 'f32' },
  });

  constructor(
    private readonly ownerIdTexture: PoliticalOwnerIdTexture,
    private readonly paletteTexture: PoliticalPaletteTexture,
    private readonly colorTexture: PoliticalColorTexture,
  ) {
    this.container.label = 'GlobeMode';
    this.container.visible = false;
    this.sunSprite = new PIXI.Sprite(this.ensureSunTexture());
    this.sunSprite.anchor.set(0.5, 0.5);
    this.sunSprite.visible = false;
    this.nebulaSprite = new PIXI.Sprite(this.ensureNebulaTexture());
    this.nebulaSprite.anchor.set(0.5, 0.5);
    this.nebulaSprite.visible = false;
    this.container.addChild(this.nebulaSprite, this.shell, this.sunSprite, this.coastlineDiagnostic, this.homelandLayer);
    this.flatCoastlineDiagnostic.label = 'CoastlineDiagnosticFlat';
    this.flatCoastlineDiagnostic.visible = false;
  }

  public init(): void {
    // Dense tessellated mesh; each vertex carries a geographic UV.
    // The vertex shader morphs gl_Position between flat-map and globe.
    const columns = 96;
    const rows = 48;
    const positions: number[] = [];
    const geoUVs: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      for (let col = 0; col <= columns; col++) {
        const u = col / columns;
        positions.push(u * 2 - 1, v * 2 - 1);
        geoUVs.push(u, v);
      }
    }
    const stride = columns + 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const a = row * stride + col;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }

    const geometry = new PIXI.MeshGeometry({
      positions: new Float32Array(positions),
      uvs: new Float32Array(geoUVs),
      indices: new Uint32Array(indices),
    });

    // ------------------------------------------------------------------
    // VERTEX SHADER
    // aUV = geographic UV (u=longitude/2π offset, v=latitude/π offset)
    // Computes flat-screen NDC and globe-orthographic NDC, morphs between.
    // ------------------------------------------------------------------
    const vertex = `
      attribute vec2 aPosition;
      attribute vec2 aUV;

      uniform float uYaw;
      uniform float uPitch;
      uniform float uMorph;
      uniform float uGlobeCenterX;
      uniform float uGlobeCenterY;
      uniform float uGlobeRadius;
      uniform float uFlatFocalX;
      uniform float uFlatFocalY;
      uniform float uFlatScale;
      uniform float uVpHalfW;
      uniform float uVpHalfH;

      varying vec2 vGeoUV;
      varying float vGlobeZ;
      varying vec3 vGlobeNorm;

      const float PI = 3.14159265;
      const float TWO_PI = 6.28318530;

      void main() {
        vGeoUV = aUV;

        float lon = (aUV.x - 0.5) * TWO_PI;
        float lat = (0.5 - aUV.y) * PI;

        // ---- Flat projection ----
        float worldX = aUV.x * 1024.0;
        float worldY = aUV.y * 512.0;
        float flatPxX = (worldX - uFlatFocalX) * uFlatScale + uGlobeCenterX;
        float flatPxY = (worldY - uFlatFocalY) * uFlatScale + uGlobeCenterY;
        vec2 flatNDC = vec2(
          (flatPxX / uVpHalfW) - 1.0,
          1.0 - (flatPxY / uVpHalfH)
        );

        // ---- Globe orthographic projection ----
        vec3 p = vec3(
          cos(lat) * sin(lon),
          sin(lat),
          cos(lat) * cos(lon)
        );
        // Yaw
        float cy = cos(uYaw), sy = sin(uYaw);
        p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
        // Pitch
        float cp = cos(uPitch), sp = sin(uPitch);
        p = vec3(p.x, cp * p.y - sp * p.z, sp * p.y + cp * p.z);

        vGlobeZ = p.z;
        vGlobeNorm = p;

        float globePxX = uGlobeCenterX + p.x * uGlobeRadius;
        float globePxY = uGlobeCenterY - p.y * uGlobeRadius;
        vec2 globeNDC = vec2(
          (globePxX / uVpHalfW) - 1.0,
          1.0 - (globePxY / uVpHalfH)
        );

        float m = clamp(uMorph, 0.0, 1.0);

        gl_Position = vec4(mix(flatNDC, globeNDC, m), 0.0, 1.0);
      }
    `;

    // ------------------------------------------------------------------
    // FRAGMENT SHADER
    // Samples textures using the single geographic UV vGeoUV.
    // Staged horizon discard + directional planetary limb + ultra-subtle cloud wisps.
    // ------------------------------------------------------------------
    const fragment = `
      precision highp float;
      varying vec2 vGeoUV;
      varying float vGlobeZ;
      varying vec3 vGlobeNorm;

      uniform sampler2D uWorldReliefTexture;
      uniform sampler2D uWorldBathymetryTexture;
      uniform sampler2D uPoliticalColorTexture;
      uniform float uPoliticalStrength;
      uniform float uMorph;
      uniform float uTime;

      void main() {
        float m = clamp(uMorph, 0.0, 1.0);

        // Staged horizon discard: world gently wraps without sudden cutting
        float zCutoff = mix(-2.0, -0.01, smoothstep(0.40, 0.95, m));
        if (vGlobeZ < zCutoff) discard;

        vec2 uv = vGeoUV;
        vec4 relief = texture2D(uWorldReliefTexture, uv);
        vec4 bathy  = texture2D(uWorldBathymetryTexture, uv);
        vec3 color;

        if (relief.a > 0.05) {
          vec4 factionColor   = texture2D(uPoliticalColorTexture, uv);
          float lum           = dot(relief.rgb, vec3(0.299, 0.587, 0.114));
          float shading       = 0.74 + lum * 0.50;

          // Natural planetary terrain enhancement (+8-10% natural palette presence)
          // Forest/vegetation natural greens in temperate latitudes, warm stone/sand in arid belts, crisp neutral relief for highlands
          float lat = abs(uv.y - 0.5) * 2.0;
          vec3 lushForest = vec3(0.12, 0.22, 0.13) * (0.85 + 0.35 * lum);
          vec3 aridStone  = vec3(0.30, 0.24, 0.16) * (0.80 + 0.40 * lum);
          vec3 alpinePeak = vec3(0.36, 0.38, 0.41) * (0.75 + 0.45 * lum);

          vec3 biomeTint = mix(aridStone, lushForest, smoothstep(0.10, 0.52, lat) * (1.0 - smoothstep(0.65, 0.88, lat)));
          if (lum > 0.65) {
            biomeTint = mix(biomeTint, alpinePeak, smoothstep(0.65, 0.90, lum));
          }

          vec3 naturalTerrain = mix(relief.rgb, biomeTint, 0.15);
          vec3 neutral        = mix(vec3(lum * 0.86), naturalTerrain, 0.48) * shading;

          if (factionColor.a > 0.01 && uPoliticalStrength > 0.001) {
            vec3 political    = factionColor.rgb * shading;
            float spot        = factionColor.a;
            color = mix(neutral, political, clamp(spot, 0.28, 1.0) * uPoliticalStrength);
            if (spot > 0.96) color = mix(color, vec3(0.97, 0.99, 1.0), 0.07 * uPoliticalStrength);
          } else {
            color = neutral;
          }
        } else {
          float depth = bathy.r;
          color = mix(vec3(0.016, 0.067, 0.106), vec3(0.043, 0.173, 0.216),
                      smoothstep(0.18, 0.92, depth));
          color *= 0.96 + 0.05 * bathy.b;
        }

        // Globe limb shading & physical directional planetary atmosphere
        if (m > 0.1) {
          float z = clamp(vGlobeZ, 0.0, 1.0);
          color *= mix(1.0, 0.72 + 0.28 * pow(z, 0.45), m);

          // Directional solar surface shading: sun coming from upper-right
          // Globe normal in view space: vGlobeNorm = (x, y, z)
          // Sun direction in view space: upper-right = (+x, +y, +z)
          // We brighten sun-facing surfaces, darken opposite side
          vec3 sunDir3D = normalize(vec3(0.62, 0.58, 0.52)); // upper-right, slightly toward camera
          float sunDot = clamp(dot(normalize(vGlobeNorm), sunDir3D), 0.0, 1.0);
          // Terminator: smooth transition from lit to dark
          float terminator = smoothstep(0.0, 0.55, sunDot);
          // Lit side: up to +22% brightness boost; dark side: down to 68% darkness
          float surfaceBrightness = mix(0.68, 1.22, terminator);
          color *= mix(1.0, surfaceBrightness, m * 0.85);

          // Directional solar scattering: celestial light from upper-right (vector (0.65, 0.62))
          if (m > 0.6) {
            float sunFacing = clamp(dot(normalize(vGlobeNorm.xy), normalize(vec2(0.65, 0.62))), 0.0, 1.0);
            float limbGlow = pow(1.0 - z, 3.4) * smoothstep(0.70, 1.0, m);

            // Sunlit limb side receives rich forward scatter; night limb fades softly into dark space
            vec3 sunLitAtmosphere = vec3(0.45, 0.78, 1.0) * (0.12 + 0.88 * pow(sunFacing, 2.0));
            vec3 darkSideAtmosphere = vec3(0.04, 0.10, 0.18);
            vec3 atmosphereColor = mix(darkSideAtmosphere, sunLitAtmosphere, sunFacing);

            color += atmosphereColor * limbGlow * 0.42;

            // Ultra-restrained slow procedural cloud wisps
            if (m > 0.8) {
              float cloudPhase = uTime * 0.02;
              float c1 = sin(uv.x * 28.0 + cloudPhase) * cos(uv.y * 20.0 - cloudPhase * 0.4);
              float c2 = sin(uv.x * 56.0 - uv.y * 28.0 + cloudPhase * 1.1);
              float clouds = smoothstep(0.40, 0.88, c1 * 0.65 + c2 * 0.35);
              float cloudAlpha = clouds * 0.06 * smoothstep(0.8, 1.0, m);
              color = mix(color, vec3(0.92, 0.96, 1.0), cloudAlpha);
            }
          }
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const shader = PIXI.Shader.from({
      gl: { vertex, fragment },
      resources: {
        uGlobeUniforms: this.uniforms,
        uWorldReliefTexture: worldReliefTexture.source,
        uWorldBathymetryTexture: worldBathymetryTexture.source,
        uPoliticalColorTexture: this.colorTexture.source,
        uPoliticalOwnerIdTexture: this.ownerIdTexture.source,
        uPoliticalPaletteTexture: this.paletteTexture.source,
      },
    } as any);
    this.mesh = new PIXI.Mesh({ geometry, shader });
    this.mesh.blendMode = 'normal';
    this.mesh.position.set(0, 0);
    this.container.removeChildren();
    if (this.nebulaSprite) this.container.addChild(this.nebulaSprite);
    this.container.addChild(this.shell);
    if (this.sunSprite) this.container.addChild(this.sunSprite);
    this.container.addChild(this.mesh);
    this.container.addChild(this.homelandLayer);
    this.container.addChild(this.coastlineDiagnostic);
    this.resize(window.innerWidth, window.innerHeight);
  }

  private syncUniforms(): void {
    const u = this.uniforms.uniforms as any;
    u.uYaw = this.yaw;
    u.uPitch = this.pitch;
    u.uGlobeCenterX = this.center.x;
    u.uGlobeCenterY = this.center.y;
    u.uGlobeRadius = this.radius;
    u.uFlatFocalX = this.focalWorldX;
    u.uFlatFocalY = this.focalWorldY;
    u.uFlatScale = this.flatScale;
    u.uVpHalfW = this.vpHalfW;
    u.uVpHalfH = this.vpHalfH;
    u.uMorph = this.morph;
    u.uTime = performance.now() * 0.001;
  }

  public setFlatReference(focalWorldX: number, focalWorldY: number, scale: number): void {
    this.focalWorldX = focalWorldX;
    this.focalWorldY = focalWorldY;
    this.flatScale = Math.max(0.001, scale);
    this.syncUniforms();
  }

  public setActive(active: boolean): void {
    this.visible = active;
    this.container.visible = active;
    if (active) this.resize(window.innerWidth, window.innerHeight);
  }

  public resize(width: number, height: number): void {
    this.vpHalfW = width * 0.5;
    this.vpHalfH = height * 0.5;
    const baseRadius = Math.max(100, Math.min(width * 0.38, height * 0.39));
    this.radius = baseRadius * this.userZoom;
    const biasX = (this.isAtlasMode && width >= 1024) ? 0.36 : 0.5;
    const biasY = (this.isAtlasMode && width < 768) ? 0.35 : 0.52;
    this.center = { x: width * biasX, y: height * biasY };

    this.updateShell();
    this.syncUniforms();
  }

  private starCatalog: Array<{
    x: number;
    y: number;
    r: number;
    a: number;
    c: number;
    freq: number;
    phase: number;
    halo?: boolean;
  }> = [];

  private ensureStarCatalog(): void {
    if (this.starCatalog.length > 0) return;
    let s = 987654321;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

    // Stellar spectral color palette (physically grounded blackbody colors)
    const colors = [
      0xffffff, // Pure diamond white (Class A)
      0xf8fafc, // Near white
      0xdbeafe, // Pale icy blue (Class B)
      0xbfdbfe, // Soft sky blue (Class O)
      0xfef9c3, // Warm ivory (Class F)
      0xfef08a, // Solar pale gold (Class G)
    ];

    // --- 96 pin-sharp background stars (~1px) ---
    for (let i = 0; i < 96; i++) {
      const x = (rnd() - 0.5) * 2.2;
      const y = (rnd() - 0.5) * 2.2;
      const magRoll = rnd();
      let r: number;
      let a: number;
      let cIdx: number;

      if (magRoll < 0.92) {
        // Vast majority: ~1px tiny pin-sharp stars with very low brightness
        r = 0.45 + rnd() * 0.25;
        a = 0.12 + rnd() * 0.14;
        cIdx = rnd() < 0.75 ? 0 : Math.floor(rnd() * colors.length);
      } else {
        // A few slightly larger navigational stars (still no blob glow)
        r = 0.75 + rnd() * 0.18;
        a = 0.38 + rnd() * 0.16;
        cIdx = Math.floor(rnd() * colors.length);
      }

      this.starCatalog.push({
        x, y, r, a,
        c: colors[cIdx],
        freq: 0.0006 + rnd() * 0.0016,
        phase: rnd() * Math.PI * 2,
        halo: false
      });
    }

    // --- 10 accent navigational stars (1.5–2.4px) scattered away from sun ---
    // Sun is at roughly (cx + r*0.70, cy - r*0.70), i.e. upper-right quadrant.
    // Accent stars are placed in the opposite (lower-left) region so they don't
    // compete with the sun bloom, and 2–3 bright ones elsewhere for depth.
    const accentPositions = [
      // lower-left deep space region
      { x: -0.68, y:  0.52 }, { x: -0.80, y:  0.30 }, { x: -0.55, y:  0.72 },
      { x: -0.90, y:  0.60 }, { x: -0.72, y:  0.80 },
      // upper-left and upper fringe
      { x: -0.62, y: -0.48 }, { x: -0.40, y: -0.70 },
      // right / bottom fringe (not overlapping sun)
      { x:  0.82, y:  0.55 }, { x:  0.50, y:  0.75 }, { x: -0.20, y:  0.88 },
    ];
    const accentColors = [0xffffff, 0xfef9c3, 0xdbeafe, 0xbfdbfe, 0xfef08a, 0xf8fafc, 0xffffff, 0xdbeafe, 0xfef9c3, 0xffffff];
    for (let i = 0; i < accentPositions.length; i++) {
      this.starCatalog.push({
        x: accentPositions[i].x,
        y: accentPositions[i].y,
        r: 1.1 + rnd() * 1.3, // 1.1 – 2.4px
        a: 0.55 + rnd() * 0.30,
        c: accentColors[i % accentColors.length],
        freq: 0.0004 + rnd() * 0.0008,
        phase: rnd() * Math.PI * 2,
        halo: false
      });
    }
  }

  private ensureSunTexture(): PIXI.Texture {
    if (!this.sunTexture) {
      const size = 2048;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);

      // Core radius calibrated so sunDim * (coreR / size) stays identical to previous physical core size
      const coreR = size * 0.0130; // ~26.6px
      const innerBloomR = coreR * 2.5; // ~66.5px (2.5x core)
      const midCoronaR = coreR * 4.6; // ~122.4px (4.6x core)
      const outerScatterR = coreR * 8.5; // ~226.1px (8.5x core)

      // 1. Broad continuous outer scatter & multi-tier corona
      const scatterGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerScatterR);
      scatterGrad.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)');
      scatterGrad.addColorStop(0.07, 'rgba(255, 252, 235, 0.96)'); // Core edge: warm white
      scatterGrad.addColorStop(0.14, 'rgba(255, 248, 220, 0.58)'); // Inner bloom: warm ivory
      scatterGrad.addColorStop(0.26, 'rgba(254, 243, 199, 0.25)'); // Inner-mid transition
      scatterGrad.addColorStop(0.46, 'rgba(253, 230, 138, 0.080)'); // Mid corona: very pale amber
      scatterGrad.addColorStop(0.68, 'rgba(245, 158, 11, 0.022)'); // Soft outer warm glow
      scatterGrad.addColorStop(0.86, 'rgba(219, 234, 254, 0.005)'); // Barely perceptible outer scatter
      scatterGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = scatterGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, outerScatterR, 0, Math.PI * 2);
      ctx.fill();

      // 2. 12 Very Soft Coronal Rays (feathered, non-sharp, low opacity 0.025-0.085)
      // 4 short (130-170px), 5 medium (210-300px), 3 long (380-490px)
      const raySpecs = [
        { angle: 0.18, len: 240, width: 28, alpha: 0.065 }, // medium
        { angle: 0.65, len: 440, width: 36, alpha: 0.085 }, // long (peak ~0.085)
        { angle: 1.12, len: 150, width: 24, alpha: 0.045 }, // short
        { angle: 1.58, len: 270, width: 30, alpha: 0.060 }, // medium
        { angle: 2.15, len: 140, width: 22, alpha: 0.038 }, // short
        { angle: 2.68, len: 490, width: 38, alpha: 0.090 }, // long
        { angle: 3.22, len: 260, width: 32, alpha: 0.070 }, // medium
        { angle: 3.75, len: 160, width: 26, alpha: 0.040 }, // short
        { angle: 4.28, len: 420, width: 34, alpha: 0.080 }, // long
        { angle: 4.82, len: 230, width: 28, alpha: 0.055 }, // medium
        { angle: 5.34, len: 140, width: 22, alpha: 0.035 }, // short
        { angle: 5.86, len: 280, width: 30, alpha: 0.065 }, // medium
      ];

      for (const ray of raySpecs) {
        const cosA = Math.cos(ray.angle);
        const sinA = Math.sin(ray.angle);
        const steps = 18;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const dist = ray.len * t;
          const currentX = cx + cosA * dist;
          const currentY = cy + sinA * dist;

          const curHalfW = (ray.width * 0.5) * (1.0 - t * 0.60);
          const longAlpha = ray.alpha * Math.pow(1.0 - t, 1.5);

          const rGrad = ctx.createRadialGradient(
            currentX, currentY, 0,
            currentX, currentY, curHalfW
          );
          rGrad.addColorStop(0.0, `rgba(255, 253, 238, ${longAlpha.toFixed(4)})`);
          rGrad.addColorStop(0.4, `rgba(254, 240, 138, ${(longAlpha * 0.55).toFixed(4)})`);
          rGrad.addColorStop(0.75, `rgba(245, 158, 11, ${(longAlpha * 0.15).toFixed(4)})`);
          rGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

          ctx.fillStyle = rGrad;
          ctx.beginPath();
          ctx.arc(currentX, currentY, curHalfW, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Inner Bloom: Warm Ivory smooth falloff (2.5x core radius)
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerBloomR);
      innerGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.98)');
      innerGrad.addColorStop(0.35, 'rgba(255, 252, 235, 0.75)');
      innerGrad.addColorStop(0.70, 'rgba(254, 243, 199, 0.28)');
      innerGrad.addColorStop(1.00, 'rgba(253, 230, 138, 0.00)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, innerBloomR, 0, Math.PI * 2);
      ctx.fill();

      // 4. Central Photosphere Core: Crisp, authentic pale warm gold/white disc
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)');
      coreGrad.addColorStop(0.60, 'rgba(255, 254, 245, 0.98)');
      coreGrad.addColorStop(0.88, 'rgba(254, 249, 195, 0.85)');
      coreGrad.addColorStop(1.00, 'rgba(254, 240, 138, 0.20)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      this.sunTexture = PIXI.Texture.from(canvas);
    }
    return this.sunTexture;
  }

  private ensureNebulaTexture(): PIXI.Texture {
    if (!this.nebulaTexture) {
      const w = 1536;
      const h = 864;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, w, h);

      // 1. Dark cosmic structural haze (ultra-low opacity petrol/navy — provides deep space depth)
      const hazeNodes = [
        { x: 0.22, y: 0.25, rx: 520, ry: 260, rot: -0.52, c: 'rgba(3, 18, 32, 0.035)' },
        { x: 0.50, y: 0.50, rx: 620, ry: 300, rot: -0.48, c: 'rgba(2, 12, 22, 0.028)' },
        { x: 0.78, y: 0.72, rx: 500, ry: 240, rot: -0.44, c: 'rgba(4, 16, 28, 0.030)' },
      ];

      for (const g of hazeNodes) {
        ctx.save();
        ctx.translate(g.x * w, g.y * h);
        ctx.rotate(g.rot);
        ctx.scale(g.rx, g.ry);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0.0, g.c);
        grad.addColorStop(0.60, g.c.replace(/[\d\.]+\)$/, '0.012)'));
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Very faint whisper-level nebula wisps (barely perceptible; pure atmosphere, not purple clouds)
      // Located in lower-left and upper-right far regions — away from the sun.
      const nebulaWisps = [
        // Lower-left region: very faint teal-slate whisper
        { x: 0.15, y: 0.75, rx: 380, ry: 190, rot: 0.28, c: 'rgba(6, 28, 38, 0.022)' },
        // Upper-right far fringe: very faint warm indigo haze
        { x: 0.85, y: 0.18, rx: 300, ry: 150, rot: -0.18, c: 'rgba(12, 8, 32, 0.016)' },
        // Lower-center: deep space trace
        { x: 0.50, y: 0.85, rx: 420, ry: 140, rot:  0.10, c: 'rgba(4, 20, 30, 0.018)' },
      ];

      for (const g of nebulaWisps) {
        ctx.save();
        ctx.translate(g.x * w, g.y * h);
        ctx.rotate(g.rot);
        ctx.scale(g.rx, g.ry);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0.0, g.c);
        grad.addColorStop(0.45, g.c.replace(/[\d\.]+\)$/, '0.006)'));
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this.nebulaTexture = PIXI.Texture.from(canvas);
    }
    return this.nebulaTexture;
  }

  private updateShell(): void {
    this.shell.clear();
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this.morph > 0.75) {
      const mAlpha = Math.min(1.0, (this.morph - 0.75) / 0.25);
      const cx = this.center.x;
      const cy = this.center.y;
      const r = this.radius;

      // 1. Subtle Ethereal Milky Way Nebula (Deep Space Backdrop)
      if (this.nebulaSprite) {
        this.nebulaSprite.position.set(cx, cy);
        const maxDim = Math.max(w, h);
        this.nebulaSprite.width = maxDim * 1.55;
        this.nebulaSprite.height = maxDim * 1.55;
        this.nebulaSprite.rotation = performance.now() * 0.000015;
        this.nebulaSprite.alpha = 0.88 * mAlpha;
        this.nebulaSprite.visible = true;
      }

      // 2. Magnified Celestial Sun with expanded coronal halos, 14 rays, and gentle 8s solar breathing
      if (this.sunSprite) {
        const cyclePeriod = 8000; // 8-second organic solar breathing cycle
        const cycleProgress = (performance.now() / cyclePeriod) * Math.PI * 2;
        const breathingScale = 1.0 + 0.055 * Math.sin(cycleProgress); // ±5.5% ray length breathing
        const breathingAlpha = 0.95 + 0.05 * Math.cos(cycleProgress * 0.85); // ±5% ray opacity breathing

        this.sunSprite.position.set(cx + r * 0.70, cy - r * 0.70);
        const sunDim = r * 4.60 * breathingScale; // Broad atmospheric scatter while core remains exact physical size
        this.sunSprite.width = sunDim;
        this.sunSprite.height = sunDim;
        this.sunSprite.rotation = performance.now() * 0.000045; // Gentle, majestic slow turn
        this.sunSprite.alpha = breathingAlpha * mAlpha;
        this.sunSprite.visible = true;
      }

      // 3. Dark space backing disc directly behind the sphere (prevents star & nebula bleed through earth)
      this.shell.beginPath();
      this.shell.circle(cx, cy, r * 0.998)
        .fill({ color: 0x010408, alpha: mAlpha });

      // 4. Ultra-faint Planetary Rim on Night Side (Zero thick neon rings, purely physical dark limb definition)
      this.shell.beginPath();
      this.shell.circle(cx, cy, r + 0.5)
        .stroke({ color: 0x091424, width: 0.6, alpha: 0.05 * mAlpha });

      // 5. Photorealistic Solar Atmospheric Scattering & Living Drifting Light Arcs
      // Concentrated on the sunlit quadrant (upper-right: -45 deg), near-zero on the dark side.
      const sunAngle = -Math.PI / 4;
      const nowMs = performance.now();

      // Living Stratified Atmospheric Scattering Bands (3 ultra-thin layers drifting at different slow rates: ~42s, ~56s, ~70s)
      // These appear as whisper-thin, physical gas layers illuminated by the Sun behind the globe limb.
      const driftBands = [
        { rOfs: 1.5, w: 0.8, color: 0xfef9c3, baseA: 0.24, period: 42000, dir: 1,  waveF: 3 }, // Pale solar ivory
        { rOfs: 2.8, w: 1.1, color: 0x38bdf8, baseA: 0.18, period: 56000, dir: -1, waveF: 4 }, // Ethereal sky-cyan
        { rOfs: 4.0, w: 0.7, color: 0x1e40af, baseA: 0.12, period: 70000, dir: 1,  waveF: 2 }, // Deep twilight azure
      ];

      const numArcSteps = 48;
      const dArcTheta = (Math.PI * 2) / numArcSteps;

      for (const band of driftBands) {
        const driftPhase = (nowMs / band.period) * Math.PI * 2 * band.dir;
        const bRadius = r + band.rOfs;

        for (let i = 0; i < numArcSteps; i++) {
          const a1 = i * dArcTheta;
          const a2 = a1 + dArcTheta;
          const midA = a1 + dArcTheta * 0.5;

          // Angular distance to sun direction
          let diffA = midA - sunAngle;
          while (diffA > Math.PI) diffA -= Math.PI * 2;
          while (diffA < -Math.PI) diffA += Math.PI * 2;

          // Forward scattering concentration: high near sun, zero on night side
          const cosDiff = Math.cos(diffA);
          if (cosDiff <= 0.05) continue; // Virtually zero on dark side

          // Non-linear forward-scatter peak (sunlit limb)
          const sunLimbWeight = Math.pow(Math.max(0, cosDiff), 2.4);
          // Very subtle organic wave breathing (35-70s drift cycle)
          const organicDrift = 0.84 + 0.16 * Math.sin(band.waveF * midA + driftPhase);
          const arcAlpha = band.baseA * sunLimbWeight * organicDrift * mAlpha;

          if (arcAlpha > 0.005) {
            this.shell.beginPath();
            this.shell.arc(cx, cy, bRadius, a1, a2);
            this.shell.stroke({ color: band.color, width: band.w, alpha: arcAlpha });
          }
        }
      }

      // Base directional limb scattering arcs (4 focused physical layers directly on the sun horizon)
      const totalSpan = 2.10; // ~120 degrees of focused solar horizon arc
      const a_start = sunAngle - totalSpan * 0.5;
      const numSegments = 36;
      const dTheta = totalSpan / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const th1 = a_start + i * dTheta;
        const th2 = th1 + dTheta;
        const p = (i + 0.5) / numSegments; // 0.0 -> 1.0
        const sinP = Math.sin(p * Math.PI);
        const taperCubic = sinP * sinP * sinP; // Steep directional concentration toward the Sun

        // Layer 1: Exospheric Soft Azure Haze (3.6px close to limb)
        const r_exo = r + 3.6;
        this.shell.beginPath();
        this.shell.moveTo(cx + Math.cos(th1) * r_exo, cy + Math.sin(th1) * r_exo);
        this.shell.arc(cx, cy, r_exo, th1, th2);
        this.shell.stroke({ color: 0x1e40af, width: 3.2, alpha: (0.16 * taperCubic) * mAlpha });

        // Layer 2: Mesospheric Deep Electric Blue (2.2px)
        const r_meso = r + 2.2;
        this.shell.beginPath();
        this.shell.moveTo(cx + Math.cos(th1) * r_meso, cy + Math.sin(th1) * r_meso);
        this.shell.arc(cx, cy, r_meso, th1, th2);
        this.shell.stroke({ color: 0x2563eb, width: 1.8, alpha: (0.36 * taperCubic) * mAlpha });

        // Layer 3: Stratospheric Luminous Sky-Cyan Rayleigh Arc (1.2px)
        const r_strato = r + 1.2;
        this.shell.beginPath();
        this.shell.moveTo(cx + Math.cos(th1) * r_strato, cy + Math.sin(th1) * r_strato);
        this.shell.arc(cx, cy, r_strato, th1, th2);
        this.shell.stroke({ color: 0x38bdf8, width: 1.1, alpha: (0.64 * taperCubic) * mAlpha });

        // Layer 4: Brilliant Blue-White Forward-Scatter Razor (0.8px directly on sun-facing limb)
        const r_razor = r + 0.4;
        this.shell.beginPath();
        this.shell.moveTo(cx + Math.cos(th1) * r_razor, cy + Math.sin(th1) * r_razor);
        this.shell.arc(cx, cy, r_razor, th1, th2);
        this.shell.stroke({ color: 0xf8fafc, width: 0.8, alpha: (0.92 * taperCubic) * mAlpha });
      }

      // 6. Photorealistic Pin-Sharp Starfield (pin-sharp + a few larger accent stars)
      // Stars near the sun direction (upper-right) are dimmed by sun glow proximity.
      // Stars away from the sun (lower-left) are slightly brighter.
      this.ensureStarCatalog();
      const now = performance.now();
      // Sun is at approximate normalized position (0.70, -0.70) from globe center in screen space.
      // In the star-catalog coordinate system (x/y range ±1.1), sun direction is (0.58, -0.58).
      const sunDirX = 0.58;
      const sunDirY = -0.58;

      for (const s of this.starCatalog) {
        const sx = cx + s.x * (w * 0.54);
        const sy = cy + s.y * (h * 0.54);
        const dist = Math.hypot(sx - cx, sy - cy);
        if (dist > r * 1.015) {
          const twinkle = 0.86 + 0.14 * Math.sin(now * s.freq + s.phase);

          // Sun proximity dimming: stars close to sun direction get dimmed (sun washes them out)
          // Stars far from sun (opposite side) remain at full brightness or slightly enhanced
          const dotSun = (s.x * sunDirX + s.y * sunDirY) /
            (Math.hypot(s.x, s.y) * Math.hypot(sunDirX, sunDirY) + 0.001);
          // dotSun ∈ [-1, 1]: +1 = toward sun, -1 = away from sun
          // Near sun: dim 0.35×; opposite side: keep 1.0× or slightly brighter
          const sunProximity = Math.max(0.0, dotSun); // 0 to 1
          const sunDimFactor = 1.0 - sunProximity * 0.62; // 0.38–1.0
          // Subtle dark-side boost for stars opposite the sun (deep space feel)
          const darkSideBoost = Math.max(0.0, -dotSun) * 0.18; // up to +0.18 brightness

          const currentAlpha = s.a * twinkle * mAlpha * sunDimFactor + darkSideBoost * mAlpha;

          // Pin-sharp stellar core
          this.shell.beginPath();
          this.shell.circle(sx, sy, s.r).fill({ color: s.c, alpha: Math.min(0.95, currentAlpha) });
        }
      }
    } else {
      if (this.sunSprite) this.sunSprite.visible = false;
      if (this.nebulaSprite) this.nebulaSprite.visible = false;
    }
  }

  public rotate(dx: number, dy: number): void {
    const now = performance.now();
    this.isUserDragging = true;
    this.isInertiaActive = false;
    this.targetYaw = null;
    this.targetPitch = null;
    this.targetZoom = null;

    const dYaw = dx / Math.max(180, this.radius);
    const dPitch = dy / Math.max(180, this.radius);

    this.yaw += dYaw;
    const polarLimit = Math.PI / 2 - 0.018;
    this.pitch = Math.max(-polarLimit, Math.min(polarLimit, this.pitch + dPitch));

    // Measure delta time to compute smooth instantaneous release momentum
    if (this.lastDragMoveTime > 0) {
      const dt = Math.max(1, now - this.lastDragMoveTime);
      if (dt < 120) {
        // Exponential smoothing of drag velocity normalized to ~60fps step (16.67ms)
        const instantVelYaw = (dYaw / dt) * 16.67;
        const instantVelPitch = (dPitch / dt) * 16.67;
        this.dragVelocityYaw = this.dragVelocityYaw * 0.35 + instantVelYaw * 0.65;
        this.dragVelocityPitch = this.dragVelocityPitch * 0.35 + instantVelPitch * 0.65;
      } else {
        this.dragVelocityYaw = 0;
        this.dragVelocityPitch = 0;
      }
    } else {
      this.dragVelocityYaw = dYaw;
      this.dragVelocityPitch = dPitch;
    }
    this.lastDragMoveTime = now;

    this.syncUniforms();
    if (this.debugCoastline) this.redrawCoastline();
    this.onRotationChange?.();
  }

  public notifyDragEnd(): void {
    const now = performance.now();
    this.isUserDragging = false;
    this.lastDragEndTime = now;

    // If release was quick (within 90ms of last move), activate smooth ease-out inertia
    if (now - this.lastDragMoveTime < 90) {
      // Clamp maximum momentum to avoid disorienting hyper-spin
      const maxFling = 0.048;
      this.dragVelocityYaw = Math.max(-maxFling, Math.min(maxFling, this.dragVelocityYaw));
      this.dragVelocityPitch = Math.max(-maxFling * 0.6, Math.min(maxFling * 0.6, this.dragVelocityPitch));

      if (Math.hypot(this.dragVelocityYaw, this.dragVelocityPitch) > 0.0006) {
        this.isInertiaActive = true;
      } else {
        this.isInertiaActive = false;
        this.dragVelocityYaw = 0;
        this.dragVelocityPitch = 0;
      }
    } else {
      // Drag had paused before pointer release
      this.isInertiaActive = false;
      this.dragVelocityYaw = 0;
      this.dragVelocityPitch = 0;
    }
  }

  public setRotation(yaw: number, pitch: number): void {
    this.isInertiaActive = false;
    this.dragVelocityYaw = 0;
    this.dragVelocityPitch = 0;
    this.yaw = yaw;
    const polarLimit = Math.PI / 2 - 0.018;
    this.pitch = Math.max(-polarLimit, Math.min(polarLimit, pitch));
    this.syncUniforms();
    if (this.debugCoastline) this.redrawCoastline();
    this.onRotationChange?.();
  }

  public getRotation(): [number, number] {
    return [this.yaw, this.pitch];
  }

  public setPoliticalStrength(strength: number): void {
    (this.uniforms.uniforms as any).uPoliticalStrength = Math.max(0.0, Math.min(1.0, strength));
  }

  public rotateToLocation(lonDeg: number, latDeg: number, durationMs: number = 800, targetZoom?: number): void {
    this.isInertiaActive = false;
    this.dragVelocityYaw = 0;
    this.dragVelocityPitch = 0;
    const targetLonRad = (lonDeg * Math.PI) / 180;
    const targetLatRad = (latDeg * Math.PI) / 180;
    const tYaw = -targetLonRad;
    const polarLimit = Math.PI / 2 - 0.05;
    // Artistic camera framing: bias pitch slightly (-0.12 rad ~ 7 deg) so homeland
    // is framed higher in the upper/mid open quadrant of the globe, clear above the bottom UI capsule!
    const tPitch = Math.max(-polarLimit, Math.min(polarLimit, targetLatRad - 0.12));

    // Shortest angular path
    const currentNorm = ((this.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const targetNorm = ((tYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let dYaw = targetNorm - currentNorm;
    if (dYaw > Math.PI) dYaw -= Math.PI * 2;
    if (dYaw < -Math.PI) dYaw += Math.PI * 2;

    this.startYaw = this.yaw;
    this.yawDelta = dYaw;
    this.startPitch = this.pitch;
    this.targetPitch = tPitch;
    this.targetYaw = tYaw;
    if (targetZoom !== undefined) {
      this.startZoom = this.userZoom;
      this.targetZoom = targetZoom;
    } else {
      this.targetZoom = null;
    }
    this.transitionDuration = Math.max(300, durationMs);
    this.transitionStartTime = performance.now();
  }

  public setHomelandAnchor(coords: { civId?: string; lon: number; lat: number; label?: string; subRegion?: string } | null): void {
    const nextRegion = coords?.civId ? HOMELAND_REGIONS[coords.civId] : null;
    const now = performance.now();
    if (nextRegion && nextRegion.civId !== this.activeHomeland?.civId) {
      this.prevHomeland = this.activeHomeland;
      this.activeHomeland = nextRegion;
      this.homelandFadeStartTime = now;
      // Start reveal animation when camera approaches homeland (~480ms into 850ms rotation)
      this.homelandRevealStartTime = now + 480;
      this.homelandTransitioning = true;
    } else if (!coords) {
      this.prevHomeland = this.activeHomeland;
      this.activeHomeland = null;
      this.homelandFadeStartTime = now;
      this.homelandRevealStartTime = now;
      this.homelandTransitioning = true;
    }
    this.homelandCoords = coords;
    this.updateHomelandHalo();
  }

  private updateHomelandHalo(): void {
    this.homelandLayer.clear();
    const beaconEl = document.getElementById('globe-start-region-beacon');

    if (!this.homelandCoords || this.morph < 0.3) {
      if (beaconEl) {
        beaconEl.style.opacity = '0';
        beaconEl.style.pointerEvents = 'none';
      }
      return;
    }

    const now = performance.now();
    const cx = this.center.x;
    const cy = this.center.y;
    const r = this.radius;

    // 1. Previous region fade-out during initial 250ms of transition
    if (this.prevHomeland) {
      const elapsedFade = now - this.homelandFadeStartTime;
      if (elapsedFade < 250) {
        const prevAlpha = Math.max(0, 1.0 - (elapsedFade / 250));
        this.renderHomelandPolygon(this.prevHomeland, prevAlpha, 1.0, 0.04);
      } else {
        this.prevHomeland = null;
      }
    }

    // 1.5 Atlas visible regions boundaries (subtle outlines for matching filtered regions)
    if (this.atlasVisibleRegions.length > 0) {
      for (const civId of this.atlasVisibleRegions) {
        if (civId === this.activeHomeland?.civId || civId === this.prevHomeland?.civId) continue;
        const reg = HOMELAND_REGIONS[civId];
        if (reg) {
          const isHovered = civId === this.hoveredRegionId;
          const alpha = isHovered ? 0.95 : 0.30;
          const wash = isHovered ? 0.035 : 0.0;
          this.renderHomelandPolygon(reg, alpha, 1.0, wash, isHovered ? 1.4 : 0.65);
        }
      }
    }

    // 2. Active homeland progressive reveal animation
    if (this.activeHomeland) {
      const elapsedReveal = now - this.homelandRevealStartTime;
      let drawProgress = 1.0;
      let washAlpha = 0.07;
      let isIgniting = false;

      if (elapsedReveal < 0) {
        // Waiting for camera to approach: no boundary yet
        drawProgress = 0.0;
        washAlpha = 0.0;
      } else if (elapsedReveal < 100) {
        // Phase 0: 0-100ms -> Centroid ignition point
        isIgniting = true;
        drawProgress = 0.0;
        washAlpha = 0.0;
      } else if (elapsedReveal < 450) {
        // Phase 1: 100-450ms (350ms) -> Boundary lines progressively draw
        drawProgress = Math.min(1.0, (elapsedReveal - 100) / 350);
        washAlpha = 0.0;
      } else if (elapsedReveal < 750) {
        // Phase 2: 450-750ms -> Surface wash expands with single gentle pulse
        drawProgress = 1.0;
        const washT = (elapsedReveal - 450) / 300;
        const singlePulse = Math.sin(washT * Math.PI) * 0.035;
        washAlpha = 0.04 + washT * 0.03 + singlePulse;
      } else {
        // Phase 3: > 750ms -> Calm, permanent resting state
        drawProgress = 1.0;
        washAlpha = 0.07;
        this.homelandTransitioning = false;
      }

      this.renderHomelandPolygon(this.activeHomeland, 1.0, drawProgress, washAlpha);

      // Centroid ignition dot on terrain during early phase
      if (isIgniting) {
        const pt = this.projectWorldLonLat(this.activeHomeland.centerLon, this.activeHomeland.centerLat);
        if (pt && Math.hypot(pt.x - cx, pt.y - cy) <= r * 0.98) {
          const rDot = 1.5 + (elapsedReveal / 100) * 3.2;
          this.homelandLayer.circle(pt.x, pt.y, rDot).fill({ color: 0xffffff, alpha: 0.95 });
        }
      }
    }

    // 3. Centroid Center Point & Clean Start Region Label
    const lon = this.homelandCoords.lon;
    const lat = this.homelandCoords.lat;
    const pt = this.projectWorldLonLat(lon, lat);
    if (!pt) {
      if (beaconEl) {
        beaconEl.style.opacity = '0';
        beaconEl.style.pointerEvents = 'none';
      }
      return;
    }

    const dCenter = Math.hypot(pt.x - cx, pt.y - cy);
    if (dCenter > r * 0.96) {
      if (beaconEl) {
        beaconEl.style.opacity = '0';
        beaconEl.style.pointerEvents = 'none';
      }
      return;
    }

    const elapsedTotal = now - this.homelandRevealStartTime;
    // Boundary stroke reveal takes 380-450ms. Region must be clearly visible first, text fades in secondarily.
    const pinAlpha = Math.min(1.0, Math.max(0.0, (elapsedTotal - 420) / 280));

    if (pinAlpha > 0.01) {
      const accentColor = this.activeHomeland?.accentColor ?? 0xdfbc73;

      // Small, refined warm gold center point light on terrain (zero radar rings, zero stems)
      this.homelandLayer.beginPath();
      this.homelandLayer.circle(pt.x, pt.y, 2.0).fill({ color: 0xfef9c3, alpha: 0.90 * pinAlpha });
      this.homelandLayer.beginPath();
      this.homelandLayer.circle(pt.x, pt.y, 4.0).stroke({ color: accentColor, width: 0.8, alpha: 0.40 * pinAlpha });

      // Clean HTML Start Region Label anchored directly on the globe surface
      if (beaconEl) {
        beaconEl.style.transform = `translate3d(${Math.round(pt.x + 10)}px, ${Math.round(pt.y - 10)}px, 0)`;
        beaconEl.style.opacity = String(pinAlpha * 0.92);
        beaconEl.style.pointerEvents = 'auto';
        const label = this.homelandCoords.label || 'Homeland';
        const sub = this.homelandCoords.subRegion || '';
        beaconEl.innerHTML = `
          <div class="beacon-tag-eyebrow">START REGION</div>
          <div class="beacon-tag-title">${label}</div>
          ${sub ? `<div class="beacon-tag-sub">/ ${sub}</div>` : ''}
        `;
      }
    }
  }

  private projectWorldLonLat(lon: number, lat: number): PIXI.Point | null {
    const worldX = ((lon + 180) / 360) * 1024;
    const worldY = ((90 - lat) / 180) * 512;
    return this.projectWorld(worldX, worldY);
  }

  private renderHomelandPolygon(region: HomelandRegion, fadeAlpha: number, drawProgress: number, washAlpha: number, strokeWidthScale: number = 1.0): void {
    if (!region.polygon || region.polygon.length < 3 || fadeAlpha <= 0.001) return;
    const accentColor = region.accentColor ?? 0xdfbc73;
    const r = this.radius;
    const cx = this.center.x;
    const cy = this.center.y;

    // Chaikin corner smoothing algorithm (2 iterations to soften polygon contours into silky curves)
    let smoothedPoly: Array<[number, number]> = region.polygon;
    for (let it = 0; it < 2; it++) {
      const nextPts: Array<[number, number]> = [];
      const n = smoothedPoly.length;
      for (let i = 0; i < n; i++) {
        const p1 = smoothedPoly[i];
        const p2 = smoothedPoly[(i + 1) % n];
        let dLon = p2[0] - p1[0];
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        const dLat = p2[1] - p1[1];
        nextPts.push(
          [p1[0] + dLon * 0.25, p1[1] + dLat * 0.25],
          [p1[0] + dLon * 0.75, p1[1] + dLat * 0.75]
        );
      }
      smoothedPoly = nextPts;
    }
    const poly = smoothedPoly;

    interface MicroSeg {
      s1: PIXI.Point;
      s2: PIXI.Point;
      zMin: number;
    }

    const segments: MicroSeg[] = [];

    // Camera space projection helper
    const toCameraSpace = (lonDeg: number, latDeg: number) => {
      const lon = (lonDeg * Math.PI) / 180;
      const lat = (latDeg * Math.PI) / 180;
      const x = Math.cos(lat) * Math.sin(lon);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.cos(lon);

      // Rotate by yaw
      const cyaw = Math.cos(this.yaw), syaw = Math.sin(this.yaw);
      const rx = cyaw * x + syaw * z;
      const rz = -syaw * x + cyaw * z;

      // Rotate by pitch
      const cpitch = Math.cos(this.pitch), spitch = Math.sin(this.pitch);
      const ry = cpitch * y - spitch * rz;
      const finalZ = spitch * y + cpitch * rz;

      return { x: rx, y: ry, z: finalZ };
    };

    // Densify polygon edges using shortest angular distance (prevent antimeridian wrap streaks)
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];

      let dLon = p2[0] - p1[0];
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      const dLat = p2[1] - p1[1];
      const steps = Math.max(4, Math.ceil(Math.hypot(dLon, dLat) / 0.8));

      for (let s = 0; s < steps; s++) {
        const t1 = s / steps;
        const t2 = (s + 1) / steps;
        const lonA = p1[0] + dLon * t1;
        const latA = p1[1] + dLat * t1;
        const lonB = p1[0] + dLon * t2;
        const latB = p1[1] + dLat * t2;

        const vA = toCameraSpace(lonA, latA);
        const vB = toCameraSpace(lonB, latB);

        // Strict horizon culling: both endpoints must be safely visible on front hemisphere
        if (vA.z <= 0.04 || vB.z <= 0.04) continue;

        const s1 = new PIXI.Point(cx + vA.x * r, cy - vA.y * r);
        const s2 = new PIXI.Point(cx + vB.x * r, cy - vB.y * r);

        // Strict disk boundary containment: NEVER render outside globe radius
        const d1 = Math.hypot(s1.x - cx, s1.y - cy);
        const d2 = Math.hypot(s2.x - cx, s2.y - cy);
        if (d1 > r * 0.995 || d2 > r * 0.995) continue;

        // Discard edge jumps across the screen (antimeridian seam crossing)
        if (Math.hypot(s2.x - s1.x, s2.y - s1.y) > r * 0.15) continue;

        segments.push({
          s1, s2,
          zMin: Math.min(vA.z, vB.z)
        });
      }
    }

    if (segments.length === 0) return;

    // Projected centroid in camera space
    const centerV = toCameraSpace(region.centerLon, region.centerLat);
    const centerFront = centerV.z > 0.05;
    const centerPt = new PIXI.Point(cx + centerV.x * r, cy - centerV.y * r);

    // Surface Wash: 5-8% opacity warm-gold fill inside visible territory
    if (washAlpha > 0.001 && centerFront && Math.hypot(centerPt.x - cx, centerPt.y - cy) <= r * 0.96) {
      for (const seg of segments) {
        this.homelandLayer.beginPath();
        this.homelandLayer.poly([centerPt, seg.s1, seg.s2])
          .fill({ color: accentColor, alpha: washAlpha * fadeAlpha * Math.min(1.0, seg.zMin * 3.0) });
      }
    }

    // Boundary Line Drawing (Smooth stroke reveal over 350-450ms)
    if (drawProgress > 0.001) {
      const drawLimit = Math.max(1, Math.floor(segments.length * drawProgress));

      // 1. Soft Golden Aura Boundary (Single batch with explicit beginPath, moveTo on any gap)
      this.homelandLayer.beginPath();
      let isDrawing = false;
      let lastPoint: PIXI.Point | null = null;
      for (let i = 0; i < drawLimit; i++) {
        const seg = segments[i];
        if (isDrawing && lastPoint && Math.hypot(seg.s1.x - lastPoint.x, seg.s1.y - lastPoint.y) < 3.0) {
          this.homelandLayer.lineTo(seg.s2.x, seg.s2.y);
        } else {
          this.homelandLayer.moveTo(seg.s1.x, seg.s1.y);
          this.homelandLayer.lineTo(seg.s2.x, seg.s2.y);
          isDrawing = true;
        }
        lastPoint = seg.s2;
      }
      this.homelandLayer.stroke({ color: accentColor, width: 2.4 * strokeWidthScale, alpha: 0.40 * fadeAlpha });

      // 2. Crisp Warm Ivory Contour (Precise 1.2px boundary, breaks on any discontinuity)
      this.homelandLayer.beginPath();
      isDrawing = false;
      lastPoint = null;
      for (let i = 0; i < drawLimit; i++) {
        const seg = segments[i];
        if (isDrawing && lastPoint && Math.hypot(seg.s1.x - lastPoint.x, seg.s1.y - lastPoint.y) < 3.0) {
          this.homelandLayer.lineTo(seg.s2.x, seg.s2.y);
        } else {
          this.homelandLayer.moveTo(seg.s1.x, seg.s1.y);
          this.homelandLayer.lineTo(seg.s2.x, seg.s2.y);
          isDrawing = true;
        }
        lastPoint = seg.s2;
      }
      this.homelandLayer.stroke({ color: 0xfef9c3, width: 1.2 * strokeWidthScale, alpha: 0.90 * fadeAlpha });

      // 3. Active Reveal Lead Spark (traveling highlight during progressive drawing)
      if (drawProgress < 0.999 && drawLimit < segments.length) {
        const tip = segments[drawLimit - 1];
        if (tip.zMin > 0.04) {
          this.homelandLayer.beginPath();
          this.homelandLayer.circle(tip.s2.x, tip.s2.y, 2.0).fill({ color: 0xffffff, alpha: 0.95 * fadeAlpha });
          this.homelandLayer.beginPath();
          this.homelandLayer.circle(tip.s2.x, tip.s2.y, 3.8).stroke({ color: 0xfef08a, width: 0.8, alpha: 0.70 * fadeAlpha });
        }
      }
    }
  }

  public setAtlasMode(active: boolean): void {
    this.isAtlasMode = active;
    this.resize(window.innerWidth, window.innerHeight);
  }

  public setAtlasVisibleRegions(civIds: string[]): void {
    this.atlasVisibleRegions = civIds;
    this.updateHomelandHalo();
  }

  public setHoveredRegion(civId: string | null): void {
    if (this.hoveredRegionId !== civId) {
      this.hoveredRegionId = civId;
      this.updateHomelandHalo();
    }
  }

  public getHomelandRegionAtScreen(screenX: number, screenY: number, candidates?: string[]): string | null {
    const world = this.screenToWorld(screenX, screenY);
    if (!world) return null;
    const lon = (world.x / 1024) * 360 - 180;
    const lat = 90 - (world.y / 512) * 180;

    const list = candidates && candidates.length > 0 ? candidates : Object.keys(HOMELAND_REGIONS);

    // 1. Precise point in polygon check
    for (const civId of list) {
      const reg = HOMELAND_REGIONS[civId];
      if (!reg || !reg.polygon || reg.polygon.length < 3) continue;
      if (this.isPointInPolygon(lon, lat, reg.polygon)) {
        return reg.civId;
      }
    }

    // 2. Proximity fallback to centroid (within ~7.5 degrees)
    let bestCiv: string | null = null;
    let bestDist = 7.5;
    for (const civId of list) {
      const reg = HOMELAND_REGIONS[civId];
      if (!reg) continue;
      let dLon = Math.abs(lon - reg.centerLon);
      if (dLon > 180) dLon = 360 - dLon;
      const dLat = Math.abs(lat - reg.centerLat);
      const dist = Math.hypot(dLon * Math.cos((reg.centerLat * Math.PI) / 180), dLat);
      if (dist < bestDist) {
        bestDist = dist;
        bestCiv = reg.civId;
      }
    }

    return bestCiv;
  }

  private isPointInPolygon(lon: number, lat: number, poly: Array<[number, number]>): boolean {
    let inside = false;
    const n = poly.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public getUserZoom(): number {
    return this.userZoom;
  }

  public setUserZoom(zoom: number): void {
    this.userZoom = Math.max(0.70, Math.min(2.10, zoom));
    const baseRadius = Math.max(100, Math.min(window.innerWidth * 0.38, window.innerHeight * 0.39));
    this.radius = baseRadius * this.userZoom;
    this.syncUniforms();
    this.updateShell();
    if (this.debugCoastline) this.redrawCoastline();
  }

  public zoom(factor: number): void {
    this.targetZoom = null;
    // Persistent userZoom: comfortable, controlled orbit (0.70 to 2.10)
    this.userZoom = Math.max(0.70, Math.min(2.10, this.userZoom * factor));
    const baseRadius = Math.max(100, Math.min(window.innerWidth * 0.38, window.innerHeight * 0.39));
    this.radius = baseRadius * this.userZoom;
    this.syncUniforms();
    this.updateShell();
    if (this.debugCoastline) this.redrawCoastline();
  }

  public renderTick(): void {
    const now = performance.now();
    if (this.visible) {
      (this.uniforms.uniforms as any).uTime = now * 0.001;

      // Handle smooth camera targeting
      if (this.targetYaw !== null && this.targetPitch !== null) {
        const elapsed = now - this.transitionStartTime;
        const t = Math.min(1.0, elapsed / Math.max(1, this.transitionDuration));
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.yaw = this.startYaw + this.yawDelta * ease;
        this.pitch = this.startPitch + (this.targetPitch - this.startPitch) * ease;
        if (this.targetZoom !== null) {
          const z = this.startZoom + (this.targetZoom - this.startZoom) * ease;
          this.setUserZoom(z);
        }
        this.syncUniforms();
        if (t >= 1.0) {
          this.yaw = (this.startYaw + this.yawDelta) % (Math.PI * 2);
          this.pitch = this.targetPitch;
          if (this.targetZoom !== null) {
            this.setUserZoom(this.targetZoom);
            this.targetZoom = null;
          }
          this.targetYaw = null;
          this.targetPitch = null;
          this.syncUniforms();
        }
        this.onRotationChange?.();
      } else if (this.isInertiaActive && !this.isUserDragging) {
        // Physical ease-out momentum / deceleration curve
        const polarLimit = Math.PI / 2 - 0.018;
        this.yaw = (this.yaw + this.dragVelocityYaw) % (Math.PI * 2);
        this.pitch = Math.max(-polarLimit, Math.min(polarLimit, this.pitch + this.dragVelocityPitch));
        this.syncUniforms();
        if (this.debugCoastline) this.redrawCoastline();
        this.onRotationChange?.();

        // Natural exponential ease-out friction (smooth glide settling to a gentle rest)
        const friction = 0.942;
        this.dragVelocityYaw *= friction;
        this.dragVelocityPitch *= friction;

        // If momentum drops below human perceptual resolution, rest gently
        if (Math.hypot(this.dragVelocityYaw, this.dragVelocityPitch) < 0.00010) {
          this.isInertiaActive = false;
          this.dragVelocityYaw = 0;
          this.dragVelocityPitch = 0;
          this.lastDragEndTime = now; // Ambient spin counter starts after inertia settles!
        }
      } else if (!this.isUserDragging && (now - this.lastDragEndTime > 3000)) {
        // Slow ambient rotation on Home, smoothly ramping up after user interaction
        const isHome = (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE';
        if (isHome && this.morph > 0.8) {
          const ramp = Math.min(1.0, (now - this.lastDragEndTime - 3000) / 2500);
          this.yaw = (this.yaw + this.ambientRotationSpeed * 0.016 * ramp) % (Math.PI * 2);
          this.syncUniforms();
          this.onRotationChange?.();
        }
      }

      this.updateShell();
      this.updateHomelandHalo();
    }
  }

  public setMorph(morph: number): void {
    this.morph = Math.max(0.0, Math.min(1.0, morph));
    this.syncUniforms();
    this.updateShell();
  }

  public getMorph(): number {
    return this.morph;
  }

  public projectWorld(x: number, y: number): PIXI.Point | null {
    const m = Math.max(0, Math.min(1, this.morph));
    const flatPt = new PIXI.Point(
      (x - this.focalWorldX) * this.flatScale + this.center.x,
      (y - this.focalWorldY) * this.flatScale + this.center.y,
    );
    if (m <= 0.01) return flatPt;

    const lon = (x / 1024) * Math.PI * 2 - Math.PI;
    const lat = Math.PI * 0.5 - (y / 512) * Math.PI;

    let p = {
      x: Math.cos(lat) * Math.sin(lon),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.cos(lon),
    };

    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    p = { x: cy * p.x + sy * p.z, y: p.y, z: -sy * p.x + cy * p.z };
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    p = { x: p.x, y: cp * p.y - sp * p.z, z: sp * p.y + cp * p.z };

    if (p.z <= 0) return null;

    const globePt = new PIXI.Point(
      this.center.x + p.x * this.radius,
      this.center.y - p.y * this.radius,
    );
    if (m >= 0.98) return globePt;

    return new PIXI.Point(
      flatPt.x * (1 - m) + globePt.x * m,
      flatPt.y * (1 - m) + globePt.y * m,
    );
  }

  public projectWorldWithDepth(x: number, y: number): { pt: PIXI.Point; z: number } | null {
    const m = Math.max(0, Math.min(1, this.morph));
    const flatPt = new PIXI.Point(
      (x - this.focalWorldX) * this.flatScale + this.center.x,
      (y - this.focalWorldY) * this.flatScale + this.center.y,
    );
    if (m <= 0.01) return { pt: flatPt, z: 1.0 };

    const lon = (x / 1024) * Math.PI * 2 - Math.PI;
    const lat = Math.PI * 0.5 - (y / 512) * Math.PI;

    let p = {
      x: Math.cos(lat) * Math.sin(lon),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.cos(lon),
    };

    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    p = { x: cy * p.x + sy * p.z, y: p.y, z: -sy * p.x + cy * p.z };
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    p = { x: p.x, y: cp * p.y - sp * p.z, z: sp * p.y + cp * p.z };

    if (p.z <= 0.01) return null;

    const globePt = new PIXI.Point(
      this.center.x + p.x * this.radius,
      this.center.y - p.y * this.radius,
    );
    if (m >= 0.98) return { pt: globePt, z: p.z };

    return {
      pt: new PIXI.Point(
        flatPt.x * (1 - m) + globePt.x * m,
        flatPt.y * (1 - m) + globePt.y * m,
      ),
      z: p.z,
    };
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } | null {
    const m = Math.max(0, Math.min(1, this.morph));
    const dx = screenX - this.center.x;
    const dy = screenY - this.center.y;

    const flatX = this.focalWorldX + dx / this.flatScale;
    const flatY = this.focalWorldY + dy / this.flatScale;

    if (m <= 0.01) {
      return {
        x: ((flatX % 1024) + 1024) % 1024,
        y: Math.max(0, Math.min(511.999, flatY)),
      };
    }

    const rawX = dx / this.radius;
    const rawY = -dy / this.radius;
    const r2 = rawX * rawX + rawY * rawY;
    if (r2 > 1) return null;

    const z = Math.sqrt(Math.max(0.0, 1.0 - r2));
    const p2 = { x: rawX, y: rawY, z };

    // Invert Pitch first: Rx(-pitch)
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const p1 = { x: p2.x, y: cp * p2.y + sp * p2.z, z: -sp * p2.y + cp * p2.z };

    // Invert Yaw second: Ry(-yaw)
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const p0 = { x: cy * p1.x - sy * p1.z, y: p1.y, z: sy * p1.x + cy * p1.z };

    const lon = Math.atan2(p0.x, p0.z);
    const lat = Math.asin(Math.max(-1, Math.min(1, p0.y)));
    const globeX = ((lon + Math.PI) / (Math.PI * 2) * 1024 + 1024) % 1024;
    const globeY = Math.max(0, Math.min(511.999, (0.5 - lat / Math.PI) * 512));

    if (m >= 0.98) return { x: globeX, y: globeY };

    const dX = ((globeX - flatX + 1536) % 1024) - 512;
    return {
      x: (((flatX + dX * m) % 1024) + 1024) % 1024,
      y: Math.max(0, Math.min(511.999, flatY * (1 - m) + globeY * m)),
    };
  }

  public screenToWorldDetailed(screenX: number, screenY: number) {
    const dx = screenX - this.center.x;
    const dy = screenY - this.center.y;
    const rawX = dx / this.radius;
    const rawY = -dy / this.radius;
    const r2 = rawX * rawX + rawY * rawY;
    if (r2 > 1.0) return null;

    const z = Math.sqrt(Math.max(0.0, 1.0 - r2));
    const p2 = { x: rawX, y: rawY, z };

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const p1 = { x: p2.x, y: cp * p2.y + sp * p2.z, z: -sp * p2.y + cp * p2.z };

    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const p0 = { x: cy * p1.x - sy * p1.z, y: p1.y, z: sy * p1.x + cy * p1.z };

    const lon = Math.atan2(p0.x, p0.z);
    const lat = Math.asin(Math.max(-1, Math.min(1, p0.y)));
    const globeX = ((lon + Math.PI) / (Math.PI * 2) * 1024 + 1024) % 1024;
    const globeY = Math.max(0, Math.min(511.999, (0.5 - lat / Math.PI) * 512));

    return {
      screenX,
      screenY,
      rayOrigin: [screenX, screenY, 0],
      rayDirection: [0, 0, 1],
      sphereIntersection: [rawX, rawY, z],
      latRad: lat,
      latDeg: (lat * 180) / Math.PI,
      lonRad: lon,
      lonDeg: (lon * 180) / Math.PI,
      visualX: globeX,
      visualY: globeY,
    };
  }

  public cancelCameraMotion(): void {
    this.targetYaw = null;
    this.targetPitch = null;
    this.targetZoom = null;
    this.isInertiaActive = false;
    this.dragVelocityYaw = 0;
    this.dragVelocityPitch = 0;
    this.lastDragEndTime = performance.now();
  }

  public setCoastlineDebug(enabled: boolean): void {
    this.debugCoastline = enabled;
    this.coastlineDiagnostic.visible = enabled;
    this.flatCoastlineDiagnostic.visible = enabled;
    if (enabled) this.redrawFlatCoastline();
    if (enabled) this.redrawCoastline();
  }

  public setFlatCamera(x: number, y: number, scale: number): void {
    this.flatCoastlineDiagnostic.position.set(x, y);
    this.flatCoastlineDiagnostic.scale.set(scale);
  }

  private redrawCoastline(): void {
    if (!this.debugCoastline) return;
    this.coastlineDiagnostic.clear();
    for (const ring of coastline as number[][][]) {
      if (ring.length < 2) continue;
      let started = false;
      for (const [x, y] of ring) {
        const p = this.projectWorld(x, y);
        if (!p) { started = false; continue; }
        if (!started) { this.coastlineDiagnostic.moveTo(p.x, p.y); started = true; }
        else this.coastlineDiagnostic.lineTo(p.x, p.y);
      }
    }
    this.coastlineDiagnostic.stroke({ color: 0x84f1ff, width: 1.2, alpha: 0.9 });
  }

  private redrawFlatCoastline(): void {
    this.flatCoastlineDiagnostic.clear();
    for (const ring of coastline as number[][][]) {
      if (ring.length < 2) continue;
      this.flatCoastlineDiagnostic.moveTo(ring[0][0], ring[0][1]);
      for (let i = 1; i < ring.length; i++) {
        this.flatCoastlineDiagnostic.lineTo(ring[i][0], ring[i][1]);
      }
    }
    this.flatCoastlineDiagnostic.stroke({ color: 0x84f1ff, width: 0.8, alpha: 0.9 });
  }

  public getState() {
    return {
      visible: this.visible,
      yaw: this.yaw,
      pitch: this.pitch,
      radius: this.radius,
      center: this.center,
      debugCoastline: this.debugCoastline,
    };
  }
}
