const fs = require('fs');

const WIDTH = 1024;
const HEIGHT = 512;
const VIS_WIDTH = 4096;
const VIS_HEIGHT = 2048;

const existing = fs.readFileSync('../server/assets/world_grid.bin');
const candidate = fs.readFileSync('../server/assets/world_grid_candidate.bin');
const visMask = fs.readFileSync('../client/src/assets/world_visual_mask.bin');

// 1. Basic Stats
let existLand = 0, candLand = 0;
let w2l = 0, l2w = 0, totalChanged = 0;

for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const e = existing[i] === 0;
    const c = candidate[i] === 0;
    if (e) existLand++;
    if (c) candLand++;
    if (e && !c) l2w++;
    if (!e && c) w2l++;
    if (e !== c) totalChanged++;
}

console.log(`EXISTING GRID:
land = ${existLand}
water = ${WIDTH*HEIGHT - existLand}

CANDIDATE GRID:
land = ${candLand}
water = ${WIDTH*HEIGHT - candLand}

DIFF:
water->land = ${w2l}
land->water = ${l2w}
total changed = ${totalChanged}
percent = ${(totalChanged / (WIDTH*HEIGHT) * 100).toFixed(2)}%
`);

// 2. Geography Agreement
function measureAgreement(grid) {
    let falseWater = 0;
    let falseLand = 0;
    let truePos = 0, trueNeg = 0;
    
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const isGridLand = grid[y * WIDTH + x] === 0;
            
            // Check the 4x4 block in visMask
            let visHasLand = false;
            for (let vy = y*4; vy < y*4+4; vy++) {
                for (let vx = x*4; vx < x*4+4; vx++) {
                    if (visMask[vy * VIS_WIDTH + vx] >= 128) {
                        visHasLand = true; break;
                    }
                }
                if (visHasLand) break;
            }
            
            if (isGridLand && visHasLand) truePos++;
            else if (!isGridLand && !visHasLand) trueNeg++;
            else if (isGridLand && !visHasLand) falseLand++;
            else if (!isGridLand && visHasLand) falseWater++;
        }
    }
    const agreement = ((truePos + trueNeg) / (WIDTH * HEIGHT) * 100).toFixed(2);
    return { falseWater, falseLand, agreement };
}

const eAgree = measureAgreement(existing);
const cAgree = measureAgreement(candidate);

console.log(`GEOGRAPHY AGREEMENT:
existing = False Water: ${eAgree.falseWater}, False Land: ${eAgree.falseLand}, Agreement: ${eAgree.agreement}%
candidate = False Water: ${cAgree.falseWater}, False Land: ${cAgree.falseLand}, Agreement: ${cAgree.agreement}%
`);

// 3. Island Matrix
const islands = [
    { name: 'Great Britain', minLon: -8.0, maxLon: 1.7, minLat: 50.0, maxLat: 58.7 },
    { name: 'Ireland', minLon: -10.5, maxLon: -5.5, minLat: 51.0, maxLat: 55.5 },
    { name: 'Iceland', minLon: -24.5, maxLon: -13.5, minLat: 63.3, maxLat: 66.5 },
    { name: 'Sardinia', minLon: 8.0, maxLon: 10.0, minLat: 38.5, maxLat: 41.5 },
    { name: 'Corsica', minLon: 8.5, maxLon: 9.6, minLat: 41.3, maxLat: 43.1 },
    { name: 'Sicily', minLon: 12.0, maxLon: 15.7, minLat: 36.5, maxLat: 38.5 },
    { name: 'Japan', minLon: 128.0, maxLon: 146.0, minLat: 31.0, maxLat: 46.0 },
    { name: 'New Zealand North', minLon: 172.0, maxLon: 179.0, minLat: -42.0, maxLat: -34.0 },
    { name: 'New Zealand South', minLon: 166.0, maxLon: 174.0, minLat: -47.0, maxLat: -40.0 },
    { name: 'Madagascar', minLon: 43.0, maxLon: 51.0, minLat: -26.0, maxLat: -11.0 },
    { name: 'Sri Lanka', minLon: 79.0, maxLon: 82.0, minLat: 5.0, maxLat: 10.0 },
    { name: 'Taiwan', minLon: 120.0, maxLon: 122.0, minLat: 21.0, maxLat: 26.0 },
    { name: 'Cuba', minLon: -85.0, maxLon: -74.0, minLat: 19.0, maxLat: 24.0 },
    { name: 'Hispaniola', minLon: -75.0, maxLon: -68.0, minLat: 17.5, maxLat: 20.0 }
];

console.log("ISLAND MATRIX:");
console.log("| Region | Existing grid | Candidate |");
console.log("| :--- | :--- | :--- |");
for (let isl of islands) {
    const minX = Math.floor((isl.minLon + 180) / 360 * WIDTH);
    const maxX = Math.floor((isl.maxLon + 180) / 360 * WIDTH);
    const minY = Math.floor((90 - isl.maxLat) / 180 * HEIGHT);
    const maxY = Math.floor((90 - isl.minLat) / 180 * HEIGHT);
    
    let eCnt = 0, cCnt = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (x>=0 && x<WIDTH && y>=0 && y<HEIGHT) {
                if (existing[y*WIDTH + x] === 0) eCnt++;
                if (candidate[y*WIDTH + x] === 0) cCnt++;
            }
        }
    }
    console.log(`| ${isl.name} | ${eCnt} cells | ${cCnt} cells |`);
}
console.log("");

