const fs = require('fs');

const VISUAL_W = 4096, VISUAL_H = 2048;
const SIM_W = 1024, SIM_H = 512;
const visualMask = Buffer.from(fs.readFileSync('../client/src/assets/world_visual_mask.bin'));
const constraints = JSON.parse(fs.readFileSync('../server/assets/world_topology_constraints.json', 'utf8'));

function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
function intersects(A, B, C, D) { return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D); }
function lonLatToVisual(lon, lat) {
    return { x: (lon + 180) / 360 * VISUAL_W, y: (90 - lat) / 180 * VISUAL_H };
}
function visualToLonLat(x, y) {
    return { lon: x / VISUAL_W * 360 - 180, lat: 90 - y / VISUAL_H * 180 };
}

let oldSegs = [];
for (const c of constraints) {
    if (c.enabled) {
        for (const seg of c.segments) {
            oldSegs.push({ A: lonLatToVisual(seg[0][0], seg[0][1]), B: lonLatToVisual(seg[1][0], seg[1][1]) });
        }
    }
}
let messinaConstraint = constraints.find(c => c.id === 'strait-of-messina');
let messinaSegs = messinaConstraint.segments.map(seg => ({
    A: lonLatToVisual(seg[0][0], seg[0][1]),
    B: lonLatToVisual(seg[1][0], seg[1][1])
}));

function pointToSegmentDistance(p, v, w) {
    let l2 = (v.x - w.x)*(v.x - w.x) + (v.y - w.y)*(v.y - w.y);
    if (l2 === 0) return Math.sqrt((p.x-v.x)*(p.x-v.x) + (p.y-v.y)*(p.y-v.y));
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    let proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt((p.x - proj.x)*(p.x - proj.x) + (p.y - proj.y)*(p.y - proj.y));
}

function isMicroAdjacencyCutWrapped(x1, y1, x2, y2) {
    const C = { x: x1 + 0.5, y: y1 + 0.5 };
    const D = { x: x2 + 0.5, y: y2 + 0.5 };
    for (const seg of oldSegs) {
        if (intersects(seg.A, seg.B, C, D)) return true;
    }
    return false;
}

function resolveVisualSeed(lon, lat, radius = 50) {
    const rawX = Math.floor((lon + 180) / 360 * VISUAL_W);
    const rawY = Math.floor((90 - lat) / 180 * VISUAL_H);
    const target = { x: ((rawX % VISUAL_W) + VISUAL_W) % VISUAL_W, y: Math.max(0, Math.min(VISUAL_H - 1, rawY)) };
    
    let bestDist = Infinity, resolved = null;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            let cy = target.y + dy;
            if (cy < 0 || cy >= VISUAL_H) continue;
            let cx = ((target.x + dx) % VISUAL_W + VISUAL_W) % VISUAL_W;
            if (visualMask[cy * VISUAL_W + cx] >= 128) {
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < bestDist) { bestDist = dist; resolved = {x: cx, y: cy}; }
            }
        }
    }
    return resolved;
}

let sA = resolveVisualSeed(15.6, 38.2);
let sB = resolveVisualSeed(15.4, 38.2);

let cA = {x: Math.floor(sA.x/4), y: Math.floor(sA.y/4)};
let cB = {x: Math.floor(sB.x/4), y: Math.floor(sB.y/4)};

let minX = Math.min(cA.x, cB.x) - 10;
let maxX = Math.max(cA.x, cB.x) + 10;
let minY = Math.min(cA.y, cB.y) - 10;
let maxY = Math.max(cA.y, cB.y) + 10;

// Re-do the exact BFS locally over micro pixels
let visited = new Set();
let q = [ {x: sA.x, y: sA.y, path: []} ];
visited.add(sA.y*VISUAL_W + sA.x);
let head = 0;
let meetingEdge = null;
let foundPath = null;
while(head < q.length) {
    let curr = q[head++];
    if (curr.x === sB.x && curr.y === sB.y) {
        foundPath = curr.path;
        break;
    }
    
    const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
    for (const [dx, dy] of dirs) {
        let nx = curr.x + dx, ny = curr.y + dy;
        let cX = Math.floor(nx/4), cY = Math.floor(ny/4);
        if (cX >= minX && cX <= maxX && cY >= minY && cY <= maxY) {
            let nidx = ny*VISUAL_W + nx;
            if (visualMask[nidx] >= 128) {
                if (!isMicroAdjacencyCutWrapped(curr.x, curr.y, nx, ny)) {
                    if (!visited.has(nidx)) {
                        visited.add(nidx);
                        q.push({x: nx, y: ny, path: [...curr.path, {x1: curr.x, y1: curr.y, x2: nx, y2: ny}]});
                    }
                }
            }
        }
    }
}

if (foundPath) {
    console.log("Found path over micro edges!");
    // Which edge in the path crosses the strait? Let's check distance to Messina constraint.
    let minD = Infinity;
    let closestEdge = null;
    for (const e of foundPath) {
        let mid = {x: (e.x1+e.x2)/2 + 0.5, y: (e.y1+e.y2)/2 + 0.5};
        let dist = pointToSegmentDistance(mid, messinaSegs[0].A, messinaSegs[0].B);
        if (dist < minD) {
            minD = dist;
            closestEdge = e;
        }
    }
    
    let e = closestEdge;
    let mid = {x: (e.x1+e.x2)/2 + 0.5, y: (e.y1+e.y2)/2 + 0.5};
    let ll = visualToLonLat(mid.x, mid.y);
    let dir = (e.x1 !== e.x2) ? "HORIZONTAL" : "VERTICAL";
    
    console.log("micro pixel A x/y:", e.x1, e.y1);
    console.log("micro pixel B x/y:", e.x2, e.y2);
    console.log("coarse cell A x/y:", Math.floor(e.x1/4), Math.floor(e.y1/4));
    console.log("coarse cell B x/y:", Math.floor(e.x2/4), Math.floor(e.y2/4));
    console.log("direction:", dir);
    console.log("lon/lat of micro edge midpoint:", ll.lon.toFixed(5), ll.lat.toFixed(5));
    console.log("minimum geometric distance:", minD.toFixed(3), "pixels");
    
    // Evaluate why it missed
    let aLat = 38.6, aLon = 15.2;
    let bLat = 37.8, bLon = 16.0;
    // The segment goes from 15.2, 38.6 to 16.0, 37.8
    // We can see if it's too short or slightly misaligned.
    let missReason = "";
    if (ll.lon < 15.2 || ll.lon > 16.0 || ll.lat > 38.6 || ll.lat < 37.8) {
        missReason = "The physical micro path exists outside the bounds of the constraint line segment. The constraint segment is too short to reach the full length of the strait corridor where the land pixels touch.";
    } else {
        missReason = "The physical micro path squeezes through a gap because the constraint line does not intersect the exact micro pixel boundaries in the rasterized micro graph at this location, possibly because the segment doesn't pass between the pixel centers.";
    }
    console.log("reason:", missReason);
} else {
    console.log("No path found?");
}

