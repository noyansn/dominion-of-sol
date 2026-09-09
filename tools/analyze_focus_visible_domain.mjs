import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../client/node_modules/pngjs');

const metadataPath = process.argv[2];
const outputDir = process.argv[3] || path.dirname(metadataPath || '');
if (!metadataPath) throw new Error('Usage: node tools/analyze_focus_visible_domain.mjs <evidence.json> [output-dir]');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
fs.mkdirSync(outputDir, { recursive: true });

const readPng = filePath => new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(new PNG()).on('parsed', function () {
        resolve(this);
    }).on('error', reject);
});

const frames = metadata.visibleScreencast?.frames || [];
if (!frames.length) throw new Error('No visible screencast frames in metadata');
const images = new Map();
for (const frame of frames) images.set(frame.index, await readPng(frame.path));

const baseline = images.get(frames[0].index);
const width = baseline.width;
const height = baseline.height;
const camera = metadata.cameraAfterZoom;
const gridWidth = 1024;
const gridHeight = 512;
const ownerId = Number(metadata.finalState?.yourFactionId || 101);
const operationOffset = Number(metadata.operationTransitionStart) - Number(metadata.recordInfo.performanceNow);
const frameRelativeMS = frame => Number(frame.receivedAt) - Number(metadata.visibleScreencast.startedAt) - operationOffset;
const cellOfScreen = (x, y) => {
    const worldX = (x - Number(camera.x)) / Number(camera.scaleX);
    const worldY = (y - Number(camera.y)) / Number(camera.scaleY);
    const cellX = Math.floor(worldX);
    const cellY = Math.floor(worldY);
    if (cellX < 0 || cellX >= gridWidth || cellY < 0 || cellY >= gridHeight) return -1;
    return cellY * gridWidth + cellX;
};
const cellBounds = cell => {
    const x = cell % gridWidth;
    const y = Math.floor(cell / gridWidth);
    return {
        left: Number(camera.x) + x * Number(camera.scaleX),
        top: Number(camera.y) + y * Number(camera.scaleY),
        right: Number(camera.x) + (x + 1) * Number(camera.scaleX),
        bottom: Number(camera.y) + (y + 1) * Number(camera.scaleY),
    };
};

const redScore = (png, index) => png.data[index] - (png.data[index + 1] + png.data[index + 2]) * 0.35;
const baselinePoliticalRed = (png, index) =>
    redScore(png, index) > 35 && png.data[index] > png.data[index + 1] * 1.35;
const changedPoliticalRed = (png, index) =>
    !baselinePoliticalRed(baseline, index) &&
    redScore(png, index) - redScore(baseline, index) > 8 &&
    png.data[index] > 90 &&
    png.data[index] - png.data[index + 1] > 20 &&
    png.data[index] > png.data[index + 1] * 1.25 &&
    png.data[index] > png.data[index + 2] * 1.25;
const darkPoliticalEdge = (png, index) =>
    png.data[index] >= 18 &&
    png.data[index] > png.data[index + 1] * 1.18 &&
    png.data[index] > png.data[index + 2] * 1.05 &&
    png.data[index + 1] < 90 &&
    png.data[index + 2] < 85;
const changedPoliticalEdge = (png, index) => darkPoliticalEdge(png, index) && !darkPoliticalEdge(baseline, index);

const authorizationEvents = [];
const authorizationTimeByCell = new Map();
for (const event of metadata.focusDiagnostic?.authority || []) {
    const cells = (event.cells || []).filter(change => Number(change.newOwner) === ownerId);
    if (!cells.length) continue;
    const relativeMS = Number(event.performanceNow) - Number(metadata.operationTransitionStart);
    authorizationEvents.push({
        revision: Number(event.ownershipRevision ?? event.sequence),
        relativeMS,
        cells: cells.map(change => ({
            cell: Number(change.cell),
            oldOwner: Number(change.oldOwner),
            newOwner: Number(change.newOwner),
        })),
    });
    for (const change of cells) {
        if (!authorizationTimeByCell.has(Number(change.cell))) authorizationTimeByCell.set(Number(change.cell), relativeMS);
    }
}

