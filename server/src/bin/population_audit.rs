#[path = "../balance.rs"]
pub mod balance;
#[path = "../bot.rs"]
mod bot;
#[path = "../chokepoints.rs"]
mod chokepoints;
#[path = "../civilizations.rs"]
pub mod civilizations;
#[path = "../combat.rs"]
mod combat;
#[path = "../compact_patch.rs"]
mod compact_patch;
#[path = "../expansion.rs"]
pub mod expansion;
#[path = "../factions.rs"]
mod factions;
#[path = "../meta_store.rs"]
pub mod meta_store;
#[path = "../protocol.rs"]
mod protocol;
#[path = "../simulation.rs"]
mod simulation;
#[path = "../world_map.rs"]
mod world_map;
#[path = "../world_topology.rs"]
pub mod world_topology;

use bot::BotManager;
use simulation::Simulation;
use std::collections::BTreeMap;

fn cardinal(index: usize) -> [Option<usize>; 4] {
    let x = index % world_map::WORLD_WIDTH;
    let y = index / world_map::WORLD_WIDTH;
    [
        (y > 0).then_some(index - world_map::WORLD_WIDTH),
        (x + 1 < world_map::WORLD_WIDTH).then_some(index + 1),
        (y + 1 < world_map::WORLD_HEIGHT).then_some(index + world_map::WORLD_WIDTH),
        (x > 0).then_some(index - 1),
    ]
}

fn neutral_frontier_candidates(sim: &Simulation, owner: u8) -> Vec<u32> {
    let mut candidates = sim.cells.iter().enumerate().filter_map(|(index, cell)| {
        (cell.owner_id == 0
            && cell.terrain_type == 0
            && cardinal(index).into_iter().flatten().any(|neighbor| sim.cells[neighbor].owner_id == owner))
            .then_some(index as u32)
    }).collect::<Vec<_>>();
    // The audit must not be defeated by one geometrically valid but
    // topologically cramped first candidate. Try the complete deterministic
    // frontier set, in stable cell order, until the real command accepts one.
    candidates.sort_unstable();
    candidates
}

fn try_expand(sim: &mut Simulation, owner: u8) -> bool {
    neutral_frontier_candidates(sim, owner)
        .into_iter()
        .take(2048)
        .any(|target| sim.process_expand_command(owner, target).is_ok())
}

fn faction(sim: &Simulation, id: u8) -> &protocol::FactionInfo {
    sim.factions.iter().find(|f| f.faction_id == id).expect("faction")
}

fn profile(name: &str, duration_seconds: usize, action_period: Option<usize>) -> BTreeMap<String, String> {
    // Keep a neutral second faction alive so the pacing comparison can run
    // after the first expansion; a one-faction simulation is correctly a
    // completed match by definition.
    let mut sim = Simulation::with_seed(2, 0x50504F50554C4154);
    let mut expansions = 0usize;
    let mut territory_at_60 = 0u32;
    let mut territory_at_300 = 0u32;
    let mut capacity_reached_at = None;
    let mut trajectory_samples = BTreeMap::new();
    for second in 0..duration_seconds {
        if action_period.is_some_and(|period| second % period == 0) {
            if try_expand(&mut sim, 1) { expansions += 1; }
        }
        sim.step_dt(1.0);
        if second + 1 == 60 { territory_at_60 = faction(&sim, 1).territory_count; }
        if second + 1 == 300 { territory_at_300 = faction(&sim, 1).territory_count; }
        let f = faction(&sim, 1);
        if capacity_reached_at.is_none() && f.population >= f.population_capacity - 0.01 {
            capacity_reached_at = Some(second + 1);
        }
        if matches!(second + 1, 60 | 300 | 900 | 3_600 | 12_000) {
            trajectory_samples.insert(
                format!("trajectory{}s", second + 1),
                format!(
                    "areaKm2={:.2};pool={:.2};living={:.2};capacity={:.2};growth={:.4};expansions={}",
                    f.controlled_area_km2,
                    f.population,
                    f.total_living_population,
                    f.population_capacity,
                    f.population_growth_per_second,
                    expansions,
                ),
            );
        }
    }
    let f = faction(&sim, 1);
    let mut result = BTreeMap::from([
        ("profile".into(), name.into()),
        ("territoryAt60s".into(), territory_at_60.to_string()),
        ("territoryAt300s".into(), territory_at_300.to_string()),
        ("territoryFinal".into(), f.territory_count.to_string()),
        ("controlledAreaKm2".into(), format!("{:.2}", f.controlled_area_km2)),
        ("populationPool".into(), format!("{:.2}", f.population)),
        ("livingPopulation".into(), format!("{:.2}", f.total_living_population)),
        ("capacity".into(), format!("{:.2}", f.population_capacity)),
        ("growthPerSecond".into(), format!("{:.4}", f.population_growth_per_second)),
        ("expansions".into(), expansions.to_string()),
        ("capacityReachedAtSeconds".into(), capacity_reached_at.map(|value| value.to_string()).unwrap_or_else(|| "never".into())),
    ]);
    result.insert("capacityGap".into(), format!("{:.4}", (f.population_capacity - f.population).max(0.0)));
    result.insert("growthPressure".into(), format!("{:.6}", (1.0 - f.total_living_population / f.population_capacity.max(1.0)).clamp(0.0, 1.0)));
    result.extend(trajectory_samples);
    result
}

