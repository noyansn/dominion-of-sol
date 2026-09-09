use crate::balance::*;
use crate::civilizations::{
    get_canonical_civilization, CanonicalCivilization, CANONICAL_CIVILIZATIONS,
};
use crate::protocol::{FactionInfo, FlagDescriptor};
use crate::world_map::{WORLD_HEIGHT, WORLD_WIDTH};
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use std::collections::{HashSet, VecDeque};

fn connected_land_capacity(mask: &[u8], start: usize, limit: usize) -> usize {
    if mask.get(start) != Some(&0) {
        return 0;
    }
    let mut seen = HashSet::from([start]);
    let mut q = VecDeque::from([start]);
    while let Some(i) = q.pop_front() {
        if seen.len() >= limit {
            return limit;
        }
        let x = i % WORLD_WIDTH;
        let y = i / WORLD_WIDTH;
        for n in [
            (y > 0).then_some(i - WORLD_WIDTH),
            (x + 1 < WORLD_WIDTH).then_some(i + 1),
            (y + 1 < WORLD_HEIGHT).then_some(i + WORLD_WIDTH),
            (x > 0).then_some(i - 1),
        ]
        .into_iter()
        .flatten()
        {
            if mask[n] == 0 && seen.insert(n) {
                q.push_back(n)
            }
        }
    }
    seen.len()
}

