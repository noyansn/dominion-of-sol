import os
import sys
import numpy as np
from PIL import Image, ImageFilter

def compile_master_8k_relief_and_bathymetry(
    width=8192, height=4096,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_relief_rgba='client/src/assets/world_relief.rgba',
    output_relief_png='client/src/assets/world_relief.png',
    output_bathy_rgba='client/src/assets/world_bathymetry.rgba',
    output_bathy_png='client/src/assets/world_bathymetry.png'
):
    print(f"=== [ART-03-ULTRA] MASTER 8K RELIEF & BATHYMETRY ({width}x{height}) ===")
    Image.MAX_IMAGE_PIXELS = None

    # 1. Load Visual Land Mask and upscale to 8192x4096 with high-quality filter
    print(f"Loading authoritative visual mask and resizing to {width}x{height}...")
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
    m_img = m_img.resize((width, height), Image.Resampling.BILINEAR)
    mask = np.array(m_img, dtype=np.uint8)
    is_water = (mask <= 128)

    # 2. Process Natural Earth II Master Land Cover (10800x5400) -> 8192x4096
    print(f"Loading Natural Earth II Master GeoTIFF: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    print(f"Original GeoTIFF size: {lc_img.size}. Applying multi-scale unsharp sharpening...")
    
    # Apply high-pass sharpening to bring out micro-ridges and mountain textures
    lc_sharp = lc_img.filter(ImageFilter.UnsharpMask(radius=2, percent=140, threshold=2))
    
    print(f"Resampling to {width}x{height} with Lanczos...")
    lc_8k = lc_sharp.resize((width, height), Image.Resampling.LANCZOS)
    
    lc_arr = np.array(lc_8k, dtype=np.float32) / 255.0

    # 3. Apply Grand-Strategy Military Color Balance
    print("Applying matte grand-strategy military color grading...")
    luma = lc_arr[:, :, 0] * 0.299 + lc_arr[:, :, 1] * 0.587 + lc_arr[:, :, 2] * 0.114
    
    sat_factor = 0.88
    contrast_factor = 1.08
    
    graded_land = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        ch = luma + (lc_arr[:, :, c] - luma) * sat_factor
        ch = np.power(np.clip(ch, 0.0, 1.0), contrast_factor)
        graded_land[:, :, c] = ch

    # Convert to 8-bit RGBA 8K Master Relief
    relief_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        relief_rgba[:, :, c] = np.clip(graded_land[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    relief_rgba[:, :, 3] = mask

    print(f"Writing 8K Master Relief {output_relief_rgba} ({relief_rgba.nbytes} bytes)...")
    relief_rgba.tofile(output_relief_rgba)
    
    # 4. Process Natural Earth Ocean Bottom Bathymetry (10800x5400) -> 8192x4096
    print(f"Loading Ocean Bottom Bathymetry: {bathy_tif}...")
    bathy_img = Image.open(bathy_tif)
    bathy_sharp = bathy_img.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))
    bathy_8k = bathy_sharp.resize((width, height), Image.Resampling.LANCZOS)
    
    bathy_arr = np.array(bathy_8k, dtype=np.float32)
    if bathy_arr.ndim == 2:
        bathy_luma = bathy_arr / 255.0
    else:
        bathy_luma = (bathy_arr[:, :, 0] * 0.299 + bathy_arr[:, :, 1] * 0.587 + bathy_arr[:, :, 2] * 0.114) / 255.0

    min_b = np.percentile(bathy_luma, 1)
    max_b = np.percentile(bathy_luma, 99)
    norm_bathy = np.clip((bathy_luma - min_b) / (max_b - min_b + 1e-5), 0.0, 1.0)
    
    # Coastal Contact Ambient Occlusion against land
    from scipy.ndimage import distance_transform_edt
    print("Computing 8K coastal contact ambient occlusion...")
    dist_from_land = distance_transform_edt(is_water)
    coastal_ao = np.clip(dist_from_land / 8.0, 0.0, 1.0)

    # Underwater hillshade / ridges
    hillshade = np.clip((bathy_luma - 0.5) * 0.6 + 0.5, 0.2, 0.8)

    bathy_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    bathy_rgba[:, :, 0] = (norm_bathy * 255.0).astype(np.uint8)     # R = Bathymetric Depth
    bathy_rgba[:, :, 1] = (coastal_ao * 255.0).astype(np.uint8)     # G = Coastal Contact Shadow
    bathy_rgba[:, :, 2] = (hillshade * 255.0).astype(np.uint8)      # B = Mid-ocean ridge hillshade
    bathy_rgba[:, :, 3] = (is_water * 255).astype(np.uint8)         # A = Water Mask

    print(f"Writing 8K Master Bathymetry {output_bathy_rgba} ({bathy_rgba.nbytes} bytes)...")
    bathy_rgba.tofile(output_bathy_rgba)

    print("=== [ART-03-ULTRA] 8K MASTER COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_master_8k_relief_and_bathymetry(width=8192, height=4096)
