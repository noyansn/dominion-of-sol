//! 27 Targeted Automated Tests and Pacing Harnesses for Dominion of Sol
//! Early Game Economy, Expansion Pacing, and AI Morphology Fix (10K Normalization)

#[cfg(test)]
pub mod tests {
    use crate::balance::*;
    use crate::bot::{BotBrain, BotExpansionArchetype, BotManager, BotPersonality};
    use crate::expansion::{cells_for_commitment, generate_focus_corridor_patch, generate_frontier_distribution_patch};
    use crate::simulation::{MacroPhase, Simulation};
    use crate::world_map::{WORLD_HEIGHT, WORLD_WIDTH};
    use std::collections::HashSet;

    fn setup_open_grid_sim() -> (Simulation, u32) {
        let mut sim = Simulation::new(2);
        for c in &mut sim.cells {
            c.owner_id = 0;
            c.terrain_type = 0;
        }
        let cap_idx = 250 * WORLD_WIDTH + 500;
        sim.cells[cap_idx].owner_id = 1;
        sim.cell_consolidation[cap_idx] = 1.0;
        sim.factions[0].capital_cell = cap_idx as u32;
        sim.factions[0].territory_count = 1;
        sim.factions[0].population = INITIAL_LIVING_POPULATION;
        sim.factions[0].total_living_population = INITIAL_LIVING_POPULATION;
        sim.factions[0].population_capacity = BASE_HOMELAND_CAPACITY;

        sim.recompute_area_stats();
        sim.refresh_all_economies();
        (sim, cap_idx as u32)
    }

    // 1. Fresh faction starts around 10K Population
    #[test]
    fn test_01_fresh_faction_10k_population() {
        let sim = Simulation::new_standard(Some("roma"), 42);
        for f in &sim.factions {
            assert!(
                (f.population - 10_000.0).abs() <= 1.0,
                "Faction {} starting population must be ~10,000, got {}",
                f.display_name,
                f.population
            );
            assert!(
                f.population_capacity >= 14_000.0 && f.population_capacity <= 20_000.0,
                "Faction {} starting capacity must be between 14K and 20K with nucleus, got {}",
                f.display_name,
                f.population_capacity
            );
        }
    }

    // 2. All 44 factions use the same starting Population policy
    #[test]
    fn test_02_all_44_factions_same_policy() {
        let sim = Simulation::new_standard(Some("roma"), 42);
        assert_eq!(sim.factions.len(), 44, "Must have exact 44 civilization roster");
        let human = sim.factions.iter().find(|f| f.is_human).expect("human present");
        assert_eq!(human.population, 10_000.0);

        for ai in sim.factions.iter().filter(|f| !f.is_human) {
            assert_eq!(ai.population, human.population, "AI must have identical starting population to human (10,000)");
            assert!(
                ai.population_capacity >= 14_000.0 && ai.population_capacity <= 20_000.0,
                "AI capacity must follow same baseline capacity formula, got {}",
                ai.population_capacity
            );
        }
    }

    // 3. AI does not retain old 100K-scale fixed commitment values
    #[test]
    fn test_03_ai_no_100k_scale_fixed_assumptions() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        let mut bot = BotManager::with_seed(43, 42);
        // Step bot actions at tick 15
        sim.tick = 15;
        bot.generate_bot_actions(&mut sim);

