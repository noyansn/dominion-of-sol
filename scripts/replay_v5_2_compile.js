const fs = require('fs');
const crypto = require('crypto');

const SIM_W = 1024, SIM_H = 512;
const edgePath = '../server/assets/world_land_edges_candidate_v5_1.bin';
const constraintPath = '../server/assets/world_topology_constraints.json';
const v5_2_path = '../server/assets/world_land_edges_candidate_v5_2.bin';

const edgeMask = Buffer.from(fs.readFileSync(edgePath));
const constraints = JSON.parse(fs.readFileSync(constraintPath, 'utf8'));
const v5_2_bytes = fs.readFileSync(v5_2_path);

function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersects(A, B, C, D) {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function lonLatToSim(lon, lat) {
    const x = (lon + 180) / 360 * SIM_W;
    const y = (90 - lat) / 180 * SIM_H;
    return { x, y };
}

let initialOpen = 0;
let finalOpen = 0;

for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e = edgeMask[i];
    if (e & 1) initialOpen++;
    if (e & 2) initialOpen++;
    if (e & 4) initialOpen++;
    if (e & 8) initialOpen++;
}

let manifest = [];
let constraintClosures = {};
let overlapClosures = 0;
let uniquePhysicalClosures = new Set();

for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    constraintClosures[constraint.id] = { id: constraint.id, name: constraint.name, physical: 0, directed: 0 };
    
    for (let segIdx = 0; segIdx < constraint.segments.length; segIdx++) {
        const segment = constraint.segments[segIdx];
        const A = lonLatToSim(segment[0][0], segment[0][1]);
        const B = lonLatToSim(segment[1][0], segment[1][1]);
        
        const minX = Math.floor(Math.min(A.x, B.x)) - 1;
        const maxX = Math.ceil(Math.max(A.x, B.x)) + 1;
        const minY = Math.floor(Math.min(A.y, B.y)) - 1;
        const maxY = Math.ceil(Math.max(A.y, B.y)) + 1;
        
        for (let y = minY; y <= Math.min(maxY, SIM_H - 1); y++) {
            if (y < 0) continue;
            for (let x = minX; x <= maxX; x++) {
                let bx = x;
                if (bx < 0) bx += SIM_W;
                if (bx >= SIM_W) bx -= SIM_W;
                
                const idx = y * SIM_W + bx;
                const e = edgeMask[idx];
                
                if (e & 2) {
                    const eIdx = y * SIM_W + ((bx + 1) % SIM_W);
                    const pathC = { x: x + 0.5, y: y + 0.5 };
                    const pathD = { x: x + 1.5, y: y + 0.5 };
                    if (intersects(A, B, pathC, pathD)) {
                        edgeMask[idx] &= ~2; 
                        edgeMask[eIdx] &= ~8; 
                        let key = `${bx},${y},E`;
                        if (uniquePhysicalClosures.has(key)) {
                            overlapClosures++;
                        } else {
                            uniquePhysicalClosures.add(key);
                            constraintClosures[constraint.id].physical++;
                            constraintClosures[constraint.id].directed += 2;
                        }
                    }
                }
                
                if ((e & 4) && y < SIM_H - 1) {
                    const eIdx = (y + 1) * SIM_W + bx;
                    const pathC = { x: x + 0.5, y: y + 0.5 };
                    const pathD = { x: x + 0.5, y: y + 1.5 };
                    if (intersects(A, B, pathC, pathD)) {
                        edgeMask[idx] &= ~4; 
                        edgeMask[eIdx] &= ~1; 
                        let key = `${bx},${y},S`;
                        if (uniquePhysicalClosures.has(key)) {
                            overlapClosures++;
                        } else {
                            uniquePhysicalClosures.add(key);
                            constraintClosures[constraint.id].physical++;
                            constraintClosures[constraint.id].directed += 2;
                        }
                    }
                }
            }
        }
    }
}

for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e = edgeMask[i];
    if (e & 1) finalOpen++;
    if (e & 2) finalOpen++;
    if (e & 4) finalOpen++;
    if (e & 8) finalOpen++;
}

let replayedHash = crypto.createHash('sha256').update(edgeMask).digest('hex').toUpperCase();
let originalHash = crypto.createHash('sha256').update(v5_2_bytes).digest('hex').toUpperCase();

