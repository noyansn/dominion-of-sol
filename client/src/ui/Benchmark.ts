import { terrainLodManager } from '../render/TerrainLodManager';
import { getFramePerfSnapshot, resetFramePerf } from './FramePerf';
import { getRenderProfileSnapshot } from './RenderProfile';
import { gameState } from '../game/GameState';

export interface DominionBenchmarkResult {
  durationMs: number;
  warmupMs: number;
  frames: number;
  avgFps: number;
  avgFrameMs: number;
  medianFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  terrainSource: string;
  residentTiles: number;
  visibleTiles: number;
  visibleLabels: number;
  cameraScale: number;
  projection: 'FLAT' | 'GLOBE';
  rendererResolution: number;
  viewport: { width: number; height: number };
  DPR: number;
  mapRenderDPR: number;
  device: { userAgent: string; hardwareConcurrency: number; maxTouchPoints: number };
  frontCount: number;
  activeCombatFrames: number;
  multiFrontFrames: number;
  activeCombatCoverage: number;
  hiddenFrames: number;
  sampleValid: boolean;
  invalidReasons: string[];
  cameraPosition: { x: number; y: number };
  visibleWorldFraction: number;
  politicalDirtyPixelsPerFrame: number;
  systemTimings: ReturnType<typeof getFramePerfSnapshot>['systems'];
  gpu: { webglVersion: string; vendor: string; renderer: string };
}

declare global {
  interface Window {
    __DOMINION_BENCHMARK__?: {
      running: boolean;
      start: (durationMs?: number) => Promise<DominionBenchmarkResult>;
      showPanel: () => void;
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function gpuInfo(renderer: any): { webglVersion: string; vendor: string; renderer: string } {
  const gl = renderer?.gl ?? null;
  if (!gl) return { webglVersion: 'UNAVAILABLE', vendor: 'UNAVAILABLE', renderer: 'UNAVAILABLE' };
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webglVersion: String(gl.getParameter(gl.VERSION) ?? 'UNAVAILABLE'),
      vendor: String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) ?? 'UNAVAILABLE'),
      renderer: String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) ?? 'UNAVAILABLE'),
    };
  } catch {
    return { webglVersion: 'GENERIC/UNAVAILABLE', vendor: 'GENERIC/UNAVAILABLE', renderer: 'GENERIC/UNAVAILABLE' };
  }
}

