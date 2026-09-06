use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontInfo {
    pub front_id: u32,
    pub faction_a: u8,
    pub faction_b: u8,
    pub deployed_population_a: f64,
    pub deployed_population_b: f64,
    pub pressure: f32, // -1.0 (B wins) to +1.0 (A wins)
    pub centroid_x: f32,
    pub centroid_y: f32,
    pub normal_x: f32, // Vector pointing from A into B
    pub normal_y: f32,
    pub is_combat_active: bool,
    pub attacker_faction: u8,
    pub attack_mode: String,
    pub started_tick: u64,
    pub captured_cells: u32,
    pub termination_reason: String,
    pub source_cell_index: u32,
    pub target_cell_index: u32,
    /// The original player-selected destination. `target_cell_index` is the
    /// current legal wavefront cell; this field preserves the strategic
    /// intent even after the wavefront advances.
    pub intent_target_cell_index: u32,
    pub local_defense_population: f64,
    pub defense_focus_population: f64,
    pub shared_local_force_population: f64,
    pub casualties: f64,
    pub operation_kind: String,
    pub survivors_returned: bool,
    #[serde(default = "default_one_f32")]
    pub cohesion: f32,
    #[serde(default = "default_one_f32")]
    pub supply_efficiency: f32,
    #[serde(default)]
    pub front_status: String,
}

fn default_one_f32() -> f32 {
    1.0
}

#[derive(Debug, Clone)]
pub struct FrontSegment {
    pub front_id: u32,
    pub faction_a: u8,
    pub faction_b: u8,
    pub deployed_population_a: f64,
    pub deployed_population_b: f64,
    pub pressure: f32,
    pub centroid_x: f32,
    pub centroid_y: f32,
    pub normal_x: f32,
    pub normal_y: f32,
    pub is_combat_active: bool,
    pub attacker_faction: u8,
    pub attack_mode: String,
    pub started_tick: u64,
    pub captured_cells: u32,
    pub termination_reason: String,
    pub source_cell_index: u32,
    pub target_cell_index: u32,
    pub intent_target_cell_index: u32,
    pub local_defense_population: f64,
    pub defense_focus_population: f64,
    pub shared_local_force_population: f64,
    pub casualties: f64,
    pub operation_kind: String,
    pub survivors_returned: bool,
    pub cohesion: f32,
    pub supply_efficiency: f32,
    pub front_status: String,
    pub border_cells_a: Vec<u32>,
    pub border_cells_b: Vec<u32>,
}

pub struct CombatManager {
    pub fronts: Vec<FrontSegment>,
    pub next_front_id: u32,
}

impl CombatManager {
    pub fn new() -> Self {
        Self {
            fronts: Vec::new(),
            next_front_id: 1,
        }
    }

    pub fn register_contact(
        &mut self,
        faction_a: u8,
        faction_b: u8,
        cell_idx: u32,
        x: f32,
        y: f32,
        cap_a_x: f32,
        cap_a_y: f32,
        cap_b_x: f32,
        cap_b_y: f32,
    ) {
        // Ensure A < B for consistent ordering
        let (f_a, f_b) = if faction_a < faction_b {
            (faction_a, faction_b)
        } else {
            (faction_b, faction_a)
        };

        if let Some(front) = self
            .fronts
            .iter_mut()
            .find(|f| f.faction_a == f_a && f.faction_b == f_b)
        {
            // Add to existing border cells (simplified logic)
            if faction_a == f_a {
                front.border_cells_a.push(cell_idx);
            } else {
                front.border_cells_b.push(cell_idx);
            }

            // Recompute centroid
            let total = front.border_cells_a.len() + front.border_cells_b.len();
            front.centroid_x = (front.centroid_x * (total as f32 - 1.0) + x) / (total as f32);
            front.centroid_y = (front.centroid_y * (total as f32 - 1.0) + y) / (total as f32);
        } else {
            // Calculate true normal from A's capital to B's capital
            let mut nx = cap_b_x - cap_a_x;
            let mut ny = cap_b_y - cap_a_y;
            let len = (nx * nx + ny * ny).sqrt();
            if len > 0.001 {
                nx /= len;
                ny /= len;
            } else {
                nx = 1.0;
                ny = 0.0;
            }

            // If the incoming f_a is not faction_a, we flip the normal?
            // Actually cap_a and cap_b belong to faction_a and faction_b respectively.
            // But we store based on f_a and f_b.
            let (final_nx, final_ny) = if faction_a == f_a {
                (nx, ny)
            } else {
                (-nx, -ny)
            };

            // Create new inactive political border
            let mut new_front = FrontSegment {
                front_id: self.next_front_id,
                faction_a: f_a,
                faction_b: f_b,
                deployed_population_a: 0.0,
                deployed_population_b: 0.0,
                pressure: 0.0,
                centroid_x: x,
                centroid_y: y,
                normal_x: final_nx,
                normal_y: final_ny,
                is_combat_active: false,
                attacker_faction: 0,
                attack_mode: "none".to_string(),
                started_tick: 0,
                captured_cells: 0,
                termination_reason: "IDLE".to_string(),
                source_cell_index: cell_idx,
                target_cell_index: cell_idx,
                intent_target_cell_index: cell_idx,
                local_defense_population: 0.0,
                defense_focus_population: 0.0,
                shared_local_force_population: 0.0,
                casualties: 0.0,
                operation_kind: "CONTACT".to_string(),
                survivors_returned: true,
                cohesion: 1.0,
                supply_efficiency: 1.0,
                front_status: "IDLE".to_string(),
                border_cells_a: Vec::new(),
                border_cells_b: Vec::new(),
            };

            if faction_a == f_a {
                new_front.border_cells_a.push(cell_idx);
            } else {
                new_front.border_cells_b.push(cell_idx);
            }

            self.fronts.push(new_front);
            self.next_front_id += 1;
        }
    }

