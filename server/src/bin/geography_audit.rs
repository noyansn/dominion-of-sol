//! Fresh-match canonical geography audit.
//!
//! This is deliberately read-only with respect to gameplay. It classifies
//! every disconnected authoritative land component before any AI order is
//! issued, so a missing continental spawn cannot be disguised as a pacing or
//! amphibious-colonization problem.

#[path = "../balance.rs"]
mod balance;
#[path = "../bot.rs"]
mod bot;
#[path = "../chokepoints.rs"]
mod chokepoints;
#[path = "../civilizations.rs"]
mod civilizations;
#[path = "../combat.rs"]
mod combat;
#[path = "../compact_patch.rs"]
mod compact_patch;
#[path = "../expansion.rs"]
mod expansion;
#[path = "../factions.rs"]
mod factions;
#[path = "../meta_store.rs"]
mod meta_store;
#[path = "../protocol.rs"]
mod protocol;
#[path = "../simulation.rs"]
mod simulation;
#[path = "../world_map.rs"]
mod world_map;
#[path = "../world_topology.rs"]
mod world_topology;

use serde::Serialize;
use simulation::Simulation;
use std::collections::VecDeque;
use std::fs;
use std::path::Path;
use world_map::{WORLD_HEIGHT, WORLD_WIDTH};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum GeographyClass {
    Major,
    MeaningfulIsland,
    TinyFragment,
}

impl GeographyClass {
    fn label(self) -> &'static str {
        match self {
            Self::Major => "MAJOR",
            Self::MeaningfulIsland => "MEANINGFUL_ISLAND",
            Self::TinyFragment => "TINY_FRAGMENT",
        }
    }
}

#[derive(Debug, Serialize)]
struct LandComponent {
    rank: usize,
    cells: usize,
    spherical_km2: f64,
    min_x: usize,
    max_x: usize,
    min_y: usize,
    max_y: usize,
    centroid_lon_deg: f64,
    centroid_lat_deg: f64,
    approximate_geography: String,
    classification: GeographyClass,
    seeded: bool,
    seed_faction_ids: Vec<u8>,
    seed_civilizations: Vec<String>,
    coastal_cells: usize,
    route_source_port_id: Option<String>,
    route_source_port_name: Option<String>,
    route_source_port_cell: Option<u32>,
    route_landing_cell: Option<u32>,
    route_distance_km: Option<f64>,
    canonical_route_status: String,
    reason_unreachable: String,
    required_gameplay_treatment: String,
}

#[derive(Serialize)]
struct GeographyAudit {
    authority_width: usize,
    authority_height: usize,
    total_land_components: usize,
    seeded_components: usize,
    unreachable_neutral_components: usize,
    unreachable_neutral_cells: usize,
    unreachable_neutral_km2: f64,
    unreachable_major: usize,
    unreachable_meaningful_islands: usize,
    unreachable_tiny_fragments: usize,
    classification_basis: Vec<String>,
    components: Vec<LandComponent>,
}

fn cell_lon_lat(index: usize) -> (f64, f64) {
    let x = index % WORLD_WIDTH;
    let y = index / WORLD_WIDTH;
    let lon = ((x as f64 + 0.5) / WORLD_WIDTH as f64) * 360.0 - 180.0;
    let lat = 90.0 - ((y as f64 + 0.5) / WORLD_HEIGHT as f64) * 180.0;
    (lon, lat)
}

