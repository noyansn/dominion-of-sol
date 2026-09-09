use crate::simulation::Cell;
use crate::world_map::{TOTAL_CELLS, WORLD_HEIGHT, WORLD_WIDTH};
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet, VecDeque};
use std::sync::OnceLock;

#[derive(serde::Deserialize)]
struct MicroGapAdjacencyAsset {
    schema_version: u32,
    authority_grid_fnv1a32: u32,
    edges: Vec<MicroGapAdjacencyEdge>,
}

#[derive(serde::Deserialize)]
struct MicroGapAdjacencyEdge {
    cell_a: u32,
    cell_b: u32,
}

/// Canonical, auditable topology-only adjacency. The generated asset contains
/// only opaque-high-res local archipelago contacts that pass the distance,
/// explicit-strait, and strategic-anchor-separation rules. It never changes
/// terrain, ownership, or the visual map.
fn micro_gap_neighbors() -> &'static HashMap<usize, Vec<usize>> {
    static NEIGHBORS: OnceLock<HashMap<usize, Vec<usize>>> = OnceLock::new();
    NEIGHBORS.get_or_init(|| {
        let asset: MicroGapAdjacencyAsset =
            serde_json::from_str(include_str!("../assets/world_micro_gap_adjacency_v1.json"))
                .expect("world_micro_gap_adjacency_v1.json must be valid JSON");
        assert_eq!(
            asset.schema_version, 1,
            "unsupported micro-gap asset schema"
        );
        assert_eq!(
            asset.authority_grid_fnv1a32,
            fnv1a32(include_bytes!("../assets/world_grid.bin")),
            "micro-gap topology was generated for a different authority terrain grid"
        );

        let mut neighbors: HashMap<usize, Vec<usize>> = HashMap::new();
        for edge in asset.edges {
            let a = edge.cell_a as usize;
            let b = edge.cell_b as usize;
            assert!(
                a < TOTAL_CELLS && b < TOTAL_CELLS && a != b,
                "invalid micro-gap edge"
            );
            neighbors.entry(a).or_default().push(b);
            neighbors.entry(b).or_default().push(a);
        }
        for values in neighbors.values_mut() {
            values.sort_unstable();
            values.dedup();
        }
        neighbors
    })
}

fn fnv1a32(bytes: &[u8]) -> u32 {
    bytes.iter().fold(0x811c9dc5u32, |hash, &byte| {
        (hash ^ u32::from(byte)).wrapping_mul(0x01000193)
    })
}

#[cfg(test)]
pub fn vetted_micro_gap_edge_count() -> usize {
    micro_gap_neighbors().values().map(Vec::len).sum::<usize>() / 2
}

#[cfg(test)]
mod micro_gap_tests {
    use super::*;
    use crate::simulation::Simulation;

    #[test]
    fn generated_micro_gap_edges_are_land_only_and_symmetric() {
        let terrain = include_bytes!("../assets/world_grid.bin");
        assert_eq!(terrain.len(), TOTAL_CELLS);

        let cells: Vec<Cell> = terrain
            .iter()
            .map(|&terrain| Cell {
                owner_id: 0,
                terrain_type: if terrain == 0 { 0 } else { 2 },
                state_flags: 0,
            })
            .collect();

        assert_eq!(vetted_micro_gap_edge_count(), 86);
        for (&cell, neighbors) in micro_gap_neighbors() {
            assert_eq!(cells[cell].terrain_type, 0, "micro-gap source is not land");
            for &neighbor in neighbors {
                assert_eq!(
                    cells[neighbor].terrain_type, 0,
                    "micro-gap destination is not land"
                );
                assert!(
                    micro_gap_neighbors()[&neighbor]
                        .binary_search(&cell)
                        .is_ok(),
                    "micro-gap edge must be symmetric"
                );
                assert!(cells_have_legal_land_connection(&cells, cell, neighbor));
            }
        }
    }

