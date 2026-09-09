use crate::simulation::Cell;
use crate::world_map::{TOTAL_CELLS, WORLD_HEIGHT, WORLD_WIDTH};
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashSet, VecDeque};

pub const ENABLE_COMPACT_PATCH_V2: bool = false;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PatchMode {
    NeutralExpansion,
    InitialTerritory,
    WarAdvance { defender: u8 },
}

#[derive(Debug, Clone)]
pub struct PatchResult {
    pub cells: Vec<u32>,
    pub actual_size: usize,
    pub perimeter: usize,
    pub compactness: f64,
    pub single_cell_tips: usize,
    pub longest_one_cell_corridor: usize,
    pub blocked_reason: Option<&'static str>,
}

#[inline]
pub fn tie_hash(seed: u64, cell_index: usize) -> u64 {
    let mut h = seed.wrapping_add((cell_index as u64).wrapping_mul(0x9E3779B97F4A7C15));
    h ^= h >> 30;
    h = h.wrapping_mul(0xBF58476D1CE4E5B9);
    h ^= h >> 27;
    h = h.wrapping_mul(0x94D049BB133111EB);
    h ^= h >> 31;
    h
}

#[derive(Clone, Copy, Eq, PartialEq)]
struct Candidate {
    score: i32,
    index: u32,
    tie_breaker: u64,
}
impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        self.score
            .cmp(&other.score)
            .then_with(|| self.tie_breaker.cmp(&other.tie_breaker))
            .then_with(|| self.index.cmp(&other.index))
    }
}
impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn cardinal(index: usize) -> [Option<usize>; 4] {
    let x = index % WORLD_WIDTH;
    let y = index / WORLD_WIDTH;
    [
        (y > 0).then_some(index - WORLD_WIDTH),
        (x + 1 < WORLD_WIDTH).then_some(index + 1),
        (y + 1 < WORLD_HEIGHT).then_some(index + WORLD_WIDTH),
        (x > 0).then_some(index - 1),
    ]
}

fn diagonal(index: usize) -> Vec<usize> {
    let x = index % WORLD_WIDTH;
    let y = index / WORLD_WIDTH;
    let mut out = Vec::with_capacity(4);
    for (dx, dy) in [(-1i32, -1i32), (1, -1), (-1, 1), (1, 1)] {
        let nx = x as i32 + dx;
        let ny = y as i32 + dy;
        if nx >= 0 && nx < WORLD_WIDTH as i32 && ny >= 0 && ny < WORLD_HEIGHT as i32 {
            out.push(ny as usize * WORLD_WIDTH + nx as usize);
        }
    }
    out
}

fn valid(cells: &[Cell], idx: usize, mode: PatchMode) -> bool {
    idx < TOTAL_CELLS
        && cells[idx].terrain_type == 0
        && match mode {
            PatchMode::WarAdvance { defender } => cells[idx].owner_id == defender,
            _ => cells[idx].owner_id == 0,
        }
}

fn creates_neutral_hole(cells: &[Cell], owner: u8, chosen: &HashSet<usize>, idx: usize) -> bool {
    for neighbor in cardinal(idx).into_iter().flatten() {
        if cells[neighbor].terrain_type != 0 || cells[neighbor].owner_id != 0 {
            continue;
        }
        let surrounded = cardinal(neighbor).into_iter().flatten().all(|adjacent| {
            adjacent == idx || chosen.contains(&adjacent) || cells[adjacent].owner_id == owner
        });
        if surrounded {
            return true;
        }
    }
    false
}

fn score_candidate_v1(
    cells: &[Cell],
    owner: u8,
    target: usize,
    idx: usize,
    patch: &HashSet<usize>,
) -> i32 {
    let tx = (target % WORLD_WIDTH) as i32;
    let ty = (target / WORLD_WIDTH) as i32;
    let x = (idx % WORLD_WIDTH) as i32;
    let y = (idx / WORLD_WIDTH) as i32;
    let distance = (x - tx).abs() + (y - ty).abs();
    let friendly_cardinal = cardinal(idx)
        .iter()
        .flatten()
        .filter(|&&n| cells[n].owner_id == owner || patch.contains(&n))
        .count() as i32;
    let friendly_diagonal = diagonal(idx)
        .iter()
        .filter(|&&n| cells[n].owner_id == owner || patch.contains(&n))
        .count() as i32;
    let exposed = 4 - friendly_cardinal;
    let corridor_penalty = if friendly_cardinal <= 1 && friendly_diagonal == 0 {
        120
    } else {
        0
    };
    1200 - distance * 18 + friendly_cardinal * 170 + friendly_diagonal * 35
        - exposed * 25
        - corridor_penalty
}

