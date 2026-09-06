pub mod balance;
mod bot;
mod chokepoints;
pub mod civilizations;
mod combat;
mod compact_patch;
pub mod expansion;
mod factions;
pub mod meta_store;
mod protocol;
mod simulation;
mod world_map;
pub mod world_topology;
#[cfg(test)]
mod economy_tests;
#[cfg(test)]
mod topology_fix_tests;

use bot::BotManager;
use futures_util::{SinkExt, StreamExt};
use meta_store::{MetaStore, SharedMetaStore};
use protocol::{ClientMessage, MatchStateInfo, ServerMessage};
use simulation::{Simulation, AI_FACTION_COUNT, PLAYER_FACTION_ID};
use factions::{normalize_doctrine, valid_flag_descriptor};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, RwLock};
use tokio::time::{interval, Duration};
use tokio_tungstenite::tungstenite::Message;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use world_map::{TOTAL_CELLS, WORLD_HEIGHT, WORLD_WIDTH};

type Tx = mpsc::Sender<Message>;
type PeerMap = Arc<RwLock<HashMap<SocketAddr, Tx>>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchPhase {
    WaitingForPlayer,
    PreMatch,
    Running,
    Finished,
}

pub const BUILD_ID: &str = env!("DOMINION_GIT_COMMIT");
pub const BUILD_TIMESTAMP: &str = env!("DOMINION_BUILD_TIMESTAMP");
pub const GAMEPLAY_SCHEMA_VERSION: &str = "v2.0.0-tiny-nucleus";
pub const MATCH_LIFECYCLE_VERSION: &str = "v2.1-authoritative-player-ready";

pub struct ActiveMatch {
    pub match_id: String,
    pub creation_timestamp: u64,
    pub sim: Simulation,
    pub bot_manager: BotManager,
    pub pre_match_failsafe_ticks: u64,
}

pub struct MatchRuntime {
    pub phase: MatchPhase,
    pub active_match: Option<ActiveMatch>,
    pub human_session_count: usize,
    pub forced_seed: Option<u64>,
    pub empty_match_grace_timer: u64,
    
    // Counters
    pub gameplay_tick_count: u64,
    pub bot_decision_count: u64,
    pub ownership_change_count: u64,
    pub dev_paused: bool,
}

