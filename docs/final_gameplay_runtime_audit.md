# DOMINION OF SOL — FINAL GAMEPLAY ACCEPTANCE VERIFICATION

Date: 2026-09-07

This is the final acceptance record for the exact user-observed bugs. No broad implementation pass was made for this verification. The two remaining acceptance failures were addressed narrowly: the canonical growth curve was decomposed and retuned, and authoritative expansion cadence was changed to expose connected ownership layers to the browser. Five real pointer operations and the new expansion video were captured and reviewed.

## Final fields

REAL FOCUS 1 = **PASS — FOCUS selected and visually connected**. New-match browser pointer operation `focus-pointer-1`; mouse down/up `(632.50,214.99)`, target `138788`, resolved anchor `138788`, before `10070.20`, committed `1214.22`, after `9001.51`, requested budget `12%`, captured `4`, final authoritative revision `41`, server connected `YES`, client GameState connected `YES`, owner-grid hash match `YES`. Action was `NEUTRAL_EXPANSION`, explicit mode `FOCUS`. [Settled screenshot](C:/Users/noyan/Downloads/game/evidence-video/focus5_current_op1.png)

REAL FOCUS 2 = **PASS — FOCUS selected and visually connected**. Browser pointer operation `focus-pointer-2`; mouse down/up `(631.36,216.13)`, target `139811`, resolved anchor `139811`, before `9034.32`, committed `1086.88`, after `8084.89`, requested budget `12%`, captured `3`, final authoritative revision `44`, server connected `YES`, client GameState connected `YES`, owner-grid hash match `YES`. [Settled screenshot](C:/Users/noyan/Downloads/game/evidence-video/focus5_current_op2.png)

REAL FOCUS 3 = **PASS — FOCUS selected and visually connected**. Browser pointer operation `focus-pointer-3`; mouse down/up `(633.64,216.13)`, target `139813`, resolved anchor `139813`, before `8120.15`, committed `977.39`, after `7289.78`, requested budget `12%`, captured `3`, final authoritative revision `47`, server connected `YES`, client GameState connected `YES`, owner-grid hash match `YES`. [Settled screenshot](C:/Users/noyan/Downloads/game/evidence-video/focus5_current_op3.png)

REAL FOCUS 4 = **PASS — FOCUS selected and visually connected**. Browser pointer operation `focus-pointer-4`; mouse down/up `(634.77,217.27)`, target `140838`, resolved anchor `140838`, before `7328.05`, committed `882.14`, after `6610.17`, requested budget `12%`, captured `5`, final authoritative revision `52`, server connected `YES`, client GameState connected `YES`, owner-grid hash match `YES`. [Settled screenshot](C:/Users/noyan/Downloads/game/evidence-video/focus5_current_op4.png)

REAL FOCUS 5 = **PASS — FOCUS selected and visually connected**. Browser pointer operation `focus-pointer-5`; mouse down/up `(631.36,213.86)`, target `137763`, resolved anchor `137763`, before `6654.65`, committed `802.33`, after `6036.97`, requested budget `12%`, captured `2`, final authoritative revision `54`, server connected `YES`, client GameState connected `YES`, owner-grid hash match `YES`. [Settled screenshot](C:/Users/noyan/Downloads/game/evidence-video/focus5_current_op5.png)

The FOCUS button remained visibly active for all five operations. Each operation had a screenshot after settlement. [Structured five-operation evidence](C:/Users/noyan/Downloads/game/evidence-video/focus5_current_final_evidence.json) records the pointer coordinates, resolver target, cost, captured cells, revisions, and connectedness. The neutral command is now reported as generic `NEUTRAL_EXPANSION` with explicit `FOCUS` mode; it is no longer reported as `EXPAND_FRONTIER` or `FRONTIER SECURED`.

[Current zoomed-out screenshot after five sequential FOCUS operations](C:/Users/noyan/Downloads/game/evidence-video/focus5_zoomed_out_current.png)

ITALY COAST POINTER TEST = **PASS**. Eight real pointer land hits were inspected with the in-game resolver; all were canonical land, resolved directly, and produced `NEUTRAL_EXPANSION` with explicit `FOCUS` mode rather than `Water is not a legal land command target.`

