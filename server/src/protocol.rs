use crate::chokepoints::StrategicSiteInfo;
use crate::combat::FrontInfo;
use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: &str = "1.0.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlagDescriptor {
    pub layout: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub accent_color: String,
    pub emblem: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CellState {
    pub index: u32,
    pub owner_id: u8,
    pub terrain: u8,
    pub flags: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CellDelta {
    pub index: u32,
    pub owner_id: u8,
    pub flags: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FactionInfo {
    pub faction_id: u8,
    pub display_name: String,
    pub faction_color: String,
    pub color_int: u32,
    pub flag_id: String,
    #[serde(default)]
    pub flag_descriptor: Option<FlagDescriptor>,
    #[serde(default)]
    pub nation_preset_id: String,
    #[serde(default)]
    pub civilization_id: String,
    #[serde(default)]
    pub homeland_region: String,
    pub capital_cell: u32,
    #[serde(default)]
    pub provisional_capital: Option<u32>,
    /// Uncommitted people available for a new order. This is the only
    /// player-facing strategic resource.
    pub population: f64,
    pub population_capacity: f64,
    pub population_growth_per_second: f64,
    /// Living people currently deployed in fronts or defense sectors. They
    /// are unavailable in `population`, but remain part of the living total.
    pub deployed_population: f64,
    pub total_living_population: f64,
    pub controlled_area_km2: f64,
    pub effective_controlled_area_km2: f64,
    #[serde(default)]
    pub consolidation_ratio: f32,
    #[serde(default)]
    pub overextension_ratio: f32,
    #[serde(default)]
    pub supply_coverage_ratio: f32,
    pub ports_count: u16,
    /// Small zero-sum gameplay modifiers in the bounded [-0.06, 0.06] range.
    pub doctrine_offense: f32,
    pub doctrine_defense: f32,
    pub doctrine_expansion: f32,
    pub doctrine_maritime: f32,
    pub territory_count: u32,
    pub is_human: bool,
    #[serde(default)]
    pub is_eliminated: bool,
    #[serde(default)]
    pub relocation_time_remaining: Option<f32>,
    #[serde(default)]
    pub is_relocating: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchStateInfo {
    pub phase: String,
    pub winner_faction_id: Option<u8>,
    #[serde(default)]
    pub macro_phase: Option<String>,
    #[serde(default)]
    pub phase_timer: Option<f32>,
    #[serde(default)]
    pub neutral_land_percent: Option<f32>,
    #[serde(default)]
    pub match_id: Option<String>,
    #[serde(default)]
    pub creation_timestamp: Option<u64>,
    #[serde(default)]
    pub simulation_tick: Option<u64>,
}

impl MatchStateInfo {
    pub fn new(phase: impl Into<String>, winner_faction_id: Option<u8>) -> Self {
        Self {
            phase: phase.into(),
            winner_faction_id,
            macro_phase: None,
            phase_timer: None,
            neutral_land_percent: None,
            match_id: None,
            creation_timestamp: None,
            simulation_tick: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortStateInfo {
    pub cell_index: u32,
    pub owner_id: u8,
    pub complete: bool,
    pub remaining_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllianceInfo {
    pub alliance_id: u16,
    pub members: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllianceProposalInfo {
    pub proposal_id: u16,
    pub proposer: u8,
    pub target: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "world_snapshot")]
    #[serde(rename_all = "camelCase")]
    WorldSnapshot {
        tick: u64,
        sequence: u64,
        width: u16,
        height: u16,
        total_cells: u32,
        your_faction_id: u8,
        factions: Vec<FactionInfo>,
        fronts: Vec<FrontInfo>,
        match_state: MatchStateInfo,
        strategic_sites: Vec<StrategicSiteInfo>,
        ports: Vec<PortStateInfo>,
        alliances: Vec<AllianceInfo>,
        #[serde(default)]
        pending_alliances: Vec<AllianceProposalInfo>,
        cells: Vec<CellState>,
    },

    #[serde(rename = "cell_delta_batch")]
    #[serde(rename_all = "camelCase")]
    CellDeltaBatch {
        tick: u64,
        sequence: u64,
        deltas: Vec<CellDelta>,
        fronts: Vec<FrontInfo>,
        match_state: MatchStateInfo,
        #[serde(default)]
        pending_alliances: Vec<AllianceProposalInfo>,
    },

    #[serde(rename = "server_metrics")]
    #[serde(rename_all = "camelCase")]
    ServerMetrics {
        tick: u64,
        tick_time_ms: f64,
        active_players: usize,
        bot_count: usize,
        deltas_count: usize,
        active_fronts: usize,
        ram_usage_mb: f64,
    },

    #[serde(rename = "faction_update")]
    #[serde(rename_all = "camelCase")]
    FactionUpdate {
        factions: Vec<FactionInfo>,
        ports: Vec<PortStateInfo>,
        alliances: Vec<AllianceInfo>,
        #[serde(default)]
        pending_alliances: Vec<AllianceProposalInfo>,
    },

    #[serde(rename = "first_contact")]
    #[serde(rename_all = "camelCase")]
    FirstContact {
        faction_a: u8,
        faction_b: u8,
        location: u32,
    },

    #[serde(rename = "port_result")]
    #[serde(rename_all = "camelCase")]
    PortResult { accepted: bool, cell_index: u32, population_cost: f64, remaining_seconds: f64, reason: String },

    #[serde(rename = "alliance_result")]
    #[serde(rename_all = "camelCase")]
    AllianceResult { accepted: bool, faction_id: u8, alliance_id: Option<u16>, #[serde(default)] pending: bool, reason: String },

    #[serde(rename = "expand_result")]
    #[serde(rename_all = "camelCase")]
    ExpandResult {
        accepted: bool,
        requested_target: u32,
        resolved_anchor: Option<u32>,
        actual_size: u16,
        population_cost: f64,
        reason: String,
    },

    #[serde(rename = "attack_result")]
    #[serde(rename_all = "camelCase")]
    AttackResult {
        accepted: bool,
        source_cell_index: u32,
        target_cell_index: u32,
        front_id: Option<u32>,
        deployed_population: f64,
        reason: String,
    },

    #[serde(rename = "reinforce_result")]
    #[serde(rename_all = "camelCase")]
    ReinforceResult {
        accepted: bool,
        front_id: u32,
        deployed_population: f64,
        reason: String,
    },

    #[serde(rename = "atlas_notification")]
    #[serde(rename_all = "camelCase")]
    AtlasNotification {
        event_type: String,
        message: String,
        #[serde(default)]
        faction_id: Option<u8>,
        #[serde(default)]
        cell_index: Option<u32>,
    },

    #[serde(rename = "reaction_broadcast")]
    #[serde(rename_all = "camelCase")]
    ReactionBroadcast {
        player_faction_id: u8,
        player_name: String,
        player_tag: String,
        reaction_id: String,
        #[serde(default)]
        civilization_id: Option<String>,
        #[serde(default)]
        is_premium: bool,
        #[serde(default)]
        anchor_type: Option<String>,
        #[serde(default)]
        cell_index: Option<u32>,
        #[serde(default)]
        front_id: Option<u32>,
        timestamp: u64,
    },

    #[serde(rename = "auth_snapshot")]
    #[serde(rename_all = "camelCase")]
    AuthSnapshot {
        account_id: String,
        session_token: String,
        player_tag: String,
        display_name: String,
        account_type: String,
        wallet_balance: u32,
        entitlements: Vec<String>,
        equipped_blade_skin: String,
        reaction_wheel: Vec<String>,
        is_dev_mode: bool,
    },

    #[serde(rename = "auth_conflict")]
    #[serde(rename_all = "camelCase")]
    AuthConflict {
        message: String,
        existing_account_id: String,
    },

    #[serde(rename = "auth_error")]
    #[serde(rename_all = "camelCase")]
    AuthError {
        error: String,
    },

    #[serde(rename = "commerce_result")]
    #[serde(rename_all = "camelCase")]
    CommerceResult {
        success: bool,
        sku: String,
        balance_after: u32,
        #[serde(default)]
        error: Option<String>,
    },

    #[serde(rename = "meta_error")]
    #[serde(rename_all = "camelCase")]
    MetaError {
        code: String,
        message: String,
    },

    #[serde(rename = "server_welcome")]
    #[serde(rename_all = "camelCase")]
    ServerWelcome {
        build_id: String,
        build_timestamp: String,
        gameplay_schema_version: String,
        protocol_version: String,
        #[serde(default)]
        server_commit: String,
        #[serde(default)]
        server_pid: u32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "player_join")]
    #[serde(rename_all = "camelCase")]
    PlayerJoin {
        protocol_version: String,
        player_name: String,
        token: String,
        #[serde(default)]
        flag_id: Option<String>,
        #[serde(default)]
        nation_name: Option<String>,
        #[serde(default)]
        player_tag: Option<String>,
        #[serde(default)]
        equipped_blade_skin: Option<String>,
        #[serde(default)]
        faction_color: Option<String>,
        #[serde(default)]
        flag_descriptor: Option<FlagDescriptor>,
        #[serde(default)]
        starting_cell_index: Option<u32>,
        #[serde(default)]
        doctrine_offense: Option<f32>,
        #[serde(default)]
        doctrine_defense: Option<f32>,
        #[serde(default)]
        doctrine_expansion: Option<f32>,
        #[serde(default)]
        doctrine_maritime: Option<f32>,
        #[serde(default)]
        civilization_id: Option<String>,
        #[serde(default)]
        start_paused: Option<bool>,
        #[serde(default)]
        lifecycle_action: Option<String>,
        #[serde(default)]
        match_id: Option<String>,
    },

    #[serde(rename = "player_ready")]
    #[serde(rename_all = "camelCase")]
    PlayerReady {
        #[serde(default)]
        match_id: Option<String>,
    },

    #[serde(rename = "send_reaction")]
    #[serde(rename_all = "camelCase")]
    SendReaction {
        reaction_id: String,
        #[serde(default)]
        cell_index: Option<u32>,
        #[serde(default)]
        front_id: Option<u32>,
    },

    #[serde(rename = "attack_command")]
    #[serde(rename_all = "camelCase")]
    AttackCommand {
        source_cell_index: u32,
        target_cell_index: u32,
        /// Optional original point selected by the player. The authoritative
        /// target remains the adjacent legal border cell, while this point
        /// controls the local operation's initial direction.
        #[serde(default)]
        requested_target_cell_index: Option<u32>,
        attack_type: String,
        front_id: Option<u32>,
        #[serde(default = "default_commit_percent")]
        commit_percent: f64,
    },

    #[serde(rename = "reinforce_front")]
    #[serde(rename_all = "camelCase")]
    ReinforceFront {
        front_id: u32,
        #[serde(default = "default_commit_percent")]
        commit_percent: f64,
    },

    #[serde(rename = "cancel_attack")]
    #[serde(rename_all = "camelCase")]
    CancelAttack { front_id: u32 },

    #[serde(rename = "expand_command")]
    #[serde(rename_all = "camelCase")]
    ExpandCommand {
        target_cell_index: u32,
        #[serde(default)]
        mode: Option<String>,
        #[serde(default)]
        commit_percent: Option<f64>,
    },

    #[serde(rename = "defense_focus")]
    #[serde(rename_all = "camelCase")]
    DefenseFocus {
        cell_index: u32,
        population: f64,
    },

    #[serde(rename = "release_defense_focus")]
    #[serde(rename_all = "camelCase")]
    ReleaseDefenseFocus { cell_index: u32 },

    #[serde(rename = "build_port")]
    #[serde(rename_all = "camelCase")]
    BuildPort { cell_index: u32 },

    #[serde(rename = "amphibious_attack")]
    #[serde(rename_all = "camelCase")]
    AmphibiousAttack {
        port_cell_index: u32,
        target_cell_index: u32,
        #[serde(default = "default_commit_percent")]
        commit_percent: f64,
    },

    #[serde(rename = "offer_alliance")]
    #[serde(rename_all = "camelCase")]
    OfferAlliance { faction_id: u8 },

    #[serde(rename = "alliance_response")]
    #[serde(rename_all = "camelCase")]
    AllianceResponse { proposal_id: u16, accept: bool },

    #[serde(rename = "request_snapshot")]
    #[serde(rename_all = "camelCase")]
    RequestSnapshot,

    #[serde(rename = "auth_guest_bootstrap")]
    #[serde(rename_all = "camelCase")]
    AuthGuestBootstrap {
        #[serde(default)]
        name_hint: Option<String>,
    },

    #[serde(rename = "auth_session_resume")]
    #[serde(rename_all = "camelCase")]
    AuthSessionResume {
        account_id: String,
        session_token: String,
    },

    #[serde(rename = "auth_link_account")]
    #[serde(rename_all = "camelCase")]
    AuthLinkAccount {
        account_id: String,
        session_token: String,
        provider: String,
        identifier: String,
    },

    #[serde(rename = "wallet_get_snapshot")]
    #[serde(rename_all = "camelCase")]
    WalletGetSnapshot {
        account_id: String,
        session_token: String,
    },

    #[serde(rename = "commerce_purchase")]
    #[serde(rename_all = "camelCase")]
    CommercePurchase {
        account_id: String,
        session_token: String,
        sku: String,
        idempotency_key: String,
    },

    #[serde(rename = "equip_loadout")]
    #[serde(rename_all = "camelCase")]
    EquipLoadout {
        account_id: String,
        session_token: String,
        #[serde(default)]
        blade_skin: Option<String>,
        #[serde(default)]
        reaction_wheel: Option<Vec<String>>,
    },

    #[serde(rename = "dev_meta_command")]
    #[serde(rename_all = "camelCase")]
    DevMetaCommand {
        account_id: String,
        session_token: String,
        action: String,
        #[serde(default)]
        marks_delta: Option<i32>,
        #[serde(default)]
        sku: Option<String>,
    },

    #[serde(rename = "dev_clean_match")]
    #[serde(rename_all = "camelCase")]
    DevCleanMatch {
        #[serde(default)]
        civilization_id: Option<String>,
        #[serde(default)]
        seed: Option<u64>,
        #[serde(default)]
        paused: Option<bool>,
    },

    #[serde(rename = "dev_set_paused")]
    #[serde(rename_all = "camelCase")]
    DevSetPaused {
        paused: bool,
    },
}

fn default_commit_percent() -> f64 {
    0.5
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protocol_contract() {
        assert_eq!(PROTOCOL_VERSION, "1.0.0");
        
        let ws = ServerMessage::WorldSnapshot {
            tick: 1,
            sequence: 1,
            width: 1024,
            height: 512,
            total_cells: 524288,
            your_faction_id: 1,
            factions: vec![],
            fronts: vec![],
            match_state: MatchStateInfo {
                phase: "RUNNING".to_string(),
                winner_faction_id: None,
                macro_phase: Some("EXPANSION_ERA".to_string()),
                phase_timer: Some(0.0),
                neutral_land_percent: Some(0.85),
                match_id: None,
                creation_timestamp: None,
                simulation_tick: None,
            },
            strategic_sites: vec![],
            ports: vec![],
            alliances: vec![],
            pending_alliances: vec![],
            cells: vec![],
        };
        
        let json = serde_json::to_string(&ws).unwrap();
        assert!(json.contains("\"width\":1024"));
        assert!(json.contains("\"height\":512"));
        assert!(json.contains("\"totalCells\":524288"));
        assert!(json.contains("\"macroPhase\":\"EXPANSION_ERA\""));
    }

    #[test]
    fn test_faction_state_serialization() {
        let faction = FactionInfo {
            faction_id: 1,
            display_name: "ROMA".to_string(),
            faction_color: "#B91C1C".to_string(),
            color_int: 0xB91C1C,
            flag_id: "flag_roma".to_string(),
            flag_descriptor: Some(FlagDescriptor {
                layout: "triband".to_string(),
                primary_color: "#7f1d1d".to_string(),
                secondary_color: "#d97706".to_string(),
                accent_color: "#fef08a".to_string(),
                emblem: "eagle".to_string(),
            }),
            nation_preset_id: "roma".to_string(),
            civilization_id: "roma".to_string(),
            homeland_region: "Italian Peninsula".to_string(),
            capital_cell: 140836,
            provisional_capital: None,
            population: 100_000.0,
            population_capacity: 150_000.0,
            population_growth_per_second: 15.0,
            deployed_population: 0.0,
            total_living_population: 100_000.0,
            controlled_area_km2: 8_500.0,
            effective_controlled_area_km2: 1_700.0,
            consolidation_ratio: 0.20,
            overextension_ratio: 0.0,
            supply_coverage_ratio: 1.0,
            ports_count: 0,
            doctrine_offense: 0.02,
            doctrine_defense: 0.02,
            doctrine_expansion: -0.02,
            doctrine_maritime: -0.02,
            territory_count: 12,
            is_human: false,
            is_eliminated: false,
            relocation_time_remaining: None,
            is_relocating: false,
        };

        let serialized = serde_json::to_string(&faction).unwrap();
        assert!(serialized.contains("\"civilizationId\":\"roma\""));
        assert!(serialized.contains("\"consolidationRatio\":0.2"));

        let deserialized: FactionInfo = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.civilization_id, "roma");
        assert_eq!(deserialized.capital_cell, 140836);
        assert_eq!(deserialized.total_living_population, 100_000.0);
    }

    #[test]
    fn test_reaction_protocol() {
        let reaction = ServerMessage::ReactionBroadcast {
            player_faction_id: 101,
            player_name: "NOYAN".to_string(),
            player_tag: "#7F42A".to_string(),
            reaction_id: "reaction_turk_salute".to_string(),
            civilization_id: Some("hun".to_string()),
            is_premium: false,
            anchor_type: Some("MAP".to_string()),
            cell_index: Some(12345),
            front_id: None,
            timestamp: 1700000000,
        };
        let json = serde_json::to_string(&reaction).unwrap();
        assert!(json.contains("\"type\":\"reaction_broadcast\""));
        assert!(json.contains("\"playerName\":\"NOYAN\""));
        assert!(json.contains("\"reactionId\":\"reaction_turk_salute\""));

        let client_rx: ClientMessage = serde_json::from_str(r#"{"type":"send_reaction","reactionId":"reaction_salute","cellIndex":500}"#).unwrap();
        match client_rx {
            ClientMessage::SendReaction { reaction_id, cell_index, .. } => {
                assert_eq!(reaction_id, "reaction_salute");
                assert_eq!(cell_index, Some(500));
            }
            _ => panic!("Expected SendReaction"),
        }
    }
}
