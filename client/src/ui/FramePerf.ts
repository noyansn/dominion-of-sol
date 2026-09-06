export interface PerfTimingSummary {
  count: number;
  totalMs: number;
  maxMs: number;
}

interface PerfAccumulator extends PerfTimingSummary {
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

export function measureFrameSystem<T>(name: string, fn: () => T): T {
  if (!(import.meta as any).env?.DEV) return fn();
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
