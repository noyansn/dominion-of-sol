# Dominion of Sol — Population Strategy Completion Audit

Audit date: 2026-08-30  
Scope: the Population Strategy Master Directive and its current repository.  
Verdict policy: a source field, a command handler, or a unit test is not
treated as live completion evidence by itself.

## Executive status

The authoritative Population ledger and the core point-based operation model
are implemented in the Rust simulation and covered by deterministic tests.
The old Army-era production paths are not active. The original browser failure
was reproduced as a host child-process failure, not hidden or worked around in
the UI: restricted Vite startup fails with `spawn EPERM` while Vite's Windows
safe-path helper attempts a child process; the same repository starts and
renders correctly when the dev server is launched with the required host
permission.

The migration is **not implementation-complete** yet. Mandatory evidence is
still missing for anti-passive/pacing/balance behavior, several full port and
amphibious edge cases, complete alliance victory behavior, live globe gestures,
and a real active-warfare browser benchmark. Those are reported as `PARTIAL`
or `IMPLEMENTED + UNVERIFIED`, not as passes.

## Runtime failure classification

| Layer | Result | Evidence | Classification |
| --- | --- | --- | --- |
| TypeScript | PASS | `client/package.json` build script; final `npm run build` | No TypeScript error observed |
| Vite production bundle | PASS | `client/dist` produced by Vite 5.4.21, 762 modules | Import graph/CSS build is valid |
| Restricted Vite dev runtime | FAIL | Vite stack reaches `ChildProcess.spawn` / `execFile` / `optimizeSafeRealPathSync`; error `spawn EPERM` | Environment B: sandbox/host child-process restriction |
| Escalated Vite dev runtime | PASS | Restarted dev server under the permitted host; styled Dominion UI and map rendered | Repository-side runtime is valid |
| Browser rendering | PASS after restart | Styled page, canvas, HUD, 101-faction snapshot | Initial raw HTML was caused by the failed dev runtime, not accepted as visual QA |
| Normal GPU Chrome | AVAILABLE | `C:\Program Files\Google\Chrome\Application\chrome.exe`, `Chrome/151.0.7922.174`, visible temporary profile on CDP 9224 | Valid browser target; no normal profile used |

The overlay was not suppressed. The repository does not contain a CSS/import
regression corresponding to the overlay: production bundling succeeds and the
same source renders after the dev server is started outside the restricted
child-process context.

## Requirement matrix

Status meanings: `IMPLEMENTED + TESTED` means source behavior has a relevant
deterministic test; `IMPLEMENTED + UNVERIFIED` means the production path exists
but live/browser or complete-match evidence is still missing; `PARTIAL` means
one or more mandatory behaviors are not yet proven or are not fully implemented;
`SUPERSEDED` is historical-only material; `BLOCKED BY ENVIRONMENT` is limited
to the restricted dev-host condition above.

