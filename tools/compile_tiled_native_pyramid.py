import os
import sys
import numpy as np
from PIL import Image

def compile_native_tiled_pyramid():
    Image.MAX_IMAGE_PIXELS = None
    print("=== [NATIVE-TILED-PYRAMID] COMPILING REGIONAL (16x8) & NATIVE DETAIL (43x22) TILES ===")

    tiles_dir = 'client/public/tiles'
    sr_hr_tif = 'tools/data/SR_HR/SR_HR.tif'
    
    sr_img = Image.open(sr_hr_tif)
    sr_w, sr_h = sr_img.size
    print(f"Loaded Native 21.6K SRTM Plus Dataset: {sr_w}x{sr_h} pixels ({sr_img.mode})")

    tile_size = 512

    # 1. REGIONAL LEVEL (16 cols x 8 rows = 128 tiles, ~8192x4096)
    reg_dir = os.path.join(tiles_dir, "regional")
    os.makedirs(reg_dir, exist_ok=True)
    print("Compiling REGIONAL Tiles (16x8 = 128 tiles)...")
    for r in range(8):
        y0 = int(r * sr_h / 8)
        y1 = int((r + 1) * sr_h / 8)
        for c in range(16):
            x0 = int(c * sr_w / 16)
            x1 = int((c + 1) * sr_w / 16)
            crop = sr_img.crop((x0, y0, x1, y1))
            tile = crop.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
            tile.save(os.path.join(reg_dir, f"{c}_{r}.png"), optimize=True)

    # 2. NATIVE DETAIL LEVEL (43 cols x 22 rows = 946 tiles, native 21600x10800 sampling)
    det_dir = os.path.join(tiles_dir, "detail")
    os.makedirs(det_dir, exist_ok=True)
    print("Compiling NATIVE DETAIL Tiles (43x22 = 946 tiles)...")
    for r in range(22):
        y0 = int(r * sr_h / 22)
        y1 = int((r + 1) * sr_h / 22)
        for c in range(43):
            x0 = int(c * sr_w / 43)
            x1 = int((c + 1) * sr_w / 43)
            crop = sr_img.crop((x0, y0, x1, y1))
            tile = crop.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
            tile.save(os.path.join(det_dir, f"{c}_{r}.png"), optimize=True)

    print("=== [NATIVE-TILED-PYRAMID] COMPILATION COMPLETE! ===")

if __name__ == '__main__':
    compile_native_tiled_pyramid()
