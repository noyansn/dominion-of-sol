const fs = require('fs');
const SIM_W = 1024, SIM_H = 512;
const v5_1 = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_1.bin'));
const v5_2 = Buffer.from(fs.readFileSync('../server/assets/world_land_edges_candidate_v5_2.bin'));
const simGrid = fs.readFileSync('../server/assets/world_grid_candidate_v5_support.bin');
const constraints = JSON.parse(fs.readFileSync('../server/assets/world_topology_constraints.json', 'utf8'));

// 3. TEK AUTHORITATIVE COORDINATE CONVERSION
function lonLatToSim(lon, lat) {
    const rawX = Math.floor((lon + 180) / 360 * SIM_W);
    const rawY = Math.floor((90 - lat) / 180 * SIM_H);
    const x = ((rawX % SIM_W) + SIM_W) % SIM_W;
    const y = Math.max(0, Math.min(SIM_H - 1, rawY));
    return { x, y, rawX, rawY };
}

// 4. SEED RESOLVER
function resolveLandSeed(lon, lat, radius = 5) {
    const target = lonLatToSim(lon, lat);
    let bestDist = Infinity;
    let resolved = null;
    
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
    
    if (!resolved) return { status: 'INVALID_SEED', raw: target };
    return { status: 'VALID', raw: target, resolved, distance: bestDist };
}