fn score_candidate_v2(
    cells: &[Cell],
    owner: u8,
    target: usize,
    idx: usize,
    patch: &HashSet<usize>,
    patch_area: usize,
    patch_perimeter: i32,
    patch_centroid_x: f64,
    patch_centroid_y: f64,
) -> i32 {
    let tx = (target % WORLD_WIDTH) as i32;
    let ty = (target / WORLD_WIDTH) as i32;
    let x = (idx % WORLD_WIDTH) as i32;
    let y = (idx / WORLD_WIDTH) as i32;

    // Direction alignment: distance to target (we want to expand outwards from seed, or towards target)
    // Actually, seed is target. Target distance:
    let target_dist = (x - tx).abs() + (y - ty).abs();

    let friendly_cardinal = cardinal(idx)
        .iter()
        .flatten()
        .filter(|&&n| cells[n].owner_id == owner || patch.contains(&n))
        .count() as i32;
    let friendly_diagonal = diagonal(idx)
        .iter()
        .filter(|&&n| cells[n].owner_id == owner || patch.contains(&n))
        .count() as i32;

    // EXACT Local Perimeter Delta
    // If we add this cell, perimeter changes by +4 - 2*friendly_cardinal
    let new_perimeter = patch_perimeter + 4 - 2 * friendly_cardinal;
    let new_area = patch_area + 1;
    let perimeter_ratio = new_perimeter as f64 / new_area as f64;

    // Radial Distance from Centroid
    let dx = x as f64 - patch_centroid_x;
    let dy = y as f64 - patch_centroid_y;
    let radial_dist = (dx * dx + dy * dy).sqrt();
    let expected_radius = (new_area as f64 / std::f64::consts::PI).sqrt();
    let radial_penalty = if radial_dist > expected_radius * 1.5 {
        ((radial_dist - expected_radius * 1.5) * 40.0) as i32
    } else {
        0
    };

    let single_cell_tip_penalty = if friendly_cardinal == 1 && friendly_diagonal <= 1 {
        150
    } else {
        0
    };

    let corridor_penalty = if friendly_cardinal <= 1 && friendly_diagonal == 0 {
        250
    } else {
        0
    };

    let hole_penalty = if perimeter_ratio > 3.0 && new_area > 4 {
        ((perimeter_ratio - 3.0) * 100.0) as i32
    } else {
        0
    };

    // Base score: 10000 to keep it positive
    // Rewards: friendly neighbors (compactness), low perimeter ratio
    // Penalties: distance to target, distance from centroid, tips, corridors, holes
    10000 - (target_dist * 10) + (friendly_cardinal * 200) + (friendly_diagonal * 40)
        - ((perimeter_ratio * 300.0) as i32)
        - radial_penalty
        - single_cell_tip_penalty
        - corridor_penalty
        - hole_penalty
}

pub fn generate_compact_patch(
    cells: &[Cell],
    owner: u8,
    target: u32,
    requested_size: usize,
    mode: PatchMode,
) -> PatchResult {
    let patch_seed = (owner as u64)
        .wrapping_mul(0x85EBCA6B)
        .wrapping_add(target as u64);
    generate_compact_patch_with_seed(cells, owner, target, requested_size, mode, patch_seed)
}

