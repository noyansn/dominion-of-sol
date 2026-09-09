import os
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy.ndimage import sobel

def compile_nextgen_hoi4_master(
    width=4096, height=2048,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [NEXTGEN-HOI4-PASS] COMPILING SCULPTED 3D MOUNTAIN MASTER MAP ({width}x{height}) ===")
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

    # 2. Process High-Resolution 10,800x5,400 Natural Earth II Master
    print(f"Loading 10.8K Natural Earth II: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_resized = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    lc_arr = np.array(lc_resized, dtype=np.float32) / 255.0

    r, g, b = lc_arr[:, :, 0], lc_arr[:, :, 1], lc_arr[:, :, 2]
    luma = r * 0.299 + g * 0.587 + b * 0.114

    # 3. High-Precision 3D Directional Mountain Hillshading & Cast Shadows (Sobel Normal Vector Field)
    # Extract height derivatives (dx, dy)
    dx = sobel(luma, axis=1) * 2.5
    dy = sobel(luma, axis=0) * 2.5

    # 3D Normal Vector
    dz = 1.0 / 8.0
    norm = np.sqrt(dx**2 + dy**2 + dz**2)
    nx = -dx / norm
    ny = -dy / norm
    nz = dz / norm

    # North-West Directional Sunlight Vector (Azimuth 315°, Altitude 45°)
    # lx = -cos(45)*sin(315) = -0.707 * -0.707 = +0.50
    # ly = -cos(45)*cos(315) = -0.707 * 0.707 = -0.50
    # lz = sin(45) = 0.707
    sun_dir = np.array([-0.577, 0.577, 0.577], dtype=np.float32)
    sun_dir = sun_dir / np.linalg.norm(sun_dir)

    # Calculate Dot Product (Diffuse Lighting + Ridge Highlighting)
    diffuse = nx * sun_dir[0] + ny * sun_dir[1] + nz * sun_dir[2]
    diffuse = np.clip(diffuse, 0.0, 1.0)

    # Multi-scale mountain crest unsharp enhancement
    luma_img = Image.fromarray((luma * 255).astype(np.uint8), mode='L')
    luma_sharp = luma_img.filter(ImageFilter.UnsharpMask(radius=3.0, percent=220, threshold=1))
    luma_sharp_arr = np.array(luma_sharp, dtype=np.float32) / 255.0

    # Mountain Ridge Ambient Occlusion (darken deep valley floors, highlight ridges)
    ridge_ao = np.clip((luma_sharp_arr - 0.45) * 1.8 + 0.5, 0.55, 1.45)

    # Master 3D Hillshade lighting factor: 0.65 to 1.35
    hillshade_3d = np.clip((diffuse * 0.65 + 0.45) * ridge_ao, 0.60, 1.40)

    # 4. Authentic Grand Strategy Biome Coloring (Curated HOI4 / Military Atlas Style)
    desert_weight = np.clip((r - g * 0.96) * 4.0, 0.0, 1.0)
    rainforest_weight = np.clip((g - r * 0.90) * 4.5, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    lat_arr = np.abs(np.linspace(90, -90, height, dtype=np.float32)[:, None])
    taiga_weight = np.clip((lat_arr - 48.0) / 20.0, 0.0, 1.0) * np.clip(1.0 - desert_weight, 0.0, 1.0)
    mountain_weight = np.clip((luma - 0.54) * 2.8, 0.0, 1.0)

    # Curated Rich Palette
    c_temperate  = np.array([0.24, 0.30, 0.22], dtype=np.float32) # Olive meadows
    c_rainforest = np.array([0.14, 0.26, 0.16], dtype=np.float32) # Emerald Amazon/Congo
    c_desert     = np.array([0.38, 0.30, 0.20], dtype=np.float32) # Rich golden sandstone
    c_taiga      = np.array([0.13, 0.20, 0.14], dtype=np.float32) # Pine boreal green
    c_rock       = np.array([0.22, 0.23, 0.22], dtype=np.float32) # Mountain slate rock
    c_snow       = np.array([0.48, 0.52, 0.55], dtype=np.float32) # Alpine snow crests

    final_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        col = c_temperate[c] * (1.0 - rainforest_weight) + c_rainforest[c] * rainforest_weight
        col = col * (1.0 - desert_weight) + c_desert[c] * desert_weight
        col = col * (1.0 - taiga_weight * 0.7) + c_taiga[c] * (taiga_weight * 0.7)
        col = col * (1.0 - mountain_weight * 0.65) + c_rock[c] * (mountain_weight * 0.65)
        
        # Himalayan / Polar snow peaks
        is_polar = np.clip((lat_arr - 66.0) / 10.0, 0.0, 1.0)
        is_high_peak = mountain_weight * np.clip((luma - 0.68) * 4.5, 0.0, 1.0)
        snow_mask = np.maximum(is_polar, is_high_peak)
        col = col * (1.0 - snow_mask * 0.85) + c_snow[c] * (snow_mask * 0.85)

        # Apply true 3D directional mountain hillshade with deep shadows and sharp crests
        final_land[:, :, c] = np.clip(col * hillshade_3d, 0.0, 1.0)

    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(final_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Sculpted 3D Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 5. Deep Strategic Ocean Bathymetry with Continental Shelves
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
    coastal_ao = np.clip(dist_from_land / 6.0, 0.0, 1.0)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Coastal Ambient Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Underwater hillshade
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing Sculpted 3D Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [NEXTGEN-HOI4-PASS] COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_nextgen_hoi4_master(width=4096, height=2048)
