import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const metadataPath = process.argv[2];
const outputDir = process.argv[3] || path.dirname(metadataPath || '');
if (!metadataPath) {
    throw new Error('Usage: node tools/analyze_focus_entry_edge.mjs <evidence.json> [output-dir]');
}

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
fs.mkdirSync(outputDir, { recursive: true });

const readPng = filePath => new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
        .pipe(new PNG())
        .on('parsed', function() { resolve(this); })
        .on('error', reject);
});

const clonePng = source => {
    const clone = new PNG({ width: source.width, height: source.height });
    source.data.copy(clone.data);
    return clone;
};

const writePng = (png, filePath) => new Promise((resolve, reject) => {
    png.pack().pipe(fs.createWriteStream(filePath)).on('finish', resolve).on('error', reject);
});

const blend = (png, x, y, color, alpha = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const i = (y * png.width + x) * 4;
    png.data[i] = Math.round(png.data[i] * (1 - alpha) + color[0] * alpha);
    png.data[i + 1] = Math.round(png.data[i + 1] * (1 - alpha) + color[1] * alpha);
    png.data[i + 2] = Math.round(png.data[i + 2] * (1 - alpha) + color[2] * alpha);
    png.data[i + 3] = 255;
};

const line = (png, x0, y0, x1, y1, color, width = 2) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        for (let oy = -Math.floor(width / 2); oy <= Math.ceil(width / 2); oy++) {
            for (let ox = -Math.floor(width / 2); ox <= Math.ceil(width / 2); ox++) {
                blend(png, x + ox, y + oy, color, 1);
            }
        }
    }
};

const redScore = (png, index) => png.data[index] - (png.data[index + 1] + png.data[index + 2]) * 0.35;
const isRed = (png, x, y) => {
    const i = (y * png.width + x) * 4;
    return png.data[i] > 80 && redScore(png, i) > 35;
};

const frames = metadata.visibleScreencast?.frames || [];
if (!frames.length) throw new Error('visible screencast frames are missing');
const sourceFrame = await readPng(frames[0].path);
const width = sourceFrame.width;
const height = sourceFrame.height;

const camera = metadata.cameraAfterZoom;
const widthCells = 1024;
const cellPoint = cell => ({
    x: camera.x + ((cell % widthCells) + 0.5) * camera.scaleX,
    y: camera.y + (Math.floor(cell / widthCells) + 0.5) * camera.scaleY,
});
const cellCorners = cell => {
    const x = cell % widthCells;
    const y = Math.floor(cell / widthCells);
    return {
        nw: { x: camera.x + x * camera.scaleX, y: camera.y + y * camera.scaleY },
        ne: { x: camera.x + (x + 1) * camera.scaleX, y: camera.y + y * camera.scaleY },
        sw: { x: camera.x + x * camera.scaleX, y: camera.y + (y + 1) * camera.scaleY },
        se: { x: camera.x + (x + 1) * camera.scaleX, y: camera.y + (y + 1) * camera.scaleY },
    };
};

const anchorCell = Number(metadata.target.sourceCell);
const targetCell = Number(metadata.target.cell);
const anchor = cellPoint(anchorCell);
const target = cellPoint(targetCell);
const direction = {
    x: Number(metadata.target.directionX || 0),
    y: Number(metadata.target.directionY || 0),
};
const anchorCorners = cellCorners(anchorCell);
const targetCorners = cellCorners(targetCell);
const firstAuthority = metadata.focusDiagnostic?.authority?.find(event =>
    (event.cells || []).some(cell => Number(cell.newOwner) === Number(metadata.finalState?.yourFactionId || 101)));
const firstChange = firstAuthority?.cells?.find(cell =>
    Number(cell.newOwner) === Number(metadata.finalState?.yourFactionId || 101));
const parentCell = Number(metadata.presentationTimeline?.[0]?.predecessorEdges?.[0]?.parentCell ?? anchorCell);
const edgeName = metadata.presentationTimeline?.[0]?.predecessorEdges?.[0]?.entryEdge || null;
const parentCorners = cellCorners(parentCell);

const entryPointByEdge = {
    WEST: targetCorners.nw,
    EAST: targetCorners.ne,
    NORTH: targetCorners.nw,
    SOUTH: targetCorners.sw,
    NORTH_WEST: targetCorners.nw,
    NORTH_EAST: targetCorners.ne,
    SOUTH_WEST: targetCorners.sw,
    SOUTH_EAST: targetCorners.se,
};
const entryPoint = entryPointByEdge[edgeName] || target;
const oppositePoint = {
    x: targetCorners.nw.x + targetCorners.se.x - entryPoint.x,
    y: targetCorners.nw.y + targetCorners.se.y - entryPoint.y,
};

