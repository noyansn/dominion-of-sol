use std::fs::File;
use std::io::{Read, Write};
use serde_json::Value;

const SIM_W: usize = 1024;
const SIM_H: usize = 512;
const EPSILON: f64 = 1e-4;
const SAMPLES_PER_EDGE: usize = 64;
const MIN_CONSECUTIVE: usize = 2;

struct BBox {
    min_x: f64,
    min_y: f64,
    max_x: f64,
    max_y: f64,
}

struct Polygon {
    outer: Vec<[f64; 2]>,
    holes: Vec<Vec<[f64; 2]>>,
    bbox: BBox,
}

impl Polygon {
    fn from_json(val: &Value) -> Option<Self> {
        let outer_val = val.get("outer")?.as_array()?;
        let mut outer = Vec::new();
        let mut min_x = 9999.0;
        let mut min_y = 9999.0;
        let mut max_x = -9999.0;
        let mut max_y = -9999.0;
        for p in outer_val {
            let p_arr = p.as_array()?;
            let x = p_arr[0].as_f64()?;
            let y = p_arr[1].as_f64()?;
            if x < min_x { min_x = x; }
            if x > max_x { max_x = x; }
            if y < min_y { min_y = y; }
            if y > max_y { max_y = y; }
            outer.push([x, y]);
        }
        
        let mut holes = Vec::new();
        if let Some(h_val) = val.get("holes") {
            if let Some(h_arr) = h_val.as_array() {
                for h in h_arr {
                    let mut hole = Vec::new();
                    if let Some(pts) = h.as_array() {
                        for p in pts {
                            let p_arr = p.as_array().unwrap();
                            hole.push([p_arr[0].as_f64().unwrap(), p_arr[1].as_f64().unwrap()]);
                        }
                    }
                    holes.push(hole);
                }
            }
        }
        Some(Self { outer, holes, bbox: BBox { min_x, min_y, max_x, max_y } })
    }
}

fn point_in_poly(x: f64, y: f64, poly: &[[f64; 2]]) -> bool {
    let mut inside = false;
    let mut j = poly.len() - 1;
    for i in 0..poly.len() {
        let xi = poly[i][0]; let yi = poly[i][1];
        let xj = poly[j][0]; let yj = poly[j][1];
        if ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
        j = i;
    }
    inside
}

fn is_point_in_canonical_land(x: f64, y: f64, lands: &[Polygon], waters: &[Polygon], land_grid: &[Vec<usize>], water_grid: &[Vec<usize>]) -> bool {
    let mut wx = x;
    if wx < 0.0 { wx += SIM_W as f64; }
    if wx >= SIM_W as f64 { wx -= SIM_W as f64; }
    
    let cx = wx.floor() as usize;
    let cy = y.floor() as usize;
    if cy >= SIM_H { return false; }
    
    let cell_idx = cy * SIM_W + cx;
    
    let mut in_land = false;
    for &idx in &land_grid[cell_idx] {
        let l = &lands[idx];
        if point_in_poly(wx, y, &l.outer) {
            let mut in_hole = false;
            for h in &l.holes {
                if point_in_poly(wx, y, h) {
                    in_hole = true;
                    break;
                }
            }
            if !in_hole {
                in_land = true;
                break;
            }
        }
    }
    
    if !in_land { return false; }
    
    for &idx in &water_grid[cell_idx] {
        let w = &waters[idx];
        if point_in_poly(wx, y, &w.outer) {
            let mut in_w_hole = false;
            for h in &w.holes {
                if point_in_poly(wx, y, h) {
                    in_w_hole = true;
                    break;
                }
            }
            if !in_w_hole {
                return false;
            }
        }
    }
    true
}