        // Verify that bots commit reasonable amounts (not > 3,000)
        for f in &sim.factions {
            if !f.is_human {
                let spent = 10_000.0 - f.population;
                assert!(
                    spent <= 2_500.0,
                    "AI must not spend >25% in a single opening order on 10K scale, spent: {}",
                    spent
                );
            }
        }
    }

    // 4. 8–15% fresh commitment remains local
    #[test]
    fn test_04_moderate_commitment_remains_local() {
        let (mut sim, cap) = setup_open_grid_sim();
        let target = cap + 1;
        let commit_pct = 0.12; // 12% = 1,200 pop
        let outcome = sim.process_expand_command_with_mode(1, target, "FOCUS", Some(commit_pct)).unwrap();

        assert!(
            outcome.patch.actual_size >= 3 && outcome.patch.actual_size <= 5,
            "12% commit (~1,200 pop) should yield 3-5 cells, got {}",
            outcome.patch.actual_size
        );

        // Verify spatial reach is local (within 6 grid cells of cap)
        let cx = cap % WORLD_WIDTH as u32;
        let cy = cap / WORLD_WIDTH as u32;
        for &c in &outcome.patch.cells {
            let px = c % WORLD_WIDTH as u32;
            let py = c / WORLD_WIDTH as u32;
            let dist = ((px as f64 - cx as f64).powi(2) + (py as f64 - cy as f64).powi(2)).sqrt();
            assert!(dist <= 6.0, "Moderate commitment must remain strictly local, cell was {} away", dist);
        }
    }

    // 5. 50% commitment produces more territory than 12%
    #[test]
    fn test_05_50_percent_produces_more_territory_than_12() {
        let n12 = cells_for_commitment(1_200.0);
        let n50 = cells_for_commitment(5_000.0);
        assert!(n50 > n12, "50% commitment must produce more territory than 12% ({} vs {})", n50, n12);
        assert!(n50 >= 10 && n50 <= 14, "50% commitment (5,000 pop) should yield ~11-13 cells, got {}", n50);
    }

    // 6. 50% commitment has lower efficiency per Population than healthy moderate commitment
    #[test]
    fn test_06_diminishing_efficiency_50_vs_12() {
        let n12 = cells_for_commitment(1_200.0) as f64;
        let n50 = cells_for_commitment(5_000.0) as f64;

        let eff12 = n12 / 1_200.0;
        let eff50 = n50 / 5_000.0;

        assert!(
            eff12 > eff50,
            "Efficiency per population must decline for large commits: 12% eff={:.6}, 50% eff={:.6}",
            eff12,
            eff50
        );
    }

    // 7. Capture budget is finite and actually consumed
    #[test]
    fn test_07_capture_budget_finite_and_consumed() {
        let (mut sim, cap) = setup_open_grid_sim();
        let target = cap + 1;
        let before_pop = sim.factions[0].population;
        let outcome = sim.process_expand_command_with_mode(1, target, "FOCUS", Some(0.15)).unwrap();

        let spent = before_pop - sim.factions[0].population;
        assert!((spent - 1_500.0).abs() < 1.0, "Exact committed budget must be deducted");
        assert!((outcome.population_cost - 1_500.0).abs() < 1.0);
        assert_eq!(outcome.patch.actual_size, cells_for_commitment(1_500.0));
    }

    // 8. Operation does not refill capture budget every tick accidentally
    #[test]
    fn test_08_operation_does_not_refill_budget_every_tick() {
        let (mut sim, cap) = setup_open_grid_sim();
        let target = cap + 1;
        let outcome = sim.process_expand_command_with_mode(1, target, "FOCUS", Some(0.12)).unwrap();
        let expected_size = outcome.patch.actual_size;

        // Step simulation ticks to advance pending expansion
        for _ in 0..50 {
            sim.step_dt(0.05);
        }

        // Total territory gained must exactly match expected_size + 1 (starting cell)
        assert_eq!(
            sim.factions[0].territory_count,
            expected_size as u32 + 1,
            "Territory must not exceed original operation budget after ticking"
        );
    }

    // 9. Deeper expansion progressively costs more / scores worse
    #[test]
    fn test_09_progressive_depth_penalty() {
        let (mut sim, cap) = setup_open_grid_sim();
        let target = cap + 100; // Far target along east axis
        let patch = generate_focus_corridor_patch(&sim.cells, 1, target, 12);

        assert_eq!(patch.cells.len(), 12);
        // Verify that the patch does not march 12 cells in a straight line
        let ax = (cap % WORLD_WIDTH as u32) as f64;
        let ay = (cap / WORLD_WIDTH as u32) as f64;
        let max_dist = patch.cells.iter().map(|&c| {
            let px = (c % WORLD_WIDTH as u32) as f64;
            let py = (c / WORLD_WIDTH as u32) as f64;
            ((px - ax).powi(2) + (py - ay).powi(2)).sqrt()
        }).fold(0.0f64, f64::max);

        assert!(
            max_dist < 8.5,
            "Due to depth penalty, 12-cell patch should not reach >8.5 cells depth, reached: {:.2}",
            max_dist
        );
    }

    // 10. Open-terrain FOCUS does not default to one-cell-wide snake
    #[test]
    fn test_10_open_terrain_focus_not_one_cell_snake() {
        let (sim, cap) = setup_open_grid_sim();
        let target = cap + 50; // Heading east
        let patch = generate_focus_corridor_patch(&sim.cells, 1, target, 12);

        // Measure width distribution across perpendicular axis
        let ay = cap / WORLD_WIDTH as u32;
        let mut ys: HashSet<u32> = HashSet::new();
        for &c in &patch.cells {
            ys.insert(c / WORLD_WIDTH as u32);
        }

        // Width must be at least 2 distinct Y rows (lobe width >= 2)
        assert!(
            ys.len() >= 2,
            "FOCUS patch on open terrain must expand lateral width, not a 1-cell snake (Y rows: {})",
            ys.len()
        );
    }

    // 11. Frontier/compact expansion remains connected
    #[test]
    fn test_11_frontier_compact_expansion_remains_connected() {
        let (sim, _cap) = setup_open_grid_sim();
        let patch = generate_frontier_distribution_patch(&sim.cells, 1, 8);
        assert_eq!(patch.cells.len(), 8);

        // Every cell must be contiguous with faction 1 or adjacent to another patch cell
        for &c in &patch.cells {
            let has_adj = Simulation::cardinal(c as usize).into_iter().any(|n| {
                sim.cells[n].owner_id == 1 || patch.cells.contains(&(n as u32))
            });
            assert!(has_adj, "Every frontier cell must be connected");
        }
    }

    // 12. No disconnected capture
    #[test]
    fn test_12_no_disconnected_capture() {
        let (sim, cap) = setup_open_grid_sim();
        let patch = generate_focus_corridor_patch(&sim.cells, 1, cap + 30, 8);
        for &c in &patch.cells {
            let connected = Simulation::cardinal(c as usize).into_iter().any(|n| {
                sim.cells[n].owner_id == 1 || patch.cells.contains(&(n as u32))
            });
            assert!(connected, "No disconnected cells allowed in FOCUS patch");
        }
    }

    // 13. No fake bridges across obstacles
    #[test]
    fn test_13_no_fake_bridges() {
        let (mut sim, cap) = setup_open_grid_sim();
        // Place water barrier 1 cell east
        let barrier = cap + 1;
        sim.cells[barrier as usize].terrain_type = 2; // water

        let patch = generate_focus_corridor_patch(&sim.cells, 1, cap + 10, 6);
        for &c in &patch.cells {
            assert_ne!(c, barrier, "Cannot capture water");
            assert_ne!(sim.cells[c as usize].terrain_type, 2);
        }
    }

    // 14. No nearest-owner borrowing
    #[test]
    fn test_14_no_nearest_owner_borrowing() {
        let (mut sim, cap) = setup_open_grid_sim();
        sim.set_cell_owner(cap + 1, 1);
        assert_eq!(sim.cells[(cap + 1) as usize].owner_id, 1);
        assert_eq!(sim.cells[(cap + 2) as usize].owner_id, 0);
    }

    // 15. Territory growth scaling is sublinear in observed effective output
    #[test]
    fn test_15_sublinear_territory_growth() {
        let mut sim = Simulation::new(2);
        for c in &mut sim.cells {
            c.owner_id = 0;
            c.terrain_type = 0;
        }
        for i in 0..10 {
            sim.cells[i].owner_id = 1;
            sim.cell_consolidation[i] = 1.0;
        }
        for i in 100..130 {
            sim.cells[i].owner_id = 2;
            sim.cell_consolidation[i] = 1.0;
        }
        sim.factions[0].territory_count = 10;
        sim.factions[1].territory_count = 30;
        sim.factions[0].population = 10_000.0;
        sim.factions[1].population = 10_000.0;
        sim.recompute_area_stats();
        sim.refresh_all_economies();

        let g1 = sim.factions[0].population_growth_per_second;
        let g2 = sim.factions[1].population_growth_per_second;

        // 3x territory must give strictly LESS than 3x growth
        let ratio = g2 / g1;
        assert!(ratio > 1.4 && ratio < 2.6, "3x territory should yield sublinear growth ratio ~1.8-2.2, got {:.3}", ratio);
    }

    // 16. 2× territory target is roughly compatible with ~1.6–1.8× effective growth
    #[test]
    fn test_16_two_x_territory_target_growth() {
        let mut sim = Simulation::new(2);
        for c in &mut sim.cells {
            c.owner_id = 0;
            c.terrain_type = 0;
        }
        // Faction 1: 15 cells
        for i in 0..15 {
            sim.cells[i].owner_id = 1;
            sim.cell_consolidation[i] = 1.0;
        }
        // Faction 2: 30 cells
        for i in 100..130 {
            sim.cells[i].owner_id = 2;
            sim.cell_consolidation[i] = 1.0;
        }
        sim.factions[0].territory_count = 15;
        sim.factions[1].territory_count = 30;
        sim.factions[0].population = 10_000.0;
        sim.factions[1].population = 10_000.0;
        sim.recompute_area_stats();
        sim.refresh_all_economies();

        let g1 = sim.factions[0].population_growth_per_second;
        let g2 = sim.factions[1].population_growth_per_second;
        let ratio = g2 / g1;
        assert!(
            ratio >= 1.45 && ratio <= 1.85,
            "2x territory scaling ratio must be near 1.6-1.8x under representative conditions, got {:.3}",
            ratio
        );
    }

    // 17. Low Population state can recover
    #[test]
    fn test_17_low_population_recovery() {
        let (mut sim, cap) = setup_open_grid_sim();
        for i in 1..=5 {
            sim.set_cell_owner(cap + i, 1);
            sim.cell_consolidation[(cap + i) as usize] = 1.0;
        }
        sim.factions[0].population = 200.0; // Reckless low pop
        sim.factions[0].territory_count = 6;
        sim.recompute_area_stats();
        sim.refresh_all_economies();

        let g = sim.factions[0].population_growth_per_second;
        assert!(g > 15.0, "Low population state must maintain positive growth to recover, got {}", g);

        let before = sim.factions[0].population;
        for _ in 0..20 {
            sim.step_dt(1.0);
        }
        assert!(sim.factions[0].population > before + 200.0, "Must actively recover population over time");
    }

    // 18. Commit remains permanent cost
    #[test]
    fn test_18_commit_remains_permanent_cost() {
        let (mut sim, cap) = setup_open_grid_sim();
        let before = sim.factions[0].population;
        sim.process_expand_command_with_mode(1, cap + 1, "FOCUS", Some(0.15)).unwrap();
        let expected_pop = before - 1_500.0;
        assert!((sim.factions[0].population - expected_pop).abs() < 1.0);

        sim.flush_pending_advances();
        // Zero time elapsed: population never refunds
        assert!((sim.factions[0].population - expected_pop).abs() < 1.0);
    }

    // 19. No survivor return
    #[test]
    fn test_19_no_survivor_return() {
        let mut sim = Simulation::new(2);
        for c in &mut sim.cells {
            c.owner_id = 0;
            c.terrain_type = 0;
        }
        let b1 = 200 * WORLD_WIDTH + 300;
        let b2 = 200 * WORLD_WIDTH + 301;
        sim.cells[b1].owner_id = 1;
        sim.cells[b2].owner_id = 2;
        sim.factions[0].capital_cell = b1 as u32;
        sim.factions[1].capital_cell = b2 as u32;
        sim.factions[0].population = 10_000.0;
        sim.factions[1].population = 10_000.0;
        sim.macro_phase = MacroPhase::WarEra;
        sim.recompute_area_stats();
        sim.refresh_all_economies();

        let initial_pop = sim.factions[0].population;
        let order = sim.process_attack_command(1, b1 as u32, b2 as u32, 0.20).unwrap();
        let front_idx = sim.combat_manager.fronts.iter().position(|f| f.front_id == order.front_id).unwrap();

        // End combat
        sim.combat_manager.fronts[front_idx].is_combat_active = false;
        sim.step_dt(0.0);

        // Attacker population stays at 80%: zero survivor refund
        assert!((sim.factions[0].population - (initial_pop * 0.80)).abs() < 1.0);
    }

    // 20. AI strategy seed differs correctly between factions
    #[test]
    fn test_20_ai_strategy_seed_differs_between_factions() {
        let mut compact_count = 0;
        let mut directional_count = 0;
        let mut multi_axis_count = 0;
        let mut opp_count = 0;

        for bot_id in 1..=44 {
            let arch = BotExpansionArchetype::for_bot(42, bot_id);
            match arch {
                BotExpansionArchetype::CompactRadial => compact_count += 1,
                BotExpansionArchetype::DirectionalLobe => directional_count += 1,
                BotExpansionArchetype::MultiAxis => multi_axis_count += 1,
                BotExpansionArchetype::Opportunistic => opp_count += 1,
            }
        }

        assert!(compact_count >= 8, "Must have sufficient CompactRadial bots, got {}", compact_count);
        assert!(directional_count >= 8, "Must have sufficient DirectionalLobe bots, got {}", directional_count);
        assert!(multi_axis_count >= 5, "Must have sufficient MultiAxis bots, got {}", multi_axis_count);
        assert!(opp_count >= 4, "Must have sufficient Opportunistic bots, got {}", opp_count);
    }

    // 21. Same deterministic seed reproduces AI decisions
    #[test]
    fn test_21_same_deterministic_seed_reproduces_ai_decisions() {
        let mut sim1 = Simulation::new_standard(Some("roma"), 99);
        let mut sim2 = Simulation::new_standard(Some("roma"), 99);
        let mut bot1 = BotManager::with_seed(43, 99);
        let mut bot2 = BotManager::with_seed(43, 99);

        for tick in 1..=60 {
            sim1.tick = tick;
            sim2.tick = tick;
            bot1.generate_bot_actions(&mut sim1);
            bot2.generate_bot_actions(&mut sim2);
            sim1.step_dt(0.05);
            sim2.step_dt(0.05);
        }

        for i in 0..sim1.factions.len() {
            assert!(
                (sim1.factions[i].population - sim2.factions[i].population).abs() < 1e-3,
                "Deterministic seed must produce identical population: {} vs {}",
                sim1.factions[i].population,
                sim2.factions[i].population
            );
            assert_eq!(sim1.factions[i].territory_count, sim2.factions[i].territory_count);
        }
    }

    // 22. Different civs/geographies produce multiple opening morphologies
    #[test]
    fn test_22_multiple_opening_morphologies() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        let mut bot = BotManager::with_seed(43, 42);

        // Run 100 ticks (5 seconds)
        for tick in 1..=100 {
            sim.tick = tick;
            bot.generate_bot_actions(&mut sim);
            sim.step_dt(0.05);
        }

        let mut aspect_ratios = Vec::new();
        for f in &sim.factions {
            if f.territory_count >= 3 {
                let cells: Vec<u32> = sim.cells.iter().enumerate()
                    .filter(|(_, c)| c.owner_id == f.faction_id)
                    .map(|(i, _)| i as u32)
                    .collect();
                let min_x = cells.iter().map(|&c| c % WORLD_WIDTH as u32).min().unwrap();
                let max_x = cells.iter().map(|&c| c % WORLD_WIDTH as u32).max().unwrap();
                let min_y = cells.iter().map(|&c| c / WORLD_WIDTH as u32).min().unwrap();
                let max_y = cells.iter().map(|&c| c / WORLD_WIDTH as u32).max().unwrap();
                let dx = (max_x - min_x + 1) as f64;
                let dy = (max_y - min_y + 1) as f64;
                let aspect = (dx / dy.max(1.0)).max(dy / dx.max(1.0));
                aspect_ratios.push(aspect);
            }
        }

        assert!(aspect_ratios.len() >= 10);
        let min_aspect = aspect_ratios.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_aspect = aspect_ratios.iter().cloned().fold(0.0f64, f64::max);
        assert!(max_aspect - min_aspect > 0.5, "Territories must have diverse aspect ratios, range: [{:.2}, {:.2}]", min_aspect, max_aspect);
    }

    // 23. FRONTIER-capable AI produces compact/radial shapes
    #[test]
    fn test_23_frontier_capable_ai_compact_shapes() {
        let (sim, cap) = setup_open_grid_sim();
        let patch = generate_frontier_distribution_patch(&sim.cells, 1, 10);
        let mut min_x = cap % WORLD_WIDTH as u32;
        let mut max_x = min_x;
        let mut min_y = cap / WORLD_WIDTH as u32;
        let mut max_y = min_y;

        for &c in &patch.cells {
            let x = c % WORLD_WIDTH as u32;
            let y = c / WORLD_WIDTH as u32;
            min_x = min_x.min(x);
            max_x = max_x.max(x);
            min_y = min_y.min(y);
            max_y = max_y.max(y);
        }

        let dx = (max_x - min_x + 1) as f64;
        let dy = (max_y - min_y + 1) as f64;
        let aspect = (dx / dy).max(dy / dx);
        assert!(aspect <= 2.2, "FRONTIER expansion must produce compact shape, aspect: {:.2}", aspect);
    }

    // 24. FOCUS-capable AI produces directional but non-snake shapes
    #[test]
    fn test_24_focus_capable_ai_directional_non_snake() {
        let (sim, cap) = setup_open_grid_sim();
        let patch = generate_focus_corridor_patch(&sim.cells, 1, cap + 30, 8);
        assert_eq!(patch.cells.len(), 8);

        // Distinct Y coordinates must be >= 2
        let ys: HashSet<u32> = patch.cells.iter().map(|&c| c / WORLD_WIDTH as u32).collect();
        assert!(ys.len() >= 2, "FOCUS lobe must have meaningful front width >= 2 cells");
    }

    // 25. Repeated AI operations obey real Population economy
    #[test]
    fn test_25_repeated_ai_operations_obey_economy() {
        let (mut sim, cap) = setup_open_grid_sim();
        let p0 = sim.factions[0].population;

        // Perform 3 sequential operations
        sim.process_expand_command_with_mode(1, cap + 1, "FOCUS", Some(0.12)).unwrap();
        let p1 = sim.factions[0].population;
        assert!(p1 < p0);

        sim.process_expand_command_with_mode(1, cap + 2, "FOCUS", Some(0.12)).unwrap();
        let p2 = sim.factions[0].population;
        assert!(p2 < p1);

        sim.process_expand_command_with_mode(1, cap + 3, "FOCUS", Some(0.12)).unwrap();
        let p3 = sim.factions[0].population;
        assert!(p3 < p2);

        assert!(p3 < 7_500.0, "Repeated operations must naturally exhaust living reserves");
    }

    // 26. Input smoke regressions
    #[test]
    fn test_26_input_smoke_regressions() {
        let sim = Simulation::new_standard(Some("roma"), 42);
        assert_eq!(sim.factions.len(), 44);
        assert!(!sim.match_over);
    }

    // 27. Lifecycle smoke regressions
    #[test]
    fn test_27_lifecycle_smoke_regressions() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        assert_eq!(sim.macro_phase, MacroPhase::ExpansionEra);
        assert_eq!(sim.tick, 0);

        sim.step_dt(0.05);
        assert_eq!(sim.tick, 1);
        assert!(!sim.match_over);
    }

    // 28. 5-SECOND PACING HARNESS
    #[test]
    pub fn test_28_five_second_pacing_harness() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        let mut bot = BotManager::with_seed(43, 42);

        let checkpoints = [(0, "T=0"), (20, "T=1s"), (100, "T=5s"), (300, "T=15s"), (600, "T=30s"), (1200, "T=60s")];
        for (target_tick, label) in checkpoints {
            while sim.tick < target_tick {
                sim.tick += 1;
                bot.generate_bot_actions(&mut sim);
                sim.step_dt(0.05);
            }

            let max_area = sim.factions.iter().map(|f| f.controlled_area_km2).fold(0.0f64, f64::max);
            let avg_area = sim.factions.iter().map(|f| f.controlled_area_km2).sum::<f64>() / sim.factions.len() as f64;
            let avg_growth = sim.factions.iter().map(|f| f.population_growth_per_second).sum::<f64>() / sim.factions.len() as f64;

            println!(
                "Pacing [{} (tick {})]: Max Area: {:.1} km², Avg Area: {:.1} km², Avg Growth: {:.1}/s",
                label, target_tick, max_area, avg_area, avg_growth
            );

            // At T=5s (tick 100), max area must NOT explode to continental scale (> 60K km²)
            if target_tick == 100 {
                assert!(
                    max_area < 60_000.0,
                    "At T=5s, max civilization area must remain local (< 60K km²), got {:.1} km²",
                    max_area
                );
            }
        }
    }

    // 29. COMMITMENT TEST MATRIX
    #[test]
    pub fn test_29_commitment_test_matrix() {
        let percentages = [0.01, 0.05, 0.10, 0.12, 0.20, 0.50, 0.75];
        let base_pop = 10_000.0;

        println!("\n=== COMMITMENT TEST MATRIX (10K STARTING POPULATION) ===");
        println!("{:<8} {:<10} {:<10} {:<12} {:<12}", "Commit%", "Pop Cost", "Cells", "Est Area km²", "Efficiency");

        let mut prev_cells = 0;
        let mut prev_eff = f64::MAX;

        for &pct in &percentages {
            let commit_pop = base_pop * pct;
            let cells = cells_for_commitment(commit_pop);
            let est_area = (cells as f64) * STARTING_NUCLEUS_AREA_TARGET_KM2;
            let eff = if commit_pop > 0.0 { (cells as f64) / commit_pop } else { 0.0 };

            println!(
                "{:<8.0}% {:<10.0} {:<10} {:<12.0} {:<12.6}",
                pct * 100.0,
                commit_pop,
                cells,
                est_area,
                eff
            );

            if pct >= 0.05 {
                assert!(cells >= prev_cells, "Monotonic total cells gained");
            }
            if pct >= 0.12 {
                assert!(eff <= prev_eff + 1e-6, "Diminishing efficiency per population beyond sweet spot");
            }

            prev_cells = cells;
            if pct >= 0.12 {
                prev_eff = eff;
            }
        }

        let eff12 = (cells_for_commitment(1_200.0) as f64) / 1_200.0;
        let eff50 = (cells_for_commitment(5_000.0) as f64) / 5_000.0;
        assert!(eff12 > eff50, "50% commitment must be less efficient than 12% sweet spot");
    }
}
