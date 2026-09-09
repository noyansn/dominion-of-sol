import * as PIXI from 'pixi.js';

export const FLAT_ZOOM_MIN = 0.25;
// The previous cap was 15x world scale. 30x is a measured close-inspection
// range: the visual tile pyramid can still cover the viewport without asking
// the authoritative grid or a global texture to increase in resolution.
export const FLAT_ZOOM_MAX = 30.0;

export interface WheelTelemetry {
  wheelHandlerCalls: number;
  zoomApplications: number;
  lastDeltaY: number;
  lastDeltaMode: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  direction: 'IN' | 'OUT' | 'NONE';
  factor: number;
  scaleBefore: number;
  requestedScale: number;
  appliedScale: number;
  appliedSameCall: number;
  nextFrameScale: number;
  clampMin: number;
  clampMax: number;
  isClamped: boolean;
  ignoredForUiScroll: boolean;
}

export const wheelTelemetry: WheelTelemetry = {
  wheelHandlerCalls: 0,
  zoomApplications: 0,
  lastDeltaY: 0,
  lastDeltaMode: 0,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  direction: 'NONE',
  factor: 1.0,
  scaleBefore: 1.0,
  requestedScale: 1.0,
  appliedScale: 1.0,
  appliedSameCall: 1.0,
  nextFrameScale: 1.0,
  clampMin: FLAT_ZOOM_MIN,
  clampMax: FLAT_ZOOM_MAX,
  isClamped: false,
  ignoredForUiScroll: false,
};

(window as any).__DEV_WHEEL_TELEMETRY__ = wheelTelemetry;

export const DOUBLE_ACTION_MAX_MS = 600;
export const DOUBLE_ACTION_MAX_SCREEN_DIST = 16;
export const DRAG_THRESHOLD_PX = 5;

export type PointerGestureState = 'IDLE' | 'PENDING_POINTER' | 'DRAGGING' | 'CLICK_CANDIDATE';

export interface MapClickGestureState {
  lastResolvedTargetId: number | null;
  lastResolvedCellX: number | null;
  lastResolvedCellY: number | null;
  lastClickTimeMs: number;
  lastScreenX: number;
  lastScreenY: number;
}

export class WorldInputController {
  public gestureState: PointerGestureState = 'IDLE';
  private activePointerId: number | null = null;
  private downPos = { x: 0, y: 0 };
  private lastPos = { x: 0, y: 0 };
  private downTimeMs = 0;
  private pinchDistance = 0;
  private secondaryPointerId: number | null = null;
  private secondaryPos = { x: 0, y: 0 };

  // Candidate tracking for single click preview vs double-click execution
  private clickCandidate: {
    time: number;
    screenX: number;
    screenY: number;
    targetKey: string | number | null;
    timer: number | null;
  } | null = null;

  public onTransformChange?: () => void;
  public onGlobeRotate?: (dx: number, dy: number) => void;
  public onGlobeDragEnd?: () => void;
  public onDragStart?: () => void;
  public onGlobePick?: (screenX: number, screenY: number) => void;
  public onFlatPick?: (screenX: number, screenY: number, worldX: number, worldY: number) => void;
  public onFlatHover?: (screenX: number, screenY: number, worldX: number, worldY: number) => void;
  public onDoublePick?: (screenX: number, screenY: number, worldX: number, worldY: number) => void;
  public onGlobeDoublePick?: (screenX: number, screenY: number) => void;
  public onGlobeZoom?: (factor: number) => void;
  public onUserInputStart?: () => void;
  public resolveTargetIdentity?: (screenX: number, screenY: number) => { key: string | number | null; actionable: boolean } | null;
  public globeMode = false;

  public legacyGestureState: MapClickGestureState = {
    lastResolvedTargetId: null,
    lastResolvedCellX: null,
    lastResolvedCellY: null,
    lastClickTimeMs: 0,
    lastScreenX: 0,
    lastScreenY: 0,
  };