// Curated Grand Strategy Military Atlas Color Palette (108 Distinct Entries)
// Designed in CIELAB/OKLCH perceptual space: calibrated saturation (35-65%),
// balanced lightness (28-55%), distinct hues, no neon/candy board-game tones.
const FACTION_HEX_PALETTE: &[(&str, u32)] = &[
    ("#2C4D6F", 0x2C4D6F),
    ("#7C2D2D", 0x7C2D2D),
    ("#3F4D34", 0x3F4D34),
    ("#784C36", 0x784C36),
    ("#424D54", 0x424D54),
    ("#3D566E", 0x3D566E),
    ("#7A5E38", 0x7A5E38),
    ("#2E5241", 0x2E5241),
    ("#523D57", 0x523D57),
    ("#634C38", 0x634C38),
    ("#2C5252", 0x2C5252),
    ("#7A6331", 0x7A6331),
    ("#853838", 0x853838),
    ("#384E63", 0x384E63),
    ("#4D5E3F", 0x4D5E3F),
    ("#6E432F", 0x6E432F),
    ("#476480", 0x476480),
    ("#6B2228", 0x6B2228),
    ("#566946", 0x566946),
    ("#704D36", 0x704D36),
    ("#356161", 0x356161),
    ("#5F4665", 0x5F4665),
    ("#735841", 0x735841),
    ("#406E57", 0x406E57),
    ("#8C6C40", 0x8C6C40),
    ("#53636D", 0x53636D),
    ("#943E3E", 0x943E3E),
    ("#1E405B", 0x1E405B),
    ("#4A5A3A", 0x4A5A3A),
    ("#805037", 0x805037),
    ("#527394", 0x527394),
    ("#66212B", 0x66212B),
    ("#2B5876", 0x2B5876),
    ("#8B2500", 0x8B2500),
    ("#3B5323", 0x3B5323),
    ("#8B4513", 0x8B4513),
    ("#4A5459", 0x4A5459),
    ("#4682B4", 0x4682B4),
    ("#996515", 0x996515),
    ("#2D4A22", 0x2D4A22),
    // Curated Military Atlas Palette across 16 distinct hue families:
    // Burgundy, Rust, Ochre, Sand, Olive, Sage, Petrol, Dusty Blue, Slate Blue,
    // Indigo, Violet, Plum, Umber, Crimson, Marine, Sienna
    ("#8B1E3F", 0x8B1E3F),
    ("#A24823", 0xA24823),
    ("#C68628", 0xC68628),
    ("#3E6F8E", 0x3E6F8E),
    ("#5E4B72", 0x5E4B72),
    ("#1A5B66", 0x1A5B66),
    ("#6F3556", 0x6F3556),
    ("#A68A56", 0xA68A56),
    ("#2B3E68", 0x2B3E68),
    ("#A53232", 0xA53232),
    ("#4F677E", 0x4F677E),
    ("#8F5436", 0x8F5436),
    ("#6B8272", 0x6B8272),
    ("#9C2A3E", 0x9C2A3E),
    ("#B25026", 0xB25026),
    ("#B8731F", 0xB8731F),
    ("#356584", 0x356584),
    ("#544267", 0x544267),
    ("#16535E", 0x16535E),
    ("#632E4C", 0x632E4C),
    ("#9C804B", 0x9C804B),
    ("#24365C", 0x24365C),
    ("#992B2B", 0x992B2B),
    ("#465E74", 0x465E74),
    ("#834B2F", 0x834B2F),
    ("#5E7A6B", 0x5E7A6B),
    ("#78281F", 0x78281F),
    ("#C05C32", 0xC05C32),
    ("#C4923E", 0xC4923E),
    ("#467B9D", 0x467B9D),
    ("#6A5680", 0x6A5680),
    ("#1F6877", 0x1F6877),
    ("#7B3D61", 0x7B3D61),
    ("#B59A65", 0xB59A65),
    ("#324775", 0x324775),
    ("#B03D3D", 0xB03D3D),
    ("#59738C", 0x59738C),
    ("#9D5E3E", 0x9D5E3E),
    ("#748B7C", 0x748B7C),
    ("#9E2A2B", 0x9E2A2B),
    ("#9E472A", 0x9E472A),
    ("#AA7028", 0xAA7028),
    ("#2E5B78", 0x2E5B78),
    ("#4B3A5D", 0x4B3A5D),
    ("#124B54", 0x124B54),
    ("#582743", 0x582743),
    ("#8E7542", 0x8E7542),
    ("#1E2D4F", 0x1E2D4F),
    ("#8C2424", 0x8C2424),
    ("#3D5469", 0x3D5469),
    ("#774127", 0x774127),
    ("#556B2F", 0x556B2F),
    ("#801818", 0x801818),
    ("#8C3A27", 0x8C3A27),
    ("#D49B35", 0xD49B35),
    ("#417290", 0x417290),
    ("#624F76", 0x624F76),
    ("#1B606D", 0x1B606D),
    ("#73385A", 0x73385A),
    ("#A0834E", 0xA0834E),
    ("#283B64", 0x283B64),
    ("#6E5848", 0x6E5848),
    ("#526D85", 0x526D85),
    ("#2B6D74", 0x2B6D74),
    ("#5D6E32", 0x5D6E32),
    ("#8A2846", 0x8A2846),
    ("#B85D35", 0xB85D35),
    ("#996820", 0x996820),
    ("#236269", 0x236269),
    ("#624D3D", 0x624D3D),
    ("#347B83", 0x347B83),
    ("#4E5F28", 0x4E5F28),
];

fn rgb_to_lab(rgb: u32) -> (f32, f32, f32) {
    let r = ((rgb >> 16) & 0xFF) as f32 / 255.0;
    let g = ((rgb >> 8) & 0xFF) as f32 / 255.0;
    let b = (rgb & 0xFF) as f32 / 255.0;
    let to_linear = |c: f32| {
        if c <= 0.04045 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    };
    let lr = to_linear(r);
    let lg = to_linear(g);
    let lb = to_linear(b);
    let x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047;
    let y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
    let z = (0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb) / 1.08883;
    let f = |t: f32| {
        if t > 0.008856 {
            t.cbrt()
        } else {
            7.787 * t + 16.0 / 116.0
        }
    };
    let fx = f(x);
    let fy = f(y);
    let fz = f(z);
    (116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz))
}

