import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const metadataPath = process.argv[2];
const outputDir = process.argv[3] || path.dirname(metadataPath || '');
const cameraMetadataPath = process.argv[4] || null;
if (!metadataPath) throw new Error('Usage: node tools/build_focus_direction_diagnostic_overlay.mjs <metadata.json> [output-dir] [camera-metadata.json]');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const cameraMetadata = cameraMetadataPath && fs.existsSync(cameraMetadataPath)
    ? JSON.parse(fs.readFileSync(cameraMetadataPath, 'utf8'))
    : null;
fs.mkdirSync(outputDir, { recursive: true });

const readPng = filePath => new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(new PNG()).on('parsed', function() { resolve(this); }).on('error', reject);
});

const writePng = (png, filePath) => new Promise((resolve, reject) => {
    png.pack().pipe(fs.createWriteStream(filePath)).on('finish', resolve).on('error', reject);
});

const clonePng = source => {
    const clone = new PNG({ width: source.width, height: source.height });
    source.data.copy(clone.data);
    return clone;
};

const blendPixel = (png, x, y, color, alpha = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const i = (y * png.width + x) * 4;
    const a = Math.max(0, Math.min(1, alpha));
    png.data[i] = Math.round(png.data[i] * (1 - a) + color[0] * a);
    png.data[i + 1] = Math.round(png.data[i + 1] * (1 - a) + color[1] * a);
    png.data[i + 2] = Math.round(png.data[i + 2] * (1 - a) + color[2] * a);
    png.data[i + 3] = 255;
};

const drawLine = (png, x0, y0, x1, y1, color, width = 2, alpha = 1) => {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(distance * 2));
    for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        for (let oy = -Math.floor(width / 2); oy <= Math.ceil(width / 2); oy++) {
            for (let ox = -Math.floor(width / 2); ox <= Math.ceil(width / 2); ox++) {
                blendPixel(png, x + ox, y + oy, color, alpha);
            }
        }
    }
};

const drawRect = (png, left, top, right, bottom, color, alpha = 1, fill = false, width = 2) => {
    if (fill) {
        for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
            for (let x = Math.floor(left); x <= Math.ceil(right); x++) blendPixel(png, x, y, color, alpha);
        }
    }
    drawLine(png, left, top, right, top, color, width, 1);
    drawLine(png, right, top, right, bottom, color, width, 1);
    drawLine(png, right, bottom, left, bottom, color, width, 1);
    drawLine(png, left, bottom, left, top, color, width, 1);
};

const cellXY = cell => ({ x: cell % 1024, y: Math.floor(cell / 1024) });
const camera = metadata.cameraAfterZoom || cameraMetadata?.cameraAfterZoom || {
    // v1 and v3 used the same production close-up. v3 captured this transform
    // explicitly; this fallback keeps the v1 evidence reproducible.
    x: -15915.91044613664,
    y: -3857.425497983375,
    scaleX: 30,
    scaleY: 30,
};
const toScreen = cell => {
    const { x, y } = cellXY(cell);
    return { x: camera.x + (x + 0.5) * camera.scaleX, y: camera.y + (y + 0.5) * camera.scaleY };
};

const ownerId = Number(metadata.finalState?.yourFactionId || 101);
const authorityEvents = (metadata.focusDiagnostic?.authority || [])
    .filter(event => (event.cells || []).some(cell => Number(cell.newOwner) === ownerId));
if (!authorityEvents.length) throw new Error(`No authoritative events for player ${ownerId}`);

const authorizedByRevision = [];
const authorized = new Set();
for (const event of authorityEvents) {
    for (const cell of event.cells || []) if (Number(cell.newOwner) === ownerId) authorized.add(Number(cell.cell));
    authorizedByRevision.push({
        revision: Number(event.ownershipRevision),
        performanceNow: Number(event.performanceNow),
        cells: [...authorized].sort((a, b) => a - b),
        added: (event.cells || []).filter(cell => Number(cell.newOwner) === ownerId).map(cell => Number(cell.cell)),
        clientHash: event.clientOwnerGridHash,
        clientOwnersForChangedCells: event.clientOwnersForChangedCells,
    });
}

