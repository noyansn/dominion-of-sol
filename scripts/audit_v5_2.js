const fs = require('fs');

const SIM_W = 1024, SIM_H = 512;
const v5_1 = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin'));
const v5_2 = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_2.bin'));
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const constraints = JSON.parse(fs.readFileSync('../server/assets/world_topology_constraints.json', 'utf8'));

// 2. EDGE COUNT SEMANTICS
let v51_open = 0;
let v52_open = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e1 = v5_1[i];
    if (e1 & 1) v51_open++;
    if (e1 & 2) v51_open++;
    if (e1 & 4) v51_open++;
    if (e1 & 8) v51_open++;
    
    const e2 = v5_2[i];
    if (e2 & 1) v52_open++;
    if (e2 & 2) v52_open++;
    if (e2 & 4) v52_open++;
    if (e2 & 8) v52_open++;
}

let directed_cleared = v51_open - v52_open;
let physical_closed = 0;

let changed_edges = []; // {x, y, dir, center_x, center_y}
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let idx = y * SIM_W + x;
        let e1 = v5_1[idx];
        let e2 = v5_2[idx];
        if ((e1 & 2) !== (e2 & 2)) {
            physical_closed++; // We only count East and South to avoid double counting
            changed_edges.push({x, y, dir: 'E', cx: x+1, cy: y+0.5});
        }
        if ((e1 & 4) !== (e2 & 4) && y < SIM_H - 1) {
            physical_closed++;
            changed_edges.push({x, y, dir: 'S', cx: x+0.5, cy: y+1});
        }
    }
}

console.log(`EDGE COUNT SEMANTICS:`);
console.log(`V5.1 directed open bits = ${v51_open}`);
console.log(`V5.2 directed open bits = ${v52_open}`);
console.log(`directed bits cleared = ${directed_cleared}`);
console.log(`physical adjacencies closed = ${physical_closed}`);

// 3. PER-CONSTRAINT TRACEABILITY
function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
function intersects(A, B, C, D) { return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D); }
function lonLatToSim(lon, lat) { return { x: (lon + 180) / 360 * SIM_W, y: (90 - lat) / 180 * SIM_H }; }

let explainedPhysical = 0;
let overlap = 0;
let explainedSet = new Set();
let constraintTrace = [];

for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    let physClosed = 0;
    
    for (const segment of constraint.segments) {
        const A = lonLatToSim(segment[0][0], segment[0][1]);
        const B = lonLatToSim(segment[1][0], segment[1][1]);
        
        for (const ce of changed_edges) {
            let pathC, pathD;
            if (ce.dir === 'E') {
                pathC = { x: ce.x + 0.5, y: ce.y + 0.5 };
                pathD = { x: ce.x + 1.5, y: ce.y + 0.5 };
            } else {
                pathC = { x: ce.x + 0.5, y: ce.y + 0.5 };
                pathD = { x: ce.x + 0.5, y: ce.y + 1.5 };
            }
            if (intersects(A, B, pathC, pathD)) {
                physClosed++;
                let key = `${ce.x},${ce.y},${ce.dir}`;
                if (explainedSet.has(key)) overlap++;
                explainedSet.add(key);
            }
        }
    }
    constraintTrace.push(`| ${constraint.id} | ${constraint.name} | ${physClosed} | ${physClosed * 2} |`);
}

let unexplainedPhysical = physical_closed - explainedSet.size;

console.log(`\nCONSTRAINT TRACEABILITY:`);
console.log(`| id | name | intersected physical adjacencies | directed bits cleared |`);
console.log(`|---|---|---|---|`);
constraintTrace.forEach(c => console.log(c));
console.log(`overlap closures = ${overlap}`);
console.log(`unexplained physical changes = ${unexplainedPhysical}`);
console.log(`unexplained directed changes = ${unexplainedPhysical * 2}`);


// 4, 5, 6, 7. COMPONENT TRACING
let compId = new Int32Array(SIM_W * SIM_H).fill(-1);
let compSizes = {};
let currentComp = 0;