console.log(`COMPILER REPLAY:`);
console.log(`replay hash = ${replayedHash}`);
console.log(`V5.2 artifact hash = ${originalHash}`);
console.log(`match = ${replayedHash === originalHash}`);
if (replayedHash !== originalHash) {
    console.log("COMPILER REPLAY MISMATCH");
    process.exit(1);
}

let v5_1_bytes = fs.readFileSync(edgePath);
let physical_closed = 0;
let directed_cleared = initialOpen - finalOpen;
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let idx = y * SIM_W + x;
        let e1 = v5_1_bytes[idx];
        let e2 = edgeMask[idx];
        if ((e1 & 2) !== (e2 & 2)) physical_closed++;
        if ((e1 & 4) !== (e2 & 4) && y < SIM_H - 1) physical_closed++;
    }
}

console.log(`\nBINARY DIFF:`);
console.log(`directed bits cleared = ${directed_cleared}`);
console.log(`physical adjacencies closed = ${physical_closed}`);
console.log(`manifest physical adjacencies = ${uniquePhysicalClosures.size}`);
console.log(`unexplained physical = ${physical_closed - uniquePhysicalClosures.size}`);
console.log(`unexplained directed = ${directed_cleared - uniquePhysicalClosures.size * 2}`);

console.log(`\nPER-CONSTRAINT CLOSURES:`);
console.log(`| constraint id | unique physical adjacencies closed | directed bits cleared |`);
console.log(`|---|---|---|`);
for (const [id, c] of Object.entries(constraintClosures)) {
    console.log(`| ${id} | ${c.physical} | ${c.directed} |`);
}

// 8. GENERIC SUBCELL REPRESENTABILITY TEST
const VISUAL_W = 4096;
const VISUAL_H = 2048;
const visualMask = Buffer.from(fs.readFileSync('../client/src/assets/world_visual_mask.bin'));

function isLand(x, y) {
    if (x < 0 || x >= VISUAL_W || y < 0 || y >= VISUAL_H) return false;
    return visualMask[y * VISUAL_W + x] >= 128;
}

const straitDefinitions = [
    { name: "Dover", separator: [[1.3, 51.1], [1.6, 50.9]] }, 
    { name: "Gibraltar", separator: [[-5.6, 36.1], [-5.4, 35.8]] }, 
    { name: "Bosphorus", separator: [[28.9, 41.05], [29.1, 41.05]] },
    { name: "Dardanelles", separator: [[26.2, 40.2], [26.5, 40.0]] },
    { name: "Bab-el-Mandeb", separator: [[43.4, 12.6], [43.6, 12.3]] }, 
    { name: "Bering Strait", separator: [[170.0, 66.0], [-165.0, 66.0]] }, 
    { name: "Malacca", separator: [[101.5, 3.0], [101.5, 2.0]] }, 
    { name: "Taiwan Strait", separator: [[119.5, 25.0], [121.0, 25.0]] }, 
    { name: "Korea Strait", separator: [[129.5, 35.0], [130.0, 34.0]] }, 
    { name: "Messina", separator: [[15.6, 38.2], [15.4, 38.2]] }, 
    { name: "Bonifacio", separator: [[9.1, 41.4], [9.1, 41.2]] }, 
    { name: "Irish Sea", separator: [[-6.0, 53.5], [-4.0, 53.5]] }, 
    { name: "Cook Strait", separator: [[174.5, -41.0], [174.0, -41.5]] }, 
];

function getVisualCoord(lon, lat) {
    let rawX = Math.floor((lon + 180) / 360 * VISUAL_W);
    let x = ((rawX % VISUAL_W) + VISUAL_W) % VISUAL_W;
    let y = Math.floor((90 - lat) / 180 * VISUAL_H);
    y = Math.max(0, Math.min(VISUAL_H - 1, y));
    return { x, y };
}

function getSimCoordForVisual(vx, vy) {
    let sx = Math.floor(vx / 4);
    let sy = Math.floor(vy / 4);
    return { x: sx, y: sy, idx: sy * SIM_W + sx };
}

function lineDistance(p, A, B) {
    const l2 = (B.x - A.x)**2 + (B.y - A.y)**2;
    if (l2 == 0) return Math.sqrt((p.x - A.x)**2 + (p.y - A.y)**2);
    let t = ((p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (A.x + t * (B.x - A.x)))**2 + (p.y - (A.y + t * (B.y - A.y)))**2);
}

function whichSide(p, A, B) {
    return (B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x);
}

