# Dominion of Sol — Gameplay Runtime Audit (Historical Baseline)

> This file preserves the pre-Population baseline for traceability. It is not
> the current gameplay specification. The authoritative migration and runtime
> contracts are `population_strategy_migration.md`,
> `gameplay_population_model.md`, and `final_gameplay_runtime_audit.md`.

Audit date: 2026-08-30. This document records observed current behaviour before Phase B mechanics work.

| System | Current behaviour | Authoritative file / caller | State mutated | Network message | Known defect before Phase B |
| --- | --- | --- | --- | --- | --- |
| Faction initialization | `Simulation::with_seed` creates land cells, deterministically places factions, grows each capital into a compact ~20-cell start, and derives economy. | `server/src/simulation.rs` / `main.rs` on first `player_join` | `cells`, `factions`, strategic sites | `world_snapshot` | No explicit elimination/match state. |
| Player spawn | Browser is always faction `1`; first player join starts one 100-faction match. | `server/src/main.rs` | `MatchRuntime.active_match`, session count | `world_snapshot` | Multiple browser sessions are not distinct human factions. |
| Bot spawn | Factions `2..100` are bots. | `server/src/bot.rs` / main tick | bot counters and normal simulation commands | normal deltas/fronts | Bots prioritize neutral expansion; attack only after neutral frontiers are exhausted. |
| Army / capacity / generation | Capacity = `200 + 5 × territory_count`; reinforcement = `1 + .08 × territory_count + .25 × owned ports`; each 50 ms server tick clamps army to capacity after adding rate × server `dt`. | `simulation.rs::refresh_all_economies`, `step_dt` | `FactionInfo.army`, capacity, recruitment | `faction_update` every 0.5 s | Semantics are real but HUD lacked concise explanation. |
| Land | `territory_count` is number of authoritative land gameplay cells, incremented/decremented in `set_cell_owner`. | `simulation.rs::set_cell_owner` | faction territory count | `faction_update`, snapshot | Capital-loss / zero-land elimination not completed. |
| Neutral expansion | Legal reachable neutral cell is resolved to a frontier anchor; a compact paid patch is acquired. | `process_expand_command` | owners, army, economy, contacts | `expand_result`, deltas, `first_contact` | No explicit eliminated-faction command rejection. |
| Attack request | Requires owned source, hostile land target directly touching attacker, commitment 5–100% and at least 5 committed army. Committed army is immediately removed from attacker pool. | `process_attack_command`, called by `main.rs` and bots | attacker army, canonical pair front | fronts embedded in `cell_delta_batch` | Returns only bool: client cannot explain rejection; active front can be overwritten/recommitted. |
| Combat update | Each tick attrits committed attacker force and defender current army; pressure grows from strength ratio; pressure threshold authorizes a compact four-cell war patch. | `step_wars` | front powers/pressure, defender army, pending captures | fronts and deltas | No terminal reason, halt command, or multi-front reserve safety. |
| Progressive capture | Pending authorized patch is revealed one cell per 0.35 server seconds in deterministic BFS-from-target order. | `advance_pending_war_conquests` | owner, faction land count, dirty delta | `cell_delta_batch` | A front can be invalidated without explicit lifecycle cleanup. |
| Contact/front detection | One canonical front per faction pair stores contact cells and centroid. | `CombatManager::register_contact` | front vector | snapshot / delta fronts | Pair-wide front model does not itself prevent duplicate active orders. |
| Capital handling | If capital cell changes owner, first remaining owned land cell becomes capital. | `set_cell_owner` | capital cell | faction update | No defeated state when no owned land remains; relocation choice is not strategically deterministic. |
| Elimination | Missing. A zero-land faction remains in `factions` and can still have state. | N/A | N/A | N/A | Required for a playable match lifecycle. |
| Victory / match end | Missing. Runtime has only waiting/running phases. | `server/src/main.rs` | N/A | N/A | No authoritative win condition or result UI. |
| Bots | Every 20 server ticks, scans connected owned territory; expands to deterministic neutral target or attacks if own army exceeds enemy army threshold. | `bot.rs::generate_bot_actions` | via normal simulation calls | normal deltas/fronts | Can reissue active pair orders; no eliminated/match-finished guard; no bounded decision cache. |
| Reconnect | Server pauses match while no human is connected for 10 seconds, then destroys it. Rejoin during grace receives current snapshot. | `main.rs` connection/session loop | session/grace counters | `world_snapshot` | Intentional but undocumented; active battle is paused rather than client-predicted. |
| Snapshot / delta | Snapshot includes factions, fronts, sites, all cells. Deltas include ownership/flags and current fronts; faction state is sent every 0.5 seconds. | `protocol.rs`, `main.rs` | client `GameState` | `world_snapshot`, `cell_delta_batch`, `faction_update` | No match-state or attack-result message. |

