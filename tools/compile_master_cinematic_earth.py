import os
import sys
import numpy as np
from PIL import Image, ImageEnhance

def compile_cinematic_earth_master(
    width=4096, height=2048,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [CINEMATIC-EARTH-PASS] COMPILING SATELLITE-GRADE MASTER MAP ({width}x{height}) ===")
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

    # 2. Process Natural Earth II Master GeoTIFF (Full Authentic Color)
    print(f"Loading Natural Earth II Master Landcover: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_resized = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Apply subtle cinematic color grading:
    # 1. Slightly increase saturation so forests pop with deep green and deserts pop with warm amber
    enhancer_col = ImageEnhance.Color(lc_resized)
    lc_graded = enhancer_col.enhance(1.15)
    
    # 2. Gentle contrast curve for cinematic depth
    enhancer_con = ImageEnhance.Contrast(lc_graded)
    lc_graded = enhancer_con.enhance(1.06)

    # 3. Gentle brightness adjustment for space-view clarity
    enhancer_bri = ImageEnhance.Brightness(lc_graded)
    lc_graded = enhancer_bri.enhance(0.92)

    lc_arr = np.array(lc_graded, dtype=np.uint8)

    # Combine with mask into 32-bit RGBA
    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    relief_rgba[:, :, :3] = lc_arr
    relief_rgba[:, :, 3] = mask

    print(f"Writing Cinematic Earth Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    lc_graded.save(output_relief_png, optimize=True)

    # 3. Process Natural Earth Ocean Bottom Bathymetry
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
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)        # B = Underwater hillshade
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)            # A = Mask

    print(f"Writing Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [CINEMATIC-EARTH-PASS] MASTER COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_cinematic_earth_master(width=4096, height=2048)