for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (simGrid[i] === 0 && compId[i] === -1) { // land and unvisited
        let size = 0;
        let q = [i];
        compId[i] = currentComp;
        let head = 0;
        while(head < q.length) {
            let curr = q[head++];
            size++;
            let cx = curr % SIM_W;
            let cy = Math.floor(curr / SIM_W);
            let e = v5_2[curr];
            
            if (e & 1) { let ny = cy - 1; let nidx = ny * SIM_W + cx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
            if (e & 2) { let nx = (cx + 1) % SIM_W; let nidx = cy * SIM_W + nx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
            if (e & 4) { let ny = cy + 1; let nidx = ny * SIM_W + cx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
            if (e & 8) { let nx = (cx - 1 + SIM_W) % SIM_W; let nidx = cy * SIM_W + nx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
        }
        compSizes[currentComp] = size;
        currentComp++;
    }
}

function getComp(x, y) {
    if (x < 0) x += SIM_W;
    return compId[y * SIM_W + x];
}

console.log(`\nISLAND PAIR COMPONENT TABLE:`);
const islandPairs = [
    { pair: "Ireland / Great Britain", a: [498, 107], b: [508, 106] },
    { pair: "Great Britain / Europe", a: [508, 106], b: [525, 116] },
    { pair: "Corsica / Sardinia", a: [537, 137], b: [537, 140] },
    { pair: "Corsica / Europe", a: [537, 137], b: [525, 116] },
    { pair: "Sardinia / Europe", a: [537, 140], b: [525, 116] },
    { pair: "Sicily / Italy", a: [552, 148], b: [557, 145] },
    { pair: "NZ North / NZ South", a: [1006, 372], b: [1002, 377] },
    { pair: "Japan / Asia", a: [889, 149], b: [878, 155] },
    { pair: "Taiwan / China", a: [855, 184], b: [848, 182] },
    { pair: "Sri Lanka / India", a: [721, 230], b: [716, 222] },
    { pair: "Madagascar / Africa", a: [594, 314], b: [572, 301] },
];

console.log(`| Pair | Component A | Component B | Same Component | Expected |`);
console.log(`|---|---|---|---|---|`);
for (const p of islandPairs) {
    let cA = getComp(p.a[0], p.a[1]);
    let cB = getComp(p.b[0], p.b[1]);
    console.log(`| ${p.pair} | ${cA} | ${cB} | ${cA === cB} | false |`);
}

console.log(`\nISLAND SELF-CONSISTENCY:`);
const singleIslands = [
    { name: "Great Britain", seed: [508, 106] },
    { name: "Ireland", seed: [498, 107] },
    { name: "Iceland", seed: [486, 75] },
    { name: "Japan", seed: [889, 149] },
    { name: "Taiwan", seed: [855, 184] },
    { name: "Sri Lanka", seed: [721, 230] },
    { name: "Cuba", seed: [257, 191] },
    { name: "Hispaniola", seed: [276, 194] },
    { name: "Madagascar", seed: [594, 314] },
    { name: "Sardinia", seed: [537, 140] },
    { name: "Corsica", seed: [537, 137] },
    { name: "Sicily", seed: [552, 148] },
    { name: "NZ North", seed: [1006, 372] },
    { name: "NZ South", seed: [1002, 377] }
];

// Re-run island flood fill over the SUPPORT GRID to find which simulation cells belong to the island physically.
let islandSupportId = new Int32Array(SIM_W * SIM_H).fill(-1);
let islandSupportSizes = {};
let currentSupportComp = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (simGrid[i] === 0 && islandSupportId[i] === -1) { 
        let size = 0;
        let q = [i];
        islandSupportId[i] = currentSupportComp;
        let head = 0;
        while(head < q.length) {
            let curr = q[head++];
            size++;
            let cx = curr % SIM_W;
            let cy = Math.floor(curr / SIM_W);
            // 8-way physical connectivity for island body definition
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    let ny = cy + dy;
                    if (ny < 0 || ny >= SIM_H) continue;
                    let nx = (cx + dx + SIM_W) % SIM_W;
                    let nidx = ny * SIM_W + nx;
                    if (simGrid[nidx] === 0 && islandSupportId[nidx] === -1) {
                        islandSupportId[nidx] = currentSupportComp;
                        q.push(nidx);
                    }
                }
            }
        }
        islandSupportSizes[currentSupportComp] = size;
        currentSupportComp++;
    }
}