    #[test]
    fn micro_gap_topology_never_authorizes_a_hostile_water_attack() {
        let (&source, neighbors) = micro_gap_neighbors()
            .iter()
            .find(|(source, neighbors)| {
                neighbors
                    .iter()
                    .any(|target| !Simulation::cardinal(**source).contains(target))
            })
            .expect("generated topology must contain a non-cardinal local-island edge");
        let target = *neighbors
            .iter()
            .find(|target| !Simulation::cardinal(source).contains(target))
            .expect("non-cardinal target");

        let mut sim = Simulation::new_standard(Some("roma"), 42);
        assert_eq!(sim.cells[source].terrain_type, 0);
        assert_eq!(sim.cells[target].terrain_type, 0);
        sim.cells[source].owner_id = 1;
        sim.cells[target].owner_id = 2;

        assert!(cells_have_legal_land_connection(&sim.cells, source, target));
        let attack =
            sim.process_attack_command_with_intent(1, source as u32, target as u32, None, 0.12);
        assert_eq!(
            attack.err().as_deref(),
            Some("no_shared_front"),
            "archipelago topology may simplify neutral traversal, never hostile cross-water combat"
        );
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpansionMode {
    Focus,
    Frontier,
}

#[derive(Debug, Clone)]
pub struct ExpansionPatch {
    pub cells: Vec<u32>,
    pub actual_size: usize,
    pub anchor_cell: u32,
    pub target_cell: u32,
    pub blocked_reason: Option<&'static str>,
}

#[derive(Clone, Copy, Eq, PartialEq)]
struct Candidate {
    score: i32,
    index: u32,
}

impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        self.score
            .cmp(&other.score)
            .then_with(|| other.index.cmp(&self.index))
    }
}

impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub fn cardinal(index: usize) -> [Option<usize>; 4] {
    let x = index % WORLD_WIDTH;
    let y = index / WORLD_WIDTH;
    [
        (y > 0).then(|| index - WORLD_WIDTH),
        Some(y * WORLD_WIDTH + (x + 1) % WORLD_WIDTH),
        (y + 1 < WORLD_HEIGHT).then(|| index + WORLD_WIDTH),
        Some(y * WORLD_WIDTH + (x + WORLD_WIDTH - 1) % WORLD_WIDTH),
    ]
}

pub fn diagonal(index: usize) -> Vec<usize> {
    let x = index % WORLD_WIDTH;
    let y = index / WORLD_WIDTH;
    let mut out = Vec::with_capacity(4);
    for dy in [-1i32, 1i32] {
        let ny = y as i32 + dy;
        if ny >= 0 && ny < WORLD_HEIGHT as i32 {
            for dx in [-1i32, 1i32] {
                let nx = (x as i32 + dx + WORLD_WIDTH as i32) % WORLD_WIDTH as i32;
                out.push(ny as usize * WORLD_WIDTH + nx as usize);
            }
        }
    }
    out
}

pub fn neighbors8(index: usize) -> [Option<usize>; 8] {
    let x = index % WORLD_WIDTH;
    let y = index / WORLD_WIDTH;
    let n = (y > 0).then(|| index - WORLD_WIDTH);
    let s = (y + 1 < WORLD_HEIGHT).then(|| index + WORLD_WIDTH);
    let e = Some(y * WORLD_WIDTH + (x + 1) % WORLD_WIDTH);
    let w = Some(y * WORLD_WIDTH + (x + WORLD_WIDTH - 1) % WORLD_WIDTH);
    let ne = (y > 0).then(|| (y - 1) * WORLD_WIDTH + (x + 1) % WORLD_WIDTH);
    let nw = (y > 0).then(|| (y - 1) * WORLD_WIDTH + (x + WORLD_WIDTH - 1) % WORLD_WIDTH);
    let se = (y + 1 < WORLD_HEIGHT).then(|| (y + 1) * WORLD_WIDTH + (x + 1) % WORLD_WIDTH);
    let sw =
        (y + 1 < WORLD_HEIGHT).then(|| (y + 1) * WORLD_WIDTH + (x + WORLD_WIDTH - 1) % WORLD_WIDTH);
    [n, e, s, w, ne, nw, se, sw]
}

pub fn wrapped_dx(x1: f64, x2: f64) -> f64 {
    let mut dx = x2 - x1;
    if dx > (WORLD_WIDTH as f64) / 2.0 {
        dx -= WORLD_WIDTH as f64;
    } else if dx < -(WORLD_WIDTH as f64) / 2.0 {
        dx += WORLD_WIDTH as f64;
    }
    dx
}

