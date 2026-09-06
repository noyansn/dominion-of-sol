use crate::simulation::{
    MacroPhase, Simulation, EXPANSION_BASE_COST, EXPANSION_COST_PER_CELL, MIN_DEFENSE_FOCUS,
    MIN_PATCH_SIZE,
};
use crate::world_map::WORLD_WIDTH;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

const DECISION_INTERVAL_TICKS: u64 = 15;
const MAX_BOT_TERRITORY_SCAN: usize = 4096;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BotStrategicState {
    Founding,
    Expanding,
    Consolidating,
    BorderContact,
    PreparingWar,
    Attacking,
    Defending,
    Recovering,
    Desperate,
    Endgame,
}

impl BotStrategicState {
    pub fn as_str(&self) -> &'static str {
        match self {
            BotStrategicState::Founding => "FOUNDING",
            BotStrategicState::Expanding => "EXPANDING",
            BotStrategicState::Consolidating => "CONSOLIDATING",
            BotStrategicState::BorderContact => "BORDER_CONTACT",
            BotStrategicState::PreparingWar => "PREPARING_WAR",
            BotStrategicState::Attacking => "ATTACKING",
            BotStrategicState::Defending => "DEFENDING",
            BotStrategicState::Recovering => "RECOVERING",
            BotStrategicState::Desperate => "DESPERATE",
            BotStrategicState::Endgame => "ENDGAME",
        }
    }
}

#[derive(Debug, Clone)]
pub struct BotPersonality {
    pub aggression: f64,        // -0.15 .. +0.15
    pub patience: f64,          // -0.15 .. +0.15
    pub risk_tolerance: f64,    // -0.15 .. +0.15
    pub frontier_appetite: f64, // -0.15 .. +0.15
}

