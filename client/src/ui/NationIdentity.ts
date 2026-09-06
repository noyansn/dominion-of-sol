/**
 * DOMINION OF SOL — NATION IDENTITY & DUAL VEXILLOLOGY SYSTEM
 * Single authoritative NationIdentity specification rendered into:
 * 1. Standard Rectangular Flag (3:2)
 * 2. Vertical Command Pennant (1:2.8 swallowtail)
 */

export type FlagLayout =
  | 'solid'
  | 'bicolor-h'
  | 'bicolor-v'
  | 'triband-h'
  | 'triband-v'
  | 'cross'
  | 'saltire'
  | 'canton'
  | 'center-field';

export type EmblemType =
  | 'none'
  | 'crescent-star'
  | 'eagle'
  | 'lion'
  | 'sun'
  | 'star'
  | 'wheel'
  | 'dragon'
  | 'spearhead'
  | 'laurel'
  | 'pyramid'
  | 'scarab'
  | 'anchor'
  | 'shield'
  | 'chevron';

export interface NationIdentity {
  id: string;
  name: string;
  adjective?: string;
  layout: FlagLayout;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emblem: EmblemType;
  emblemColor?: string;
}

export const PRESET_NATION_IDENTITIES: Record<string, NationIdentity> = {
  // Central Asia Steppe
  hun: {
    id: 'hun',
    name: 'HUN',
    adjective: 'Hunnic',
    layout: 'solid',
    primaryColor: '#78350f', // Steppe earth bronze
    secondaryColor: '#d97706',
    accentColor: '#fef08a',
    emblem: 'spearhead',
    emblemColor: '#fef08a',
  },
  gokturk: {
    id: 'gokturk',
    name: 'GÖKTÜRK',
    adjective: 'Göktürk',
    layout: 'triband-h',
    primaryColor: '#0284c7', // Celestial Kök Tengri azure
    secondaryColor: '#0369a1',
    accentColor: '#fef08a',
    emblem: 'star',
    emblemColor: '#fef08a',
  },
  // Sovereign Armory Ottoman Imperial Decoupled Heritage
  ottoman: {
    id: 'ottoman',
    name: 'OTTOMAN IMPERIAL',
    adjective: 'Ottoman',
    layout: 'solid',
    primaryColor: '#80121d', // Deep Ottoman Imperial Crimson
    secondaryColor: '#ffffff',
    accentColor: '#dfbc73',
    emblem: 'crescent-star',
    emblemColor: '#ffffff',
  },
  turk: {
    id: 'turk',
    name: 'OTTOMAN IMPERIAL',
    adjective: 'Ottoman',
    layout: 'solid',
    primaryColor: '#80121d',
    secondaryColor: '#ffffff',
    accentColor: '#dfbc73',
    emblem: 'crescent-star',
    emblemColor: '#ffffff',
  },

  // Europe
  roma: {
    id: 'roma',
    name: 'ROMA',
    adjective: 'Roman',
    layout: 'center-field',
    primaryColor: '#7a1828',
    secondaryColor: '#cda851',
    accentColor: '#ffffff',
    emblem: 'eagle',
    emblemColor: '#dfbc73',
  },
  hellen: {
    id: 'hellen',
    name: 'HELLEN',
    adjective: 'Hellenic',
    layout: 'cross',
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    accentColor: '#dfbc73',
    emblem: 'anchor',
    emblemColor: '#ffffff',
  },
  gaul: {
    id: 'gaul',
    name: 'GAUL',
    adjective: 'Gallic',
    layout: 'solid',
    primaryColor: '#16a34a',
    secondaryColor: '#ca8a04',
    accentColor: '#ffffff',
    emblem: 'shield',
    emblemColor: '#ca8a04',
  },
  norse: {
    id: 'norse',
    name: 'NORSE',
    adjective: 'Norse',
    layout: 'cross',
    primaryColor: '#1d4872',
    secondaryColor: '#dfbc73',
    accentColor: '#b92828',
    emblem: 'spearhead',
    emblemColor: '#ffffff',
  },
  rus: {
    id: 'rus',
    name: 'RUS',
    adjective: 'Rus',
    layout: 'bicolor-h',
    primaryColor: '#b45309',
    secondaryColor: '#1e3a8a',
    accentColor: '#ffffff',
    emblem: 'eagle',
    emblemColor: '#ffffff',
  },

  // Africa
  misir: {
    id: 'misir',
    name: 'MISIR',
    adjective: 'Egyptian',
    layout: 'triband-h',
    primaryColor: '#9c2626',
    secondaryColor: '#f1efe8',
    accentColor: '#11161d',
    emblem: 'sun',
    emblemColor: '#cda851',
  },
  amazigh: {
    id: 'amazigh',
    name: 'AMAZIGH',
    adjective: 'Amazigh',
    layout: 'triband-h',
    primaryColor: '#1e3a8a',
    secondaryColor: '#ca8a04',
    accentColor: '#16a34a',
    emblem: 'star',
    emblemColor: '#ffffff',
  },
  aksum: {
    id: 'aksum',
    name: 'AKSUM',
    adjective: 'Aksumite',
    layout: 'triband-v',
    primaryColor: '#4c1d95',
    secondaryColor: '#d97706',
    accentColor: '#ffffff',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },
  mali: {
    id: 'mali',
    name: 'MALI',
    adjective: 'Malian',
    layout: 'triband-v',
    primaryColor: '#ca8a04',
    secondaryColor: '#78350f',
    accentColor: '#16a34a',
    emblem: 'star',
    emblemColor: '#ffffff',
  },
  yoruba: {
    id: 'yoruba',
    name: 'YORUBA',
    adjective: 'Yoruba',
    layout: 'center-field',
    primaryColor: '#c2410c',
    secondaryColor: '#1e3a8a',
    accentColor: '#ffffff',
    emblem: 'wheel',
    emblemColor: '#dfbc73',
  },
  kongo: {
    id: 'kongo',
    name: 'KONGO',
    adjective: 'Kongo',
    layout: 'saltire',
    primaryColor: '#92400e',
    secondaryColor: '#1e293b',
    accentColor: '#dfbc73',
    emblem: 'spearhead',
    emblemColor: '#dfbc73',
  },
  swahili: {
    id: 'swahili',
    name: 'SWAHILI',
    adjective: 'Swahili',
    layout: 'bicolor-h',
    primaryColor: '#0891b2',
    secondaryColor: '#f8fafc',
    accentColor: '#ca8a04',
    emblem: 'anchor',
    emblemColor: '#0891b2',
  },
  zulu: {
    id: 'zulu',
    name: 'ZULU',
    adjective: 'Zulu',
    layout: 'bicolor-h',
    primaryColor: '#7f1d1d',
    secondaryColor: '#0f172a',
    accentColor: '#ffffff',
    emblem: 'shield',
    emblemColor: '#ffffff',
  },

  // West Asia / Caucasus
  pers: {
    id: 'pers',
    name: 'PERS',
    adjective: 'Persian',
    layout: 'triband-h',
    primaryColor: '#1d543b',
    secondaryColor: '#ffffff',
    accentColor: '#962323',
    emblem: 'lion',
    emblemColor: '#dfbc73',
  },
  assyria: {
    id: 'assyria',
    name: 'ASSYRIA',
    adjective: 'Assyrian',
    layout: 'center-field',
    primaryColor: '#1d4ed8',
    secondaryColor: '#e2e8f0',
    accentColor: '#b91c1c',
    emblem: 'wheel',
    emblemColor: '#b91c1c',
  },
  arab: {
    id: 'arab',
    name: 'ARAB',
    adjective: 'Arabian',
    layout: 'triband-h',
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    accentColor: '#0f172a',
    emblem: 'star',
    emblemColor: '#ffffff',
  },
  armenian: {
    id: 'armenian',
    name: 'ARMENIAN',
    adjective: 'Armenian',
    layout: 'triband-h',
    primaryColor: '#be123c',
    secondaryColor: '#1e3a8a',
    accentColor: '#d97706',
    emblem: 'eagle',
    emblemColor: '#fef08a',
  },

  // Central Asia
  mongol: {
    id: 'mongol',
    name: 'MONGOL',
    adjective: 'Mongol',
    layout: 'triband-v',
    primaryColor: '#1e40af',
    secondaryColor: '#b91c1c',
    accentColor: '#fef08a',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },
  saka: {
    id: 'saka',
    name: 'SAKA',
    adjective: 'Scythian',
    layout: 'solid',
    primaryColor: '#b91c1c',
    secondaryColor: '#eab308',
    accentColor: '#fef08a',
    emblem: 'spearhead',
    emblemColor: '#eab308',
  },

  // South Asia
  magadha: {
    id: 'magadha',
    name: 'MAGADHA',
    adjective: 'Mauryan',
    layout: 'center-field',
    primaryColor: '#ea580c',
    secondaryColor: '#fef3c7',
    accentColor: '#1e3a8a',
    emblem: 'wheel',
    emblemColor: '#1e3a8a',
  },
  chola: {
    id: 'chola',
    name: 'CHOLA',
    adjective: 'Chola',
    layout: 'solid',
    primaryColor: '#dc2626',
    secondaryColor: '#ca8a04',
    accentColor: '#fef08a',
    emblem: 'lion',
    emblemColor: '#fef08a',
  },
  bengal: {
    id: 'bengal',
    name: 'BENGAL',
    adjective: 'Bengali',
    layout: 'center-field',
    primaryColor: '#047857',
    secondaryColor: '#b91c1c',
    accentColor: '#fef08a',
    emblem: 'sun',
    emblemColor: '#b91c1c',
  },

  // East Asia
  han: {
    id: 'han',
    name: 'HAN',
    adjective: 'Han',
    layout: 'canton',
    primaryColor: '#a12323',
    secondaryColor: '#dfbc73',
    accentColor: '#ffffff',
    emblem: 'dragon',
    emblemColor: '#dfbc73',
  },
  yamato: {
    id: 'yamato',
    name: 'YAMATO',
    adjective: 'Yamato',
    layout: 'solid',
    primaryColor: '#f2ece4',
    secondaryColor: '#b92828',
    accentColor: '#b92828',
    emblem: 'sun',
    emblemColor: '#b92828',
  },
  joseon: {
    id: 'joseon',
    name: 'JOSEON',
    adjective: 'Joseon',
    layout: 'center-field',
    primaryColor: '#f8fafc',
    secondaryColor: '#2563eb',
    accentColor: '#dc2626',
    emblem: 'wheel',
    emblemColor: '#dc2626',
  },
  tibetan: {
    id: 'tibetan',
    name: 'TIBETAN',
    adjective: 'Tibetan',
    layout: 'triband-h',
    primaryColor: '#9333ea',
    secondaryColor: '#ca8a04',
    accentColor: '#0284c7',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },

  // Southeast Asia
  khmer: {
    id: 'khmer',
    name: 'KHMER',
    adjective: 'Khmer',
    layout: 'triband-h',
    primaryColor: '#1e3a8a',
    secondaryColor: '#b91c1c',
    accentColor: '#dfbc73',
    emblem: 'sun',
    emblemColor: '#dfbc73',
  },
  dai_viet: {
    id: 'dai_viet',
    name: 'ĐẠI VIỆT',
    adjective: 'Dai Viet',
    layout: 'solid',
    primaryColor: '#b91c1c',
    secondaryColor: '#eab308',
    accentColor: '#fef08a',
    emblem: 'dragon',
    emblemColor: '#eab308',
  },
  majapahit: {
    id: 'majapahit',
    name: 'MAJAPAHIT',
    adjective: 'Majapahit',
    layout: 'triband-h',
    primaryColor: '#b91c1c',
    secondaryColor: '#f8fafc',
    accentColor: '#ca8a04',
    emblem: 'sun',
    emblemColor: '#ca8a04',
  },

  // North America
  lakota: {
    id: 'lakota',
    name: 'LAKOTA',
    adjective: 'Lakota',
    layout: 'bicolor-h',
    primaryColor: '#7c2d12',
    secondaryColor: '#1e293b',
    accentColor: '#fef08a',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },
  haudenosaunee: {
    id: 'haudenosaunee',
    name: 'HAUDENOSAUNEE',
    adjective: 'Haudenosaunee',
    layout: 'center-field',
    primaryColor: '#581c87',
    secondaryColor: '#ffffff',
    accentColor: '#f8fafc',
    emblem: 'star',
    emblemColor: '#ffffff',
  },
  dine: {
    id: 'dine',
    name: 'DINÉ',
    adjective: 'Diné',
    layout: 'bicolor-h',
    primaryColor: '#991b1b',
    secondaryColor: '#0284c7',
    accentColor: '#fef08a',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },
  inuit: {
    id: 'inuit',
    name: 'INUIT',
    adjective: 'Inuit',
    layout: 'bicolor-v',
    primaryColor: '#0284c7',
    secondaryColor: '#f8fafc',
    accentColor: '#dc2626',
    emblem: 'star',
    emblemColor: '#dc2626',
  },
  haida: {
    id: 'haida',
    name: 'HAIDA',
    adjective: 'Haida',
    layout: 'bicolor-h',
    primaryColor: '#0f172a',
    secondaryColor: '#dc2626',
    accentColor: '#ffffff',
    emblem: 'eagle',
    emblemColor: '#ffffff',
  },

  // South America (Exactly 4)
  inca: {
    id: 'inca',
    name: 'INCA',
    adjective: 'Incan',
    layout: 'triband-h',
    primaryColor: '#ca8a04',
    secondaryColor: '#991b1b',
    accentColor: '#fef08a',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },
  muisca: {
    id: 'muisca',
    name: 'MUISCA',
    adjective: 'Muisca',
    layout: 'triband-v',
    primaryColor: '#10b981',
    secondaryColor: '#eab308',
    accentColor: '#f8fafc',
    emblem: 'sun',
    emblemColor: '#eab308',
  },
  mapuche: {
    id: 'mapuche',
    name: 'MAPUCHE',
    adjective: 'Mapuche',
    layout: 'triband-h',
    primaryColor: '#1e3a8a',
    secondaryColor: '#16a34a',
    accentColor: '#f8fafc',
    emblem: 'star',
    emblemColor: '#ffffff',
  },
  guarani: {
    id: 'guarani',
    name: 'GUARANÍ',
    adjective: 'Guaraní',
    layout: 'bicolor-h',
    primaryColor: '#15803d',
    secondaryColor: '#ea580c',
    accentColor: '#fef08a',
    emblem: 'sun',
    emblemColor: '#fef08a',
  },

  // Australia (Exactly 3)
  yolngu: {
    id: 'yolngu',
    name: 'YOLŊU',
    adjective: 'Yolŋu',
    layout: 'bicolor-h',
    primaryColor: '#991b1b',
    secondaryColor: '#ca8a04',
    accentColor: '#f8fafc',
    emblem: 'sun',
    emblemColor: '#f8fafc',
  },
  arrernte: {
    id: 'arrernte',
    name: 'ARRERNTE',
    adjective: 'Arrernte',
    layout: 'triband-h',
    primaryColor: '#b91c1c',
    secondaryColor: '#d97706',
    accentColor: '#0f172a',
    emblem: 'sun',
    emblemColor: '#d97706',
  },
  noongar: {
    id: 'noongar',
    name: 'NOONGAR',
    adjective: 'Noongar',
    layout: 'bicolor-h',
    primaryColor: '#0d9488',
    secondaryColor: '#78350f',
    accentColor: '#f8fafc',
    emblem: 'sun',
    emblemColor: '#f8fafc',
  },

  // Aotearoa / Oceania (1)
  maori: {
    id: 'maori',
    name: 'MĀORI',
    adjective: 'Māori',
    layout: 'triband-h',
    primaryColor: '#991b1b',
    secondaryColor: '#0f172a',
    accentColor: '#f8fafc',
    emblem: 'spearhead',
    emblemColor: '#f8fafc',
  },
};

