import { FlagDescriptor } from '../ui/FlagAtlas';
import { CIVILIZATION_ATLAS, CivilizationRegion, CivilizationId } from '../meta/CivilizationAtlas';

export interface DoctrineModifiers {
  offense: number;
  defense: number;
  expansion: number;
  maritime: number;
}

export interface ProgressionTier {
  id: string;
  numeral: string;
  name: string;
  artUrl: string;
  isDefeat?: boolean;
}

export interface AdvantageItem {
  icon: string;
  text: string;
}

export interface CivilizationPreset {
  id: string;
  displayName: string;
  identityTraits: [string, string, string];
  playstyleLabel: string;
  shortTagline: string;
  homelandRegionName: string;
  homelandCoordinates: { x: number; y: number };
  homelandCoords: { lon: number; lat: number };
  signatureHeroStage: number;
  candidateStartCell: number;
  flagId: string;
  flagDescriptor: FlagDescriptor;
  politicalColor: string;
  doctrine: DoctrineModifiers;
  cultureArtUrl: string;
  leaderArtUrl: string;
  leaderName: string;
  leaderMoniker: string;
  leaderBio: string;
  leaderTraits: string[];
  progressionTiers: ProgressionTier[];
  advantages: AdvantageItem[];
  penalties: AdvantageItem[];
  strategicBrief: {
    doctrineBias: string;
    operationalAdvantage: string;
    tradeoffPenalty: string;
    historicalContext: string;
  };
}

export const DOCTRINE_AXES = ['offense', 'defense', 'expansion', 'maritime'] as const;
export type DoctrineAxis = typeof DOCTRINE_AXES[number];

export const DOCTRINE_LIMITS = {
  minAxis: -6,
  maxAxis: 6,
  budgetSum: 0,
};

/**
 * Factual doctrine rule descriptions derived strictly from verified simulation formulas in simulation.rs:
 * - OFFENSE: Modifies combat pressure advantage ratio (1.0 + offense * 2.0) and reduces attacker battle casualties: (1.0 - offense * 1.5).clamp(0.90, 1.10).
 * - DEFENSE: Resists hostile front pressure in advantage denominator (0.35 - defense * 1.5).max(0.20) and reduces defender casualties: (1.0 - defense * 1.5).clamp(0.90, 1.10).
 * - EXPANSION: Modifies neutral frontier cell absorption population cost: (1.0 - expansion * 1.8).clamp(0.88, 1.12).
 * - MARITIME: Modifies port construction population cost (1.0 - maritime * 0.8).clamp(0.95, 1.05) and completed-port population growth bonus (1.0 + maritime * 1.5).clamp(0.91, 1.09).
 */
export function getDoctrineRuleDescription(axis: DoctrineAxis, value: number): string {
  const sign = value > 0 ? `+${value}` : `${value}`;
  switch (axis) {
    case 'offense':
      return value > 0
        ? `${sign} Offense: Increases combat pressure buildup rate and reduces attacker battle casualties (up to -10% casualties)`
        : value < 0
        ? `${sign} Offense: Slower combat pressure buildup rate and increased attacker battle casualties (up to +10% casualties)`
        : `Standard combat pressure buildup and baseline attacker casualties`;
    case 'defense':
      return value > 0
        ? `${sign} Defense: Resists hostile front push pressure and reduces defender casualties on contested borders (up to -10% casualties)`
        : value < 0
        ? `${sign} Defense: Vulnerable to hostile front push pressure with higher casualties defending contested borders`
        : `Standard border resistance and baseline defender casualties`;
    case 'expansion':
      return value > 0
        ? `${sign} Expansion: Reduces population cost per cell when claiming neutral frontier territory (up to -12% cost)`
        : value < 0
        ? `${sign} Expansion: Higher population cost per cell when claiming neutral frontier territory (up to +12% cost)`
        : `Standard population cost when claiming neutral frontier territory`;
    case 'maritime':
      return value > 0
        ? `${sign} Maritime: Reduces port construction population cost (up to -5%) and increases completed port population growth (up to +9%)`
        : value < 0
        ? `${sign} Maritime: Higher port construction population cost (up to +5%) and reduced population growth bonus from completed ports`
        : `Standard port construction cost and baseline port population growth`;
  }
}

/**
 * Validates that a doctrine configuration strictly adheres to the zero-sum budget contract.
 */
