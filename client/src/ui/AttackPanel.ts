import { gameState } from '../game/GameState';
import { gameClient } from '../game/GameClient';
import { entitlementService } from '../meta/EntitlementService';
import { getBladeSkin } from '../meta/BladeSkinRegistry';

/** Spring constant for physical sword movement */
const SPRING_K_DRAW = 0.28;
const SPRING_K_SHEATHE = 0.22;
/** Detent magnetic snap zone: ±3 percentage points */
const DETENT_SNAP_ZONE = 3.0;
const DETENT_VALUES = [25, 50, 75, 100];

// SVG Sword travel metrics (Proportion pass):
// Scabbard mouth is at X = 250 (Scabbard length = 236px: X = 14 to 250).
// At 0%, guard sits flush at X = 250 (Blade length = 216px fully hidden inside scabbard).
// At 100%, guard translates to X = 482 (Travel span = 232px).
// Blade tip is at X = 482 - 216 = 266, clearing throat mouth (X = 250) with an unmistakable 16px air gap.
const BASE_X = 250;
const TRAVEL_X = 232;

export class AttackPanel {
  private panel = document.getElementById('attack-panel');

  // ---- Sword & Scabbard Elements ----
  private swordSvg = document.getElementById('sword-scabbard-svg') as SVGSVGElement | null;
  private swordAssembly = document.getElementById('drawn-sword-assembly');
  private bladeAssembly = document.getElementById('sword-blade-assembly');
  private swordHilt = document.getElementById('sword-hilt');
  private swordPositionIndex = document.getElementById('sword-position-index');
  private bladeSpecularRect = document.getElementById('blade-specular-rect');
  private scabbardThroat = document.getElementById('scabbard-throat-group');
  private attackPercent = document.getElementById('attack-percent');
  private attackPopulationReadout = document.getElementById('attack-population-readout');
  private railContextVerb = document.getElementById('rail-context-verb');
  private btnDockModeFocus = document.getElementById('btn-dock-mode-focus');
  private btnDockModeFrontier = document.getElementById('btn-dock-mode-frontier');
  private doctrineIndicator = document.getElementById('doctrine-indicator');

  // Main Screen Active Combat Engagement Deck
  private combatDeck = document.getElementById('combat-engagement-deck');
  private attackEnemyFlag = document.getElementById('attack-enemy-flag');
  private attackOwnFlag = document.getElementById('attack-own-flag');
  private attackEnemyName = document.getElementById('attack-enemy-name');
  private btnLaunchAttack = document.getElementById('btn-launch-attack');
  private btnHaltAttack = document.getElementById('btn-halt-attack');
  private btnReinforceFront = document.getElementById('btn-reinforce-front');
  private btnBladeExecute = document.getElementById('btn-blade-execute') as HTMLButtonElement | null;

  // Spark and Flash VFX
  private sparksGroup = document.getElementById('spark-particles-group') || document.getElementById('throat-friction-sparks');
  private throatFlashDisc = document.getElementById('throat-flash-disc');
  private sparks: Array<{
    element: SVGLineElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
  }> = [];

  // Hidden contract elements for test suites / legacy bridges
  private slider = document.getElementById('attack-commitment') as HTMLInputElement | null;
  private reason = document.getElementById('attack-legal-reason');
  private title = document.getElementById('operation-title');
  private eyebrow = document.getElementById('operation-eyebrow');

  // ---- Spring Physics State ----
  private visualFrac = 0.50;
  private targetFrac = 0.50;
  private velocity = 0.0;
  private isDragging = false;
  private isHoldingHilt = false;
  private currentLiftY = 0;
  private dragStartX = 0;
  private dragStartFrac = 0.50;
  private lastRafTs = 0;
  private rafId = 0;
  private lastDetentCrossed = -1;
  private prefersReducedMotion = false;

  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mode Buttons
    this.btnDockModeFocus?.addEventListener('click', () => this.setOperationMode('FOCUS'));
    this.btnDockModeFrontier?.addEventListener('click', () => this.setOperationMode('FRONTIER'));
    
    // Defer initial indicator alignment until DOM layout stabilizes
    requestAnimationFrame(() => this.updateDoctrineIndicator('FOCUS'));
    window.addEventListener('resize', () => this.updateDoctrineIndicator(gameState.operationMode));

    // Operation selector fallback
    document.getElementById('operation-selector')?.addEventListener('change', event => {
      gameState.activeFrontId = Number((event.target as HTMLSelectElement).value);
      gameState.clearSelection();
    });

