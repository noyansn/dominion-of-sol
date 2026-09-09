const fs = require('fs');

const meshBuffer = fs.readFileSync('src/assets/world_land_mesh.bin');
const headerView = new DataView(meshBuffer.buffer, meshBuffer.byteOffset, 16);
const vertexCount = headerView.getUint32(8, true);

const vertexView = new Float32Array(meshBuffer.buffer, meshBuffer.byteOffset + 16);
const positions = new Float32Array(vertexCount * 2);
for (let i = 0; i < vertexCount; i++) {
    positions[i*2] = vertexView[i*4];
    positions[i*2+1] = vertexView[i*4+1];
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax, v0y = cy - ay;
    const v1x = bx - ax, v1y = by - ay;
    const v2x = px - ax, v2y = py - ay;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0) && (v >= 0) && (u + v < 1);
}

function lonLatToWorld(lon, lat) {
    let x = (lon + 180) / 360 * 1024;
    let y = (90 - lat) / 180 * 512;
    return { x, y };
}

function checkMesh(lon, lat) {
    const pt = lonLatToWorld(lon, lat);
    for (let i = 0; i < vertexCount; i += 3) {
        const ax = positions[i*2], ay = positions[i*2+1];
        const bx = positions[i*2+2], by = positions[i*2+3];
        const cx = positions[i*2+4], cy = positions[i*2+5];
        if (pointInTriangle(pt.x, pt.y, ax, ay, bx, by, cx, cy)) {
            return true;
        }
    }
    return false;
}

const points = [
    { name: 'Great Britain', lon: -2.5, lat: 54.0 },
    { name: 'Ireland', lon: -8.0, lat: 53.0 },
    { name: 'Iceland', lon: -19.0, lat: 65.0 },
    { name: 'Sardinia', lon: 9.0, lat: 40.0 },
    { name: 'Corsica', lon: 9.0, lat: 42.0 },
    { name: 'Sicily', lon: 14.0, lat: 37.5 },
    { name: 'Japan', lon: 138.0, lat: 36.0 },
    { name: 'New Zealand', lon: 174.0, lat: -41.0 }
];

for (let p of points) {
    const hasMesh = checkMesh(p.lon, p.lat);
    console.log(`${p.name} | PoliticalMesh/GeoMesh: ${hasMesh}`);
}
