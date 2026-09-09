import os
import sys
import numpy as np
from PIL import Image

def compile_clean_master_relief(
    width=4096, height=2048,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [CLEAN-4K-PASS] COMPILING MASTER RELIEF ({width}x{height}) ===")
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

    # 2. Smooth Natural Earth II Master Land Cover (velvety smooth natural tones)
    print(f"Loading Natural Earth II Landcover: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_resized = lc_img.resize((width, height), Image.Resampling.LANCZOS)
    lc_arr = np.array(lc_resized, dtype=np.float32) / 255.0

    # Gentle, rich, velvety color balance
    luma = lc_arr[:, :, 0] * 0.299 + lc_arr[:, :, 1] * 0.587 + lc_arr[:, :, 2] * 0.114
    
    sat_factor = 0.92
    contrast_factor = 1.04
    
    graded_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        ch = luma + (lc_arr[:, :, c] - luma) * sat_factor
        ch = np.power(np.clip(ch, 0.0, 1.0), contrast_factor)
        graded_land[:, :, c] = ch

    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(graded_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing Clean Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
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
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)     # R = Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)     # G = Contact Shadow
    bathy_rgba[:, :, 2] = (bathy_luma * 255.0).astype(np.uint8)     # B = Ocean Ridges
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)         # A = Mask

    print(f"Writing Clean Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)
    Image.fromarray(bathy_rgba, mode='RGBA').save(output_bathy_png, optimize=True)

    print("=== [CLEAN-4K-PASS] COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_clean_master_relief(width=4096, height=2048)