    // Hidden slider fallback for tests
    this.slider?.addEventListener('input', () => {
      const pct = Number(this.slider?.value || 50);
      this.setCommitPercent(pct, true);
    });

    // Detent Ticks (Clicking 25, 50, 75, 100 on the SVG track)
    for (const detent of document.querySelectorAll<SVGElement>('.svg-detent')) {
      detent.addEventListener('click', (e) => {
        e.stopPropagation();
        const pct = Number(detent.dataset.commit || '50');
        this.animateToCommitPercent(pct);
      });
    }

    // Physical Sword Drag & Interaction
    this.setupSwordInteractions();

    // Standard Buttons & Shortcuts
    document.getElementById('btn-launch-attack')?.addEventListener('click', () => this.execute());
    document.getElementById('btn-halt-attack')?.addEventListener('click', () => this.halt());
    document.getElementById('btn-reinforce-front')?.addEventListener('click', () => this.reinforce());
    this.btnBladeExecute?.addEventListener('click', () => this.execute());

    window.addEventListener('keydown', (event) => {
      if ((window as any).__DOMINION_MODAL_OPEN__) return;
      const target = event.target as HTMLElement | null;
      if (event.key === 'Enter' && target?.tagName !== 'INPUT' && target?.tagName !== 'BUTTON') {
        event.preventDefault();
        this.execute();
      }
      if (event.key === 'Escape') gameState.clearSelection();
    });

    gameState.subscribe(() => this.update());
    this.update();
    this.startSpringLoop();