console.log(`\nSTRAIT REPRESENTABILITY:`);
console.log(`| Strait | Side A cells | Side B cells | Straddling cells | Representability |`);
console.log(`|---|---|---|---|---|`);

let subcellConflicts = [];
let representableStraits = [];

for (const strait of straitDefinitions) {
    const A = getVisualCoord(strait.separator[0][0], strait.separator[0][1]);
    const B = getVisualCoord(strait.separator[1][0], strait.separator[1][1]);
    
    const buffer = 40;
    let minX = Math.min(A.x, B.x) - buffer;
    let maxX = Math.max(A.x, B.x) + buffer;
    let minY = Math.min(A.y, B.y) - buffer;
    let maxY = Math.max(A.y, B.y) + buffer;
    
    let sideASimCells = new Set();
    let sideBSimCells = new Set();
    
    let cellPixelStats = {}; 
    
    if (maxX - minX > VISUAL_W / 2) {
        if (A.x < B.x) { A.x += VISUAL_W; minX = B.x - buffer; maxX = A.x + buffer; }
        else { B.x += VISUAL_W; minX = A.x - buffer; maxX = B.x + buffer; }
    }
    
    for (let y = minY; y <= maxY; y++) {
        let vy = y;
        if (vy < 0 || vy >= VISUAL_H) continue;
        for (let x = minX; x <= maxX; x++) {
            let vx = ((x % VISUAL_W) + VISUAL_W) % VISUAL_W;
            let simCoord = getSimCoordForVisual(vx, vy);
            
            let dist = lineDistance({x, y: vy}, A, B);
            if (dist <= buffer) {
                let side = whichSide({x, y: vy}, A, B);
                
                if (!cellPixelStats[simCoord.idx]) cellPixelStats[simCoord.idx] = { A_land: 0, B_land: 0, water: 0, x: simCoord.x, y: simCoord.y };
                
                if (isLand(vx, vy)) {
                    if (side > 0) {
                        sideASimCells.add(simCoord.idx);
                        cellPixelStats[simCoord.idx].A_land++;
                    } else if (side < 0) {
                        sideBSimCells.add(simCoord.idx);
                        cellPixelStats[simCoord.idx].B_land++;
                    }
                } else {
                    cellPixelStats[simCoord.idx].water++;
                }
            }
        }
    }
    
    let straddling = [];
    for (const cell of sideASimCells) {
        if (sideBSimCells.has(cell)) {
            straddling.push(cell);
            let stats = cellPixelStats[cell];
            subcellConflicts.push({
                strait: strait.name,
                x: stats.x, y: stats.y,
                ALand: stats.A_land, BLand: stats.B_land, water: stats.water
            });
        }
    }
    
    let rep = straddling.length > 0 ? "SUBCELL_UNREPRESENTABLE" : "EDGE_REPRESENTABLE";
    console.log(`| ${strait.name} | ${sideASimCells.size} | ${sideBSimCells.size} | ${straddling.length} | ${rep} |`);
    
    if (rep === "EDGE_REPRESENTABLE") {
        representableStraits.push(strait);
    }
}

console.log(`\nSUBCELL CONFLICTS:`);
console.log(`| Strait | straddling cell x/y | A-side land visual px | B-side land visual px | water visual px |`);
console.log(`|---|---|---|---|---|`);
for (const c of subcellConflicts) {
    console.log(`| ${c.strait} | ${c.x},${c.y} | ${c.ALand} | ${c.BLand} | ${c.water} |`);
}

console.log(`\nEDGE-REPRESENTABLE STRAIT RESULTS:`);
console.log(`| Strait | Direct Crossing | Local Path | Result |`);
console.log(`|---|---|---|---|`);

function lonLatToSimCoords(lon, lat) {
    const rawX = Math.floor((lon + 180) / 360 * SIM_W);
    const rawY = Math.floor((90 - lat) / 180 * SIM_H);
    const x = ((rawX % SIM_W) + SIM_W) % SIM_W;
    const y = Math.max(0, Math.min(SIM_H - 1, rawY));
    return { x, y };
}

function resolveLandSeedSim(target, radius = 10) {
    let bestDist = Infinity;
    let resolved = null;
    let simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
    
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            let cy = target.y + dy;
            if (cy < 0 || cy >= SIM_H) continue;
            let cx = ((target.x + dx) % SIM_W + SIM_W) % SIM_W;
            
            if (simGrid[cy * SIM_W + cx] === 0) {
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    resolved = {x: cx, y: cy};
                }
            }
        }
    }
    return resolved ? { status: 'VALID', resolved } : { status: 'INVALID' };
}