const firstVisibleFramePath = metadata.visibleScreencast?.frames?.[0]?.path;
if (!firstVisibleFramePath) throw new Error('Visible screencast frames are missing');
const firstFrame = await readPng(firstVisibleFramePath);
const screencastStart = Number(metadata.visibleScreencast.startedAt);
const recordPerf = Number(metadata.recordInfo.performanceNow);
const operationStart = Number(metadata.operationTransitionStart);
const operationOffsetMS = operationStart - recordPerf;

const frameEntries = metadata.visibleScreencast.frames.map(frame => ({
    ...frame,
    relativeMS: Number(frame.receivedAt) - screencastStart,
    path: frame.path,
}));
const nearestFrame = targetMS => frameEntries.reduce((best, current) =>
    Math.abs(current.relativeMS - targetMS) < Math.abs(best.relativeMS - targetMS) ? current : best,
frameEntries[0]);

const beforeFrame = frameEntries[0];
const selected = [{
    label: 'before',
    frame: beforeFrame,
    revision: null,
    authorized: [],
    event: null,
}];
for (const entry of authorizedByRevision) {
    const targetMS = operationOffsetMS + (entry.performanceNow - operationStart);
    selected.push({
        label: `rev_${entry.revision}`,
        frame: nearestFrame(targetMS),
        revision: entry.revision,
        authorized: entry.cells,
        event: entry,
    });
}
const last = authorizedByRevision.at(-1);
const finalTargetMS = operationOffsetMS + (last.performanceNow - operationStart) + 900;
selected.push({
    label: 'settled',
    frame: nearestFrame(finalTargetMS),
    revision: last.revision,
    authorized: last.cells,
    event: last,
});

const anchorCell = Number(metadata.target?.sourceCell);
const targetScreen = { x: Number(metadata.target?.x), y: Number(metadata.target?.y) };
const anchorScreen = toScreen(anchorCell);
const direction = {
    x: Number(metadata.target?.directionX || 0),
    y: Number(metadata.target?.directionY || 0),
};
const commandAngle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
const presentationDirectionByRevision = [];
for (const frame of metadata.presentationTimeline || []) {
    if (!Number.isFinite(Number(frame.directionAngleDegrees))) continue;
    const revision = Number(frame.authoritativeOwnerRevision);
    if (presentationDirectionByRevision.some(item => item.revision === revision)) continue;
    presentationDirectionByRevision.push({
        revision,
        directionVector: frame.directionVector || null,
        directionAngleDegrees: Number(frame.directionAngleDegrees),
        axisScanUsed: frame.axisScanUsed === true,
    });
}

const redScore = (png, i) => Math.max(0, png.data[i] - (png.data[i + 1] + png.data[i + 2]) * 0.35);
const measureVisibleNewRed = (png, baseline) => {
    let count = 0, sumX = 0, sumY = 0;
    const minX = Math.max(0, Math.floor(anchorScreen.x - 180));
    const maxX = Math.min(png.width - 1, Math.ceil(anchorScreen.x + 180));
    const minY = Math.max(0, Math.floor(anchorScreen.y - 150));
    const maxY = Math.min(png.height - 1, Math.ceil(anchorScreen.y + 150));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const i = (y * png.width + x) * 4;
        if (redScore(png, i) - redScore(baseline, i) > 18 && png.data[i] > 90) {
            count++; sumX += x; sumY += y;
        }
    }
    if (!count) return { count: 0, centroid: null, angleDegrees: null };
    const centroid = { x: sumX / count, y: sumY / count };
    return {
        count,
        centroid,
        angleDegrees: Math.atan2(centroid.y - anchorScreen.y, centroid.x - anchorScreen.x) * 180 / Math.PI,
    };
};