function getEmblemSvg(emblem: EmblemType, color: string, cx: number, cy: number, scale: number): string {
  switch (emblem) {
    case 'crescent-star': {
      const uid = Math.random().toString(36).slice(2, 7);
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})">
          <defs>
            <mask id="cres-m-${uid}">
              <rect x="-35" y="-28" width="70" height="56" fill="#000" />
              <!-- Mathematically exact Ottoman/Turkish crescent -->
              <circle cx="-6" cy="0" r="19" fill="#fff" />
              <circle cx="-1.8" cy="0" r="15.2" fill="#000" />
            </mask>
          </defs>
          <rect x="-26" y="-20" width="38" height="40" fill="${color}" mask="url(#cres-m-${uid})" />
          <!-- Five-pointed star tilted with horizontal left tip pointing toward crescent center -->
          <polygon points="4.7,0 10.78,-1.98 10.78,-8.37 14.54,-3.20 20.62,-5.17 16.86,0 20.62,5.17 14.54,3.20 10.78,8.37 10.78,1.98" fill="${color}" />
        </g>
      `;
    }
    case 'eagle':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})">
          <!-- Laurel Wreath -->
          <path d="M -16,4 C -20,-5 -15,-16 0,-18 C 15,-16 20,-5 16,4 C 12,12 2,15 0,15 C -2,15 -12,12 -16,4 Z" fill="none" stroke="${color}" stroke-width="2.2" stroke-dasharray="3,1.5" />
          <!-- Imperial Roman Aquila with outspread wings -->
          <path d="M 0,-14 L 3.5,-10 L 8,-12 L 14,-10 L 18,-4 L 16,1 L 18,5 L 14,9 L 9,8 L 6,14 L 2,13 L 0,18 L -2,13 L -6,14 L -9,8 L -14,9 L -18,5 L -16,1 L -18,-4 L -14,-10 L -8,-12 L -3.5,-10 Z" fill="${color}" />
          <circle cx="0" cy="-10" r="3.2" fill="${color}" />
          <!-- SPQR Inscription -->
          <text x="0" y="24" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', serif" font-weight="900" font-size="8" fill="${color}" letter-spacing="1.5">SPQR</text>
        </g>
      `;
    case 'lion':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <!-- Persian Sun and Lion (Shir-o-Khorshid) -->
          <!-- Rising solar disc with 8 rays -->
          <circle cx="0" cy="-5" r="7" />
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
            <line x1="0" y1="-12" x2="0" y2="-17" stroke="${color}" stroke-width="1.6" stroke-linecap="round" transform="rotate(${deg}, 0, -5)" />
          `).join('')}
          <!-- Proud lion body passant -->
          <path d="M -12,9 C -12,3 -7,-1 0,-1 C 5,-1 9,2 10,6 L 15,2 L 17,5 L 12,9 C 8,11 -8,11 -12,9 Z" />
          <!-- Upright curved shamshir blade held aloft -->
          <path d="M 6,-1 C 9,-5 13,-8 15,-13 L 16,-12 C 14,-7 10,-3 8,0 Z" />
        </g>
      `;
    case 'sun':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <!-- Egyptian Winged Solar Disk of Horus & Ra -->
          <circle cx="0" cy="0" r="6.5" />
          <!-- Outstretched ceremonial falcon wings -->
          <path d="M -6,-2 C -12,-8 -22,-7 -26,-2 C -20,2 -12,3 -6,1 Z" />
          <path d="M 6,-2 C 12,-8 22,-7 26,-2 C 20,2 12,3 6,1 Z" />
          <!-- Dual royal uraeus cobras -->
          <path d="M -3,5 C -5,8 -8,9 -10,8" stroke="${color}" stroke-width="1.5" fill="none" />
          <path d="M 3,5 C 5,8 8,9 10,8" stroke="${color}" stroke-width="1.5" fill="none" />
        </g>
      `;
    case 'star':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <polygon points="0,-15 4.2,-4.5 15,-4.5 6.5,2.5 10,13.5 0,7 -10,13.5 -6.5,2.5 -15,-4.5 -4.2,-4.5" />
        </g>
      `;
    case 'wheel':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" stroke="${color}" fill="none" stroke-width="1.8">
          <!-- Imperial 16-spoke Wheel / Chrysanthemum crest -->
          <circle cx="0" cy="0" r="13" />
          <circle cx="0" cy="0" r="4.5" fill="${color}" stroke="none" />
          ${[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(deg => `
            <line x1="0" y1="-4.5" x2="0" y2="-13" stroke="${color}" stroke-width="1.4" transform="rotate(${deg})" />
          `).join('')}
        </g>
      `;
    case 'dragon':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <!-- Imperial Han Serpentine Dragon with Flaming Pearl -->
          <path d="M -14,6 C -11,-7 -2,-13 7,-9 C 12,-7 14,-1 11,3 C 7,6 -3,5 -7,10 C -9,12 -12,12 -14,6 Z" />
          <circle cx="7" cy="-7" r="1.5" fill="#040810" />
          <path d="M 7,-9 L 12,-14 L 13,-8 Z" />
          <circle cx="15" cy="-2" r="3" fill="#dfbc73" />
        </g>
      `;
    case 'spearhead':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <!-- Norse Valknut / Odin's Raven Spearhead -->
          <polygon points="0,-16 9,-1 3,1 3,14 -3,14 -3,1 -9,-1" />
          <!-- Triple interlocking triangles (Valknut) cutout -->
          <polygon points="0,-10 4,-3 -4,-3" fill="#050a12" />
        </g>
      `;
    case 'laurel':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}" stroke="none">
          <path d="M -12,10 C -16,1 -10,-12 0,-15 C -4,-6 -8,3 -4,10 Z" />
          <path d="M 12,10 C 16,1 10,-12 0,-15 C 4,-6 8,3 4,10 Z" />
          <circle cx="0" cy="11" r="2.5" />
        </g>
      `;
    case 'pyramid':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <!-- Mayan Stepped Temple Pyramid of Kukulkan -->
          <polygon points="-16,12 16,12 13,6 -13,6" />
          <polygon points="-11,5 11,5 9,0 -9,0" />
          <polygon points="-7,-1 7,-1 5,-6 -5,-6" />
          <rect x="-3" y="-12" width="6" height="5" />
          <rect x="-1" y="-9" width="2" height="3" fill="#050a12" />
        </g>
      `;
    case 'scarab':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <!-- Egyptian Sacred Scarab of Khepri -->
          <ellipse cx="0" cy="0" rx="9" ry="13" />
          <circle cx="0" cy="-14" r="5" />
          <path d="M -9,0 C -16,-7 -16,7 -9,11" stroke="${color}" stroke-width="2.5" fill="none" />
          <path d="M 9,0 C 16,-7 16,7 9,11" stroke="${color}" stroke-width="2.5" fill="none" />
          <circle cx="0" cy="-21" r="4.5" fill="#dfbc73" />
        </g>
      `;
    case 'anchor':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" stroke="${color}" fill="none" stroke-width="2.4" stroke-linecap="round">
          <circle cx="0" cy="-12" r="4.5" />
          <line x1="0" y1="-7.5" x2="0" y2="14" />
          <line x1="-10" y1="-3" x2="10" y2="-3" stroke-width="2.2" />
          <path d="M -13,6 C -13,16 13,16 13,6" />
          <polygon points="-15,5 -11,5 -13,1" fill="${color}" stroke="none" />
          <polygon points="15,5 11,5 13,1" fill="${color}" stroke="none" />
        </g>
      `;
    case 'shield':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <path d="M -13,-14 L 13,-14 L 12,2 C 0,16 0,16 0,16 C 0,16 0,16 -12,2 Z" />
          <circle cx="0" cy="0" r="4" fill="#050a12" />
        </g>
      `;
    case 'chevron':
      return `
        <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="${color}">
          <polygon points="-14,-6 0,-15 14,-6 0,3" />
          <polygon points="-14,4 0,-5 14,4 0,13" />
        </g>
      `;
    default:
      return '';
  }
}