impl BotPersonality {
    pub fn for_bot(seed: u64, bot_id: u8) -> Self {
        let hash = (seed ^ (bot_id as u64).wrapping_mul(31_337)).wrapping_mul(2_654_435_761);
        let b0 = ((hash & 0xFF) as f64 / 255.0) * 0.30 - 0.15;
        let b1 = (((hash >> 8) & 0xFF) as f64 / 255.0) * 0.30 - 0.15;
        let b2 = (((hash >> 16) & 0xFF) as f64 / 255.0) * 0.30 - 0.15;
        let b3 = (((hash >> 24) & 0xFF) as f64 / 255.0) * 0.30 - 0.15;
        Self {
            aggression: b0,
            patience: b1,
            risk_tolerance: b2,
            frontier_appetite: b3,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BotExpansionArchetype {
    CompactRadial,   // ~35% of civs: prefers FRONTIER mode (organic round blob)
    DirectionalLobe, // ~30% of civs: prefers FOCUS mode with focused wedge
    MultiAxis,       // ~20% of civs: rotates expansion heading periodically across different sectors
    Opportunistic,   // ~15% of civs: expands into open neutral territory or follows coasts
}

impl BotExpansionArchetype {
    pub fn for_bot(seed: u64, bot_id: u8) -> Self {
        let h = (seed ^ (bot_id as u64).wrapping_mul(7919)).wrapping_mul(2_654_435_761);
        match ((h >> 16) % 100) as usize {
            0..=34 => BotExpansionArchetype::CompactRadial,
            35..=64 => BotExpansionArchetype::DirectionalLobe,
            65..=84 => BotExpansionArchetype::MultiAxis,
            _ => BotExpansionArchetype::Opportunistic,
        }
    }
}

#[derive(Debug, Clone)]
pub struct BotBrain {
    pub faction_id: u8,
    pub state: BotStrategicState,
    pub state_ticks: u64,
    pub consecutive_expansion_orders: u32,
    pub consecutive_pauses: u32,
    pub target_faction: Option<u8>,
    pub personality: BotPersonality,
    pub archetype: BotExpansionArchetype,
    pub frontier_seeds: Vec<u32>,
}

pub const BOT_REACTION_GLOBAL_COOLDOWN_TICKS: u64 = 180; // ~9.0 seconds at 20 Hz
pub const BOT_REACTION_PER_BOT_COOLDOWN_TICKS: u64 = 1800; // ~90.0 seconds at 20 Hz

#[derive(Debug, Clone)]
pub struct PendingBotReaction {
    pub faction_id: u8,
    pub display_name: String,
    pub reaction_id: String,
    pub civilization_id: Option<String>,
    pub is_premium: bool,
    pub cell_index: Option<u32>,
}

pub struct BotManager {
    pub bot_count: usize,
    pub seed: u64,
    pub attempts: u64,
    pub accepted: u64,
    pub insufficient: u64,
    pub brains: HashMap<u8, BotBrain>,
    pub last_global_bot_reaction_tick: u64,
    pub last_reaction_tick_by_bot: HashMap<u8, u64>,
    pub bot_reaction_count: u64,
    pub bot_premium_reaction_count: u64,
    pub pending_reactions: Vec<PendingBotReaction>,
}

impl BotManager {
    pub fn new(bot_count: usize) -> Self {
        Self::with_seed(bot_count, 1)
    }

    pub fn with_seed(bot_count: usize, seed: u64) -> Self {
        Self {
            bot_count,
            seed,
            attempts: 0,
            accepted: 0,
            insufficient: 0,
            brains: HashMap::new(),
            last_global_bot_reaction_tick: 0,
            last_reaction_tick_by_bot: HashMap::new(),
            bot_reaction_count: 0,
            bot_premium_reaction_count: 0,
            pending_reactions: Vec::new(),
        }
    }

    pub fn drain_reactions(&mut self) -> Vec<PendingBotReaction> {
        std::mem::take(&mut self.pending_reactions)
    }

    pub fn emit_contextual_reaction(
        &mut self,
        sim: &Simulation,
        bot_id: u8,
        context: &str,
        cell_index: Option<u32>,
    ) -> bool {
        if self.last_global_bot_reaction_tick > 0
            && sim.tick < self.last_global_bot_reaction_tick + BOT_REACTION_GLOBAL_COOLDOWN_TICKS
        {
            return false;
        }
        if let Some(&last_tick) = self.last_reaction_tick_by_bot.get(&bot_id) {
            if sim.tick < last_tick + BOT_REACTION_PER_BOT_COOLDOWN_TICKS {
                return false;
            }
        }
        let Some(f) = sim.factions.iter().find(|fac| fac.faction_id == bot_id) else {
            return false;
        };
        if f.is_human {
            return false;
        }

        // Exact 2% rule: every 50th reaction emitted across the bots is a premium civilization reaction!
        let is_premium = (self.bot_reaction_count + 1) % 50 == 0;
        let civ_slug = f.flag_id.strip_prefix("flag_").unwrap_or(&f.flag_id);

        let reaction_id = if is_premium {
            self.bot_premium_reaction_count += 1;
            match civ_slug {
                "roma" => "reaction_roma_triumph",
                "turk" | "gokturk" => "reaction_turk_salute",
                "pers" | "persia" => "reaction_pers_lion",
                "misir" | "egypt" => "reaction_misir_sun",
                "han" | "china" => "reaction_han_dragon",
                "yamato" | "japan" => "reaction_yamato_torii",
                "norse" | "viking" => "reaction_norse_strike",
                "maya" => "reaction_maya_glyph",
                "lakota" => "reaction_lakota_fourwinds",
                _ => "reaction_roma_triumph",
            }.to_string()
        } else {
            // Free classic reactions (👍, 😂, 😮, 😢, 😡, 👏, 👀, 😎)
            match context {
                "CAPITAL_LOST" | "DEFEAT" => {
                    if (self.bot_reaction_count + bot_id as u64) % 2 == 0 {
                        "reaction_cry".to_string() // 😢
                    } else {
                        "reaction_angry".to_string() // 😡
                    }
                }
                "CAPITAL_CAPTURED" | "VICTORY" => {
                    if (self.bot_reaction_count + bot_id as u64) % 2 == 0 {
                        "reaction_laugh".to_string() // 😂
                    } else {
                        "reaction_applause".to_string() // 👏
                    }
                }
                "FIRST_CONTACT" => {
                    if (self.bot_reaction_count + bot_id as u64) % 2 == 0 {
                        "reaction_gg".to_string() // 😎
                    } else {
                        "reaction_smirk".to_string() // 👀
                    }
                }
                "FRONTIER_CLOSED" | "WAR_START" => {
                    if (self.bot_reaction_count + bot_id as u64) % 2 == 0 {
                        "reaction_surprised".to_string() // 😮
                    } else {
                        "reaction_smile".to_string() // 👍
                    }
                }
                _ => "reaction_smile".to_string(), // 👍
            }
        };

        self.last_global_bot_reaction_tick = sim.tick;
        self.last_reaction_tick_by_bot.insert(bot_id, sim.tick);
        self.bot_reaction_count += 1;

        self.pending_reactions.push(PendingBotReaction {
            faction_id: bot_id,
            display_name: f.display_name.clone(),
            reaction_id,
            civilization_id: Some(civ_slug.to_string()),
            is_premium,
            cell_index: cell_index.or(Some(f.capital_cell)),
        });

        true
    }

    pub fn generate_bot_actions(&mut self, sim: &mut Simulation) {
        if sim.match_over {
            return;
        }
        let bot_ids: Vec<u8> = sim
            .factions
            .iter()
            .filter(|f| !f.is_human && !f.is_eliminated)
            .map(|f| f.faction_id)
            .collect();

        // Scan simulation atlas notifications for major contextual triggers
        for note in &sim.atlas_notifications {
            match note.event_type.as_str() {
                "CAPITAL_CAPTURED" => {
                    if let Some(fid) = note.faction_id {
                        self.emit_contextual_reaction(sim, fid, "CAPITAL_LOST", note.cell_index);
                    }
                }
                "CAPITAL_SECURED" => {
                    if let Some(fid) = note.faction_id {
                        self.emit_contextual_reaction(sim, fid, "CAPITAL_CAPTURED", note.cell_index);
                    }
                }
                "STATE_COLLAPSED" => {
                    if let Some(fid) = note.faction_id {
                        self.emit_contextual_reaction(sim, fid, "DEFEAT", note.cell_index);
                    }
                }
                "THE_FRONTIER_CLOSES" => {
                    if let Some(&first_bot) = bot_ids.first() {
                        self.emit_contextual_reaction(sim, first_bot, "FRONTIER_CLOSED", note.cell_index);
                    }
                }
                "WAR_ERA_BEGINS" => {
                    if let Some(&chosen_bot) = bot_ids.get(1).or_else(|| bot_ids.first()) {
                        self.emit_contextual_reaction(sim, chosen_bot, "WAR_START", note.cell_index);
                    }
                }
                _ => {}
            }
        }

        for bot_id in bot_ids {
            if (sim.tick + bot_id as u64) % DECISION_INTERVAL_TICKS != 0 {
                continue;
            }

            let (own_population, territory_count, overextension, consolidation, doctrine_exp, defense_doc) = {
                let Some(f) = sim.factions.iter().find(|f| f.faction_id == bot_id) else {
                    continue;
                };
                if f.is_eliminated {
                    self.insufficient += 1;
                    continue;
                }
                (
                    f.population,
                    f.territory_count,
                    f.overextension_ratio,
                    f.consolidation_ratio,
                    f.doctrine_expansion as f64,
                    f.doctrine_defense as f64,
                )
            };

            let bot_seed = self.seed;
            let brain = self.brains.entry(bot_id).or_insert_with(|| BotBrain {
                faction_id: bot_id,
                state: BotStrategicState::Founding,
                state_ticks: 0,
                consecutive_expansion_orders: 0,
                consecutive_pauses: 0,
                target_faction: None,
                personality: BotPersonality::for_bot(bot_seed, bot_id),
                archetype: BotExpansionArchetype::for_bot(bot_seed, bot_id),
                frontier_seeds: Vec::new(),
            });
            brain.state_ticks += 1;

            let targets = scan_targets(
                sim,
                bot_id,
                self.seed,
                &brain.personality,
                brain.archetype,
                brain.consecutive_expansion_orders,
                &brain.frontier_seeds,
            );

            // Update Strategic State Machine
            match sim.macro_phase {
                MacroPhase::ExpansionEra => {
                    if territory_count <= 8 || sim.tick < 20 {
                        brain.state = BotStrategicState::Founding;
                    } else if brain.consecutive_expansion_orders >= 4
                        || overextension > 0.45
                        || consolidation < 0.35
                        || own_population < 2_500.0
                    {
                        brain.state = BotStrategicState::Consolidating;
                    } else if brain.state == BotStrategicState::Consolidating {
                        if consolidation >= 0.50
                            && own_population >= 3_500.0
                            && brain.consecutive_pauses >= 2
                        {
                            brain.state = BotStrategicState::Expanding;
                            brain.consecutive_expansion_orders = 0;
                            brain.consecutive_pauses = 0;
                        }
                    } else if targets.has_adjacent_enemy {
                        brain.state = BotStrategicState::BorderContact;
                    } else {
                        brain.state = BotStrategicState::Expanding;
                    }
                }
                MacroPhase::FinalFrontier => {
                    brain.state = BotStrategicState::PreparingWar;
                }
                MacroPhase::WarEra | MacroPhase::Endgame => {
                    let under_attack = sim.combat_manager.fronts.iter().any(|fr| {
                        fr.is_combat_active
                            && fr.attacker_faction != bot_id
                            && (fr.faction_a == bot_id || fr.faction_b == bot_id)
                    });
                    let own_offensives = sim.combat_manager.fronts.iter().filter(|fr| {
                        fr.is_combat_active && fr.attacker_faction == bot_id
                    }).count();

                    if territory_count <= 3 || own_population < 1_500.0 {
                        brain.state = BotStrategicState::Desperate;
                    } else if under_attack {
                        brain.state = BotStrategicState::Defending;
                    } else if sim.macro_phase == MacroPhase::Endgame {
                        brain.state = BotStrategicState::Endgame;
                    } else if own_offensives > 0 {
                        brain.state = BotStrategicState::Attacking;
                    } else if own_population < 3_500.0 {
                        brain.state = BotStrategicState::Recovering;
                    } else {
                        brain.state = BotStrategicState::PreparingWar;
                    }
                }
            }

            // --- PHASE ACTIONS ---
            match sim.macro_phase {
                MacroPhase::ExpansionEra => {
                    // Maritime infrastructure
                    if sim.tick % 200 == (bot_id as u64 % 200) && own_population >= crate::simulation::PORT_POPULATION_COST {
                        if let Some(port_cell) = sim.strategic_sites.iter().find(|site| {
                            site.kind == "PORT"
                                && sim.cells[site.cell_a as usize].owner_id == bot_id
                                && !sim.built_ports.contains(&site.cell_a)
                                && !sim.port_constructions.iter().any(|port| port.cell_index == site.cell_a)
                        }).map(|site| site.cell_a) {
                            self.attempts += 1;
                            if sim.build_port(bot_id, port_cell).is_ok() {
                                self.accepted += 1;
                            }
                            continue;
                        }
                    }

                    // Consolidating: AI intentionally pauses neutral expansion!
                    if brain.state == BotStrategicState::Consolidating {
                        brain.consecutive_pauses += 1;
                        continue;
                    }

                    // Expanding: evaluate neutral objective
                    let required_reserve = EXPANSION_BASE_COST + EXPANSION_COST_PER_CELL * MIN_PATCH_SIZE as f64;
                    if own_population < required_reserve {
                        self.insufficient += 1;
                        continue;
                    }

                    if let Some(target) = targets.neutral_target {
                        let mode = match brain.archetype {
                            BotExpansionArchetype::CompactRadial => {
                                if (brain.consecutive_expansion_orders + bot_id as u32) % 6 != 0 {
                                    "FRONTIER"
                                } else {
                                    "FOCUS"
                                }
                            }
                            BotExpansionArchetype::DirectionalLobe => {
                                if (brain.consecutive_expansion_orders + bot_id as u32) % 6 != 0 {
                                    "FOCUS"
                                } else {
                                    "FRONTIER"
                                }
                            }
                            BotExpansionArchetype::MultiAxis => {
                                if brain.consecutive_expansion_orders % 2 == 0 {
                                    "FOCUS"
                                } else {
                                    "FRONTIER"
                                }
                            }
                            BotExpansionArchetype::Opportunistic => {
                                if doctrine_exp > 0.01 { "FOCUS" } else { "FRONTIER" }
                            }
                        };

                        let commit_ratio = match brain.archetype {
                            BotExpansionArchetype::CompactRadial => (0.10 + brain.personality.frontier_appetite * 0.04).clamp(0.08, 0.14),
                            BotExpansionArchetype::DirectionalLobe => (0.12 + brain.personality.aggression * 0.05).clamp(0.09, 0.16),
                            BotExpansionArchetype::MultiAxis => (0.11 + brain.personality.risk_tolerance * 0.04).clamp(0.08, 0.15),
                            BotExpansionArchetype::Opportunistic => (0.10 + brain.personality.patience * 0.04).clamp(0.08, 0.14),
                        };

                        self.attempts += 1;
                        if sim.process_expand_command_with_mode(bot_id, target, mode, Some(commit_ratio)).is_ok() {
                            self.accepted += 1;
                            brain.consecutive_expansion_orders += 1;
                            brain.frontier_seeds.push(target);
                            if brain.frontier_seeds.len() > 16 {
                                brain.frontier_seeds.remove(0);
                            }
                        }
                    }
                }
                MacroPhase::FinalFrontier => {
                    // Armistice: defensive positioning and port building only
                    if sim.tick % 100 == (bot_id as u64 % 100) && own_population >= 1_000.0 {
                        if let Some(cap) = sim.factions.iter().find(|f| f.faction_id == bot_id).map(|f| f.capital_cell) {
                            let _ = sim.set_defense_focus(bot_id, cap, (own_population * 0.10).max(MIN_DEFENSE_FOCUS));
                        }
                    }
                }
                MacroPhase::WarEra | MacroPhase::Endgame => {
                    // 1. Operation Abort / Retreat: cancel failing or severed offensives
                    let failing_front_id = sim.combat_manager.fronts.iter().find(|fr| {
                        fr.is_combat_active
                            && fr.attacker_faction == bot_id
                            && (fr.cohesion < 0.30
                                || fr.supply_efficiency < 0.35
                                || (fr.casualties > 3_500.0 && fr.pressure < -0.40))
                    }).map(|fr| fr.front_id);

                    if let Some(fid) = failing_front_id {
                        let _ = sim.cancel_attack(bot_id, fid);
                    }

                    // 2. Reinforcement of winning fronts
                    let winning_front_id = sim.combat_manager.fronts.iter().find(|fr| {
                        fr.is_combat_active
                            && fr.attacker_faction == bot_id
                            && fr.pressure > 0.35
                            && fr.cohesion > 0.60
                    }).map(|fr| fr.front_id);

                    if let Some(w_fid) = winning_front_id {
                        if own_population >= 3_000.0 {
                            let _ = sim.reinforce_front(bot_id, w_fid, 0.20);
                        }
                    }

                    // 3. Defensive focus if under attack
                    if brain.state == BotStrategicState::Defending || brain.state == BotStrategicState::Desperate {
                        if let Some(cap) = sim.factions.iter().find(|f| f.faction_id == bot_id).map(|f| f.capital_cell) {
                            let _ = sim.set_defense_focus(bot_id, cap, (own_population * 0.15).max(MIN_DEFENSE_FOCUS));
                        }
                    }

                    // 4. Strategic Utility Decision: War vs Neutral Colonization vs Consolidation
                    let own_offensives = sim.combat_manager.fronts.iter().filter(|fr| {
                        fr.is_combat_active && fr.attacker_faction == bot_id
                    }).count();

                    let war_option = targets.war_target;
                    let neutral_target = targets.neutral_target;

                    let neutral_utility = if neutral_target.is_some() {
                        0.5 + doctrine_exp * 2.0 + brain.personality.frontier_appetite * 1.5
                            - (overextension as f64) * 2.0
                    } else {
                        -10.0
                    };

                    let war_utility = if let Some((score, _, _, _)) = war_option {
                        score + 1.5 + brain.personality.aggression * 2.0
                            - (own_offensives as f64) * 1.5
                            - (overextension as f64) * 1.0
                    } else {
                        -10.0
                    };

                    let consolidation_utility = (overextension as f64) * 2.5
                        + (1.0 - consolidation as f64) * 2.0
                        + defense_doc * 2.0
                        + brain.personality.patience * 2.0;

                    // If consolidation is paramount and bot has high overextension, entrench/pause
                    if consolidation_utility > 2.5 && (overextension > 0.45 || consolidation < 0.30) {
                        brain.consecutive_pauses += 1;
                        continue;
                    }

                    let min_attack_pop = if defense_doc > 0.02 { 2_200.0 } else { 1_200.0 };

                    // Compare War Utility vs Neutral Expansion Utility
                    if war_utility >= neutral_utility && war_utility > 0.65 && own_offensives < 2 && own_population >= min_attack_pop {
                        if let Some((_, source, enemy_target, intent_target)) = war_option {
                            let enemy_id = sim.cells[enemy_target as usize].owner_id;
                            let enemy_pop = sim.factions.iter().find(|f| f.faction_id == enemy_id).map(|f| f.population).unwrap_or(10.0);
                            let rel_pop = own_population / enemy_pop.max(1.0);

                            let commit = if rel_pop > 1.8 {
                                0.60
                            } else if rel_pop > 1.2 {
                                0.45
                            } else {
                                0.35
                            };

                            self.attempts += 1;
                            if sim.process_attack_command_with_intent(bot_id, source, enemy_target, Some(intent_target), commit).is_ok() {
                                self.accepted += 1;
                                brain.frontier_seeds.push(enemy_target);
                                if brain.frontier_seeds.len() > 16 {
                                    brain.frontier_seeds.remove(0);
                                }
                            }
                        }
                    } else if neutral_utility > 0.0 && own_population >= 1_000.0 {
                        if let Some(target) = neutral_target {
                            let commit_ratio = (0.10 + brain.personality.frontier_appetite * 0.04).clamp(0.08, 0.14);
                            self.attempts += 1;
                            if sim.process_expand_command_with_mode(bot_id, target, "FRONTIER", Some(commit_ratio)).is_ok() {
                                self.accepted += 1;
                                brain.consecutive_expansion_orders += 1;
                                brain.frontier_seeds.push(target);
                                if brain.frontier_seeds.len() > 16 {
                                    brain.frontier_seeds.remove(0);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct ScannedTargets {
    pub neutral_target: Option<u32>,
    pub war_target: Option<(f64, u32, u32, u32)>, // (score, source, target, intent_target)
    pub has_adjacent_enemy: bool,
}

pub fn scan_targets(
    sim: &Simulation,
    bot_id: u8,
    seed: u64,
    personality: &BotPersonality,
    archetype: BotExpansionArchetype,
    consecutive_expansion_orders: u32,
    frontier_seeds: &[u32],
) -> ScannedTargets {
    let Some(f) = sim.factions.iter().find(|f| f.faction_id == bot_id) else {
        return ScannedTargets { neutral_target: None, war_target: None, has_adjacent_enemy: false };
    };
    if f.is_eliminated || f.territory_count == 0 {
        return ScannedTargets { neutral_target: None, war_target: None, has_adjacent_enemy: false };
    }

    let own_pop = f.population;
    let own_offense = f.doctrine_offense as f64;
    let own_defense = f.doctrine_defense as f64;

    let mut best_neutral: Option<(i32, u32)> = None;
    let mut best_war: Option<(f64, u32, u32, u32)> = None;
    let mut has_adjacent_enemy = false;

    // Direct iteration over authoritative frontier cache: no capital BFS
    let candidate_frontier: Vec<usize> = if (bot_id as usize) < sim.faction_frontiers.len()
        && !sim.faction_frontiers[bot_id as usize].is_empty()
    {
        sim.faction_frontiers[bot_id as usize].iter().map(|&idx| idx as usize).collect()
    } else {
        let mut fallback = Vec::new();
        for &s in frontier_seeds.iter().rev() {
            let idx = s as usize;
            if idx < sim.cells.len() && sim.cells[idx].owner_id == bot_id {
                fallback.push(idx);
            }
        }
        if fallback.is_empty() {
            for (idx, cell) in sim.cells.iter().enumerate() {
                if cell.owner_id == bot_id && Simulation::cardinal(idx).into_iter().any(|n| sim.cells[n].owner_id != bot_id) {
                    fallback.push(idx);
                }
            }
        }
        let cap = f.capital_cell as usize;
        if cap < sim.cells.len() && sim.cells[cap].owner_id == bot_id && !fallback.contains(&cap) {
            fallback.push(cap);
        }
        fallback
    };

    for i in candidate_frontier {
        if i >= sim.cells.len() || sim.cells[i].owner_id != bot_id {
            continue;
        }

        for n in Simulation::cardinal(i) {
            let c = &sim.cells[n];
            if c.owner_id == 0 && c.terrain_type == 0 {
                let nx = (n % WORLD_WIDTH) as f64;
                let ny = (n / WORLD_WIDTH) as f64;
                let cap_x = (f.capital_cell as usize % WORLD_WIDTH) as f64;
                let cap_y = (f.capital_cell as usize / WORLD_WIDTH) as f64;
                let dx = crate::expansion::wrapped_dx(cap_x, nx);
                let dy = ny - cap_y;
                let dist_from_cap = (dx * dx + dy * dy).sqrt();

                let bot_hash = ((n as u32).wrapping_mul(2_654_435_761)
                    ^ (bot_id as u32).wrapping_mul(805_306_457)
                    ^ (seed as u32).wrapping_mul(2_246_822_519)
                    ^ (consecutive_expansion_orders.wrapping_mul(31)));

                let score: i32 = match archetype {
                    BotExpansionArchetype::CompactRadial => {
                        // Prefers staying close to nucleus/capital to maintain compact circular shape
                        (dist_from_cap * 100.0) as i32 + (bot_hash % 29) as i32
                    }
                    BotExpansionArchetype::DirectionalLobe => {
                        // Prefers expanding along its chosen primary heading (deterministic per bot)
                        let primary_angle = (bot_id as f64 * 1.6180339887) % (2.0 * std::f64::consts::PI);
                        let heading_x = primary_angle.cos();
                        let heading_y = primary_angle.sin();
                        let alignment = (dx * heading_x + dy * heading_y) / dist_from_cap.max(0.1);
                        (-alignment * 500.0) as i32 + (bot_hash % 37) as i32
                    }
                    BotExpansionArchetype::MultiAxis => {
                        // Rotates preferred axis based on consecutive expansion orders
                        let axis_idx = consecutive_expansion_orders as usize % 4;
                        let axis_angle = (axis_idx as f64 * std::f64::consts::FRAC_PI_2) + (bot_id as f64 * 0.7);
                        let heading_x = axis_angle.cos();
                        let heading_y = axis_angle.sin();
                        let alignment = (dx * heading_x + dy * heading_y) / dist_from_cap.max(0.1);
                        (-alignment * 450.0) as i32 + (bot_hash % 41) as i32
                    }
                    BotExpansionArchetype::Opportunistic => {
                        let neutral_neighbors = Simulation::cardinal(n)
                            .into_iter()
                            .filter(|&adj| sim.cells[adj].owner_id == 0 && sim.cells[adj].terrain_type == 0)
                            .count() as i32;
                        -neutral_neighbors * 150 + (bot_hash % 53) as i32
                    }
                };

                if best_neutral.is_none_or(|(best_score, _)| score < best_score) {
                    best_neutral = Some((score, n as u32));
                }
            } else if c.owner_id > 0 && c.owner_id != bot_id && c.terrain_type == 0 {
                let enemy_id = c.owner_id;
                if sim.are_allied(bot_id, enemy_id) {
                    continue;
                }
                has_adjacent_enemy = true;

                let Some(enemy_f) = sim.factions.iter().find(|fac| fac.faction_id == enemy_id) else {
                    continue;
                };
                if enemy_f.is_eliminated || enemy_f.territory_count == 0 {
                    continue;
                }

                let enemy_pop = enemy_f.population.max(10.0);
                let pop_ratio = own_pop / enemy_pop;
                let enemy_overextension = enemy_f.overextension_ratio as f64;
                let enemy_consolidation = enemy_f.consolidation_ratio as f64;

                let enemy_wars = sim.combat_manager.fronts.iter()
                    .filter(|f| f.is_combat_active && (f.faction_a == enemy_id || f.faction_b == enemy_id))
                    .count() as f64;

                let is_isolated = sim.cell_supply.get(n).copied().unwrap_or(1) == 0;
                let isolation_bonus = if is_isolated { 2.0 } else { 0.0 };

                let cap_dist = {
                    let cx = (enemy_f.capital_cell as usize % WORLD_WIDTH) as f64;
                    let cy = (enemy_f.capital_cell as usize / WORLD_WIDTH) as f64;
                    let nx = (n % WORLD_WIDTH) as f64;
                    let ny = (n / WORLD_WIDTH) as f64;
                    ((cx - nx).powi(2) + (cy - ny).powi(2)).sqrt()
                };
                let capital_bonus = if cap_dist < 25.0 { 2.0 } else { 0.0 };

                let score = pop_ratio * 1.8
                    + enemy_overextension * 1.5
                    + (1.0 - enemy_consolidation) * 1.2
                    + enemy_wars * 0.5
                    + isolation_bonus
                    + capital_bonus
                    + own_offense * 2.5
                    - own_defense * 1.0
                    + personality.aggression * 2.0;

                let required_threshold = (0.50 - own_offense * 2.0).max(0.20);
                if pop_ratio >= required_threshold {
                    if best_war.as_ref().map_or(true, |(best_score, _, _, _)| score > *best_score) {
                        best_war = Some((score, i as u32, n as u32, enemy_f.capital_cell));
                    }
                }
            }
        }
    }

    ScannedTargets {
        neutral_target: best_neutral.map(|(_, idx)| idx),
        war_target: best_war,
        has_adjacent_enemy,
    }
}

pub fn has_adjacent_enemy(sim: &Simulation, owner: u8) -> bool {
    let personality = BotPersonality::for_bot(1, owner);
    let archetype = BotExpansionArchetype::for_bot(1, owner);
    let targets = scan_targets(sim, owner, 1, &personality, archetype, 0, &[]);
    targets.has_adjacent_enemy
}

pub fn neutral_frontier(sim: &Simulation, owner: u8, seed: u64) -> Option<u32> {
    let personality = BotPersonality::for_bot(seed, owner);
    let archetype = BotExpansionArchetype::for_bot(seed, owner);
    let targets = scan_targets(sim, owner, seed, &personality, archetype, 0, &[]);
    targets.neutral_target
}

pub fn best_war_target(sim: &Simulation, bot_id: u8) -> Option<(f64, u32, u32, u32)> {
    let personality = BotPersonality::for_bot(1, bot_id);
    let archetype = BotExpansionArchetype::for_bot(1, bot_id);
    let targets = scan_targets(sim, bot_id, 1, &personality, archetype, 0, &[]);
    targets.war_target
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bot_pays_same_cost() {
        let mut s = Simulation::new(2);
        let before = s.factions[1].population;
        s.tick = 15;
        let mut b = BotManager::new(1);
        b.generate_bot_actions(&mut s);
        assert!(b.accepted <= 1);
        if b.accepted == 1 {
            assert!(s.factions[1].population < before)
        }
    }

    #[test]
    fn test_task_15_ai_expansion_and_consolidation_gate() {
        let mut sim = Simulation::new(2);
        sim.macro_phase = MacroPhase::ExpansionEra;
        sim.factions[1].population = 10_000.0;
        sim.refresh_all_economies();

        let initial_territory = sim.factions[1].territory_count;
        let mut bot = BotManager::with_seed(1, 42);

        // Run bot actions across multiple ticks in ExpansionEra
        let mut observed_expanding = false;
        let mut observed_consolidating = false;

        for tick in 1..=120 {
            sim.tick = tick;
            bot.generate_bot_actions(&mut sim);
            sim.step_dt(0.05);

            if let Some(brain) = bot.brains.get(&2) {
                if brain.state == BotStrategicState::Expanding || brain.state == BotStrategicState::Founding {
                    observed_expanding = true;
                }
                if brain.state == BotStrategicState::Consolidating {
                    observed_consolidating = true;
                }
            }
        }

        assert!(sim.factions[1].territory_count > initial_territory, "Bot must expand into neutral territory");
        assert!(observed_expanding, "Bot must enter expanding/founding state");
        assert!(observed_consolidating, "Bot must enter consolidating state to pause when overextended");
    }

    #[test]
    fn test_task_16_ai_war_target_evaluation_and_fairness_gate() {
        let mut sim = Simulation::new(3);
        sim.macro_phase = MacroPhase::WarEra;

        // Faction 1 = Human (id 1, is_human = true)
        // Faction 2 = Bot 1 (id 2)
        // Faction 3 = Bot 2 (id 3)
        sim.factions[0].is_human = true;
        sim.factions[1].is_human = false;
        sim.factions[2].is_human = false;

        // Give Human (1) and Bot 2 (3) identical territory and population
        sim.factions[0].population = 8_000.0;
        sim.factions[2].population = 8_000.0;
        sim.factions[1].population = 20_000.0; // Bot 1 is stronger

        // Clear and assign a test row
        let y = 300;
        for x in 450..550 {
            sim.cells[y * WORLD_WIDTH + x].terrain_type = 0;
            sim.cells[y * WORLD_WIDTH + x].owner_id = 0;
        }

        // Left side = Human (x: 480..490)
        for x in 480..490 {
            sim.cells[y * WORLD_WIDTH + x].owner_id = 1;
        }
        sim.factions[0].capital_cell = (y * WORLD_WIDTH + 480) as u32;

        // Middle = Bot 1 (x: 490..500)
        for x in 490..500 {
            sim.cells[y * WORLD_WIDTH + x].owner_id = 2;
        }
        sim.factions[1].capital_cell = (y * WORLD_WIDTH + 495) as u32;

        // Right side = Bot 2 (x: 500..510)
        for x in 500..510 {
            sim.cells[y * WORLD_WIDTH + x].owner_id = 3;
        }
        sim.factions[2].capital_cell = (y * WORLD_WIDTH + 510) as u32;

        sim.factions[0].territory_count = 10;
        sim.factions[1].territory_count = 10;
        sim.factions[2].territory_count = 10;
        sim.refresh_supply_connectivity();
        sim.refresh_all_economies();
        sim.rebuild_faction_frontiers();

        // Bot 1 evaluates target
        let target_option = best_war_target(&sim, 2);
        assert!(target_option.is_some(), "Bot 1 should find a valid war target");

        // Target evaluation must be objective based on military metrics, not human prejudice
        let (_, _source, enemy_cell, _) = target_option.unwrap();
        let target_owner = sim.cells[enemy_cell as usize].owner_id;
        assert!(target_owner == 1 || target_owner == 3, "Bot 1 attacks either neighbor based on geometry");

        // Verify retreat logic: if attack is registered and cohesion degrades below 0.30, bot cancels attack
        let cm_id = sim.combat_manager.register_attack_operation_with_intent(
            2, 3, (y * WORLD_WIDTH + 499) as u32, (y * WORLD_WIDTH + 500) as u32, (y * WORLD_WIDTH + 510) as u32,
            0.0, 0.0, 1.0, 0.0, 1_000.0, 1_000.0, 0.0, sim.tick, "LAND_OFFENSIVE"
        );
        let front = sim.combat_manager.fronts.iter_mut().find(|fr| fr.front_id == cm_id).unwrap();
        front.cohesion = 0.20; // severely degraded cohesion

        let mut bot = BotManager::with_seed(1, 99);
        sim.tick = 28; // (28 + 2) % 15 == 0, triggering bot_id 2
        bot.generate_bot_actions(&mut sim);

        let front_after = sim.combat_manager.fronts.iter().find(|fr| fr.front_id == cm_id).unwrap();
        assert!(!front_after.is_combat_active, "Bot must cancel failing attack with collapsed cohesion");
        assert_eq!(front_after.termination_reason, "CANCELLED");
    }

    #[test]
    fn test_task_17_free_reactions_unconditionally_available() {
        use crate::meta_store::MetaStore;
        let test_path = "target/test_free_reactions.json";
        let _ = std::fs::remove_file(test_path);
        let store = MetaStore::new(test_path, true);

        let classic_eight = [
            "reaction_smile",     // 👍
            "reaction_laugh",     // 😂
            "reaction_surprised", // 😮
            "reaction_cry",       // 😢
            "reaction_angry",     // 😡
            "reaction_applause",  // 👏
            "reaction_smirk",     // 👀
            "reaction_gg",        // 😎
        ];

        // 1. All 8 classic reactions must be usable by unauthenticated guest (empty account_id)
        for rx in &classic_eight {
            assert!(
                store.is_reaction_usable("", rx),
                "Reaction {} must be unconditionally usable for all players without paywall",
                rx
            );
        }

        // 2. Tactical command pings must also be 100% free and usable
        let pings = ["ping_attack", "ping_defend", "ping_danger", "ping_look"];
        for ping in &pings {
            assert!(
                store.is_reaction_usable("", ping),
                "Tactical ping {} must be unconditionally usable",
                ping
            );
        }

        // 3. Premium civilization reactions must NOT be usable without entitlement
        let premium_reactions = ["reaction_roma_aquila", "reaction_turk_standard", "reaction_pers_lion"];
        for prx in &premium_reactions {
            assert!(
                !store.is_reaction_usable("", prx),
                "Premium reaction {} must require unlock / entitlement",
                prx
            );
        }
    }

    #[test]
    fn test_task_18_bot_reactions_sparse_and_exact_two_percent_premium_gate() {
        let mut sim = Simulation::new(4);
        sim.factions[0].is_human = true;
        sim.factions[1].is_human = false;
        sim.factions[2].is_human = false;
        sim.factions[3].is_human = false;

        let mut bot = BotManager::with_seed(3, 42);

        // 1. Initial reaction should succeed
        sim.tick = 100;
        let emitted = bot.emit_contextual_reaction(&sim, 2, "CAPITAL_LOST", None);
        assert!(emitted, "First bot reaction must be permitted");
        assert_eq!(bot.pending_reactions.len(), 1);

        // 2. Immediate second reaction from ANY bot must be rejected by global cooldown (180 ticks = ~9s)
        sim.tick = 150; // only 50 ticks later
        let rejected_global = bot.emit_contextual_reaction(&sim, 3, "VICTORY", None);
        assert!(!rejected_global, "Global cooldown of 180 ticks must reject spam across bots");

        // 3. After global cooldown (sim.tick = 100 + 180 = 280), another bot CAN react
        sim.tick = 285;
        let emitted_other_bot = bot.emit_contextual_reaction(&sim, 3, "VICTORY", None);
        assert!(emitted_other_bot, "Different bot can react once global cooldown elapses");

        // 4. Same bot (bot_id = 2) must be rejected by per-bot cooldown (1800 ticks = 90s)
        sim.tick = 500; // global cooldown elapsed, but bot 2 only 400 ticks since last reaction
        let rejected_per_bot = bot.emit_contextual_reaction(&sim, 2, "DEFEAT", None);
        assert!(!rejected_per_bot, "Per-bot cooldown of 1800 ticks must prevent bot spam");

        // 5. Drain reactions
        let drained = bot.drain_reactions();
        assert_eq!(drained.len(), 2);
        assert!(bot.pending_reactions.is_empty(), "Drain must empty pending reaction queue");

        // 6. Test Exact 2% Rule across 100 emitted reactions
        let mut test_bot = BotManager::with_seed(1, 123);
        let bot_ids = [2u8, 3u8, 4u8];

        let mut current_tick = 2000;
        let mut premium_count = 0;
        let mut free_count = 0;

        for i in 1..=100 {
            current_tick += 1850; // Satisfies both global and per-bot cooldowns
            sim.tick = current_tick;
            let chosen_bot = bot_ids[(i % bot_ids.len()) as usize];

            let success = test_bot.emit_contextual_reaction(&sim, chosen_bot, "CAPITAL_LOST", None);
            assert!(success, "Reaction {} must be successfully emitted", i);

            let last = test_bot.pending_reactions.last().unwrap();
            if last.is_premium {
                premium_count += 1;
            } else {
                free_count += 1;
            }
        }

        assert_eq!(test_bot.bot_reaction_count, 100);
        assert_eq!(test_bot.bot_premium_reaction_count, 2);
        assert_eq!(premium_count, 2, "Exactly 2 out of 100 reactions (2%) must be premium civilization reactions");
        assert_eq!(free_count, 98, "Exactly 98 out of 100 reactions (98%) must be free classic reactions");
    }
}