export function validateDoctrineModifiers(doctrine: DoctrineModifiers): { valid: boolean; sum: number; reason?: string } {
  const sum = doctrine.offense + doctrine.defense + doctrine.expansion + doctrine.maritime;
  if (sum !== DOCTRINE_LIMITS.budgetSum) {
    return { valid: false, sum, reason: `Doctrine sum must be ${DOCTRINE_LIMITS.budgetSum}, but received ${sum}.` };
  }
  for (const axis of DOCTRINE_AXES) {
    const val = doctrine[axis];
    if (val < DOCTRINE_LIMITS.minAxis || val > DOCTRINE_LIMITS.maxAxis) {
      return { valid: false, sum, reason: `Axis ${axis} value ${val} exceeds bounds [${DOCTRINE_LIMITS.minAxis}, ${DOCTRINE_LIMITS.maxAxis}].` };
    }
  }
  return { valid: true, sum: 0 };
}

export function rebalanceCustomDoctrine(
  current: DoctrineModifiers,
  changedAxis: DoctrineAxis,
  targetValue: number
): DoctrineModifiers {
  const clamped = Math.max(DOCTRINE_LIMITS.minAxis, Math.min(DOCTRINE_LIMITS.maxAxis, Math.round(targetValue)));
  const next: DoctrineModifiers = { ...current, [changedAxis]: clamped };
  const otherAxes = DOCTRINE_AXES.filter(a => a !== changedAxis);
  let deficit = -(clamped + current[otherAxes[0]] + current[otherAxes[1]] + current[otherAxes[2]]);

  for (const a of otherAxes) {
    if (deficit === 0) break;
    const canShift = deficit > 0
      ? DOCTRINE_LIMITS.maxAxis - next[a]
      : next[a] - DOCTRINE_LIMITS.minAxis;
    const shift = deficit > 0 ? Math.min(deficit, canShift) : Math.max(deficit, -canShift);
    next[a] += shift;
    deficit -= shift;
  }

  return next;
}

// Preset leader and heraldry overrides
interface CivPresetMeta {
  playstyleLabel: string;
  leaderName: string;
  leaderMoniker: string;
  leaderBio: string;
  flagDescriptor: FlagDescriptor;
}

