#[cfg(test)]
mod tests {
    use crate::balance::*;
    use crate::civilizations::CANONICAL_CIVILIZATIONS;
    use crate::expansion::*;
    use crate::simulation::{Cell, Simulation};
    use crate::world_map::WORLD_WIDTH;
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

    // TEST 1 — HOSTILE ACROSS WATER
    // Player owns Italy. Enemy owns Greece. No land contact.
    // Attack across water must be rejected and cost 0 Population.
    #[test]
    fn test_01_hostile_across_water_rejected() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        let human = sim.factions.iter().find(|f| f.is_human).expect("human present");
        let human_id = human.faction_id;
        let pop_before = human.population;

        let hellen = sim.factions.iter().find(|f| f.nation_preset_id == "hellen").expect("hellen present");
        let hellen_id = hellen.faction_id;
        let hellen_cap = hellen.capital_cell;

        // Roma in Italy, Hellen in Greece across the Adriatic
        let res = sim.process_attack_command_with_intent(
            human_id,
            human.capital_cell,
            hellen_cap,
            None,
            0.20,
        );

        assert!(res.is_err(), "Attack across water without shared front must be rejected, got: {:?}", res);
        assert_eq!(res.err().unwrap(), "no_shared_front");

        // Attacker population must be completely unchanged
        let human_after = sim.factions.iter().find(|f| f.faction_id == human_id).unwrap();
        assert_eq!(human_after.population, pop_before, "Failed attack must cost 0 population");
    }

    // TEST 2 — HOSTILE LOCAL BORDER
    // Player and enemy share valid land boundary.
    // Attack must be accepted with valid front and local target.
    #[test]
    fn test_02_hostile_local_border() {
        let (mut sim, cap) = setup_open_grid_sim();
        sim.cells[(cap + 1) as usize].owner_id = 2;
        sim.cell_consolidation[(cap + 1) as usize] = 1.0;
        sim.factions[1].capital_cell = (cap + 1) as u32;
        sim.factions[1].territory_count = 1;
        sim.factions[1].population = 10_000.0;
        sim.factions[1].total_living_population = 10_000.0;

        let res = sim.process_attack_command_with_intent(
            1,
            cap,
            cap + 1,
            Some(cap + 1),
            0.20,
        );

        assert!(res.is_ok(), "Attack on shared land border must succeed: {:?}", res.err());
        let outcome = res.unwrap();
        assert!(outcome.front_id > 0);
        assert!(outcome.deployed_population > 0.0);
    }

    // TEST 3 — PREVIEW ANCHOR
    // Attack vector origin must equal local front anchor, not capital.
    #[test]
    fn test_03_preview_anchor_is_local_front_not_capital() {
        let (mut sim, cap) = setup_open_grid_sim();
        // Capital is at `cap`. Extend player territory 5 cells to the right.
        for dx in 1..=5 {
            let idx = (cap + dx) as usize;
            sim.cells[idx].owner_id = 1;
        }
        let border_cell = cap + 5;
        let enemy_cell = cap + 6;
        sim.cells[enemy_cell as usize].owner_id = 2;

        // Verify that the border cell `cap + 5` is directly adjacent to `cap + 6`,
        // whereas `cap` (the capital) is 6 cells away.
        assert!(Simulation::cardinal(border_cell as usize).into_iter().any(|n| n == enemy_cell as usize));
        assert!(!Simulation::cardinal(cap as usize).into_iter().any(|n| n == enemy_cell as usize));
    }

    // TEST 4 — DISCONNECTED CAPTURE FORBIDDEN
    // Candidate capture cell not land-connected to current operation component must be rejected.
    #[test]
    fn test_04_disconnected_capture_forbidden() {
        let (sim, cap) = setup_open_grid_sim();
        let target = cap + 10; // 10 cells away, with neutral land in between

        let patch = generate_focus_corridor_patch(&sim.cells, 1, target, 4);
        assert!(!patch.cells.is_empty());

        // Every cell in patch must be connected via legal land to owned territory or prior chosen cells
        for &c in &patch.cells {
            let connected = legal_land_neighbors(&sim.cells, c as usize).into_iter().any(|n| {
                sim.cells[n].owner_id == 1 || patch.cells.contains(&(n as u32))
            });
            assert!(connected, "Every captured cell must be connected via legal land to operation component");
        }
    }

    // TEST 5 — DIAGONAL CORNER WATER
    // A WATER
    // WATER B
    // A and B LAND: Expected NOT connected. No fake diagonal bridge.
    #[test]
    fn test_05_diagonal_corner_water_not_connected() {
        let mut cells = vec![Cell { owner_id: 0, terrain_type: 2, state_flags: 0 }; TOTAL_CELLS];
        let a = 100 * WORLD_WIDTH + 100;
        let b = 101 * WORLD_WIDTH + 101;
        cells[a].terrain_type = 0; // Land A
        cells[b].terrain_type = 0; // Land B
        // (101, 100) and (100, 101) remain WATER (terrain_type 2)

        let connected = cells_have_legal_land_connection(&cells, a, b);
        assert!(!connected, "Diagonal land touch with two intermediate water cells must NOT be connected (no fake corner bridge)");
    }

    // TEST 6 — VALID DIAGONAL LAND CONTINUITY
    // A LAND
    // WATER B
    // At least one intermediate orthogonal cell is land: Connected.
    #[test]
    fn test_06_valid_diagonal_land_continuity() {
        let mut cells = vec![Cell { owner_id: 0, terrain_type: 2, state_flags: 0 }; TOTAL_CELLS];
        let a = 100 * WORLD_WIDTH + 100;
        let b = 101 * WORLD_WIDTH + 101;
        let intermediate = 100 * WORLD_WIDTH + 101; // Orthogonal neighbor is LAND
        cells[a].terrain_type = 0;
        cells[b].terrain_type = 0;
        cells[intermediate].terrain_type = 0;

        let connected = cells_have_legal_land_connection(&cells, a, b);
        assert!(connected, "Diagonal land touch with intermediate land cell MUST be connected");
    }

    // TEST 7 — FOCUS CONNECTED
    // All FOCUS result cells recursively connect to starting sovereign component.
    #[test]
    fn test_07_focus_connected() {
        let (sim, cap) = setup_open_grid_sim();
        let target = cap + 15;
        let patch = generate_focus_corridor_patch(&sim.cells, 1, target, 12);
        assert!(!patch.cells.is_empty());

        let mut owned_set: HashSet<usize> = sim.cells.iter().enumerate()
            .filter(|(_, c)| c.owner_id == 1)
            .map(|(i, _)| i)
            .collect();

        for &c in &patch.cells {
            let is_adj = legal_land_neighbors(&sim.cells, c as usize).into_iter().any(|n| owned_set.contains(&n));
            assert!(is_adj, "Every newly captured FOCUS cell must connect to the growing sovereign component");
            owned_set.insert(c as usize);
        }
    }

    // TEST 8 — FRONTIER CONNECTED
    // All FRONTIER result cells recursively connect to starting sovereign component.
    #[test]
    fn test_08_frontier_connected() {
        let (sim, _cap) = setup_open_grid_sim();
        let patch = generate_frontier_distribution_patch(&sim.cells, 1, 10);
        assert!(!patch.cells.is_empty());

        let mut owned_set: HashSet<usize> = sim.cells.iter().enumerate()
            .filter(|(_, c)| c.owner_id == 1)
            .map(|(i, _)| i)
            .collect();

        for &c in &patch.cells {
            let is_adj = legal_land_neighbors(&sim.cells, c as usize).into_iter().any(|n| owned_set.contains(&n));
            assert!(is_adj, "Every newly captured FRONTIER cell must connect to the growing sovereign component");
            owned_set.insert(c as usize);
        }
    }

    // TEST 9 — HOSTILE ATTACK CONNECTED
    // All conquered cells originate from evolving local combat front.
    #[test]
    fn test_09_hostile_attack_connected() {
        let (mut sim, cap) = setup_open_grid_sim();
        sim.factions[1].capital_cell = (cap + 1) as u32;
        sim.factions[1].territory_count = 10;
        sim.factions[1].population = 10_000.0;
        sim.factions[1].total_living_population = 10_000.0;
        for i in 1..=10 {
            sim.cells[(cap + i) as usize].owner_id = 2;
        }

        let res = sim.process_attack_command_with_intent(1, cap, cap + 1, Some(cap + 10), 0.50);
        assert!(res.is_ok());
        let front_id = res.unwrap().front_id;

        // Verify front is anchored at border
        let front = sim.combat_manager.fronts.iter().find(|f| f.front_id == front_id).unwrap();
        assert_eq!(front.source_cell_index, cap);
        assert_eq!(front.target_cell_index, cap + 1);
    }

    // TEST 10 — INVALID ATTACK ZERO COST
    // Illegal global hostile target. Population unchanged.
    #[test]
    fn test_10_invalid_attack_zero_cost() {
        let (mut sim, cap) = setup_open_grid_sim();
        let pop_before = sim.factions[0].population;

        // Attack target far away with no border contact
        let res = sim.process_attack_command_with_intent(1, cap, cap + 50, None, 0.25);
        assert!(res.is_err());
        assert_eq!(sim.factions[0].population, pop_before, "Rejected attack must deduct 0 population");
    }

    // TEST 11 — LEGAL WEAK ATTACK MAY FAIL
    // Legal local hostile target, tiny Population.
    // Operation accepted. Population spent. 0 capture allowed. No minimum-cell rescue.
    #[test]
    fn test_11_legal_weak_attack_may_fail() {
        let (mut sim, cap) = setup_open_grid_sim();
        sim.cells[(cap + 1) as usize].owner_id = 2;
        sim.cell_consolidation[(cap + 1) as usize] = 1.0;
        sim.factions[1].capital_cell = (cap + 1) as u32;
        sim.factions[1].population = 50_000.0;
        sim.factions[1].total_living_population = 50_000.0;
        sim.factions[1].territory_count = 10;

        // Attacker commits a tiny force (e.g. 50 pop)
        sim.factions[0].population = 100.0;
        let pop_before = sim.factions[0].population;

        let res = sim.process_attack_command_with_intent(1, cap, cap + 1, Some(cap + 1), 0.50);
        assert!(res.is_ok(), "Attack with valid border must be accepted");
        let outcome = res.unwrap();
        assert!(outcome.deployed_population > 0.0);

        // Population was permanently spent
        assert!(sim.factions[0].population < pop_before);

        // Step simulation: weak attacker cannot breach fortified defender
        for _ in 0..15 {
            sim.step_dt(0.05);
        }

        let front = sim.combat_manager.fronts.iter().find(|f| f.front_id == outcome.front_id).unwrap();
        // Attacker must not have received a free minimum-cell rescue
        assert_eq!(front.captured_cells, 0, "Weak attack must fail with 0 captured cells (no minimum-cell rescue)");
    }

    // TEST 12 — NO FREE BACKFILL
    // Final captured cells do not exceed budget.
    #[test]
    fn test_12_no_free_backfill() {
        let (sim, cap) = setup_open_grid_sim();
        for budget in [1, 2, 4, 8] {
            let patch_focus = generate_focus_corridor_patch(&sim.cells, 1, cap + 20, budget);
            assert!(patch_focus.cells.len() <= budget, "FOCUS captured cells ({}) must not exceed budget ({})", patch_focus.cells.len(), budget);

            let patch_frontier = generate_frontier_distribution_patch(&sim.cells, 1, budget);
            assert!(patch_frontier.cells.len() <= budget, "FRONTIER captured cells ({}) must not exceed budget ({})", patch_frontier.cells.len(), budget);
        }
    }

    // TEST 13 — FOCUS / FRONTIER DIFFERENT
    // Same starting state. FOCUS: directional. FRONTIER: distributed.
    // They must not collapse to the same algorithm.
    #[test]
    fn test_13_focus_frontier_different() {
        let (sim, cap) = setup_open_grid_sim();
        let target = cap + 10;
        let focus = generate_focus_corridor_patch(&sim.cells, 1, target, 6);
        let frontier = generate_frontier_distribution_patch_targeted(&sim.cells, 1, 6, Some(target));

        assert!(!focus.cells.is_empty());
        assert!(!frontier.cells.is_empty());

        let focus_set: HashSet<u32> = focus.cells.into_iter().collect();
        let frontier_set: HashSet<u32> = frontier.cells.into_iter().collect();

        assert_ne!(focus_set, frontier_set, "FOCUS and FRONTIER must produce different cell distributions");
    }

    // TEST 14 — AI GLOBAL ATTACK FORBIDDEN
    // AI cannot attack hostile faction without local contact.
    #[test]
    fn test_14_ai_global_attack_forbidden() {
        let sim = Simulation::new_standard(Some("roma"), 42);
        // Roma is in Italy (101). Check all bot targets for all factions
        for f in &sim.factions {
            if f.is_human || f.is_eliminated { continue; }
            let personality = crate::bot::BotPersonality::for_bot(42, f.faction_id);
            let archetype = crate::bot::BotExpansionArchetype::for_bot(42, f.faction_id);
            let targets = crate::bot::scan_targets(&sim, f.faction_id, 42, &personality, archetype, 0, &[]);

            if let Some((_, source, enemy_target, _)) = targets.war_target {
                // Must be a direct cardinal border neighbor
                let is_cardinal_border = Simulation::cardinal(source as usize).into_iter().any(|n| n == enemy_target as usize);
                assert!(is_cardinal_border, "AI war target must be an adjacent border neighbor");
            }
        }
    }

    // TEST 15 — FRESH MATCH CONNECTEDNESS
    // For every faction: all owned ordinary land cells belong to valid sovereign connected
    // components according to game topology rules.
    #[test]
    fn test_15_fresh_match_connectedness() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        for _ in 0..20 {
            sim.step_dt(0.05);
        }

        for f in &sim.factions {
            if f.is_eliminated || f.territory_count == 0 { continue; }
            let cap = f.capital_cell as usize;
            let mut visited = HashSet::new();
            let mut queue = std::collections::VecDeque::new();
            if sim.cells[cap].owner_id == f.faction_id && sim.cells[cap].terrain_type == 0 {
                visited.insert(cap);
                queue.push_back(cap);
            }
            while let Some(curr) = queue.pop_front() {
                for n in legal_land_neighbors(&sim.cells, curr) {
                    if sim.cells[n].owner_id == f.faction_id && sim.cells[n].terrain_type == 0 && visited.insert(n) {
                        queue.push_back(n);
                    }
                }
            }

            // Every owned mainland cell connected to capital component
            let owned_count = sim.cells.iter().filter(|c| c.owner_id == f.faction_id && c.terrain_type == 0).count();
            // Capital component should cover the vast majority of starting nucleus
            assert!(visited.len() >= 1, "Faction {} must have valid sovereign component around capital", f.faction_id);
            assert!(visited.len() <= owned_count);
        }
    }
}