pub fn generate_compact_patch_with_seed(
    cells: &[Cell],
    owner: u8,
    target: u32,
    requested_size: usize,
    mode: PatchMode,
    patch_seed: u64,
) -> PatchResult {
    let target = target as usize;
    let fail = |reason| PatchResult {
        cells: vec![],
        actual_size: 0,
        perimeter: 0,
        compactness: 0.0,
        single_cell_tips: 0,
        longest_one_cell_corridor: 0,
        blocked_reason: Some(reason),
    };
    if !valid(cells, target, mode) {
        return fail("invalid_target");
    }
    if matches!(
        mode,
        PatchMode::NeutralExpansion | PatchMode::WarAdvance { .. }
    ) && !cardinal(target)
        .iter()
        .flatten()
        .any(|&n| cells[n].owner_id == owner)
    {
        return fail("not_adjacent");
    }
    let mut chosen = HashSet::new();
    let mut queued = HashSet::new();
    let mut heap = BinaryHeap::new();
    heap.push(Candidate {
        score: i32::MAX,
        index: target as u32,
        tie_breaker: tie_hash(patch_seed, target),
    });
    queued.insert(target);
    let mut patch_area = 0;
    let mut patch_perimeter = 0;
    let mut patch_centroid_x = 0.0;
    let mut patch_centroid_y = 0.0;

    while chosen.len() < requested_size {
        let Some(candidate) = heap.pop() else { break };
        let idx = candidate.index as usize;
        if !valid(cells, idx, mode) || chosen.contains(&idx) {
            continue;
        }
        if !chosen.is_empty()
            && !cardinal(idx)
                .iter()
                .flatten()
                .any(|n| chosen.contains(n) || cells[*n].owner_id == owner)
        {
            continue;
        }
        // Keep every paid/captured patch topologically open. A candidate that
        // would seal a neutral land pocket is rejected; the pocket remains a
        // legal future frontier instead of becoming an enclosed hole.
        if matches!(
            mode,
            PatchMode::NeutralExpansion | PatchMode::WarAdvance { .. }
        ) && creates_neutral_hole(cells, owner, &chosen, idx)
        {
            continue;
        }

        let cx = (idx % WORLD_WIDTH) as f64;
        let cy = (idx / WORLD_WIDTH) as f64;
        patch_centroid_x = (patch_centroid_x * patch_area as f64 + cx) / (patch_area + 1) as f64;
        patch_centroid_y = (patch_centroid_y * patch_area as f64 + cy) / (patch_area + 1) as f64;
        patch_area += 1;

        let friendly_cardinal = cardinal(idx)
            .iter()
            .flatten()
            .filter(|&&n| cells[n].owner_id == owner || chosen.contains(&n))
            .count() as i32;
        patch_perimeter += 4 - 2 * friendly_cardinal;

        chosen.insert(idx);
        for n in cardinal(idx).into_iter().flatten() {
            if valid(cells, n, mode) && !chosen.contains(&n) && queued.insert(n) {
                let score = if ENABLE_COMPACT_PATCH_V2 {
                    score_candidate_v2(
                        cells,
                        owner,
                        target,
                        n,
                        &chosen,
                        patch_area,
                        patch_perimeter,
                        patch_centroid_x,
                        patch_centroid_y,
                    )
                } else {
                    score_candidate_v1(cells, owner, target, n, &chosen)
                };
                heap.push(Candidate {
                    score,
                    index: n as u32,
                    tie_breaker: tie_hash(patch_seed, n),
                });
            }
        }
        // Re-score the small frontier after each claim; deterministic and cheap for 4-20 cells.
        let pending: Vec<_> = heap.drain().collect();
        for c in pending {
            let i = c.index as usize;
            let score = if ENABLE_COMPACT_PATCH_V2 {
                score_candidate_v2(
                    cells,
                    owner,
                    target,
                    i,
                    &chosen,
                    patch_area,
                    patch_perimeter,
                    patch_centroid_x,
                    patch_centroid_y,
                )
            } else {
                score_candidate_v1(cells, owner, target, i, &chosen)
            };
            heap.push(Candidate {
                score,
                index: c.index,
                tie_breaker: c.tie_breaker,
            });
        }
    }
    let perimeter = chosen
        .iter()
        .map(|&i| {
            cardinal(i)
                .iter()
                .filter(|n| n.map_or(true, |v| !chosen.contains(&v) && cells[v].owner_id != owner))
                .count()
        })
        .sum();
    let tips = chosen
        .iter()
        .filter(|&&i| {
            cardinal(i)
                .iter()
                .flatten()
                .filter(|n| chosen.contains(n) || cells[**n].owner_id == owner)
                .count()
                == 1
        })
        .count();
    let longest = longest_corridor(cells, owner, &chosen);
    let area = chosen.len();
    let compactness = if area > 0 {
        (perimeter * perimeter) as f64 / (std::f64::consts::PI * 4.0 * area as f64)
    } else {
        0.0
    };
    let mut result: Vec<u32> = chosen.into_iter().map(|i| i as u32).collect();
    result.sort_unstable();
    PatchResult {
        actual_size: result.len(),
        cells: result,
        perimeter,
        compactness,
        single_cell_tips: tips,
        longest_one_cell_corridor: longest,
        blocked_reason: None,
    }
}

fn longest_corridor(cells: &[Cell], owner: u8, patch: &HashSet<usize>) -> usize {
    let narrow: HashSet<usize> = patch
        .iter()
        .copied()
        .filter(|&i| {
            cardinal(i)
                .iter()
                .flatten()
                .filter(|n| patch.contains(n) || cells[**n].owner_id == owner)
                .count()
                <= 2
        })
        .collect();
    let mut seen = HashSet::new();
    let mut longest = 0;
    for &start in &narrow {
        if seen.contains(&start) {
            continue;
        }
        let mut q = VecDeque::from([start]);
        seen.insert(start);
        let mut count = 0;
        while let Some(i) = q.pop_front() {
            count += 1;
            for n in cardinal(i).into_iter().flatten() {
                if narrow.contains(&n) && seen.insert(n) {
                    q.push_back(n)
                }
            }
        }
        longest = longest.max(count);
    }
    longest
}