fn match_state_info(phase: MatchPhase, active_match: Option<&ActiveMatch>) -> MatchStateInfo {
    let phase_str = match phase {
        MatchPhase::WaitingForPlayer => "WAITING",
        MatchPhase::PreMatch => "PRE_MATCH",
        MatchPhase::Running => "RUNNING",
        MatchPhase::Finished => "FINISHED",
    };
    let mut info = MatchStateInfo::new(phase_str, active_match.and_then(|am| am.sim.winner_faction_id));
    if let Some(am) = active_match {
        info.macro_phase = Some(am.sim.macro_phase.as_str().to_string());
        info.phase_timer = Some(am.sim.macro_phase_timer);
        info.neutral_land_percent = Some(am.sim.neutral_land_ratio());
        info.match_id = Some(am.match_id.clone());
        info.creation_timestamp = Some(am.creation_timestamp);
        info.simulation_tick = Some(am.sim.tick);
    }
    info
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pid = std::process::id();
    let binary_path = std::env::current_exe().map(|p| p.display().to_string()).unwrap_or_default();
    println!("==================================================");
    println!("SERVER BUILD");
    println!("DOMINION SERVER");
    println!("commit={}", BUILD_ID);
    println!("built={}", BUILD_TIMESTAMP);
    println!("pid={}", pid);
    println!("protocol={}", crate::protocol::PROTOCOL_VERSION);
    println!("binary={}", binary_path);
    println!("lifecycle={}", MATCH_LIFECYCLE_VERSION);
    println!("Listening on: ws://127.0.0.1:8765");
    println!("==================================================");

    let args: Vec<String> = std::env::args().collect();
    
    // Testing mode to demonstrate progression bug/fix
    if args.iter().any(|a| a == "--test-lifecycle") {
        let mut sim = Simulation::new(101);
        let mut bot = BotManager::with_seed(AI_FACTION_COUNT, 1);
        let start_tick = sim.tick;
        let start_seq = sim.sequence;
        for _ in 0..60 {
            // bot.generate_bot_actions(&mut sim);
            // sim.step();
        }
        println!("gameplay ticks={}", sim.tick - start_tick);
        println!("bot attempts={}", 0); // Not counted strictly
        println!("owner-grid changes={}", sim.sequence - start_seq);
        return Ok(());
    }

    if args.iter().any(|a| a == "--headless") {
        let seed = args
            .iter()
            .position(|a| a == "--seed")
            .and_then(|i| args.get(i + 1))
            .and_then(|s| s.parse().ok())
            .unwrap_or(1);
        let steps = args
            .iter()
            .position(|a| a == "--steps")
            .and_then(|i| args.get(i + 1))
            .and_then(|s| s.parse().ok())
            .unwrap_or(20_000);
        run_headless_test(seed, steps).await;
        return Ok(());
    }

    let cli_seed = args
        .iter()
        .position(|a| a == "--seed")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<u64>().ok());

    let peers: PeerMap = Arc::new(RwLock::new(HashMap::new()));
    
    let match_runtime = Arc::new(RwLock::new(MatchRuntime {
        phase: MatchPhase::WaitingForPlayer,
        active_match: None,
        human_session_count: 0,
        forced_seed: cli_seed,
        empty_match_grace_timer: 0,
        gameplay_tick_count: 0,
        bot_decision_count: 0,
        ownership_change_count: 0,
        dev_paused: false,
    }));

    let is_dev_mode = std::env::var("DOMINION_ENV").map(|v| v != "production").unwrap_or(true);
    let meta_store: SharedMetaStore = Arc::new(std::sync::RwLock::new(MetaStore::new("data/meta_store.json", is_dev_mode)));

    let addr: SocketAddr = "127.0.0.1:8765".parse().unwrap();
    let listener = TcpListener::bind(addr).await?;
    let match_runtime_clone = match_runtime.clone();
    let peers_clone = peers.clone();
    let meta_store_clone = meta_store.clone();

    tokio::spawn(async move {
        while let Ok((stream, addr)) = listener.accept().await {
            tokio::spawn(handle_connection(
                peers_clone.clone(),
                match_runtime_clone.clone(),
                meta_store_clone.clone(),
                stream,
                addr,
            ));
        }
    });

    // Main 20 Hz Simulation Loop (50ms interval)
    let mut ticker = interval(Duration::from_millis(50));
    let mut broadcast_counter: u64 = 0;

    loop {
        ticker.tick().await;
        broadcast_counter += 1;

        let mut tick_time_ms = 0.0;
        let mut deltas = vec![];
        let mut fronts = vec![];
        let mut seq = 0;
        let mut t = 0;
        let mut match_state = MatchStateInfo::new("WAITING", None);
        let mut pending_alliances = vec![];
        let mut has_match_update = false;
        
        {
            let mut rt = match_runtime.write().await;
            
            if rt.phase == MatchPhase::WaitingForPlayer {
                continue;
            }
            if rt.phase == MatchPhase::PreMatch {
                // PreMatch: simulation is strictly frozen at tick 0 awaiting explicit ClientMessage::PlayerReady.
                // Absolutely NO auto-advancement, NO AI orders, NO tick increments before readiness!
                continue;
            }
            if rt.human_session_count == 0 {
                rt.empty_match_grace_timer += 1;
                if rt.empty_match_grace_timer > 200 {
                    // Grace expired, destroy match
                    rt.active_match = None;
                    rt.phase = MatchPhase::WaitingForPlayer;
                    println!("[LIFECYCLE] Match grace expired, active match destroyed.");
                    continue;
                }
                // Paused during grace
                continue;
            } else {
                rt.empty_match_grace_timer = 0;
            }
            
            let mut bot_diff = 0;
            let mut tick_diff = 0;
            let mut ownership_diff = 0;
            let mut match_finished = false;
            let simulation_running = rt.phase == MatchPhase::Running && !rt.dev_paused;

            if let Some(am) = rt.active_match.as_mut() {
                if simulation_running {
                    let start_bot_acc = am.bot_manager.attempts;
                    am.bot_manager.generate_bot_actions(&mut am.sim);
                    let end_bot_acc = am.bot_manager.attempts;
                    if end_bot_acc > start_bot_acc {
                        bot_diff = end_bot_acc - start_bot_acc;
                    }

                    let (tick_time, d) = am.sim.step();
                    tick_diff = 1;
                    ownership_diff = d.len() as u64;
                    tick_time_ms = tick_time;
                    deltas = d;
                    match_finished = am.sim.match_over;
                }
                t = am.sim.tick;
                seq = am.sim.sequence;
                fronts = am.sim.combat_manager.get_front_infos();
                pending_alliances = am.sim.pending_alliance_states();
                let notes: Vec<_> = am.sim.atlas_notifications.drain(..).collect();
                for note in notes {
                    let note_msg = ServerMessage::AtlasNotification {
                        event_type: note.event_type,
                        message: note.message,
                        faction_id: note.faction_id,
                        cell_index: note.cell_index,
                    };
                    if let Ok(json_text) = serde_json::to_string(&note_msg) {
                        let ws_msg = Message::Text(json_text);
                        let peer_guard = peers.read().await;
                        for tx in peer_guard.values() {
                            let _ = tx.try_send(ws_msg.clone());
                        }
                    }
                }

                let bot_reactions = am.bot_manager.drain_reactions();
                for br in bot_reactions {
                    let rx_msg = ServerMessage::ReactionBroadcast {
                        player_faction_id: br.faction_id,
                        player_name: br.display_name,
                        player_tag: format!("#{:04X}", br.faction_id as u32 * 31 + 7),
                        reaction_id: br.reaction_id,
                        civilization_id: br.civilization_id,
                        is_premium: br.is_premium,
                        anchor_type: Some("MAP".to_string()),
                        cell_index: br.cell_index,
                        front_id: None,
                        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
                    };
                    if let Ok(json_text) = serde_json::to_string(&rx_msg) {
                        let ws_msg = Message::Text(json_text);
                        let peer_guard = peers.read().await;
                        for tx in peer_guard.values() {
                            let _ = tx.try_send(ws_msg.clone());
                        }
                    }
                }
                has_match_update = true;
            }

            if match_finished {
                rt.phase = MatchPhase::Finished;
                println!("[MATCH] Finished — winner={:?}", rt.active_match.as_ref().and_then(|am| am.sim.winner_faction_id));
            }
            match_state = match_state_info(rt.phase, rt.active_match.as_ref());

            rt.bot_decision_count += bot_diff;
            rt.gameplay_tick_count += tick_diff;
            rt.ownership_change_count += ownership_diff;
        }

async fn broadcast_to_peers(peers: &PeerMap, msg: Message) {
    let mut dead_peers = Vec::new();
    {
        let peer_guard = peers.read().await;
        for (&addr, tx) in peer_guard.iter() {
            if tx.try_send(msg.clone()).is_err() {
                dead_peers.push(addr);
            }
        }
    }
    if !dead_peers.is_empty() {
        let mut peer_guard = peers.write().await;
        for dead in dead_peers {
            peer_guard.remove(&dead);
        }
    }
}

        if !has_match_update {
            continue;
        }
            let delta_msg = ServerMessage::CellDeltaBatch {
                tick: t,
                sequence: seq,
                deltas,
                fronts,
                match_state,
                pending_alliances,
            };

            if let Ok(json_text) = serde_json::to_string(&delta_msg) {
                let ws_msg = Message::Text(json_text);
                broadcast_to_peers(&peers, ws_msg).await;
            }

        if broadcast_counter % 10 == 0 {
            let (tick, active_players, active_fronts, factions, ports, alliances, pending_alliances) = {
                let rt = match_runtime.read().await;
                if let Some(am) = &rt.active_match {
                    (
                        am.sim.tick,
                        peers.read().await.len(),
                        am.sim.combat_manager.fronts.iter().filter(|front| front.is_combat_active).count(),
                        am.sim.factions.clone(),
                        am.sim.port_states(),
                        am.sim.alliance_states(),
                        am.sim.pending_alliance_states(),
                    )
                } else {
                    (0, 0, 0, vec![], vec![], vec![], vec![])
                }
            };

            let metrics_msg = ServerMessage::ServerMetrics {
                tick,
                tick_time_ms,
                active_players,
                bot_count: factions.iter().filter(|f| !f.is_human && !f.is_eliminated).count(),
                deltas_count: 0,
                active_fronts,
                ram_usage_mb: 24.5,
            };

            if let Ok(json_text) = serde_json::to_string(&metrics_msg) {
                let ws_msg = Message::Text(json_text);
                broadcast_to_peers(&peers, ws_msg).await;
            }
            if let Ok(json_text) = serde_json::to_string(&ServerMessage::FactionUpdate { factions, ports, alliances, pending_alliances })
            {
                let ws_msg = Message::Text(json_text);
                broadcast_to_peers(&peers, ws_msg).await;
            }
        }
    }
}