export function installDominionBenchmark(): void {
  if (!(import.meta as any).env?.DEV || window.__DOMINION_BENCHMARK__) return;

  const panel = document.createElement('section');
  panel.id = 'dominion-benchmark-panel';
  panel.hidden = true;
  Object.assign(panel.style, {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    width: 'min(560px, calc(100vw - 36px))',
    zIndex: '10000',
    padding: '14px',
    border: '1px solid rgba(56,189,248,.45)',
    borderRadius: '8px',
    background: 'rgba(3, 10, 18, .96)',
    color: '#dbeafe',
    font: '12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace',
    boxShadow: '0 12px 40px rgba(0,0,0,.45)',
  });
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
      <strong>DOMINION DEV BENCHMARK</strong>
      <button type="button" data-benchmark-close style="background:none;border:0;color:#94a3b8;cursor:pointer;font:inherit">close</button>
    </div>
    <div data-benchmark-status style="color:#7dd3fc;margin-bottom:8px">Ready — F2 runs 2s warmup + 10s sample</div>
    <textarea data-benchmark-output readonly spellcheck="false" style="display:block;width:100%;height:220px;box-sizing:border-box;resize:vertical;background:#07131c;color:#e2e8f0;border:1px solid #334155;border-radius:4px;padding:8px;font:inherit"></textarea>
    <div style="display:flex;justify-content:flex-end;margin-top:8px">
      <button type="button" data-benchmark-copy style="background:#0e7490;color:#ecfeff;border:1px solid #22d3ee;border-radius:4px;padding:5px 9px;cursor:pointer;font:inherit">Copy JSON</button>
    </div>`;
  document.body.appendChild(panel);

  const status = panel.querySelector<HTMLElement>('[data-benchmark-status]')!;
  const output = panel.querySelector<HTMLTextAreaElement>('[data-benchmark-output]')!;
  const setVisible = (visible: boolean) => { panel.hidden = !visible; };
  panel.querySelector<HTMLButtonElement>('[data-benchmark-close]')!.addEventListener('click', () => setVisible(false));
  panel.querySelector<HTMLButtonElement>('[data-benchmark-copy]')!.addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'Copied benchmark JSON to clipboard.';
    } catch {
      output.focus();
      output.select();
      status.textContent = 'Clipboard permission unavailable; JSON selected for manual copy.';
    }
  });

  const benchmark = {
      running: false,
    showPanel: () => setVisible(true),
    start(durationMs = 10000): Promise<DominionBenchmarkResult> {
      if (benchmark.running) {
        return Promise.reject(new Error('DOMINION_BENCHMARK is already running'));
      }

      const sampleDurationMs = Math.max(10000, Math.floor(durationMs));
      const warmupMs = 2000;
      benchmark.running = true;
      status.textContent = `Running — 2s warmup + ${Math.round(sampleDurationMs / 1000)}s sample...`;
      output.value = '';

      return new Promise<DominionBenchmarkResult>((resolve) => {
        const frameTimes: number[] = [];
        const startedAt = performance.now();
        let previousFrameAt = startedAt;
        let sampleStartedAt: number | null = null;
        let hiddenFrames = 0, activeCombatFrames = 0, multiFrontFrames = 0;
        const initialRenderer = (window as any).__DOMINION_RENDERER__;
        const initialCamera = [initialRenderer?.worldContainer?.x, initialRenderer?.worldContainer?.y,
          initialRenderer?.worldContainer?.scale?.x, window.innerWidth, window.innerHeight];

        const collect = (now: number) => {
          const elapsed = now - startedAt;
          const frameMs = now - previousFrameAt;
          previousFrameAt = now;

          if (sampleStartedAt === null && elapsed >= warmupMs) {
            sampleStartedAt = now;
            resetFramePerf();
          } else if (sampleStartedAt !== null) {
            frameTimes.push(frameMs);
            if (document.visibilityState !== 'visible') hiddenFrames++;
            let active = 0;
            for (const front of gameState.fronts.values()) if (front.isCombatActive) active++;
            if (active > 0) activeCombatFrames++;
            if (active > 1) multiFrontFrames++;
          }

          if (sampleStartedAt === null || now - sampleStartedAt < sampleDurationMs) {
            requestAnimationFrame(collect);
            return;
          }

          const sorted = [...frameTimes].sort((a, b) => a - b);
          const measuredDurationMs = Math.max(1, now - sampleStartedAt);
          const totalFrameMs = frameTimes.reduce((sum, value) => sum + value, 0);
          const renderer = (window as any).__DOMINION_RENDERER__;
          const perf = getFramePerfSnapshot();
          const profile = getRenderProfileSnapshot();
          const camera = renderer?.worldContainer;
          const scale = camera?.scale?.x || 1;
          const visibleWidth = Math.max(0, Math.min(window.innerWidth, camera.x + gameState.width * scale) - Math.max(0, camera.x));
          const visibleHeight = Math.max(0, Math.min(window.innerHeight, camera.y + gameState.height * scale) - Math.max(0, camera.y));
          const visibleWorldFraction = visibleWidth * visibleHeight / (window.innerWidth * window.innerHeight);
          const invalidReasons: string[] = [];
          if (!gameState.isInitialized || !gameState.isConnected) invalidReasons.push('No connected authoritative snapshot');
          if (hiddenFrames > 0) invalidReasons.push('Document hidden during sample');
          if (!renderer?.isGlobeMode && visibleWorldFraction < 0.2) invalidReasons.push('Camera mostly outside world');
          const finalCamera = [camera?.x, camera?.y, scale, window.innerWidth, window.innerHeight];
          if (initialCamera.some((v, i) => v !== finalCamera[i])) invalidReasons.push('Camera/viewport changed during measurement');
          const result: DominionBenchmarkResult = {
            durationMs: Math.round(measuredDurationMs),
            warmupMs,
            frames: frameTimes.length,
            avgFps: round(frameTimes.length * 1000 / measuredDurationMs),
            avgFrameMs: round(totalFrameMs / Math.max(1, frameTimes.length)),
            medianFrameMs: round(percentile(sorted, 0.50)),
            p95FrameMs: round(percentile(sorted, 0.95)),
            p99FrameMs: round(percentile(sorted, 0.99)),
            terrainSource: terrainLodManager.currentLevel,
            residentTiles: terrainLodManager.residentTileCount,
            visibleTiles: terrainLodManager.visibleTileCount,
            visibleLabels: renderer?.labels?.visibleLabelCount ?? 0,
            cameraScale: round(renderer?.worldContainer?.scale?.x ?? 0),
            projection: renderer?.isGlobeMode ? 'GLOBE' : 'FLAT',
            rendererResolution: round(renderer?.app?.renderer?.resolution ?? 0),
            viewport: { width: window.innerWidth, height: window.innerHeight },
            DPR: round(window.devicePixelRatio || 1),
            mapRenderDPR: round(profile.mapRenderDPR),
            device: {
              userAgent: navigator.userAgent,
              hardwareConcurrency: navigator.hardwareConcurrency || 0,
              maxTouchPoints: navigator.maxTouchPoints || 0,
            },
            frontCount: [...gameState.fronts.values()].filter((front) => front.isCombatActive).length,
            activeCombatFrames,
            multiFrontFrames,
            activeCombatCoverage: round(activeCombatFrames / Math.max(1, frameTimes.length)),
            hiddenFrames,
            sampleValid: invalidReasons.length === 0,
            invalidReasons,
            cameraPosition: { x: round(camera?.x ?? 0), y: round(camera?.y ?? 0) },
            visibleWorldFraction: round(visibleWorldFraction),
            politicalDirtyPixelsPerFrame: round(perf.politicalDirtyPixels / Math.max(1, frameTimes.length)),
            systemTimings: Object.fromEntries(Object.entries(perf.systems).map(([name, timing]) => [name, {
              count: timing.count,
              totalMs: round(timing.totalMs),
              maxMs: round(timing.maxMs),
            }])),
            gpu: gpuInfo(renderer?.app?.renderer),
          };

          benchmark.running = false;
          setVisible(true);
          output.value = JSON.stringify(result, null, 2);
          status.textContent = `Complete — ${result.frames} frames, ${result.avgFps} FPS average.`;
          console.log('[BENCHMARK] DOMINION result', result);
          resolve(result);
        };

        requestAnimationFrame(collect);
      });
    },
  };

  window.__DOMINION_BENCHMARK__ = benchmark;
  window.addEventListener('keydown', (event) => {
    if (!event.shiftKey || event.key !== 'F2') return;
    event.preventDefault();
    void benchmark.start(10000);
  });
  console.log('[BENCHMARK] ready: Shift+F2 or window.__DOMINION_BENCHMARK__.start(10000)');
}
