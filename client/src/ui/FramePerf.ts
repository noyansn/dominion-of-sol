export interface PerfTimingSummary {
  count: number;
  totalMs: number;
  maxMs: number;
  avgMs?: number;
  p95Ms?: number;
  p99Ms?: number;
  samples?: number[];
}

interface PerfAccumulator {
  count: number;
  totalMs: number;
  maxMs: number;
  samples: number[];
}

const accumulators = new Map<string, PerfAccumulator>();
let dirtyPixelsTotal = 0;
let dirtyUpdateCount = 0;

function accumulator(name: string): PerfAccumulator {
  let value = accumulators.get(name);
  if (!value) {
    value = { count: 0, totalMs: 0, maxMs: 0, samples: [] };
    accumulators.set(name, value);
  }
  return value;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function measureFrameSystem<T>(name: string, fn: () => T): T {
  if (!(import.meta as any).env?.DEV
    || (typeof window !== 'undefined' && (window as any).__DOMINION_FRAME_PROFILING_ENABLED__ === false)) {
    return fn();
  }
  const startedAt = performance.now();
  try {
    return fn();
  } finally {
    const elapsed = performance.now() - startedAt;
    const result = accumulator(name);
    result.count++;
    result.totalMs += elapsed;
    result.maxMs = Math.max(result.maxMs, elapsed);
    if (result.samples.length >= 256) result.samples.shift();
    result.samples.push(elapsed);
  }
}

export function recordPoliticalDirtyPixels(pixels: number): void {
  if (!(import.meta as any).env?.DEV) return;
  dirtyPixelsTotal += Math.max(0, pixels);
  dirtyUpdateCount++;
}

export function resetFramePerf(): void {
  accumulators.clear();
  dirtyPixelsTotal = 0;
  dirtyUpdateCount = 0;
}

export function getFramePerfSnapshot() {
  const systems: Record<string, PerfTimingSummary> = {};
  for (const [name, value] of accumulators) {
    systems[name] = {
      count: value.count,
      totalMs: Number(value.totalMs.toFixed(2)),
      maxMs: Number(value.maxMs.toFixed(2)),
      avgMs: Number((value.totalMs / Math.max(1, value.count)).toFixed(3)),
      p95Ms: Number(percentile([...value.samples].sort((a, b) => a - b), 0.95).toFixed(3)),
      p99Ms: Number(percentile([...value.samples].sort((a, b) => a - b), 0.99).toFixed(3)),
      samples: [...value.samples],
    };
  }
  return {
    systems,
    politicalDirtyPixels: dirtyPixelsTotal,
    politicalDirtyUpdates: dirtyUpdateCount,
  };
}

declare global {
  interface Window {
    __DOMINION_FRAME_PERF__?: {
      reset: () => void;
      snapshot: () => ReturnType<typeof getFramePerfSnapshot>;
    };
  }
}

if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
  window.__DOMINION_FRAME_PERF__ = { reset: resetFramePerf, snapshot: getFramePerfSnapshot };
}