## Required-answer summary

- Army generation is server-tick based and deterministic; it is not tied to client FPS.
- `Army 320 / 320 +2.9/s` means current available army / capacity, plus server-authoritative reinforcement per second.
- Expansion spends army; attack reserves/spends committed army immediately. Active combat consumes committed attacker power and defender current army.
- Attack strength is committed army. Defense is defender current army. Distance and terrain do not currently affect combat. Front contact is required; the number of frontier cells is not yet a strength factor.
- Captured/lost land changes the authoritative count, then capacity and reinforcement on the next server tick.
- Bots can expand and attack through the simulation API, but their policy requires Phase B hardening.
- The current pairwise front representation permits only one canonical front record per faction pair but does not provide explicit order cancellation or terminal reasons.
- Faction elimination and victory are missing before Phase B.

## Phase B final implementation audit

Audit date: 2026-08-30. The entries below supersede the pre-implementation
defects above and describe the completed authoritative gameplay pass.

| Area | Final behaviour | Evidence |
| --- | --- | --- |
| Attack command | Validates running match, live attacker/defender, owned source, hostile adjacent target, commitment range, and available army. Returns an explicit result with reason, source/target, front, and committed army. | `server/src/simulation.rs`, `server/src/protocol.rs`, `server/src/main.rs`; server tests |
| Offensive safety | An attacker cannot open a second offensive while one of its fronts is active. Bots use the same guard. | `Simulation::process_attack_command`, `bot.rs`; simultaneous-attack tests |
| Cancellation | `CancelAttack` resolves the requested front and returns the committed reserve through authoritative simulation state. | `simulation.rs`, `main.rs`, protocol cancel test |
| Combat | Active fronts consume attacker commitment and defender army, accumulate pressure, and authorize deterministic progressive conquest. Orphaned or invalid fronts terminate with a recorded reason. | `simulation.rs`, `combat.rs`; long headless runs |
| Connectivity | Neutral-hole and defender-connectivity checks preserve valid land components while conquest progresses. | `compact_patch.rs`, `simulation.rs`; invariant checks |
| Capital/elimination | Ownership transfer updates counts; a lost capital relocates deterministically to the best remaining owned cell. Zero land marks a faction eliminated, clears its army, and prevents further commands. | `simulation.rs`; elimination test |
| Match outcome | Match state is Waiting/Running/Finished and winner id is included in snapshot/delta state. | `protocol.rs`, `main.rs`; match outcome test |
| Economy | Capacity remains `200 + 5 × territory`; reinforcement remains `1 + .08 × territory + .25 × owned ports` per second and is advanced by server tick `dt`, independent of client FPS. | `simulation.rs`; cadence test |
| Bots | Deterministic bounded scan every 20 ticks; expands or attacks through normal authoritative APIs; skips dead factions, active offensives, and finished matches. | `bot.rs`; 4,000/20,000-step headless runs |
| Reconnect | Reconnect grace preserves the current server match and snapshot; client reconnect timer and input listeners are deduplicated/cleaned up. | `main.rs`, `GameClient.ts`, `WorldInputController.ts` |

### Final deterministic evidence

- Startup: `seed=42`, 100 factions, 2,000 owned land cells.
- 4,000 steps: `componentViolations=0`, average tick `5.773 ms`, p95
  `35.538 ms`, max `181.493 ms`.
- 20,000 steps: `componentViolations=0`, average tick `8.043 ms`, p95
  `50.435 ms`, max `193.151 ms`.
- Final local server gate: 25 server tests and 22 benchmark tests passed;
  Rust check and server binary build passed.

### Acceptance limits still open

The LOD shader fix is source- and unit-test-verified, but the required live
post-fix Europe/Turkey pan and screenshots were not available after browser
control was rejected by the host usage limit. Normal GPU-browser client FPS is
also unverified; prior in-app measurements are not used as acceptance evidence.
The client TypeScript check passes, while the production Vite build is blocked
by sandbox `spawn EPERM` during the commonjs resolver.

## UI + gameplay completion pass

The product-facing UI was rebuilt without changing authoritative gameplay or
rendering contracts. The client now uses a Dominion command bar, contextual
selection console, active-operation console, compact atlas rail, field manual,
match-result surface, and responsive mobile command deck. Presentation state is
derived explicitly for idle, territory selection, legal/illegal attack,
active/defensive fronts, disconnect, defeat, and match resolution.

Structural client checks cover the new state machine, primary-command
uniqueness, real buttons, focus visibility, safe-area layout, mobile target
size, reduced motion, and removal of the Tailwind CDN dependency. These checks
pass along with the existing political, LOD, globe, and interaction suites.

Engineering verdict: `IMPLEMENTATION COMPLETE — LIVE VISUAL QA DEFERRED`.
