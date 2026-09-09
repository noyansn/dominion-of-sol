import { spawn } from 'node:child_process';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cdpPort = Number(process.argv[2] || 9240);
const targetUrl = process.argv[3] || 'http://127.0.0.1:5180/';
const cases = [
    ['WORLD', 'off'], ['WORLD', 'on'],
    ['REGIONAL', 'off'], ['REGIONAL', 'on'],
    ['CLOSE', 'off'], ['CLOSE', 'on'],
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForDevTools(port) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/json/version`);
            if (response.ok) return;
        } catch {}
        await sleep(250);
    }
    throw new Error(`Timed out waiting for Chrome CDP on ${port}`);
}
function runProbe(port, view, profiling) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            'tools/chrome_benchmark_probe.mjs',
            String(port), view, 'preserve', targetUrl, profiling,
        ], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk.toString(); });
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.once('error', reject);
        child.once('exit', code => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);
                    const benchmark = JSON.parse(result.benchmark);
                    resolve(JSON.stringify({
                        port: result.port,
                        view: result.view,
                        profiling,
                        connected: JSON.parse(result.before).state.connected,
                        initialized: JSON.parse(result.before).state.initialized,
                        benchmark: {
                            avgFps: benchmark.avgFps,
                            avgFrameMs: benchmark.avgFrameMs,
                            medianFrameMs: benchmark.medianFrameMs,
                            p95FrameMs: benchmark.p95FrameMs,
                            p99FrameMs: benchmark.p99FrameMs,
                            maxFrameMs: benchmark.maxFrameMs,
                            cameraScale: benchmark.cameraScale,
                            projection: benchmark.projection,
                            terrainSource: benchmark.terrainSource,
                            residentTiles: benchmark.residentTiles,
                            tileLoadCount: benchmark.lodMetrics?.tileLoadCount,
                            tileCacheHitCount: benchmark.lodMetrics?.tileCacheHitCount,
                            systemTimings: benchmark.systemTimings,
                            presentationProfile: benchmark.presentationProfile,
                        },
                    }, null, 2) + '\n');
                } catch (error) {
                    reject(new Error(`Could not summarize benchmark output: ${error.message}\n${stdout}`));
                }
            }
            else reject(new Error(`${view} ${profiling} exited ${code}\n${stderr}\n${stdout}`));
        });
    });
}

for (let index = 0; index < cases.length; index += 1) {
    const [view, profiling] = cases[index];
    const port = cdpPort + index;
    const profileDir = `C:/Users/noyan/Downloads/game/.tmp/chrome_benchmark_${Date.now()}_${index}`;
    fs.mkdirSync(profileDir, { recursive: true });
    const chrome = spawn(chromePath, [
        '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
        '--enable-webgl', '--use-gl=angle', '--force-device-scale-factor=1',
        '--hide-scrollbars', '--window-size=879,742',
        `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
        `--user-data-dir=${profileDir}`, targetUrl,
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
    try {
        await waitForDevTools(port);
        await sleep(8000);
        process.stdout.write(`\n=== ${view} ${profiling} ===\n`);
        process.stdout.write(await runProbe(port, view, profiling));
    } finally {
        chrome.kill();
        await sleep(500);
    }
}