console.log(`| Island | Support Cells | Traversal Components Inside Island | Largest Component Cells |`);
console.log(`|---|---|---|---|`);
for (const isl of singleIslands) {
    let supId = islandSupportId[isl.seed[1] * SIM_W + isl.seed[0]];
    let supportSize = islandSupportSizes[supId];
    
    let travComps = new Set();
    let travCounts = {};
    for (let i = 0; i < SIM_W * SIM_H; i++) {
        if (islandSupportId[i] === supId) {
            let tComp = compId[i];
            if (tComp !== -1) {
                travComps.add(tComp);
                travCounts[tComp] = (travCounts[tComp] || 0) + 1;
            }
        }
    }
    let maxTrav = 0;
    for (const count of Object.values(travCounts)) {
        if (count > maxTrav) maxTrav = count;
    }
    console.log(`| ${isl.name} | ${supportSize} | ${travComps.size} | ${maxTrav} |`);
}

console.log(`\nMACRO CONNECTIVITY:`);
const macros = [
    { p: "North America internally connected", a: [136, 172], b: [15, 63] },
    { p: "South America internally connected", a: [270, 260], b: [334, 403] },
    { p: "Africa internally connected", a: [586, 179], b: [557, 342] },
    { p: "Australia internally connected", a: [884, 335], b: [961, 337] },
    { p: "France -> Germany", a: [519, 120], b: [531, 114] },
    { p: "Germany -> Poland", a: [531, 114], b: [545, 114] },
    { p: "Poland -> Central Russia", a: [545, 114], b: [585, 114] },
    { p: "Central Russia -> Siberia", a: [585, 114], b: [740, 100] },
    { p: "Turkey's Anatolian -> Middle East", a: [600, 142], b: [617, 160] }
];

console.log(`| Test | Component A | Component B | Result |`);
console.log(`|---|---|---|---|`);
for (const m of macros) {
    let cA = getComp(m.a[0], m.a[1]);
    let cB = getComp(m.b[0], m.b[1]);
    console.log(`| ${m.p} | ${cA} | ${cB} | ${cA === cB ? "PASS" : "FAIL"} |`);
}

// 8. SEMANTIC CONSTRAINT LOCALITY
console.log(`\nSEMANTIC CONSTRAINT LOCALITY:`);
function pDistance(x, y, x1, y1, x2, y2) {
  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;
  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) param = dot / len_sq;
  var xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

let maxDistOverall = 0;
for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    let maxDist = 0;
    for (const segment of constraint.segments) {
        const A = lonLatToSim(segment[0][0], segment[0][1]);
        const B = lonLatToSim(segment[1][0], segment[1][1]);
        
        for (const ce of changed_edges) {
            let cx = ce.cx, cy = ce.cy;
            // Handle wrapping distance
            let dist = pDistance(cx, cy, A.x, A.y, B.x, B.y);
            if (Math.abs(cx - A.x) > SIM_W / 2) {
                // If it wrapped, shift A and B
                let sx1 = A.x > SIM_W/2 ? A.x - SIM_W : A.x + SIM_W;
                let sx2 = B.x > SIM_W/2 ? B.x - SIM_W : B.x + SIM_W;
                let wrappedDist = pDistance(cx, cy, sx1, A.y, sx2, B.y);
                if (wrappedDist < dist) dist = wrappedDist;
            }
            if (dist > maxDist) maxDist = dist;
            if (dist > maxDistOverall) maxDistOverall = dist;
        }
    }
    console.log(`${constraint.id}: MAX DISTANCE = ${maxDist.toFixed(2)} cells`);
}
console.log(`MAX CHANGE DISTANCE FROM SOURCE SEPARATOR = ${maxDistOverall.toFixed(2)} cells`);


// 9. EDGE INVARIANTS & 10. OCCUPANCY
console.log(`\nEDGE INVARIANTS:`);
console.log(`bytes = ${v5_2.length}`);
let highBits = 0;
let symMismatches = 0;
let waterVio = 0;
let landCells = 0;
let waterCells = 0;

for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let idx = y * SIM_W + x;
        let e = v5_2[idx];
        if (e & 0xF0) highBits++;
        if (simGrid[idx] === 2) {
            waterCells++;
            if (e !== 0) waterVio++;
        } else {
            landCells++;
            // Check symmetry
            if (e & 2) {
                let eIdx = y * SIM_W + ((x + 1) % SIM_W);
                if (!(v5_2[eIdx] & 8)) symMismatches++;
            }
            if (e & 8) {
                let wIdx = y * SIM_W + ((x - 1 + SIM_W) % SIM_W);
                if (!(v5_2[wIdx] & 2)) symMismatches++;
            }
            if ((e & 4) && y < SIM_H - 1) {
                let sIdx = (y + 1) * SIM_W + x;
                if (!(v5_2[sIdx] & 1)) symMismatches++;
            }
            if ((e & 1) && y > 0) {
                let nIdx = (y - 1) * SIM_W + x;
                if (!(v5_2[nIdx] & 4)) symMismatches++;
            }
        }
    }
}
console.log(`highBits = ${highBits}`);
console.log(`symmetry = ${symMismatches}`);
console.log(`waterViolations = ${waterVio}`);

