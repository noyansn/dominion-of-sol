import os
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def compile_8k_homogenous_master(
    width=8192, height=4096,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [8K-HOMOGENOUS-PASS] COMPILING 8K HOMOGENOUS MASTER MAP ({width}x{height}) ===")
    Image.MAX_IMAGE_PIXELS = None

    # 1. Load Visual Land Mask and upscale smoothly to 8192x4096
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
    m_img_8k = m_img.resize((width, height), Image.Resampling.BILINEAR)
    mask = np.array(m_img_8k, dtype=np.uint8)
    is_water = (mask <= 128)

    # 2. Process Master 10,800x5,400 Natural Earth II with Smooth Lanczos Resampling
    print(f"Loading 10.8K Natural Earth II: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_resized = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Very gentle bilateral-style smoothing to eliminate any raster pixel noise
    lc_smooth = lc_resized.filter(ImageFilter.SMOOTH)
    lc_arr = np.array(lc_smooth, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # 3. Continuous Organic Biome Palette (Homogenous, Restful, Prestigious)
    desert_weight = np.clip((r - g * 0.96) * 3.5, 0.0, 1.0)
    rainforest_weight = np.clip((g - r * 0.90) * 4.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    lat_arr = np.abs(np.linspace(90, -90, height, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 22.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    mountain_weight = np.clip((luma - 0.55) * 2.0, 0.0, 1.0)

    # Curated Homogenous Grand Strategy Palette (Eye-Restful, Rich Velvet Tones)
    c_temperate  = np.array([0.25, 0.32, 0.23], dtype=np.float32) # Soft olive meadows (#40523b)
    c_rainforest = np.array([0.15, 0.28, 0.17], dtype=np.float32) # Calming emerald Amazon/Congo (#26472b)
    c_desert     = np.array([0.40, 0.33, 0.23], dtype=np.float32) # Warm soft sandstone (#66543b)
    c_taiga      = np.array([0.15, 0.22, 0.16], dtype=np.float32) # Muted pine taiga (#263829)
    c_rock       = np.array([0.26, 0.27, 0.25], dtype=np.float32) # Soft slate mountain rock (#424540)
    c_snow       = np.array([0.45, 0.48, 0.50], dtype=np.float32) # Soft alpine crests (#737a80)

    # Very gentle, homogenous painterly hillshade (±10% light modulation - NO harsh noise)
    light_mod = 1.0 + np.clip((luma - 0.50) * 0.35, -0.10, 0.10)

    final_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        col = c_temperate[c] * (1.0 - rainforest_weight) + c_rainforest[c] * rainforest_weight
        col = col * (1.0 - desert_weight) + c_desert[c] * desert_weight
        col = col * (1.0 - taiga_weight * 0.7) + c_taiga[c] * (taiga_weight * 0.7)
        col = col * (1.0 - mountain_weight * 0.5) + c_rock[c] * (mountain_weight * 0.5)
        
        # Himalayan / Polar peaks
        is_polar = np.clip((lat_arr - 68.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma - 0.72) * 3.5, 0.0, 1.0)
        snow_mask = np.maximum(is_polar, is_high_peak)
        col = col * (1.0 - snow_mask * 0.75) + c_snow[c] * (snow_mask * 0.75)

        final_land[:, :, c] = np.clip(col * light_mod, 0.0, 1.0)

    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(final_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing 8K Homogenous Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 4. Clean 8K Bathymetry
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

    print(f"Writing 8K Homogenous Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [8K-HOMOGENOUS-PASS] 8K COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_8k_homogenous_master(width=8192, height=4096)
