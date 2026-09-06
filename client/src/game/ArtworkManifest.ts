/**
 * DOMINION OF SOL — AUTHORITATIVE PRODUCTION ARTWORK MANIFEST
 * 
 * Strict contract: Only genuine 16:9 photorealistic documentary photography
 * generated via AI image models is allowed. No procedural drawings, no vector art,
 * no generic duplicates.
 * 
 * Total Contract: 9 civilizations × 5 stages × 2 states (normal & defeat) = 90 main artwork entries.
 * DETERMINISTIC: Every artUrl derives strictly from the source filename convention:
 *   Normals:   /assets/nations/<civId>/stage_0<N>_normal.webp  (source files 1–5)
 *   Defeats:   /assets/nations/<civId>/stage_0<N>_defeat.webp  (source files 6–10)
 * No heuristic hacks, no mtime sorting, no regex guessing.
 */

export type ArtworkSource = 'generated_photorealistic' | 'pending_quota';
export type ArtworkStatus = 'COMPLETED' | 'ARTWORK PENDING';

export interface StageArtworkEntry {
  civId: string;
  stageNumber: number;
  state: 'normal' | 'defeat';
  stageTitle: string;
  populationScale: string;
  eraName: string;
  architecturalBrief: string;
  /** Deterministic source filename convention (no heuristics). Human-auditable: every entry should declare its source file. */
  sourceFilename?: string;
  source: ArtworkSource;
  status: ArtworkStatus;
  artUrl: string | null;
  thumbUrl: string | null;
}

