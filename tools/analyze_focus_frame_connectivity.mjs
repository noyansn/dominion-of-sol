import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const metadataPath = process.argv[2];
const outputDir = process.argv[3] || path.dirname(metadataPath || '');
if (!metadataPath) throw new Error('Usage: node tools/analyze_focus_frame_connectivity.mjs <evidence.json> [output-dir]');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
fs.mkdirSync(outputDir, { recursive: true });

const readPng = filePath => new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(new PNG()).on('parsed', function () {
        resolve(this);
    }).on('error', reject);
});

const baseline = await readPng(metadata.visibleScreencast.frames[0].path);
const width = baseline.width;
const height = baseline.height;
const worldWidth = 1024;
const camera = metadata.cameraAfterZoom;
const ownerId = Number(metadata.finalState?.yourFactionId || 101);
const operationOffset = Number(metadata.operationTransitionStart) - Number(metadata.recordInfo.performanceNow);
const frameRelativeMS = frame => Number(frame.receivedAt) - Number(metadata.visibleScreencast.startedAt) - operationOffset;

// UI orange and pointer markers are present in the screencast. Newly revealed
// political pixels are detected from frame-to-baseline change. The source
// sovereign seed uses a looser red test because its normal fill is darker.
const redScore = (png, index) => png.data[index] - (png.data[index + 1] + png.data[index + 2]) * 0.35;
const changedPoliticalRed = (png, index) =>
    redScore(png, index) - redScore(baseline, index) > 8 &&
    png.data[index] > 75 &&
    png.data[index] > png.data[index + 1] * 1.10 &&
    png.data[index] > png.data[index + 2] * 1.10;
// The production political pass draws a dark antialiased owner contour over
// the fill.  A strict bright-red threshold mistakes that contour for a one-
// pixel detached gap, especially at a diagonal parent/child contact.  Count
// only a newly dark faction-colored contour inside an already-authorized cell;
// green/cyan command markers and neutral grey geography do not satisfy this
// hue test.
const darkPoliticalEdge = (png, index) =>
    png.data[index] >= 18 &&
    png.data[index] > png.data[index + 1] * 1.18 &&
    png.data[index] > png.data[index + 2] * 1.05 &&
    png.data[index + 1] < 90 &&
    png.data[index + 2] < 85;
const changedPoliticalEdge = (png, index) =>
    darkPoliticalEdge(png, index) && !darkPoliticalEdge(baseline, index);
const baselinePoliticalRed = (png, index) =>
    redScore(png, index) > 35 && png.data[index] > png.data[index + 1] * 1.35;

function cellBounds(cell) {
    const x = cell % worldWidth;
    const y = Math.floor(cell / worldWidth);
    return {
        left: camera.x + x * camera.scaleX,
        top: camera.y + y * camera.scaleY,
        right: camera.x + (x + 1) * camera.scaleX,
        bottom: camera.y + (y + 1) * camera.scaleY,
    };
}

const parentByCell = new Map();
for (const timelineEntry of metadata.presentationTimeline || []) {
    for (const predecessor of timelineEntry.predecessorEdges || []) {
        const cell = Number(predecessor.cell);
        if (!parentByCell.has(cell)) parentByCell.set(cell, Number(predecessor.parentCell));
    }
}

const authorizationTimeByCell = new Map();
for (const event of metadata.focusDiagnostic?.authority || []) {
    const relative = Number(event.performanceNow) - Number(metadata.operationTransitionStart);
    for (const change of event.cells || []) {
        if (Number(change.newOwner) !== ownerId) continue;
        const cell = Number(change.cell);
        if (!authorizationTimeByCell.has(cell)) authorizationTimeByCell.set(cell, relative);
    }
}

const anchorCell = Number(metadata.target.sourceCell);
const allAuthorizedCells = [...authorizationTimeByCell.keys()];
const allCells = [anchorCell, ...allAuthorizedCells];
const allBounds = allCells.map(cellBounds);
const localLeft = Math.max(0, Math.floor(Math.min(...allBounds.map(b => b.left)) - 4));
const localTop = Math.max(0, Math.floor(Math.min(...allBounds.map(b => b.top)) - 4));
const localRight = Math.min(width - 1, Math.ceil(Math.max(...allBounds.map(b => b.right)) + 4));
const localBottom = Math.min(height - 1, Math.ceil(Math.max(...allBounds.map(b => b.bottom)) + 4));
const indexAt = (x, y) => y * width + x;
const pixelIndex = (x, y) => indexAt(x, y) * 4;
const CONTACT_TOLERANCE_PX = 5;

function buildSourceSeedMask() {
    const seed = new Uint8Array(width * height);
    const b = cellBounds(anchorCell);
    const left = Math.max(localLeft, Math.floor(b.left));
    const top = Math.max(localTop, Math.floor(b.top));
    const right = Math.min(localRight, Math.ceil(b.right));
    const bottom = Math.min(localBottom, Math.ceil(b.bottom));
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const i = pixelIndex(x, y);
        if (baselinePoliticalRed(baseline, i)) seed[indexAt(x, y)] = 1;
    }
    return seed;
}
const sourceSeed = buildSourceSeedMask();

function buildFrameMask(png, relativeMS) {
    const newMask = new Uint8Array(width * height);
    for (const [cell, authorizationMS] of authorizationTimeByCell) {
        if (authorizationMS > relativeMS + 1) continue;
        const b = cellBounds(cell);
        const left = Math.max(localLeft, Math.floor(b.left));
        const top = Math.max(localTop, Math.floor(b.top));
        const right = Math.min(localRight, Math.ceil(b.right));
        const bottom = Math.min(localBottom, Math.ceil(b.bottom));
        for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
            const i = pixelIndex(x, y);
            if (changedPoliticalRed(png, i) || changedPoliticalEdge(png, i)) newMask[indexAt(x, y)] = 1;
        }
    }
    return newMask;
}