const sourceCell = Number(metadata.target?.sourceCell);
const targetCell = Number(metadata.target?.cell);
const allAuthorizedCells = [...authorizationTimeByCell.keys()];
const allCells = [sourceCell, ...allAuthorizedCells].filter(Number.isFinite);
const bounds = allCells.map(cellBounds);
const localLeft = Math.max(0, Math.floor(Math.min(...bounds.map(b => b.left)) - 8));
const localTop = Math.max(0, Math.floor(Math.min(...bounds.map(b => b.top)) - 8));
const localRight = Math.min(width - 1, Math.ceil(Math.max(...bounds.map(b => b.right)) + 8));
const localBottom = Math.min(height - 1, Math.ceil(Math.max(...bounds.map(b => b.bottom)) + 8));

// The command marker/selection pass can recolor the already-owned source
// country between the first and later screencast frames. Those pixels are old
// sovereign territory, not newly revealed operation pixels. Identify such
// baseline-owned grid cells once and exclude them from the new-domain count.
const baselineOwnedCells = new Set();
const baselineRedCountByCell = new Map();
for (let y = localTop; y <= localBottom; y++) for (let x = localLeft; x <= localRight; x++) {
    const pixel = (y * width + x) * 4;
    if (!baselinePoliticalRed(baseline, pixel)) continue;
    const cell = cellOfScreen(x + 0.5, y + 0.5);
    if (cell >= 0) baselineRedCountByCell.set(cell, (baselineRedCountByCell.get(cell) ?? 0) + 1);
}
for (const [cell, count] of baselineRedCountByCell) {
    // A pointer marker may tint a handful of neutral pixels red. An old
    // sovereign cell occupies a substantial part of its projected 30x30
    // square, so use an area threshold instead of one-pixel classification.
    if (count >= 80) baselineOwnedCells.add(cell);
}

const currentlyAuthorized = relativeMS => new Set(
    allAuthorizedCells.filter(cell => (authorizationTimeByCell.get(cell) ?? Infinity) <= relativeMS + 1),
);

function auditFrame(frame, image, relativeMS) {
    const authorized = currentlyAuthorized(relativeMS);
    let visibleRedPixels = 0;
    let insideAuthorized = 0;
    let outsideAuthorized = 0;
    const outsidePoints = [];
    for (let y = localTop; y <= localBottom; y++) for (let x = localLeft; x <= localRight; x++) {
        const pixel = (y * width + x) * 4;
        // Domain audit is intentionally stricter than the connectivity audit:
        // count only faction-red pixels, not the dark/cyan command marker or
        // the neutral political contour.
        if (!changedPoliticalRed(image, pixel)) continue;
        visibleRedPixels++;
        const cell = cellOfScreen(x + 0.5, y + 0.5);
        if (baselineOwnedCells.has(cell)) continue;
        if (authorized.has(cell)) insideAuthorized++;
        else {
            outsideAuthorized++;
            if (outsidePoints.length < 4096) outsidePoints.push({ x, y, cell });
        }
    }
    return {
        frame: frame.index,
        relativeMS: Number(relativeMS.toFixed(2)),
        authorizedCells: [...authorized],
        visibleRedPixels,
        visibleRedPixelsInsideAuthorized: insideAuthorized,
        visibleRedPixelsOutsideAuthorized: outsideAuthorized,
        outsidePoints,
    };
}

