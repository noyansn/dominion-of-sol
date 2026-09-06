/**
 * DOMINION OF SOL — CANONICAL GLOBAL CIVILIZATION ATLAS & REGISTRY
 * 
 * Master metadata manifest containing 44 historically grounded civilizations across 11 macro-regions.
 * Strictly respects architectural boundaries:
 * - Meta-layer and presentation only
 * - Simulation authority, 101 factions, 1024x512 world grid, and combat rules remain FROZEN.
 */

export type CivilizationId =
  | 'hun'
  | 'gokturk'
  | 'roma'
  | 'hellen'
  | 'gaul'
  | 'norse'
  | 'rus'
  | 'misir'
  | 'amazigh'
  | 'aksum'
  | 'mali'
  | 'yoruba'
  | 'kongo'
  | 'swahili'
  | 'zulu'
  | 'pers'
  | 'assyria'
  | 'arab'
  | 'armenian'
  | 'mongol'
  | 'saka'
  | 'magadha'
  | 'chola'
  | 'bengal'
  | 'han'
  | 'yamato'
  | 'joseon'
  | 'tibetan'
  | 'khmer'
  | 'dai_viet'
  | 'majapahit'
  | 'lakota'
  | 'haudenosaunee'
  | 'dine'
  | 'inuit'
  | 'haida'
  | 'inca'
  | 'muisca'
  | 'mapuche'
  | 'guarani'
  | 'yolngu'
  | 'arrernte'
  | 'noongar'
  | 'maori';

export type MacroRegion =
  | 'EUROPE'
  | 'AFRICA'
  | 'WEST ASIA'
  | 'CENTRAL ASIA'
  | 'SOUTH ASIA'
  | 'EAST ASIA'
  | 'SOUTHEAST ASIA'
  | 'NORTH AMERICA'
  | 'SOUTH AMERICA'
  | 'AUSTRALIA'
  | 'OCEANIA';

export const MACRO_REGIONS: MacroRegion[] = [
  'EUROPE',
  'AFRICA',
  'WEST ASIA',
  'CENTRAL ASIA',
  'SOUTH ASIA',
  'EAST ASIA',
  'SOUTHEAST ASIA',
  'NORTH AMERICA',
  'SOUTH AMERICA',
  'AUSTRALIA',
  'OCEANIA',
];

export interface HomelandCenter {
  lon: number;
  lat: number;
}

export interface CivilizationDoctrine {
  offense: number;
  defense: number;
  expansion: number;
  maritime: number;
}

export interface CivilizationRegion {
  id: CivilizationId;
  displayName: string;
  macroRegion: MacroRegion;
  homelandCenter: HomelandCenter;
  homelandPolygon: Array<[number, number]>; // [lon, lat] coordinates
  identityTraits: [string, string, string];
  historicalCoreLabel: string;
  shortDescription: string;
  artFamily: string;
  armoryHeritageFamily?: string;
  aliases: string[];
  isPlayable: boolean;
  doctrine: CivilizationDoctrine;
  accentColor: string;
  numericAccentColor: number;
}

