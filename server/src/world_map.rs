use std::fs::File;
use std::io::Read;
use std::path::Path;

pub const WORLD_WIDTH: usize = 1024;
pub const WORLD_HEIGHT: usize = 512;
pub const TOTAL_CELLS: usize = WORLD_WIDTH * WORLD_HEIGHT; // 524,288 cells

pub const CHUNK_SIZE: usize = 32;
pub const CHUNKS_X: usize = WORLD_WIDTH / CHUNK_SIZE; // 32
pub const CHUNKS_Y: usize = WORLD_HEIGHT / CHUNK_SIZE; // 16
pub const TOTAL_CHUNKS: usize = CHUNKS_X * CHUNKS_Y; // 512

#[inline(always)]
pub fn cell_to_chunk(cell_idx: usize) -> usize {
    let x = (cell_idx % WORLD_WIDTH) / CHUNK_SIZE;
    let y = (cell_idx / WORLD_WIDTH) / CHUNK_SIZE;
    y * CHUNKS_X + x
}

pub fn generate_world_land_mask() -> Vec<u8> {
    let candidates = [
        "assets/world_grid.bin",
        "server/assets/world_grid.bin",
        "../assets/world_grid.bin",
    ];
    let found_path = candidates.iter().map(Path::new).find(|p| p.exists());

    if let Some(path) = found_path {
        let mut file = File::open(path).expect("Failed to open world_grid.bin");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .expect("Failed to read world_grid.bin");

        if buffer.len() == TOTAL_CELLS {
            return buffer;
        } else {
            panic!(
                "world_grid.bin size mismatch: expected {}, got {}",
                TOTAL_CELLS,
                buffer.len()
            );
        }
    }

    if std::env::var("DEV_FLAT_MAP").is_ok() {
        println!("WARNING: world_grid.bin not found. DEV_FLAT_MAP is set. Using flat box.");
        let mut mask = vec![2u8; TOTAL_CELLS];
        for y in 100..400 {
            for x in 200..800 {
                mask[y * WORLD_WIDTH + x] = 0;
            }
        }
        return mask;
    }

    panic!("CRITICAL ERROR: assets/world_grid.bin is missing. Authoritative geography cannot be loaded. Match initialization aborted.");
}
