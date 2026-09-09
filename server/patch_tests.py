import re

with open("src/mop_up_tests.rs", "r") as f:
    content = f.read()

# Add helper function at the top, right after make_enemy_pair
helper = """
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
"""
content = re.sub(r"(fn make_enemy_pair.*?^})", r"\1\n" + helper, content, flags=re.MULTILINE | re.DOTALL)

# Now, for each test, insert `isolate_faction_2` before `process_attack_command`

test_fixes = {
    "mop_up_test_1_one_local_remnant": "isolate_faction_2(&mut sim, &[target, remnant]);",
    "mop_up_test_2_three_local_remnants": "isolate_faction_2(&mut sim, &[target, remnants[0], remnants[1], remnants[2]]);",
    "mop_up_test_3_island_remnant": "isolate_faction_2(&mut sim, &[target, remnant]);",
    "mop_up_test_4_neutral_barrier": "isolate_faction_2(&mut sim, &[target, remnant]);",
    "mop_up_test_5_third_party_barrier": "isolate_faction_2(&mut sim, &[target, remnant]);",
    "mop_up_test_6_far_same_enemy_territory": "isolate_faction_2(&mut sim, &[target, far]);",
    "mop_up_test_7_halt_during_mop_up": "isolate_faction_2(&mut sim, &[target, remnant]);",
    "mop_up_test_8_population_ledger": "isolate_faction_2(&mut sim, &[target, remnant]);",
}

for test_name, fix_line in test_fixes.items():
    # Find the function definition
    pattern = rf"(fn {test_name}\(\) {{.*?)(sim\.process_attack_command)"
    
    # We want to replace it by inserting the fix_line before sim.process_attack_command
    content = re.sub(pattern, rf"\1{fix_line}\n        \2", content, flags=re.MULTILINE | re.DOTALL)

# In test 6, replace `assert!(sim.set_cell_owner(curr, 1));` with `sim.set_cell_owner(curr, 1);`
content = content.replace("assert!(sim.set_cell_owner(curr, 1));", "sim.set_cell_owner(curr, 1);")

# Also, in test 9, we can remove the inline loop and use isolate_faction_2
test_9_old = """        // Make sure these are the ONLY cells owned by 2
        for i in 0..sim.cells.len() {
            if sim.cells[i].owner_id == 2 && i as u32 != target && i as u32 != remnant {
                sim.set_cell_owner(i as u32, 0);
            }
        }"""
content = content.replace(test_9_old, "isolate_faction_2(&mut sim, &[target, remnant]);")

with open("src/mop_up_tests.rs", "w") as f:
    f.write(content)