/// Canonical test for whether two cells have a legal contiguous land connection.
/// 1. Both cells must be land (terrain_type != 2).
/// 2. If identical: true.
/// 3. If cardinal neighbors (sharing a grid edge): true.
/// 4. If diagonal neighbors: ONLY true if at least ONE of the two intermediate
///    orthogonal cells is land (terrain_type != 2). If BOTH intermediate orthogonal
///    cells are water, this is a diagonal corner touch across water and does NOT
///    form a legal land connection (no fake bridges / corner crossing over water).
/// 5. Otherwise: false.
pub fn cells_have_legal_land_connection(cells: &[Cell], a: usize, b: usize) -> bool {
    if a >= TOTAL_CELLS || b >= TOTAL_CELLS {
        return false;
    }
    if cells[a].terrain_type == 2 || cells[b].terrain_type == 2 {
        return false;
    }
    if a == b {
        return true;
    }
    if micro_gap_neighbors()
        .get(&a)
        .is_some_and(|neighbors| neighbors.binary_search(&b).is_ok())
    {
        // This is an explicitly approved topology edge.  It is deliberately
        // checked before grid geometry because its endpoints may be separated
        // by an authority-water pixel.  No water cell is claimed or rendered.
        return true;
    }
    let ax = a % WORLD_WIDTH;
    let ay = a / WORLD_WIDTH;
    let bx = b % WORLD_WIDTH;
    let by = b / WORLD_WIDTH;

    let mut dx = (bx as i32) - (ax as i32);
    if dx > (WORLD_WIDTH as i32) / 2 {
        dx -= WORLD_WIDTH as i32;
    } else if dx < -(WORLD_WIDTH as i32) / 2 {
        dx += WORLD_WIDTH as i32;
    }
    let dy = (by as i32) - (ay as i32);

    if (dx.abs() == 1 && dy == 0) || (dx == 0 && dy.abs() == 1) {
        return true;
    }

    if dx.abs() == 1 && dy.abs() == 1 {
        // Intermediate orthogonal cell 1: (bx, ay)
        let i1 = ay * WORLD_WIDTH + bx;
        // Intermediate orthogonal cell 2: (ax, by)
        let i2 = by * WORLD_WIDTH + ax;
        // At least one intermediate cell must be land for continuity
        return cells[i1].terrain_type != 2 || cells[i2].terrain_type != 2;
    }

    false
}

/// Returns all cells in the 8-neighborhood that have a legal contiguous land connection to `index`.
pub fn legal_land_neighbors(cells: &[Cell], index: usize) -> Vec<usize> {
    let mut out = Vec::with_capacity(8);
    for n in neighbors8(index).into_iter().flatten() {
        if cells_have_legal_land_connection(cells, index, n) {
            out.push(n);
        }
    }
    if let Some(extra_neighbors) = micro_gap_neighbors().get(&index) {
        for &neighbor in extra_neighbors {
            if cells_have_legal_land_connection(cells, index, neighbor) && !out.contains(&neighbor)
            {
                out.push(neighbor);
            }
        }
    }
    out
}

/// Resolves the best frontier anchor cell and path from target to friendly territory.
/// Returns (anchor_cell, neutral_path_from_anchor_to_target).
pub fn resolve_focus_anchor_and_path(
    cells: &[Cell],
    faction_id: u8,
    target_cell: u32,
) -> Option<(u32, Vec<u32>)> {
    let target = target_cell as usize;
    if target >= TOTAL_CELLS || cells[target].terrain_type == 2 || cells[target].owner_id != 0 {
        return None;
    }

    // If target is already adjacent to faction via legal land connection, target itself is the anchor
    let is_adjacent = legal_land_neighbors(cells, target)
        .into_iter()
        .any(|n| cells[n].owner_id == faction_id);

    if is_adjacent {
        return Some((target_cell, vec![target_cell]));
    }

    // BFS through contiguous neutral land starting at target
    let mut visited = HashSet::new();
    let mut parent = std::collections::HashMap::new();
    let mut queue = VecDeque::new();

    queue.push_back(target);
    visited.insert(target);

    let mut best_anchor: Option<(usize, f64)> = None;
    let tx = (target % WORLD_WIDTH) as f64;
    let ty = (target / WORLD_WIDTH) as f64;
    let mut steps = 60_000;

    while let Some(curr) = queue.pop_front() {
        steps -= 1;
        if steps == 0 {
            break;
        }

        // Check if curr is legally land-connected to friendly territory
        let touches_friendly = legal_land_neighbors(cells, curr)
            .into_iter()
            .any(|n| cells[n].owner_id == faction_id);

        if touches_friendly {
            let cx = (curr % WORLD_WIDTH) as f64;
            let cy = (curr / WORLD_WIDTH) as f64;
            let dx = wrapped_dx(tx, cx);
            let dy = cy - ty;
            let dist_sq = dx * dx + dy * dy;

            match best_anchor {
                None => {
                    best_anchor = Some((curr, dist_sq));
                    // First found in BFS is minimal neutral graph distance.
                    break;
                }
                Some((_, best_d)) => {
                    if dist_sq < best_d {
                        best_anchor = Some((curr, dist_sq));
                    }
                }
            }
        }

        for n in legal_land_neighbors(cells, curr) {
            if cells[n].terrain_type == 0 && cells[n].owner_id == 0 && visited.insert(n) {
                parent.insert(n, curr);
                queue.push_back(n);
            }
        }
    }

    let anchor = match best_anchor {
        Some((a, _)) => a,
        None => {
            // Target cannot be reached through contiguous legal neutral land
            return None;
        }
    };

    // Reconstruct path from anchor to target
    let mut path = Vec::new();
    let mut curr = anchor;
    path.push(curr as u32);
    while curr != target {
        if let Some(&p) = parent.get(&curr) {
            curr = p;
            path.push(curr as u32);
        } else {
            break;
        }
    }

    Some((anchor as u32, path))
}

