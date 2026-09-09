import os
import sys
import numpy as np
from PIL import Image

def compile_natural_earth_relief(
    width=4096, height=2048,
    tif_path='tools/data/NE2_50M_SR/NE2_50M_SR/NE2_50M_SR.tif',
    mask_path='client/src/assets/world_visual_mask.bin',
    output_rgba_path='client/src/assets/world_relief.rgba',
    output_png_path='client/src/assets/world_relief.png'
):
    print(f"[ART-PASS] Compiling Natural Earth II Shaded Relief ({width}x{height})...")
    
    # 1. Load Natural Earth TIFF (175MB)
    print(f"Loading {tif_path}...")
    Image.MAX_IMAGE_PIXELS = None
    tif_img = Image.open(tif_path)
    print(f"TIFF Original Size: {tif_img.size}, Mode: {tif_img.mode}")
    
    # Resize to target 4096x2048
    if tif_img.size != (width, height):
        print(f"Resampling TIFF to {width}x{height} with high-quality Lanczos...")
        tif_img = tif_img.resize((width, height), Image.Resampling.LANCZOS)
    
    tif_arr = np.array(tif_img, dtype=np.float32)
    if tif_arr.ndim == 2:
        ne_r = tif_arr
        ne_g = tif_arr
        ne_b = tif_arr
    else:
        ne_r = tif_arr[:, :, 0]
        ne_g = tif_arr[:, :, 1]
        ne_b = tif_arr[:, :, 2]
        
    # Calculate Natural Earth luminance and hillshade relief component
    ne_luma = (ne_r * 0.299 + ne_g * 0.587 + ne_b * 0.114) / 255.0
    
    # High-contrast tone curve (darken valley shadows, crisp mountain ridge highlights)
    # Midtones centered around 0.5, shadows deepened, ridges sculpted
    relief_contrast = np.power(ne_luma, 1.25)
    
    # 2. Load Visual Land Mask (4096x2048)
    mask = None
    if os.path.exists(mask_path):
        raw_mask = np.fromfile(mask_path, dtype=np.uint8)
        if raw_mask.size == width * height:
            mask = raw_mask.reshape((height, width))
        else:
            m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
            m_img = m_img.resize((width, height), Image.Resampling.BILINEAR)
            mask = np.array(m_img, dtype=np.uint8)
    if mask is None:
        mask = np.full((height, width), 255, dtype=np.uint8)

    # 3. Geographic Coordinate Grids
    lats = np.linspace(90, -90, height, dtype=np.float32)[:, None]
    lons = np.linspace(-180, 180, width, dtype=np.float32)[None, :]
    lat_grid = np.repeat(lats, width, axis=1)
    lon_grid = np.repeat(lons, height, axis=0)
    abs_lat = np.abs(lat_grid)

    # 4. Master Grand-Strategy Biome Color Palettes (Matte, Serious, Military Atlas)
    C_TUNDRA_ICE    = np.array([126, 138, 145], dtype=np.float32) / 255.0 # Frost slate
    C_TAIGA_PINE    = np.array([46, 65, 49], dtype=np.float32) / 255.0    # Deep pine boreal
    C_FOREST_TEMP   = np.array([56, 78, 54], dtype=np.float32) / 255.0    # Temperate woodland olive
    C_PLAINS_STEP   = np.array([84, 94, 66], dtype=np.float32) / 255.0    # Steppe / Prairie sage
    C_DESERT_SAND   = np.array([142, 120, 84], dtype=np.float32) / 255.0  # Warm golden ochre
    C_DESERT_ROCK   = np.array([118, 92, 68], dtype=np.float32) / 255.0   # Terracotta clay
    C_JUNGLE_TROP   = np.array([40, 64, 38], dtype=np.float32) / 255.0    # Humid deep jungle
    C_MOUNTAIN_ROCK = np.array([96, 94, 90], dtype=np.float32) / 255.0    # Granite crag
    C_MOUNTAIN_SNOW = np.array([186, 194, 200], dtype=np.float32) / 255.0# Alpine snow
    C_WATER_RIVER   = np.array([14, 32, 44], dtype=np.float32) / 255.0    # Deep river navy

    # Biome weights
    w_polar = np.clip((abs_lat - 56.0) / 20.0, 0.0, 1.0)
    w_taiga = np.clip(1.0 - np.abs(abs_lat - 54.0) / 11.0, 0.0, 1.0)
    
    # Deserts
    w_desert = np.zeros((height, width), dtype=np.float32)
    w_desert += 1.0 * ((lat_grid >= 12) & (lat_grid <= 34) & (lon_grid >= -16) & (lon_grid <= 62)) # Sahara / Arabia
    w_desert += 0.85 * ((lat_grid >= 26) & (lat_grid <= 44) & (lon_grid >= 48) & (lon_grid <= 75)) # Iran / Central Asia
    w_desert += 0.9 * ((lat_grid >= 36) & (lat_grid <= 46) & (lon_grid >= 76) & (lon_grid <= 112)) # Gobi / Taklamakan
    w_desert += 0.95 * ((lat_grid >= -35) & (lat_grid <= -18) & (lon_grid >= 115) & (lon_grid <= 145)) # Australia
    w_desert += 0.8 * ((lat_grid >= 23) & (lat_grid <= 38) & (lon_grid >= -118) & (lon_grid <= -100)) # SW USA / Mexico
    w_desert += 0.85 * ((lat_grid >= -28) & (lat_grid <= -16) & (lon_grid >= -72) & (lon_grid <= -66)) # Atacama
    w_desert = np.clip(w_desert, 0.0, 1.0)

    # Rainforests
    w_jungle = np.zeros((height, width), dtype=np.float32)
    w_jungle += 1.0 * ((lat_grid >= -16) & (lat_grid <= 8) & (lon_grid >= -78) & (lon_grid <= -46)) # Amazon
    w_jungle += 1.0 * ((lat_grid >= -8) & (lat_grid <= 6) & (lon_grid >= 11) & (lon_grid <= 32))   # Congo
    w_jungle += 0.9 * ((lat_grid >= -10) & (lat_grid <= 22) & (lon_grid >= 95) & (lon_grid <= 145))# SE Asia
    w_jungle = np.clip(w_jungle, 0.0, 1.0)

    # Mountain elevation weight from Natural Earth relief
    # High relief contrast areas
    w_mountain = np.clip((relief_contrast - 0.55) / 0.35, 0.0, 1.0)
    w_high_snow = np.clip((relief_contrast - 0.82) / 0.18, 0.0, 1.0)

    biome_rgb = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        biome_rgb[:, :, c] = C_PLAINS_STEP[c]
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_taiga * 0.75) + C_TAIGA_PINE[c] * (w_taiga * 0.75)
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_polar) + C_TUNDRA_ICE[c] * w_polar
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_desert) + (C_DESERT_SAND[c] * 0.75 + C_DESERT_ROCK[c] * 0.25) * w_desert
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_jungle) + C_JUNGLE_TROP[c] * w_jungle
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_mountain) + C_MOUNTAIN_ROCK[c] * w_mountain
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_high_snow) + C_MOUNTAIN_SNOW[c] * w_high_snow

    # 5. Composite Natural Earth II Shaded Relief with Biome Coloration
    # Hillshade acts as luminance modulation
    shaded_terrain = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        shaded_terrain[:, :, c] = biome_rgb[:, :, c] * (0.35 + 1.15 * relief_contrast)

    # 6. Hydrography (Rivers & Lakes)
    water_drainage = np.zeros((height, width), dtype=np.float32)
    
    def add_lake(lat_c, lon_c, rad_lat, rad_lon, depth=1.0):
        dist = ((lat_grid - lat_c)/rad_lat)**2 + ((lon_grid - lon_c)/rad_lon)**2
        water_drainage[dist <= 1.0] = np.maximum(water_drainage[dist <= 1.0], depth)
        
    add_lake(47.5, -87.5, 1.2, 2.2) # Lake Superior
    add_lake(44.0, -86.5, 1.8, 1.0) # Lake Michigan
    add_lake(44.8, -82.5, 1.4, 1.6) # Lake Huron
    add_lake(42.2, -81.2, 0.8, 1.8) # Lake Erie
    add_lake(43.7, -77.8, 0.7, 1.3) # Lake Ontario
    add_lake(42.0, 50.5, 4.8, 2.4)  # Caspian Sea
    add_lake(-1.0, 33.0, 1.8, 1.8)  # Lake Victoria
    add_lake(-6.0, 29.8, 3.2, 0.6)  # Lake Tanganyika
    add_lake(-12.0, 34.3, 2.5, 0.5) # Lake Malawi
    add_lake(53.5, 108.0, 2.8, 0.6) # Lake Baikal
    add_lake(46.0, 75.0, 0.9, 2.5)  # Lake Balkhash
    add_lake(65.5, -120.0, 1.2, 1.5)# Great Bear Lake
    add_lake(62.5, -114.0, 1.2, 1.8)# Great Slave Lake
    add_lake(52.5, -98.0, 1.8, 0.9) # Lake Winnipeg

    def add_river_curve(points, width_pix=2.2):
        for i in range(len(points)-1):
            p1, p2 = points[i], points[i+1]
            n_steps = max(10, int(np.hypot((p2[0]-p1[0])/180*height, (p2[1]-p1[1])/360*width) * 2))
            for s in range(n_steps + 1):
                t = s / n_steps
                rlat = p1[0] + (p2[0] - p1[0]) * t
                rlon = p1[1] + (p2[1] - p1[1]) * t
                y_p = int((90.0 - rlat) / 180.0 * height)
                x_p = int((rlon + 180.0) / 360.0 * width)
                if 0 <= y_p < height and 0 <= x_p < width:
                    rad = int(width_pix)
                    y_min, y_max = max(0, y_p - rad), min(height, y_p + rad + 1)
                    x_min, x_max = max(0, x_p - rad), min(width, x_p + rad + 1)
                    water_drainage[y_min:y_max, x_min:x_max] = 1.0

    add_river_curve([(4.0, 31.5), (9.5, 31.8), (15.6, 32.5), (19.0, 30.5), (24.0, 32.8), (30.0, 31.2), (31.5, 31.0)]) # Nile
    add_river_curve([(-5.0, -73.5), (-3.5, -68.0), (-3.1, -60.0), (-2.5, -54.5), (-0.5, -49.5)]) # Amazon
    add_river_curve([(47.5, -95.0), (43.0, -91.0), (37.0, -89.0), (33.0, -91.0), (29.0, -89.2)]) # Mississippi
    add_river_curve([(48.0, 8.2), (48.3, 14.3), (47.8, 19.0), (44.8, 20.5), (44.2, 26.0), (45.2, 29.5)]) # Danube
    add_river_curve([(46.8, 9.5), (48.5, 8.0), (50.0, 8.3), (51.8, 6.0)]) # Rhine
    add_river_curve([(57.2, 32.5), (56.0, 44.0), (53.5, 49.0), (48.5, 44.5), (46.0, 48.0)]) # Volga
    add_river_curve([(-10.0, 26.0), (-4.0, 27.0), (0.5, 25.0), (2.0, 22.0), (-0.5, 18.0), (-4.3, 15.3), (-6.0, 12.3)]) # Congo
    add_river_curve([(33.0, 91.0), (28.0, 101.0), (29.5, 107.0), (30.5, 114.5), (32.0, 121.5)]) # Yangtze
    add_river_curve([(35.0, 96.0), (36.0, 103.0), (40.5, 109.0), (34.8, 110.5), (37.5, 119.0)]) # Yellow
    add_river_curve([(30.5, 79.0), (26.5, 83.0), (25.0, 88.0), (22.5, 90.5)]) # Ganges
    add_river_curve([(31.5, 81.5), (35.0, 75.0), (30.0, 71.0), (24.0, 67.5)]) # Indus

    for c in range(3):
        shaded_terrain[:, :, c] = shaded_terrain[:, :, c] * (1.0 - water_drainage) + C_WATER_RIVER[c] * water_drainage

    # 7. Subtle Cartographic Paper Grain
    np.random.seed(1944)
    grain = 0.975 + 0.05 * np.random.rand(height, width)
    shaded_terrain *= grain[:, :, None]

    # Convert to 8-bit RGBA
    final_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        final_rgba[:, :, c] = np.clip(shaded_terrain[:, :, c] * 255.0, 0, 255).astype(np.uint8)
    final_rgba[:, :, 3] = mask

    print(f"[ART-PASS] Writing output binary {output_rgba_path} ({final_rgba.nbytes} bytes)...")
    final_rgba.tofile(output_rgba_path)

    print(f"[ART-PASS] Writing PNG texture {output_png_path}...")
    img = Image.fromarray(final_rgba, mode='RGBA')
    img.save(output_png_path, optimize=True)

    print("[ART-PASS] Official Natural Earth Shaded Relief Compilation Complete!")
    return final_rgba

if __name__ == '__main__':
    compile_natural_earth_relief(width=4096, height=2048)
