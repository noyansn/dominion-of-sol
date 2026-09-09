import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NATIONS_DIR = path.resolve(__dirname, '../public/assets/nations');
const PROGRESSION_GENERIC_DIR = path.resolve(__dirname, '../public/assets/progression');

const CIVILIZATIONS = ['turk', 'roma', 'pers', 'misir', 'han', 'yamato', 'norse', 'maya', 'lakota'];
const STAGES = [1, 2, 3, 4, 5];
const STATES = ['normal', 'defeat'];

function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test('Progression Art Contracts — Strict Cryptographic Content Hash & Uniqueness Audit', async (t) => {
  // Read any legacy generic progression artwork hashes to ensure they are NEVER reused
  const genericHashes = new Set();
  if (fs.existsSync(PROGRESSION_GENERIC_DIR)) {
    const genericFiles = fs.readdirSync(PROGRESSION_GENERIC_DIR);
    for (const f of genericFiles) {
      if (f.endsWith('.jpg') || f.endsWith('.webp') || f.endsWith('.png')) {
        genericHashes.add(hashFile(path.join(PROGRESSION_GENERIC_DIR, f)));
      }
    }
  }

  const allAssetHashes = new Map(); // hash -> filePath
  const civStageHashes = {}; // civ -> stage -> state -> hash

  for (const civ of CIVILIZATIONS) {
    civStageHashes[civ] = {};
    const civDir = path.join(NATIONS_DIR, civ);

    assert.ok(fs.existsSync(civDir), `Civilization asset directory must exist: ${civDir}`);

    for (const stage of STAGES) {
      civStageHashes[civ][stage] = {};
      const sStr = String(stage).padStart(2, '0');

      for (const state of STATES) {
        const filename = `stage_${sStr}_${state}.webp`;
        const filePath = path.join(civDir, filename);
        const thumbFilename = `stage_${sStr}_${state}_thumb.webp`;
        const thumbPath = path.join(civDir, thumbFilename);

        // 1. File exists
        assert.ok(fs.existsSync(filePath), `Asset file must exist on disk: ${filePath}`);
        assert.ok(fs.existsSync(thumbPath), `Thumbnail file must exist on disk: ${thumbPath}`);

        // 2. File is non-empty
        const stat = fs.statSync(filePath);
        const thumbStat = fs.statSync(thumbPath);
        assert.ok(stat.size > 8000, `Asset ${filename} must be non-empty image (got ${stat.size} bytes)`);
        assert.ok(thumbStat.size > 1500, `Thumbnail ${thumbFilename} must be non-empty image (got ${thumbStat.size} bytes)`);

        const hash = hashFile(filePath);

        // 3. Generic shared progression images are forbidden as final assets
        assert.ok(!genericHashes.has(hash), `Asset ${filePath} must NOT be a generic shared placeholder!`);

        // 4. Global SHA-256 uniqueness across all 90 assets
        assert.ok(!allAssetHashes.has(hash), `Duplicate artwork detected: ${filePath} is byte-identical to ${allAssetHashes.get(hash)}`);
        allAssetHashes.set(hash, filePath);
        civStageHashes[civ][stage][state] = hash;
      }

      // 5. Defeat image is not byte-identical to normal image for this stage
      const normalHash = civStageHashes[civ][stage]['normal'];
      const defeatHash = civStageHashes[civ][stage]['defeat'];
      assert.notEqual(normalHash, defeatHash, `${civ} Stage ${stage} defeat artwork must not equal normal artwork`);
    }

    // 6. Stages within one civilization are not byte-identical
    for (let s1 = 1; s1 <= 5; s1++) {
      for (let s2 = s1 + 1; s2 <= 5; s2++) {
        for (const state of STATES) {
          const h1 = civStageHashes[civ][s1][state];
          const h2 = civStageHashes[civ][s2][state];
          assert.notEqual(h1, h2, `${civ} Stage ${s1} (${state}) must not equal Stage ${s2} (${state})`);
        }
      }
    }
  }

  // 7. Cross-civilization assets are not byte-identical
  for (let i = 0; i < CIVILIZATIONS.length; i++) {
    for (let j = i + 1; j < CIVILIZATIONS.length; j++) {
      const civA = CIVILIZATIONS[i];
      const civB = CIVILIZATIONS[j];
      for (const s of STAGES) {
        for (const st of STATES) {
          const hA = civStageHashes[civA][s][st];
          const hB = civStageHashes[civB][s][st];
          assert.notEqual(hA, hB, `Cross-civilization duplicate: ${civA} Stage ${s} (${st}) equals ${civB} Stage ${s} (${st})`);
        }
      }
    }
  }

  assert.equal(allAssetHashes.size, 90, 'Must have exactly 90 uniquely hashed civilization progression artworks');
  console.log(`[TEST SUCCESS] Verified 90 genuinely unique progression artworks across 9 civilizations with 90 distinct SHA-256 hashes.`);
});