/// Generates a bounded local expansion corridor for FOCUS mode.
/// Ensures NO whole-border activation occurs.
/// Determines the number of cells that can be claimed for a given committed Population.
/// Strictly monotonic with diminishing returns. The coefficients are tuned so
/// a normal 1,200 Population opening creates a readable 7-cell local lobe,
/// while very large commitments remain sublinear rather than crossing a map.
pub fn cells_for_commitment(commit_pop: f64) -> usize {
    if commit_pop <= 0.0 {
        return 0;
    }
    let a = crate::balance::EXPANSION_COST_QUADRATIC;
    let b = crate::balance::EXPANSION_COST_LINEAR;
    let disc = b * b + 4.0 * a * commit_pop;
    let n = (-b + disc.sqrt()) / (2.0 * a);
    n.max(0.0).floor() as usize
}

/// Returns the friendly cell that should define a local FOCUS direction when
/// the requested target is already on the sovereign frontier.  The expansion
/// anchor remains the requested neutral cell for compatibility with the
/// command/result contract; only the direction origin is corrected here.
///
/// This must not average the whole local sovereign shape: doing so lets an
/// irregular frontier rotate an otherwise explicit click direction (for
/// example, an east target becoming a north-east wave).
pub fn focus_direction_origin(cells: &[Cell], owner: u8, target: usize) -> usize {
    let x = target % WORLD_WIDTH;
    let y = target / WORLD_WIDTH;
    // Keep the same deterministic cardinal preference used by the browser's
    // local target resolver before considering diagonal support cells.
    let offsets = [
        (1i32, 0i32),
        (-1, 0),
        (0, 1),
        (0, -1),
        (1, 1),
        (-1, 1),
        (1, -1),
        (-1, -1),
    ];
    for (dx, dy) in offsets {
        let nx = (x as i32 + dx).rem_euclid(WORLD_WIDTH as i32) as usize;
        let ny = y as i32 + dy;
        if ny < 0 || ny >= WORLD_HEIGHT as i32 {
            continue;
        }
        let candidate = ny as usize * WORLD_WIDTH + nx;
        if cells[candidate].owner_id == owner
            && cells_have_legal_land_connection(cells, target, candidate)
        {
            return candidate;
        }
    }
    target
}

/// Returns the direction origin and normalized click direction used by the
/// authoritative FOCUS patch generator and its ordering pass.
pub fn focus_direction_for_anchor(
    cells: &[Cell],
    owner: u8,
    anchor: usize,
    target: usize,
) -> (usize, f64, f64) {
    let origin = if anchor == target {
        focus_direction_origin(cells, owner, target)
    } else {
        anchor
    };
    let ax = (origin % WORLD_WIDTH) as f64;
    let ay = (origin / WORLD_WIDTH) as f64;
    let tx = (target % WORLD_WIDTH) as f64;
    let ty = (target / WORLD_WIDTH) as f64;
    let dx = wrapped_dx(ax, tx);
    let dy = ty - ay;
    let length = (dx * dx + dy * dy).sqrt();
    if length > 1e-5 {
        (origin, dx / length, dy / length)
    } else {
        (origin, 0.0, -1.0)
    }
}