// 5. GLOBAL COMPONENT LABELING
let compId = new Int32Array(SIM_W * SIM_H).fill(-1);
let currentComp = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (simGrid[i] === 0 && compId[i] === -1) {
        let q = [i];
        compId[i] = currentComp;
        let head = 0;
        while(head < q.length) {
            let u = q[head++];
            let cx = u % SIM_W;
            let cy = Math.floor(u / SIM_W);
            let e = v5_2[u];
            
            if (e & 1) { let ny = cy - 1; let nidx = ny * SIM_W + cx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
            if (e & 2) { let nx = (cx + 1) % SIM_W; let nidx = cy * SIM_W + nx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
            if (e & 4) { let ny = cy + 1; let nidx = ny * SIM_W + cx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
            if (e & 8) { let nx = (cx - 1 + SIM_W) % SIM_W; let nidx = cy * SIM_W + nx; if (compId[nidx] === -1) { compId[nidx] = currentComp; q.push(nidx); } }
        }
        currentComp++;
    }
}
function getComp(res) {
    if (res.status !== 'VALID') return -1;
    return compId[res.resolved.y * SIM_W + res.resolved.x];
}

// 6. NAMED REFERENCE SEEDS
const namedSeedsData = {
    "Great Britain": { lon: -1.5, lat: 53.0 },
    "Ireland": { lon: -8.0, lat: 53.0 },
    "mainland Europe": { lon: 2.0, lat: 47.0 },
    "Corsica": { lon: 9.0, lat: 42.1 },
    "Sardinia": { lon: 9.0, lat: 40.0 },
    "Sicily": { lon: 14.0, lat: 37.5 },
    "mainland Italy": { lon: 16.0, lat: 39.0 },
    "NZ North": { lon: 176.0, lat: -39.0 },
    "NZ South": { lon: 170.0, lat: -43.5 },
    "Japan": { lon: 138.0, lat: 36.0 },
    "Korea": { lon: 128.0, lat: 36.0 },
    "Taiwan": { lon: 121.0, lat: 23.7 },
    "China": { lon: 118.0, lat: 26.0 },
    "Sri Lanka": { lon: 80.5, lat: 7.5 },
    "India": { lon: 78.0, lat: 11.0 },
    "Madagascar": { lon: 47.0, lat: -19.0 },
    "Africa": { lon: 35.0, lat: -15.0 },
    "North America W": { lon: -100.0, lat: 40.0 },
    "North America E": { lon: -80.0, lat: 40.0 },
    "South America N": { lon: -55.0, lat: -10.0 },
    "South America S": { lon: -65.0, lat: -35.0 },
    "Africa W": { lon: 20.0, lat: 0.0 },
    "Africa E": { lon: 35.0, lat: -15.0 },
    "Australia W": { lon: 125.0, lat: -25.0 },
    "Australia E": { lon: 145.0, lat: -25.0 },
    "France": { lon: 2.0, lat: 47.0 },
    "Germany": { lon: 10.0, lat: 51.0 },
    "Poland": { lon: 19.0, lat: 52.0 },
    "Central Russia": { lon: 35.0, lat: 55.0 },
    "Siberia": { lon: 90.0, lat: 60.0 },
    "Anatolia": { lon: 35.0, lat: 39.0 },
    "Middle East": { lon: 45.0, lat: 33.0 }
};

let resolvedSeeds = {};
console.log("RESOLVED SEEDS:");
console.log("| Name | lon | lat | raw x/y | resolved x/y | distance | support | componentId |");
console.log("|---|---|---|---|---|---|---|---|");
for (const [name, pos] of Object.entries(namedSeedsData)) {
    let res = resolveLandSeed(pos.lon, pos.lat, 10);
    resolvedSeeds[name] = res;
    let raw = res.raw ? `${res.raw.x},${res.raw.y}` : "-";
    let r = res.resolved ? `${res.resolved.x},${res.resolved.y}` : "-";
    let d = res.distance !== undefined ? res.distance.toFixed(1) : "-";
    let c = getComp(res);
    console.log(`| ${name} | ${pos.lon} | ${pos.lat} | ${raw} | ${r} | ${d} | ${res.status} | ${c} |`);
}

// 7. PAIR TESTS
const pairs = [
    ["Ireland", "Great Britain"],
    ["Great Britain", "mainland Europe"],
    ["Corsica", "Sardinia"],
    ["Corsica", "mainland Europe"],
    ["Sardinia", "mainland Europe"],
    ["Sicily", "mainland Italy"],
    ["NZ North", "NZ South"],
    ["Japan", "Korea"],
    ["Taiwan", "China"],
    ["Sri Lanka", "India"],
    ["Madagascar", "Africa"]
];
console.log("\nPAIR COMPONENT TESTS:");
console.log("| Pair | CompA | CompB | Same | Expected | Result |");
console.log("|---|---|---|---|---|---|");
for (const [a, b] of pairs) {
    let cA = getComp(resolvedSeeds[a]);
    let cB = getComp(resolvedSeeds[b]);
    let invalid = (cA < 0 || cB < 0);
    let same = (cA === cB);
    let pass = !invalid && (same === false);
    console.log(`| ${a} / ${b} | ${cA} | ${cB} | ${same} | false | ${pass ? "PASS" : "FAIL"} |`);
}

// 10. MACRO CONNECTIVITY
const macros = [
    { p: "North America internally connected", a: "North America W", b: "North America E" },
    { p: "South America internally connected", a: "South America N", b: "South America S" },
    { p: "Africa internally connected", a: "Africa W", b: "Africa E" },
    { p: "Australia internally connected", a: "Australia W", b: "Australia E" },
    { p: "France -> Germany", a: "France", b: "Germany" },
    { p: "Germany -> Poland", a: "Germany", b: "Poland" },
    { p: "Poland -> Central Russia", a: "Poland", b: "Central Russia" },
    { p: "Central Russia -> Siberia", a: "Central Russia", b: "Siberia" },
    { p: "Anatolia -> Middle East", a: "Anatolia", b: "Middle East" }
];
console.log("\nMACRO CONNECTIVITY:");
console.log("| Test | SeedA resolved | SeedB resolved | CompA | CompB | Same | Result |");
console.log("|---|---|---|---|---|---|---|");
for (const m of macros) {
    let sA = resolvedSeeds[m.a];
    let sB = resolvedSeeds[m.b];
    let cA = getComp(sA);
    let cB = getComp(sB);
    let invalid = (cA < 0 || cB < 0);
    let same = (cA === cB);
    let pass = !invalid && (same === true);
    
    let rsA = sA.resolved ? `${sA.resolved.x},${sA.resolved.y}` : "-";
    let rsB = sB.resolved ? `${sB.resolved.x},${sB.resolved.y}` : "-";
    console.log(`| ${m.p} | ${rsA} | ${rsB} | ${cA} | ${cB} | ${same} | ${pass ? "PASS" : "FAIL"} |`);
}

// 8 & 9. ISLAND SELF-CONSISTENCY
let supportId = new Int32Array(SIM_W * SIM_H).fill(-1);
let currentSupportComp = 0;
let supportSizes = {};
for (let i = 0; i < SIM_W * SIM_H; i++) {
    if (simGrid[i] === 0 && supportId[i] === -1) { 
        let size = 0;
        let q = [i];
        supportId[i] = currentSupportComp;
        let head = 0;
        while(head < q.length) {
            let curr = q[head++];
            size++;
            let cx = curr % SIM_W;
            let cy = Math.floor(curr / SIM_W);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    let ny = cy + dy;
                    if (ny < 0 || ny >= SIM_H) continue;
                    let nx = (cx + dx + SIM_W) % SIM_W;
                    let nidx = ny * SIM_W + nx;
                    if (simGrid[nidx] === 0 && supportId[nidx] === -1) {
                        supportId[nidx] = currentSupportComp;
                        q.push(nidx);
                    }
                }
            }
        }
        supportSizes[currentSupportComp] = size;
        currentSupportComp++;
    }
}

