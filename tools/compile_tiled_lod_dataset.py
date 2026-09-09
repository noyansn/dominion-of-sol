import os
import sys
import numpy as np
from PIL import Image

def compile_tiled_lod_dataset():
    Image.MAX_IMAGE_PIXELS = None
    print("=== [TILED-LOD-PIPELINE] COMPILING GLOBAL BASE + REAL 21.6K TILED LOD PYRAMID ===")

    # 1. Global Lightweight Base Map (4096x2048)
    w_global, h_global = 4096, 2048
    mask_path = 'client/src/assets/world_visual_mask.bin'
    ne2_tif = 'tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif'
    bathy_tif = 'tools/data/OB_50M/OB_50M/OB_50M.tif'
    sr_hr_tif = 'tools/data/SR_HR/SR_HR.tif'
    
    out_relief_rgba = 'client/src/assets/world_relief.rgba'
    out_bathy_rgba = 'client/src/assets/world_bathymetry.rgba'
    tiles_dir = 'client/public/tiles'

    print("1. Generating Global Lightweight Base Map (4096x2048)...")
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    mask = raw_mask.reshape((2048, 4096))
    is_water = (mask <= 128)

    lc_img = Image.open(ne2_tif).resize((w_global, h_global), Image.Resampling.LANCZOS)
    lc_arr = np.array(lc_img, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    desert_weight = np.clip((r - g * 0.94) * 3.5, 0.0, 1.0)
    forest_weight = np.clip((g - r * 0.90) * 4.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    lat_arr = np.abs(np.linspace(90, -90, h_global, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 22.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    mountain_weight = np.clip((luma - 0.53) * 2.4, 0.0, 1.0)

    c_plains = np.array([0.27, 0.38, 0.22], dtype=np.float32)
    c_forest = np.array([0.12, 0.30, 0.15], dtype=np.float32)
    c_desert = np.array([0.46, 0.35, 0.22], dtype=np.float32)
    c_taiga  = np.array([0.12, 0.21, 0.13], dtype=np.float32)
    c_rock   = np.array([0.21, 0.23, 0.24], dtype=np.float32)
    c_snow   = np.array([0.49, 0.55, 0.60], dtype=np.float32)

    light_mod = 1.0 + np.clip((luma - 0.50) * 0.65, -0.16, 0.16)

    final_land = np.zeros((h_global, w_global, 3), dtype=np.float32)
    for c in range(3):
        col = c_plains[c]
        col = col * (1.0 - forest_weight * 0.85) + c_forest[c] * (forest_weight * 0.85)
        col = col * (1.0 - desert_weight * 0.90) + c_desert[c] * (desert_weight * 0.90)
        col = col * (1.0 - taiga_weight * 0.70) + c_taiga[c] * (taiga_weight * 0.70)
        col = col * (1.0 - mountain_weight * 0.60) + c_rock[c] * (mountain_weight * 0.60)
        
        is_polar = np.clip((lat_arr - 68.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma - 0.72) * 3.5, 0.0, 1.0)
        snow_mask = np.maximum(is_polar, is_high_peak)
        col = col * (1.0 - snow_mask * 0.75) + c_snow[c] * (snow_mask * 0.75)

        final_land[:, :, c] = np.clip(col * light_mod, 0.0, 1.0)

    relief_rgba = np.zeros((h_global, w_global, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(final_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Global Relief {out_relief_rgba} ({relief_rgba.nbytes / (1024*1024):.1f} MB)...")
    relief_rgba.tofile(out_relief_rgba)

    # Global Bathymetry (4096x2048)
    bathy_img = Image.open(bathy_tif).resize((w_global, h_global), Image.Resampling.LANCZOS)
    bathy_arr = np.array(bathy_img, dtype=np.float32)
    bathy_luma = (bathy_arr[:, :, 0] * 0.299 + bathy_arr[:, :, 1] * 0.587 + bathy_arr[:, :, 2] * 0.114) / 255.0

    min_b = np.percentile(bathy_luma, 1)
    max_b = np.percentile(bathy_luma, 99)
    norm_bathy = np.clip((bathy_luma - min_b) / (max_b - min_b + 1e-5), 0.0, 1.0)

    from scipy.ndimage import distance_transform_edt
    dist_from_land = distance_transform_edt(is_water)
    coastal_ao = np.clip(dist_from_land / 8.0, 0.0, 1.0)

    bathy_rgba = np.zeros((h_global, w_global, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)

    print(f"Writing Global Bathymetry {out_bathy_rgba} ({bathy_rgba.nbytes / (1024*1024):.1f} MB)...")
    bathy_rgba.tofile(out_bathy_rgba)

    # 2. Compile Real 21,600 x 10,800 SRTM Plus Shaded Relief Tiled LOD Pyramid
    print("2. Processing Real 21,600x10,800 SRTM Plus Shaded Relief Source...")
    sr_img = Image.open(sr_hr_tif)
    sr_w, sr_h = sr_img.size
    print(f"Loaded Real SRTM Plus Dataset: {sr_w}x{sr_h} pixels ({sr_img.mode})")

    # Generate LOD2 (16 columns x 8 rows = 128 tiles at 512x512 = 8192x4096 equivalent)
    # Generate LOD3 (32 columns x 16 rows = 512 tiles at 512x512 = 16384x8192 equivalent)
    tile_size = 512

    for lod_level, cols, rows in [(2, 16, 8), (3, 32, 16)]:
        lod_dir = os.path.join(tiles_dir, f"lod{lod_level}")
        os.makedirs(lod_dir, exist_ok=True)
        print(f"Compiling LOD{lod_level} Pyramid: {cols}x{rows} = {cols*rows} tiles (512x512)...")

        # Compute slice bounds in 21,600x10,800 source coordinates
        for row in range(rows):
            src_y0 = int(row * sr_h / rows)
            src_y1 = int((row + 1) * sr_h / rows)
            for col in range(cols):
                src_x0 = int(col * sr_w / cols)
                src_x1 = int((col + 1) * sr_w / cols)

                # Crop native source region and resize to 512x512 with Lanczos
                tile_crop = sr_img.crop((src_x0, src_y0, src_x1, src_y1))
                tile_512 = tile_crop.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
                
                # Save as optimized grayscale PNG/WebP (single channel)
                tile_path = os.path.join(lod_dir, f"{col}_{row}.png")
                tile_512.save(tile_path, optimize=True)

    print("=== [TILED-LOD-PIPELINE] ALL TILES AND BASE ASSETS COMPILED SUCCESSFULLY! ===")

if __name__ == '__main__':
    compile_tiled_lod_dataset()