const CIV_PRESET_META: Partial<Record<CivilizationId, CivPresetMeta>> = {
  hun: {
    playstyleLabel: 'STEPPE PRESSURE',
    leaderName: 'ATTILA',
    leaderMoniker: 'Scourge of the Steppe',
    leaderBio: 'Supreme commander of the Hunnic equestrian aristocracy, coordinating lightning cavalry strikes and expansive continental pressure across Eurasia.',
    flagDescriptor: { layout: 'solid', primaryColor: '#78350f', secondaryColor: '#d97706', accentColor: '#fef08a', emblem: 'spearhead' },
  },
  gokturk: {
    playstyleLabel: 'STEPPE ORDER',
    leaderName: 'BUMIN KHAGAN',
    leaderMoniker: 'Founder of the Turkic Khaganate',
    leaderBio: 'Supreme Khagan of the Altai steppe, uniting nomadic tribes under the blue sky of Tengri with enduring runic institutions and heavy iron cavalry.',
    flagDescriptor: { layout: 'triband', primaryColor: '#0284c7', secondaryColor: '#0369a1', accentColor: '#fef08a', emblem: 'star' },
  },
  roma: {
    playstyleLabel: 'FORTIFIED ADVANCE',
    leaderName: 'MARCUS AURELIUS',
    leaderMoniker: 'Imperator of the Legions',
    leaderBio: 'Philosopher-general of the imperial zenith, coordinating fortified frontiers and disciplined cohorts with unyielding resolve.',
    flagDescriptor: { layout: 'triband', primaryColor: '#7f1d1d', secondaryColor: '#d97706', accentColor: '#fef08a', emblem: 'eagle' },
  },
  hellen: {
    playstyleLabel: 'CIVIC INGENUITY',
    leaderName: 'PERICLES',
    leaderMoniker: 'First Citizen of the Polis',
    leaderBio: 'Statesman of democratic statecraft and maritime leagues, uniting civic resilience with cultural excellence.',
    flagDescriptor: { layout: 'cross', primaryColor: '#0284c7', secondaryColor: '#ffffff', accentColor: '#dfbc73', emblem: 'anchor' },
  },
  gaul: {
    playstyleLabel: 'FRONTIER RESOLVE',
    leaderName: 'VERCINGETORIX',
    leaderMoniker: 'Chieftain of the Arverni',
    leaderBio: 'Unifying war chief of the Celtic tribes, coordinating hillfort defense and unyielding resistance against imperial encroachment.',
    flagDescriptor: { layout: 'solid', primaryColor: '#16a34a', secondaryColor: '#ca8a04', accentColor: '#ffffff', emblem: 'shield' },
  },
  norse: {
    playstyleLabel: 'MARITIME VALOR',
    leaderName: 'RAGNAR LODBROK',
    leaderMoniker: 'Jarl of the Northern Seas',
    leaderBio: 'Legendary seafaring leader guiding longship fleets across storm-swept northern waters to forge enduring settlements.',
    flagDescriptor: { layout: 'cross', primaryColor: '#1e3a8a', secondaryColor: '#0284c7', accentColor: '#e0e7ff', emblem: 'spearhead' },
  },
  rus: {
    playstyleLabel: 'DEPTH & RESOLVE',
    leaderName: 'YAROSLAV THE WISE',
    leaderMoniker: 'Grand Prince of Kyiv',
    leaderBio: 'Architect of Eastern Slavic law, riverine trade arteries, and grand fortified timber kremlins across the boreal forest.',
    flagDescriptor: { layout: 'bicolor', primaryColor: '#b45309', secondaryColor: '#1e3a8a', accentColor: '#ffffff', emblem: 'eagle' },
  },
  misir: {
    playstyleLabel: 'RIVER LEGACY',
    leaderName: 'RAMSES II',
    leaderMoniker: 'Pharaoh of the Two Lands',
    leaderBio: 'Architect of monumental stone temples, sovereign of Nile agricultural prosperity, and guardian of sacred continuity.',
    flagDescriptor: { layout: 'triband', primaryColor: '#ca8a04', secondaryColor: '#1e3a8a', accentColor: '#fef08a', emblem: 'sun' },
  },
  pers: {
    playstyleLabel: 'IMPERIAL BULWARK',
    leaderName: 'CYRUS THE GREAT',
    leaderMoniker: 'King of Kings',
    leaderBio: 'Founder of the Achaemenid Empire, commanding vast administrative satrapies with deep strategic tolerance and monumental statecraft.',
    flagDescriptor: { layout: 'bicolor', primaryColor: '#0f766e', secondaryColor: '#ca8a04', accentColor: '#ffffff', emblem: 'lion' },
  },
  han: {
    playstyleLabel: 'STRATEGIC SCALE',
    leaderName: 'EMPEROR WU OF HAN',
    leaderMoniker: 'Martial Sovereign of the Central Plains',
    leaderBio: 'Expansive monarch who solidified the Silk Road trade avenues, institutionalized meritocratic governance, and fortified continental borders.',
    flagDescriptor: { layout: 'solid', primaryColor: '#991b1b', secondaryColor: '#ca8a04', accentColor: '#fef08a', emblem: 'dragon' },
  },
  yamato: {
    playstyleLabel: 'PRECISION MARITIME',
    leaderName: 'PRINCE SHOTOKU',
    leaderMoniker: 'Architect of Harmonious Order',
    leaderBio: 'Founding statesman of imperial constitution, monastic architecture, and disciplined harmonious balance across the archipelago.',
    flagDescriptor: { layout: 'solid', primaryColor: '#f8fafc', secondaryColor: '#dc2626', accentColor: '#dc2626', emblem: 'sun' },
  },
  lakota: {
    playstyleLabel: 'PLAINS MOBILITY',
    leaderName: 'TASUNKE WITKO',
    leaderMoniker: 'Crazy Horse · Oglala Defender',
    leaderBio: 'Legendary military visionary and sacred defender of the Paha Sapa, leading swift equestrian strikes with unyielding spiritual devotion.',
    flagDescriptor: { layout: 'bicolor', primaryColor: '#7c2d12', secondaryColor: '#1e293b', accentColor: '#fef08a', emblem: 'sun' },
  },
  inca: {
    playstyleLabel: 'ALTITUDE ORDER',
    leaderName: 'PACHACUTI',
    leaderMoniker: 'Reformer of the World',
    leaderBio: 'Transformer of the Kingdom of Cusco into the expansive Tawantinsuyu, pioneering monumental terrace masonry and royal highway networks.',
    flagDescriptor: { layout: 'triband', primaryColor: '#ca8a04', secondaryColor: '#991b1b', accentColor: '#fef08a', emblem: 'sun' },
  },
  yolngu: {
    playstyleLabel: 'COASTAL KINSHIP',
    leaderName: 'WONGGU',
    leaderMoniker: 'Elder of Caledon Bay',
    leaderBio: 'Respected clan diplomat and custodian of ancestral law, defending coastal waters and upholding sacred kinship traditions.',
    flagDescriptor: { layout: 'bicolor', primaryColor: '#991b1b', secondaryColor: '#ca8a04', accentColor: '#f8fafc', emblem: 'sun' },
  },
  maori: {
    playstyleLabel: 'OCEANIC VALOR',
    leaderName: 'KUPE',
    leaderMoniker: 'Great Navigator of the Pacific',
    leaderBio: 'Legendary Polynesian voyager who navigated the vast Pacific swells to discover Aotearoa, founding centuries of fortified pa heritage.',
    flagDescriptor: { layout: 'triband', primaryColor: '#991b1b', secondaryColor: '#0f172a', accentColor: '#047857', emblem: 'spearhead' },
  },
};