/**
 * Standard 3:2 Rectangular Flag Vector
 */
export function renderFlagSvg(identity: NationIdentity, width: number = 300, height: number = 200): string {
  const { layout, primaryColor, secondaryColor, accentColor, emblem, emblemColor = '#ffffff' } = identity;
  const w = 300;
  const h = 200;

  let fieldsSvg = `<rect width="${w}" height="${h}" fill="${primaryColor}" />`;

  switch (layout) {
    case 'bicolor-h':
      fieldsSvg = `
        <rect width="${w}" height="${h / 2}" fill="${primaryColor}" />
        <rect y="${h / 2}" width="${w}" height="${h / 2}" fill="${secondaryColor}" />
      `;
      break;
    case 'bicolor-v':
      fieldsSvg = `
        <rect width="${w / 2}" height="${h}" fill="${primaryColor}" />
        <rect x="${w / 2}" width="${w / 2}" height="${h}" fill="${secondaryColor}" />
      `;
      break;
    case 'triband-h':
      fieldsSvg = `
        <rect width="${w}" height="${h / 3}" fill="${primaryColor}" />
        <rect y="${h / 3}" width="${w}" height="${h / 3}" fill="${secondaryColor}" />
        <rect y="${(h / 3) * 2}" width="${w}" height="${h / 3}" fill="${accentColor || primaryColor}" />
      `;
      break;
    case 'triband-v':
      fieldsSvg = `
        <rect width="${w / 3}" height="${h}" fill="${primaryColor}" />
        <rect x="${w / 3}" width="${w / 3}" height="${h}" fill="${secondaryColor}" />
        <rect x="${(w / 3) * 2}" width="${w / 3}" height="${h}" fill="${accentColor || primaryColor}" />
      `;
      break;
    case 'cross':
      fieldsSvg = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        <!-- Nordic Cross Outer -->
        <rect x="75" width="45" height="${h}" fill="${secondaryColor}" />
        <rect y="80" width="${w}" height="40" fill="${secondaryColor}" />
        <!-- Nordic Cross Inner Core -->
        <rect x="85" width="25" height="${h}" fill="${accentColor || secondaryColor}" />
        <rect y="90" width="${w}" height="20" fill="${accentColor || secondaryColor}" />
      `;
      break;
    case 'saltire':
      fieldsSvg = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        <line x1="0" y1="0" x2="${w}" y2="${h}" stroke="${secondaryColor}" stroke-width="38" />
        <line x1="0" y1="${h}" x2="${w}" y2="0" stroke="${secondaryColor}" stroke-width="38" />
      `;
      break;
    case 'canton':
      fieldsSvg = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        ${[0, 1, 2, 3, 4].map(i => `<rect y="${i * 40}" width="${w}" height="20" fill="${secondaryColor}" />`).join('')}
        <rect width="130" height="95" fill="${primaryColor}" />
        <rect width="130" height="95" fill="none" stroke="${accentColor}" stroke-width="2" />
      `;
      break;
    case 'center-field':
      fieldsSvg = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        <rect x="40" y="20" width="220" height="160" fill="${secondaryColor}" rx="4" />
        <rect x="44" y="24" width="212" height="152" fill="${primaryColor}" rx="2" />
      `;
      break;
  }

  const cx = layout === 'canton' ? 65 : layout === 'cross' ? 97 : w / 2;
  const cy = layout === 'canton' ? 48 : h / 2;
  const emblemScale = emblem === 'crescent-star' ? 1.90 : 2.2;
  const emblemSvg = getEmblemSvg(emblem, emblemColor, cx, cy, emblemScale);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}" class="dominion-flag-rect">
      <defs>
        <linearGradient id="flag-crease" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
          <stop offset="25%" stop-color="#000000" stop-opacity="0.06" />
          <stop offset="60%" stop-color="#ffffff" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.12" />
        </linearGradient>
        <linearGradient id="flag-specular" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10" />
          <stop offset="45%" stop-color="#ffffff" stop-opacity="0.0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.14" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#080c12" />
      ${fieldsSvg}
      ${emblemSvg}
      <!-- Fine Vexillological Texture, Subtle Weave & Fabric Specular -->
      <rect width="${w}" height="${h}" fill="url(#flag-crease)" pointer-events="none" />
      <rect width="${w}" height="${h}" fill="url(#flag-specular)" pointer-events="none" />
      <!-- Refined Luxury Gold Trim (Thin double-piping, no thick toy brackets) -->
      <rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="#dfbc73" stroke-width="0.9" stroke-opacity="0.75" />
      <rect x="7" y="7" width="${w - 14}" height="${h - 14}" fill="none" stroke="#dfbc73" stroke-width="0.45" stroke-opacity="0.40" />
      <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
    </svg>
  `.trim();
}

/**
 * Vertical Command Pennant Vector (Swallowtail / Banner)
 * Recomposed layout specifically for vertical hanging banner, NOT stretched!
 */
export function renderPennantSvg(identity: NationIdentity, width: number = 48, height: number = 80): string {
  const { layout, primaryColor, secondaryColor, accentColor, emblem, emblemColor = '#ffffff' } = identity;
  const pw = 48;
  const ph = 80;
  const notchDepth = 14;

  // Clip path for swallowtail notch
  const clipId = `pennant-clip-${identity.id || Math.random().toString(36).slice(2, 7)}`;

  let fieldsSvg = `<rect width="${pw}" height="${ph}" fill="${primaryColor}" />`;

  switch (layout) {
    case 'bicolor-h':
    case 'bicolor-v':
      fieldsSvg = `
        <rect width="${pw / 2}" height="${ph}" fill="${primaryColor}" />
        <rect x="${pw / 2}" width="${pw / 2}" height="${ph}" fill="${secondaryColor}" />
      `;
      break;
    case 'triband-h':
    case 'triband-v':
      fieldsSvg = `
        <rect width="${pw / 3}" height="${ph}" fill="${primaryColor}" />
        <rect x="${pw / 3}" width="${pw / 3}" height="${ph}" fill="${secondaryColor}" />
        <rect x="${(pw / 3) * 2}" width="${pw / 3}" height="${ph}" fill="${accentColor || primaryColor}" />
      `;
      break;
    case 'cross':
      fieldsSvg = `
        <rect width="${pw}" height="${ph}" fill="${primaryColor}" />
        <rect x="36" width="28" height="${ph}" fill="${secondaryColor}" />
        <rect y="60" width="${pw}" height="28" fill="${secondaryColor}" />
        <rect x="42" width="16" height="${ph}" fill="${accentColor || secondaryColor}" />
        <rect y="66" width="${pw}" height="16" fill="${accentColor || secondaryColor}" />
      `;
      break;
    case 'saltire':
      fieldsSvg = `
        <rect width="${pw}" height="${ph}" fill="${primaryColor}" />
        <line x1="0" y1="0" x2="${pw}" y2="${ph * 0.7}" stroke="${secondaryColor}" stroke-width="20" />
        <line x1="0" y1="${ph * 0.7}" x2="${pw}" y2="0" stroke="${secondaryColor}" stroke-width="20" />
      `;
      break;
    case 'canton':
      fieldsSvg = `
        <rect width="${pw}" height="${ph}" fill="${primaryColor}" />
        <rect y="8" width="${pw}" height="12" fill="${secondaryColor}" />
        <rect y="28" width="${pw}" height="12" fill="${secondaryColor}" />
        <rect y="48" width="${pw}" height="12" fill="${secondaryColor}" />
        <rect width="${pw}" height="80" fill="${primaryColor}" />
        <line x1="0" y1="80" x2="${pw}" y2="80" stroke="${accentColor}" stroke-width="2" />
      `;
      break;
    case 'center-field':
      fieldsSvg = `
        <rect width="${pw}" height="${ph}" fill="${primaryColor}" />
        <rect x="14" y="24" width="72" height="96" fill="${secondaryColor}" rx="4" />
        <rect x="18" y="28" width="64" height="88" fill="${primaryColor}" rx="2" />
      `;
      break;
  }

  const cx = pw / 2;
  const cy = layout === 'cross' ? 24 : layout === 'canton' ? 16 : 20;
  // Scaled down so emblem never touches or clips swallowtail edges
  const emblemScale = emblem === 'crescent-star' ? 0.74 : 0.85;
  const emblemSvg = getEmblemSvg(emblem, emblemColor, cx, cy, emblemScale);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pw} ${ph}" width="${width}" height="${height}" class="dominion-command-pennant">
      <defs>
        <clipPath id="${clipId}">
          <polygon points="0,0 ${pw},0 ${pw},${ph} ${pw / 2},${ph - notchDepth} 0,${ph}" />
        </clipPath>
        <linearGradient id="pennant-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16" />
          <stop offset="50%" stop-color="#000000" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.22" />
        </linearGradient>
      </defs>
      <!-- Pennant Body clipped to Swallowtail -->
      <g clip-path="url(#${clipId})">
        ${fieldsSvg}
        <!-- Decorative Upper Header Bar / Brass Rod Mount -->
        <rect width="${pw}" height="3" fill="#dfbc73" />
        <rect y="3" width="${pw}" height="1" fill="#78350f" />
        <!-- Emblem -->
        ${emblemSvg}
        <!-- Vertical Texture and Fringes -->
        <rect width="${pw}" height="${ph}" fill="url(#pennant-sheen)" pointer-events="none" />
        <!-- Swallowtail Gold Braided Border -->
        <polygon points="1.5,1.5 ${pw - 1.5},1.5 ${pw - 1.5},${ph - 1.5} ${pw / 2},${ph - notchDepth - 1.5} 1.5,${ph - 1.5}" fill="none" stroke="#dfbc73" stroke-width="0.9" stroke-opacity="0.80" />
        <polygon points="3,3 ${pw - 3},3 ${pw - 3},${ph - 3} ${pw / 2},${ph - notchDepth - 3} 3,${ph - 3}" fill="none" stroke="#dfbc73" stroke-width="0.4" stroke-opacity="0.40" />
      </g>
    </svg>
  `.trim();
}

