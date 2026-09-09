const fs = require('fs');

const WIDTH = 1024;
const HEIGHT = 512;
const SIM_W = WIDTH;
const SIM_H = HEIGHT;

const v0 = fs.readFileSync('../world_grid_before_candidate.bin');
const v1 = fs.readFileSync('../server/assets/world_grid_candidate_v1.bin');
const v2 = fs.readFileSync('../server/assets/world_grid_candidate_v2.bin');
const visMask = fs.readFileSync('../client/src/assets/world_visual_mask.bin');

function isConnected(simGrid, p1, p2) {
    const x1 = Math.floor((p1.lon + 180) / 360 * SIM_W);
    const y1 = Math.floor((90 - p1.lat) / 180 * SIM_H);
    const x2 = Math.floor((p2.lon + 180) / 360 * SIM_W);
    const y2 = Math.floor((90 - p2.lat) / 180 * SIM_H);
    
    // Find nearest land
    function findLand(x, y) {
        if (simGrid[y*SIM_W+x] === 0) return {x, y};
        for(let r=1; r<5; r++) {
            for(let dy=-r; dy<=r; dy++) {
                for(let dx=-r; dx<=r; dx++) {
                    if(y+dy>=0 && y+dy<SIM_H && x+dx>=0 && x+dx<SIM_W) {
                        if (simGrid[(y+dy)*SIM_W+(x+dx)] === 0) return {x: x+dx, y: y+dy};
                    }
                }
            }
        }
        return null;
    }
    
    const start = findLand(x1, y1);
    const end = findLand(x2, y2);
    if (!start || !end) return false;
    
    // Local bounding box
    const minX = Math.min(x1, x2) - 20;
    const maxX = Math.max(x1, x2) + 20;
    const minY = Math.min(y1, y2) - 20;
    const maxY = Math.max(y1, y2) + 20;
    
    const q = [start.y * SIM_W + start.x];
    const visited = new Uint8Array(SIM_W * SIM_H);
    visited[start.y * SIM_W + start.x] = 1;
    
    while(q.length > 0) {
        const curr = q.shift();
        if (curr === end.y * SIM_W + end.x) return true;
        
        const cx = curr % SIM_W;
        const cy = Math.floor(curr / SIM_W);
        const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
        for (let n of nbs) {
            if (n[0]>=minX && n[0]<=maxX && n[1]>=minY && n[1]<=maxY && n[0]>=0 && n[0]<SIM_W && n[1]>=0 && n[1]<SIM_H) {
                const idx = n[1]*SIM_W + n[0];
                if (simGrid[idx] === 0 && visited[idx] === 0) {
                    visited[idx] = 1;
                    q.push(idx);
                }
            }
        }
    }
    return false;
}

const straits = [
    { name: 'Great Britain ↔ France', p1: {lon: -0.1, lat: 51.5}, p2: {lon: 2.3, lat: 48.8} },
    { name: 'Ireland ↔ Great Britain', p1: {lon: -7.0, lat: 53.0}, p2: {lon: -2.0, lat: 53.0} },
    { name: 'Sicily ↔ mainland Italy', p1: {lon: 14.0, lat: 37.5}, p2: {lon: 16.0, lat: 39.0} },
    { name: 'Sardinia ↔ Corsica', p1: {lon: 9.0, lat: 40.0}, p2: {lon: 9.0, lat: 42.0} },
    { name: 'Corsica ↔ mainland Europe', p1: {lon: 9.0, lat: 42.0}, p2: {lon: 9.0, lat: 44.0} },
    { name: 'Japan ↔ Korea', p1: {lon: 130.0, lat: 33.0}, p2: {lon: 129.0, lat: 35.0} },
    { name: 'Hokkaido ↔ Sakhalin', p1: {lon: 142.0, lat: 44.0}, p2: {lon: 142.0, lat: 47.0} },
    { name: 'Taiwan ↔ mainland China', p1: {lon: 121.0, lat: 23.5}, p2: {lon: 118.0, lat: 24.5} },
    { name: 'Cuba ↔ Florida', p1: {lon: -80.0, lat: 23.0}, p2: {lon: -80.0, lat: 25.0} },
    { name: 'Hispaniola ↔ Cuba', p1: {lon: -73.0, lat: 19.0}, p2: {lon: -75.0, lat: 20.0} },
    { name: 'Madagascar ↔ Africa', p1: {lon: 46.0, lat: -18.0}, p2: {lon: 39.0, lat: -15.0} },
    { name: 'Sri Lanka ↔ India', p1: {lon: 80.5, lat: 8.0}, p2: {lon: 78.5, lat: 10.0} },
    { name: 'New Zealand North ↔ South', p1: {lon: 175.0, lat: -39.0}, p2: {lon: 171.0, lat: -43.0} },
    { name: 'Alaska ↔ Russia', p1: {lon: -164.0, lat: 65.0}, p2: {lon: 175.0, lat: 65.0} },
    { name: 'English Channel', p1: {lon: 1.0, lat: 51.0}, p2: {lon: 1.5, lat: 50.5} },
    { name: 'Strait of Malacca', p1: {lon: 101.0, lat: 3.0}, p2: {lon: 101.5, lat: 2.0} },
    { name: 'Strait of Hormuz', p1: {lon: 56.0, lat: 26.5}, p2: {lon: 56.5, lat: 26.0} }
];