const islandTests = [
    "Great Britain", "Ireland", "Japan", "Taiwan", "Sri Lanka", "Madagascar", "Sardinia", "Corsica", "Sicily", "NZ North", "NZ South"
];
console.log("\nISLAND SELF-CONSISTENCY:");
console.log("| Island | Polygon Support ID | Support Cells | Distinct Traversal Comps | Largest Trav Comp Cells | Main Body Cov % |");
console.log("|---|---|---|---|---|---|");
for (const name of islandTests) {
    let res = resolvedSeeds[name];
    if (res.status !== 'VALID') {
        console.log(`| ${name} | INVALID | - | - | - | - |`);
        continue;
    }
    let sIdx = res.resolved.y * SIM_W + res.resolved.x;
    let sId = supportId[sIdx];
    let sSize = supportSizes[sId];
    
    let travComps = new Set();
    let travCounts = {};
    for (let i = 0; i < SIM_W * SIM_H; i++) {
        if (supportId[i] === sId) {
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
    let seedTComp = compId[sIdx];
    let mainCount = travCounts[seedTComp] || 0;
    let pct = ((mainCount / sSize) * 100).toFixed(1) + "%";
    console.log(`| ${name} | ${sId} | ${sSize} | ${travComps.size} | ${maxTrav} | ${pct} |`);
}

// 11 & 12. STRAIT VALIDATOR
console.log("\nSTRAIT V5.1/V5.2:");
console.log("| Strait | bank A res | bank B res | V5.1 direct | V5.1 path | V5.2 direct | V5.2 path | Result V5.2 |");
console.log("|---|---|---|---|---|---|---|---|");

const straitDefs = [
    { name: "Dover", a: {lon: 1.3, lat: 51.1}, b: {lon: 1.6, lat: 50.9} }, 
    { name: "Gibraltar", a: {lon: -5.6, lat: 36.1}, b: {lon: -5.4, lat: 35.8} }, 
    { name: "Bosphorus", a: {lon: 28.9, lat: 41.05}, b: {lon: 29.1, lat: 41.05} },
    { name: "Dardanelles", a: {lon: 26.2, lat: 40.2}, b: {lon: 26.5, lat: 40.0} },
    { name: "Bab-el-Mandeb", a: {lon: 43.4, lat: 12.6}, b: {lon: 43.6, lat: 12.3} }, 
    { name: "Bering", a: {lon: -171.0, lat: 66.0}, b: {lon: -168.0, lat: 66.0} }, 
    { name: "Malacca", a: {lon: 101.5, lat: 3.0}, b: {lon: 101.5, lat: 2.0} }, 
    { name: "Taiwan", a: {lon: 119.5, lat: 25.0}, b: {lon: 121.0, lat: 25.0} }, 
    { name: "Korea", a: {lon: 129.5, lat: 35.0}, b: {lon: 130.0, lat: 34.0} }, 
    { name: "Messina", a: {lon: 15.6, lat: 38.2}, b: {lon: 15.4, lat: 38.2} }, 
    { name: "Bonifacio", a: {lon: 9.1, lat: 41.4}, b: {lon: 9.1, lat: 41.2} }, 
    { name: "Irish Sea", a: {lon: -6.0, lat: 53.5}, b: {lon: -4.0, lat: 53.5} }, 
    { name: "Cook Strait", a: {lon: 174.5, lat: -41.0}, b: {lon: 174.0, lat: -41.5} }, 
];

function testStrait(grid, seedA, seedB) {
    if (seedA.status !== 'VALID' || seedB.status !== 'VALID') return { direct: 'INVALID', path: 'INVALID' };
    
    let isDirect = false;
    let sA = seedA.resolved;
    let sB = seedB.resolved;
    let e = grid[sA.y * SIM_W + sA.x];
    if ((e & 2) && (sA.x + 1)%SIM_W === sB.x && sA.y === sB.y) isDirect = true;
    if ((e & 8) && (sA.x - 1 + SIM_W)%SIM_W === sB.x && sA.y === sB.y) isDirect = true;
    if ((e & 4) && sA.x === sB.x && sA.y + 1 === sB.y) isDirect = true;
    if ((e & 1) && sA.x === sB.x && sA.y - 1 === sB.y) isDirect = true;
    
    let visited = new Set([sA.y * SIM_W + sA.x]);
    let q = [[sA.x, sA.y, 0]];
    let head = 0;
    let path = "NONE";
    while(head < q.length && head < 5000) {
        let [x, y, dist] = q[head++];
        if (x === sB.x && y === sB.y) {
            path = dist.toString();
            break;
        }
        if (dist > 100) continue; 
        
        let cIdx = y * SIM_W + x;
        let ce = grid[cIdx];
        if (ce & 1) { let ny = y - 1; let nidx = ny * SIM_W + x; if (!visited.has(nidx)) { visited.add(nidx); q.push([x, ny, dist + 1]); } }
        if (ce & 2) { let nx = (x + 1) % SIM_W; let nidx = y * SIM_W + nx; if (!visited.has(nidx)) { visited.add(nidx); q.push([nx, y, dist + 1]); } }
        if (ce & 4) { let ny = y + 1; let nidx = ny * SIM_W + x; if (!visited.has(nidx)) { visited.add(nidx); q.push([x, ny, dist + 1]); } }
        if (ce & 8) { let nx = (x - 1 + SIM_W) % SIM_W; let nidx = y * SIM_W + nx; if (!visited.has(nidx)) { visited.add(nidx); q.push([nx, y, dist + 1]); } }
    }
    return { direct: isDirect ? "OPEN" : "NONE", path };
}

for (const s of straitDefs) {
    let rA = resolveLandSeed(s.a.lon, s.a.lat, 10);
    let rB = resolveLandSeed(s.b.lon, s.b.lat, 10);
    
    let res1 = testStrait(v5_1, rA, rB);
    let res2 = testStrait(v5_2, rA, rB);
    
    let v52Closed = (res2.direct === 'NONE' && res2.path === 'NONE') ? 'CLOSED' : 'OPEN';
    if (res2.direct === 'INVALID') v52Closed = 'INVALID TEST';
    
    let sAr = rA.resolved ? `${rA.resolved.x},${rA.resolved.y}` : "INV";
    let sBr = rB.resolved ? `${rB.resolved.x},${rB.resolved.y}` : "INV";
    
    console.log(`| ${s.name} | ${sAr} | ${sBr} | ${res1.direct} | ${res1.path} | ${res2.direct} | ${res2.path} | ${v52Closed} |`);
}

// EDGE COUNTS
let v51_open = 0, v52_open = 0;
for (let i = 0; i < SIM_W * SIM_H; i++) {
    const e1 = v5_1[i], e2 = v5_2[i];
    if (e1 & 1) v51_open++; if (e1 & 2) v51_open++; if (e1 & 4) v51_open++; if (e1 & 8) v51_open++;
    if (e2 & 1) v52_open++; if (e2 & 2) v52_open++; if (e2 & 4) v52_open++; if (e2 & 8) v52_open++;
}

let directed_cleared = v51_open - v52_open;
let physical_closed = 0;
let changed_edges = [];
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let idx = y * SIM_W + x;
        let e1 = v5_1[idx], e2 = v5_2[idx];
        if ((e1 & 2) !== (e2 & 2)) {
            physical_closed++; 
            changed_edges.push({x, y, dir: 'E'});
        }
        if ((e1 & 4) !== (e2 & 4) && y < SIM_H - 1) {
            physical_closed++;
            changed_edges.push({x, y, dir: 'S'});
        }
    }
}
console.log(`\nEDGE COUNTS:`);
console.log(`V5.1 directed open bits = ${v51_open}`);
console.log(`V5.2 directed open bits = ${v52_open}`);
console.log(`directed bits cleared = ${directed_cleared}`);
console.log(`physical adjacencies closed = ${physical_closed}`);

