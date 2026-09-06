/**
 * DOMINION OF SOL — COMMAND BLADE COSMETIC SYSTEM
 * Pure cosmetic skin system for the bottom Population commitment sword instrument.
 * Zero gameplay modifiers: Commit percent math, drag physics, detents, and execution
 * remain 100% identical and authoritative.
 */

export type BladeRarity = 'standard' | 'rare' | 'epic' | 'legendary';

export interface BladeMaterialProfile {
  scabbardGrad: string[];
  brassGrad: string[];
  bladeSteelUpper: string[];
  bladeSteelLower: string[];
  bladeSpineColor: string;
  fullerColor: string;
  fullerHighlight: string;
  gripGrad: string[];
  gripRibsColor: string;
  pommelGemColor?: string;
  bladeEtchingSvg?: string;
  scabbardInlaySvg?: string;
  throatOpeningColor: string;
  sparkColor: string;
}

export interface BladeSilhouetteProfile {
  bladeTypeLabel: string;
  bladeWeightLabel: string;
  bladeCurvature: 'straight' | 'slight_curve' | 'deep_curve' | 'khopesh_hook' | 'serrated_obsidian';
  bladeLengthPx: number;
  bladeUpperPath: string;
  bladeLowerPath: string;
  bladeDropShadowPath: string;
  spinePath: string;
  cuttingEdgePath: string;
  fullerBasePath?: string;
  fullerHighlightPath?: string;
  extraBladeFeaturesSvg?: string;
  guardSvg: string;
  gripSvg: string;
  pommelSvg: string;
  scabbardBodySvg: string;
  scabbardChapeSvg: string;
  scabbardThroatSvg: string;
  heroPreviewSvg: string;
}

export interface CommandBladeSkinDescriptor {
  id: string;
  name: string;
  civilization: string;
  rarity: BladeRarity;
  entitlementSku: string;
  description: string;
  material: BladeMaterialProfile;
  silhouette: BladeSilhouetteProfile;
  subtleTrail?: string;
  drawSound?: string;
}