fn approximate_geography(lat: f64, lon: f64, cells: usize) -> &'static str {
    // Named regions are intentionally broad. The authoritative raster is too
    // coarse for a coastline-level reverse geocoder, but these bands are
    // precise enough to distinguish a missing continent seed from an island
    // group or unsupported speck.
    if lat < -60.0 && cells > 1_000 {
        return "Antarctica";
    }
    if lat < -60.0 {
        return "Southern Ocean / Antarctic island-fragment region";
    }
    if lat > 58.0 && (-74.0..=-10.0).contains(&lon) && cells > 1_000 {
        return "Greenland";
    }
    if lat > 60.0 && (-140.0..=-55.0).contains(&lon) {
        return "Canadian Arctic Archipelago";
    }
    if lat > 66.0 && (20.0..=180.0).contains(&lon) {
        return "Russian / European Arctic islands";
    }
    if (-12.0..=2.5).contains(&lat) && (130.0..=155.0).contains(&lon) {
        return "New Guinea region";
    }
    if (-8.0..=8.0).contains(&lat) && (108.0..=120.5).contains(&lon) {
        return "Borneo region";
    }
    if (-27.0..=-10.0).contains(&lat) && (42.0..=52.0).contains(&lon) {
        return "Madagascar region";
    }
    if (-7.0..=7.0).contains(&lat) && (94.0..=108.0).contains(&lon) {
        return "Sumatra region";
    }
    if (30.0..=47.0).contains(&lat) && (128.0..=148.0).contains(&lon) {
        return "Japan / Ryukyu region";
    }
    if (49.0..=61.5).contains(&lat) && (-13.0..=4.0).contains(&lon) {
        return "Britain and Ireland region";
    }
    if (62.0..=69.0).contains(&lat) && (-26.0..=-11.0).contains(&lon) {
        return "Iceland region";
    }
    if (4.0..=12.0).contains(&lat) && (77.0..=83.0).contains(&lon) {
        return "Sri Lanka region";
    }
    if (20.0..=27.0).contains(&lat) && (118.0..=124.0).contains(&lon) {
        return "Taiwan region";
    }
    if (4.0..=22.0).contains(&lat) && (115.0..=129.0).contains(&lon) {
        return "Philippines region";
    }
    if (-49.0..=-32.0).contains(&lat)
        && ((164.0..=180.0).contains(&lon) || (-180.0..=-172.0).contains(&lon))
    {
        return "New Zealand region";
    }
    if (7.0..=29.0).contains(&lat) && (-91.0..=-58.0).contains(&lon) {
        return "Caribbean / Antilles region";
    }
    if (30.0..=47.0).contains(&lat) && (-7.0..=42.0).contains(&lon) {
        return "Mediterranean island region";
    }
    if (-36.0..=13.0).contains(&lat) && (92.0..=155.0).contains(&lon) {
        return "Maritime Southeast Asia";
    }
    if (-50.0..=15.0).contains(&lat) && (32.0..=100.0).contains(&lon) {
        return "Indian Ocean island region";
    }
    if (-55.0..=15.0).contains(&lat)
        && ((145.0..=180.0).contains(&lon) || (-180.0..=-105.0).contains(&lon))
    {
        return "South Pacific island region";
    }
    if (15.0..=60.0).contains(&lat)
        && ((135.0..=180.0).contains(&lon) || (-180.0..=-105.0).contains(&lon))
    {
        return "North Pacific island / coastal-fragment region";
    }
    if (15.0..=60.0).contains(&lat) && (-105.0..=-5.0).contains(&lon) {
        return "North Atlantic island / coastal-fragment region";
    }
    if (-60.0..=15.0).contains(&lat) && (-70.0..=20.0).contains(&lon) {
        return "South Atlantic island / coastal-fragment region";
    }
    if lat >= 60.0 {
        return "High Arctic island / coastal-fragment region";
    }
    "Other island / coastal-fragment region"
}

fn classification(region: &str, cells: usize, km2: f64) -> GeographyClass {
    // Antarctica is continental-scale authority land and must be surfaced as
    // MAJOR even if the design later marks it explicitly non-playable.
    if region == "Antarctica" {
        return GeographyClass::Major;
    }

    // Continental-scale seeded components (Afro-Eurasia, the Americas and
    // Australia) remain MAJOR. Greenland is deliberately kept in the island
    // category despite its area because it is a geographically separate
    // overseas landmass in this ruleset.
    if region != "Greenland" && km2 >= 3_000_000.0 {
        return GeographyClass::Major;
    }

    // Named islands are not silently promoted to a playable continent merely
    // because Mercator/polar raster cells make them large. At this authority
    // resolution, four connected cells and roughly 5,000 spherical km² is the
    // conservative lower bound for a deliberate overseas destination. Smaller
    // pieces are catalogued, not erased or auto-owned.
    if cells >= 4 && km2 >= 5_000.0 {
        GeographyClass::MeaningfulIsland
    } else {
        GeographyClass::TinyFragment
    }
}