function drawOverlay(image, audit, label) {
    const output = new PNG({ width, height });
    output.data.set(image.data);
    const put = (x, y, r, g, b, a = 255) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const p = (y * width + x) * 4;
        output.data[p] = r; output.data[p + 1] = g; output.data[p + 2] = b; output.data[p + 3] = a;
    };
    const line = (x0, y0, x1, y1, color) => {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            put(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ...color);
        }
    };
    for (const cell of audit.authorizedCells) {
        const b = cellBounds(cell);
        for (let x = Math.floor(b.left); x <= Math.ceil(b.right); x++) {
            put(x, Math.floor(b.top), 255, 220, 0);
            put(x, Math.ceil(b.bottom), 255, 220, 0);
        }
        for (let y = Math.floor(b.top); y <= Math.ceil(b.bottom); y++) {
            put(Math.floor(b.left), y, 255, 220, 0);
            put(Math.ceil(b.right), y, 255, 220, 0);
        }
    }
    if (Number.isFinite(sourceCell) && Number.isFinite(targetCell)) {
        const source = cellBounds(sourceCell);
        const target = cellBounds(targetCell);
        const sx = (source.left + source.right) / 2;
        const sy = (source.top + source.bottom) / 2;
        const tx = (target.left + target.right) / 2;
        const ty = (target.top + target.bottom) / 2;
        line(sx, sy, tx, ty, [0, 240, 255, 255]);
        put(Math.round(sx), Math.round(sy), 0, 240, 255);
        put(Math.round(tx), Math.round(ty), 255, 255, 255);
    }
    for (const point of audit.outsidePoints) {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) put(point.x + ox, point.y + oy, 255, 0, 220);
    }
    const outputPath = path.join(outputDir, `focus_domain_${label}.png`);
    fs.writeFileSync(outputPath, PNG.sync.write(output));
    return outputPath;
}

const auditRows = frames.map(frame => {
    const image = images.get(frame.index);
    return auditFrame(frame, image, frameRelativeMS(frame));
});
const selected = [];
const used = new Set();
for (const event of authorizationEvents.slice(0, 4)) {
    const frame = frames
        .filter(candidate => frameRelativeMS(candidate) >= event.relativeMS)
        .sort((a, b) => Math.abs(frameRelativeMS(a) - event.relativeMS) - Math.abs(frameRelativeMS(b) - event.relativeMS))[0];
    if (!frame || used.has(frame.index)) continue;
    used.add(frame.index);
    const audit = auditRows.find(row => row.frame === frame.index);
    selected.push({ label: `revision_${event.revision}`, event, audit, overlay: drawOverlay(images.get(frame.index), audit, `revision_${event.revision}`) });
}
const settledFrame = frames[frames.length - 1];
const settledAudit = auditRows[auditRows.length - 1];
selected.push({
    label: 'settled',
    event: null,
    audit: settledAudit,
    overlay: drawOverlay(images.get(settledFrame.index), settledAudit, 'settled'),
});

const overlayImages = selected.map(item => PNG.sync.read(fs.readFileSync(item.overlay)));
const columns = 5;
const thumbWidth = Math.max(1, Math.floor(width / 2));
const thumbHeight = Math.max(1, Math.floor(height / 2));
const gap = 8;
const contactSheet = new PNG({
    width: columns * thumbWidth + (columns + 1) * gap,
    height: thumbHeight + 2 * gap,
});
contactSheet.data.fill(18);
for (let n = 0; n < overlayImages.length; n++) {
    const image = overlayImages[n];
    const x0 = gap + n * (thumbWidth + gap);
    const y0 = gap;
    for (let y = 0; y < thumbHeight; y++) for (let x = 0; x < thumbWidth; x++) {
        const sx = Math.min(image.width - 1, Math.floor(x * image.width / thumbWidth));
        const sy = Math.min(image.height - 1, Math.floor(y * image.height / thumbHeight));
        const sp = (sy * image.width + sx) * 4;
        const dp = ((y0 + y) * contactSheet.width + x0 + x) * 4;
        contactSheet.data[dp] = image.data[sp];
        contactSheet.data[dp + 1] = image.data[sp + 1];
        contactSheet.data[dp + 2] = image.data[sp + 2];
        contactSheet.data[dp + 3] = 255;
    }
}
const contactSheetPath = path.join(outputDir, 'focus_visible_domain_revision_contact_sheet.png');
fs.writeFileSync(contactSheetPath, PNG.sync.write(contactSheet));