console.log("STRAIT TEST SUITE (CONNECTED_BY_4_NEIGHBOR_LAND):");
let straitsPass = true;
for (let s of straits) {
    const conn = isConnected(v2, s.p1, s.p2);
    console.log(`${s.name}: ${conn}`);
    if (conn) straitsPass = false;
}
console.log(`STRAITS PASS: ${straitsPass ? 'YES' : 'NO'}`);

const lakes = [
    { name: 'Great Lakes', lon: -87, lat: 45 },
    { name: 'Lake Victoria', lon: 33, lat: -1 },
    { name: 'Lake Tanganyika', lon: 29.5, lat: -6 },
    { name: 'Lake Baikal', lon: 108, lat: 53.5 },
    { name: 'Caspian Sea', lon: 51, lat: 42 }
];

let lakesPass = true;
console.log("\nLAKES TEST (Must be WATER):");
for (let l of lakes) {
    const x = Math.floor((l.lon + 180) / 360 * WIDTH);
    const y = Math.floor((90 - l.lat) / 180 * HEIGHT);
    const isLand = v2[y*WIDTH + x] === 0;
    console.log(`${l.name} (${x},${y}): ${isLand ? 'FAIL (LAND)' : 'PASS (WATER)'}`);
    if (isLand) lakesPass = false;
}
console.log(`LAKES PASS: ${lakesPass ? 'YES' : 'NO'}`);

const islands = [
    { name: 'Great Britain', lon: -2.0, lat: 53.0 },
    { name: 'Ireland', lon: -8.0, lat: 53.0 },
    { name: 'Iceland', lon: -19.0, lat: 65.0 },
    { name: 'Japan', lon: 138.0, lat: 36.0 },
    { name: 'Taiwan', lon: 121.0, lat: 23.5 },
    { name: 'Sri Lanka', lon: 81.0, lat: 7.0 },
    { name: 'Cuba', lon: -79.0, lat: 22.0 },
    { name: 'Hispaniola', lon: -71.0, lat: 19.0 },
    { name: 'Madagascar', lon: 47.0, lat: -19.0 },
    { name: 'Sardinia', lon: 9.0, lat: 40.0 },
    { name: 'Corsica', lon: 9.0, lat: 42.0 },
    { name: 'Sicily', lon: 14.0, lat: 37.5 },
    { name: 'New Zealand North', lon: 175.0, lat: -39.0 },
    { name: 'New Zealand South', lon: 171.0, lat: -43.0 }
];

let islandsPass = true;
console.log("\nISLAND PRESERVATION (Must have LAND in 5x5):");
for (let isl of islands) {
    const x = Math.floor((isl.lon + 180) / 360 * WIDTH);
    const y = Math.floor((90 - isl.lat) / 180 * HEIGHT);
    
    let hasLand = false;
    for(let dy=-2; dy<=2; dy++) {
        for(let dx=-2; dx<=2; dx++) {
            if(y+dy>=0 && y+dy<HEIGHT && x+dx>=0 && x+dx<WIDTH) {
                if (v2[(y+dy)*WIDTH+(x+dx)] === 0) hasLand = true;
            }
        }
    }
    console.log(`${isl.name}: ${hasLand ? 'PASS' : 'FAIL'}`);
    if (!hasLand) islandsPass = false;
}
console.log(`ISLANDS PASS: ${islandsPass ? 'YES' : 'NO'}`);

function getMetrics(grid, name) {
    let landCount = 0;
    let waterCount = 0;
    let falseWater = 0;
    let falseLand = 0;
    
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const isLand = grid[y*WIDTH + x] === 0;
            if (isLand) landCount++; else waterCount++;
            
            let visHasLand = false;
            for (let vy = y*4; vy < y*4+4; vy++) {
                for (let vx = x*4; vx < x*4+4; vx++) {
                    if (visMask[vy * 4096 + vx] >= 128) {
                        visHasLand = true; break;
                    }
                }
                if (visHasLand) break;
            }
            if (isLand && !visHasLand) falseLand++;
            if (!isLand && visHasLand) falseWater++;
        }
    }
    const agreement = ((WIDTH*HEIGHT - falseWater - falseLand) / (WIDTH*HEIGHT) * 100).toFixed(2) + "%";
    
    const visited = new Uint8Array(WIDTH * HEIGHT);
    let comps = 0, singles = 0;
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        if (grid[i] === 0 && visited[i] === 0) {
            comps++;
            let size = 0;
            const q = [i];
            visited[i] = 1;
            while (q.length > 0) {
                const curr = q.pop();
                size++;
                const cx = curr % WIDTH, cy = Math.floor(curr / WIDTH);
                const nbs = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
                for (let n of nbs) {
                    if (n[0]>=0 && n[0]<WIDTH && n[1]>=0 && n[1]<HEIGHT) {
                        const idx = n[1]*WIDTH + n[0];
                        if (grid[idx] === 0 && visited[idx] === 0) {
                            visited[idx] = 1; q.push(idx);
                        }
                    }
                }
            }
            if (size === 1) singles++;
        }
    }
    
    return { name, landCount, waterCount, falseWater, falseLand, agreement, comps, singles };
}

console.log("\nMETRICS:");
console.table([getMetrics(v0, 'V0 (Pre-Candidate)'), getMetrics(v1, 'V1 (Threshold 1/25)'), getMetrics(v2, 'V2 (Topology-Safe)')]);
