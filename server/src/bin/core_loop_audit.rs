//! Exact 0/30/60/120/180/300/450/600-second authoritative core-loop audit.
//! This binary never injects orders or mutates balance; every civilization is
//! driven through the production BotManager and Simulation paths.

#[path = "../balance.rs"]
mod balance;
#[path = "../bot.rs"]
mod bot;
#[path = "../chokepoints.rs"]
mod chokepoints;
#[path = "../civilizations.rs"]
mod civilizations;
#[path = "../combat.rs"]
mod combat;
#[path = "../compact_patch.rs"]
mod compact_patch;
#[path = "../expansion.rs"]
mod expansion;
#[path = "../factions.rs"]
mod factions;
#[path = "../meta_store.rs"]
mod meta_store;
#[path = "../protocol.rs"]
mod protocol;
#[path = "../simulation.rs"]
mod simulation;
#[path = "../world_map.rs"]
mod world_map;
#[path = "../world_topology.rs"]
mod world_topology;

use bot::BotManager;
use civilizations::CANONICAL_CIVILIZATIONS;
use serde::Serialize;
use simulation::Simulation;
use std::collections::BTreeMap;
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::time::Instant;

const CHECKPOINTS: &[(u64, u32)] = &[
    (0, 0),
    (600, 30),
    (1_200, 60),
    (2_400, 120),
    (3_600, 180),
    (6_000, 300),
    (9_000, 450),
    (12_000, 600),
];

#[derive(Serialize)]
struct Checkpoint {
    seconds: u32,
    tick: u64,
    macro_phase: String,
    alive: usize,
    neutral_pct: f64,
    playable_neutral_pct: f64,
    median_territory: f64,
    min_territory: u32,
    max_territory: u32,
    median_population: f64,
    max_population: f64,
    neutral_expansion_operations: u32,
    hostile_fronts_started: usize,
    active_wars: usize,
    eliminations: usize,
    territory_turnover: u32,
    largest_world_share_pct: f64,
    largest_owned_share_pct: f64,
}

#[derive(Serialize)]
struct Profile {
    tick_avg_ms: f64,
    tick_p95_ms: f64,
    tick_p99_ms: f64,
    ai_avg_ms: f64,
    ai_p95_ms: f64,
    ai_p99_ms: f64,
    target_scan_avg_ms: f64,
    target_scan_calls: u64,
    front_match_avg_ms: f64,
    front_match_calls: u64,
    theatre_traversal_avg_ms: f64,
    war_resolution_avg_ms: f64,
    war_resolution_calls: u64,
}

#[derive(Serialize)]
struct RunAudit {
    seed: u64,
    wall_clock_seconds: f64,
    first_contact_seconds: Option<f64>,
    first_war_seconds: Option<f64>,
    first_elimination_seconds: Option<f64>,
    match_over: bool,
    winner_faction_id: Option<u8>,
    checkpoints: Vec<Checkpoint>,
    profile: Profile,
    front_termination_reasons: BTreeMap<String, usize>,
    neutral_components: usize,
    unreachable_neutral_components: usize,
    unreachable_neutral_cells: usize,
    largest_unreachable_neutral_component: usize,
    largest_unreachable_regions: Vec<NeutralRegion>,
}

#[derive(Serialize)]
struct NeutralRegion {
    cells: usize,
    min_x: usize,
    max_x: usize,
    min_y: usize,
    max_y: usize,
    centroid_x: f64,
    centroid_y: f64,
}