const probe = metadata.compositingProbe?.activeTransition || {};
const meshPosition = metadata.compositingProbe?.transitionMeshPosition || {};
const samplesPerCell = 12;
const fieldOrigin = {
    x: Number(meshPosition.x),
    y: Number(meshPosition.y),
};
const coordinateAudit = {
    fieldOrigin,
    fieldWidth: Number(probe.fieldWidth),
    fieldHeight: Number(probe.fieldHeight),
    samplesPerCell,
    masks: {
        authorized: { origin: fieldOrigin, width: Number(probe.fieldWidth), height: Number(probe.fieldHeight), samplesPerCell },
        new: { origin: fieldOrigin, width: Number(probe.fieldWidth), height: Number(probe.fieldHeight), samplesPerCell },
        arrival: { origin: fieldOrigin, width: Number(probe.fieldWidth), height: Number(probe.fieldHeight), samplesPerCell },
        sdf: { origin: fieldOrigin, width: Number(probe.fieldWidth), height: Number(probe.fieldHeight), samplesPerCell },
        presentationCommitted: { origin: fieldOrigin, width: Number(probe.fieldWidth), height: Number(probe.fieldHeight), samplesPerCell },
    },
    cells: allAuthorizedCells.map(cell => {
        const worldX = cell % gridWidth;
        const worldY = Math.floor(cell / gridWidth);
        const localMinX = Math.round((worldX - fieldOrigin.x) * samplesPerCell);
        const localMinY = Math.round((worldY - fieldOrigin.y) * samplesPerCell);
        const localMaxX = localMinX + samplesPerCell;
        const localMaxY = localMinY + samplesPerCell;
        const samples = [
            [localMinX + 0.5, localMinY + 0.5],
            [localMaxX - 0.5, localMinY + 0.5],
            [localMinX + 0.5, localMaxY - 0.5],
            [localMaxX - 0.5, localMaxY - 0.5],
        ];
        const roundTrips = samples.map(([localX, localY]) => {
            const worldSampleX = fieldOrigin.x + localX / samplesPerCell;
            const worldSampleY = fieldOrigin.y + localY / samplesPerCell;
            return {
                localX,
                localY,
                worldX: worldSampleX,
                worldY: worldSampleY,
                roundTripCell: Math.floor(worldSampleY) * gridWidth + Math.floor(worldSampleX),
            };
        });
        return {
            cell,
            worldXY: { x: worldX, y: worldY },
            expectedLocalPixelBounds: { minX: localMinX, minY: localMinY, maxX: localMaxX, maxY: localMaxY },
            roundTrips,
            roundTripExact: roundTrips.every(sample => sample.roundTripCell === cell),
        };
    }),
};

const report = {
    scenario: 'real browser HUN SOUTHWEST FOCUS visible-pixel domain audit',
    metadata: metadataPath,
    method: 'changed red political pixels mapped from screen through the captured flat camera back to 1024x512 authoritative cells',
    ownerId,
    sourceCell,
    targetCell,
    camera,
    localRegion: { left: localLeft, top: localTop, right: localRight, bottom: localBottom },
    coordinateAudit,
    authorizationEvents,
    selected,
    contactSheetPath,
    allFrames: auditRows.map(({ outsidePoints, ...row }) => row),
    framesWithOutsideAuthorizedPixels: auditRows.filter(row => row.visibleRedPixelsOutsideAuthorized > 0).length,
    maxOutsideAuthorizedPixels: Math.max(0, ...auditRows.map(row => row.visibleRedPixelsOutsideAuthorized)),
};
const reportPath = path.join(outputDir, 'focus_visible_domain_audit.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
    reportPath,
    selected: selected.map(item => ({
        label: item.label,
        overlay: item.overlay,
        relativeMS: item.audit.relativeMS,
        authorizedCells: item.audit.authorizedCells,
        visibleRedPixels: item.audit.visibleRedPixels,
        insideAuthorized: item.audit.visibleRedPixelsInsideAuthorized,
        outsideAuthorized: item.audit.visibleRedPixelsOutsideAuthorized,
    })),
    framesWithOutsideAuthorizedPixels: report.framesWithOutsideAuthorizedPixels,
    maxOutsideAuthorizedPixels: report.maxOutsideAuthorizedPixels,
}, null, 2));
