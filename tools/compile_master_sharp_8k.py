import os
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def compile_sharp_8k_master(
    width=8192, height=4096,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [SHARP-8K-PASS] COMPILING HIGH-PRECISION 8K MASTER ({width}x{height}) ===")
    Image.MAX_IMAGE_PIXELS = None

    # 1. Load Visual Land Mask
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
    m_img_8k = m_img.resize((width, height), Image.Resampling.BILINEAR)
    mask = np.array(m_img_8k, dtype=np.uint8)
    is_water = (mask <= 128)

    # 2. Process Native 10.8K Natural Earth II with Lanczos
    print(f"Loading 10.8K Natural Earth II: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_8k = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    lc_arr = np.array(lc_8k, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # 3. High-Pass Mountain Ridge Extraction (Native GeoTIFF resolution)
    luma_img = Image.fromarray((luma * 255).astype(np.uint8), mode='L')
    luma_sharp = luma_img.filter(ImageFilter.UnsharpMask(radius=2.0, percent=180, threshold=1))
    luma_sharp_arr = np.array(luma_sharp, dtype=np.float32) / 255.0

    # 4. Authentic Grand Strategy Biome Classification
    desert_weight = np.clip((r - g * 0.94) * 4.0, 0.0, 1.0)
    forest_weight = np.clip((g - r * 0.88) * 4.5, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    lat_arr = np.abs(np.linspace(90, -90, height, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 20.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    mountain_weight = np.clip((luma_sharp_arr - 0.52) * 2.8, 0.0, 1.0)

    # Curated Rich, Saturated, Elegant Palette
    c_plains     = np.array([0.30, 0.42, 0.24], dtype=np.float32) # Rich olive green (#4d6b3d)
    c_forest     = np.array([0.10, 0.28, 0.14], dtype=np.float32) # Deep emerald forest (#1a4724)
    c_desert     = np.array([0.50, 0.38, 0.23], dtype=np.float32) # Warm golden sandstone (#80613b)
    c_taiga      = np.array([0.11, 0.20, 0.13], dtype=np.float32) # Dark pine boreal (#1c3321)
    c_rock       = np.array([0.25, 0.27, 0.28], dtype=np.float32) # Slate mountain rock (#404547)
    c_snow       = np.array([0.62, 0.68, 0.74], dtype=np.float32) # Alpine snow crests (#9eaebc)

    # Directional hillshade lighting from high-pass unsharp luma
    light_mod = 1.0 + np.clip((luma_sharp_arr - 0.50) * 0.85, -0.22, 0.22)

    final_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        col = c_plains[c]
        col = col * (1.0 - forest_weight * 0.85) + c_forest[c] * (forest_weight * 0.85)
        col = col * (1.0 - desert_weight * 0.90) + c_desert[c] * (desert_weight * 0.90)
        col = col * (1.0 - taiga_weight * 0.70) + c_taiga[c] * (taiga_weight * 0.70)
        col = col * (1.0 - mountain_weight * 0.65) + c_rock[c] * (mountain_weight * 0.65)
        
        # Alpine high peaks & Polar ice
        is_polar = np.clip((lat_arr - 68.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma_sharp_arr - 0.70) * 4.0, 0.0, 1.0)
        snow_mask = np.maximum(is_polar, is_high_peak)
        col = col * (1.0 - snow_mask * 0.85) + c_snow[c] * (snow_mask * 0.85)

        final_land[:, :, c] = np.clip(col * light_mod, 0.0, 1.0)

    # 4-channel RGBA: R,G,B = Color, A = Land Mask
    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(final_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Sharp 8K Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 5. Deep Strategic Ocean Bathymetry (Dark Petrol Navy, NOT bright cyan)
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
    dist_from_land = distance_transform_edt(is_water)
    coastal_ao = np.clip(dist_from_land / 8.0, 0.0, 1.0)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Contact Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Ridge light
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing Sharp 8K Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [SHARP-8K-PASS] 8K COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_sharp_8k_master(width=8192, height=4096)
