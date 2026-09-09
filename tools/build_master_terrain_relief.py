import os
import sys
import numpy as np
from PIL import Image

def build_art_pass_terrain(width=4096, height=2048,
                           mask_path='client/src/assets/world_visual_mask.bin',
                           output_rgba_path='client/src/assets/world_relief.rgba',
                           output_png_path='client/src/assets/world_relief.png'):
    print(f"[ART-PASS] Building Master High-Res Terrain & Relief Texture ({width}x{height})...")
    
    # 1. Load Visual Land Mask (4096x2048)
    mask = None
    if os.path.exists(mask_path):
        raw_mask = np.fromfile(mask_path, dtype=np.uint8)
        if raw_mask.size == width * height:
            mask = raw_mask.reshape((height, width))
        elif raw_mask.size == 4096 * 2048 and (width, height) != (4096, 2048):
            m_img = Image.fromarray(raw_mask.reshape((2048, 4096)), mode='L')
            m_img = m_img.resize((width, height), Image.Resampling.BILINEAR)
            mask = np.array(m_img, dtype=np.uint8)
    
    if mask is None:
        mask = np.full((height, width), 255, dtype=np.uint8)
        
    land_bool = (mask > 128)
    
    # Latitudes (-90 to 90) and Longitudes (-180 to 180)
    lats = np.linspace(90, -90, height, dtype=np.float32)[:, None]
    lons = np.linspace(-180, 180, width, dtype=np.float32)[None, :]
    
    lat_grid = np.repeat(lats, width, axis=1)
    lon_grid = np.repeat(lons, height, axis=0)
    
    # Base elevation map in meters
    elevation = np.zeros((height, width), dtype=np.float32)
    
    # Helper to add mountain ranges with multi-octave ridge noise
    def add_mountain_range(lat_start, lat_end, lon_start, lon_end, max_elev, width_sigma, ridge_freq=35.0, curve_fn=None):
        mask_box = (lat_grid >= min(lat_start, lat_end)) & (lat_grid <= max(lat_start, lat_end)) & \
                   (lon_grid >= min(lon_start, lon_end)) & (lon_grid <= max(lon_start, lon_end))
        if not np.any(mask_box):
            return
        
        t = (lat_grid - lat_start) / (lat_end - lat_start + 1e-5)
        if curve_fn:
            center_lon = lon_start + (lon_end - lon_start) * t + curve_fn(t)
        else:
            center_lon = lon_start + (lon_end - lon_start) * t
            
        dist_deg = np.abs(lon_grid - center_lon)
        base_h = np.exp(-0.5 * (dist_deg / (width_sigma + 1e-4))**2)
        
        # Multi-octave ridge noise (creates sharp peaks and rugged ridges)
        noise1 = np.abs(np.sin(lon_grid * ridge_freq + lat_grid * (ridge_freq * 0.7)))
        noise2 = np.abs(np.cos(lat_grid * (ridge_freq * 1.8) - lon_grid * (ridge_freq * 0.9)))
        noise3 = 0.5 + 0.5 * np.sin(lon_grid * (ridge_freq * 3.5) + lat_grid * (ridge_freq * 2.8))
        
        ridge_profile = (1.0 - noise1 * 0.6) * (1.0 - noise2 * 0.3) * (0.8 + 0.2 * noise3)
        
        elev_contrib = base_h * ridge_profile * max_elev * mask_box
        np.maximum(elevation, elev_contrib, out=elevation)

    # 1. High Himalayas & Tibetan Plateau (Massive elevation + jagged peaks)
    tib_mask = (lat_grid >= 26) & (lat_grid <= 39) & (lon_grid >= 70) & (lon_grid <= 104)
    tib_elev = 4600.0 * np.exp(-0.5 * (((lat_grid - 32.5)/4.8)**2 + ((lon_grid - 87.0)/11.5)**2))
    tib_noise = 0.65 + 0.35 * np.sin(lon_grid * 35.0 + lat_grid * 25.0)
    elevation += tib_elev * tib_noise * tib_mask
    add_mountain_range(26.5, 36.0, 72.0, 98.0, 8848, 1.6, 65.0) # Main Himalayan Crest
    add_mountain_range(33.0, 39.0, 68.0, 78.0, 7800, 1.8, 55.0) # Karakoram / Hindu Kush
    add_mountain_range(37.0, 45.0, 72.0, 92.0, 6500, 2.2, 45.0) # Tian Shan / Altai
    add_mountain_range(48.0, 56.0, 85.0, 100.0, 4200, 2.5, 38.0)# Sayan Mountains
    add_mountain_range(52.0, 66.0, 125.0, 145.0, 3200, 3.0, 30.0)# Verkhoyansk / Chersky (Siberia)

    # 2. Andes (Continuous Spine along Western South America)
    add_mountain_range(-55, 11, -70, -74, 6960, 2.2, 50.0, curve_fn=lambda t: 4.5 * np.sin(t * np.pi * 1.4))
    
    # 3. North American Rockies, Cascades, Sierra Nevada & Coast Ranges
    add_mountain_range(31, 64, -106, -132, 4400, 3.8, 38.0) # Rockies
    add_mountain_range(34, 53, -119, -123, 4000, 1.8, 48.0) # Sierra Nevada & Cascades
    add_mountain_range(58, 65, -135, -152, 5800, 2.5, 45.0) # Alaska Range (Denali)
    add_mountain_range(16, 31, -98, -104, 3800, 3.0, 32.0)  # Sierra Madre (Mexico)
    add_mountain_range(34, 46, -84, -72, 2000, 2.8, 25.0)   # Appalachians

    # 4. European Ranges
    add_mountain_range(43.5, 47.8, 5.0, 16.0, 4810, 1.3, 70.0) # Alps (Mont Blanc)
    add_mountain_range(41.8, 43.2, -2.5, 3.2, 3400, 0.9, 75.0) # Pyrenees
    add_mountain_range(44.0, 50.0, 25.0, 18.0, 2650, 1.9, 45.0, curve_fn=lambda t: 4.2 * np.sin(t * np.pi)) # Carpathians
    add_mountain_range(37.5, 44.5, 15.5, 11.0, 2900, 1.4, 55.0)# Apennines
    add_mountain_range(39.0, 43.0, 20.0, 24.0, 2900, 1.8, 45.0)# Pindus / Balkans
    add_mountain_range(58.0, 70.0, 6.5, 22.0, 2460, 2.2, 40.0) # Scandinavian Mountains

    # 5. Urals (Continental Spine)
    add_mountain_range(49.0, 68.0, 58.5, 61.0, 2100, 1.5, 45.0)

    # 6. Caucasus & Middle East
    add_mountain_range(41.0, 43.8, 38.5, 48.5, 5642, 1.6, 58.0) # Caucasus (Elbrus)
    add_mountain_range(27.0, 37.0, 56.0, 44.0, 4400, 2.8, 38.0) # Zagros
    add_mountain_range(36.0, 39.5, 30.0, 43.0, 3900, 2.2, 40.0) # Taurus & Armenian Highlands
    add_mountain_range(35.0, 37.5, 49.0, 56.0, 5600, 1.4, 50.0) # Alborz (Damavand)

    # 7. Africa: Atlas, Ethiopian Highlands, Rift Peaks, Drakensberg
    add_mountain_range(29.0, 35.5, -9.5, 7.0, 4167, 2.4, 42.0)  # Atlas (Toubkal)
    add_mountain_range(4.0, 14.5, 36.0, 40.5, 4550, 3.8, 32.0)  # Ethiopian Highlands
    add_mountain_range(-4.0, 3.0, 34.0, 38.5, 5895, 2.0, 50.0)  # East African Rift (Kilimanjaro/Kenya)
    add_mountain_range(-33.0, -26.0, 26.0, 31.5, 3482, 2.0, 38.0) # Drakensberg

    # 8. Asia-Pacific: Japan, New Zealand, New Guinea, Australia
    add_mountain_range(32.0, 44.0, 131.0, 143.0, 3776, 1.3, 55.0) # Japan Alps (Fuji)
    add_mountain_range(-46.5, -40.0, 166.5, 174.5, 3724, 1.1, 60.0) # Southern Alps NZ (Aoraki)
    add_mountain_range(-6.5, -2.5, 134.0, 147.5, 4884, 2.2, 42.0) # New Guinea Highlands (Puncak Jaya)
    add_mountain_range(-38.0, -14.0, 146.5, 144.5, 2228, 2.5, 32.0) # Great Dividing Range

    # Low frequency regional plateaus (Anatolia, Iberia, Brazil, South Africa, Central Asia)
    elev_iberia = 900.0 * np.exp(-0.5 * (((lat_grid - 40.0)/2.5)**2 + ((lon_grid - -3.5)/3.5)**2))
    elev_anatolia = 1400.0 * np.exp(-0.5 * (((lat_grid - 39.0)/2.5)**2 + ((lon_grid - 34.0)/6.0)**2))
    elev_brazil = 1100.0 * np.exp(-0.5 * (((lat_grid - -18.0)/6.0)**2 + ((lon_grid - -45.0)/8.0)**2))
    elev_safrica = 1300.0 * np.exp(-0.5 * (((lat_grid - -25.0)/5.0)**2 + ((lon_grid - 25.0)/6.0)**2))
    elevation += elev_iberia + elev_anatolia + elev_brazil + elev_safrica
    
    # 2. Compute Shaded Relief / Hillshade (NW Directional Sun, 315 Azimuth, 48 Elevation)
    sun_azimuth = np.radians(315.0)
    sun_elevation = np.radians(46.0)
    
    dy, dx = np.gradient(elevation)
    slope = np.arctan(np.sqrt(dx**2 + dy**2) * 0.0075)
    aspect = np.arctan2(-dx, dy)
    
    hillshade = np.sin(sun_elevation) * np.cos(slope) + np.cos(sun_elevation) * np.sin(slope) * np.cos(sun_azimuth - aspect)
    hillshade = np.clip(hillshade, 0.0, 1.0)
    hillshade = np.power(hillshade, 1.30) # High-contrast ridges & shadows

    # 3. Hydrography Layer (Lakes & Major Rivers)
    water_drainage = np.zeros((height, width), dtype=np.float32)
    
    # Helper to draw water bodies
    def add_lake(lat_c, lon_c, rad_lat, rad_lon, depth=1.0):
        dist = ((lat_grid - lat_c)/rad_lat)**2 + ((lon_grid - lon_c)/rad_lon)**2
        water_drainage[dist <= 1.0] = np.maximum(water_drainage[dist <= 1.0], depth)
        
    # Major Lakes
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
    
    # Helper for major river lines
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

    # Draw Major River Networks:
    # Nile
    add_river_curve([(4.0, 31.5), (9.5, 31.8), (15.6, 32.5), (19.0, 30.5), (24.0, 32.8), (30.0, 31.2), (31.5, 31.0)])
    # Amazon
    add_river_curve([(-5.0, -73.5), (-3.5, -68.0), (-3.1, -60.0), (-2.5, -54.5), (-0.5, -49.5)])
    # Mississippi
    add_river_curve([(47.5, -95.0), (43.0, -91.0), (37.0, -89.0), (33.0, -91.0), (29.0, -89.2)])
    # Danube
    add_river_curve([(48.0, 8.2), (48.3, 14.3), (47.8, 19.0), (44.8, 20.5), (44.2, 26.0), (45.2, 29.5)])
    # Rhine
    add_river_curve([(46.8, 9.5), (48.5, 8.0), (50.0, 8.3), (51.8, 6.0)])
    # Volga
    add_river_curve([(57.2, 32.5), (56.0, 44.0), (53.5, 49.0), (48.5, 44.5), (46.0, 48.0)])
    # Congo
    add_river_curve([(-10.0, 26.0), (-4.0, 27.0), (0.5, 25.0), (2.0, 22.0), (-0.5, 18.0), (-4.3, 15.3), (-6.0, 12.3)])
    # Yangtze
    add_river_curve([(33.0, 91.0), (28.0, 101.0), (29.5, 107.0), (30.5, 114.5), (32.0, 121.5)])
    # Yellow River
    add_river_curve([(35.0, 96.0), (36.0, 103.0), (40.5, 109.0), (34.8, 110.5), (37.5, 119.0)])
    # Ganges & Indus
    add_river_curve([(30.5, 79.0), (26.5, 83.0), (25.0, 88.0), (22.5, 90.5)])
    add_river_curve([(31.5, 81.5), (35.0, 75.0), (30.0, 71.0), (24.0, 67.5)])

    # 4. Biome Color Palette Synthesis (Matte Military Art Direction)
    # Master Palette Colors (Linear RGB)
    C_TUNDRA_ICE    = np.array([128, 140, 148], dtype=np.float32) / 255.0 # Slate frost
    C_TAIGA_PINE    = np.array([48, 68, 52], dtype=np.float32) / 255.0    # Deep pine taiga
    C_FOREST_TEMP   = np.array([58, 80, 56], dtype=np.float32) / 255.0    # Temperate woodland olive
    C_PLAINS_STEP   = np.array([86, 96, 68], dtype=np.float32) / 255.0    # Steppe / Prairie sage
    C_DESERT_SAND   = np.array([142, 120, 84], dtype=np.float32) / 255.0  # Warm golden ochre
    C_DESERT_ROCK   = np.array([120, 94, 70], dtype=np.float32) / 255.0   # Terracotta clay
    C_JUNGLE_TROP   = np.array([42, 66, 40], dtype=np.float32) / 255.0    # Humid deep jungle
    C_MOUNTAIN_ROCK = np.array([98, 96, 92], dtype=np.float32) / 255.0    # Granite crag
    C_MOUNTAIN_SNOW = np.array([185, 192, 198], dtype=np.float32) / 255.0# Alpine snow
    C_WATER_RIVER   = np.array([16, 36, 48], dtype=np.float32) / 255.0    # Deep river navy

    abs_lat = np.abs(lat_grid)
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
    w_jungle += 0.9 * ((lat_grid >= -10) & (lat_grid <= 22) & (lon_grid >= 95) & (lon_grid <= 145))# SE Asia / Indonesia
    w_jungle = np.clip(w_jungle, 0.0, 1.0)

    w_mountain = np.clip((elevation - 1200.0) / 2800.0, 0.0, 1.0)
    w_high_snow = np.clip((elevation - 4200.0) / 2400.0, 0.0, 1.0)

    biome_rgb = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        biome_rgb[:, :, c] = C_PLAINS_STEP[c]
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_taiga * 0.75) + C_TAIGA_PINE[c] * (w_taiga * 0.75)
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_polar) + C_TUNDRA_ICE[c] * w_polar
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_desert) + (C_DESERT_SAND[c] * 0.75 + C_DESERT_ROCK[c] * 0.25) * w_desert
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_jungle) + C_JUNGLE_TROP[c] * w_jungle
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_mountain) + C_MOUNTAIN_ROCK[c] * w_mountain
        biome_rgb[:, :, c] = biome_rgb[:, :, c] * (1.0 - w_high_snow) + C_MOUNTAIN_SNOW[c] * w_high_snow

    # Apply Shaded Relief Hillshade
    shaded_terrain = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        shaded_terrain[:, :, c] = biome_rgb[:, :, c] * (0.42 + 1.02 * hillshade)

    # Blend Rivers & Lakes into Terrain
    for c in range(3):
        shaded_terrain[:, :, c] = shaded_terrain[:, :, c] * (1.0 - water_drainage) + C_WATER_RIVER[c] * water_drainage

    # Micro paper / grain texture
    np.random.seed(1944)
    grain = 0.97 + 0.06 * np.random.rand(height, width)
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

    print("[ART-PASS] Master Terrain & Shaded Relief Complete!")
    return final_rgba

if __name__ == '__main__':
    build_art_pass_terrain(width=4096, height=2048)