  private onPointerDownHandler?: (e: PointerEvent) => void;
  private onPointerMoveHandler?: (e: PointerEvent) => void;
  private onPointerUpHandler?: (e: PointerEvent) => void;
  private onPointerCancelHandler?: (e: PointerEvent) => void;
  private onContextMenuHandler?: (e: MouseEvent) => void;
  private onWheelHandler?: (e: WheelEvent) => void;
  private zoomTargetScale: number | null = null;
  private zoomTargetX = 0;
  private zoomTargetY = 0;
  private zoomAnimationId: number | null = null;
  private zoomLastFrameAt = 0;

  constructor(private container: PIXI.Container, private canvas: HTMLCanvasElement) {}

  public clearClickCandidate(): void {
    if (this.clickCandidate) {
      if (this.clickCandidate.timer !== null) {
        window.clearTimeout(this.clickCandidate.timer);
      }
      this.clickCandidate = null;
    }
  }

  public setup() {
    if (this.onPointerDownHandler || this.onWheelHandler) return;
    this.canvas.style.touchAction = 'none';

    this.onPointerDownHandler = (e) => {
      if ((window as any).__DOMINION_MODAL_OPEN__) {
        return;
      }
      if (e.button !== 0) return; // Only primary button

      // Cancel auto-camera motion (intro, auto-pan), but DO NOT block human drag
      this.onUserInputStart?.();

      if (this.activePointerId === null) {
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch {}

        this.activePointerId = e.pointerId;
        this.downPos = { x: e.clientX, y: e.clientY };
        this.lastPos = { x: e.clientX, y: e.clientY };
        this.downTimeMs = performance.now();

        // Transition to PENDING_POINTER.
        // Keep existing clickCandidate alive in case this down+up completes double click!
        this.gestureState = 'PENDING_POINTER';
      } else if (this.secondaryPointerId === null && e.pointerId !== this.activePointerId) {
        // Multi-touch pinch zoom
        this.secondaryPointerId = e.pointerId;
        this.secondaryPos = { x: e.clientX, y: e.clientY };
        this.clearClickCandidate();
        this.gestureState = 'DRAGGING';
        this.pinchDistance = Math.hypot(e.clientX - this.lastPos.x, e.clientY - this.lastPos.y);
      }
    };

    this.onPointerMoveHandler = (e) => {
      if (this.activePointerId === e.pointerId) {
        const dx = e.clientX - this.lastPos.x;
        const dy = e.clientY - this.lastPos.y;
        this.lastPos = { x: e.clientX, y: e.clientY };

        const totalDist = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y);

        if (this.gestureState === 'PENDING_POINTER') {
          if (totalDist > DRAG_THRESHOLD_PX) {
            // DRAG WINS OVER CLICK:
            // Cancel pending click, cancel double-click candidate, do not select country or attack
            this.gestureState = 'DRAGGING';
            this.clearClickCandidate();
            this.onDragStart?.();
          }
        }

        if (this.gestureState === 'DRAGGING') {
          if (this.secondaryPointerId !== null) {
            // Pinch active
            const next = Math.hypot(this.lastPos.x - this.secondaryPos.x, this.lastPos.y - this.secondaryPos.y);
            if (this.pinchDistance > 0) {
              const midX = (this.lastPos.x + this.secondaryPos.x) * 0.5;
              const midY = (this.lastPos.y + this.secondaryPos.y) * 0.5;
              this.zoomAt(midX, midY, next / this.pinchDistance);
            }
            this.pinchDistance = next;
          } else {
            // Single pointer continuous drag
            if (this.globeMode) {
              this.onGlobeRotate?.(dx, dy);
              this.changed();
            } else {
              this.container.x += dx;
              this.container.y += dy;
              this.changed();
            }
          }
        }
      } else if (this.secondaryPointerId === e.pointerId) {
        this.secondaryPos = { x: e.clientX, y: e.clientY };
        if (this.activePointerId !== null) {
          const next = Math.hypot(this.lastPos.x - this.secondaryPos.x, this.lastPos.y - this.secondaryPos.y);
          if (this.pinchDistance > 0) {
            const midX = (this.lastPos.x + this.secondaryPos.x) * 0.5;
            const midY = (this.lastPos.y + this.secondaryPos.y) * 0.5;
            this.zoomAt(midX, midY, next / this.pinchDistance);
          }
          this.pinchDistance = next;
        }
      } else {
        // Unpressed hover tracking in flat mode
        if (!this.globeMode && (this.gestureState === 'IDLE' || this.gestureState === 'CLICK_CANDIDATE')) {
          const local = this.screenToLocal(e.clientX, e.clientY);
          this.onFlatHover?.(e.clientX, e.clientY, local.x, local.y);
        }
      }
    };

