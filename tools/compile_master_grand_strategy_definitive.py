import os
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def compile_definitive_master_map(
    width=4096, height=2048,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [DEFINITIVE-MASTER-PASS] COMPILING MASTER MAP ({width}x{height}) ===")
    Image.MAX_IMAGE_PIXELS = None

    # 1. Load Visual Land Mask
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    if raw_mask.size == width * height:
        mask = raw_mask.reshape((height, width))
    else:
        m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
        m_img = m_img.resize((width, height), Image.Resampling.BILINEAR)
        mask = np.array(m_img, dtype=np.uint8)
    is_water = (mask <= 128)

    # 2. Process Natural Earth II Master GeoTIFF
    print(f"Loading Natural Earth II Landcover: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_resized = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    lc_arr = np.array(lc_resized, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # Spectral Biome Classification from continuous Earth spectral signatures
    # Desert / Arid (Sahara, Arabia, Gobi, Australian Outback)
    desert_weight = np.clip((r - g * 0.96) * 4.0, 0.0, 1.0)
    # Dense Rainforest / Jungle (Amazon, Congo, SE Asia)
    rainforest_weight = np.clip((g - r * 0.90) * 4.5, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    # Boreal / Taiga (Siberia, Canada, Scandinavia - high latitude & moderate green)
    lat_arr = np.abs(np.linspace(90, -90, height, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 20.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    # Mountain Ridge Relief
    mountain_weight = np.clip((luma - 0.55) * 2.5, 0.0, 1.0)

    # Curated Rich Grand Strategy Biome Colors:
    # 1. Temperate Plains / Europe / Americas: Rich dark olive-earth (#384632)
    c_temperate = np.array([0.22, 0.28, 0.20], dtype=np.float32)
    # 2. Deep Rainforest / Amazon / Congo: Deep emerald moss (#1e3b22)
    c_rainforest = np.array([0.12, 0.23, 0.14], dtype=np.float32)
    # 3. Sahara / Arabia / Deserts: Warm rich amber sandstone (#54422e)
    c_desert = np.array([0.33, 0.26, 0.18], dtype=np.float32)
    # 4. Siberian / Canadian Taiga: Dark pine boreal green (#1b2c1d)
    c_taiga = np.array([0.11, 0.18, 0.12], dtype=np.float32)
    # 5. Mountain Slate: Dark granite rock (#323330)
    c_rock = np.array([0.20, 0.21, 0.20], dtype=np.float32)
    # 6. Alpine Summit Snow: Soft cold highlight (#52575a)
    c_snow = np.array([0.38, 0.41, 0.43], dtype=np.float32)

    # Directional hillshade light modulation from Natural Earth luminance
    light_mod = 1.0 + np.clip((luma - 0.50) * 0.7, -0.15, 0.15) # 0.85 to 1.15

    graded_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        # Base temperate
        col = c_temperate[c] * (1.0 - rainforest_weight) + c_rainforest[c] * rainforest_weight
        col = col * (1.0 - desert_weight) + c_desert[c] * desert_weight
        col = col * (1.0 - taiga_weight * 0.7) + c_taiga[c] * (taiga_weight * 0.7)
        col = col * (1.0 - mountain_weight * 0.6) + c_rock[c] * (mountain_weight * 0.6)
        
        # High Himalayas/Greenland snow accent
        is_polar = np.clip((lat_arr - 65.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma - 0.70) * 4.0, 0.0, 1.0)
        col = col * (1.0 - np.maximum(is_polar, is_high_peak) * 0.8) + c_snow[c] * np.maximum(is_polar, is_high_peak) * 0.8

        graded_land[:, :, c] = col * light_mod

    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(graded_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Definitive Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 3. Clean Natural Earth Ocean Bathymetry
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
    coastal_ao = np.clip(dist_from_land / 5.0, 0.0, 1.0)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Contact Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Ridge light
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing Definitive Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [DEFINITIVE-MASTER-PASS] MASTER COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_definitive_master_map(width=4096, height=2048)