pub fn generate_focus_corridor_patch(
    cells: &[Cell],
    owner: u8,
    target: u32,
    requested_size: usize,
) -> ExpansionPatch {
    if requested_size == 0 {
        return ExpansionPatch {
            cells: vec![],
            actual_size: 0,
            anchor_cell: target,
            target_cell: target,
            blocked_reason: None,
        };
    }

    let fail = |reason| ExpansionPatch {
        cells: vec![],
        actual_size: 0,
        anchor_cell: target,
        target_cell: target,
        blocked_reason: Some(reason),
    };

    let (anchor, _path) = match resolve_focus_anchor_and_path(cells, owner, target) {
        Some(res) => res,
        None => return fail("no_reachable_frontier"),
    };

    let anchor_idx = anchor as usize;
    let target_idx = target as usize;

    let (direction_origin, ux, uy) =
        focus_direction_for_anchor(cells, owner, anchor_idx, target_idx);
    let ax = (direction_origin % WORLD_WIDTH) as f64;
    let ay = (direction_origin / WORLD_WIDTH) as f64;

    let mut chosen = HashSet::new();
    let mut queued = HashSet::new();
    let mut heap = BinaryHeap::new();

    // Start from anchor
    heap.push(Candidate {
        score: i32::MAX,
        index: anchor,
    });
    queued.insert(anchor_idx);

    while chosen.len() < requested_size {
        let Some(candidate) = heap.pop() else { break };
        let idx = candidate.index as usize;

        if cells[idx].terrain_type != 0 || cells[idx].owner_id != 0 || chosen.contains(&idx) {
            continue;
        }

        // Must connect to friendly territory or already-chosen cells via legal contiguous land
        let is_connected = legal_land_neighbors(cells, idx).into_iter().any(|n| {
            (chosen.contains(&n) || cells[n].owner_id == owner) && cells[n].terrain_type == 0
        });
        if !is_connected {
            continue;
        }

        // Local corridor check
        let cx = (idx % WORLD_WIDTH) as f64;
        let cy = (idx / WORLD_WIDTH) as f64;
        let vx = wrapped_dx(ax, cx);
        let vy = cy - ay;
        let v_len = (vx * vx + vy * vy).sqrt();

        let proj_forward = vx * ux + vy * uy;
        let perp_dist = (vx * (-uy) + vy * ux).abs();

        // Strict corridor boundaries:
        // 1. Angular cone: beyond immediate 1.8-cell radius, exclude outside +/- 66°
        if v_len > 1.8 && (proj_forward <= 0.0 || (proj_forward / v_len) < 0.40) {
            continue;
        }

        // Small FOCUS orders still need shoulders. The previous sub-cell
        // lateral limit forced every fresh 10-15% order into a one-cell line;
        // the SDF then faithfully rendered that authoritative line as a
        // rectangular bar. A narrow, widening lobe preserves direction while
        // giving even a four-cell opening a readable local front.
        let tight_focus = requested_size <= 6;
        let max_wedge_width = if tight_focus {
            1.50
        } else {
            (3.5 + 0.08 * (requested_size as f64)).min(7.0)
        };
        let allowed_width = if tight_focus {
            (0.90 + 0.20 * proj_forward.max(0.0)).min(max_wedge_width)
        } else {
            (2.2 + 0.25 * proj_forward.max(0.0)).min(max_wedge_width)
        };
        if proj_forward < -1.0 || perp_dist > allowed_width {
            continue;
        }

        chosen.insert(idx);

        // Queue adjacent valid neutral cells within corridor via legal contiguous land
        for n in legal_land_neighbors(cells, idx) {
            if cells[n].terrain_type == 0 && cells[n].owner_id == 0 && !chosen.contains(&n) {
                let n_cx = (n % WORLD_WIDTH) as f64;
                let n_cy = (n / WORLD_WIDTH) as f64;
                let n_vx = wrapped_dx(ax, n_cx);
                let n_vy = n_cy - ay;
                let n_v_len = (n_vx * n_vx + n_vy * n_vy).sqrt();
                let n_proj = n_vx * ux + n_vy * uy;
                let n_perp = (n_vx * (-uy) + n_vy * ux).abs();

                let n_allowed_lat = if tight_focus {
                    (0.90 + 0.20 * n_proj.max(0.0)).min(max_wedge_width)
                } else {
                    (2.2 + 0.25 * n_proj.max(0.0)).min(max_wedge_width)
                };
                if n_v_len > 1.8 && (n_proj <= 0.0 || (n_proj / n_v_len) < 0.40) {
                    continue;
                }
                if n_proj < -1.0 || n_perp > n_allowed_lat {
                    continue;
                }

                if queued.insert(n) {
                    let friendly_card = cardinal(n)
                        .into_iter()
                        .flatten()
                        .filter(|&adj| cells[adj].owner_id == owner || chosen.contains(&adj))
                        .count() as i32;

                    let friendly_legal = legal_land_neighbors(cells, n)
                        .into_iter()
                        .filter(|&adj| cells[adj].owner_id == owner || chosen.contains(&adj))
                        .count() as i32;
                    let friendly_diag = friendly_legal - friendly_card;

                    // Local front support & compactness: strong bonus for filling adjacent front mass
                    let support_bonus = friendly_card * 240 + friendly_diag * 90;

                    // Directional alignment
                    let cos_theta = if n_v_len > 1e-4 {
                        (n_proj / n_v_len).clamp(-1.0, 1.0)
                    } else {
                        1.0
                    };
                    let alignment_bonus = (cos_theta * 180.0) as i32;

                    // Forward progress bonus (mild to avoid overpowering front support)
                    let forward_progress = (n_proj * 60.0) as i32;

                    // Progressive depth cost: deeper expansion becomes progressively more expensive / scores lower
                    let depth_cost = if n_proj > 1.5 {
                        ((n_proj - 1.5).powf(1.35) * 85.0) as i32
                    } else {
                        0
                    };

                    // Gentle lateral centering penalty (keeps expansion focused in the lobe without crushing width)
                    let lateral_penalty = (n_perp * 35.0) as i32;

                    // Small deterministic irregularity based on cell coordinate hash
                    let irregularity = (((n as u32).wrapping_mul(2_654_435_761)
                        ^ (owner as u32).wrapping_mul(805_306_457))
                        % 37) as i32;

                    let score =
                        10_000 + support_bonus + alignment_bonus + forward_progress + irregularity
                            - depth_cost
                            - lateral_penalty;

                    heap.push(Candidate {
                        score,
                        index: n as u32,
                    });
                }
            }
        }
    }

    let mut result_cells: Vec<u32> = chosen.into_iter().map(|c| c as u32).collect();
    sort_focus_patch_topologically(
        cells,
        owner,
        anchor,
        direction_origin as u32,
        ux,
        uy,
        &mut result_cells,
    );

    ExpansionPatch {
        actual_size: result_cells.len(),
        cells: result_cells,
        anchor_cell: anchor,
        target_cell: target,
        blocked_reason: None,
    }
}