    /// Creates a distinct operation for the exact selected border point. It
    /// intentionally does not merge by faction pair: two seeds are two
    /// geographically independent operations.
    pub fn register_attack_operation(
        &mut self,
        faction_a: u8,
        faction_b: u8,
        source_cell_index: u32,
        target_cell_index: u32,
        x: f32,
        y: f32,
        normal_x: f32,
        normal_y: f32,
        deployed_attacker: f64,
        deployed_defender: f64,
        defense_focus_population: f64,
        started_tick: u64,
    ) -> u32 {
        self.register_attack_operation_with_kind(
            faction_a,
            faction_b,
            source_cell_index,
            target_cell_index,
            x,
            y,
            normal_x,
            normal_y,
            deployed_attacker,
            deployed_defender,
            defense_focus_population,
            started_tick,
            "LAND_OFFENSIVE",
        )
    }

    pub fn register_attack_operation_with_kind(
        &mut self,
        faction_a: u8,
        faction_b: u8,
        source_cell_index: u32,
        target_cell_index: u32,
        x: f32,
        y: f32,
        normal_x: f32,
        normal_y: f32,
        deployed_attacker: f64,
        deployed_defender: f64,
        defense_focus_population: f64,
        started_tick: u64,
        operation_kind: &str,
    ) -> u32 {
        self.register_attack_operation_with_intent(
            faction_a,
            faction_b,
            source_cell_index,
            target_cell_index,
            target_cell_index,
            x,
            y,
            normal_x,
            normal_y,
            deployed_attacker,
            deployed_defender,
            defense_focus_population,
            started_tick,
            operation_kind,
        )
    }

    pub fn register_attack_operation_with_intent(
        &mut self,
        faction_a: u8,
        faction_b: u8,
        source_cell_index: u32,
        target_cell_index: u32,
        intent_target_cell_index: u32,
        x: f32,
        y: f32,
        normal_x: f32,
        normal_y: f32,
        deployed_attacker: f64,
        deployed_defender: f64,
        defense_focus_population: f64,
        started_tick: u64,
        operation_kind: &str,
    ) -> u32 {
        let (f_a, f_b) = if faction_a < faction_b { (faction_a, faction_b) } else { (faction_b, faction_a) };
        let (final_nx, final_ny) = if faction_a == f_a { (normal_x, normal_y) } else { (-normal_x, -normal_y) };
        let (deployed_a, deployed_b) = if faction_a == f_a {
            (deployed_attacker, deployed_defender)
        } else {
            (deployed_defender, deployed_attacker)
        };
        let id = self.next_front_id;
        self.next_front_id += 1;
        self.fronts.push(FrontSegment {
            front_id: id,
            faction_a: f_a,
            faction_b: f_b,
            deployed_population_a: deployed_a,
            deployed_population_b: deployed_b,
            pressure: 0.0,
            centroid_x: x,
            centroid_y: y,
            normal_x: final_nx,
            normal_y: final_ny,
            is_combat_active: true,
            attacker_faction: faction_a,
            attack_mode: operation_kind.to_string(),
            started_tick,
            captured_cells: 0,
            termination_reason: "ACTIVE".to_string(),
            source_cell_index,
            target_cell_index,
            intent_target_cell_index,
            local_defense_population: deployed_defender,
            defense_focus_population,
            shared_local_force_population: 0.0,
            casualties: 0.0,
            operation_kind: operation_kind.to_string(),
            survivors_returned: false,
            cohesion: 1.0,
            supply_efficiency: 1.0,
            front_status: "CONTESTED".to_string(),
            border_cells_a: if faction_a == f_a { vec![source_cell_index] } else { vec![target_cell_index] },
            border_cells_b: if faction_a == f_a { vec![target_cell_index] } else { vec![source_cell_index] },
        });
        id
    }