fn delta_e_cielab(lab1: (f32, f32, f32), lab2: (f32, f32, f32)) -> f32 {
    let dl = lab1.0 - lab2.0;
    let da = lab1.1 - lab2.1;
    let db = lab1.2 - lab2.2;
    (dl * dl + da * da + db * db).sqrt()
}

fn allocate_spatial_colors(
    capitals: &[(usize, usize, usize)],
    human_color: Option<u32>,
) -> Vec<(&'static str, u32)> {
    let n = capitals.len();
    let mut assigned: Vec<Option<usize>> = vec![None; n];
    let mut used_palette_indices = std::collections::HashSet::new();

    let palette_labs: Vec<(f32, f32, f32)> = FACTION_HEX_PALETTE
        .iter()
        .map(|&(_, c)| rgb_to_lab(c))
        .collect();

    // If human faction (id 101, index 0 in capitals) has a chosen color, keep it or match closest
    if let Some(_hc) = human_color {
        assigned[0] = Some(0); // Reserve primary blue for human/custom
        used_palette_indices.insert(0);
    }

    for i in 0..n {
        if assigned[i].is_some() {
            continue;
        }
        let (x_i, y_i, _) = capitals[i];
        let x_i = x_i as f32;
        let y_i = y_i as f32;

        let mut best_pal_idx = 0;
        let mut best_score = -1.0f32;

        for (pal_idx, &pal_lab) in palette_labs.iter().enumerate() {
            if used_palette_indices.contains(&pal_idx)
                && used_palette_indices.len() < FACTION_HEX_PALETTE.len()
            {
                continue;
            }

            let mut min_spatial_dist_weighted_delta = 1000.0f32;
            for j in 0..n {
                if let Some(other_pal_idx) = assigned[j] {
                    let other_lab = palette_labs[other_pal_idx];
                    let de = delta_e_cielab(pal_lab, other_lab);
                    let (x_j, y_j, _) = capitals[j];
                    let x_j = x_j as f32;
                    let y_j = y_j as f32;
                    let mut dx = (x_i - x_j).abs();
                    if dx > 512.0 {
                        dx = 1024.0 - dx;
                    }
                    let dy = (y_i - y_j).abs();
                    let world_dist = (dx * dx + dy * dy).sqrt().max(1.0);
                    // Weight de higher if physically close
                    let weight = (100.0 / (world_dist + 20.0)).clamp(0.1, 5.0);
                    let penalty = de / weight;
                    if penalty < min_spatial_dist_weighted_delta {
                        min_spatial_dist_weighted_delta = penalty;
                    }
                }
            }

            if min_spatial_dist_weighted_delta > best_score {
                best_score = min_spatial_dist_weighted_delta;
                best_pal_idx = pal_idx;
            }
        }

        assigned[i] = Some(best_pal_idx);
        used_palette_indices.insert(best_pal_idx);
    }

    assigned
        .into_iter()
        .map(|idx| FACTION_HEX_PALETTE[idx.unwrap_or(0)])
        .collect()
}

const FACTION_NAME_PREFIXES: &[&str] = &[
    "Dominion of",
    "Republic of",
    "Kingdom of",
    "Commonwealth of",
    "League of",
    "Empire of",
    "Union of",
    "Federation of",
    "Syndicate of",
    "Order of",
    "Alliance of",
    "Confederacy of",
    "Duchy of",
    "Sovereignty of",
    "Frontier of",
];

const FACTION_NAME_REGIONS: &[&str] = &[
    "Sol",
    "Vanguard",
    "Eurasia",
    "Anatolia",
    "Balkans",
    "Scandinavia",
    "Iberia",
    "Gaul",
    "Britannia",
    "Sahara",
    "Nile",
    "Levant",
    "Mesopotamia",
    "Persia",
    "Indus",
    "Ganges",
    "Cathay",
    "Nippon",
    "Siberia",
    "Ural",
    "Caspian",
    "Baltic",
    "Danube",
    "Rhine",
    "Amazon",
    "Andes",
    "Pampas",
    "Appalachia",
    "Rockies",
    "Yukon",
    "Great Lakes",
    "Outback",
    "Tasman",
    "Zambezi",
    "Congo",
    "Atlas",
    "Kalahari",
    "Sumatra",
    "Java",
];