    this.applyEquippedSkin();
    document.addEventListener('dominion:entitlements-changed', () => this.applyEquippedSkin());
  }

  public applyEquippedSkin(): void {
    const skinId = entitlementService.getLoadout().activeBladeSkin;
    this.applyBladeSkin(skinId);
  }

  public applyBladeSkin(skinId: string): void {
    const skin = getBladeSkin(skinId);
    if (!skin) return;
    const mat = skin.material;
    const sil = skin.silhouette;

    const setGradStops = (gradId: string, colors: string[]) => {
      const grad = document.getElementById(gradId);
      if (!grad) return;
      grad.innerHTML = colors.map((c, i, arr) =>
        `<stop offset="${Math.round((i / (arr.length - 1)) * 100)}%" stop-color="${c}" />`
      ).join('');
    };

    setGradStops('scabbard-grad', mat.scabbardGrad);
    setGradStops('brass-grad', mat.brassGrad);
    setGradStops('blade-steel-upper', mat.bladeSteelUpper);
    setGradStops('blade-steel-lower', mat.bladeSteelLower);
    setGradStops('grip-grad', mat.gripGrad);

    // Update Blade Body Geometry (strictly occluded behind scabbard mouth at X=250)
    const bladeGroup = document.getElementById('sword-blade-group');
    if (bladeGroup && sil) {
      bladeGroup.innerHTML = `
        <!-- Blade drop shadow into open air -->
        <path d="${sil.bladeDropShadowPath}" fill="#000000" opacity="0.35" />
        <!-- Upper Bevel (Catch-light facet) -->
        <path d="${sil.bladeUpperPath}" fill="url(#blade-steel-upper)" />
        <!-- Lower Bevel (Shadowed cutting facet) -->
        <path d="${sil.bladeLowerPath}" fill="url(#blade-steel-lower)" />
        <!-- Dynamic specular pass highlight (shifts with velocity) -->
        <rect id="blade-specular-rect" x="-216" y="21.25" width="216" height="11.5" fill="url(#blade-specular-pass)" opacity="0" />
        <!-- Continuous spine catch-light running to the tip -->
        <path id="blade-spine-catchlight" d="${sil.spinePath}" stroke="${mat.bladeSpineColor || '#ffffff'}" stroke-width="0.9" fill="none" opacity="0.95" />
        <!-- Central Fuller / Blood Groove -->
        ${sil.fullerBasePath ? `<path id="blade-fuller-base" d="${sil.fullerBasePath}" fill="none" stroke="${mat.fullerColor || '#121a22'}" stroke-width="2.2" stroke-linecap="round" />` : ''}
        ${sil.fullerHighlightPath ? `<path id="blade-fuller-highlight" d="${sil.fullerHighlightPath}" fill="none" stroke="${mat.fullerHighlight || 'rgba(255,255,255,0.75)'}" stroke-width="0.75" stroke-linecap="round" />` : ''}
        <!-- Razor cutting edge -->
        <path d="${sil.cuttingEdgePath}" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.9" />
        <!-- Silhouette extra features (serrations, runes, etc.) -->
        ${sil.extraBladeFeaturesSvg || ''}
        ${mat.bladeEtchingSvg || ''}
      `;
      this.bladeSpecularRect = document.getElementById('blade-specular-rect');
    }

    // Update Hilt Geometry (Guard, Grip, Pommel)
    const hiltGroup = document.getElementById('sword-hilt');
    if (hiltGroup && sil) {
      hiltGroup.innerHTML = `
        ${sil.guardSvg}
        ${sil.gripSvg}
        ${sil.pommelSvg}
        <!-- Invisible large touch/drag hit target for effortless grab -->
        <rect x="-4" y="4" width="64" height="46" fill="transparent" />
      `;
    }

    // Update Fixed Scabbard Body Geometry
    const scabbardGroup = document.getElementById('fixed-scabbard');
    if (scabbardGroup && sil) {
      scabbardGroup.innerHTML = `
        ${sil.scabbardChapeSvg}
        ${sil.scabbardBodySvg}
        ${sil.scabbardThroatSvg}
        ${mat.scabbardInlaySvg || ''}
      `;
      this.scabbardThroat = document.getElementById('scabbard-throat-group');
    }
  }

  private setOperationMode(mode: 'FOCUS' | 'FRONTIER'): void {
    gameState.operationMode = mode;
    this.btnDockModeFocus?.classList.toggle('active', mode === 'FOCUS');
    this.btnDockModeFrontier?.classList.toggle('active', mode === 'FRONTIER');
    this.updateDoctrineIndicator(mode);
    gameState.notify('SELECTION_CHANGED');
  }

  private updateDoctrineIndicator(mode: 'FOCUS' | 'FRONTIER'): void {
    if (!this.doctrineIndicator) return;
    const activeBtn = mode === 'FOCUS' ? this.btnDockModeFocus : this.btnDockModeFrontier;
    if (!activeBtn) return;
    const leftOffset = activeBtn.offsetLeft;
    const width = activeBtn.offsetWidth;
    if (width > 0) {
      this.doctrineIndicator.style.transform = `translateX(${leftOffset}px)`;
      this.doctrineIndicator.style.width = `${width}px`;
      return;
    }
    // Fallback before initial paint
    if (mode === 'FOCUS') {
      this.doctrineIndicator.style.transform = 'translateX(3px)';
      this.doctrineIndicator.style.width = '74px';
    } else {
      this.doctrineIndicator.style.transform = 'translateX(80px)';
      this.doctrineIndicator.style.width = '96px';
    }
  }

  private triggerThroatFlash(): void {
    if (!this.throatFlashDisc || this.prefersReducedMotion) return;
    this.throatFlashDisc.setAttribute('opacity', '0.5');
    this.throatFlashDisc.setAttribute('r', '12');
    setTimeout(() => {
      this.throatFlashDisc?.setAttribute('opacity', '0');
    }, 45);
  }

  private emitFrictionSparks(velocity: number, count = 1): void {
    if (this.prefersReducedMotion || !this.sparksGroup) return;
    if (this.sparks.length >= 12) return; // Restrained pool: subtle, refined metal friction

    const isDrawing = velocity >= 0;
    const colors = ['#ffffff', '#fff176', '#ffea00', '#ff9100'];

    for (let i = 0; i < count; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const startX = (Math.random() - 0.5) * 3;
      const startY = (Math.random() - 0.5) * 12;
      // Controlled directional velocity
      const forwardBoost = isDrawing ? (1.8 + Math.random() * 3.5) : -(1.5 + Math.random() * 2.8);
      const vx = forwardBoost + velocity * 7.0;
      const vy = (Math.random() - 0.45) * 4.0;
      const maxLife = 0.13 + Math.random() * 0.10; // 130-230ms crisp lifespan
      const strokeColor = colors[Math.floor(Math.random() * colors.length)];
      const strokeWidth = (1.0 + Math.random() * 0.7).toFixed(1);

      line.setAttribute('x1', startX.toFixed(1));
      line.setAttribute('y1', startY.toFixed(1));
      line.setAttribute('x2', (startX - vx * 1.8).toFixed(1));
      line.setAttribute('y2', (startY - vy * 1.8).toFixed(1));
      line.setAttribute('stroke', strokeColor);
      line.setAttribute('stroke-width', strokeWidth);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', '0.9');

      this.sparksGroup.appendChild(line);
      this.sparks.push({
        element: line,
        x: startX,
        y: startY,
        vx,
        vy,
        life: maxLife,
        maxLife,
      });
    }
  }

  // ================================================================
  // PHYSICAL SWORD INTERACTION & BESPOKE UNSHEATHING/SHEATHING
  // ================================================================

  private setupSwordInteractions(): void {
    const hilt = this.swordHilt;
    const svg = this.swordSvg;
    if (!hilt || !svg) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const rect = svg.getBoundingClientRect();
      const scale = 580 / Math.max(1, rect.width);
      const deltaSvgX = (e.clientX - this.dragStartX) * scale;
      let frac = this.dragStartFrac + (deltaSvgX / TRAVEL_X);
      frac = Math.max(0.05, Math.min(1.0, frac));

      // Occasional micro-spark while dragging
      if (Math.random() < 0.20) {
        this.emitFrictionSparks(deltaSvgX * 0.03, 1);
      }

      // Gentle magnetic snapping within ±3% of detent marks
      let snappedPct = frac * 100;
      for (const d of DETENT_VALUES) {
        if (Math.abs(snappedPct - d) <= DETENT_SNAP_ZONE) {
          snappedPct = d;
          frac = d / 100;
          if (this.lastDetentCrossed !== d) {
            this.lastDetentCrossed = d;
            this.pulseDetent(d);
          }
          break;
        }
      }

      this.setCommitPercent(Math.round(snappedPct), true);
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.isHoldingHilt = false;
      this.swordHilt?.classList.remove('is-dragging');
      this.swordAssembly?.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);

      // Controlled mechanical settle on release
      this.velocity = (this.targetFrac - this.visualFrac) * 0.28;
      this.lastDetentCrossed = -1;
    };

    // Clicking anywhere on the sword/scabbard track smoothly glides the blade there
    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scale = 580 / Math.max(1, rect.width);
      const svgX = (e.clientX - rect.left) * scale;

      const isHilt = hilt.contains(e.target as Node);

      // Calculate clicked fraction and percentage along the rail
      let clickedFrac = (svgX - BASE_X) / TRAVEL_X;
      clickedFrac = Math.max(0.05, Math.min(1.0, clickedFrac));
      let targetPct = Math.round(clickedFrac * 100);

      // Magnetic snap to detents if within ±3.5%
      for (const d of DETENT_VALUES) {
        if (Math.abs(targetPct - d) <= DETENT_SNAP_ZONE + 0.5) {
          targetPct = d;
          clickedFrac = d / 100;
          break;
        }
      }

      this.isDragging = true;
      this.isHoldingHilt = isHilt;
      this.swordHilt?.classList.add('is-dragging');
      this.swordAssembly?.classList.add('is-dragging');
      this.dragStartX = e.clientX;

      if (isHilt) {
        this.dragStartFrac = gameState.populationCommitPercent / 100;
        this.velocity = 0;
      } else {
        // Smooth mechanical glide to clicked position
        this.animateToCommitPercent(targetPct);
        this.dragStartFrac = clickedFrac;
      }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });

    // Direct clicks on detents
    for (const detent of document.querySelectorAll('.svg-detent')) {
      (detent as SVGElement).style.cursor = 'pointer';
      detent.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = Number((detent as SVGElement).dataset.commit || 50);
        this.pulseDetent(d);
        this.animateToCommitPercent(d);
      });
    }

    // Keyboard navigation: ArrowLeft/Right = ±1%, Shift = ±5%
    hilt.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 5 : 1;
      const current = gameState.populationCommitPercent;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.animateToCommitPercent(Math.min(100, current + step));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.animateToCommitPercent(Math.max(5, current - step));
      }
    });
  }

  private animateToCommitPercent(pct: number): void {
    const clamped = Math.max(5, Math.min(100, Math.round(pct)));
    const prev = gameState.populationCommitPercent;
    if (clamped === prev) return;

    if (this.prefersReducedMotion) {
      this.setCommitPercent(clamped, true);
      return;
    }

    // Smooth second-order glide directly toward target without artificial jerk
    this.setCommitPercent(clamped, true);
  }

  private pulseDetent(detentValue: number): void {
    const el = document.querySelector(`.svg-detent[data-commit="${detentValue}"]`);
    if (el) {
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 220);
    }
    this.triggerThroatFlash();
    this.emitFrictionSparks(this.velocity || 0.15, 3);
  }

  private startSpringLoop(): void {
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - this.lastRafTs) / 1000);
      this.lastRafTs = now;

      const target = this.targetFrac;
      const err = target - this.visualFrac;
      const isDrawing = err > 0;

      // Bespoke kinetic profile: Snappier draw with damped overshoot vs controlled decelerating sheathe
      const springK = isDrawing ? SPRING_K_DRAW : SPRING_K_SHEATHE;
      const dampingFactor = (!isDrawing && this.visualFrac < 0.15) ? 2.4 : 2.0; // Cushion re-sheathing into throat
      const damping = dampingFactor * Math.sqrt(springK * 480);
      const accel = (springK * 480 * err) - (damping * this.velocity);

      this.velocity += accel * dt;
      this.visualFrac += this.velocity * dt;
      this.visualFrac = Math.max(0.05, Math.min(1.0, this.visualFrac));

      // Hard stop seating at 100% and clean seat at 0%
      if (this.visualFrac >= 1.0 && this.velocity > 0) {
        this.visualFrac = 1.0;
        this.velocity = 0;
        this.triggerThroatFlash();
        this.emitFrictionSparks(0.2, 3);
      }

      // Micro-friction sparks trigger during strong motion
      if (Math.abs(this.velocity) > 0.09) {
        this.emitFrictionSparks(this.velocity, 1);
      }

      // Update living friction spark particles with physics
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const spark = this.sparks[i];
        spark.life -= dt;
        if (spark.life <= 0) {
          spark.element.remove();
          this.sparks.splice(i, 1);
        } else {
          spark.vy += 28.0 * dt; // Gravity arc
          spark.vx *= 0.94; // Air friction deceleration
          spark.x += spark.vx * dt * 60;
          spark.y += spark.vy * dt * 60;
          const prog = spark.life / spark.maxLife;
          spark.element.setAttribute('x1', spark.x.toFixed(1));
          spark.element.setAttribute('y1', spark.y.toFixed(1));
          spark.element.setAttribute('x2', (spark.x - spark.vx * 1.8).toFixed(1));
          spark.element.setAttribute('y2', (spark.y - spark.vy * 1.8).toFixed(1));
          spark.element.setAttribute('opacity', (prog * 0.9).toFixed(2));
        }
      }

      if (Math.abs(err) > 0.0002 || Math.abs(this.velocity) > 0.0005) {
        this.renderPhysicalSword(this.visualFrac, this.velocity);
      } else {
        this.renderPhysicalSword(this.targetFrac, 0);
      }

      this.rafId = requestAnimationFrame(tick);
    };
    this.lastRafTs = performance.now();
    this.rafId = requestAnimationFrame(tick);
  }

  private renderPhysicalSword(frac: number, velocity: number): void {
    const pct = Math.round(frac * 100);
    const tx = BASE_X + (frac * TRAVEL_X);

    // Mechanical horizontal rail: strictly 0 lift to guarantee rock-solid horizontal travel
    this.currentLiftY = 0;

    // 1. Moving sword assembly (strictly horizontal)
    if (this.bladeAssembly) {
      this.bladeAssembly.setAttribute('transform', `translate(${tx.toFixed(2)}, 0)`);
    }
    if (this.swordAssembly) {
      this.swordAssembly.setAttribute('transform', `translate(${tx.toFixed(2)}, 0)`);
    }

    // 2. Continuous position index (▲) tracking the guard position
    if (this.swordPositionIndex) {
      this.swordPositionIndex.setAttribute('transform', `translate(${tx.toFixed(2)}, 0)`);
    }

    // 3. Accessible slider role
    if (this.swordHilt) {
      this.swordHilt.setAttribute('aria-valuenow', String(pct));
    }

    // 4. Dynamic motion specular pass & throat micro-reaction
    if (this.bladeSpecularRect && !this.prefersReducedMotion) {
      const speed = Math.abs(velocity);
      if (speed > 0.02) {
        const opacity = Math.min(0.85, speed * 1.5);
        const shift = velocity > 0 ? Math.min(6, speed * 10) : -Math.min(4, speed * 8);
        this.bladeSpecularRect.setAttribute('opacity', opacity.toFixed(2));
        this.bladeSpecularRect.setAttribute('transform', `translate(${shift.toFixed(1)}, 0)`);
      } else {
        this.bladeSpecularRect.setAttribute('opacity', '0');
      }
    }

    // 5. Scabbard throat micro-reaction (imperceptible 0.5px mechanical response during strong draw)
    if (this.scabbardThroat && !this.prefersReducedMotion) {
      if (velocity > 0.15) {
        const throatShift = Math.min(0.5, (velocity - 0.15) * 1.8);
        this.scabbardThroat.setAttribute('transform', `translate(${throatShift.toFixed(2)}, 0)`);
      } else {
        this.scabbardThroat.setAttribute('transform', 'translate(0, 0)');
      }
    }

    // 6. Highlight active detent mark
    for (const detent of document.querySelectorAll('.svg-detent')) {
      const detPct = Number((detent as SVGElement).dataset.commit || 0);
      detent.classList.toggle('is-active', Math.abs(pct - detPct) <= DETENT_SNAP_ZONE);
    }
  }

  public setCommitPercent(pct: number, propagate: boolean): void {
    const clamped = Math.max(5, Math.min(100, Math.round(pct)));
    gameState.populationCommitPercent = clamped;
    this.targetFrac = clamped / 100;

    if (this.slider && Number(this.slider.value) !== clamped) {
      this.slider.value = String(clamped);
    }

    this.updateReadout();
    if (propagate) gameState.notify('SELECTION_CHANGED');
  }

  // ================================================================
  // READOUTS & REASONING
  // ================================================================

  private people(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 10_000) return (value / 1_000).toFixed(1) + 'K';
    return Math.max(0, Math.round(value)).toLocaleString();
  }

  private updateReadout(): void {
    const percent = gameState.populationCommitPercent;
    this.targetFrac = percent / 100;

    const player = gameState.factions.get(gameState.yourFactionId);
    const total = player?.population || 0;
    const deployed = total * percent / 100;
    const remainingAfter = Math.max(0, total - deployed);

    if (this.attackPercent) {
      this.attackPercent.textContent = percent + '%';
    }
    if (this.attackPopulationReadout) {
      this.attackPopulationReadout.textContent = `${this.people(deployed)} committed (AFTER: ${this.people(remainingAfter)})`;
    }
  }

  private ownFronts() {
    return [...gameState.fronts.values()].filter(front => front.isCombatActive && front.attackerFaction === gameState.yourFactionId);
  }

  private activeFront() {
    const fronts = this.ownFronts();
    const context = gameState.selectionContext;
    if (context) {
      const result = gameState.lastAttackResult;
      if (result?.accepted && result.sourceCellIndex === context.sourceCell && result.targetCellIndex === context.targetCell) {
        const accepted = fronts.find(front => front.frontId === result.frontId);
        if (accepted) return accepted;
      }
      return fronts.find(front =>
        (front.sourceCellIndex === context.sourceCell && (front.targetCellIndex === context.targetCell || front.intentTargetCellIndex === context.clickedCell)) ||
        (context.targetCell !== null && front.targetCellIndex === context.targetCell) ||
        (context.clickedCell !== null && (front.targetCellIndex === context.clickedCell || front.intentTargetCellIndex === context.clickedCell))
      ) || null;
    }
    if (gameState.activeFrontId > 0) {
      return fronts.find(front => front.frontId === gameState.activeFrontId) || null;
    }
    return null;
  }

  private defendingFront() {
    const defending = [...gameState.fronts.values()].filter(front =>
      front.isCombatActive &&
      (front.factionA === gameState.yourFactionId || front.factionB === gameState.yourFactionId) &&
      front.attackerFaction !== gameState.yourFactionId);

    const context = gameState.selectionContext;
    if (context) {
      return defending.find(front =>
        (context.sourceCell !== null && (front.sourceCellIndex === context.sourceCell || front.targetCellIndex === context.sourceCell)) ||
        (context.targetCell !== null && (front.targetCellIndex === context.targetCell || front.sourceCellIndex === context.targetCell)) ||
        (context.clickedCell !== null && (front.targetCellIndex === context.clickedCell || front.sourceCellIndex === context.clickedCell))
      ) || null;
    }
    return defending[0] || null;
  }

  public execute(): void {
    const context = gameState.selectionContext;
    if (!context) {
      (window as any).__DOMINION_COMMAND_UI__?.showToast('Select an objective or destination on the map', 'warn');
      return;
    }

    if (context.action === 'EXPAND_FRONTIER' && context.targetCell !== null) {
      const ok = gameClient.sendExpand(context.targetCell, gameState.operationMode, gameState.populationCommitPercent / 100);
      if (ok) (window as any).__DOMINION_COMMAND_UI__?.showToast(`Frontier advance ordered (${gameState.operationMode})`, 'good');
    } else if (context.action === 'LAUNCH_OFFENSIVE' && context.sourceCell !== null && context.targetCell !== null) {
      const source = context.sourceCell;
      const target = context.targetCell;
      const legality = gameState.attackLegality(source, target);
      if (!legality.legal) {
        (window as any).__DOMINION_COMMAND_UI__?.showToast('Order declined · ' + legality.reason, 'warn');
        return;
      }
      gameClient.sendAttack(source, target, gameState.populationCommitPercent / 100);
    }
  }

  private halt(): void {
    const active = this.activeFront();
    if (!active) return;
    const ok = gameClient.sendCancelAttack(active.frontId);
    if (ok) (window as any).__DOMINION_COMMAND_UI__?.showToast('Front offensive halted', 'info');
  }

  private reinforce(): void {
    const active = this.activeFront();
    if (!active) return;
    const ok = gameClient.sendReinforce(active.frontId, gameState.populationCommitPercent / 100);
    if (ok) (window as any).__DOMINION_COMMAND_UI__?.showToast('Reinforcements dispatched to front', 'good');
  }

  public update(): void {
    if (!this.panel) return;

    const context = gameState.selectionContext;
    const targetCell = context?.targetCell ?? null;
    const source = context?.sourceCell ?? -1;
    const target = targetCell ?? -1;
    const targetOwner = targetCell !== null && targetCell >= 0 ? gameState.cellOwners[targetCell] : 0;
    const active = this.activeFront();
    const defending = this.defendingFront();

    if ((window as any).__DOMINION_UI_STATE__ && (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE') {
      this.panel.style.display = 'none';
      if (this.combatDeck) this.combatDeck.style.display = 'none';
      return;
    }

    const show = gameState.matchState.phase !== 'FINISHED';
    this.panel.style.display = show ? '' : 'none';
    if (!show) return;

    // Hostile targeting mode check: Frontier mode only applies to neutral land
    const isHostileTarget = context?.action === 'LAUNCH_OFFENSIVE' || (targetOwner > 0 && targetOwner !== gameState.yourFactionId);
    if (this.btnDockModeFrontier) {
      this.btnDockModeFrontier.classList.toggle('disabled-hostile', isHostileTarget);
      if (isHostileTarget && gameState.operationMode === 'FRONTIER') {
        this.setOperationMode('FOCUS');
      }
    }

    const legality = gameState.attackLegality(source, target);
    const isActionLegal = (context?.action === 'EXPAND_FRONTIER' && context.targetCell !== null) ||
                          (context?.action === 'LAUNCH_OFFENSIVE' && legality.legal);

    this.panel.dataset.state = active ? 'active' : defending ? 'defending' : isActionLegal ? 'ready' : 'idle';

    const verb = this.railContextVerb;
    const player = gameState.factions.get(gameState.yourFactionId);

    if (active) {
      if (this.combatDeck) this.combatDeck.style.display = 'flex';
      if (this.btnLaunchAttack) this.btnLaunchAttack.style.display = 'none';
      if (this.btnReinforceFront) this.btnReinforceFront.style.display = 'inline-flex';
      if (this.btnHaltAttack) this.btnHaltAttack.style.display = 'inline-flex';

      const enemyId = active.factionA === gameState.yourFactionId ? active.factionB : active.factionA;
      const enemy = gameState.factions.get(enemyId);

      if (this.attackOwnFlag) this.attackOwnFlag.textContent = player ? (player.flagId || player.displayName.slice(0, 3).toUpperCase()) : 'SOL';
      if (this.attackEnemyFlag) this.attackEnemyFlag.textContent = enemy ? (enemy.flagId || enemy.displayName.slice(0, 3).toUpperCase()) : '???';
      if (this.attackEnemyName) this.attackEnemyName.textContent = enemy?.displayName || 'Hostile Nation';

      const status = active.frontStatus || 'CONTESTED';
      const cohesionPct = Math.round((active.cohesion ?? 1.0) * 100);
      const supplyPct = Math.round((active.supplyEfficiency ?? 1.0) * 100);
      const isIsolated = active.frontStatus === 'ISOLATED' || supplyPct < 50;

      if (this.eyebrow) this.eyebrow.textContent = `${status} · COHESION ${cohesionPct}% · SUPPLY ${supplyPct}%${isIsolated ? ' ⚠️ ISOLATED' : ''}`;
      if (this.title) this.title.textContent = `BATTLE ENGAGED (${status})`;
      if (verb) verb.textContent = status;
    } else if (defending) {
      if (this.combatDeck) this.combatDeck.style.display = 'flex';
      if (this.btnLaunchAttack) this.btnLaunchAttack.style.display = 'none';
      if (this.btnReinforceFront) this.btnReinforceFront.style.display = 'inline-flex';
      if (this.btnHaltAttack) this.btnHaltAttack.style.display = 'none';

      const enemy = gameState.factions.get(defending.attackerFaction);

      if (this.attackOwnFlag) this.attackOwnFlag.textContent = player ? (player.flagId || player.displayName.slice(0, 3).toUpperCase()) : 'SOL';
      if (this.attackEnemyFlag) this.attackEnemyFlag.textContent = enemy ? (enemy.flagId || enemy.displayName.slice(0, 3).toUpperCase()) : '???';
      if (this.attackEnemyName) this.attackEnemyName.textContent = enemy?.displayName || 'Hostile Raider';

      const status = defending.frontStatus || 'CONTESTED';
      const cohesionPct = Math.round((defending.cohesion ?? 1.0) * 100);
      const supplyPct = Math.round((defending.supplyEfficiency ?? 1.0) * 100);
      const isIsolated = defending.frontStatus === 'ISOLATED' || supplyPct < 50;

      if (this.eyebrow) this.eyebrow.textContent = `DEFENSE · ${status} · COHESION ${cohesionPct}% · SUPPLY ${supplyPct}%${isIsolated ? ' ⚠️ ISOLATED' : ''}`;
      if (this.title) this.title.textContent = `TERRITORY UNDER ATTACK (${status})`;
      if (verb) verb.textContent = status;
    } else if (context?.action === 'LAUNCH_OFFENSIVE') {
      if (this.combatDeck) this.combatDeck.style.display = 'none';
      if (this.btnLaunchAttack) this.btnLaunchAttack.style.display = 'none';
      if (this.btnReinforceFront) this.btnReinforceFront.style.display = 'none';
      if (this.btnHaltAttack) this.btnHaltAttack.style.display = 'none';

      const enemy = targetOwner > 0 ? gameState.factions.get(targetOwner) : null;

      if (this.attackOwnFlag) this.attackOwnFlag.textContent = player ? (player.flagId || player.displayName.slice(0, 3).toUpperCase()) : 'SOL';
      if (this.attackEnemyFlag) this.attackEnemyFlag.textContent = enemy ? (enemy.flagId || enemy.displayName.slice(0, 3).toUpperCase()) : '???';
      if (this.attackEnemyName) this.attackEnemyName.textContent = enemy?.displayName || 'Hostile Target';

      if (this.eyebrow) this.eyebrow.textContent = 'OFFENSIVE PREPARATION';
      if (this.title) this.title.textContent = legality.legal ? 'READY TO STRIKE' : 'ORDER BLOCKED';
      if (verb) verb.textContent = legality.legal ? 'OFFENSIVE' : 'BLOCKED';
    } else {
      if (this.combatDeck) this.combatDeck.style.display = 'none';
      if (context?.action === 'EXPAND_FRONTIER') {
        if (this.eyebrow) this.eyebrow.textContent = 'FRONTIER EXPANSION';
        if (this.title) this.title.textContent = gameState.operationMode === 'FOCUS' ? 'FOCUS ADVANCE' : 'FRONTIER EXPANSION';
        if (verb) verb.textContent = gameState.operationMode === 'FOCUS' ? 'FOCUS' : 'FRONTIER';
      } else {
        if (this.eyebrow) this.eyebrow.textContent = 'COMMAND ARMED';
        if (this.title) this.title.textContent = 'SELECT DESTINATION';
        if (verb) verb.textContent = 'READY';
      }
    }

    if (this.btnBladeExecute) {
      this.btnBladeExecute.classList.toggle('ready', Boolean(isActionLegal));
      this.btnBladeExecute.classList.toggle('active', Boolean(active));
      const lbl = this.btnBladeExecute.querySelector('.execute-label');
      if (lbl) {
        lbl.textContent = active ? 'REINFORCE' : isActionLegal ? (context?.action === 'EXPAND_FRONTIER' ? 'ADVANCE' : 'STRIKE') : 'COMMIT';
      }
    }

    this.updateReadout();
  }
}
