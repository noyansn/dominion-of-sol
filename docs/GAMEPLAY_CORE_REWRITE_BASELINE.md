# Dominion of Sol — Gameplay Core Rewrite: Baseline Audit

**Date:** 2026-09-05  
**Audit Scope:** Server simulation, client command dispatch, state invariants, ownership mutation paths, network protocol, test baseline.  
**Gate Status:** PASSED — Baseline fully understood, all 54 existing server tests verified passing, zero unknown ownership mutation paths discovered.

---

## 1. Subsystem Mapping

### 1.1 Server Simulation Entry Point
- **File:** `server/src/main.rs`
- **Execution Model:** Tokio asynchronous runtime with an authoritative 20 Hz fixed tick loop (`INTERVAL_MS = 50`).
- **Match Lifecycle:** Currently tracks `MatchPhase::WaitingForPlayer`, `Running`, `Finished`.
- **Current Behavior:** Spawns a procedural 101-faction match upon first human join using randomized farthest-point sampling.
- **Replacement:** Implement explicit macro-phases (`EXPANSION_ERA`, `FINAL_FRONTIER`, `WAR_ERA`, `ENDGAME`) and spawn the canonical 44 civilizations (1 human + 43 AI).

### 1.2 Faction & Population State
- **Files:** `server/src/factions.rs`, `server/src/protocol.rs`, `server/src/simulation.rs`
- **State Fields:**
  - `population`: Uncommitted population available for new orders.
  - `deployed_population`: Population currently assigned to active fronts/defense.
  - `total_living_population`: Total surviving population belonging to the faction (`population + deployed_population`).
  - `controlled_area_km2`: Physical area in km² (latitude-corrected).
- **Current Flaws:**
  - Population growth is unconstrained by territorial consolidation ($dP/dt$ increases linearly up to carrying capacity), enabling passive turtling in tiny 5-cell islands.
  - Newly acquired land immediately yields 100% capacity and defense.
  - Procedural names ("Dominion of Sol", "Dominion of Vanguard") instead of canonical civilization identities.
- **Replacement:**
  - Logistic capacity-limited growth: $dP/dt = r \cdot P \cdot (1 - P / K_{\text{effective}})$.
  - Consolidation field per cell ($0.0 \to 1.0$), scaling capacity contribution, defense throughput, and supply reach.

### 1.3 Ownership Mutation Paths (Complete Audit)
Every occurrence of cell ownership mutation in the codebase was audited:
1. `Simulation::set_cell_owner(cell_index, new_owner_id)` (`simulation.rs:200-280`):
   - The single authoritative mutation path.
   - Cleans up displaced defense foci.
   - Updates `cells[idx].owner_id`.
   - Records dirty cell indices and chunks.
   - Updates `territory_count` and `controlled_area_km2` for previous and new owners.
   - Triggers capital relocation if the lost cell was the faction's capital.
   - Cancels pending port construction if underway on that cell.
2. `Simulation::set_cell_owner_silent(cell_index, new_owner_id)` (`simulation.rs:373`):
   - Test-only utility for headless setup; bypasses capital relocation triggers.
3. `Simulation::with_seed` (`simulation.rs:163`):
   - Initial assignment of starting nucleus cells during world generation.
4. `Simulation::eliminate_faction` (`simulation.rs:356`):
   - Sets remnant cells of eliminated faction to 0 (neutral).
5. **Client & AI Check:**
   - Client: strictly receives deltas and updates read-only visual buffers. Zero server writes.
   - AI (`bot.rs`): strictly calls `process_expand_command`, `process_attack_command`, etc. Zero direct `cells[].owner_id` writes.
- **Verdict:** Authoritative ownership mutation is strictly centralized. No rogue or leaked write paths exist.

### 1.4 Neutral Expansion Engine
- **Files:** `server/src/simulation.rs`, `server/src/compact_patch.rs`
- **Current Behavior:**
  - `process_expand_command_with_mode` calls `resolve_expansion_anchor`, which computes a broad capital-to-target dot product across the entire border.
  - Generates a `compact_patch` and immediately claims all cells in 1 tick.
  - Causes the reported defect: clicking west activates large sections of the entire western frontier.
