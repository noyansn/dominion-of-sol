import { TargetResolution } from '../game/TargetResolver';

export interface PickingInspectorState {
  enabled: boolean;
  last: TargetResolution | null;
  toggle: () => boolean;
  setEnabled: (enabled: boolean) => void;
}

declare global {
  interface Window {
    __DOMINION_PICKING_INSPECTOR__?: PickingInspectorState;
  }
}

function formatReport(report: TargetResolution | null): string {
  if (!report) return 'PICKING INSPECTOR\nNo pointer sample yet.';
  return [
    'PICKING INSPECTOR · DEV ONLY',
    `screen ${Math.round(report.screenX ?? 0)}, ${Math.round(report.screenY ?? 0)}`,
    `world ${report.worldX.toFixed(2)}, ${report.worldY.toFixed(2)} · lon ${report.longitude.toFixed(2)} · lat ${report.latitude.toFixed(2)}`,
    `canonical ${report.canonicalLand ? 'LAND' : 'WATER'} · visual ${report.visualComponentId}`,
    `raw ${report.rawCell} · resolved ${report.resolvedCell ?? '—'} · owner ${report.ownerId}`,
    `relation ${report.relation} · action ${report.action}`,
    `source ${report.sourceCell ?? '—'} · target ${report.targetCell ?? '—'} · anchor ${report.nearestLegalAnchor ?? '—'}`,
    `reason ${report.rejectionReason ?? '—'}`,
  ].join('\n');
}

export function installPickingInspector(): void {
  if (!(import.meta as any).env?.DEV || window.__DOMINION_PICKING_INSPECTOR__) return;

  const panel = document.createElement('pre');
  panel.id = 'dominion-picking-inspector';
  panel.hidden = true;
  Object.assign(panel.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    zIndex: '10001',
    margin: '0',
    padding: '10px 12px',
    maxWidth: 'min(560px, calc(100vw - 24px))',
    background: 'rgba(2, 8, 16, .93)',
    color: '#d6f7ff',
    border: '1px solid rgba(34, 211, 238, .55)',
    borderRadius: '6px',
    font: '11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
  });
  document.body.appendChild(panel);

  const state: PickingInspectorState = {
    enabled: false,
    last: null,
    toggle: () => {
      state.enabled = !state.enabled;
      panel.hidden = !state.enabled;
      if (state.enabled) panel.textContent = formatReport(state.last);
      return state.enabled;
    },
    setEnabled: (enabled: boolean) => {
      state.enabled = enabled;
      panel.hidden = !enabled;
      if (enabled) panel.textContent = formatReport(state.last);
    },
  };
  window.__DOMINION_PICKING_INSPECTOR__ = state;

  (window as any).__DOMINION_PICKING_INSPECTOR_RECORD__ = (report: TargetResolution) => {
    state.last = report;
    if (state.enabled) panel.textContent = formatReport(report);
  };
  console.log('[PICKING] ready: window.__DOMINION_PICKING_INSPECTOR__.toggle()');
}

export function recordPickingReport(report: TargetResolution): void {
  const recorder = (window as any).__DOMINION_PICKING_INSPECTOR_RECORD__;
  if (typeof recorder === 'function') recorder(report);
}