/**
 * Simplified, high-legibility vector mini-flag (36x24px) for ribbons and compact headers.
 * Uses bold heraldic geometry and high contrast so it is clearly recognizable at small scales.
 */
export function renderMiniFlagSvg(identity: NationIdentity, width: number = 36, height: number = 24): string {
  const { layout, primaryColor, secondaryColor, accentColor, emblem, emblemColor = '#ffffff' } = identity;
  const w = 36;
  const h = 24;

  let fields = `<rect width="${w}" height="${h}" fill="${primaryColor}" />`;
  switch (layout) {
    case 'bicolor-h':
      fields = `
        <rect width="${w}" height="${h / 2}" fill="${primaryColor}" />
        <rect y="${h / 2}" width="${w}" height="${h / 2}" fill="${secondaryColor}" />
      `;
      break;
    case 'bicolor-v':
      fields = `
        <rect width="${w / 2}" height="${h}" fill="${primaryColor}" />
        <rect x="${w / 2}" width="${w / 2}" height="${h}" fill="${secondaryColor}" />
      `;
      break;
    case 'triband-h':
      fields = `
        <rect width="${w}" height="${h / 3}" fill="${primaryColor}" />
        <rect y="${h / 3}" width="${w}" height="${h / 3}" fill="${secondaryColor}" />
        <rect y="${(h / 3) * 2}" width="${w}" height="${h / 3}" fill="${accentColor || primaryColor}" />
      `;
      break;
    case 'triband-v':
      fields = `
        <rect width="${w / 3}" height="${h}" fill="${primaryColor}" />
        <rect x="${w / 3}" width="${w / 3}" height="${h}" fill="${secondaryColor}" />
        <rect x="${(w / 3) * 2}" width="${w / 3}" height="${h}" fill="${accentColor || primaryColor}" />
      `;
      break;
    case 'cross':
      fields = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        <rect x="9" width="6" height="${h}" fill="${secondaryColor}" />
        <rect y="9" width="${w}" height="6" fill="${secondaryColor}" />
      `;
      break;
    case 'saltire':
      fields = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        <line x1="0" y1="0" x2="${w}" y2="${h}" stroke="${secondaryColor}" stroke-width="4" />
        <line x1="0" y1="${h}" x2="${w}" y2="0" stroke="${secondaryColor}" stroke-width="4" />
      `;
      break;
    case 'canton':
      fields = `
        <rect width="${w}" height="${h}" fill="${primaryColor}" />
        <rect width="${w * 0.45}" height="${h * 0.5}" fill="${secondaryColor}" />
      `;
      break;
    case 'center-field':
      fields = `
        <rect width="${w}" height="${h}" fill="${secondaryColor}" />
        <rect x="4" y="3" width="${w - 8}" height="${h - 6}" fill="${primaryColor}" />
      `;
      break;
  }

  // Unified heraldic emblem for small scale
  let miniEmblem = '';
  const cx = layout === 'canton' ? 8 : layout === 'cross' ? 12 : w / 2;
  const cy = layout === 'canton' ? 6 : h / 2;
  const mu = Math.random().toString(36).slice(2, 6);

  switch (emblem) {
    case 'crescent-star': {
      miniEmblem = `
        <mask id="mini-cres-${mu}">
          <rect x="0" y="0" width="${w}" height="${h}" fill="#000" />
          <circle cx="${cx - 1.8}" cy="${cy}" r="4.8" fill="#fff" />
          <circle cx="${cx - 0.7}" cy="${cy}" r="3.9" fill="#000" />
        </mask>
        <rect x="0" y="0" width="${w}" height="${h}" fill="${emblemColor}" mask="url(#mini-cres-${mu})" />
        <polygon points="${cx + 1.8},${cy} ${cx + 3.1},${cy - 0.5} ${cx + 3.1},${cy - 1.9} ${cx + 3.9},${cy - 0.8} ${cx + 5.3},${cy - 1.2} ${cx + 4.4},${cy} ${cx + 5.3},${cy + 1.2} ${cx + 3.9},${cy + 0.8} ${cx + 3.1},${cy + 1.9} ${cx + 3.1},${cy + 0.5}" fill="${emblemColor}" />
      `;
      break;
    }
    case 'sun':
      miniEmblem = `
        <circle cx="${cx}" cy="${cy}" r="3.6" fill="${emblemColor}" />
        ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
          <line x1="${cx}" y1="${cy - 4.6}" x2="${cx}" y2="${cy - 5.8}" stroke="${emblemColor}" stroke-width="0.9" transform="rotate(${deg}, ${cx}, ${cy})" />
        `).join('')}
      `;
      break;
    case 'eagle':
      miniEmblem = `<path d="M ${cx},${cy - 3.8} L ${cx + 3.8},${cy - 1} L ${cx + 5.5},${cy + 2.5} L ${cx},${cy + 3.5} L ${cx - 5.5},${cy + 2.5} L ${cx - 3.8},${cy - 1} Z" fill="${emblemColor}" />`;
      break;
    case 'lion':
      miniEmblem = `
        <circle cx="${cx - 1}" cy="${cy - 2.5}" r="2.2" fill="${emblemColor}" />
        <path d="M ${cx - 4.5},${cy + 2.5} C ${cx - 4.5},${cy - 1} ${cx - 1},${cy - 1} ${cx + 2.5},${cy} L ${cx + 5},${cy - 2} L ${cx + 4.5},${cy + 3} Z" fill="${emblemColor}" />
      `;
      break;
    case 'wheel':
      miniEmblem = `
        <circle cx="${cx}" cy="${cy}" r="4.2" stroke="${emblemColor}" stroke-width="1.2" fill="none" />
        <circle cx="${cx}" cy="${cy}" r="1.3" fill="${emblemColor}" />
      `;
      break;
    case 'dragon':
      miniEmblem = `<path d="M ${cx - 4.5},${cy + 2} Q ${cx - 2},${cy - 3.5} ${cx + 1},${cy - 0.8} T ${cx + 4.5},${cy + 1.8}" stroke="${emblemColor}" stroke-width="1.6" fill="none" stroke-linecap="round" />`;
      break;
    case 'spearhead':
      miniEmblem = `
        <polygon points="${cx},${cy - 4.5} ${cx + 3.2},${cy + 2} ${cx + 1.2},${cy + 2} ${cx + 1.2},${cy + 4.2} ${cx - 1.2},${cy + 4.2} ${cx - 1.2},${cy + 2} ${cx - 3.2},${cy + 2}" fill="${emblemColor}" />
      `;
      break;
    case 'pyramid':
      miniEmblem = `
        <polygon points="${cx - 4.8},${cy + 3.6} ${cx + 4.8},${cy + 3.6} ${cx + 3.8},${cy + 1.2} ${cx - 3.8},${cy + 1.2}" fill="${emblemColor}" />
        <polygon points="${cx - 3.2},${cy + 0.8} ${cx + 3.2},${cy + 0.8} ${cx + 2.2},${cy - 1.4} ${cx - 2.2},${cy - 1.4}" fill="${emblemColor}" />
        <rect x="${cx - 1.2}" y="${cy - 3.6}" width="2.4" height="2" fill="${emblemColor}" />
      `;
      break;
    case 'scarab':
      miniEmblem = `
        <ellipse cx="${cx}" cy="${cy}" rx="2.5" ry="3.5" fill="${emblemColor}" />
        <circle cx="${cx}" cy="${cy - 3.8}" r="1.4" fill="${emblemColor}" />
        <path d="M ${cx - 2.5},${cy} C ${cx - 4.5},${cy - 2} ${cx - 4.5},${cy + 2} ${cx - 2.5},${cy + 3}" stroke="${emblemColor}" stroke-width="0.8" fill="none" />
        <path d="M ${cx + 2.5},${cy} C ${cx + 4.5},${cy - 2} ${cx + 4.5},${cy + 2} ${cx + 2.5},${cy + 3}" stroke="${emblemColor}" stroke-width="0.8" fill="none" />
      `;
      break;
    case 'anchor':
      miniEmblem = `
        <circle cx="${cx}" cy="${cy - 3.2}" r="1.2" stroke="${emblemColor}" stroke-width="0.8" fill="none" />
        <line x1="${cx}" y1="${cy - 2}" x2="${cx}" y2="${cy + 3.5}" stroke="${emblemColor}" stroke-width="1.0" />
        <line x1="${cx - 2.8}" y1="${cy - 0.8}" x2="${cx + 2.8}" y2="${cy - 0.8}" stroke="${emblemColor}" stroke-width="0.9" />
        <path d="M ${cx - 3.5},${cy + 1.5} C ${cx - 3.5},${cy + 4.2} ${cx + 3.5},${cy + 4.2} ${cx + 3.5},${cy + 1.5}" stroke="${emblemColor}" stroke-width="1.0" fill="none" stroke-linecap="round" />
      `;
      break;
    case 'shield':
      miniEmblem = `
        <path d="M ${cx - 3.5},${cy - 4} L ${cx + 3.5},${cy - 4} L ${cx + 3.2},${cy + 0.5} C ${cx},${cy + 4.2} ${cx},${cy + 4.2} ${cx},${cy + 4.2} C ${cx},${cy + 4.2} ${cx},${cy + 4.2} ${cx - 3.2},${cy + 0.5} Z" fill="${emblemColor}" />
      `;
      break;
    case 'chevron':
      miniEmblem = `
        <polygon points="${cx - 4},${cy - 2} ${cx},${cy - 4.5} ${cx + 4},${cy - 2} ${cx},${cy + 0.5}" fill="${emblemColor}" />
        <polygon points="${cx - 4},${cy + 1} ${cx},${cy - 1.5} ${cx + 4},${cy + 1} ${cx},${cy + 3.5}" fill="${emblemColor}" />
      `;
      break;
    case 'star':
    default:
      miniEmblem = `<polygon points="${cx},${cy - 3.5} ${cx + 1.1},${cy - 1} ${cx + 3.6},${cy - 1} ${cx + 1.6},${cy + 0.7} ${cx + 2.3},${cy + 3.2} ${cx},${cy + 1.7} ${cx - 2.3},${cy + 3.2} ${cx - 1.6},${cy + 0.7} ${cx - 3.6},${cy - 1} ${cx - 1.1},${cy - 1}" fill="${emblemColor}" />`;
      break;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}" class="dominion-mini-flag">
      <defs>
        <linearGradient id="mf-crease-${mu}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10" />
          <stop offset="28%" stop-color="#000000" stop-opacity="0.07" />
          <stop offset="65%" stop-color="#ffffff" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.16" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#080c12" />
      ${fields}
      ${miniEmblem}
      <!-- Unified Vexillological Fabric Shading -->
      <rect width="${w}" height="${h}" fill="url(#mf-crease-${mu})" pointer-events="none" />
      <!-- Unified Luxury Gold Perimeter Trim & Inner Inset -->
      <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#dfbc73" stroke-width="0.80" stroke-opacity="0.85" />
      <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.5" />
    </svg>
  `.trim();
}