/// Sorts patch cells into strict topological wavefront layers starting from sovereign border / anchor.
/// Guarantees that for every cell c at index i, its parent connecting it to the sovereign border
/// appears at an index j < i.
pub fn sort_patch_topologically(
    cells: &[Cell],
    owner: u8,
    anchor: u32,
    patch_cells: &mut Vec<u32>,
) {
    if patch_cells.len() <= 1 {
        return;
    }
    let patch_set: HashSet<u32> = patch_cells.iter().copied().collect();
    let mut ordered: Vec<u32> = Vec::with_capacity(patch_cells.len());
    let mut visited: HashSet<u32> = HashSet::new();
    let mut queue: VecDeque<u32> = VecDeque::new();

    // Layer 0: Anchor first, followed by any other patch cells directly adjacent to friendly territory
    if patch_set.contains(&anchor) {
        queue.push_back(anchor);
        visited.insert(anchor);
    }
    for &c in patch_cells.iter() {
        if c != anchor && !visited.contains(&c) {
            let touches_friendly = legal_land_neighbors(cells, c as usize)
                .into_iter()
                .any(|adj| cells[adj].owner_id == owner);
            if touches_friendly {
                queue.push_back(c);
                visited.insert(c);
            }
        }
    }

    // BFS through patch cells
    while let Some(curr) = queue.pop_front() {
        ordered.push(curr);
        for n in legal_land_neighbors(cells, curr as usize) {
            let n_u32 = n as u32;
            if patch_set.contains(&n_u32) && visited.insert(n_u32) {
                queue.push_back(n_u32);
            }
        }
    }

    // A generated patch is not allowed to retain an unreachable tail. The
    // previous fallback appended those cells anyway, which made a patch look
    // connected in generation tests while the final owner grid could split
    // after legality/budget filtering. Dropping the unreachable tail is the
    // source-level prevention; no visual bridge or nearest-owner repair is
    // permitted.
    *patch_cells = ordered;
}

/// Orders an already-selected FOCUS patch by connected directional layers.
/// The old generic BFS used the fixed neighbour order (north first), which
/// could make a correct directional patch arrive as a northward tower. This
/// pass preserves legal parent connectivity while selecting the most forward
/// available authorized cell first. It changes ordering only; it never adds
/// or removes a cell.
pub fn sort_focus_patch_topologically(
    cells: &[Cell],
    owner: u8,
    anchor: u32,
    direction_origin: u32,
    ux: f64,
    uy: f64,
    patch_cells: &mut Vec<u32>,
) {
    if patch_cells.len() <= 1 {
        return;
    }
    let patch_set: HashSet<u32> = patch_cells.iter().copied().collect();
    let mut remaining = patch_set.clone();
    let mut ordered: Vec<u32> = Vec::with_capacity(patch_cells.len());

    if remaining.remove(&anchor) {
        ordered.push(anchor);
    }

    while !remaining.is_empty() {
        let mut best: Option<(u32, f64, f64)> = None;
        for &candidate in &remaining {
            let connected = legal_land_neighbors(cells, candidate as usize)
                .into_iter()
                .any(|adj| cells[adj].owner_id == owner || ordered.contains(&(adj as u32)));
            if !connected {
                continue;
            }

            let cx = (candidate as usize % WORLD_WIDTH) as f64;
            let cy = (candidate as usize / WORLD_WIDTH) as f64;
            let ox = (direction_origin as usize % WORLD_WIDTH) as f64;
            let oy = (direction_origin as usize / WORLD_WIDTH) as f64;
            let vx = wrapped_dx(ox, cx);
            let vy = cy - oy;
            let projection = vx * ux + vy * uy;
            let lateral = (vx * (-uy) + vy * ux).abs();
            let replace = best
                .map(|(best_cell, best_projection, best_lateral)| {
                    projection > best_projection + 1e-9
                        || ((projection - best_projection).abs() <= 1e-9
                            && (lateral < best_lateral - 1e-9
                                || ((lateral - best_lateral).abs() <= 1e-9
                                    && candidate < best_cell)))
                })
                .unwrap_or(true);
            if replace {
                best = Some((candidate, projection, lateral));
            }
        }

        let Some((candidate, _, _)) = best else { break };
        remaining.remove(&candidate);
        ordered.push(candidate);
    }

    // A generated patch is not allowed to retain an unreachable tail.
    *patch_cells = ordered;
}

