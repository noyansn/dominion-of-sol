use crate::chokepoints::{build_strategic_sites, StrategicSiteInfo};
use crate::combat::CombatManager;
use crate::compact_patch::{generate_compact_patch, PatchMode, PatchResult};
use crate::factions::{generate_100_factions, generate_44_civilization_factions};
use crate::protocol::{AllianceInfo, AllianceProposalInfo, CellDelta, CellState, FactionInfo, PortStateInfo};
use crate::world_map::{
    cell_to_chunk, generate_world_land_mask, TOTAL_CELLS, WORLD_HEIGHT, WORLD_WIDTH,
};
use std::collections::{HashMap, HashSet, VecDeque};
use std::time::Instant;

pub const BASE_POPULATION_CAPACITY: f64 = 12_000.0;
pub const POPULATION_CAPACITY_PER_KM2: f64 = 0.00009;
pub const BASE_POPULATION_GROWTH: f64 = 2.0;
pub const POPULATION_GROWTH_PER_KM2: f64 = 0.00000012;
pub const EXPANSION_BASE_COST: f64 = 150.0;
pub const EXPANSION_COST_PER_CELL: f64 = 75.0;
pub const DEFAULT_PATCH_SIZE: usize = 8;
pub const MIN_PATCH_SIZE: usize = 4;
pub const PORT_POPULATION_GROWTH_BONUS: f64 = 0.5;
pub const PORT_POPULATION_COST: f64 = 1_200.0;
pub const MIN_ATTACK_DEPLOYMENT: f64 = 50.0;
pub const MIN_DEFENSE_FOCUS: f64 = 20.0;
pub const PLAYER_FACTION_ID: u8 = 101;
pub const AI_FACTION_COUNT: usize = 100;