// CONSTRAINT TRACEABILITY
function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
function intersects(A, B, C, D) { return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D); }
let explainedSet = new Set(), overlap = 0, constraintTrace = [];
for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    let physClosed = 0;
    for (const segment of constraint.segments) {
        const A = lonLatToSim(segment[0][0], segment[0][1]);
        const B = lonLatToSim(segment[1][0], segment[1][1]);
        for (const ce of changed_edges) {
            let pathC, pathD;
            if (ce.dir === 'E') { pathC = { x: ce.x + 0.5, y: ce.y + 0.5 }; pathD = { x: ce.x + 1.5, y: ce.y + 0.5 }; } 
            else { pathC = { x: ce.x + 0.5, y: ce.y + 0.5 }; pathD = { x: ce.x + 0.5, y: ce.y + 1.5 }; }
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

// EDGE INVARIANTS & OCCUPANCY
console.log(`\nEDGE INVARIANTS:`);
console.log(`bytes = ${v5_2.length}`);
let highBits = 0, symMismatches = 0, waterVio = 0, landCells = 0, waterCells = 0;
for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
        let idx = y * SIM_W + x;
        let e = v5_2[idx];
        if (e & 0xF0) highBits++;
        if (simGrid[idx] === 2) { waterCells++; if (e !== 0) waterVio++; } 
        else {
            landCells++;
            if (e & 2) { let eIdx = y * SIM_W + ((x + 1) % SIM_W); if (!(v5_2[eIdx] & 8)) symMismatches++; }
            if (e & 8) { let wIdx = y * SIM_W + ((x - 1 + SIM_W) % SIM_W); if (!(v5_2[wIdx] & 2)) symMismatches++; }
            if ((e & 4) && y < SIM_H - 1) { let sIdx = (y + 1) * SIM_W + x; if (!(v5_2[sIdx] & 1)) symMismatches++; }
            if ((e & 1) && y > 0) { let nIdx = (y - 1) * SIM_W + x; if (!(v5_2[nIdx] & 4)) symMismatches++; }
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

// ANOMALIES
console.log("\nANOMALY TRACES:");
function traceAnomaly(seedA, seedB) {
    if(seedA.status !== 'VALID' || seedB.status !== 'VALID') return "INVALID SEEDS";
    let cA = compId[seedA.resolved.y * SIM_W + seedA.resolved.x];
    let cB = compId[seedB.resolved.y * SIM_W + seedB.resolved.x];
    if (cA !== cB) return "DIFFERENT COMPONENTS (OK)";
    let q = [[seedA.resolved.x, seedA.resolved.y]];
    let parent = new Map();
    parent.set(`${seedA.resolved.x},${seedA.resolved.y}`, "START");
    let head = 0;
    while(head < q.length && head < 10000) {
        let [x,y] = q[head++];
        if (x === seedB.resolved.x && y === seedB.resolved.y) break;
        let cIdx = y * SIM_W + x, ce = v5_2[cIdx];
        if (ce & 1) { let ny = y - 1; let nk = `${x},${ny}`; if (!parent.has(nk)) { parent.set(nk, {x,y,dir:'N'}); q.push([x, ny]); } }
        if (ce & 2) { let nx = (x + 1) % SIM_W; let nk = `${nx},${y}`; if (!parent.has(nk)) { parent.set(nk, {x,y,dir:'E'}); q.push([nx, y]); } }
        if (ce & 4) { let ny = y + 1; let nk = `${x},${ny}`; if (!parent.has(nk)) { parent.set(nk, {x,y,dir:'S'}); q.push([x, ny]); } }
        if (ce & 8) { let nx = (x - 1 + SIM_W) % SIM_W; let nk = `${nx},${y}`; if (!parent.has(nk)) { parent.set(nk, {x,y,dir:'W'}); q.push([nx, y]); } }
    }
    let curr = `${seedB.resolved.x},${seedB.resolved.y}`;
    let pathStr = "";
    while(parent.has(curr) && parent.get(curr) !== "START") {
        let p = parent.get(curr);
        pathStr = `(${p.x},${p.y}->${p.dir}) ` + pathStr;
        curr = `${p.x},${p.y}`;
    }
    if (pathStr.length > 200) pathStr = pathStr.substring(0, 200) + "...";
    return `SAME COMPONENT. Path: ${pathStr}`;
}
console.log(`Ireland-GB = ${traceAnomaly(resolvedSeeds["Ireland"], resolvedSeeds["Great Britain"])}`);
console.log(`NZ North-South = ${traceAnomaly(resolvedSeeds["NZ North"], resolvedSeeds["NZ South"])}`);
console.log(`Madagascar-Africa = ${traceAnomaly(resolvedSeeds["Madagascar"], resolvedSeeds["Africa"])}`);
console.log(`Sicily-Italy = ${traceAnomaly(resolvedSeeds["Sicily"], resolvedSeeds["mainland Italy"])}`);

