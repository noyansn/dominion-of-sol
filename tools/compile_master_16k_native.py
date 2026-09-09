import os
import sys
import numpy as np
from PIL import Image

def compile_16k_native_master(
    width=16384, height=8192,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba'
):
    print(f"=== [16K-MASTER-PASS] COMPILING TRUE 16K HIGH-RES WORLD MAP ({width}x{height}) ===")
    Image.MAX_IMAGE_PIXELS = None

    # 1. Load Visual Land Mask and upscale smoothly with Bilinear
    print("Processing 16K Visual Land Mask...")
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
    m_img_16k = m_img.resize((width, height), Image.Resampling.BILINEAR)
    mask = np.array(m_img_16k, dtype=np.uint8)
    is_water = (mask <= 128)

    # 2. Process Native 10,800x5,400 Natural Earth II with Pure Lanczos (NO BLUR, NO NOISE)
    print(f"Loading 10.8K Natural Earth II: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_16k = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Direct pure Lanczos pixel array (Zero box blur!)
    lc_arr = np.array(lc_16k, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # 3. Continuous Organic Biome Classification
    desert_weight = np.clip((r - g * 0.94) * 3.5, 0.0, 1.0)
    forest_weight = np.clip((g - r * 0.90) * 4.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    lat_arr = np.abs(np.linspace(90, -90, height, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 22.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    mountain_weight = np.clip((luma - 0.53) * 2.4, 0.0, 1.0)

    # Rich, Velvety, Distinct 16K Master Palette
    c_plains     = np.array([0.27, 0.38, 0.22], dtype=np.float32) # Velvety rich olive (#456138)
    c_forest     = np.array([0.12, 0.30, 0.15], dtype=np.float32) # Deep lush emerald forest (#1e4d27)
    c_desert     = np.array([0.46, 0.35, 0.22], dtype=np.float32) # Warm golden sandstone (#755a38 - NO white!)
    c_taiga      = np.array([0.12, 0.21, 0.13], dtype=np.float32) # Dark pine taiga (#1f3621)
    c_rock       = np.array([0.21, 0.23, 0.24], dtype=np.float32) # Slate mountain granite (#363a3d)
    c_snow       = np.array([0.49, 0.55, 0.60], dtype=np.float32) # Soft alpine snow peaks (#7d8c9a)

    # Pure native directional hillshade lighting (±18% natural depth from 10.8K GeoTIFF)
    light_mod = 1.0 + np.clip((luma - 0.50) * 0.70, -0.18, 0.18)

    final_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        col = c_plains[c]
        col = col * (1.0 - forest_weight * 0.85) + c_forest[c] * (forest_weight * 0.85)
        col = col * (1.0 - desert_weight * 0.90) + c_desert[c] * (desert_weight * 0.90)
        col = col * (1.0 - taiga_weight * 0.70) + c_taiga[c] * (taiga_weight * 0.70)
        col = col * (1.0 - mountain_weight * 0.60) + c_rock[c] * (mountain_weight * 0.60)
        
        # Alpine high peaks & Polar ice
        is_polar = np.clip((lat_arr - 68.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma - 0.72) * 3.5, 0.0, 1.0)
        snow_mask = np.maximum(is_polar, is_high_peak)
        col = col * (1.0 - snow_mask * 0.75) + c_snow[c] * (snow_mask * 0.75)

        final_land[:, :, c] = np.clip(col * light_mod, 0.0, 1.0)

    # Write 16K Master Relief Binary
    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(final_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing 16K Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes = {relief_rgba.nbytes / (1024*1024):.1f} MB)...")
    relief_rgba.tofile(output_relief_rgba)

    # 4. Clean 16K Bathymetry (Dark Petrol Navy)
    print(f"Loading Ocean Bottom Bathymetry: {bathy_tif}...")
    bathy_img = Image.open(bathy_tif).resize((width, height), Image.Resampling.LANCZOS)
    bathy_arr = np.array(bathy_img, dtype=np.float32)
    if bathy_arr.ndim == 2:
        bathy_luma = bathy_arr / 255.0
    else:
        bathy_luma = (bathy_arr[:, :, 0] * 0.299 + bathy_arr[:, :, 1] * 0.587 + bathy_arr[:, :, 2] * 0.114) / 255.0

    min_b = np.percentile(bathy_luma, 1)
    max_b = np.percentile(bathy_luma, 99)
    norm_bathy = np.clip((bathy_luma - min_b) / (max_b - min_b + 1e-5), 0.0, 1.0)
    
    from scipy.ndimage import distance_transform_edt
    # Subsampled distance transform for speed on 16K
    sub_water = is_water[::4, ::4]
    dist_sub = distance_transform_edt(sub_water)
    dist_img = Image.fromarray((np.clip(dist_sub / 4.0, 0.0, 1.0) * 255).astype(np.uint8), mode='L')
    coastal_ao = np.array(dist_img.resize((width, height), Image.Resampling.BILINEAR), dtype=np.float32) / 255.0

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Contact Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Ridge light
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing 16K Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes = {bathy_rgba.nbytes / (1024*1024):.1f} MB)...")
    bathy_rgba.tofile(output_bathy_rgba)

    print("=== [16K-MASTER-PASS] 16K MASTER COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_16k_native_master(width=16384, height=8192)
