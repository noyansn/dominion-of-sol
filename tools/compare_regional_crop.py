import os
import numpy as np
from PIL import Image

def compare_regional_vs_global():
    Image.MAX_IMAGE_PIXELS = None
    # Regional tile for Anatolia: col 9, row 3 (of 16x8 grid)
    # Col 9: Lon [22.5°E, 45.0°E]
    # Row 3: Lat [22.5°N, 45.0°N] -> Covers Aegean, Greece, Turkey, Levant
    reg_tile_path = 'client/public/tiles/regional/9_3.png'
    reg_tile = Image.open(reg_tile_path).convert('L')
    reg_arr = np.array(reg_tile, dtype=np.float32)

    # Global 4096 base map crop of the same exact region (col 9/16, row 3/8)
    # Global width 4096, height 2048
    # Crop: x in [9*256, 10*256] = [2304, 2560], y in [3*256, 4*256] = [768, 1024]
    sr_hr = Image.open('tools/data/SR_HR/SR_HR.tif').convert('L')
    global_4k = sr_hr.resize((4096, 2048), Image.Resampling.LANCZOS)
    global_crop = global_4k.crop((2304, 768, 2560, 1024)).resize((512, 512), Image.Resampling.LANCZOS)
    glob_arr = np.array(global_crop, dtype=np.float32)

    diff = np.abs(reg_arr - glob_arr)
    mean_diff = np.mean(diff)
    non_identical_pct = np.mean(diff > 0.5) * 100.0

    print(f"REGIONAL TILE ID: regional_9_3 (Anatolia & Eastern Mediterranean)")
    print(f"Regional Tile Source Res: 512x512 (sampled from native 1350x1350 SRTM Plus window)")
    print(f"Global Crop Effective Res: 256x256 upsampled to 512x512")
    print(f"Mean Absolute Difference: {mean_diff:.2f} grayscale levels")
    print(f"Non-Identical Pixels: {non_identical_pct:.1f}%")

if __name__ == '__main__':
    compare_regional_vs_global()