for (const strait of representableStraits) {
    let sA = resolveLandSeedSim(lonLatToSimCoords(strait.separator[0][0], strait.separator[0][1]));
    let sB = resolveLandSeedSim(lonLatToSimCoords(strait.separator[1][0], strait.separator[1][1]));
    
    if (sA.status !== 'VALID' || sB.status !== 'VALID') {
        console.log(`| ${strait.name} | INVALID | INVALID | INVALID |`);
        continue;
    }
    
    let isDirect = false;
    let A = sA.resolved, B = sB.resolved;
    let e = edgeMask[A.y * SIM_W + A.x];
    if ((e & 2) && (A.x + 1)%SIM_W === B.x && A.y === B.y) isDirect = true;
    if ((e & 8) && (A.x - 1 + SIM_W)%SIM_W === B.x && A.y === B.y) isDirect = true;
    if ((e & 4) && A.x === B.x && A.y + 1 === B.y) isDirect = true;
    if ((e & 1) && A.x === B.x && A.y - 1 === B.y) isDirect = true;
    
    let visited = new Set([A.y * SIM_W + A.x]);
    let q = [[A.x, A.y, 0]];
    let head = 0;
    let path = "NONE";
    while(head < q.length && head < 5000) {
        let [x, y, dist] = q[head++];
        if (x === B.x && y === B.y) {
            path = dist.toString();
            break;
        }
        if (dist > 100) continue; 
        
        let cIdx = y * SIM_W + x;
        let ce = edgeMask[cIdx];
        if (ce & 1) { let ny = y - 1; let nidx = ny * SIM_W + x; if (!visited.has(nidx)) { visited.add(nidx); q.push([x, ny, dist + 1]); } }
        if (ce & 2) { let nx = (x + 1) % SIM_W; let nidx = y * SIM_W + nx; if (!visited.has(nidx)) { visited.add(nidx); q.push([nx, y, dist + 1]); } }
        if (ce & 4) { let ny = y + 1; let nidx = ny * SIM_W + x; if (!visited.has(nidx)) { visited.add(nidx); q.push([x, ny, dist + 1]); } }
        if (ce & 8) { let nx = (x - 1 + SIM_W) % SIM_W; let nidx = y * SIM_W + nx; if (!visited.has(nidx)) { visited.add(nidx); q.push([nx, y, dist + 1]); } }
    }
    
    let result = (isDirect || path !== "NONE") ? "OPEN" : "CLOSED";
    console.log(`| ${strait.name} | ${isDirect ? "OPEN" : "NONE"} | ${path} | ${result} |`);
}

let visualCompId = new Int32Array(VISUAL_W * VISUAL_H).fill(-1);
let currentVisualComp = 0;
let visualSizes = {};

const islandSeedsData = {
    "Great Britain": { lon: -1.5, lat: 53.0 },
    "Ireland": { lon: -8.0, lat: 53.0 },
    "Iceland": { lon: -18.0, lat: 65.0 },
    "Japan": { lon: 138.0, lat: 36.0 },
    "Taiwan": { lon: 121.0, lat: 23.7 },
    "Sri Lanka": { lon: 80.5, lat: 7.5 },
    "Cuba": { lon: -80.0, lat: 21.5 },
    "Hispaniola": { lon: -71.5, lat: 19.0 },
    "Madagascar": { lon: 47.0, lat: -19.0 },
    "Sardinia": { lon: 9.0, lat: 40.0 },
    "Corsica": { lon: 9.0, lat: 42.1 },
    "Sicily": { lon: 14.0, lat: 37.5 },
    "NZ North": { lon: 176.0, lat: -39.0 },
    "NZ South": { lon: 170.0, lat: -43.5 },
};

function resolveVisualSeed(lon, lat, radius = 50) {
    const rawX = Math.floor((lon + 180) / 360 * VISUAL_W);
    const rawY = Math.floor((90 - lat) / 180 * VISUAL_H);
    const target = { x: ((rawX % VISUAL_W) + VISUAL_W) % VISUAL_W, y: Math.max(0, Math.min(VISUAL_H - 1, rawY)) };
    
    let bestDist = Infinity;
    let resolved = null;
    
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            let cy = target.y + dy;
            if (cy < 0 || cy >= VISUAL_H) continue;
            let cx = ((target.x + dx) % VISUAL_W + VISUAL_W) % VISUAL_W;
            
            if (visualMask[cy * VISUAL_W + cx] >= 128) {
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    resolved = {x: cx, y: cy};
                }
            }
        }
    }
    return resolved;
}

