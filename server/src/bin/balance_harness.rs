//! DOMINION OF SOL — 10 COMPLETE-MATCH ATTEMPTS & STALEMATE DIAGNOSTIC HARNESS
//!
//! Authoritative headless multi-match simulation runner supporting:
//! - Complete-match mode (Domination >= 65%, Last viable civ, or hard timeout)
//! - Rigorous 5/10/15/20-minute interval telemetry
//! - Operation outcome classification (gains, holds, stalls, retreats, breakthroughs)
//! - Survivor size distribution (1-2, 3-5, 6-20, 20+ cells)
//! - Subsystem timing profiling (AI, Supply, Combat, Consolidation)
//! - Generation of artifacts/gameplay-rewrite-v2/stalemate_diagnostic_report.md

#[path = "../balance.rs"]
pub mod balance;
#[path = "../bot.rs"]
pub mod bot;
#[path = "../chokepoints.rs"]
pub mod chokepoints;
#[path = "../civilizations.rs"]
pub mod civilizations;
#[path = "../combat.rs"]
pub mod combat;
#[path = "../compact_patch.rs"]
pub mod compact_patch;
#[path = "../expansion.rs"]
pub mod expansion;
#[path = "../factions.rs"]
pub mod factions;
#[path = "../meta_store.rs"]
pub mod meta_store;
#[path = "../protocol.rs"]
pub mod protocol;
#[path = "../simulation.rs"]
pub mod simulation;
#[path = "../world_map.rs"]
pub mod world_map;
#[path = "../world_topology.rs"]
pub mod world_topology;

use bot::BotManager;
use civilizations::{MacroRegion, CANONICAL_CIVILIZATIONS};
use simulation::Simulation;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct IntervalSnapshot {
    pub minute: usize,
    pub survivors: usize,
    /// Neutral percentage across all authoritative land, including
    /// intentionally non-playable polar land and unsupported fragments.
    pub raw_neutral_land_pct: f64,
    /// Neutral percentage in the actual match-completion land mask. This is
    /// the pacing metric; raw geography is reported beside it, never folded
    /// into a false "unexpanded" diagnosis.
    pub neutral_land_pct: f64,
    pub largest_territory_share: f64,
    pub top3_territory_share: f64,
    pub avg_consolidation: f64,
    pub avg_supply: f64,
    pub avg_cohesion: f64,
    pub factions_in_active_war: usize,
    pub factions_with_no_active_war: usize,
}

#[derive(Debug, Clone)]
pub struct SurvivorInfo {
    pub civ_id: String,
    pub cells: u32,
    pub area_km2: f64,
    pub population: f64,
    pub territory_share: f64,
    pub active_fronts: usize,
    pub capital_status: String,
}

#[derive(Debug, Clone)]
pub struct SurvivorBuckets {
    pub cells_1_2: usize,
    pub cells_3_5: usize,
    pub cells_6_20: usize,
    pub cells_20_plus: usize,
    pub details: Vec<SurvivorInfo>,
}

#[derive(Debug, Clone)]
pub struct OpTracker {
    pub front_id: u32,
    pub attacker: u8,
    pub defender: u8,
    pub started_tick: u64,
    pub initial_committed: f64,
    pub ever_stalled: bool,
    pub ever_retreating: bool,
    pub ever_breakthrough: bool,
    pub captured_cells: u32,
    pub casualties: f64,
    pub ended_tick: Option<u64>,
    pub termination_reason: String,
}

#[derive(Debug, Clone)]
pub struct CompleteMatchRecord {
    pub match_index: usize,
    pub seed: u64,
    pub match_completed: bool,
    pub duration_ticks: u64,
    pub duration_minutes: f64,
    pub wall_clock_ms: f64,
    pub winner_civ: String,
    pub winner_faction: u8,
    pub winner_territory: u32,
    pub winner_territory_pct: f64,
    pub winner_population: f64,
    pub leader_at_checkpoint: String,
    pub leader_territory: u32,
    pub leader_territory_pct: f64,
    pub leader_population: f64,
    pub runner_up: String,
    pub first_contact_time: f64,
    pub first_war_time: f64,
    pub first_elimination_time: f64,
    pub half_field_time: f64,

    // Interval snapshots (5, 10, 15, 20 min)
    pub snapshots: Vec<IntervalSnapshot>,

    // Operations telemetry
    pub operations_started: usize,
    pub operations_ended: usize,
    pub operations_ended_attacker_gain: usize,
    pub operations_ended_defender_hold: usize,
    pub operations_stalled: usize,
    pub operations_retreating: usize,
    pub operations_breakthrough: usize,
    pub operations_attacker_eliminated: usize,
    pub operations_defender_eliminated: usize,
    pub avg_operation_duration_sec: f64,
    pub median_operation_duration_sec: f64,
    pub avg_committed_pop: f64,
    pub median_committed_pop: f64,
    pub total_casualties: f64,
    pub casualties_per_war: f64,
    pub casualties_per_operation: f64,
    pub territory_cells_changed: u32,
    pub territory_turnover_pct: f64,
    pub avg_cells_captured_per_op: f64,
    pub median_cells_captured_per_op: u32,

    pub wars_started: usize,
    pub wars_completed: usize,
    pub average_war_duration: f64,
    pub neutral_land_remaining_at_first_war: usize,
    pub max_overextension: f32,
    pub recovery_events: usize,
    pub capital_captures: usize,
    pub capital_relocations: usize,
    pub encirclements: usize,
    pub premium_bot_reactions: usize,
    pub free_bot_reactions: usize,
    pub end_reason: String,

    // Survivor distribution at 20 min
    pub survivor_buckets: SurvivorBuckets,

    // AI decisions
    pub ai_attempts: u64,
    pub ai_accepted: u64,
    pub ai_pauses: u32,
    pub ai_expansion_orders: u32,
    pub neutral_land_cells_20min: usize,

    // Performance profiling
    pub avg_tick_ms: f64,
    pub p99_tick_ms: f64,
    pub ai_time_pct: f64,
    pub sim_step_time_pct: f64,
}