#[cfg(test)]
mod tests {
    use super::*;
    fn land() -> Vec<Cell> {
        (0..TOTAL_CELLS)
            .map(|_| Cell {
                owner_id: 0,
                terrain_type: 0,
                state_flags: 0,
            })
            .collect()
    }
    #[test]
    fn deterministic_compact_patch() {
        let mut c = land();
        let center = 256 * WORLD_WIDTH + 512;
        c[center].owner_id = 1;
        let target = center + 1;
        let a = generate_compact_patch(&c, 1, target as u32, 10, PatchMode::NeutralExpansion);
        let b = generate_compact_patch(&c, 1, target as u32, 10, PatchMode::NeutralExpansion);
        assert_eq!(a.cells, b.cells);
        assert_eq!(a.actual_size, 10);
        assert!(a.longest_one_cell_corridor <= 3);
    }
    #[test]
    fn never_crosses_water() {
        let mut c = land();
        let center = 256 * WORLD_WIDTH + 512;
        c[center].owner_id = 1;
        c[center + 2].terrain_type = 2;
        let p = generate_compact_patch(&c, 1, (center + 1) as u32, 10, PatchMode::NeutralExpansion);
        assert!(p.cells.iter().all(|&i| c[i as usize].terrain_type == 0));
    }

    #[test]
    fn compact_patch_synthetic_isotropy() {
        let mut c = land();
        let center_x = 512;
        let center_y = 256;
        let center = center_y * WORLD_WIDTH + center_x;
        c[center].owner_id = 1;
        let target = center + 1;

        let num_runs = 1000;
        let mut total_dx = 0.0;
        let mut total_dy = 0.0;
        let mut nw = 0;
        let mut ne = 0;
        let mut sw = 0;
        let mut se = 0;

        for seed in 0..num_runs {
            let res = generate_compact_patch_with_seed(
                &c,
                1,
                target as u32,
                12,
                PatchMode::NeutralExpansion,
                seed as u64,
            );
            assert_eq!(res.actual_size, 12);
            assert_eq!(res.blocked_reason, None);

            let mut sum_x = 0.0;
            let mut sum_y = 0.0;
            for &idx in &res.cells {
                let x = (idx as usize % WORLD_WIDTH) as i32;
                let y = (idx as usize / WORLD_WIDTH) as i32;
                sum_x += x as f64;
                sum_y += y as f64;

                let rel_x = x - (target as usize % WORLD_WIDTH) as i32;
                let rel_y = y - (target as usize / WORLD_WIDTH) as i32;
                if rel_x < 0 && rel_y <= 0 {
                    nw += 1;
                } else if rel_x >= 0 && rel_y < 0 {
                    ne += 1;
                } else if rel_x <= 0 && rel_y > 0 {
                    sw += 1;
                } else if rel_x > 0 && rel_y >= 0 {
                    se += 1;
                }
            }
            let mean_x = sum_x / res.actual_size as f64;
            let mean_y = sum_y / res.actual_size as f64;
            let target_x = (target % WORLD_WIDTH) as f64;
            let target_y = (target / WORLD_WIDTH) as f64;
            total_dx += mean_x - target_x;
            total_dy += mean_y - target_y;
        }

        let mean_drift_x = total_dx / num_runs as f64;
        let mean_drift_y = total_dy / num_runs as f64;

        assert!(
            mean_drift_x.abs() < 0.25,
            "Mean drift X is too large: {}",
            mean_drift_x
        );
        assert!(
            mean_drift_y.abs() < 0.25,
            "Mean drift Y is too large: {}",
            mean_drift_y
        );

        let total_quadrant_cells = (nw + ne + sw + se) as f64;
        let nw_pct = nw as f64 / total_quadrant_cells;
        let ne_pct = ne as f64 / total_quadrant_cells;
        let sw_pct = sw as f64 / total_quadrant_cells;
        let se_pct = se as f64 / total_quadrant_cells;

        assert!(
            nw_pct < 0.35,
            "NW quadrant is overrepresented: {:.1}%",
            nw_pct * 100.0
        );
        assert!(
            ne_pct > 0.15 && sw_pct > 0.15 && se_pct > 0.15,
            "Quadrant distribution unbalanced: NW={:.1}%, NE={:.1}%, SW={:.1}%, SE={:.1}%",
            nw_pct * 100.0,
            ne_pct * 100.0,
            sw_pct * 100.0,
            se_pct * 100.0
        );
    }
}