#[derive(Debug, Clone)]
struct MatchResult {
    seed: u64,
    winner: Option<u8>,
    duration_minutes: f64,
    first_contact_minutes: Option<f64>,
    first_war_minutes: Option<f64>,
    neutral_at_start: f64,
    neutral_at_end: f64,
    territory_leader: u8,
    alive_factions: usize,
    active_fronts: usize,
}

fn run_match(seed: u64, max_minutes: usize, special_doctrine: Option<(u8, [f32; 4])>) -> MatchResult {
    // The product match is one custom human plus one hundred AI factions.
    // Keep the audit on the same 101-faction topology; an 8-faction shortcut
    // can hide opening-contact and pacing problems caused by the real sparse
    // world distribution.
    let mut sim = Simulation::with_seed(101, seed);
    if let Some((id, doctrine)) = special_doctrine {
        if let Some(f) = sim.factions.iter_mut().find(|f| f.faction_id == id) {
            f.doctrine_offense = doctrine[0];
            f.doctrine_defense = doctrine[1];
            f.doctrine_expansion = doctrine[2];
            f.doctrine_maritime = doctrine[3];
        }
    }
    let neutral_at_start = sim.cells.iter().filter(|c| c.terrain_type == 0 && c.owner_id == 0).count() as f64
        / sim.total_land_cells as f64 * 100.0;
    let mut bots = BotManager::with_seed(100, seed.wrapping_add(1));
    let max_ticks = (max_minutes as u64) * 60 * 20;
    let mut first_contact_minutes = None;
    let mut first_war_minutes = None;
    for _ in 0..max_ticks {
        bots.generate_bot_actions(&mut sim);
        sim.step();
        if first_contact_minutes.is_none() && sim.combat_manager.fronts.iter().any(|f| f.operation_kind == "CONTACT" || f.operation_kind == "LAND_OFFENSIVE") {
            first_contact_minutes = Some(sim.tick as f64 / 1200.0);
        }
        if first_war_minutes.is_none() && sim.combat_manager.fronts.iter().any(|f| f.is_combat_active) {
            first_war_minutes = Some(sim.tick as f64 / 1200.0);
        }
        if sim.match_over { break; }
    }
    let neutral_at_end = sim.cells.iter().filter(|c| c.terrain_type == 0 && c.owner_id == 0).count() as f64
        / sim.total_land_cells as f64 * 100.0;
    let leader = sim.factions.iter().max_by_key(|f| f.territory_count).map(|f| f.faction_id).unwrap_or(0);
    let alive_factions = sim.factions.iter().filter(|f| !f.is_eliminated && f.territory_count > 0).count();
    let active_fronts = sim.combat_manager.fronts.iter().filter(|front| front.is_combat_active).count();
    MatchResult {
        seed,
        winner: sim.winner_faction_id,
        duration_minutes: sim.tick as f64 / 1200.0,
        first_contact_minutes,
        first_war_minutes,
        neutral_at_start,
        neutral_at_end,
        territory_leader: leader,
        alive_factions,
        active_fronts,
    }
}