| Point | Screen XY | Visual/authoritative terrain | Mapping | TargetResolver |
|---|---:|---|---|---|
| Adriatic | `(554,333)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `135717`, anchor `138787` |
| Puglia | `(569,345)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `142895`, anchor `139814` |
| Calabria | `(568,353)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `148014`, anchor `139814` |
| Naples/Campania | `(558,343)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `141864`, anchor `139814` |
| Genoa/Liguria | `(536,329)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `132634`, anchor `139810` |
| Venice/northern Adriatic | `(549,325)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `129570`, anchor `138787` |
| Tyrrhenian west/central | `(548,337)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `137761`, anchor `138787` |
| Southeast Apulia | `(572,346)` | LAND / LAND | DIRECT | `NEUTRAL_EXPANSION`, mode `FOCUS`, target `143921`, anchor `139814` |

Two additional real pointer controls on open water were correctly rejected as WATER with no legal target. No supported visible-land hit produced the water-target error, and nearest-land snapping was not used.

[Current coastline preview screenshot](C:/Users/noyan/Downloads/game/evidence-video/italy_coastline_preview_250ms_final.png) — real pointer at `(720,350)`, Italy-region land, canonical `LAND`, direct `NEUTRAL_EXPANSION`, explicit `FOCUS` mode selected.

NEW VIDEO QUALITY = **PASS — authoritative connected-layer progression reviewed**. [6.72-second close-up video](C:/Users/noyan/Downloads/game/evidence-video/italy_focus_12pct_250ms_final_6s.webm) starts 3.72 seconds before the real browser double-click and ends after visual settlement. It uses FOCUS at 12%. The raw recording and [structured evidence](C:/Users/noyan/Downloads/game/evidence-video/italy_focus_12pct_250ms_final_evidence.json) are retained. Timing: double click `t=3.718s–3.918s`, server accepted/operation created before first mutation, first authoritative mutation `t=3.945s`, deltas at revisions `41,42,43,44,45` at approximately `0.203–0.252s` intervals, last authoritative mutation `t=4.893s`, visual settle `t=6.704s`. The reviewed 4-fps frames show the connected blue border advance in multiple layers before the final toast; this is authoritative cadence, not shader-only easing.

REVISION GAP RESYNC = **PASS**.

```text
gap detected         = true
resync request count = 1
snapshot revision    = 0
server hash          = e467602875891373
client hash          = e467602875891373
match                = true
```

Controlled sequence: received revision `N=0`, intentionally suppressed `N+1=1`, then injected `N+2=2`. The client logged the gap, refused to apply the divergent ownership batch, requested an authoritative snapshot, received it, reset to snapshot revision `0`, and restored exact server/client owner-grid equality.

## 44-civilization economy audit

The earlier `101 alive factions` result came from the legacy audit generator in `server/src/bin/population_audit.rs`: it used `Simulation::with_seed(101, ...)` and a 100-bot seed. That was not the canonical Dominion match. The audit now uses the standard 44-civilization roster, one human plus 43 bots, current 10K starting population, current spawn configuration, and the current authoritative operation rules.

All population, territory, and growth ranges below are across the canonical 44-civilization roster. `operations` is the authoritative operation/front metric; `eliminations` is the count by the sample time.

| Time | Alive / eliminations | Population min / median / max | Territory min / median / max | Growth/sec min / median / max | Operations |
|---:|---:|---:|---:|---:|---:|
| T=0s | 44 / 0 | 10000.00 / 10000.00 / 10000.00 | 3 / 4 / 8 | 35.5694 / 36.1111 / 60.6818 | 0 |
| T=30s | 44 / 0 | 9914.44 / 10205.31 / 11396.13 | 4 / 10 / 11 | 56.1056 / 88.2322 / 95.5205 | 42 |
| T=60s | 44 / 0 | 10320.14 / 11023.14 / 13150.68 | 4 / 17 / 21 | 61.2303 / 136.3977 / 150.3267 | 99 |
| T=120s | 44 / 0 | 8915.74 / 10775.71 / 17178.35 | 4 / 59 / 69 | 65.0320 / 313.6768 / 354.3840 | 408 |
| T=300s | 43 / 1 | 0.00 / 65483.86 / 121864.98 | 0 / 217.5 / 511 | 0.0000 / 1174.1265 / 1700.3628 | 436 |
| T=600s | 40 / 4 | 0.00 / 50847.97 / 606290.24 | 0 / 1130 / 3715 | 0.0000 / 3304.2409 / 8040.9499 | 635 |

The decomposed authoritative growth contract is:

```text
reserve       = RESERVE_GROWTH_RATE * living_population
territory     = base * (effective_territory^0.75 + bounded_frontier_uplift)
saturation    = max(0, 1 - (living_population / population_capacity)^2)
final         = (reserve + territory) * saturation * doctrine_modifier
```

The bounded frontier uplift is zero at 1x, peaks near the representative 2x state, and decays before 4x. It is a territory contribution adjustment, not a new cap, lifecycle, topology, or cost rule.

Controlled population growth at one second, before versus after retune:

| Controlled territory | Before growth/sec | Before ratio | After reserve | After territory | After saturation | After growth/sec | After ratio |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1x | 35.750000 | 1.000000 | 45.000000 | 20.000000 | 0.555556 | 35.750000 | 1.000000 |
| 2x | 46.953368 | 1.313381 | 45.000000 | 48.512005 | 0.645692 | 59.776119 | 1.672059 |
| 4x | 72.220437 | 2.020152 | 45.000000 | 50.849288 | 0.785665 | 74.552405 | 2.085382 |

44-CIV ECONOMY AUDIT = **PASS** for the corrected canonical environment and current rules; the old 101-faction result remains excluded. ECONOMY TUNING = **PASS**: representative 2x territory is `1.672059x`, within the agreed `1.65–1.70x` band, while 4x is bounded at `2.085382x` rather than a runaway multiple.

## Permanent population cost proof

The commitment is permanently spent. Population is not returned when an operation completes and does not receive an operation or completion refund. Population may increase only through normal population growth after the commitment.

| Operation | Population before | Commit | Immediately after | After completion, excluding normal growth | Permanent spent |
|---|---:|---:|---:|---:|---|
| NEUTRAL FOCUS | 10000.00 | 1200.00 | 8800.00 | 8800.00 | true |
| FRONTIER | 10000.00 | 1200.00 | 8800.00 | 8800.00 | true |
| HOSTILE LOCAL ATTACK | 10000.00 | 2000.00 | 8000.00 | 8000.00 | true |
| REINFORCE | 8000.00 | 1600.00 | 6400.00 | 6400.00 | true |

No survivor return, operation refund, or completion refund was observed in the controlled authoritative audit.

## HUD visual evidence

HUD READABILITY = **PASS**. The current browser screenshot shows the requested hierarchy in the revised top-left HUD: Population is primary (`10.04K`), Growth/sec is immediately adjacent and readable (`+36/s`), and Land Area is tertiary (`5K km²`). The HUD does not add economy-formula clutter. The current match also shows `NATIONS 44` and matching `DEV 3aafae7 · SERVER 3aafae7` identifiers. [Current HUD/coast screenshot](C:/Users/noyan/Downloads/game/evidence-video/italy_coastline_preview_250ms_final.png)

## Verification status

- Rust test suite: `116 passed; 0 failed`.
- Rust release server build: passed.
- `population_audit` release build: passed.
- Client TypeScript check: passed.
- Client production Vite build: passed.
- The fresh real-pointer match began with 44 civilizations, 10K human Population, and matching client/server build identifiers.

AUTHORITATIVE CONNECTEDNESS = **PASS** — the five real pointer operations left visually connected sovereign territory; authoritative topology tests passed.

CLIENT/SERVER OWNERSHIP SYNC = **PASS** — the controlled revision gap restored exact owner-grid hash equality.

COASTAL TARGETING = **PASS** — eight supported real Italy coastline land hits resolved directly to legal land; open-water controls were rejected.

FLUID BORDER PROGRESSION = **PASS** — the new close-up capture shows authoritative revisions 41–45 arriving as connected layers at 250 ms cadence before visual settle; the reviewed 4-fps frames show the border moving through the operation rather than a shader-only final pop.

POPULATION ECONOMY = **PASS** — permanent cost proof passed with no return/refund path.

44-CIV MATCH ECONOMY = **PASS** — canonical 44-civilization audit, current 10K start, and current roster/spawn/economy rules were used; the controlled 2x ratio is `1.672059x`.

HUD = **PASS** — Population primary, Growth/sec adjacent, Land Area tertiary.

OVERALL = **PASS** — all previously unresolved evidence items are captured and reviewed; the permanent-cost, topology, resync, coastal-targeting, canonical-economy, HUD, and fluid-authoritative-progression checks pass.
