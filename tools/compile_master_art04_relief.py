import os
import sys
import numpy as np
from PIL import Image

def compile_art04_master_relief_and_bathymetry(
    width=4096, height=2048,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [ART-04] COMPILING DARK GRAND STRATEGY MASTER RELIEF ({width}x{height}) ===")
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

    # Calculate luminance
    luma = lc_arr[:, :, 0] * 0.299 + lc_arr[:, :, 1] * 0.587 + lc_arr[:, :, 2] * 0.114

    # Extract clean hillshade relief and compress to ±12% (No highlight blowout)
    hillshade = luma - 0.5
    light_mod = 1.0 + np.clip(hillshade, -0.35, 0.35) * 0.35  # range 0.87 to 1.12

    # 3. Master Dark Earth Grand-Strategy Palette
    # Darken base by 35% and grade into rich, moody military atlas tones
    lats = np.linspace(90, -90, height, dtype=np.float32)[:, None]
    lons = np.linspace(-180, 180, width, dtype=np.float32)[None, :]
    lat_grid = np.repeat(lats, width, axis=1)
    lon_grid = np.repeat(lons, height, axis=0)

    # Color grading targets
    # Europe / Anatolia: dark olive-grey / muted green-earth
    # Sahara: warm muted brown / burnt sand-grey
    # Arabia: dry warm stone
    # Central Asia: desaturated steppe
    # Forests: deep moss / pine
    
    # Desaturate slightly and deepen midtones
    sat_factor = 0.82
    darken_factor = 0.62  # Significantly darker base land
    
    graded_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        # Color desaturation
        ch = luma + (lc_arr[:, :, c] - luma) * sat_factor
        # Darken tone curve
        ch = ch * darken_factor
        # Apply clamped relief modulation
        ch = ch * light_mod
        graded_land[:, :, c] = np.clip(ch, 0.0, 1.0)

    # Ensure Sahara / Arabia / Anatolia are rich warm earth / olive, NEVER bleached white
    # Warm up desert regions slightly in red/green channels
    is_desert = ((lat_grid >= 10) & (lat_grid <= 35) & (lon_grid >= -18) & (lon_grid <= 65)) | \
                ((lat_grid >= -35) & (lat_grid <= -15) & (lon_grid >= 115) & (lon_grid <= 145))
    
    graded_land[:, :, 0] = np.where(is_desert, np.clip(graded_land[:, :, 0] * 1.12, 0.0, 0.55), graded_land[:, :, 0])
    graded_land[:, :, 1] = np.where(is_desert, np.clip(graded_land[:, :, 1] * 0.95, 0.0, 0.45), graded_land[:, :, 1])
    graded_land[:, :, 2] = np.where(is_desert, np.clip(graded_land[:, :, 2] * 0.75, 0.0, 0.35), graded_land[:, :, 2])

    # Convert to 8-bit RGBA Master Relief
    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(graded_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Dark Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    Image.fromarray(relief_rgba, mode='RGBA').save(output_relief_png, optimize=True)

    # 4. Process Deep Ocean Bathymetry (Restrained 3D effect, smooth depth gradients)
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

    # Heavily restrained underwater ridge relief (only ±6% modulation)
    underwater_ridge = np.clip((bathy_luma - 0.5) * 0.25 + 0.5, 0.35, 0.65)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)        # R = Bathymetric Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)        # G = Coastal Ambient Occlusion
    bathy_rgba[:, :, 2] = (underwater_ridge * 255.0).astype(np.uint8)  # B = Soft Ocean Ridges
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Water Mask

    print(f"Writing Restrained Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [ART-04] COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_art04_master_relief_and_bathymetry(width=4096, height=2048)
