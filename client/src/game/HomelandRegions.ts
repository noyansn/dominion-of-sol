/**
 * DOMINION OF SOL — AUTHORITATIVE HOMELAND GEOGRAPHIC REGIONS
 * 
 * Defines broad, expansive spawn territories with closed, non-self-intersecting polygon coordinates
 * in degrees [lon, lat] projected onto the 3D globe surface.
 * 
 * Automatically populated from the canonical CIVILIZATION_ATLAS meta-layer (44 civilizations).
 */

import { CIVILIZATION_ATLAS, CivilizationRegion } from '../meta/CivilizationAtlas';

export interface HomelandRegion {
  civId: string;
  displayName: string;
  regionName: string;
  subRegion: string;
  centerLon: number;
  centerLat: number;
  accentColor: number;
  polygon: Array<[number, number]>;
}

export const HOMELAND_REGIONS: Record<string, HomelandRegion> = {};

// Populate all 44 civilizations from the canonical CivilizationAtlas manifest
for (const civ of CIVILIZATION_ATLAS) {
  HOMELAND_REGIONS[civ.id] = {
    civId: civ.id,
    displayName: civ.displayName,
    regionName: civ.macroRegion,
    subRegion: civ.historicalCoreLabel,
    centerLon: civ.homelandCenter.lon,
    centerLat: civ.homelandCenter.lat,
    accentColor: civ.numericAccentColor,
    polygon: civ.homelandPolygon,
  };
}

// Migration fallback: legacy 'turk' references point safely to 'hun'
if (HOMELAND_REGIONS['hun']) {
  HOMELAND_REGIONS['turk'] = {
    ...HOMELAND_REGIONS['hun'],
    civId: 'turk',
  };
}
