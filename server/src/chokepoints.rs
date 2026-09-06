use serde::{Deserialize, Serialize};

use crate::world_map::{TOTAL_CELLS, WORLD_HEIGHT, WORLD_WIDTH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StrategicSiteInfo {
    pub id: String,
    pub name: String,
    /// PORT, STRAIT or CANAL. Presentation/game-rule data, never ownership.
    pub kind: String,
    pub cell_a: u32,
    pub cell_b: Option<u32>,
    pub strategic_value: u16,
}

#[derive(Clone, Copy)]
struct SiteSeed {
    id: &'static str,
    name: &'static str,
    kind: &'static str,
    a: (f64, f64),
    b: Option<(f64, f64)>,
    value: u16,
}

const SITES: &[SiteSeed] = &[
    SiteSeed {
        id: "port_new_york",
        name: "New York",
        kind: "PORT",
        a: (-74.01, 40.71),
        b: None,
        value: 70,
    },
    SiteSeed {
        id: "port_panama",
        name: "Panama",
        kind: "PORT",
        a: (-79.52, 9.00),
        b: None,
        value: 75,
    },
    SiteSeed {
        id: "port_rio",
        name: "Rio de Janeiro",
        kind: "PORT",
        a: (-43.18, -22.91),
        b: None,
        value: 55,
    },
    SiteSeed {
        id: "port_rotterdam",
        name: "Rotterdam",
        kind: "PORT",
        a: (4.48, 51.92),
        b: None,
        value: 80,
    },
    SiteSeed {
        id: "port_gibraltar",
        name: "Gibraltar",
        kind: "PORT",
        a: (-5.35, 36.14),
        b: None,
        value: 75,
    },
    SiteSeed {
        id: "port_cape",
        name: "Cape Town",
        kind: "PORT",
        a: (18.42, -33.93),
        b: None,
        value: 65,
    },
    SiteSeed {
        id: "port_suez",
        name: "Suez",
        kind: "PORT",
        a: (32.55, 29.97),
        b: None,
        value: 85,
    },
    SiteSeed {
        id: "port_dubai",
        name: "Dubai",
        kind: "PORT",
        a: (55.27, 25.20),
        b: None,
        value: 65,
    },
    SiteSeed {
        id: "port_mumbai",
        name: "Mumbai",
        kind: "PORT",
        a: (72.88, 19.08),
        b: None,
        value: 70,
    },
    SiteSeed {
        id: "port_singapore",
        name: "Singapore",
        kind: "PORT",
        a: (103.82, 1.29),
        b: None,
        value: 90,
    },
    SiteSeed {
        id: "port_shanghai",
        name: "Shanghai",
        kind: "PORT",
        a: (121.47, 31.23),
        b: None,
        value: 80,
    },
    SiteSeed {
        id: "port_tokyo",
        name: "Tokyo",
        kind: "PORT",
        a: (139.69, 35.68),
        b: None,
        value: 75,
    },
    SiteSeed {
        id: "port_sydney",
        name: "Sydney",
        kind: "PORT",
        a: (151.21, -33.87),
        b: None,
        value: 65,
    },
    SiteSeed {
        id: "strait_gibraltar",
        name: "Strait of Gibraltar",
        kind: "STRAIT",
        a: (-5.35, 36.14),
        b: Some((-5.61, 35.78)),
        value: 95,
    },
    SiteSeed {
        id: "strait_bosporus",
        name: "Bosporus",
        kind: "STRAIT",
        a: (28.95, 41.06),
        b: Some((29.09, 41.02)),
        value: 100,
    },
    SiteSeed {
        id: "canal_suez",
        name: "Suez Canal",
        kind: "CANAL",
        a: (32.32, 30.13),
        b: Some((32.57, 29.93)),
        value: 100,
    },
    SiteSeed {
        id: "strait_mandeb",
        name: "Bab-el-Mandeb",
        kind: "STRAIT",
        a: (43.32, 12.71),
        b: Some((43.00, 11.55)),
        value: 90,
    },
    SiteSeed {
        id: "strait_malacca",
        name: "Strait of Malacca",
        kind: "STRAIT",
        a: (103.50, 1.35),
        b: Some((104.03, 1.45)),
        value: 100,
    },
    SiteSeed {
        id: "canal_panama",
        name: "Panama Canal",
        kind: "CANAL",
        a: (-79.62, 9.15),
        b: Some((-79.43, 8.85)),
        value: 95,
    },
];

fn lon_lat_cell(lon: f64, lat: f64) -> usize {
    let x = (((lon + 180.0) / 360.0) * WORLD_WIDTH as f64).floor() as isize;
    let y = (((90.0 - lat) / 180.0) * WORLD_HEIGHT as f64).floor() as isize;
    y.clamp(0, WORLD_HEIGHT as isize - 1) as usize * WORLD_WIDTH
        + x.clamp(0, WORLD_WIDTH as isize - 1) as usize
}

fn nearest_land(mask: &[u8], seed: usize) -> u32 {
    if seed < TOTAL_CELLS && mask[seed] != 2 {
        return seed as u32;
    }
    let sx = seed % WORLD_WIDTH;
    let sy = seed / WORLD_WIDTH;
    for radius in 1..=20isize {
        let mut best: Option<(isize, usize)> = None;
        for dy in -radius..=radius {
            for dx in -radius..=radius {
                if dx.abs() != radius && dy.abs() != radius {
                    continue;
                }
                let x = sx as isize + dx;
                let y = sy as isize + dy;
                if x < 0 || y < 0 || x >= WORLD_WIDTH as isize || y >= WORLD_HEIGHT as isize {
                    continue;
                }
                let idx = y as usize * WORLD_WIDTH + x as usize;
                if mask[idx] != 2 {
                    let d2 = dx * dx + dy * dy;
                    if best.map_or(true, |(d, _)| d2 < d) {
                        best = Some((d2, idx));
                    }
                }
            }
        }
        if let Some((_, idx)) = best {
            return idx as u32;
        }
    }
    panic!("strategic site seed could not be snapped to authoritative land");
}

pub fn build_strategic_sites(mask: &[u8]) -> Vec<StrategicSiteInfo> {
    SITES
        .iter()
        .map(|seed| StrategicSiteInfo {
            id: seed.id.to_string(),
            name: seed.name.to_string(),
            kind: seed.kind.to_string(),
            cell_a: nearest_land(mask, lon_lat_cell(seed.a.0, seed.a.1)),
            cell_b: seed.b.map(|p| nearest_land(mask, lon_lat_cell(p.0, p.1))),
            strategic_value: seed.value,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world_map::generate_world_land_mask;

    #[test]
    fn every_strategic_anchor_is_authoritative_land() {
        let mask = generate_world_land_mask();
        let sites = build_strategic_sites(&mask);
        assert_eq!(sites.len(), 19);
        for site in sites {
            assert_ne!(mask[site.cell_a as usize], 2, "{} A is water", site.id);
            if let Some(b) = site.cell_b {
                assert_ne!(mask[b as usize], 2, "{} B is water", site.id);
            }
        }
    }
}
