import re

with open("src/mop_up_tests.rs", "r") as f:
    content = f.read()

# Fix test 3
content = content.replace("isolate_faction_2(&mut sim, &[target, remnant]);\n        sim.process_attack_command(1, source, target, 0.5).unwrap();\n        for _ in 0..20 { sim.step_dt(1.0); }",
                          "isolate_faction_2(&mut sim, &[target, island]);\n        sim.process_attack_command(1, source, target, 0.5).unwrap();\n        for _ in 0..20 { sim.step_dt(1.0); }")

# Fix test 7
content = content.replace("let order = isolate_faction_2(&mut sim, &[target, remnant]);\n        sim.process_attack_command(1, source, target, 0.5).unwrap();",
                          "isolate_faction_2(&mut sim, &[target, remnant]);\n        let order = sim.process_attack_command(1, source, target, 0.5).unwrap();")

with open("src/mop_up_tests.rs", "w") as f:
    f.write(content)