    this.onPointerUpHandler = (e) => {
      if (this.secondaryPointerId === e.pointerId) {
        this.secondaryPointerId = null;
        this.pinchDistance = 0;
        return;
      }
      if (this.activePointerId !== e.pointerId) return;

      try {
        if (this.canvas.hasPointerCapture(e.pointerId)) {
          this.canvas.releasePointerCapture(e.pointerId);
        }
      } catch {}

      this.activePointerId = null;

      if (this.gestureState === 'DRAGGING') {
        // Finished dragging: reset to IDLE, notify drag end for inertia
        if (this.globeMode) {
          this.onGlobeDragEnd?.();
        }
        this.gestureState = 'IDLE';
        return;
      }

      if (this.gestureState === 'PENDING_POINTER') {
        const now = performance.now();
        const candidate = this.clickCandidate;

        // Resolve target identity for double click compatibility
        const currentTarget = this.resolveTargetIdentity?.(e.clientX, e.clientY);
        const currentKey = currentTarget?.key ?? null;

        if (candidate !== null) {
          const dt = now - candidate.time;
          const dist = Math.hypot(e.clientX - candidate.screenX, e.clientY - candidate.screenY);
          const maxDist = this.globeMode ? DOUBLE_ACTION_MAX_SCREEN_DIST * 1.5 : DOUBLE_ACTION_MAX_SCREEN_DIST;
          const isTargetCompatible = (candidate.targetKey !== null && currentKey !== null)
            ? candidate.targetKey === currentKey
            : dist <= maxDist;

          if (dt <= DOUBLE_ACTION_MAX_MS && dist <= maxDist && isTargetCompatible) {
            // DOUBLE_ACTION: Second compatible click within threshold!
            console.log(`[GESTURE] DOUBLE CLICK MATCHED: dt=${Math.round(dt)}ms <= ${DOUBLE_ACTION_MAX_MS}ms, dist=${dist.toFixed(1)}px <= ${maxDist}px`);
            this.clearClickCandidate();
            this.gestureState = 'IDLE';
            this.handleDoubleExecution(e.clientX, e.clientY);
            return;
          }
        }

        // First click (or target mismatch): start candidate delay timer
        this.clearClickCandidate();

        const timer = window.setTimeout(() => {
          if (this.clickCandidate && this.clickCandidate.timer === timer) {
            const sx = this.clickCandidate.screenX;
            const sy = this.clickCandidate.screenY;
            this.clickCandidate = null;
            if (this.gestureState === 'CLICK_CANDIDATE') {
              this.gestureState = 'IDLE';
            }
            // SINGLE_ACTION: resolve semantic preview
            this.handlePrimaryClick(sx, sy);
          }
        }, DOUBLE_ACTION_MAX_MS);

        this.clickCandidate = {
          time: now,
          screenX: e.clientX,
          screenY: e.clientY,
          targetKey: currentKey,
          timer,
        };
        this.gestureState = 'CLICK_CANDIDATE';
      }
    };

    this.onPointerCancelHandler = (e) => {
      if (this.activePointerId === e.pointerId) {
        if (this.gestureState === 'DRAGGING' && this.globeMode) {
          this.onGlobeDragEnd?.();
        }
        try {
          if (this.canvas.hasPointerCapture(e.pointerId)) {
            this.canvas.releasePointerCapture(e.pointerId);
          }
        } catch {}
        this.activePointerId = null;
        this.secondaryPointerId = null;
        this.pinchDistance = 0;
        this.gestureState = 'IDLE';
        this.clearClickCandidate();
      }
    };

    this.onContextMenuHandler = (e) => e.preventDefault();
    this.canvas.addEventListener('pointerdown', this.onPointerDownHandler);
    this.canvas.addEventListener('pointermove', this.onPointerMoveHandler);
    this.canvas.addEventListener('pointerup', this.onPointerUpHandler);
    this.canvas.addEventListener('pointercancel', this.onPointerCancelHandler);
    this.canvas.addEventListener('contextmenu', this.onContextMenuHandler);