const baseline = sourceFrame;
const localLeft = Math.max(0, Math.floor(Math.min(anchor.x, target.x) - 100));
const localRight = Math.min(width - 1, Math.ceil(Math.max(anchor.x, target.x) + 100));
const localTop = Math.max(0, Math.floor(Math.min(anchor.y, target.y) - 100));
const localBottom = Math.min(height - 1, Math.ceil(Math.max(anchor.y, target.y) + 100));
const baselineRed = [];
for (let y = localTop; y <= localBottom; y++) {
    for (let x = localLeft; x <= localRight; x++) if (isRed(baseline, x, y)) baselineRed.push({ x, y });
}

const targetBounds = {
    left: camera.x + (targetCell % widthCells) * camera.scaleX,
    top: camera.y + Math.floor(targetCell / widthCells) * camera.scaleY,
    right: camera.x + ((targetCell % widthCells) + 1) * camera.scaleX,
    bottom: camera.y + (Math.floor(targetCell / widthCells) + 1) * camera.scaleY,
};

function targetCellComponents(png) {
    const left = Math.max(0, Math.floor(targetBounds.left - 2));
    const top = Math.max(0, Math.floor(targetBounds.top - 2));
    const right = Math.min(width - 1, Math.ceil(targetBounds.right + 2));
    const bottom = Math.min(height - 1, Math.ceil(targetBounds.bottom + 2));
    const mask = new Uint8Array(width * height);
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const i = (y * width + x) * 4;
        const changedRed = redScore(png, i) - redScore(baseline, i) > 24;
        const politicalRed = png.data[i] > 140 && png.data[i + 1] < 140 && png.data[i + 2] < 110;
        mask[y * width + x] = changedRed && politicalRed ? 1 : 0;
    }
    const components = [];
    const queue = [];
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const start = y * width + x;
        if (!mask[start]) continue;
        mask[start] = 0;
        queue.push(start);
        const pixels = [];
        while (queue.length) {
            const current = queue.pop();
            const cy = Math.floor(current / width);
            const cx = current - cy * width;
            pixels.push({ x: cx, y: cy });
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < left || nx > right || ny < top || ny > bottom) continue;
                const ni = ny * width + nx;
                if (mask[ni]) { mask[ni] = 0; queue.push(ni); }
            }
        }
        components.push(pixels);
    }
    const nearest = (pixels, point) => pixels.length
        ? Math.min(...pixels.map(pixel => Math.hypot(pixel.x - point.x, pixel.y - point.y)))
        : null;
    return components.map(pixels => ({
        pixels: pixels.length,
        minDistanceToSharedEntryPx: nearest(pixels, entryPoint),
        minDistanceToFarTargetEdgePx: nearest(pixels, oppositePoint),
    })).sort((a, b) => b.pixels - a.pixels);
}

const operationOffset = Number(metadata.operationTransitionStart) - Number(metadata.recordInfo.performanceNow);
const frameAt = relativeMS => frames.reduce((best, frame) => {
    const current = Number(frame.receivedAt) - Number(metadata.visibleScreencast.startedAt) - operationOffset;
    const bestMS = Number(best.receivedAt) - Number(metadata.visibleScreencast.startedAt) - operationOffset;
    return Math.abs(current - relativeMS) < Math.abs(bestMS - relativeMS) ? frame : best;
}, frames[0]);

const componentsFor = (png, reference = baseline) => {
    const mask = new Uint8Array(width * height);
    for (let y = localTop; y <= localBottom; y++) for (let x = localLeft; x <= localRight; x++) {
        const i = (y * width + x) * 4;
        const changedRed = redScore(png, i) - redScore(reference, i) > 24;
        const politicalRed = png.data[i] > 140 && png.data[i + 1] < 140 && png.data[i + 2] < 110;
        mask[y * width + x] = changedRed && politicalRed ? 1 : 0;
    }
    const components = [];
    const queue = [];
    for (let y = localTop; y <= localBottom; y++) for (let x = localLeft; x <= localRight; x++) {
        const start = y * width + x;
        if (!mask[start]) continue;
        mask[start] = 0;
        queue.push(start);
        const pixels = [];
        while (queue.length) {
            const current = queue.pop();
            const cy = Math.floor(current / width);
            const cx = current - cy * width;
            pixels.push({ x: cx, y: cy });
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < localLeft || nx > localRight || ny < localTop || ny > localBottom) continue;
                const ni = ny * width + nx;
                if (mask[ni]) { mask[ni] = 0; queue.push(ni); }
            }
        }
        components.push(pixels);
    }
    const nearest = (pixels, points) => {
        let min = Number.POSITIVE_INFINITY;
        for (const pixel of pixels) for (const point of points) {
            min = Math.min(min, Math.hypot(pixel.x - point.x, pixel.y - point.y));
        }
        return Number.isFinite(min) ? min : null;
    };
    const baselineDistance = pixels => nearest(pixels, baselineRed);
    const sourceDistance = pixels => nearest(pixels, [entryPoint]);
    const targetDistance = pixels => nearest(pixels, [oppositePoint]);
    return components.map(pixels => ({
        pixels: pixels.length,
        minDistanceToBaselineSovereignPx: baselineDistance(pixels),
        minDistanceToSourceEntryPx: sourceDistance(pixels),
        minDistanceToFarTargetEdgePx: targetDistance(pixels),
        detached: baselineDistance(pixels) > 3,
    })).sort((a, b) => b.pixels - a.pixels);
};

