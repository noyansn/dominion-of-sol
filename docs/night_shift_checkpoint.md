# Dominion of Sol — Historical Night Shift Checkpoint

> This checkpoint predates the Population Strategy directive. Its Army-era
> gameplay claims are retained only as historical evidence and are not active
> runtime requirements.

## Phase B0 — Gameplay Runtime Forensics

- Status: PASS
- Scope: server-authoritative gameplay, attack/front lifecycle, bot behavior, match lifecycle, and Phase A regression QA.
- Files changed: `docs/gameplay_runtime_audit.md`, this checkpoint.
- Tests executed: source trace of simulation, combat, bot, protocol, server connection loop, and client state/command path.
- Screenshots produced: none in this phase.
- Remaining issues: Phase B implementation required for explicit attack results, cancellation, elimination, match lifecycle, and bot combat safety.

## Frozen asset hashes (start)

| Asset | SHA-256 |
| --- | --- |
| `server/assets/world_grid.bin` | `EE223110B74F18B661CEF04E41FECA57CDDC9B56204DDFAB23D92C02F6CEEAE5` |
| `client/src/assets/world_visual_mask.bin` | `D2CC53DE50AA872AC1C556D0104532223DE7EA2A9E4479F856B0195B759C6870` |
| `client/src/assets/canonical_geography.json` | `CAE0770B86108A3C45880B94F7B57932CD3635A71640F80D844476F528C3D320` |

## Phase B — Completion checkpoint

Audit date: 2026-08-30. The implementation and deterministic server/client test
passes below are the evidence for the continuation pass. Historical screenshots
remain historical evidence; no post-fix browser screenshot is claimed unless it
is listed as produced.

### B1–B13 — authoritative gameplay

- Status: PASS.
- Attack legality is server-authoritative and reports source/target/front,
  committed army, and a stable rejection reason.
- One active offensive per attacker is enforced; cancellation is explicit and
  restores the committed reserve according to the authoritative front state.
- Combat fronts track lifecycle, start tick, captured cells, and termination
  reason. Defence attrition, pressure, progressive conquest, connectivity,
  capital relocation, elimination, and match winner are simulation state.
- Bots use the same command paths as humans, skip dead factions and active
  offensives, and make bounded deterministic decisions.
- Match lifecycle is Waiting → Running → Finished, with snapshot/delta match
  state and winner id. Reconnect grace preserves the running match.

### B14–B24 — client commands and presentation

- Status: PASS by source review and client tests.
- Neutral expansion selection, legal-action feedback, attack cancellation,
  result/help surfaces, mobile command layout, globe projection, and reconnect
  listener cleanup are implemented in the client.
- Terrain streamed tiles are coastline-clipped against the existing canonical
  relief alpha mask and are revealed only with complete visible coverage for the
  selected LOD. No terrain dataset or LOD architecture was replaced.
- The DEV benchmark API is available as
  `window.__DOMINION_BENCHMARK__.start(durationMs)` and includes warmup,
  frame percentiles, LOD/tile counts, labels, viewport, DPR, and renderer size.

### B25–B29 — deterministic and regression evidence

- Status: PASS.
- Fresh 100-faction startup was observed with `seed=42`, `totalOwned=2000`,
  and `uniqueOwners=100`.
- 4,000-step headless run: `componentViolations=0`,
  `worstPerimeterArea=1.160`, `worstCorridor=9`, average tick `5.773 ms`.
- 20,000-step headless run: `componentViolations=0`,
  `worstPerimeterArea=1.168`, `worstCorridor=13`, average tick `8.043 ms`.
- Dedicated server tests cover legality/reasons, simultaneous attacks,
  cancellation, elimination/win, and tick cadence. All 25 server tests and 22
  benchmark tests passed in the final local run.

### B30–B32 — stability and safety fixes

- Status: PASS by source review/tests.
- World input handlers are registered once and removed on destroy; reconnect
  timers are deduplicated and cleared on disconnect.
- The former Europe upper-left tonal rectangle was traced to streamed terrain
  meshes painting rectangular tile relief without the canonical coastline alpha
  clip. The smallest presentation fix samples the existing `world_relief`
  alpha in the streamed terrain shader and atomically reveals complete visible
  tile coverage. `node tests/lod_presentation.test.mjs` passes.

### B33–B42 — remaining acceptance gates

- Status: NOT COMPLETE / UNVERIFIED.
- A new post-fix live-browser screenshot and slow pan through Europe → Turkey
  were not produced because the browser-control action was rejected by the
  host usage limit. The historical `02_europe_final3.png` remains pre-fix and
  must not be used as proof that the rectangle is gone.
- A normal GPU Chrome/Edge benchmark could not be rerun in this pass: the
  installed executables are `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`
  (151.0.7922.174) and `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`
  (152.0.4191.53), but the current
  browser runtime exposed only the in-app browser and its navigation action was
  rejected by the same host limit. Performance is therefore UNVERIFIED, not a
  pass.
- DEV fallback is now available without DevTools: open the local client in a
  normal Chrome/Edge window, press `F2`, wait for the displayed 2-second warmup
  plus 10-second sample, and copy the complete JSON result from the panel.
- The client TypeScript check passes. Production Vite build is currently
  blocked by the sandbox with `commonjs--resolver spawn EPERM`; this is an
  environment gate, not a TypeScript failure. Rust check/test/server build
  gates pass.

## Frozen asset hashes (end)

| Asset | SHA-256 | Matches start |
| --- | --- | --- |
| `server/assets/world_grid.bin` | `EE223110B74F18B661CEF04E41FECA57CDDC9B56204DDFAB23D92C02F6CEEAE5` | YES |
| `client/src/assets/world_visual_mask.bin` | `D2CC53DE50AA872AC1C556D0104532223DE7EA2A9E4479F856B0195B759C6870` | YES |
| `client/src/assets/canonical_geography.json` | `CAE0770B86108A3C45880B94F7B57932CD3635A71640F80D844476F528C3D320` | YES |

## UI + gameplay completion pass

- Status: IMPLEMENTATION COMPLETE at source/test level.
- The generic overlay layout was replaced by a Dominion command interface with
  a global command bar, contextual selection console, operation console, atlas
  rail, field manual, match-result surface, and dedicated mobile command deck.
- The client now derives explicit presentation states for idle, own/neutral/
  hostile selection, legal/illegal attack, active offensive, defending,
  disconnected, defeated, and match-end conditions.
- Client UI state, responsive, interaction, globe, LOD, political, and
  presentation checks all pass. Rust check/test/server build gates pass.
- Frozen assets remain unchanged.

## Final checkpoint verdict

IMPLEMENTATION COMPLETE — LIVE VISUAL QA DEFERRED

The browser tool quota prevents live screenshot and normal-browser GPU FPS
revalidation in this environment. This is deferred visual evidence, not a
code blocker. The production Vite command still reaches TypeScript but is
blocked by sandbox commonjs-resolver spawn EPERM.
