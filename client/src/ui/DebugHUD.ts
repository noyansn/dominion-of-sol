import { gameState } from '../game/GameState';

export class DebugHUD {
  private hudEl: HTMLElement | null = null;
  private isVisible: boolean = false; // Default closed as required
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private fps = 60;
  private frameTimeMs = 16.6;
  private lastPerfFrameAt = performance.now();
  private lastPerfSampleAt = performance.now();
  private perfFrameCount = 0;
  private perfFrameTimeTotal = 0;
  private perfWorstFrameMs = 0;

  constructor() {
    this.hudEl = document.getElementById('debug-hud');
    if (this.hudEl) {
      this.hudEl.style.display = 'none'; // Default hidden
    }

    this.setupListeners();
    gameState.subscribe(() => this.updateData());
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.isVisible = !this.isVisible;
        if (this.hudEl) {
          this.hudEl.style.display = this.isVisible ? 'block' : 'none';
        }
        this.updateData();
      }
    });
  }

  public updateFrame() {
    const now = performance.now();
    const frameDelta = Math.max(0, now - this.lastPerfFrameAt);
    this.lastPerfFrameAt = now;
    this.perfFrameCount++;
    this.perfFrameTimeTotal += frameDelta;
    this.perfWorstFrameMs = Math.max(this.perfWorstFrameMs, frameDelta);
    this.frameCount++;
    const delta = now - this.lastFpsTime;

    if (now - this.lastPerfSampleAt >= 1000) {
      (window as any).__DOMINION_PERF__ = {
        sampleMs: now - this.lastPerfSampleAt,
        averageFps: Math.round((this.perfFrameCount * 1000) / Math.max(1, now - this.lastPerfSampleAt)),
        averageFrameMs: this.perfFrameCount > 0 ? this.perfFrameTimeTotal / this.perfFrameCount : 0,
        worstFrameMs: this.perfWorstFrameMs,
        frames: this.perfFrameCount,
      };
      this.lastPerfSampleAt = now;
      this.perfFrameCount = 0;
      this.perfFrameTimeTotal = 0;
      this.perfWorstFrameMs = 0;
    }

    if (delta >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameTimeMs = parseFloat((delta / this.frameCount).toFixed(1));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.isVisible) {
        this.updateData();
      }
    }
  }

  public updateData() {
    if (!this.hudEl || !this.isVisible) return;

    const fpsEl = document.getElementById('dbg-fps');
    const frameTimeEl = document.getElementById('dbg-frametime');
    const statusEl = document.getElementById('dbg-status');
    const tickEl = document.getElementById('dbg-tick');
    const deltasEl = document.getElementById('dbg-deltas');
    const playersEl = document.getElementById('dbg-players');
    const botsEl = document.getElementById('dbg-bots');
    const ramEl = document.getElementById('dbg-ram');

    if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
    if (frameTimeEl) frameTimeEl.textContent = `${this.frameTimeMs} ms`;

    if (statusEl) {
      statusEl.textContent = gameState.connectionStatusText;
      statusEl.className = gameState.isConnected ? 'is-connected' : 'is-disconnected';
    }

    if (tickEl) tickEl.textContent = `#${gameState.tick}`;
    if (deltasEl) deltasEl.textContent = `${gameState.deltasReceivedTotal}`;
    if (playersEl) playersEl.textContent = `${gameState.metrics.activePlayers}`;
    if (botsEl) botsEl.textContent = `${gameState.metrics.botCount}`;
    if (ramEl) ramEl.textContent = `${gameState.metrics.ramUsageMb} MB`;
  }
}