#[derive(Debug, Clone, Copy)]
struct NationPreset {
    id: &'static str,
    homeland: &'static str,
    flag_id: &'static str,
    layout: &'static str,
    primary: &'static str,
    secondary: &'static str,
    accent: &'static str,
    emblem: &'static str,
    offense: f32,
    defense: f32,
    expansion: f32,
    maritime: f32,
}

// Small, deterministic identity/doctrine presets. The four gameplay axes are
// offsets, not free bonuses: every row sums to zero and each value is bounded
// to six percentage points. Homeland is identity metadata for the preset;
// ownership remains generated from the authoritative land mask.
const NATION_PRESETS: &[NationPreset] = &[
    NationPreset {
        id: "sol_core",
        homeland: "Aegean Core",
        flag_id: "flag_sol",
        layout: "horizontalBicolor",
        primary: "#3B82F6",
        secondary: "#07131C",
        accent: "#A7F3D0",
        emblem: "sun",
        offense: 0.015,
        defense: -0.005,
        expansion: -0.005,
        maritime: -0.005,
    },
    NationPreset {
        id: "vanguard",
        homeland: "Central Europe",
        flag_id: "flag_vanguard",
        layout: "verticalBicolor",
        primary: "#EF4444",
        secondary: "#190B12",
        accent: "#FDE68A",
        emblem: "shield",
        offense: 0.020,
        defense: 0.010,
        expansion: -0.015,
        maritime: -0.015,
    },
    NationPreset {
        id: "verdant",
        homeland: "Equatorial Basin",
        flag_id: "flag_verdant",
        layout: "horizontalTricolor",
        primary: "#10B981",
        secondary: "#08251F",
        accent: "#D1FAE5",
        emblem: "circle",
        offense: -0.010,
        defense: -0.005,
        expansion: 0.025,
        maritime: -0.010,
    },
    NationPreset {
        id: "solaris",
        homeland: "Southern Steppe",
        flag_id: "flag_solaris",
        layout: "diagonal",
        primary: "#F59E0B",
        secondary: "#271A05",
        accent: "#FEF3C7",
        emblem: "star",
        offense: 0.010,
        defense: -0.010,
        expansion: 0.010,
        maritime: -0.010,
    },
    NationPreset {
        id: "aether",
        homeland: "Highland Arc",
        flag_id: "flag_aether",
        layout: "verticalTricolor",
        primary: "#8B5CF6",
        secondary: "#171027",
        accent: "#DDD6FE",
        emblem: "diamond",
        offense: -0.005,
        defense: 0.020,
        expansion: -0.005,
        maritime: -0.010,
    },
    NationPreset {
        id: "nordic",
        homeland: "Northern Shelf",
        flag_id: "flag_nordic",
        layout: "cross",
        primary: "#06B6D4",
        secondary: "#071C29",
        accent: "#CFFAFE",
        emblem: "none",
        offense: -0.005,
        defense: 0.010,
        expansion: -0.010,
        maritime: 0.005,
    },
    NationPreset {
        id: "maritime",
        homeland: "Pacific Rim",
        flag_id: "flag_maritime",
        layout: "chevron",
        primary: "#0EA5E9",
        secondary: "#061826",
        accent: "#BAE6FD",
        emblem: "crescent",
        offense: -0.010,
        defense: -0.005,
        expansion: -0.005,
        maritime: 0.020,
    },
    NationPreset {
        id: "frontier",
        homeland: "Continental Frontier",
        flag_id: "flag_frontier",
        layout: "horizontalBicolor",
        primary: "#D97706",
        secondary: "#211305",
        accent: "#FED7AA",
        emblem: "eagle",
        offense: 0.005,
        defense: -0.005,
        expansion: 0.015,
        maritime: -0.015,
    },
];