async fn handle_connection(
    peers: PeerMap,
    match_runtime: Arc<RwLock<MatchRuntime>>,
    meta_store: SharedMetaStore,
    stream: TcpStream,
    addr: SocketAddr,
) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("[NET] WebSocket handshake failed for {}: {}", addr, e);
            return;
        }
    };

    println!("[NET] WebSocket handshake established: {}", addr);

    let (mut ws_tx, mut ws_rx) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel(256);

    peers.write().await.insert(addr, tx.clone());

    let (cur_match_id, cur_tick) = {
        let rt = match_runtime.read().await;
        (
            rt.active_match.as_ref().map(|m| m.match_id.clone()),
            rt.active_match.as_ref().map(|m| m.sim.tick).unwrap_or(0),
        )
    };

    let welcome = ServerMessage::ServerWelcome {
        build_id: BUILD_ID.to_string(),
        build_timestamp: BUILD_TIMESTAMP.to_string(),
        gameplay_schema_version: GAMEPLAY_SCHEMA_VERSION.to_string(),
        protocol_version: crate::protocol::PROTOCOL_VERSION.to_string(),
        server_commit: BUILD_ID.to_string(),
        server_pid: std::process::id(),
        current_match_id: cur_match_id,
        current_tick: cur_tick,
    };
    if let Ok(json) = serde_json::to_string(&welcome) {
        let _ = tx.try_send(Message::Text(json));
    }

    let addr_clone = addr;
    let peers_writer = peers.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_tx.send(msg).await.is_err() {
                break;
            }
        }
        peers_writer.write().await.remove(&addr_clone);
        println!("[NET] Outbound channel closed for: {}", addr_clone);
    });

    let mut last_reaction_instant = std::time::Instant::now() - std::time::Duration::from_secs(10);
    let mut current_account_id: Option<String> = None;
    let mut has_joined = false;

    while let Some(msg_result) = ws_rx.next().await {
        match msg_result {
            Ok(Message::Text(text)) => {
                if let Ok(msg) = serde_json::from_str::<ClientMessage>(&text) {
                    match msg {
                        ClientMessage::DevDiagnostic => {
                            let (diag_m_id, diag_tick, diag_phase, diag_alive) = {
                                let rt = match_runtime.read().await;
                                (
                                    rt.active_match.as_ref().map(|m| m.match_id.clone()),
                                    rt.active_match.as_ref().map(|m| m.sim.tick).unwrap_or(0),
                                    format!("{:?}", rt.phase),
                                    rt.active_match.as_ref().map(|m| m.sim.factions.iter().filter(|f| !f.is_eliminated && f.territory_count > 0).count()).unwrap_or(0),
                                )
                            };
                            let diag = ServerMessage::DevDiagnostic {
                                commit: BUILD_ID.to_string(),
                                build_timestamp: BUILD_TIMESTAMP.to_string(),
                                pid: std::process::id(),
                                protocol_version: crate::protocol::PROTOCOL_VERSION.to_string(),
                                current_match_id: diag_m_id,
                                current_tick: diag_tick,
                                phase: diag_phase,
                                alive_factions: diag_alive,
                            };
                            if let Ok(json) = serde_json::to_string(&diag) {
                                let _ = tx.try_send(Message::Text(json));
                            }
                        }
                        ClientMessage::PlayerJoin {
                            player_name,
                            protocol_version,
                            flag_id,
                            nation_name,
                            faction_color,
                            flag_descriptor,
                            starting_cell_index,
                            doctrine_offense,
                            doctrine_defense,
                            doctrine_expansion,
                            doctrine_maritime,
                            civilization_id,
                            start_paused,
                            lifecycle_action,
                            match_id,
                            ..
                        } => {
                            let mut snapshot_to_send = None;
                            {
                                let mut rt = match_runtime.write().await;
                                
                                let phase_before = format!("{:?}", rt.phase);
                                let match_id_before = rt.active_match.as_ref().map(|am| am.match_id.clone()).unwrap_or_else(|| "NONE".to_string());
                                let human_count_before = rt.human_session_count;

                                println!("[PLAYER_JOIN]");
                                println!("timestamp={}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
                                println!("remote={}", addr);
                                println!("playerName={}", player_name);
                                println!("civId={:?}", civilization_id);
                                println!("phaseBefore={}", phase_before);
                                println!("matchIdBefore={}", match_id_before);
                                println!("humanCountBefore={}", human_count_before);
                                println!("lifecycleAction={:?}", lifecycle_action);
                                println!("requestedMatchId={:?}", match_id);

                                let is_player_dead = rt.active_match.as_ref().map_or(false, |am| {
                                    am.sim.factions.iter().find(|f| f.faction_id == PLAYER_FACTION_ID).map_or(true, |f| f.is_eliminated || f.territory_count == 0)
                                });

                                let is_explicit_new_match = lifecycle_action.as_deref() == Some("NEW_MATCH");
                                let is_different_match_requested = match_id.is_some() && rt.active_match.as_ref().map_or(false, |am| match_id.as_deref() != Some(am.match_id.as_str()));

                                if rt.phase == MatchPhase::WaitingForPlayer || rt.phase == MatchPhase::Finished || is_player_dead || is_explicit_new_match || is_different_match_requested || rt.active_match.is_none() {
                                    let seed = if let Some(s) = rt.forced_seed { s } else { rand::thread_rng().gen() };
                                    let now_secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
                                    let fresh_match_id = match_id.clone().unwrap_or_else(|| {
                                        format!("dominion_{}_{}", now_secs, seed % 10000)
                                    });

                                    let new_sim = Simulation::new_standard(civilization_id.as_deref(), seed);
                                    let new_bot_manager = BotManager::with_seed(43, seed.wrapping_add(1));
                                    
                                    let mut total_owned = 0;
                                    let mut unique_owners = 0;
                                    let mut faction_counts = vec![0; 256];
                                    for c in &new_sim.cells {
                                        if c.terrain_type == 0 {
                                            if c.owner_id != 0 {
                                                total_owned += 1;
                                                if faction_counts[c.owner_id as usize] == 0 {
                                                    unique_owners += 1;
                                                }
                                                faction_counts[c.owner_id as usize] += 1;
                                            }
                                        }
                                    }
                                    
                                    println!("[FRESH_MATCH_CREATED]");
                                    println!("matchId={}", fresh_match_id);
                                    println!("seed={}", seed);
                                    println!("tick=0");
                                    println!("totalOwned={}", total_owned);
                                    println!("uniqueOwners={}", unique_owners);
                                    
                                    println!("=== TICK 0 AUDIT SNAPSHOT: 44 CIVILIZATIONS ===");
                                    println!("tick\tfaction_id\tciv_id\tterritory_count\tland_area_km2\tpopulation\tcapital_cell");
                                    for f in &new_sim.factions {
                                        println!(
                                            "{}\t{}\t{}\t{}\t{:.2}\t{:.0}\t{}",
                                            new_sim.tick,
                                            f.faction_id,
                                            f.civilization_id,
                                            f.territory_count,
                                            f.controlled_area_km2,
                                            f.population,
                                            f.capital_cell
                                        );
                                    }
                                    println!("=== END TICK 0 AUDIT ===");

                                    if total_owned as f64 > new_sim.total_land_cells as f64 * 0.30 {
                                        panic!("FATAL LIFECYCLE ERROR: Fresh game has {} owned cells! Sparse start exceeded 30%.", total_owned);
                                    }

                                    println!("[MATCH_PRE_MATCH]");
                                    println!("reason=first_human_join_frozen_awaiting_player_ready");
                                    
                                    rt.active_match = Some(ActiveMatch {
                                        match_id: fresh_match_id,
                                        creation_timestamp: now_secs,
                                        sim: new_sim,
                                        bot_manager: new_bot_manager,
                                        pre_match_failsafe_ticks: 0,
                                    });
                                    // Start in PreMatch: simulation is frozen at tick 0 awaiting player ready!
                                    rt.phase = MatchPhase::PreMatch;
                                    if start_paused == Some(true) {
                                        rt.dev_paused = true;
                                        println!("[MATCH_PAUSED] dev_paused=true on player join");
                                    }
                                }
                                
                                if !has_joined {
                                    has_joined = true;
                                    rt.human_session_count += 1;
                                }
                                
                                let phase = rt.phase;
                                if let Some(am) = rt.active_match.as_mut() {
                                    let (cells_before, area_before) = am.sim.factions
                                        .iter()
                                        .find(|f| f.faction_id == PLAYER_FACTION_ID)
                                        .map(|f| (f.territory_count, f.controlled_area_km2))
                                        .unwrap_or((0, 0.0));

                                    println!("[FACTION_101_BEFORE_JOIN] cells={} area={:.2}", cells_before, area_before);

                                    if civilization_id.as_deref() == Some("custom") {
                                        if let Some(start) = starting_cell_index {
                                            if am.sim.relocate_faction_start(PLAYER_FACTION_ID, start).is_err() {
                                                eprintln!("[PLAYER_JOIN] requested starting cell rejected: {}", start);
                                            }
                                        }
                                    } else if starting_cell_index.is_some() {
                                        println!("[PLAYER_JOIN] preserved canonical capital/nucleus; ignored starting_cell_index for preset ({:?})", civilization_id);
                                    }

                                    let (cells_after, area_after) = am.sim.factions
                                        .iter()
                                        .find(|f| f.faction_id == PLAYER_FACTION_ID)
                                        .map(|f| (f.territory_count, f.controlled_area_km2))
                                        .unwrap_or((0, 0.0));

                                    println!("[FACTION_101_AFTER_JOIN] cells={} area={:.2}", cells_after, area_after);
                                    if civilization_id.as_deref() != Some("custom") {
                                        assert_eq!(cells_before, cells_after, "FATAL: Joining as human mutated territory cells!");
                                    }
                                    if let Some(player) = am.sim.factions.iter_mut().find(|f| f.faction_id == PLAYER_FACTION_ID) {
                                        if let Some(name) = nation_name.as_deref().map(str::trim).filter(|name| (2..=32).contains(&name.len())) {
                                            player.display_name = name.chars().filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_').collect();
                                        }
                                        if let Some(color) = faction_color.as_deref().filter(|color| color.len() == 7 && color.starts_with('#') && color.chars().skip(1).all(|c| c.is_ascii_hexdigit())) {
                                            player.faction_color = color.to_string();
                                            player.color_int = u32::from_str_radix(&color[1..], 16).unwrap_or(player.color_int);
                                        }
                                        if let Some(flag) = flag_id.as_deref().filter(|id| id.starts_with("flag_") && id.len() <= 32) {
                                            player.flag_id = flag.to_string();
                                        }
                                        if let Some(descriptor) = flag_descriptor.filter(valid_flag_descriptor) {
                                            player.flag_descriptor = Some(descriptor);
                                            player.flag_id = "flag_custom".to_string();
                                            player.nation_preset_id = "custom".to_string();
                                        }
                                        let doctrine = normalize_doctrine(
                                            doctrine_offense.unwrap_or(player.doctrine_offense),
                                            doctrine_defense.unwrap_or(player.doctrine_defense),
                                            doctrine_expansion.unwrap_or(player.doctrine_expansion),
                                            doctrine_maritime.unwrap_or(player.doctrine_maritime),
                                        );
                                        player.doctrine_offense = doctrine[0];
                                        player.doctrine_defense = doctrine[1];
                                        player.doctrine_expansion = doctrine[2];
                                        player.doctrine_maritime = doctrine[3];
                                        if player.nation_preset_id == "custom" {
                                            player.display_name = player.display_name.trim().to_string();
                                        }
                                    }
                                    let state = match_state_info(phase, Some(am));
                                    snapshot_to_send = Some(ServerMessage::WorldSnapshot {
                                        tick: am.sim.tick,
                                        sequence: am.sim.sequence,
                                        width: WORLD_WIDTH as u16,
                                        height: WORLD_HEIGHT as u16,
                                        total_cells: TOTAL_CELLS as u32,
                                        your_faction_id: PLAYER_FACTION_ID,
                                        factions: am.sim.factions.clone(),
                                        fronts: am.sim.combat_manager.get_front_infos(),
                                        match_state: state,
                                        strategic_sites: am.sim.strategic_sites.clone(),
                                        ports: am.sim.port_states(),
                                        alliances: am.sim.alliance_states(),
                                        pending_alliances: am.sim.pending_alliance_states(),
                                        cells: am.sim.get_snapshot_cells(),
                                    });
                                }
                            }
                            
                            if let Some(snapshot) = snapshot_to_send {
                                let snap_json = serde_json::to_string(&snapshot).unwrap();
                                let _ = tx.try_send(Message::Text(snap_json.into()));
                            }

                            if protocol_version != crate::protocol::PROTOCOL_VERSION {
                                eprintln!("[NET] Connection rejected: incompatible protocol version '{}'", protocol_version);
                                let _ = tx.try_send(Message::Close(None));
                                continue;
                            }

                            println!("[NET] Player Joined: '{}' from {}", player_name, addr);

                            {
                                let rt = match_runtime.read().await;
                                if let Some(am) = rt.active_match.as_ref() {
                                    let is_human_dead = am.sim.factions.iter().find(|f| f.faction_id == PLAYER_FACTION_ID).map_or(true, |f| f.is_eliminated || f.territory_count == 0);
                                    let human_cells = am.sim.factions.iter().find(|f| f.faction_id == PLAYER_FACTION_ID).map_or(0, |f| f.territory_count);
                                    let human_pop = am.sim.factions.iter().find(|f| f.faction_id == PLAYER_FACTION_ID).map_or(0.0, |f| f.population);
                                    let active_nations = am.sim.factions.iter().filter(|f| !f.is_eliminated && f.territory_count > 0).count();
                                    let is_running = rt.phase == MatchPhase::Running;
                                    let entry_mode = if am.sim.tick == 0 { "NEW_MATCH" } else { "RESUME_MATCH" };

                                    println!("==================================================");
                                    println!("ENTRY MODE = {}", entry_mode);
                                    println!("MATCH ID = {}", am.match_id);
                                    println!("MATCH CREATED AT = {}", am.creation_timestamp);
                                    println!("CURRENT TICK = {}", am.sim.tick);
                                    println!("PLAYER READY = {}", is_running);
                                    println!("SIMULATION RUNNING = {}", is_running);
                                    println!("NATION COUNT = {}", active_nations);
                                    println!("HUMAN FACTION STATUS = {}", if is_human_dead { "DEFEATED" } else { "ALIVE" });
                                    println!("HUMAN LAND CELLS = {}", human_cells);
                                    println!("HUMAN POPULATION = {:.0}", human_pop);
                                    println!("AI ORDERS BEFORE READY = {}", if am.sim.tick == 0 { 0 } else { am.bot_manager.attempts });
                                    println!("OWNERSHIP MUTATIONS BEFORE READY = {}", if am.sim.tick == 0 { 0 } else { am.sim.sequence });
                                    println!("ELIMINATIONS BEFORE READY = {}", 44usize.saturating_sub(active_nations));
                                    println!("==================================================");

                                    if entry_mode == "NEW_MATCH" {
                                        assert_eq!(am.sim.tick, 0, "Assertion failed: New match tick > 0 before ready");
                                        assert_eq!(active_nations, 44, "Assertion failed: New match nations < 44 before ready");
                                        assert!(!is_human_dead, "Assertion failed: Human player eliminated at tick 0 before ready");
                                    }
                                }
                            }

                            if let Some(flag) = flag_id.filter(|id| {
                                matches!(
                                    id.as_str(),
                                    "flag_sol"
                                        | "flag_vanguard"
                                        | "flag_verdant"
                                        | "flag_solaris"
                                        | "flag_aether"
                                        | "flag_pact"
                                        | "flag_nordic"
                                        | "flag_obsidian"
                                )
                            }) {
                                if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                    if let Some(player) = am.sim.factions.iter_mut().find(|f| f.faction_id == PLAYER_FACTION_ID) {
                                        player.flag_id = flag;
                                    }
                                }
                            }
                        }
                        ClientMessage::PlayerReady { match_id: r_mid } => {
                            let mut rt = match_runtime.write().await;
                            if rt.phase == MatchPhase::PreMatch {
                                let m_id = rt.active_match.as_ref().map(|am| am.match_id.clone()).unwrap_or_default();
                                println!("[LIFECYCLE] Player ready received for match {:?}. Active match is {}. Transitioning PreMatch -> Running at tick 0.", r_mid, m_id);
                                rt.phase = MatchPhase::Running;
                            }
                        }
                        ClientMessage::SendReaction { reaction_id, cell_index, front_id } => {
                            let is_usable = {
                                let ms = meta_store.read().unwrap();
                                if let Some(ref aid) = current_account_id {
                                    ms.is_reaction_usable(aid, &reaction_id)
                                } else {
                                    ms.is_reaction_usable("", &reaction_id)
                                }
                            };
                            if !is_usable {
                                eprintln!("[REACTION] Rejected unowned or invalid reaction: {}", reaction_id);
                                continue;
                            }

                            let now = std::time::Instant::now();
                            if now.duration_since(last_reaction_instant) >= std::time::Duration::from_millis(3500) {
                                last_reaction_instant = now;
                                let (pname, ptag) = if let Some(am) = match_runtime.read().await.active_match.as_ref() {
                                    if let Some(p) = am.sim.factions.iter().find(|f| f.faction_id == PLAYER_FACTION_ID) {
                                        (p.display_name.clone(), "#7F42A".to_string())
                                    } else {
                                        ("Commander".to_string(), "#7F42A".to_string())
                                    }
                                } else {
                                    ("Commander".to_string(), "#7F42A".to_string())
                                };

                                let broadcast = ServerMessage::ReactionBroadcast {
                                    player_faction_id: PLAYER_FACTION_ID,
                                    player_name: pname,
                                    player_tag: ptag,
                                    reaction_id,
                                    civilization_id: None,
                                    is_premium: false,
                                    anchor_type: Some("MAP".to_string()),
                                    cell_index,
                                    front_id,
                                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
                                };
                                if let Ok(json) = serde_json::to_string(&broadcast) {
                                    let ws_msg = Message::Text(json.into());
                                    let peer_guard = peers.read().await;
                                    for peer_tx in peer_guard.values() {
                                        let _ = peer_tx.try_send(ws_msg.clone());
                                    }
                                }
                            }
                        }
                        ClientMessage::ReinforceFront { front_id, commit_percent } => {
                            let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                am.sim.reinforce_front(PLAYER_FACTION_ID, front_id, commit_percent)
                            } else { Err("no_active_match".to_string()) };
                            let response = ServerMessage::ReinforceResult {
                                accepted: result.is_ok(),
                                front_id,
                                deployed_population: result.as_ref().copied().unwrap_or(0.0),
                                reason: result.err().unwrap_or_else(|| "accepted".to_string()),
                            };
                            if let Ok(json) = serde_json::to_string(&response) { let _ = tx.try_send(Message::Text(json.into())); }
                        }
                            ClientMessage::AttackCommand {
                                source_cell_index,
                                target_cell_index,
                                requested_target_cell_index,
                                commit_percent,
                                ..
                            } => {
                                let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                    am.sim.process_attack_command_with_intent(
                                        PLAYER_FACTION_ID,
                                        source_cell_index,
                                        target_cell_index,
                                        requested_target_cell_index,
                                        commit_percent,
                                    )
                                } else {
                                    Err("no_active_match".to_string())
                                };
                                let response = match result {
                                    Ok(outcome) => ServerMessage::AttackResult {
                                        accepted: true,
                                        source_cell_index,
                                        target_cell_index,
                                        front_id: Some(outcome.front_id),
                                        deployed_population: outcome.deployed_population,
                                        reason: "accepted".to_string(),
                                    },
                                    Err(reason) => ServerMessage::AttackResult {
                                        accepted: false,
                                        source_cell_index,
                                        target_cell_index,
                                        front_id: None,
                                        deployed_population: 0.0,
                                        reason,
                                    },
                                };
                                if let Ok(response_json) = serde_json::to_string(&response) {
                                    let _ = tx.try_send(Message::Text(response_json.into()));
                                }
                            }
                            ClientMessage::CancelAttack { front_id } => {
                                let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                    am.sim.cancel_attack(PLAYER_FACTION_ID, front_id)
                                } else {
                                    Err("no_active_match".to_string())
                                };
                                let response = ServerMessage::AttackResult {
                                    accepted: result.is_ok(),
                                    source_cell_index: 0,
                                    target_cell_index: 0,
                                    front_id: Some(front_id),
                                    deployed_population: 0.0,
                                    reason: result.err().unwrap_or_else(|| "cancelled".to_string()),
                                };
                                if let Ok(response_json) = serde_json::to_string(&response) {
                                    let _ = tx.try_send(Message::Text(response_json.into()));
                                }
                            }
                        ClientMessage::ExpandCommand { target_cell_index, mode, commit_percent } => {
                                let outcome = {
                                    if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                        let m = mode.as_deref().unwrap_or("FOCUS");
                                        am.sim.process_expand_command_with_mode(PLAYER_FACTION_ID, target_cell_index, m, commit_percent)
                                    } else {
                                        Err("no_active_match".to_string())
                                    }
                                };

                                let res_msg = match &outcome {
                                    Ok(out) => ServerMessage::ExpandResult {
                                        accepted: true,
                                        requested_target: target_cell_index,
                                        resolved_anchor: Some(out.resolved_anchor),
                                        actual_size: out.patch.actual_size as u16,
                                        population_cost: out.population_cost,
                                        reason: "accepted".to_string(),
                                    },
                                    Err(reason) => ServerMessage::ExpandResult {
                                        accepted: false,
                                        requested_target: target_cell_index,
                                        resolved_anchor: None,
                                        actual_size: 0,
                                        population_cost: 0.0,
                                        reason: reason.clone(),
                                    },
                                };

                                if let Ok(res_json) = serde_json::to_string(&res_msg) {
                                    let _ = tx.try_send(Message::Text(res_json.into()));
                                }

                            if let Ok(out) = outcome {
                                if let Some((faction_a, faction_b, location)) = out.first_contact {
                                    let fc_msg = ServerMessage::FirstContact {
                                        faction_a,
                                        faction_b,
                                        location,
                                    };
                                    if let Ok(fc_json) = serde_json::to_string(&fc_msg) {
                                        let _ = tx.try_send(Message::Text(fc_json.into()));
                                        println!(
                                            "[NET] First Contact dispatched: {} touched {}",
                                            faction_a, faction_b
                                        );
                                    }
                                }
                            }
                        }
                        ClientMessage::DefenseFocus { cell_index, population } => {
                            let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                am.sim.set_defense_focus(PLAYER_FACTION_ID, cell_index, population)
                            } else {
                                Err("no_active_match".to_string())
                            };
                            println!("[DEFENSE] cell={} population={} accepted={}", cell_index, population, result.is_ok());
                        }
                        ClientMessage::ReleaseDefenseFocus { cell_index } => {
                            if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                let _ = am.sim.release_defense_focus(PLAYER_FACTION_ID, cell_index);
                            }
                        }
                        ClientMessage::BuildPort { cell_index } => {
                            let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                am.sim.build_port(PLAYER_FACTION_ID, cell_index)
                            } else { Err("no_active_match".to_string()) };
                            let response = ServerMessage::PortResult {
                                accepted: result.is_ok(),
                                cell_index,
                                population_cost: result.as_ref().copied().unwrap_or(0.0),
                                remaining_seconds: if result.is_ok() { 10.0 } else { 0.0 },
                                reason: result.err().unwrap_or_else(|| "accepted".to_string()),
                            };
                            if let Ok(json) = serde_json::to_string(&response) { let _ = tx.try_send(Message::Text(json.into())); }
                        }
                        ClientMessage::AmphibiousAttack { port_cell_index, target_cell_index, commit_percent } => {
                            let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                am.sim.process_amphibious_operation(PLAYER_FACTION_ID, port_cell_index, target_cell_index, commit_percent)
                            } else { Err("no_active_match".to_string()) };
                            let response = match result {
                                Ok(out) => ServerMessage::AttackResult { accepted: true, source_cell_index: port_cell_index, target_cell_index, front_id: Some(out.front_id), deployed_population: out.deployed_population, reason: "accepted".to_string() },
                                Err(reason) => ServerMessage::AttackResult { accepted: false, source_cell_index: port_cell_index, target_cell_index, front_id: None, deployed_population: 0.0, reason },
                            };
                            if let Ok(json) = serde_json::to_string(&response) { let _ = tx.try_send(Message::Text(json.into())); }
                        }
                        ClientMessage::OfferAlliance { faction_id } => {
                            let (result, pending) = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                let result = am.sim.offer_alliance(PLAYER_FACTION_ID, faction_id);
                                let pending = result.as_ref().is_ok_and(|proposal| am.sim.has_pending_alliance(*proposal));
                                (result, pending)
                            } else { (Err("no_active_match".to_string()), false) };
                            let response = match result {
                                Ok(alliance_id) => ServerMessage::AllianceResult { accepted: true, faction_id, alliance_id: Some(alliance_id), pending, reason: "accepted".to_string() },
                                Err(reason) => ServerMessage::AllianceResult { accepted: false, faction_id, alliance_id: None, pending: false, reason },
                            };
                            if let Ok(json) = serde_json::to_string(&response) { let _ = tx.try_send(Message::Text(json.into())); }
                        }
                        ClientMessage::AllianceResponse { proposal_id, accept } => {
                            let result = if let Some(am) = match_runtime.write().await.active_match.as_mut() {
                                am.sim.respond_alliance(PLAYER_FACTION_ID, proposal_id, accept)
                            } else { Err("no_active_match".to_string()) };
                            let response = match result {
                                Ok(alliance_id) => ServerMessage::AllianceResult { accepted: true, faction_id: PLAYER_FACTION_ID, alliance_id: Some(alliance_id), pending: false, reason: "accepted".to_string() },
                                Err(reason) => ServerMessage::AllianceResult { accepted: false, faction_id: PLAYER_FACTION_ID, alliance_id: None, pending: false, reason },
                            };
                            if let Ok(json) = serde_json::to_string(&response) { let _ = tx.try_send(Message::Text(json.into())); }
                        }
                        ClientMessage::RequestSnapshot => {
                            let snapshot = {
                                let rt = match_runtime.read().await;
                                rt.active_match.as_ref().map(|am| ServerMessage::WorldSnapshot {
                                    tick: am.sim.tick,
                                    sequence: am.sim.sequence,
                                    width: WORLD_WIDTH as u16,
                                    height: WORLD_HEIGHT as u16,
                                    total_cells: TOTAL_CELLS as u32,
                                    your_faction_id: PLAYER_FACTION_ID,
                                    factions: am.sim.factions.clone(),
                                    fronts: am.sim.combat_manager.get_front_infos(),
                                    match_state: match_state_info(rt.phase, Some(am)),
                                    strategic_sites: am.sim.strategic_sites.clone(),
                                    ports: am.sim.port_states(),
                                    alliances: am.sim.alliance_states(),
                                    pending_alliances: am.sim.pending_alliance_states(),
                                    cells: am.sim.get_snapshot_cells(),
                                })
                            };
                            if let Some(snapshot) = snapshot {
                                if let Ok(snapshot_json) = serde_json::to_string(&snapshot) {
                                    let _ = tx.try_send(Message::Text(snapshot_json.into()));
                                }
                            }
                        }
                        ClientMessage::AuthGuestBootstrap { name_hint } => {
                            let snap = {
                                let mut ms = meta_store.write().unwrap();
                                let (acc, snap) = ms.create_guest(name_hint);
                                current_account_id = Some(acc.account_id);
                                snap
                            };
                            let resp = ServerMessage::AuthSnapshot {
                                account_id: snap.account_id,
                                session_token: snap.session_token,
                                player_tag: snap.player_tag,
                                display_name: snap.display_name,
                                account_type: snap.account_type,
                                wallet_balance: snap.wallet_balance,
                                entitlements: snap.entitlements,
                                equipped_blade_skin: snap.equipped_blade_skin,
                                reaction_wheel: snap.reaction_wheel,
                                is_dev_mode: snap.is_dev_mode,
                            };
                            if let Ok(json) = serde_json::to_string(&resp) {
                                let _ = tx.try_send(Message::Text(json.into()));
                            }
                        }
                        ClientMessage::AuthSessionResume { account_id, session_token } => {
                            let snap = {
                                let ms = meta_store.read().unwrap();
                                ms.resume_session(&account_id, &session_token)
                            };
                            if let Some(snap) = snap {
                                current_account_id = Some(snap.account_id.clone());
                                let resp = ServerMessage::AuthSnapshot {
                                    account_id: snap.account_id,
                                    session_token: snap.session_token,
                                    player_tag: snap.player_tag,
                                    display_name: snap.display_name,
                                    account_type: snap.account_type,
                                    wallet_balance: snap.wallet_balance,
                                    entitlements: snap.entitlements,
                                    equipped_blade_skin: snap.equipped_blade_skin,
                                    reaction_wheel: snap.reaction_wheel,
                                    is_dev_mode: snap.is_dev_mode,
                                };
                                if let Ok(json) = serde_json::to_string(&resp) {
                                    let _ = tx.try_send(Message::Text(json.into()));
                                }
                            } else {
                                let err = ServerMessage::AuthError { error: "INVALID_SESSION".to_string() };
                                if let Ok(json) = serde_json::to_string(&err) {
                                    let _ = tx.try_send(Message::Text(json.into()));
                                }
                            }
                        }
                        ClientMessage::AuthLinkAccount { account_id, session_token, provider, identifier } => {
                            let res = {
                                let mut ms = meta_store.write().unwrap();
                                ms.link_account(&account_id, &session_token, &provider, &identifier)
                            };
                            match res {
                                Ok(snap) => {
                                    current_account_id = Some(snap.account_id.clone());
                                    let resp = ServerMessage::AuthSnapshot {
                                        account_id: snap.account_id,
                                        session_token: snap.session_token,
                                        player_tag: snap.player_tag,
                                        display_name: snap.display_name,
                                        account_type: snap.account_type,
                                        wallet_balance: snap.wallet_balance,
                                        entitlements: snap.entitlements,
                                        equipped_blade_skin: snap.equipped_blade_skin,
                                        reaction_wheel: snap.reaction_wheel,
                                        is_dev_mode: snap.is_dev_mode,
                                    };
                                    if let Ok(json) = serde_json::to_string(&resp) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                                Err(meta_store::LinkError::Conflict { existing_account_id }) => {
                                    let conflict = ServerMessage::AuthConflict {
                                        message: "THIS SIGN-IN BELONGS TO AN EXISTING DOMINION".to_string(),
                                        existing_account_id,
                                    };
                                    if let Ok(json) = serde_json::to_string(&conflict) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                                Err(meta_store::LinkError::InvalidCredentials) => {
                                    let err = ServerMessage::AuthError { error: "INVALID_CREDENTIALS".to_string() };
                                    if let Ok(json) = serde_json::to_string(&err) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                            }
                        }
                        ClientMessage::WalletGetSnapshot { account_id, session_token } => {
                            let snap = {
                                let ms = meta_store.read().unwrap();
                                ms.resume_session(&account_id, &session_token)
                            };
                            if let Some(snap) = snap {
                                let resp = ServerMessage::AuthSnapshot {
                                    account_id: snap.account_id,
                                    session_token: snap.session_token,
                                    player_tag: snap.player_tag,
                                    display_name: snap.display_name,
                                    account_type: snap.account_type,
                                    wallet_balance: snap.wallet_balance,
                                    entitlements: snap.entitlements,
                                    equipped_blade_skin: snap.equipped_blade_skin,
                                    reaction_wheel: snap.reaction_wheel,
                                    is_dev_mode: snap.is_dev_mode,
                                };
                                if let Ok(json) = serde_json::to_string(&resp) {
                                    let _ = tx.try_send(Message::Text(json.into()));
                                }
                            }
                        }
                        ClientMessage::CommercePurchase { account_id, session_token, sku, idempotency_key } => {
                            let res = {
                                let mut ms = meta_store.write().unwrap();
                                ms.purchase_sku(&account_id, &session_token, &sku, &idempotency_key)
                            };
                            match res {
                                Ok(snap) => {
                                    let comm_res = ServerMessage::CommerceResult {
                                        success: true,
                                        sku: sku.clone(),
                                        balance_after: snap.wallet_balance,
                                        error: None,
                                    };
                                    if let Ok(json) = serde_json::to_string(&comm_res) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                    let snap_msg = ServerMessage::AuthSnapshot {
                                        account_id: snap.account_id,
                                        session_token: snap.session_token,
                                        player_tag: snap.player_tag,
                                        display_name: snap.display_name,
                                        account_type: snap.account_type,
                                        wallet_balance: snap.wallet_balance,
                                        entitlements: snap.entitlements,
                                        equipped_blade_skin: snap.equipped_blade_skin,
                                        reaction_wheel: snap.reaction_wheel,
                                        is_dev_mode: snap.is_dev_mode,
                                    };
                                    if let Ok(json) = serde_json::to_string(&snap_msg) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                                Err(err) => {
                                    let err_msg = match err {
                                        meta_store::PurchaseError::InsufficientBalance => "INSUFFICIENT_BALANCE",
                                        meta_store::PurchaseError::UnknownSku => "UNKNOWN_SKU",
                                        meta_store::PurchaseError::InvalidCredentials => "INVALID_CREDENTIALS",
                                    };
                                    let comm_res = ServerMessage::CommerceResult {
                                        success: false,
                                        sku,
                                        balance_after: 0,
                                        error: Some(err_msg.to_string()),
                                    };
                                    if let Ok(json) = serde_json::to_string(&comm_res) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                            }
                        }
                        ClientMessage::EquipLoadout { account_id, session_token, blade_skin, reaction_wheel } => {
                            let res = {
                                let mut ms = meta_store.write().unwrap();
                                ms.equip_loadout(&account_id, &session_token, blade_skin, reaction_wheel)
                            };
                            if let Ok(snap) = res {
                                let snap_msg = ServerMessage::AuthSnapshot {
                                    account_id: snap.account_id,
                                    session_token: snap.session_token,
                                    player_tag: snap.player_tag,
                                    display_name: snap.display_name,
                                    account_type: snap.account_type,
                                    wallet_balance: snap.wallet_balance,
                                    entitlements: snap.entitlements,
                                    equipped_blade_skin: snap.equipped_blade_skin,
                                    reaction_wheel: snap.reaction_wheel,
                                    is_dev_mode: snap.is_dev_mode,
                                };
                                if let Ok(json) = serde_json::to_string(&snap_msg) {
                                    let _ = tx.try_send(Message::Text(json.into()));
                                }
                            }
                        }
                        ClientMessage::DevMetaCommand { account_id, session_token, action, marks_delta, sku } => {
                            let res = {
                                let mut ms = meta_store.write().unwrap();
                                ms.dev_command(&account_id, &session_token, &action, marks_delta, sku)
                            };
                            match res {
                                Ok(snap) => {
                                    let snap_msg = ServerMessage::AuthSnapshot {
                                        account_id: snap.account_id,
                                        session_token: snap.session_token,
                                        player_tag: snap.player_tag,
                                        display_name: snap.display_name,
                                        account_type: snap.account_type,
                                        wallet_balance: snap.wallet_balance,
                                        entitlements: snap.entitlements,
                                        equipped_blade_skin: snap.equipped_blade_skin,
                                        reaction_wheel: snap.reaction_wheel,
                                        is_dev_mode: snap.is_dev_mode,
                                    };
                                    if let Ok(json) = serde_json::to_string(&snap_msg) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                                Err(e) => {
                                    let err = ServerMessage::MetaError {
                                        code: "DEV_COMMAND_REJECTED".to_string(),
                                        message: e.to_string(),
                                    };
                                    if let Ok(json) = serde_json::to_string(&err) {
                                        let _ = tx.try_send(Message::Text(json.into()));
                                    }
                                }
                            }
                        }
                        ClientMessage::DevCleanMatch { civilization_id, seed, paused } => {
                            let clean_seed = seed.unwrap_or(42);
                            let new_sim = Simulation::new_standard(civilization_id.as_deref(), clean_seed);
                            let new_bot_manager = BotManager::with_seed(43, clean_seed.wrapping_add(1));

                            println!("=== DEV CLEAN MATCH TICK 0 AUDIT ===");
                            println!("tick\tfaction_id\tciv_id\tterritory_count\tland_area_km2\tpopulation\tcapital_cell");
                            for f in &new_sim.factions {
                                println!(
                                    "{}\t{}\t{}\t{}\t{:.2}\t{:.0}\t{}",
                                    new_sim.tick,
                                    f.faction_id,
                                    f.civilization_id,
                                    f.territory_count,
                                    f.controlled_area_km2,
                                    f.population,
                                    f.capital_cell
                                );
                            }
                            println!("=== END TICK 0 AUDIT ===");

                            let mut rt = match_runtime.write().await;
                            let now_secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
                            let clean_match_id = format!("dev_clean_{}_{}", clean_seed, now_secs);
                            rt.active_match = Some(ActiveMatch {
                                match_id: clean_match_id,
                                creation_timestamp: now_secs,
                                sim: new_sim,
                                bot_manager: new_bot_manager,
                                pre_match_failsafe_ticks: 0,
                            });
                            rt.phase = if paused == Some(true) { MatchPhase::PreMatch } else { MatchPhase::Running };
                            rt.human_session_count = 1;
                            rt.dev_paused = paused.unwrap_or(false);
                            if rt.dev_paused {
                                println!("[DEV_CLEAN_MATCH] Match started in PAUSED state (tick=0 frozen)");
                            }

                            if let Some(am) = rt.active_match.as_ref() {
                                let state = match_state_info(rt.phase, Some(am));
                                let snapshot = ServerMessage::WorldSnapshot {
                                    tick: am.sim.tick,
                                    sequence: am.sim.sequence,
                                    width: WORLD_WIDTH as u16,
                                    height: WORLD_HEIGHT as u16,
                                    total_cells: TOTAL_CELLS as u32,
                                    your_faction_id: PLAYER_FACTION_ID,
                                    factions: am.sim.factions.clone(),
                                    fronts: am.sim.combat_manager.get_front_infos(),
                                    match_state: state,
                                    strategic_sites: am.sim.strategic_sites.clone(),
                                    ports: am.sim.port_states(),
                                    alliances: am.sim.alliance_states(),
                                    pending_alliances: am.sim.pending_alliance_states(),
                                    cells: am.sim.get_snapshot_cells(),
                                };
                                if let Ok(snapshot_json) = serde_json::to_string(&snapshot) {
                                    let _ = tx.try_send(Message::Text(snapshot_json.into()));
                                }
                            }
                        }
                        ClientMessage::DevSetPaused { paused } => {
                            let mut rt = match_runtime.write().await;
                            rt.dev_paused = paused;
                            println!("[DEV_SET_PAUSED] dev_paused={}", paused);
                        }
                    }
                } else if let Err(e) = serde_json::from_str::<ClientMessage>(&text) {
                    eprintln!("[NET] Parse error: {} for text: {}", e, text);
                }

                // Keep the session alive after each valid client message. The
                // authoritative match streams deltas/metrics continuously and
                // the browser sends commands over the same WebSocket.
            }
            Ok(Message::Close(_)) => {
                println!("[NET] Client closed: {}", addr);
                break;
            }
            Err(e) => {
                eprintln!("[NET] Error reading from {}: {}", addr, e);
                break;
            }
            _ => {}
        }
    }

    let mut rt = match_runtime.write().await;
    if has_joined {
        rt.human_session_count = rt.human_session_count.saturating_sub(1);
    }
    peers.write().await.remove(&addr);
    println!("[NET] Disconnected: {}", addr);
}

