#[cfg(test)]
mod mop_up_tests {
    use super::*;



    fn make_enemy_pair(sim: &mut Simulation, attacker: u8, defender: u8) -> (u32, u32) {
        sim.evaluate_match_outcome = false;
        for i in 0..sim.cells.len() {
            if sim.cells[i].owner_id == attacker {
                if let Some(n) = Simulation::cardinal(i).into_iter().find(|&n| sim.cells[n].terrain_type == 0 && sim.cells[n].owner_id == defender) {
                    return (i as u32, n as u32);
                }
            }
        }
        let source = (0..sim.cells.len()).find(|&i| {
            sim.cells[i].owner_id == attacker
                && Simulation::cardinal(i).into_iter().any(|n| sim.cells[n].terrain_type == 0 && sim.cells[n].owner_id == 0)
        }).expect("frontier source");
        let target = Simulation::cardinal(source).into_iter().find(|&n| sim.cells[n].terrain_type == 0 && sim.cells[n].owner_id == 0).expect("frontier target");
        assert!(sim.set_cell_owner(target as u32, defender));
        (source as u32, target as u32)
    }

    #[test]
    fn mop_up_test_1_one_local_remnant() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        // Add a local remnant adjacent to target
        let remnant = Simulation::cardinal(target as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        assert!(sim.set_cell_owner(remnant, 2));

        isolate_faction_2(&mut sim, &[target, remnant]);
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        
        // Step enough time to clear both
        for _ in 0..20 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[target as usize].owner_id, 1);
        assert_eq!(sim.cells[remnant as usize].owner_id, 1);
        assert_eq!(sim.combat_manager.fronts.len(), 1);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn mop_up_test_2_three_local_remnants() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        let mut remnants = Vec::new();
        let mut curr = target;
        for _ in 0..3 {
            curr = Simulation::cardinal(curr as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
            assert!(sim.set_cell_owner(curr, 2));
            remnants.push(curr);
        }

        isolate_faction_2(&mut sim, &[target, remnants[0], remnants[1], remnants[2]]);
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        for _ in 0..40 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[target as usize].owner_id, 1);
        for r in remnants {
            assert_eq!(sim.cells[r as usize].owner_id, 1);
        }
        assert_eq!(sim.combat_manager.fronts.len(), 1);
    }

    #[test]
    fn mop_up_test_3_island_remnant() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        // Find an island (not adjacent to any land)
        // For simplicity, just find a land cell completely surrounded by water, or just across water.
        // Or manually mock it: 
        let mut island = 0;
        for i in 0..sim.cells.len() {
            if sim.cells[i].owner_id == 0 && sim.cells[i].terrain_type == 0 && Simulation::cardinal(i).into_iter().all(|n| sim.cells[n].terrain_type == 2) {
                island = i as u32;
                break;
            }
        }
        if island == 0 {
            // Force an island if not generated
            island = 2; // top left corner
            sim.cells[island as usize].terrain_type = 0;
            sim.cells[island as usize].owner_id = 0;
            for n in Simulation::cardinal(island as usize) {
                sim.cells[n].terrain_type = 2; // surround with water
            }
        }
        assert!(sim.set_cell_owner(island, 2));

        isolate_faction_2(&mut sim, &[target, island]);
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        for _ in 0..20 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[target as usize].owner_id, 1);
        assert_eq!(sim.cells[island as usize].owner_id, 2, "Island should not be teleport-captured");
    }

    #[test]
    fn mop_up_test_4_neutral_barrier() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        let neutral = Simulation::cardinal(target as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        let remnant = Simulation::cardinal(neutral as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0 && n as u32 != target).unwrap() as u32;
        
        // neutral remains owner 0
        assert!(sim.set_cell_owner(remnant, 2));

        isolate_faction_2(&mut sim, &[target, remnant]);
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        for _ in 0..20 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[target as usize].owner_id, 1);
        assert_eq!(sim.cells[neutral as usize].owner_id, 0);
        assert_eq!(sim.cells[remnant as usize].owner_id, 2, "Neutral barrier should block mop-up");
    }

    #[test]
    fn mop_up_test_5_third_party_barrier() {
        let mut sim = Simulation::new(3);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        let third_party = Simulation::cardinal(target as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        let remnant = Simulation::cardinal(third_party as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0 && n as u32 != target).unwrap() as u32;
        
        assert!(sim.set_cell_owner(third_party, 3));
        assert!(sim.set_cell_owner(remnant, 2));

        isolate_faction_2(&mut sim, &[target, remnant]);
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        for _ in 0..20 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[target as usize].owner_id, 1);
        assert_eq!(sim.cells[third_party as usize].owner_id, 3);
        assert_eq!(sim.cells[remnant as usize].owner_id, 2, "Third party barrier should block mop-up");
    }

    #[test]
    fn mop_up_test_6_far_same_enemy_territory() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        // Create a chain of 20 attacker cells to put it out of local reach > 15
        let mut curr = target;
        for _ in 0..20 {
            curr = (curr + 1) % (1024 * 512);
            sim.cells[curr as usize].terrain_type = 0;
            sim.set_cell_owner(curr, 1);
        }
        let far = (curr + 1) % (1024 * 512);
        sim.cells[far as usize].terrain_type = 0;
        assert!(sim.set_cell_owner(far, 2));

        isolate_faction_2(&mut sim, &[target, far]);
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        for _ in 0..20 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[far as usize].owner_id, 2, "Far territory should not be mopped up");
    }

    #[test]
    fn mop_up_test_7_halt_during_mop_up() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        let remnant = Simulation::cardinal(target as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        assert!(sim.set_cell_owner(remnant, 2));

        isolate_faction_2(&mut sim, &[target, remnant]);
        let order = sim.process_attack_command(1, source, target, 0.5).unwrap();
        
        sim.step_dt(0.5); // pocket partially captured
        
        // Halt
        sim.cancel_attack(1, order.front_id).unwrap();
        
        for _ in 0..10 { sim.step_dt(1.0); }
        
        // Shouldn't capture remnant
        assert_eq!(sim.cells[remnant as usize].owner_id, 2);
    }

    #[test]
    fn mop_up_test_8_population_ledger() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].territory_count = 1000;
        sim.factions[0].population = 500_000.0;
        sim.factions[0].population_capacity = 1000_000.0;
        sim.factions[0].total_living_population = 500_000.0;
        sim.refresh_all_economies();
        // Since capacity is 10M, population is 500K, it WILL grow if not capped.
        // Wait, if we want it to not grow, we should set population = capacity!
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;

        let remnant = Simulation::cardinal(target as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        assert!(sim.set_cell_owner(remnant, 2));

        isolate_faction_2(&mut sim, &[target, remnant]);
        let pool_before_deploy = sim.factions[0].population;
        sim.process_attack_command(1, source, target, 0.2).unwrap(); // Deploy 0.2
        
        let pool_after_deploy = sim.factions[0].population;
        let deployed = sim.combat_manager.fronts[0].deployed_population_a;
        assert!((pool_after_deploy - (pool_before_deploy - deployed)).abs() < 0.1);
        
        let mut total_casualties = 0.0;
        let mut returned = false;
        
        for _ in 0..40 {
            if !sim.combat_manager.fronts[0].is_combat_active && !returned {
                returned = true;
            }
            if !returned {
                total_casualties = sim.combat_manager.fronts[0].casualties;
            }
            sim.step_dt(1.0);
        }
        
        assert_eq!(sim.cells[remnant as usize].owner_id, 1);
        
        let final_pool = sim.factions[0].population;
        assert!(final_pool < pool_before_deploy, "Committed population must not be refunded on operation end");
    }

    #[test]
    fn mop_up_test_9_defender_elimination() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].total_living_population = sim.factions[0].population_capacity;
        sim.factions[1].population = 0.0;
        sim.factions[1].total_living_population = 0.0;
        sim.refresh_all_economies();
        
        let remnant = Simulation::cardinal(target as usize).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        assert!(sim.set_cell_owner(remnant, 2));
        
isolate_faction_2(&mut sim, &[target, remnant]);
        
        sim.factions[1].territory_count = 2; // strictly two
        
        sim.process_attack_command(1, source, target, 0.5).unwrap();
        for _ in 0..20 { sim.step_dt(1.0); }
        
        assert_eq!(sim.cells[target as usize].owner_id, 1);
        assert_eq!(sim.cells[remnant as usize].owner_id, 1);
        assert!(sim.factions[1].is_eliminated, "Defender should be eliminated");
    }
}

fn isolate_faction_2(sim: &mut Simulation, keep_cells: &[u32]) {
    let mut to_clear = Vec::new();
    for i in 0..sim.cells.len() {
        if sim.cells[i].owner_id == 2 && !keep_cells.contains(&(i as u32)) {
            to_clear.push(i as u32);
        }
    }
    for c in to_clear {
        sim.set_cell_owner(c, 0);
    }
}

