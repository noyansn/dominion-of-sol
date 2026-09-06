export type RenderProfileMode = 'AUTO' | 'DESKTOP' | 'MOBILE_PROXY';

let mode: RenderProfileMode = 'AUTO';
let applyProfile: (() => void) | undefined;

function isCoarseSmallViewport(): boolean {
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const touch = Number((navigator as any).maxTouchPoints ?? 0) > 0;
  return (coarse || touch) && Math.min(window.innerWidth, window.innerHeight) <= 900;
}

export function getMapRenderDPR(): number {
  const dpr = window.devicePixelRatio || 1;
  if (mode === 'MOBILE_PROXY' || (mode === 'AUTO' && isCoarseSmallViewport())) {
    return Math.min(dpr, 1.25);
  }
  // At Windows' common 125% desktop scaling a 1.25x Pixi framebuffer costs
  // 56% more shaded pixels than the CSS map itself. The command UI remains
  // native DOM at the full browser DPR; this only removes invisible map
  // supersampling on a large screen, where the strategic view is already
  // represented at its natural CSS resolution.
  if (dpr > 1 && dpr <= 1.25 && Math.max(window.innerWidth, window.innerHeight) >= 1200) {
    return 1;
  }
  return Math.min(dpr, 2);
}

export function getRenderProfileSnapshot() {
  return {
    mode,
    mobileProfile: mode === 'MOBILE_PROXY' || (mode === 'AUTO' && isCoarseSmallViewport()),
    mapRenderDPR: getMapRenderDPR(),
    uiDPR: window.devicePixelRatio || 1,
  };
}

export function registerRenderProfileApplier(applier: () => void): void {
  applyProfile = applier;
}

export function installRenderProfileApi(): void {
  if (!(import.meta as any).env?.DEV || (window as any).__DOMINION_RENDER_PROFILE__) return;
  (window as any).__DOMINION_RENDER_PROFILE__ = {
    get mode() { return mode; },
    get mobileProfile() { return getRenderProfileSnapshot().mobileProfile; },
    get mapRenderDPR() { return getMapRenderDPR(); },
    get uiDPR() { return window.devicePixelRatio || 1; },
    setMode(next: RenderProfileMode) {
      mode = next;
      applyProfile?.();
      return getRenderProfileSnapshot();
    },
    snapshot: () => getRenderProfileSnapshot(),
  };
  console.log('[RENDER PROFILE] ready: window.__DOMINION_RENDER_PROFILE__.setMode(\'MOBILE_PROXY\')');
}
