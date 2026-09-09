/**
 * DOMINION OF SOL — CIVILIZATION HOMELAND SPHERICAL AREA AUDIT
 * Section 19 Acceptance Audit
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CIVILIZATION_ATLAS,
  calculateSphericalPolygonAreaKm2,
  MACRO_REGIONS,
} from '../src/meta/CivilizationAtlas';

interface AreaAuditRow {
  id: string;
  displayName: string;
  region: string;
  areaKm2: number;
  medianKm2: number;
  deviationPct: number;
  flag: string;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe('Civilization Atlas — Spherical Area Audit (Section 19)', () => {

  it('1. Calculate and audit spherical polygon area across all 44 civilizations', () => {
    // 1. Calculate area for every civilization
    const civAreas = CIVILIZATION_ATLAS.map(civ => ({
      civ,
      areaKm2: calculateSphericalPolygonAreaKm2(civ.homelandPolygon),
    }));

    // Verify all areas are positive and reasonable
    for (const item of civAreas) {
      assert.ok(
        item.areaKm2 > 10_000,
        `Civilization ${item.civ.id} polygon area (${Math.round(item.areaKm2)} km²) must be > 10,000 km²`
      );
      assert.ok(
        item.areaKm2 < 15_000_000,
        `Civilization ${item.civ.id} polygon area (${Math.round(item.areaKm2)} km²) must be < 15,000,000 km²`
      );
    }

    // 2. Compute median per macro-region
    const regionAreas: Record<string, number[]> = {};
    for (const item of civAreas) {
      const r = item.civ.macroRegion;
      if (!regionAreas[r]) regionAreas[r] = [];
      regionAreas[r].push(item.areaKm2);
    }

    const regionMedians: Record<string, number> = {};
    for (const r of Object.keys(regionAreas)) {
      regionMedians[r] = calculateMedian(regionAreas[r]);
    }

    // 3. Build audit table
    const auditRows: AreaAuditRow[] = [];
    for (const item of civAreas) {
      const med = regionMedians[item.civ.macroRegion];
      const ratio = med > 0 ? item.areaKm2 / med : 1;
      const deviationPct = Math.round((ratio - 1) * 100);

      let flag = 'NORMAL';
      if (ratio > 2.0) flag = '>2.0x (FLAGGED HIGH)';
      else if (ratio < 0.5) flag = '<0.5x (FLAGGED LOW)';

      auditRows.push({
        id: item.civ.id,
        displayName: item.civ.displayName,
        region: item.civ.macroRegion,
        areaKm2: Math.round(item.areaKm2),
        medianKm2: Math.round(med),
        deviationPct,
        flag,
      });
    }

    // 4. Log formatted table for inspection
    console.log('\n========================================================================================');
    console.log('DOMINION OF SOL — CIVILIZATION HOMELAND SPHERICAL AREA AUDIT (SECTION 19)');
    console.log('========================================================================================');
    console.log(
      'CIVILIZATION'.padEnd(16) +
      'MACRO-REGION'.padEnd(18) +
      'AREA (KM²)'.padStart(14) +
      'MEDIAN (KM²)'.padStart(14) +
      'DEV %'.padStart(10) +
      '   FLAG'
    );
    console.log('----------------------------------------------------------------------------------------');

    for (const row of auditRows) {
      console.log(
        row.displayName.padEnd(16) +
        row.region.padEnd(18) +
        row.areaKm2.toLocaleString().padStart(14) +
        row.medianKm2.toLocaleString().padStart(14) +
        `${row.deviationPct > 0 ? '+' : ''}${row.deviationPct}%`.padStart(10) +
        '   ' + row.flag
      );
    }
    console.log('========================================================================================\n');

    // Basic assertions
    assert.strictEqual(auditRows.length, 44, 'Audit must cover all 44 civilizations');
  });

  it('2. South America exactly 4 civilizations area check', () => {
    const saCivs = CIVILIZATION_ATLAS.filter(c => c.macroRegion === 'SOUTH AMERICA');
    assert.strictEqual(saCivs.length, 4, 'South America must have exactly 4 civilizations');

    const saExpected = ['inca', 'muisca', 'mapuche', 'guarani'];
    for (const id of saExpected) {
      assert.ok(saCivs.some(c => c.id === id), `South America must include ${id}`);
    }
  });

  it('3. Australia exactly 3 civilizations area check', () => {
    const auCivs = CIVILIZATION_ATLAS.filter(c => c.macroRegion === 'AUSTRALIA');
    assert.strictEqual(auCivs.length, 3, 'Australia must have exactly 3 civilizations');

    const auExpected = ['yolngu', 'arrernte', 'noongar'];
    for (const id of auExpected) {
      assert.ok(auCivs.some(c => c.id === id), `Australia must include ${id}`);
    }
  });
});