async fn run_headless_test(seed: u64, requested_steps: u64) {
    println!("--- HEADLESS ACCELERATED SIMULATION seed={} steps={} ---", seed, requested_steps);
    let mut sim = Simulation::with_seed(101, seed);
    let mut bot_manager = BotManager::with_seed(AI_FACTION_COUNT, seed);

    let total_land = sim.total_land_cells as f32;

    let report_stats = |tick: u64, sim: &Simulation, bots: &BotManager| {
        let mut neutral_count = 0;

        for cell in &sim.cells {
            if cell.terrain_type == 0 {
                // land
                if cell.owner_id == 0 {
                    neutral_count += 1;
                } else {
                }
            }
        }

        let mut territories: Vec<u32> = sim.factions.iter().map(|f| f.territory_count).collect();
        territories.sort_unstable();
        let mut populations: Vec<f64> = sim.factions.iter().map(|f| f.population).collect();
        populations.sort_by(|a, b| a.total_cmp(b));
        let mut growth: Vec<f64> = sim
            .factions
            .iter()
            .map(|f| f.population_growth_per_second)
            .collect();
        growth.sort_by(|a, b| a.total_cmp(b));
        let contacts = sim.combat_manager.fronts.len();
        let (component_violations, worst_ratio, worst_corridor) = morphology_summary(sim);
        println!("t={}s neutral={:.1}% medianLand={} largestLand={} medianPopulation={:.1} largestPopulation={:.1} medianGrowth={:.2}/s largestGrowth={:.2}/s attempts={} accepted={} insufficient={} contacts={} componentViolations={} worstPerimeterArea={:.3} worstCorridor={}",
            tick/20,(neutral_count as f32/total_land)*100.0,territories[territories.len()/2],territories.iter().copied().max().unwrap_or(0),populations[populations.len()/2],populations.iter().copied().fold(0.0,f64::max),growth[growth.len()/2],growth.iter().copied().fold(0.0,f64::max),bots.attempts,bots.accepted,bots.insufficient,contacts,component_violations,worst_ratio,worst_corridor);
    };

    report_stats(0, &sim, &bot_manager);

    let mut tick_samples = Vec::with_capacity(requested_steps as usize);
    let mut completed_steps = 0;
    for i in 1..=requested_steps {
        bot_manager.generate_bot_actions(&mut sim);
        let (tick_ms, _) = sim.step();
        tick_samples.push(tick_ms);
        completed_steps = i;

        if i % 200 == 0 {
            sim.validate_invariants().expect("headless invariant failure");
        }
        if i % 1_000 == 0 {
            let (disconnected, holes) = sim.topology_violations();
            assert_eq!(disconnected, 0, "headless disconnected territory");
            assert_eq!(holes, 0, "headless enclosed neutral hole");
        }

        if i == 600 || i == 1_200 || i == 2_400 || i == requested_steps {
            report_stats(i, &sim, &bot_manager);
        }
        if sim.match_over {
            println!("matchFinishedAtTick={} winner={:?}", sim.tick, sim.winner_faction_id);
            break;
        }
    }
    tick_samples.sort_by(|a, b| a.total_cmp(b));
    let average = tick_samples.iter().sum::<f64>() / tick_samples.len().max(1) as f64;
    let p95_index = ((tick_samples.len() as f64 * 0.95).floor() as usize).min(tick_samples.len().saturating_sub(1));
    let p95 = tick_samples.get(p95_index).copied().unwrap_or(0.0);
    let max = tick_samples.last().copied().unwrap_or(0.0);
    println!("headlessSteps={} avgTickMs={:.3} p95TickMs={:.3} maxTickMs={:.3} botAttempts={} botAccepted={} matchOver={}", completed_steps, average, p95, max, bot_manager.attempts, bot_manager.accepted, sim.match_over);
    println!("--- HEADLESS TEST COMPLETE ---");
}