export const CIVILIZATION_ATLAS: CivilizationRegion[] = [
  // ==========================================
  // EUROPE (5)
  // ==========================================
  {
    id: 'roma',
    displayName: 'ROMA',
    macroRegion: 'EUROPE',
    homelandCenter: { lon: 12.5, lat: 41.9 },
    homelandPolygon: [
      [1.0, 41.5], [-0.5, 44.5], [1.5, 47.5], [5.5, 49.5], [8.5, 49.5],
      [14.0, 48.5], [18.5, 47.5], [21.5, 44.0], [22.5, 40.0], [20.5, 37.5],
      [16.5, 35.5], [10.5, 35.8], [4.5, 37.5], [2.0, 39.5],
    ],
    identityTraits: ['ORDER', 'ENGINEERING', 'AUTHORITY'],
    historicalCoreLabel: 'Italian Peninsula / Central Mediterranean',
    shortDescription: 'Disciplined legionary bulwarks, fortified redoubts, and methodical territorial consolidation across the Mediterranean.',
    artFamily: 'Roman Classical',
    armoryHeritageFamily: 'Roman Triumphal',
    aliases: ['Rome', 'Roman', 'SPQR', 'Italia'],
    isPlayable: true,
    doctrine: { offense: 2, defense: 2, expansion: -2, maritime: -2 },
    accentColor: '#b91c1c',
    numericAccentColor: 0xb91c1c,
  },
  {
    id: 'hellen',
    displayName: 'HELLEN',
    macroRegion: 'EUROPE',
    homelandCenter: { lon: 23.7, lat: 38.0 },
    homelandPolygon: [
      [20.5, 36.5], [19.5, 39.5], [21.5, 41.2], [24.5, 41.5], [26.5, 40.0],
      [27.0, 38.0], [26.0, 36.5], [23.5, 35.0], [21.5, 35.5],
    ],
    identityTraits: ['CIVIC', 'MARITIME', 'INGENUITY'],
    historicalCoreLabel: 'Aegean / Mainland Greece',
    shortDescription: 'Philosophical city-state leagues, trireme maritime fleets, and civic defense along rugged Aegean coastlines.',
    artFamily: 'Classical Aegean',
    aliases: ['Hellas', 'Greece', 'Greek', 'Athens', 'Sparta'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: -2, maritime: 0 },
    accentColor: '#0284c7',
    numericAccentColor: 0x0284c7,
  },
  {
    id: 'gaul',
    displayName: 'GAUL',
    macroRegion: 'EUROPE',
    homelandCenter: { lon: 2.5, lat: 46.5 },
    homelandPolygon: [
      [-1.5, 43.5], [-1.8, 47.5], [-4.5, 48.5], [0.5, 50.0], [3.5, 50.5],
      [6.5, 48.5], [6.5, 45.0], [4.5, 43.2], [2.0, 42.8],
    ],
    identityTraits: ['TRIBE', 'RESOLVE', 'FRONTIER'],
    historicalCoreLabel: 'Gaul / Western Continental Celtic Region',
    shortDescription: 'Hilltop oppida fortifications, La Tène iron craftsmanship, and fierce tribal solidarity across western continental forests.',
    artFamily: 'Continental Celtic',
    aliases: ['Gallia', 'Celtic', 'Celt', 'Galatia'],
    isPlayable: true,
    doctrine: { offense: 2, defense: 1, expansion: 0, maritime: -3 },
    accentColor: '#16a34a',
    numericAccentColor: 0x16a34a,
  },
  {
    id: 'norse',
    displayName: 'NORSE',
    macroRegion: 'EUROPE',
    homelandCenter: { lon: 10.0, lat: 60.0 },
    homelandPolygon: [
      [5.5, 54.0], [4.5, 58.0], [3.0, 62.5], [5.0, 66.5], [11.0, 70.0],
      [22.0, 72.5], [32.0, 71.0], [33.0, 65.0], [29.0, 60.5], [21.5, 58.0],
      [16.5, 54.5], [10.0, 53.5],
    ],
    identityTraits: ['MARITIME', 'VALOR', 'REACH'],
    historicalCoreLabel: 'Scandinavia / North Atlantic Fringe',
    shortDescription: 'Longship maritime mastery, coastal raiding axes, and resilient boreal settlements braving the North Atlantic seas.',
    artFamily: 'Norse Fjord',
    armoryHeritageFamily: 'Norse Valhalla',
    aliases: ['Viking', 'Scandinavia', 'Nordic'],
    isPlayable: true,
    doctrine: { offense: 2, defense: -2, expansion: -2, maritime: 2 },
    accentColor: '#06b6d4',
    numericAccentColor: 0x06b6d4,
  },
  {
    id: 'rus',
    displayName: 'RUS',
    macroRegion: 'EUROPE',
    homelandCenter: { lon: 34.0, lat: 53.5 },
    homelandPolygon: [
      [26.0, 50.0], [27.0, 56.0], [33.0, 59.0], [40.0, 58.0], [42.0, 54.0],
      [39.0, 50.0], [32.0, 48.0], [28.0, 48.5],
    ],
    identityTraits: ['DEPTH', 'TRADE', 'RESOLVE'],
    historicalCoreLabel: 'East European Forest-Steppe',
    shortDescription: 'Extensive riverine merchant networks, timber kremlin strongholds, and deep continental resilience.',
    artFamily: 'Slavic Rus',
    aliases: ['Kievan Rus', 'Ruthenia', 'Novgorod'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 2, expansion: 0, maritime: -3 },
    accentColor: '#d97706',
    numericAccentColor: 0xd97706,
  },

  // ==========================================
  // AFRICA (8)
  // ==========================================
  {
    id: 'misir',
    displayName: 'MISIR',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: 31.2, lat: 27.5 },
    homelandPolygon: [
      [24.0, 32.0], [29.0, 32.5], [33.0, 32.8], [36.0, 33.5], [37.5, 31.0],
      [36.5, 27.0], [38.0, 22.0], [36.5, 18.0], [32.5, 17.0], [28.0, 19.0],
      [24.0, 23.0], [23.5, 28.0],
    ],
    identityTraits: ['RIVER', 'STABILITY', 'LEGACY'],
    historicalCoreLabel: 'Nile Valley / Nile Delta',
    shortDescription: 'Millennia of agricultural abundance along the Nile, monumental stone architecture, and sacred administrative order.',
    artFamily: 'Pharaonic Royal',
    armoryHeritageFamily: 'Pharaonic Royal',
    aliases: ['Egypt', 'Egyptian', 'Mısır', 'Kemet'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 3, expansion: -1, maritime: -1 },
    accentColor: '#eab308',
    numericAccentColor: 0xeab308,
  },
  {
    id: 'amazigh',
    displayName: 'AMAZIGH',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: -1.5, lat: 32.0 },
    homelandPolygon: [
      [-9.5, 30.5], [-9.0, 34.5], [-5.0, 36.0], [3.0, 36.8], [9.5, 37.0],
      [10.5, 33.0], [5.0, 30.0], [-2.0, 28.5], [-7.0, 29.0],
    ],
    identityTraits: ['ENDURANCE', 'TRADE', 'TERRAIN'],
    historicalCoreLabel: 'Maghreb / Atlas / Northern Sahara',
    shortDescription: 'High Atlas citadel fortifications, trans-Saharan trade caravan guidance, and unyielding mountainous autonomy.',
    artFamily: 'Maghreb Amazigh',
    aliases: ['Berber', 'Numidia', 'Moors', 'Tuareg'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 2, expansion: 0, maritime: -3 },
    accentColor: '#b45309',
    numericAccentColor: 0xb45309,
  },
  {
    id: 'aksum',
    displayName: 'AKSUM',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: 38.7, lat: 14.1 },
    homelandPolygon: [
      [35.0, 11.0], [36.0, 15.5], [39.0, 17.5], [42.0, 15.0], [43.0, 11.5],
      [40.5, 8.5], [36.5, 8.0],
    ],
    identityTraits: ['HIGHLAND', 'TRADE', 'FAITH'],
    historicalCoreLabel: 'Ethiopian / Eritrean Highlands & Red Sea Sphere',
    shortDescription: 'Towering granite stelae, Red Sea maritime commerce, and an ancient highland civilization connecting Africa with the Levant.',
    artFamily: 'Aksumite Imperial',
    aliases: ['Axum', 'Ethiopia', 'Abyssinia'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: -1, maritime: -1 },
    accentColor: '#7e22ce',
    numericAccentColor: 0x7e22ce,
  },
  {
    id: 'mali',
    displayName: 'MALI',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: -5.0, lat: 13.5 },
    homelandPolygon: [
      [-11.5, 11.0], [-11.0, 15.0], [-6.0, 16.5], [-2.0, 16.0], [-1.0, 13.5],
      [-4.0, 11.0], [-8.0, 10.0],
    ],
    identityTraits: ['WEALTH', 'TRADE', 'REACH'],
    historicalCoreLabel: 'Upper Niger / Western Sahel',
    shortDescription: 'Epicenter of trans-Saharan gold commerce, scholarly centers of Timbuktu, and monumental earthen architecture.',
    artFamily: 'Sahelian Imperial',
    aliases: ['Mandinka', 'Manden', 'Mansa'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 0, expansion: 3, maritime: -3 },
    accentColor: '#ca8a04',
    numericAccentColor: 0xca8a04,
  },
  {
    id: 'yoruba',
    displayName: 'YORUBA',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: 4.5, lat: 7.5 },
    homelandPolygon: [
      [2.0, 6.0], [2.2, 9.0], [5.5, 9.5], [7.0, 8.0], [6.5, 5.5], [3.5, 5.8],
    ],
    identityTraits: ['CITY', 'CRAFT', 'COMMUNITY'],
    historicalCoreLabel: 'Gulf of Guinea / Southwest West Africa',
    shortDescription: 'Masterful bronze and brass metallurgy, fortified city-state networks (Ife, Oyo), and vibrant civic traditions.',
    artFamily: 'Ife Yoruba',
    aliases: ['Oyo', 'Ife', 'Yorubaland'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 2, expansion: -1, maritime: -2 },
    accentColor: '#ea580c',
    numericAccentColor: 0xea580c,
  },
  {
    id: 'kongo',
    displayName: 'KONGO',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: 14.5, lat: -5.5 },
    homelandPolygon: [
      [11.5, -4.0], [12.0, -8.5], [16.0, -9.0], [18.0, -6.5], [17.5, -3.5],
      [14.0, -3.0],
    ],
    identityTraits: ['RIVER', 'KINGDOM', 'NETWORK'],
    historicalCoreLabel: 'Lower Congo / Western Central Africa',
    shortDescription: 'Centralized river monarchy, intricate raffia textile prestige, and extensive trade diplomacy across equatorial waterways.',
    artFamily: 'Bakongo Royal',
    aliases: ['Congo', 'Bakongo', 'Manikongo'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: 1, maritime: -3 },
    accentColor: '#92400e',
    numericAccentColor: 0x92400e,
  },
  {
    id: 'swahili',
    displayName: 'SWAHILI',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: 39.3, lat: -4.5 },
    homelandPolygon: [
      [38.0, -1.0], [41.0, -1.5], [40.5, -6.0], [40.0, -10.5], [38.5, -11.0],
      [37.5, -6.0], [37.0, -2.5],
    ],
    identityTraits: ['TRADE', 'MARITIME', 'CITY'],
    historicalCoreLabel: 'East African Coast',
    shortDescription: 'Coral-stone coastal port polities, monsoon dhow trade across the Indian Ocean, and cosmopolitan merchant culture.',
    artFamily: 'Swahili Coast',
    aliases: ['Zanzibar', 'Kilwa', 'Mombasa', 'Zanj'],
    isPlayable: true,
    doctrine: { offense: -2, defense: 0, expansion: -2, maritime: 4 },
    accentColor: '#0891b2',
    numericAccentColor: 0x0891b2,
  },
  {
    id: 'zulu',
    displayName: 'ZULU',
    macroRegion: 'AFRICA',
    homelandCenter: { lon: 31.0, lat: -28.5 },
    homelandPolygon: [
      [28.0, -27.0], [32.0, -26.5], [33.0, -29.0], [31.5, -31.5], [28.5, -30.5],
      [27.5, -28.5],
    ],
    identityTraits: ['DISCIPLINE', 'UNITY', 'PRESSURE'],
    historicalCoreLabel: 'Southeastern Africa',
    shortDescription: 'Rigorous amabutho regimental discipline, interlocking oxhide shields, and high-tempo frontline shock maneuver.',
    artFamily: 'Nguni Martial',
    aliases: ['Zululand', 'Nguni'],
    isPlayable: true,
    doctrine: { offense: 3, defense: 1, expansion: 0, maritime: -4 },
    accentColor: '#991b1b',
    numericAccentColor: 0x991b1b,
  },

  // ==========================================
  // WEST ASIA / CAUCASUS (4)
  // ==========================================
  {
    id: 'pers',
    displayName: 'PERS',
    macroRegion: 'WEST ASIA',
    homelandCenter: { lon: 53.0, lat: 32.0 },
    homelandPolygon: [
      [42.0, 37.0], [44.0, 39.5], [48.5, 40.0], [54.5, 39.5], [62.0, 39.5],
      [68.5, 36.0], [71.0, 32.0], [68.0, 26.5], [63.0, 24.5], [57.0, 24.5],
      [51.0, 26.5], [46.0, 29.5], [43.0, 33.0],
    ],
    identityTraits: ['STRATEGY', 'DEPTH', 'AUTHORITY'],
    historicalCoreLabel: 'Iranian Plateau',
    shortDescription: 'Imperial administrative depth, monumental Persepolitan architecture, and armored cavalry defense across the plateau.',
    artFamily: 'Persian Royal',
    armoryHeritageFamily: 'Persian Royal',
    aliases: ['Persia', 'Persian', 'Iran', 'Achaemenid', 'Sasanian'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 4, expansion: -2, maritime: -2 },
    accentColor: '#3b82f6',
    numericAccentColor: 0x3b82f6,
  },
  {
    id: 'assyria',
    displayName: 'ASSYRIA',
    macroRegion: 'WEST ASIA',
    homelandCenter: { lon: 43.1, lat: 36.3 },
    homelandPolygon: [
      [40.0, 35.0], [41.0, 37.5], [44.5, 37.5], [45.5, 35.0], [43.0, 34.0],
      [41.0, 34.0],
    ],
    identityTraits: ['ORDER', 'SIEGE', 'COMMAND'],
    historicalCoreLabel: 'Upper Mesopotamia',
    shortDescription: 'Iron-disciplined military engineering, monumental alabaster palace reliefs, and decisive siege command.',
    artFamily: 'Mesopotamian Imperial',
    aliases: ['Assyrian', 'Nineveh', 'Ashur'],
    isPlayable: true,
    doctrine: { offense: 3, defense: 1, expansion: 0, maritime: -4 },
    accentColor: '#475569',
    numericAccentColor: 0x475569,
  },
  {
    id: 'arab',
    displayName: 'ARAB',
    macroRegion: 'WEST ASIA',
    homelandCenter: { lon: 44.0, lat: 24.0 },
    homelandPolygon: [
      [37.0, 28.0], [42.0, 30.0], [48.0, 27.0], [53.0, 24.0], [53.0, 19.0],
      [46.0, 17.0], [41.0, 18.0], [38.0, 23.0],
    ],
    identityTraits: ['TRADE', 'MOBILITY', 'UNITY'],
    historicalCoreLabel: 'Arabian Peninsula',
    shortDescription: 'Rapid desert cavalry mobility, trans-peninsular caravan routes, and cultural unification through poetic and civic eloquence.',
    artFamily: 'Arabian Classic',
    aliases: ['Arabia', 'Arabian', 'Hejaz'],
    isPlayable: true,
    doctrine: { offense: 2, defense: -1, expansion: 2, maritime: -3 },
    accentColor: '#15803d',
    numericAccentColor: 0x15803d,
  },
  {
    id: 'armenian',
    displayName: 'ARMENIAN',
    macroRegion: 'WEST ASIA',
    homelandCenter: { lon: 44.0, lat: 39.8 },
    homelandPolygon: [
      [41.0, 38.5], [42.5, 41.5], [46.0, 41.0], [46.5, 38.5], [43.5, 37.8],
    ],
    identityTraits: ['HIGHLAND', 'RESILIENCE', 'CRAFT'],
    historicalCoreLabel: 'Armenian Highlands / Southern Caucasus',
    shortDescription: 'Volcanic stone fortress redoubts, intricate khachkar stone carving, and enduring mountain resilience.',
    artFamily: 'Armenian Highland',
    aliases: ['Armenia', 'Hayastan', 'Urartu'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 3, expansion: -1, maritime: -2 },
    accentColor: '#be123c',
    numericAccentColor: 0xbe123c,
  },

  // ==========================================
  // CENTRAL ASIA / EURASIAN STEPPE (4)
  // ==========================================
  {
    id: 'hun',
    displayName: 'HUN',
    macroRegion: 'CENTRAL ASIA',
    homelandCenter: { lon: 55.0, lat: 48.0 },
    homelandPolygon: [
      [28.0, 45.0], [35.0, 48.0], [45.0, 50.0], [55.0, 52.0], [68.0, 52.0],
      [72.0, 48.0], [66.0, 45.0], [54.0, 44.0], [44.0, 43.0], [34.0, 43.5],
      [28.0, 44.0],
    ],
    identityTraits: ['MOBILITY', 'PRESSURE', 'REACH'],
    historicalCoreLabel: 'Western / Central Eurasian Steppe',
    shortDescription: 'Mounted steppe aristocracy renowned for rapid strategic maneuver, composite archery, and expansive continental pressure.',
    artFamily: 'Hunnic Steppe',
    aliases: ['Hun', 'Huns', 'Hunnic', 'Attila'],
    isPlayable: true,
    doctrine: { offense: 2, defense: 0, expansion: 2, maritime: -4 },
    accentColor: '#9a3412',
    numericAccentColor: 0x9a3412,
  },
  {
    id: 'gokturk',
    displayName: 'GÖKTÜRK',
    macroRegion: 'CENTRAL ASIA',
    homelandCenter: { lon: 88.0, lat: 48.0 },
    homelandPolygon: [
      [75.0, 45.0], [80.0, 51.0], [90.0, 52.0], [98.0, 50.0], [96.0, 45.0],
      [90.0, 42.0], [82.0, 42.0], [76.0, 43.0],
    ],
    identityTraits: ['ORDER', 'MOBILITY', 'EXPANSION'],
    historicalCoreLabel: 'Altai / Eastern Central Asian Steppe',
    shortDescription: 'Early Turkic elite coordinating expansive steppe khaganates through structured nomadic institutions and tamga standards.',
    artFamily: 'Turkic Khaganate',
    aliases: ['Göktürk', 'Gokturk', 'Turkic Khaganate', 'Ashina'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 0, expansion: 3, maritime: -4 },
    accentColor: '#0284c7',
    numericAccentColor: 0x0284c7,
  },
  {
    id: 'mongol',
    displayName: 'MONGOL',
    macroRegion: 'CENTRAL ASIA',
    homelandCenter: { lon: 106.0, lat: 47.0 },
    homelandPolygon: [
      [96.0, 48.0], [102.0, 52.0], [112.0, 52.0], [118.0, 49.0], [116.0, 44.0],
      [108.0, 42.0], [98.0, 43.5],
    ],
    identityTraits: ['MOBILITY', 'SCALE', 'COMMAND'],
    historicalCoreLabel: 'Mongolian Plateau',
    shortDescription: 'Vast continental coordination, coordinated horse-archer encirclement, and unprecedented trans-continental reach.',
    artFamily: 'Mongol Steppe',
    aliases: ['Mongolia', 'Mongolian', 'Genghis Khan'],
    isPlayable: true,
    doctrine: { offense: 3, defense: -1, expansion: 2, maritime: -4 },
    accentColor: '#1e40af',
    numericAccentColor: 0x1e40af,
  },
  {
    id: 'saka',
    displayName: 'SAKA',
    macroRegion: 'CENTRAL ASIA',
    homelandCenter: { lon: 68.0, lat: 44.0 },
    homelandPolygon: [
      [58.0, 42.0], [62.0, 47.0], [72.0, 48.0], [78.0, 45.0], [76.0, 40.0],
      [68.0, 39.0], [60.0, 40.0],
    ],
    identityTraits: ['RIDER', 'FRONTIER', 'ADAPTATION'],
    historicalCoreLabel: 'Central Asian / Eastern Iranian Steppe Sphere',
    shortDescription: 'Animal-style gold metallurgy, nomadic composite archery, and swift frontier horse culture across the northern steppes.',
    artFamily: 'Saka Scythian',
    aliases: ['Scythian', 'Scythia', 'Issyk'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 1, expansion: 2, maritime: -4 },
    accentColor: '#eab308',
    numericAccentColor: 0xeab308,
  },

  // ==========================================
  // SOUTH ASIA (3)
  // ==========================================
  {
    id: 'magadha',
    displayName: 'MAGADHA',
    macroRegion: 'SOUTH ASIA',
    homelandCenter: { lon: 82.0, lat: 25.5 },
    homelandPolygon: [
      [77.0, 24.0], [79.0, 28.0], [85.0, 27.5], [87.0, 25.0], [85.0, 22.5],
      [80.0, 22.0],
    ],
    identityTraits: ['SCALE', 'STATE', 'GROWTH'],
    historicalCoreLabel: 'Indo-Gangetic Core',
    shortDescription: 'Vast agricultural heartland, royal Mauryan administrative integration, and monolithic edicts commanding the subcontinent.',
    artFamily: 'Maurya Indic',
    aliases: ['Maurya', 'Pataliputra', 'India'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 1, expansion: 2, maritime: -3 },
    accentColor: '#ea580c',
    numericAccentColor: 0xea580c,
  },
  {
    id: 'chola',
    displayName: 'CHOLA',
    macroRegion: 'SOUTH ASIA',
    homelandCenter: { lon: 79.0, lat: 10.8 },
    homelandPolygon: [
      [76.5, 8.5], [76.5, 12.5], [80.0, 13.5], [80.0, 9.5], [78.0, 8.0],
    ],
    identityTraits: ['MARITIME', 'TEMPLE', 'TRADE'],
    historicalCoreLabel: 'Tamil South / Indian Ocean Sphere',
    shortDescription: 'Monolithic granite vimana architecture, trans-oceanic naval merchant fleets, and rich bronze casting traditions.',
    artFamily: 'Dravidian Chola',
    aliases: ['Tamil', 'Coromandel', 'Thanjavur'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 0, expansion: -2, maritime: 2 },
    accentColor: '#dc2626',
    numericAccentColor: 0xdc2626,
  },
  {
    id: 'bengal',
    displayName: 'BENGAL',
    macroRegion: 'SOUTH ASIA',
    homelandCenter: { lon: 89.0, lat: 23.5 },
    homelandPolygon: [
      [86.5, 21.5], [86.5, 25.5], [91.0, 26.0], [92.5, 23.5], [91.0, 21.5],
      [88.5, 21.0],
    ],
    identityTraits: ['RIVER', 'TRADE', 'DENSITY'],
    historicalCoreLabel: 'Bengal Delta / Eastern Subcontinent',
    shortDescription: 'Immense riverine agricultural density, terracotta architectural heritage, and prosperous maritime silk and muslin trade.',
    artFamily: 'Bengal Delta',
    aliases: ['Vanga', 'Pala', 'Bangla'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 2, expansion: 1, maritime: -2 },
    accentColor: '#059669',
    numericAccentColor: 0x059669,
  },

  // ==========================================
  // EAST ASIA (4)
  // ==========================================
  {
    id: 'han',
    displayName: 'HAN',
    macroRegion: 'EAST ASIA',
    homelandCenter: { lon: 112.0, lat: 34.0 },
    homelandPolygon: [
      [101.0, 38.5], [108.0, 42.0], [118.0, 42.5], [123.5, 41.5], [125.0, 38.0],
      [124.5, 33.5], [123.5, 29.5], [121.5, 25.5], [116.0, 22.5], [109.0, 22.5],
      [102.5, 25.5], [99.0, 30.5], [99.5, 35.0],
    ],
    identityTraits: ['ORDER', 'SCALE', 'STRATEGY'],
    historicalCoreLabel: 'Chinese Heartland',
    shortDescription: 'Monumental central bureaucracy, coordinated river defense infrastructure, and immense demographic mobilization.',
    artFamily: 'Dynastic Han',
    armoryHeritageFamily: 'Dynastic Han',
    aliases: ['China', 'Chinese', 'Huaxia', 'Zhongyuan'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: 1, maritime: -3 },
    accentColor: '#10b981',
    numericAccentColor: 0x10b981,
  },
  {
    id: 'yamato',
    displayName: 'YAMATO',
    macroRegion: 'EAST ASIA',
    homelandCenter: { lon: 136.5, lat: 35.5 },
    homelandPolygon: [
      [128.5, 30.5], [128.5, 33.0], [129.5, 34.5], [132.5, 36.0], [136.5, 37.8],
      [138.8, 39.5], [139.8, 41.5], [140.5, 44.0], [142.5, 45.5], [145.5, 44.8],
      [146.5, 43.5], [144.0, 42.0], [142.5, 39.5], [141.5, 36.0], [140.0, 34.5],
      [136.5, 33.2], [133.0, 32.2], [130.8, 31.0],
    ],
    identityTraits: ['PRECISION', 'HONOR', 'MARITIME'],
    historicalCoreLabel: 'Japanese Archipelago',
    shortDescription: 'Island redoubt resilience, refined metallurgical mastery, and disciplined martial focus along maritime coasts.',
    artFamily: 'Yamato Shogunate',
    armoryHeritageFamily: 'Yamato Shogunate',
    aliases: ['Japan', 'Japanese', 'Nippon'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 2, expansion: -3, maritime: 0 },
    accentColor: '#f43f5e',
    numericAccentColor: 0xf43f5e,
  },
  {
    id: 'joseon',
    displayName: 'JOSEON',
    macroRegion: 'EAST ASIA',
    homelandCenter: { lon: 127.5, lat: 36.5 },
    homelandPolygon: [
      [124.5, 34.5], [125.0, 38.5], [128.0, 39.5], [130.0, 37.0], [129.5, 35.0],
      [126.5, 34.0],
    ],
    identityTraits: ['SCHOLARSHIP', 'ORDER', 'RESOLVE'],
    historicalCoreLabel: 'Korean Peninsula',
    shortDescription: 'High scholarly administration, innovative naval defense engineering (geobukseon), and steadfast peninsular fortitude.',
    artFamily: 'Joseon Korean',
    aliases: ['Korea', 'Korean', 'Goryeo', 'Hanguk'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 3, expansion: -1, maritime: -1 },
    accentColor: '#2563eb',
    numericAccentColor: 0x2563eb,
  },
  {
    id: 'tibetan',
    displayName: 'TIBETAN',
    macroRegion: 'EAST ASIA',
    homelandCenter: { lon: 88.0, lat: 31.0 },
    homelandPolygon: [
      [80.0, 30.0], [82.0, 34.5], [92.0, 35.0], [98.0, 32.0], [95.0, 28.0],
      [86.0, 28.0],
    ],
    identityTraits: ['HIGHLAND', 'ENDURANCE', 'IDENTITY'],
    historicalCoreLabel: 'Tibetan Plateau',
    shortDescription: 'Impregnable mountain dzong fortresses, extreme-altitude endurance, and deep cultural unity on the roof of the world.',
    artFamily: 'Tibetan Highland',
    aliases: ['Tibet', 'Bod', 'Himalayan'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 4, expansion: -2, maritime: -2 },
    accentColor: '#9333ea',
    numericAccentColor: 0x9333ea,
  },

  // ==========================================
  // SOUTHEAST ASIA (3)
  // ==========================================
  {
    id: 'khmer',
    displayName: 'KHMER',
    macroRegion: 'SOUTHEAST ASIA',
    homelandCenter: { lon: 104.5, lat: 12.5 },
    homelandPolygon: [
      [102.0, 11.0], [102.5, 14.5], [106.5, 14.5], [107.5, 11.5], [105.0, 10.2],
    ],
    identityTraits: ['WATER', 'MONUMENT', 'ORDER'],
    historicalCoreLabel: 'Lower Mekong / Cambodia',
    shortDescription: 'Monumental hydraulic engineering, temple-mountain architecture (Angkor), and intensive riverine agriculture.',
    artFamily: 'Angkor Khmer',
    aliases: ['Cambodia', 'Angkor', 'Kambuja'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: 1, maritime: -3 },
    accentColor: '#d97706',
    numericAccentColor: 0xd97706,
  },
  {
    id: 'dai_viet',
    displayName: 'ĐẠI VIỆT',
    macroRegion: 'SOUTHEAST ASIA',
    homelandCenter: { lon: 105.8, lat: 20.5 },
    homelandPolygon: [
      [103.5, 19.0], [104.0, 22.5], [107.5, 22.0], [107.0, 18.5], [105.0, 18.0],
    ],
    identityTraits: ['RESOLVE', 'RIVER', 'STATE'],
    historicalCoreLabel: 'Red River / Northern Vietnam',
    shortDescription: 'Decisive riverine defense, stubborn frontier resolve against continental empires, and coordinated irrigation statecraft.',
    artFamily: 'Dai Viet',
    aliases: ['Vietnam', 'Vietnamese', 'Annam', 'Dai Co Viet'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 3, expansion: -2, maritime: -2 },
    accentColor: '#dc2626',
    numericAccentColor: 0xdc2626,
  },
  {
    id: 'majapahit',
    displayName: 'MAJAPAHIT',
    macroRegion: 'SOUTHEAST ASIA',
    homelandCenter: { lon: 112.0, lat: -7.5 },
    homelandPolygon: [
      [105.5, -6.0], [108.5, -5.8], [114.5, -7.0], [115.0, -8.8], [111.0, -8.5],
      [106.0, -7.5],
    ],
    identityTraits: ['MARITIME', 'TRADE', 'NETWORK'],
    historicalCoreLabel: 'Java / Maritime Indonesian Sphere',
    shortDescription: 'Archipelagic maritime hegemony, spice route trade monopoly, and terracotta architectural artistry across the East Indies.',
    artFamily: 'Javanese Majapahit',
    aliases: ['Java', 'Indonesia', 'Nusantara'],
    isPlayable: true,
    doctrine: { offense: 0, defense: -1, expansion: -1, maritime: 2 },
    accentColor: '#ca8a04',
    numericAccentColor: 0xca8a04,
  },

  // ==========================================
  // NORTH AMERICA (5)
  // ==========================================
  {
    id: 'lakota',
    displayName: 'LAKOTA',
    macroRegion: 'NORTH AMERICA',
    homelandCenter: { lon: -101.0, lat: 44.0 },
    homelandPolygon: [
      [-112.0, 48.0], [-104.0, 51.0], [-94.0, 50.0], [-88.0, 46.5], [-85.0, 41.5],
      [-87.0, 36.5], [-92.0, 33.0], [-98.0, 31.0], [-104.0, 33.5], [-108.0, 38.0],
      [-112.0, 43.0],
    ],
    identityTraits: ['PLAINS', 'SPIRIT', 'RESOLVE'],
    historicalCoreLabel: 'Northern Great Plains',
    shortDescription: 'Equestrian mobility across the boundless northern prairie, reverence for the sacred Black Hills, and unyielding autonomy.',
    artFamily: 'Plains Indigenous',
    armoryHeritageFamily: 'Plains Command',
    aliases: ['Sioux', 'Lakota Oyate', 'Dakota'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 1, expansion: 2, maritime: -4 },
    accentColor: '#f97316',
    numericAccentColor: 0xf97316,
  },
  {
    id: 'haudenosaunee',
    displayName: 'HAUDENOSAUNEE',
    macroRegion: 'NORTH AMERICA',
    homelandCenter: { lon: -76.5, lat: 43.0 },
    homelandPolygon: [
      [-80.0, 41.5], [-80.5, 43.5], [-76.0, 44.5], [-73.5, 43.5], [-74.5, 41.0],
      [-78.0, 41.0],
    ],
    identityTraits: ['COUNCIL', 'UNITY', 'FOREST'],
    historicalCoreLabel: 'Great Lakes / Northeastern Woodland',
    shortDescription: 'The Great Law of Peace, enduring longhouse confederacy councils, and masterful forest diplomacy and defense.',
    artFamily: 'Eastern Woodland',
    aliases: ['Iroquois', 'Six Nations', 'Five Nations', 'Longhouse'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 3, expansion: 0, maritime: -3 },
    accentColor: '#7e22ce',
    numericAccentColor: 0x7e22ce,
  },
  {
    id: 'dine',
    displayName: 'DINÉ',
    macroRegion: 'NORTH AMERICA',
    homelandCenter: { lon: -110.0, lat: 36.0 },
    homelandPolygon: [
      [-113.0, 34.5], [-113.5, 37.5], [-107.5, 37.5], [-107.0, 34.5], [-110.0, 33.5],
    ],
    identityTraits: ['LAND', 'ENDURANCE', 'CRAFT'],
    historicalCoreLabel: 'American Southwest',
    shortDescription: 'Deep spiritual kinship with the four sacred mountains, masterful weaving and silversmithing, and canyon fortress resilience.',
    artFamily: 'Southwest Diné',
    aliases: ['Navajo', 'Dineh', 'Dinetah'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 3, expansion: 0, maritime: -2 },
    accentColor: '#0284c7',
    numericAccentColor: 0x0284c7,
  },
  {
    id: 'inuit',
    displayName: 'INUIT',
    macroRegion: 'NORTH AMERICA',
    homelandCenter: { lon: -92.0, lat: 66.0 },
    homelandPolygon: [
      [-105.0, 62.0], [-105.0, 70.0], [-80.0, 71.0], [-75.0, 64.0], [-88.0, 61.0],
      [-98.0, 61.0],
    ],
    identityTraits: ['ARCTIC', 'ADAPTATION', 'RANGE'],
    historicalCoreLabel: 'Arctic North America',
    shortDescription: 'Ingenious survival engineering across sea ice and tundra, maritime skin-boat navigation, and vast sub-polar reach.',
    artFamily: 'Arctic Inuit',
    aliases: ['Inuk', 'Nunavut', 'Thule'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 2, expansion: 1, maritime: -2 },
    accentColor: '#38bdf8',
    numericAccentColor: 0x38bdf8,
  },
  {
    id: 'haida',
    displayName: 'HAIDA',
    macroRegion: 'NORTH AMERICA',
    homelandCenter: { lon: -131.5, lat: 53.0 },
    homelandPolygon: [
      [-133.5, 52.0], [-133.5, 54.5], [-129.5, 54.5], [-129.5, 52.0],
    ],
    identityTraits: ['MARITIME', 'CRAFT', 'LINEAGE'],
    historicalCoreLabel: 'Pacific Northwest Coast',
    shortDescription: 'Monumental red cedar architecture and crest poles, powerful ocean-going war canoes, and wealthy potlatch traditions.',
    artFamily: 'Pacific Northwest Haida',
    aliases: ['Haida Gwaii', 'Xaad Kíl'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 1, expansion: -2, maritime: 0 },
    accentColor: '#b91c1c',
    numericAccentColor: 0xb91c1c,
  },

  // ==========================================
  // SOUTH AMERICA (EXACTLY 4)
  // ==========================================
  {
    id: 'inca',
    displayName: 'INCA',
    macroRegion: 'SOUTH AMERICA',
    homelandCenter: { lon: -73.0, lat: -12.5 },
    homelandPolygon: [
      [-79.0, -5.0], [-77.0, -2.0], [-72.0, -8.0], [-68.0, -15.0], [-68.0, -20.0],
      [-73.0, -18.0], [-77.0, -12.0],
    ],
    identityTraits: ['ALTITUDE', 'ORDER', 'ROAD'],
    historicalCoreLabel: 'Central Andes',
    shortDescription: 'Vast high-altitude highway logistics (Qhapaq Ñan), mortarless stone engineering, and terrace agricultural organization.',
    artFamily: 'Andean Imperial',
    aliases: ['Tawantinsuyu', 'Quechua', 'Cusco'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: 1, maritime: -3 },
    accentColor: '#eab308',
    numericAccentColor: 0xeab308,
  },
  {
    id: 'muisca',
    displayName: 'MUISCA',
    macroRegion: 'SOUTH AMERICA',
    homelandCenter: { lon: -73.5, lat: 5.5 },
    homelandPolygon: [
      [-78.0, 1.0], [-77.0, 8.0], [-72.0, 10.0], [-70.0, 5.0], [-71.0, 2.0],
      [-75.0, 0.5],
    ],
    identityTraits: ['TRADE', 'HIGHLAND', 'CRAFT'],
    historicalCoreLabel: 'Northern Andes / Colombian Highlands',
    shortDescription: 'Highland agricultural confederacies, renowned tumbaga gold alloy craftsmanship, and sacred lake offering rituals.',
    artFamily: 'Chibcha Muisca',
    aliases: ['Chibcha', 'Bacatá', 'Colombia'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 2, expansion: 1, maritime: -2 },
    accentColor: '#10b981',
    numericAccentColor: 0x10b981,
  },
  {
    id: 'mapuche',
    displayName: 'MAPUCHE',
    macroRegion: 'SOUTH AMERICA',
    homelandCenter: { lon: -72.0, lat: -38.5 },
    homelandPolygon: [
      [-74.5, -34.0], [-70.0, -34.0], [-66.0, -40.0], [-68.0, -45.0], [-74.0, -45.0],
      [-74.5, -38.0],
    ],
    identityTraits: ['RESOLVE', 'FRONTIER', 'LAND'],
    historicalCoreLabel: 'Southern Andes / Southern Cone',
    shortDescription: 'Centuries of unyielding resistance to imperial incursions, deep spiritual attachment to the ancestral land, and cavalry adaptation.',
    artFamily: 'Araucanian Mapuche',
    aliases: ['Araucanian', 'Wallmapu', 'Chile'],
    isPlayable: true,
    doctrine: { offense: 1, defense: 3, expansion: -1, maritime: -3 },
    accentColor: '#1d4ed8',
    numericAccentColor: 0x1d4ed8,
  },
  {
    id: 'guarani',
    displayName: 'GUARANÍ',
    macroRegion: 'SOUTH AMERICA',
    homelandCenter: { lon: -56.0, lat: -25.0 },
    homelandPolygon: [
      [-62.0, -20.0], [-56.0, -17.0], [-50.0, -22.0], [-52.0, -29.0], [-58.0, -30.0],
      [-62.0, -26.0],
    ],
    identityTraits: ['FOREST', 'COMMUNITY', 'ADAPTATION'],
    historicalCoreLabel: 'Paraná / Paraguay / Subtropical Interior',
    shortDescription: 'Communal riverine longhouse settlements, intimate ecological knowledge of the subtropical forests, and herbal wisdom.',
    artFamily: 'Parana Guarani',
    aliases: ['Paraguay', 'Tupi-Guarani'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 2, expansion: 1, maritime: -3 },
    accentColor: '#16a34a',
    numericAccentColor: 0x16a34a,
  },

  // ==========================================
  // AUSTRALIA (EXACTLY 3)
  // ==========================================
  {
    id: 'yolngu',
    displayName: 'YOLŊU',
    macroRegion: 'AUSTRALIA',
    homelandCenter: { lon: 135.5, lat: -12.5 },
    homelandPolygon: [
      [129.0, -15.0], [130.0, -11.5], [136.5, -11.5], [140.0, -14.0], [140.0, -18.0],
      [132.0, -18.0],
    ],
    identityTraits: ['COAST', 'KINSHIP', 'LAND'],
    historicalCoreLabel: 'Northern Australia / Arnhem Land Cultural Sphere',
    shortDescription: 'Mastery of coastal tidal waters, intricate rarrk cross-hatching bark artistry, and sacred ancestral law connecting sea and land.',
    artFamily: 'Arnhem Yolngu',
    aliases: ['Yolngu', 'Arnhem Land', 'Top End'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 2, expansion: -1, maritime: 0 },
    accentColor: '#b91c1c',
    numericAccentColor: 0xb91c1c,
  },
  {
    id: 'arrernte',
    displayName: 'ARRERNTE',
    macroRegion: 'AUSTRALIA',
    homelandCenter: { lon: 134.0, lat: -23.7 },
    homelandPolygon: [
      [127.0, -20.0], [138.0, -20.0], [140.0, -27.0], [134.0, -29.0], [127.0, -26.0],
    ],
    identityTraits: ['DESERT', 'LAND', 'ENDURANCE'],
    historicalCoreLabel: 'Central Australia',
    shortDescription: 'Millennia of continuous desert adaptation across the MacDonnell Ranges, sacred songline continuity, and deep environmental wisdom.',
    artFamily: 'Central Desert Arrernte',
    aliases: ['Aranda', 'Central Desert', 'Alice Springs'],
    isPlayable: true,
    doctrine: { offense: 0, defense: 3, expansion: 0, maritime: -3 },
    accentColor: '#d97706',
    numericAccentColor: 0xd97706,
  },
  {
    id: 'noongar',
    displayName: 'NOONGAR',
    macroRegion: 'AUSTRALIA',
    homelandCenter: { lon: 117.0, lat: -32.5 },
    homelandPolygon: [
      [114.5, -28.0], [118.0, -28.0], [123.0, -32.0], [122.0, -34.5], [115.0, -34.5],
      [114.5, -31.0],
    ],
    identityTraits: ['COUNTRY', 'SEASON', 'COMMUNITY'],
    historicalCoreLabel: 'Southwestern Australia',
    shortDescription: 'Sophisticated six-season ecological living across jarrah forests and coastal estuaries, warm kangaroo skin cloaks, and kinship unity.',
    artFamily: 'Southwest Noongar',
    aliases: ['Nyungar', 'Bibbulmun', 'Swan River'],
    isPlayable: true,
    doctrine: { offense: -1, defense: 2, expansion: 0, maritime: -1 },
    accentColor: '#0d9488',
    numericAccentColor: 0x0d9488,
  },

  // ==========================================
  // AOTEAROA / OCEANIA (1)
  // ==========================================
  {
    id: 'maori',
    displayName: 'MĀORI',
    macroRegion: 'OCEANIA',
    homelandCenter: { lon: 175.0, lat: -39.0 },
    homelandPolygon: [
      [172.0, -34.5], [178.5, -37.5], [178.0, -41.5], [174.0, -42.0], [171.0, -44.0],
      [167.0, -46.5], [168.0, -44.0], [173.0, -39.0],
    ],
    identityTraits: ['OCEAN', 'KINSHIP', 'RESOLVE'],
    historicalCoreLabel: 'Aotearoa / New Zealand',
    shortDescription: 'Oceanic voyaging mastery, fortified hilltop pa engineering, intricate wood and pounamu greenstone carving, and unyielding tribal valor.',
    artFamily: 'Polynesian Maori',
    aliases: ['Maori', 'Aotearoa', 'New Zealand', 'Tangata Whenua'],
    isPlayable: true,
    doctrine: { offense: 2, defense: 2, expansion: -3, maritime: -1 },
    accentColor: '#047857',
    numericAccentColor: 0x047857,
  },
];

