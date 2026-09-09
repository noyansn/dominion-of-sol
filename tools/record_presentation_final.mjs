import { spawn } from 'node:child_process';
import fs from 'node:fs';
import WebSocket from 'ws';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cdpPort = Number(process.argv[2] || 9230);
const targetUrl = process.argv[3] || 'http://127.0.0.1:5180/';
const outDir = process.argv[4] || 'C:/Users/noyan/Downloads/game/evidence-video/final-close-zoom';
const reuseBrowser = process.argv[5] === 'reuse';
const lowOverheadCapture = process.env.DOMINION_LOW_OVERHEAD_CAPTURE === '1';
const diagnosticMode = process.env.DOMINION_FOCUS_DIAGNOSTIC === '1';
const requestedFocusDirection = String(process.env.DOMINION_FOCUS_TARGET_DIRECTION || 'ANY').toUpperCase();
const forcedFocusTargetPoint = String(process.env.DOMINION_FOCUS_TARGET_POINT || '')
    .split(',')
    .map(value => Number(value.trim()))
    .filter(Number.isFinite);
const cleanMatchBeforeCapture = process.env.DOMINION_CLEAN_MATCH === '1';
const focusCivilization = String(process.env.DOMINION_FOCUS_CIV || 'roma');
const hideSelectionAfterPointer = process.env.DOMINION_HIDE_SELECTION_AFTER_POINTER === '1';
const videoPath = `${outDir}/italy_focus_12pct_visible_runtime_30fps.webm`;
const rawCanvasVideoPath = `${outDir}/italy_focus_12pct_canvas_capture_raw.webm`;
const beforePath = `${outDir}/italy_focus_12pct_presentation_before.png`;
const midPath = `${outDir}/italy_focus_12pct_presentation_mid.png`;
const afterPath = `${outDir}/italy_focus_12pct_presentation_after.png`;
const metadataPath = `${outDir}/italy_focus_12pct_presentation_instrumented_evidence.json`;
const frameDir = `${outDir}/italy_focus_12pct_presentation_frames`;
const screencastDir = `${outDir}/italy_focus_12pct_visible_screencast_frames`;
const canvasExpression = `Array.from(document.querySelectorAll('canvas')).filter(canvas => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}).sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return (br.width * br.height) - (ar.width * ar.height);
})[0]`;
const userDataDir = `C:/Users/noyan/Downloads/game/.tmp/chrome_presentation_instrumented_${Date.now()}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForPage() {
    for (let i = 0; i < 40; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
            const page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
            if (page) return page.webSocketDebuggerUrl;
        } catch {}
        await sleep(250);
    }
    throw new Error('Timed out waiting for Chrome CDP page');
}

async function main() {
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(frameDir, { recursive: true });
    fs.mkdirSync(screencastDir, { recursive: true });
    const chrome = reuseBrowser ? null : spawn(chromePath, [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--enable-webgl',
        '--use-gl=angle',
        '--force-device-scale-factor=1',
        '--hide-scrollbars',
        `--window-size=879,742`,
        `--remote-debugging-port=${cdpPort}`,
        '--remote-allow-origins=*',
        `--user-data-dir=${userDataDir}`,
        targetUrl,
    ], { stdio: ['ignore', 'ignore', 'ignore'] });

    let ws;
    try {
        const wsUrl = await waitForPage();
        ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            ws.once('open', resolve);
            ws.once('error', reject);
        });

        let nextId = 1;
        const pending = new Map();
        const screencastFrames = [];
        const browserDiagnostics = [];
        let screencastFrameIndex = 0;
        ws.on('message', raw => {
            const message = JSON.parse(raw.toString());
            if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled') {
                browserDiagnostics.push({
                    method: message.method,
                    type: message.params?.type,
                    text: message.params?.exceptionDetails?.text
                        || message.params?.args?.map?.(arg => arg.value ?? arg.description ?? '').join(' ')
                        || '',
                });
            }
            if (message.method === 'Page.screencastFrame') {
                const index = screencastFrameIndex++;
                const path = `${screencastDir}/frame_${String(index).padStart(4, '0')}.png`;
                fs.writeFileSync(path, Buffer.from(message.params.data, 'base64'));
                screencastFrames.push({
                    index,
                    receivedAt: Date.now(),
                    metadata: message.params.metadata,
                    path,
                });
                send('Page.screencastFrameAck', { sessionId: message.params.sessionId }).catch(() => {});
                return;
            }
            const entry = pending.get(message.id);
            if (!entry) return;
            pending.delete(message.id);
            if (message.error) entry.reject(message.error);
            else entry.resolve(message.result);
        });

        function send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = nextId++;
                pending.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        async function evaluate(expression) {
            const result = await send('Runtime.evaluate', {
                expression,
                awaitPromise: true,
                returnByValue: true,
            });
            if (result?.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result?.result?.value;
        }

        async function click(x, y, clickCount = 1) {
            await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount });
            await sleep(35);
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount });
        }

        async function wheel(x, y, deltaY) {
            await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
            await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaY, deltaX: 0 });
        }

        async function screenshot(path) {
            const result = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path, Buffer.from(result.data, 'base64'));
        }

        async function canvasScreenshot(path) {
            const dataUrl = await evaluate(`(${canvasExpression})?.toDataURL('image/png') || null`);
            if (!dataUrl) throw new Error('Canvas pixel capture unavailable');
            fs.writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
        }

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
            const install = proto => {
                if (!proto || proto.__dominionShaderProbe) return;
                const sourceByShader = new WeakMap();
                const originalSource = proto.shaderSource;
                const originalCompile = proto.compileShader;
                proto.shaderSource = function(shader, source) {
                    sourceByShader.set(shader, String(source));
                    return originalSource.call(this, shader, source);
                };
                proto.compileShader = function(shader) {
                    const result = originalCompile.call(this, shader);
                    if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
                        console.error('[DOMINION_SHADER_PROBE] compile failure', this.getShaderInfoLog(shader), sourceByShader.get(shader));
                    }
                    return result;
                };
                proto.__dominionShaderProbe = true;
            };
            install(window.WebGLRenderingContext?.prototype);
            install(window.WebGL2RenderingContext?.prototype);
        })()` });
        await send('Page.reload', { ignoreCache: true });
        for (let i = 0; i < 40; i++) {
            const ready = await evaluate(`Boolean(document.getElementById('btn-continue-with-civ'))`);
            if (ready) break;
            await sleep(500);
        }
        await sleep(800);

        // Enter the current canonical Mediterranean realm through the visible
        // UI. The operation itself below is dispatched only as surface input.
        await evaluate(`document.getElementById('btn-continue-with-civ')?.click()`);
        await sleep(700);
        await evaluate(`document.querySelector('.warroom-world-card')?.click()`);
        await sleep(250);
        await evaluate(`document.getElementById('btn-warroom-primary-action')?.click()`);
        await sleep(4500);
        if (cleanMatchBeforeCapture) {
            await evaluate(`window.__DOMINION_DEV__?.cleanMatch(${JSON.stringify(focusCivilization)}, 42, false)`);
            await sleep(2200);
        }
        await evaluate(`document.getElementById('btn-mode-flat')?.click()`);
        await sleep(1300);

        // Keep the production camera under pointer control. We intentionally
        // do not call renderer.focusOnCell here: the close-up is reached by
        // the same flat-map wheel input a player uses.
        const cameraInfo = await evaluate(`(() => {
            const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
            const renderer = window.__DOMINION_RENDERER__;
            const me = gs?.factions?.get?.(gs?.yourFactionId);
            const cell = me?.capitalCell;
            if (renderer && cell !== undefined) {
                const width = gs?.width || 1024;
                const worldX = (cell % width) + 0.5;
                const worldY = Math.floor(cell / width) + 0.5;
                const camera = renderer.worldContainer;
                return {
                    focusedCell: cell,
                    worldX,
                    worldY,
                    screenX: camera.x + worldX * camera.scale.x,
                    screenY: camera.y + worldY * camera.scale.y,
                    cameraScale: camera.scale.x,
                    fitScale: renderer.fitScale,
                };
            }
            return { focusedCell: null, worldX: null, worldY: null, screenX: null, screenY: null };
        })()`);
        await sleep(900);

        let canvasRect = null;
        for (let i = 0; i < 40; i++) {
            canvasRect = await evaluate(`(() => {
            const r = (${canvasExpression})?.getBoundingClientRect();
            return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
            })()`);
            if (canvasRect) break;
            await sleep(500);
        }
        if (!canvasRect) throw new Error('Canvas bounds unavailable');
        const zoomPoint = {
            x: Math.round(cameraInfo.screenX ?? canvasRect.left + canvasRect.width * 0.5),
            y: Math.round(cameraInfo.screenY ?? canvasRect.top + canvasRect.height * 0.5),
        };
        for (let i = 0; i < 22; i++) {
            await wheel(zoomPoint.x, zoomPoint.y, -120);
            await sleep(45);
        }
        await sleep(500);
        const debugZoomPath = `${outDir}/italy_focus_12pct_continuous_field_debug_zoom.png`;
        await screenshot(debugZoomPath);
        const cameraAfterZoom = await evaluate(`(() => {
            const renderer = window.__DOMINION_RENDERER__;
            const container = renderer?.worldContainer;
            return container ? {
                x: container.x,
                y: container.y,
                scaleX: container.scale.x,
                scaleY: container.scale.y,
                width: window.innerWidth,
                height: window.innerHeight,
            } : null;
        })()`);

        // Select pointer candidates from the current authoritative state only
        // to avoid guessing a pixel on the close-up coastline. The command is
        // still issued below solely by browser pointer input.
        const candidateScanExpression = `(() => {
            const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
            const renderer = window.__DOMINION_RENDERER__;
            const owners = gs?.cellOwners;
            const terrains = gs?.cellTerrains;
            const width = gs?.width || 1024;
            const height = gs?.height || 512;
            const owner = gs?.yourFactionId;
            const container = renderer?.worldContainer;
            if (!owners || !terrains || !container || !owner) return [];
            const neighbours = [
                [1,0],[-1,0],[0,1],[0,-1],
                [1,1],[-1,1],[1,-1],[-1,-1],
            ];
            const faction = gs?.factions?.get?.(owner);
            const capitalCell = faction?.capitalCell ?? null;
            const capital = capitalCell === null ? null : {
                x: (capitalCell % width) + 0.5,
                y: Math.floor(capitalCell / width) + 0.5,
                cell: capitalCell,
            };
            const candidates = [];
            const desiredDirections = {
                EAST: { x: 1, y: 0 },
                NORTH: { x: 0, y: -1 },
                NORTHWEST: { x: -1, y: -1 },
                SOUTHWEST: { x: -1, y: 1 },
                SOUTH: { x: 0, y: 1 },
                WEST: { x: -1, y: 0 },
            };
            const desired = desiredDirections[${JSON.stringify(requestedFocusDirection)}] || null;
            for (let i = 0; i < owners.length; i++) {
                if (owners[i] !== 0 || terrains[i] === 2) continue;
                const x = i % width;
                const y = Math.floor(i / width);
                let adjacent = false;
                for (const [dx, dy] of neighbours) {
                    const nx = (x + dx + width) % width;
                    const ny = y + dy;
                    if (ny < 0 || ny >= height) continue;
                    const neighbourIndex = ny * width + nx;
                    if (owners[neighbourIndex] !== owner || terrains[neighbourIndex] === 2) continue;
                    if (dx !== 0 && dy !== 0) {
                        const first = y * width + nx;
                        const second = ny * width + x;
                        if (terrains[first] === 2 && terrains[second] === 2) continue;
                    }
                    adjacent = true;
                    break;
                }
                // Keep evidence targets on the real local legal front. This
                // prevents the recorder from spending minutes probing remote
                // cells that the production resolver must correctly reject.
                if (!adjacent) continue;
                let source = null;
                for (const [dx, dy] of neighbours) {
                    const sx = (x + dx + width) % width;
                    const sy = y + dy;
                    if (sy < 0 || sy >= height) continue;
                    const sourceIndex = sy * width + sx;
                    if (owners[sourceIndex] === owner && terrains[sourceIndex] !== 2) {
                        if (dx !== 0 && dy !== 0) {
                            const first = y * width + sx;
                            const second = sy * width + x;
                            if (terrains[first] === 2 && terrains[second] === 2) continue;
                        }
                        source = { x: sx + 0.5, y: sy + 0.5, cell: sourceIndex };
                        break;
                    }
                }
                const origin = source || capital;
                let vectorX = origin ? (x + 0.5) - origin.x : 0;
                const vectorY = origin ? (y + 0.5) - origin.y : 0;
                if (vectorX > width / 2) vectorX -= width;
                if (vectorX < -width / 2) vectorX += width;
                const vectorLength = Math.hypot(vectorX, vectorY) || 1;
                const directionScore = desired
                    ? (vectorX / vectorLength) * desired.x + (vectorY / vectorLength) * desired.y
                    : 0;
                let screenX = container.x + (x + 0.5) * container.scale.x;
                const screenY = container.y + (y + 0.5) * container.scale.y;
                const worldScreenWidth = width * container.scale.x;
                while (screenX < -worldScreenWidth * 0.5) screenX += worldScreenWidth;
                while (screenX > window.innerWidth + worldScreenWidth * 0.5) screenX -= worldScreenWidth;
                if (screenX < 4 || screenX > window.innerWidth - 4 || screenY < 110 || screenY > window.innerHeight - 120) continue;
                candidates.push({
                    x: Math.round(screenX),
                    y: Math.round(screenY),
                    cell: i,
                    distance: Math.hypot(screenX - window.innerWidth * 0.5, screenY - window.innerHeight * 0.5),
                    sourceCell: source?.cell ?? null,
                    directionX: vectorX / vectorLength,
                    directionY: vectorY / vectorLength,
                    directionScore,
                });
            }
            candidates.sort((a, b) => desired
                ? b.directionScore - a.directionScore || a.distance - b.distance
                : a.distance - b.distance);
            if (${JSON.stringify(Boolean(process.env.DOMINION_DUMP_FOCUS_CANDIDATES))}) {
                console.log('[CANDIDATES]', JSON.stringify(candidates.slice(0, 16)));
            }
            return candidates.slice(0, 32);
        })()`;
        const globalDirectionalCandidateExpression = `(() => {
            const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
            const owners = gs?.cellOwners;
            const terrains = gs?.cellTerrains;
            const width = gs?.width || 1024;
            const height = gs?.height || 512;
            const owner = gs?.yourFactionId;
            const desiredDirections = {
                EAST: { x: 1, y: 0 },
                NORTH: { x: 0, y: -1 },
                NORTHWEST: { x: -1, y: -1 },
                SOUTHWEST: { x: -1, y: 1 },
                SOUTH: { x: 0, y: 1 },
                WEST: { x: -1, y: 0 },
            };
            const desired = desiredDirections[${JSON.stringify(requestedFocusDirection)}] || null;
            const neighbours = [
                [1,0],[-1,0],[0,1],[0,-1],
                [1,1],[-1,1],[1,-1],[-1,-1],
            ];
            if (!owners || !terrains || !owner || !desired) return [];
            const candidates = [];
            for (let i = 0; i < owners.length; i++) {
                if (owners[i] !== 0 || terrains[i] === 2) continue;
                const x = i % width;
                const y = Math.floor(i / width);
                let source = null;
                for (const [dx, dy] of neighbours) {
                    const sx = (x + dx + width) % width;
                    const sy = y + dy;
                    if (sy < 0 || sy >= height) continue;
                    const sourceIndex = sy * width + sx;
                    if (owners[sourceIndex] === owner && terrains[sourceIndex] !== 2) {
                        if (dx !== 0 && dy !== 0) {
                            const first = y * width + sx;
                            const second = sy * width + x;
                            if (terrains[first] === 2 && terrains[second] === 2) continue;
                        }
                        source = { cell: sourceIndex, x: sx + 0.5, y: sy + 0.5 };
                        break;
                    }
                }
                if (!source) continue;
                let vx = (x + 0.5) - source.x;
                const vy = (y + 0.5) - source.y;
                if (vx > width / 2) vx -= width;
                if (vx < -width / 2) vx += width;
                const length = Math.hypot(vx, vy) || 1;
                const directionX = vx / length;
                const directionY = vy / length;
                const score = directionX * desired.x + directionY * desired.y;
                const componentMatch = desired.x !== 0 && desired.y !== 0
                    ? directionX * desired.x > 0.45 && directionY * desired.y > 0.45
                    : desired.x !== 0
                        ? directionX * desired.x > 0.45
                        : directionY * desired.y > 0.45;
                if (componentMatch) candidates.push({
                    cell: i,
                    sourceCell: source.cell,
                    directionX,
                    directionY,
                    directionScore: score,
                });
            }
            return candidates.sort((a, b) => b.directionScore - a.directionScore || a.cell - b.cell).slice(0, 16);
        })()`;
        let candidates = await evaluate(candidateScanExpression);
        if (!candidates.length) throw new Error('No authoritative neutral land neighbor was visible in the close-up');
        await evaluate(`window.__DOMINION_FOCUS_CANDIDATES__ = ${JSON.stringify(candidates)}`);
        const chooseTarget = async (availableCandidates) => {
            let chosen = null;
            let chosenPreview = '';
            for (const candidate of availableCandidates) {
                await evaluate(`(() => {
                    const canvas = ${canvasExpression};
                    window.__POINTER_HIT__ = [];
                    if (canvas && !canvas.__recordHooked) {
                        canvas.addEventListener('pointerdown', event => window.__POINTER_HIT__.push({ type: 'down', x: event.clientX, y: event.clientY }));
                        canvas.addEventListener('pointerup', event => window.__POINTER_HIT__.push({ type: 'up', x: event.clientX, y: event.clientY }));
                        canvas.__recordHooked = true;
                    }
                })()`);
                await click(candidate.x, candidate.y, 1);
                await sleep(700);
                const text = await evaluate(`document.body.innerText.slice(-500)`);
                const hit = await evaluate(`(() => {
                    const element = document.elementFromPoint(${candidate.x}, ${candidate.y});
                    return { element: element ? { tag: element.tagName, id: element.id, className: String(element.className || '') } : null, events: window.__POINTER_HIT__ };
                })()`);
                console.log(`[PREVIEW] ${candidate.x},${candidate.y} ${JSON.stringify({ text, hit })}`);
                if (/\bEXPAND\b/.test(text) && !text.includes('Water is not a legal land command target')) {
                    chosen = candidate;
                    chosenPreview = text;
                    break;
                }
            }
            return { chosen, chosenPreview };
        };

        const desiredVector = {
            NORTHWEST: { x: -1, y: -1 },
            NORTHEAST: { x: 1, y: -1 },
            SOUTHWEST: { x: -1, y: 1 },
            SOUTHEAST: { x: 1, y: 1 },
        }[requestedFocusDirection] || null;
        const hasExactDirectionalCandidate = desiredVector
            ? candidates.some(candidate => candidate.directionX * desiredVector.x > 0.45
                && candidate.directionY * desiredVector.y > 0.45)
            : true;
        let directionalCandidates = desiredVector && hasExactDirectionalCandidate
            ? candidates.filter(candidate => candidate.directionX * desiredVector.x > 0.45
                && candidate.directionY * desiredVector.y > 0.45)
            : candidates;
        if (forcedFocusTargetPoint.length === 2) {
            directionalCandidates = directionalCandidates.filter(candidate =>
                candidate.x === Math.round(forcedFocusTargetPoint[0])
                && candidate.y === Math.round(forcedFocusTargetPoint[1]));
        }
        let selection = !desiredVector || hasExactDirectionalCandidate
            ? await chooseTarget(directionalCandidates)
            : { chosen: null, chosenPreview: '' };
        let target = selection.chosen;
        let preview = selection.chosenPreview;

        // Evidence-only fallback for directional cases that are not available
        // on the Rome close-up. The command remains a real browser pointer
        // operation; this only centers the production camera on another legal
        // authoritative local front before the pointer phase.
        if (!target && desiredVector && cleanMatchBeforeCapture) {
            const globalCandidate = (await evaluate(globalDirectionalCandidateExpression))?.[0] || null;
            console.log(`[DIRECTION_GLOBAL] ${JSON.stringify({ requestedFocusDirection, globalCandidate })}`);
            if (globalCandidate) {
                await evaluate(`window.__DOMINION_RENDERER__?.focusOnCell?.(${Number(globalCandidate.sourceCell)});`);
                await sleep(900);
                candidates = await evaluate(candidateScanExpression);
                console.log(`[DIRECTION_VISIBLE_AFTER_FOCUS] ${JSON.stringify({ count: candidates.length, candidates: candidates.slice(0, 4) })}`);
                await evaluate(`window.__DOMINION_FOCUS_CANDIDATES__ = ${JSON.stringify(candidates)}`);
                directionalCandidates = candidates.filter(candidate => candidate.directionX * desiredVector.x > 0.45
                    && candidate.directionY * desiredVector.y > 0.45);
                if (directionalCandidates.length > 0) {
                    selection = await chooseTarget(directionalCandidates);
                    target = selection.chosen;
                    preview = selection.chosenPreview;
                }
            }
        }

        // A clean Rome start can have no southwest neutral cell on the first
        // sovereign edge. In that evidence-only case, spend one real south
        // warm-up operation, wait for its authoritative settlement, and scan
        // the new legal front again. The warm-up is still browser-pointer
        // input; it changes no production code or authority semantics.
        if (!target && desiredVector && !hasExactDirectionalCandidate && cleanMatchBeforeCapture) {
            const warmupDirections = [
                { x: 0, y: 1 },
                { x: -1, y: 0 },
            ];
            for (const warmupDirection of warmupDirections) {
                const warmup = candidates
                    .filter(candidate => candidate.directionX * warmupDirection.x > 0.45
                        && candidate.directionY * warmupDirection.y > 0.45)
                    .at(0) || candidates[0];
                if (!warmup) break;
                await click(warmup.x, warmup.y, 1);
                await sleep(110);
                await click(warmup.x, warmup.y, 2);
                await sleep(6500);
                candidates = await evaluate(candidateScanExpression);
                await evaluate(`window.__DOMINION_FOCUS_CANDIDATES__ = ${JSON.stringify(candidates)}`);
                directionalCandidates = candidates.filter(candidate => candidate.directionX * desiredVector.x > 0.45
                    && candidate.directionY * desiredVector.y > 0.45);
                if (directionalCandidates.length > 0) {
                    selection = await chooseTarget(directionalCandidates);
                    target = selection.chosen;
                    preview = selection.chosenPreview;
                    if (target) break;
                }
            }
        }
        if (!target && desiredVector && cleanMatchBeforeCapture) {
            const globalCandidate = (await evaluate(globalDirectionalCandidateExpression))?.[0] || null;
            console.log(`[DIRECTION_GLOBAL_AFTER_WARMUP] ${JSON.stringify({ requestedFocusDirection, globalCandidate })}`);
            if (globalCandidate) {
                await evaluate(`window.__DOMINION_RENDERER__?.focusOnCell?.(${Number(globalCandidate.sourceCell)});`);
                await sleep(900);
                candidates = await evaluate(candidateScanExpression);
                console.log(`[DIRECTION_VISIBLE_AFTER_WARMUP_FOCUS] ${JSON.stringify({ count: candidates.length, candidates: candidates.slice(0, 4) })}`);
                await evaluate(`window.__DOMINION_FOCUS_CANDIDATES__ = ${JSON.stringify(candidates)}`);
                directionalCandidates = candidates.filter(candidate => candidate.directionX * desiredVector.x > 0.45
                    && candidate.directionY * desiredVector.y > 0.45);
                if (directionalCandidates.length > 0) {
                    selection = await chooseTarget(directionalCandidates);
                    target = selection.chosen;
                    preview = selection.chosenPreview;
                }
            }
        }
        if (!target) {
            console.log(JSON.stringify({ cameraInfo, canvasRect, zoomPoint, debugZoomPath }));
            throw new Error('No visible Italian FOCUS target resolved from candidate pointer points');
        }
        const screencastStartedAt = Date.now();
        if (!lowOverheadCapture) {
            await send('Page.startScreencast', {
                format: 'png',
                quality: 90,
                maxWidth: 861,
                maxHeight: 590,
                everyNthFrame: 1,
            });
        }
        await screenshot(beforePath);

        // Background world transitions may already exist after joining. Start
        // the instrumentation window immediately before the real pointer
        // operation so the extracted trace is scoped to this recording.
        await evaluate(`(() => {
            window.__DEV_PRESENTATION_TIMELINE__ = [];
            window.__DOMINION_PRESENTATION_TELEMETRY_ENABLED__ = true;
            window.__DOMINION_PRESENTATION_PROFILE_ENABLED__ = true;
            if (window.__DEV_PRESENTATION_STATE__) window.__DEV_PRESENTATION_STATE__.lastFrame = null;
            window.__DOMINION_FOCUS_DIAGNOSTIC__ = { authority: [], presentation: [] };
            const hashOwners = owners => {
                let hash = 2166136261 >>> 0;
                for (let i = 0; i < owners.length; i++) {
                    hash ^= owners[i] | 0;
                    hash = Math.imul(hash, 16777619) >>> 0;
                }
                return hash.toString(16).padStart(8, '0');
            };
            const install = () => {
                const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
                if (gs && typeof gs.applyDeltas === 'function' && !gs.__dominionFocusDiagnosticWrapped) {
                    const originalApplyDeltas = gs.applyDeltas.bind(gs);
                    gs.applyDeltas = function(deltas, tick, sequence, fronts, matchState, pendingAlliances, ownershipRevision) {
                        const before = new Uint8Array(this.cellOwners);
                        const result = originalApplyDeltas(deltas, tick, sequence, fronts, matchState, pendingAlliances, ownershipRevision);
                        const changed = (deltas || []).map(delta => ({
                            cell: Number(delta.index ?? delta.cellIndex),
                            oldOwner: Number(before[Number(delta.index ?? delta.cellIndex)] ?? 0),
                            newOwner: Number(delta.ownerId ?? delta.owner ?? 0),
                        }));
                        window.__DOMINION_FOCUS_DIAGNOSTIC__.authority.push({
                            performanceNow: performance.now(),
                            tick,
                            sequence,
                            ownershipRevision: ownershipRevision ?? null,
                            cells: changed,
                            clientOwnerGridHash: hashOwners(this.cellOwners),
                            clientOwnersForChangedCells: changed.map(change => ({ cell: change.cell, owner: Number(this.cellOwners[change.cell] ?? 0) })),
                        });
                        return result;
                    };
                    gs.__dominionFocusDiagnosticWrapped = true;
                }
                const manager = window.__DOMINION_RENDERER__?.ownershipTransition;
                if (manager && typeof manager.update === 'function' && !manager.__dominionFocusDiagnosticWrapped) {
                    const originalUpdate = manager.update.bind(manager);
                    manager.update = function(dtSeconds) {
                        const result = originalUpdate(dtSeconds);
                        const transitions = manager.activeTransitions || [];
                        for (const transition of transitions) {
                            if (transition.newOwner !== 101 || transition.presentationMode !== 'FOCUS') continue;
                            window.__DOMINION_FOCUS_DIAGNOSTIC__.presentation.push({
                                performanceNow: performance.now(),
                                transitionId: transition.transitionId,
                                authoritativeOwnerRevision: transition.newMaskRevision,
                                cells: Array.from(transition.changes.keys()),
                                localProgress: Array.from(transition.arrivalTimes.entries()).map(([cell, arrivalTime]) => ({
                                    cell,
                                    arrivalTime,
                                    progress: Math.max(0, Math.min(1, (performance.now() - arrivalTime) / 80)),
                                })),
                                frontAnchor: transition.focusIntent?.sourceCell ?? transition.focusIntent?.resolvedAnchor ?? null,
                                target: transition.focusIntent?.targetCell ?? null,
                                direction: transition.direction,
                                fieldRegion: transition.fieldRegion ?? null,
                                textureRevision: transition.transitionTextureRevision,
                            });
                        }
                        return result;
                    };
                    manager.__dominionFocusDiagnosticWrapped = true;
                }
            };
            install();
            window.__DOMINION_FOCUS_DIAGNOSTIC_INSTALLER__ = setInterval(install, 25);
        })()`);

        const recordInfo = await evaluate(`(() => {
            const canvas = ${canvasExpression};
            if (!canvas || !canvas.captureStream || typeof MediaRecorder === 'undefined') return { ok: false };
            // A fixed 30 FPS track gives the low-overhead evidence path a
            // stable decoded cadence. The previous 0 FPS + requestFrame
            // combination was valid for capture, but Chromium could encode
            // sparse timestamps under headless load, making frame extraction
            // look like a visual jump even when the ticker was smooth.
            const stream = canvas.captureStream(${lowOverheadCapture ? 30 : 0});
            const videoTrack = stream.getVideoTracks()[0];
            const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8' : 'video/webm';
            const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2200000 });
            window.__PRESENTATION_RECORDING__ = {
                recorder,
                chunks: [],
                startedAt: performance.now(),
                mime,
                active: true,
                videoTrack,
            };
            const requestFrame = () => {
                const state = window.__PRESENTATION_RECORDING__;
                if (!state?.active) return;
                state.videoTrack?.requestFrame?.();
                requestAnimationFrame(requestFrame);
            };
            if (${lowOverheadCapture ? 'false' : 'true'}) requestAnimationFrame(requestFrame);
            recorder.ondataavailable = event => {
                if (event.data && event.data.size) window.__PRESENTATION_RECORDING__.chunks.push(event.data);
            };
            recorder.start(80);
            return {
                ok: true,
                mime,
                width: canvas.width,
                height: canvas.height,
                performanceNow: performance.now(),
                canvasInventory: Array.from(document.querySelectorAll('canvas')).map((candidate, index) => {
                    const rect = candidate.getBoundingClientRect();
                    return { index, width: candidate.width, height: candidate.height, cssWidth: rect.width, cssHeight: rect.height };
                }),
            };
        })()`);
        if (!recordInfo?.ok) throw new Error(`Canvas recording unavailable: ${JSON.stringify(recordInfo)}`);

        const startedAt = Date.now();
        const recordingStopAt = startedAt + 8500;
        const timelineFrames = [];
        const frameCapture = lowOverheadCapture ? Promise.resolve() : (async () => {
            let frameIndex = 0;
            const captureUntil = diagnosticMode ? recordingStopAt : startedAt + 2600;
            const captureInterval = diagnosticMode ? 100 : 33;
            while (Date.now() <= captureUntil) {
                const captureStarted = Date.now();
                const path = `${frameDir}/frame_${String(frameIndex).padStart(3, '0')}.png`;
                // WebGL canvas readback is not reliable while the diagnostic
                // capture is running (it can return an all-black buffer even
                // though the browser is visibly rendering).  The diagnostic
                // evidence needs the actual browser surface, so use a page
                // screenshot only for this evidence mode.  Normal capture
                // keeps the lower-overhead canvas path unchanged.
                if (diagnosticMode) await screenshot(path);
                else await canvasScreenshot(path);
                timelineFrames.push({
                    frameIndex,
                    tMs: Date.now() - startedAt,
                    path,
                });
                frameIndex++;
                await sleep(Math.max(0, captureInterval - (Date.now() - captureStarted)));
            }
        })();
        // Two distinct surface click cycles preserve the application's
        // pointer gesture recognizer; this is a real browser double-click,
        // not a controller or WebSocket command.
        await click(target.x, target.y, 1);
        await sleep(110);
        await click(target.x, target.y, 2);
        await sleep(40);
        if (hideSelectionAfterPointer) {
            await evaluate(`(() => {
                const renderer = window.__DOMINION_RENDERER__;
                renderer?.selection?.clear?.();
                if (renderer?.selection?.container) renderer.selection.container.visible = false;
            })()`);
        }
        const compositingProbe = await (async () => {
            let result = null;
            for (let attempt = 0; attempt < 20; attempt++) {
                result = await evaluate(`(() => {
            const renderer = window.__DOMINION_RENDERER__;
            const parent = renderer?.politicalFillContainer;
            const transition = renderer?.ownershipTransition;
            const active = transition?.activeTransitions?.find(item => item.newOwner === 101);
            return {
                parentVisible: Boolean(parent?.visible),
                parentSortable: Boolean(parent?.sortableChildren),
                rendererType: String(renderer?.app?.renderer?.type ?? ''),
                children: parent?.children?.map((child, index) => ({
                    index,
                    label: String(child.label || ''),
                    visible: Boolean(child.visible),
                    zIndex: Number(child.zIndex || 0),
                    childCount: child.children?.length || 0,
                })) || [],
                transitionContainerVisible: Boolean(transition?.container?.visible),
                transitionMeshVisible: Boolean(active?.mesh?.visible),
                transitionMeshRenderable: Boolean(active?.mesh?.renderable),
                transitionMeshParented: Boolean(active?.mesh?.parent),
                transitionMeshWorldVisible: Boolean(active?.mesh?.worldVisible),
                transitionContainerWorldVisible: Boolean(transition?.container?.worldVisible),
                politicalFillWorldVisible: Boolean(parent?.worldVisible),
                transitionShaderCompatibleRenderers: Number(active?.shader?.compatibleRenderers ?? -1),
                transitionContainerRenderable: Boolean(transition?.container?.renderable),
                transitionFragmentHasRenderProbe: Boolean(active?.shader?.glProgram?.fragment?.includes?.('TEMP_RENDER_PROBE')),
                transitionGlProgramStatus: (() => {
                    try {
                        const glRenderer = renderer?.app?.renderer;
                        const program = active?.shader?.glProgram;
                        const data = glRenderer?.shader?._getProgramData?.(program);
                        const gl = glRenderer?.gl;
                        return data && gl ? {
                            linked: Boolean(gl.getProgramParameter(data.program, gl.LINK_STATUS)),
                            log: gl.getProgramInfoLog(data.program) || '',
                            attributes: Object.keys(program?._attributeData || {}),
                            uniforms: Object.keys(program?._uniformData || {}),
                        } : null;
                    } catch (error) {
                        return { error: String(error) };
                    }
                })(),
                transitionMeshAlpha: Number(active?.mesh?.alpha || 0),
                transitionMeshBounds: (() => {
                    try {
                        const bounds = active?.mesh?.getBounds?.();
                        return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
                    } catch { return null; }
                })(),
                transitionMeshPosition: active?.mesh ? { x: Number(active.mesh.x), y: Number(active.mesh.y) } : null,
                activeTransition: active ? {
                    id: active.transitionId,
                    changes: Array.from(active.changes.keys()),
                    fieldWidth: active.fieldWidth,
                    fieldHeight: active.fieldHeight,
                    oldMin: Math.min(...active.oldField),
                    oldMax: Math.max(...active.oldField),
                    newMin: Math.min(...active.newField),
                    newMax: Math.max(...active.newField),
                    directionalValidSamples: active.directionalValid.reduce((sum, value) => sum + (value > 0 ? 1 : 0), 0),
                    finalRevealPixels: active.finalRevealPixels,
                    changedCellSample: (() => {
                        const cell = Array.from(active.changes.keys())[0];
                        const cx = cell % (window.__DOMINION_GAME_STATE__?.width || 1024);
                        const cy = Math.floor(cell / (window.__DOMINION_GAME_STATE__?.width || 1024));
                        const ix = Math.min(active.fieldWidth - 1, Math.max(0, Math.floor((cx - active.mesh.x + 0.5) * 12)));
                        const iy = Math.min(active.fieldHeight - 1, Math.max(0, Math.floor((cy - active.mesh.y + 0.5) * 12)));
                        const index = iy * active.fieldWidth + ix;
                        return {
                            cell,
                            ix,
                            iy,
                            oldField: active.oldField[index],
                            newField: active.newField[index],
                            directionalField: active.directionalField[index],
                            directionalValid: active.directionalValid[index],
                            arrivalOffset: active.arrivalOffsetForSample(index),
                        };
                    })(),
                    arrivalCornerSamples: (() => {
                        const cell = Array.from(active.changes.keys())[0];
                        const width = window.__DOMINION_GAME_STATE__?.width || 1024;
                        const cx = cell % width;
                        const cy = Math.floor(cell / width);
                        const samples = [
                            { label: 'NW', localX: 0.02, localY: 0.02 },
                            { label: 'NE', localX: 0.98, localY: 0.02 },
                            { label: 'SW', localX: 0.02, localY: 0.98 },
                            { label: 'SE', localX: 0.98, localY: 0.98 },
                        ];
                        return samples.map(sample => {
                            const ix = Math.min(active.fieldWidth - 1, Math.max(0,
                                Math.floor((cx - active.mesh.x + sample.localX) * 12)));
                            const iy = Math.min(active.fieldHeight - 1, Math.max(0,
                                Math.floor((cy - active.mesh.y + sample.localY) * 12)));
                            const index = iy * active.fieldWidth + ix;
                            const arrivalOffset = active.arrivalOffsetForSample(index);
                            return {
                                ...sample,
                                ix,
                                iy,
                                arrivalOffset,
                                arrivalTime: Number(active.startTime) + arrivalOffset * 1000,
                            };
                        });
                    })(),
                    arrivalCornerSamplesByCell: (() => {
                        const width = window.__DOMINION_GAME_STATE__?.width || 1024;
                        const samples = [
                            { label: 'NW', localX: 0.02, localY: 0.02 },
                            { label: 'NE', localX: 0.98, localY: 0.02 },
                            { label: 'SW', localX: 0.02, localY: 0.98 },
                            { label: 'SE', localX: 0.98, localY: 0.98 },
                        ];
                        return Array.from(active.changes.keys()).map(cell => {
                            const cx = cell % width;
                            const cy = Math.floor(cell / width);
                            const corners = samples.map(sample => {
                                const ix = Math.min(active.fieldWidth - 1, Math.max(0,
                                    Math.floor((cx - active.mesh.x + sample.localX) * 12)));
                                const iy = Math.min(active.fieldHeight - 1, Math.max(0,
                                    Math.floor((cy - active.mesh.y + sample.localY) * 12)));
                                const index = iy * active.fieldWidth + ix;
                                const arrivalOffset = active.arrivalOffsetForSample(index);
                                return {
                                    ...sample,
                                    arrivalOffset,
                                    arrivalTime: Number(active.startTime) + arrivalOffset * 1000,
                                };
                            });
                            return { cell, corners };
                        });
                    })(),
                    presentationOwnerAtFirstCell: (() => {
                        const cell = Array.from(active.changes.keys())[0];
                        const gs = window.__DOMINION_GAME_STATE__;
                        return {
                            cell,
                            authoritativeOwner: gs?.cellOwners?.[cell] ?? null,
                            presentationOwner: renderer?.surface?.ownerBuffer?.[cell] ?? null,
                            committed: renderer?.surface?.isPresentationOwnerCommitted?.(cell) ?? null,
                        };
                    })(),
                } : null,
                paletteOwner101: renderer?.politicalPaletteTexture?.paletteBuffer
                    ? Array.from(renderer.politicalPaletteTexture.paletteBuffer.slice(101 * 4, 102 * 4))
                    : null,
                transitionUniforms: (() => {
                    const active = transition?.activeTransitions?.find(item => item.newOwner === 101);
                    const uniforms = active?.shader?.resources?.uTransitionUniforms?.uniforms;
                    if (!uniforms) return null;
                    return {
                        elapsed: Number(uniforms.uElapsed),
                        duration: Number(uniforms.uPresentationDuration),
                        directionalWipe: Number(uniforms.uDirectionalWipe),
                        directionalFeather: Number(uniforms.uDirectionalFeather),
                        newOwner: Number(uniforms.uNewOwner),
                    };
                })(),
                transitionUniformData: (() => {
                    const active = transition?.activeTransitions?.find(item => item.newOwner === 101);
                    const data = active?.shader?.glProgram?._uniformData;
                    return data ? Object.fromEntries(Object.entries(data).map(([key, value]) => [key, {
                        type: value?.type,
                        location: value?.location ? String(value.location) : null,
                    }])) : null;
                })(),
            };
        })()`);
                if (result?.activeTransition) break;
                await sleep(30);
            }
            return result;
        })();
        await frameCapture;
        await screenshot(midPath);
        await sleep(Math.max(0, recordingStopAt - Date.now()));

        const videoBase64 = await evaluate(`(async () => {
            const state = window.__PRESENTATION_RECORDING__;
            state.active = false;
            await new Promise(resolve => {
                state.recorder.addEventListener('stop', resolve, { once: true });
                state.recorder.stop();
            });
            state.recorder.stream.getTracks().forEach(track => track.stop());
            const blob = new Blob(state.chunks, { type: state.mime });
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            return btoa(binary);
        })()`);
        if (!lowOverheadCapture) await send('Page.stopScreencast');
        fs.writeFileSync(rawCanvasVideoPath, Buffer.from(videoBase64, 'base64'));
        await sleep(150);

        const visibleReplayInfo = lowOverheadCapture
            ? { mime: 'raw-canvas-capture', skipped: true }
            : await evaluate(`(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 861;
            canvas.height = 590;
            const context = canvas.getContext('2d', { alpha: false });
            const stream = canvas.captureStream(30);
            const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8' : 'video/webm';
            const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2800000 });
            window.__VISIBLE_SCREENCAST_REPLAY__ = { canvas, context, stream, recorder, chunks: [], mime };
            recorder.ondataavailable = event => {
                if (event.data && event.data.size) window.__VISIBLE_SCREENCAST_REPLAY__.chunks.push(event.data);
            };
            recorder.start(80);
            return { mime };
        })()`);
        for (let i = 0; !lowOverheadCapture && i < screencastFrames.length; i++) {
            const frame = screencastFrames[i];
            const data = fs.readFileSync(frame.path).toString('base64');
            const next = screencastFrames[i + 1];
            const delay = Math.max(16, Math.min(120, next ? next.receivedAt - frame.receivedAt : 33));
            await evaluate(`(async () => {
                const replay = window.__VISIBLE_SCREENCAST_REPLAY__;
                const image = new Image();
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                    image.src = 'data:image/png;base64,${data}';
                });
                replay.context.clearRect(0, 0, replay.canvas.width, replay.canvas.height);
                replay.context.drawImage(image, 0, 0, replay.canvas.width, replay.canvas.height);
                await new Promise(resolve => setTimeout(resolve, ${delay}));
            })()`);
        }
        const visibleVideoBase64 = lowOverheadCapture ? null : await evaluate(`(async () => {
            const replay = window.__VISIBLE_SCREENCAST_REPLAY__;
            await new Promise(resolve => {
                replay.recorder.addEventListener('stop', resolve, { once: true });
                replay.recorder.stop();
            });
            replay.stream.getTracks().forEach(track => track.stop());
            const blob = new Blob(replay.chunks, { type: replay.mime });
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            return btoa(binary);
        })()`);
        if (lowOverheadCapture) {
            fs.copyFileSync(rawCanvasVideoPath, videoPath);
        } else {
            fs.writeFileSync(videoPath, Buffer.from(visibleVideoBase64, 'base64'));
        }
        await screenshot(afterPath);

        const presentationTimeline = await evaluate(`window.__DEV_PRESENTATION_TIMELINE__ || []`);
        const presentationState = await evaluate(`window.__DEV_PRESENTATION_STATE__ || null`);
        const presentationIntent = await evaluate(`window.__DOMINION_PENDING_PRESENTATION_OPERATION__ || null`);
        const lastExpandResult = await evaluate(`window.__DOMINION_LAST_EXPAND_RESULT__ || null`);
        const focusCandidates = await evaluate(`window.__DOMINION_FOCUS_CANDIDATES__ || []`);
        const focusDiagnostic = await evaluate(`window.__DOMINION_FOCUS_DIAGNOSTIC__ || null`);
        const firstTransitionStart = (presentationTimeline || []).reduce(
            (min, entry) => Math.min(min, Number(entry.transitionStartTime)),
            Number.POSITIVE_INFINITY,
        );
        const targetCell = Number(target?.cell);
        const playerTransitionGroups = Object.values((presentationTimeline || [])
            .filter(entry => Number(entry.newOwner) === 101)
            .reduce((groups, entry) => {
                const group = groups[entry.transitionId] ||= [];
                group.push(entry);
                return groups;
            }, {}));
        const targetTransitionGroup = playerTransitionGroups
            .filter(entries => entries.some(entry => entries.some(frame =>
                frame.layerProgresses?.some(layer => Number(layer.cell) === targetCell))))
            .sort((a, b) => Number(a[0].transitionStartTime) - Number(b[0].transitionStartTime))
            .at(-1) || [];
        const operationTransitionId = targetTransitionGroup[0]?.transitionId || null;
        const operationEntries = operationTransitionId
            ? (presentationTimeline || []).filter(entry => entry.transitionId === operationTransitionId)
            : [];
        const operationTransitionStart = operationEntries.reduce(
            (min, entry) => Math.min(min, Number(entry.transitionStartTime)),
            Number.POSITIVE_INFINITY,
        );
        const firstTransitionVideoOffsetMS = Number.isFinite(operationTransitionStart)
            ? operationTransitionStart - Number(recordInfo.performanceNow)
            : 0;
        const extractionStartMS = Math.max(0, firstTransitionVideoOffsetMS - 33.333);
        const extractionTimesMS = Array.from({ length: 16 }, (_, index) => extractionStartMS + index * 33.333);
        const extractedFrames = await evaluate(`(async () => {
            const state = window.__PRESENTATION_RECORDING__;
            const blob = new Blob(state.chunks, { type: state.mime });
            const url = URL.createObjectURL(blob);
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true;
            video.playsInline = true;
            video.src = url;
            await new Promise((resolve, reject) => {
                video.addEventListener('loadedmetadata', resolve, { once: true });
                video.addEventListener('error', () => reject(new Error('Recorded WebM decode failed')), { once: true });
            });
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d', { alpha: false });
            const times = ${JSON.stringify(extractionTimesMS)};
            const frames = [];
            video.currentTime = 0;
            await video.play();
            // Consume decoded frames in presentation order. Sampling
            // currentTime with a polling loop can capture the same decoded
            // frame several times after a seek/decoder overshoot, which is
            // unsuitable for consecutive-frame visual acceptance.
            await new Promise((resolve, reject) => {
                let nextTarget = Math.max(0, times[0] ?? 0) / 1000;
                const capture = (_now, metadata) => {
                    const mediaTime = Number(metadata?.mediaTime ?? video.currentTime);
                    if (mediaTime >= nextTarget && frames.length < 16) {
                        context.drawImage(video, 0, 0);
                        frames.push({ tMs: mediaTime * 1000, dataUrl: canvas.toDataURL('image/png') });
                        nextTarget = mediaTime + (1 / 30);
                    }
                    if (frames.length >= 16 || mediaTime >= video.duration - 0.01) {
                        video.pause();
                        resolve();
                        return;
                    }
                    if (video.requestVideoFrameCallback) {
                        video.requestVideoFrameCallback(capture);
                    } else {
                        requestAnimationFrame(() => capture(performance.now(), { mediaTime: video.currentTime }));
                    }
                };
                if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(capture);
                else requestAnimationFrame(() => capture(performance.now(), { mediaTime: video.currentTime }));
            });
            video.pause();
            URL.revokeObjectURL(url);
            return { durationSeconds: video.duration, width: video.videoWidth, height: video.videoHeight, frames };
        })()`);
        const extractedFramePaths = [];
        for (let i = 0; i < extractedFrames.frames.length; i++) {
            const frame = extractedFrames.frames[i];
            const framePath = `${outDir}/italy_focus_12pct_presentation_video30fps_${String(i).padStart(2, '0')}.png`;
            fs.writeFileSync(framePath, Buffer.from(frame.dataUrl.split(',')[1], 'base64'));
            extractedFramePaths.push({ index: i, tMs: frame.tMs, path: framePath });
        }
        const transitionSummaries = Object.values((presentationTimeline || []).reduce((groups, entry) => {
            const group = groups[entry.transitionId] ||= [];
            group.push(entry);
            return groups;
        }, {})).map(entries => {
            const first = entries[0];
            const last = entries[entries.length - 1];
            return {
                transitionId: first.transitionId,
                oldOwner: first.oldOwner,
                newOwner: first.newOwner,
                authorizedCellCount: first.authorizedCellCount,
                frameCount: entries.length,
                durationMS: last.performanceNow - first.transitionStartTime,
                firstProgress: first.transitionProgress,
                lastProgress: last.transitionProgress,
                firstRevealRatio: first.revealRatio,
                lastRevealRatio: last.revealRatio,
                firstBasePoliticalTextureRevision: first.basePoliticalTextureRevision,
                lastBasePoliticalTextureRevision: last.basePoliticalTextureRevision,
                firstOwnerBufferRevision: first.ownerBufferRevision,
                lastOwnerBufferRevision: last.ownerBufferRevision,
                firstTransitionTextureRevision: first.transitionTextureRevision,
                lastTransitionTextureRevision: last.transitionTextureRevision,
                entries,
            };
        });

        const finalState = await evaluate(`(() => {
            const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
            const factions = gs?.factions;
            const me = factions?.get?.(gs?.yourFactionId);
            return {
                population: document.getElementById('hud-population')?.textContent?.trim(),
                actionText: document.body.innerText.slice(-500),
                nations: document.getElementById('hud-faction-count')?.textContent?.trim(),
                yourFactionId: gs?.yourFactionId ?? null,
                cellCount: me?.cellCount ?? null,
            };
        })()`);
        const runtimePerf = await evaluate(`({
            presentationProfile: window.__DOMINION_PRESENTATION_PROFILE__ || {},
            framePerf: window.__DOMINION_FRAME_PERF__?.snapshot?.() || null,
            transitionMetrics: window.__DEV_TRANSITION_METRICS__ || null,
        })`);
        const fieldProbe = await evaluate(`(() => {
            const gs = window.__DOMINION_GAME_STATE__ || window.gameState;
            const renderer = window.__DOMINION_RENDERER__;
            const field = renderer?.surface?.field;
            const extra = [
                123546, 124569, 124568, 125593,
            ];
            const unique = [...new Set(extra)];
            const sample = {};
            for (const cell of unique) {
                sample[cell] = {
                    x: cell % (gs?.width || 1024),
                    y: Math.floor(cell / (gs?.width || 1024)),
                    terrain: gs?.cellTerrains?.[cell] ?? null,
                    owner: gs?.cellOwners?.[cell] ?? null,
                };
            }
            const grid = [];
            if (field) {
                for (let y = 115; y < 127; y++) {
                    for (let x = 661; x < 673; x++) {
                        let land = 0;
                        let raw = 0;
                        let smoothed = 0;
                        const mapped = {};
                        for (let py = y * 4; py < (y + 1) * 4; py++) {
                            for (let px = x * 4; px < (x + 1) * 4; px++) {
                                const i = py * field.width + px;
                                if (field.land[i]) land++;
                                if (field.rawOwners[i] === 101) raw++;
                                if (field.owners[i] === 101) smoothed++;
                                const mappedCell = field.gameplayCellForVisualPixel(px, py);
                                mapped[mappedCell] = (mapped[mappedCell] || 0) + 1;
                            }
                        }
                        grid.push({ x, y, land, raw, smoothed, mapped });
                    }
                }
            }
            return {
                fieldWidth: field?.width ?? null,
                fieldHeight: field?.height ?? null,
                fieldScale: renderer?.surface?.field?.width && gs?.width ? field.width / gs.width : null,
                cells: sample,
                grid,
            };
        })()`);

        const metadata = {
            generatedAt: new Date().toISOString(),
            build: '3aafae791368f45555714ac5f12d8cb665c5a8bf',
            input: 'real CDP browser surface pointer events',
            projection: 'FLAT',
            doctrine: 'FOCUS',
            commitPercent: 12,
            target,
            cameraInfo,
            cameraAfterZoom,
            canvasRect,
            recordStartedBeforeDoubleClick: true,
            recordInfo,
            durationSeconds: (Date.now() - startedAt) / 1000,
            cadenceUnchanged: true,
            preview,
            finalState,
            browserDiagnostics: browserDiagnostics.filter(item => String(item.text).includes('DOMINION_SHADER_PROBE')).slice(-20),
            video: videoPath,
            rawCanvasVideo: rawCanvasVideoPath,
            frames: { before: beforePath, mid: midPath, after: afterPath },
            timelineFrames,
            presentationTimeline,
            presentationState,
            presentationIntent,
            lastExpandResult,
            focusCandidates,
            focusDiagnostic,
            runtimePerf,
            fieldProbe,
            compositingProbe,
            transitionSummaries,
            operationTransitionStart,
            operationTransitionId,
            operationTransitionEntryCount: operationEntries.length,
            contactSheetInput: frameDir,
            visibleReplayInfo,
            visibleScreencast: {
                startedAt: screencastStartedAt,
                frameCount: screencastFrames.length,
                frames: screencastFrames,
            },
            video30fpsExtraction: {
                startMS: extractionStartMS,
                requestedTimesMS: extractionTimesMS,
                durationSeconds: extractedFrames.durationSeconds,
                width: extractedFrames.width,
                height: extractedFrames.height,
                frames: extractedFramePaths,
            },
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(JSON.stringify({ videoPath, beforePath, midPath, afterPath, metadataPath, recordInfo, preview, finalState, browserDiagnostics: browserDiagnostics.filter(item => String(item.text).includes('DOMINION_SHADER_PROBE')).slice(-20) }, null, 2));
    } finally {
        try { ws?.close(); } catch {}
        chrome?.kill();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
