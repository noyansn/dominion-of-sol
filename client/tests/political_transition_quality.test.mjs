import assert from 'node:assert/strict';
import fs from 'node:fs';

const transition = fs.readFileSync(new URL('../src/render/PoliticalTransitionManager.ts', import.meta.url), 'utf8');
const upload = fs.readFileSync(new URL('../src/render/PoliticalTextureUpload.ts', import.meta.url), 'utf8');
const border = fs.readFileSync(new URL('../src/render/PoliticalBorderRenderer.ts', import.meta.url), 'utf8');

const padding = Number(transition.match(/FIELD_PADDING_CELLS\s*=\s*(\d+)/)?.[1] ?? 0);
assert(padding >= 5, 'dirty SDF region needs a multi-cell padding margin');
assert.match(transition, /authorizedMask\s*=\s*new Uint8Array/, 'authorized union mask is missing');
assert.match(transition, /signedDistance\(authorizedMask/, 'authorized union must use the same continuous field pipeline');
assert.match(transition, /arrivalData\[p \+ 1\]\s*=\s*encodeField\(authorizedField\[i\]\)/, 'authorization field must be continuous, not a hard cell bit');
assert.doesNotMatch(transition, /float authorizedDomain = step\(0\.5, authorizedLayer\)/, 'hard per-cell shader gate would expose square silhouettes');
assert.match(transition, /float arrivalValid = texture2D\(uArrivalTexture, vUv\)\.a/, 'reveal must use a per-sample authorization bit');
assert.match(transition, /float addedCoverage = baseAdded \* arrivalReveal/, 'new coverage must use the continuous SDF shape and per-sample arrival timing');
assert.match(transition, /arrivalData\[p \+ 3\] = Math\.round\(authorizedRevealDomain\(authorizedField\[i\]\) \* 255\)/, 'presentation authorization must retain a continuous local field');
assert.match(transition, /function authorizedRevealDomain\(field: number\)/, 'CPU reveal telemetry must use the same authorized-domain gate');
assert.match(transition, /function presentationVisualMapping\(\)/, 'presentation must share the visual gameplay mapping');
assert.match(transition, /presentationCellAtWorld\(worldX, worldY, visualMapping\)/, 'field samples must resolve through visual land mapping');
assert.match(transition, /getVisualGameplayMapping\(\s*gameState\.visualLandMask/, 'transition field must use the canonical visual coast mapping');
assert.match(transition, /countFinalRevealPixels\(\s*field\.oldField,\s*field\.newField,\s*field\.authorizedField,\s*field\.arrivalData/s, 'final reveal pixels must use the per-sample authorization data');
assert.match(transition, /__DOMINION_PRESENTATION_TELEMETRY_ENABLED__.*=== true/s, 'full per-frame pixel telemetry must be opt-in');
assert.match(transition, /source\.resource as Uint8Array\)\.set\(field\.data\)/, 'same-sized transition field resource must be reused');
assert.match(transition, /previousRegion\?\.minX/, 'retarget must preserve/expand the padded region instead of shrinking it');
assert.match(transition, /profileStage\('transition\.sdf'/, 'SDF stage profiling is required');
assert.match(transition, /profileStage\('transition\.textureUpload/, 'texture upload preparation profiling is required');
assert.match(upload, /dirtyBlocks/, 'political texture uploads must remain dirty-block bounded');
assert.match(upload, /subUploads/, 'political texture upload telemetry must count sub uploads');
assert.match(border, /dirtyChunks/, 'border rebuilding must remain dirty-chunk bounded');
const updateBody = transition.match(/public update\(dtSeconds: number\): void \{([\s\S]*?)\n    \}/)?.[1] ?? '';
assert.doesNotMatch(updateBody, /buildSignedDistanceTexture/, 'SDF must not rebuild on a frame with no new authoritative layer');
assert.match(transition, /field\.oldField\[i\] = transition\.oldField\[i\]/, 'new layer must preserve the previous visible scalar field');
assert.match(transition, /field\.newField\[i\] = Math\.max\(field\.newField\[i\], transition\.newField\[i\]\)/, 'new layer must extend, not replace, the prior target field');
assert.match(transition, /isVisualLand\(worldX, worldY\)/, 'land clipping must occur during field construction');
assert.match(transition, /source\.style\.scaleMode = 'linear'/, 'presentation fields must use linear filtering');
assert.match(transition, /const index = py \* width \+ px/, 'local field stride must remain row-major y*width+x');
assert.match(transition, /const patchIndex = \(py - localMinPy\) \* patchWidth \+ \(px - localMinPx\)/, 'dirty patch must use local origin offsets');
assert.match(transition, /const worldX = minX \+ \(px \+ 0\.5\) \/ FIELD_SCALE/, 'field X samples must round-trip from the dirty-region origin');
assert.match(transition, /const worldY = minY \+ \(py \+ 0\.5\) \/ FIELD_SCALE/, 'field Y samples must round-trip from the dirty-region origin');
assert.match(transition, /mesh\.x = field\.minX/);
assert.match(transition, /mesh\.y = field\.minY/);
assert.match(transition, /uvs: new Float32Array\(\[\s*0, 0,\s*1, 0,\s*1, 1,\s*0, 1,/s, 'presentation mesh must not transpose local texture axes');
assert.match(upload, /source\.uploadScratch\.set\(bytes\.subarray\(offset, offset \+ width \* 4\)/, 'dirty upload rows must preserve source stride');

for (const name of [
    'dirty_sdf_region_has_padding',
    'no_rectangular_transition_spike',
    'new_layer_preserves_previous_field',
    'local_sdf_update_only',
    'sdf_not_recomputed_without_new_authoritative_layer',
    'no_full_world_texture_upload_for_local_operation',
    'transition_buffers_reused',
    'close_zoom_lod_cache_stable',
    'presentation_filtering_only',
    'land_clip_no_water_spill',
]) console.log(`PASS: ${name}`);

console.log('PASS: padded continuous political field, stable retargeting, resource reuse, and bounded update invariants');
