/*
 * Canonical micro-gap topology audit for the CURRENT authority raster.
 *
 * It never edits world_grid.bin, ownership, or presentation.  It only emits
 * explicit cell-pair traversal edges when disconnected 1024x512 components
 * share a constrained 4096x2048 canonical land path of at most 8 pixels.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const AUTH_W = 1024;
const AUTH_H = 512;
const VIS_W = 4096;
const VIS_H = 2048;
const VIS_CELLS = VIS_W * VIS_H;
// The topology test uses opaque high-resolution land, rather than the
// antialiased shoreline fringe used for rendering.  A semitransparent coast
// pixel cannot turn a real strait into a land route.
const VISUAL_LAND_THRESHOLD = 255;
const MAX_BRIDGE_STEPS = 8; // two authority-cell pixels; only a raster micro-gap
const MAX_TOPOLOGY_GAP_KM = 35;
const STRATEGIC_ANCHOR_MIN_CELLS = 32;

const authority = fs.readFileSync(path.join(ROOT, 'server/assets/world_grid.bin'));
const visual = fs.readFileSync(path.join(ROOT, 'client/src/assets/world_visual_mask.bin'));
const constraints = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/assets/world_topology_constraints.json'), 'utf8'))
  .filter(item => item.enabled);
if (authority.length !== AUTH_W * AUTH_H) throw new Error('authority dimensions mismatch');
if (visual.length !== VIS_CELLS) throw new Error('visual mask dimensions mismatch');
const authoritySha256 = crypto.createHash('sha256').update(authority).digest('hex');
function fnv1a32(bytes) {
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash;
}
const authorityFnv1a32 = fnv1a32(authority);

function authIndex(x, y) { return y * AUTH_W + x; }
function visualIndex(x, y) { return y * VIS_W + x; }
function isLandCell(index) { return authority[index] === 0; }
function isVisualLand(index) { return visual[index] >= VISUAL_LAND_THRESHOLD; }
function lonLatForVisual(index) {
  const x = index % VIS_W;
  const y = Math.floor(index / VIS_W);
  return { lon: (x + 0.5) / VIS_W * 360 - 180, lat: 90 - (y + 0.5) / VIS_H * 180 };
}
function lonLatForAuthority(index) {
  const x = index % AUTH_W;
  const y = Math.floor(index / AUTH_W);
  return { lon: (x + 0.5) / AUTH_W * 360 - 180, lat: 90 - (y + 0.5) / AUTH_H * 180 };
}
function haversineKm(a, b) {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  let dLonDeg = b.lon - a.lon;
  if (dLonDeg > 180) dLonDeg -= 360;
  if (dLonDeg < -180) dLonDeg += 360;
  const dLon = toRad(dLonDeg);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function orientation(a, b, c) { return (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x); }
function onSegment(a, b, c) {
  return Math.min(a.x, b.x) <= c.x && c.x <= Math.max(a.x, b.x)
    && Math.min(a.y, b.y) <= c.y && c.y <= Math.max(a.y, b.y);
}
function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c), o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a), o4 = orientation(c, d, b);
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}
function toVisualPoint(lon, lat) {
  return { x: (lon + 180) / 360 * VIS_W, y: (90 - lat) / 180 * VIS_H };
}
const separatorSegments = constraints.flatMap(constraint => constraint.segments.map(segment => ({
  id: constraint.id,
  name: constraint.name,
  a: toVisualPoint(segment[0][0], segment[0][1]),
  b: toVisualPoint(segment[1][0], segment[1][1]),
})));
function crossedSeparator(ax, ay, bx, by) {
  let a = { x: ax + 0.5, y: ay + 0.5 };
  let b = { x: bx + 0.5, y: by + 0.5 };
  if (Math.abs(a.x - b.x) > VIS_W / 2) {
    if (a.x > b.x) b.x += VIS_W; else a.x += VIS_W;
  }
  for (const segment of separatorSegments) {
    const variants = [0, -VIS_W, VIS_W];
    for (const shift of variants) {
      const s1 = { x: segment.a.x + shift, y: segment.a.y };
      const s2 = { x: segment.b.x + shift, y: segment.b.y };
      if (segmentsIntersect(a, b, s1, s2)) return segment;
    }
  }
  return null;
}

// The gameplay component baseline exactly mirrors legal_land_neighbors:
// cardinals always connect; diagonals connect only if one intervening
// orthogonal cell is land. Horizontal world wrapping remains canonical.
const component = new Int32Array(AUTH_W * AUTH_H);
component.fill(-1);
const componentSizes = [];
let componentCount = 0;
const authQueue = new Int32Array(AUTH_W * AUTH_H);
for (let start = 0; start < component.length; start++) {
  if (!isLandCell(start) || component[start] >= 0) continue;
  let head = 0, tail = 0, size = 0;
  component[start] = componentCount;
  authQueue[tail++] = start;
  while (head < tail) {
    const cell = authQueue[head++];
    size++;
    const x = cell % AUTH_W, y = Math.floor(cell / AUTH_W);
    const push = (nx, ny) => {
      if (ny < 0 || ny >= AUTH_H) return;
      nx = (nx + AUTH_W) % AUTH_W;
      const next = authIndex(nx, ny);
      if (isLandCell(next) && component[next] < 0) {
        component[next] = componentCount;
        authQueue[tail++] = next;
      }
    };
    push(x, y - 1); push(x + 1, y); push(x, y + 1); push(x - 1, y);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = (x + dx + AUTH_W) % AUTH_W, ny = y + dy;
      if (ny < 0 || ny >= AUTH_H) continue;
      const sideA = authIndex(nx, y), sideB = authIndex(x, ny);
      if (isLandCell(sideA) || isLandCell(sideB)) push(nx, ny);
    }
  }
  componentSizes.push(size);
  componentCount++;
}

// Multi-source constrained high-res flood. Each visual land pixel initially
// inherits the authority component of its 4x4 parent, if it has one. It may
// then traverse only canonical high-res land; separators cut the edge.
const owner = new Int32Array(VIS_CELLS); owner.fill(-1);
const distance = new Uint16Array(VIS_CELLS);
const originPixel = new Int32Array(VIS_CELLS); originPixel.fill(-1);
const queue = new Int32Array(VIS_CELLS);
let head = 0, tail = 0;
for (let vy = 0; vy < VIS_H; vy++) {
  const ay = Math.floor(vy / 4);
  for (let vx = 0; vx < VIS_W; vx++) {
    const pixel = visualIndex(vx, vy);
    if (!isVisualLand(pixel)) continue;
    const comp = component[authIndex(Math.floor(vx / 4), ay)];
    if (comp >= 0) {
      owner[pixel] = comp;
      originPixel[pixel] = pixel;
      queue[tail++] = pixel;
    }
  }
}

const accepted = new Map();
function recordCandidate(aComp, bComp, aOrigin, bOrigin, steps) {
  if (aComp === bComp || steps > MAX_BRIDGE_STEPS || aOrigin < 0 || bOrigin < 0) return;
  const [low, high] = aComp < bComp ? [aComp, bComp] : [bComp, aComp];
  const key = `${low}:${high}`;
  const previous = accepted.get(key);
  if (!previous || steps < previous.visual_path_steps) {
    const lowOrigin = aComp === low ? aOrigin : bOrigin;
    const highOrigin = aComp === low ? bOrigin : aOrigin;
    accepted.set(key, {
      component_a: low,
      component_b: high,
      cell_a: Math.floor(lowOrigin / 4 / VIS_W) * AUTH_W + Math.floor((lowOrigin % VIS_W) / 4),
      cell_b: Math.floor(highOrigin / 4 / VIS_W) * AUTH_W + Math.floor((highOrigin % VIS_W) / 4),
      visual_path_steps: steps,
      visual_origin_a: lowOrigin,
      visual_origin_b: highOrigin,
    });
  }
}
const separatorCuts = new Map();
while (head < tail) {
  const pixel = queue[head++];
  const px = pixel % VIS_W, py = Math.floor(pixel / VIS_W);
  const thisOwner = owner[pixel];
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    let nx = px + dx, ny = py + dy;
    if (ny < 0 || ny >= VIS_H) continue;
    if (nx < 0) nx += VIS_W;
    if (nx >= VIS_W) nx -= VIS_W;
    const next = visualIndex(nx, ny);
    if (!isVisualLand(next)) continue;
    const separator = crossedSeparator(px, py, nx, ny);
    if (separator) {
      separatorCuts.set(separator.id, (separatorCuts.get(separator.id) || 0) + 1);
      continue;
    }
    if (owner[next] < 0) {
      owner[next] = thisOwner;
      distance[next] = distance[pixel] + 1;
      originPixel[next] = originPixel[pixel];
      queue[tail++] = next;
    } else if (owner[next] !== thisOwner) {
      recordCandidate(thisOwner, owner[next], originPixel[pixel], originPixel[next], distance[pixel] + distance[next] + 1);
    }
  }
}

function componentCentroid(componentId) {
  let sx = 0, sy = 0, count = 0;
  for (let cell = 0; cell < component.length; cell++) {
    if (component[cell] !== componentId) continue;
    sx += cell % AUTH_W; sy += Math.floor(cell / AUTH_W); count++;
  }
  return { x: sx / Math.max(count, 1), y: sy / Math.max(count, 1) };
}
function geographyForCell(cell) {
  const { lon, lat } = lonLatForAuthority(cell);
  if (lat < -60) return 'Antarctica / Southern Ocean';
  if (lat > 58 && lon >= -75 && lon <= -10) return 'Greenland / North Atlantic Arctic';
  if (lat > 60 && lon < -55) return 'Canadian Arctic';
  if (lat > 66) return 'High Arctic';
  if (lat >= 30 && lat <= 47 && lon >= 128 && lon <= 148) return 'Japan / Korea region';
  if (lat >= 30 && lat <= 47 && lon >= -10 && lon <= 42) return 'Mediterranean';
  if (lat >= 48 && lat <= 62 && lon >= -14 && lon <= 5) return 'British Isles';
  if (lat >= -12 && lat <= 8 && lon >= 94 && lon <= 155) return 'Maritime Southeast Asia';
  if (lat >= -28 && lat <= -10 && lon >= 42 && lon <= 53) return 'Madagascar / western Indian Ocean';
  return `${lon.toFixed(1)}°, ${lat.toFixed(1)}°`;
}
function midpointLocation(aCell, bCell) {
  const a = lonLatForAuthority(aCell), b = lonLatForAuthority(bCell);
  let lonB = b.lon;
  if (lonB - a.lon > 180) lonB -= 360;
  if (lonB - a.lon < -180) lonB += 360;
  let lon = (a.lon + lonB) * 0.5;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lon, lat: (a.lat + b.lat) * 0.5 };
}
function nearestSeparatorName(aCell, bCell) {
  const midpoint = midpointLocation(aCell, bCell);
  let best = null;
  for (const constraint of constraints) {
    for (const segment of constraint.segments) {
      const a = { lon: segment[0][0], lat: segment[0][1] };
      const b = { lon: segment[1][0], lat: segment[1][1] };
      const d = Math.min(haversineKm(midpoint, a), haversineKm(midpoint, b));
      if (!best || d < best.distance) best = { id: constraint.id, name: constraint.name, distance: d };
    }
  }
  return best && best.distance <= 320 ? best : null;
}

const highResCandidates = [...accepted.values()].map(edge => {
  const pixelA = lonLatForVisual(edge.visual_origin_a);
  const pixelB = lonLatForVisual(edge.visual_origin_b);
  const location = midpointLocation(edge.cell_a, edge.cell_b);
  return {
    ...edge,
    component_a_cells: componentSizes[edge.component_a],
    component_b_cells: componentSizes[edge.component_b],
    min_highres_separation_km: haversineKm(pixelA, pixelB),
    location_lon_deg: location.lon,
    location_lat_deg: location.lat,
    approximate_geography: geographyForCell(edge.cell_a),
    reason: 'RASTER_MICRO_GAP',
  };
}).sort((a, b) => a.component_a - b.component_a || a.component_b - b.component_b);

function gameplayClusterForEdge(edge) {
  const { lon, lat } = midpointLocation(edge.cell_a, edge.cell_b);
  if (lat < -60) return 'Antarctica (not a gameplay micro-island cluster)';
  if (lat > 58 && lon >= -75 && lon <= -10) return 'Greenland coastal micro-islands';
  if (lat > 60 && lon < -55) return 'Canadian Arctic archipelago';
  if (lat > 66) return 'High Arctic coastal archipelago';
  if (lat >= 30 && lat <= 50 && lon >= 128 && lon <= 150) return 'Japan local island group';
  if (lat >= 4 && lat <= 22 && lon >= 116 && lon <= 128) return 'Philippine local archipelago';
  if (lat >= -12 && lat <= 8 && lon >= 94 && lon <= 155) return 'Maritime Southeast Asia local archipelago';
  if (lat >= 30 && lat <= 47 && lon >= -10 && lon <= 42) return 'Mediterranean coastal micro-islands';
  if (lat >= 45 && lat <= 62 && lon >= -170 && lon <= -50) return 'North American coastal micro-islands';
  if (lat >= -55 && lat <= -25 && lon >= 160 && lon <= 180) return 'New Zealand local island group';
  return 'local coastal micro-island group';
}

// Gameplay simplification rule: close small islands can share a land topology
// so a country does not need meaningless one-cell amphibious orders.  The
// water remains water visually and in the ownership grid.  No candidate may
// join two strategic anchors (major landmasses/major islands); the explicit
// separator constraints were already applied during the high-res flood.
const parent = Int32Array.from({ length: componentCount }, (_, i) => i);
const rootHasStrategicAnchor = componentSizes.map(size => size >= STRATEGIC_ANCHOR_MIN_CELLS);
function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
function unite(a, b) {
  a = find(a); b = find(b);
  if (a === b) return;
  parent[b] = a;
  rootHasStrategicAnchor[a] ||= rootHasStrategicAnchor[b];
}

const acceptedEdges = [];
const policyRejectedCandidates = [];
for (const edge of [...highResCandidates].sort((a, b) =>
  a.min_highres_separation_km - b.min_highres_separation_km ||
  a.component_a - b.component_a || a.component_b - b.component_b
)) {
  const cluster = gameplayClusterForEdge(edge);
  let reason = null;
  if (edge.min_highres_separation_km > MAX_TOPOLOGY_GAP_KM) {
    reason = 'EXCEEDS_LOCAL_MICRO_GAP_DISTANCE_LIMIT';
  } else if (cluster.startsWith('Antarctica')) {
    // Antarctica is deliberately classified as a major unseeded landmass,
    // not a set of micro-islands to smooth over.
    reason = 'UNPLAYABLE_MAJOR_LANDMASS_NOT_MICRO_MERGED';
  } else {
    const rootA = find(edge.component_a);
    const rootB = find(edge.component_b);
    if (rootA !== rootB && rootHasStrategicAnchor[rootA] && rootHasStrategicAnchor[rootB]) {
      reason = 'PRESERVES_STRATEGIC_ANCHOR_SEPARATION';
    }
  }
  if (reason) {
    policyRejectedCandidates.push({ ...edge, geographic_cluster: cluster, reason });
  } else {
    const accepted = {
      ...edge,
      geographic_cluster: cluster,
      reason: 'RASTER_MICRO_GAP',
    };
    acceptedEdges.push(accepted);
    unite(edge.component_a, edge.component_b);
  }
}

// Nearby authority-component pairs that did not gain an edge are evidence
// that real water remains a barrier. This is intentionally a bounded local
// search (two authority cells), not a generic proximity connector.
const closePairs = new Map();
for (let cell = 0; cell < component.length; cell++) {
  const aComp = component[cell];
  if (aComp < 0) continue;
  const x = cell % AUTH_W, y = Math.floor(cell / AUTH_W);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (dx === 0 && dy === 0) continue;
    const ny = y + dy;
    if (ny < 0 || ny >= AUTH_H) continue;
    const nx = (x + dx + AUTH_W) % AUTH_W;
    const other = authIndex(nx, ny), bComp = component[other];
    if (bComp < 0 || bComp === aComp) continue;
    const [low, high, lowCell, highCell] = aComp < bComp ? [aComp, bComp, cell, other] : [bComp, aComp, other, cell];
    const key = `${low}:${high}`;
    const km = haversineKm(lonLatForAuthority(lowCell), lonLatForAuthority(highCell));
    const prior = closePairs.get(key);
    if (!prior || km < prior.minimum_authority_cell_km) {
      closePairs.set(key, { component_a: low, component_b: high, cell_a: lowCell, cell_b: highCell, minimum_authority_cell_km: km });
    }
  }
}
const acceptedKeys = new Set(acceptedEdges.map(edge => `${edge.component_a}:${edge.component_b}`));
const policyRejectedByKey = new Map(policyRejectedCandidates.map(edge => [`${edge.component_a}:${edge.component_b}`, edge]));
const rejected = [...closePairs.entries()]
  .filter(([key]) => !acceptedKeys.has(key))
  .map(([, pair]) => {
    const policyRejectedCandidate = policyRejectedByKey.get(`${pair.component_a}:${pair.component_b}`);
    const strait = nearestSeparatorName(pair.cell_a, pair.cell_b);
    const location = midpointLocation(pair.cell_a, pair.cell_b);
    return {
      ...pair,
      location_lon_deg: location.lon,
      location_lat_deg: location.lat,
      approximate_geography: geographyForCell(pair.cell_a),
      reason: policyRejectedCandidate
        ? policyRejectedCandidate.reason
        : (strait ? `EXPLICIT_REAL_STRAIT:${strait.id}` : 'HIGH_RES_WATER_BARRIER'),
      rejected_strait_name: strait ? strait.name : null,
    };
  })
  .sort((a, b) => a.component_a - b.component_a || a.component_b - b.component_b);

const collapsedCount = new Set(Array.from({ length: componentCount }, (_, id) => find(id))).size;
const protectedClosePairs = rejected.filter(pair => pair.reason.startsWith('EXPLICIT_REAL_STRAIT:'));
const protectedWaterBarriers = constraints.map(constraint => ({
  id: constraint.id,
  name: constraint.name,
  rejected_close_pairs: protectedClosePairs.filter(pair => pair.reason === `EXPLICIT_REAL_STRAIT:${constraint.id}`).length,
  enforced: true,
}));

const artifact = {
  schema_version: 1,
  authority_grid: { width: AUTH_W, height: AUTH_H },
  visual_mask: { width: VIS_W, height: VIS_H, threshold: VISUAL_LAND_THRESHOLD },
  authority_grid_sha256: authoritySha256,
  authority_grid_fnv1a32: authorityFnv1a32,
  rules: {
    max_highres_land_path_steps: MAX_BRIDGE_STEPS,
    max_topology_gap_km: MAX_TOPOLOGY_GAP_KM,
    strategic_anchor_min_cells: STRATEGIC_ANCHOR_MIN_CELLS,
    highres_land_required: true,
    real_strait_constraints_required: true,
    small_local_archipelago_only: true,
    strategic_anchor_chains_forbidden: true,
    ownership_or_visual_bridge_created: false,
  },
  baseline_components: componentCount,
  components_after_micro_gap_pass: collapsedCount,
  collapsed_components: componentCount - collapsedCount,
  accepted_edges: acceptedEdges,
  policy_rejected_highres_contacts: policyRejectedCandidates,
  rejected_close_pairs: rejected,
  protected_close_pairs: protectedClosePairs,
  protected_water_barriers: protectedWaterBarriers,
  separator_cut_counts: Object.fromEntries([...separatorCuts.entries()].sort()),
};

const outputDir = path.join(ROOT, 'server', 'artifacts', 'geography');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'micro_gap_topology_audit.json'), JSON.stringify(artifact, null, 2));
const runtimeAdjacency = {
  schema_version: 1,
  authority_grid_sha256: authoritySha256,
  authority_grid_fnv1a32: authorityFnv1a32,
  policy: {
    opaque_visual_land_threshold: VISUAL_LAND_THRESHOLD,
    max_highres_land_path_steps: MAX_BRIDGE_STEPS,
    max_topology_gap_km: MAX_TOPOLOGY_GAP_KM,
    strategic_anchor_min_cells: STRATEGIC_ANCHOR_MIN_CELLS,
  },
  edges: acceptedEdges.map(edge => ({ cell_a: edge.cell_a, cell_b: edge.cell_b })),
};
const runtimeAdjacencyJson = JSON.stringify(runtimeAdjacency, null, 2);
fs.writeFileSync(path.join(ROOT, 'server', 'assets', 'world_micro_gap_adjacency_v1.json'), runtimeAdjacencyJson);
// The resolver needs the exact same canonical adjacency to preview an action
// the server may execute. This is a generated mirror, not renderer-owned
// topology; the audit writes both from one source of truth.
fs.writeFileSync(path.join(ROOT, 'client', 'src', 'assets', 'world_micro_gap_adjacency_v1.json'), runtimeAdjacencyJson);
let markdown = '# Canonical micro-gap topology audit\n\n';
markdown += `Baseline authority components: ${componentCount}. After constrained micro-gap pass: ${collapsedCount}. Collapsed: ${componentCount - collapsedCount}.\n\n`;
markdown += `Accepted local archipelago micro-gaps: ${acceptedEdges.length}; policy-rejected high-resolution contacts: ${policyRejectedCandidates.length}; rejected close pairs: ${rejected.length}.\n\n`;
markdown += '## Accepted raster micro-gaps\n\n| A | B | cells | high-res separation km | location | geography | reason |\n|---:|---:|---|---:|---|---|---|\n';
for (const edge of acceptedEdges) markdown += `| ${edge.component_a} | ${edge.component_b} | ${edge.cell_a} ↔ ${edge.cell_b} | ${edge.min_highres_separation_km.toFixed(2)} | ${edge.location_lon_deg.toFixed(2)}°, ${edge.location_lat_deg.toFixed(2)}° | ${edge.geographic_cluster} | RASTER MICRO-GAP |\n`;
markdown += '\n## Policy-rejected high-resolution contacts\n\n| A | B | cells | high-res separation km | location | cluster | reason |\n|---:|---:|---|---:|---|---|---|\n';
for (const edge of policyRejectedCandidates) markdown += `| ${edge.component_a} | ${edge.component_b} | ${edge.cell_a} ↔ ${edge.cell_b} | ${edge.min_highres_separation_km.toFixed(2)} | ${edge.location_lon_deg.toFixed(2)}°, ${edge.location_lat_deg.toFixed(2)}° | ${edge.geographic_cluster} | ${edge.reason} |\n`;
markdown += '\n## Rejected close pairs\n\n| A | B | cells | min authority km | location | geography | reason |\n|---:|---:|---|---:|---|---|---|\n';
for (const pair of rejected) markdown += `| ${pair.component_a} | ${pair.component_b} | ${pair.cell_a} ↔ ${pair.cell_b} | ${pair.minimum_authority_cell_km.toFixed(2)} | ${pair.location_lon_deg.toFixed(2)}°, ${pair.location_lat_deg.toFixed(2)}° | ${pair.approximate_geography} | ${pair.reason} |\n`;
markdown += '\n## Protected strategic crossings\n\n| A | B | cells | location | protected by |\n|---:|---:|---|---|---|\n';
for (const pair of protectedClosePairs) markdown += `| ${pair.component_a} | ${pair.component_b} | ${pair.cell_a} ↔ ${pair.cell_b} | ${pair.location_lon_deg.toFixed(2)}°, ${pair.location_lat_deg.toFixed(2)}° | ${pair.reason} |\n`;
markdown += '\n## Enforced water barriers\n\n| barrier | close pairs rejected in this raster | enforced |\n|---|---:|---|\n';
for (const barrier of protectedWaterBarriers) markdown += `| ${barrier.name} | ${barrier.rejected_close_pairs} | yes |\n`;
markdown += '\nNo ownership cells, renderer pixels, or visual bridges were written by this pass.\n';
fs.writeFileSync(path.join(outputDir, 'micro_gap_topology_report.md'), markdown);
console.log(JSON.stringify({
  baseline: componentCount,
  after: collapsedCount,
  accepted: acceptedEdges.length,
  policyRejectedHighResContacts: policyRejectedCandidates.length,
  rejected: rejected.length,
  protectedStrategicCrossings: protectedClosePairs.length,
}, null, 2));