const EARTH_RADIUS_KM: f64 = 6_371.0;
const CONSOLIDATION_SECONDS: f64 = 20.0;
const WAR_THEATRE_RADIUS: i32 = 28;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RelocationState {
    pub original_capital: u32,
    pub time_remaining: f32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AtlasNotificationEvent {
    pub event_type: String,
    pub message: String,
    pub faction_id: Option<u8>,
    pub cell_index: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct ExpansionOutcome {
    pub patch: PatchResult,
    pub population_cost: f64,
    pub first_contact: Option<(u8, u8, u32)>,
    pub resolved_anchor: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AttackOrderOutcome {
    pub front_id: u32,
    pub deployed_population: f64,
}

#[derive(Debug, Clone)]
pub struct DefenseFocus {
    pub faction_id: u8,
    pub cell_index: u32,
    pub deployed_population: f64,
}

#[derive(Debug, Clone)]
pub struct PortConstruction {
    pub cell_index: u32,
    pub builder: u8,
    pub remaining_seconds: f64,
}

#[derive(Debug, Clone, Copy)]
struct PendingAlliance {
    proposal_id: u16,
    proposer: u8,
    target: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MacroPhase {
    ExpansionEra,
    FinalFrontier,
    WarEra,
    Endgame,
}

impl MacroPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            MacroPhase::ExpansionEra => "EXPANSION_ERA",
            MacroPhase::FinalFrontier => "FINAL_FRONTIER",
            MacroPhase::WarEra => "WAR_ERA",
            MacroPhase::Endgame => "ENDGAME",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Cell {
    pub owner_id: u8,
    pub terrain_type: u8, // 0 = Land, 2 = Water
    pub state_flags: u8,
}

#[derive(Debug, Clone)]
struct PendingWarAdvance {
    front_index: usize,
    attacker: u8,
    defender: u8,
    cells: VecDeque<u32>,
    elapsed: f64,
}

#[derive(Debug, Clone)]
pub struct PendingExpansionAdvance {
    pub expansion_id: u32,
    pub faction_id: u8,
    pub cells: VecDeque<u32>,
    pub elapsed: f64,
    pub resolved_anchor: u32,
    pub first_contact: Option<(u8, u8, u32)>,
    pub had_sea_before: bool,
}

pub struct Simulation {
    pub tick: u64,
    pub sequence: u64,
    pub cells: Vec<Cell>,
    pub dirty_indices: Vec<u32>,
    pub dirty_chunks: HashSet<usize>,
    pub factions: Vec<FactionInfo>,
    pub combat_manager: CombatManager,
    pub total_land_cells: usize,
    pub strategic_sites: Vec<StrategicSiteInfo>,
    pub match_over: bool,
    pub winner_faction_id: Option<u8>,
    pub macro_phase: MacroPhase,
    pub macro_phase_timer: f32,
    pub cell_consolidation: Vec<f32>,
    pub cell_supply: Vec<u8>,
    pub defense_foci: Vec<DefenseFocus>,
    pub built_ports: HashSet<u32>,
    pub port_constructions: Vec<PortConstruction>,
    pub alliances: Vec<(u8, u8)>,
    pending_alliances: Vec<PendingAlliance>,
    next_alliance_proposal_id: u16,
    pending_war_advances: Vec<PendingWarAdvance>,
    pub pending_expansion_advances: Vec<PendingExpansionAdvance>,
    pub next_expansion_id: u32,
    pub relocation_states: HashMap<u8, RelocationState>,
    pub atlas_notifications: Vec<AtlasNotificationEvent>,
    // Metric Tracking for Balance Harness & Post-Reconstruction Analysis
    pub first_contact_tick: Option<u64>,
    pub first_war_tick: Option<u64>,
    pub first_elimination_tick: Option<u64>,
    pub half_field_tick: Option<u64>,
    pub surviving_civs_5min: usize,
    pub surviving_civs_10min: usize,
    pub neutral_land_remaining_at_first_war: usize,
    pub wars_started: usize,
    pub wars_completed: usize,
    pub total_war_ticks: u64,
    pub largest_battle_casualties: f64,
    pub territory_turnover: u32,
    pub max_overextension_seen: f32,
    pub recovery_events: usize,
    pub capital_captures_count: usize,
    pub capital_relocations_count: usize,
    pub encirclements_count: usize,
    pub evaluate_match_outcome: bool,
    pub faction_frontiers: Vec<HashSet<u32>>,
}

impl Simulation {
    pub fn new(faction_count: usize) -> Self {
        Self::with_seed(faction_count, 1)
    }

    pub fn new_standard(human_civ_id: Option<&str>, match_seed: u64) -> Self {
        let land_mask = generate_world_land_mask();
        let mut cells = Vec::with_capacity(TOTAL_CELLS);
        let mut total_land = 0;

        for &terrain in &land_mask {
            if terrain == 0 {
                total_land += 1;
            }
            cells.push(Cell {
                owner_id: 0,
                terrain_type: terrain,
                state_flags: 0,
            });
        }

        let mut factions = generate_44_civilization_factions(&land_mask, human_civ_id, match_seed);
        let combat_manager = CombatManager::new();
        let mut cell_consolidation = vec![0.0f32; TOTAL_CELLS];

        Self::seed_civilization_nuclei_with_seed(&mut cells, &mut cell_consolidation, &mut factions, match_seed);

        let strategic_sites = build_strategic_sites(&land_mask);
        let mut simulation = Self {
            tick: 0,
            sequence: 0,
            cells,
            dirty_indices: Vec::new(),
            dirty_chunks: HashSet::new(),
            factions,
            combat_manager,
            total_land_cells: total_land,
            strategic_sites,
            match_over: false,
            winner_faction_id: None,
            macro_phase: MacroPhase::ExpansionEra,
            macro_phase_timer: 0.0,
            cell_consolidation,
            cell_supply: vec![1; TOTAL_CELLS],
            defense_foci: Vec::new(),
            built_ports: HashSet::new(),
            port_constructions: Vec::new(),
            alliances: Vec::new(),
            pending_alliances: Vec::new(),
            next_alliance_proposal_id: 1,
            pending_war_advances: Vec::new(),
            pending_expansion_advances: Vec::new(),
            next_expansion_id: 1,
            relocation_states: HashMap::new(),
            atlas_notifications: Vec::new(),
            first_contact_tick: None,
            first_war_tick: None,
            first_elimination_tick: None,
            half_field_tick: None,
            surviving_civs_5min: 44,
            surviving_civs_10min: 44,
            neutral_land_remaining_at_first_war: 0,
            wars_started: 0,
            wars_completed: 0,
            total_war_ticks: 0,
            largest_battle_casualties: 0.0,
            territory_turnover: 0,
            max_overextension_seen: 0.0,
            recovery_events: 0,
            capital_captures_count: 0,
            capital_relocations_count: 0,
            encirclements_count: 0,
            evaluate_match_outcome: true,
            faction_frontiers: vec![HashSet::new(); 256],
        };

        simulation.recompute_area_stats();
        simulation.refresh_all_economies();
        simulation.rebuild_faction_frontiers();
        simulation
    }

    pub fn seed_single_faction_nucleus(
        cells: &mut [Cell],
        cell_consolidation: &mut [f32],
        faction: &mut FactionInfo,
        cap_idx: usize,
        seed: u64,
    ) {
        if cap_idx >= TOTAL_CELLS || cells[cap_idx].terrain_type != 0 {
            return;
        }

        cells[cap_idx].owner_id = faction.faction_id;
        cell_consolidation[cap_idx] = crate::balance::CONSOLIDATION_NEUTRAL_INITIAL;
        let mut current_area = Self::cell_area_km2(cap_idx);
        let mut owned_count = 1u32;

        let cap_x = cap_idx % WORLD_WIDTH;
        let cap_y = cap_idx / WORLD_WIDTH;
        let mut visited = HashSet::new();
        visited.insert(cap_idx);

        let faction_seed = seed
            .wrapping_add((faction.faction_id as u64).wrapping_mul(0x9E3779B97F4A7C15))
            .wrapping_add(cap_idx as u64);

        let mut pq = std::collections::BinaryHeap::new();

        let add_neighbors = |cell: usize,
                             pq: &mut std::collections::BinaryHeap<std::cmp::Reverse<(u64, u64, usize)>>,
                             visited: &mut HashSet<usize>| {
            let cx = cell % WORLD_WIDTH;
            let cy = cell / WORLD_WIDTH;
            let neighbors = [
                (cy > 0).then(|| (cy - 1) * WORLD_WIDTH + cx),
                Some(cy * WORLD_WIDTH + (cx + 1) % WORLD_WIDTH),
                (cy + 1 < WORLD_HEIGHT).then(|| (cy + 1) * WORLD_WIDTH + cx),
                Some(cy * WORLD_WIDTH + (cx + WORLD_WIDTH - 1) % WORLD_WIDTH),
            ];
            for n in neighbors.into_iter().flatten() {
                if visited.insert(n) {
                    let nx = n % WORLD_WIDTH;
                    let ny = n / WORLD_WIDTH;
                    let mut dx = (nx as isize - cap_x as isize).abs() as usize;
                    if dx > WORLD_WIDTH / 2 {
                        dx = WORLD_WIDTH - dx;
                    }
                    let dy = (ny as isize - cap_y as isize).abs() as usize;
                    let dist_sq = (dx * dx + dy * dy) as u64;
                    let hash = crate::compact_patch::tie_hash(faction_seed, n);
                    pq.push(std::cmp::Reverse((dist_sq, hash, n)));
                }
            }
        };

        add_neighbors(cap_idx, &mut pq, &mut visited);

        let target_area = crate::balance::STARTING_NUCLEUS_AREA_TARGET_KM2;
        let min_cells = crate::balance::STARTING_NUCLEUS_CELLS_MIN as u32;
        let max_cells = crate::balance::STARTING_NUCLEUS_CELLS_MAX as u32;

        while owned_count < max_cells {
            let Some(std::cmp::Reverse((dist_sq, _hash, next_cell))) = pq.pop() else {
                break;
            };

            // Keep compactness tight: do not wander far from capital
            if dist_sq > 8 {
                break;
            }

            if cells[next_cell].terrain_type == 0 && cells[next_cell].owner_id == 0 {
                let next_cell_area = Self::cell_area_km2(next_cell);
                if owned_count >= min_cells {
                    let diff_before = (current_area - target_area).abs();
                    let diff_after = (current_area + next_cell_area - target_area).abs();
                    if diff_after > diff_before && current_area >= target_area * 0.85 {
                        break;
                    }
                }

                cells[next_cell].owner_id = faction.faction_id;
                cell_consolidation[next_cell] = crate::balance::CONSOLIDATION_NEUTRAL_INITIAL;
                current_area += next_cell_area;
                owned_count += 1;
                add_neighbors(next_cell, &mut pq, &mut visited);
            }
        }

        faction.capital_cell = cap_idx as u32;
        faction.territory_count = owned_count;
        faction.controlled_area_km2 = current_area;
        faction.effective_controlled_area_km2 = current_area * crate::balance::CONSOLIDATION_NEUTRAL_INITIAL as f64;
        faction.consolidation_ratio = crate::balance::CONSOLIDATION_NEUTRAL_INITIAL;
        faction.population = crate::balance::INITIAL_LIVING_POPULATION;
        faction.total_living_population = crate::balance::INITIAL_LIVING_POPULATION;
        faction.deployed_population = 0.0;
        faction.is_eliminated = false;
        Self::refresh_faction_economy(faction);
    }

    pub fn seed_civilization_nuclei(
        cells: &mut [Cell],
        cell_consolidation: &mut [f32],
        factions: &mut [FactionInfo],
    ) {
        Self::seed_civilization_nuclei_with_seed(cells, cell_consolidation, factions, 42);
    }

    pub fn seed_civilization_nuclei_with_seed(
        cells: &mut [Cell],
        cell_consolidation: &mut [f32],
        factions: &mut [FactionInfo],
        match_seed: u64,
    ) {
        for faction in factions.iter_mut() {
            let cap_idx = faction.capital_cell as usize;
            Self::seed_single_faction_nucleus(cells, cell_consolidation, faction, cap_idx, match_seed);
        }
    }

    pub fn rebuild_faction_frontiers(&mut self) {
        for set in &mut self.faction_frontiers {
            set.clear();
        }
        for idx in 0..self.cells.len() {
            let owner = self.cells[idx].owner_id;
            if owner > 0 && self.cells[idx].terrain_type == 0 {
                let is_frontier = Self::cardinal(idx).into_iter().any(|n| {
                    self.cells[n].terrain_type == 0 && self.cells[n].owner_id != owner
                });
                if is_frontier {
                    self.faction_frontiers[owner as usize].insert(idx as u32);
                }
            }
        }
    }

    pub fn with_seed(faction_count: usize, match_seed: u64) -> Self {
        if faction_count == crate::balance::STANDARD_ACTIVE_CIVILIZATIONS {
            return Self::new_standard(None, match_seed);
        }

        let land_mask = generate_world_land_mask();
        let mut cells = Vec::with_capacity(TOTAL_CELLS);
        let mut total_land = 0;

        for &terrain in &land_mask {
            if terrain == 0 {
                total_land += 1;
            }
            cells.push(Cell {
                owner_id: 0,
                terrain_type: terrain,
                state_flags: 0,
            });
        }

        let mut factions = generate_100_factions(&land_mask, faction_count, match_seed);
        let combat_manager = CombatManager::new();
        let mut cell_consolidation = vec![0.0f32; TOTAL_CELLS];

        Self::seed_civilization_nuclei_with_seed(&mut cells, &mut cell_consolidation, &mut factions, match_seed);

        let strategic_sites = build_strategic_sites(&land_mask);
        let mut simulation = Self {
            tick: 0,
            sequence: 0,
            cells,
            dirty_indices: Vec::new(),
            dirty_chunks: HashSet::new(),
            factions,
            combat_manager,
            total_land_cells: total_land,
            strategic_sites,
            match_over: false,
            winner_faction_id: None,
            macro_phase: MacroPhase::WarEra,
            macro_phase_timer: 0.0,
            cell_consolidation,
            cell_supply: vec![1; TOTAL_CELLS],
            defense_foci: Vec::new(),
            built_ports: HashSet::new(),
            port_constructions: Vec::new(),
            alliances: Vec::new(),
            pending_alliances: Vec::new(),
            next_alliance_proposal_id: 1,
            pending_war_advances: Vec::new(),
            pending_expansion_advances: Vec::new(),
            next_expansion_id: 1,
            relocation_states: HashMap::new(),
            atlas_notifications: Vec::new(),
            first_contact_tick: None,
            first_war_tick: None,
            first_elimination_tick: None,
            half_field_tick: None,
            surviving_civs_5min: 44,
            surviving_civs_10min: 44,
            neutral_land_remaining_at_first_war: 0,
            wars_started: 0,
            wars_completed: 0,
            total_war_ticks: 0,
            largest_battle_casualties: 0.0,
            territory_turnover: 0,
            max_overextension_seen: 0.0,
            recovery_events: 0,
            capital_captures_count: 0,
            capital_relocations_count: 0,
            encirclements_count: 0,
            evaluate_match_outcome: true,
            faction_frontiers: vec![HashSet::new(); 256],
        };

        simulation.recompute_area_stats();
        simulation.refresh_all_economies();
        simulation.rebuild_faction_frontiers();
        simulation
    }

    pub fn neutral_land_ratio(&self) -> f32 {
        let mut neutral_land = 0usize;
        for cell in &self.cells {
            if cell.terrain_type == 0 && cell.owner_id == 0 {
                neutral_land += 1;
            }
        }
        if self.total_land_cells > 0 {
            neutral_land as f32 / self.total_land_cells as f32
        } else {
            0.0
        }
    }

    pub fn set_cell_owner(&mut self, index: u32, owner_id: u8) -> bool {
        let idx = index as usize;
        if idx >= TOTAL_CELLS
            || self.cells[idx].terrain_type == 2
            || (owner_id > 0 && !self.is_faction_alive(owner_id))
        {
            return false;
        }

        if self.cells[idx].owner_id != owner_id {
            let prev_owner = self.cells[idx].owner_id;

            // A frontier focus is tied to its exact owned cell. If that cell
            // changes hands, surviving focused people are released back to
            // their faction before ownership is committed; they are never
            // left as an orphaned hidden defense ledger.
            if prev_owner > 0 && prev_owner != owner_id {
                let displaced: f64 = self
                    .defense_foci
                    .iter()
                    .filter(|focus| focus.faction_id == prev_owner && focus.cell_index == index)
                    .map(|focus| focus.deployed_population)
                    .sum();
                self.defense_foci
                    .retain(|focus| !(focus.faction_id == prev_owner && focus.cell_index == index));
                if displaced > 0.0 {
                    if let Some(faction) = self.factions.iter_mut().find(|f| f.faction_id == prev_owner) {
                        faction.population += displaced;
                    }
                }
            }
            self.cells[idx].owner_id = owner_id;
            if owner_id > 0 {
                if prev_owner == 0 {
                    self.cell_consolidation[idx] = crate::balance::CONSOLIDATION_NEUTRAL_INITIAL;
                } else {
                    self.cell_consolidation[idx] = crate::balance::CONSOLIDATION_CONQUEST_INITIAL;
                }
            } else {
                self.cell_consolidation[idx] = 0.0;
            }

            self.dirty_indices.push(index);
            let chunk_id = cell_to_chunk(idx);
            self.dirty_chunks.insert(chunk_id);

            // Update incremental faction_frontiers
            if prev_owner > 0 {
                self.faction_frontiers[prev_owner as usize].remove(&index);
            }
            let mut check_cells = Vec::with_capacity(5);
            check_cells.push(idx);
            check_cells.extend(Self::cardinal(idx));
            for c in check_cells {
                let c_owner = self.cells[c].owner_id;
                if c_owner > 0 && self.cells[c].terrain_type == 0 {
                    let has_other_neighbor = Self::cardinal(c).into_iter().any(|n| {
                        self.cells[n].terrain_type == 0 && self.cells[n].owner_id != c_owner
                    });
                    if has_other_neighbor {
                        self.faction_frontiers[c_owner as usize].insert(c as u32);
                    } else {
                        self.faction_frontiers[c_owner as usize].remove(&(c as u32));
                    }
                }
            }

            if prev_owner > 0 {
                if let Some(fac) = self
                    .factions
                    .iter_mut()
                    .find(|f| f.faction_id == prev_owner)
                {
                    fac.territory_count = fac.territory_count.saturating_sub(1);
                    fac.controlled_area_km2 = (fac.controlled_area_km2 - Self::cell_area_km2(idx)).max(0.0);
                }
            }
            if owner_id > 0 {
                if let Some(fac) = self.factions.iter_mut().find(|f| f.faction_id == owner_id) {
                    fac.territory_count += 1;
                    fac.controlled_area_km2 += Self::cell_area_km2(idx);
                }
            }

            if prev_owner > 0 {
                let lost_capital = self
                    .factions
                    .iter()
                    .any(|f| f.faction_id == prev_owner && f.capital_cell == index);
                let remaining_land = self
                    .factions
                    .iter()
                    .find(|f| f.faction_id == prev_owner)
                    .map(|f| f.territory_count)
                    .unwrap_or(0);
                if remaining_land == 0 {
                    self.eliminate_faction(prev_owner);
                    self.atlas_notifications.push(AtlasNotificationEvent {
                        event_type: "STATE_COLLAPSED".to_string(),
                        message: "STATE COLLAPSED".to_string(),
                        faction_id: Some(prev_owner),
                        cell_index: Some(index),
                    });
                } else if lost_capital {
                    self.relocation_states.insert(prev_owner, RelocationState {
                        original_capital: index,
                        time_remaining: 10.0,
                    });
                    self.capital_captures_count += 1;
                    self.atlas_notifications.push(AtlasNotificationEvent {
                        event_type: "CAPITAL_CAPTURED".to_string(),
                        message: "CAPITAL CAPTURED".to_string(),
                        faction_id: Some(prev_owner),
                        cell_index: Some(index),
                    });
                }
            }

            if owner_id > 0 {
                if let Some(state) = self.relocation_states.remove(&owner_id) {
                    if state.original_capital == index {
                        if let Some(faction) = self.factions.iter_mut().find(|f| f.faction_id == owner_id) {
                            faction.capital_cell = state.original_capital;
                        }
                        self.atlas_notifications.push(AtlasNotificationEvent {
                            event_type: "CAPITAL_SECURED".to_string(),
                            message: "CAPITAL SECURED".to_string(),
                            faction_id: Some(owner_id),
                            cell_index: Some(index),
                        });
                    } else {
                        self.relocation_states.insert(owner_id, state);
                    }
                }
            }

            true
        } else {
            false
        }
    }

    pub fn is_faction_alive(&self, faction_id: u8) -> bool {
        self.factions
            .iter()
            .find(|f| f.faction_id == faction_id)
            .is_some_and(|f| !f.is_eliminated && f.territory_count > 0)
    }

    /// Apply a custom nation's requested starting location before the match
    /// becomes interactive. This changes only the human seed, keeps the same
    /// compact-core size, and rejects water/occupied destinations explicitly.
    pub fn relocate_faction_start(&mut self, faction_id: u8, requested_cell: u32) -> Result<(), String> {
        let base_x = (requested_cell as usize % WORLD_WIDTH) as i32;
        let base_y = (requested_cell as usize / WORLD_WIDTH) as i32;
        
        let mut candidates = Vec::new();
        for dy in -12..=12 {
            for dx in -18..=18 {
                let nx = (base_x + dx).rem_euclid(WORLD_WIDTH as i32) as usize;
                let ny = base_y + dy;
                if ny >= 0 && (ny as usize) < WORLD_HEIGHT {
                    let idx = ny as usize * WORLD_WIDTH + nx;
                    if self.cells[idx].terrain_type == 0 && (self.cells[idx].owner_id == 0 || self.cells[idx].owner_id == faction_id) {
                        candidates.push(idx as u32);
                    }
                }
            }
        }
        
        let chosen_start = if !candidates.is_empty() {
            use rand::seq::SliceRandom;
            let mut rng = rand::thread_rng();
            *candidates.choose(&mut rng).unwrap_or(&requested_cell)
        } else {
            requested_cell
        };

        let target = chosen_start as usize;
        if target >= self.cells.len() || self.cells[target].terrain_type == 2 {
            return Err("starting_location_water".to_string());
        }
        let Some(faction_index) = self.factions.iter().position(|f| f.faction_id == faction_id) else {
            return Err("invalid_faction".to_string());
        };
        // 1. Clear old ownership of this faction
        for (index, cell) in self.cells.iter_mut().enumerate() {
            if cell.owner_id == faction_id {
                cell.owner_id = 0;
                self.cell_consolidation[index] = 0.0;
                self.dirty_indices.push(index as u32);
                self.dirty_chunks.insert(cell_to_chunk(index));
            }
        }

        // 2. Seed single compact nucleus starting from chosen_start with identical tiny-nucleus policy
        Self::seed_single_faction_nucleus(
            &mut self.cells,
            &mut self.cell_consolidation,
            &mut self.factions[faction_index],
            target,
            target as u64,
        );

        // 3. Mark newly owned cells dirty
        for (index, cell) in self.cells.iter().enumerate() {
            if cell.owner_id == faction_id {
                self.dirty_indices.push(index as u32);
                self.dirty_chunks.insert(cell_to_chunk(index));
            }
        }

        self.recompute_area_stats();
        self.refresh_all_economies();
        self.rebuild_faction_frontiers();
        Ok(())
    }

    pub fn active_front_for_attacker(&self, faction_id: u8) -> Option<u32> {
        self.combat_manager
            .fronts
            .iter()
            .find(|front| front.is_combat_active && front.attacker_faction == faction_id)
            .map(|front| front.front_id)
    }

    fn doctrine_for(&self, faction_id: u8) -> (f64, f64, f64, f64) {
        self.factions
            .iter()
            .find(|f| f.faction_id == faction_id)
            .map(|f| (
                f.doctrine_offense as f64,
                f.doctrine_defense as f64,
                f.doctrine_expansion as f64,
                f.doctrine_maritime as f64,
            ))
            .unwrap_or((0.0, 0.0, 0.0, 0.0))
    }

    fn best_relocation_capital(&self, faction_id: u8) -> Option<u32> {
        self.cells
            .iter()
            .enumerate()
            .filter(|(_, cell)| cell.owner_id == faction_id && cell.terrain_type == 0)
            .map(|(index, _)| {
                let friendly_neighbors = Self::cardinal(index)
                    .into_iter()
                    .filter(|&neighbor| self.cells[neighbor].owner_id == faction_id)
                    .count();
                (friendly_neighbors, std::cmp::Reverse(index), index as u32)
            })
            .max()
            .map(|(_, _, index)| index)
    }

    pub fn advance_government_relocations(&mut self, dt_seconds: f64) {
        let mut finished = Vec::new();
        let mut canceled = Vec::new();

        for (&faction_id, state) in self.relocation_states.iter_mut() {
            if self.cells[state.original_capital as usize].owner_id == faction_id {
                canceled.push((faction_id, state.original_capital));
                continue;
            }
            state.time_remaining -= dt_seconds as f32;
            if state.time_remaining <= 0.0 {
                finished.push((faction_id, state.original_capital));
            }
        }

        for (faction_id, orig_cap) in canceled {
            self.relocation_states.remove(&faction_id);
            if let Some(f) = self.factions.iter_mut().find(|f| f.faction_id == faction_id) {
                f.capital_cell = orig_cap;
            }
            self.atlas_notifications.push(AtlasNotificationEvent {
                event_type: "CAPITAL_SECURED".to_string(),
                message: "CAPITAL SECURED".to_string(),
                faction_id: Some(faction_id),
                cell_index: Some(orig_cap),
            });
        }

        for (faction_id, _orig_cap) in finished {
            self.relocation_states.remove(&faction_id);
            if let Some(new_cap) = self.best_relocation_capital(faction_id) {
                self.capital_relocations_count += 1;
                if let Some(f) = self.factions.iter_mut().find(|f| f.faction_id == faction_id) {
                    f.capital_cell = new_cap;
                }
                self.atlas_notifications.push(AtlasNotificationEvent {
                    event_type: "PROVISIONAL_CAPITAL_ESTABLISHED".to_string(),
                    message: "PROVISIONAL CAPITAL ESTABLISHED".to_string(),
                    faction_id: Some(faction_id),
                    cell_index: Some(new_cap),
                });
            }
        }
    }

    pub fn refresh_supply_connectivity(&mut self) {
        self.cell_supply.fill(0);
        let mut queue = VecDeque::with_capacity(1024);

        for faction in &self.factions {
            if faction.is_eliminated || faction.territory_count == 0 {
                continue;
            }
            let fid = faction.faction_id;
            let base_capital = faction.capital_cell as usize;
            let capital = if self.relocation_states.contains_key(&fid) {
                self.best_relocation_capital(fid).map(|c| c as usize).unwrap_or(base_capital)
            } else {
                base_capital
            };

            queue.clear();

            if capital < TOTAL_CELLS && self.cells[capital].owner_id == fid && self.cells[capital].terrain_type == 0 {
                self.cell_supply[capital] = 1;
                queue.push_back(capital);
            }

            for &port in &self.built_ports {
                let p = port as usize;
                if p < TOTAL_CELLS && self.cells[p].owner_id == fid && self.cells[p].terrain_type == 0 {
                    if self.cell_supply[p] == 0 {
                        self.cell_supply[p] = 1;
                        queue.push_back(p);
                    }
                }
            }

            while let Some(curr) = queue.pop_front() {
                for neighbor in Self::cardinal(curr) {
                    if self.cells[neighbor].terrain_type == 0 && self.cells[neighbor].owner_id == fid {
                        if self.cell_supply[neighbor] == 0 {
                            self.cell_supply[neighbor] = 1;
                            queue.push_back(neighbor);
                        }
                    }
                }
            }
        }
    }

    pub fn is_cell_land_connected_to_capital(&self, faction_id: u8, cell: u32) -> bool {
        let start = cell as usize;
        if start >= TOTAL_CELLS || self.cells[start].owner_id != faction_id || self.cells[start].terrain_type != 0 {
            return false;
        }

        let base_capital = match self.factions.iter().find(|f| f.faction_id == faction_id) {
            Some(f) if !f.is_eliminated => f.capital_cell as usize,
            _ => return false,
        };
        let capital = if self.relocation_states.contains_key(&faction_id) {
            self.best_relocation_capital(faction_id).map(|c| c as usize).unwrap_or(base_capital)
        } else {
            base_capital
        };

        if start == capital {
            return true;
        }

        // 1. Check supply cache
        if self.cell_supply.get(start).copied() == Some(1) {
            return true;
        }

        // 2. Direct on-demand BFS traversal through friendly territory
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        visited.insert(start);
        queue.push_back(start);

        let mut reached_capital = false;
        while let Some(curr) = queue.pop_front() {
            if curr == capital {
                reached_capital = true;
                break;
            }
            for neighbor in crate::expansion::legal_land_neighbors(&self.cells, curr) {
                if self.cells[neighbor].terrain_type == 0 {
                    let owner = self.cells[neighbor].owner_id;
                    if owner == faction_id && visited.insert(neighbor) {
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        if reached_capital {
            return true;
        }

        if self.built_ports.contains(&(start as u32)) && self.built_ports.contains(&(capital as u32)) {
            return true;
        }

        false
    }

    fn eliminate_faction(&mut self, faction_id: u8) {
        let Some(faction_index) = self.factions.iter().position(|f| f.faction_id == faction_id) else {
            return;
        };
        if self.factions[faction_index].is_eliminated {
            return;
        }

        let affected_fronts: Vec<usize> = self
            .combat_manager
            .fronts
            .iter()
            .enumerate()
            .filter_map(|(index, front)| {
                (front.is_combat_active
                    && (front.attacker_faction == faction_id
                        || front.faction_a == faction_id
                        || front.faction_b == faction_id))
                    .then_some(index)
            })
            .collect();
        for front_index in affected_fronts {
            self.return_front_survivors(front_index);
            if let Some(front) = self.combat_manager.fronts.get_mut(front_index) {
                front.is_combat_active = false;
                front.termination_reason = if front.attacker_faction == faction_id {
                    "ATTACKER_ELIMINATED".to_string()
                } else {
                    "DEFENDER_ELIMINATED".to_string()
                };
            }
        }
        self.defense_foci.retain(|focus| focus.faction_id != faction_id);
        self.port_constructions.retain(|port| port.builder != faction_id);
        self.built_ports.retain(|cell| self.cells[*cell as usize].owner_id != faction_id);
        self.alliances.retain(|(a, b)| *a != faction_id && *b != faction_id);
        self.pending_alliances.retain(|proposal| proposal.proposer != faction_id && proposal.target != faction_id);
        let faction = &mut self.factions[faction_index];
        faction.is_eliminated = true;
        faction.population = 0.0;
        faction.population_capacity = 0.0;
        faction.population_growth_per_second = 0.0;
        faction.deployed_population = 0.0;
        faction.total_living_population = 0.0;

        self.pending_war_advances
            .retain(|advance| advance.attacker != faction_id && advance.defender != faction_id);
        if self.first_elimination_tick.is_none() {
            self.first_elimination_tick = Some(self.tick);
        }
        let alive_count = self.factions.iter().filter(|f| !f.is_eliminated && f.territory_count > 0).count();
        if alive_count <= 22 && self.half_field_tick.is_none() {
            self.half_field_tick = Some(self.tick);
        }
        self.update_match_outcome();
    }

    fn update_match_outcome(&mut self) {
        if !self.evaluate_match_outcome || self.match_over {
            return;
        }
        let alive: Vec<u8> = self
            .factions
            .iter()
            .filter(|f| !f.is_eliminated && f.territory_count > 0)
            .map(|f| f.faction_id)
            .collect();

        // 1. Last viable civilization
        if alive.len() <= 1 {
            self.match_over = true;
            self.winner_faction_id = alive.first().copied();
            return;
        }

        // 2. Allied coalition victory
        let allied_coalition_won = if alive.len() > 1 && !self.alliances.is_empty() {
            let mut seen = HashSet::from([alive[0]]);
            let mut frontier = vec![alive[0]];
            while let Some(member) = frontier.pop() {
                for &(a, b) in &self.alliances {
                    let next = if a == member { Some(b) } else if b == member { Some(a) } else { None };
                    if let Some(next) = next {
                        if alive.contains(&next) && seen.insert(next) {
                            frontier.push(next);
                        }
                    }
                }
            }
            seen.len() == alive.len()
        } else {
            false
        };
        if allied_coalition_won {
            self.match_over = true;
            self.winner_faction_id = alive.first().copied();
            return;
        }

        // 3. Domination victory: One faction controls >= 65% of all currently inhabited land
        if self.macro_phase == MacroPhase::WarEra || self.macro_phase == MacroPhase::Endgame || self.tick > 4000 {
            let total_inhabited: u32 = self.factions.iter().map(|f| f.territory_count).sum();
            if total_inhabited > 60 {
                for &fid in &alive {
                    if let Some(fac) = self.factions.iter().find(|f| f.faction_id == fid) {
                        let share = fac.territory_count as f64 / total_inhabited as f64;
                        if share >= 0.65 {
                            self.match_over = true;
                            self.winner_faction_id = Some(fid);
                            return;
                        }
                    }
                }
            }
        }
    }

    pub fn resolve_expansion_anchor(&self, faction_id: u8, requested_target: u32) -> Option<u32> {
        let start_idx = requested_target as usize;
        if start_idx >= TOTAL_CELLS || self.cells[start_idx].terrain_type == 2 || self.cells[start_idx].owner_id != 0 {
            return None;
        }

        let capital = self.factions.iter()
            .find(|f| f.faction_id == faction_id)
            .map(|f| f.capital_cell as usize)
            .unwrap_or(0);

        let cap_x = (capital % WORLD_WIDTH) as f64;
        let cap_y = (capital / WORLD_WIDTH) as f64;
        let target_x = (start_idx % WORLD_WIDTH) as f64;
        let target_y = (start_idx / WORLD_WIDTH) as f64;
        
        // Base direction from capital to target
        let dir_x = target_x - cap_x;
        let dir_y = target_y - cap_y;
        let dir_len = (dir_x * dir_x + dir_y * dir_y).sqrt();
        let (nx, ny) = if dir_len > 1e-6 {
            (dir_x / dir_len, dir_y / dir_len)
        } else {
            (0.0, 0.0)
        };

        let mut visited = HashSet::new();
        let mut q = VecDeque::new();
        
        q.push_back((start_idx, 0));
        visited.insert(start_idx);

        let mut best_candidate: Option<(usize, f64, f64)> = None; // (index, alignment_penalty, eucl_dist)
        let mut max_steps = 10_000;

        while let Some((curr, dist)) = q.pop_front() {
            max_steps -= 1;
            if max_steps == 0 { break; }

            let mut is_frontier = false;
            for n in Self::cardinal(curr) {
                if self.cells[n].owner_id == faction_id {
                    is_frontier = true;
                    break;
                }
            }

            if is_frontier {
                let curr_x = (curr % WORLD_WIDTH) as f64;
                let curr_y = (curr / WORLD_WIDTH) as f64;
                
                // Euclidean distance to target
                let mut dx = (curr_x - target_x).abs();
                if dx > 512.0 { dx = 1024.0 - dx; }
                let dy = (curr_y - target_y).abs();
                let eucl_dist = (dx * dx + dy * dy).sqrt();

                // Direction from candidate to target
                let to_target_x = target_x - curr_x;
                let to_target_y = target_y - curr_y;
                let to_target_len = (to_target_x * to_target_x + to_target_y * to_target_y).sqrt();

                // Angular alignment: dot product between (capital -> target) and (candidate -> target)
                let dot = if to_target_len > 1e-6 && dir_len > 1e-6 {
                    (nx * to_target_x + ny * to_target_y) / to_target_len
                } else {
                    1.0
                };
                
                // Score intent alignment (lower penalty is better)
                let alignment_penalty = (1.0 - dot) * 50.0 + (dist as f64 * 0.1);

                let replace = match best_candidate {
                    None => true,
                    Some((best_idx, best_align, best_eucl)) => {
                        if (alignment_penalty - best_align).abs() > 0.1 {
                            alignment_penalty < best_align
                        } else if (eucl_dist - best_eucl).abs() > 1e-4 {
                            eucl_dist < best_eucl
                        } else {
                            curr < best_idx
                        }
                    }
                };

                if replace {
                    best_candidate = Some((curr, alignment_penalty, eucl_dist));
                }
            }

            for n in Self::cardinal(curr) {
                if self.cells[n].terrain_type == 0 && self.cells[n].owner_id == 0 {
                    if visited.insert(n) {
                        q.push_back((n, dist + 1));
                    }
                }
            }
        }

        best_candidate.map(|(idx, _, _)| idx as u32)
    }

    pub fn process_expand_command(
        &mut self,
        faction_id: u8,
        target_cell: u32,
    ) -> Result<ExpansionOutcome, String> {
        self.process_expand_command_with_mode(faction_id, target_cell, "FOCUS", None)
    }

    pub fn process_expand_command_with_mode(
        &mut self,
        faction_id: u8,
        target_cell: u32,
        mode: &str,
        commit_percent: Option<f64>,
    ) -> Result<ExpansionOutcome, String> {
        if self.match_over {
            return Err("match_finished".to_string());
        }
        if !self.is_faction_alive(faction_id) {
            return Err("faction_eliminated".to_string());
        }
        let idx = target_cell as usize;
        if idx >= TOTAL_CELLS {
            return Err("invalid_index".to_string());
        }
        if self.cells[idx].terrain_type == 2 {
            return Err("water".to_string());
        }
        if self.cells[idx].owner_id != 0 {
            return Err("not_neutral".to_string());
        }

        let population = match self.factions.iter().find(|f| f.faction_id == faction_id) {
            Some(f) => f.population,
            None => return Err("invalid_faction".to_string()),
        };

        let commit_budget = if let Some(pct) = commit_percent {
            (population * pct.clamp(0.0, 1.0)).min(population)
        } else {
            (population * 0.15).min(population)
        };

        if commit_budget <= 0.0 || population <= 0.0 {
            return Err("insufficient_population".to_string());
        }

        let (_, _, expansion_doctrine, _) = self.doctrine_for(faction_id);
        let expansion_cost_multiplier = (1.0 - expansion_doctrine * 1.8).clamp(0.88, 1.12);
        let effective_budget = commit_budget / expansion_cost_multiplier;

        let requested = if mode == "FRONTIER" {
            crate::expansion::cells_for_commitment(effective_budget).min(48)
        } else {
            crate::expansion::cells_for_commitment(effective_budget)
        };

        if requested == 0 {
            return Err("insufficient_population".to_string());
        }

        let (expansion_patch, resolved_anchor) = if mode == "FRONTIER" {
            let p = crate::expansion::generate_frontier_distribution_patch_targeted(
                &self.cells,
                faction_id,
                requested,
                Some(target_cell),
            );
            let anchor = p.anchor_cell;
            (p, anchor)
        } else {
            let p = crate::expansion::generate_focus_corridor_patch(
                &self.cells,
                faction_id,
                target_cell,
                requested,
            );
            let anchor = p.anchor_cell;
            (p, anchor)
        };

        if let Some(reason) = expansion_patch.blocked_reason {
            return Err(reason.to_string());
        }

        let mut patch = PatchResult {
            actual_size: expansion_patch.cells.len(),
            cells: expansion_patch.cells,
            perimeter: 0,
            compactness: 1.0,
            single_cell_tips: 0,
            longest_one_cell_corridor: 0,
            blocked_reason: None,
        };

        if patch.actual_size == 0 {
            return Err("no_cells_found".to_string());
        }

        // Backfill small enclosed cavities for BOTH FRONTIER and FOCUS modes
        let hole_budget = 8.min(requested.max(4));
        let holes = self.find_enclosed_neutral_holes(faction_id, &patch.cells, hole_budget);
        if !holes.is_empty() {
            patch.cells.extend(holes);
            patch.cells.sort_unstable();
            patch.cells.dedup();
            patch.actual_size = patch.cells.len();
        }

        // Operation starts: committed population is permanently spent
        if let Some(fac) = self.factions.iter_mut().find(|f| f.faction_id == faction_id) {
            fac.population = (fac.population - commit_budget).max(0.0);
            fac.total_living_population = (fac.total_living_population - commit_budget).max(fac.population + fac.deployed_population);
        }

        let mut first_contact = None;
        let mut had_sea_before = self.factions.iter().find(|f| f.faction_id == faction_id).map(|f| f.ports_count > 0).unwrap_or(false);
        if !had_sea_before {
            had_sea_before = self.cells.iter().enumerate().any(|(i, c)| c.owner_id == faction_id && Self::cardinal(i).into_iter().any(|n| self.cells[n].terrain_type == 2));
        }

        if mode == "FRONTIER" {
            for &cell_idx in &patch.cells {
                self.set_cell_owner(cell_idx, faction_id);
                let curr = cell_idx as usize;
                let curr_cx = (curr % WORLD_WIDTH) as i32;
                let curr_cy = (curr / WORLD_WIDTH) as i32;
                let curr_neighbors = [
                    (curr_cx, curr_cy - 1),
                    (curr_cx, curr_cy + 1),
                    (curr_cx - 1, curr_cy),
                    (curr_cx + 1, curr_cy),
                ];

                for (nx, ny) in curr_neighbors {
                    if nx >= 0 && nx < (WORLD_WIDTH as i32) && ny >= 0 && ny < (WORLD_HEIGHT as i32) {
                        let n_idx = (ny as usize) * WORLD_WIDTH + (nx as usize);
                        let n_owner = self.cells[n_idx].owner_id;

                        if n_owner > 0 && n_owner != faction_id && first_contact.is_none() {
                            first_contact = Some((faction_id, n_owner, cell_idx));
                        }
                    }
                }
            }

            if !had_sea_before {
                let has_sea_now = patch.cells.iter().any(|&c| Self::cardinal(c as usize).into_iter().any(|n| self.cells[n].terrain_type == 2));
                if has_sea_now {
                    self.atlas_notifications.push(AtlasNotificationEvent {
                        event_type: "SEA_ACCESS_ESTABLISHED".to_string(),
                        message: "SEA ACCESS ESTABLISHED".to_string(),
                        faction_id: Some(faction_id),
                        cell_index: Some(resolved_anchor),
                    });
                }
            }

            if let Some((fa, fb, loc)) = first_contact {
                let cx = (loc % WORLD_WIDTH as u32) as f32;
                let cy = (loc / WORLD_WIDTH as u32) as f32;

                let mut cap_a_x = cx;
                let mut cap_a_y = cy;
                let mut cap_b_x = cx;
                let mut cap_b_y = cy;

                if let Some(fac_a) = self.factions.iter().find(|f| f.faction_id == fa) {
                    cap_a_x = (fac_a.capital_cell % WORLD_WIDTH as u32) as f32;
                    cap_a_y = (fac_a.capital_cell / WORLD_WIDTH as u32) as f32;
                }
                if let Some(fac_b) = self.factions.iter().find(|f| f.faction_id == fb) {
                    cap_b_x = (fac_b.capital_cell % WORLD_WIDTH as u32) as f32;
                    cap_b_y = (fac_b.capital_cell / WORLD_WIDTH as u32) as f32;
                }

                if self.first_contact_tick.is_none() {
                    self.first_contact_tick = Some(self.tick);
                }
                self.combat_manager
                    .register_contact(fa, fb, loc, cx, cy, cap_a_x, cap_a_y, cap_b_x, cap_b_y);
            }
        } else {
            // In FOCUS mode: capture anchor cell immediately, and advance remaining cells step-by-step over simulation ticks
            let first_cell = patch.cells[0];
            self.set_cell_owner(first_cell, faction_id);

            let curr = first_cell as usize;
            let curr_cx = (curr % WORLD_WIDTH) as i32;
            let curr_cy = (curr / WORLD_WIDTH) as i32;
            let curr_neighbors = [
                (curr_cx, curr_cy - 1),
                (curr_cx, curr_cy + 1),
                (curr_cx - 1, curr_cy),
                (curr_cx + 1, curr_cy),
            ];

            for (nx, ny) in curr_neighbors {
                if nx >= 0 && nx < (WORLD_WIDTH as i32) && ny >= 0 && ny < (WORLD_HEIGHT as i32) {
                    let n_idx = (ny as usize) * WORLD_WIDTH + (nx as usize);
                    let n_owner = self.cells[n_idx].owner_id;

                    if n_owner > 0 && n_owner != faction_id && first_contact.is_none() {
                        first_contact = Some((faction_id, n_owner, first_cell));
                    }
                }
            }

            if !had_sea_before {
                let has_sea_now = Self::cardinal(curr).into_iter().any(|n| self.cells[n].terrain_type == 2);
                if has_sea_now {
                    self.atlas_notifications.push(AtlasNotificationEvent {
                        event_type: "SEA_ACCESS_ESTABLISHED".to_string(),
                        message: "SEA ACCESS ESTABLISHED".to_string(),
                        faction_id: Some(faction_id),
                        cell_index: Some(resolved_anchor),
                    });
                }
            }

            if let Some((fa, fb, loc)) = first_contact {
                let cx = (loc % WORLD_WIDTH as u32) as f32;
                let cy = (loc / WORLD_WIDTH as u32) as f32;

                let mut cap_a_x = cx;
                let mut cap_a_y = cy;
                let mut cap_b_x = cx;
                let mut cap_b_y = cy;

                if let Some(fac_a) = self.factions.iter().find(|f| f.faction_id == fa) {
                    cap_a_x = (fac_a.capital_cell % WORLD_WIDTH as u32) as f32;
                    cap_a_y = (fac_a.capital_cell / WORLD_WIDTH as u32) as f32;
                }
                if let Some(fac_b) = self.factions.iter().find(|f| f.faction_id == fb) {
                    cap_b_x = (fac_b.capital_cell % WORLD_WIDTH as u32) as f32;
                    cap_b_y = (fac_b.capital_cell / WORLD_WIDTH as u32) as f32;
                }

                if self.first_contact_tick.is_none() {
                    self.first_contact_tick = Some(self.tick);
                }
                self.combat_manager
                    .register_contact(fa, fb, loc, cx, cy, cap_a_x, cap_a_y, cap_b_x, cap_b_y);
            }

            if patch.cells.len() > 1 {
                self.next_expansion_id += 1;
                self.pending_expansion_advances.push(PendingExpansionAdvance {
                    expansion_id: self.next_expansion_id,
                    faction_id,
                    cells: patch.cells[1..].iter().copied().collect(),
                    elapsed: 0.0,
                    resolved_anchor,
                    first_contact,
                    had_sea_before,
                });
            }
        }

        self.recompute_area_stats();
        self.refresh_all_economies();

        Ok(ExpansionOutcome {
            patch,
            population_cost: commit_budget,
            first_contact,
            resolved_anchor,
        })
    }

    pub fn process_attack_command(
        &mut self,
        attacker: u8,
        source: u32,
        target: u32,
        commit_percent: f64,
    ) -> Result<AttackOrderOutcome, String> {
        self.process_attack_command_with_intent(attacker, source, target, None, commit_percent)
    }

    /// Starts a land offensive from an adjacent legal border pair while
    /// retaining the original player-selected destination. The legal border
    /// pair protects topology; the intent point determines the operation's
    /// local direction and theatre.
    pub fn process_attack_command_with_intent(
        &mut self,
        attacker: u8,
        source: u32,
        target: u32,
        requested_target: Option<u32>,
        commit_percent: f64,
    ) -> Result<AttackOrderOutcome, String> {
        if self.match_over {
            return Err("match_finished".to_string());
        }
        if self.macro_phase != MacroPhase::WarEra && self.macro_phase != MacroPhase::Endgame {
            if attacker == crate::balance::HUMAN_FACTION_ID {
                self.macro_phase = MacroPhase::WarEra;
                self.macro_phase_timer = 0.0;
                self.atlas_notifications.push(AtlasNotificationEvent {
                    event_type: "WAR_ERA_BEGINS".to_string(),
                    message: "WAR ERA BEGINS".to_string(),
                    faction_id: Some(attacker),
                    cell_index: Some(target),
                });
            } else {
                return Err("war_not_available".to_string());
            }
        }
        if !self.is_faction_alive(attacker) {
            return Err("attacker_eliminated".to_string());
        }
        let s = source as usize;
        let t = target as usize;
        if s >= self.cells.len() || t >= self.cells.len() || self.cells[s].owner_id != attacker {
            return Err("invalid_source".to_string());
        }
        let defender = self.cells[t].owner_id;
        if defender == 0
            || defender == attacker
            || self.cells[t].terrain_type == 2
        {
            return Err("invalid_target".to_string());
        }
        if !self.is_faction_alive(defender) {
            return Err("defender_eliminated".to_string());
        }
        if self.are_allied(attacker, defender) {
            return Err("allied_target".to_string());
        }
        if !Self::cardinal(t).into_iter().any(|n| n == s) {
            return Err("no_shared_front".to_string());
        }
        let intent_target = requested_target.unwrap_or(target);
        let intent_index = intent_target as usize;
        if intent_index >= self.cells.len()
            || self.cells[intent_index].terrain_type != 0
            || self.cells[intent_index].owner_id != defender
        {
            return Err("invalid_attack_intent".to_string());
        }
        // Repeated orders along the same short, connected local frontier
        // reinforce its existing ledger. Distant fronts remain independent.
        if let Some(front_id) = self.nearby_land_operation(attacker, defender, target) {
            let deployed_population = self.reinforce_front(attacker, front_id, commit_percent)?;
            return Ok(AttackOrderOutcome { front_id, deployed_population });
        }
        let Some(fi) = self.factions.iter().position(|f| f.faction_id == attacker) else {
            return Err("invalid_attacker".to_string());
        };
        let Some(di) = self.factions.iter().position(|f| f.faction_id == defender) else {
            return Err("invalid_defender".to_string());
        };
        let percent = commit_percent.clamp(0.0, 1.0);
        let committed = (self.factions[fi].population * percent).min(self.factions[fi].population);
        if committed <= 0.0 || self.factions[fi].population <= 0.0 {
            return Err("insufficient_population".to_string());
        }
        self.factions[fi].population = (self.factions[fi].population - committed).max(0.0);
        let sx = (s % WORLD_WIDTH) as f32;
        let sy = (s / WORLD_WIDTH) as f32;
        let x = (t % WORLD_WIDTH) as f32;
        let y = (t / WORLD_WIDTH) as f32;
        let intent_x = (intent_index % WORLD_WIDTH) as f32;
        let intent_y = (intent_index / WORLD_WIDTH) as f32;
        let dx = intent_x - sx;
        let dy = intent_y - sy;
        let distance = (dx * dx + dy * dy).sqrt().max(1.0);
        let (normal_x, normal_y) = (dx / distance, dy / distance);

        // QA-only, opt-in acceptance scenario.  A normal human attack against
        // an undefended border can legitimately finish before a ten-second
        // renderer sample completes. When this process flag is present, place
        // a real defender focus from that faction's free Population before the
        // operation is registered. It uses the ordinary ledger and focus API;
        // no client-side or production-game state is fabricated.
        if attacker == PLAYER_FACTION_ID
            && std::env::var_os("DOMINION_DEV_ACCEPTANCE_WAR").is_some()
        {
            let qa_focus = (committed * 1.8).min(self.factions[di].population * 0.20);
            if qa_focus >= MIN_DEFENSE_FOCUS {
                let _ = self.set_defense_focus(defender, target, qa_focus);
            }
        }

        // Defense is a real local ledger: manually pre-positioned people are
        // used first, then a small emergency response is drawn from the
        // defender's uncommitted population. No regional defense scalar is
        // created and the same person is never deducted twice.
        let focus_population = self.available_local_defense_population(defender, target);
        let shared_local_force = self.active_local_offensive_population(defender, target);
        let is_target_isolated = !self.is_cell_land_connected_to_capital(defender, target);
        let consolidation = self.cell_consolidation[target as usize];
        let consolidation_defense = (consolidation as f64).clamp(0.20, 1.0);
        let emergency = if focus_population > 0.0 || shared_local_force > 0.0 || is_target_isolated {
            0.0
        } else {
            self.factions[di].population * 0.075 * consolidation_defense
        };
        self.factions[di].population = (self.factions[di].population - emergency).max(0.0);
        let deployed_defender = focus_population + emergency + shared_local_force;
        let front_id = self.combat_manager.register_attack_operation_with_intent(
            attacker,
            defender,
            source,
            target,
            intent_target,
            (sx + x) * 0.5,
            (sy + y) * 0.5,
            normal_x,
            normal_y,
            committed,
            deployed_defender,
            focus_population,
            self.tick,
            "LAND_OFFENSIVE",
        );
        if let Some(front) = self.combat_manager.fronts.iter_mut().find(|front| front.front_id == front_id) {
            front.shared_local_force_population = shared_local_force;
        }
        self.wars_started += 1;
        if self.first_war_tick.is_none() {
            self.first_war_tick = Some(self.tick);
            self.neutral_land_remaining_at_first_war = self.cells.iter().filter(|c| c.terrain_type == 0 && c.owner_id == 0).count();
        }
        self.refresh_all_economies();
        Ok(AttackOrderOutcome { front_id, deployed_population: committed })
    }

    /// Commit additional real Population to an already active offensive. The
    /// order is independent per front, so a faction can reinforce several
    /// simultaneous operations without a generic army ledger.
    fn nearby_land_operation(&self, attacker: u8, defender: u8, target: u32) -> Option<u32> {
        let mut queue = std::collections::VecDeque::from([(target, 0_u8)]);
        let mut seen = std::collections::HashSet::from([target]);
        let mut best: Option<(u8, u32)> = None;
        while let Some((cell, distance)) = queue.pop_front() {
            for front in &self.combat_manager.fronts {
                if !front.is_combat_active || front.attacker_faction != attacker
                    || front.operation_kind != "LAND_OFFENSIVE"
                    || (front.faction_a != defender && front.faction_b != defender) { continue; }
                let boundary = if front.faction_a == attacker { &front.border_cells_b } else { &front.border_cells_a };
                if boundary.contains(&cell) || front.target_cell_index == cell {
                    let candidate = (distance, front.front_id);
                    if best.is_none_or(|previous| candidate < previous) { best = Some(candidate); }
                }
            }
            if distance >= 3 { continue; }
            for next in Self::cardinal(cell as usize) {
                // Never merge across water, neutral land, a third country,
                // or an enemy interior shortcut unrelated to this frontier.
                if self.cells[next].terrain_type != 0 || self.cells[next].owner_id != defender
                    || !Self::cardinal(next).into_iter().any(|own| self.cells[own].terrain_type == 0 && self.cells[own].owner_id == attacker)
                    || !seen.insert(next as u32) { continue; }
                queue.push_back((next as u32, distance + 1));
            }
        }
        best.map(|(_, id)| id)
    }

    pub fn reinforce_front(
        &mut self,
        attacker: u8,
        front_id: u32,
        commit_percent: f64,
    ) -> Result<f64, String> {
        let Some(front_index) = self.combat_manager.fronts.iter().position(|front| front.front_id == front_id) else {
            return Err("front_not_found".to_string());
        };
        let front = &self.combat_manager.fronts[front_index];
        if !front.is_combat_active { return Err("front_not_active".to_string()); }
        if front.attacker_faction != attacker { return Err("not_front_attacker".to_string()); }
        if front.operation_kind == "LAND_OFFENSIVE" && !self.is_cell_land_connected_to_capital(attacker, front.source_cell_index) {
            return Err("pocket_isolated".to_string());
        }
        let Some(fi) = self.factions.iter().position(|f| f.faction_id == attacker) else {
            return Err("invalid_attacker".to_string());
        };
        let committed = (self.factions[fi].population * commit_percent.clamp(0.0, 1.0)).min(self.factions[fi].population);
        if committed <= 0.0 || self.factions[fi].population <= 0.0 { return Err("insufficient_population".to_string()); }
        self.factions[fi].population -= committed;
        let front = &mut self.combat_manager.fronts[front_index];
        if front.attacker_faction == front.faction_a {
            front.deployed_population_a += committed;
        } else {
            front.deployed_population_b += committed;
        }
        self.refresh_all_economies();
        Ok(committed)
    }

    fn local_defense_population(&self, faction_id: u8, target: u32) -> f64 {
        self.defense_foci
            .iter()
            .filter(|focus| {
                focus.faction_id == faction_id
                    && (focus.cell_index == target
                        || Self::cardinal(focus.cell_index as usize)
                            .contains(&(target as usize)))
            })
            .map(|focus| focus.deployed_population)
            .sum()
    }

    fn available_local_defense_population(&self, faction_id: u8, target: u32) -> f64 {
        let committed_focus: f64 = self
            .combat_manager
            .fronts
            .iter()
            .filter(|front| front.is_combat_active)
            .filter_map(|front| {
                let defender = if front.attacker_faction == front.faction_a {
                    front.faction_b
                } else {
                    front.faction_a
                };
                (defender == faction_id
                    && (front.target_cell_index == target
                        || Self::cardinal(front.target_cell_index as usize)
                            .contains(&(target as usize))))
                    .then_some(front.defense_focus_population)
            })
            .sum();
        (self.local_defense_population(faction_id, target) - committed_focus).max(0.0)
    }

    fn active_local_offensive_population(&self, faction_id: u8, target: u32) -> f64 {
        self.combat_manager
            .fronts
            .iter()
            .filter(|front| front.is_combat_active && front.attacker_faction == faction_id)
            .filter(|front| front.target_cell_index == target || Self::cardinal(front.target_cell_index as usize).contains(&(target as usize)))
            .map(|front| if front.faction_a == faction_id { front.deployed_population_a } else { front.deployed_population_b })
            .sum()
    }

    /// Pre-position real living people at an owned border point. The amount
    /// is taken immediately from the free Population pool and stays deployed
    /// until explicitly released or until the sector becomes invalid.
    pub fn set_defense_focus(
        &mut self,
        faction_id: u8,
        cell_index: u32,
        requested_population: f64,
    ) -> Result<f64, String> {
        if !self.is_faction_alive(faction_id) {
            return Err("faction_eliminated".to_string());
        }
        let idx = cell_index as usize;
        if idx >= self.cells.len() || self.cells[idx].owner_id != faction_id {
            return Err("defense_point_not_owned".to_string());
        }
        if !Self::cardinal(idx).into_iter().any(|neighbor| {
            self.cells[neighbor].terrain_type == 0 && self.cells[neighbor].owner_id != faction_id
        }) {
            return Err("not_frontier_point".to_string());
        }
        let amount = requested_population.max(0.0);
        if amount < MIN_DEFENSE_FOCUS {
            return Err("defense_focus_too_small".to_string());
        }
        let Some(fi) = self.factions.iter().position(|f| f.faction_id == faction_id) else {
            return Err("invalid_faction".to_string());
        };
        if self.factions[fi].population < amount {
            return Err("insufficient_population".to_string());
        }
        if let Some(existing_index) = self.defense_foci.iter().position(|f| f.faction_id == faction_id && f.cell_index == cell_index) {
            let existing = self.defense_foci.remove(existing_index);
            self.factions[fi].population += existing.deployed_population;
        }
        self.factions[fi].population -= amount;
        self.defense_foci.push(DefenseFocus { faction_id, cell_index, deployed_population: amount });
        self.refresh_all_economies();
        Ok(amount)
    }

    pub fn release_defense_focus(&mut self, faction_id: u8, cell_index: u32) -> Result<f64, String> {
        let Some(pos) = self.defense_foci.iter().position(|f| f.faction_id == faction_id && f.cell_index == cell_index) else {
            return Err("defense_focus_not_found".to_string());
        };
        let focus = self.defense_foci.remove(pos);
        if let Some(faction) = self.factions.iter_mut().find(|f| f.faction_id == faction_id) {
            faction.population += focus.deployed_population;
        }
        self.refresh_all_economies();
        Ok(focus.deployed_population)
    }

    pub fn build_port(&mut self, faction_id: u8, cell_index: u32) -> Result<f64, String> {
        let idx = cell_index as usize;
        if !self.is_faction_alive(faction_id) { return Err("faction_eliminated".to_string()); }
        if idx >= self.cells.len() || self.cells[idx].owner_id != faction_id || self.cells[idx].terrain_type != 0 {
            return Err("port_point_not_owned".to_string());
        }
        let valid_site = self.strategic_sites.iter().any(|site| site.kind == "PORT" && site.cell_a == cell_index);
        let coastal = Self::cardinal(idx).into_iter().any(|n| self.cells[n].terrain_type == 2);
        if !valid_site || !coastal { return Err("not_valid_coast".to_string()); }
        if self.built_ports.contains(&cell_index) || self.port_constructions.iter().any(|p| p.cell_index == cell_index) {
            return Err("port_already_exists".to_string());
        }
        let Some(fi) = self.factions.iter().position(|f| f.faction_id == faction_id) else { return Err("invalid_faction".to_string()); };
        let (_, _, _, maritime) = self.doctrine_for(faction_id);
        let population_cost = PORT_POPULATION_COST * (1.0 - maritime * 0.8).clamp(0.95, 1.05);
        if self.factions[fi].population < population_cost { return Err("insufficient_population".to_string()); }
        self.factions[fi].population -= population_cost;
        self.port_constructions.push(PortConstruction { cell_index, builder: faction_id, remaining_seconds: 10.0 });
        self.refresh_all_economies();
        Ok(population_cost)
    }

    pub fn is_coastal_cell(&self, cell_index: u32) -> bool {
        let idx = cell_index as usize;
        idx < self.cells.len() && self.cells[idx].terrain_type == 0 && Self::cardinal(idx).into_iter().any(|n| self.cells[n].terrain_type == 2)
    }

    pub fn process_amphibious_operation(
        &mut self,
        attacker: u8,
        port_cell_index: u32,
        target_cell_index: u32,
        commit_percent: f64,
    ) -> Result<AttackOrderOutcome, String> {
        if self.match_over || !self.is_faction_alive(attacker) { return Err("faction_eliminated".to_string()); }
        let target = target_cell_index as usize;
        let port = port_cell_index as usize;
        if port >= self.cells.len() || self.cells[port].terrain_type != 0 || self.cells[port].owner_id != attacker || !self.is_coastal_cell(port_cell_index) {
            return Err("amphibious_embarkation_not_coastal".to_string());
        }
        if target >= self.cells.len() || self.cells[target].terrain_type != 0 || self.cells[target].owner_id == attacker {
            return Err("invalid_amphibious_target".to_string());
        }
        if !self.is_coastal_cell(target_cell_index) { return Err("target_not_coastal".to_string()); }
        let defender = self.cells[target].owner_id;
        if defender > 0 && self.macro_phase != MacroPhase::WarEra && self.macro_phase != MacroPhase::Endgame {
            if attacker == crate::balance::HUMAN_FACTION_ID {
                self.macro_phase = MacroPhase::WarEra;
                self.macro_phase_timer = 0.0;
                self.atlas_notifications.push(AtlasNotificationEvent {
                    event_type: "WAR_ERA_BEGINS".to_string(),
                    message: "WAR ERA BEGINS".to_string(),
                    faction_id: Some(attacker),
                    cell_index: Some(target_cell_index),
                });
            } else {
                return Err("war_not_available".to_string());
            }
        }
        if defender > 0 && !self.is_faction_alive(defender) { return Err("defender_eliminated".to_string()); }
        if defender > 0 && self.are_allied(attacker, defender) { return Err("allied_target".to_string()); }
        let fi = self.factions.iter().position(|f| f.faction_id == attacker).ok_or_else(|| "invalid_faction".to_string())?;
        let built_port = self.built_ports.contains(&port_cell_index);
        let (_, _, _, maritime) = self.doctrine_for(attacker);
        // A coastal embarkation without an established port is deliberately
        // possible but capped to a small raiding party. A completed port is
        // the only way to project a large population overseas.
        let max_percent = if built_port { 1.0 } else { 0.08 };
        let committed = self.factions[fi].population * commit_percent.clamp(0.05, max_percent);
        if committed < MIN_ATTACK_DEPLOYMENT { return Err("insufficient_population".to_string()); }
        self.factions[fi].population -= committed;
        let (focus, emergency) = if defender > 0 {
            let di = self.factions.iter().position(|f| f.faction_id == defender).ok_or_else(|| "invalid_defender".to_string())?;
            let focus = self.available_local_defense_population(defender, target_cell_index);
            let emergency = if focus > 0.0 { 0.0 } else { self.factions[di].population * 0.075 };
            self.factions[di].population -= emergency;
            (focus, emergency)
        } else { (0.0, 0.0) };
        let sx = (port % WORLD_WIDTH) as f32;
        let sy = (port / WORLD_WIDTH) as f32;
        let tx = (target % WORLD_WIDTH) as f32;
        let ty = (target / WORLD_WIDTH) as f32;
        let length = ((tx - sx).powi(2) + (ty - sy).powi(2)).sqrt().max(1.0);
        let distance_km = Self::great_circle_distance_km(port_cell_index, target_cell_index);
        let port_bonus = if built_port { 0.10 } else { 0.0 };
        let survival = (0.78 + maritime * 2.2 + port_bonus - distance_km / 45_000.0 * 0.40).clamp(0.35, 0.95);
        let landed = committed * survival;
        let sea_casualties = committed - landed;
        let id = self.combat_manager.register_attack_operation_with_kind(attacker, defender, port_cell_index, target_cell_index, (sx + tx) * 0.5, (sy + ty) * 0.5, (tx - sx) / length, (ty - sy) / length, landed, focus + emergency, focus, self.tick, "AMPHIBIOUS");
        if let Some(front) = self.combat_manager.fronts.iter_mut().find(|front| front.front_id == id) {
            front.casualties = sea_casualties;
        }
        self.refresh_all_economies();
        Ok(AttackOrderOutcome { front_id: id, deployed_population: landed })
    }

    /// Great-circle distance between equirectangular cell centers. This is
    /// shared by all amphibious calculations so longitude wrapping and
    /// latitude scaling cannot diverge between validation and combat.
    pub fn great_circle_distance_km(a: u32, b: u32) -> f64 {
        let center = |cell: u32| {
            let x = (cell as usize % WORLD_WIDTH) as f64 + 0.5;
            let y = (cell as usize / WORLD_WIDTH) as f64 + 0.5;
            let lon = x / WORLD_WIDTH as f64 * std::f64::consts::TAU - std::f64::consts::PI;
            let lat = std::f64::consts::FRAC_PI_2 - y / WORLD_HEIGHT as f64 * std::f64::consts::PI;
            (lat, lon)
        };
        let (lat1, lon1) = center(a);
        let (lat2, lon2) = center(b);
        let dlat = lat2 - lat1;
        let mut dlon = (lon2 - lon1).abs();
        if dlon > std::f64::consts::PI { dlon = std::f64::consts::TAU - dlon; }
        let h = (dlat * 0.5).sin().powi(2) + lat1.cos() * lat2.cos() * (dlon * 0.5).sin().powi(2);
        2.0 * EARTH_RADIUS_KM * h.sqrt().asin()
    }

    pub fn offer_alliance(&mut self, proposer: u8, target: u8) -> Result<u16, String> {
        if proposer == target || !self.is_faction_alive(proposer) || !self.is_faction_alive(target) { return Err("invalid_alliance_target".to_string()); }
        if self.are_allied(proposer, target) { return Err("already_allied".to_string()); }
        // No diplomacy can be used to erase an active war.
        if self.combat_manager.fronts.iter().any(|f| f.is_combat_active && ((f.attacker_faction == proposer && (f.faction_a == target || f.faction_b == target)) || (f.attacker_faction == target && (f.faction_a == proposer || f.faction_b == proposer)))) {
            return Err("active_hostility".to_string());
        }
        let proposal_id = self.next_alliance_proposal_id;
        self.next_alliance_proposal_id = self.next_alliance_proposal_id.wrapping_add(1).max(1);
        if self.factions.iter().any(|f| f.faction_id == target && f.is_human) {
            self.pending_alliances.push(PendingAlliance { proposal_id, proposer, target });
            return Ok(proposal_id);
        }
        // Deterministic AI decision: the same pair, doctrines and world seed
        // always reaches the same accept/reject branch.
        let (_, target_defense, target_expansion, target_maritime) = self.doctrine_for(target);
        let utility = ((proposer as u16 * 37 + target as u16 * 17) % 100) as f64 / 100.0
            + target_defense * 1.2 + target_expansion * 0.8 + target_maritime * 0.6;
        if utility > 0.86 { return Err("ai_rejected".to_string()); }
        let pair = if proposer < target { (proposer, target) } else { (target, proposer) };
        self.alliances.push(pair);
        Ok(proposal_id)
    }

    pub fn respond_alliance(&mut self, responder: u8, proposal_id: u16, accept: bool) -> Result<u16, String> {
        let Some(index) = self.pending_alliances.iter().position(|proposal| proposal.proposal_id == proposal_id && proposal.target == responder) else {
            return Err("alliance_proposal_not_found".to_string());
        };
        let proposal = self.pending_alliances.remove(index);
        if !accept { return Err("alliance_rejected".to_string()); }
        let pair = if proposal.proposer < proposal.target { (proposal.proposer, proposal.target) } else { (proposal.target, proposal.proposer) };
        self.alliances.push(pair);
        Ok(proposal_id)
    }

    pub fn has_pending_alliance(&self, proposal_id: u16) -> bool {
        self.pending_alliances.iter().any(|proposal| proposal.proposal_id == proposal_id)
    }

    pub fn pending_alliance_states(&self) -> Vec<AllianceProposalInfo> {
        self.pending_alliances.iter().map(|proposal| AllianceProposalInfo {
            proposal_id: proposal.proposal_id,
            proposer: proposal.proposer,
            target: proposal.target,
        }).collect()
    }

    pub fn are_allied(&self, a: u8, b: u8) -> bool {
        let pair = if a < b { (a, b) } else { (b, a) };
        self.alliances.contains(&pair)
    }

    pub fn port_states(&self) -> Vec<PortStateInfo> {
        let mut states = self.built_ports.iter().map(|&cell| PortStateInfo { cell_index: cell, owner_id: self.cells[cell as usize].owner_id, complete: true, remaining_seconds: 0.0 }).collect::<Vec<_>>();
        states.extend(self.port_constructions.iter().map(|port| PortStateInfo { cell_index: port.cell_index, owner_id: port.builder, complete: false, remaining_seconds: port.remaining_seconds }));
        states
    }

    pub fn alliance_states(&self) -> Vec<AllianceInfo> {
        self.alliances.iter().enumerate().map(|(i, pair)| AllianceInfo { alliance_id: i as u16 + 1, members: vec![pair.0, pair.1] }).collect()
    }

    /// Splits a fixed victory/reward pool by authoritative controlled area.
    /// This is intentionally a pure calculation: no cosmetic or entitlement
    /// state can affect the result.
    pub fn alliance_reward_shares(&self, reward_pool: f64) -> Vec<(u8, f64)> {
        let members: Vec<u8> = self.alliances.iter()
            .flat_map(|pair| [pair.0, pair.1])
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();
        let total_area: f64 = members.iter()
            .filter_map(|id| self.factions.iter().find(|f| f.faction_id == *id))
            .map(|f| f.controlled_area_km2.max(0.0))
            .sum();
        if total_area <= f64::EPSILON {
            return members.into_iter().map(|id| (id, 0.0)).collect();
        }
        members.into_iter()
            .filter_map(|id| self.factions.iter().find(|f| f.faction_id == id).map(|f| {
                (id, reward_pool.max(0.0) * f.controlled_area_km2.max(0.0) / total_area)
            }))
            .collect()
    }

    pub fn advance_pending_expansions(&mut self, dt: f64) {
        const EXPANSION_CADENCE_SECONDS: f64 = 0.05;
        let mut i = 0;
        while i < self.pending_expansion_advances.len() {
            self.pending_expansion_advances[i].elapsed += dt;
            let faction_id = self.pending_expansion_advances[i].faction_id;
            let mut progress = false;

            while self.pending_expansion_advances[i].elapsed >= EXPANSION_CADENCE_SECONDS
                && !self.pending_expansion_advances[i].cells.is_empty()
            {
                self.pending_expansion_advances[i].elapsed -= EXPANSION_CADENCE_SECONDS;
                let next_cell = self.pending_expansion_advances[i].cells.pop_front().unwrap();
                let idx = next_cell as usize;
                if idx < TOTAL_CELLS && self.cells[idx].owner_id == 0 && self.cells[idx].terrain_type == 0 {
                    self.set_cell_owner(next_cell, faction_id);
                    progress = true;

                    // Check sea access
                    let had_sea = self.pending_expansion_advances[i].had_sea_before;
                    if !had_sea && Self::cardinal(idx).into_iter().any(|n| self.cells[n].terrain_type == 2) {
                        self.pending_expansion_advances[i].had_sea_before = true;
                        self.atlas_notifications.push(AtlasNotificationEvent {
                            event_type: "SEA_ACCESS_ESTABLISHED".to_string(),
                            message: "SEA ACCESS ESTABLISHED".to_string(),
                            faction_id: Some(faction_id),
                            cell_index: Some(next_cell),
                        });
                    }

                    // Check first contact
                    if self.pending_expansion_advances[i].first_contact.is_none() {
                        let curr_cx = (idx % WORLD_WIDTH) as i32;
                        let curr_cy = (idx / WORLD_WIDTH) as i32;
                        let curr_neighbors = [
                            (curr_cx, curr_cy - 1),
                            (curr_cx, curr_cy + 1),
                            (curr_cx - 1, curr_cy),
                            (curr_cx + 1, curr_cy),
                        ];
                        for (nx, ny) in curr_neighbors {
                            if nx >= 0 && nx < (WORLD_WIDTH as i32) && ny >= 0 && ny < (WORLD_HEIGHT as i32) {
                                let n_idx = (ny as usize) * WORLD_WIDTH + (nx as usize);
                                let n_owner = self.cells[n_idx].owner_id;
                                if n_owner > 0 && n_owner != faction_id {
                                    let cx = (next_cell % WORLD_WIDTH as u32) as f32;
                                    let cy = (next_cell / WORLD_WIDTH as u32) as f32;
                                    let mut cap_a_x = cx;
                                    let mut cap_a_y = cy;
                                    let mut cap_b_x = cx;
                                    let mut cap_b_y = cy;
                                    if let Some(fac_a) = self.factions.iter().find(|f| f.faction_id == faction_id) {
                                        cap_a_x = (fac_a.capital_cell % WORLD_WIDTH as u32) as f32;
                                        cap_a_y = (fac_a.capital_cell / WORLD_WIDTH as u32) as f32;
                                    }
                                    if let Some(fac_b) = self.factions.iter().find(|f| f.faction_id == n_owner) {
                                        cap_b_x = (fac_b.capital_cell % WORLD_WIDTH as u32) as f32;
                                        cap_b_y = (fac_b.capital_cell / WORLD_WIDTH as u32) as f32;
                                    }
                                    if self.first_contact_tick.is_none() {
                                        self.first_contact_tick = Some(self.tick);
                                    }
                                    self.combat_manager.register_contact(faction_id, n_owner, next_cell, cx, cy, cap_a_x, cap_a_y, cap_b_x, cap_b_y);
                                    self.pending_expansion_advances[i].first_contact = Some((faction_id, n_owner, next_cell));
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if progress {
                self.recompute_area_stats();
                self.refresh_all_economies();
            }

            if self.pending_expansion_advances[i].cells.is_empty() {
                self.pending_expansion_advances.remove(i);
            } else {
                i += 1;
            }
        }
    }

    pub fn flush_pending_advances(&mut self) {
        while !self.pending_expansion_advances.is_empty() {
            self.advance_pending_expansions(1.0);
        }
    }

    fn advance_port_constructions(&mut self, dt: f64) {
        let mut finished = Vec::new();
        for construction in &mut self.port_constructions {
            construction.remaining_seconds = (construction.remaining_seconds - dt).max(0.0);
            if construction.remaining_seconds <= 0.0 && self.cells[construction.cell_index as usize].owner_id == construction.builder {
                finished.push(construction.cell_index);
            }
        }
        // An unfinished project exists only while its builder still owns the
        // coastal cell. Capture cancels the construction without refund;
        // retaining the old inverse condition left a ghost project alive
        // after conquest.
        self.port_constructions.retain(|construction| {
            construction.remaining_seconds > 0.0
                && self.cells[construction.cell_index as usize].owner_id == construction.builder
        });
        self.built_ports.extend(finished);
    }

    fn return_front_survivors(&mut self, front_index: usize) {
        let Some(front) = self.combat_manager.fronts.get_mut(front_index) else { return };
        if front.survivors_returned { return; }
        // Permanent Commitment Rule:
        // Committed population is a permanent sunk cost.
        // No troops, expeditions, or survivors are returned to population.
        front.survivors_returned = true;
    }

    fn settle_finished_fronts(&mut self) {
        let finished: Vec<usize> = self.combat_manager.fronts.iter().enumerate()
            .filter_map(|(index, front)| (!front.is_combat_active && !front.survivors_returned && front.operation_kind != "CONTACT").then_some(index))
            .collect();
        for index in finished {
            self.wars_completed += 1;
            if let Some(front) = self.combat_manager.fronts.get_mut(index) {
                self.total_war_ticks += self.tick.saturating_sub(front.started_tick);
                front.front_status = "ENDED".to_string();
            }
            self.return_front_survivors(index);
        }
        self.refresh_all_economies();
    }

    pub fn cancel_attack(&mut self, attacker: u8, front_id: u32) -> Result<(), String> {
        let Some(front_index) = self
            .combat_manager
            .fronts
            .iter()
            .position(|front| front.front_id == front_id)
        else {
            return Err("front_not_found".to_string());
        };
        if !self.combat_manager.fronts[front_index].is_combat_active {
            return Err("front_not_active".to_string());
        }
        if self.combat_manager.fronts[front_index].attacker_faction != attacker {
            return Err("not_front_attacker".to_string());
        }
        self.recovery_events += 1;
        self.return_front_survivors(front_index);
        let front = &mut self.combat_manager.fronts[front_index];
        front.is_combat_active = false;
        front.front_status = "RECOVERING".to_string();
        front.termination_reason = "CANCELLED".to_string();
        self.pending_war_advances
            .retain(|advance| advance.front_index != front_index);
        self.settle_finished_fronts();
        Ok(())
    }

    fn refresh_faction_economy(fac: &mut FactionInfo) {
        if fac.is_eliminated {
            fac.population = 0.0;
            fac.population_capacity = 0.0;
            fac.population_growth_per_second = 0.0;
            fac.deployed_population = 0.0;
            fac.total_living_population = 0.0;
            return;
        }
        fac.effective_controlled_area_km2 = fac.effective_controlled_area_km2
            .max(0.0)
            .min(fac.controlled_area_km2);
        let consolidation = (fac.consolidation_ratio as f64).clamp(0.20, 1.0);
        let effective_territory = ((fac.territory_count as f64) * consolidation).max(1.0);
        fac.population_capacity = crate::balance::BASE_HOMELAND_CAPACITY
            + effective_territory * crate::balance::CAPACITY_PER_TERRITORY_CELL;
        fac.total_living_population = fac.population + fac.deployed_population;

        let living = fac.population.max(0.0);
        let capacity = fac.population_capacity.max(1.0);
        let ratio = living / capacity;
        let saturation_factor = (1.0 - ratio.powi(2)).max(0.0);
        let reserve_component = crate::balance::RESERVE_GROWTH_RATE * living;
        let territory_component = crate::balance::TERRITORY_GROWTH_BASE
            * effective_territory.powf(crate::balance::TERRITORY_GROWTH_EXPONENT);
        let doctrine_modifier = (1.0 + fac.doctrine_expansion * 0.5).clamp(0.9, 1.1) as f64;
        fac.population_growth_per_second = (reserve_component + territory_component)
            * saturation_factor
            * doctrine_modifier;
    }

    pub fn refresh_all_economies(&mut self) {
        let mut port_counts = vec![0u16; 256];
        for &cell_index in &self.built_ports {
            let owner = self.cells[cell_index as usize].owner_id as usize;
            if owner > 0 && owner < port_counts.len() {
                port_counts[owner] += 1;
            }
        }
        let mut deployed = vec![0.0; 256];
        for focus in &self.defense_foci {
            if (focus.faction_id as usize) < deployed.len() {
                deployed[focus.faction_id as usize] += focus.deployed_population;
            }
        }
        for front in &self.combat_manager.fronts {
            if !front.is_combat_active { continue; }
            if (front.faction_a as usize) < deployed.len() {
                deployed[front.faction_a as usize] += front.deployed_population_a;
            }
            if (front.faction_b as usize) < deployed.len() {
                deployed[front.faction_b as usize] += front.deployed_population_b;
            }
            let defender = if front.attacker_faction == front.faction_a {
                front.faction_b
            } else {
                front.faction_a
            };
            if (defender as usize) < deployed.len() {
                deployed[defender as usize] = (deployed[defender as usize]
                    - front.defense_focus_population
                    - front.shared_local_force_population).max(0.0);
            }
        }
        for fac in &mut self.factions {
            fac.ports_count = port_counts[fac.faction_id as usize];
            fac.deployed_population = deployed[fac.faction_id as usize];
            Self::refresh_faction_economy(fac);
            if fac.is_eliminated { continue; }
            fac.population_growth_per_second += fac.ports_count as f64
                * PORT_POPULATION_GROWTH_BONUS
                * (1.0 + fac.doctrine_maritime as f64 * 1.5).clamp(0.91, 1.09);
            if let Some(reloc) = self.relocation_states.get(&fac.faction_id) {
                fac.population_growth_per_second = 0.0;
                fac.is_relocating = true;
                fac.relocation_time_remaining = Some(reloc.time_remaining);
            } else {
                fac.is_relocating = false;
                fac.relocation_time_remaining = None;
            }
        }
    }

    pub fn get_row_areas() -> &'static [f64; WORLD_HEIGHT] {
        static ROW_AREAS: std::sync::OnceLock<[f64; WORLD_HEIGHT]> = std::sync::OnceLock::new();
        ROW_AREAS.get_or_init(|| {
            let mut arr = [0.0; WORLD_HEIGHT];
            let h = WORLD_HEIGHT as f64;
            let delta_lon = 2.0 * std::f64::consts::PI / WORLD_WIDTH as f64;
            for y in 0..WORLD_HEIGHT {
                let y_f = y as f64;
                let lat_north = std::f64::consts::FRAC_PI_2 - (y_f / h) * std::f64::consts::PI;
                let lat_south = std::f64::consts::FRAC_PI_2 - ((y_f + 1.0) / h) * std::f64::consts::PI;
                arr[y] = EARTH_RADIUS_KM.powi(2) * delta_lon * (lat_north.sin() - lat_south.sin()).abs();
            }
            arr
        })
    }

    /// Surface area represented by one equirectangular grid cell. The
    /// latitude correction keeps public land statistics and capacity honest;
    /// raw cell count remains an internal topology detail only.
    pub fn cell_area_km2(index: usize) -> f64 {
        let y = index / WORLD_WIDTH;
        Self::get_row_areas()[y.min(WORLD_HEIGHT - 1)]
    }

    pub fn recompute_area_stats(&mut self) {
        let mut areas = [0.0f64; 256];
        let mut effective_areas = [0.0f64; 256];
        let row_areas = Self::get_row_areas();
        for (index, cell) in self.cells.iter().enumerate() {
            if cell.owner_id > 0 && cell.terrain_type == 0 {
                let y = index / WORLD_WIDTH;
                let area = row_areas[y.min(WORLD_HEIGHT - 1)];
                areas[cell.owner_id as usize] += area;
                let supply_mult = if self.cell_supply.get(index).copied() == Some(0) { 0.35 } else { 1.0 };
                effective_areas[cell.owner_id as usize] += area * self.cell_consolidation[index] as f64 * supply_mult;
            }
        }
        for fac in &mut self.factions {
            let fid = fac.faction_id as usize;
            fac.controlled_area_km2 = areas[fid];
            fac.effective_controlled_area_km2 = effective_areas[fid];
            if fac.controlled_area_km2 > 0.0 {
                let ratio = (fac.effective_controlled_area_km2 / fac.controlled_area_km2).clamp(0.0, 1.0) as f32;
                fac.consolidation_ratio = ratio;
                fac.overextension_ratio = (1.0 - ratio).clamp(0.0, 1.0);
                self.max_overextension_seen = self.max_overextension_seen.max(fac.overextension_ratio);
            } else {
                fac.consolidation_ratio = 1.0;
                fac.overextension_ratio = 0.0;
            }
        }
    }

    fn advance_area_consolidation(&mut self, dt: f64) {
        let maturation = (crate::balance::CONSOLIDATION_MATURATION_RATE * dt as f32).max(0.0);
        let mut effective_areas = [0.0f64; 256];
        let row_areas = Self::get_row_areas();

        for (idx, cell) in self.cells.iter().enumerate() {
            let owner = cell.owner_id as usize;
            if owner > 0 && cell.terrain_type == 0 {
                let current = self.cell_consolidation[idx];
                let next = (current + maturation).min(1.0);
                self.cell_consolidation[idx] = next;
                let y = idx / WORLD_WIDTH;
                let area = row_areas[y.min(WORLD_HEIGHT - 1)];
                let supply_mult = if self.cell_supply.get(idx).copied() == Some(0) { 0.35 } else { 1.0 };
                effective_areas[owner] += area * next as f64 * supply_mult;
            }
        }

        for faction in &mut self.factions {
            let fid = faction.faction_id as usize;
            faction.effective_controlled_area_km2 = effective_areas[fid];
            let raw_area = faction.controlled_area_km2;
            if raw_area > 0.0 {
                let ratio = (faction.effective_controlled_area_km2 / raw_area).clamp(0.0, 1.0) as f32;
                faction.consolidation_ratio = ratio;
                faction.overextension_ratio = (1.0 - ratio).clamp(0.0, 1.0);
                self.max_overextension_seen = self.max_overextension_seen.max(faction.overextension_ratio);
            } else {
                faction.consolidation_ratio = 1.0;
                faction.overextension_ratio = 0.0;
            }
        }
    }

    pub fn advance_macro_phase(&mut self, dt: f32) {
        match self.macro_phase {
            MacroPhase::ExpansionEra => {
                self.macro_phase_timer += dt;
                let neutral_land_cells = if self.tick % 20 == 0 || dt >= 0.5 {
                    self.cells.iter().filter(|c| c.terrain_type == 0 && c.owner_id == 0).count()
                } else {
                    let owned_land_cells: usize = self.factions.iter().map(|f| f.territory_count as usize).sum();
                    self.total_land_cells.saturating_sub(owned_land_cells)
                };
                let neutral_ratio = neutral_land_cells as f64 / self.total_land_cells.max(1) as f64;
                if neutral_ratio <= crate::balance::EXPANSION_ERA_NEUTRAL_THRESHOLD
                    || self.macro_phase_timer >= crate::balance::EXPANSION_ERA_MAX_SECONDS
                {
                    self.macro_phase = MacroPhase::FinalFrontier;
                    self.macro_phase_timer = crate::balance::FINAL_FRONTIER_ARMISTICE_SECONDS;
                    self.atlas_notifications.push(AtlasNotificationEvent {
                        event_type: "THE_FRONTIER_CLOSES".to_string(),
                        message: "THE FRONTIER CLOSES".to_string(),
                        faction_id: None,
                        cell_index: None,
                    });
                }
            }
            MacroPhase::FinalFrontier => {
                self.macro_phase_timer -= dt;
                if self.macro_phase_timer <= 0.0 {
                    self.macro_phase = MacroPhase::WarEra;
                    self.macro_phase_timer = 0.0;
                    self.atlas_notifications.push(AtlasNotificationEvent {
                        event_type: "WAR_ERA_BEGINS".to_string(),
                        message: "WAR ERA BEGINS".to_string(),
                        faction_id: None,
                        cell_index: None,
                    });
                }
            }
            MacroPhase::WarEra => {
                let active_factions = self.factions.iter().filter(|f| !f.is_eliminated).count();
                if active_factions <= 3 {
                    self.macro_phase = MacroPhase::Endgame;
                }
            }
            MacroPhase::Endgame => {}
        }
    }

    pub fn find_enclosed_neutral_holes(
        &self,
        owner: u8,
        virtual_patch: &[u32],
        budget: usize,
    ) -> Vec<u32> {
        if budget == 0 {
            return vec![];
        }
        let virtual_owned: HashSet<usize> = virtual_patch.iter().map(|&i| i as usize).collect();
        let mut sorted_virtual: Vec<usize> = virtual_patch.iter().map(|&i| i as usize).collect();
        sorted_virtual.sort_unstable();
        sorted_virtual.dedup();

        let mut seeds = HashSet::new();
        for &i in &sorted_virtual {
            for n in Self::cardinal(i) {
                if self.cells[n].terrain_type == 0
                    && self.cells[n].owner_id == 0
                    && !virtual_owned.contains(&n)
                {
                    seeds.insert(n);
                }
            }
        }
        let mut sorted_seeds: Vec<usize> = seeds.into_iter().collect();
        sorted_seeds.sort_unstable();

        let mut inspected = HashSet::new();
        let mut fill = Vec::new();
        for seed in sorted_seeds {
            if inspected.contains(&seed) {
                continue;
            }
            let mut q = VecDeque::from([seed]);
            let mut component = Vec::new();
            let mut enclosed = true;
            while let Some(i) = q.pop_front() {
                if !inspected.insert(i) {
                    continue;
                }
                component.push(i);
                if component.len() > budget {
                    enclosed = false;
                    break;
                }
                let x = i % WORLD_WIDTH;
                let y = i / WORLD_WIDTH;
                if x == 0 || x + 1 == WORLD_WIDTH || y == 0 || y + 1 == WORLD_HEIGHT {
                    enclosed = false;
                    break;
                }
                for n in Self::cardinal(i) {
                    let c = &self.cells[n];
                    if c.terrain_type == 2 {
                        // Water is an impassable natural barrier, NOT an escape route to open land.
                        // Touching water does not break enclosure of a coastal pocket.
                        continue;
                    }
                    if virtual_owned.contains(&n) || c.owner_id == owner {
                        continue;
                    }
                    if c.owner_id == 0 {
                        if !inspected.contains(&n) {
                            q.push_back(n)
                        }
                    } else {
                        // Enemy-owned land: not a peaceful interior hole!
                        enclosed = false
                    }
                }
            }
            if enclosed && fill.len() + component.len() <= budget {
                fill.extend(component.into_iter().map(|i| i as u32));
            }
        }
        fill
    }

    fn capture_preserves_defender_connectivity(&self, defender: u8, captured: &[u32]) -> bool {
        let removed: HashSet<usize> = captured.iter().map(|&cell| cell as usize).collect();
        let Some(start) = self.cells.iter().enumerate().find_map(|(index, cell)| {
            (cell.owner_id == defender && !removed.contains(&index)).then_some(index)
        }) else {
            // Capturing the defender's last land is a legal elimination.
            return true;
        };

        let mut seen = HashSet::from([start]);
        let mut queue = VecDeque::from([start]);
        while let Some(index) = queue.pop_front() {
            for neighbor in Self::cardinal(index) {
                if removed.contains(&neighbor)
                    || self.cells[neighbor].owner_id != defender
                    || !seen.insert(neighbor)
                {
                    continue;
                }
                queue.push_back(neighbor);
            }
        }

        self.cells.iter().enumerate().all(|(index, cell)| {
            cell.owner_id != defender || removed.contains(&index) || seen.contains(&index)
        })
    }

    pub fn cardinal(i: usize) -> Vec<usize> {
        let x = i % WORLD_WIDTH;
        let y = i / WORLD_WIDTH;
        [
            (y > 0).then(|| i - WORLD_WIDTH),
            (x + 1 < WORLD_WIDTH).then_some(i + 1),
            (y + 1 < WORLD_HEIGHT).then_some(i + WORLD_WIDTH),
            (x > 0).then_some(i - 1),
        ]
        .into_iter()
        .flatten()
        .collect()
    }

    pub fn topology_violations(&self) -> (usize, usize) {
        let mut disconnected = 0;
        for f in &self.factions {
            let owned: HashSet<usize> = self
                .cells
                .iter()
                .enumerate()
                .filter_map(|(i, c)| (c.owner_id == f.faction_id).then_some(i))
                .collect();
            if owned.is_empty() {
                continue;
            }
            let mut seen = HashSet::new();
            let mut q = VecDeque::from([f.capital_cell as usize]);
            while let Some(i) = q.pop_front() {
                if !owned.contains(&i) || !seen.insert(i) {
                    continue;
                }
                for n in Self::cardinal(i) {
                    if owned.contains(&n) && !seen.contains(&n) {
                        q.push_back(n)
                    }
                }
            }
            if seen.len() != owned.len() {
                disconnected += 1
            }
        }
        let mut holes = 0;
        for i in 0..self.cells.len() {
            if self.cells[i].terrain_type == 0 && self.cells[i].owner_id == 0 {
                let neighbors = Self::cardinal(i);
                if !neighbors.is_empty() {
                    let first = self.cells[neighbors[0]].owner_id;
                    if first > 0 && neighbors.iter().all(|&n| self.cells[n].owner_id == first) {
                        holes += 1
                    }
                }
            }
        }
        (disconnected, holes)
    }

    pub fn step_dt(&mut self, dt_seconds: f64) -> (f64, Vec<CellDelta>) {
        let start = Instant::now();
        self.tick += 1;

        self.advance_port_constructions(dt_seconds);
        self.advance_government_relocations(dt_seconds);
        self.advance_pending_expansions(dt_seconds);
        if self.tick % 5 == 0 {
            self.advance_area_consolidation(dt_seconds * 5.0);
            self.refresh_supply_connectivity();
        }
        self.advance_macro_phase(dt_seconds as f32);
        for fac in &mut self.factions {
            if fac.is_eliminated { continue; }
            let growth = fac.population_growth_per_second;
            fac.population = (fac.population + growth * dt_seconds).max(0.0);
            fac.total_living_population = fac.population + fac.deployed_population;
        }
        self.step_wars(dt_seconds);
        self.refresh_all_economies();
        self.update_match_outcome();

        if self.tick == 6000 {
            self.surviving_civs_5min = self.factions.iter().filter(|f| !f.is_eliminated && f.territory_count > 0).count();
        }
        if self.tick == 12000 {
            self.surviving_civs_10min = self.factions.iter().filter(|f| !f.is_eliminated && f.territory_count > 0).count();
        }

        let deltas: Vec<CellDelta> = self
            .dirty_indices
            .drain(..)
            .map(|idx| CellDelta {
                index: idx,
                owner_id: self.cells[idx as usize].owner_id,
                flags: self.cells[idx as usize].state_flags,
            })
            .collect();

        if !deltas.is_empty() {
            self.sequence += 1;
        }

        self.dirty_chunks.clear();

        let elapsed = start.elapsed().as_secs_f64() * 1000.0;
        (elapsed, deltas)
    }

    pub fn step(&mut self) -> (f64, Vec<CellDelta>) {
        self.step_dt(0.05)
    }

    fn step_wars(&mut self, dt: f64) {
        if self.match_over {
            return;
        }
        self.advance_pending_war_conquests(dt);
        let mut captures = Vec::new();
        let mut neutral_landings = Vec::new();
        let mut offense = [0.0_f64; 256];
        let mut defense_doctrine = [0.0_f64; 256];
        for faction in &self.factions {
            offense[faction.faction_id as usize] = faction.doctrine_offense as f64;
            defense_doctrine[faction.faction_id as usize] = faction.doctrine_defense as f64;
        }
        for (front_index, front) in self.combat_manager.fronts.iter_mut().enumerate() {
            if !front.is_combat_active {
                continue;
            }
            let attacker = front.attacker_faction;
            let defender = if attacker == front.faction_a {
                front.faction_b
            } else {
                front.faction_a
            };
            if defender == 0 {
                // A real long-range landing against neutral coast has no
                // defending faction, but still resolves through the same
                // authoritative front and one exact destination cell.
                neutral_landings.push((front_index, attacker, front.target_cell_index));
                front.is_combat_active = false;
                front.termination_reason = "ATTACKER_SUCCESS".to_string();
                continue;
            }
            let attacker_alive = self
                .factions
                .iter()
                .any(|f| f.faction_id == attacker && !f.is_eliminated && f.territory_count > 0);
            let defender_alive = self
                .factions
                .iter()
                .any(|f| f.faction_id == defender && !f.is_eliminated && f.territory_count > 0);
            if !attacker_alive {
                front.is_combat_active = false;
                front.termination_reason = "ATTACKER_ELIMINATED".to_string();
                continue;
            }
            if !defender_alive {
                front.is_combat_active = false;
                front.termination_reason = "DEFENDER_ELIMINATED".to_string();
                continue;
            }
            let Some(_di) = self.factions.iter().position(|f| f.faction_id == defender) else {
                front.is_combat_active = false;
                front.termination_reason = "NO_VALID_FRONT".to_string();
                continue;
            };
            let attacker_is_a = attacker == front.faction_a;
            let raw_attack = if attacker_is_a { front.deployed_population_a } else { front.deployed_population_b };
            let raw_defense = if attacker_is_a { front.deployed_population_b } else { front.deployed_population_a };

            let attacker_supplied = self.cell_supply.get(front.source_cell_index as usize).copied() == Some(1);
            let defender_supplied = self.cell_supply.get(front.target_cell_index as usize).copied() == Some(1);

            // Cohesion and supply degradation
            if !attacker_supplied {
                front.cohesion = (front.cohesion - crate::balance::COHESION_LOSS_RATE * dt as f32).max(0.15);
                front.supply_efficiency = (front.supply_efficiency - 0.04 * dt as f32).max(0.20);
            } else {
                front.cohesion = (front.cohesion + crate::balance::COHESION_RECOVERY_RATE * dt as f32).min(1.0);
                front.supply_efficiency = 1.0;
            }

            let front_width = front.border_cells_a.len().max(front.border_cells_b.len()).max(1);
            let target_consolidation = (self.cell_consolidation[front.target_cell_index as usize] as f64).clamp(0.08, 1.0);

            let eff_attack = crate::combat::calculate_effective_combat_power(
                raw_attack,
                front_width,
                front.supply_efficiency as f64,
                front.cohesion as f64,
                offense[attacker as usize],
                1.0,
            );

            let def_supply_eff = if defender_supplied { 1.0 } else { 0.40 };
            let eff_defense = crate::combat::calculate_effective_combat_power(
                raw_defense,
                front_width,
                def_supply_eff,
                1.0,
                defense_doctrine[defender as usize],
                0.35 + 0.65 * target_consolidation,
            );

            let advantage = eff_attack / (eff_defense * 0.40 + 8.0);
            let direction = if attacker == front.faction_a {
                1.0
            } else {
                -1.0
            };

            let adv_clamp = advantage.sqrt().clamp(0.4, 2.5);
            let base_att_rate = crate::balance::COMBAT_BASE_CASUALTY_RATE * (0.8 / adv_clamp);
            let base_def_rate = crate::balance::COMBAT_BASE_CASUALTY_RATE * (0.8 * adv_clamp);

            let attack_loss = ((raw_defense * 0.005 + raw_attack * base_att_rate + 25.0)
                * (1.0 - offense[attacker as usize] * 1.5).clamp(0.85, 1.15) * dt).min(raw_attack);
            let defense_loss = ((raw_attack * 0.008 + raw_defense * base_def_rate + 35.0)
                * (1.0 - defense_doctrine[defender as usize] * 1.5).clamp(0.85, 1.15) * dt).min(raw_defense);
            let remaining_force = (raw_attack - attack_loss).max(0.0);
            let remaining_defense = (raw_defense - defense_loss).max(0.0);
            if attacker_is_a {
                front.deployed_population_a = remaining_force;
                front.deployed_population_b = remaining_defense;
            } else {
                front.deployed_population_b = remaining_force;
                front.deployed_population_a = remaining_defense;
            }
            front.casualties += attack_loss + defense_loss;
            self.largest_battle_casualties = self.largest_battle_casualties.max(front.casualties);

            // 9-State Operation Lifecycle Machine (Task 35 & 38)
            if self.tick.saturating_sub(front.started_tick) < 8 {
                front.front_status = "MOBILIZING".to_string();
            } else if !attacker_supplied {
                front.front_status = "RETREATING".to_string();
                self.encirclements_count += 1;
            } else if advantage > 2.0 || (advantage > 1.45 && remaining_defense < 1000.0) {
                front.front_status = "BREAKTHROUGH".to_string();
            } else if advantage > 1.25 {
                front.front_status = "ADVANCING".to_string();
            } else if advantage < 0.65 || front.cohesion < 0.30 {
                front.front_status = "RETREATING".to_string();
            } else if front.casualties > 15_000.0 && (advantage - 1.0).abs() < 0.20 {
                front.front_status = "STALLED".to_string();
            } else {
                front.front_status = "ENGAGED".to_string();
            }

            front.pressure = (front.pressure + direction * ((advantage - 0.65) * 0.12 * dt) as f32)
                .clamp(-1.0, 1.0);
            let pushed = (direction > 0.0 && front.pressure >= 0.72)
                || (direction < 0.0 && front.pressure <= -0.72);
            if pushed {
                let preferred = if attacker == front.faction_a {
                    front.border_cells_b.first()
                } else {
                    front.border_cells_a.first()
                }
                .copied()
                .unwrap_or(0);
                let pending_for_front = self
                    .pending_war_advances
                    .iter()
                    .any(|advance| advance.front_index == front_index && !advance.cells.is_empty());
                if !pending_for_front {
                    captures.push((front_index, attacker, defender, preferred));
                }
                front.pressure = direction as f32 * 0.15
            }
            if remaining_force < MIN_ATTACK_DEPLOYMENT * 0.05 {
                front.is_combat_active = false;
                front.termination_reason = "ATTACKER_OUT_OF_FORCES".to_string();
            }
        }
        for (front_index, attacker, target) in neutral_landings {
            if self.cells.get(target as usize).is_some_and(|cell| cell.owner_id == 0) {
                if self.set_cell_owner(target, attacker) {
                    if let Some(front) = self.combat_manager.fronts.get_mut(front_index) {
                        front.captured_cells = front.captured_cells.saturating_add(1);
                    }
                }
            }
        }
        for (front_index, attacker, defender, preferred) in captures {
            if let Some(target) = self.find_directional_war_frontier_target(front_index, attacker, defender, preferred) {
                let advance_cells_count = if let Some(front) = self.combat_manager.fronts.get(front_index) {
                    if front.front_status == "BREAKTHROUGH" {
                        12
                    } else if front.front_status == "ADVANCING" {
                        8
                    } else {
                        4
                    }
                } else {
                    4
                };
                let patch = generate_compact_patch(
                    &self.cells,
                    attacker,
                    target,
                    advance_cells_count,
                    PatchMode::WarAdvance { defender },
                );
                if !patch.cells.is_empty() {
                    let ordered = self.order_war_advance_cells(&patch.cells, target);
                    self.pending_war_advances.push(PendingWarAdvance {
                        front_index,
                        attacker,
                        defender,
                        cells: ordered.into(),
                        elapsed: 0.0,
                    });
                } else if let Some(front) = self.combat_manager.fronts.get_mut(front_index) {
                    front.is_combat_active = false;
                    front.termination_reason = "NO_VALID_FRONT".to_string();
                }
            } else if let Some(front) = self.combat_manager.fronts.get_mut(front_index) {
                front.is_combat_active = false;
                front.termination_reason = "NO_VALID_FRONT".to_string();
            }
        }
        self.pending_war_advances.retain(|advance| {
            self.combat_manager
                .fronts
                .get(advance.front_index)
                .is_some_and(|front| front.is_combat_active)
        });
        self.settle_finished_fronts();
    }

    /// Applies an already-authorized war patch as a deterministic frontier
    /// progression. The patch is still generated by the authoritative compact
    /// morphology routine; this only changes when its cells are revealed to
    /// the client, never which cells are eligible.
    fn advance_pending_war_conquests(&mut self, dt: f64) {
        const CAPTURE_CADENCE_SECONDS: f64 = 0.35;
        let mut pending = std::mem::take(&mut self.pending_war_advances);
        let mut remaining = Vec::with_capacity(pending.len());

        for mut advance in pending.drain(..) {
            advance.elapsed += dt;
            let mut completed_front = false;
            let mut last_captured_cell = None;
            while advance.elapsed >= CAPTURE_CADENCE_SECONDS && !advance.cells.is_empty() {
                advance.elapsed -= CAPTURE_CADENCE_SECONDS;
                let Some(cell) = advance.cells.pop_front() else { break };
                last_captured_cell = Some(cell);
                if self.cells[cell as usize].owner_id != advance.defender {
                    continue;
                }
                if !self.set_cell_owner(cell, advance.attacker) {
                    continue;
                }
                self.territory_turnover += 1;
                if let Some(front) = self.combat_manager.fronts.get_mut(advance.front_index) {
                    front.captured_cells = front.captured_cells.saturating_add(1);
                }
                let next = self.find_directional_war_frontier_target(
                    advance.front_index,
                    advance.attacker,
                    advance.defender,
                    cell,
                );
                if let Some(next) = next {
                    if let Some(front) = self.combat_manager.fronts.get_mut(advance.front_index) {
                        front.target_cell_index = next;
                        if advance.attacker == front.faction_a {
                            front.border_cells_b = vec![next];
                        } else {
                            front.border_cells_a = vec![next];
                        }
                    }
                } else if advance.cells.is_empty() {
                    completed_front = true;
                }
            }
            if completed_front {
                let mop_up_remnant = last_captured_cell.and_then(|c| self.find_mop_up_remnant(c, advance.attacker, advance.defender));
                let next_target = if mop_up_remnant.is_none() {
                    last_captured_cell.and_then(|c| {
                        self.find_directional_war_frontier_target(
                            advance.front_index,
                            advance.attacker,
                            advance.defender,
                            c,
                        )
                    })
                } else {
                    None
                };

                if let Some(front) = self.combat_manager.fronts.get_mut(advance.front_index) {
                    if front.is_combat_active {
                        if let Some(remnant) = mop_up_remnant {
                            front.target_cell_index = remnant;
                            if advance.attacker == front.faction_a {
                                front.border_cells_b = vec![remnant];
                            } else {
                                front.border_cells_a = vec![remnant];
                            }
                        } else if let Some(next) = next_target {
                            front.target_cell_index = next;
                            if advance.attacker == front.faction_a {
                                front.border_cells_b = vec![next];
                            } else {
                                front.border_cells_a = vec![next];
                            }
                        } else {
                            front.is_combat_active = false;
                            front.termination_reason = "ATTACKER_SUCCESS".to_string();
                        }
                    }
                }
            } else if !advance.cells.is_empty() {
                remaining.push(advance);
            }
        }

        self.pending_war_advances = remaining;
    }

    fn find_mop_up_remnant(&self, start_cell: u32, attacker: u8, defender: u8) -> Option<u32> {
        let mut queue = std::collections::VecDeque::new();
        let mut visited = std::collections::HashSet::new();

        queue.push_back((start_cell, 0));
        visited.insert(start_cell);

        let mut searched = 0;
        let max_search_nodes = 4000;
        let max_distance = 15; // Local area

        while let Some((current, dist)) = queue.pop_front() {
            searched += 1;
            if searched > max_search_nodes || dist > max_distance {
                continue;
            }

            for neighbor in Self::cardinal(current as usize) {
                let n32 = neighbor as u32;
                if self.cells[neighbor].terrain_type == 0 && visited.insert(n32) {
                    let owner = self.cells[neighbor].owner_id;
                    if owner == defender {
                        return Some(n32);
                    } else if owner == attacker {
                        queue.push_back((n32, dist + 1));
                    }
                }
            }
        }
        None
    }

    fn order_war_advance_cells(&self, cells: &[u32], target: u32) -> Vec<u32> {
        let patch: HashSet<usize> = cells.iter().map(|&cell| cell as usize).collect();
        let mut ordered = Vec::with_capacity(cells.len());
        let mut seen = HashSet::new();
        let mut queue = VecDeque::new();
        if patch.contains(&(target as usize)) {
            queue.push_back(target as usize);
        }

        while let Some(current) = queue.pop_front() {
            if !patch.contains(&current) || !seen.insert(current) {
                continue;
            }
            ordered.push(current as u32);
            for neighbor in Self::cardinal(current) {
                if patch.contains(&neighbor) && !seen.contains(&neighbor) {
                    queue.push_back(neighbor);
                }
            }
        }

        let mut rest: Vec<u32> = cells
            .iter()
            .copied()
            .filter(|cell| !seen.contains(&(*cell as usize)))
            .collect();
        rest.sort_unstable();
        ordered.extend(rest);
        ordered
    }

    /// Finds the next local defender cell for an operation. The search is
    /// deliberately bounded to the operation theatre, so a long national
    /// border cannot pull a local offensive sideways. Candidates are scored
    /// by progress toward the preserved player intent, then by locality and
    /// compactness. Traversal is defender-land only: no water, neutral land,
    /// or third-party territory can be crossed.
    fn find_directional_war_frontier_target(
        &self,
        front_index: usize,
        attacker: u8,
        defender: u8,
        preferred: u32,
    ) -> Option<u32> {
        let front = self.combat_manager.fronts.get(front_index)?;
        if !front.is_combat_active || front.attacker_faction != attacker {
            return None;
        }

        let source = front.source_cell_index as usize;
        let intent = front.intent_target_cell_index as usize;
        if source >= self.cells.len() || intent >= self.cells.len() {
            return None;
        }
        let source_x = (source % WORLD_WIDTH) as f64;
        let source_y = (source / WORLD_WIDTH) as f64;
        let intent_x = (intent % WORLD_WIDTH) as f64;
        let intent_y = (intent / WORLD_WIDTH) as f64;
        let mut direction_x = intent_x - source_x;
        let mut direction_y = intent_y - source_y;
        let direction_length = (direction_x * direction_x + direction_y * direction_y).sqrt();
        if direction_length <= f64::EPSILON {
            direction_x = front.normal_x as f64;
            direction_y = front.normal_y as f64;
        } else {
            direction_x /= direction_length;
            direction_y /= direction_length;
        }

        let mut starts = Vec::with_capacity(5);
        let preferred_index = preferred as usize;
        if preferred_index < self.cells.len() && self.cells[preferred_index].owner_id == defender {
            starts.push(preferred_index);
        } else if preferred_index < self.cells.len() {
            starts.extend(
                Self::cardinal(preferred_index)
                    .into_iter()
                    .filter(|&cell| self.cells[cell].terrain_type == 0 && self.cells[cell].owner_id == defender),
            );
        }
        if starts.is_empty() {
            starts.push(front.target_cell_index as usize);
        }

        let mut queue = VecDeque::new();
        let mut seen = HashSet::new();
        for start in starts {
            if start < self.cells.len()
                && self.cells[start].terrain_type == 0
                && self.cells[start].owner_id == defender
                && seen.insert(start)
            {
                queue.push_back((start, 0_i32));
            }
        }

        let mut candidates: Vec<(f64, usize)> = Vec::new();
        while let Some((cell, distance)) = queue.pop_front() {
            let x = (cell % WORLD_WIDTH) as i32;
            let y = (cell / WORLD_WIDTH) as i32;
            let dx = x as f64 - source_x;
            let dy = y as f64 - source_y;
            let theatre_distance = dx.abs() + dy.abs();
            if theatre_distance <= WAR_THEATRE_RADIUS as f64 {
                let has_attacker_neighbour = Self::cardinal(cell)
                    .into_iter()
                    .any(|neighbor| self.cells[neighbor].terrain_type == 0 && self.cells[neighbor].owner_id == attacker);
                if has_attacker_neighbour {
                    let forward = dx * direction_x + dy * direction_y;
                    let lateral = (dx * direction_y - dy * direction_x).abs();
                    let intent_distance = ((x as f64 - intent_x).powi(2) + (y as f64 - intent_y).powi(2)).sqrt();
                    let local_distance = distance as f64;
                    let compact_neighbours = Self::cardinal(cell)
                        .into_iter()
                        .filter(|neighbor| self.cells[*neighbor].owner_id == attacker)
                        .count() as f64;
                    // Forward pressure dominates national-border length. The
                    // deterministic cell index tie-break avoids jitter.
                    let score = forward * 7.0
                        - lateral * 2.25
                        - intent_distance * 0.18
                        - local_distance * 0.08
                        + compact_neighbours * 0.35;
                    candidates.push((score, cell));
                }
            }

            if distance >= WAR_THEATRE_RADIUS {
                continue;
            }
            for neighbor in Self::cardinal(cell) {
                if self.cells[neighbor].terrain_type == 0
                    && self.cells[neighbor].owner_id == defender
                    && seen.insert(neighbor)
                {
                    queue.push_back((neighbor, distance + 1));
                }
            }
        }

        candidates.sort_by(|(score_a, cell_a), (score_b, cell_b)| {
            score_b
                .partial_cmp(score_a)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| cell_a.cmp(cell_b))
        });
        candidates.first().map(|(_, cell)| *cell as u32)
    }

    pub fn get_snapshot_cells(&self) -> Vec<CellState> {
        let mut result = Vec::with_capacity(self.cells.len());
        for (idx, cell) in self.cells.iter().enumerate() {
            result.push(CellState {
                index: idx as u32,
                owner_id: cell.owner_id,
                terrain: cell.terrain_type,
                flags: cell.state_flags,
            });
        }
        result
    }

    pub fn validate_invariants(&self) -> Result<(), String> {
        let valid_owner = |id: u8| id == 0 || self.factions.iter().any(|f| f.faction_id == id);
        let mut observed_land = vec![0u32; 256];
        for (index, cell) in self.cells.iter().enumerate() {
            if !valid_owner(cell.owner_id) {
                return Err(format!("invalid_owner:{}:{}", index, cell.owner_id));
            }
            if cell.terrain_type == 2 && cell.owner_id != 0 {
                return Err(format!("owned_water:{}:{}", index, cell.owner_id));
            }
            if cell.owner_id > 0 {
                observed_land[cell.owner_id as usize] += 1;
            }
        }
        for faction in &self.factions {
            let observed = observed_land[faction.faction_id as usize];
            if observed != faction.territory_count {
                return Err(format!("land_count:{}:{}:{}", faction.faction_id, observed, faction.territory_count));
            }
            if faction.is_eliminated {
                if observed != 0 || faction.population != 0.0 || faction.population_growth_per_second != 0.0 || faction.deployed_population != 0.0 {
                    return Err(format!("elimination_state:{}", faction.faction_id));
                }
            } else if faction.population < -0.0001
                || faction.population_capacity <= 0.0
                || faction.deployed_population < -0.0001
                || faction.total_living_population + 0.0001 < faction.population
            {
                return Err(format!("population_state:{}", faction.faction_id));
            }
        }
        let mut expected_deployed = vec![0.0; 256];
        for focus in &self.defense_foci {
            if (focus.faction_id as usize) < expected_deployed.len() {
                expected_deployed[focus.faction_id as usize] += focus.deployed_population;
            }
        }
        for front in &self.combat_manager.fronts {
            if !front.is_combat_active {
                continue;
            }
            if (front.faction_a as usize) < expected_deployed.len() {
                expected_deployed[front.faction_a as usize] += front.deployed_population_a;
            }
            if (front.faction_b as usize) < expected_deployed.len() {
                expected_deployed[front.faction_b as usize] += front.deployed_population_b;
            }
            let defender = if front.attacker_faction == front.faction_a {
                front.faction_b
            } else {
                front.faction_a
            };
            if (defender as usize) < expected_deployed.len() {
                expected_deployed[defender as usize] =
                    (expected_deployed[defender as usize]
                        - front.defense_focus_population
                        - front.shared_local_force_population)
                    .max(0.0);
            }
        }
        for faction in &self.factions {
            if (faction.deployed_population - expected_deployed[faction.faction_id as usize]).abs() > 0.01
                || (faction.total_living_population - faction.population - faction.deployed_population).abs() > 0.01
            {
                return Err(format!("population_ledger:{}", faction.faction_id));
            }
        }
        for front in &self.combat_manager.fronts {
            if !front.is_combat_active {
                continue;
            }
            if !self.is_faction_alive(front.attacker_faction) {
                return Err(format!("orphan_attacker_front:{}", front.front_id));
            }
            let defender = if front.attacker_faction == front.faction_a {
                front.faction_b
            } else {
                front.faction_a
            };
            if !self.is_faction_alive(defender) {
                return Err(format!("orphan_defender_front:{}", front.front_id));
            }
        }
        Ok(())
    }
}

#[cfg(any())]
mod legacy_tests {
    use super::*;

    #[test]
    fn test_water_ownership_invariant() {
        let mut sim = Simulation::new(10); // Generate 10 factions

        // 1. Initial 100 faction spawn invariant (we used 10 for speed)
        let mut owned_water_cells = 0;
        for cell in &sim.cells {
            if cell.owner_id > 0 && cell.terrain_type == 2 {
                owned_water_cells += 1;
            }
        }
        assert_eq!(
            owned_water_cells, 0,
            "Water cells must not be owned after initial spawn"
        );

        // 2. Neutral expansion invariant
        let faction_id = sim.factions[0].faction_id;
        // Give faction absurd power to expand
        sim.factions[0].army = 1_000_000.0;

        // Let's find a cell adjacent to their territory to expand into
        let mut target = None;
        for (i, cell) in sim.cells.iter().enumerate() {
            if cell.owner_id == 0 && cell.terrain_type == 0 {
                // Check if adjacent to faction 1
                let cx = (i % crate::world_map::WORLD_WIDTH) as i32;
                let cy = (i / crate::world_map::WORLD_WIDTH) as i32;
                let neighbors = [(cx, cy - 1), (cx, cy + 1), (cx - 1, cy), (cx + 1, cy)];
                let mut adj = false;
                for (nx, ny) in neighbors {
                    if nx >= 0
                        && nx < (crate::world_map::WORLD_WIDTH as i32)
                        && ny >= 0
                        && ny < (crate::world_map::WORLD_HEIGHT as i32)
                    {
                        let n_idx = (ny as usize) * crate::world_map::WORLD_WIDTH + (nx as usize);
                        if sim.cells[n_idx].owner_id == faction_id {
                            adj = true;
                            break;
                        }
                    }
                }
                if adj {
                    target = Some(i as u32);
                    break;
                }
            }
        }

        if let Some(t) = target {
            sim.process_expand_command(faction_id, t);
        }

        owned_water_cells = 0;
        for cell in &sim.cells {
            if cell.owner_id > 0 && cell.terrain_type == 2 {
                owned_water_cells += 1;
            }
        }
        assert_eq!(
            owned_water_cells, 0,
            "Water cells must not be owned after expansion"
        );

        // 3. Combat capture (We just manually run a tick with combat)
        sim.step_dt(1.0);
        owned_water_cells = 0;
        for cell in &sim.cells {
            if cell.owner_id > 0 && cell.terrain_type == 2 {
                owned_water_cells += 1;
            }
        }
        assert_eq!(
            owned_water_cells, 0,
            "Water cells must not be owned after combat tick"
        );

        println!("[SERVER TEST] owned_water_cells invariant proven: 0");
    }

    #[test]
    fn army_is_time_based_and_clamped() {
        let mut sim = Simulation::new(1);
        let cap = sim.factions[0].army_capacity;
        sim.factions[0].army = 0.0;
        let rate = sim.factions[0].recruitment_per_second;
        sim.step_dt(0.5);
        assert!((sim.factions[0].army - rate * 0.5).abs() < 0.0001);
        sim.step_dt(100000.0);
        assert_eq!(sim.factions[0].army, cap);
    }

    #[test]
    fn more_land_increases_recruitment_and_capacity() {
        let mut sim = Simulation::new(1);
        let old_r = sim.factions[0].recruitment_per_second;
        let old_c = sim.factions[0].army_capacity;
        let id = sim.factions[0].faction_id;
        let target = (0..sim.cells.len())
            .find(|&i| {
                sim.cells[i].owner_id == 0 && sim.cells[i].terrain_type == 0 && {
                    let x = i % WORLD_WIDTH;
                    let y = i / WORLD_WIDTH;
                    (y > 0 && sim.cells[i - WORLD_WIDTH].owner_id == id)
                        || (x + 1 < WORLD_WIDTH && sim.cells[i + 1].owner_id == id)
                        || (y + 1 < WORLD_HEIGHT && sim.cells[i + WORLD_WIDTH].owner_id == id)
                        || (x > 0 && sim.cells[i - 1].owner_id == id)
                }
            })
            .unwrap();
        sim.factions[0].army = 1000.0;
        sim.process_expand_command(id, target as u32).unwrap();
        assert!(sim.factions[0].recruitment_per_second > old_r);
        assert!(sim.factions[0].army_capacity > old_c);
    }

    #[test]
    fn owning_a_major_port_adds_one_small_recruitment_bonus() {
        let mut sim = Simulation::new(1);
        let port = sim
            .strategic_sites
            .iter()
            .find(|site| site.kind == "PORT")
            .unwrap()
            .cell_a;
        sim.set_cell_owner(port, 1);
        sim.refresh_all_economies();
        let faction = &sim.factions[0];
        let land_only = BASE_RECRUITMENT + faction.territory_count as f64 * RECRUITMENT_PER_CELL;
        assert!(
            (faction.recruitment_per_second - land_only - PORT_RECRUITMENT_BONUS).abs() < 0.0001
        );
    }

    #[test]
    fn expansion_charges_actual_cells_and_scales_down() {
        let mut sim = Simulation::new(1);
        let id = 1;
        sim.factions[0].army = EXPANSION_BASE_COST + EXPANSION_COST_PER_CELL * 5.0;
        let target = (0..sim.cells.len())
            .find(|&i| {
                sim.cells[i].owner_id == 0 && sim.cells[i].terrain_type == 0 && {
                    let x = i % WORLD_WIDTH;
                    let y = i / WORLD_WIDTH;
                    (y > 0 && sim.cells[i - WORLD_WIDTH].owner_id == id)
                        || (x + 1 < WORLD_WIDTH && sim.cells[i + 1].owner_id == id)
                        || (y + 1 < WORLD_HEIGHT && sim.cells[i + WORLD_WIDTH].owner_id == id)
                        || (x > 0 && sim.cells[i - 1].owner_id == id)
                }
            })
            .unwrap();
        let before = sim.factions[0].army;
        let out = sim.process_expand_command(id, target as u32).unwrap();
        assert_eq!(out.patch.actual_size, 5);
        assert!((before - sim.factions[0].army - out.army_cost).abs() < 0.0001);
    }

    #[test]
    fn one_hundred_starts_are_fair_connected_and_hole_free() {
        let sim = Simulation::new(100);
        let mut sizes: Vec<u32> = sim.factions.iter().map(|f| f.territory_count).collect();
        sizes.sort_unstable();
        assert!(sizes[0] >= 18, "smallest start was {}", sizes[0]);
        assert!(
            (sim.factions[0].territory_count as i32 - sizes[sizes.len() / 2] as i32).abs() <= 2
        );
        assert_eq!(sim.topology_violations(), (0, 0));
    }

    #[test]
    fn enclosed_neutral_cell_is_absorbed_into_paid_patch() {
        let mut sim = Simulation::new(1);
        let hole = (WORLD_WIDTH + 1..sim.cells.len() - WORLD_WIDTH - 1)
            .find(|&i| {
                Simulation::cardinal(i)
                    .into_iter()
                    .all(|n| sim.cells[n].terrain_type == 0)
            })
            .unwrap();
        let patch = hole + 1;
        for n in Simulation::cardinal(hole) {
            sim.cells[n].owner_id = 1
        }
        sim.cells[hole].owner_id = 0;
        sim.cells[patch].owner_id = 0;
        let fill = sim.find_enclosed_neutral_holes(1, &[patch as u32], 4);
        assert!(fill.contains(&(hole as u32)));
    }

    #[test]
    fn attack_commitment_leaves_reserve_and_uses_shared_defense() {
        let mut sim = Simulation::new(2);
        let source = (WORLD_WIDTH + 1..sim.cells.len() - WORLD_WIDTH - 2)
            .find(|&i| {
                Simulation::cardinal(i)
                    .into_iter()
                    .all(|n| sim.cells[n].terrain_type == 0)
            })
            .unwrap();
        let target = source + 1;
        sim.cells[source].owner_id = 1;
        sim.cells[target].owner_id = 2;
        sim.factions[0].army = 200.0;
        sim.factions[1].army = 150.0;
        assert!(sim
            .process_attack_command(1, source as u32, target as u32, 0.6)
            .is_ok());
        assert!((sim.factions[0].army - 80.0).abs() < 0.001);
        assert_eq!(sim.combat_manager.fronts[0].power_a, 120);
        let defender_before = sim.factions[1].army;
        sim.step_wars(1.0);
        assert!(sim.factions[1].army < defender_before);
        assert!(sim.combat_manager.fronts[0].power_a < 120);
    }

    #[test]
    fn war_advance_order_is_deterministic_and_starts_at_target() {
        let sim = Simulation::new(1);
        let center = 10 * WORLD_WIDTH + 100;
        let cells: Vec<u32> = vec![center - 1, center, center + 1, center + WORLD_WIDTH, center + WORLD_WIDTH * 2, center + WORLD_WIDTH * 2 + 1, center + WORLD_WIDTH * 2 + 2]
            .into_iter()
            .map(|cell| cell as u32)
            .collect();
        let ordered = sim.order_war_advance_cells(&cells, center as u32);
        assert_eq!(ordered.first().copied(), Some(center as u32));
        assert_eq!(ordered.len(), cells.len());
        let mut sorted = ordered.clone();
        sorted.sort_unstable();
        assert_eq!(sorted, cells);
        assert_eq!(ordered, sim.order_war_advance_cells(&cells, center as u32));
    }

    #[test]
    fn war_advance_reveals_multi_cell_capture_at_fixed_cadence() {
        let mut sim = Simulation::new(2);
        // Isolate the cadence fixture from the generated starting territories.
        // The production path checks defender connectivity; this unit test is
        // about reveal timing, so use a deliberately connected two-cell
        // defender island and a one-cell attacker anchor.
        for cell in &mut sim.cells {
            if cell.terrain_type == 0 {
                cell.owner_id = 0;
            }
        }
        let source = (WORLD_WIDTH + 2..sim.cells.len() - WORLD_WIDTH - 3)
            .find(|&i| {
                i % WORLD_WIDTH < WORLD_WIDTH - 3
                    && sim.cells[i].terrain_type == 0
                    && sim.cells[i + 1].terrain_type == 0
                    && sim.cells[i + 2].terrain_type == 0
            })
            .unwrap();
        let first = source + 1;
        let second = source + 2;
        sim.cells[source].owner_id = 1;
        sim.cells[first].owner_id = 2;
        sim.cells[second].owner_id = 2;
        sim.pending_war_advances.push(PendingWarAdvance {
            front_index: 0,
            attacker: 1,
            defender: 2,
            cells: VecDeque::from([first as u32, second as u32]),
            elapsed: 0.0,
        });

        sim.advance_pending_war_conquests(0.34);
        assert_eq!(sim.cells[first].owner_id, 2);
        assert_eq!(sim.cells[second].owner_id, 2);

        sim.advance_pending_war_conquests(0.01);
        assert_eq!(sim.cells[first].owner_id, 1);
        assert_eq!(sim.cells[second].owner_id, 2);

        sim.advance_pending_war_conquests(0.35);
        assert_eq!(sim.cells[second].owner_id, 1);
        assert!(sim.pending_war_advances.is_empty());
    }

    #[test]
    fn lost_capital_reassigns_to_owned_land() {
        let mut sim = Simulation::new(2);
        let old = sim.factions[0].capital_cell;
        assert!(sim.set_cell_owner(old, 2));
        assert_ne!(sim.factions[0].capital_cell, old);
        assert_eq!(sim.cells[sim.factions[0].capital_cell as usize].owner_id, 1);
    }

    fn three_way_land(sim: &Simulation) -> usize {
        (WORLD_WIDTH + 1..sim.cells.len() - WORLD_WIDTH - 2)
            .find(|&index| {
                index % WORLD_WIDTH < WORLD_WIDTH - 2
                    && sim.cells[index].terrain_type == 0
                    && sim.cells[index + 1].terrain_type == 0
                    && sim.cells[index + WORLD_WIDTH].terrain_type == 0
                    && sim.cells[index].owner_id == 0
                    && sim.cells[index + 1].owner_id == 0
                    && sim.cells[index + WORLD_WIDTH].owner_id == 0
            })
            .unwrap()
    }

    #[test]
    fn attack_orders_have_reasons_and_one_active_offensive_per_attacker() {
        let mut sim = Simulation::new(3);
        let source = three_way_land(&sim);
        let target = source + 1;
        assert!(sim.set_cell_owner(source as u32, 1));
        assert!(sim.set_cell_owner(target as u32, 2));
        sim.factions[0].army = 120.0;

        let order = sim.process_attack_command(1, source as u32, target as u32, 0.5);
        assert!(order.is_ok());
        assert_eq!(sim.active_front_for_attacker(1), Some(order.unwrap().front_id));
        assert_eq!(
            sim.process_attack_command(1, source as u32, target as u32, 0.5),
            Err("attack_already_active".to_string())
        );
    }

    #[test]
    fn simultaneous_attacks_use_distinct_attackers_without_owner_corruption() {
        let mut sim = Simulation::new(3);
        let center = three_way_land(&sim);
        let east = center + 1;
        let south = center + WORLD_WIDTH;
        assert!(sim.set_cell_owner(center as u32, 1));
        assert!(sim.set_cell_owner(east as u32, 2));
        assert!(sim.set_cell_owner(south as u32, 3));
        sim.factions[0].army = 160.0;
        sim.factions[2].army = 160.0;

        assert!(sim.process_attack_command(1, center as u32, east as u32, 0.5).is_ok());
        assert!(sim.process_attack_command(3, south as u32, center as u32, 0.5).is_ok());
        assert_eq!(sim.combat_manager.fronts.iter().filter(|front| front.is_combat_active).count(), 2);
        sim.step_dt(0.5);
        let invariant = sim.validate_invariants();
        assert!(invariant.is_ok(), "population ledger invariant: {:?}", invariant);
    }

    #[test]
    fn cancel_attack_removes_pending_capture_queue() {
        let mut sim = Simulation::new(2);
        let source = three_way_land(&sim);
        let target = source + 1;
        assert!(sim.set_cell_owner(source as u32, 1));
        assert!(sim.set_cell_owner(target as u32, 2));
        sim.factions[0].army = 160.0;
        let order = sim.process_attack_command(1, source as u32, target as u32, 0.5).unwrap();
        let front_index = sim.combat_manager.fronts.iter().position(|front| front.front_id == order.front_id).unwrap();
        sim.pending_war_advances.push(PendingWarAdvance {
            front_index,
            attacker: 1,
            defender: 2,
            cells: VecDeque::from([target as u32]),
            elapsed: 0.34,
        });
        assert!(sim.cancel_attack(1, order.front_id).is_ok());
        sim.step_dt(1.0);
        assert_eq!(sim.cells[target].owner_id, 2);
        assert_eq!(sim.combat_manager.fronts[front_index].termination_reason, "CANCELLED");
    }

    #[test]
    fn last_land_capture_eliminates_faction_and_finishes_two_faction_match() {
        let mut sim = Simulation::new(2);
        let target = sim.factions[1].capital_cell as usize;
        for cell in &mut sim.cells {
            if cell.owner_id == 2 {
                cell.owner_id = 0;
            }
        }
        sim.cells[target].owner_id = 2;
        sim.factions[1].territory_count = 1;
        sim.factions[1].capital_cell = target as u32;
        assert!(sim.set_cell_owner(target as u32, 1));
        assert!(sim.factions[1].is_eliminated);
        assert_eq!(sim.factions[1].army, 0.0);
        assert!(sim.match_over);
        assert_eq!(sim.winner_faction_id, Some(1));
        assert!(sim.validate_invariants().is_ok());
    }
}

#[cfg(test)]
mod population_tests {
    use super::*;

    fn adjacent_neutral(sim: &Simulation, owner: u8) -> u32 {
        (0..sim.cells.len()).find(|&i| {
            sim.cells[i].owner_id == 0 && sim.cells[i].terrain_type == 0 &&
            Simulation::cardinal(i).into_iter().any(|n| sim.cells[n].owner_id == owner)
        }).expect("adjacent neutral cell") as u32
    }

    fn adjacent_enemy(sim: &Simulation, attacker: u8, defender: u8) -> (u32, u32) {
        (0..sim.cells.len()).find_map(|i| {
            if sim.cells[i].owner_id != attacker || sim.cells[i].terrain_type != 0 { return None; }
            Simulation::cardinal(i).into_iter().find_map(|n| {
                (sim.cells[n].owner_id == defender).then_some((i as u32, n as u32))
            })
        }).expect("adjacent enemy cells")
    }

    fn make_enemy_pair(sim: &mut Simulation, attacker: u8, defender: u8) -> (u32, u32) {
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

    fn frontier_cell(sim: &Simulation, owner: u8) -> u32 {
        (0..sim.cells.len())
            .find(|&i| {
                sim.cells[i].owner_id == owner
                    && Simulation::cardinal(i).into_iter().any(|n| {
                        sim.cells[n].terrain_type == 0 && sim.cells[n].owner_id != owner
                    })
            })
            .expect("frontier cell") as u32
    }

    #[test]
    fn population_deployment_reduces_pool_but_living_total_includes_deployed() {
        let mut sim = Simulation::new(2);
        let source = (0..sim.cells.len()).find(|&i| {
            sim.cells[i].owner_id == 1 && Simulation::cardinal(i).into_iter().any(|n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0)
        }).unwrap();
        let target = Simulation::cardinal(source).into_iter().find(|&n| sim.cells[n].owner_id == 0 && sim.cells[n].terrain_type == 0).unwrap() as u32;
        sim.cells[target as usize].owner_id = 2;
        sim.factions[1].territory_count += 1;
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        let living_before = sim.factions[0].total_living_population;
        let out = sim.process_attack_command(1, source as u32, target, 0.25).unwrap();
        assert!(sim.factions[0].population < living_before);
        assert!((sim.factions[0].total_living_population - living_before).abs() < 0.01);
        assert!(out.deployed_population > 0.0);
    }

    #[test]
    fn three_point_operations_from_one_faction_are_legal_when_population_exists() {
        let mut sim = Simulation::new(3);
        sim.factions[0].population = 1_000_000.0;
        let mut points = Vec::new();
        for i in 1..sim.cells.len() {
            if sim.cells[i].terrain_type != 0 || sim.cells[i].owner_id != 0 { continue; }
            if points.iter().any(|(_, target): &(u32, u32)| {
                let target = *target as usize;
                (i % WORLD_WIDTH).abs_diff(target % WORLD_WIDTH) + (i / WORLD_WIDTH).abs_diff(target / WORLD_WIDTH) <= 3
            }) { continue; }
            let owner_neighbor = Simulation::cardinal(i).into_iter().find(|&n| sim.cells[n].owner_id == 1);
            if let Some(source) = owner_neighbor {
                sim.cells[i].owner_id = 2;
                points.push((source as u32, i as u32));
                if points.len() == 3 { break; }
            }
        }
        assert!(points.len() >= 3);
        let first = sim.process_attack_command(1, points[0].0, points[0].1, 0.1).unwrap();
        let second = sim.process_attack_command(1, points[1].0, points[1].1, 0.1).unwrap();
        let third = sim.process_attack_command(1, points[2].0, points[2].1, 0.1).unwrap();
        assert_ne!(first.front_id, second.front_id);
        assert_ne!(second.front_id, third.front_id);
        assert_eq!(sim.combat_manager.fronts.iter().filter(|f| f.is_combat_active).count(), 3);
    }

    #[test]
    fn same_enemy_at_two_border_points_keeps_two_spatial_operations() {
        let mut sim = Simulation::new(3);
        sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap().population = 1_000_000.0;
        let mut points = Vec::new();
        for index in 0..sim.cells.len() {
            if sim.cells[index].owner_id != 0 || sim.cells[index].terrain_type != 0 { continue; }
            let Some(source) = Simulation::cardinal(index).into_iter().find(|&n| sim.cells[n].owner_id == 1) else { continue };
            if points.iter().any(|(_, target): &(u32, u32)| {
                let target = *target as usize;
                (index % WORLD_WIDTH).abs_diff(target % WORLD_WIDTH) + (index / WORLD_WIDTH).abs_diff(target / WORLD_WIDTH) <= 3
            }) { continue; }
            assert!(sim.set_cell_owner(index as u32, 2));
            points.push((source as u32, index as u32));
            if points.len() == 2 { break; }
        }
        assert_eq!(points.len(), 2);
        let a = sim.process_attack_command(1, points[0].0, points[0].1, 0.1).unwrap();
        let b = sim.process_attack_command(1, points[1].0, points[1].1, 0.1).unwrap();
        let front_a = sim.combat_manager.fronts.iter().find(|f| f.front_id == a.front_id).unwrap();
        let front_b = sim.combat_manager.fronts.iter().find(|f| f.front_id == b.front_id).unwrap();
        assert_ne!(front_a.target_cell_index, front_b.target_cell_index);
        assert_ne!((front_a.centroid_x, front_a.centroid_y), (front_b.centroid_x, front_b.centroid_y));
    }

    #[test]
    fn nearby_land_orders_merge_without_duplicate_population_or_defense() {
        let mut sim = Simulation::new(2);
        // Deterministic two-sided frontier, well away from world edges.
        let base = 200 * WORLD_WIDTH + 400;
        for offset in 0..10 {
            for (row, owner) in [(0, 1), (1, 2)] {
                let i = base + row * WORLD_WIDTH + offset;
                sim.cells[i].terrain_type = 0;
                sim.cells[i].owner_id = owner;
            }
        }
        sim.factions[0].population = 100_000.0;
        sim.factions[1].population = 100_000.0;
        let first = sim.process_attack_command(1, base as u32, (base + WORLD_WIDTH) as u32, 0.1).unwrap();
        let defender_pool = sim.factions[1].population;
        let second = sim.process_attack_command(1, (base + 2) as u32, (base + WORLD_WIDTH + 2) as u32, 0.1).unwrap();
        assert_eq!(first.front_id, second.front_id);
        assert_eq!(sim.factions[0].population, 81_000.0);
        assert_eq!(sim.factions[1].population, defender_pool, "merging must not deploy emergency defense twice");
        let front = sim.combat_manager.fronts.iter().find(|f| f.front_id == first.front_id).unwrap();
        assert_eq!(front.deployed_population_a, 19_000.0);
        assert_eq!(front.target_cell_index, (base + WORLD_WIDTH) as u32, "merge preserves the existing operation path");
        let far = sim.process_attack_command(1, (base + 8) as u32, (base + WORLD_WIDTH + 8) as u32, 0.1).unwrap();
        assert_ne!(first.front_id, far.front_id);
        sim.cells[base + WORLD_WIDTH + 1].terrain_type = 2;
        sim.cells[base + WORLD_WIDTH + 1].owner_id = 0;
        let separated = sim.process_attack_command(1, (base + 2) as u32, (base + WORLD_WIDTH + 2) as u32, 0.1).unwrap();
        assert_ne!(first.front_id, separated.front_id, "water must separate nearby fronts");
        let before_halt = sim.factions[0].population;
        sim.cancel_attack(1, first.front_id).unwrap();
        assert!((sim.factions[0].population - before_halt).abs() < 0.01);
        assert!(sim.cancel_attack(1, first.front_id).is_err());
    }

    #[test]
    fn reinforcement_adds_to_front_and_only_spends_new_population() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = 100_000.0;
        let order = sim.process_attack_command(1, source, target, 0.87).unwrap();
        let after_first_order = sim.factions.iter().find(|f| f.faction_id == 1).unwrap().population;
        sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap().population = 50_000.0;
        let added = sim.reinforce_front(1, order.front_id, 1.0).unwrap();
        let front = sim.combat_manager.fronts.iter().find(|f| f.front_id == order.front_id).unwrap();
        let attacker_force = if front.faction_a == 1 { front.deployed_population_a } else { front.deployed_population_b };
        assert!((added - 50_000.0).abs() < 0.01);
        assert!((attacker_force - 137_000.0).abs() < 0.01, "front force was {}", attacker_force);
        assert!((after_first_order - 13_000.0).abs() < 0.01);
        assert!((sim.factions.iter().find(|f| f.faction_id == 1).unwrap().population).abs() < 0.01);
    }

    #[test]
    fn existing_offensive_force_is_shared_local_defense_without_double_spend() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap().population = 80_000.0;
        sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap().population = 80_000.0;
        let first = sim.process_attack_command(2, target, source, 0.25).unwrap();
        let second = sim.process_attack_command(1, source, target, 0.25).unwrap();
        let counter = sim.combat_manager.fronts.iter().find(|f| f.front_id == second.front_id).unwrap();
        assert!(counter.shared_local_force_population > 0.0);
        let f2_deployed: f64 = sim.combat_manager.fronts.iter().filter(|f| f.is_combat_active && f.attacker_faction == 2).map(|f| if f.faction_a == 2 { f.deployed_population_a } else { f.deployed_population_b }).sum();
        let f2 = sim.factions.iter().find(|f| f.faction_id == 2).unwrap();
        assert!((f2.deployed_population - f2_deployed).abs() < 0.01, "deployed ledger duplicated shared force: ledger={} offensive={}", f2.deployed_population, f2_deployed);
        assert!(first.front_id != second.front_id);
    }

    #[test]
    fn defense_focus_reserves_real_population_and_release_returns_it() {
        let mut sim = Simulation::new(1);
        let own = frontier_cell(&sim, 1);
        sim.factions[0].population = sim.factions[0].population_capacity;
        let before = sim.factions[0].population;
        sim.set_defense_focus(1, own, 4_000.0).unwrap();
        assert_eq!(sim.factions[0].population, before - 4_000.0);
        assert_eq!(sim.factions[0].deployed_population, 4_000.0);
        sim.release_defense_focus(1, own).unwrap();
        assert!((sim.factions[0].population - before).abs() < 0.01);
    }

    #[test]
    fn growth_uses_total_living_population_and_near_capacity_is_quiet() {
        let mut sim = Simulation::new(1);
        for c in &mut sim.cell_consolidation { *c = 1.0; }
        sim.recompute_area_stats();
        sim.refresh_all_economies();
        let capacity = sim.factions[0].population_capacity;
        sim.factions[0].population = capacity;
        let focus = capacity * 0.01;
        let own = frontier_cell(&sim, 1);
        sim.set_defense_focus(1, own, focus).unwrap();
        sim.factions[0].population = capacity * 0.98;
        let before = sim.factions[0].population;
        sim.step_dt(10.0);
        assert!(sim.factions[0].population - before < capacity * 0.02);
    }

    #[test]
    fn real_area_is_latitude_corrected_and_start_is_sparse() {
        let equator = Simulation::cell_area_km2(256 * WORLD_WIDTH + 512);
        let high_latitude = Simulation::cell_area_km2(64 * WORLD_WIDTH + 512);
        assert!(equator > high_latitude);
        let sim = Simulation::new(101);
        let owned: usize = sim.cells.iter().filter(|c| c.terrain_type == 0 && c.owner_id > 0).count();
        let owned_ratio = owned as f64 / sim.total_land_cells as f64;
        assert!((0.001..=0.05).contains(&owned_ratio), "sparse start ratio was {:.3}", owned_ratio);
        assert_eq!(sim.factions.len(), 101);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn custom_human_is_faction_101_and_doctrine_presets_are_zero_sum() {
        let sim = Simulation::new(101);
        assert_eq!(sim.factions.len(), 101);
        let human = sim.factions.iter().find(|f| f.is_human).expect("custom human");
        assert_eq!(human.faction_id, PLAYER_FACTION_ID);
        assert_eq!(human.nation_preset_id, "custom");
        for faction in &sim.factions {
            let sum = faction.doctrine_offense + faction.doctrine_defense + faction.doctrine_expansion + faction.doctrine_maritime;
            assert!(sum.abs() < 0.0001);
            assert!(faction.doctrine_offense.abs() <= 0.0601);
            assert!(faction.flag_descriptor.is_some());
            assert!(!faction.homeland_region.is_empty());
        }
    }

    #[test]
    fn deploying_everyone_does_not_create_growth_or_duplicate_living_people() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].effective_controlled_area_km2 = sim.factions[0].controlled_area_km2;
        sim.refresh_all_economies();
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        let total_before = sim.factions[0].total_living_population;
        let order = sim.process_attack_command(1, source, target, 1.0).unwrap();
        assert!(sim.factions[0].population.abs() < 0.01);
        assert!((sim.factions[0].total_living_population - total_before).abs() < 0.01);
        sim.step_dt(5.0);
        assert!(sim.factions[0].total_living_population <= total_before + 0.01);
        let invariant = sim.validate_invariants();
        assert!(invariant.is_ok(), "population ledger invariant: {:?}", invariant);
        sim.cancel_attack(1, order.front_id).unwrap();
        assert!(sim.factions[0].total_living_population <= total_before + 0.01);
    }

    #[test]
    fn port_cost_is_permanent_and_completion_is_time_based() {
        let mut sim = Simulation::new(1);
        let port = sim.strategic_sites.iter().find(|site| site.kind == "PORT" && sim.cells[site.cell_a as usize].terrain_type == 0 && sim.is_coastal_cell(site.cell_a)).map(|site| site.cell_a).expect("coastal port site");
        assert!(sim.set_cell_owner(port, 1));
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.factions[0].population = sim.factions[0].population.min(sim.factions[0].population_capacity);
        let before = sim.factions[0].population;
        sim.build_port(1, port).unwrap();
        assert!(sim.factions[0].population < before);
        assert_eq!(sim.factions[0].ports_count, 0);
        let construction = sim.port_states().into_iter().find(|state| state.cell_index == port).expect("visible construction state");
        assert!(!construction.complete);
        assert!((9.9..=10.0).contains(&construction.remaining_seconds));
        sim.step_dt(5.0);
        let halfway = sim.port_states().into_iter().find(|state| state.cell_index == port).expect("construction remains visible");
        assert!((4.8..=5.0).contains(&halfway.remaining_seconds));
        sim.step_dt(5.0);
        assert_eq!(sim.factions[0].ports_count, 1);
        assert!(sim.port_states().iter().any(|state| state.cell_index == port && state.complete));
        let after_completion = sim.factions[0].population;
        sim.step_dt(10.0);
        assert!(sim.factions[0].population >= after_completion);
    }

    #[test]
    fn alliance_blocks_ordinary_attack() {
        let mut sim = Simulation::new(2);
        sim.offer_alliance(1, 2).unwrap();
        let source = sim.factions[0].capital_cell;
        let target = sim.factions[1].capital_cell;
        assert!(sim.are_allied(1, 2));
        assert_eq!(sim.process_attack_command(1, source, target, 0.5), Err("allied_target".to_string()));
    }

    #[test]
    fn human_alliance_offer_can_be_accepted_or_rejected_as_a_proposal() {
        let mut sim = Simulation::new(101);
        let proposal = sim.offer_alliance(1, PLAYER_FACTION_ID).unwrap();
        assert!(sim.has_pending_alliance(proposal));
        assert!(!sim.are_allied(1, PLAYER_FACTION_ID));
        assert_eq!(sim.respond_alliance(PLAYER_FACTION_ID, proposal, true).unwrap(), proposal);
        assert!(sim.are_allied(1, PLAYER_FACTION_ID));

        let rejected = sim.offer_alliance(2, PLAYER_FACTION_ID).unwrap();
        assert_eq!(sim.respond_alliance(PLAYER_FACTION_ID, rejected, false), Err("alliance_rejected".to_string()));
        assert!(!sim.are_allied(2, PLAYER_FACTION_ID));
    }

    #[test]
    fn alliance_reward_pool_is_split_by_real_controlled_area() {
        let mut sim = Simulation::new(3);
        sim.offer_alliance(1, 2).unwrap();
        let area_one = sim.factions.iter().find(|f| f.faction_id == 1).unwrap().controlled_area_km2;
        let area_two = sim.factions.iter().find(|f| f.faction_id == 2).unwrap().controlled_area_km2;
        let shares = sim.alliance_reward_shares(10_000.0);
        let one = shares.iter().find(|(id, _)| *id == 1).unwrap().1;
        let two = shares.iter().find(|(id, _)| *id == 2).unwrap().1;
        assert!((one + two - 10_000.0).abs() < 0.01);
        assert!((one / two - area_one / area_two).abs() < 0.0001);
    }

    #[test]
    fn solo_and_connected_alliance_victories_resolve_from_alive_factions() {
        let mut solo = Simulation::new(2);
        let defender_cells: Vec<u32> = solo
            .cells
            .iter()
            .enumerate()
            .filter_map(|(index, cell)| (cell.owner_id == 2).then_some(index as u32))
            .collect();
        assert!(!defender_cells.is_empty());
        let last_defender_cell = defender_cells[0];
        for cell in defender_cells.into_iter().skip(1) {
            assert!(solo.set_cell_owner(cell, 0));
        }
        assert!(solo.is_faction_alive(2));
        assert!(solo.set_cell_owner(last_defender_cell, 1));
        assert!(solo.match_over);
        assert_eq!(solo.winner_faction_id, Some(1));

        let mut coalition = Simulation::new(3);
        let first = coalition.offer_alliance(1, 2).expect("first AI alliance");
        assert!(!coalition.has_pending_alliance(first));
        let second = coalition.offer_alliance(2, 3).expect("second AI alliance");
        assert!(!coalition.has_pending_alliance(second));
        assert!(coalition.are_allied(1, 2));
        assert!(coalition.are_allied(2, 3));
        coalition.update_match_outcome();
        assert!(coalition.match_over);
        assert_eq!(coalition.winner_faction_id, Some(1));
    }

    #[test]
    fn halt_does_not_refund_offensive_population() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = 100_000.0_f64.min(sim.factions[0].population_capacity);
        let before = sim.factions[0].population;
        let order = sim.process_attack_command(1, source, target, 0.5).unwrap();
        let after_deploy = sim.factions[0].population;
        sim.cancel_attack(1, order.front_id).unwrap();
        assert!((sim.factions[0].population - after_deploy).abs() < 0.01);
        assert!(sim.combat_manager.fronts.iter().find(|f| f.front_id == order.front_id).unwrap().survivors_returned);
        assert_eq!(sim.cancel_attack(1, order.front_id), Err("front_not_active".to_string()));
        assert!(after_deploy < before);
    }

    #[test]
    fn exhausted_offensive_returns_survivors_and_keeps_casualties_dead() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        let living_before = sim.factions[0].total_living_population;
        let order = sim.process_attack_command(1, source, target, 0.5).unwrap();
        let index = sim.combat_manager.fronts.iter().position(|front| front.front_id == order.front_id).unwrap();
        sim.combat_manager.fronts[index].deployed_population_a = 10.0;
        sim.step_dt(1.0);
        let front = &sim.combat_manager.fronts[index];
        assert!(!front.is_combat_active);
        assert!(front.survivors_returned);
        assert!(front.casualties > 0.0);
        assert!(sim.factions[0].total_living_population < living_before);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn expansion_uses_the_exact_selected_adjacent_point() {
        let mut sim = Simulation::new(1);
        let target = adjacent_neutral(&sim, 1);
        sim.factions[0].population = sim.factions[0].population_capacity;
        let outcome = sim.process_expand_command(1, target).unwrap();
        assert_eq!(outcome.resolved_anchor, target);
        assert_eq!(sim.cells[target as usize].owner_id, 1);
    }

    #[test]
    fn amphibious_operation_is_a_real_population_backed_front() {
        let mut sim = Simulation::new(2);
        let port = sim
            .strategic_sites
            .iter()
            .find(|site| site.kind == "PORT" && sim.is_coastal_cell(site.cell_a))
            .map(|site| site.cell_a)
            .expect("port site");
        let target = (0..sim.cells.len())
            .find(|&index| {
                sim.cells[index].terrain_type == 0
                    && sim.cells[index].owner_id == 0
                    && Simulation::cardinal(index)
                        .into_iter()
                        .any(|n| sim.cells[n].terrain_type == 2)
                    && index as u32 != port
            })
            .expect("coastal target") as u32;
        assert!(sim.set_cell_owner(port, 1));
        assert!(sim.set_cell_owner(target, 2));
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.build_port(1, port).unwrap();
        sim.step_dt(10.0);
        let outcome = sim.process_amphibious_operation(1, port, target, 0.25).unwrap();
        let front = sim
            .combat_manager
            .fronts
            .iter()
            .find(|front| front.front_id == outcome.front_id)
            .unwrap();
        assert_eq!(front.operation_kind, "AMPHIBIOUS");
        assert_eq!(front.source_cell_index, port);
        assert_eq!(front.target_cell_index, target);
        assert!(front.deployed_population_a > 0.0 || front.deployed_population_b > 0.0);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn unfinished_port_is_cancelled_on_capture_without_population_refund() {
        let mut sim = Simulation::new(2);
        let port = sim
            .strategic_sites
            .iter()
            .find(|site| site.kind == "PORT" && sim.is_coastal_cell(site.cell_a))
            .map(|site| site.cell_a)
            .expect("coastal port site");
        assert!(sim.set_cell_owner(port, 1));
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        let before = sim.factions[0].population;
        let cost = sim.build_port(1, port).expect("start port construction");
        assert!((before - sim.factions[0].population - cost).abs() < 0.01);
        assert_eq!(sim.port_constructions.len(), 1);

        // Capture during construction cancels the unfinished project. The
        // already-paid Population is not returned and no completed port is
        // created for either side.
        assert!(sim.set_cell_owner(port, 2));
        sim.step_dt(0.25);
        assert!(sim.port_constructions.is_empty());
        assert!(!sim.built_ports.contains(&port));
        assert!(sim.factions[0].population < before);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn completed_port_transfers_to_the_new_coastal_owner() {
        let mut sim = Simulation::new(2);
        let port = sim
            .strategic_sites
            .iter()
            .find(|site| site.kind == "PORT" && sim.is_coastal_cell(site.cell_a))
            .map(|site| site.cell_a)
            .expect("coastal port site");
        assert!(sim.set_cell_owner(port, 1));
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        sim.build_port(1, port).expect("start port construction");
        sim.step_dt(10.0);
        assert!(sim.built_ports.contains(&port));
        assert_eq!(sim.factions[0].ports_count, 1);

        assert!(sim.set_cell_owner(port, 2));
        sim.step_dt(0.1);
        let transferred = sim.port_states().into_iter().find(|state| state.cell_index == port).expect("transferred port");
        assert!(transferred.complete);
        assert_eq!(transferred.owner_id, 2);
        assert_eq!(sim.factions[0].ports_count, 0);
        assert_eq!(sim.factions[1].ports_count, 1);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn amphibious_distance_is_monotonic_and_no_port_limits_real_deployment() {
        let a = 200 * WORLD_WIDTH + 200;
        let b = 200 * WORLD_WIDTH + 300;
        let c = 200 * WORLD_WIDTH + 400;
        let near = Simulation::great_circle_distance_km(a as u32, b as u32);
        let far = Simulation::great_circle_distance_km(a as u32, c as u32);
        assert!(far > near && near > 0.0);

        let mut sim = Simulation::new(2);
        let port = sim
            .strategic_sites
            .iter()
            .find(|site| site.kind == "PORT" && sim.is_coastal_cell(site.cell_a))
            .map(|site| site.cell_a)
            .expect("coastal embarkation site");
        let target = (0..sim.cells.len())
            .find(|&index| {
                sim.cells[index].terrain_type == 0
                    && sim.cells[index].owner_id == 0
                    && sim.is_coastal_cell(index as u32)
                    && index as u32 != port
            })
            .expect("coastal target") as u32;
        assert!(sim.set_cell_owner(port, 1));
        assert!(sim.set_cell_owner(target, 2));
        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        let pool_before = sim.factions[0].population;
        let outcome = sim.process_amphibious_operation(1, port, target, 1.0).expect("raiding party");
        let front = sim.combat_manager.fronts.iter().find(|front| front.front_id == outcome.front_id).expect("amphibious front");
        assert!(front.deployed_population_a <= pool_before * 0.08);
        assert!(sim.factions[0].population < pool_before);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn amphibious_port_changes_commitment_and_survival_while_land_rules_stay_strict() {
        let configure = |sim: &mut Simulation| -> (u32, u32) {
            let port = sim
                .strategic_sites
                .iter()
                .find(|site| site.kind == "PORT" && sim.is_coastal_cell(site.cell_a))
                .map(|site| site.cell_a)
                .expect("coastal embarkation site");
            let target = (0..sim.cells.len())
                .find(|&index| {
                    sim.cells[index].terrain_type == 0
                        && sim.cells[index].owner_id == 0
                        && sim.is_coastal_cell(index as u32)
                        && index as u32 != port
                })
                .expect("coastal target") as u32;
            assert!(sim.set_cell_owner(port, 1));
            assert!(sim.set_cell_owner(target, 2));
            sim.factions[0].population = 100_000.0_f64.min(sim.factions[0].population_capacity);
            sim.refresh_all_economies();
            (port, target)
        };

        let mut without_port = Simulation::new(2);
        let (port, target) = configure(&mut without_port);
        let no_port_pool = without_port.factions[0].population;
        let no_port_order = without_port
            .process_amphibious_operation(1, port, target, 1.0)
            .expect("small no-port landing");
        let no_port_front = without_port
            .combat_manager
            .fronts
            .iter()
            .find(|front| front.front_id == no_port_order.front_id)
            .unwrap();
        assert!(no_port_front.deployed_population_a <= no_port_pool * 0.08 + 0.01);
        let no_port_committed = no_port_front.deployed_population_a + no_port_front.casualties;
        let no_port_survival = no_port_front.deployed_population_a / no_port_committed;

        let mut with_port = Simulation::new(2);
        let (port, target) = configure(&mut with_port);
        let before_port = with_port.factions[0].population;
        let port_cost = with_port.build_port(1, port).expect("start port construction");
        assert!(port_cost > 0.0);
        assert!(with_port.factions[0].population < before_port);
        with_port.step_dt(10.0);
        assert!(with_port.built_ports.contains(&port));
        let with_port_order = with_port
            .process_amphibious_operation(1, port, target, 1.0)
            .expect("full port landing");
        let with_port_front = with_port
            .combat_manager
            .fronts
            .iter()
            .find(|front| front.front_id == with_port_order.front_id)
            .unwrap();
        let with_port_committed = with_port_front.deployed_population_a + with_port_front.casualties;
        let with_port_survival = with_port_front.deployed_population_a / with_port_committed;
        assert!(with_port_front.deployed_population_a > no_port_front.deployed_population_a);
        assert!(with_port_survival > no_port_survival);
        assert!(with_port.factions[0].population < before_port - port_cost + 0.01);
        assert!(with_port.validate_invariants().is_ok());

        let mut strict_land = Simulation::new(2);
        let (source, border) = make_enemy_pair(&mut strict_land, 1, 2);
        let deep_target = (0..strict_land.cells.len())
            .find(|&index| {
                strict_land.cells[index].terrain_type == 0
                    && strict_land.cells[index].owner_id == 2
                    && !Simulation::cardinal(source as usize).contains(&index)
                    && index != border as usize
            })
            .expect("non-border hostile land");
        assert_eq!(
            strict_land.process_attack_command_with_intent(1, source, deep_target as u32, Some(deep_target as u32), 0.5),
            Err("no_shared_front".to_string())
        );
        let inland = (0..strict_land.cells.len())
            .find(|&index| {
                strict_land.cells[index].terrain_type == 0
                    && strict_land.cells[index].owner_id == 0
                    && !strict_land.is_coastal_cell(index as u32)
            })
            .expect("inland land");
        assert!(strict_land.set_cell_owner(inland as u32, 2));
        let coastal_source = strict_land
            .strategic_sites
            .iter()
            .find(|site| site.kind == "PORT" && strict_land.is_coastal_cell(site.cell_a))
            .map(|site| site.cell_a)
            .expect("coastal source");
        assert!(strict_land.set_cell_owner(coastal_source, 1));
        assert_eq!(
            strict_land.process_amphibious_operation(1, coastal_source, inland as u32, 0.5),
            Err("target_not_coastal".to_string())
        );
    }

    #[test]
    fn directional_operations_keep_war_progress_in_the_selected_theatre() {
        let mut sim = Simulation::new(2);
        let mut reserved: Vec<(usize, usize)> = Vec::new();
        let directions = [(1_i32, 0_i32), (-1, 0), (0, 1), (0, -1), (1, 1)];
        let mut orders = Vec::new();

        for (direction_x, direction_y) in directions {
            let mut base = None;
            'search: for y in 80..(WORLD_HEIGHT - 30) {
                for x in 80..(WORLD_WIDTH - 30) {
                    if reserved.iter().any(|(rx, ry)| {
                        (x as i32 - *rx as i32).abs() < 34 && (y as i32 - *ry as i32).abs() < 34
                    }) {
                        continue;
                    }
                    let clear = (0..28).all(|dy| (0..28).all(|dx| {
                        let index = (y + dy) * WORLD_WIDTH + x + dx;
                        sim.cells[index].terrain_type == 0 && sim.cells[index].owner_id == 0
                    }));
                    if clear {
                        base = Some((x, y));
                        break 'search;
                    }
                }
            }
            let (x, y) = base.expect("directional land fixture");
            reserved.push((x, y));

            for dy in 4..16 {
                for dx in 4..16 {
                    assert!(sim.set_cell_owner(((y + dy) * WORLD_WIDTH + x + dx) as u32, 2));
                }
            }

            let (source, target) = if direction_x > 0 {
                for dy in 4..16 {
                    for dx in 1..4 {
                        assert!(sim.set_cell_owner(((y + dy) * WORLD_WIDTH + x + dx) as u32, 1));
                    }
                }
                (((y + 10) * WORLD_WIDTH + x + 3) as u32, ((y + 10) * WORLD_WIDTH + x + 4) as u32)
            } else if direction_x < 0 {
                for dy in 4..16 {
                    for dx in 16..19 {
                        assert!(sim.set_cell_owner(((y + dy) * WORLD_WIDTH + x + dx) as u32, 1));
                    }
                }
                (((y + 10) * WORLD_WIDTH + x + 16) as u32, ((y + 10) * WORLD_WIDTH + x + 15) as u32)
            } else if direction_y > 0 {
                for dy in 1..4 {
                    for dx in 4..16 {
                        assert!(sim.set_cell_owner(((y + dy) * WORLD_WIDTH + x + dx) as u32, 1));
                    }
                }
                (((y + 3) * WORLD_WIDTH + x + 10) as u32, ((y + 4) * WORLD_WIDTH + x + 10) as u32)
            } else {
                for dy in 16..19 {
                    for dx in 4..16 {
                        assert!(sim.set_cell_owner(((y + dy) * WORLD_WIDTH + x + dx) as u32, 1));
                    }
                }
                (((y + 16) * WORLD_WIDTH + x + 10) as u32, ((y + 15) * WORLD_WIDTH + x + 10) as u32)
            };

            let intent_x = if direction_x < 0 { x + 5 } else { x + 14 };
            let intent_y = if direction_y < 0 { y + 5 } else if direction_y > 0 { y + 14 } else { y + 10 };
            let intent = (intent_y * WORLD_WIDTH + intent_x) as u32;
            orders.push((source, target, intent, direction_x, direction_y));
        }

        sim.factions[0].population = sim.factions[0].population_capacity;
        sim.refresh_all_economies();
        let mut front_indices = Vec::new();
        for (source, target, intent, direction_x, direction_y) in orders {
            let result = sim.process_attack_command_with_intent(1, source, target, Some(intent), 0.05).expect("directional attack");
            let front_index = sim.combat_manager.fronts.iter().position(|front| front.front_id == result.front_id).expect("front");
            let next = sim.find_directional_war_frontier_target(front_index, 1, 2, target).expect("local directional candidate");
            let source_x = (source as usize % WORLD_WIDTH) as i32;
            let source_y = (source as usize / WORLD_WIDTH) as i32;
            let next_x = (next as usize % WORLD_WIDTH) as i32;
            let next_y = (next as usize / WORLD_WIDTH) as i32;
            if direction_x > 0 { assert!(next_x >= source_x); }
            if direction_x < 0 { assert!(next_x <= source_x); }
            if direction_y > 0 { assert!(next_y >= source_y); }
            if direction_y < 0 { assert!(next_y <= source_y); }
            assert!((next_x - source_x).abs() <= WAR_THEATRE_RADIUS);
            assert!((next_y - source_y).abs() <= WAR_THEATRE_RADIUS);
            front_indices.push(result.front_id);
        }
        assert_eq!(front_indices.len(), 5);
        assert_eq!(front_indices.iter().collect::<std::collections::HashSet<_>>().len(), 5);
        assert!(sim.validate_invariants().is_ok());
    }

    fn prepare_compass_direction_fixture(sim: &mut Simulation, direction: (i32, i32)) -> (u32, u32, u32) {
        let width = 36usize;
        let height = 36usize;
        // Reuse one loaded world fixture across all compass directions; the
        // world asset load is intentionally expensive and is unrelated to
        // the directional assertion itself.
        for cell in &mut sim.cells {
            if cell.owner_id > 0 {
                cell.owner_id = 0;
            }
        }
        for faction in &mut sim.factions {
            faction.territory_count = 0;
            faction.controlled_area_km2 = 0.0;
            faction.effective_controlled_area_km2 = 0.0;
            faction.is_eliminated = false;
            faction.population = 90_000.0;
            faction.population_capacity = 90_000.0;
            faction.population_growth_per_second = 0.0;
            faction.deployed_population = 0.0;
            faction.total_living_population = 90_000.0;
        }
        sim.combat_manager = CombatManager::new();
        sim.pending_war_advances.clear();
        sim.defense_foci.clear();
        let mut origin = None;
        'search: for y in 72..(WORLD_HEIGHT - height - 72) {
            for x in 72..(WORLD_WIDTH - width - 72) {
                let clear = (0..height).all(|dy| (0..width).all(|dx| {
                    let cell = &sim.cells[(y + dy) * WORLD_WIDTH + x + dx];
                    cell.terrain_type == 0 && cell.owner_id == 0
                }));
                if clear {
                    origin = Some((x, y));
                    break 'search;
                }
            }
        }
        let (x, y) = origin.expect("compass land fixture");
        // Isolate the fixture from the generated opening cores. The capture
        // invariant intentionally rejects a patch that would leave a
        // defender's other disconnected component orphaned, so this fixture
        // must contain exactly one authoritative defender component.
        for dy in 0..height {
            for dx in 0..width {
                sim.cells[(y + dy) * WORLD_WIDTH + x + dx].owner_id = 2;
            }
        }

        let mid_x = x + width / 2;
        let mid_y = y + height / 2;
        let (source, target, intent) = match direction {
            (-1, 0) => (
                mid_y * WORLD_WIDTH + x + width,
                mid_y * WORLD_WIDTH + x + width - 1,
                (y + 5) * WORLD_WIDTH + x + 4,
            ),
            (1, 0) => (
                mid_y * WORLD_WIDTH + x - 1,
                mid_y * WORLD_WIDTH + x,
                (y + 5) * WORLD_WIDTH + x + width - 5,
            ),
            (0, -1) => (
                (y + height) * WORLD_WIDTH + mid_x,
                (y + height - 1) * WORLD_WIDTH + mid_x,
                (y + 4) * WORLD_WIDTH + x + 5,
            ),
            (0, 1) => (
                (y - 1) * WORLD_WIDTH + mid_x,
                y * WORLD_WIDTH + mid_x,
                (y + height - 5) * WORLD_WIDTH + x + width - 6,
            ),
            (-1, -1) => (
                (y + height) * WORLD_WIDTH + mid_x,
                (y + height - 1) * WORLD_WIDTH + mid_x,
                (y + 4) * WORLD_WIDTH + x + 4,
            ),
            (1, -1) => (
                (y + height) * WORLD_WIDTH + mid_x,
                (y + height - 1) * WORLD_WIDTH + mid_x,
                (y + 4) * WORLD_WIDTH + x + width - 5,
            ),
            (-1, 1) => (
                (y - 1) * WORLD_WIDTH + mid_x,
                y * WORLD_WIDTH + mid_x,
                (y + height - 5) * WORLD_WIDTH + x + 4,
            ),
            (1, 1) => (
                (y - 1) * WORLD_WIDTH + mid_x,
                y * WORLD_WIDTH + mid_x,
                (y + height - 5) * WORLD_WIDTH + x + width - 5,
            ),
            _ => panic!("invalid compass direction"),
        };
        let source = source as u32;
        let target = target as u32;
        let intent = intent as u32;
        sim.cells[source as usize].owner_id = 1;
        sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap().territory_count = 1;
        sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap().territory_count = width as u32 * height as u32;
        sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap().population = 0.0;
        sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap().total_living_population = 0.0;
        (source, target, intent)
    }

    #[test]
    fn directional_attack_follows_all_eight_compass_intents() {
        let directions = [
            (-1, 0), (1, 0), (0, -1), (0, 1),
            (-1, -1), (1, -1), (-1, 1), (1, 1),
        ];
        let mut sim = Simulation::new(2);
        sim.evaluate_match_outcome = false;
        for direction in directions {
            let (source, target, intent) = prepare_compass_direction_fixture(&mut sim, direction);
            let attacker_capacity = sim.factions.iter().find(|f| f.faction_id == 1).unwrap().population_capacity;
            sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap().population = attacker_capacity;
            sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap().population = 0.0;
            let order = sim
                .process_attack_command_with_intent(1, source, target, Some(intent), 0.5)
                .expect("compass attack accepted");
            let front_index = sim.combat_manager.fronts.iter().position(|front| front.front_id == order.front_id).unwrap();
            let candidate = sim
                .find_directional_war_frontier_target(front_index, 1, 2, target)
                .expect("directional candidate");
            let candidate_patch = generate_compact_patch(&sim.cells, 1, candidate, 4, PatchMode::WarAdvance { defender: 2 });
            assert!(!candidate_patch.cells.is_empty(), "direction {:?} produced no patch at candidate {} ({:?})", direction, candidate, candidate_patch.blocked_reason);
            let source_x = (source as usize % WORLD_WIDTH) as i32;
            let source_y = (source as usize / WORLD_WIDTH) as i32;
            let candidate_x = (candidate as usize % WORLD_WIDTH) as i32;
            let candidate_y = (candidate as usize / WORLD_WIDTH) as i32;
            let displacement = (candidate_x - source_x, candidate_y - source_y);
            let dot = displacement.0 * direction.0 + displacement.1 * direction.1;
            assert!(dot > 0, "direction {:?} did not advance toward intent: {:?}", direction, displacement);
            if direction.0 < 0 { assert!(displacement.0 <= 0); }
            if direction.0 > 0 { assert!(displacement.0 >= 0); }
            if direction.1 < 0 { assert!(displacement.1 <= 0); }
            if direction.1 > 0 { assert!(displacement.1 >= 0); }

            for _ in 0..220 {
                sim.step_dt(0.05);
                if sim.combat_manager.fronts[front_index].captured_cells > 0 { break; }
            }
            let failed_front = &sim.combat_manager.fronts[front_index];
            assert!(failed_front.captured_cells > 0, "direction {:?} made no authoritative breach: active={} pressure={} target={} term={} pending={}", direction, failed_front.is_combat_active, failed_front.pressure, failed_front.target_cell_index, failed_front.termination_reason, sim.pending_war_advances.len());
            let captured: Vec<(i32, i32)> = sim
                .cells
                .iter()
                .enumerate()
                .filter_map(|(index, cell)| (cell.owner_id == 1 && index != source as usize).then_some((
                    (index % WORLD_WIDTH) as i32,
                    (index / WORLD_WIDTH) as i32,
                )))
                .collect();
            assert!(!captured.is_empty(), "direction {:?} has no authoritative captured cells", direction);
            let centroid = (
                captured.iter().map(|(x, _)| *x as f64).sum::<f64>() / captured.len() as f64,
                captured.iter().map(|(_, y)| *y as f64).sum::<f64>() / captured.len() as f64,
            );
            let centroid_displacement = (
                centroid.0 - source_x as f64,
                centroid.1 - source_y as f64,
            );
            let centroid_dot = centroid_displacement.0 * direction.0 as f64 + centroid_displacement.1 * direction.1 as f64;
            assert!(centroid_dot > 0.0, "direction {:?} captured centroid {:?} did not move forward from ({},{})", direction, centroid, source_x, source_y);
            assert!(sim.validate_invariants().is_ok());
        }
    }

    fn wide_direction_fixture() -> (Simulation, u32, u32, u32) {
        let mut sim = Simulation::new(2);
        sim.evaluate_match_outcome = false;
        let width = 44usize;
        let depth = 10usize;
        let mut origin = None;
        'search: for y in 80..(WORLD_HEIGHT - depth - 20) {
            for x in 80..(WORLD_WIDTH - width - 20) {
                let clear = (0..depth).all(|dy| (0..width).all(|dx| {
                    let index = (y + dy) * WORLD_WIDTH + x + dx;
                    sim.cells[index].terrain_type == 0 && sim.cells[index].owner_id == 0
                }));
                if clear {
                    origin = Some((x, y));
                    break 'search;
                }
            }
        }
        let (x, y) = origin.expect("wide neutral land fixture");
        for dx in 0..width {
            assert!(sim.set_cell_owner((y * WORLD_WIDTH + x + dx) as u32, 1));
            for dy in 1..depth {
                assert!(sim.set_cell_owner(((y + dy) * WORLD_WIDTH + x + dx) as u32, 2));
            }
        }
        sim.refresh_all_economies();
        sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap().population = 140_000.0;
        sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap().population = 140_000.0;
        let source = (y * WORLD_WIDTH + x + width / 2) as u32;
        let border_target = ((y + 1) * WORLD_WIDTH + x + width / 2) as u32;
        let west_intent = ((y + 4) * WORLD_WIDTH + x + 5) as u32;
        (sim, source, border_target, west_intent)
    }

    #[test]
    fn attack_preserves_deep_target_intent_and_pushes_into_local_theatre() {
        let (mut sim, source, border_target, west_intent) = wide_direction_fixture();
        let order = sim
            .process_attack_command_with_intent(1, source, border_target, Some(west_intent), 0.75)
            .expect("directional attack accepted");
        let front_index = sim.combat_manager.fronts.iter().position(|front| front.front_id == order.front_id).unwrap();
        assert_eq!(sim.combat_manager.fronts[front_index].intent_target_cell_index, west_intent);

        for _ in 0..260 {
            sim.step_dt(0.05);
            if !sim.combat_manager.fronts[front_index].is_combat_active { break; }
        }

        let anchor_x = (source as usize % WORLD_WIDTH) as f64;
        let mut captured = Vec::new();
        let base_y = source as usize / WORLD_WIDTH;
        for y in (base_y + 1)..(base_y + 10) {
            for x in 0..WORLD_WIDTH {
                let index = y * WORLD_WIDTH + x;
                if sim.cells[index].owner_id == 1 {
                    captured.push((x as f64, y as f64));
                }
            }
        }
        assert!(!captured.is_empty(), "the local front must make progress");
        let centroid_x = captured.iter().map(|(x, _)| *x).sum::<f64>() / captured.len() as f64;
        assert!(centroid_x < anchor_x - 1.0, "west intent should dominate shared-border crawl: centroid={} anchor={}", centroid_x, anchor_x);
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn attack_without_intent_keeps_legacy_border_point_as_intent() {
        let (mut sim, source, border_target, _) = wide_direction_fixture();
        let order = sim.process_attack_command(1, source, border_target, 0.25).unwrap();
        let front = sim.combat_manager.fronts.iter().find(|front| front.front_id == order.front_id).unwrap();
        assert_eq!(front.intent_target_cell_index, border_target);
    }

    #[test]
    fn mop_up_ledger_charges_once_and_returns_only_final_survivors() {
        let mut sim = Simulation::new(2);
        let (source, target) = make_enemy_pair(&mut sim, 1, 2);
        let remnant = Simulation::cardinal(target as usize)
            .into_iter()
            .find(|&cell| sim.cells[cell].terrain_type == 0 && sim.cells[cell].owner_id == 0)
            .expect("local remnant") as u32;
        assert!(sim.set_cell_owner(remnant, 2));
        isolate_faction_2(&mut sim, &[target, remnant]);

        let attacker = sim.factions.iter_mut().find(|f| f.faction_id == 1).unwrap();
        attacker.controlled_area_km2 = 1_000_000_000.0;
        attacker.effective_controlled_area_km2 = 1_000_000_000.0;
        attacker.population_capacity = 1_000_000.0;
        attacker.population = 500_000.0;
        attacker.total_living_population = 500_000.0;
        attacker.population_growth_per_second = 0.0;
        let defender = sim.factions.iter_mut().find(|f| f.faction_id == 2).unwrap();
        defender.population = 0.0;
        defender.total_living_population = 0.0;
        let order = sim.process_attack_command(1, source, target, 0.2).unwrap();
        assert!((sim.factions.iter().find(|f| f.faction_id == 1).unwrap().population - 400_000.0).abs() < 0.01);

        let index = sim.combat_manager.fronts.iter().position(|front| front.front_id == order.front_id).unwrap();
        {
            let front = &mut sim.combat_manager.fronts[index];
            front.deployed_population_a = 70_000.0;
            front.deployed_population_b = 0.0;
            front.casualties = 30_000.0;
        }
        sim.set_cell_owner(target, 1);
        sim.refresh_all_economies();
        assert!((sim.factions[0].population - 400_000.0).abs() < 0.01, "mop-up must not refund before operation end");
        assert!((sim.factions[0].total_living_population - 470_000.0).abs() < 0.01);

        {
            let front = &mut sim.combat_manager.fronts[index];
            front.deployed_population_a = 50_000.0;
            front.casualties = 50_000.0;
            front.is_combat_active = false;
            front.termination_reason = "ATTACKER_SUCCESS".to_string();
        }
        sim.set_cell_owner(remnant, 1);
        sim.return_front_survivors(index);
        assert!((sim.factions[0].population - 400_000.0).abs() < 0.01);
        assert!((sim.combat_manager.fronts[index].casualties - 50_000.0).abs() < 0.01);
        assert!(sim.combat_manager.fronts[index].survivors_returned);
        let after_return = sim.factions[0].population;
        sim.return_front_survivors(index);
        assert!((sim.factions[0].population - after_return).abs() < 0.01, "survivors returned twice");
        sim.refresh_all_economies();
        assert!(sim.validate_invariants().is_ok());
    }

    #[test]
    fn test_task_3_spawn_gate_100_seeds() {
        use std::collections::HashSet;
        use crate::balance::STANDARD_ACTIVE_CIVILIZATIONS;

        for seed in 1..=100 {
            let human_choice = match seed % 4 {
                0 => Some("roma"),
                1 => Some("hun"),
                2 => Some("gokturk"),
                _ => Some("yamato"),
            };

            let sim = Simulation::new_standard(human_choice, seed);

            // 1. Active factions = 44
            assert_eq!(
                sim.factions.len(),
                STANDARD_ACTIVE_CIVILIZATIONS,
                "Seed {}: faction count must be 44",
                seed
            );

            // 2. Exactly 1 human faction and 43 AI factions
            let human_count = sim.factions.iter().filter(|f| f.is_human).count();
            assert_eq!(human_count, 1, "Seed {}: must have exactly 1 human faction", seed);
            let human = sim.factions.iter().find(|f| f.is_human).unwrap();
            assert_eq!(human.faction_id, crate::balance::HUMAN_FACTION_ID);
            assert_eq!(human.civilization_id, human_choice.unwrap());

            // 3. Duplicate civilizations = 0
            let mut civ_ids = HashSet::new();
            let mut faction_ids = HashSet::new();
            for f in &sim.factions {
                assert!(
                    civ_ids.insert(&f.civilization_id),
                    "Seed {}: duplicate civ id: {}",
                    seed,
                    f.civilization_id
                );
                assert!(
                    faction_ids.insert(f.faction_id),
                    "Seed {}: duplicate faction id: {}",
                    seed,
                    f.faction_id
                );
            }
            assert_eq!(civ_ids.len(), 44);

            // 4. Invalid land spawn = 0, water ownership = 0, overlaps = 0
            let mut cell_owner_counts = vec![0u32; sim.cells.len()];
            let mut owned_per_faction = vec![0u32; 256];

            for (idx, cell) in sim.cells.iter().enumerate() {
                if cell.owner_id > 0 {
                    assert_eq!(
                        cell.terrain_type, 0,
                        "Seed {}: cell {} owned by {} but terrain is water ({})",
                        seed, idx, cell.owner_id, cell.terrain_type
                    );
                    cell_owner_counts[idx] += 1;
                    assert_eq!(
                        cell_owner_counts[idx], 1,
                        "Seed {}: cell {} owned multiple times (overlap)",
                        seed, idx
                    );
                    owned_per_faction[cell.owner_id as usize] += 1;
                }
            }

            // 5. Each faction has valid starting nucleus (5,000–14,000 km²), contiguous, non-empty
            for f in &sim.factions {
                assert_eq!(
                    f.territory_count,
                    owned_per_faction[f.faction_id as usize],
                    "Seed {}: territory count mismatch for faction {}",
                    seed, f.faction_id
                );
                assert!(
                    f.territory_count >= 2 && f.territory_count <= 8,
                    "Seed {}: faction {} territory cell count unexpected: {}",
                    seed, f.faction_id, f.territory_count
                );
                assert!(
                    f.controlled_area_km2 >= 400.0 && f.controlled_area_km2 <= 8_500.0,
                    "Seed {}: faction {} starting area out of bounds: {:.1} km²",
                    seed, f.faction_id, f.controlled_area_km2
                );

                let cap = f.capital_cell as usize;
                assert_eq!(sim.cells[cap].owner_id, f.faction_id);
                assert_eq!(sim.cells[cap].terrain_type, 0);

                let mut visited_nucleus = HashSet::new();
                let mut q = std::collections::VecDeque::new();
                q.push_back(cap);
                visited_nucleus.insert(cap);
                while let Some(curr) = q.pop_front() {
                    let cx = curr % WORLD_WIDTH;
                    let cy = curr / WORLD_WIDTH;
                    let neighbors = [
                        (cy > 0).then(|| (cy - 1) * WORLD_WIDTH + cx),
                        Some(cy * WORLD_WIDTH + (cx + 1) % WORLD_WIDTH),
                        (cy + 1 < WORLD_HEIGHT).then(|| (cy + 1) * WORLD_WIDTH + cx),
                        Some(cy * WORLD_WIDTH + (cx + WORLD_WIDTH - 1) % WORLD_WIDTH),
                    ];
                    for n in neighbors.into_iter().flatten() {
                        if sim.cells[n].owner_id == f.faction_id && visited_nucleus.insert(n) {
                            q.push_back(n);
                        }
                    }
                }
                assert_eq!(
                    visited_nucleus.len(),
                    f.territory_count as usize,
                    "Seed {}: faction {} territory is not contiguous!",
                    seed, f.faction_id
                );
            }

            assert!(sim.validate_invariants().is_ok(), "Seed {}: invariant failure: {:?}", seed, sim.validate_invariants());
        }
    }

    #[test]
    fn test_task_29_generate_nucleus_spawn_audit_csv() {
        use std::fs::File;
        use std::io::Write;

        let mut lines = Vec::new();
        lines.push("seed,faction_id,civilization_id,capital_cell,cell_count,area_km2,is_contiguous,water_cells,overlap_cells".to_string());

        let seeds = [1u64, 42, 100, 2026, 7777];
        for &seed in &seeds {
            let sim = Simulation::new_standard(Some("roma"), seed);
            let mut cell_owner_counts = vec![0u32; sim.cells.len()];
            for (idx, cell) in sim.cells.iter().enumerate() {
                if cell.owner_id > 0 {
                    cell_owner_counts[idx] += 1;
                }
            }

            for f in &sim.factions {
                let cap = f.capital_cell as usize;
                let mut visited = std::collections::HashSet::new();
                let mut q = std::collections::VecDeque::new();
                q.push_back(cap);
                visited.insert(cap);
                let mut water_cells = 0;
                let mut overlap_cells = 0;

                while let Some(curr) = q.pop_front() {
                    if sim.cells[curr].terrain_type != 0 {
                        water_cells += 1;
                    }
                    if cell_owner_counts[curr] > 1 {
                        overlap_cells += 1;
                    }
                    let cx = curr % WORLD_WIDTH;
                    let cy = curr / WORLD_WIDTH;
                    let neighbors = [
                        (cy > 0).then(|| (cy - 1) * WORLD_WIDTH + cx),
                        Some(cy * WORLD_WIDTH + (cx + 1) % WORLD_WIDTH),
                        (cy + 1 < WORLD_HEIGHT).then(|| (cy + 1) * WORLD_WIDTH + cx),
                        Some(cy * WORLD_WIDTH + (cx + WORLD_WIDTH - 1) % WORLD_WIDTH),
                    ];
                    for n in neighbors.into_iter().flatten() {
                        if sim.cells[n].owner_id == f.faction_id && visited.insert(n) {
                            q.push_back(n);
                        }
                    }
                }
                let is_contiguous = visited.len() == f.territory_count as usize;
                lines.push(format!(
                    "{},{},{},{},{},{:.1},{},{},{}",
                    seed, f.faction_id, f.civilization_id, f.capital_cell,
                    f.territory_count, f.controlled_area_km2, is_contiguous, water_cells, overlap_cells
                ));
            }
        }

        let out_path = "../artifacts/gameplay-rewrite-v2/nucleus_spawn_audit.csv";
        if let Ok(mut f) = File::create(out_path) {
            let _ = f.write_all(lines.join("\n").as_bytes());
        }
    }

    #[test]
    fn test_task_4_population_core_commit_casualty_return_elimination_saturation() {
        // 1. Commit, casualty, return test
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        assert!(sim.validate_invariants().is_ok());

        let human_id = crate::balance::HUMAN_FACTION_ID;
        let frontier_pt = sim.cells.iter().enumerate().find(|&(i, c)| {
            c.owner_id == human_id && Simulation::cardinal(i).into_iter().any(|n| sim.cells[n].terrain_type == 0 && sim.cells[n].owner_id != human_id)
        }).map(|(i, _)| i as u32).expect("frontier cell");
        let initial_living = sim.factions.iter().find(|f| f.faction_id == human_id).unwrap().total_living_population;
        let initial_uncommitted = sim.factions.iter().find(|f| f.faction_id == human_id).unwrap().population;
        assert_eq!(initial_living, initial_uncommitted);

        // Commit: Set defense focus
        let commit_amt = 15_000.0;
        sim.set_defense_focus(human_id, frontier_pt, commit_amt).unwrap();
        sim.refresh_all_economies();
        assert!(sim.validate_invariants().is_ok());

        let human = sim.factions.iter().find(|f| f.faction_id == human_id).unwrap();
        assert!((human.population - (initial_uncommitted - commit_amt)).abs() < 0.01);
        assert!((human.deployed_population - commit_amt).abs() < 0.01);
        assert!((human.total_living_population - initial_living).abs() < 0.01);

        // Return: Release defense focus
        sim.release_defense_focus(human_id, frontier_pt).unwrap();
        sim.refresh_all_economies();
        assert!(sim.validate_invariants().is_ok());

        let human = sim.factions.iter().find(|f| f.faction_id == human_id).unwrap();
        assert!((human.population - initial_uncommitted).abs() < 0.01);
        assert!((human.deployed_population - 0.0).abs() < 0.01);
        assert!((human.total_living_population - initial_living).abs() < 0.01);

        // 2. Growth Saturation test (Passive Turtling Prevention)
        let mut sim_growth = Simulation::new(2);
        for c in &mut sim_growth.cells {
            c.owner_id = 0;
        }
        let base_a = 200 * WORLD_WIDTH + 300;
        let base_b = 200 * WORLD_WIDTH + 600;
        for i in 0..5 {
            sim_growth.cells[base_a + i].terrain_type = 0;
            sim_growth.cells[base_a + i].owner_id = 1;
            sim_growth.cell_consolidation[base_a + i] = 1.0;
        }
        for i in 0..25 {
            sim_growth.cells[base_b + i].terrain_type = 0;
            sim_growth.cells[base_b + i].owner_id = 2;
            sim_growth.cell_consolidation[base_b + i] = 1.0;
        }
        sim_growth.factions[0].capital_cell = base_a as u32;
        sim_growth.factions[0].territory_count = 5;
        sim_growth.factions[1].capital_cell = base_b as u32;
        sim_growth.factions[1].territory_count = 25;
        sim_growth.factions[0].controlled_area_km2 = 5_000.0;
        sim_growth.factions[0].effective_controlled_area_km2 = 5_000.0;
        sim_growth.factions[1].controlled_area_km2 = 25_000.0;
        sim_growth.factions[1].effective_controlled_area_km2 = 25_000.0;
        sim_growth.factions[0].population = 50_000.0;
        sim_growth.factions[1].population = 50_000.0;
        sim_growth.recompute_area_stats();
        sim_growth.refresh_all_economies();

        let cap_a = sim_growth.factions[0].population_capacity;
        let cap_b = sim_growth.factions[1].population_capacity;
        assert!(cap_b > cap_a * 1.5, "Faction B with 5x territory must have significantly higher capacity");

        // Simulate 200 seconds of growth
        for _ in 0..200 {
            sim_growth.step_dt(1.0);
            assert!(sim_growth.validate_invariants().is_ok());
        }

        let pop_a = sim_growth.factions[0].total_living_population;
        let pop_b = sim_growth.factions[1].total_living_population;

        assert!(pop_a <= cap_a + 1.0);
        assert!(pop_b > pop_a, "Larger territory faction must outgrow turtle faction");

        // 3. Elimination test
        for i in 0..5 {
            sim_growth.cells[base_a + i].owner_id = 0;
        }
        sim_growth.factions[0].territory_count = 0;
        sim_growth.factions[0].controlled_area_km2 = 0.0;
        sim_growth.factions[0].effective_controlled_area_km2 = 0.0;
        sim_growth.factions[0].is_eliminated = true;
        sim_growth.factions[0].population = 0.0;
        sim_growth.factions[0].deployed_population = 0.0;
        sim_growth.factions[0].total_living_population = 0.0;
        sim_growth.factions[0].population_growth_per_second = 0.0;
        sim_growth.factions[0].population_capacity = 0.0;
        assert!(sim_growth.validate_invariants().is_ok());

        // 4. Long randomized simulation invariant test (1,000 ticks)
        let mut sim_rand = Simulation::new_standard(Some("roma"), 12345);
        use rand::{Rng, SeedableRng};
        let mut rng = rand::rngs::StdRng::seed_from_u64(9999);

        for step in 0..1000 {
            sim_rand.step_dt(0.05);

            if step % 50 == 0 {
                let fac_idx = rng.gen_range(0..sim_rand.factions.len());
                let fac_id = sim_rand.factions[fac_idx].faction_id;
                let frontier_opt = sim_rand.cells.iter().enumerate().find(|&(i, c)| {
                    c.owner_id == fac_id && Simulation::cardinal(i).into_iter().any(|n| sim_rand.cells[n].terrain_type == 0 && sim_rand.cells[n].owner_id != fac_id)
                }).map(|(i, _)| i as u32);
                let avail = sim_rand.factions[fac_idx].population;
                if let Some(frontier_cell) = frontier_opt {
                    if avail > 5_000.0 {
                        let commit = avail * 0.1;
                        let _ = sim_rand.set_defense_focus(fac_id, frontier_cell, commit);
                    } else {
                        let _ = sim_rand.release_defense_focus(fac_id, frontier_cell);
                    }
                }
            }

            assert!(
                sim_rand.validate_invariants().is_ok(),
                "Step {}: invariant violation: {:?}",
                step,
                sim_rand.validate_invariants()
            );
        }
    }

    #[test]
    fn test_task_5_consolidation_and_overextension_gate() {
        let mut sim = Simulation::new(3);
        for c in &mut sim.cells {
            c.owner_id = 0;
        }

        let base_a = 150 * WORLD_WIDTH + 200;
        let base_b = 150 * WORLD_WIDTH + 500;
        let base_att = 151 * WORLD_WIDTH + 200;
        let base_att2 = 151 * WORLD_WIDTH + 500;

        for i in 0..10 {
            let ca = base_a + i;
            sim.cells[ca].terrain_type = 0;
            sim.cells[ca].owner_id = 1;
            sim.cell_consolidation[ca] = 1.0;

            let cb = base_b + i;
            sim.cells[cb].terrain_type = 0;
            sim.cells[cb].owner_id = 2;
            sim.cell_consolidation[cb] = crate::balance::CONSOLIDATION_NEUTRAL_INITIAL;

            let catt = base_att + i;
            sim.cells[catt].terrain_type = 0;
            sim.cells[catt].owner_id = 3;
            sim.cell_consolidation[catt] = 1.0;

            let catt2 = base_att2 + i;
            sim.cells[catt2].terrain_type = 0;
            sim.cells[catt2].owner_id = 3;
            sim.cell_consolidation[catt2] = 1.0;
        }

        sim.factions[0].capital_cell = base_a as u32;
        sim.factions[1].capital_cell = base_b as u32;
        sim.factions[2].capital_cell = base_att as u32;

        sim.factions[0].population = 100_000.0;
        sim.factions[1].population = 100_000.0;
        sim.factions[2].population = 100_000.0;

        sim.recompute_area_stats();
        sim.refresh_all_economies();
        sim.macro_phase = MacroPhase::WarEra;

        let fac_a = &sim.factions[0];
        let fac_b = &sim.factions[1];

        assert!((fac_a.consolidation_ratio - 1.0).abs() < 0.01);
        assert!((fac_a.overextension_ratio - 0.0).abs() < 0.01);

        assert!((fac_b.consolidation_ratio - crate::balance::CONSOLIDATION_NEUTRAL_INITIAL).abs() < 0.01);
        assert!((fac_b.overextension_ratio - (1.0 - crate::balance::CONSOLIDATION_NEUTRAL_INITIAL)).abs() < 0.01);

        assert!(fac_a.effective_controlled_area_km2 > fac_b.effective_controlled_area_km2 * 4.0);
        assert!(fac_a.population_capacity > fac_b.population_capacity);

        let order_a = sim.process_attack_command(3, base_att as u32, base_a as u32, 0.2).unwrap();
        let front_a = sim.combat_manager.fronts.iter().find(|f| f.front_id == order_a.front_id).unwrap();
        let defense_mobilized_a = front_a.local_defense_population;

        let order_b = sim.process_attack_command(3, base_att2 as u32, base_b as u32, 0.2).unwrap();
        let front_b = sim.combat_manager.fronts.iter().find(|f| f.front_id == order_b.front_id).unwrap();
        let defense_mobilized_b = front_b.local_defense_population;

        assert!(
            defense_mobilized_a > defense_mobilized_b * 3.0,
            "Mature territory must mobilize significantly more emergency defense ({:.1} vs {:.1})",
            defense_mobilized_a,
            defense_mobilized_b
        );

        let initial_ratio = sim.factions[1].consolidation_ratio;
        sim.advance_area_consolidation(50.0);
        let matured_ratio = sim.factions[1].consolidation_ratio;
        assert!(matured_ratio > initial_ratio, "Territory must consolidate over time");
        assert!(sim.factions[1].overextension_ratio < 1.0 - initial_ratio);
    }

    #[test]
    fn test_task_6_and_7_critical_expansion_and_shape_gate() {
        let setup_circular_country = || -> Simulation {
            let mut sim = Simulation::new(1);
            for c in &mut sim.cells {
                c.owner_id = 0;
                c.terrain_type = 0; // Neutral land everywhere
            }
            let cx = 512i32;
            let cy = 256i32;
            let center_idx = (cy as usize) * WORLD_WIDTH + (cx as usize);
            let r = 8i32;
            for dy in -r..=r {
                for dx in -r..=r {
                    if dx * dx + dy * dy <= r * r {
                        let nx = cx + dx;
                        let ny = cy + dy;
                        let idx = (ny as usize) * WORLD_WIDTH + (nx as usize);
                        sim.cells[idx].owner_id = 1;
                    }
                }
            }
            sim.factions[0].capital_cell = center_idx as u32;
            sim.factions[0].population = 100_000.0;
            for c in &mut sim.cell_consolidation { *c = 1.0; }
            sim.recompute_area_stats();
            sim.refresh_all_economies();
            sim
        };

        let mut sim = setup_circular_country();
        let reset_circle = |s: &mut Simulation| {
            for c in &mut s.cells {
                c.owner_id = 0;
                c.terrain_type = 0;
            }
            let cx = 512i32;
            let cy = 256i32;
            let center_idx = (cy as usize) * WORLD_WIDTH + (cx as usize);
            let r = 8i32;
            for dy in -r..=r {
                for dx in -r..=r {
                    if dx * dx + dy * dy <= r * r {
                        let nx = cx + dx;
                        let ny = cy + dy;
                        let idx = (ny as usize) * WORLD_WIDTH + (nx as usize);
                        s.cells[idx].owner_id = 1;
                    }
                }
            }
            s.factions[0].capital_cell = center_idx as u32;
            s.factions[0].population = 100_000.0;
            for c in &mut s.cell_consolidation { *c = 1.0; }
            s.recompute_area_stats();
            s.refresh_all_economies();
        };

        // 1. FOCUS far WEST
        {
            reset_circle(&mut sim);
            let target_west = (256 * WORLD_WIDTH + (512 - 25)) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_west, "FOCUS", None)
                .expect("Focus west expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // East side must NOT advance at all (x > 512)
                assert!(x <= 512, "East side must not advance when expanding west! Got x={}", x);
                // Corridor must be bounded in Y (near 256)
                assert!((y - 256).abs() <= 10, "Corridor Y spread must remain localized! Got y={}", y);
            }
        }

        // 2. FOCUS NORTH
        {
            reset_circle(&mut sim);
            let target_north = ((256 - 25) * WORLD_WIDTH + 512) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_north, "FOCUS", None)
                .expect("Focus north expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // South side must NOT advance at all (y > 256)
                assert!(y <= 256, "South side must not advance when expanding north! Got y={}", y);
                // Corridor must be bounded in X (near 512)
                assert!((x - 512).abs() <= 10, "Corridor X spread must remain localized! Got x={}", x);
            }
        }

        // 3. FOCUS NORTHWEST
        {
            reset_circle(&mut sim);
            let target_nw = ((256 - 22) * WORLD_WIDTH + (512 - 22)) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_nw, "FOCUS", None)
                .expect("Focus northwest expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // Southeast must NOT advance (x > 512 || y > 256)
                assert!(x <= 512 && y <= 256, "Southeast must not advance when expanding northwest! Got x={}, y={}", x, y);
            }
        }

        // 3b. FOCUS EAST
        {
            reset_circle(&mut sim);
            let target_east = (256 * WORLD_WIDTH + (512 + 25)) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_east, "FOCUS", None)
                .expect("Focus east expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // West side must NOT advance at all (x < 512)
                assert!(x >= 512, "West side must not advance when expanding east! Got x={}", x);
                assert!((y - 256).abs() <= 10, "Corridor Y spread must remain localized! Got y={}", y);
            }
        }

        // 3c. FOCUS SOUTH
        {
            reset_circle(&mut sim);
            let target_south = ((256 + 25) * WORLD_WIDTH + 512) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_south, "FOCUS", None)
                .expect("Focus south expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // North side must NOT advance at all (y < 256)
                assert!(y >= 256, "North side must not advance when expanding south! Got y={}", y);
                assert!((x - 512).abs() <= 10, "Corridor X spread must remain localized! Got x={}", x);
            }
        }

        // 3d. FOCUS SOUTHEAST
        {
            reset_circle(&mut sim);
            let target_se = ((256 + 22) * WORLD_WIDTH + (512 + 22)) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_se, "FOCUS", None)
                .expect("Focus southeast expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // Northwest must NOT advance (x < 512 || y < 256)
                assert!(x >= 512 && y >= 256, "Northwest must not advance when expanding southeast! Got x={}, y={}", x, y);
            }
        }

        // 3e. FOCUS NORTHEAST
        {
            reset_circle(&mut sim);
            let target_ne = ((256 - 22) * WORLD_WIDTH + (512 + 22)) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_ne, "FOCUS", None)
                .expect("Focus northeast expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // Southwest must NOT advance (x < 512 || y > 256)
                assert!(x >= 512 && y <= 256, "Southwest must not advance when expanding northeast! Got x={}, y={}", x, y);
            }
        }

        // 3f. FOCUS SOUTHWEST
        {
            reset_circle(&mut sim);
            let target_sw = ((256 + 22) * WORLD_WIDTH + (512 - 22)) as u32;
            let outcome = sim.process_expand_command_with_mode(1, target_sw, "FOCUS", None)
                .expect("Focus southwest expansion should succeed");
            assert!(outcome.patch.actual_size >= 4);

            for &cell_idx in &outcome.patch.cells {
                let x = (cell_idx as usize % WORLD_WIDTH) as i32;
                let y = (cell_idx as usize / WORLD_WIDTH) as i32;
                // Northeast must NOT advance (x > 512 || y < 256)
                assert!(x <= 512 && y >= 256, "Northeast must not advance when expanding southwest! Got x={}, y={}", x, y);
            }
        }

        // 4. FRONTIER mode & Natural shape quality
        {
            reset_circle(&mut sim);
            for _ in 0..4 {
                sim.factions[0].population = 100_000.0;
                let outcome = sim.process_expand_command_with_mode(1, 0, "FRONTIER", None)
                    .expect("Frontier expansion should succeed");
                assert!(outcome.patch.actual_size >= 4);
            }

            let metrics = crate::expansion::measure_shape_quality(&sim.cells, 1);
            assert_eq!(metrics.single_cell_tendrils, 0, "No single-cell tendrils or spikes allowed in natural growth!");
            assert_eq!(metrics.internal_neutral_holes, 0, "No trapped internal neutral holes allowed!");
            assert!(metrics.perimeter_to_area_ratio < 1.0, "Shape must remain compact and rounded (perimeter/area ratio: {:.3})", metrics.perimeter_to_area_ratio);
        }
    }

    #[test]
    fn test_task_8_phase_transition_gate() {
        let mut sim = Simulation::new_standard(Some("roma"), 42);
        assert_eq!(sim.macro_phase, MacroPhase::ExpansionEra);

        let s = sim.cells.iter().position(|c| c.owner_id == 1).unwrap() as u32;
        let enemy_cell = Simulation::cardinal(s as usize)
            .into_iter()
            .find(|&n| sim.cells[n].terrain_type == 0)
            .unwrap() as u32;
        sim.cells[enemy_cell as usize].owner_id = 2;
        if let Some(fac) = sim.factions.iter_mut().find(|f| f.faction_id == 2) {
            fac.territory_count += 1;
        }

        // 1. Attack during ExpansionEra must be rejected with "war_not_available"
        let err_expansion = sim.process_attack_command(1, s, enemy_cell, 0.5);
        assert_eq!(err_expansion, Err("war_not_available".to_string()));

        // 2. Fill neutral territory to trigger FinalFrontier
        for cell in &mut sim.cells {
            if cell.terrain_type == 0 && cell.owner_id == 0 {
                cell.owner_id = 3;
            }
        }
        sim.step_dt(1.0);
        assert_eq!(sim.macro_phase, MacroPhase::FinalFrontier);
        assert!(sim.macro_phase_timer > 0.0);

        // 3. Attack during armistice must STILL be rejected
        let err_armistice = sim.process_attack_command(1, s, enemy_cell, 0.5);
        assert_eq!(err_armistice, Err("war_not_available".to_string()));

        // 4. Advance through armistice to WarEra
        sim.step_dt(crate::balance::FINAL_FRONTIER_ARMISTICE_SECONDS as f64 + 1.0);
        assert_eq!(sim.macro_phase, MacroPhase::WarEra);

        // 5. Attack during WarEra must be ACCEPTED
        let ok_war = sim.process_attack_command(1, s, enemy_cell, 0.5);
        assert!(ok_war.is_ok(), "War attack must succeed during WarEra! Got: {:?}", ok_war);
    }

    #[test]
    fn test_task_9_and_10_war_operation_and_frontage_gate() {
        let mut sim = Simulation::new(2);
        sim.macro_phase = MacroPhase::WarEra;

        for y in 200..215 {
            for x in 490..520 {
                let idx = y * WORLD_WIDTH + x;
                sim.cells[idx].terrain_type = 0;
                sim.cells[idx].owner_id = 0;
            }
        }
        for y in 200..210 {
            for x in 490..500 {
                let idx = y * WORLD_WIDTH + x;
                sim.cells[idx].owner_id = 1;
            }
            for x in 500..510 {
                let idx = y * WORLD_WIDTH + x;
                sim.cells[idx].owner_id = 2;
            }
        }
        sim.factions[0].capital_cell = (205 * WORLD_WIDTH + 492) as u32;
        sim.factions[1].capital_cell = (205 * WORLD_WIDTH + 508) as u32;
        sim.factions[0].territory_count = 100;
        sim.factions[1].territory_count = 100;
        sim.factions[0].population = 500_000.0;
        sim.factions[0].total_living_population = 500_000.0;
        sim.factions[1].population = 200_000.0;
        sim.factions[1].total_living_population = 200_000.0;
        sim.refresh_all_economies();

        // 1. Point attack affects ONLY the local front, leaving the rest of the 10-cell border unchanged
        let attack_y = 205;
        let source_cell = (attack_y * WORLD_WIDTH + 499) as u32;
        let target_cell = (attack_y * WORLD_WIDTH + 500) as u32;
        let deep_target = (attack_y * WORLD_WIDTH + 508) as u32;
        let order = sim.process_attack_command_with_intent(1, source_cell, target_cell, Some(deep_target), 0.20)
            .expect("Attack should launch successfully");

        // 2. Reinforcement consumes real uncommitted Population
        let uncommitted_before = sim.factions[0].population;
        let reinforced_amount = sim.reinforce_front(1, order.front_id, 0.25)
            .expect("Reinforcement must succeed");
        assert!(reinforced_amount > 0.0);
        let uncommitted_after = sim.factions[0].population;
        assert!((uncommitted_before - uncommitted_after - reinforced_amount).abs() < 0.01,
            "Reinforcement must consume exact real uncommitted Population!");

        let north_border_enemy = (200 * WORLD_WIDTH + 500) as usize;
        let south_border_enemy = (209 * WORLD_WIDTH + 500) as usize;
        assert_eq!(sim.cells[north_border_enemy].owner_id, 2);
        assert_eq!(sim.cells[south_border_enemy].owner_id, 2);

        for _ in 0..10 {
            sim.step_dt(0.2);
        }

        assert_eq!(sim.cells[north_border_enemy].owner_id, 2, "North border cell must remain unchanged by local attack!");
        assert_eq!(sim.cells[south_border_enemy].owner_id, 2, "South border cell must remain unchanged by local attack!");

        // 3. Frontage gate: 100% force on 1-cell front does NOT create linear 100x power
        let cap_power = crate::combat::calculate_effective_combat_power(
            crate::balance::FRONTAGE_CAP_PER_CELL,
            1,
            1.0,
            1.0,
            0.0,
            1.0,
        );
        let mass_power = crate::combat::calculate_effective_combat_power(
            crate::balance::FRONTAGE_CAP_PER_CELL * 100.0,
            1,
            1.0,
            1.0,
            0.0,
            1.0,
        );
        let power_ratio = mass_power / cap_power;
        assert!(
            power_ratio < 15.0,
            "100x committed force on 1-cell front must NOT yield 100x power! Got ratio: {:.2}",
            power_ratio
        );

        // 4. Cancel / withdrawal returns survivors
        let cancel_res = sim.cancel_attack(1, order.front_id);
        if cancel_res.is_ok() {
            let front = sim.combat_manager.fronts.iter().find(|f| f.front_id == order.front_id).unwrap();
            assert!(!front.is_combat_active);
            assert!(front.survivors_returned);
        } else {
            let order2 = sim.process_attack_command_with_intent(
                1,
                (202 * WORLD_WIDTH + 499) as u32,
                (202 * WORLD_WIDTH + 500) as u32,
                None,
                0.10,
            ).expect("Second attack should launch");
            let cancel2 = sim.cancel_attack(1, order2.front_id);
            assert!(cancel2.is_ok());
            let front2 = sim.combat_manager.fronts.iter().find(|f| f.front_id == order2.front_id).unwrap();
            assert!(!front2.is_combat_active);
            assert!(front2.survivors_returned);
        }
    }

    #[test]
    fn test_task_11_and_12_supply_and_encirclement_gate() {
        let mut sim = Simulation::new(2);
        sim.macro_phase = MacroPhase::WarEra;

        let y = 250;
        for x in 400..420 {
            let idx = y * WORLD_WIDTH + x;
            sim.cells[idx].terrain_type = 0;
            sim.cells[idx].owner_id = 0;
        }

        let cap_cell = (y * WORLD_WIDTH + 400) as u32;
        sim.factions[0].capital_cell = cap_cell;
        for x in 400..=410 {
            sim.cells[y * WORLD_WIDTH + x].owner_id = 1;
        }
        sim.factions[0].territory_count = 11;
        sim.factions[0].population = 100_000.0;
        sim.refresh_all_economies();

        let pocket_cell = (y * WORLD_WIDTH + 410) as u32;
        sim.refresh_supply_connectivity();
        assert!(sim.is_cell_land_connected_to_capital(1, pocket_cell), "Pocket should be supplied when corridor is intact");

        // 1. Cut the corridor in the middle (x=405) with enemy land
        let cut_cell = (y * WORLD_WIDTH + 405) as u32;
        sim.cells[cut_cell as usize].owner_id = 2;
        sim.refresh_supply_connectivity();

        // 2. Cut corridor -> isolated front recognized
        assert!(!sim.is_cell_land_connected_to_capital(1, pocket_cell), "Cut corridor must isolate pocket!");

        let enemy_adjacent = (y * WORLD_WIDTH + 411) as u32;
        sim.cells[enemy_adjacent as usize].owner_id = 2;
        sim.cells[enemy_adjacent as usize].terrain_type = 0;
        sim.factions[1].capital_cell = enemy_adjacent;
        sim.factions[1].territory_count = 5;
        sim.factions[1].population = 50_000.0;
        sim.refresh_all_economies();

        let cm_id = sim.combat_manager.register_attack_operation_with_intent(
            1, 2, pocket_cell, enemy_adjacent, enemy_adjacent,
            0.0, 0.0, 1.0, 0.0, 1000.0, 1000.0, 0.0, sim.tick, "LAND_OFFENSIVE"
        );
        let reinforce_err = sim.reinforce_front(1, cm_id, 0.2);
        assert_eq!(reinforce_err, Err("pocket_isolated".to_string()), "Reinforcing isolated front must fail!");

        // 3. Isolated pocket degrades cohesion gradually but does NOT instantly delete
        let front = sim.combat_manager.fronts.iter_mut().find(|f| f.front_id == cm_id).unwrap();
        let initial_cohesion = front.cohesion;
        sim.step_dt(1.0);
        let front_after = sim.combat_manager.fronts.iter().find(|f| f.front_id == cm_id).unwrap();
        assert!(front_after.cohesion < initial_cohesion, "Cohesion must degrade when unsupplied!");
        assert!(front_after.is_combat_active, "Pocket must survive initially without instant deletion!");

        // 4. Restore the corridor -> supply restores
        sim.cells[cut_cell as usize].owner_id = 1;
        sim.refresh_supply_connectivity();
        assert!(sim.is_cell_land_connected_to_capital(1, pocket_cell), "Restoring corridor must restore supply!");

        // 5. Cross-water without port has NO false connectivity
        let water_cell = ((y + 1) * WORLD_WIDTH + 400) as usize;
        sim.cells[water_cell].terrain_type = 2;
        let island_cell = ((y + 2) * WORLD_WIDTH + 400) as usize;
        sim.cells[island_cell].terrain_type = 0;
        sim.cells[island_cell].owner_id = 1;
        assert!(!sim.is_cell_land_connected_to_capital(1, island_cell as u32), "No false cross-water connectivity!");
    }

    #[test]
    fn test_task_13_capital_relocation_gate() {
        let mut sim = Simulation::new(2);
        sim.macro_phase = MacroPhase::WarEra;

        let cap = sim.factions[0].capital_cell;
        let other_cell = sim.cells.iter().enumerate().position(|(idx, c)| c.owner_id == 1 && idx as u32 != cap).unwrap() as u32;
        sim.refresh_all_economies();

        // 1. Capture capital triggers relocation
        assert!(sim.set_cell_owner(cap, 2));
        assert!(sim.relocation_states.contains_key(&1), "Relocation state must be initiated");
        let reloc = sim.relocation_states.get(&1).unwrap();
        assert!((reloc.time_remaining - 10.0).abs() < 0.1, "Relocation timer must start at ~10s");

        // 2. Growth impact during relocation: growth stops
        sim.refresh_all_economies();
        assert_eq!(sim.factions[0].population_growth_per_second, 0.0, "Growth must pause during relocation");

        // 3. Recapture original capital before timer expires cancels relocation
        assert!(sim.set_cell_owner(cap, 1));
        assert!(!sim.relocation_states.contains_key(&1), "Recapturing capital must cancel relocation");
        assert_eq!(sim.factions[0].capital_cell, cap, "Original capital must be restored");

        // 4. Capture again and advance timer through 10.5 seconds
        assert!(sim.set_cell_owner(cap, 2));
        sim.step_dt(10.5);
        assert!(!sim.relocation_states.contains_key(&1), "Relocation should be complete");
        assert_ne!(sim.factions[0].capital_cell, cap, "Provisional capital must be established");
        assert_eq!(sim.cells[sim.factions[0].capital_cell as usize].owner_id, 1, "Provisional capital must be an owned cell");
        assert!(!sim.factions[0].is_eliminated, "Faction must remain alive with provisional capital");
    }

    #[test]
    fn ai_frontier_index_matches_bruteforce() {
        let mut sim = Simulation::new(44);
        sim.evaluate_match_outcome = false;

        use rand::rngs::StdRng;
        use rand::{Rng, SeedableRng};
        let mut rng = StdRng::seed_from_u64(12345);

        for _ in 0..1000 {
            let fac = rng.gen_range(1..=44) as u8;
            if let Some(&front_cell) = sim.faction_frontiers[fac as usize].iter().next() {
                for n in Simulation::cardinal(front_cell as usize) {
                    if sim.cells[n].terrain_type == 0 {
                        sim.set_cell_owner(n as u32, fac);
                        break;
                    }
                }
            }
        }

        for fac in 1..=44 {
            let mut expected = std::collections::HashSet::new();
            for (idx, cell) in sim.cells.iter().enumerate() {
                if cell.owner_id == fac {
                    let has_other_neighbor = Simulation::cardinal(idx)
                        .into_iter()
                        .any(|n| sim.cells[n].terrain_type == 0 && sim.cells[n].owner_id != fac);
                    if has_other_neighbor {
                        expected.insert(idx as u32);
                    }
                }
            }
            assert_eq!(
                sim.faction_frontiers[fac as usize], expected,
                "Frontier cache mismatch for faction {}",
                fac
            );
        }
    }
}

include!("mop_up_tests.rs");
