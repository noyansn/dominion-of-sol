import fs from 'fs';
import { SOVEREIGN_REACTIONS, getReactionsForCivilization } from './src/meta/ReactionRegistry';

const CIVS = ['TÜRK', 'ROMA', 'PERS', 'MISIR', 'HAN', 'YAMATO', 'NORSE', 'MAYA', 'LAKOTA'];

let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Dominion of Sol — Reaction Micro-Audit (Full 180 + Monochrome Silhouettes)</title>
<style>
  body {
    background: #040810;
    color: #e2e8f0;
    font-family: 'Cinzel', serif, sans-serif;
    margin: 0;
    padding: 30px;
  }
  h1 { color: #fef08a; font-size: 24px; margin-bottom: 6px; letter-spacing: 0.08em; }
  .subtitle { color: #94a3b8; font-size: 13px; margin-bottom: 24px; font-family: sans-serif; }
  .civ-section {
    background: #07121f;
    border: 1.5px solid rgba(223, 188, 115, 0.3);
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 28px;
  }
  .civ-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(223, 188, 115, 0.2);
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .civ-title { font-size: 18px; font-weight: 900; color: #fef08a; letter-spacing: 0.1em; }
  .civ-count { font-size: 11px; color: #38bdf8; font-family: monospace; }
  .rx-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .rx-card {
    background: #03060a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .rx-icon { width: 56px; height: 56px; }
  .rx-name { font-size: 8.5px; font-weight: 800; color: #f8fafc; margin-top: 6px; font-family: sans-serif; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rx-family { font-size: 7.5px; color: #dfbc73; font-family: monospace; margin-top: 2px; }
  
  /* Monochrome Silhouette Row (Section 51) */
  .silhouette-row-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #94a3b8;
    margin-bottom: 8px;
    font-family: sans-serif;
    text-transform: uppercase;
  }
  .silhouette-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 12px;
  }
  .silhouette-card {
    background: #020408;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .silhouette-icon {
    width: 56px;
    height: 56px;
    filter: brightness(0) contrast(100%) drop-shadow(0 0 1px #fff);
  }
</style>
</head>
<body>
  <h1>DOMINION OF SOL — REACTION MORPHOLOGY & SILHOUETTE MICRO-AUDIT</h1>
  <div class="subtitle">Section 51 Inspection: 9 Civilizations × 20 Moments = 180 Premium Character Expressions + Pure Monochrome Silhouettes (Verifying Jaw, Head Tilt, Mouth Shape & Eye Direction Differentiation)</div>
`;

for (const civ of CIVS) {
  const rxs = getReactionsForCivilization(civ);
  html += `
  <div class="civ-section">
    <div class="civ-header">
      <span class="civ-title">${civ} HERITAGE REACTION PACK</span>
      <span class="civ-count">${rxs.length} MOMENTS · 6 MORPHOLOGICAL FAMILIES</span>
    </div>
    
    <!-- Color Enamel Icon Grid -->
    <div class="rx-grid">
      ${rxs.map(r => `
        <div class="rx-card">
          <div class="rx-icon">${r.svgIcon}</div>
          <div class="rx-name">${r.name}</div>
          <div class="rx-family">${r.expressionFamily?.toLowerCase() || 'warrior'}</div>
        </div>
      `).join('')}
    </div>

    <!-- Section 51 Monochrome Silhouette Row -->
    <div class="silhouette-row-label">Pure Silhouette Form (No Color / Lighting / Hat Cues)</div>
    <div class="silhouette-grid">
      ${rxs.map(r => `
        <div class="silhouette-card">
          <div class="silhouette-icon">${r.svgIcon}</div>
          <div class="rx-name" style="color: #64748b;">${r.name}</div>
        </div>
      `).join('')}
    </div>
  </div>
  `;
}

html += `</body></html>`;

fs.writeFileSync('C:/Users/noyan/.gemini/antigravity-ide/brain/6d22f0d8-3c9b-43c4-a7e7-ee6fa9ded18d/scratch/reaction_micro_audit.html', html);
console.log('Generated reaction_micro_audit.html successfully');