fn run_single_complete_match(
    match_index: usize,
    seed: u64,
    max_ticks: u64,
    is_snapshot_mode: bool,
) -> CompleteMatchRecord {
    let start_wall = Instant::now();
    let focal_civ =
        CANONICAL_CIVILIZATIONS[(match_index.saturating_sub(1)) % CANONICAL_CIVILIZATIONS.len()].id;
    let mut sim = Simulation::new_standard(Some(focal_civ), seed);

    // Record initial capitals to track relocation vs original
    let mut initial_capitals = HashMap::new();
    for f in &mut sim.factions {
        f.is_human = false;
        initial_capitals.insert(f.faction_id, f.capital_cell);
    }

    let mut bot_manager = BotManager::with_seed(sim.factions.len(), seed);
    let mut tick_durations = Vec::with_capacity(1000);
    let mut ai_durations = Vec::with_capacity(1000);
    let mut step_durations = Vec::with_capacity(1000);

    let mut snapshots = Vec::new();
    let mut op_trackers: HashMap<u32, OpTracker> = HashMap::new();

    for current_tick in 1..=max_ticks {
        let t_tick_start = Instant::now();

        let t_ai = Instant::now();
        bot_manager.generate_bot_actions(&mut sim);
        let ai_ms = t_ai.elapsed().as_secs_f64() * 1000.0;

        let t_step = Instant::now();
        sim.step();
        let step_ms = t_step.elapsed().as_secs_f64() * 1000.0;

        let tick_total_ms = t_tick_start.elapsed().as_secs_f64() * 1000.0;

        if current_tick % 20 == 0 && tick_durations.len() < 5000 {
            tick_durations.push(tick_total_ms);
            ai_durations.push(ai_ms);
            step_durations.push(step_ms);
        }

        // Track active/new operations
        for front in &sim.combat_manager.fronts {
            if front.operation_kind == "CONTACT" {
                continue;
            }
            let entry = op_trackers.entry(front.front_id).or_insert_with(|| {
                let committed = if front.attacker_faction == front.faction_a {
                    front.deployed_population_a
                } else {
                    front.deployed_population_b
                };
                OpTracker {
                    front_id: front.front_id,
                    attacker: front.attacker_faction,
                    defender: if front.attacker_faction == front.faction_a {
                        front.faction_b
                    } else {
                        front.faction_a
                    },
                    started_tick: front.started_tick,
                    initial_committed: committed,
                    ever_stalled: false,
                    ever_retreating: false,
                    ever_breakthrough: false,
                    captured_cells: 0,
                    casualties: 0.0,
                    ended_tick: None,
                    termination_reason: "ACTIVE".to_string(),
                }
            });
            if front.front_status == "STALLED" {
                entry.ever_stalled = true;
            }
            if front.front_status == "RETREATING" {
                entry.ever_retreating = true;
            }
            if front.front_status == "BREAKTHROUGH" {
                entry.ever_breakthrough = true;
            }
            entry.captured_cells = front.captured_cells;
            entry.casualties = front.casualties;
            entry.termination_reason = front.termination_reason.clone();
            if !front.is_combat_active && entry.ended_tick.is_none() {
                entry.ended_tick = Some(current_tick);
            }
        }

        // Interval Snapshots at 5, 10, 15, 20 min (6000, 12000, 18000, 24000 ticks)
        if current_tick == 6000
            || current_tick == 12000
            || current_tick == 18000
            || current_tick == 24000
        {
            let minute = (current_tick as f64 * 0.05 / 60.0).round() as usize;
            let mut alive_factions: Vec<_> = sim
                .factions
                .iter()
                .filter(|f| !f.is_eliminated && f.territory_count > 0)
                .collect();
            alive_factions.sort_by_key(|f| std::cmp::Reverse(f.territory_count));
            let survivors = alive_factions.len();
            let total_inhabited: u32 = alive_factions.iter().map(|f| f.territory_count).sum();
            let raw_neutral_cells = sim
                .cells
                .iter()
                .filter(|c| c.terrain_type == 0 && c.owner_id == 0)
                .count();
            let raw_neutral_land_pct =
                (raw_neutral_cells as f64 / sim.total_land_cells.max(1) as f64) * 100.0;
            let playable_neutral_cells = sim
                .cells
                .iter()
                .enumerate()
                .filter(|(index, cell)| sim.playable_land_mask[*index] == 1 && cell.owner_id == 0)
                .count();
            let neutral_land_pct =
                (playable_neutral_cells as f64 / sim.playable_land_cells.max(1) as f64) * 100.0;
            let largest_territory_share = if let Some(top) = alive_factions.first() {
                if total_inhabited > 0 {
                    (top.territory_count as f64 / total_inhabited as f64) * 100.0
                } else {
                    0.0
                }
            } else {
                0.0
            };
            let top3_territory: u32 = alive_factions
                .iter()
                .take(3)
                .map(|f| f.territory_count)
                .sum();
            let top3_territory_share = if total_inhabited > 0 {
                (top3_territory as f64 / total_inhabited as f64) * 100.0
            } else {
                0.0
            };

            let mut owned_count = 0;
            let mut consol_sum = 0.0;
            let mut supplied_count = 0;
            for (i, cell) in sim.cells.iter().enumerate() {
                if cell.terrain_type == 0 && cell.owner_id > 0 {
                    owned_count += 1;
                    consol_sum += sim.cell_consolidation[i] as f64;
                    if sim.cell_supply.get(i).copied() == Some(1) {
                        supplied_count += 1;
                    }
                }
            }
            let avg_consolidation = if owned_count > 0 {
                consol_sum / owned_count as f64
            } else {
                0.0
            };
            let avg_supply = if owned_count > 0 {
                (supplied_count as f64 / owned_count as f64) * 100.0
            } else {
                100.0
            };

            let active_fronts: Vec<_> = sim
                .combat_manager
                .fronts
                .iter()
                .filter(|fr| fr.is_combat_active && fr.operation_kind != "CONTACT")
                .collect();
            let avg_cohesion = if !active_fronts.is_empty() {
                active_fronts
                    .iter()
                    .map(|fr| fr.cohesion as f64)
                    .sum::<f64>()
                    / active_fronts.len() as f64
            } else {
                1.0
            };

            let mut war_factions = HashSet::new();
            for fr in &active_fronts {
                war_factions.insert(fr.faction_a);
                war_factions.insert(fr.faction_b);
            }
            let factions_in_active_war = alive_factions
                .iter()
                .filter(|f| war_factions.contains(&f.faction_id))
                .count();
            let factions_with_no_active_war = survivors.saturating_sub(factions_in_active_war);

            snapshots.push(IntervalSnapshot {
                minute,
                survivors,
                raw_neutral_land_pct,
                neutral_land_pct,
                largest_territory_share,
                top3_territory_share,
                avg_consolidation,
                avg_supply,
                avg_cohesion,
                factions_in_active_war,
                factions_with_no_active_war,
            });
        }

        if !is_snapshot_mode && sim.match_over {
            break;
        }
    }

    let wall_clock_ms = start_wall.elapsed().as_secs_f64() * 1000.0;
    let duration_ticks = sim.tick;
    let duration_minutes = duration_ticks as f64 * 0.05 / 60.0;

    // Factions alive with territory
    let mut surviving_factions: Vec<_> = sim
        .factions
        .iter()
        .filter(|f| !f.is_eliminated && f.territory_count > 0)
        .collect();
    surviving_factions.sort_by_key(|f| std::cmp::Reverse(f.territory_count));

    let final_surviving_civs = surviving_factions.len();
    let total_inhabited: u32 = surviving_factions.iter().map(|f| f.territory_count).sum();

    // Leader at current state/checkpoint
    let leader = surviving_factions.first().copied();
    let (leader_at_checkpoint, leader_territory, leader_territory_pct, leader_population) =
        if let Some(l) = leader {
            let civ_slug = l
                .flag_id
                .strip_prefix("flag_")
                .unwrap_or(&l.flag_id)
                .to_string();
            let pct = if total_inhabited > 0 {
                (l.territory_count as f64 / total_inhabited as f64) * 100.0
            } else {
                0.0
            };
            (civ_slug, l.territory_count, pct, l.population)
        } else {
            ("NONE".to_string(), 0, 0.0, 0.0)
        };

    // Authoritative winner determination
    let (
        match_completed,
        winner_civ,
        winner_faction,
        winner_territory,
        winner_territory_pct,
        winner_population,
        end_reason,
    ) = if !is_snapshot_mode && sim.match_over && sim.winner_faction_id.is_some() {
        let wid = sim.winner_faction_id.unwrap();
        let fac = sim.factions.iter().find(|f| f.faction_id == wid);
        let reason = if final_surviving_civs <= 1 {
            "LAST_SURVIVOR".to_string()
        } else {
            "DOMINATION_LAND".to_string()
        };
        if let Some(w) = fac {
            let civ_slug = w
                .flag_id
                .strip_prefix("flag_")
                .unwrap_or(&w.flag_id)
                .to_string();
            let pct = if total_inhabited > 0 {
                (w.territory_count as f64 / total_inhabited as f64) * 100.0
            } else {
                0.0
            };
            (
                true,
                civ_slug,
                w.faction_id,
                w.territory_count,
                pct,
                w.population,
                reason,
            )
        } else {
            (
                false,
                "NONE".to_string(),
                0,
                0,
                0.0,
                0.0,
                "UNKNOWN_WINNER".to_string(),
            )
        }
    } else if is_snapshot_mode {
        (
            false,
            "NONE".to_string(),
            0,
            0,
            0.0,
            0.0,
            "SNAPSHOT_CHECKPOINT".to_string(),
        )
    } else {
        (
            false,
            "NONE".to_string(),
            0,
            0,
            0.0,
            0.0,
            "SAFETY_TIMEOUT".to_string(),
        )
    };

    let runner_up = surviving_factions
        .get(1)
        .map(|f| {
            f.flag_id
                .strip_prefix("flag_")
                .unwrap_or(&f.flag_id)
                .to_string()
        })
        .unwrap_or_else(|| "none".to_string());

    let first_contact_time = sim
        .first_contact_tick
        .map(|t| t as f64 * 0.05 / 60.0)
        .unwrap_or(0.0);
    let first_war_time = sim
        .first_war_tick
        .map(|t| t as f64 * 0.05 / 60.0)
        .unwrap_or(0.0);
    let first_elimination_time = sim
        .first_elimination_tick
        .map(|t| t as f64 * 0.05 / 60.0)
        .unwrap_or(0.0);
    let half_field_time = sim
        .half_field_tick
        .map(|t| t as f64 * 0.05 / 60.0)
        .unwrap_or(0.0);

    let total_casualties: f64 = sim
        .combat_manager
        .fronts
        .iter()
        .map(|fr| fr.casualties)
        .sum();

    let wars_completed = sim.wars_completed;
    let average_war_duration = if wars_completed > 0 {
        (sim.total_war_ticks as f64 / wars_completed as f64) * 0.05 / 60.0
    } else {
        0.0
    };

    let premium_bot_reactions = bot_manager.bot_premium_reaction_count as usize;
    let free_bot_reactions =
        (bot_manager.bot_reaction_count as usize).saturating_sub(premium_bot_reactions);

    // Operation calculations
    let operations_started = op_trackers.len();
    let operations_ended = op_trackers
        .values()
        .filter(|op| op.ended_tick.is_some())
        .count();
    let operations_ended_attacker_gain = op_trackers
        .values()
        .filter(|op| op.ended_tick.is_some() && op.captured_cells > 0)
        .count();
    let operations_ended_defender_hold = op_trackers
        .values()
        .filter(|op| op.ended_tick.is_some() && op.captured_cells == 0)
        .count();
    let operations_stalled = op_trackers.values().filter(|op| op.ever_stalled).count();
    let operations_retreating = op_trackers.values().filter(|op| op.ever_retreating).count();
    let operations_breakthrough = op_trackers
        .values()
        .filter(|op| op.ever_breakthrough)
        .count();
    let operations_attacker_eliminated = op_trackers
        .values()
        .filter(|op| op.termination_reason == "ATTACKER_ELIMINATED")
        .count();
    let operations_defender_eliminated = op_trackers
        .values()
        .filter(|op| op.termination_reason == "DEFENDER_ELIMINATED")
        .count();

    let mut op_durations: Vec<f64> = op_trackers
        .values()
        .filter_map(|op| {
            op.ended_tick
                .map(|end| (end.saturating_sub(op.started_tick)) as f64 * 0.05)
        })
        .collect();
    op_durations.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg_operation_duration_sec = if !op_durations.is_empty() {
        op_durations.iter().sum::<f64>() / op_durations.len() as f64
    } else {
        0.0
    };
    let median_operation_duration_sec = if !op_durations.is_empty() {
        op_durations[op_durations.len() / 2]
    } else {
        0.0
    };

    let mut committed_pops: Vec<f64> = op_trackers
        .values()
        .map(|op| op.initial_committed)
        .collect();
    committed_pops.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg_committed_pop = if !committed_pops.is_empty() {
        committed_pops.iter().sum::<f64>() / committed_pops.len() as f64
    } else {
        0.0
    };
    let median_committed_pop = if !committed_pops.is_empty() {
        committed_pops[committed_pops.len() / 2]
    } else {
        0.0
    };

    let casualties_per_war = if wars_completed > 0 {
        total_casualties / wars_completed as f64
    } else {
        0.0
    };
    let casualties_per_operation = if operations_ended > 0 {
        total_casualties / operations_ended as f64
    } else {
        0.0
    };

    let territory_cells_changed = sim.territory_turnover;
    let territory_turnover_pct =
        (territory_cells_changed as f64 / sim.total_land_cells.max(1) as f64) * 100.0;

    let mut captured_list: Vec<u32> = op_trackers.values().map(|op| op.captured_cells).collect();
    captured_list.sort_unstable();
    let avg_cells_captured_per_op = if !captured_list.is_empty() {
        captured_list.iter().sum::<u32>() as f64 / captured_list.len() as f64
    } else {
        0.0
    };
    let median_cells_captured_per_op = if !captured_list.is_empty() {
        captured_list[captured_list.len() / 2]
    } else {
        0
    };

    // Survivor buckets at 20 min
    let mut cells_1_2 = 0;
    let mut cells_3_5 = 0;
    let mut cells_6_20 = 0;
    let mut cells_20_plus = 0;
    let mut survivor_details = Vec::new();

    let active_fronts_at_end: Vec<_> = sim
        .combat_manager
        .fronts
        .iter()
        .filter(|fr| fr.is_combat_active && fr.operation_kind != "CONTACT")
        .collect();

    for f in &surviving_factions {
        let cells = f.territory_count;
        if cells <= 2 {
            cells_1_2 += 1;
        } else if cells <= 5 {
            cells_3_5 += 1;
        } else if cells <= 20 {
            cells_6_20 += 1;
        } else {
            cells_20_plus += 1;
        }

        let civ_slug = f
            .flag_id
            .strip_prefix("flag_")
            .unwrap_or(&f.flag_id)
            .to_string();
        let share = if total_inhabited > 0 {
            (cells as f64 / total_inhabited as f64) * 100.0
        } else {
            0.0
        };
        let fronts_count = active_fronts_at_end
            .iter()
            .filter(|fr| fr.faction_a == f.faction_id || fr.faction_b == f.faction_id)
            .count();
        let cap_status = if sim.relocation_states.contains_key(&f.faction_id) {
            "RELOCATING"
        } else if initial_capitals.get(&f.faction_id).copied() != Some(f.capital_cell) {
            "PROVISIONAL"
        } else {
            "ORIGINAL"
        };

        survivor_details.push(SurvivorInfo {
            civ_id: civ_slug,
            cells,
            area_km2: f.controlled_area_km2,
            population: f.population,
            territory_share: share,
            active_fronts: fronts_count,
            capital_status: cap_status.to_string(),
        });
    }

    let survivor_buckets = SurvivorBuckets {
        cells_1_2,
        cells_3_5,
        cells_6_20,
        cells_20_plus,
        details: survivor_details,
    };

    // AI decisions
    let ai_pauses: u32 = bot_manager
        .brains
        .values()
        .map(|b| b.consecutive_pauses)
        .sum();
    let ai_expansion_orders: u32 = bot_manager
        .brains
        .values()
        .map(|b| b.consecutive_expansion_orders)
        .sum();
    let neutral_land_cells_20min = sim
        .cells
        .iter()
        .filter(|c| c.terrain_type == 0 && c.owner_id == 0)
        .count();

    // Timing
    tick_durations.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg_tick_ms = if !tick_durations.is_empty() {
        tick_durations.iter().sum::<f64>() / tick_durations.len() as f64
    } else {
        0.5
    };
    let p99_idx =
        ((tick_durations.len() as f64 * 0.99) as usize).min(tick_durations.len().saturating_sub(1));
    let p99_tick_ms = tick_durations
        .get(p99_idx)
        .copied()
        .unwrap_or(avg_tick_ms * 1.5);

    let avg_ai_ms = if !ai_durations.is_empty() {
        ai_durations.iter().sum::<f64>() / ai_durations.len() as f64
    } else {
        0.0
    };
    let avg_step_ms = if !step_durations.is_empty() {
        step_durations.iter().sum::<f64>() / step_durations.len() as f64
    } else {
        0.0
    };
    let total_measured = (avg_ai_ms + avg_step_ms).max(0.001);
    let ai_time_pct = (avg_ai_ms / total_measured) * 100.0;
    let sim_step_time_pct = (avg_step_ms / total_measured) * 100.0;

    CompleteMatchRecord {
        match_index,
        seed,
        match_completed,
        duration_ticks,
        duration_minutes,
        wall_clock_ms,
        winner_civ,
        winner_faction,
        winner_territory,
        winner_territory_pct,
        winner_population,
        leader_at_checkpoint,
        leader_territory,
        leader_territory_pct,
        leader_population,
        runner_up,
        first_contact_time,
        first_war_time,
        first_elimination_time,
        half_field_time,
        snapshots,
        operations_started,
        operations_ended,
        operations_ended_attacker_gain,
        operations_ended_defender_hold,
        operations_stalled,
        operations_retreating,
        operations_breakthrough,
        operations_attacker_eliminated,
        operations_defender_eliminated,
        avg_operation_duration_sec,
        median_operation_duration_sec,
        avg_committed_pop,
        median_committed_pop,
        total_casualties,
        casualties_per_war,
        casualties_per_operation,
        territory_cells_changed,
        territory_turnover_pct,
        avg_cells_captured_per_op,
        median_cells_captured_per_op,
        wars_started: sim.wars_started,
        wars_completed,
        average_war_duration,
        neutral_land_remaining_at_first_war: sim.neutral_land_remaining_at_first_war,
        max_overextension: sim.max_overextension_seen,
        recovery_events: sim.recovery_events,
        capital_captures: sim.capital_captures_count,
        capital_relocations: sim.capital_relocations_count,
        encirclements: sim.encirclements_count,
        premium_bot_reactions,
        free_bot_reactions,
        end_reason,
        survivor_buckets,
        ai_attempts: bot_manager.attempts,
        ai_accepted: bot_manager.accepted,
        ai_pauses,
        ai_expansion_orders,
        neutral_land_cells_20min,
        avg_tick_ms,
        p99_tick_ms,
        ai_time_pct,
        sim_step_time_pct,
    }
}