function connectednessForFrame(png, relativeMS) {
    const newMask = buildFrameMask(png, relativeMS);
    const combined = new Uint8Array(width * height);
    for (let y = localTop; y <= localBottom; y++) for (let x = localLeft; x <= localRight; x++) {
        const n = indexAt(x, y);
        combined[n] = sourceSeed[n] || newMask[n] ? 1 : 0;
    }

    const seen = new Uint8Array(width * height);
    let rawDetachedFactionPixels = 0;
    let visibleComponents = 0;
    let largestComponent = 0;
    const componentDetails = [];
    const queue = [];
    for (let y = localTop; y <= localBottom; y++) for (let x = localLeft; x <= localRight; x++) {
        const start = indexAt(x, y);
        if (!combined[start] || seen[start]) continue;
        visibleComponents++;
        seen[start] = 1;
        queue.push(start);
        let size = 0;
        let hasSource = false;
        let newPixels = 0;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        while (queue.length) {
            const current = queue.pop();
            const cy = Math.floor(current / width);
            const cx = current - cy * width;
            size++;
            hasSource ||= Boolean(sourceSeed[current]);
            newPixels += newMask[current];
            minX = Math.min(minX, cx);
            minY = Math.min(minY, cy);
            maxX = Math.max(maxX, cx);
            maxY = Math.max(maxY, cy);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < localLeft || nx > localRight || ny < localTop || ny > localBottom) continue;
                const ni = indexAt(nx, ny);
                if (combined[ni] && !seen[ni]) {
                    seen[ni] = 1;
                    queue.push(ni);
                }
            }
        }
        if (!hasSource) rawDetachedFactionPixels += newPixels;
        largestComponent = Math.max(largestComponent, size);
        componentDetails.push({ size, sourceConnected: hasSource, newPixels, minX, minY, maxX, maxY });
    }

    // A political edge is antialiased and the screencast is resampled. Treat
    // a non-source component whose bounding box is within a few screen pixels
    // of a source-connected component as the same visible front. This is a
    // measurement tolerance for raster contact, not a gameplay bridge: the
    // underlying mask remains restricted to already-authorized cells.
    const bboxDistance = (a, b) => {
        const dx = Math.max(a.minX - b.maxX - 1, b.minX - a.maxX - 1, 0);
        const dy = Math.max(a.minY - b.maxY - 1, b.minY - a.maxY - 1, 0);
        return Math.hypot(dx, dy);
    };
    let connected = componentDetails.map(component => component.sourceConnected);
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < componentDetails.length; i++) {
            if (connected[i]) continue;
            for (let j = 0; j < componentDetails.length; j++) {
                if (connected[j] && bboxDistance(componentDetails[i], componentDetails[j]) <= CONTACT_TOLERANCE_PX) {
                    connected[i] = true;
                    changed = true;
                    break;
                }
            }
        }
    }
    let detachedFactionPixels = 0;
    componentDetails.forEach((component, index) => {
        component.contactConnected = connected[index];
        component.minDistanceToConnectedPx = connected[index]
            ? 0
            : Math.min(...componentDetails
                .filter((candidate, candidateIndex) => connected[candidateIndex])
                .map(candidate => bboxDistance(component, candidate)));
        if (!connected[index]) detachedFactionPixels += component.newPixels;
    });
    return {
        relativeMS: Number(relativeMS.toFixed(2)),
        authorizedCells: allAuthorizedCells.filter(cell => authorizationTimeByCell.get(cell) <= relativeMS + 1),
        visibleComponents,
        largestComponent,
        rawDetachedFactionPixels,
        detachedFactionPixels,
        components: componentDetails.sort((a, b) => b.size - a.size),
    };
}

const frameReports = [];
for (const frame of metadata.visibleScreencast.frames) {
    const png = await readPng(frame.path);
    frameReports.push({ frame: frame.index, ...connectednessForFrame(png, frameRelativeMS(frame)) });
}

const report = {
    scenario: 'real browser HUN SOUTHWEST FOCUS',
    metadata: metadataPath,
    method: '8-connected components over baseline anchor sovereign mask plus changed political-red pixels in already-authorized cell bounds',
    localRegion: { left: localLeft, top: localTop, right: localRight, bottom: localBottom },
    frameCount: frameReports.length,
    firstAuthorizedCell: allAuthorizedCells[0] ?? null,
    parentByCell: Object.fromEntries(parentByCell),
    sourceSeedPixels: sourceSeed.reduce((sum, value) => sum + value, 0),
    frameReports,
    framesWithDetachedPixels: frameReports.filter(frame => frame.detachedFactionPixels > 0).length,
    maxDetachedFactionPixels: Math.max(0, ...frameReports.map(frame => frame.detachedFactionPixels)),
};
const reportPath = path.join(outputDir, 'focus_frame_connectedness_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
    reportPath,
    frameCount: report.frameCount,
    sourceSeedPixels: report.sourceSeedPixels,
    framesWithDetachedPixels: report.framesWithDetachedPixels,
    maxDetachedFactionPixels: report.maxDetachedFactionPixels,
    firstFrames: frameReports.slice(0, 5).map(frame => ({ frame: frame.frame, relativeMS: frame.relativeMS, detachedFactionPixels: frame.detachedFactionPixels })),
    lastFrames: frameReports.slice(-5).map(frame => ({ frame: frame.frame, relativeMS: frame.relativeMS, detachedFactionPixels: frame.detachedFactionPixels })),
}, null, 2));
