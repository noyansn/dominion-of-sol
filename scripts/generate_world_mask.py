import json
import os
import struct

WIDTH = 360
HEIGHT = 180

def create_world_grid():
    # 0 = Land (Plains), 2 = Water (Ocean/Sea)
    # Default everything to Water (2)
    grid = [[2 for _ in range(WIDTH)] for _ in range(HEIGHT)]

    def lon_lat_to_xy(lon, lat):
        x = int(round(lon + 180)) % WIDTH
        y = int(round(90 - lat))
        y = max(0, min(HEIGHT - 1, y))
        return x, y

    def fill_poly(coords):
        # Scanline polygon fill in (lon, lat) space
        pts = [lon_lat_to_xy(lon, lat) for lon, lat in coords]
        if not pts:
            return
        
        min_y = max(0, min(p[1] for p in pts))
        max_y = min(HEIGHT - 1, max(p[1] for p in pts))

        for y in range(min_y, max_y + 1):
            nodes = []
            j = len(pts) - 1
            for i in range(len(pts)):
                p1 = pts[i]
                p2 = pts[j]
                if (p1[1] < y <= p2[1]) or (p2[1] < y <= p1[1]):
                    x = p1[0] + (y - p1[1]) / (p2[1] - p1[1]) * (p2[0] - p1[0])
                    nodes.append(x)
                j = i
            nodes.sort()
            for k in range(0, len(nodes) - 1, 2):
                x_start = max(0, int(round(nodes[k])))
                x_end = min(WIDTH - 1, int(round(nodes[k+1])))
                for x in range(x_start, x_end + 1):
                    grid[y][x] = 0 # Land

    def fill_rect(lon_min, lon_max, lat_min, lat_max):
        poly = [
            (lon_min, lat_min),
            (lon_max, lat_min),
            (lon_max, lat_max),
            (lon_min, lat_max),
        ]
        fill_poly(poly)

    def fill_circle(lon_c, lat_c, radius_deg):
        cx, cy = lon_lat_to_xy(lon_c, lat_c)
        r = int(round(radius_deg))
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx*dx + dy*dy <= r*r:
                    nx = (cx + dx) % WIDTH
                    ny = cy + dy
                    if 0 <= ny < HEIGHT:
                        grid[ny][nx] = 0

    # 1. NORTH AMERICA
    # Alaska & Yukon
    fill_poly([(-168, 65), (-165, 71), (-140, 70), (-130, 69), (-130, 56), (-160, 56), (-168, 65)])
    # Canada & Northern US
    fill_poly([(-140, 69), (-130, 69), (-120, 69), (-85, 69), (-65, 60), (-55, 52), (-60, 46), (-68, 44), (-80, 44), (-95, 49), (-125, 49), (-130, 56), (-140, 69)])
    # Labrador & Quebec
    fill_poly([(-75, 62), (-60, 60), (-55, 52), (-65, 47), (-75, 50), (-80, 56), (-75, 62)])
    # Greenland
    fill_poly([(-55, 60), (-20, 70), (-18, 82), (-45, 83), (-70, 76), (-55, 60)])
    # Western USA
    fill_poly([(-125, 49), (-110, 49), (-100, 49), (-100, 32), (-115, 32), (-120, 35), (-124, 40), (-125, 49)])
    # Eastern USA & Midwest
    fill_poly([(-100, 49), (-80, 45), (-70, 43), (-75, 35), (-81, 25), (-82, 30), (-90, 30), (-97, 26), (-100, 32), (-100, 49)])
    # Florida
    fill_poly([(-83, 30), (-80, 30), (-80, 25), (-82, 25), (-83, 30)])
    # Mexico
    fill_poly([(-117, 32), (-100, 32), (-97, 26), (-90, 20), (-92, 16), (-100, 16), (-106, 23), (-110, 23), (-115, 30), (-117, 32)])
    # Baja California
    fill_poly([(-116, 32), (-114, 32), (-109, 23), (-112, 24), (-116, 32)])
    # Central America
    fill_poly([(-92, 16), (-83, 15), (-77, 8), (-80, 8), (-85, 10), (-90, 14), (-92, 16)])
    # Caribbean Islands (Cuba, Hispaniola)
    fill_poly([(-85, 23), (-74, 21), (-75, 19), (-84, 21), (-85, 23)])
    fill_poly([(-74, 20), (-68, 18), (-68, 17), (-74, 18), (-74, 20)])

    # 2. SOUTH AMERICA
    # Northern SA (Colombia, Venezuela, Guianas)
    fill_poly([(-77, 8), (-60, 10), (-50, 5), (-50, 0), (-70, 0), (-77, 4), (-77, 8)])
    # Brazil (Amazon, Northeast, Central)
    fill_poly([(-70, 0), (-50, 5), (-35, -5), (-35, -12), (-40, -22), (-48, -28), (-58, -20), (-70, -10), (-70, 0)])
    # West Coast (Ecuador, Peru, Chile)
    fill_poly([(-80, 0), (-70, 0), (-70, -15), (-68, -25), (-70, -40), (-74, -54), (-71, -55), (-75, -45), (-76, -30), (-81, -5), (-80, 0)])
    # Southern SA (Bolivia, Paraguay, Argentina, Uruguay, Patagonia)
    fill_poly([(-70, -15), (-58, -20), (-48, -28), (-53, -35), (-60, -40), (-65, -50), (-70, -55), (-68, -25), (-70, -15)])

    # 3. EUROPE
    # British Isles
    fill_poly([(-5, 50), (1, 51), (0, 58), (-4, 58), (-5, 50)]) # Great Britain
    fill_poly([(-10, 51), (-6, 52), (-6, 55), (-10, 54), (-10, 51)]) # Ireland
    # Scandinavia (Norway, Sweden, Finland)
    fill_poly([(5, 58), (12, 56), (18, 56), (30, 60), (32, 70), (20, 71), (5, 62), (5, 58)])
    # Western Europe (France, Low Countries, Germany)
    fill_poly([(-4, 48), (8, 54), (15, 54), (15, 46), (6, 44), (-1, 43), (-4, 48)])
    # Iberian Peninsula (Spain & Portugal)
    fill_poly([(-9, 43), (-2, 43), (3, 42), (0, 36), (-6, 36), (-9, 37), (-9, 43)])
    # Italy
    fill_poly([(8, 45), (14, 45), (18, 40), (16, 38), (14, 41), (10, 44), (8, 45)])
    # Central & Eastern Europe
    fill_poly([(15, 54), (35, 56), (38, 47), (28, 44), (20, 42), (15, 46), (15, 54)])
    # Western Russia / Moscow / Volga
    fill_poly([(30, 62), (60, 62), (60, 48), (40, 46), (30, 52), (30, 62)])
    # Balkans & Greece
    fill_poly([(18, 44), (28, 44), (28, 40), (24, 37), (20, 39), (18, 44)])
    # Anatolia (Turkey)
    fill_poly([(26, 42), (44, 42), (44, 37), (30, 36), (26, 38), (26, 42)])

    # 4. AFRICA
    # North Africa (Morocco, Algeria, Tunisia, Libya, Egypt)
    fill_poly([(-13, 28), (-5, 36), (10, 37), (12, 32), (25, 32), (34, 31), (34, 22), (25, 20), (-10, 20), (-13, 28)])
    # West Africa
    fill_poly([(-17, 15), (-10, 20), (5, 20), (10, 5), (0, 5), (-15, 10), (-17, 15)])
    # Central Africa & Congo
    fill_poly([(5, 20), (30, 20), (30, -5), (12, -5), (10, 5), (5, 20)])
    # East & Horn of Africa (Sudan, Ethiopia, Somalia, Kenya, Tanzania)
    fill_poly([(30, 22), (40, 18), (51, 11), (42, -5), (35, -12), (30, -5), (30, 22)])
    # Southern Africa (Angola, Namibia, South Africa, Mozambique)
    fill_poly([(12, -5), (30, -5), (35, -12), (32, -28), (28, -34), (18, -34), (12, -18), (12, -5)])
    # Madagascar
    fill_poly([(44, -12), (50, -13), (48, -25), (43, -25), (44, -12)])

    # 5. ASIA
    # Russia & Siberia (Urals to Pacific)
    fill_poly([(35, 56), (60, 58), (100, 58), (140, 58), (170, 65), (180, 65), (180, 72), (100, 75), (40, 70), (35, 56)])
    fill_poly([(-180, 65), (-170, 65), (-170, 68), (-180, 68)]) # Chukotka tip wrapping around
    # Central Asia & Kazakhstan
    fill_poly([(45, 55), (85, 55), (85, 40), (55, 38), (45, 42), (45, 55)])
    # Middle East (Arabia, Iran)
    fill_poly([(34, 31), (45, 32), (60, 36), (63, 25), (55, 15), (45, 13), (38, 22), (34, 31)])
    # South Asia (India, Pakistan, Bangladesh)
    fill_poly([(65, 35), (88, 35), (92, 22), (80, 10), (77, 8), (72, 18), (65, 25), (65, 35)])
    fill_poly([(80, 9), (82, 9), (81, 6), (80, 6), (80, 9)]) # Sri Lanka
    # East Asia (China, Mongolia)
    fill_poly([(85, 52), (125, 52), (122, 40), (120, 30), (110, 20), (95, 22), (85, 30), (85, 52)])
    # Korea
    fill_poly([(124, 40), (130, 40), (129, 34), (125, 35), (124, 40)])
    # Japan (Honshu, Hokkaido, Kyushu)
    fill_poly([(130, 32), (135, 35), (141, 38), (142, 45), (138, 45), (133, 35), (130, 32)])
    # Southeast Asia (Indochina & Malay Peninsula)
    fill_poly([(95, 22), (110, 20), (108, 10), (103, 1), (98, 10), (95, 22)])
    # Indonesia & Philippines (Sumatra, Java, Borneo, Sulawesi, Luzon, Mindanao)
    fill_poly([(95, 5), (105, -5), (100, -6), (95, 0), (95, 5)]) # Sumatra
    fill_poly([(106, -6), (115, -8), (114, -7), (106, -6)]) # Java
    fill_poly([(109, 4), (118, 4), (117, -4), (110, -3), (109, 4)]) # Borneo
    fill_poly([(119, 1), (125, 1), (124, -5), (119, -3), (119, 1)]) # Sulawesi
    fill_poly([(120, 18), (125, 18), (126, 7), (121, 7), (120, 18)]) # Philippines

    # 6. AUSTRALIA & OCEANIA
    # Australia
    fill_poly([(113, -22), (120, -15), (135, -12), (142, -11), (153, -28), (150, -38), (138, -38), (130, -32), (115, -34), (113, -22)])
    # Tasmania
    fill_poly([(145, -41), (148, -41), (148, -43), (145, -43), (145, -41)])
    # Papua New Guinea
    fill_poly([(131, -1), (151, -5), (150, -10), (140, -8), (131, -3), (131, -1)])
    # New Zealand
    fill_poly([(172, -35), (178, -38), (175, -41), (172, -35)]) # North Island
    fill_poly([(168, -41), (174, -41), (170, -46), (167, -45), (168, -41)]) # South Island

    # Ensure strategic connectivity for 360x180:
    # 1. Bosphorus (Europe <-> Anatolia at x=206, y=48)
    bx_eu, by_eu = lon_lat_to_xy(28, 41)
    bx_an, by_an = lon_lat_to_xy(30, 41)
    grid[by_eu][bx_eu] = 0
    grid[by_an][bx_an] = 0

    # 2. Suez (Egypt <-> Sinai/Asia at lon=32, lat=30)
    sx, sy = lon_lat_to_xy(32, 30)
    grid[sy][sx] = 0

    # 3. Panama Isthmus (lon=-80, lat=9)
    px, py = lon_lat_to_xy(-80, 9)
    grid[py][px] = 0

    return grid