- **Replacement:**
  - Bounded local FOCUS corridors: Target $\to$ best legal frontier anchor $\to$ neutral path $\to$ bounded local expansion corridor.
  - Settler commitment: commits uncommitted Population to active expansion operations; claims cells progressively; survivors demobilize gradually upon completion.
  - FRONTIER mode: finite Population budget divided evenly across legal neutral frontier segments.

### 1.5 War & Front Engine
- **Files:** `server/src/combat.rs`, `server/src/simulation.rs`
- **Current Behavior:**
  - Tracks `FrontSegment` with `deployed_population_a`, `deployed_population_b`, `pressure`.
  - Attacks can be launched immediately upon contact even at second 1 of the game.
  - No frontage limitation: committing 100% force to 1 cell produces near-linear power.
  - Instant defense allocation across continents with no response delay.
- **Replacement:**
  - Macro-phase gate: attacks rejected during `EXPANSION_ERA`.
  - Frontage cap per border cell: excess commitment serves as reserve depth.
  - Centralized combat power calculation in `balance.rs`.
  - Defensive response latency based on distance from core and supply connectivity.

### 1.6 Supply & Encirclement
- **Current State:** Basic distance check from capital or ports; no incremental connectivity graph or progressive isolation degradation.
- **Replacement:**
  - Incremental supply BFS tracking connected controlled territory back to capital or valid ports.
  - Gradual encirclement penalties: cut off reinforcements $\to$ decay cohesion $\to$ reduce combat effectiveness $\to$ collapse pocket.

### 1.7 Capital & Elimination
- **Current State:** 10-second capital relocation timer is implemented in `simulation.rs:400-470`. If original capital is recaptured, relocation cancels; otherwise a provisional capital is assigned.
- **Status:** Architecture is correct; must be integrated with new 44-faction state and macro-phases.

### 1.8 AI System
- **File:** `server/src/bot.rs`
- **Current Behavior:**
  - Simple tick modulo scan (`step_by(97)`) with crude heuristic checks.
  - No persistent strategic state machine.
- **Replacement:**
  - Explicit states: `FOUNDING`, `EXPANDING`, `CONSOLIDATING`, `BORDER_CONTACT`, `PREPARING_WAR`, `ATTACKING`, `DEFENDING`, `RECOVERING`, `ENDGAME`.
  - Same internal command API and finite Population ledger as human players.

### 1.9 Reactions & Bot Emotes
- **Current State:** Server echoes reaction only back to the sender; bots generate zero emotes.
- **Replacement:**
  - Broadcast reaction to all connected peers in match.
  - 8 permanently free classic universal reactions (👍, 😂, 😮, 😢, 😡, 👏, 👀, 😎).
  - Event-driven bot reactions: 90-180s cooldown, global budget (1 per 8-12s), 2% premium rule matching assigned civilization identity.

### 1.10 Civilization Metadata
- **Client Manifest:** `client/src/meta/CivilizationAtlas.ts` defines 44 canonical civilizations across 11 macro-regions with complete heraldry and zero-sum doctrine modifiers.
- **Server State:** Currently missing the 44 definitions; relies on 8 generic presets.
- **Replacement:** Port the 44 canonical civilizations to `server/src/civilizations.rs`.

---

## 2. Test Baseline Verification

- **Rust Server Tests (`cargo test`):**
  - Toolchain: `stable-x86_64-pc-windows-msvc` (MSVC toolchain active).
  - Result: **54 passed; 0 failed; 0 ignored**.
- **Client TypeScript Tests:**
  - `tests/civilization_atlas_roster.test.ts`: **7/7 passed** (verified 44 civs, unique IDs, traits, zero-sum doctrines, generic 'turk' removed).
  - `tests/political-field.test.mjs`: **15/15 passed** (verified smoothing, boundary preservation, water ownership = 0).
  - `tests/political_presentation.test.mjs`: **Passed** (0 mismatches).
  - `tests/ui_state_structure.test.mjs`: **Passed**.
  - `tests/target_picking.test.mjs`: **Passed**.
  - `tests/coast_mapping.test.mjs`: **Passed**.

---

## 3. Acceptance Gate Checklist

- [x] Baseline architecture fully mapped.
- [x] Ownership mutation paths audited; verified 100% authoritative server control.
- [x] Existing tests pass without regression.
- [x] All 44 canonical civilizations identified.
- [x] Gate passed — Ready for Task 2 (Authoritative State Model).