/// Generates distributed expansion across the legal neutral frontier for FRONTIER mode.
/// Evenly distributes finite budget around perimeter while smoothing shapes and filling concavities.
pub fn generate_frontier_distribution_patch(
    cells: &[Cell],
    owner: u8,
    requested_size: usize,
) -> ExpansionPatch {
    generate_frontier_distribution_patch_targeted(cells, owner, requested_size, None)
}

pub fn generate_frontier_distribution_patch_targeted(
    cells: &[Cell],
    owner: u8,
    requested_size: usize,
    target: Option<u32>,
) -> ExpansionPatch {
    let mut chosen = HashSet::new();

    // Compute territory centroid for radial compactness
    let mut sum_x = 0.0;
    let mut sum_y = 0.0;
    let mut count = 0.0;
    for (idx, cell) in cells.iter().enumerate() {
        if cell.owner_id == owner {
            sum_x += (idx % WORLD_WIDTH) as f64;
            sum_y += (idx / WORLD_WIDTH) as f64;
            count += 1.0;
        }
    }
    let (cx, cy) = if count > 0.0 {
        (sum_x / count, sum_y / count)
    } else {
        (0.0, 0.0)
    };

    // Find all legal frontier neutral cells (connected to owner via legal contiguous land)
    let mut candidates = Vec::new();
    for (idx, cell) in cells.iter().enumerate() {
        if cell.terrain_type == 0 && cell.owner_id == 0 {
            let friendly_card = cardinal(idx)
                .into_iter()
                .flatten()
                .filter(|&n| cells[n].owner_id == owner)
                .count();
            let friendly_legal = legal_land_neighbors(cells, idx)
                .into_iter()
                .filter(|&n| cells[n].owner_id == owner)
                .count();
            if friendly_legal > 0 {
                candidates.push((idx, friendly_card, friendly_legal - friendly_card));
            }
        }
    }

    if candidates.is_empty() {
        return ExpansionPatch {
            cells: vec![],
            actual_size: 0,
            anchor_cell: 0,
            target_cell: target.unwrap_or(0),
            blocked_reason: Some("no_frontier"),
        };
    }

    let mut heap = BinaryHeap::new();
    let mut best_score: std::collections::HashMap<usize, i32> = std::collections::HashMap::new();

    let compute_score = |c_idx: usize, chosen_set: &HashSet<usize>| -> i32 {
        let is_direct_border = legal_land_neighbors(cells, c_idx)
            .into_iter()
            .any(|n| cells[n].owner_id == owner);
        let depth_penalty = if is_direct_border { 0 } else { 2000 };

        let friendly_card = cardinal(c_idx)
            .into_iter()
            .flatten()
            .filter(|&n| cells[n].owner_id == owner || chosen_set.contains(&n))
            .count() as i32;
        let friendly_legal = legal_land_neighbors(cells, c_idx)
            .into_iter()
            .filter(|&n| cells[n].owner_id == owner || chosen_set.contains(&n))
            .count() as i32;
        let friendly_diag = friendly_legal - friendly_card;

        let cell_x = (c_idx % WORLD_WIDTH) as f64;
        let cell_y = (c_idx / WORLD_WIDTH) as f64;
        let dist = wrapped_dx(cx, cell_x).hypot(cell_y - cy);
        let dist_penalty = (dist * 10.0).min(500.0) as i32;

        -depth_penalty + friendly_card * 300 + friendly_diag * 120 - dist_penalty
    };

    for &(c_idx, _, _) in &candidates {
        let score = compute_score(c_idx, &chosen);
        best_score.insert(c_idx, score);
        heap.push(Candidate {
            score,
            index: c_idx as u32,
        });
    }

    while chosen.len() < requested_size {
        let Some(candidate) = heap.pop() else { break };
        let idx = candidate.index as usize;

        if cells[idx].terrain_type != 0 || cells[idx].owner_id != 0 || chosen.contains(&idx) {
            continue;
        }
        if candidate.score < *best_score.get(&idx).unwrap_or(&i32::MIN) {
            continue;
        }

        chosen.insert(idx);

        // Queue adjacent frontier cells via legal contiguous land
        for n in legal_land_neighbors(cells, idx) {
            if cells[n].terrain_type == 0 && cells[n].owner_id == 0 && !chosen.contains(&n) {
                let score = compute_score(n, &chosen);
                if score > *best_score.get(&n).unwrap_or(&i32::MIN) {
                    best_score.insert(n, score);
                    heap.push(Candidate {
                        score,
                        index: n as u32,
                    });
                }
            }
        }
    }

    let mut result_cells: Vec<u32> = chosen.into_iter().map(|c| c as u32).collect();
    let mut depth: std::collections::HashMap<u32, usize> = std::collections::HashMap::new();
    let mut q = std::collections::VecDeque::new();
    for &c in &result_cells {
        if legal_land_neighbors(cells, c as usize)
            .into_iter()
            .any(|n| cells[n].owner_id == owner)
        {
            depth.insert(c, 0);
            q.push_back(c);
        }
    }
    while let Some(curr) = q.pop_front() {
        let d = *depth.get(&curr).unwrap_or(&0);
        for n in legal_land_neighbors(cells, curr as usize) {
            let nu = n as u32;
            if result_cells.contains(&nu) && !depth.contains_key(&nu) {
                depth.insert(nu, d + 1);
                q.push_back(nu);
            }
        }
    }
    result_cells.sort_by_key(|c| (depth.get(c).copied().unwrap_or(usize::MAX), *c));

    let anchor = if let Some(t) = target {
        let tx = (t as usize % WORLD_WIDTH) as f64;
        let ty = (t as usize / WORLD_WIDTH) as f64;
        candidates
            .iter()
            .min_by(|a, b| {
                let ax = (a.0 % WORLD_WIDTH) as f64;
                let ay = (a.0 / WORLD_WIDTH) as f64;
                let bx = (b.0 % WORLD_WIDTH) as f64;
                let by = (b.0 / WORLD_WIDTH) as f64;
                let da = wrapped_dx(ax, tx).hypot(ay - ty);
                let db = wrapped_dx(bx, tx).hypot(by - ty);
                da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|c| c.0 as u32)
            .unwrap_or(candidates[0].0 as u32)
    } else {
        candidates[0].0 as u32
    };

    ExpansionPatch {
        actual_size: result_cells.len(),
        cells: result_cells,
        anchor_cell: anchor,
        target_cell: target.unwrap_or(anchor),
        blocked_reason: None,
    }
}

#[derive(Debug, Clone, Default)]
pub struct ShapeMetrics {
    pub total_cells: usize,
    pub perimeter_edges: usize,
    pub perimeter_to_area_ratio: f64,
    pub single_cell_tendrils: usize,
    pub internal_neutral_holes: usize,
}

pub fn measure_shape_quality(cells: &[Cell], owner: u8) -> ShapeMetrics {
    let owned_indices: HashSet<usize> = cells
        .iter()
        .enumerate()
        .filter(|&(_, c)| c.owner_id == owner)
        .map(|(i, _)| i)
        .collect();

    let total_cells = owned_indices.len();
    if total_cells == 0 {
        return ShapeMetrics::default();
    }

    let mut perimeter_edges = 0;
    let mut single_cell_tendrils = 0;

    for &idx in &owned_indices {
        let friendly_cardinal = cardinal(idx)
            .into_iter()
            .flatten()
            .filter(|n| owned_indices.contains(n))
            .count();

        perimeter_edges += 4 - friendly_cardinal;

        // A cell with only 1 friendly cardinal neighbor and 0 diagonal friendly neighbors
        // is a single-cell tendril/spike
        if friendly_cardinal <= 1 {
            let friendly_diagonal = diagonal(idx)
                .into_iter()
                .filter(|n| owned_indices.contains(n))
                .count();
            if friendly_diagonal == 0 {
                single_cell_tendrils += 1;
            }
        }
    }

    let perimeter_to_area_ratio = perimeter_edges as f64 / total_cells as f64;

    // Check for internal neutral holes enclosed completely by owner
    let mut internal_neutral_holes = 0;
    for (idx, cell) in cells.iter().enumerate() {
        if cell.terrain_type == 0 && cell.owner_id == 0 {
            let surrounded = cardinal(idx)
                .into_iter()
                .flatten()
                .all(|n| owned_indices.contains(&n));
            if surrounded {
                internal_neutral_holes += 1;
            }
        }
    }

    ShapeMetrics {
        total_cells,
        perimeter_edges,
        perimeter_to_area_ratio,
        single_cell_tendrils,
        internal_neutral_holes,
    }
}
