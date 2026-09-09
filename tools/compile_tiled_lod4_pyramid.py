import os
import sys
import numpy as np
from PIL import Image

def compile_tiled_lod4_pyramid():
    Image.MAX_IMAGE_PIXELS = None
    print("=== [TILED-LOD4-PIPELINE] COMPILING REAL 21.6K SRTM LOD2, LOD3, AND LOD4 PYRAMIDS ===")

    tiles_dir = 'client/public/tiles'
    sr_hr_tif = 'tools/data/SR_HR/SR_HR.tif'
    mask_path = 'client/src/assets/world_visual_mask.bin'

    raw_mask = np.fromfile(mask_path, dtype=np.uint8).reshape((2048, 4096))
    sr_img = Image.open(sr_hr_tif)
    sr_w, sr_h = sr_img.size
    print(f"Loaded Real SRTM Plus Dataset: {sr_w}x{sr_h} pixels ({sr_img.mode})")

    tile_size = 512

    # We generate LOD2 (16x8), LOD3 (32x16), and LOD4 (64x32)
    pyramids = [
        (2, 16, 8),
        (3, 32, 16),
        (4, 64, 32)
    ]

    for lod_level, cols, rows in pyramids:
        lod_dir = os.path.join(tiles_dir, f"lod{lod_level}")
        os.makedirs(lod_dir, exist_ok=True)
        print(f"Compiling LOD{lod_level} Pyramid: {cols}x{rows} = {cols*rows} tiles (512x512)...")

        tile_count = 0
        for row in range(rows):
            src_y0 = int(row * sr_h / rows)
            src_y1 = int((row + 1) * sr_h / rows)

            # Quick check on mask to see if tile has any land/water interesting feature
            mask_y0 = int(row * 2048 / rows)
            mask_y1 = int((row + 1) * 2048 / rows)

            for col in range(cols):
                src_x0 = int(col * sr_w / cols)
                src_x1 = int((col + 1) * sr_w / cols)

                tile_crop = sr_img.crop((src_x0, src_y0, src_x1, src_y1))
                tile_512 = tile_crop.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
                
                tile_path = os.path.join(lod_dir, f"{col}_{row}.png")
                tile_512.save(tile_path, optimize=True)
                tile_count += 1

        print(f"LOD{lod_level} complete: {tile_count} tiles generated in {lod_dir}.")

    print("=== [TILED-LOD4-PIPELINE] ALL LOD2, LOD3, LOD4 PYRAMIDS COMPILED SUCCESSFULLY! ===")

if __name__ == '__main__':
    compile_tiled_lod4_pyramid()