const overlayResults = [];
const images = [];
for (const item of selected) {
    const source = await readPng(item.frame.path);
    const overlay = clonePng(source);
    const visible = measureVisibleNewRed(source, firstFrame);
    // Dark red = authoritative cells, yellow = authoritative outline, while
    // the actual bright red pixels already drawn by the presentation remain
    // visible underneath. Gray land / blue water are preserved from the real
    // browser surface, so this is not a synthetic map.
    for (const cell of item.authorized) {
        const point = toScreen(cell);
        const halfX = Math.max(3, camera.scaleX * 0.48);
        const halfY = Math.max(3, camera.scaleY * 0.48);
        drawRect(overlay, point.x - halfX, point.y - halfY, point.x + halfX, point.y + halfY, [80, 0, 0], 0.5, true, 2);
        drawRect(overlay, point.x - halfX, point.y - halfY, point.x + halfX, point.y + halfY, [255, 230, 0], 1, false, 2);
    }
    drawLine(overlay, anchorScreen.x, anchorScreen.y, targetScreen.x, targetScreen.y, [0, 255, 255], 3, 1);
    drawRect(overlay, targetScreen.x - 6, targetScreen.y - 6, targetScreen.x + 6, targetScreen.y + 6, [255, 255, 255], 1, false, 2);
    drawRect(overlay, anchorScreen.x - 5, anchorScreen.y - 5, anchorScreen.x + 5, anchorScreen.y + 5, [0, 255, 255], 1, false, 2);
    const outputPath = path.join(outputDir, `focus_direction_overlay_${item.label}.png`);
    await writePng(overlay, outputPath);
    images.push({ path: outputPath, png: overlay, item });
    overlayResults.push({
        label: item.label,
        revision: item.revision,
        sourceFrame: item.frame.path,
        frameRelativeMS: item.frame.relativeMS,
        serverAuthorizedCells: item.authorized,
        clientOwnerGridHash: item.event?.clientHash || null,
        clientOwnersForChangedCells: item.event?.clientOwnersForChangedCells || [],
        visibleNewRedPixelCount: visible.count,
        visibleNewRedCentroid: visible.centroid,
        // This centroid is a raw red-pixel diagnostic only; it includes the
        // pre-existing political fill and is not the presentation direction.
        visiblePresentationAngleDegrees: visible.angleDegrees,
    });
}

const columns = 3;
const rows = Math.ceil(images.length / columns);
const sheet = new PNG({ width: firstFrame.width * columns, height: firstFrame.height * rows });
sheet.data.fill(0);
for (let index = 0; index < images.length; index++) {
    const { png } = images[index];
    const ox = (index % columns) * firstFrame.width;
    const oy = Math.floor(index / columns) * firstFrame.height;
    for (let y = 0; y < png.height; y++) {
        const sourceStart = y * png.width * 4;
        const targetStart = ((oy + y) * sheet.width + ox) * 4;
        png.data.copy(sheet.data, targetStart, sourceStart, sourceStart + png.width * 4);
    }
}
const contactSheetPath = path.join(outputDir, 'focus_direction_authority_presentation_overlay_contact_sheet.png');
await writePng(sheet, contactSheetPath);

const report = {
    sourceMetadata: metadataPath,
    playerOwnerId: ownerId,
    camera,
    anchorCell,
    targetCell: Number(metadata.target?.cell),
    clickedTargetScreen: targetScreen,
    anchorScreen,
    commandDirection: direction,
    commandAngleDegrees: commandAngle,
    presentationDirectionByRevision,
    authoritativeCellsByRevision: authorizedByRevision,
    selectedFrames: overlayResults,
    contactSheet: contactSheetPath,
};
const reportPath = path.join(outputDir, 'focus_direction_diagnostic_overlay_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ contactSheetPath, reportPath, commandAngle, anchorCell, targetCell: report.targetCell, revisions: authorizedByRevision.map(entry => ({ revision: entry.revision, added: entry.added })) }, null, 2));