pub fn nation_preset_count() -> usize {
    NATION_PRESETS.len()
}

pub fn valid_flag_descriptor(descriptor: &FlagDescriptor) -> bool {
    let layouts = [
        "solid",
        "horizontalBicolor",
        "horizontalTricolor",
        "verticalBicolor",
        "verticalTricolor",
        "cross",
        "diagonal",
        "chevron",
    ];
    let emblems = [
        "none", "star", "circle", "sun", "crescent", "diamond", "shield", "eagle",
    ];
    layouts.contains(&descriptor.layout.as_str())
        && emblems.contains(&descriptor.emblem.as_str())
        && [
            &descriptor.primary_color,
            &descriptor.secondary_color,
            &descriptor.accent_color,
        ]
        .into_iter()
        .all(|color| {
            color.len() == 7
                && color.starts_with('#')
                && color[1..].chars().all(|c| c.is_ascii_hexdigit())
        })
}

pub fn normalize_doctrine(offense: f32, defense: f32, expansion: f32, maritime: f32) -> [f32; 4] {
    let mut values = [offense, defense, expansion, maritime].map(|value| value.clamp(-0.06, 0.06));
    let mean = values.iter().sum::<f32>() / values.len() as f32;
    for value in &mut values {
        *value -= mean;
    }
    let max_abs = values
        .iter()
        .map(|value| value.abs())
        .fold(0.0_f32, f32::max);
    if max_abs > 0.06 {
        for value in &mut values {
            *value *= 0.06 / max_abs;
        }
    }
    values
}