fn csv_escape(value: &str) -> String {
    if value.contains([',', '"', '\n']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn build_catalog(sim: &Simulation) -> Vec<LandComponent> {
    let mut visited = vec![false; sim.cells.len()];
    let mut raw = Vec::new();

    for start in 0..sim.cells.len() {
        if visited[start] || sim.cells[start].terrain_type != 0 {
            continue;
        }
        visited[start] = true;
        let mut queue = VecDeque::from([start]);
        let mut members = Vec::new();
        let mut km2 = 0.0;
        let mut min_x = usize::MAX;
        let mut max_x = 0;
        let mut min_y = usize::MAX;
        let mut max_y = 0;
        let mut weighted_lat = 0.0;
        let mut weighted_lon_sin = 0.0;
        let mut weighted_lon_cos = 0.0;
        let mut coastal_members = Vec::new();

        while let Some(cell) = queue.pop_front() {
            members.push(cell);
            let x = cell % WORLD_WIDTH;
            let y = cell / WORLD_WIDTH;
            min_x = min_x.min(x);
            max_x = max_x.max(x);
            min_y = min_y.min(y);
            max_y = max_y.max(y);
            let area = Simulation::cell_area_km2(cell);
            let (lon, lat) = cell_lon_lat(cell);
            let lon_rad = lon.to_radians();
            km2 += area;
            weighted_lat += lat * area;
            weighted_lon_sin += lon_rad.sin() * area;
            weighted_lon_cos += lon_rad.cos() * area;
            if sim.is_coastal_cell(cell as u32) {
                coastal_members.push(cell as u32);
            }

            for neighbor in expansion::legal_land_neighbors(&sim.cells, cell) {
                if !visited[neighbor] && sim.cells[neighbor].terrain_type == 0 {
                    visited[neighbor] = true;
                    queue.push_back(neighbor);
                }
            }
        }

        members.sort_unstable();
        let centroid_lat = weighted_lat / km2.max(f64::EPSILON);
        let centroid_lon = weighted_lon_sin.atan2(weighted_lon_cos).to_degrees();
        let region = approximate_geography(centroid_lat, centroid_lon, members.len()).to_string();
        let class = classification(&region, members.len(), km2);
        let mut seeds: Vec<_> = sim
            .factions
            .iter()
            .filter(|faction| {
                members
                    .binary_search(&(faction.capital_cell as usize))
                    .is_ok()
            })
            .collect();
        seeds.sort_by_key(|faction| faction.faction_id);
        let seeded = !seeds.is_empty();
        let route = if !seeded && class == GeographyClass::MeaningfulIsland {
            sim.strategic_sites
                .iter()
                .filter(|site| {
                    site.kind == "PORT"
                        && sim.playable_land_mask.get(site.cell_a as usize).copied() == Some(1)
                        && sim.is_coastal_cell(site.cell_a)
                })
                .flat_map(|site| {
                    coastal_members.iter().map(move |&landing| {
                        (
                            Simulation::great_circle_distance_km(site.cell_a, landing),
                            site,
                            landing,
                        )
                    })
                })
                .min_by(|a, b| a.0.total_cmp(&b.0))
        } else {
            None
        };
        let reason_unreachable = if seeded {
            String::new()
        } else {
            "No fresh-match civilization nucleus exists on this canonical land component; legal land expansion cannot cross the intervening water."
                .to_string()
        };
        let required_gameplay_treatment = match (class, seeded, region.as_str()) {
            (_, true, _) => "Already reachable by ordinary connected land expansion from at least one canonical fresh-match nucleus.".to_string(),
            (GeographyClass::Major, false, "Antarctica") => "Intentionally non-playable polar authority land: excluded from playable-neutral, victory and pacing accounting. It receives neither a fresh-match nucleus nor a generic amphibious route.".to_string(),
            (GeographyClass::Major, false, _) => "Fresh-match spawn coverage defect: place an appropriate canonical civilization nucleus on this playable landmass before tuning pacing.".to_string(),
            (GeographyClass::MeaningfulIsland, false, _) => "May remain neutral until reached through the existing explicit canonical port/amphibious authority: valid completed source port/coast, explicit legal neutral landing coast, permanent Population spend, then local connected land expansion.".to_string(),
            (GeographyClass::TinyFragment, false, _) => "Leave neutral unless explicitly supported. Exclude from playable-neutral and victory completion; never borrow ownership, snap to nearest land, or fabricate a bridge.".to_string(),
        };
        let canonical_route_status = if class == GeographyClass::Major
            && !seeded
            && region == "Antarctica"
        {
            "INTENTIONALLY_NON_PLAYABLE_POLAR_AUTHORITY".to_string()
        } else {
            match (class, seeded, route.as_ref()) {
                (_, true, _) => "LAND_REACHABLE".to_string(),
                (GeographyClass::Major, false, _) => {
                    "NO_ROUTE_PENDING_SPAWN_COVERAGE_OR_EXPLICIT_ROUTE".to_string()
                }
                (GeographyClass::MeaningfulIsland, false, Some(_)) => "CANONICAL_ROUTE_AVAILABLE_AFTER_COMPLETED_PORT: exact owned source coast/port, exact neutral landing coast, permanent Population spend, then local connected expansion; hostile cross-water is rejected.".to_string(),
                (GeographyClass::MeaningfulIsland, false, None) => {
                    "NO_CANONICAL_SOURCE_PORT_OR_LANDING_PAIR".to_string()
                }
                (GeographyClass::TinyFragment, false, _) => {
                    "INTENTIONALLY_UNSUPPORTED".to_string()
                }
            }
        };

        raw.push(LandComponent {
            rank: 0,
            cells: members.len(),
            spherical_km2: km2,
            min_x,
            max_x,
            min_y,
            max_y,
            centroid_lon_deg: centroid_lon,
            centroid_lat_deg: centroid_lat,
            approximate_geography: region,
            classification: class,
            seeded,
            seed_faction_ids: seeds.iter().map(|faction| faction.faction_id).collect(),
            seed_civilizations: seeds
                .iter()
                .map(|faction| faction.display_name.clone())
                .collect(),
            coastal_cells: coastal_members.len(),
            route_source_port_id: route.as_ref().map(|(_, site, _)| site.id.clone()),
            route_source_port_name: route.as_ref().map(|(_, site, _)| site.name.clone()),
            route_source_port_cell: route.as_ref().map(|(_, site, _)| site.cell_a),
            route_landing_cell: route.as_ref().map(|(_, _, landing)| *landing),
            route_distance_km: route.as_ref().map(|(distance, _, _)| *distance),
            canonical_route_status,
            reason_unreachable,
            required_gameplay_treatment,
        });
    }

    raw.sort_by(|a, b| {
        b.cells
            .cmp(&a.cells)
            .then_with(|| b.spherical_km2.total_cmp(&a.spherical_km2))
    });
    for (rank, component) in raw.iter_mut().enumerate() {
        component.rank = rank + 1;
    }
    raw
}

fn write_csv(path: &Path, components: &[LandComponent]) {
    let mut csv = String::from("rank,cells,spherical_km2,centroid_lon_deg,centroid_lat_deg,min_x,max_x,min_y,max_y,approximate_geography,classification,seeded,seed_faction_ids,seed_civilizations,coastal_cells,route_source_port_id,route_source_port_name,route_source_port_cell,route_landing_cell,route_distance_km,canonical_route_status,reason_unreachable,required_gameplay_treatment\n");
    for component in components {
        let ids = component
            .seed_faction_ids
            .iter()
            .map(u8::to_string)
            .collect::<Vec<_>>()
            .join(";");
        let civs = component.seed_civilizations.join(";");
        csv.push_str(&format!(
            "{},{},{:.2},{:.4},{:.4},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}\n",
            component.rank,
            component.cells,
            component.spherical_km2,
            component.centroid_lon_deg,
            component.centroid_lat_deg,
            component.min_x,
            component.max_x,
            component.min_y,
            component.max_y,
            csv_escape(&component.approximate_geography),
            component.classification.label(),
            component.seeded,
            csv_escape(&ids),
            csv_escape(&civs),
            component.coastal_cells,
            csv_escape(component.route_source_port_id.as_deref().unwrap_or("")),
            csv_escape(component.route_source_port_name.as_deref().unwrap_or("")),
            component
                .route_source_port_cell
                .map(|value| value.to_string())
                .unwrap_or_default(),
            component
                .route_landing_cell
                .map(|value| value.to_string())
                .unwrap_or_default(),
            component
                .route_distance_km
                .map(|value| format!("{value:.2}"))
                .unwrap_or_default(),
            csv_escape(&component.canonical_route_status),
            csv_escape(&component.reason_unreachable),
            csv_escape(&component.required_gameplay_treatment),
        ));
    }
    fs::write(path, csv).expect("write geography CSV");
}

fn write_markdown(path: &Path, audit: &GeographyAudit) {
    let mut text = String::new();
    text.push_str("# Fresh-match canonical geography classification\n\n");
    text.push_str(&format!(
        "Authority: {}×{}. Total components: {}. Seeded: {}. Unreachable neutral: {} ({} cells, {:.0} spherical km²).\n\n",
        audit.authority_width,
        audit.authority_height,
        audit.total_land_components,
        audit.seeded_components,
        audit.unreachable_neutral_components,
        audit.unreachable_neutral_cells,
        audit.unreachable_neutral_km2,
    ));
    text.push_str(&format!(
        "Unreachable classification: {} MAJOR, {} MEANINGFUL ISLAND, {} TINY FRAGMENT.\n\n",
        audit.unreachable_major,
        audit.unreachable_meaningful_islands,
        audit.unreachable_tiny_fragments,
    ));
    text.push_str("| rank | cells | spherical km² | centroid | geography | class | seeds |\n");
    text.push_str("|---:|---:|---:|---:|---|---|---|\n");
    for component in audit
        .components
        .iter()
        .filter(|component| !component.seeded)
        .take(40)
    {
        text.push_str(&format!(
            "| {} | {} | {:.0} | {:.2}°, {:.2}° | {} | {} | none |\n",
            component.rank,
            component.cells,
            component.spherical_km2,
            component.centroid_lon_deg,
            component.centroid_lat_deg,
            component.approximate_geography,
            component.classification.label(),
        ));
    }
    text.push_str(&format!(
        "\nThe complete {}-component current-gameplay-topology evidence is in `component_catalog.csv` and `component_catalog.json`. The separately generated micro-gap audit records the 541 raw authority components, each accepted local-archipelago edge, and every rejected close pair.\n",
        audit.total_land_components,
    ));
    fs::write(path, text).expect("write geography markdown");
}

fn main() {
    let seed = std::env::var("DOMINION_GEOGRAPHY_AUDIT_SEED")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(52_001);
    let sim = Simulation::new_standard(Some(civilizations::CANONICAL_CIVILIZATIONS[0].id), seed);
    let components = build_catalog(&sim);
    let unreachable: Vec<_> = components
        .iter()
        .filter(|component| !component.seeded)
        .collect();
    let audit = GeographyAudit {
        authority_width: WORLD_WIDTH,
        authority_height: WORLD_HEIGHT,
        total_land_components: components.len(),
        seeded_components: components.iter().filter(|component| component.seeded).count(),
        unreachable_neutral_components: unreachable.len(),
        unreachable_neutral_cells: unreachable.iter().map(|component| component.cells).sum(),
        unreachable_neutral_km2: unreachable.iter().map(|component| component.spherical_km2).sum(),
        unreachable_major: unreachable
            .iter()
            .filter(|component| component.classification == GeographyClass::Major)
            .count(),
        unreachable_meaningful_islands: unreachable
            .iter()
            .filter(|component| component.classification == GeographyClass::MeaningfulIsland)
            .count(),
        unreachable_tiny_fragments: unreachable
            .iter()
            .filter(|component| component.classification == GeographyClass::TinyFragment)
            .count(),
        classification_basis: vec![
            "Connectivity uses the canonical legal land-neighbor function, including its no-corner-jump-over-water rule and the generated local-archipelago micro-gap topology edges.".to_string(),
            "Area is the sum of spherical per-cell area, not raw Mercator/raster cell count.".to_string(),
            "Antarctica is surfaced as MAJOR and is intentionally non-playable authority land; it is excluded from playable-neutral, victory and pacing accounting.".to_string(),
            "Unseeded components with at least four cells and at least 5,000 spherical km² are candidates for deliberate overseas gameplay, not automatic colonization.".to_string(),
            "Smaller components remain TINY/UNSUPPORTED unless explicitly promoted by canonical geography data.".to_string(),
        ],
        components,
    };

    let output_dir = Path::new("artifacts/geography");
    fs::create_dir_all(output_dir).expect("create geography artifact directory");
    write_csv(&output_dir.join("component_catalog.csv"), &audit.components);
    write_markdown(&output_dir.join("classification_report.md"), &audit);
    let json = serde_json::to_string_pretty(&audit).expect("serialize geography audit");
    fs::write(output_dir.join("component_catalog.json"), &json).expect("write geography JSON");
    println!(
        "components={} seeded={} unreachable={} major={} meaningful={} tiny={} cells={} km2={:.0}",
        audit.total_land_components,
        audit.seeded_components,
        audit.unreachable_neutral_components,
        audit.unreachable_major,
        audit.unreachable_meaningful_islands,
        audit.unreachable_tiny_fragments,
        audit.unreachable_neutral_cells,
        audit.unreachable_neutral_km2,
    );
}