// 4. Connected Components
function getComponents(grid) {
    const visited = new Uint8Array(WIDTH * HEIGHT);
    const comps = [];
    
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        if (grid[i] === 0 && visited[i] === 0) {
            let size = 0;
            const q = [i];
            visited[i] = 1;
            while (q.length > 0) {
                const curr = q.pop();
                size++;
                const cx = curr % WIDTH, cy = Math.floor(curr / WIDTH);
                const neighbors = [
                    [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]
                ];
                for (let n of neighbors) {
                    if (n[0]>=0 && n[0]<WIDTH && n[1]>=0 && n[1]<HEIGHT) {
                        const idx = n[1]*WIDTH + n[0];
                        if (grid[idx] === 0 && visited[idx] === 0) {
                            visited[idx] = 1;
                            q.push(idx);
                        }
                    }
                }
            }
            comps.push(size);
        }
    }
    comps.sort((a,b) => b - a);
    return comps;
}

const eComps = getComponents(existing);
const cComps = getComponents(candidate);

function formatComps(comps) {
    const total = comps.length;
    const largest20 = comps.slice(0, 20).join(',');
    const geq2 = comps.filter(c => c >= 2).length;
    const singles = comps.filter(c => c === 1).length;
    return `total=${total}, >=2 cells=${geq2}, singles=${singles}, largest20=[${largest20}]`;
}

console.log(`LAND COMPONENTS:
existing = ${formatComps(eComps)}
candidate = ${formatComps(cComps)}
`);

// 5. Water/Lake tests
const lakes = [
    { name: 'Great Lakes', lon: -87, lat: 45 },
    { name: 'Lake Victoria', lon: 33, lat: -1 },
    { name: 'Lake Tanganyika', lon: 29.5, lat: -6 },
    { name: 'Lake Baikal', lon: 108, lat: 53.5 },
    { name: 'Caspian Sea', lon: 51, lat: 42 }
];

let waterTestPassed = true;
for (let l of lakes) {
    const x = Math.floor((l.lon + 180) / 360 * WIDTH);
    const y = Math.floor((90 - l.lat) / 180 * HEIGHT);
    if (candidate[y*WIDTH + x] !== 2) {
        console.log(`Lake ${l.name} failed (is land at ${x},${y})`);
        waterTestPassed = false;
    }
}
const criticalWater = [
    { name: 'Atlantic', lon: -30, lat: 0 },
    { name: 'Pacific', lon: -150, lat: 0 },
    { name: 'Indian Ocean', lon: 80, lat: -20 },
    { name: 'Mediterranean', lon: 18, lat: 34 },
    { name: 'North Sea', lon: 2, lat: 57 }
];
for (let w of criticalWater) {
    const x = Math.floor((w.lon + 180) / 360 * WIDTH);
    const y = Math.floor((90 - w.lat) / 180 * HEIGHT);
    let allWater = true;
    for (let dy=-2; dy<=2; dy++) {
        for (let dx=-2; dx<=2; dx++) {
            if (candidate[(y+dy)*WIDTH + (x+dx)] !== 2) {
                allWater = false;
            }
        }
    }
    if (!allWater) {
        console.log(`Critical water ${w.name} failed (has land in 5x5 nbhd)`);
        waterTestPassed = false;
    }
}
console.log(`WATER/LAKE TESTS:\n${waterTestPassed ? 'PASS' : 'FAIL'}`);

// Critical Land Probes
const criticalLand = [
    { name: 'Great Britain', lon: -2.5, lat: 54 },
    { name: 'Ireland', lon: -8, lat: 53 },
    { name: 'Iceland', lon: -19, lat: 65 },
    { name: 'Japan', lon: 138, lat: 36 },
    { name: 'New Zealand', lon: 174, lat: -41 },
    { name: 'Madagascar', lon: 47, lat: -19 },
    { name: 'Sri Lanka', lon: 81, lat: 7 },
    { name: 'Cuba', lon: -79, lat: 22 }
];
let landTestPassed = true;
for (let l of criticalLand) {
    const x = Math.floor((l.lon + 180) / 360 * WIDTH);
    const y = Math.floor((90 - l.lat) / 180 * HEIGHT);
    
    // check a 3x3 neighborhood for at least one land cell
    let hasLand = false;
    for (let dy=-1; dy<=1; dy++) {
        for (let dx=-1; dx<=1; dx++) {
            if (candidate[(y+dy)*WIDTH + (x+dx)] === 0) {
                hasLand = true;
            }
        }
    }
    if (!hasLand) {
        console.log(`Critical land ${l.name} failed (no land in 3x3 nbhd)`);
        landTestPassed = false;
    }
}
console.log(`\nCRITICAL LAND TESTS:\n${landTestPassed ? 'PASS' : 'FAIL'}`);