pub fn generate_100_factions(land_mask: &[u8], count: usize, match_seed: u64) -> Vec<FactionInfo> {
    // A custom game is one human nation plus one hundred AI nations. The
    // custom nation is deliberately the 101st faction so its identity is
    // unambiguous in snapshots and future lobby contracts.
    let target_count = count.min(101);
    let custom_match = target_count == 101;
    let mut factions = Vec::with_capacity(target_count);

    // Collect all valid land cells
    let mut land_cells = Vec::new();
    for y in 20..(WORLD_HEIGHT - 20) {
        for x in 20..(WORLD_WIDTH - 20) {
            let idx = y * WORLD_WIDTH + x;
            if idx < land_mask.len()
                && land_mask[idx] == 0
                && connected_land_capacity(land_mask, idx, 28) >= 28
            {
                land_cells.push((x, y, idx));
            }
        }
    }

    if land_cells.is_empty() {
        return factions;
    }

    // Faction 1: Dominion of Sol (Human Player - Balkan/Aegean region: approx x=576, y=140 in 1024x512)
    // Add small seed-driven fair candidate variation
    let mut rng = StdRng::seed_from_u64(match_seed);
    let x_offset = rng.gen_range(-15.0..15.0);
    let y_offset = rng.gen_range(-15.0..15.0);
    let sol_target_x = 576.0f64 + x_offset;
    let sol_target_y = 140.0f64 + y_offset;

    let mut sol_cap = land_cells[0];
    let mut best_dist = f64::MAX;
    for &cell in &land_cells {
        let d = ((cell.0 as f64 - sol_target_x).powi(2) + (cell.1 as f64 - sol_target_y).powi(2))
            .sqrt();
        if d < best_dist {
            best_dist = d;
            sol_cap = cell;
        }
    }

    let mut chosen_capitals = vec![sol_cap];

    // Farthest-point sampling for remaining factions (minimum spatial distance)
    let min_dist_threshold = 28.0; // in 1024x512 grid cells

    while chosen_capitals.len() < target_count {
        let mut best_candidate = None;
        let mut max_min_dist = -1.0f64;

        // Sample candidate points from land cells
        let stride = (land_cells.len() / 600).max(1);
        for i in (0..land_cells.len()).step_by(stride) {
            let candidate = land_cells[i];

            // Distance to closest already chosen capital
            let mut min_d = f64::MAX;
            for &chosen in &chosen_capitals {
                let dx = (candidate.0 as f64 - chosen.0 as f64).abs();
                // Wrap longitude
                let dx_wrapped = dx.min(WORLD_WIDTH as f64 - dx);
                let dy = (candidate.1 as f64 - chosen.1 as f64).abs();
                let dist = (dx_wrapped * dx_wrapped + dy * dy).sqrt();
                if dist < min_d {
                    min_d = dist;
                }
            }

            if min_d > max_min_dist {
                // Add noise to the distance calculation to randomize the candidates based on seed
                let noise: f64 = rng.gen_range(0.85..1.0);
                let score = min_d * noise;

                if score > max_min_dist {
                    max_min_dist = score;
                    best_candidate = Some(candidate);
                }
            }
        }

        if let Some(cand) = best_candidate {
            if max_min_dist >= min_dist_threshold || chosen_capitals.len() < target_count {
                chosen_capitals.push(cand);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    let allocated_colors = allocate_spatial_colors(
        &chosen_capitals,
        if custom_match { Some(0x3B82F6) } else { None },
    );

    // Build FactionInfo structs
    for (i, cap) in chosen_capitals.iter().enumerate() {
        let faction_id = if custom_match && i == 0 {
            101
        } else if custom_match {
            i as u8
        } else {
            (i + 1) as u8
        };
        let is_human = custom_match && faction_id == 101;

        let display_name = if is_human {
            "Dominion of Sol".to_string()
        } else {
            let p_idx = i % FACTION_NAME_PREFIXES.len();
            let r_idx = (i * 7 + 3) % FACTION_NAME_REGIONS.len();
            format!(
                "{} {}",
                FACTION_NAME_PREFIXES[p_idx], FACTION_NAME_REGIONS[r_idx]
            )
        };

        let (color_str, color_int) = if is_human {
            ("#3B82F6", 0x3B82F6)
        } else {
            allocated_colors[i]
        };

        let preset = if is_human {
            NATION_PRESETS[0]
        } else {
            NATION_PRESETS[i % NATION_PRESETS.len()]
        };
        let flag_id = if is_human {
            "flag_sol".to_string()
        } else {
            preset.flag_id.to_string()
        };
        let doctrine = normalize_doctrine(
            preset.offense,
            preset.defense,
            preset.expansion,
            preset.maritime,
        );

        factions.push(FactionInfo {
            faction_id,
            display_name,
            faction_color: color_str.to_string(),
            color_int,
            flag_id,
            flag_descriptor: Some(FlagDescriptor {
                layout: preset.layout.to_string(),
                primary_color: preset.primary.to_string(),
                secondary_color: preset.secondary.to_string(),
                accent_color: preset.accent.to_string(),
                emblem: preset.emblem.to_string(),
            }),
            nation_preset_id: if is_human {
                "custom".to_string()
            } else {
                preset.id.to_string()
            },
            civilization_id: if is_human {
                "custom".to_string()
            } else {
                preset.id.to_string()
            },
            homeland_region: preset.homeland.to_string(),
            capital_cell: cap.2 as u32,
            provisional_capital: None,
            population: INITIAL_LIVING_POPULATION,
            population_capacity: BASE_HOMELAND_CAPACITY,
            population_growth_per_second: INITIAL_LIVING_POPULATION * RESERVE_GROWTH_RATE
                + TERRITORY_GROWTH_BASE,
            deployed_population: 0.0,
            total_living_population: INITIAL_LIVING_POPULATION,
            controlled_area_km2: 0.0,
            effective_controlled_area_km2: 0.0,
            consolidation_ratio: 0.20,
            overextension_ratio: 0.0,
            supply_coverage_ratio: 1.0,
            ports_count: 0,
            doctrine_offense: doctrine[0],
            doctrine_defense: doctrine[1],
            doctrine_expansion: doctrine[2],
            doctrine_maritime: doctrine[3],
            territory_count: 0,
            is_human,
            is_eliminated: false,
            relocation_time_remaining: None,
            is_relocating: false,
        });
    }

    // Keep the ordinary faction vector order stable for server-side systems
    // and historical fixtures (AI ids 1..100 first), while the human remains
    // unambiguously faction 101 in the authoritative identity.
    if custom_match && !factions.is_empty() {
        let human = factions.remove(0);
        factions.push(human);
    }

    factions
}

pub fn resolve_civilization_capital(
    land_mask: &[u8],
    candidate_cell: usize,
    _match_seed: u64,
    existing_capitals: &[usize],
) -> usize {
    let is_valid = |c: usize, existing: &[usize]| -> bool {
        if c >= land_mask.len()
            || land_mask[c] != 0
            || connected_land_capacity(land_mask, c, 28) < 28
        {
            return false;
        }
        let cx1 = c % WORLD_WIDTH;
        let cy1 = c / WORLD_WIDTH;
        for &other in existing {
            let cx2 = other % WORLD_WIDTH;
            let cy2 = other / WORLD_WIDTH;
            let mut dx = (cx1 as isize - cx2 as isize).abs() as usize;
            if dx > WORLD_WIDTH / 2 {
                dx = WORLD_WIDTH - dx;
            }
            let dy = (cy1 as isize - cy2 as isize).abs() as usize;
            if dx * dx + dy * dy < 25 {
                return false;
            }
        }
        true
    };

    if is_valid(candidate_cell, existing_capitals) {
        return candidate_cell;
    }

    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    queue.push_back(candidate_cell);
    visited.insert(candidate_cell);

    while let Some(curr) = queue.pop_front() {
        if is_valid(curr, existing_capitals) {
            return curr;
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
            if visited.insert(n) {
                queue.push_back(n);
            }
        }
    }

    candidate_cell
}

/// Creates authoritative 44-civilization match roster.
/// Exactly 44 active civilizations: 1 human + 43 AI.
/// Zero duplicate civilization identities.
pub fn generate_44_civilization_factions(
    land_mask: &[u8],
    human_civ_id: Option<&str>,
    match_seed: u64,
) -> Vec<FactionInfo> {
    let mut factions = Vec::with_capacity(STANDARD_ACTIVE_CIVILIZATIONS);

    // 1. Identify human civilization
    let human_civ = human_civ_id
        .and_then(get_canonical_civilization)
        .unwrap_or(&CANONICAL_CIVILIZATIONS[0]);

    // 2. Identify remaining 43 AI civilizations (no duplicates!)
    let ai_civs: Vec<&CanonicalCivilization> = CANONICAL_CIVILIZATIONS
        .iter()
        .filter(|c| c.id != human_civ.id)
        .collect();

    let mut chosen_capitals = Vec::with_capacity(STANDARD_ACTIVE_CIVILIZATIONS);

    // 3. Spawn 43 AI factions (faction_id 1..=43)
    for (i, &civ) in ai_civs.iter().enumerate() {
        let faction_id = (i + 1) as u8;
        let cap = resolve_civilization_capital(
            land_mask,
            civ.candidate_start_cell as usize,
            match_seed,
            &chosen_capitals,
        );
        chosen_capitals.push(cap);

        let flag_desc = civ.flag_descriptor.to_flag_descriptor();
        factions.push(FactionInfo {
            faction_id,
            display_name: civ.display_name.to_string(),
            faction_color: civ.political_color.to_string(),
            color_int: civ.color_int,
            flag_id: civ.flag_id.to_string(),
            flag_descriptor: Some(flag_desc),
            nation_preset_id: civ.id.to_string(),
            civilization_id: civ.id.to_string(),
            homeland_region: format!("{:?}", civ.macro_region),
            capital_cell: cap as u32,
            provisional_capital: None,
            population: INITIAL_LIVING_POPULATION,
            total_living_population: INITIAL_LIVING_POPULATION,
            population_capacity: BASE_HOMELAND_CAPACITY,
            population_growth_per_second: INITIAL_LIVING_POPULATION * RESERVE_GROWTH_RATE
                + TERRITORY_GROWTH_BASE,
            deployed_population: 0.0,
            controlled_area_km2: 0.0,
            effective_controlled_area_km2: 0.0,
            consolidation_ratio: CONSOLIDATION_NEUTRAL_INITIAL,
            overextension_ratio: 0.0,
            supply_coverage_ratio: 1.0,
            ports_count: 0,
            doctrine_offense: civ.doctrine_offense,
            doctrine_defense: civ.doctrine_defense,
            doctrine_expansion: civ.doctrine_expansion,
            doctrine_maritime: civ.doctrine_maritime,
            territory_count: 0,
            is_human: false,
            is_eliminated: false,
            relocation_time_remaining: None,
            is_relocating: false,
        });
    }

    // 4. Spawn Human faction (faction_id 101)
    let human_cap = resolve_civilization_capital(
        land_mask,
        human_civ.candidate_start_cell as usize,
        match_seed,
        &chosen_capitals,
    );
    chosen_capitals.push(human_cap);

    let human_flag_desc = human_civ.flag_descriptor.to_flag_descriptor();
    factions.push(FactionInfo {
        faction_id: HUMAN_FACTION_ID,
        display_name: human_civ.display_name.to_string(),
        faction_color: human_civ.political_color.to_string(),
        color_int: human_civ.color_int,
        flag_id: human_civ.flag_id.to_string(),
        flag_descriptor: Some(human_flag_desc),
        nation_preset_id: human_civ.id.to_string(),
        civilization_id: human_civ.id.to_string(),
        homeland_region: format!("{:?}", human_civ.macro_region),
        capital_cell: human_cap as u32,
        provisional_capital: None,
        population: INITIAL_LIVING_POPULATION,
        total_living_population: INITIAL_LIVING_POPULATION,
        population_capacity: BASE_HOMELAND_CAPACITY,
        population_growth_per_second: INITIAL_LIVING_POPULATION * RESERVE_GROWTH_RATE
            + TERRITORY_GROWTH_BASE,
        deployed_population: 0.0,
        controlled_area_km2: 0.0,
        effective_controlled_area_km2: 0.0,
        consolidation_ratio: CONSOLIDATION_NEUTRAL_INITIAL,
        overextension_ratio: 0.0,
        supply_coverage_ratio: 1.0,
        ports_count: 0,
        doctrine_offense: human_civ.doctrine_offense,
        doctrine_defense: human_civ.doctrine_defense,
        doctrine_expansion: human_civ.doctrine_expansion,
        doctrine_maritime: human_civ.doctrine_maritime,
        territory_count: 0,
        is_human: true,
        is_eliminated: false,
        relocation_time_remaining: None,
        is_relocating: false,
    });

    factions
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world_map::generate_world_land_mask;

    #[test]
    fn test_44_civilization_roster_composition() {
        let mask = generate_world_land_mask();
        // Test with human selecting "hun"
        let factions_hun = generate_44_civilization_factions(&mask, Some("hun"), 42);
        assert_eq!(factions_hun.len(), 44);

        let human = factions_hun
            .iter()
            .find(|f| f.is_human)
            .expect("human present");
        assert_eq!(human.faction_id, HUMAN_FACTION_ID);
        assert_eq!(human.civilization_id, "hun");

        let ai_factions: Vec<&FactionInfo> = factions_hun.iter().filter(|f| !f.is_human).collect();
        assert_eq!(ai_factions.len(), 43);

        // Verify zero duplicates
        let mut ids = HashSet::new();
        for f in &factions_hun {
            assert!(
                ids.insert(&f.civilization_id),
                "Duplicate civilization id: {}",
                f.civilization_id
            );
            assert!(
                mask[f.capital_cell as usize] == 0,
                "Capital on water: {}",
                f.civilization_id
            );
        }
        assert_eq!(ids.len(), 44);
    }
}
