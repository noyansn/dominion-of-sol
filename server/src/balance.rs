//! Centralized Gameplay Balance Constants and Physical Units
//!
//! All balance-sensitive constants for Dominion of Sol are defined here with
//! explicit physical units and design rationale.

// --- WORLD GEOGRAPHY ---
pub const WORLD_WIDTH: usize = 1024;
pub const WORLD_HEIGHT: usize = 512;
pub const TOTAL_CELLS: usize = WORLD_WIDTH * WORLD_HEIGHT;

// --- ACTIVE MATCH CONFIGURATION ---
pub const STANDARD_ACTIVE_CIVILIZATIONS: usize = 44;
pub const HUMAN_FACTION_ID: u8 = 101;

// --- PHYSICAL STARTING SCALE ---
/// Target starting territorial nucleus cell count (2 to 6 contiguous land cells, hard max 8)
pub const STARTING_NUCLEUS_CELLS_MIN: usize = 2;
pub const STARTING_NUCLEUS_CELLS_DEFAULT: usize = 4;
pub const STARTING_NUCLEUS_CELLS_MAX: usize = 8;
pub const STARTING_AREA_MIN_KM2: f64 = 600.0;
pub const STARTING_AREA_MAX_KM2: f64 = 3_500.0;
pub const STARTING_NUCLEUS_AREA_TARGET_KM2: f64 = 4_750.0;

// --- POPULATION RESOURCE & CAPACITY ---
/// Baseline starting living population for emerging small states
pub const INITIAL_LIVING_POPULATION: f64 = 10_000.0;
/// Base homeland carrying capacity in population units
pub const BASE_HOMELAND_CAPACITY: f64 = 12_000.0;
/// Population capacity yielded per territory cell
pub const CAPACITY_PER_TERRITORY_CELL: f64 = 3_000.0;
/// Population capacity yielded per km² of fully consolidated territory
pub const CAPACITY_PER_KM2_CONSOLIDATED: f64 = 2.5;
/// Reserve population growth rate per second (r_reserve in dP/dt = r_reserve * P)
pub const RESERVE_GROWTH_RATE: f64 = 0.0045;
/// Base territory growth rate per second for reference cell scale
pub const TERRITORY_GROWTH_BASE: f64 = 20.0;
/// Sublinear long-realm contribution retained for large territories.
pub const TERRITORY_GROWTH_EXPONENT: f64 = 0.75;
/// Bounded small-frontier uplift. It is zero at 1x, peaks around the
/// representative 2x state, and decays before 4x territory can run away.
pub const TERRITORY_GROWTH_FRONTIER_BONUS_SCALE: f64 = 5.55;
pub const TERRITORY_GROWTH_FRONTIER_BONUS_RATE: f64 = 2.00;
/// Legacy logistic growth rate r for backwards compatibility
pub const LOGISTIC_GROWTH_RATE_R: f64 = 0.012;

// --- EXPANSION COST (MONOTONIC QUADRATIC) ---
/// Linear expansion cost coefficient (pop per cell)
pub const EXPANSION_COST_LINEAR: f64 = 125.0;
/// Quadratic expansion cost coefficient (calibrated for diminishing returns on large commitments)
pub const EXPANSION_COST_QUADRATIC: f64 = 5.0;
/// FRONTIER remains distributed and compact, but a late-game commitment must
/// not be silently flattened to the same 48-cell result as a much smaller
/// one. The quadratic commitment curve still governs efficiency.
pub const FRONTIER_MAX_CELLS_PER_OPERATION: usize = 96;

// --- CONSOLIDATION & OVEREXTENSION ---
/// Initial consolidation for newly settled neutral territory [0.0, 1.0]
pub const CONSOLIDATION_NEUTRAL_INITIAL: f32 = 0.20;
/// Initial consolidation for newly conquered enemy territory [0.0, 1.0]
pub const CONSOLIDATION_CONQUEST_INITIAL: f32 = 0.08;
/// Consolidation maturation rate per second (matures in ~60-120 seconds)
pub const CONSOLIDATION_MATURATION_RATE: f32 = 0.008;

// --- MACRO-PHASES & PACING ---
/// The frontier closes after a majority of *playable* land is claimed. This
/// gives the local-war phase enough runway in a ten-minute match while still
/// leaving meaningful neutral pressure for the opening. Local wars are legal
/// before this point; this phase is presentation/pacing, not a global
/// permission gate that freezes neutral expansion.
pub const EXPANSION_ERA_NEUTRAL_THRESHOLD: f64 = 0.55;
/// Safety limit for a geographically constrained seed. It may close the era
/// only after the secondary neutral threshold below has also been reached.
pub const EXPANSION_ERA_MAX_SECONDS: f32 = 360.0;
pub const EXPANSION_ERA_TIMEOUT_NEUTRAL_THRESHOLD: f64 = 0.45;
/// Armistice duration in seconds during FINAL_FRONTIER reorganization
pub const FINAL_FRONTIER_ARMISTICE_SECONDS: f32 = 15.0;

// --- WAR OPERATIONS & FRONTAGE ---
/// Maximum effective frontline population per single border cell in active combat
pub const FRONTAGE_CAP_PER_CELL: f64 = 40_000.0;
/// Power exponent for excess reserve force beyond frontline capacity (diminishing returns)
pub const RESERVE_EFFECTIVENESS_EXPONENT: f64 = 0.40;
/// Base casualty rate per second of combat intensity
// Attrition must leave a balanced local front time to visibly hold or bend.
// Commitments are still permanently spent at order time; this only prevents a
// 15-second exchange from deleting both deployed pressures before geography
// can express the result.
pub const COMBAT_BASE_CASUALTY_RATE: f64 = 0.006;
/// Advance progress threshold for capturing an enemy cell (accumulated net power seconds)
pub const CAPTURE_PROGRESS_THRESHOLD: f64 = 100.0;
/// Cohesion recovery rate outside combat per second
pub const COHESION_RECOVERY_RATE: f32 = 0.05;
/// Cohesion loss rate in sustained combat or when isolated
pub const COHESION_LOSS_RATE: f32 = 0.03;

// --- DEFENSIVE RESPONSE & LATENCY ---
/// Speed of defensive population redeployment (km per second)
pub const DEFENSIVE_TRANSIT_SPEED_KM_S: f64 = 120.0;

// --- CAPITAL RELOCATION ---
/// Duration in seconds to relocate capital after capture
pub const CAPITAL_RELOCATION_SECONDS: f32 = 10.0;

// --- BOT REACTIONS & SPAM CONTROL ---
/// Per-bot cooldown between reactions in seconds
pub const BOT_REACTION_COOLDOWN_MIN_S: f32 = 90.0;
pub const BOT_REACTION_COOLDOWN_MAX_S: f32 = 180.0;
/// Global reaction minimum interval in seconds to prevent world spam
pub const GLOBAL_BOT_REACTION_INTERVAL_S: f32 = 9.0;
/// Percentage of emitted bot reactions that may use civilization premium expressions (exact 2%)
pub const BOT_PREMIUM_REACTION_RATIO: f64 = 0.02;

// --- DOCTRINE BOUNDS ---
pub const DOCTRINE_AXIS_LIMIT: f32 = 0.06;
