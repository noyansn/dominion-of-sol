# DOMINION OF SOL — HISTORICAL UI + GAMEPLAY COMPLETION REPORT

> The information model in this historical report predates Population
> Strategy. The active player-facing resource is Population; see the current
> migration and runtime contracts in this directory.

Audit date: 2026-08-30

## UI rebuild

Implementation status: COMPLETE at source/test level.

The former generic overlay composition was replaced with a dedicated Dominion
command interface:

- Global command bar with sovereign identity, army/capacity, recovery, land,
  connection, match phase, nations, projection, map mode, and intel controls.
- Context console for origin/target routing, relationship, real legality
  feedback, and neutral frontier expansion.
- Operation console for doctrine, commitment, forecast, real attack reason,
  launch, active-front status, and halt.
- Map controls are a compact atlas rail instead of a permanent floating card.
- Field manual and match result surfaces use the same command-console language.
- Obsolete Tailwind CDN styling and old generic card classes were removed from
  the runtime HTML.

## Explicit presentation states

The client derives these presentation states without moving authoritative logic
into the UI:

IDLE, OWN_TERRITORY_SELECTED, NEUTRAL_TERRITORY_SELECTED,
HOSTILE_TERRITORY_SELECTED, LEGAL_ATTACK, ILLEGAL_ATTACK,
ACTIVE_OFFENSIVE, DEFENDING, DISCONNECTED, PLAYER_DEFEATED, MATCH_WON, and
MATCH_ENDED.

The primary operation is singular and contextual. Neutral selection exposes
EXPAND FRONTIER; a valid hostile selection exposes LAUNCH OFFENSIVE; an active
real front exposes HALT OFFENSIVE. Match-end state hides attack controls.

## Mobile UI

- Portrait uses a compact top status strip, 44–48 CSS-pixel quick controls, a
  bottom command surface, and an expandable command deck.
- Landscape uses a compact side-oriented command arrangement so the map keeps
  its height.
- Safe-area insets are respected for top, bottom, left, and right edges.
- The mobile deck contains projection, display mode, and doctrine controls;
  the contextual operation surface remains the single primary attack action.
- Escape closes the mobile deck and help overlay.

## Gameplay

The Phase B authoritative gameplay implementation remains intact:

- attack legality and explicit server results
- progressive conquest and front lifecycle
- cancellation
- deterministic capital relocation
- elimination and victory
- bounded deterministic bots
- reconnect grace

No server, network protocol, topology, world grid, or gameplay dataset was
modified by the UI pass.

## Political / terrain

- Political dirty updates, smoothed presentation, borders, terrain, ocean,
  bathymetry, and LOD architecture were not redesigned.
- Streamed terrain continues to use the canonical relief alpha coastline mask
  and complete visible coverage.

## Performance engineering

- Political upload and dirty-rectangle optimizations remain in place.
- Input listener and reconnect timer cleanup remain in place.
- DEV benchmark remains available through
  window.__DOMINION_BENCHMARK__.start(10000).
- If browser automation is unavailable, DEV F2 opens a copyable benchmark
  panel with 2-second warmup and 10-second sample.
- Live normal-browser FPS was not fabricated; it remains deferred to the
  browser tool limit.

## Client tests

PASS:

- npx tsc --noEmit
- ui_state_structure.test.mjs
- responsive_ui.test.mjs
- interaction.test.mjs
- globe_projection.test.mjs
- lod_presentation.test.mjs
- political-field.test.mjs: 15/15
- political-field-world.test.mjs
- political_transitions.test.mjs
- presentation-a0-regression.test.mjs: 10/10
- presentation-math.test.mjs: 17/17
- political_presentation.test.mjs

The production Vite command reaches TypeScript successfully but is blocked by
the current sandbox at commonjs-resolver spawn EPERM.

## Rust tests

PASS:

- cargo check --all-targets
- cargo test --all-targets: 22 benchmark tests and 25 server tests
- cargo build --bin server

Warnings are existing unused/dead-code warnings; no test or build failure was
observed.

## Frozen hashes

| Asset | SHA-256 |
| --- | --- |
| server/assets/world_grid.bin | EE223110B74F18B661CEF04E41FECA57CDDC9B56204DDFAB23D92C02F6CEEAE5 |
| client/src/assets/world_visual_mask.bin | D2CC53DE50AA872AC1C556D0104532223DE7EA2A9E4479F856B0195B759C6870 |
| client/src/assets/canonical_geography.json | CAE0770B86108A3C45880B94F7B57932CD3635A71640F80D844476F528C3D320 |

All end hashes match the frozen start hashes.

## Files modified by this pass

- client/index.html
- client/src/main.ts
- client/src/ui/dominion.css
- client/src/ui/PlayerHUD.ts
- client/src/ui/AttackPanel.ts
- client/src/ui/CommandUI.ts
- client/src/ui/DebugHUD.ts
- client/tests/responsive_ui.test.mjs
- client/tests/ui_state_structure.test.mjs

## Known implementation blockers

No known code blocker remains in the requested UI/gameplay scope.

Live browser screenshot and normal-browser GPU performance verification remain
environment-deferred, not claimed as completed evidence. Production Vite
bundling is also environment-blocked by sandbox process creation.

## Final engineering verdict

IMPLEMENTATION COMPLETE — LIVE VISUAL QA DEFERRED
