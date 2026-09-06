export interface StageArtDefinition {
  stage: number;
  stageName: string;
  numeral: string;
  normalUrl: string;
  defeatUrl: string;
  thumbnailNormalUrl: string;
  thumbnailDefeatUrl: string;
}

export interface CivilizationArtDefinition {
  civId: string;
  civName: string;
  signatureStage: number; // e.g. Stage 4 for Turk, Stage 3 for Maya
  stages: Record<number, StageArtDefinition>;
  cultureArtUrl: string;
  leaderArtUrl: string;
}

export const POPULATION_STAGE_THRESHOLDS = {
  STAGE_1_ORIGIN: 0,
  STAGE_2_SETTLEMENT: 10_000,
  STAGE_3_STATE: 1_000_000,
  STAGE_4_GREAT_POWER: 100_000_000,
  STAGE_5_DOMINION: 1_000_000_000,
};

export const STAGE_NAMES: Record<number, { name: string; numeral: string; desc: string }> = {
  1: { name: 'ORIGIN', numeral: 'I', desc: 'Founding clan settlement and hearth' },
  2: { name: 'SETTLEMENT', numeral: 'II', desc: 'Fortified regional center and agricultural basin' },
  3: { name: 'STATE', numeral: 'III', desc: 'Sovereign regional kingdom with dense civic infrastructure' },
  4: { name: 'GREAT POWER', numeral: 'IV', desc: 'Continental imperial capital and trade metropolis' },
  5: { name: 'DOMINION', numeral: 'V', desc: 'Plausible advanced planetary dominion of continental scale' },
};

export function resolvePopulationStage(population: number): number {
  if (population >= POPULATION_STAGE_THRESHOLDS.STAGE_5_DOMINION) return 5;
  if (population >= POPULATION_STAGE_THRESHOLDS.STAGE_4_GREAT_POWER) return 4;
  if (population >= POPULATION_STAGE_THRESHOLDS.STAGE_3_STATE) return 3;
  if (population >= POPULATION_STAGE_THRESHOLDS.STAGE_2_SETTLEMENT) return 2;
  return 1;
}

function buildCivStages(civId: string, civName: string, signatureStage: number): CivilizationArtDefinition {
  const stages: Record<number, StageArtDefinition> = {};
  for (let s = 1; s <= 5; s++) {
    const meta = STAGE_NAMES[s];
    const sStr = String(s).padStart(2, '0');
    stages[s] = {
      stage: s,
      stageName: meta.name,
      numeral: meta.numeral,
      normalUrl: `/assets/nations/${civId}/stage_${sStr}_normal.webp`,
      defeatUrl: `/assets/nations/${civId}/stage_${sStr}_defeat.webp`,
      thumbnailNormalUrl: `/assets/nations/${civId}/stage_${sStr}_normal_thumb.webp`,
      thumbnailDefeatUrl: `/assets/nations/${civId}/stage_${sStr}_defeat_thumb.webp`,
    };
  }
  return {
    civId,
    civName,
    signatureStage,
    stages,
    cultureArtUrl: `/assets/nations/${civId}_culture.jpg`,
    leaderArtUrl: `/assets/nations/${civId}_leader.jpg`,
  };
}

export const CIVILIZATION_ART_REGISTRY: Record<string, CivilizationArtDefinition> = {
  turk: buildCivStages('turk', 'TÜRK', 4),
  roma: buildCivStages('roma', 'ROMA', 4),
  pers: buildCivStages('pers', 'PERS', 4),
  misir: buildCivStages('misir', 'MISIR', 4),
  han: buildCivStages('han', 'HAN', 4),
  yamato: buildCivStages('yamato', 'YAMATO', 4),
  norse: buildCivStages('norse', 'NORSE', 3),
  maya: buildCivStages('maya', 'MAYA', 3),
};

/**
 * Resolves the artwork URL for a civilization at a given stage and war condition.
 */
export function resolveCivilizationArt(civId: string, stage: number, isDefeat: boolean = false): string {
  const normId = civId.toLowerCase();
  const entry = CIVILIZATION_ART_REGISTRY[normId];
  if (!entry) {
    console.warn(`[ART] MISSING CIVILIZATION ART: Unknown civilization ${civId}`);
    return '/assets/nations/turk_culture.jpg';
  }
  const s = Math.max(1, Math.min(5, Math.floor(stage)));
  const stageDef = entry.stages[s];
  if (!stageDef) return entry.cultureArtUrl;
  return isDefeat ? stageDef.defeatUrl : stageDef.normalUrl;
}