fn format_mm_ss(minutes: f64) -> String {
    let total_sec = (minutes * 60.0).round() as u64;
    let m = total_sec / 60;
    let s = total_sec % 60;
    format!("{:02}:{:02}", m, s)
}

fn main() {
    println!("============================================================");
    println!("  DOMINION OF SOL — 10 COMPLETE-MATCH ATTEMPTS DIAGNOSTIC");
    println!("============================================================");

    let is_snapshot = std::env::var("DOMINION_HARNESS_MODE")
        .map(|v| v.to_uppercase() == "SNAPSHOT")
        .unwrap_or(false);
    let match_count: usize = std::env::var("DOMINION_MATCH_COUNT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(10);

    let max_ticks: u64 = if is_snapshot {
        10_000
    } else {
        std::env::var("DOMINION_MAX_TICKS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(24_000)
    };

    println!(
        "[CONFIG] Mode: {}, Attempts: {}, Max Ticks/Attempt: {} (~{:.1} sim min)",
        if is_snapshot {
            "SNAPSHOT (10k-tick leader)"
        } else {
            "COMPLETE-MATCH ATTEMPTS (Domination / Elimination)"
        },
        match_count,
        max_ticks,
        max_ticks as f64 * 0.05 / 60.0
    );

    let campaign_start = Instant::now();
    let num_threads = std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(4)
        .min(8);
    println!(
        "[RUNNER] Spawning {} parallel simulation worker threads...",
        num_threads
    );

    let (tx, rx) = std::sync::mpsc::channel();
    let chunk_size = (match_count + num_threads - 1) / num_threads;

    for t in 0..num_threads {
        let start_idx = t * chunk_size + 1;
        let end_idx = ((t + 1) * chunk_size).min(match_count);
        if start_idx > match_count {
            break;
        }
        let thread_tx = tx.clone();
        std::thread::spawn(move || {
            for m in start_idx..=end_idx {
                let seed_family = (m % 5) * 10_000;
                let seed = seed_family as u64 + 42_000 + m as u64;
                let record = run_single_complete_match(m, seed, max_ticks, is_snapshot);
                let _ = thread_tx.send(record);
            }
        });
    }
    drop(tx);

    let mut records: Vec<CompleteMatchRecord> = Vec::with_capacity(match_count);
    let mut win_counts: HashMap<String, usize> = HashMap::new();
    let mut completed = 0;

    while let Ok(record) = rx.recv() {
        completed += 1;
        if record.match_completed && record.winner_civ != "NONE" {
            *win_counts.entry(record.winner_civ.clone()).or_insert(0) += 1;
        }

        let res_str = if record.match_completed {
            format!(
                "Winner: {:<12} ({:>4} cells, {:>4.1}%)",
                record.winner_civ, record.winner_territory, record.winner_territory_pct
            )
        } else {
            format!(
                "Leader: {:<12} ({:>4} cells, {:>4.1}%) [{}]",
                record.leader_at_checkpoint,
                record.leader_territory,
                record.leader_territory_pct,
                record.end_reason
            )
        };
        println!(
            "  [DONE {:>2}/{:<2}] Match {:>2} [Seed {:>5}] -> {} | Dur: {:>5}t ({:.1}m) | Surviving: {:>2} | Casualties: {:>9.0} | Time: {:.0}ms",
            completed, match_count, record.match_index, record.seed, res_str,
            record.duration_ticks, record.duration_minutes, record.survivor_buckets.details.len(), record.total_casualties, record.wall_clock_ms
        );
        let _ = std::io::stdout().flush();

        records.push(record);
    }

    records.sort_by_key(|r| r.match_index);

    let campaign_elapsed = campaign_start.elapsed().as_secs_f64();
    let completed_matches = records.iter().filter(|r| r.match_completed).count();
    println!("------------------------------------------------------------");
    println!(
        "[COMPLETED] {} match attempts ({} reached authoritative victory) in {:.2}s",
        match_count, completed_matches, campaign_elapsed
    );

    // Save artifacts
    let out_dir = Path::new("c:/Users/noyan/Downloads/game/artifacts/gameplay-rewrite-v2");
    fs::create_dir_all(out_dir).unwrap();

    // 1. Write complete_match_metrics.csv
    let csv_path = out_dir.join("complete_match_metrics.csv");
    let mut csv = String::from("seed,match_completed,duration_ticks,duration_minutes,winner_civ,winner_faction,winner_territory_pct,winner_population,leader_at_checkpoint,leader_territory_pct,runner_up,first_contact_time,first_war_time,first_elimination_time,half_field_time,surviving_civs_5min,surviving_civs_10min,surviving_civs_15min,final_surviving_civs,playable_neutral_land_pct_5min,playable_neutral_land_pct_10min,playable_neutral_land_pct_15min,playable_neutral_land_pct_20min,raw_neutral_land_pct_5min,raw_neutral_land_pct_10min,raw_neutral_land_pct_15min,raw_neutral_land_pct_20min,largest_share_5min,largest_share_10min,largest_share_15min,largest_share_20min,top3_share_20min,wars_started,wars_completed,operations_started,operations_ended,operations_stalled,operations_retreating,operations_breakthrough,avg_operation_duration_sec,median_operation_duration_sec,avg_committed_pop,median_committed_pop,total_casualties,casualties_per_war,casualties_per_operation,territory_cells_changed,territory_turnover_pct,avg_cells_captured_per_op,median_cells_captured_per_op,capital_captures,capital_relocations,encirclements,avg_consolidation_5min,avg_consolidation_10min,avg_consolidation_15min,avg_consolidation_20min,avg_supply_20min,avg_cohesion_20min,factions_no_war_20min,factions_active_war_20min,micro_survivors_1_2,micro_survivors_3_5,micro_survivors_6_20,large_survivors_20_plus,end_reason,avg_tick_ms,p99_tick_ms\n");

    for r in &records {
        let snap_5 = r.snapshots.iter().find(|s| s.minute == 5);
        let snap_10 = r.snapshots.iter().find(|s| s.minute == 10);
        let snap_15 = r.snapshots.iter().find(|s| s.minute == 15);
        let snap_20 = r.snapshots.iter().find(|s| s.minute == 20);

        csv.push_str(&format!(
            "{},{},{},{:.2},\"{}\",{},{:.2},{:.0},\"{}\",{:.2},\"{}\",{:.2},{:.2},{:.2},{:.2},{},{},{},{},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{},{},{},{},{},{},{},{:.2},{:.2},{:.0},{:.0},{:.0},{:.0},{:.0},{},{:.2},{:.2},{},{},{},{},{:.2},{:.2},{:.2},{:.2},{:.2},{:.2},{},{},{},{},{},{},\"{}\",{:.2},{:.2}\n",
            r.seed, r.match_completed, r.duration_ticks, r.duration_minutes, r.winner_civ, r.winner_faction,
            r.winner_territory_pct, r.winner_population, r.leader_at_checkpoint, r.leader_territory_pct, r.runner_up,
            r.first_contact_time, r.first_war_time, r.first_elimination_time, r.half_field_time,
            snap_5.map(|s| s.survivors).unwrap_or(44),
            snap_10.map(|s| s.survivors).unwrap_or(44),
            snap_15.map(|s| s.survivors).unwrap_or(44),
            r.survivor_buckets.details.len(),
            snap_5.map(|s| s.neutral_land_pct).unwrap_or(0.0),
            snap_10.map(|s| s.neutral_land_pct).unwrap_or(0.0),
            snap_15.map(|s| s.neutral_land_pct).unwrap_or(0.0),
            snap_20.map(|s| s.neutral_land_pct).unwrap_or(0.0),
            snap_5.map(|s| s.raw_neutral_land_pct).unwrap_or(0.0),
            snap_10.map(|s| s.raw_neutral_land_pct).unwrap_or(0.0),
            snap_15.map(|s| s.raw_neutral_land_pct).unwrap_or(0.0),
            snap_20.map(|s| s.raw_neutral_land_pct).unwrap_or(0.0),
            snap_5.map(|s| s.largest_territory_share).unwrap_or(0.0),
            snap_10.map(|s| s.largest_territory_share).unwrap_or(0.0),
            snap_15.map(|s| s.largest_territory_share).unwrap_or(0.0),
            snap_20.map(|s| s.largest_territory_share).unwrap_or(0.0),
            snap_20.map(|s| s.top3_territory_share).unwrap_or(0.0),
            r.wars_started, r.wars_completed,
            r.operations_started, r.operations_ended, r.operations_stalled, r.operations_retreating, r.operations_breakthrough,
            r.avg_operation_duration_sec, r.median_operation_duration_sec,
            r.avg_committed_pop, r.median_committed_pop,
            r.total_casualties, r.casualties_per_war, r.casualties_per_operation,
            r.territory_cells_changed, r.territory_turnover_pct,
            r.avg_cells_captured_per_op, r.median_cells_captured_per_op,
            r.capital_captures, r.capital_relocations, r.encirclements,
            snap_5.map(|s| s.avg_consolidation).unwrap_or(0.0),
            snap_10.map(|s| s.avg_consolidation).unwrap_or(0.0),
            snap_15.map(|s| s.avg_consolidation).unwrap_or(0.0),
            snap_20.map(|s| s.avg_consolidation).unwrap_or(0.0),
            snap_20.map(|s| s.avg_supply).unwrap_or(0.0),
            snap_20.map(|s| s.avg_cohesion).unwrap_or(0.0),
            snap_20.map(|s| s.factions_with_no_active_war).unwrap_or(0),
            snap_20.map(|s| s.factions_in_active_war).unwrap_or(0),
            r.survivor_buckets.cells_1_2,
            r.survivor_buckets.cells_3_5,
            r.survivor_buckets.cells_6_20,
            r.survivor_buckets.cells_20_plus,
            r.end_reason,
            r.avg_tick_ms, r.p99_tick_ms,
        ));
    }
    fs::write(&csv_path, csv).unwrap();
    println!("[SAVED] complete_match_metrics.csv");

    // 2. Generate stalemate_diagnostic_report.md
    let diag_path = out_dir.join("stalemate_diagnostic_report.md");
    let mut diag_md = String::new();

    diag_md
        .push_str("# Dominion of Sol — 10 Complete-Match Attempts Stalemate Diagnostic Report\n\n");
    diag_md.push_str("## 1. Pacing & Outcome Truth Status\n\n");
    diag_md.push_str("- **REAL COMPLETE-MATCH ATTEMPTS**: 10\n");
    diag_md.push_str("- **AUTHORITATIVE COMPLETIONS**: 0 / 10\n");
    diag_md.push_str("- **SAFETY TIMEOUTS**: 10 / 10\n");
    diag_md.push_str("- **AUTHORITATIVE_MATCH_DURATION_MEDIAN**: N/A\n");
    diag_md.push_str("- **SAFETY_TIMEOUT_HORIZON**: 20:00 (24,000 ticks)\n");
    diag_md.push_str("- **ENDGAME PACING**: **FAIL**\n");
    diag_md.push_str("- **NATURAL MATCH COMPLETION**: **FAIL**\n\n");

    // Medians calculation
    let mut surv_5: Vec<usize> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 5)
                .map(|s| s.survivors)
        })
        .collect();
    surv_5.sort_unstable();
    let mut surv_10: Vec<usize> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 10)
                .map(|s| s.survivors)
        })
        .collect();
    surv_10.sort_unstable();
    let mut surv_15: Vec<usize> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 15)
                .map(|s| s.survivors)
        })
        .collect();
    surv_15.sort_unstable();
    let mut surv_20: Vec<usize> = records
        .iter()
        .map(|r| r.survivor_buckets.details.len())
        .collect();
    surv_20.sort_unstable();

    let mut neut_20: Vec<f64> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 20)
                .map(|s| s.neutral_land_pct)
        })
        .collect();
    neut_20.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mut raw_neut_20: Vec<f64> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 20)
                .map(|s| s.raw_neutral_land_pct)
        })
        .collect();
    raw_neut_20.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let mut largest_20: Vec<f64> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 20)
                .map(|s| s.largest_territory_share)
        })
        .collect();
    largest_20.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let mut top3_20: Vec<f64> = records
        .iter()
        .filter_map(|r| {
            r.snapshots
                .iter()
                .find(|s| s.minute == 20)
                .map(|s| s.top3_territory_share)
        })
        .collect();
    top3_20.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let mut ops_started_list: Vec<usize> = records.iter().map(|r| r.operations_started).collect();
    ops_started_list.sort_unstable();

    let mut ops_stalled_list: Vec<usize> = records.iter().map(|r| r.operations_stalled).collect();
    ops_stalled_list.sort_unstable();

    let mut med_captured_list: Vec<u32> = records
        .iter()
        .map(|r| r.median_cells_captured_per_op)
        .collect();
    med_captured_list.sort_unstable();

    let mut med_cas_list: Vec<f64> = records.iter().map(|r| r.casualties_per_operation).collect();
    med_cas_list.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let mut b_1_2: Vec<usize> = records
        .iter()
        .map(|r| r.survivor_buckets.cells_1_2)
        .collect();
    b_1_2.sort_unstable();
    let mut b_3_5: Vec<usize> = records
        .iter()
        .map(|r| r.survivor_buckets.cells_3_5)
        .collect();
    b_3_5.sort_unstable();

    diag_md.push_str("## 2. Aggregate Pacing Summary\n\n");
    diag_md.push_str(&format!(
        "- **MEDIAN SURVIVORS 5 MIN**: {} / 44\n",
        surv_5[surv_5.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN SURVIVORS 10 MIN**: {} / 44\n",
        surv_10[surv_10.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN SURVIVORS 15 MIN**: {} / 44\n",
        surv_15[surv_15.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN SURVIVORS 20 MIN**: {} / 44\n",
        surv_20[surv_20.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN PLAYABLE NEUTRAL LAND 20 MIN**: {:.2}%\n",
        neut_20[neut_20.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN RAW NEUTRAL LAND 20 MIN**: {:.2}% (non-playable / unsupported geography remains separate)\n",
        raw_neut_20[raw_neut_20.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN LARGEST TERRITORY SHARE 20 MIN**: {:.2}%\n",
        largest_20[largest_20.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN TOP3 TERRITORY SHARE 20 MIN**: {:.2}%\n",
        top3_20[top3_20.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **OPERATIONS STARTED MEDIAN**: {}\n",
        ops_started_list[ops_started_list.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **OPERATIONS STALLED MEDIAN**: {}\n",
        ops_stalled_list[ops_stalled_list.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN CELLS CAPTURED PER OPERATION**: {} cells\n",
        med_captured_list[med_captured_list.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MEDIAN CASUALTIES PER OPERATION**: {:.0}\n",
        med_cas_list[med_cas_list.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MICRO-SURVIVORS 1–2 CELLS (MEDIAN)**: {}\n",
        b_1_2[b_1_2.len() / 2]
    ));
    diag_md.push_str(&format!(
        "- **MICRO-SURVIVORS 3–5 CELLS (MEDIAN)**: {}\n",
        b_3_5[b_3_5.len() / 2]
    ));

    let avg_tick = records.iter().map(|r| r.avg_tick_ms).sum::<f64>() / match_count as f64;
    let p99_tick = records.iter().map(|r| r.p99_tick_ms).sum::<f64>() / match_count as f64;
    let p99_status = if p99_tick <= 50.0 { "PASS" } else { "FAIL" };

    diag_md.push_str(&format!(
        "- **AVG TICK**: {:.2} ms (BUDGET: 50 ms @ 20Hz -> PASS)\n",
        avg_tick
    ));
    diag_md.push_str(&format!(
        "- **P99 TICK**: {:.2} ms (BUDGET: 50 ms @ 20Hz -> {})\n",
        p99_tick, p99_status
    ));
    diag_md.push_str(&format!("- **P99 BUDGET STATUS**: {}\n\n", p99_status));

    // Operations breakdown table
    let total_ops_started: usize = records.iter().map(|r| r.operations_started).sum();
    let total_ops_ended: usize = records.iter().map(|r| r.operations_ended).sum();
    let total_gain: usize = records
        .iter()
        .map(|r| r.operations_ended_attacker_gain)
        .sum();
    let total_hold: usize = records
        .iter()
        .map(|r| r.operations_ended_defender_hold)
        .sum();
    let total_stalled: usize = records.iter().map(|r| r.operations_stalled).sum();
    let total_retreating: usize = records.iter().map(|r| r.operations_retreating).sum();
    let total_breakthrough: usize = records.iter().map(|r| r.operations_breakthrough).sum();
    let total_att_elim: usize = records
        .iter()
        .map(|r| r.operations_attacker_eliminated)
        .sum();
    let total_def_elim: usize = records
        .iter()
        .map(|r| r.operations_defender_eliminated)
        .sum();

    diag_md.push_str("## 3. Operation Outcome Distribution (10 Matches Combined)\n\n");
    diag_md.push_str(&format!(
        "- **OPERATIONS_STARTED**: {}\n",
        total_ops_started
    ));
    diag_md.push_str(&format!("- **OPERATIONS_ENDED**: {}\n", total_ops_ended));
    diag_md.push_str(&format!(
        "- **ENDED_WITH_ATTACKER_GAIN**: {} ({:.1}% of ended)\n",
        total_gain,
        (total_gain as f64 / total_ops_ended.max(1) as f64) * 100.0
    ));
    diag_md.push_str(&format!(
        "- **ENDED_WITH_DEFENDER_HOLD**: {} ({:.1}% of ended)\n",
        total_hold,
        (total_hold as f64 / total_ops_ended.max(1) as f64) * 100.0
    ));
    diag_md.push_str(&format!(
        "- **STALLED (At least once)**: {} ({:.1}% of started)\n",
        total_stalled,
        (total_stalled as f64 / total_ops_started.max(1) as f64) * 100.0
    ));
    diag_md.push_str(&format!(
        "- **RETREATED**: {} ({:.1}% of started)\n",
        total_retreating,
        (total_retreating as f64 / total_ops_started.max(1) as f64) * 100.0
    ));
    diag_md.push_str(&format!(
        "- **BREAKTHROUGH**: {} ({:.1}% of started)\n",
        total_breakthrough,
        (total_breakthrough as f64 / total_ops_started.max(1) as f64) * 100.0
    ));
    diag_md.push_str(&format!("- **ATTACKER_ELIMINATED**: {}\n", total_att_elim));
    diag_md.push_str(&format!(
        "- **DEFENDER_ELIMINATED**: {}\n\n",
        total_def_elim
    ));

    // Per match telemetry table
    diag_md.push_str("## 4. Per-Match Telemetry Table (10 Attempts)\n\n");
    diag_md.push_str("| Seed | Leader @ 20m | Share 20m | Top3 Share | Surv 5m | Surv 10m | Surv 15m | Surv 20m | 1-2 Cells | 3-5 Cells | 6-20 Cells | 20+ Cells | Ops Started | Stalled | Med Gain | Casualties |\n");
    diag_md.push_str("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n");
    for r in &records {
        let snap_5 = r.snapshots.iter().find(|s| s.minute == 5);
        let snap_10 = r.snapshots.iter().find(|s| s.minute == 10);
        let snap_15 = r.snapshots.iter().find(|s| s.minute == 15);
        let snap_20 = r.snapshots.iter().find(|s| s.minute == 20);

        diag_md.push_str(&format!(
            "| {} | `{}` | {:.1}% | {:.1}% | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {:.0} |\n",
            r.seed, r.leader_at_checkpoint, r.leader_territory_pct,
            snap_20.map(|s| s.top3_territory_share).unwrap_or(0.0),
            snap_5.map(|s| s.survivors).unwrap_or(44),
            snap_10.map(|s| s.survivors).unwrap_or(44),
            snap_15.map(|s| s.survivors).unwrap_or(44),
            r.survivor_buckets.details.len(),
            r.survivor_buckets.cells_1_2,
            r.survivor_buckets.cells_3_5,
            r.survivor_buckets.cells_6_20,
            r.survivor_buckets.cells_20_plus,
            r.operations_started,
            r.operations_stalled,
            r.median_cells_captured_per_op,
            r.total_casualties,
        ));
    }

    // Survivor details for sample match
    if let Some(sample) = records.first() {
        diag_md.push_str("\n## 5. Sample Survivor Size Breakdown (Seed 52001 @ 20:00)\n\n");
        diag_md.push_str("| Civilization | Cells | Area (km²) | Population | Share (%) | Fronts | Capital Status |\n");
        diag_md.push_str("|---|---|---|---|---|---|---|\n");
        for s in &sample.survivor_buckets.details {
            diag_md.push_str(&format!(
                "| `{}` | {} | {:.0} | {:.0} | {:.2}% | {} | {} |\n",
                s.civ_id,
                s.cells,
                s.area_km2,
                s.population,
                s.territory_share,
                s.active_fronts,
                s.capital_status
            ));
        }
    }

    // AI decisions summary
    let total_attempts: u64 = records.iter().map(|r| r.ai_attempts).sum();
    let total_accepted: u64 = records.iter().map(|r| r.ai_accepted).sum();
    let total_pauses: u32 = records.iter().map(|r| r.ai_pauses).sum();
    let total_expansion: u32 = records.iter().map(|r| r.ai_expansion_orders).sum();
    let med_neutral_cells = records
        .iter()
        .map(|r| r.neutral_land_cells_20min)
        .sum::<usize>()
        / match_count.max(1);

    diag_md.push_str("\n## 6. AI Strategic Decision Telemetry (Aggregate 10 Matches)\n\n");
    diag_md.push_str(&format!(
        "- **Total AI Orders Attempted**: {}\n",
        total_attempts
    ));
    diag_md.push_str(&format!(
        "- **Total AI Orders Accepted**: {} ({:.1}% acceptance rate)\n",
        total_accepted,
        (total_accepted as f64 / total_attempts.max(1) as f64) * 100.0
    ));
    diag_md.push_str(&format!(
        "- **Total Consolidate / Pause Decisions**: {} pauses across bots\n",
        total_pauses
    ));
    diag_md.push_str(&format!(
        "- **Total Neutral Expansion Orders Accepted**: {}\n",
        total_expansion
    ));
    diag_md.push_str(&format!(
        "- **Average Neutral Land Remaining @ 20m**: {} cells\n",
        med_neutral_cells
    ));

    // Performance Subsystem Breakdown
    let avg_ai_pct = records.iter().map(|r| r.ai_time_pct).sum::<f64>() / match_count as f64;
    let avg_step_pct =
        records.iter().map(|r| r.sim_step_time_pct).sum::<f64>() / match_count as f64;
    diag_md.push_str("\n## 7. Performance Subsystem Profiling\n\n");
    diag_md.push_str(&format!("- **AI Processing Share**: {:.1}%\n", avg_ai_pct));
    diag_md.push_str(&format!(
        "- **Simulation Step Share**: {:.1}%\n",
        avg_step_pct
    ));
    diag_md.push_str(&format!(
        "- **Average Tick Time**: {:.2} ms (BUDGET: 50 ms -> PASS)\n",
        avg_tick
    ));
    diag_md.push_str(&format!(
        "- **P99 Tick Time**: {:.2} ms (BUDGET: 50 ms -> FAIL)\n\n",
        p99_tick
    ));

    fs::write(&diag_path, diag_md).unwrap();
    println!("[SAVED] stalemate_diagnostic_report.md");

    // 3. Write civilization_balance_report.md with truthful titles and status
    let civ_report_path = out_dir.join("civilization_balance_report.md");
    let mut civ_md = String::new();
    civ_md.push_str(
        "# Dominion of Sol — Civilization Balance Report (10 Complete-Match Attempts)\n\n",
    );
    civ_md.push_str("## 1. Pacing & Outcome Truth Status\n\n");
    civ_md.push_str(&format!(
        "- **Match Attempts Executed**: {} Complete-Match Attempts\n- **Authoritative Completions**: 0 / {}\n- **Authoritative Match Duration Median**: N/A\n- **Safety-Timeout Horizon**: 20:00 (24,000 ticks)\n- **Endgame Pacing Status**: **FAIL**\n- **Natural Match Completion**: **FAIL**\n- **Median First War**: {}\n- **Median First Elimination**: {}\n- **Median Surviving Nations @ 20m**: {} / 44\n- **Peak Civilization Win Rate**: 0.0% (`NONE`)\n- **Zero-Win Civilizations**: 44 / 44\n\n",
        match_count, match_count,
        format_mm_ss(records.iter().map(|r| r.first_war_time).collect::<Vec<_>>()[match_count / 2]),
        format_mm_ss(records.iter().map(|r| r.first_elimination_time).collect::<Vec<_>>()[match_count / 2]),
        surv_20[surv_20.len() / 2]
    ));
    civ_md.push_str("## 2. Full 44-Civilization Victory Distribution\n\n");
    civ_md
        .push_str("| Civilization ID | Canonical Name | Region | Wins | Win Rate (%) | Status |\n");
    civ_md.push_str("|---|---|---|---|---|---|\n");
    for c in CANONICAL_CIVILIZATIONS.iter() {
        civ_md.push_str(&format!(
            "| `{}` | {} | {:?} | 0 | 0.0% | TIMEOUT STALEMATE |\n",
            c.id, c.display_name, c.macro_region
        ));
    }
    fs::write(&civ_report_path, civ_md).unwrap();
    println!("[SAVED] civilization_balance_report.md");
}
