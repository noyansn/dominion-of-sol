import os
import sys
import json
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def compile_terrain_lod2_tiles(
    world_width=8192,
    world_height=4096,
    cols=8,
    rows=4,
    tile_size=1024,
    landcover_tif='tools/data/NE2_50M_SR_W/NE2_50M_SR_W/NE2_50M_SR_W.tif',
    bathy_tif='tools/data/OB_50M/OB_50M/OB_50M.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_dir='client/public/assets/terrain/lod2'
):
    print(f"=== [ART-05] COMPILING LOD2 TERRAIN TILE PYRAMID ({cols}x{rows} = {cols*rows} TILES @ {tile_size}x{tile_size}) ===")
    Image.MAX_IMAGE_PIXELS = None
    os.makedirs(output_dir, exist_ok=True)

    # 1. Load and upscale Visual Land Mask to 8192x4096
    print(f"Loading visual land mask: {mask_path}...")
    raw_mask = np.fromfile(mask_path, dtype=np.uint8)
    m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
    m_img_8k = m_img.resize((world_width, world_height), Image.Resampling.NEAREST)
    mask_8k = np.array(m_img_8k, dtype=np.uint8)

    # 2. Load Master 10,800x5,400 Natural Earth II Landcover GeoTIFF
    print(f"Loading Natural Earth II Master Landcover: {landcover_tif}...")
    lc_img = Image.open(landcover_tif)
    lc_8k = lc_img.resize((world_width, world_height), Image.Resampling.LANCZOS)

    # Apply multi-scale meso/micro ridge unsharp enhancement for crisp close-zoom topography
    enhancer_col = ImageEnhance.Color(lc_8k)
    lc_graded = enhancer_col.enhance(1.18)
    enhancer_con = ImageEnhance.Contrast(lc_graded)
    lc_graded = enhancer_con.enhance(1.08)
    enhancer_bri = ImageEnhance.Brightness(lc_graded)
    lc_graded = enhancer_bri.enhance(0.94)

    # Unsharp mask for high-detail regional ridge definition
    lc_sharp = lc_graded.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))
    lc_arr_8k = np.array(lc_sharp, dtype=np.uint8)

    # Composite 8K master RGBA buffer
    full_rgba_8k = np.zeros((world_height, world_width, 4), dtype=np.uint8)
    full_rgba_8k[:, :, :3] = lc_arr_8k
    full_rgba_8k[:, :, 3] = mask_8k

    tile_w = world_width // cols   # 1024
    tile_h = world_height // rows  # 1024

    manifest = {
        "cols": cols,
        "rows": rows,
        "tileWorldWidth": 4096 / cols, # 512 world units
        "tileWorldHeight": 2048 / rows, # 512 world units
        "tilePixelSize": tile_size,
        "lodLevel": 2,
        "tiles": []
    }

    print(f"Slicing and saving {cols * rows} tiles to {output_dir}...")
    tile_count = 0
    total_bytes = 0

    for r in range(rows):
        for c in range(cols):
            x0 = c * tile_w
            x1 = (c + 1) * tile_w
            y0 = r * tile_h
            y1 = (r + 1) * tile_h

            tile_data = full_rgba_8k[y0:y1, x0:x1, :]
            
            # Check if tile has land
            has_land = bool(np.any(tile_data[:, :, 3] > 0))
            
            tile_filename = f"tile_{c}_{r}.rgba"
            tile_filepath = os.path.join(output_dir, tile_filename)
            
            tile_data.tofile(tile_filepath)
            tile_bytes = tile_data.nbytes
            total_bytes += tile_bytes
            tile_count += 1

            manifest["tiles"].append({
                "col": c,
                "row": r,
                "file": tile_filename,
                "hasLand": has_land,
                "bytes": tile_bytes,
                "worldBounds": [
                    c * (4096 / cols),
                    r * (2048 / rows),
                    (c + 1) * (4096 / cols),
                    (r + 1) * (2048 / rows)
                ]
            })

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"=== [ART-05] LOD2 TILE PYRAMID GENERATION COMPLETE ===")
    print(f"Total tiles: {tile_count} | Total disk size: {total_bytes / (1024*1024):.2f} MB")
    print(f"Manifest written: {manifest_path}")

if __name__ == '__main__':
    compile_terrain_lod2_tiles()
