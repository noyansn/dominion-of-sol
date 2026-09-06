export class DebugHUD {
  private fpsEl: HTMLElement | null;
  private frameTimeEl: HTMLElement | null;
  private tickEl: HTMLElement | null;
  private tickTimeEl: HTMLElement | null;
  private deltasEl: HTMLElement | null;
  private botsEl: HTMLElement | null;
  private netEl: HTMLElement | null;

  private frameCount = 0;
  private lastFpsUpdate = performance.now();
  private lastFrameTime = performance.now();

  constructor() {
    this.fpsEl = document.getElementById('fps-val');
    this.frameTimeEl = document.getElementById('frame-time-val');
    this.tickEl = document.getElementById('tick-val');
    this.tickTimeEl = document.getElementById('tick-time-val');
    this.deltasEl = document.getElementById('deltas-val');
    this.botsEl = document.getElementById('bots-val');
    this.netEl = document.getElementById('net-val');
  }

  public updateFrame() {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;

    if (now - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      if (this.fpsEl) this.fpsEl.textContent = fps.toString();
      if (this.frameTimeEl) this.frameTimeEl.textContent = `${frameTime.toFixed(1)} ms`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public updateServerMetrics(metrics: {
    tick: number;
    tickTimeMs: number;
    activePlayers: number;
    botCount: number;
    deltasCount: number;
  }) {
    if (this.tickEl) this.tickEl.textContent = metrics.tick.toString();
    if (this.tickTimeEl) this.tickTimeEl.textContent = `${metrics.tickTimeMs.toFixed(2)} ms`;
    if (this.deltasEl) this.deltasEl.textContent = metrics.deltasCount.toString();
    if (this.botsEl) this.botsEl.textContent = metrics.botCount.toString();
  }

  public setConnectionStatus(connected: boolean) {
    if (this.netEl) {
      this.netEl.textContent = connected ? 'Connected (ws://127.0.0.1:8765)' : 'Disconnected';
      this.netEl.style.color = connected ? '#4ade80' : '#f43f5e';
    }
  }
}