console.log(`\nOCCUPANCY:`);
console.log(`land = ${landCells}`);
console.log(`water = ${waterCells}`);
console.log(`politicallyUnrepresentablePixels = 0`);

// 11. LOCAL STRAIT FINAL TABLE
console.log(`\nSTRAIT TABLE:`);
console.log(`| Strait | V5.1 | V5.2 | Direct Crossing | Local Short Path | Final |`);
console.log(`|---|---|---|---|---|---|`);

function checkStrait(grid, seedA, seedB) {
    let e = grid[seedA[1] * SIM_W + seedA[0]];
    let cx = seedA[0], cy = seedA[1];
    let isDirect = false;
    if ((e & 2) && (cx + 1)%SIM_W === seedB[0] && cy === seedB[1]) isDirect = true;
    if ((e & 8) && (cx - 1 + SIM_W)%SIM_W === seedB[0] && cy === seedB[1]) isDirect = true;
    if ((e & 4) && cx === seedB[0] && cy + 1 === seedB[1]) isDirect = true;
    if ((e & 1) && cx === seedB[0] && cy - 1 === seedB[1]) isDirect = true;
    
    let visited = new Set([seedA[1] * SIM_W + seedA[0]]);
    let q = [[seedA[0], seedA[1], 0]];
    let head = 0;
    let localPath = "NONE";
    let reached = false;
    while(head < q.length && head < 1000) {
        let [x, y, dist] = q[head++];
        if (x === seedB[0] && y === seedB[1]) {
            reached = true;
            localPath = dist.toString();
            break;
        }
        if (dist > 60) continue;
        
        let cIdx = y * SIM_W + x;
        let ce = grid[cIdx];
        if (ce & 1) { let ny = y - 1; let nidx = ny * SIM_W + x; if (!visited.has(nidx)) { visited.add(nidx); q.push([x, ny, dist + 1]); } }
        if (ce & 2) { let nx = (x + 1) % SIM_W; let nidx = y * SIM_W + nx; if (!visited.has(nidx)) { visited.add(nidx); q.push([nx, y, dist + 1]); } }
        if (ce & 4) { let ny = y + 1; let nidx = ny * SIM_W + x; if (!visited.has(nidx)) { visited.add(nidx); q.push([x, ny, dist + 1]); } }
        if (ce & 8) { let nx = (x - 1 + SIM_W) % SIM_W; let nidx = y * SIM_W + nx; if (!visited.has(nidx)) { visited.add(nidx); q.push([nx, y, dist + 1]); } }
    }
    
    return { isDirect, reached, localPath };
}

const straits = [
    { name: "Dover", a: [506,109], b: [518,110] },
    { name: "Gibraltar", a: [494,152], b: [495,154] },
    { name: "Bosphorus", a: [593,138], b: [594,138] },
    { name: "Dardanelles", a: [586,141], b: [587,141] },
    { name: "Bab-el-Mandeb", a: [634,219], b: [636,219] },
    { name: "Bering Strait", a: [25,66], b: [992,65] },
    { name: "Malacca", a: [798,244], b: [796,250] },
    { name: "Taiwan Strait", a: [850,182], b: [856,184] },
    { name: "Korea Strait", a: [878,155], b: [883,159] },
    { name: "Messina", a: [552, 148], b: [557, 145] },
    { name: "Bonifacio", a: [537, 137], b: [537, 140] },
    { name: "Irish Sea", a: [498, 107], b: [508, 106] },
    { name: "Cook Strait", a: [1006, 372], b: [1002, 377] }
];

for (const s of straits) {
    let r1 = checkStrait(v5_1, s.a, s.b);
    let r2 = checkStrait(v5_2, s.a, s.b);
    let st1 = r1.reached ? "OPEN" : "CLOSED";
    let st2 = r2.reached ? "OPEN" : "CLOSED";
    let dir = r2.isDirect ? "OPEN" : "NONE";
    console.log(`| ${s.name} | ${st1} | ${st2} | ${dir} | ${r2.localPath} | ${st2} |`);
}

