# DOMINION PHASE 1 — POLITICAL FIELD RECOVERY REPORT

## Removed Legacy Ownership Paths

- `PoliticalSurfaceCache.rasterizeRegion` and its raw/canonical segment XOR owner rewrite were removed.
- `coverageBuffer`, `coverageTexture`, and world-space political coverage AA were removed.
- `OwnershipRenderer` no longer consumes coverage or boundary geometry.
- `PoliticalBorderRenderer` no longer consumes `PoliticalGeometryCache`; it consumes the final edge mask.
- `WarRenderer` no longer consumes `PoliticalGeometryCache`; it locates active fronts on the final field.
- `PoliticalGeometryCache.ts` remains as an unreferenced comparison artifact. No production module imports or instantiates it.

## VisualPoliticalField

- Core: `PoliticalFieldCore` behind the Pixi bridge `PoliticalSurfaceCache`.
- Resolution: 2048 × 1024.
- Format: categorical `Uint8Array` / R8 nearest-sampled texture.
- Canonical owner memory: 2,097,152 bytes (2 MiB).
- Semantics: `0` neutral/no owner; `1..255` exactly one faction owner. No fractional owner and no border owner.

## Raw Baseline

Each 1024 × 512 authoritative cell maps deterministically to one 2 × 2 visual block. Samples classified as visual water are forced to owner `0`. F3 toggles `POLITICAL_RAW_BASELINE`, hides border/terrain/war/selection, and displays this raw field.

## Shape Relaxation

- One deterministic, double-buffered categorical pass based only on the raw field.
- Only a local 3 × 3 neighborhood is considered.
- A candidate needs a unique/tie-deterministic local majority of at least 5 of 8 samples.
- The replacement must be cardinally adjacent.
- Removal is rejected if current-owner neighbors would become locally disconnected.
- Capital 2 × 2 blocks are protected.
- Maximum displacement is one visual pixel = 0.5 simulation cell.
- No owner color/ID blur, geometry repaint, or iteration-order mutation is used.

## Coast Constraint

The 4096 × 2048 visual land mask is downsampled categorically at political sample centers. Visual water is owner `0`. The original high-resolution linearly sampled coast alpha remains the final render alpha constraint. Faction-water transitions do not enter the political border mask.

## Border Derivation

The 2048 × 1024 R8 border mask is derived only from right/bottom transitions in the final owner field:

- faction/faction: one neutral dark edge;
- faction/neutral land: one neutral dark edge;
- faction/water: no political edge.

No underlay, faction-colored stroke, shadow, or parallel geometry pass exists.

## Texture Pipeline

- Owner: R8 categorical, nearest sampling, controlled whole-texture upload at political update rate.
- Border: R8 binary, nearest sampling, controlled whole-texture upload at political update rate.
- Palette: RGBA8, nearest sampling.
- Coast: 4096 × 2048 R8, linear sampling.
- No owner interpolation and no permanent world-space ownership fade.

## Dirty Update

- Dirty simulation indices are converted to visual bounds.
- Target halo: 2 visual pixels; raw dependency halo: one additional pixel; border refresh halo: one pixel.
- Because relaxation is a one-pass function of raw ownership, dirty and full builds are deterministic equivalents.
- Synthetic world-size benchmark (100 changed cells): 22,319 visual pixels processed, 5.60 ms.
- Full 2048 × 1024 build in the same Node benchmark: 307.58 ms.
- Full/dirty owner and border buffers: byte-identical.

## Capital Validation

- Capital anchor candidates must now satisfy both visual land and final visual owner equality.
- Anchor caches are invalidated on ownership deltas.
- Runtime diagnostics expose water/wrong-owner anchors and fallback count.
- Live counts require the user's running server snapshot and manual review; they were not fabricated in headless tests.

## Labels

- Label anchors use final visual-territory centroids followed by nearest same-owner correction.
- FAR prioritizes the human and the largest 8–20 visible factions based on screen width.
- Territory anchor rebuilds on deltas are throttled to once per second.
- Existing collision rejection remains active.

## Tests

`npm run test:political`: 10/10 passed.

- A raw 2× baseline mapping.
- B faction-neutral straight border: one transition.
- C A-B straight border: one transition, no neutral gap.
- D staircase: local bounded smoothing.
- E A/B/neutral T-junction: no fourth region.
- F narrow bridge: connectivity retained.
- G island: ownership retained.
- H coast: zero visual-water ownership.
- I full rebuild vs dirty update: byte-identical owner and border buffers.
- J order independence: byte-identical output.

`npm run test:political-world` passed:

```json
{"resolution":"2048x1024","ownerBytes":2097152,"fullMs":307.58,"dirty100Ms":5.6,"dirtyPixelsProcessed":22319,"relaxedPixelsReference":827,"ownedVisualWaterPixels":0,"dirtyEqualsFull":true}
```

## Builds

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Vite transformed 742 modules and built production assets in 4.53 s.
- Rust was not changed, so no Rust build was required.

## Known Remaining Problems

- Visual acceptance has not been performed; the user is the screenshot acceptance gate.
- One conservative categorical pass materially targets staircase corners but may still leave long straight grid runs visibly blocky. It must not be made more aggressive before screenshots verify topology and coastline behavior.
- Border thickness is currently tied to the 2048 field sample footprint. A later screen-derivative AA pass may improve CLOSE/FAR consistency without changing political truth.
- `PoliticalGeometryCache.ts` remains unused rather than deleted, for forensic comparison.
- The production bundle retains an existing >500 kB chunk warning.
- 100-bot visual stutter and live capital counts require manual runtime observation.

STATUS: **PHASE 1 PARTIAL — MANUAL REVIEW REQUIRED**