fn median(values: &mut [f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.sort_by(f64::total_cmp);
    let middle = values.len() / 2;
    if values.len() % 2 == 0 {
        (values[middle - 1] + values[middle]) * 0.5
    } else {
        values[middle]
    }
}

fn percentile(values: &[f64], pct: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let index = ((sorted.len() - 1) as f64 * pct).round() as usize;
    sorted[index]
}

fn checkpoint(sim: &Simulation, seconds: u32) -> Checkpoint {
    let alive: Vec<_> = sim
        .factions
        .iter()
        .filter(|faction| !faction.is_eliminated && faction.territory_count > 0)
        .collect();
    let mut territories: Vec<f64> = alive
        .iter()
        .map(|faction| faction.territory_count as f64)
        .collect();
    let mut populations: Vec<f64> = alive.iter().map(|faction| faction.population).collect();
    let max_territory = alive
        .iter()
        .map(|faction| faction.territory_count)
        .max()
        .unwrap_or(0);
    let min_territory = alive
        .iter()
        .map(|faction| faction.territory_count)
        .min()
        .unwrap_or(0);
    let max_population = alive
        .iter()
        .map(|faction| faction.population)
        .max_by(f64::total_cmp)
        .unwrap_or(0.0);
    let neutral = sim
        .cells
        .iter()
        .filter(|cell| cell.terrain_type == 0 && cell.owner_id == 0)
        .count();
    let playable_neutral = sim
        .cells
        .iter()
        .enumerate()
        .filter(|(index, cell)| sim.playable_land_mask[*index] == 1 && cell.owner_id == 0)
        .count();
    let owned: u32 = alive.iter().map(|faction| faction.territory_count).sum();
    let active_wars = sim
        .combat_manager
        .fronts
        .iter()
        .filter(|front| front.is_combat_active && front.operation_kind != "CONTACT")
        .count();
    Checkpoint {
        seconds,
        tick: sim.tick,
        macro_phase: format!("{:?}", sim.macro_phase),
        alive: alive.len(),
        neutral_pct: neutral as f64 / sim.total_land_cells.max(1) as f64 * 100.0,
        playable_neutral_pct: playable_neutral as f64 / sim.playable_land_cells.max(1) as f64
            * 100.0,
        median_territory: median(&mut territories),
        min_territory,
        max_territory,
        median_population: median(&mut populations),
        max_population,
        neutral_expansion_operations: sim.next_expansion_id.saturating_sub(1),
        hostile_fronts_started: sim.wars_started,
        active_wars,
        eliminations: CANONICAL_CIVILIZATIONS.len().saturating_sub(alive.len()),
        territory_turnover: sim.territory_turnover,
        largest_world_share_pct: max_territory as f64 / sim.total_land_cells.max(1) as f64 * 100.0,
        largest_owned_share_pct: max_territory as f64 / owned.max(1) as f64 * 100.0,
    }
}

fn mean_ms(total_ns: u128, calls: u64) -> f64 {
    if calls == 0 {
        0.0
    } else {
        total_ns as f64 / calls as f64 / 1_000_000.0
    }
}

fn neutral_component_audit(sim: &Simulation) -> (usize, usize, usize, usize, Vec<NeutralRegion>) {
    let mut unseen: HashSet<usize> = sim
        .cells
        .iter()
        .enumerate()
        .filter_map(|(index, cell)| (cell.terrain_type == 0 && cell.owner_id == 0).then_some(index))
        .collect();
    let mut components = 0;
    let mut unreachable_components = 0;
    let mut unreachable_cells = 0;
    let mut largest_unreachable = 0;
    let mut unreachable_regions = Vec::new();
    while let Some(&start) = unseen.iter().next() {
        components += 1;
        unseen.remove(&start);
        let mut queue = vec![start];
        let mut size = 0;
        let mut touches_owner = false;
        let mut min_x = usize::MAX;
        let mut max_x = 0;
        let mut min_y = usize::MAX;
        let mut max_y = 0;
        let mut sum_x = 0_u64;
        let mut sum_y = 0_u64;
        while let Some(cell) = queue.pop() {
            size += 1;
            let x = cell % world_map::WORLD_WIDTH;
            let y = cell / world_map::WORLD_WIDTH;
            min_x = min_x.min(x);
            max_x = max_x.max(x);
            min_y = min_y.min(y);
            max_y = max_y.max(y);
            sum_x += x as u64;
            sum_y += y as u64;
            for neighbor in expansion::legal_land_neighbors(&sim.cells, cell) {
                if sim.cells[neighbor].terrain_type != 0 {
                    continue;
                }
                if sim.cells[neighbor].owner_id > 0 {
                    touches_owner = true;
                } else if unseen.remove(&neighbor) {
                    queue.push(neighbor);
                }
            }
        }
        if !touches_owner {
            unreachable_components += 1;
            unreachable_cells += size;
            largest_unreachable = largest_unreachable.max(size);
            unreachable_regions.push(NeutralRegion {
                cells: size,
                min_x,
                max_x,
                min_y,
                max_y,
                centroid_x: sum_x as f64 / size as f64,
                centroid_y: sum_y as f64 / size as f64,
            });
        }
    }
    unreachable_regions.sort_by_key(|region| std::cmp::Reverse(region.cells));
    unreachable_regions.truncate(8);
    (
        components,
        unreachable_components,
        unreachable_cells,
        largest_unreachable,
        unreachable_regions,
    )
}

fn run_seed(seed: u64, max_ticks: u64) -> RunAudit {
    let wall_started = Instant::now();
    let mut sim = Simulation::new_standard(Some(CANONICAL_CIVILIZATIONS[0].id), seed);
    for faction in &mut sim.factions {
        faction.is_human = false;
    }
    let mut bots = BotManager::with_seed(sim.factions.len(), seed);
    let mut tick_ms = Vec::with_capacity(12_000);
    let mut ai_ms = Vec::with_capacity(12_000);
    let mut checkpoints = vec![checkpoint(&sim, 0)];

    for tick in 1..=max_ticks {
        let tick_started = Instant::now();
        let ai_started = Instant::now();
        bots.generate_bot_actions(&mut sim);
        ai_ms.push(ai_started.elapsed().as_secs_f64() * 1_000.0);
        sim.step();
        tick_ms.push(tick_started.elapsed().as_secs_f64() * 1_000.0);
        if let Some((_, seconds)) = CHECKPOINTS.iter().find(|(at, _)| *at == tick) {
            checkpoints.push(checkpoint(&sim, *seconds));
        }
    }

    let tick_avg_ms = tick_ms.iter().sum::<f64>() / tick_ms.len().max(1) as f64;
    let ai_avg_ms = ai_ms.iter().sum::<f64>() / ai_ms.len().max(1) as f64;
    let mut front_termination_reasons = BTreeMap::new();
    for front in &sim.combat_manager.fronts {
        if !front.is_combat_active && front.operation_kind != "CONTACT" {
            *front_termination_reasons
                .entry(front.termination_reason.clone())
                .or_insert(0) += 1;
        }
    }
    let (
        neutral_components,
        unreachable_neutral_components,
        unreachable_neutral_cells,
        largest_unreachable_neutral_component,
        largest_unreachable_regions,
    ) = neutral_component_audit(&sim);
    RunAudit {
        seed,
        wall_clock_seconds: wall_started.elapsed().as_secs_f64(),
        first_contact_seconds: sim.first_contact_tick.map(|tick| tick as f64 * 0.05),
        first_war_seconds: sim.first_war_tick.map(|tick| tick as f64 * 0.05),
        first_elimination_seconds: sim.first_elimination_tick.map(|tick| tick as f64 * 0.05),
        match_over: sim.match_over,
        winner_faction_id: sim.winner_faction_id,
        checkpoints,
        profile: Profile {
            tick_avg_ms,
            tick_p95_ms: percentile(&tick_ms, 0.95),
            tick_p99_ms: percentile(&tick_ms, 0.99),
            ai_avg_ms,
            ai_p95_ms: percentile(&ai_ms, 0.95),
            ai_p99_ms: percentile(&ai_ms, 0.99),
            target_scan_avg_ms: mean_ms(
                bots.profile_target_scan_ns,
                bots.profile_target_scan_calls,
            ),
            target_scan_calls: bots.profile_target_scan_calls,
            front_match_avg_ms: mean_ms(sim.profile_front_match_ns, sim.profile_front_match_calls),
            front_match_calls: sim.profile_front_match_calls,
            theatre_traversal_avg_ms: mean_ms(
                sim.profile_theatre_traversal_ns,
                sim.profile_front_match_calls,
            ),
            war_resolution_avg_ms: mean_ms(
                sim.profile_war_resolution_ns,
                sim.profile_war_resolution_calls,
            ),
            war_resolution_calls: sim.profile_war_resolution_calls,
        },
        front_termination_reasons,
        neutral_components,
        unreachable_neutral_components,
        unreachable_neutral_cells,
        largest_unreachable_neutral_component,
        largest_unreachable_regions,
    }
}

fn main() {
    let seeds_text =
        std::env::var("DOMINION_CORE_AUDIT_SEEDS").unwrap_or_else(|_| "52001".to_string());
    let seeds: Vec<u64> = seeds_text
        .split(',')
        .filter_map(|value| value.trim().parse().ok())
        .collect();
    let max_ticks = std::env::var("DOMINION_CORE_AUDIT_MAX_TICKS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(12_000);
    let runs: Vec<RunAudit> = seeds
        .into_iter()
        .map(|seed| run_seed(seed, max_ticks))
        .collect();
    let json = serde_json::to_string_pretty(&runs).expect("serialize core audit");
    let output = Path::new("artifacts/core-loop-audit.json");
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).expect("create audit artifact directory");
    }
    fs::write(output, &json).expect("write core audit artifact");
    println!("{json}");
}