fn main() {
    println!("Reading simGrid...");
    let mut sim_grid = vec![0u8; SIM_W * SIM_H];
    File::open("../server/assets/world_grid_candidate_v5_support.bin").unwrap().read_exact(&mut sim_grid).unwrap();
    
    println!("Reading canonical...");
    let mut canonical_str = String::new();
    File::open("../client/src/assets/canonical_geography.json").unwrap().read_to_string(&mut canonical_str).unwrap();
    let v: Value = serde_json::from_str(&canonical_str).unwrap();
    
    let mut lands = Vec::new();
    for l in v["land"].as_array().unwrap() {
        lands.push(Polygon::from_json(l).unwrap());
    }
    let mut waters = Vec::new();
    for w in v["waterBodies"].as_array().unwrap() {
        waters.push(Polygon::from_json(w).unwrap());
    }
    
    println!("Building spatial index...");
    let mut land_grid = vec![Vec::new(); SIM_W * SIM_H];
    for (i, l) in lands.iter().enumerate() {
        let sx = (l.bbox.min_x.floor() as isize).max(0) as usize;
        let ex = (l.bbox.max_x.floor() as isize).min(SIM_W as isize - 1) as usize;
        let sy = (l.bbox.min_y.floor() as isize).max(0) as usize;
        let ey = (l.bbox.max_y.floor() as isize).min(SIM_H as isize - 1) as usize;
        for y in sy..=ey {
            for x in sx..=ex {
                land_grid[y * SIM_W + x].push(i);
            }
        }
    }
    
    let mut water_grid = vec![Vec::new(); SIM_W * SIM_H];
    for (i, w) in waters.iter().enumerate() {
        let sx = (w.bbox.min_x.floor() as isize).max(0) as usize;
        let ex = (w.bbox.max_x.floor() as isize).min(SIM_W as isize - 1) as usize;
        let sy = (w.bbox.min_y.floor() as isize).max(0) as usize;
        let ey = (w.bbox.max_y.floor() as isize).min(SIM_H as isize - 1) as usize;
        for y in sy..=ey {
            for x in sx..=ex {
                water_grid[y * SIM_W + x].push(i);
            }
        }
    }
    
    println!("Processing edges...");
    let mut edge_mask = vec![0u8; SIM_W * SIM_H];
    
    let mut test_edge = |x_edge: f64, y_start: f64, _y_end: f64, is_vert: bool| -> bool {
        let mut cons = 0;
        for i in 0..SAMPLES_PER_EDGE {
            let (px, py) = if is_vert {
                (x_edge, y_start + (i as f64 + 0.5) / SAMPLES_PER_EDGE as f64)
            } else {
                (y_start + (i as f64 + 0.5) / SAMPLES_PER_EDGE as f64, x_edge)
            };
            
            let (side_a, side_b) = if is_vert {
                (is_point_in_canonical_land(px - EPSILON, py, &lands, &waters, &land_grid, &water_grid),
                 is_point_in_canonical_land(px + EPSILON, py, &lands, &waters, &land_grid, &water_grid))
            } else {
                (is_point_in_canonical_land(px, py - EPSILON, &lands, &waters, &land_grid, &water_grid),
                 is_point_in_canonical_land(px, py + EPSILON, &lands, &waters, &land_grid, &water_grid))
            };
            
            if side_a && side_b {
                cons += 1;
            } else {
                cons = 0;
            }
            if cons >= MIN_CONSECUTIVE { return true; }
        }
        false
    };
    
    for cy in 0..SIM_H {
        for cx in 0..SIM_W {
            let u = cy * SIM_W + cx;
            if sim_grid[u] != 0 { continue; }
            
            // N
            if cy > 0 && sim_grid[(cy-1)*SIM_W + cx] == 0 {
                if test_edge(cy as f64, cx as f64, (cx+1) as f64, false) { edge_mask[u] |= 1; }
            }
            // E
            let ex = (cx + 1) % SIM_W;
            if sim_grid[cy*SIM_W + ex] == 0 {
                if test_edge((cx+1) as f64, cy as f64, (cy+1) as f64, true) { edge_mask[u] |= 2; }
            }
            // S
            if cy < SIM_H - 1 && sim_grid[(cy+1)*SIM_W + cx] == 0 {
                if test_edge((cy+1) as f64, cx as f64, (cx+1) as f64, false) { edge_mask[u] |= 4; }
            }
            // W
            let wx = (cx + SIM_W - 1) % SIM_W;
            if sim_grid[cy*SIM_W + wx] == 0 {
                if test_edge(cx as f64, cy as f64, (cy+1) as f64, true) { edge_mask[u] |= 8; }
            }
        }
    }
    
    File::create("../server/assets/world_land_edges_candidate_v5_1.bin").unwrap().write_all(&edge_mask).unwrap();
    println!("Done");
}