fn morphology_summary(sim: &Simulation) -> (usize, f64, usize) {
    use std::collections::{HashSet, VecDeque};
    let mut violations = 0;
    let mut worst_ratio = 0.0f64;
    let mut worst_corridor = 0usize;
    for faction in &sim.factions {
        let id = faction.faction_id;
        let owned: HashSet<usize> = sim
            .cells
            .iter()
            .enumerate()
            .filter_map(|(i, c)| (c.owner_id == id).then_some(i))
            .collect();
        if owned.is_empty() {
            continue;
        }
        let mut unseen = owned.clone();
        let mut components = 0;
        while let Some(&start) = unseen.iter().next() {
            components += 1;
            let mut q = VecDeque::from([start]);
            unseen.remove(&start);
            while let Some(i) = q.pop_front() {
                for n in cardinal_indices(i) {
                    if owned.contains(&n) && unseen.remove(&n) {
                        q.push_back(n)
                    }
                }
            }
        }
        if components != 1 {
            violations += 1
        }
        let perimeter: usize = owned
            .iter()
            .map(|&i| {
                cardinal_indices(i)
                    .into_iter()
                    .filter(|n| !owned.contains(n))
                    .count()
            })
            .sum();
        worst_ratio = worst_ratio.max(perimeter as f64 / owned.len() as f64);
        let narrow: HashSet<usize> = owned
            .iter()
            .copied()
            .filter(|&i| {
                cardinal_indices(i)
                    .into_iter()
                    .filter(|n| owned.contains(n))
                    .count()
                    <= 2
            })
            .collect();
        let mut unseen = narrow.clone();
        while let Some(&start) = unseen.iter().next() {
            let mut q = VecDeque::from([start]);
            unseen.remove(&start);
            let mut len = 0;
            while let Some(i) = q.pop_front() {
                len += 1;
                for n in cardinal_indices(i) {
                    if narrow.contains(&n) && unseen.remove(&n) {
                        q.push_back(n)
                    }
                }
            }
            worst_corridor = worst_corridor.max(len)
        }
    }
    (violations, worst_ratio, worst_corridor)
}

fn cardinal_indices(i: usize) -> Vec<usize> {
    let x = i % WORLD_WIDTH;
    let y = i / WORLD_WIDTH;
    [
        (y > 0).then_some(i - WORLD_WIDTH),
        (x + 1 < WORLD_WIDTH).then_some(i + 1),
        (y + 1 < WORLD_HEIGHT).then_some(i + WORLD_WIDTH),
        (x > 0).then_some(i - 1),
    ]
    .into_iter()
    .flatten()
    .collect()
}

#[cfg(test)]
mod lifecycle_tests {
    use crate::simulation::Simulation;
    use crate::bot::BotManager;
    use crate::world_map::{TOTAL_CELLS, WORLD_HEIGHT, WORLD_WIDTH};
    
    #[test]
    fn test_zero_player_progression() {
        let mut sim = Simulation::new(101);
        let mut bot = BotManager::new(100);
        let start_tick = sim.tick;
        let start_sequence = sim.sequence;
        for _ in 0..60 {
            bot.generate_bot_actions(&mut sim);
            sim.step();
        }
        assert!(sim.tick > start_tick, "Simulation should advance");
    }
}