fn main() {
    println!("DOMINION POPULATION AUDIT");
    println!("presets={}", factions::nation_preset_count());
    let passive_seconds = std::env::var("DOMINION_AUDIT_PASSIVE_SECONDS")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(12_000);
    for row in [
        profile("RAPID_EXPANDER", 900, Some(5)),
        profile("CONSOLIDATOR", 900, Some(20)),
        profile("PASSIVE", passive_seconds, None),
    ] {
        println!("profile={}", row.get("profile").unwrap());
        for (key, value) in row.iter().filter(|(key, _)| key.as_str() != "profile") {
            println!("  {}={}", key, value);
        }
    }

    let doctrine_cases = [
        ("MAX_OFFENSE", factions::normalize_doctrine(0.06, -0.02, -0.02, -0.02)),
        ("MAX_DEFENSE", factions::normalize_doctrine(-0.02, 0.06, -0.02, -0.02)),
        ("MAX_EXPANSION", factions::normalize_doctrine(-0.02, -0.02, 0.06, -0.02)),
        ("MAX_MARITIME", factions::normalize_doctrine(-0.02, -0.02, -0.02, 0.06)),
    ];
    let balance_runs = std::env::var("DOMINION_AUDIT_BALANCE_RUNS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(4);
    let max_minutes = std::env::var("DOMINION_AUDIT_MATCH_MINUTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(12);
    let skip_extremes = std::env::var("DOMINION_AUDIT_SKIP_EXTREMES")
        .ok()
        .is_some_and(|value| value == "1" || value.eq_ignore_ascii_case("true"));
    println!("balance_runs={} seeds=1..{} maxMinutes={}", balance_runs, balance_runs, max_minutes);
    let started = std::time::Instant::now();
    let mut results = Vec::new();
    for seed in 1..=balance_runs {
        let result = run_match(seed, max_minutes, None);
        println!("match seed={} winner={:?} complete={} durationMinutes={:.2} firstContactMinutes={:?} firstWarMinutes={:?} neutralStartPct={:.2} neutralEndPct={:.2} leader={} aliveFactions={} activeFronts={}", result.seed, result.winner, result.winner.is_some(), result.duration_minutes, result.first_contact_minutes, result.first_war_minutes, result.neutral_at_start, result.neutral_at_end, result.territory_leader, result.alive_factions, result.active_fronts);
        results.push(result);
    }
    if skip_extremes {
        println!("extreme_runs=skipped");
    } else {
        for (label, doctrine) in doctrine_cases {
            let result = run_match(100 + doctrine[0].to_bits() as u64 + doctrine[1].to_bits() as u64, max_minutes, Some((1, doctrine)));
            println!("extreme={} doctrine={:?} winner={:?} complete={} durationMinutes={:.2} leader={}", label, doctrine, result.winner, result.winner.is_some(), result.duration_minutes, result.territory_leader);
        }
    }
    let durations: Vec<f64> = results.iter().map(|r| r.duration_minutes).collect();
    println!("matchDurationMinutes_min={:.2} median={:.2} p75={:.2} p90={:.2} max={:.2}", percentile(&durations, 0.0), percentile(&durations, 0.5), percentile(&durations, 0.75), percentile(&durations, 0.90), percentile(&durations, 1.0));
    println!("auditElapsedSeconds={:.2}", started.elapsed().as_secs_f64());
}

fn percentile(values: &[f64], p: f64) -> f64 {
    if values.is_empty() { return 0.0; }
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));
    let index = p.clamp(0.0, 1.0) * (sorted.len().saturating_sub(1) as f64);
    let low = index.floor() as usize;
    let high = index.ceil() as usize;
    sorted[low] + (sorted[high] - sorted[low]) * (index - low as f64)
}