| # | Major subsystem | Status | Source/test evidence and remaining gap |
| ---: | --- | --- | --- |
| 1 | Population ledger | IMPLEMENTED + TESTED | `server/src/simulation.rs`: deployment subtracts from `population`, `total_living_population` retains deployed people, growth uses living pressure, casualties reduce deployed people, survivor return is centralized. Tests: `population_deployment_reduces_pool_but_living_total_includes_deployed`, `deploying_everyone_does_not_create_growth_or_duplicate_living_people`, `halt_returns_surviving_offensive_population_once`, `exhausted_offensive_returns_survivors_and_keeps_casualties_dead`, `validate_invariants`. No double-spend was observed in the local-force test. |
| 2 | Latitude-aware area and capacity | IMPLEMENTED + TESTED | `cell_area_km2`, `controlled_area_km2`, `effective_controlled_area_km2`, 20-second consolidation, capacity/growth formulas and `real_area_is_latitude_corrected_and_start_is_sparse`. |
| 3 | Anti-spam / anti-passive | PARTIAL | `population_audit` is deterministic, but its current 300-second profiles produced only one accepted expansion for both RAPID and CONSOLIDATOR. PASSIVE did not reach capacity. This is an inadequate comparison, not a balance pass; pacing/tuning evidence remains required. |
| 4 | World start | IMPLEMENTED + TESTED | `Simulation::with_seed(101)` creates 100 AI plus human id 101; sparse-start test asserts 15–25% owned claimable land and invariant validity. Fresh-match log recorded `totalOwned=32840`, `uniqueOwners=101`, under the 30% guard. Compact-core generation is in `factions.rs` / `compact_patch.rs`. |
| 5 | Point-based expansion | IMPLEMENTED + TESTED | `resolve_expansion_anchor`, `process_expand_command`, and `expansion_uses_the_exact_selected_adjacent_point`; selected target is retained as `resolved_anchor`. |
| 6 | Three simultaneous offensives | IMPLEMENTED + TESTED | No production one-offensive guard remains. `three_point_operations_from_one_faction_are_legal_when_population_exists` creates three active fronts with independent IDs and real commitments. |
| 7 | Same enemy, different points | IMPLEMENTED + TESTED | `same_enemy_at_two_border_points_keeps_two_spatial_operations` verifies distinct target cells and centroids. |
| 8 | Defense | IMPLEMENTED + TESTED | Defense Focus spends/release real Population; emergency response draws from the free pool; local offensive force is shared without duplication. Covered by `defense_focus_reserves_real_population_and_release_returns_it` and `existing_offensive_force_is_shared_local_defense_without_double_spend`. No hidden regional defense scalar exists in the active simulation model. |
| 9 | Reinforcement | IMPLEMENTED + TESTED | `reinforcement_adds_to_front_and_only_spends_new_population` proves 87K + 50K = 137K and the pool decreases by 50K in the controlled fixture. |
| 10 | War end | IMPLEMENTED + TESTED | Halt/cancel, attacker exhaustion, defender elimination, survivor return and permanent casualty behavior are covered by population tests and `last_land_capture_eliminates_faction_and_finishes_two_faction_match`. There are no three user-selected war modes in the active protocol. |
| 11 | War visual system | IMPLEMENTED + UNVERIFIED | `client/src/render/WarRenderer.ts` uses real `FrontInfo`, compact three-arrow operational geometry, flags, tactical marker and real deployed values; the old giant world-space casualty/ATK/DEF presentation is absent from production renderer and asserted by `population_contract.test.mjs`. A real front reached the renderer in an earlier live session, but the current clean normal-browser run had no persistent active front, so final visual acceptance is not claimed. |
| 12 | Enemy information | IMPLEMENTED + TESTED | Faction `population` is public in protocol/snapshot. No defense estimate range, victory probability, favorable/unfavorable forecast, or recommended color slider remains in active UI/client contract. Static contract test and source search pass. |
| 13 | Port | PARTIAL | Own coastal strategic site, permanent Population cost, construction state and approximately 10-second completion are implemented and tested by `port_cost_is_permanent_and_completion_is_time_based`. Required capture-transfer, unfinished-port loss, no-refund-after-capture and all invalid-coast cases are source-supported but not each covered by a deterministic test. |
| 14 | Amphibious warfare | PARTIAL | `process_amphibious_operation` stores exact source port and target coast, uses `great_circle_distance_km`, distinguishes completed-port authorization and small raid behavior, and has a real-front unit test. Normal non-border rejection, long-trip survival monotonicity, exact destination coast, no-port deployment cap, port attrition benefit and survivor return need dedicated deterministic assertions. |
| 15 | Alliances | PARTIAL | Offer, pending proposal, accept, reject, attack blocking and area-share reward are implemented/tested. Deterministic AI offer path exists in `bot.rs`. Solo victory and alliance victory resolution, plus a full multi-party accept/reject sequence, are not yet proven by dedicated match tests. |
| 16 | Nation presets | PARTIAL | Eight implemented presets expose flags, homeland strings and four normalized doctrine offsets. Zero-sum/bounded doctrine and flag/homeland presence are tested. Maritime presets do not yet have a dedicated proof that placement prefers a coast; homeland metadata alone is not sufficient evidence. |
| 17 | Custom nation | IMPLEMENTED + TESTED | `NationCreator.ts` persists name, color, flag descriptor, starting cell and four doctrine sliders; `GameClient.ts` sends them; `main.rs` validates them and the server assigns custom human faction 101. The relocation path is `Simulation::relocate_faction_start`. |
| 18 | Flag editor | IMPLEMENTED + TESTED | `FlagAtlas.ts` normalizes templates/emblems/colors, serializes descriptors and caches generated textures; `NationCreator.ts` exposes the editor and the client contract test checks the flow. |
| 19 | Linked doctrine sliders | IMPLEMENTED + TESTED | `NationCreator.rebalanceDoctrine` removes the mean, bounds the vector and keeps the four-axis sum zero; server `normalize_doctrine` repeats validation. The client population contract test covers the linkage source. |
| 20 | Globe | IMPLEMENTED + UNVERIFIED | `GlobeRenderer.ts` now uses the same longitude convention for shader, projection and inverse picking; static globe test proves Japan east of China, Australia southeast of Asia, Atlantic placement, both pole limits, rotation/picking formulas and flat-map return path. Live drag-right, full yaw, both-pole interaction, expanded zoom and globe-to-flat location preservation were not browser-demonstrated in this audit. |
| 21 | Coast / ownership mapping | IMPLEMENTED + TESTED | Authoritative owner IDs remain categorical; visual land mask and canonical geography are separate presentation guards. Political field tests cover land/water clipping, edge transitions and owner mapping; frozen asset hashes were not changed. A live browser coast diagnostic was not treated as a substitute for source/test proof. |
| 22 | UI migration | IMPLEMENTED + UNVERIFIED | Production HUD uses Population and total living/deployed context; client contract tests assert no Army/Reserve/Available and no old forecast/recommendation labels. Historical reports still mention Army explicitly and are classified as historical, not production UI. Initial browser overlay prevented a visual acceptance claim until the escalated Vite restart; normal browser rendering now works. |
| 23 | Match pacing | PARTIAL | Accelerated 8-faction runs for four seeds were capped at 12 minutes with no winner; the 20,000-step 100-bot headless run reached 16.67 simulated minutes with `matchOver=false`. No valid minimum/median/p75/p90/maximum complete-match distribution exists yet. |
| 24 | Nation balance | PARTIAL | Four seeds and MAX_OFFENSE/MAX_DEFENSE/MAX_EXPANSION/MAX_MARITIME cases were run, but all were censored at 12 minutes with no winner. Therefore no win-rate spread or universally-dominant-config conclusion is valid. |
| 25 | Long run / timing / invariants | IMPLEMENTED + TESTED | 20,000-step headless server run completed: average tick 1.783 ms, p95 20.375 ms, max 112.522 ms, target cadence 50 ms; no invariant panic, topology component violations 0, and `validate_invariants` covers negative population, duplication, invalid owner/water, orphan fronts and capital state. This is a long-run health result, not a complete-match result. |
| 26 | Monetization-ready separation | IMPLEMENTED + TESTED | `docs/monetization_ready_architecture.md` separates identity/presentation from doctrine/gameplay and explicitly disallows cosmetic power. Runtime combat has no entitlement dependency; source search found no entitlement path in combat. |
| 27 | Legacy model search | IMPLEMENTED + TESTED | Active runtime has zero Army/Reserve/Available gameplay fields and no active one-offensive or old giant-arrow renderer. Remaining Army terms are in `server/src/simulation.rs` under disabled `#[cfg(any())] mod legacy_tests` and in historical docs; `active_front_for_attacker` is a compatibility/read-only helper, not an admission guard. No active blocker remains in this search. |