    pub fn get_front_infos(&self) -> Vec<FrontInfo> {
        self.fronts
            .iter()
            .map(|f| FrontInfo {
                front_id: f.front_id,
                faction_a: f.faction_a,
                faction_b: f.faction_b,
                deployed_population_a: f.deployed_population_a,
                deployed_population_b: f.deployed_population_b,
                pressure: f.pressure,
                centroid_x: f.centroid_x,
                centroid_y: f.centroid_y,
                normal_x: f.normal_x,
                normal_y: f.normal_y,
                is_combat_active: f.is_combat_active,
                attacker_faction: f.attacker_faction,
                attack_mode: f.attack_mode.clone(),
                started_tick: f.started_tick,
                captured_cells: f.captured_cells,
                termination_reason: f.termination_reason.clone(),
                source_cell_index: f.source_cell_index,
                target_cell_index: f.target_cell_index,
                intent_target_cell_index: f.intent_target_cell_index,
                local_defense_population: f.local_defense_population,
                defense_focus_population: f.defense_focus_population,
                shared_local_force_population: f.shared_local_force_population,
                casualties: f.casualties,
                operation_kind: f.operation_kind.clone(),
                survivors_returned: f.survivors_returned,
                cohesion: f.cohesion,
                supply_efficiency: f.supply_efficiency,
                front_status: f.front_status.clone(),
            })
            .collect()
    }
}

/// Centralized calculation of effective combat power incorporating frontage cap,
/// diminishing returns on excess reserves, supply efficiency, cohesion, and civilization doctrine.
pub fn calculate_effective_combat_power(
    deployed_population: f64,
    front_cells_count: usize,
    supply_efficiency: f64,
    cohesion: f64,
    doctrine_modifier: f64,
    consolidation_modifier: f64,
) -> f64 {
    let frontage_cap = (front_cells_count.max(1) as f64) * crate::balance::FRONTAGE_CAP_PER_CELL;
    let frontline = deployed_population.min(frontage_cap);
    let reserve = (deployed_population - frontage_cap).max(0.0);
    let reserve_contribution = if reserve > 0.0 && frontage_cap > 0.0 {
        frontage_cap * (reserve / frontage_cap).powf(crate::balance::RESERVE_EFFECTIVENESS_EXPONENT)
    } else {
        0.0
    };
    let base_power = frontline + reserve_contribution;
    let power = base_power
        * supply_efficiency.clamp(0.15, 1.0)
        * cohesion.clamp(0.15, 1.0)
        * (1.0 + doctrine_modifier).max(0.5)
        * consolidation_modifier.clamp(0.10, 1.5);
    power.max(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_canonical_front_per_faction_pair() {
        let mut cm = CombatManager::new();
        for i in 0..10 {
            cm.register_contact(1, 2, i * 10, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        }
        assert_eq!(cm.fronts.len(), 1);
        assert_eq!((cm.fronts[0].faction_a, cm.fronts[0].faction_b), (1, 2));
        assert!(!cm.fronts[0].is_combat_active);
    }

    #[test]
    fn faction_order_does_not_duplicate_front() {
        let mut cm = CombatManager::new();
        cm.register_contact(1, 2, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        cm.register_contact(2, 1, 1, 1.0, 0.0, 4.0, 0.0, 0.0, 0.0);
        assert_eq!(cm.fronts.len(), 1);
    }
}