let islandVisualComps = {};
for (const [name, pos] of Object.entries(islandSeedsData)) {
    let res = resolveVisualSeed(pos.lon, pos.lat);
    if (res) {
        let idx = res.y * VISUAL_W + res.x;
        if (visualCompId[idx] === -1) {
            let q = [idx];
            let head = 0;
            let compId = currentVisualComp++;
            visualCompId[idx] = compId;
            let size = 0;
            while(head < q.length) {
                let curr = q[head++];
                size++;
                let cx = curr % VISUAL_W;
                let cy = Math.floor(curr / VISUAL_W);
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        let ny = cy + dy;
                        if (ny < 0 || ny >= VISUAL_H) continue;
                        let nx = (cx + dx + VISUAL_W) % VISUAL_W;
                        let nidx = ny * VISUAL_W + nx;
                        if (visualMask[nidx] >= 128 && visualCompId[nidx] === -1) {
                            visualCompId[nidx] = compId;
                            q.push(nidx);
                        }
                    }
                }
            }
            visualSizes[compId] = size;
        }
        islandVisualComps[name] = visualCompId[idx];
    }
}

let compToCoarseCells = {};
for (let i = 0; i < VISUAL_W * VISUAL_H; i++) {
    let cid = visualCompId[i];
    if (cid !== -1) {
        if (!compToCoarseCells[cid]) compToCoarseCells[cid] = new Set();
        let simCoord = getSimCoordForVisual(i % VISUAL_W, Math.floor(i / VISUAL_W));
        compToCoarseCells[cid].add(simCoord.idx);
    }
}

console.log(`\nISLAND HIGH-RES COMPONENT TABLE:`);
console.log(`| Island | Visual Component ID | Visual Pixels | Support Cells | Traversal Components | Main Body Coverage % |`);
console.log(`|---|---|---|---|---|---|`);

let simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
let travCompId = new Int32Array(SIM_W * SIM_H).fill(-1);
let currentTravComp = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (simGrid[i] === 0 && travCompId[i] === -1) {
        let q = [i];
        travCompId[i] = currentTravComp;
        let head = 0;
        while(head < q.length) {
            let u = q[head++];
            let cx = u % SIM_W;
            let cy = Math.floor(u / SIM_W);
            let e = edgeMask[u];
            
            if (e & 1) { let ny = cy - 1; let nidx = ny * SIM_W + cx; if (travCompId[nidx] === -1) { travCompId[nidx] = currentTravComp; q.push(nidx); } }
            if (e & 2) { let nx = (cx + 1) % SIM_W; let nidx = cy * SIM_W + nx; if (travCompId[nidx] === -1) { travCompId[nidx] = currentTravComp; q.push(nidx); } }
            if (e & 4) { let ny = cy + 1; let nidx = ny * SIM_W + cx; if (travCompId[nidx] === -1) { travCompId[nidx] = currentTravComp; q.push(nidx); } }
            if (e & 8) { let nx = (cx - 1 + SIM_W) % SIM_W; let nidx = cy * SIM_W + nx; if (travCompId[nidx] === -1) { travCompId[nidx] = currentTravComp; q.push(nidx); } }
        }
        currentTravComp++;
    }
}

for (const name of Object.keys(islandSeedsData)) {
    let vComp = islandVisualComps[name];
    if (vComp === undefined) {
        console.log(`| ${name} | INVALID | - | - | - | - |`);
        continue;
    }
    
    let vSize = visualSizes[vComp];
    let coarseCells = compToCoarseCells[vComp];
    
    let travComps = new Set();
    let travCounts = {};
    for (const cell of coarseCells) {
        let tComp = travCompId[cell];
        if (tComp !== -1) {
            travComps.add(tComp);
            travCounts[tComp] = (travCounts[tComp] || 0) + 1;
        }
    }
    
    let maxTrav = 0;
    for (const count of Object.values(travCounts)) {
        if (count > maxTrav) maxTrav = count;
    }
    let pct = ((maxTrav / coarseCells.size) * 100).toFixed(1) + "%";
    
    console.log(`| ${name} | ${vComp} | ${vSize} | ${coarseCells.size} | ${travComps.size} | ${pct} |`);
}