    // Single window-level listener with UI scroll protection (zero duplicate canvas listeners)
    this.onWheelHandler = (e: WheelEvent) => {
      wheelTelemetry.wheelHandlerCalls++;
      wheelTelemetry.lastDeltaY = e.deltaY;
      wheelTelemetry.lastDeltaMode = e.deltaMode;
      wheelTelemetry.ctrlKey = e.ctrlKey;
      wheelTelemetry.shiftKey = e.shiftKey;
      wheelTelemetry.altKey = e.altKey;

      if ((window as any).__DOMINION_MODAL_OPEN__) {
        e.preventDefault();
        wheelTelemetry.ignoredForUiScroll = true;
        return;
      }

      // Check if target is an interactive UI element that legitimately needs scroll/input
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
        const isScrollable = target.scrollHeight > target.clientHeight && (
          getComputedStyle(target).overflowY === 'auto' || getComputedStyle(target).overflowY === 'scroll'
        );
        if (isInput || isScrollable) {
          wheelTelemetry.ignoredForUiScroll = true;
          return; // Allow native scroll/input behavior
        }
      }

      wheelTelemetry.ignoredForUiScroll = false;
      e.preventDefault();

      let direction: 'IN' | 'OUT' | 'NONE' = 'NONE';
      let factor = 1.0;

      if (e.deltaY < 0) {
        direction = 'IN';
        factor = 1.15;
      } else if (e.deltaY > 0) {
        direction = 'OUT';
        factor = 1 / 1.15;
      } else {
        direction = 'NONE';
        factor = 1.0;
      }

      wheelTelemetry.direction = direction;
      wheelTelemetry.factor = factor;