## Deterministic population comparison

The existing audit command was run with fixed seed and identical 300-second
conditions:

| Profile | Expansions | Territory at 60s | Territory at 300s | Final Population | Capacity | Growth/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| RAPID_EXPANDER | 1 | 17,211 | 17,211 | 88,042.47 | 108,521.80 | 42.6957 |
| CONSOLIDATOR | 1 | 17,211 | 17,211 | 88,042.47 | 108,521.80 | 42.6957 |
| PASSIVE | 0 | 17,203 | 17,203 | 91,910.41 | 108,518.14 | 42.6908 |

These values show that the audit fixture does not yet exercise enough legal
frontiers to distinguish rapid expansion from consolidation and does not show
capacity saturation. They are recorded as a failed/insufficient audit, not as
evidence that the economy is balanced.

## Browser and performance evidence

The DEV-only API is implemented in `client/src/ui/Benchmark.ts` and samples
`requestAnimationFrame` with `performance.now()`: 2-second warm-up followed by
10 seconds, frame count, average/median/p95/p99 frame time, average FPS, camera,
LOD, tile, label and viewport telemetry. The valid normal-browser target was a
visible temporary Chrome profile on port 9224; the old hidden target on port
9222 was rejected because `document.visibilityState` was `hidden` and its rAF
did not run.