/**
 * Calculates spherical polygon area on Earth in km² using Girard's formula / spherical excess.
 * Earth mean radius R = 6371.0 km.
 */
export function calculateSphericalPolygonAreaKm2(polygon: Array<[number, number]>): number {
  if (polygon.length < 3) return 0;
  const R = 6371.0;
  const toRad = Math.PI / 180;
  let total = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const [lon1, lat1] = polygon[i];
    const [lon2, lat2] = polygon[(i + 1) % n];

    let dLon = (lon2 - lon1) * toRad;
    if (dLon > Math.PI) dLon -= 2 * Math.PI;
    if (dLon < -Math.PI) dLon += 2 * Math.PI;

    const midLat = ((lat1 + lat2) / 2) * toRad;
    total += dLon * Math.sin(midLat);
  }

  return Math.abs(total) * R * R;
}

/**
 * Index of civilizations by ID for quick O(1) lookup.
 */
export const CIVILIZATION_BY_ID: Record<string, CivilizationRegion> = {};
for (const civ of CIVILIZATION_ATLAS) {
  CIVILIZATION_BY_ID[civ.id] = civ;
}

/**
 * Filter civilizations by search query and optional macro-region.
 */
export function searchCivilizations(query: string, regionFilter?: string): CivilizationRegion[] {
  const q = query.trim().toLowerCase();
  const filter = regionFilter && regionFilter !== 'ALL' ? regionFilter.toUpperCase() : null;

  return CIVILIZATION_ATLAS.filter((civ) => {
    if (filter && civ.macroRegion !== filter) {
      return false;
    }
    if (!q) return true;

    if (civ.displayName.toLowerCase().includes(q)) return true;
    if (civ.id.toLowerCase().includes(q)) return true;
    if (civ.historicalCoreLabel.toLowerCase().includes(q)) return true;
    if (civ.macroRegion.toLowerCase().includes(q)) return true;
    if (civ.identityTraits.some((t) => t.toLowerCase().includes(q))) return true;
    if (civ.aliases?.some((a) => a.toLowerCase().includes(q))) return true;

    return false;
  });
}