export const BLADE_SKINS: Record<string, CommandBladeSkinDescriptor> = {
  // =========================================================================
  // 1. UNIVERSAL — STANDARD COMMAND BLADE (Precision Military Spatha)
  // =========================================================================
  'blade_standard': {
    id: 'blade_standard',
    name: 'Standard Command Blade',
    civilization: 'Universal',
    rarity: 'standard',
    entitlementSku: 'dominion.blade.standard',
    description: 'Precision-forged military steel issued to sovereign field commanders. Cold titanium spine with double-beveled razor edge, contoured brass crossguard, and matching blued steel scabbard with brass lockets.',
    material: {
      scabbardGrad: ['#18232d', '#0f1720', '#070b0f', '#030508', '#0a1017'],
      brassGrad: ['#f4dc9e', '#cba65f', '#7d6129', '#54411b', '#af8d45'],
      bladeSteelUpper: ['#ffffff', '#e2edf6', '#a4b8c7', '#728899'],
      bladeSteelLower: ['#506575', '#32424e', '#8ba1b2', '#ffffff'],
      bladeSpineColor: '#ffffff',
      fullerColor: '#121a22',
      fullerHighlight: 'rgba(255,255,255,0.75)',
      gripGrad: ['#2a3844', '#141c24', '#0a0f14', '#1a242e'],
      gripRibsColor: '#dfbc73',
      throatOpeningColor: '#020406',
      sparkColor: '#ffea70',
    },
    silhouette: {
      bladeTypeLabel: 'Double-Edged Military Spatha',
      bladeWeightLabel: '1.05 kg · Balanced Discipline',
      bladeCurvature: 'straight',
      bladeLengthPx: 216,
      bladeUpperPath: 'M -216 27 C -204 23, -188 21.5, -170 21.5 L 0 21 L 0 27 L -216 27 Z',
      bladeLowerPath: 'M -216 27 C -204 31, -188 32.5, -170 32.5 L 0 33 L 0 27 L -216 27 Z',
      bladeDropShadowPath: 'M -216 27 C -204 32, -188 33.5, -170 33.5 L 0 34 L 0 37 C -170 36, -204 34, -216 27 Z',
      spinePath: 'M -215 27 C -203 23.2, -188 21.6, -170 21.6 L 0 21.1',
      cuttingEdgePath: 'M -215 27 C -203 30.8, -188 32.4, -170 32.4 L 0 32.9',
      fullerBasePath: 'M -175 27 L -4 27',
      fullerHighlightPath: 'M -175 27.8 L -4 27.8',
      guardSvg: `
        <path d="M -4 12 C 0 12, 5 15, 6 18 L 7 36 C 5 39, 0 42, -4 42 Z" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.5"/>
        <circle cx="1" cy="27" r="1.8" fill="#32240e"/>
      `,
      gripSvg: `
        <rect x="6" y="19" width="42" height="16" rx="2" fill="url(#grip-grad)" stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>
        <line x1="12" y1="19" x2="12" y2="35" stroke="#dfbc73" stroke-width="1.2"/>
        <line x1="18" y1="19" x2="18" y2="35" stroke="#dfbc73" stroke-width="1.2"/>
        <line x1="24" y1="19" x2="24" y2="35" stroke="#f4dc9e" stroke-width="1.5"/>
        <line x1="30" y1="19" x2="30" y2="35" stroke="#f4dc9e" stroke-width="1.5"/>
        <line x1="36" y1="19" x2="36" y2="35" stroke="#dfbc73" stroke-width="1.2"/>
        <line x1="42" y1="19" x2="42" y2="35" stroke="#dfbc73" stroke-width="1.2"/>
      `,
      pommelSvg: `
        <circle cx="53" cy="27" r="9" fill="url(#brass-grad)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <circle cx="53" cy="27" r="3" fill="#2d220f" stroke="#f4dc9e" stroke-width="0.6"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 18 L 240 18 L 240 36 L 38 36 Z" fill="url(#scabbard-grad)"/>
        <line x1="38" y1="18.5" x2="240" y2="18.5" stroke="rgba(255,255,255,0.28)" stroke-width="0.8"/>
        <line x1="38" y1="35.5" x2="240" y2="35.5" stroke="rgba(0,0,0,0.8)" stroke-width="0.8"/>
      `,
      scabbardChapeSvg: `
        <path d="M 12 27 C 12 22, 18 18, 28 18 L 40 18 L 40 36 L 28 36 C 18 36, 12 32, 12 27 Z" fill="url(#brass-grad)"/>
        <circle cx="11" cy="27" r="2.2" fill="#ca8a04"/>
      `,
      scabbardThroatSvg: `
        <path d="M 238 13.5 L 252 13.5 L 252 40.5 L 238 40.5 Z" fill="url(#brass-grad)"/>
        <rect x="248" y="18.5" width="4" height="17" fill="#020406"/>
        <circle cx="242" cy="11.5" r="3" fill="none" stroke="#ca8a04" stroke-width="1"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="std-steel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="38%" stop-color="#e2e8f0"/>
              <stop offset="50%" stop-color="#94a3b8"/>
              <stop offset="52%" stop-color="#475569"/>
              <stop offset="85%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="std-brass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="35%" stop-color="#eab308"/>
              <stop offset="70%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#713f12"/>
            </linearGradient>
            <linearGradient id="std-scabbard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="15%" stop-color="#1e293b"/>
              <stop offset="70%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#020617"/>
            </linearGradient>
          </defs>

          <!-- 1. SPATHA WEAPON (Upper Register: Center Y=26, Blade H=18px) -->
          <!-- Blade Upper Bevel -->
          <polygon points="42,26 80,17 330,17 330,26 80,26" fill="#f8fafc"/>
          <!-- Blade Lower Bevel -->
          <polygon points="42,26 330,26 330,35 80,35" fill="url(#std-steel)"/>
          <!-- Central Fuller -->
          <rect x="85" y="24.5" width="235" height="3" rx="1.5" fill="#0f172a"/>
          <line x1="86" y1="25.2" x2="319" y2="25.2" stroke="rgba(255,255,255,0.7)" stroke-width="0.8"/>
          <!-- Titanium Spine Catchlight -->
          <line x1="44" y1="26" x2="330" y2="26" stroke="#ffffff" stroke-width="0.9" opacity="0.95"/>
          <!-- Guard Contact Shadow -->
          <rect x="327" y="17" width="3" height="18" fill="rgba(0,0,0,0.45)"/>
          <!-- Brass Crossguard -->
          <rect x="330" y="8" width="12" height="36" rx="2" fill="url(#std-brass)" stroke="#fde047" stroke-width="0.6"/>
          <circle cx="336" cy="26" r="2.8" fill="#451a03"/>
          <!-- Ribbed Grip -->
          <rect x="342" y="18" width="62" height="16" rx="2" fill="#0f172a" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
          <line x1="352" y1="18" x2="352" y2="34" stroke="#ca8a04" stroke-width="1.4"/>
          <line x1="362" y1="18" x2="362" y2="34" stroke="#ca8a04" stroke-width="1.4"/>
          <line x1="372" y1="18" x2="372" y2="34" stroke="#ca8a04" stroke-width="1.4"/>
          <line x1="382" y1="18" x2="382" y2="34" stroke="#ca8a04" stroke-width="1.4"/>
          <line x1="392" y1="18" x2="392" y2="34" stroke="#ca8a04" stroke-width="1.4"/>
          <!-- Pommel -->
          <circle cx="414" cy="26" r="10" fill="url(#std-brass)" stroke="#fde047" stroke-width="0.8"/>
          <circle cx="414" cy="26" r="3.2" fill="#291605"/>

          <!-- 2. MATCHING SCABBARD (Lower Register: Center Y=70, Body H=16px) -->
          <!-- Ambient Occlusion Shadow Underneath -->
          <rect x="65" y="78" width="272" height="5" rx="2.5" fill="rgba(0,0,0,0.55)"/>
          <!-- Scabbard Body Volume -->
          <rect x="68" y="62" width="268" height="16" rx="2" fill="url(#std-scabbard)" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/>
          <!-- Upper Specular Highlight Rim -->
          <line x1="68" y1="63" x2="336" y2="63" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
          <!-- Lower Occlusion Shadow -->
          <line x1="68" y1="77" x2="336" y2="77" stroke="rgba(0,0,0,0.8)" stroke-width="0.8"/>
          <!-- Brass Chape with Finial Ball -->
          <path d="M 44 70 C 44 64, 52 62, 68 62 L 68 78 C 52 78, 44 76, 44 70 Z" fill="url(#std-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="43" cy="70" r="2.5" fill="#ca8a04"/>
          <!-- Mid Suspension Band -->
          <rect x="235" y="61" width="6" height="18" fill="url(#std-brass)" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="238" cy="59" r="2.5" fill="none" stroke="#ca8a04" stroke-width="1"/>
          <!-- Brass Throat Collar & Entry Slit -->
          <rect x="333" y="58" width="14" height="24" rx="1.5" fill="url(#std-brass)" stroke="#fde047" stroke-width="0.5"/>
          <rect x="344" y="62" width="3" height="16" fill="#020406"/>
          <circle cx="338" cy="56" r="3.2" fill="none" stroke="#ca8a04" stroke-width="1.2"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 2. TÜRK — IMPERIAL CRESCENT (Curved Yalman Kilij)
  // =========================================================================
  'blade_turk_imperial': {
    id: 'blade_turk_imperial',
    name: 'Imperial Crescent',
    civilization: 'TÜRK',
    rarity: 'legendary',
    entitlementSku: 'dominion.blade.imperial01',
    description: 'Ceremonial curved kilij steel forged for Ottoman dynastic marshals. Unmistakable +15% flared distal yalman with sharp stepped transition, solid buffalo horn grip, drooping brass quillons, and conforming oxblood scabbard.',
    material: {
      scabbardGrad: ['#4a0d14', '#2d080c', '#1a0407', '#0d0203', '#24060a'],
      brassGrad: ['#fde047', '#d97706', '#92400e', '#78350f', '#eab308'],
      bladeSteelUpper: ['#ffffff', '#fef08a', '#d4d4d8', '#a1a1aa'],
      bladeSteelLower: ['#475569', '#334155', '#94a3b8', '#f8fafc'],
      bladeSpineColor: '#fef08a',
      fullerColor: '#3b070c',
      fullerHighlight: 'rgba(253, 224, 71, 0.85)',
      gripGrad: ['#2d080c', '#1c0507', '#0d0203', '#1c0507'],
      gripRibsColor: '#fde047',
      pommelGemColor: '#dc2626',
      bladeEtchingSvg: '<path d="M 30 0 C 60 -1, 100 -2, 140 0" stroke="#fde047" stroke-width="0.8" fill="none" stroke-opacity="0.85"/>',
      throatOpeningColor: '#120204',
      sparkColor: '#f59e0b',
    },
    silhouette: {
      bladeTypeLabel: 'Curved Kilij with Flared Yalman',
      bladeWeightLabel: '0.88 kg · Distal Cleave Speed',
      bladeCurvature: 'slight_curve',
      bladeLengthPx: 216,
      // Distal yalman step at X=-120: spine steps UP to Y=17 (widening by 15%), tip rises to Y=18!
      bladeUpperPath: 'M -216 18 C -195 12, -165 13, -120 17 L -120 22 C -80 24, -40 23, 0 22 L 0 27 L -120 27 L -216 18 Z',
      bladeLowerPath: 'M -216 18 C -195 24, -160 38, -120 38 C -70 34, -30 32, 0 31 L 0 27 L -120 27 L -216 18 Z',
      bladeDropShadowPath: 'M -216 18 C -195 26, -160 40, -120 40 C -70 36, -30 33, 0 32 L 0 35 C -30 36, -70 38, -120 42 C -160 42, -195 28, -216 18 Z',
      spinePath: 'M -216 18 C -195 12.2, -165 13.2, -120 17.2 L -120 22.2 C -80 24.2, -40 23.2, 0 22.2',
      cuttingEdgePath: 'M -216 18 C -195 23.8, -160 37.6, -120 37.6 C -70 33.8, -30 31.8, 0 30.8',
      fullerBasePath: 'M -115 27 C -80 26, -40 25, -4 25',
      fullerHighlightPath: 'M -115 27.6 C -80 26.6, -40 25.6, -4 25.6',
      guardSvg: `
        <path d="M -4 8 C -1 8, 3 14, 5 18 L 6 36 C 4 40, -1 46, -4 46 C -6 46, -7 43, -5 41 L -1 35 L -1 19 L -5 13 C -7 11, -6 8, -4 8 Z" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.6"/>
        <polygon points="4,24 8,27 4,30" fill="url(#brass-grad)"/>
      `,
      gripSvg: `
        <path d="M 6 18 C 16 17, 30 18, 42 22 L 40 36 C 28 34, 16 34, 6 36 Z" fill="url(#grip-grad)" stroke="rgba(253,224,71,0.3)" stroke-width="0.7"/>
        <line x1="16" y1="18" x2="16" y2="35" stroke="#d97706" stroke-width="1.2"/>
        <line x1="26" y1="19" x2="26" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="36" y1="21" x2="36" y2="36" stroke="#d97706" stroke-width="1.2"/>
      `,
      pommelSvg: `
        <path d="M 42 22 C 48 24, 54 28, 55 35 C 55 42, 48 44, 43 42 C 40 40, 41 37, 43 38 C 46 39, 49 39, 49 35 C 49 31, 45 28, 40 27 Z" fill="url(#grip-grad)" stroke="#fde047" stroke-width="0.8"/>
        <circle cx="48" cy="35" r="2.2" fill="#d97706" stroke="#fde047" stroke-width="0.5"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 18 C 80 19, 140 23, 180 24 L 240 23 L 240 38 L 180 39 C 140 38, 80 34, 38 33 Z" fill="url(#scabbard-grad)"/>
        <path d="M 38 18.5 C 80 19.5, 140 23.5, 180 24.5 L 240 23.5" stroke="rgba(255,255,255,0.22)" stroke-width="0.8" fill="none"/>
        <path d="M 38 32.5 C 80 33.5, 140 37.5, 180 38.5 L 240 37.5" stroke="rgba(0,0,0,0.8)" stroke-width="0.8" fill="none"/>
      `,
      scabbardChapeSvg: `
        <path d="M 10 17 C 18 17, 28 20, 42 20 L 42 36 C 28 36, 18 30, 10 17 Z" fill="url(#brass-grad)"/>
      `,
      scabbardThroatSvg: `
        <path d="M 238 14 C 244 14, 250 15, 252 17 L 252 41 C 250 43, 244 44, 238 44 Z" fill="url(#brass-grad)"/>
        <rect x="248" y="19" width="4" height="20" fill="#120204"/>
        <circle cx="242" cy="11" r="3" fill="none" stroke="#d97706" stroke-width="1"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="turk-steel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="30%" stop-color="#fef08a"/>
              <stop offset="48%" stop-color="#cbd5e1"/>
              <stop offset="52%" stop-color="#64748b"/>
              <stop offset="80%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="turk-brass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="40%" stop-color="#eab308"/>
              <stop offset="75%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#854d0e"/>
            </linearGradient>
            <linearGradient id="turk-scabbard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#6b1d28"/>
              <stop offset="30%" stop-color="#4a0d14"/>
              <stop offset="70%" stop-color="#2d080c"/>
              <stop offset="100%" stop-color="#120204"/>
            </linearGradient>
            <linearGradient id="turk-horn" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#331c1e"/>
              <stop offset="50%" stop-color="#1c0709"/>
              <stop offset="100%" stop-color="#080203"/>
            </linearGradient>
          </defs>

          <!-- 1. KILIJ WEAPON (Upper Register: Center Y=26) -->
          <!-- Blade Proximal Spine (X=330 to X=175) & Distal Raised Yalman (X=175 to X=42) -->
          <!-- Yalman Step: Spine rises sharply from Y=21 up to Y=12 at X=175! -->
          <path d="M 42 16 C 65 12, 120 12, 175 12 L 175 21 C 230 22, 280 23, 330 23 L 330 27 L 175 27 L 42 16 Z" fill="#ffffff" opacity="0.95"/>
          <path d="M 42 16 L 175 27 L 330 27 L 330 35 C 270 35, 220 37, 175 37 C 125 43, 75 36, 42 16 Z" fill="url(#turk-steel)"/>
          <!-- Yalman Bevel Step Accent -->
          <line x1="175" y1="12" x2="175" y2="21" stroke="#d97706" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="175" y1="21" x2="44" y2="16" stroke="#ffffff" stroke-width="1" opacity="0.9"/>
          <!-- Proximal Fuller with Gold Inlay -->
          <path d="M 175 24 C 230 24, 280 24.5, 320 24.5" stroke="#854d0e" stroke-width="2" fill="none"/>
          <path d="M 175 24.8 C 230 24.8, 280 25.3, 320 25.3" stroke="#fef08a" stroke-width="0.8" fill="none"/>
          <!-- Gold Forte Cartouche -->
          <rect x="275" y="22" width="42" height="7" rx="1.5" fill="#ca8a04" opacity="0.6"/>
          <path d="M 280 25.5 L 312 25.5" stroke="#fef08a" stroke-width="1.2" stroke-dasharray="2 2"/>
          <!-- Guard Contact Shadow -->
          <rect x="327" y="15" width="3" height="22" fill="rgba(0,0,0,0.5)"/>
          <!-- Drooping Brass Quillons -->
          <path d="M 330 6 C 333 6, 336 12, 337 18 L 338 34 C 336 40, 333 46, 330 46 C 327 46, 326 42, 328 40 L 331 33 L 331 19 L 328 12 C 326 10, 327 6, 330 6 Z" fill="url(#turk-brass)" stroke="#fef08a" stroke-width="0.6"/>
          <circle cx="329" cy="8" r="2" fill="#713f12"/>
          <circle cx="329" cy="44" r="2" fill="#713f12"/>
          <polygon points="338,23 342,26 338,29" fill="url(#turk-brass)"/>
          <!-- Curved Buffalo Horn Grip with Swell -->
          <path d="M 340 18 C 352 17, 370 19, 395 24 L 392 39 C 372 36, 354 35, 340 36 Z" fill="url(#turk-horn)" stroke="rgba(253,224,71,0.3)" stroke-width="0.8"/>
          <line x1="354" y1="18" x2="354" y2="35" stroke="#d97706" stroke-width="1.2"/>
          <line x1="368" y1="19" x2="368" y2="36" stroke="#fde047" stroke-width="1.4"/>
          <line x1="382" y1="21" x2="382" y2="37" stroke="#d97706" stroke-width="1.2"/>
          <!-- Hooked Pistol Pommel with Brass Lanyard Hole -->
          <path d="M 395 24 C 404 26, 412 31, 413 38 C 413 46, 404 48, 397 46 C 393 44, 394 40, 397 41 C 402 42, 406 41, 406 37 C 406 33, 400 30, 392 28 Z" fill="url(#turk-horn)" stroke="#fde047" stroke-width="0.8"/>
          <circle cx="406" cy="37" r="2.4" fill="#ca8a04" stroke="#fde047" stroke-width="0.6"/>

          <!-- 2. MATCHING SCABBARD (Lower Register: Center Y=71, Flared for Yalman) -->
          <!-- Ambient Shadow -->
          <path d="M 40 80 C 80 82, 140 85, 180 85 L 340 82 L 340 86 L 180 89 C 140 89, 80 86, 40 84 Z" fill="rgba(0,0,0,0.55)"/>
          <!-- Scabbard Body Volume -->
          <path d="M 40 64 C 80 65, 140 68, 180 69 L 335 68 L 335 84 L 180 85 C 140 84, 80 79, 40 76 Z" fill="url(#turk-scabbard)" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/>
          <!-- Upper Specular Highlight Rim -->
          <path d="M 42 65 C 80 66, 140 69, 180 70 L 335 69" stroke="rgba(255,255,255,0.28)" stroke-width="0.8" fill="none"/>
          <!-- Lower Occlusion Shadow -->
          <path d="M 42 75 C 80 78, 140 83, 180 84 L 335 83" stroke="rgba(0,0,0,0.8)" stroke-width="0.8" fill="none"/>
          <!-- Flared Gold Chape to house Yalman -->
          <path d="M 36 63 C 48 63, 62 65, 80 66 L 80 80 C 62 80, 48 74, 36 63 Z" fill="url(#turk-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="35" cy="63" r="2.2" fill="#ca8a04"/>
          <!-- Two Ornate Suspension Lockets with Rings -->
          <rect x="235" y="66" width="8" height="19" rx="1" fill="url(#turk-brass)" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="239" cy="63" r="3" fill="none" stroke="#ca8a04" stroke-width="1.2"/>
          <rect x="175" y="67" width="8" height="19" rx="1" fill="url(#turk-brass)" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="179" cy="64" r="3" fill="none" stroke="#ca8a04" stroke-width="1.2"/>
          <!-- Gold Throat Collar with Opening Slit -->
          <path d="M 333 65 C 339 65, 345 66, 347 68 L 347 85 C 345 87, 339 88, 333 88 Z" fill="url(#turk-brass)" stroke="#fde047" stroke-width="0.5"/>
          <rect x="343" y="69" width="3.5" height="16" fill="#120204"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 3. ROMA — SPATHA OF THE LEGION (Heavy Spanish Gladius Spatha)
  // =========================================================================
  'blade_roma_gladius': {
    id: 'blade_roma_gladius',
    name: 'Spatha of the Legion',
    civilization: 'ROMA',
    rarity: 'epic',
    entitlementSku: 'dominion.blade.legion01',
    description: 'Heavy Spanish steel forged for Roman legionary tribunes. Substantial 24px broad leaf-waisted silhouette, high-contrast diamond spine, 4-segment bone grip, massive spherical pommel, and oxblood scabbard with pelta chape.',
    material: {
      scabbardGrad: ['#58181f', '#380f14', '#1f070a', '#100305', '#2b0c10'],
      brassGrad: ['#fde047', '#d97706', '#92400e', '#78350f', '#b45309'],
      bladeSteelUpper: ['#ffffff', '#e2e8f0', '#94a3b8', '#64748b'],
      bladeSteelLower: ['#475569', '#334155', '#1e293b', '#0f172a'],
      bladeSpineColor: '#ffffff',
      fullerColor: '#2b0c10',
      fullerHighlight: 'rgba(254, 240, 138, 0.9)',
      gripGrad: ['#fef3c7', '#fde68a', '#d97706', '#78350f'],
      gripRibsColor: '#78350f',
      pommelGemColor: '#b91c1c',
      scabbardInlaySvg: '<rect x="180" y="24" width="20" height="6" fill="#92400e" opacity="0.6"/>',
      throatOpeningColor: '#120406',
      sparkColor: '#facc15',
    },
    silhouette: {
      bladeTypeLabel: 'Heavy Broad Mainz Spatha',
      bladeWeightLabel: '1.35 kg · Crushing Heavy Steel',
      bladeCurvature: 'straight',
      bladeLengthPx: 216,
      // Broad heavy blade: 24px wide, Spanish leaf-waisted contour
      bladeUpperPath: 'M -216 27 L -175 16 L -100 18 L 0 15 L 0 27 L -216 27 Z',
      bladeLowerPath: 'M -216 27 L -175 38 L -100 36 L 0 39 L 0 27 L -216 27 Z',
      bladeDropShadowPath: 'M -216 27 L -175 40 L -100 38 L 0 41 L 0 44 L -100 40 L -175 42 L -216 27 Z',
      spinePath: 'M -215 27 L -175 16.2 L -100 18.2 L 0 15.2',
      cuttingEdgePath: 'M -215 27 L -175 37.8 L -100 35.8 L 0 38.8',
      fullerBasePath: 'M -160 27 L -4 27',
      fullerHighlightPath: 'M -160 27.8 L -4 27.8',
      guardSvg: `
        <ellipse cx="2" cy="27" rx="7" ry="17" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.5"/>
        <line x1="2" y1="10" x2="2" y2="44" stroke="#78350f" stroke-width="1"/>
      `,
      gripSvg: `
        <path d="M 9 19 C 14 17, 18 17, 23 19 C 28 17, 32 17, 37 19 C 42 17, 46 17, 51 19 L 51 35 C 46 37, 42 37, 37 35 C 32 37, 28 37, 23 35 C 18 37, 14 37, 9 35 Z" fill="url(#grip-grad)" stroke="#92400e" stroke-width="0.8"/>
        <line x1="16" y1="18" x2="16" y2="36" stroke="#78350f" stroke-width="1.6"/>
        <line x1="23" y1="17" x2="23" y2="37" stroke="#78350f" stroke-width="1.6"/>
        <line x1="30" y1="17" x2="30" y2="37" stroke="#78350f" stroke-width="1.6"/>
        <line x1="37" y1="17" x2="37" y2="37" stroke="#78350f" stroke-width="1.6"/>
        <line x1="44" y1="18" x2="44" y2="36" stroke="#78350f" stroke-width="1.6"/>
      `,
      pommelSvg: `
        <ellipse cx="60" cy="27" rx="10" ry="12" fill="url(#brass-grad)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <circle cx="60" cy="27" r="3.5" fill="#dc2626" stroke="#fde047" stroke-width="0.6"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 15 L 240 15 L 240 39 L 38 39 Z" fill="url(#scabbard-grad)"/>
        <line x1="38" y1="15.5" x2="240" y2="15.5" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>
        <line x1="38" y1="38.5" x2="240" y2="38.5" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
      `,
      scabbardChapeSvg: `
        <path d="M 12 27 C 12 20, 20 15, 32 15 L 42 15 L 42 39 L 32 39 C 20 39, 12 34, 12 27 Z" fill="url(#brass-grad)"/>
        <circle cx="22" cy="27" r="3.5" fill="#78350f"/>
      `,
      scabbardThroatSvg: `
        <path d="M 238 11 L 252 11 L 252 43 L 238 43 Z" fill="url(#brass-grad)"/>
        <rect x="248" y="16" width="4" height="22" fill="#120406"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="roma-steel-upper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="45%" stop-color="#e2e8f0"/>
              <stop offset="100%" stop-color="#94a3b8"/>
            </linearGradient>
            <linearGradient id="roma-steel-lower" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="40%" stop-color="#334155"/>
              <stop offset="80%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="roma-brass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="35%" stop-color="#eab308"/>
              <stop offset="70%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>
            <linearGradient id="roma-scabbard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#7f1d1d"/>
              <stop offset="25%" stop-color="#58181f"/>
              <stop offset="70%" stop-color="#380f14"/>
              <stop offset="100%" stop-color="#180406"/>
            </linearGradient>
            <linearGradient id="roma-bone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef9c3"/>
              <stop offset="40%" stop-color="#fef08a"/>
              <stop offset="80%" stop-color="#d97706"/>
              <stop offset="100%" stop-color="#92400e"/>
            </linearGradient>
          </defs>

          <!-- 1. BROAD SPATHA WEAPON (Center Y=26, Width 24px, Heavy Spanish Contour) -->
          <!-- Upper Bevel (Bright Roman Sun Reflection) -->
          <polygon points="42,26 80,14 200,16 328,14 328,26" fill="url(#roma-steel-upper)"/>
          <!-- Lower Bevel (Deep Iron Shadow) -->
          <polygon points="42,26 328,26 328,38 200,36 80,38" fill="url(#roma-steel-lower)"/>
          <!-- Raised Central Diamond Ridge -->
          <line x1="44" y1="26" x2="328" y2="26" stroke="#ffffff" stroke-width="1.2" opacity="0.95"/>
          <!-- Central Blood Groove -->
          <line x1="85" y1="26" x2="310" y2="26" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="85" y1="26.5" x2="310" y2="26.5" stroke="#fef08a" stroke-width="0.6" stroke-linecap="round"/>
          <!-- Guard Contact Shadow -->
          <rect x="325" y="14" width="3" height="24" fill="rgba(0,0,0,0.5)"/>
          <!-- Solid Boxwood & Bronze Guard Block -->
          <ellipse cx="334" cy="26" rx="6" ry="19" fill="url(#roma-brass)" stroke="#fde047" stroke-width="0.6"/>
          <ellipse cx="334" cy="26" rx="2.5" ry="15" fill="#78350f"/>
          <!-- 4-Finger Carved Bone Segmented Grip -->
          <path d="M 342 18 C 347 16, 351 16, 356 18 C 361 16, 365 16, 370 18 C 375 16, 379 16, 384 18 C 389 16, 393 16, 398 18 L 398 34 C 393 36, 389 36, 384 34 C 379 36, 375 36, 370 34 C 365 36, 361 36, 356 34 C 351 36, 347 36, 342 34 Z" fill="url(#roma-bone)" stroke="#92400e" stroke-width="0.8"/>
          <line x1="356" y1="17" x2="356" y2="35" stroke="#78350f" stroke-width="1.6"/>
          <line x1="370" y1="17" x2="370" y2="35" stroke="#78350f" stroke-width="1.6"/>
          <line x1="384" y1="17" x2="384" y2="35" stroke="#78350f" stroke-width="1.6"/>
          <!-- Heavy Oblate Spherical Pommel -->
          <ellipse cx="410" cy="26" rx="11" ry="13" fill="url(#roma-brass)" stroke="#fde047" stroke-width="0.8"/>
          <circle cx="410" cy="26" r="4" fill="#b91c1c" stroke="#fde047" stroke-width="0.6"/>

          <!-- 2. HEAVY ROMAN SCABBARD (Center Y=71, Height 22px, Oxblood Leather Grain) -->
          <!-- Ambient Shadow -->
          <rect x="62" y="80" width="276" height="6" rx="3" fill="rgba(0,0,0,0.6)"/>
          <!-- Broad Body Volume -->
          <rect x="65" y="59" width="272" height="24" rx="2" fill="url(#roma-scabbard)" stroke="rgba(255,255,255,0.1)" stroke-width="0.6"/>
          <!-- Subtle Leather Grain Illusion (fine vector tonal striations) -->
          <line x1="68" y1="63" x2="334" y2="63" stroke="rgba(255,255,255,0.18)" stroke-width="0.6"/>
          <line x1="68" y1="67" x2="334" y2="67" stroke="rgba(0,0,0,0.25)" stroke-width="0.5"/>
          <line x1="68" y1="75" x2="334" y2="75" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
          <line x1="68" y1="81" x2="334" y2="81" stroke="rgba(0,0,0,0.7)" stroke-width="0.8"/>
          <!-- Pelta-Style Openwork Bronze Chape -->
          <path d="M 44 71 C 44 61, 54 59, 72 59 L 72 83 C 54 83, 44 81, 44 71 Z" fill="url(#roma-brass)" stroke="#fde047" stroke-width="0.6"/>
          <circle cx="58" cy="71" r="3.8" fill="#78350f"/>
          <!-- Two Heavy Bronze Reinforcing Bands with Rings -->
          <rect x="230" y="57" width="10" height="28" rx="1" fill="url(#roma-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="235" cy="54" r="3.5" fill="none" stroke="#ca8a04" stroke-width="1.3"/>
          <circle cx="235" cy="88" r="3.5" fill="none" stroke="#ca8a04" stroke-width="1.3"/>
          <rect x="150" y="57" width="10" height="28" rx="1" fill="url(#roma-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="155" cy="54" r="3.5" fill="none" stroke="#ca8a04" stroke-width="1.3"/>
          <circle cx="155" cy="88" r="3.5" fill="none" stroke="#ca8a04" stroke-width="1.3"/>
          <!-- Heavy Bronze Throat Plate with Opening -->
          <rect x="333" y="55" width="14" height="32" rx="2" fill="url(#roma-brass)" stroke="#fde047" stroke-width="0.6"/>
          <rect x="344" y="60" width="3" height="22" fill="#120406"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 4. PERS — SHAMSHIR OF ETERNITY (Continuous Arc Shamshir)
  // =========================================================================
  'blade_pers_shamshir': {
    id: 'blade_pers_shamshir',
    name: 'Shamshir of Eternity',
    civilization: 'PERS',
    rarity: 'epic',
    entitlementSku: 'dominion.blade.eternity01',
    description: 'Continuous radical arc shamshir forged from crucible wootz steel. Unbroken sweeping curve, slender gold-inlaid crossguard with acorn finials, downward pistol grip, and lapis scabbard with dual suspension lockets.',
    material: {
      scabbardGrad: ['#0f172a', '#020617', '#081220', '#030712', '#0c1a2e'],
      brassGrad: ['#fde047', '#eab308', '#ca8a04', '#854d0e', '#d97706'],
      bladeSteelUpper: ['#ffffff', '#f8fafc', '#cbd5e1', '#94a3b8'],
      bladeSteelLower: ['#475569', '#334155', '#1e293b', '#0f172a'],
      bladeSpineColor: '#38bdf8',
      fullerColor: '#030712',
      fullerHighlight: 'rgba(56, 189, 248, 0.75)',
      gripGrad: ['#0f172a', '#020617', '#050c17', '#020617'],
      gripRibsColor: '#38bdf8',
      pommelGemColor: '#0284c7',
      throatOpeningColor: '#020617',
      sparkColor: '#38bdf8',
    },
    silhouette: {
      bladeTypeLabel: 'Crucible Arc Shamshir',
      bladeWeightLabel: '0.82 kg · Continuous Fluid Draw',
      bladeCurvature: 'deep_curve',
      bladeLengthPx: 216,
      // Deep unbroken fluid arc: starts at Y=23, sweeps down to Y=39, tip swoops up to Y=18
      bladeUpperPath: 'M -216 18 C -160 19, -80 24, 0 23 L 0 27 L -216 18 Z',
      bladeLowerPath: 'M -216 18 C -150 40, -70 38, 0 31 L 0 27 L -216 18 Z',
      bladeDropShadowPath: 'M -216 18 C -150 42, -70 40, 0 33 L 0 36 C -70 42, -150 44, -216 18 Z',
      spinePath: 'M -216 18 C -160 19.2, -80 24.2, 0 23.2',
      cuttingEdgePath: 'M -216 18 C -150 39.6, -70 37.6, 0 30.6',
      fullerBasePath: 'M -160 25 C -100 28, -40 27, -4 25',
      fullerHighlightPath: 'M -160 25.6 C -100 28.6, -40 27.6, -4 25.6',
      guardSvg: `
        <path d="M -3 10 C 0 10, 3 14, 4 19 L 5 35 C 3 40, 0 44, -3 44 L -4 41 L -1 35 L -1 19 L -4 13 Z" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.6"/>
        <circle cx="-3" cy="11" r="2.2" fill="#854d0e"/>
        <circle cx="-3" cy="43" r="2.2" fill="#854d0e"/>
      `,
      gripSvg: `
        <path d="M 5 19 C 15 18, 28 20, 38 25 L 36 38 C 26 34, 15 33, 5 35 Z" fill="url(#grip-grad)" stroke="rgba(56,189,248,0.3)" stroke-width="0.7"/>
        <line x1="14" y1="19" x2="14" y2="34" stroke="#ca8a04" stroke-width="1.2"/>
        <line x1="24" y1="20" x2="24" y2="35" stroke="#38bdf8" stroke-width="1.4"/>
        <line x1="34" y1="23" x2="34" y2="37" stroke="#ca8a04" stroke-width="1.2"/>
      `,
      pommelSvg: `
        <path d="M 38 25 C 44 28, 50 34, 49 42 C 48 48, 42 49, 37 47 C 34 45, 36 42, 38 43 C 41 44, 44 43, 44 39 C 44 35, 40 31, 36 29 Z" fill="url(#grip-grad)" stroke="#ca8a04" stroke-width="0.8"/>
        <circle cx="43" cy="40" r="2.2" fill="#0284c7" stroke="#fde047" stroke-width="0.5"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 18 C 100 24, 160 25, 240 23 L 240 37 C 160 39, 100 38, 38 32 Z" fill="url(#scabbard-grad)"/>
        <path d="M 38 18.5 C 100 24.5, 160 25.5, 240 23.5" stroke="rgba(255,255,255,0.25)" stroke-width="0.8" fill="none"/>
        <path d="M 38 31.5 C 100 37.5, 160 38.5, 240 36.5" stroke="rgba(0,0,0,0.85)" stroke-width="0.8" fill="none"/>
      `,
      scabbardChapeSvg: `
        <path d="M 12 18 C 22 18, 30 21, 44 21 L 44 34 C 30 34, 22 28, 12 18 Z" fill="url(#brass-grad)"/>
      `,
      scabbardThroatSvg: `
        <path d="M 238 14 C 244 14, 250 15, 252 17 L 252 39 C 250 41, 244 42, 238 42 Z" fill="url(#brass-grad)"/>
        <rect x="248" y="19" width="4" height="18" fill="#020617"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="pers-steel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="35%" stop-color="#e2e8f0"/>
              <stop offset="50%" stop-color="#94a3b8"/>
              <stop offset="65%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="pers-brass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="40%" stop-color="#eab308"/>
              <stop offset="75%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#854d0e"/>
            </linearGradient>
            <linearGradient id="pers-scabbard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="30%" stop-color="#0f172a"/>
              <stop offset="70%" stop-color="#020617"/>
              <stop offset="100%" stop-color="#000000"/>
            </linearGradient>
            <linearGradient id="pers-horn" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="50%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#020617"/>
            </linearGradient>
          </defs>

          <!-- 1. CONTINUOUS ARC SHAMSHIR (Upper Register: Center Y=26, Deep Fluid Arc) -->
          <!-- Blade Upper Face & Spine -->
          <path d="M 45 16 C 110 20, 200 32, 335 23 L 335 27 C 200 36, 110 24, 45 16 Z" fill="#ffffff" opacity="0.95"/>
          <!-- Blade Lower Bevel & Deep Belly -->
          <path d="M 45 16 C 110 24, 200 36, 335 27 L 335 34 C 200 45, 110 33, 45 16 Z" fill="url(#pers-steel)"/>
          <!-- Watered Steel Wootz Trace -->
          <path d="M 60 19 C 130 26, 210 37, 320 28" stroke="rgba(255,255,255,0.4)" stroke-width="0.8" fill="none" stroke-dasharray="6 3 2 3"/>
          <!-- Guard Contact Shadow -->
          <rect x="331" y="17" width="4" height="18" fill="rgba(0,0,0,0.5)"/>
          <!-- Slender Gold-Inlaid Crossguard with Acorn Finials -->
          <path d="M 334 8 C 337 8, 340 12, 341 18 L 342 34 C 340 40, 337 44, 334 44 L 331 44 L 333 34 L 333 18 L 331 8 Z" fill="url(#pers-brass)" stroke="#fef08a" stroke-width="0.6"/>
          <circle cx="334" cy="8" r="2.2" fill="#854d0e"/>
          <circle cx="334" cy="44" r="2.2" fill="#854d0e"/>
          <!-- Downward Pistol Grip -->
          <path d="M 342 19 C 352 18, 368 20, 388 25 L 385 39 C 368 35, 352 34, 342 35 Z" fill="url(#pers-horn)" stroke="rgba(56,189,248,0.3)" stroke-width="0.7"/>
          <line x1="354" y1="19" x2="354" y2="35" stroke="#ca8a04" stroke-width="1.2"/>
          <line x1="368" y1="21" x2="368" y2="36" stroke="#38bdf8" stroke-width="1.4"/>
          <!-- Down-Turned Rounded Beak Pommel with Turquoise Gem -->
          <path d="M 388 25 C 396 28, 404 35, 403 44 C 402 50, 395 51, 390 48 C 387 46, 389 42, 391 43 C 395 45, 398 44, 398 40 C 398 35, 393 31, 385 29 Z" fill="url(#pers-horn)" stroke="#ca8a04" stroke-width="0.8"/>
          <circle cx="396" cy="41" r="2.4" fill="#0284c7" stroke="#fde047" stroke-width="0.6"/>

          <!-- 2. BESPOKE FLUID LAPIS SCABBARD (Lower Register: Center Y=71, Clear 24px Separation) -->
          <!-- Ambient Shadow -->
          <path d="M 40 82 C 105 88, 205 92, 340 85 L 340 88 C 205 95, 105 91, 40 85 Z" fill="rgba(0,0,0,0.55)"/>
          <!-- Scabbard Body Arc -->
          <path d="M 42 66 C 105 72, 205 75, 336 68 L 336 82 C 205 89, 105 86, 42 79 Z" fill="url(#pers-scabbard)" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/>
          <!-- Upper Specular Highlight Rim -->
          <path d="M 44 67 C 105 73, 205 76, 336 69" stroke="rgba(255,255,255,0.28)" stroke-width="0.8" fill="none"/>
          <!-- Lower Occlusion Shadow -->
          <path d="M 44 78 C 105 85, 205 88, 336 81" stroke="rgba(0,0,0,0.85)" stroke-width="0.8" fill="none"/>
          <!-- Sweeping Gold Chape -->
          <path d="M 38 65 C 50 67, 68 70, 85 71 L 85 83 C 68 83, 50 77, 38 65 Z" fill="url(#pers-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="37" cy="65" r="2" fill="#ca8a04"/>
          <!-- Dual Persian Gold Suspension Lockets with Rings -->
          <rect x="230" y="69" width="8" height="18" rx="1" fill="url(#pers-brass)" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="234" cy="66" r="3" fill="none" stroke="#ca8a04" stroke-width="1.2"/>
          <rect x="150" y="72" width="8" height="18" rx="1" fill="url(#pers-brass)" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="154" cy="69" r="3" fill="none" stroke="#ca8a04" stroke-width="1.2"/>
          <!-- Sculpted Gold Throat Collar -->
          <path d="M 334 66 C 340 66, 346 67, 348 69 L 348 84 C 346 86, 340 87, 334 87 Z" fill="url(#pers-brass)" stroke="#fde047" stroke-width="0.5"/>
          <rect x="344" y="70" width="3" height="15" fill="#020617"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 5. MISIR — PHARAONIC KHOPESH (Radical Sickle-Hook Cleaver)
  // =========================================================================
  'blade_misir_khopesh': {
    id: 'blade_misir_khopesh',
    name: 'Pharaonic Khopesh',
    civilization: 'MISIR',
    rarity: 'epic',
    entitlementSku: 'dominion.blade.pharaonic01',
    description: 'Ancient Egyptian sickle-sword cast in royal arsenical bronze. Unmistakable straight proximal tang, pronounced elbow neck, radical forward crescent hook with heavy 25px cleaving belly, and custom conforming edge-carrier.',
    material: {
      scabbardGrad: ['#3b2609', '#241604', '#140c02', '#0a0601', '#1e1203'],
      brassGrad: ['#fef08a', '#d97706', '#92400e', '#78350f', '#eab308'],
      bladeSteelUpper: ['#fde68a', '#d97706', '#92400e', '#0f766e'],
      bladeSteelLower: ['#78350f', '#451a03', '#115e59', '#134e4a'],
      bladeSpineColor: '#2dd4bf',
      fullerColor: '#134e4a',
      fullerHighlight: 'rgba(254, 240, 138, 0.9)',
      gripGrad: ['#1c1917', '#0c0a09', '#000000', '#1c1917'],
      gripRibsColor: '#d97706',
      pommelGemColor: '#0d9488',
      bladeEtchingSvg: '<path d="M 30 0 C 60 5, 90 12, 120 10" stroke="#fde047" stroke-width="0.8" fill="none"/>',
      throatOpeningColor: '#0a0601',
      sparkColor: '#fbbf24',
    },
    silhouette: {
      bladeTypeLabel: 'Cast Bronze Sickle-Hook Khopesh',
      bladeWeightLabel: '1.20 kg · Angular Cleaving Torque',
      bladeCurvature: 'khopesh_hook',
      bladeLengthPx: 216,
      // TRUE SICKLE-HOOK GEOMETRY IN HUD:
      // 1. Straight proximal shaft from 0 to -70
      // 2. Pronounced elbow neck at -70
      // 3. Deep inner concave curve dipping to Y=14
      // 4. Heavy broad cleaving belly dipping to Y=48
      // 5. Strong forward-projecting hook to tip at -216, 32
      bladeUpperPath: 'M -216 32 C -190 22, -145 14, -70 23.5 L 0 23.5 L 0 27 L -70 27 C -145 20, -190 26, -216 32 Z',
      bladeLowerPath: 'M -216 32 C -185 42, -145 48, -70 30.5 L 0 30.5 L 0 27 L -70 27 C -70 27, -145 44, -185 39 C -200 37, -210 34, -216 32 Z',
      bladeDropShadowPath: 'M -216 32 C -185 44, -145 50, -70 32.5 L 0 32.5 L 0 35.5 L -70 35.5 C -145 46, -185 41, -216 32 Z',
      spinePath: 'M -216 32 C -190 22.2, -145 14.2, -70 23.7 L 0 23.7',
      cuttingEdgePath: 'M -216 32 C -185 41.8, -145 47.8, -70 30.3 L 0 30.3',
      fullerBasePath: 'M -65 27 L -4 27',
      fullerHighlightPath: 'M -65 27.8 L -4 27.8',
      guardSvg: `
        <path d="M -3 14 C 0 14, 4 16, 5 19 L 5 35 C 4 38, 0 40, -3 40 Z" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.5"/>
        <circle cx="1" cy="27" r="2" fill="#0d9488"/>
      `,
      gripSvg: `
        <rect x="5" y="19" width="40" height="16" rx="2" fill="url(#grip-grad)" stroke="#d97706" stroke-width="0.8"/>
        <circle cx="14" cy="27" r="1.8" fill="#d97706"/>
        <circle cx="25" cy="27" r="1.8" fill="#d97706"/>
        <circle cx="36" cy="27" r="1.8" fill="#d97706"/>
      `,
      pommelSvg: `
        <path d="M 45 20 C 50 18, 56 22, 57 27 C 56 32, 50 36, 45 34 Z" fill="url(#brass-grad)" stroke="#fde047" stroke-width="0.7"/>
        <circle cx="51" cy="27" r="2.5" fill="#0d9488"/>
      `,
      // Custom Conforming Hook Carrier in HUD
      scabbardBodySvg: `
        <path d="M 32 30 C 58 20, 110 14, 170 23.5 L 240 23.5 L 240 30.5 L 170 30.5 C 120 48, 65 44, 32 30 Z" fill="url(#scabbard-grad)"/>
        <path d="M 32 30 C 58 20.5, 110 14.5, 170 23.8 L 240 23.8" stroke="rgba(255,255,255,0.25)" stroke-width="0.8" fill="none"/>
        <path d="M 32 30 C 65 43.5, 120 47.5, 170 30.2 L 240 30.2" stroke="rgba(0,0,0,0.85)" stroke-width="0.8" fill="none"/>
      `,
      scabbardChapeSvg: `
        <path d="M 22 28 C 28 24, 36 24, 42 27 L 42 37 C 36 36, 28 34, 22 28 Z" fill="url(#brass-grad)"/>
      `,
      scabbardThroatSvg: `
        <rect x="238" y="15" width="14" height="24" rx="2" fill="url(#brass-grad)"/>
        <rect x="248" y="20" width="4" height="14" fill="#0a0601"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="misir-bronze-upper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="35%" stop-color="#f59e0b"/>
              <stop offset="70%" stop-color="#b45309"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>
            <linearGradient id="misir-bronze-lower" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#92400e"/>
              <stop offset="40%" stop-color="#78350f"/>
              <stop offset="80%" stop-color="#451a03"/>
              <stop offset="100%" stop-color="#1e1203"/>
            </linearGradient>
            <linearGradient id="misir-verdigris" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#14b8a6"/>
              <stop offset="50%" stop-color="#0d9488"/>
              <stop offset="100%" stop-color="#042f2e"/>
            </linearGradient>
            <linearGradient id="misir-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="40%" stop-color="#eab308"/>
              <stop offset="80%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#854d0e"/>
            </linearGradient>
            <linearGradient id="misir-carrier" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#543310"/>
              <stop offset="30%" stop-color="#3b2609"/>
              <stop offset="70%" stop-color="#241604"/>
              <stop offset="100%" stop-color="#0f0902"/>
            </linearGradient>
          </defs>

          <!-- 1. TRUE SICKLE-HOOK KHOPESH (Upper Register: Center Y=26) -->
          <!-- A. Proximal Straight Tang/Shaft (X=336 to X=230, Width 9px) -->
          <rect x="230" y="22" width="106" height="9" fill="url(#misir-bronze-upper)"/>
          <line x1="230" y1="26.5" x2="336" y2="26.5" stroke="#042f2e" stroke-width="1.8"/>
          <!-- B. Pronounced Elbow Neck at X=230 -->
          <polygon points="230,22 220,20 224,34 232,31" fill="#ca8a04"/>
          <!-- C. Radical Forward Sickle Hook (Deep Inner Concave Spine dipping to Y=12) -->
          <path d="M 46 36 C 80 18, 145 12, 230 22 L 230 27 C 145 18, 85 24, 46 36 Z" fill="#ffffff" opacity="0.9"/>
          <!-- D. Heavy Distal Cleaving Belly (Outer Convex Cutting Edge sweeping down to Y=56) -->
          <path d="M 46 36 C 90 28, 145 18, 230 27 L 230 31 C 185 42, 140 56, 95 56 C 68 56, 52 48, 46 36 Z" fill="url(#misir-bronze-lower)"/>
          <!-- Verdigris Spine Accent along inner spine -->
          <path d="M 50 35 C 84 19, 145 13, 230 23" stroke="url(#misir-verdigris)" stroke-width="1.5" fill="none"/>
          <!-- Lotus Hieroglyphic Cartouche on blade -->
          <path d="M 120 34 C 140 32, 165 30, 185 30" stroke="#fef08a" stroke-width="1.2" stroke-dasharray="3 2" fill="none"/>
          <!-- Guard Flange & Royal Ebony Grip -->
          <path d="M 334 13 C 337 13, 339 17, 340 21 L 341 31 C 339 35, 337 39, 334 39 Z" fill="url(#misir-gold)" stroke="#fde047" stroke-width="0.6"/>
          <rect x="341" y="19" width="55" height="14" rx="2" fill="#0f0902" stroke="#d97706" stroke-width="0.8"/>
          <circle cx="351" cy="26" r="2.2" fill="#ca8a04"/>
          <circle cx="368" cy="26" r="2.2" fill="#ca8a04"/>
          <circle cx="385" cy="26" r="2.2" fill="#ca8a04"/>
          <!-- Flared Lotus Bud Pommel with Turquoise Inlay -->
          <path d="M 396 20 C 403 18, 411 21, 413 26 C 411 31, 403 34, 396 32 Z" fill="url(#misir-gold)" stroke="#fde047" stroke-width="0.8"/>
          <circle cx="405" cy="26" r="3" fill="#0d9488" stroke="#fde047" stroke-width="0.5"/>

          <!-- 2. BESPOKE SICKLE CONFORMING CARRIER (Lower Register: Conforms to Radical Sickle Hook!) -->
          <!-- Ambient Shadow -->
          <path d="M 40 88 C 70 89, 140 93, 235 78 L 235 84 C 140 100, 70 96, 40 90 Z" fill="rgba(0,0,0,0.55)"/>
          <!-- Carrier Body Conforming to Radical Hook -->
          <path d="M 42 74 C 64 58, 130 56, 230 64 L 230 78 C 175 86, 135 96, 95 96 C 66 96, 48 86, 42 74 Z" fill="url(#misir-carrier)" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/>
          <!-- Upper Specular Highlight Rim -->
          <path d="M 44 74 C 66 59, 130 57, 230 65" stroke="rgba(255,255,255,0.28)" stroke-width="0.8" fill="none"/>
          <!-- Lower Occlusion Shadow -->
          <path d="M 44 75 C 58 84, 78 95, 95 95 C 135 95, 175 85, 230 77" stroke="rgba(0,0,0,0.85)" stroke-width="0.8" fill="none"/>
          <!-- Gold Chape Cup at the Hook Tip -->
          <path d="M 36 71 C 44 68, 54 70, 62 75 L 62 82 C 50 82, 42 79, 36 71 Z" fill="url(#misir-gold)" stroke="#fde047" stroke-width="0.5"/>
          <!-- Three Fastening Straps with Carnelian Studs -->
          <rect x="95" y="72" width="7" height="23" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="98.5" cy="82.5" r="2" fill="#b91c1c"/>
          <rect x="145" y="65" width="7" height="20" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="148.5" cy="75" r="2" fill="#b91c1c"/>
          <rect x="195" y="64" width="7" height="17" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="198.5" cy="72.5" r="2" fill="#b91c1c"/>
          <!-- Gold Throat Collar with Entrance Mouth -->
          <rect x="228" y="62" width="12" height="20" rx="1.5" fill="url(#misir-gold)" stroke="#fde047" stroke-width="0.5"/>
          <rect x="237" y="65" width="3" height="14" fill="#0a0601"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 6. HAN — JIAN OF THE FIRST SOVEREIGN (Imperial Han Jian)
  // =========================================================================
  'blade_han_jian': {
    id: 'blade_han_jian',
    name: 'Jian of the First Sovereign',
    civilization: 'HAN',
    rarity: 'legendary',
    entitlementSku: 'dominion.blade.sovereign01',
    description: 'Double-edged imperial jian with +12% blade width, +15% stepped bronze guard, and +15% pierced nephrite jade Bi pommel. High-contrast cinnabar red wrap and mirror-black scabbard with bronze suspension bridge.',
    material: {
      scabbardGrad: ['#0f0b08', '#080504', '#020202', '#000000', '#0a0705'],
      brassGrad: ['#fef08a', '#d97706', '#92400e', '#78350f', '#ca8a04'],
      bladeSteelUpper: ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1'],
      bladeSteelLower: ['#475569', '#334155', '#1e293b', '#0f172a'],
      bladeSpineColor: '#ffffff',
      fullerColor: '#050302',
      fullerHighlight: 'rgba(255, 255, 255, 0.9)',
      gripGrad: ['#7f1d1d', '#58181f', '#3b070c', '#1a0407'],
      gripRibsColor: '#fde047',
      pommelGemColor: '#10b981',
      bladeEtchingSvg: '<line x1="30" y1="0" x2="160" y2="0" stroke="#fde047" stroke-width="0.8" stroke-dasharray="4 2"/>',
      throatOpeningColor: '#050302',
      sparkColor: '#fde047',
    },
    silhouette: {
      bladeTypeLabel: 'Double-Edged Imperial Jian',
      bladeWeightLabel: '0.94 kg · Thrust Precision',
      bladeCurvature: 'straight',
      bladeLengthPx: 216,
      // Blade width +12%, center ridge contrast, stepped guard +15%
      bladeUpperPath: 'M -216 27 L -185 19 L 0 19 L 0 27 L -216 27 Z',
      bladeLowerPath: 'M -216 27 L -185 35 L 0 35 L 0 27 L -216 27 Z',
      bladeDropShadowPath: 'M -216 27 L -185 37 L 0 37 L 0 40 L -185 39 L -216 27 Z',
      spinePath: 'M -215 27 L -185 19.2 L 0 19.2',
      cuttingEdgePath: 'M -215 27 L -185 34.8 L 0 34.8',
      fullerBasePath: 'M -180 27 L -4 27',
      fullerHighlightPath: 'M -180 27.8 L -4 27.8',
      guardSvg: `
        <polygon points="-5,7 7,15 7,39 -5,47" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.6"/>
        <polygon points="-5,14 3,19 3,35 -5,40" fill="url(#brass-grad)"/>
        <polygon points="-5,23 2,27 -5,31" fill="#78350f"/>
        <line x1="-5" y1="7" x2="-5" y2="47" stroke="#fde047" stroke-width="0.8"/>
      `,
      gripSvg: `
        <rect x="6" y="19" width="46" height="16" rx="2" fill="url(#grip-grad)" stroke="#d97706" stroke-width="0.8"/>
        <line x1="13" y1="19" x2="23" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="23" y1="19" x2="13" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="26" y1="19" x2="36" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="36" y1="19" x2="26" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="39" y1="19" x2="49" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="49" y1="19" x2="39" y2="35" stroke="#fde047" stroke-width="1.4"/>
      `,
      pommelSvg: `
        <circle cx="60" cy="27" r="12.5" fill="#10b981" stroke="#fde047" stroke-width="1.2"/>
        <circle cx="60" cy="27" r="4.2" fill="#064e3b" stroke="#fde047" stroke-width="0.6"/>
        <path d="M 72 27 C 80 29, 88 33, 96 37" stroke="#dc2626" stroke-width="2" fill="none"/>
        <path d="M 72 28 C 80 30, 88 34, 96 38" stroke="#fde047" stroke-width="1" fill="none"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 18 L 240 18 L 240 36 L 38 36 Z" fill="url(#scabbard-grad)"/>
        <line x1="38" y1="18.5" x2="240" y2="18.5" stroke="rgba(255,255,255,0.25)" stroke-width="0.8"/>
        <line x1="38" y1="35.5" x2="240" y2="35.5" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
      `,
      scabbardChapeSvg: `
        <polygon points="12,27 38,18 38,36" fill="url(#brass-grad)"/>
      `,
      scabbardThroatSvg: `
        <polygon points="238,13 252,17 252,37 238,41" fill="url(#brass-grad)"/>
        <rect x="248" y="19" width="4" height="16" fill="#050302"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="han-steel-upper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="50%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#cbd5e1"/>
            </linearGradient>
            <linearGradient id="han-steel-lower" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="50%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="han-brass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="40%" stop-color="#eab308"/>
              <stop offset="75%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>
            <linearGradient id="han-scabbard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2a1208"/>
              <stop offset="25%" stop-color="#0f0b08"/>
              <stop offset="75%" stop-color="#000000"/>
              <stop offset="100%" stop-color="#050302"/>
            </linearGradient>
            <linearGradient id="han-jade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#6ee7b7"/>
              <stop offset="40%" stop-color="#10b981"/>
              <stop offset="80%" stop-color="#047857"/>
              <stop offset="100%" stop-color="#064e3b"/>
            </linearGradient>
          </defs>

          <!-- 1. IMPERIAL JIAN WEAPON (+12% Width, Stepped Guard +15%, Jade Bi +15%) -->
          <!-- Upper Bevel Plane (Bright Mirror Reflection) -->
          <polygon points="42,26 80,17 330,17 330,26 80,26" fill="url(#han-steel-upper)"/>
          <!-- Lower Bevel Plane (Deep Contrast Shadow) -->
          <polygon points="42,26 330,26 330,35 80,35 80,26" fill="url(#han-steel-lower)"/>
          <!-- High-Contrast Diamond Spine -->
          <line x1="44" y1="26" x2="330" y2="26" stroke="#ffffff" stroke-width="1.3" opacity="0.95"/>
          <!-- Guard Contact Shadow -->
          <rect x="326" y="15" width="4" height="22" fill="rgba(0,0,0,0.45)"/>
          <!-- Stepped Winged Bronze Guard (+15% Display Scale: Y=8 to Y=44) -->
          <polygon points="328,9 340,16 340,36 328,43" fill="url(#han-brass)" stroke="#fde047" stroke-width="0.6"/>
          <polygon points="329,22 335,26 329,30" fill="#78350f"/>
          <!-- High-Contrast Cinnabar Red Diamond Wrap Grip -->
          <rect x="340" y="18" width="60" height="16" rx="2" fill="#3b070c" stroke="#d97706" stroke-width="0.8"/>
          <!-- Diamond Criss-Cross Silk Ito -->
          <line x1="346" y1="18" x2="356" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="356" y1="18" x2="346" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="360" y1="18" x2="370" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="370" y1="18" x2="360" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="374" y1="18" x2="384" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="384" y1="18" x2="374" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="388" y1="18" x2="398" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="398" y1="18" x2="388" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <!-- Pierced Nephrite Jade Bi Disc Pommel (+15% Scale: r=11) -->
          <circle cx="412" cy="26" r="11" fill="url(#han-jade)" stroke="#fde047" stroke-width="1.2"/>
          <circle cx="412" cy="26" r="4" fill="#022c22" stroke="#fde047" stroke-width="0.6"/>
          <!-- Restrained Braided Silk Cords / Tassel -->
          <path d="M 423 26 C 435 28, 448 31, 458 34" stroke="#dc2626" stroke-width="1.8" fill="none"/>
          <path d="M 423 27 C 435 29, 448 33, 458 37" stroke="#fde047" stroke-width="1.2" fill="none"/>

          <!-- 2. HIGH-GLOSS BLACK LACQUER SCABBARD (Center Y=70, Body H=16px) -->
          <!-- Ambient Shadow -->
          <rect x="65" y="78" width="272" height="5" rx="2.5" fill="rgba(0,0,0,0.55)"/>
          <!-- Lacquer Body Volume -->
          <rect x="68" y="62" width="268" height="16" rx="2" fill="url(#han-scabbard)" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/>
          <!-- Upper Specular Highlight Rim -->
          <line x1="68" y1="63" x2="336" y2="63" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
          <!-- Lower Occlusion Shadow -->
          <line x1="68" y1="77" x2="336" y2="77" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
          <!-- Cinnabar Cloud Inlay Accents -->
          <line x1="120" y1="70" x2="160" y2="70" stroke="#dc2626" stroke-width="1" stroke-dasharray="8 4"/>
          <!-- Winged Bronze Chape -->
          <polygon points="44,70 68,62 68,78" fill="url(#han-brass)" stroke="#fde047" stroke-width="0.5"/>
          <!-- Cast Bronze Scabbard Slide (Suspension Bridge) -->
          <rect x="220" y="58" width="18" height="24" rx="1.5" fill="url(#han-brass)" stroke="#fde047" stroke-width="0.5"/>
          <rect x="224" y="64" width="10" height="12" fill="#0f0b08"/>
          <!-- Stepped Bronze Throat Collar -->
          <polygon points="333,59 345,63 345,77 333,81" fill="url(#han-brass)" stroke="#fde047" stroke-width="0.5"/>
          <rect x="342" y="66" width="3" height="14" fill="#050302"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 7. YAMATO — HEAVENLY TSUKURUGI (Katana & Mirror-Finish Saya)
  // =========================================================================
  'blade_yamato_katana': {
    id: 'blade_yamato_katana',
    name: 'Heavenly Tsukiyurugi',
    civilization: 'YAMATO',
    rarity: 'legendary',
    entitlementSku: 'dominion.blade.tsukiyurugi01',
    description: 'Masterwork curved katana and mirror-finish roiro lacquer saya. Natural sori curvature, gold habaki blade collar, enlarged sukashi pierced iron tsuba, high-contrast tsuka wrap, and gold koiguchi/kurikata/kojiri fittings.',
    material: {
      scabbardGrad: ['#09090b', '#000000', '#09090b', '#000000', '#09090b'],
      brassGrad: ['#fef08a', '#eab308', '#ca8a04', '#854d0e', '#d97706'],
      bladeSteelUpper: ['#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8'],
      bladeSteelLower: ['#475569', '#334155', '#1e293b', '#0f172a'],
      bladeSpineColor: '#f8fafc',
      fullerColor: '#18181b',
      fullerHighlight: 'rgba(255, 255, 255, 0.95)',
      gripGrad: ['#ffffff', '#f4f4f5', '#e4e4e7', '#d4d4d8'],
      gripRibsColor: '#09090b',
      pommelGemColor: '#eab308',
      bladeEtchingSvg: '<path d="M 20 0 Q 35 -3, 50 0 Q 65 3, 80 0 Q 95 -3, 110 0 Q 125 3, 140 0" stroke="#f8fafc" stroke-width="0.7" fill="none"/>',
      throatOpeningColor: '#000000',
      sparkColor: '#fde047',
    },
    silhouette: {
      bladeTypeLabel: 'Folded Katana & Mirror Roiro Saya',
      bladeWeightLabel: '0.98 kg · Unbroken Sori Curvature',
      bladeCurvature: 'slight_curve',
      bladeLengthPx: 216,
      // Sori curvature, gold habaki, large sukashi tsuba
      bladeUpperPath: 'M -216 22 C -180 23.5, -90 24.5, 0 24 L 0 27 L -216 22 Z',
      bladeLowerPath: 'M -216 22 C -180 34, -90 34, 0 32 L 0 27 L -216 22 Z',
      bladeDropShadowPath: 'M -216 22 C -180 36, -90 36, 0 34 L 0 37 C -90 39, -180 39, -216 22 Z',
      spinePath: 'M -216 22 C -180 23.8, -90 24.8, 0 24.2',
      cuttingEdgePath: 'M -216 22 C -180 33.6, -90 33.6, 0 31.6',
      fullerBasePath: 'M -160 25 C -100 27, -40 27, -4 25',
      fullerHighlightPath: 'M -160 25.6 C -100 27.6, -40 27.6, -4 25.6',
      guardSvg: `
        <ellipse cx="2" cy="27" rx="5" ry="18" fill="#18181b" stroke="url(#brass-grad)" stroke-width="1"/>
        <circle cx="2" cy="18" r="2" fill="#000000"/>
        <circle cx="2" cy="36" r="2" fill="#000000"/>
      `,
      gripSvg: `
        <rect x="7" y="19" width="46" height="16" rx="2" fill="#ffffff" stroke="#18181b" stroke-width="0.8"/>
        <line x1="14" y1="19" x2="24" y2="35" stroke="#09090b" stroke-width="2"/>
        <line x1="24" y1="19" x2="14" y2="35" stroke="#09090b" stroke-width="2"/>
        <line x1="26" y1="19" x2="36" y2="35" stroke="#09090b" stroke-width="2"/>
        <line x1="36" y1="19" x2="26" y2="35" stroke="#09090b" stroke-width="2"/>
        <line x1="38" y1="19" x2="48" y2="35" stroke="#09090b" stroke-width="2"/>
        <line x1="48" y1="19" x2="38" y2="35" stroke="#09090b" stroke-width="2"/>
      `,
      pommelSvg: `
        <rect x="53" y="19" width="7" height="16" rx="2" fill="#18181b" stroke="url(#brass-grad)" stroke-width="0.8"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 18 C 100 22, 170 23, 240 22 L 240 36 C 170 37, 100 36, 38 32 Z" fill="#000000"/>
        <path d="M 38 18.5 C 100 22.5, 170 23.5, 240 22.5" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" fill="none"/>
        <path d="M 38 31.5 C 100 35.5, 170 36.5, 240 35.5" stroke="rgba(0,0,0,0.9)" stroke-width="0.8" fill="none"/>
      `,
      scabbardChapeSvg: `
        <path d="M 14 18 C 22 18, 30 20, 42 20 L 42 34 C 30 34, 22 30, 14 18 Z" fill="url(#brass-grad)"/>
      `,
      scabbardThroatSvg: `
        <rect x="238" y="13" width="14" height="28" rx="1.5" fill="url(#brass-grad)"/>
        <rect x="248" y="18" width="4" height="18" fill="#000000"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="yamato-steel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="40%" stop-color="#f8fafc"/>
              <stop offset="65%" stop-color="#cbd5e1"/>
              <stop offset="100%" stop-color="#334155"/>
            </linearGradient>
            <linearGradient id="yamato-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="35%" stop-color="#facc15"/>
              <stop offset="70%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#854d0e"/>
            </linearGradient>
            <linearGradient id="yamato-saya" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#27272a"/>
              <stop offset="25%" stop-color="#09090b"/>
              <stop offset="75%" stop-color="#000000"/>
              <stop offset="100%" stop-color="#09090b"/>
            </linearGradient>
          </defs>

          <!-- 1. FOLDED KATANA WEAPON (Upper Register: Center Y=26, Graceful Sori) -->
          <!-- Kissaki & Upper Spine with Hamon Wave -->
          <path d="M 45 20 C 110 21, 210 25, 322 25 L 322 28 C 210 28, 110 24, 45 20 Z" fill="#ffffff" opacity="0.95"/>
          <!-- Ha (Cutting Edge) with Differential Tempered Steel -->
          <path d="M 45 20 C 110 24, 210 28, 322 28 L 322 34 C 210 37, 110 33, 45 20 Z" fill="url(#yamato-steel)"/>
          <!-- Chiseled Kissaki Tip yokote line -->
          <line x1="55" y1="20.5" x2="52" y2="28" stroke="#ffffff" stroke-width="0.8" opacity="0.9"/>
          <!-- Subtle Misty Hamon Reflection Wave -->
          <path d="M 60 25 Q 80 23, 100 26 Q 120 23, 140 26 Q 160 23, 180 26 Q 200 23, 220 26 Q 240 23, 260 26 Q 280 23, 300 26" stroke="rgba(255,255,255,0.75)" stroke-width="0.9" fill="none"/>
          <!-- Polished Gold Habaki Blade Collar -->
          <rect x="322" y="19" width="10" height="15" rx="1" fill="url(#yamato-gold)" stroke="#fde047" stroke-width="0.5"/>
          <line x1="327" y1="19" x2="327" y2="34" stroke="#854d0e" stroke-width="0.8"/>
          <!-- Enlarged Round Sukashi Pierced Tsuba (Y=8 to Y=44) -->
          <ellipse cx="334" cy="26" rx="5.5" ry="18" fill="#18181b" stroke="url(#yamato-gold)" stroke-width="1.2"/>
          <circle cx="334" cy="16" r="2.4" fill="#000000" stroke="#ca8a04" stroke-width="0.5"/>
          <circle cx="334" cy="36" r="2.4" fill="#000000" stroke="#ca8a04" stroke-width="0.5"/>
          <!-- Tsuka: Pure White Samegawa Rayskin + Deep Black Silk Ito -->
          <rect x="340" y="18" width="60" height="16" rx="2" fill="#ffffff" stroke="#18181b" stroke-width="0.8"/>
          <!-- Black Silk Ito Diamond Windows -->
          <line x1="346" y1="18" x2="356" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="356" y1="18" x2="346" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="360" y1="18" x2="370" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="370" y1="18" x2="360" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="374" y1="18" x2="384" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="384" y1="18" x2="374" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="388" y1="18" x2="398" y2="34" stroke="#000000" stroke-width="2.2"/>
          <line x1="398" y1="18" x2="388" y2="34" stroke="#000000" stroke-width="2.2"/>
          <!-- Gold Menuki Dragon Inset -->
          <circle cx="372" cy="26" r="2.2" fill="url(#yamato-gold)"/>
          <!-- Black Iron Kashira (Pommel Cap) with Gold Mount -->
          <rect x="400" y="18" width="8" height="16" rx="2" fill="#18181b" stroke="url(#yamato-gold)" stroke-width="0.8"/>

          <!-- 2. MASTERWORK SAYA AS STANDALONE PRODUCT (Mirror Roiro Gloss) -->
          <!-- Ambient Shadow -->
          <path d="M 40 80 C 110 82, 210 86, 340 82 L 340 86 C 210 90, 110 86, 40 84 Z" fill="rgba(0,0,0,0.6)"/>
          <!-- Mirror Lacquer Saya Body Volume -->
          <path d="M 42 64 C 110 65, 210 68, 336 68 L 336 84 C 210 87, 110 83, 42 80 Z" fill="url(#yamato-saya)" stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>
          <!-- Upper Specular Gloss Reflection -->
          <path d="M 44 65 C 110 66, 210 69, 336 69" stroke="rgba(255,255,255,0.38)" stroke-width="0.9" fill="none"/>
          <!-- Lower Occlusion Shadow -->
          <path d="M 44 79 C 110 82, 210 86, 336 83" stroke="rgba(0,0,0,0.9)" stroke-width="0.9" fill="none"/>
          <!-- Solid Gold Kojiri (End Cap) -->
          <path d="M 38 64 C 48 64, 58 66, 68 67 L 68 81 C 58 81, 48 77, 38 64 Z" fill="url(#yamato-gold)" stroke="#fde047" stroke-width="0.5"/>
          <!-- Gold Kurikata Knob & Tied Black/Gold Sageo Cord -->
          <rect x="250" y="62" width="10" height="20" rx="2" fill="url(#yamato-gold)" stroke="#fde047" stroke-width="0.5"/>
          <path d="M 255 72 C 265 74, 275 78, 285 75" stroke="#fde047" stroke-width="1.4" fill="none"/>
          <path d="M 255 73 C 265 75, 275 79, 285 76" stroke="#000000" stroke-width="0.8" fill="none"/>
          <!-- Solid Gold Koiguchi (Mouth Collar) & Slit -->
          <rect x="333" y="61" width="14" height="24" rx="1.5" fill="url(#yamato-gold)" stroke="#fde047" stroke-width="0.6"/>
          <rect x="344" y="65" width="3" height="16" fill="#000000"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 8. NORSE — ULFBERHT CRUCIBLE (Cold Bog-Iron Carolingian Sword)
  // =========================================================================
  'blade_norse_ulfberht': {
    id: 'blade_norse_ulfberht',
    name: 'Ulfberht Crucible',
    civilization: 'NORSE',
    rarity: 'epic',
    entitlementSku: 'dominion.blade.crucible01',
    description: 'Cold pattern-welded crucible iron sword forged without digital emissive glow. Broad 20px blade with wide deep fuller, non-emissive +VLFBERHT+ steel wire inlay, heavy iron crossbar, 5-lobed Viking pommel, and weathered oxhide scabbard.',
    material: {
      scabbardGrad: ['#291a12', '#1a100a', '#0f0905', '#060302', '#140c07'],
      brassGrad: ['#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'],
      bladeSteelUpper: ['#f4f4f5', '#e4e4e7', '#a1a1aa', '#71717a'],
      bladeSteelLower: ['#52525b', '#3f3f46', '#27272a', '#18181b'],
      bladeSpineColor: '#e4e4e7',
      fullerColor: '#09090b',
      fullerHighlight: 'rgba(255, 255, 255, 0.45)',
      gripGrad: ['#382415', '#24160a', '#170e06', '#0c0703'],
      gripRibsColor: '#71717a',
      throatOpeningColor: '#060302',
      sparkColor: '#e4e4e7',
    },
    silhouette: {
      bladeTypeLabel: 'Crucible Pattern-Welded Viking Sword',
      bladeWeightLabel: '1.25 kg · Broad Cleaving Iron',
      bladeCurvature: 'straight',
      bladeLengthPx: 216,
      // Cold iron, wide deep fuller, heavy bar guard, 5-lobed pommel
      bladeUpperPath: 'M -216 27 L -180 17 L 0 17 L 0 27 L -216 27 Z',
      bladeLowerPath: 'M -216 27 L -180 37 L 0 37 L 0 27 L -216 27 Z',
      bladeDropShadowPath: 'M -216 27 L -180 39 L 0 39 L 0 42 L -180 41 L -216 27 Z',
      spinePath: 'M -215 27 L -180 17.2 L 0 17.2',
      cuttingEdgePath: 'M -215 27 L -180 36.8 L 0 36.8',
      fullerBasePath: 'M -170 27 L -4 27',
      fullerHighlightPath: 'M -170 27.8 L -4 27.8',
      guardSvg: `
        <rect x="-4" y="9" width="10" height="36" rx="2" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.3"/>
      `,
      gripSvg: `
        <rect x="6" y="19" width="44" height="16" rx="2" fill="url(#grip-grad)" stroke="#52525b" stroke-width="0.8"/>
        <line x1="14" y1="19" x2="18" y2="35" stroke="#71717a" stroke-width="1.4"/>
        <line x1="22" y1="19" x2="26" y2="35" stroke="#71717a" stroke-width="1.4"/>
        <line x1="30" y1="19" x2="34" y2="35" stroke="#71717a" stroke-width="1.4"/>
        <line x1="38" y1="19" x2="42" y2="35" stroke="#71717a" stroke-width="1.4"/>
      `,
      pommelSvg: `
        <path d="M 50 16 C 53 14, 57 14, 60 16 C 63 15, 67 15, 70 17 C 72 20, 72 34, 70 37 C 67 39, 63 39, 60 38 C 57 40, 53 40, 50 38 Z" fill="url(#brass-grad)" stroke="#52525b" stroke-width="0.8"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 16 L 240 16 L 240 38 L 38 38 Z" fill="url(#scabbard-grad)"/>
        <line x1="38" y1="16.5" x2="240" y2="16.5" stroke="rgba(255,255,255,0.18)" stroke-width="0.8"/>
        <line x1="38" y1="37.5" x2="240" y2="37.5" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
      `,
      scabbardChapeSvg: `
        <path d="M 12 27 C 12 21, 20 16, 32 16 L 42 16 L 42 38 L 32 38 C 20 38, 12 33, 12 27 Z" fill="url(#brass-grad)"/>
      `,
      scabbardThroatSvg: `
        <rect x="238" y="12" width="14" height="30" rx="1.5" fill="url(#brass-grad)"/>
        <rect x="248" y="17" width="4" height="20" fill="#060302"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="norse-iron-upper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#e4e4e7"/>
              <stop offset="40%" stop-color="#cbd5e1"/>
              <stop offset="100%" stop-color="#64748b"/>
            </linearGradient>
            <linearGradient id="norse-iron-lower" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="50%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="norse-guard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#71717a"/>
              <stop offset="50%" stop-color="#3f3f46"/>
              <stop offset="100%" stop-color="#18181b"/>
            </linearGradient>
            <linearGradient id="norse-scabbard" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#3f2314"/>
              <stop offset="30%" stop-color="#291a12"/>
              <stop offset="70%" stop-color="#180f0a"/>
              <stop offset="100%" stop-color="#0a0503"/>
            </linearGradient>
          </defs>

          <!-- 1. BROAD CAROLINGIAN SWORD (Center Y=26, Width 20px, Cold Bog Iron) -->
          <!-- Upper Bevel (Non-Emissive Matte Metal) -->
          <polygon points="42,26 80,16 328,16 328,26 80,26" fill="url(#norse-iron-upper)"/>
          <!-- Lower Bevel (Shadowed Iron) -->
          <polygon points="42,26 328,26 328,36 80,36 80,26" fill="url(#norse-iron-lower)"/>
          <!-- Wide Deep Central Fuller (Height 8px) -->
          <rect x="82" y="22" width="240" height="8" rx="2" fill="#09090b"/>
          <line x1="84" y1="22.5" x2="320" y2="22.5" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
          <!-- Non-Emissive +VLFBERHT+ Cold Steel Wire Inlay -->
          <text x="200" y="28" text-anchor="middle" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="7" fill="#d4d4d8" letter-spacing="3">+VLFBERHT+</text>
          <!-- Guard Contact Shadow -->
          <rect x="325" y="16" width="3" height="20" fill="rgba(0,0,0,0.55)"/>
          <!-- Heavy Thick Iron Crossbar (Y=8 to Y=44) -->
          <rect x="328" y="8" width="12" height="36" rx="2" fill="url(#norse-guard)" stroke="#71717a" stroke-width="0.6"/>
          <line x1="334" y1="8" x2="334" y2="44" stroke="#18181b" stroke-width="1.2"/>
          <!-- Sturdy Dark Oiled Leather Grip with Spiral Cord Wraps -->
          <rect x="340" y="18" width="58" height="16" rx="2" fill="#24160a" stroke="#52525b" stroke-width="0.8"/>
          <line x1="348" y1="18" x2="354" y2="34" stroke="#71717a" stroke-width="1.4"/>
          <line x1="358" y1="18" x2="364" y2="34" stroke="#71717a" stroke-width="1.4"/>
          <line x1="368" y1="18" x2="374" y2="34" stroke="#71717a" stroke-width="1.4"/>
          <line x1="378" y1="18" x2="384" y2="34" stroke="#71717a" stroke-width="1.4"/>
          <line x1="388" y1="18" x2="394" y2="34" stroke="#71717a" stroke-width="1.4"/>
          <!-- 5-Lobed Viking Pommel (Petersen Type Z with Distinct Lobes) -->
          <path d="M 398 18 C 401 13, 407 13, 410 15 C 413 11, 420 11, 423 15 C 426 12, 431 15, 433 19 C 435 23, 435 29, 433 33 C 431 37, 426 40, 423 37 C 420 41, 413 41, 410 37 C 407 39, 401 39, 398 34 Z" fill="url(#norse-guard)" stroke="#71717a" stroke-width="0.8"/>
          <!-- Copper Inlay Seams between lobes -->
          <line x1="410" y1="15" x2="410" y2="37" stroke="#b45309" stroke-width="0.8"/>
          <line x1="423" y1="15" x2="423" y2="37" stroke="#b45309" stroke-width="0.8"/>

          <!-- 2. WEATHERED OXHIDE SCABBARD (Center Y=70, Body H=18px) -->
          <!-- Ambient Shadow -->
          <rect x="65" y="79" width="272" height="6" rx="3" fill="rgba(0,0,0,0.55)"/>
          <!-- Weathered Oxhide Body Volume -->
          <rect x="68" y="61" width="268" height="18" rx="2" fill="url(#norse-scabbard)" stroke="rgba(255,255,255,0.1)" stroke-width="0.6"/>
          <!-- Upper Specular Highlight Rim -->
          <line x1="68" y1="62" x2="336" y2="62" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>
          <!-- Lower Occlusion Shadow -->
          <line x1="68" y1="78" x2="336" y2="78" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
          <!-- Weathered Leather Tonal Variations -->
          <line x1="110" y1="66" x2="150" y2="66" stroke="rgba(255,255,255,0.06)" stroke-width="1.2"/>
          <line x1="200" y1="74" x2="250" y2="74" stroke="rgba(0,0,0,0.3)" stroke-width="1.2"/>
          <!-- Iron/Bronze Chape with Raven Contour -->
          <path d="M 44 70 C 44 63, 54 61, 70 61 L 70 79 C 54 79, 44 77, 44 70 Z" fill="url(#norse-guard)" stroke="#71717a" stroke-width="0.5"/>
          <circle cx="56" cy="70" r="2.8" fill="#18181b"/>
          <!-- Heavy Iron Throat Collar with Opening -->
          <rect x="333" y="58" width="14" height="24" rx="1.5" fill="url(#norse-guard)" stroke="#71717a" stroke-width="0.5"/>
          <rect x="344" y="62" width="3" height="16" fill="#060302"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 9. MAYA — MACUAHUITL OF THE SUN (Carved Ironwood & Prismatic Obsidian)
  // =========================================================================
  'blade_maya_macuahuitl': {
    id: 'blade_maya_macuahuitl',
    name: 'Macuahuitl of the Sun',
    civilization: 'MAYA',
    rarity: 'legendary',
    entitlementSku: 'dominion.blade.sunmacuahuitl01',
    description: 'Bespoke Mesoamerican macuahuitl of dense Guatemalan rosewood studded with 22 individually knapped prismatic obsidian blades. Neutral specular glass glints, zero cyan glow, braided grip, and engineered protective hide carrier.',
    material: {
      scabbardGrad: ['#3b1b0b', '#241006', '#140803', '#0a0401', '#1e0c04'],
      brassGrad: ['#0f766e', '#115e59', '#134e4a', '#042f2e', '#0d9488'],
      bladeSteelUpper: ['#18181b', '#27272a', '#3f3f46', '#09090b'],
      bladeSteelLower: ['#09090b', '#18181b', '#000000', '#27272a'],
      bladeSpineColor: '#d97706',
      fullerColor: '#241006',
      fullerHighlight: 'rgba(251, 191, 36, 0.8)',
      gripGrad: ['#d97706', '#b45309', '#78350f', '#451a03'],
      gripRibsColor: '#10b981',
      pommelGemColor: '#10b981',
      throatOpeningColor: '#0a0401',
      sparkColor: '#fbbf24',
    },
    silhouette: {
      bladeTypeLabel: 'Carved Hardwood Paddle & Prismatic Obsidian',
      bladeWeightLabel: '1.45 kg · Cleaving & Laceration Impact',
      bladeCurvature: 'serrated_obsidian',
      bladeLengthPx: 216,
      // Paddle core with 11 knapped obsidian teeth per side
      bladeUpperPath: 'M -216 27 L -205 16 L -190 22 L -175 16 L -160 22 L -145 16 L -130 22 L -115 16 L -100 22 L -85 16 L -70 22 L -55 16 L -40 22 L -25 16 L -10 22 L 0 20 L 0 27 Z',
      bladeLowerPath: 'M -216 27 L -205 38 L -190 32 L -175 38 L -160 32 L -145 38 L -130 32 L -115 38 L -100 32 L -85 38 L -70 32 L -55 38 L -40 32 L -25 38 L -10 32 L 0 34 L 0 27 Z',
      bladeDropShadowPath: 'M -216 27 L -205 40 L -175 40 L -145 40 L -115 40 L -85 40 L -55 40 L -25 40 L 0 36 L 0 39 L -216 27 Z',
      spinePath: 'M -216 27 L 0 27',
      cuttingEdgePath: 'M -216 27 L -205 37.8 L -190 32 L -175 37.8 L -160 32 L -145 37.8 L -130 32 L -115 37.8 L -100 32 L -85 37.8 L -70 32 L -55 37.8 L -40 32 L -25 37.8 L -10 32 L 0 33.8',
      guardSvg: `
        <rect x="-3" y="14" width="8" height="26" rx="2" fill="#78350f" stroke="#10b981" stroke-width="0.8"/>
        <circle cx="1" cy="27" r="2.2" fill="#10b981"/>
      `,
      gripSvg: `
        <rect x="5" y="19" width="42" height="16" rx="2" fill="url(#grip-grad)" stroke="#10b981" stroke-width="0.8"/>
        <line x1="12" y1="19" x2="16" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="20" y1="19" x2="24" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="28" y1="19" x2="32" y2="35" stroke="#fde047" stroke-width="1.4"/>
        <line x1="36" y1="19" x2="40" y2="35" stroke="#fde047" stroke-width="1.4"/>
      `,
      pommelSvg: `
        <rect x="47" y="18" width="10" height="18" rx="2" fill="#78350f" stroke="#10b981" stroke-width="0.8"/>
        <circle cx="52" cy="27" r="3" fill="#10b981"/>
      `,
      scabbardBodySvg: `
        <rect x="35" y="15" width="205" height="24" rx="3" fill="url(#scabbard-grad)" stroke="#10b981" stroke-width="0.6"/>
        <line x1="35" y1="16" x2="240" y2="16" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
        <line x1="35" y1="38" x2="240" y2="38" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
        <line x1="90" y1="15" x2="90" y2="39" stroke="#d97706" stroke-width="2"/>
        <line x1="150" y1="15" x2="150" y2="39" stroke="#d97706" stroke-width="2"/>
        <line x1="210" y1="15" x2="210" y2="39" stroke="#d97706" stroke-width="2"/>
      `,
      scabbardChapeSvg: `
        <rect x="15" y="15" width="22" height="24" rx="2" fill="#78350f" stroke="#10b981" stroke-width="0.8"/>
        <circle cx="26" cy="27" r="3" fill="#10b981"/>
      `,
      scabbardThroatSvg: `
        <rect x="238" y="13" width="14" height="28" rx="2" fill="#78350f" stroke="#10b981" stroke-width="0.8"/>
        <rect x="248" y="17" width="4" height="20" fill="#0a0401"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="maya-wood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#78350f"/>
              <stop offset="35%" stop-color="#54280b"/>
              <stop offset="70%" stop-color="#3b1b0b"/>
              <stop offset="100%" stop-color="#1e0c04"/>
            </linearGradient>
            <linearGradient id="maya-obsidian" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#27272a"/>
              <stop offset="30%" stop-color="#18181b"/>
              <stop offset="70%" stop-color="#09090b"/>
              <stop offset="100%" stop-color="#000000"/>
            </linearGradient>
            <linearGradient id="maya-carrier" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#451a03"/>
              <stop offset="30%" stop-color="#2c1204"/>
              <stop offset="70%" stop-color="#180902"/>
              <stop offset="100%" stop-color="#0a0401"/>
            </linearGradient>
          </defs>

          <!-- 1. MACUAHUITL PADDLE & OBSIDIAN TEETH (Center Y=26, Zero Cyan Glow) -->
          <!-- Wooden Core Paddle (Tapering from 22px width down to 14px at grip) -->
          <polygon points="48,26 80,18 330,19 330,33 80,34" fill="url(#maya-wood)"/>
          <line x1="50" y1="26" x2="330" y2="26" stroke="#b45309" stroke-width="1.2" opacity="0.8"/>
          <!-- 11 Prismatic Obsidian Blades on Top Edge (Neutral Glass Specular Glints) -->
          <polygon points="90,19 96,11 106,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
          <polygon points="112,19 119,10 128,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
          <polygon points="134,19 141,11 150,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
          <polygon points="156,19 163,10 172,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
          <polygon points="178,19 185,11 194,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
          <polygon points="200,19 207,10 216,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
          <polygon points="222,19 229,11 238,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
          <polygon points="244,19 251,10 260,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
          <polygon points="266,19 273,11 282,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
          <polygon points="288,19 295,10 304,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
          <polygon points="310,19 317,11 326,19" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
          <!-- 11 Prismatic Obsidian Blades on Bottom Edge -->
          <polygon points="90,33 96,41 106,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
          <polygon points="112,33 119,42 128,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
          <polygon points="134,33 141,41 150,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
          <polygon points="156,33 163,42 172,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
          <polygon points="178,33 185,41 194,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
          <polygon points="200,33 207,42 216,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
          <polygon points="222,33 229,41 238,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
          <polygon points="244,33 251,42 260,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
          <polygon points="266,33 273,41 282,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
          <polygon points="288,33 295,42 304,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
          <polygon points="310,33 317,41 326,33" fill="url(#maya-obsidian)" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
          <!-- Hardwood Collar & Braided Grip -->
          <rect x="328" y="14" width="10" height="24" rx="2" fill="#54280b" stroke="#10b981" stroke-width="0.8"/>
          <circle cx="333" cy="26" r="2.2" fill="#10b981"/>
          <rect x="338" y="18" width="58" height="16" rx="2" fill="#b45309" stroke="#78350f" stroke-width="0.8"/>
          <line x1="348" y1="18" x2="352" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="358" y1="18" x2="362" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="368" y1="18" x2="372" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="378" y1="18" x2="382" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <line x1="388" y1="18" x2="392" y2="34" stroke="#fde047" stroke-width="1.4"/>
          <!-- Carved Square Wooden Pommel with Jade Bead & Wrist Lanyard -->
          <rect x="396" y="17" width="12" height="18" rx="2" fill="#54280b" stroke="#10b981" stroke-width="0.8"/>
          <circle cx="402" cy="26" r="3.2" fill="#10b981"/>
          <path d="M 408 26 C 418 28, 428 32, 436 36" stroke="#b45309" stroke-width="1.8" fill="none"/>

          <!-- 2. ENGINEERED PROTECTIVE EDGE CARRIER (Center Y=71, Thickness 24px) -->
          <!-- Ambient Shadow -->
          <rect x="65" y="80" width="272" height="6" rx="3" fill="rgba(0,0,0,0.55)"/>
          <!-- Hardwood & Rawhide Carrier Shell -->
          <rect x="68" y="59" width="268" height="24" rx="3" fill="url(#maya-carrier)" stroke="#10b981" stroke-width="0.8"/>
          <!-- Specular Upper Highlight -->
          <line x1="68" y1="60" x2="336" y2="60" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>
          <!-- Four Thick Dyed Leather Binding Straps with Bone Toggles -->
          <rect x="120" y="57" width="8" height="28" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="124" cy="71" r="2" fill="#fef08a"/>
          <rect x="175" y="57" width="8" height="28" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="179" cy="71" r="2" fill="#fef08a"/>
          <rect x="230" y="57" width="8" height="28" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="234" cy="71" r="2" fill="#fef08a"/>
          <rect x="285" y="57" width="8" height="28" rx="1" fill="#78350f" stroke="#fde047" stroke-width="0.4"/>
          <circle cx="289" cy="71" r="2" fill="#fef08a"/>
          <!-- Chape Cap with Jade Inlay -->
          <rect x="44" y="59" width="26" height="24" rx="2" fill="#54280b" stroke="#10b981" stroke-width="0.8"/>
          <circle cx="57" cy="71" r="3.5" fill="#10b981"/>
          <!-- Entrance Throat Collar -->
          <rect x="333" y="57" width="14" height="28" rx="2" fill="#54280b" stroke="#10b981" stroke-width="0.8"/>
          <rect x="344" y="62" width="3" height="18" fill="#0a0401"/>
        </svg>
      `,
    },
  },

  // =========================================================================
  // 10. PLAINS FORGED COMMAND (Distinctive Clip-Point & Saddle Sheath)
  // =========================================================================
  'blade_lakota_command': {
    id: 'blade_lakota_command',
    name: 'Plains Forged Command',
    civilization: 'LAKOTA',
    rarity: 'rare',
    entitlementSku: 'dominion.blade.warclub01',
    description: 'Bespoke high-carbon fighting blade with distinctive clip-point swedge profile, solid brass dual-quillon guard, river-walnut ergonomic handle with brass cutlery rivets, and purpose-built heavy saddle-leather sheath.',
    material: {
      scabbardGrad: ['#451a03', '#2b1002', '#1a0901', '#0f0500', '#200c02'],
      brassGrad: ['#fef08a', '#d97706', '#92400e', '#78350f', '#ca8a04'],
      bladeSteelUpper: ['#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8'],
      bladeSteelLower: ['#475569', '#334155', '#1e293b', '#0f172a'],
      bladeSpineColor: '#fde047',
      fullerColor: '#1a0901',
      fullerHighlight: 'rgba(254, 240, 138, 0.85)',
      gripGrad: ['#451a03', '#2e1202', '#1c0a01', '#0f0500'],
      gripRibsColor: '#ca8a04',
      pommelGemColor: '#b45309',
      throatOpeningColor: '#0f0500',
      sparkColor: '#fbbf24',
    },
    silhouette: {
      bladeTypeLabel: 'Clip-Point Carbon Steel & Walnut',
      bladeWeightLabel: '0.86 kg · Precision Cleaving Point',
      bladeCurvature: 'straight',
      bladeLengthPx: 216,
      // Pronounced clip-point swedge profile (not generic bowie)
      bladeUpperPath: 'M -216 26 C -185 18, -140 16, -16 16 L 0 16 L 0 20 L -6 20 L -6 27 L -216 27 Z',
      bladeLowerPath: 'M -216 26 C -180 38, -110 37, -6 36 L 0 36 L 0 27 L -216 27 Z',
      bladeDropShadowPath: 'M -216 26 C -180 40, -110 39, -6 38 L 0 38 L 0 41 L -110 40 L -180 40 L -216 26 Z',
      spinePath: 'M -216 26 C -185 18.2, -140 16.2, -16 16.2 L 0 16.2',
      cuttingEdgePath: 'M -216 26 C -180 37.8, -110 36.8, -6 35.8 L 0 35.8',
      guardSvg: `
        <path d="M -6 8 L 2 11 L 6 16 L 6 38 L 2 43 L -6 46 L -6 41 L 1 37 L 2 17 L -6 13 Z" fill="url(#brass-grad)" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.6"/>
        <circle cx="-5" cy="10" r="2.2" fill="#d97706" stroke="#fde047" stroke-width="0.5"/>
        <circle cx="-5" cy="44" r="2.2" fill="#d97706" stroke="#fde047" stroke-width="0.5"/>
        <polygon points="1,24 6,27 1,30" fill="#78350f"/>
        <circle cx="2" cy="27" r="1.8" fill="#fde047"/>
      `,
      gripSvg: `
        <path d="M 6 18 C 16 16, 28 16, 42 18 L 41 36 C 28 38, 16 38, 6 36 Z" fill="url(#grip-grad)" stroke="#ca8a04" stroke-width="0.8"/>
        <circle cx="16" cy="27" r="2" fill="url(#brass-grad)" stroke="#fde047" stroke-width="0.5"/>
        <circle cx="27" cy="27" r="2" fill="url(#brass-grad)" stroke="#fde047" stroke-width="0.5"/>
        <circle cx="38" cy="27" r="2" fill="url(#brass-grad)" stroke="#fde047" stroke-width="0.5"/>
      `,
      pommelSvg: `
        <path d="M 41 18 C 48 19, 56 23, 58 32 C 59 40, 52 44, 46 41 L 41 36 Z" fill="url(#grip-grad)" stroke="#ca8a04" stroke-width="0.8"/>
        <path d="M 48 20 C 56 24, 59 31, 58 39 L 52 42 C 54 35, 52 28, 45 23 Z" fill="url(#brass-grad)" stroke="#fde047" stroke-width="0.6"/>
        <circle cx="51" cy="33" r="2.2" fill="#2e1202" stroke="#fde047" stroke-width="0.6"/>
      `,
      scabbardBodySvg: `
        <path d="M 38 16 L 240 16 L 240 38 L 38 38 Z" fill="url(#scabbard-grad)"/>
        <line x1="38" y1="16.5" x2="240" y2="16.5" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>
        <line x1="38" y1="37.5" x2="240" y2="37.5" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
        <line x1="42" y1="20" x2="236" y2="20" stroke="#fde047" stroke-width="0.8" stroke-dasharray="3 2"/>
        <line x1="42" y1="34" x2="236" y2="34" stroke="#fde047" stroke-width="0.8" stroke-dasharray="3 2"/>
      `,
      scabbardChapeSvg: `
        <path d="M 14 27 C 14 21, 22 16, 34 16 L 42 16 L 42 38 L 34 38 C 22 38, 14 33, 14 27 Z" fill="url(#brass-grad)"/>
        <circle cx="25" cy="27" r="2.5" fill="#78350f"/>
      `,
      scabbardThroatSvg: `
        <rect x="238" y="12" width="14" height="30" rx="1.5" fill="url(#brass-grad)"/>
        <circle cx="245" cy="18" r="2" fill="#78350f"/>
        <circle cx="245" cy="36" r="2" fill="#78350f"/>
        <rect x="248" y="17" width="4" height="20" fill="#0f0500"/>
      `,
      heroPreviewSvg: `
        <svg viewBox="0 0 540 96" width="100%" height="96">
          <defs>
            <linearGradient id="plains-steel-upper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="40%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#cbd5e1"/>
            </linearGradient>
            <linearGradient id="plains-steel-lower" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="50%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="plains-brass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="40%" stop-color="#eab308"/>
              <stop offset="80%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>
            <linearGradient id="plains-walnut" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#54280b"/>
              <stop offset="40%" stop-color="#3b1b0b"/>
              <stop offset="80%" stop-color="#241006"/>
              <stop offset="100%" stop-color="#140803"/>
            </linearGradient>
            <linearGradient id="plains-sheath" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#5c2607"/>
              <stop offset="30%" stop-color="#451a03"/>
              <stop offset="70%" stop-color="#2b1002"/>
              <stop offset="100%" stop-color="#120600"/>
            </linearGradient>
          </defs>

          <!-- 1. CARBON STEEL FIGHTING BLADE (Center Y=26, Concave Clip & Choil Notch) -->
          <!-- Blade Upper Spine & Swedge with Choil Step -->
          <path d="M 44 26 C 85 18, 140 16, 210 16 L 315 16 L 315 20 L 328 20 L 328 26 L 210 26 C 140 26, 85 26, 44 26 Z" fill="url(#plains-steel-upper)"/>
          <!-- Blade Lower Face & Cutting Belly -->
          <path d="M 44 26 C 85 26, 140 26, 210 26 L 328 26 L 328 35 C 240 37, 160 38, 100 37 C 70 35, 52 30, 44 26 Z" fill="url(#plains-steel-lower)"/>
          <!-- Sharpened False-Edge Top Swedge Catchlight -->
          <path d="M 44 26 C 80 19, 130 16.5, 205 16" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.95"/>
          <!-- Ricasso Spanish Choil Step Notch -->
          <line x1="315" y1="16" x2="315" y2="20" stroke="#78350f" stroke-width="1.4"/>
          <!-- Guard Contact Shadow -->
          <rect x="325" y="12" width="4" height="28" fill="rgba(0,0,0,0.5)"/>
          <!-- Solid Brass Faceted Guard with Flared Disk Quillons -->
          <path d="M 326 6 L 332 9 L 336 15 L 336 37 L 332 43 L 326 46 L 326 41 L 331 37 L 332 15 L 326 11 Z" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.6"/>
          <circle cx="327" cy="8" r="2.5" fill="#ca8a04" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="327" cy="44" r="2.5" fill="#ca8a04" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="333" cy="26" r="2.2" fill="#78350f"/>
          <!-- Ergonomic River-Walnut Handle with 3 Polished Brass Cutlery Pins -->
          <path d="M 336 18 C 352 16, 370 16, 395 18 L 392 35 C 370 37, 352 37, 336 35 Z" fill="url(#plains-walnut)" stroke="#ca8a04" stroke-width="0.8"/>
          <circle cx="350" cy="26" r="2.2" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="365" cy="26" r="2.2" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="380" cy="26" r="2.2" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.5"/>
          <!-- Raptor-Beak Walnut Butt Capped with Brass Heel Plate -->
          <path d="M 395 18 C 404 20, 414 26, 413 36 C 410 42, 402 43, 392 35 Z" fill="url(#plains-walnut)" stroke="#ca8a04" stroke-width="0.8"/>
          <path d="M 402 19 C 412 24, 416 32, 414 41 L 407 43 C 410 35, 406 27, 398 21 Z" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.6"/>
          <circle cx="405" cy="33" r="2.4" fill="#2e1202" stroke="#fde047" stroke-width="0.6"/>

          <!-- 2. SADDLE-LEATHER SHEATH (Center Y=70, Double Welt Stitching) -->
          <!-- Ambient Shadow -->
          <rect x="65" y="78" width="272" height="6" rx="3" fill="rgba(0,0,0,0.55)"/>
          <!-- Heavy Saddle Leather Sheath Body -->
          <rect x="68" y="61" width="268" height="18" rx="2" fill="url(#plains-sheath)" stroke="rgba(255,255,255,0.1)" stroke-width="0.6"/>
          <!-- Upper Specular Rim Highlight -->
          <line x1="68" y1="62" x2="336" y2="62" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>
          <!-- Lower Occlusion Shadow -->
          <line x1="68" y1="78" x2="336" y2="78" stroke="rgba(0,0,0,0.85)" stroke-width="0.8"/>
          <!-- Double-Row Perimeter Saddle Stitching -->
          <line x1="72" y1="65" x2="332" y2="65" stroke="#fde047" stroke-width="0.8" stroke-dasharray="3 2"/>
          <line x1="72" y1="75" x2="332" y2="75" stroke="#fde047" stroke-width="0.8" stroke-dasharray="3 2"/>
          <!-- Brass Chape Cap -->
          <path d="M 44 70 C 44 63, 54 61, 70 61 L 70 79 C 54 79, 44 77, 44 70 Z" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="56" cy="70" r="2.5" fill="#78350f"/>
          <!-- Throat Fitting with Two Copper Reinforcement Rivets -->
          <rect x="333" y="58" width="14" height="24" rx="1.5" fill="url(#plains-brass)" stroke="#fde047" stroke-width="0.5"/>
          <circle cx="340" cy="63" r="1.8" fill="#b45309"/>
          <circle cx="340" cy="77" r="1.8" fill="#b45309"/>
          <rect x="344" y="62" width="3" height="16" fill="#0f0500"/>
        </svg>
      `,
    },
  },
};

const BLADE_ALIASES: Record<string, string> = {
  'blade_lakota_warclub': 'blade_lakota_command',
  'blade_blackhills01': 'blade_lakota_command',
  'dominion.blade.blackhills01': 'blade_lakota_command',
  'blade_roma_legion': 'blade_roma_gladius',
  'dominion.blade.legion01': 'blade_roma_gladius',
  'blade_han_celestial': 'blade_han_jian',
  'dominion.blade.celestial01': 'blade_han_jian',
  'blade_yamato_shogunate': 'blade_yamato_katana',
  'dominion.blade.shogunate01': 'blade_yamato_katana',
  'blade_norse_raven': 'blade_norse_broad',
  'dominion.blade.raven01': 'blade_norse_broad',
  'blade_pers_shamshir': 'blade_pers_shamshir',
  'dominion.blade.shamshir01': 'blade_pers_shamshir',
  'blade_misir_khopesh': 'blade_misir_khopesh',
  'dominion.blade.misir01': 'blade_misir_khopesh',
  'blade_maya_macuahuitl': 'blade_maya_macuahuitl',
  'dominion.blade.macuahuitl01': 'blade_maya_macuahuitl',
  'blade_turk_imperial': 'blade_turk_imperial',
  'dominion.blade.imperial01': 'blade_turk_imperial',
  'blade_standard': 'blade_standard',
  'dominion.blade.standard': 'blade_standard',
};

export function getBladeSkin(id?: string | null): CommandBladeSkinDescriptor {
  if (!id) return BLADE_SKINS['blade_standard'];
  if (BLADE_SKINS[id]) return BLADE_SKINS[id];
  const mapped = BLADE_ALIASES[id];
  if (mapped && BLADE_SKINS[mapped]) return BLADE_SKINS[mapped];
  const lower = id.toLowerCase();
  for (const [_, blade] of Object.entries(BLADE_SKINS)) {
    if (blade.civilization && lower.includes(blade.civilization.toLowerCase())) return blade;
  }
  return BLADE_SKINS['blade_standard'];
}

export function getAllBladeSkins(): CommandBladeSkinDescriptor[] {
  return Object.values(BLADE_SKINS);
}