| View | Avg FPS | Avg frame ms | Median | p95 | p99 | LOD | Visible/resident tiles | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| World | 31.59 | 31.70 | 17.0 | 66.60 | 213.39 | GLOBAL | 0 / 0 | PASS, but high tail |
| Europe regional | 46.23 | 21.63 | 16.70 | 33.60 | 56.43 | REGIONAL | 20 / 20 | PASS |
| Turkey close | 50.59 | 19.79 | 16.70 | 33.30 | 33.79 | DETAIL | 30 / 30 | PASS |
| Active warfare | — | — | — | — | — | DETAIL | 30 / 30 | UNVERIFIED: no live active front in the sample |

Environment: Chrome executable above, version `151.0.7922.174`, normal GPU
enabled, visible temporary profile, viewport `1536×776` CSS pixels, DPR
`1.25`, renderer resolution `1.25`. WebGL reported
`WebGL 2.0 (OpenGL ES 3.0 Chromium)`, vendor `Google Inc. (Intel)`, renderer
`ANGLE (Intel, Intel(R) UHD Graphics (0x00009A68) Direct3D11 ...)`.

The world/regional/close averages meet the 30 FPS floor. Warfare does not have
a valid active-event sample, so the required four-view performance gate is
still **unverified**. The prior in-app measurements of approximately 16 FPS and
3 FPS were correctly rejected as acceptance evidence.

## Long-run server evidence

Command-line headless run: 20,000 simulation steps, fixed seed 1.

```text
avgTickMs=1.783
p95TickMs=20.375
maxTickMs=112.522
targetCadence=50ms
botAttempts=8957
botAccepted=4378
componentViolations=0
matchOver=false
```

Neutral land moved from approximately 80.9% at startup to 70.8% near the
reported 1,000-second checkpoint. This confirms server cadence and invariant
health under load, but not a complete 15–25 minute match distribution.

## Tests and build gates

The final local gate before this documentation-only correction was:

- `cmd /c npm run build` — PASS
- `node tests/political_presentation.test.mjs` — PASS
- `node tests/population_contract.test.mjs` — PASS
- `node tests/globe_projection.test.mjs` — PASS
- `node tests/ui_state_structure.test.mjs` — PASS
- `node tests/responsive_ui.test.mjs` — PASS
- `node tests/interaction.test.mjs` — PASS
- `node tests/lod_presentation.test.mjs` — PASS
- `cmd /c cargo_winlibs.bat check --all-targets` — PASS
- `cmd /c cargo_winlibs.bat test --all-targets` — PASS (server, benchmark and audit targets)
- `cmd /c cargo_winlibs.bat build --bin server` — PASS

The JSON schema was then brought into line with the already-active Rust/client
contract: Population fields, four doctrines, flag descriptor, starting cell,
101-faction bounds, fronts and pending alliance proposals. This changed shared
documentation/schema only; Rust transport, simulation, topology and frozen
assets were not modified by that correction.

## Frozen systems

```text
server = NO
network lifecycle = NO
topology = NO
world_grid.bin = NO
terrain data = NO
bathymetry data = NO
LOD architecture = NO
Rust protocol implementation = NO
```

## Final verdict

**IMPLEMENTATION INCOMPLETE**

Exact remaining blockers:

1. The anti-spam/passive audit fixture must be corrected and the economy must
   be demonstrated with distinct Rapid/Consolidator/Passive trajectories,
   including capacity saturation.
2. Complete-match pacing and repeated AI balance distributions are not yet
   available; current runs are censored before victory.
3. Port transfer/loss/no-refund edge cases, amphibious legality/attrition
   matrix, and solo/alliance victory need dedicated deterministic coverage.
4. Live globe gestures and a normal-browser benchmark with a real active
   warfare front remain unverified. The current normal Chrome sample without a
   front must not be reused as warfare evidence.

Live client link: [http://localhost:5173/](http://localhost:5173/)
