import os
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def compile_vibrant_grand_strategy_8k(
    width=8192, height=4096,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [VIBRANT-8K-PASS] COMPILING HIGH-COLOR DISTINCT BIOME MASTER ({width}x{height}) ===")
    Image.MAX_IMAGE_PIXELS = None

    # 1. Load Visual Land Mask
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
    m_img_8k = m_img.resize((width, height), Image.Resampling.BILINEAR)
    mask = np.array(m_img_8k, dtype=np.uint8)
    is_water = (mask <= 128)

    # 2. Process Native 10.8K Natural Earth II with Smooth Lanczos
    print(f"Loading 10.8K Natural Earth II: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_8k = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Smooth filtering to eliminate raster pixel noise while preserving mountain shapes
    lc_smooth = lc_8k.filter(ImageFilter.SMOOTH)
    lc_arr = np.array(lc_smooth, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # 3. Spectral Feature Extraction for Crisp Biome Separation
    # Desert index: high red relative to green/blue
    desert_weight = np.clip((r - g * 0.94) * 4.5, 0.0, 1.0)
    
    # Dense Forest index: high green (Amazon, Congo, Black Sea coast, European forests, Taiga)
    forest_weight = np.clip((g - r * 0.88) * 5.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    
    # Latitude for Boreal Taiga
    lat_arr = np.abs(np.linspace(90, -90, height, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 20.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    
    # Mountain Rock index: high local elevation variation/relief
    mountain_weight = np.clip((luma - 0.54) * 2.8, 0.0, 1.0)

    # 4. Rich, Distinct, Colorful Grand Strategy Palette
    # 1. Fertile Plains / Grasslands (Europe, Anatolia, US): Rich warm olive green (#547543)
    c_plains = np.array([0.33, 0.46, 0.26], dtype=np.float32)
    # 2. Lush Dense Forests (Amazon, Congo, Pontic Alps, Germany, SE Asia): Deep rich emerald (#1d5228)
    c_forest = np.array([0.11, 0.32, 0.16], dtype=np.float32)
    # 3. Warm Deserts (Sahara, Arabia, Outback): Warm rich golden amber sandstone (#6e5233)
    c_desert = np.array([0.52, 0.39, 0.24], dtype=np.float32)
    # 4. Boreal Taiga (Siberia, Canada): Dark pine boreal green (#1a361e)
    c_taiga  = np.array([0.10, 0.21, 0.12], dtype=np.float32)
    # 5. Mountain Slate Rock (Taurus, Alps, Rockies, Andes): Cool slate granite (#42474a)
    c_rock   = np.array([0.26, 0.28, 0.29], dtype=np.float32)
    # 6. Alpine Snow Crests (High Himalayas, Alps peaks, Ararat): Crisp snow white-blue (#8293a3)
    c_snow   = np.array([0.65, 0.72, 0.78], dtype=np.float32)

    # 5. Smooth 3D Mountain Hillshade Lighting (±20% modulation without noise)
    light_mod = 1.0 + np.clip((luma - 0.50) * 0.75, -0.20, 0.20)

    final_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        # Base plains
        col = c_plains[c]
        # Layer in lush forests
        col = col * (1.0 - forest_weight * 0.85) + c_forest[c] * (forest_weight * 0.85)
        # Layer in warm deserts
        col = col * (1.0 - desert_weight * 0.90) + c_desert[c] * (desert_weight * 0.90)
        # Layer in boreal taiga
        col = col * (1.0 - taiga_weight * 0.70) + c_taiga[c] * (taiga_weight * 0.70)
        # Layer in distinct rocky mountain ranges (Toroslar, Alps, Apennines, Zagros, Himalayas)
        col = col * (1.0 - mountain_weight * 0.65) + c_rock[c] * (mountain_weight * 0.65)
        
        # Alpine high peaks & Polar ice
        is_polar = np.clip((lat_arr - 68.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma - 0.70) * 4.0, 0.0, 1.0)
        snow_mask = np.maximum(is_polar, is_high_peak)
        col = col * (1.0 - snow_mask * 0.85) + c_snow[c] * (snow_mask * 0.85)

        # Apply smooth 3D relief lighting
        final_land[:, :, c] = np.clip(col * light_mod, 0.0, 1.0)

    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(final_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Vibrant 8K Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 6. Deep Turquoise-Tinted Strategic Ocean Bathymetry
    print(f"Loading Ocean Bottom Bathymetry: {bathy_tif}...")
    bathy_img = Image.open(bathy_tif).resize((width, height), Image.Resampling.LANCZOS)
    bathy_smooth = bathy_img.filter(ImageFilter.SMOOTH)
    bathy_arr = np.array(bathy_smooth, dtype=np.float32)
    if bathy_arr.ndim == 2:
        bathy_luma = bathy_arr / 255.0
    else:
        bathy_luma = (bathy_arr[:, :, 0] * 0.299 + bathy_arr[:, :, 1] * 0.587 + bathy_arr[:, :, 2] * 0.114) / 255.0

    min_b = np.percentile(bathy_luma, 1)
    max_b = np.percentile(bathy_luma, 99)
    norm_bathy = np.clip((bathy_luma - min_b) / (max_b - min_b + 1e-5), 0.0, 1.0)
    
    from scipy.ndimage import distance_transform_edt
    dist_from_land = distance_transform_edt(is_water)
    coastal_ao = np.clip(dist_from_land / 8.0, 0.0, 1.0)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Contact Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Ridge light
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing Vibrant 8K Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [VIBRANT-8K-PASS] 8K COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_vibrant_grand_strategy_8k(width=8192, height=4096)