      if (direction !== 'NONE') {
        this.zoomAt(e.clientX, e.clientY, factor);
      }
    };

    window.addEventListener('wheel', this.onWheelHandler, { passive: false });
  }


  public cancelZoomMotion(): void {
    if (this.zoomAnimationId !== null) {
      cancelAnimationFrame(this.zoomAnimationId);
      this.zoomAnimationId = null;
    }
    this.zoomTargetScale = null;
  }

  private animateZoom = (now: number): void => {
    if (this.zoomTargetScale === null) {
      this.zoomAnimationId = null;
      return;
    }
    const dt = Math.max(0, Math.min(80, now - this.zoomLastFrameAt));
    this.zoomLastFrameAt = now;
    const blend = 1 - Math.exp(-dt / 72);
    const scale = this.container.scale.x + (this.zoomTargetScale - this.container.scale.x) * blend;
    const x = this.container.x + (this.zoomTargetX - this.container.x) * blend;
    const y = this.container.y + (this.zoomTargetY - this.container.y) * blend;
    this.container.scale.set(scale);
    this.container.x = x;
    this.container.y = y;
    this.changed();

    const settled = Math.abs(this.zoomTargetScale - scale) < 0.0005
      && Math.abs(this.zoomTargetX - x) < 0.05
      && Math.abs(this.zoomTargetY - y) < 0.05;
    if (settled) {
      this.container.scale.set(this.zoomTargetScale);
      this.container.x = this.zoomTargetX;
      this.container.y = this.zoomTargetY;
      this.zoomTargetScale = null;
      this.zoomAnimationId = null;
      this.changed();
      return;
    }
    this.zoomAnimationId = requestAnimationFrame(this.animateZoom);
  };

  private startZoomMotion(): void {
    if (this.zoomAnimationId !== null) return;
    this.zoomLastFrameAt = performance.now();
    this.zoomAnimationId = requestAnimationFrame(this.animateZoom);
  }

  public zoomAt(x: number, y: number, factor: number) {
    if (this.globeMode) {
        this.onGlobeZoom?.(factor);
        return;
    }
    wheelTelemetry.zoomApplications++;
    const current = this.container.scale.x;
    wheelTelemetry.scaleBefore = current;

    const baseScale = this.zoomTargetScale ?? current;
    const baseX = this.zoomTargetScale === null ? this.container.x : this.zoomTargetX;
    const baseY = this.zoomTargetScale === null ? this.container.y : this.zoomTargetY;
    const requested = baseScale * factor;
    wheelTelemetry.requestedScale = requested;

    const next = Math.max(FLAT_ZOOM_MIN, Math.min(FLAT_ZOOM_MAX, requested));
    wheelTelemetry.appliedScale = next;
    wheelTelemetry.isClamped = (next !== requested);

    const actual = next / baseScale;
    this.zoomTargetScale = next;
    this.zoomTargetX = x - (x - baseX) * actual;
    this.zoomTargetY = y - (y - baseY) * actual;
    wheelTelemetry.appliedSameCall = this.container.scale.x;
    wheelTelemetry.nextFrameScale = this.container.scale.x;
    this.changed();
    this.startZoomMotion();
  }

  private changed() {
    this.onTransformChange?.();
  }

  private handlePrimaryClick(screenX: number, screenY: number) {
    if ((window as any).__DOMINION_MODAL_OPEN__) return;
    if (this.globeMode) {
      this.onGlobePick?.(screenX, screenY);
      return;
    }
    const local = this.screenToLocal(screenX, screenY);
    this.onFlatPick?.(screenX, screenY, local.x, local.y);
  }

  private handleDoubleExecution(screenX: number, screenY: number) {
    if ((window as any).__DOMINION_MODAL_OPEN__) return;
    if ((window as any).__DOMINION_PRODUCT_MODE__ === 'ATLAS_HOME') return;
    (window as any).__DOMINION_LAST_INPUT_ORIGIN__ = 'MAP_DOUBLE_CLICK';
    (window as any).__DOMINION_LAST_GESTURE_ID__ = `gesture_${Date.now()}`;
    console.log(`[GESTURE] MAP_DOUBLE_CLICK dispatched at (${screenX}, ${screenY}) [origin=MAP_DOUBLE_CLICK, gestureId=${(window as any).__DOMINION_LAST_GESTURE_ID__}]`);
    if (this.globeMode) {
      this.onGlobeDoublePick?.(screenX, screenY);
      return;
    }
    const local = this.screenToLocal(screenX, screenY);
    this.onDoublePick?.(screenX, screenY, local.x, local.y);
  }

  private screenToLocal(screenX: number, screenY: number): PIXI.Point {
    const rect = this.canvas.getBoundingClientRect();
    return this.container.toLocal(new PIXI.Point(screenX - rect.left, screenY - rect.top));
  }

  public setGlobeMode(enabled: boolean): void {
    this.globeMode = enabled;
    this.clearClickCandidate();
    this.pinchDistance = 0;
    this.secondaryPointerId = null;
  }

  public destroy() {
    if (this.onPointerDownHandler) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDownHandler);
      this.onPointerDownHandler = undefined;
    }
    if (this.onPointerMoveHandler) {
      this.canvas.removeEventListener('pointermove', this.onPointerMoveHandler);
      this.onPointerMoveHandler = undefined;
    }
    if (this.onPointerUpHandler) {
      this.canvas.removeEventListener('pointerup', this.onPointerUpHandler);
      this.onPointerUpHandler = undefined;
    }
    if (this.onPointerCancelHandler) {
      this.canvas.removeEventListener('pointercancel', this.onPointerCancelHandler);
      this.onPointerCancelHandler = undefined;
    }
    if (this.onContextMenuHandler) {
      this.canvas.removeEventListener('contextmenu', this.onContextMenuHandler);
      this.onContextMenuHandler = undefined;
    }
    if (this.onWheelHandler) {
      window.removeEventListener('wheel', this.onWheelHandler);
      this.onWheelHandler = undefined;
    }
    this.clearClickCandidate();
    this.pinchDistance = 0;
    this.secondaryPointerId = null;
  }

  public reset(): void {
    this.cancelZoomMotion();
    this.gestureState = 'IDLE';
    this.activePointerId = null;
    this.clearClickCandidate();
    this.pinchDistance = 0;
    this.secondaryPointerId = null;
    this.downTimeMs = 0;
  }
}