/**
 * Builds the canonical 44 CivilizationPreset records directly from CIVILIZATION_ATLAS.
 */
export const CURATED_CIVILIZATION_PRESETS: CivilizationPreset[] = CIVILIZATION_ATLAS.map((civ) => {
  const meta = CIV_PRESET_META[civ.id];
  const lon = civ.homelandCenter.lon;
  const lat = civ.homelandCenter.lat;
  const wx = Math.round(((lon + 180) / 360) * 1024);
  const wy = Math.max(0, Math.min(511, Math.round(((90 - lat) / 180) * 512)));
  const candidateCell = wy * 1024 + wx;

  const playstyle = meta?.playstyleLabel || `${civ.identityTraits[0]} · ${civ.identityTraits[1]}`;
  const leaderName = meta?.leaderName || `${civ.displayName} LEADER`;
  const leaderMoniker = meta?.leaderMoniker || `Sovereign of ${civ.historicalCoreLabel}`;
  const leaderBio = meta?.leaderBio || civ.shortDescription;

  const flagDesc: FlagDescriptor = meta?.flagDescriptor || {
    layout: 'solid',
    primaryColor: civ.accentColor,
    secondaryColor: '#ffffff',
    accentColor: '#dfbc73',
    emblem: 'star',
  };

  const advantages: AdvantageItem[] = [];
  const penalties: AdvantageItem[] = [];

  for (const axis of DOCTRINE_AXES) {
    const val = civ.doctrine[axis];
    if (val > 0) {
      advantages.push({ icon: axis, text: getDoctrineRuleDescription(axis, val) });
    } else if (val < 0) {
      penalties.push({ icon: axis, text: getDoctrineRuleDescription(axis, val) });
    }
  }

  // Ensure progression tiers exist
  const existingArtDir = `/assets/nations/${civ.id}`;
  const fallbackArt = `/assets/nations/roma/stage_04_normal.webp`;

  const progressionTiers: ProgressionTier[] = [
    { id: `${civ.id}_t1`, numeral: 'I', name: 'SETTLEMENT', artUrl: `${existingArtDir}/stage_01_normal.webp` },
    { id: `${civ.id}_t2`, numeral: 'II', name: 'OUTPOST', artUrl: `${existingArtDir}/stage_02_normal.webp` },
    { id: `${civ.id}_t3`, numeral: 'III', name: 'REALM', artUrl: `${existingArtDir}/stage_03_normal.webp` },
    { id: `${civ.id}_t4`, numeral: 'IV', name: 'METROPOLIS', artUrl: `${existingArtDir}/stage_04_normal.webp` },
    { id: `${civ.id}_t5`, numeral: 'V', name: 'SOVEREIGN SOIL', artUrl: `${existingArtDir}/stage_05_normal.webp` },
    { id: `${civ.id}_t6`, numeral: 'RUIN', name: 'RUINED (DEFEAT)', artUrl: `${existingArtDir}/stage_04_defeat.webp`, isDefeat: true },
  ];

  return {
    id: civ.id,
    displayName: civ.displayName,
    identityTraits: civ.identityTraits,
    playstyleLabel: playstyle,
    shortTagline: civ.shortDescription,
    homelandRegionName: civ.historicalCoreLabel,
    homelandCoordinates: { x: wx, y: wy },
    homelandCoords: { lon, lat },
    signatureHeroStage: 4,
    candidateStartCell: candidateCell,
    flagId: `flag_${civ.id}`,
    flagDescriptor: flagDesc,
    politicalColor: civ.accentColor,
    doctrine: civ.doctrine,
    cultureArtUrl: `${existingArtDir}/stage_04_normal.webp`,
    leaderArtUrl: `${existingArtDir}_leader.jpg`,
    leaderName,
    leaderMoniker,
    leaderBio,
    leaderTraits: civ.identityTraits,
    progressionTiers,
    advantages,
    penalties,
    strategicBrief: {
      doctrineBias: `${civ.identityTraits.join(' · ')} doctrine orientation`,
      operationalAdvantage: advantages.map(a => a.text).join('; ') || 'Balanced baseline operational capacity.',
      tradeoffPenalty: penalties.map(p => p.text).join('; ') || 'Standard operational overhead.',
      historicalContext: civ.shortDescription,
    },
  };
});