export const PRODUCTION_ARTWORK_MANIFEST: Record<string, StageArtworkEntry> = {
  // ==========================================
  // TÜRK (6/10 Generated, 4 Pending Quota)
  // ==========================================
  'turk_s1_normal': {
    civId: 'turk', stageNumber: 1, state: 'normal',
    stageTitle: 'STEPPE FRONTIER ENCAMPMENT', populationScale: '~100 CITIZENS',
    eraName: 'Early Oghuz / Anatolian Migration',
    architecturalBrief: 'Nomadic felt yurts, horse corrals, hand-woven kilims, and stone-lined hearths nestled in high Anatolian steppe valleys.',
    sourceFilename: 'turk/1.png → stage_01_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_01_normal.webp',
    thumbUrl: '/assets/nations/turk/stage_01_normal_thumb.webp'
  },
  'turk_s1_defeat': {
    civId: 'turk', stageNumber: 1, state: 'defeat',
    stageTitle: 'ABANDONED STEPPE HEARTH', populationScale: '<50 SURVIVORS',
    eraName: 'Steppe Dispersion',
    architecturalBrief: 'Scattered collapsed yurt timber frames, extinguished ash pits, and windblown steppe dust across empty grassland.',
    sourceFilename: 'turkyikilmis/6.png → stage_01_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/turk/stage_01_defeat_thumb.webp'
  },
  'turk_s2_normal': {
    civId: 'turk', stageNumber: 2, state: 'normal',
    stageTitle: 'ANATOLIAN BEYLIK BOROUGH', populationScale: '~10,000 CITIZENS',
    eraName: 'Beylik Territorial Settlement',
    architecturalBrief: 'Carved ashlar stone caravanserais, timber-reinforced mosques, stone watermills, and defensive hilltop watchtowers.',
    sourceFilename: 'turk/2.png → stage_02_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_02_normal.webp',
    thumbUrl: '/assets/nations/turk/stage_02_normal_thumb.webp'
  },
  'turk_s2_defeat': {
    civId: 'turk', stageNumber: 2, state: 'defeat',
    stageTitle: 'BREACHED FRONTIER BOROUGH', populationScale: '<2,000 CITIZENS',
    eraName: 'Sack of the Frontier Valley',
    architecturalBrief: 'Burned caravanserai timber roofs, collapsed mudbrick ramparts, and abandoned bronze cauldrons.',
    sourceFilename: 'turkyikilmis/7.png → stage_02_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/turk/stage_02_defeat_thumb.webp'
  },
  'turk_s3_normal': {
    civId: 'turk', stageNumber: 3, state: 'normal',
    stageTitle: 'PROVINCIAL KHANATE METROPOLIS', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Early Imperial Consolidation',
    architecturalBrief: 'Monumental madrasas with intricate turquoise ceramic tilework, stone-vaulted covered bazaars, and imperial armories.',
    sourceFilename: 'turk/3.png → stage_03_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_03_normal.webp',
    thumbUrl: '/assets/nations/turk/stage_03_normal_thumb.webp'
  },
  'turk_s3_defeat': {
    civId: 'turk', stageNumber: 3, state: 'defeat',
    stageTitle: 'FALLEN PROVINCIAL SEAT', populationScale: '<150,000 CITIZENS',
    eraName: 'Siege Collapse',
    architecturalBrief: 'Shattered turquoise tile facades, toppled stone minarets, and breached inner stone bastions.',
    sourceFilename: 'turkyikilmis/8.png → stage_03_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/turk/stage_03_defeat_thumb.webp'
  },
  'turk_s4_normal': {
    civId: 'turk', stageNumber: 4, state: 'normal',
    stageTitle: 'BOSPHORUS IMPERIAL METROPOLIS', populationScale: '~100,000,000 CITIZENS',
    eraName: 'Sublime Porte Zenith',
    architecturalBrief: 'Grand Ottoman imperial capital along the Bosphorus strait: colossal stone domes, monumental minarets, Topkapi palace pavilions, bustling maritime harbors filled with galleons and dhows.',
    sourceFilename: 'turk/4.png → stage_04_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_04_normal.webp',
    thumbUrl: '/assets/nations/turk/stage_04_normal_thumb.webp'
  },
  'turk_s4_defeat': {
    civId: 'turk', stageNumber: 4, state: 'defeat',
    stageTitle: 'SUBJUGATED IMPERIAL CAPITAL', populationScale: '<10,000,000 CITIZENS',
    eraName: 'Imperial Partition',
    architecturalBrief: 'Black smoke billowing over breached Bosphorus seawalls, shattered dome cupolas, and burning merchant galleons drifting in the harbor.',
    sourceFilename: 'turkyikilmis/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/turk/stage_04_defeat_thumb.webp'
  },
  'turk_s5_normal': {
    civId: 'turk', stageNumber: 5, state: 'normal',
    stageTitle: 'EURASIAN SOLAR MEGAPOLIS 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'High Advanced Sol Hegemony',
    architecturalBrief: 'Evolved Bosphorus transit bridges, bio-composite cupolas, high-speed Eurasian maglev ribbons, warm Anatolian limestone and brushed champagne titanium.',
    sourceFilename: 'turk/5.png → stage_05_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_05_normal.webp',
    thumbUrl: '/assets/nations/turk/stage_05_normal_thumb.webp'
  },
  'turk_s5_defeat': {
    civId: 'turk', stageNumber: 5, state: 'defeat',
    stageTitle: 'COLLAPSED SOLAR MEGASTRUCTURE', populationScale: '<50,000,000 CITIZENS',
    eraName: 'Orbital Strike Ruin',
    architecturalBrief: 'Severed Bosphorus maglev spans plunged into the strait, darkened solar domes, and quiet atmospheric debris.',
    sourceFilename: 'turkyikilmis/10.png → stage_05_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/turk/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/turk/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // ROMA (10/10 Generated and Linked)
  // ==========================================
  'roma_s1_normal': {
    civId: 'roma', stageNumber: 1, state: 'normal',
    stageTitle: 'PALATINE HILL HABITATION', populationScale: '~100 CITIZENS',
    eraName: 'Early Latin Pastoral Age',
    architecturalBrief: 'Thatch-roofed wattle and daub huts along the Tiber bluffs with volcanic tuff perimeter palisades.',
    sourceFilename: 'roma/1.png → stage_01_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_01_normal.webp',
    thumbUrl: '/assets/nations/roma/stage_01_normal_thumb.webp'
  },
  'roma_s1_defeat': {
    civId: 'roma', stageNumber: 1, state: 'defeat',
    stageTitle: 'RAZED TIBER SETTLEMENT', populationScale: '<50 CITIZENS',
    eraName: 'Tribal Raiding Ruin',
    architecturalBrief: 'Charred timber palisades and ash deposits along the abandoned Tiber marsh.',
    sourceFilename: 'roma/6.png → stage_01_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/roma/stage_01_defeat_thumb.webp'
  },
  'roma_s2_normal': {
    civId: 'roma', stageNumber: 2, state: 'normal',
    stageTitle: 'REPUBLICAN MILITARY CASTRUM', populationScale: '~10,000 CITIZENS',
    eraName: 'Consular Expansion',
    architecturalBrief: 'Orderly grid castrum with timber gatehouses, stone praetorium, and basalt flagstone roads.',
    sourceFilename: 'roma/2.png → stage_02_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_02_normal.webp',
    thumbUrl: '/assets/nations/roma/stage_02_normal_thumb.webp'
  },
  'roma_s2_defeat': {
    civId: 'roma', stageNumber: 2, state: 'defeat',
    stageTitle: 'OVERRUN CASTRUM REDOUBT', populationScale: '<1,500 CITIZENS',
    eraName: 'Legionary Defeat',
    architecturalBrief: 'Breached wooden gates, burning barracks, and broken standard eagle shafts.',
    sourceFilename: 'roma/7.png → stage_02_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/roma/stage_02_defeat_thumb.webp'
  },
  'roma_s3_normal': {
    civId: 'roma', stageNumber: 3, state: 'normal',
    stageTitle: 'MEDITERRANEAN COLONIA URBS', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Imperial Province Zenith',
    architecturalBrief: 'Arched Roman theater, brick-faced concrete basilica, marble forum columns, and public baths.',
    sourceFilename: 'roma/3.png → stage_03_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_03_normal.webp',
    thumbUrl: '/assets/nations/roma/stage_03_normal_thumb.webp'
  },
  'roma_s3_defeat': {
    civId: 'roma', stageNumber: 3, state: 'defeat',
    stageTitle: 'SACKED PROVINCIAL SEAT', populationScale: '<120,000 CITIZENS',
    eraName: 'Barbarian Incursion',
    architecturalBrief: 'Toppled Corinthian columns, smoking basilica porticos, and shattered lead aqueduct pipes.',
    sourceFilename: 'roma/8.png → stage_03_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/roma/stage_03_defeat_thumb.webp'
  },
  'roma_s4_normal': {
    civId: 'roma', stageNumber: 4, state: 'normal',
    stageTitle: 'ETERNAL IMPERIAL METROPOLIS', populationScale: '~100,000,000 CITIZENS',
    eraName: 'Pax Romana Zenith',
    architecturalBrief: 'Imperial Roman monumental capital: the Colosseum, grand curving aqueducts across the countryside to the sea, marble temples, triumphal arches, and marching cohorts.',
    sourceFilename: 'roma/4.png → stage_04_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_04_normal.webp',
    thumbUrl: '/assets/nations/roma/stage_04_normal_thumb.webp'
  },
  'roma_s4_defeat': {
    civId: 'roma', stageNumber: 4, state: 'defeat',
    stageTitle: 'FALL OF ROME', populationScale: '<8,000,000 CITIZENS',
    eraName: 'Cataclysmic Sack',
    architecturalBrief: 'The Colosseum damaged by fire, breached aqueducts spilling torrents across rubble-choked streets, and smoldering Forum basilicas.',
    sourceFilename: 'roma/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/roma/stage_04_defeat_thumb.webp'
  },
  'roma_s5_normal': {
    civId: 'roma', stageNumber: 5, state: 'normal',
    stageTitle: 'NEO-ROMAN SOLAR CITADEL 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Pax Solaris Zenith',
    architecturalBrief: 'High-density Mediterranean super-city: monumental orbital arcades, white nano-travertine towers, and floating solar viaducts.',
    sourceFilename: 'roma/5.png → stage_05_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_05_normal.webp',
    thumbUrl: '/assets/nations/roma/stage_05_normal_thumb.webp'
  },
  'roma_s5_defeat': {
    civId: 'roma', stageNumber: 5, state: 'defeat',
    stageTitle: 'SHATTERED SOLAR AQUEDUCT', populationScale: '<40,000,000 CITIZENS',
    eraName: 'Orbital Ruin',
    architecturalBrief: 'Fractured crystalline aqueduct arches floating as space debris, dead power conduits, and dark ruins.',
    sourceFilename: 'roma/10.png → stage_05_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/roma/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/roma/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // PERS (1/10 Generated, 9 Pending Quota)
  // ==========================================
  'pers_s1_normal': {
    civId: 'pers', stageNumber: 1, state: 'normal',
    stageTitle: 'ZAGROS FOOTHILL OASIS', populationScale: '~100 CITIZENS',
    eraName: 'Early Proto-Elamite Settlement',
    architecturalBrief: 'Sun-baked mudbrick homesteads clustered around natural mountain springs and date palm groves.',
    sourceFilename: 'pers/1.png → stage_01_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_01_normal.webp',
    thumbUrl: '/assets/nations/pers/stage_01_normal_thumb.webp'
  },
  'pers_s1_defeat': {
    civId: 'pers', stageNumber: 1, state: 'defeat',
    stageTitle: 'DESICCATED PLATEAU CAMP', populationScale: '<50 CITIZENS',
    eraName: 'Drought Collapse',
    architecturalBrief: 'Cracked arid clay foundations and dry qanat irrigation canals filled with drifting desert sand.',
    sourceFilename: 'pers/6.png → stage_01_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/pers/stage_01_defeat_thumb.webp'
  },
  'pers_s2_normal': {
    civId: 'pers', stageNumber: 2, state: 'normal',
    stageTitle: 'SATRAPY FORTRESS OASIS', populationScale: '~10,000 CITIZENS',
    eraName: 'Achaemenid Regional Outpost',
    architecturalBrief: 'High mudbrick bastions, underground qanat water networks, and walled pomegranate gardens.',
    sourceFilename: 'pers/2.png → stage_02_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_02_normal.webp',
    thumbUrl: '/assets/nations/pers/stage_02_normal_thumb.webp'
  },
  'pers_s2_defeat': {
    civId: 'pers', stageNumber: 2, state: 'defeat',
    stageTitle: 'COLLAPSED OASIS BASTION', populationScale: '<1,800 CITIZENS',
    eraName: 'Assyrian Razing',
    architecturalBrief: 'Collapsed clay towers, destroyed irrigation sluice gates, and burned orchard trees.',
    sourceFilename: 'pers/7.png → stage_02_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/pers/stage_02_defeat_thumb.webp'
  },
  'pers_s3_normal': {
    civId: 'pers', stageNumber: 3, state: 'normal',
    stageTitle: 'PASARGADAE GARDEN PALACE', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Early King of Kings Seat',
    architecturalBrief: 'Extensive limestone four-fold paradise gardens (chahar bagh), geometric stone fountains, and royal pavilions.',
    sourceFilename: 'pers/3.png → stage_03_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_03_normal.webp',
    thumbUrl: '/assets/nations/pers/stage_03_normal_thumb.webp'
  },
  'pers_s3_defeat': {
    civId: 'pers', stageNumber: 3, state: 'defeat',
    stageTitle: 'DESECRATED ROYAL PALACE', populationScale: '<140,000 CITIZENS',
    eraName: 'Dynastic Usurpation',
    architecturalBrief: 'Dry limestone water channels, burned cedar beams, and vandalized cuneiform wall inscriptions.',
    sourceFilename: 'pers/8.png → stage_03_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/pers/stage_03_defeat_thumb.webp'
  },
  'pers_s4_normal': {
    civId: 'pers', stageNumber: 4, state: 'normal',
    stageTitle: 'PERSEPOLIS IMPERIAL ZENITH', populationScale: '~100,000,000 CITIZENS',
    eraName: 'Achaemenid Empire Peak',
    architecturalBrief: 'Colossal stone Apadana palace platform, monumental bull capital columns, grand tribute staircases, and lush walled paradise gardens.',
    sourceFilename: 'pers/4.png → stage_04_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_04_normal.webp',
    thumbUrl: '/assets/nations/pers/stage_04_normal_thumb.webp'
  },
  'pers_s4_defeat': {
    civId: 'pers', stageNumber: 4, state: 'defeat',
    stageTitle: 'BURNING OF PERSEPOLIS', populationScale: '<9,000,000 CITIZENS',
    eraName: 'Macedonian Conflagration',
    architecturalBrief: 'Apadana cedar timber roofs collapsing in torrents of flame, toppled fluted columns, and molten gold dripping onto stone staircases.',
    sourceFilename: 'pers/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/pers/stage_04_defeat_thumb.webp'
  },
  'pers_s5_normal': {
    civId: 'pers', stageNumber: 5, state: 'normal',
    stageTitle: 'PARADISE ORBITAL ARCOLOGY 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Solar Shahnama Era',
    architecturalBrief: 'Massive tiered arcologies mirroring the Zagros mountains with indoor climatic valleys and orbital mirrors.',
    sourceFilename: 'pers/5.png → stage_05_normal.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_05_normal.webp',
    thumbUrl: '/assets/nations/pers/stage_05_normal_thumb.webp'
  },
  'pers_s5_defeat': {
    civId: 'pers', stageNumber: 5, state: 'defeat',
    stageTitle: 'DARKENED BIODOME ENCLAVE', populationScale: '<45,000,000 CITIZENS',
    eraName: 'Atmospheric Failure',
    architecturalBrief: 'Fractured geodesic bio-dome lattices, wilted vertical vegetation hanging over dead fountains.',
    sourceFilename: 'pers/10.png → stage_05_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/pers/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/pers/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // MISIR (1/10 Generated, 9 Pending Quota)
  // ==========================================
  'misir_s1_normal': {
    civId: 'misir', stageNumber: 1, state: 'normal',
    stageTitle: 'NILE DELTA REED HAMLET', populationScale: '~100 CITIZENS',
    eraName: 'Badarian / Naqada Settlement',
    architecturalBrief: 'Papyrus reed huts, woven fish traps, mud-plastered granaries, and dugout canoes along the Nile banks.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_01_normal.webp',
    thumbUrl: '/assets/nations/misir/stage_01_normal_thumb.webp'
  },
  'misir_s1_defeat': {
    civId: 'misir', stageNumber: 1, state: 'defeat',
    stageTitle: 'FLOOD-SWEPT DELTA RUIN', populationScale: '<40 CITIZENS',
    eraName: 'Inundation Catastrophe',
    architecturalBrief: 'Washed-out reed bundles and collapsed mud silos half-submerged in silty brown floodwaters.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/misir/stage_01_defeat_thumb.webp'
  },
  'misir_s2_normal': {
    civId: 'misir', stageNumber: 2, state: 'normal',
    stageTitle: 'NOMARCH RIVERINE TOWN', populationScale: '~10,000 CITIZENS',
    eraName: 'Early Dynastic Nome',
    architecturalBrief: 'Mudbrick mastabas, walled temple precincts with palm-form pillars, and stone-lined grain docks.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_02_normal.webp',
    thumbUrl: '/assets/nations/misir/stage_02_normal_thumb.webp'
  },
  'misir_s2_defeat': {
    civId: 'misir', stageNumber: 2, state: 'defeat',
    stageTitle: 'PILLAGED NOME PRECINCT', populationScale: '<1,400 CITIZENS',
    eraName: 'Civil Strife Ruin',
    architecturalBrief: 'Breached riverfront walls, smashed pottery silos, and defaced stone steles.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/misir/stage_02_defeat_thumb.webp'
  },
  'misir_s3_normal': {
    civId: 'misir', stageNumber: 3, state: 'normal',
    stageTitle: 'THEBAN TEMPLE METROPOLIS', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Middle Kingdom Zenith',
    architecturalBrief: 'Grand stone hypostyle halls, avenue of ram-headed sphinxes, painted obelisks, and river barges.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_03_normal.webp',
    thumbUrl: '/assets/nations/misir/stage_03_normal_thumb.webp'
  },
  'misir_s3_defeat': {
    civId: 'misir', stageNumber: 3, state: 'defeat',
    stageTitle: 'DESOLATED TEMPLE CITY', populationScale: '<110,000 CITIZENS',
    eraName: 'Hyksos Conquest',
    architecturalBrief: 'Shattered colossal sandstone statues, toppled obelisks, and smoking papyrus storage depots.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/misir/stage_03_defeat_thumb.webp'
  },
  'misir_s4_normal': {
    civId: 'misir', stageNumber: 4, state: 'normal',
    stageTitle: 'DYNASTIC IMPERIAL CORRIDOR', populationScale: '~100,000,000 CITIZENS',
    eraName: 'New Kingdom Golden Age',
    architecturalBrief: 'Magnificent golden-hour Nile metropolis: massive sandstone pylons, colossal seated Pharaohs, granite obelisks, bustling feluccas on the Nile river, with the Great Pyramids and Sphinx in the desert distance.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_04_normal.webp',
    thumbUrl: '/assets/nations/misir/stage_04_normal_thumb.webp'
  },
  'misir_s4_defeat': {
    civId: 'misir', stageNumber: 4, state: 'defeat',
    stageTitle: 'FALLEN EMPIRE OF RA', populationScale: '<7,500,000 CITIZENS',
    eraName: 'Sea Peoples Invasion',
    architecturalBrief: 'Burning temple pylons along the Nile, overturned barges drifting on fire, and toppled colossal statues half-buried in desert sand.',
    sourceFilename: 'misir/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/misir/stage_04_defeat_thumb.webp'
  },
  'misir_s5_normal': {
    civId: 'misir', stageNumber: 5, state: 'normal',
    stageTitle: 'SOLAR PYRAMID MEGALOPOLIS 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Kemet Solar Renaissance',
    architecturalBrief: 'Gigantic photovoltaic glass pyramids harvesting orbital solar radiation, integrated freshwater hydro-tubes, and desert bio-canopies.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_05_normal.webp',
    thumbUrl: '/assets/nations/misir/stage_05_normal_thumb.webp'
  },
  'misir_s5_defeat': {
    civId: 'misir', stageNumber: 5, state: 'defeat',
    stageTitle: 'SHATTERED SOLAR MONOLITH', populationScale: '<35,000,000 CITIZENS',
    eraName: 'Energy Core Overload',
    architecturalBrief: 'Fractured solar glass pyramids, melted sand vitrified into black obsidian, and dead cooling towers.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/misir/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/misir/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // HAN (1/10 Generated, 9 Pending Quota)
  // ==========================================
  'han_s1_normal': {
    civId: 'han', stageNumber: 1, state: 'normal',
    stageTitle: 'YELLOW RIVER VALLEY HAMLET', populationScale: '~100 CITIZENS',
    eraName: 'Yangshao / Longshan Settlement',
    architecturalBrief: 'Semi-subterranean circular pit dwellings, pounded-earth walls, and terraced millet plots.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_01_normal.webp',
    thumbUrl: '/assets/nations/han/stage_01_normal_thumb.webp'
  },
  'han_s1_defeat': {
    civId: 'han', stageNumber: 1, state: 'defeat',
    stageTitle: 'FLOOD-RAVAGED LOESS BASIN', populationScale: '<50 CITIZENS',
    eraName: 'River Avulsion Disaster',
    architecturalBrief: 'Mud-choked earthen foundations and collapsed thatched timber roofs swept away by flood silts.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/han/stage_01_defeat_thumb.webp'
  },
  'han_s2_normal': {
    civId: 'han', stageNumber: 2, state: 'normal',
    stageTitle: 'WALLED COUNTY GARRISON', populationScale: '~10,000 CITIZENS',
    eraName: 'Warring States Outpost',
    architecturalBrief: 'Massive rammed-earth (hangtu) ramparts, tiered wooden watchtowers, and iron weapon arsenals.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_02_normal.webp',
    thumbUrl: '/assets/nations/han/stage_02_normal_thumb.webp'
  },
  'han_s2_defeat': {
    civId: 'han', stageNumber: 2, state: 'defeat',
    stageTitle: 'CRUMBLED RAMMED-EARTH WALLS', populationScale: '<1,600 CITIZENS',
    eraName: 'Siege Destruction',
    architecturalBrief: 'Shattered timber watchtowers collapsed inside breached rammed-earth moats.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/han/stage_02_defeat_thumb.webp'
  },
  'han_s3_normal': {
    civId: 'han', stageNumber: 3, state: 'normal',
    stageTitle: 'CENTRAL RIVERINE METROPOLIS', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Early Han Dynasty Center',
    architecturalBrief: 'Multi-tiered tiled-roof gatehouses, vermilion lacquer pillars, stone arch bridges, and grand granaries.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_03_normal.webp',
    thumbUrl: '/assets/nations/han/stage_03_normal_thumb.webp'
  },
  'han_s3_defeat': {
    civId: 'han', stageNumber: 3, state: 'defeat',
    stageTitle: 'RAZED PROVINCIAL SEAT', populationScale: '<130,000 CITIZENS',
    eraName: 'Rebellion Firestorm',
    architecturalBrief: 'Charred lacquer columns, collapsed ceramic tile roofs, and burned civil archives.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/han/stage_03_defeat_thumb.webp'
  },
  'han_s4_normal': {
    civId: 'han', stageNumber: 4, state: 'normal',
    stageTitle: 'CELESTIAL DYNASTY IMPERIAL CITADEL', populationScale: '~100,000,000 CITIZENS',
    eraName: 'Middle Kingdom Zenith',
    architecturalBrief: 'Grand stone mountain fortress gatehouse and imperial border city, stone Great Wall serpentining across misty karst mountains, stone bridges over river plains, and banner-clad soldiers.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_04_normal.webp',
    thumbUrl: '/assets/nations/han/stage_04_normal_thumb.webp'
  },
  'han_s4_defeat': {
    civId: 'han', stageNumber: 4, state: 'defeat',
    stageTitle: 'FALL OF THE CELESTIAL GATES', populationScale: '<8,500,000 CITIZENS',
    eraName: 'Nomadic Breakthrough',
    architecturalBrief: 'Breached mountain fortress gates, collapsed Great Wall sections, burning gate towers, and smoke filling the karst river valley.',
    sourceFilename: 'han/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/han/stage_04_defeat_thumb.webp'
  },
  'han_s5_normal': {
    civId: 'han', stageNumber: 5, state: 'normal',
    stageTitle: 'TIANXIA ORBITAL RIVER NETWORK 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'High Celestial Hegemony',
    architecturalBrief: 'Multi-level arcology terraces echoing natural karst landscapes, jadeite composite materials, and high-volume maglev arteries.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_05_normal.webp',
    thumbUrl: '/assets/nations/han/stage_05_normal_thumb.webp'
  },
  'han_s5_defeat': {
    civId: 'han', stageNumber: 5, state: 'defeat',
    stageTitle: 'COLLAPSED CELESTIAL ARCOLOGY', populationScale: '<42,000,000 CITIZENS',
    eraName: 'Kinetic Strike Ruin',
    architecturalBrief: 'Shattered jadeite structural beams, twisted skybridge spans, and dead automated transit tubes.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/han/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/han/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // YAMATO (1/10 Generated, 9 Pending Quota)
  // ==========================================
  'yamato_s1_normal': {
    civId: 'yamato', stageNumber: 1, state: 'normal',
    stageTitle: 'COASTAL INLAND-SEA COVE', populationScale: '~100 CITIZENS',
    eraName: 'Jomon / Yayoi Fisher Settlement',
    architecturalBrief: 'Raised-floor thatched timber huts, wooden drying racks for fish and seaweed, and dugouts on pebbled shores.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_01_normal.webp',
    thumbUrl: '/assets/nations/yamato/stage_01_normal_thumb.webp'
  },
  'yamato_s1_defeat': {
    civId: 'yamato', stageNumber: 1, state: 'defeat',
    stageTitle: 'TSUNAMI-DEVASTATED COVE', populationScale: '<40 CITIZENS',
    eraName: 'Tsunami Aftermath',
    architecturalBrief: 'Shattered timber pilings, tangled fishing nets, and drift logs scattered across waterlogged mud.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/yamato/stage_01_defeat_thumb.webp'
  },
  'yamato_s2_normal': {
    civId: 'yamato', stageNumber: 2, state: 'normal',
    stageTitle: 'SHOGUNATE FORTIFIED POST', populationScale: '~10,000 CITIZENS',
    eraName: 'Early Clan Fortress',
    architecturalBrief: 'Timber stockade walls, wooden watchtowers, curved shingle roofs, and dry moats on terraced foothills.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_02_normal.webp',
    thumbUrl: '/assets/nations/yamato/stage_02_normal_thumb.webp'
  },
  'yamato_s2_defeat': {
    civId: 'yamato', stageNumber: 2, state: 'defeat',
    stageTitle: 'ASHEN CLAN ENCLAVE', populationScale: '<1,500 CITIZENS',
    eraName: 'Clan Rivalry Sacking',
    architecturalBrief: 'Charred timber stockades, collapsed cedar roofs, and smoke drifting over tramped terraced rice paddies.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/yamato/stage_02_defeat_thumb.webp'
  },
  'yamato_s3_normal': {
    civId: 'yamato', stageNumber: 3, state: 'normal',
    stageTitle: 'PROVINCIAL CASTLE HARBOR', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Feudal Castle Town',
    architecturalBrief: 'Massive dry-stone castle ramparts, white plaster donjon, merchant canal district, and vermilion shrines.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_03_normal.webp',
    thumbUrl: '/assets/nations/yamato/stage_03_normal_thumb.webp'
  },
  'yamato_s3_defeat': {
    civId: 'yamato', stageNumber: 3, state: 'defeat',
    stageTitle: 'BURNING CASTLE DONJON', populationScale: '<120,000 CITIZENS',
    eraName: 'Sengoku Siege Ruin',
    architecturalBrief: 'Main white donjon engulfed in flames, collapsed stone rampart sections, and burned merchant boats in canals.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/yamato/stage_03_defeat_thumb.webp'
  },
  'yamato_s4_normal': {
    civId: 'yamato', stageNumber: 4, state: 'normal',
    stageTitle: 'INLAND-SEA SHOGUNATE METROPOLIS', populationScale: '~100,000,000 CITIZENS',
    eraName: 'Edo Zenith Maritime Realm',
    architecturalBrief: 'Vibrant coastal shogunate town with blooming cherry blossoms, five-story pagoda, wooden fortifications, floating vermilion torii gates in the inland sea, and snow-capped Mount Fuji in the sunrise distance.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_04_normal.webp',
    thumbUrl: '/assets/nations/yamato/stage_04_normal_thumb.webp'
  },
  'yamato_s4_defeat': {
    civId: 'yamato', stageNumber: 4, state: 'defeat',
    stageTitle: 'RUINS OF THE INLAND SEA', populationScale: '<8,000,000 CITIZENS',
    eraName: 'Naval Bombardment Ruin',
    architecturalBrief: 'Burning floating torii gates splintered in the waves, shattered pagoda collapse, and smoke obscuring Mount Fuji.',
    sourceFilename: 'yamato/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/yamato/stage_04_defeat_thumb.webp'
  },
  'yamato_s5_normal': {
    civId: 'yamato', stageNumber: 5, state: 'normal',
    stageTitle: 'FLOATING ARCHIPELAGO MEGAPOLIS 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Solar Shinto Technopolis',
    architecturalBrief: 'Floating oceanic megastructures anchored along the coast, bio-luminescent gardens, and solar-sail merchant fleets.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_05_normal.webp',
    thumbUrl: '/assets/nations/yamato/stage_05_normal_thumb.webp'
  },
  'yamato_s5_defeat': {
    civId: 'yamato', stageNumber: 5, state: 'defeat',
    stageTitle: 'SUBMERGED OCEANIC ARCOLOGY', populationScale: '<38,000,000 CITIZENS',
    eraName: 'Breached Flotation Core',
    architecturalBrief: 'Listing half-submerged floating platforms, dark titanium superstructures, and oil slicks on calm waters.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/yamato/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/yamato/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // NORSE (1/10 Generated, 9 Pending Quota)
  // ==========================================
  'norse_s1_normal': {
    civId: 'norse', stageNumber: 1, state: 'normal',
    stageTitle: 'FJORD COVE LONGBOAT SHORE', populationScale: '~100 CITIZENS',
    eraName: 'Early Scandinavian Settlement',
    architecturalBrief: 'Turf-roofed timber longhouses, smoking fire-pits, fish drying racks, and wooden slipways along sheer granite cliffs.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_01_normal.webp',
    thumbUrl: '/assets/nations/norse/stage_01_normal_thumb.webp'
  },
  'norse_s1_defeat': {
    civId: 'norse', stageNumber: 1, state: 'defeat',
    stageTitle: 'FROZEN EMBERS AT THE FJORD', populationScale: '<45 CITIZENS',
    eraName: 'Winter Raiding Collapse',
    architecturalBrief: 'Burned turf roofs covered in black ash and winter snow, shattered longboat ribs half-frozen in sea ice.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/norse/stage_01_defeat_thumb.webp'
  },
  'norse_s2_normal': {
    civId: 'norse', stageNumber: 2, state: 'normal',
    stageTitle: 'JARL THINGSTEAD & TIMBER HALL', populationScale: '~10,000 CITIZENS',
    eraName: 'Viking Age Jarl Seat',
    architecturalBrief: 'Carved dragon-headed stave assembly halls, timber palisades, iron weapon forges, and boat-building slips.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_02_normal.webp',
    thumbUrl: '/assets/nations/norse/stage_02_normal_thumb.webp'
  },
  'norse_s2_defeat': {
    civId: 'norse', stageNumber: 2, state: 'defeat',
    stageTitle: 'SACKED THINGSTEAD RIDGE', populationScale: '<1,700 CITIZENS',
    eraName: 'Rival Jarl Conquest',
    architecturalBrief: 'Collapsed dragon-carved gables, smoldering timber palisades, and abandoned iron cauldrons.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/norse/stage_02_defeat_thumb.webp'
  },
  'norse_s3_normal': {
    civId: 'norse', stageNumber: 3, state: 'normal',
    stageTitle: 'BALTIC TRADE EMPORIUM', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Maritime Trading Empire',
    architecturalBrief: 'Stone quays, multi-aisled wooden stave guildhalls, iron warehouses, and dozens of trading knarrs.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_03_normal.webp',
    thumbUrl: '/assets/nations/norse/stage_03_normal_thumb.webp'
  },
  'norse_s3_defeat': {
    civId: 'norse', stageNumber: 3, state: 'defeat',
    stageTitle: 'DEVASTATED TIMBER HAVEN', populationScale: '<125,000 CITIZENS',
    eraName: 'Naval Armada Sacking',
    architecturalBrief: 'Burned harbor quays, toppled stave church towers, and burning merchant ships blocking the fjord narrows.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/norse/stage_03_defeat_thumb.webp'
  },
  'norse_s4_normal': {
    civId: 'norse', stageNumber: 4, state: 'normal',
    stageTitle: 'AURORA FJORD KINGDOM HARBOR', populationScale: '~100,000,000 CITIZENS',
    eraName: 'High Norse Maritime Realm',
    architecturalBrief: 'Massive coastal fjord fortress and trading port illuminated by the northern lights: dragon-prowed longships cutting through icy waters, turf-roofed stone buildings, wooden docks, and snow-capped peaks.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_04_normal.webp',
    thumbUrl: '/assets/nations/norse/stage_04_normal_thumb.webp'
  },
  'norse_s4_defeat': {
    civId: 'norse', stageNumber: 4, state: 'defeat',
    stageTitle: 'FJORD OF RAGNAROK', populationScale: '<7,000,000 CITIZENS',
    eraName: 'Cataclysmic Conquest',
    architecturalBrief: 'Black smoke boiling up beneath the green northern lights, burning dragon longships drifting into ice floes, and burning fortress docks.',
    sourceFilename: 'norse/9.png → stage_04_defeat.webp',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/norse/stage_04_defeat_thumb.webp'
  },
  'norse_s5_normal': {
    civId: 'norse', stageNumber: 5, state: 'normal',
    stageTitle: 'GEOTHERMAL FJORD HEGEMON 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Boreal Solar Dominion',
    architecturalBrief: 'Deep geothermal energy conduits tapping glacial volcanic rifts, carbon-reinforced stave arches, and sub-sea transit tubes.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_05_normal.webp',
    thumbUrl: '/assets/nations/norse/stage_05_normal_thumb.webp'
  },
  'norse_s5_defeat': {
    civId: 'norse', stageNumber: 5, state: 'defeat',
    stageTitle: 'FROZEN GEOTHERMAL TRENCH', populationScale: '<36,000,000 CITIZENS',
    eraName: 'Thermal Core Rupture',
    architecturalBrief: 'Dead steam geysers frozen into giant ice spires, cracked geothermal glass towers, and darkness under dead skies.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/norse/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/norse/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // MAYA (4/10 Generated, 6 Pending Quota)
  // ==========================================
  'maya_s1_normal': {
    civId: 'maya', stageNumber: 1, state: 'normal',
    stageTitle: 'JUNGLE CENOTE CLEARING', populationScale: '~100 CITIZENS',
    eraName: 'Pre-Classic Milpa Settlement',
    architecturalBrief: 'Pole-and-thatch huts clustered around natural limestone sinkhole cenotes, maize garden plots in rainforest clearings.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_01_normal.webp',
    thumbUrl: '/assets/nations/maya/stage_01_normal_thumb.webp'
  },
  'maya_s1_defeat': {
    civId: 'maya', stageNumber: 1, state: 'defeat',
    stageTitle: 'OVERGROWN MILPA RUIN', populationScale: '<40 CITIZENS',
    eraName: 'Rainforest Reclamation',
    architecturalBrief: 'Rotting palm thatch roofs collapsed into jungle mud, vines overtaking abandoned stone corn-grinding stones.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/maya/stage_01_defeat_thumb.webp'
  },
  'maya_s2_normal': {
    civId: 'maya', stageNumber: 2, state: 'normal',
    stageTitle: 'LIMESTONE TEMPLE BOROUGH', populationScale: '~10,000 CITIZENS',
    eraName: 'Early Stepped Shrine Era',
    architecturalBrief: 'First terraced limestone temple platforms, plaster-paved ceremonial plazas, and carved wooden mask steles.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_02_normal.webp',
    thumbUrl: '/assets/nations/maya/stage_02_normal_thumb.webp'
  },
  'maya_s2_defeat': {
    civId: 'maya', stageNumber: 2, state: 'defeat',
    stageTitle: 'FRACTURED CEREMONIAL PLAZA', populationScale: '<1,500 CITIZENS',
    eraName: 'Early Warfare Sacking',
    architecturalBrief: 'Cracked stucco terraces, overturned wooden idols, and blackened stone hearths in tropical downpours.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/maya/stage_02_defeat_thumb.webp'
  },
  'maya_s3_normal': {
    civId: 'maya', stageNumber: 3, state: 'normal',
    stageTitle: 'PETÉN CANOPY CAPITAL', populationScale: '~1,000,000 CITIZENS',
    eraName: 'Classic Regional Dominance',
    architecturalBrief: 'Monumental limestone pyramid complexes rising above the dense canopy, stone ballcourts, and raised white sacbe roads.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_03_normal.webp',
    thumbUrl: '/assets/nations/maya/stage_03_normal_thumb.webp'
  },
  'maya_s3_defeat': {
    civId: 'maya', stageNumber: 3, state: 'defeat',
    stageTitle: 'DESECRATED PLAZA OF STELAE', populationScale: '<115,000 CITIZENS',
    eraName: 'Classic Maya Warfare',
    architecturalBrief: 'Toppled royal stelae, scorched white sacbe causeways, and vines reclaiming stone temple staircases.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/maya/stage_03_defeat_thumb.webp'
  },
  'maya_s4_normal': {
    civId: 'maya', stageNumber: 4, state: 'normal',
    stageTitle: 'TIKAL IMPERIAL RAINFOREST METROPOLIS', populationScale: '~100,000,000 CITIZENS',
    eraName: 'High Classic Golden Age',
    architecturalBrief: 'Monumental stepped limestone pyramids towering above misty green rainforest canopies, massive roof-combs, wide plaster plazas, grand ceremonial staircases, and sacred water reservoirs.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_04_normal.webp',
    thumbUrl: '/assets/nations/maya/stage_04_normal_thumb.webp'
  },
  'maya_s4_defeat': {
    civId: 'maya', stageNumber: 4, state: 'defeat',
    stageTitle: 'FALL OF THE CANOPY KINGDOM', populationScale: '<6,500,000 CITIZENS',
    eraName: 'Cataclysmic War & Collapse',
    architecturalBrief: 'Burning limestone temples and roof combs in dense rainforest, collapsed stone staircases, smoke drifting across misty jungle, and overgrown rubble plazas.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/maya/stage_04_defeat_thumb.webp'
  },
  'maya_s5_normal': {
    civId: 'maya', stageNumber: 5, state: 'normal',
    stageTitle: 'BIO-CANOPY ECO-METROPOLIS 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Solar Bio-Canopy Hegemony',
    architecturalBrief: 'Evolved Mayan bio-canopy eco-metropolis in 2100+: stepped pyramid architecture harmonized with massive translucent living solar bio-domes, clean elevated transit sky-bridges above the rainforest canopy, authentic Maya motifs.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_05_normal.webp',
    thumbUrl: '/assets/nations/maya/stage_05_normal_thumb.webp'
  },
  'maya_s5_defeat': {
    civId: 'maya', stageNumber: 5, state: 'defeat',
    stageTitle: 'COLLAPSED SOLAR BIO-DOME', populationScale: '<30,000,000 CITIZENS',
    eraName: 'Bio-Canopy Failure',
    architecturalBrief: 'Shattered translucent solar bio-dome shells tangled in strangler figs, dead skybridges plunged into the jungle, and smoke.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/maya/stage_05_defeat_thumb.webp'
  },

  // ==========================================
  // LAKOTA (10/10 Generated and Linked)
  // ==========================================
  'lakota_s1_normal': {
    civId: 'lakota', stageNumber: 1, state: 'normal',
    stageTitle: 'BUFFALO ENCAMPMENT', populationScale: '~100 CITIZENS',
    eraName: 'Early Plains Migration',
    architecturalBrief: 'Painted conical tipis, horse corrals, wooden drying racks, and campfires on open prairie grasslands.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_01_normal.webp',
    thumbUrl: '/assets/nations/lakota/stage_01_normal_thumb.webp'
  },
  'lakota_s1_defeat': {
    civId: 'lakota', stageNumber: 1, state: 'defeat',
    stageTitle: 'DISPERSED ENCAMPMENT', populationScale: '<40 SURVIVORS',
    eraName: 'Prairie Winter Raid',
    architecturalBrief: 'Charred tipi lodge poles, scattered hide gear, and snowdrifts burying extinguished campfires.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_01_defeat.webp',
    thumbUrl: '/assets/nations/lakota/stage_01_defeat_thumb.webp'
  },
  'lakota_s2_normal': {
    civId: 'lakota', stageNumber: 2, state: 'normal',
    stageTitle: 'COUNCIL HORIZON', populationScale: '~10,000 CITIZENS',
    eraName: 'Seven Fires Assembly',
    architecturalBrief: 'Grand ceremonial circle encampment with large painted lodge pavilions, ceremonial sun-dance arbor, and river pasture corrals.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_02_normal.webp',
    thumbUrl: '/assets/nations/lakota/stage_02_normal_thumb.webp'
  },
  'lakota_s2_defeat': {
    civId: 'lakota', stageNumber: 2, state: 'defeat',
    stageTitle: 'BREACHED COUNCIL ARBOR', populationScale: '<1,200 SURVIVORS',
    eraName: 'Frontier Cavalry Attack',
    architecturalBrief: 'Burned lodge covers, overturned ceremonial arbors, and scorched river valley pasture.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_02_defeat.webp',
    thumbUrl: '/assets/nations/lakota/stage_02_defeat_thumb.webp'
  },
  'lakota_s3_normal': {
    civId: 'lakota', stageNumber: 3, state: 'normal',
    stageTitle: 'PLAINS CONFEDERACY', populationScale: '~1,000,000 CITIZENS',
    eraName: 'United Sovereign Domain',
    architecturalBrief: 'Permanent high-plateau lodge citadel, earth-banked communal roundhouses, perimeter stockade watchtowers, and grand horse herds.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_03_normal.webp',
    thumbUrl: '/assets/nations/lakota/stage_03_normal_thumb.webp'
  },
  'lakota_s3_defeat': {
    civId: 'lakota', stageNumber: 3, state: 'defeat',
    stageTitle: 'FRACTURED COUNCIL LODGE', populationScale: '<100,000 SURVIVORS',
    eraName: 'Siege Dispersion',
    architecturalBrief: 'Breached earthworks, smoking timber bastions, and shattered sacred cedar poles.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_03_defeat.webp',
    thumbUrl: '/assets/nations/lakota/stage_03_defeat_thumb.webp'
  },
  'lakota_s4_normal': {
    civId: 'lakota', stageNumber: 4, state: 'normal',
    stageTitle: 'GREAT NATION REALM', populationScale: '~100,000,000 CITIZENS',
    eraName: 'Heartland Hegemony Zenith',
    architecturalBrief: 'Continental solar metropolis integrated into the Black Hills and river valleys: grand limestone terraces, copper-roofed civic rotunda, solar arrays, and high-speed plains rail.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_04_normal.webp',
    thumbUrl: '/assets/nations/lakota/stage_04_normal_thumb.webp'
  },
  'lakota_s4_defeat': {
    civId: 'lakota', stageNumber: 4, state: 'defeat',
    stageTitle: 'SUBJUGATED HEARTLAND', populationScale: '<8,000,000 SURVIVORS',
    eraName: 'Heartland Fall',
    architecturalBrief: 'Smoking copper rotunda ruins, cratered rail lines across empty prairie, and breached valley gates.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_04_defeat.webp',
    thumbUrl: '/assets/nations/lakota/stage_04_defeat_thumb.webp'
  },
  'lakota_s5_normal': {
    civId: 'lakota', stageNumber: 5, state: 'normal',
    stageTitle: 'SACRED SOL HEGEMONY 2100+', populationScale: '~500,000,000 CITIZENS',
    eraName: 'Solar Horizon Ascendancy',
    architecturalBrief: 'Orbital elevator spires anchored in the Badlands, biophilic prairie sky-domes, zero-emission atmospheric transit rings, and pristine restored wildlife biomes.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_05_normal.webp',
    thumbUrl: '/assets/nations/lakota/stage_05_normal_thumb.webp'
  },
  'lakota_s5_defeat': {
    civId: 'lakota', stageNumber: 5, state: 'defeat',
    stageTitle: 'COLLAPSED SOL SANCTUARY', populationScale: '<40,000,000 SURVIVORS',
    eraName: 'Orbital Ruin',
    architecturalBrief: 'Severed orbital anchor cables coiled across the plains, darkened bio-domes, and silent grasslands under ash skies.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/lakota/stage_05_defeat.webp',
    thumbUrl: '/assets/nations/lakota/stage_05_defeat_thumb.webp'
  }
};

/**
 * Helper to fetch authoritative stage entry
 */
export function getStageArtwork(civId: string, stageNumber: number, isDefeat: boolean): StageArtworkEntry {
  const key = `${civId}_s${stageNumber}_${isDefeat ? 'defeat' : 'normal'}`;
  return PRODUCTION_ARTWORK_MANIFEST[key] || {
    civId, stageNumber, state: isDefeat ? 'defeat' : 'normal',
    stageTitle: `STAGE ${stageNumber}`,
    populationScale: 'UNKNOWN',
    eraName: 'Historical Era',
    architecturalBrief: 'Historical civilizational development stage.',
    source: 'generated_photorealistic', status: 'COMPLETED',
    artUrl: '/assets/nations/maya/stage_04_normal.webp',
    thumbUrl: '/assets/nations/maya/stage_04_normal_thumb.webp'
  };
}

/**
 * Returns summary count of generated vs pending artworks
 */
export function getArtworkInventoryStats(): { generated: number; pending: number; total: number; byCiv: Record<string, { generated: number; pending: number; total: number }> } {
  const byCiv: Record<string, { generated: number; pending: number; total: number }> = {};
  let totalGenerated = 0;
  let totalPending = 0;

  for (const entry of Object.values(PRODUCTION_ARTWORK_MANIFEST)) {
    if (!byCiv[entry.civId]) {
      byCiv[entry.civId] = { generated: 0, pending: 0, total: 0 };
    }
    byCiv[entry.civId].total++;
    if (entry.source === 'generated_photorealistic' && entry.artUrl) {
      byCiv[entry.civId].generated++;
      totalGenerated++;
    } else {
      byCiv[entry.civId].pending++;
      totalPending++;
    }
  }

  return {
    generated: totalGenerated,
    pending: totalPending,
    total: totalGenerated + totalPending,
    byCiv
  };
}
