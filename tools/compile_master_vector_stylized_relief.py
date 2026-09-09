import os
import sys
import numpy as np
from PIL import Image, ImageFilter

def compile_vector_stylized_master(
    width=4096, height=2048,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [VECTOR-STYLED-PASS] COMPILING PURE ORGANIC STYLIZED MAP ({width}x{height}) ===")
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

    # 2. Process Natural Earth II Master GeoTIFF with Painterly Vector-Style Smoothing
    print(f"Loading Natural Earth II Landcover: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    
    # Bilateral-style / median smoothing for painterly, clean vector-like terrain
    lc_smooth = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    lc_smooth = lc_smooth.filter(ImageFilter.SMOOTH_MORE)
    
    lc_arr = np.array(lc_smooth, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # 3. Organic Spectral Feature Extraction (ZERO geometric boxes, 100% natural Earth shapes)
    # Arid / Desert index: high red relative to green/blue
    desert_ratio = np.clip((r - g * 0.95) / (r + g + 0.01), 0.0, 1.0)
    # Forest index: high green relative to red
    vegetation_ratio = np.clip((g - r * 0.92) / (g + r + 0.01), 0.0, 1.0)
    
    # 4. Stylized Grand Strategy Vector Palette (Curated HOI4/EU4-Style Matte Tones)
    # Base temperate/plains: velvety dark olive-earth
    c_plains = np.array([0.22, 0.26, 0.20], dtype=np.float32) # #384233
    # Forest/jungle: deep moss green
    c_forest = np.array([0.14, 0.21, 0.15], dtype=np.float32) # #243526
    # Arid/Desert: warm muted sandstone/ochre
    c_desert = np.array([0.36, 0.30, 0.22], dtype=np.float32) # #5c4d38
    # Mountain rock: cool slate granite
    c_rock   = np.array([0.26, 0.27, 0.26], dtype=np.float32) # #424542
    # Alpine snow: soft muted frost (only in extreme high relief)
    c_snow   = np.array([0.55, 0.58, 0.60], dtype=np.float32) # #8c9499

    # Mountain relief strength from local variance / luminance gradient
    relief_val = np.clip((luma - 0.45) * 1.4, -0.25, 0.25)
    light_factor = 1.0 + relief_val * 0.55  # 0.86 to 1.14 light modulation

    # Composite stylized vector terrain
    stylized_terrain = np.zeros((height, width, 3), dtype=np.float32)
    for ch in range(3):
        # Start from base olive plains
        col = c_plains[ch]
        # Blend natural forests
        col = col * (1.0 - vegetation_ratio * 0.8) + c_forest[ch] * (vegetation_ratio * 0.8)
        # Blend natural organic deserts
        col = col * (1.0 - desert_ratio * 0.85) + c_desert[ch] * (desert_ratio * 0.85)
        # Blend mountain ridges
        is_mountain = np.clip((luma - 0.52) / 0.35, 0.0, 1.0)
        col = col * (1.0 - is_mountain * 0.45) + c_rock[ch] * (is_mountain * 0.45)
        
        # Apply smooth lighting
        stylized_terrain[:, :, ch] = col * light_factor

    # Convert to 8-bit RGBA Master Relief
    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for ch in range(3):
        relief_rgba[:, :, ch] = np.clip(stylized_terrain[:, :, ch] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Stylized Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 5. Process Smooth Depth Bathymetry
    print(f"Loading Ocean Bottom Bathymetry: {bathy_tif}...")
    bathy_img = Image.open(bathy_tif).resize((width, height), Image.Resampling.LANCZOS)
    bathy_img = bathy_img.filter(ImageFilter.SMOOTH_MORE)
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
    coastal_ao = np.clip(dist_from_land / 6.0, 0.0, 1.0)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Contact Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Underwater hillshade
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing Stylized Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [VECTOR-STYLED-PASS] COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_vector_stylized_master(width=4096, height=2048)