const sampleMS = [0, 100, 200, 300, 400, 500, 750, 1000];
const samples = [];
const images = [];
for (const relativeMS of sampleMS) {
    const frame = frameAt(relativeMS);
    const png = await readPng(frame.path);
    const components = componentsFor(png);
    const targetComponents = targetCellComponents(png);
    const targetRedPixels = targetComponents.reduce((sum, component) => sum + component.pixels, 0);
    const targetConnectedPixels = targetComponents
        .filter(component => component.minDistanceToSharedEntryPx <= 4)
        .reduce((sum, component) => sum + component.pixels, 0);
    const visibleFrameMS = Number(frame.receivedAt) - Number(metadata.visibleScreencast.startedAt) - operationOffset;
    const overlay = clonePng(png);
    line(overlay, anchor.x, anchor.y, target.x, target.y, [0, 255, 255], 3);
    line(overlay, entryPoint.x, entryPoint.y, oppositePoint.x, oppositePoint.y, [255, 255, 0], 2);
    blend(overlay, entryPoint.x, entryPoint.y, [0, 255, 0], 1);
    blend(overlay, oppositePoint.x, oppositePoint.y, [255, 0, 255], 1);
    const outputPath = path.join(outputDir, `focus_entry_${String(relativeMS).padStart(4, '0')}ms.png`);
    await writePng(overlay, outputPath);
    images.push({ png: overlay, relativeMS });
    samples.push({
        requestedMS: relativeMS,
        actualFrameMS: Number(visibleFrameMS.toFixed(2)),
        frame: frame.index,
        components,
        targetCellRedPixels: targetRedPixels,
        targetCellComponents: targetComponents,
        targetCellConnectedPixels: targetConnectedPixels,
        targetCellDetachedPixels: targetRedPixels - targetConnectedPixels,
        detachedFactionPixels: components.filter(component => component.detached)
            .reduce((sum, component) => sum + component.pixels, 0),
    });
}

const columns = 4;
const rows = Math.ceil(images.length / columns);
const gap = 8;
const sheet = new PNG({ width: width * columns + gap * (columns - 1), height: height * rows + gap * (rows - 1) });
sheet.data.fill(0);
for (let index = 0; index < images.length; index++) {
    const image = images[index].png;
    const ox = (index % columns) * (width + gap);
    const oy = Math.floor(index / columns) * (height + gap);
    for (let y = 0; y < height; y++) {
        const sourceStart = y * width * 4;
        const targetStart = ((oy + y) * sheet.width + ox) * 4;
        image.data.copy(sheet.data, targetStart, sourceStart, sourceStart + width * 4);
    }
}
const contactSheet = path.join(outputDir, 'focus_entry_source_to_target_contact_sheet.png');
await writePng(sheet, contactSheet);

const report = {
    scenario: 'real browser HUN SOUTHWEST FOCUS',
    metadata: metadataPath,
    anchorCell,
    targetCell,
    parentCell,
    firstAuthorizedChange: firstChange || null,
    entryEdge: edgeName,
    commandDirection: direction,
    anchorScreen: anchor,
    targetScreen: target,
    sharedEntryBoundary: entryPoint,
    farTargetEdgePoint: oppositePoint,
    baselineSovereignPixels: baselineRed.length,
    samples,
    contactSheet,
};
const reportPath = path.join(outputDir, 'focus_entry_edge_analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
    reportPath,
    contactSheet,
    anchorCell,
    targetCell,
    parentCell,
    entryEdge: edgeName,
    sharedEntryBoundary: entryPoint,
    farTargetEdgePoint: oppositePoint,
    samples: samples.map(sample => ({
        requestedMS: sample.requestedMS,
        frame: sample.frame,
        largestComponent: sample.components[0]?.pixels || 0,
        detachedFactionPixels: sample.detachedFactionPixels,
    })),
}, null, 2));