def main():
    grid = create_world_grid()
    os.makedirs("assets/world", exist_ok=True)
    
    # Flatten to byte array (64,800 bytes)
    flat_bytes = bytearray()
    land_count = 0
    water_count = 0
    
    for y in range(HEIGHT):
        for x in range(WIDTH):
            val = grid[y][x]
            flat_bytes.append(val)
            if val == 0:
                land_count += 1
            else:
                water_count += 1

    with open("assets/world/world_land_mask.bin", "wb") as f:
        f.write(flat_bytes)

    print(f"Generated assets/world/world_land_mask.bin: {len(flat_bytes)} bytes")
    print(f"Land Cells: {land_count} ({land_count / (WIDTH*HEIGHT) * 100:.1f}%), Water Cells: {water_count} ({water_count / (WIDTH*HEIGHT) * 100:.1f}%)")

    # Strategic chokepoints metadata
    metadata = {
        "width": WIDTH,
        "height": HEIGHT,
        "totalCells": WIDTH * HEIGHT,
        "aspectRatio": "2:1",
        "chokepoints": [
            {
                "id": "bosphorus",
                "name": "Bosphorus Strait",
                "type": "STRAIT",
                "coordA": {"x": 208, "y": 49, "name": "Thrace (Europe)"},
                "coordB": {"x": 210, "y": 49, "name": "Anatolia (Asia)"},
                "strategicValue": 100
            },
            {
                "id": "dardanelles",
                "name": "Dardanelles Strait",
                "type": "STRAIT",
                "coordA": {"x": 206, "y": 50, "name": "Gallipoli"},
                "coordB": {"x": 208, "y": 50, "name": "Troas"},
                "strategicValue": 90
            },
            {
                "id": "gibraltar",
                "name": "Strait of Gibraltar",
                "type": "STRAIT",
                "coordA": {"x": 174, "y": 54, "name": "Iberia"},
                "coordB": {"x": 174, "y": 56, "name": "Morocco"},
                "strategicValue": 95
            },
            {
                "id": "suez",
                "name": "Suez Canal / Isthmus",
                "type": "ISTHMUS",
                "coordA": {"x": 212, "y": 60, "name": "Nile Delta"},
                "coordB": {"x": 213, "y": 60, "name": "Sinai Peninsula"},
                "strategicValue": 100
            },
            {
                "id": "panama",
                "name": "Panama Isthmus",
                "type": "ISTHMUS",
                "coordA": {"x": 100, "y": 81, "name": "Central America"},
                "coordB": {"x": 102, "y": 82, "name": "South America"},
                "strategicValue": 95
            },
            {
                "id": "english_channel",
                "name": "English Channel",
                "type": "STRAIT",
                "coordA": {"x": 179, "y": 39, "name": "Dover (Britain)"},
                "coordB": {"x": 181, "y": 40, "name": "Calais (France)"},
                "strategicValue": 85
            }
        ]
    }

    with open("assets/world/world_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("Generated assets/world/world_metadata.json with 6 strategic chokepoint nodes.")

if __name__ == "__main__":
    main()
