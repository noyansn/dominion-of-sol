/**
 * DOMINION OF SOL — INTERACTIVE COMMAND BLADE PREVIEW
 * 
 * Renders an interactive physical mini version of the Command Blade.
 * Drag handle allows drawing from 0% (fully sheathed) to 100% (fully drawn).
 * Pure cosmetic preview: zero gameplay commands sent.
 */

import { CommandBladeSkinDescriptor, getBladeSkin } from '../meta/BladeSkinRegistry';

export class ArmoryBladePreview {
  private container: HTMLElement;
  private currentSkin: CommandBladeSkinDescriptor;
  private visualFrac = 0.45;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartFrac = 0.45;
  private width: number;
  private height: number;
  private svgEl: SVGSVGElement | null = null;
  private swordAssembly: SVGGElement | null = null;
  private bladeAssembly: SVGGElement | null = null;
  private posIndex: SVGGElement | null = null;
  private pctDisplay: HTMLElement | null = null;
  private onCommitChange?: (pct: number) => void;

  constructor(
    container: HTMLElement,
    initialSkinId = 'blade_standard',
    width = 540,
    height = 54,
    onCommitChange?: (pct: number) => void
  ) {
    this.container = container;
    this.currentSkin = getBladeSkin(initialSkinId);
    this.width = width;
    this.height = height;
    this.onCommitChange = onCommitChange;
    this.render();
  }

  public setSkin(skinId: string): void {
    this.currentSkin = getBladeSkin(skinId);
    this.render();
  }

  public setCommit(percent: number): void {
    this.visualFrac = Math.max(0, Math.min(1, percent / 100));
    this.updatePosition();
  }

  public getCommit(): number {
    return Math.round(this.visualFrac * 100);
  }

  public render(): void {
    this.container.innerHTML = '';
    const mat = this.currentSkin.material;
    const uid = Math.random().toString(36).substring(2, 7);

    // Scabbard mouth is at X = 250, Travel span = 232px (from X = 250 at 0% to X = 482 at 100%)
    const BASE_X = 250;
    const TRAVEL_X = 232;
    const currentX = BASE_X + this.visualFrac * TRAVEL_X;

    const wrapper = document.createElement('div');
    wrapper.className = 'armory-blade-preview-wrap';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.userSelect = 'none';

    const sil = this.currentSkin.silhouette;
    const adaptSvg = (svgStr: string) => {
      if (!svgStr) return '';
      return svgStr
        .replace(/url\(#scabbard-grad\)/g, `url(#scabbard-grad-${uid})`)
        .replace(/url\(#brass-grad\)/g, `url(#brass-grad-${uid})`)
        .replace(/url\(#blade-steel-upper\)/g, `url(#blade-steel-upper-${uid})`)
        .replace(/url\(#blade-steel-lower\)/g, `url(#blade-steel-lower-${uid})`)
        .replace(/url\(#grip-grad\)/g, `url(#grip-grad-${uid})`);
    };

    wrapper.innerHTML = `
      <!-- 1. HERO ARTIFACT SHOWCASE (Blade + Matching Scabbard with Material & Weight Badges) -->
      <div class="armory-hero-blade-box" style="position: relative; width: 100%; max-width: ${this.width}px; min-height: 128px; background: radial-gradient(ellipse at 50% 40%, rgba(223,188,115,0.06) 0%, #020509 75%); border: 1px solid rgba(223,188,115,0.25); border-radius: 6px; padding: 18px 24px; box-sizing: border-box; margin-bottom: 12px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: box-shadow 0.2s ease;">
        <div class="hero-specular-light" style="position: absolute; inset: 0; pointer-events: none; opacity: 0.35; mix-blend-mode: overlay; background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%); transform: translateX(0px); transition: transform 0.08s ease-out;"></div>
        
        <div style="width: 100%; display: flex; justify-content: center; padding: 4px 16px; box-sizing: border-box;">
          ${sil ? sil.heroPreviewSvg : ''}
        </div>

        <div style="display: flex; gap: 10px; margin-top: 8px; font-size: 9.5px; color: #94a3b8; letter-spacing: 0.06em; align-items: center; flex-wrap: wrap; justify-content: center;">
          <span style="color: #dfbc73; font-weight: 700;">${this.currentSkin.civilization} FORGE</span>
          <span style="color: rgba(255,255,255,0.2);">|</span>
          <span>${sil ? sil.bladeWeightLabel : ''}</span>
          <span style="color: rgba(255,255,255,0.2);">|</span>
          <span style="color: #cbd5e1;">MATCHING BESPOKE SCABBARD INCLUDED</span>
        </div>
      </div>

      <!-- 2. INTERACTIVE DRAW INSTRUMENT MINIATURE -->
      <div style="display: flex; justify-content: space-between; width: 100%; max-width: ${this.width}px; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.1em; color: #94a3b8;">
        <div>
          <span style="font-weight: 700; color: #dfbc73;">${this.currentSkin.name.toUpperCase()}</span>
          <span style="font-size: 9px; color: #94a3b8; margin-left: 8px;">${sil ? sil.bladeTypeLabel : ''}</span>
        </div>
        <span class="preview-pct-label" style="font-family: ui-monospace, monospace; color: #f8fafc;">${Math.round(this.visualFrac * 100)}% DRAWN</span>
      </div>
      <svg class="preview-blade-svg" viewBox="0 0 580 54" width="100%" height="auto" style="max-width: ${this.width}px; touch-action: none; cursor: ew-resize;" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="scabbard-grad-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            ${mat.scabbardGrad.map((c, i, arr) => `<stop offset="${Math.round((i / (arr.length - 1)) * 100)}%" stop-color="${c}" />`).join('')}
          </linearGradient>
          <linearGradient id="brass-grad-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            ${mat.brassGrad.map((c, i, arr) => `<stop offset="${Math.round((i / (arr.length - 1)) * 100)}%" stop-color="${c}" />`).join('')}
          </linearGradient>
          <linearGradient id="blade-steel-upper-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            ${mat.bladeSteelUpper.map((c, i, arr) => `<stop offset="${Math.round((i / (arr.length - 1)) * 100)}%" stop-color="${c}" />`).join('')}
          </linearGradient>
          <linearGradient id="blade-steel-lower-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            ${mat.bladeSteelLower.map((c, i, arr) => `<stop offset="${Math.round((i / (arr.length - 1)) * 100)}%" stop-color="${c}" />`).join('')}
          </linearGradient>
          <linearGradient id="grip-grad-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            ${mat.gripGrad.map((c, i, arr) => `<stop offset="${Math.round((i / (arr.length - 1)) * 100)}%" stop-color="${c}" />`).join('')}
          </linearGradient>
          <!-- Authoritative Scabbard Mouth Occlusion Boundary (X >= 250 emerged into open air, X < 250 sheathed inside) -->
          <clipPath id="armory-blade-clip-${uid}" clipPathUnits="userSpaceOnUse">
            <rect x="250" y="-100" width="800" height="300" />
          </clipPath>
        </defs>

        <!-- Ambient shadow -->
        <ellipse cx="132" cy="38" rx="120" ry="5" fill="#000000" opacity="0.6" />

        <!-- Travel Rail & Detents -->
        <line x1="250" y1="27" x2="486" y2="27" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
        <line x1="250" y1="41" x2="486" y2="41" stroke="rgba(255,255,255,0.12)" stroke-width="0.75" stroke-dasharray="2 3" />

        <!-- 0, 25, 50, 75, 100 detents -->
        <g class="pv-detent" data-pct="0" transform="translate(250, 0)" cursor="pointer">
          <line x1="0" y1="38" x2="0" y2="43" stroke="#475569" stroke-width="1" />
          <text x="0" y="52" font-size="8" font-family="monospace" fill="#64748b" text-anchor="middle">0</text>
        </g>
        <g class="pv-detent" data-pct="25" transform="translate(308, 0)" cursor="pointer">
          <line x1="0" y1="38" x2="0" y2="43" stroke="#475569" stroke-width="1" />
          <text x="0" y="52" font-size="8" font-family="monospace" fill="#64748b" text-anchor="middle">25</text>
        </g>
        <g class="pv-detent" data-pct="50" transform="translate(366, 0)" cursor="pointer">
          <line x1="0" y1="38" x2="0" y2="43" stroke="#475569" stroke-width="1" />
          <text x="0" y="52" font-size="8" font-family="monospace" fill="#64748b" text-anchor="middle">50</text>
        </g>
        <g class="pv-detent" data-pct="75" transform="translate(424, 0)" cursor="pointer">
          <line x1="0" y1="38" x2="0" y2="43" stroke="#475569" stroke-width="1" />
          <text x="0" y="52" font-size="8" font-family="monospace" fill="#64748b" text-anchor="middle">75</text>
        </g>
        <g class="pv-detent" data-pct="100" transform="translate(482, 0)" cursor="pointer">
          <line x1="0" y1="36" x2="0" y2="43" stroke="#dfbc73" stroke-width="1.5" />
          <text x="0" y="52" font-size="8" font-family="monospace" fill="#dfbc73" text-anchor="middle">100</text>
        </g>

        <!-- Position Indicator Marker -->
        <g id="pv-pos-index-${uid}" transform="translate(${currentX}, 0)">
          <polygon points="0,38 -2.5,42 2.5,42" fill="#dfbc73" stroke="#f4dc9e" stroke-width="0.5" />
        </g>

        <!-- Fixed Occlusion Window at root X=250 for Blade Body -->
        <g clip-path="url(#armory-blade-clip-${uid})">
          <g id="pv-blade-assembly-${uid}" transform="translate(${currentX}, 0)">
            <path class="pv-steel-elem" d="${sil.bladeDropShadowPath}" fill="#000000" opacity="0.35" />
            <path class="pv-steel-elem" d="${sil.bladeUpperPath}" fill="url(#blade-steel-upper-${uid})" />
            <path class="pv-steel-elem" d="${sil.bladeLowerPath}" fill="url(#blade-steel-lower-${uid})" />
            <path class="pv-steel-elem" d="${sil.spinePath}" stroke="${mat.bladeSpineColor || '#ffffff'}" stroke-width="0.9" fill="none" opacity="0.95" />
            ${sil.fullerBasePath ? `<path class="pv-steel-elem" d="${sil.fullerBasePath}" fill="none" stroke="${mat.fullerColor || '#121a22'}" stroke-width="2.2" stroke-linecap="round" />` : ''}
            ${sil.fullerHighlightPath ? `<path class="pv-steel-elem" d="${sil.fullerHighlightPath}" fill="none" stroke="${mat.fullerHighlight || 'rgba(255,255,255,0.75)'}" stroke-width="0.75" stroke-linecap="round" />` : ''}
            <path class="pv-steel-elem" d="${sil.cuttingEdgePath}" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.9" />
            ${adaptSvg(sil.extraBladeFeaturesSvg || '')}
            ${adaptSvg(mat.bladeEtchingSvg || '')}
          </g>
        </g>

        <!-- DRAWN HILT ASSEMBLY -->
        <g id="pv-sword-assembly-${uid}" transform="translate(${currentX}, 0)">
          <!-- Hilt -->
          <g id="pv-hilt-${uid}" cursor="grab">
            <g class="pv-gilt-elem">${adaptSvg(sil.guardSvg)}</g>
            <g class="pv-horn-elem">${adaptSvg(sil.gripSvg)}</g>
            <g class="pv-gilt-elem">${adaptSvg(sil.pommelSvg)}</g>
            <rect x="-4" y="4" width="64" height="46" fill="transparent" />
          </g>
        </g>

        <!-- FIXED SCABBARD BODY -->
        <g id="pv-scabbard-${uid}">
          <g class="pv-gilt-elem">${adaptSvg(sil.scabbardChapeSvg)}</g>
          ${adaptSvg(sil.scabbardBodySvg)}
          <g class="pv-gilt-elem">${adaptSvg(sil.scabbardThroatSvg)}</g>
          <g class="pv-gilt-elem">${adaptSvg(mat.scabbardInlaySvg || '')}</g>
        </g>
      </svg>
      <div style="font-size: 10px; color: #64748b; margin-top: 4px;">DRAG HILT OR CLICK DETENTS (0% SHEATHED, 25%, 50%, 75%, 100% DRAWN)</div>
    `;


    this.container.appendChild(wrapper);

    this.svgEl = wrapper.querySelector('.preview-blade-svg');
    this.bladeAssembly = wrapper.querySelector(`[id="pv-blade-assembly-${uid}"]`);
    this.swordAssembly = wrapper.querySelector(`[id="pv-sword-assembly-${uid}"]`);
    this.posIndex = wrapper.querySelector(`[id="pv-pos-index-${uid}"]`);
    this.pctDisplay = wrapper.querySelector('.preview-pct-label');

    this.bindEvents(wrapper, uid);
  }

  private bindEvents(wrapper: HTMLElement, uid: string): void {
    const hilt = wrapper.querySelector(`[id="pv-hilt-${uid}"]`) as SVGElement | null;
    const detents = wrapper.querySelectorAll<SVGElement>('.pv-detent');

    detents.forEach(d => {
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = Number(d.dataset.pct || '50');
        this.visualFrac = p / 100;
        this.updatePosition();
      });
    });

    // Hero Specular Pointer-Responsive Lighting (Section 19)
    const heroBox = wrapper.querySelector('.armory-hero-blade-box') as HTMLElement | null;
    const specular = wrapper.querySelector('.hero-specular-light') as HTMLElement | null;
    if (heroBox && specular) {
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      if (!prefersReducedMotion) {
        heroBox.addEventListener('pointermove', (e: PointerEvent) => {
          const rect = heroBox.getBoundingClientRect();
          const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const shift = (frac - 0.5) * 120;
          specular.style.transform = `translateX(${shift.toFixed(1)}px)`;
        });
        heroBox.addEventListener('pointerleave', () => {
          specular.style.transform = 'translateX(0px)';
        });
      }
    }

    if (!hilt || !this.svgEl) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartFrac = this.visualFrac;
      hilt.style.cursor = 'grabbing';
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging || !this.svgEl) return;
      const rect = this.svgEl.getBoundingClientRect();
      const scale = 580 / rect.width;
      const deltaX = (e.clientX - this.dragStartX) * scale;
      const TRAVEL_X = 232;
      const deltaFrac = deltaX / TRAVEL_X;
      this.visualFrac = Math.max(0, Math.min(1, this.dragStartFrac + deltaFrac));
      this.updatePosition();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      hilt.style.cursor = 'grab';
      // Magnetic detent snap: if within 3% of 0, 25, 50, 75, 100, snap!
      const currentPct = this.visualFrac * 100;
      for (const d of [0, 25, 50, 75, 100]) {
        if (Math.abs(currentPct - d) <= 3.0) {
          this.visualFrac = d / 100;
          this.updatePosition();
          break;
        }
      }
    };

    hilt.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  private updatePosition(): void {
    const BASE_X = 250;
    const TRAVEL_X = 232;
    const currentX = BASE_X + this.visualFrac * TRAVEL_X;

    if (this.bladeAssembly) {
      this.bladeAssembly.setAttribute('transform', `translate(${currentX.toFixed(1)}, 0)`);
    }
    if (this.swordAssembly) {
      this.swordAssembly.setAttribute('transform', `translate(${currentX.toFixed(1)}, 0)`);
    }
    if (this.posIndex) {
      this.posIndex.setAttribute('transform', `translate(${currentX.toFixed(1)}, 0)`);
    }
    if (this.pctDisplay) {
      this.pctDisplay.textContent = `${Math.round(this.visualFrac * 100)}% DRAWN`;
    }
    this.onCommitChange?.(Math.round(this.visualFrac * 100));
  }

  public highlightMaterial(mat: 'damascus' | 'horn' | 'gilt' | null): void {
    const heroBox = this.container.querySelector('.armory-hero-blade-box') as HTMLElement | null;
    const steelElems = this.container.querySelectorAll('.pv-steel-elem');
    const hornElems = this.container.querySelectorAll('.pv-horn-elem');
    const giltElems = this.container.querySelectorAll('.pv-gilt-elem');

    // Reset
    steelElems.forEach(el => ((el as SVGElement).style.filter = ''));
    hornElems.forEach(el => ((el as SVGElement).style.filter = ''));
    giltElems.forEach(el => ((el as SVGElement).style.filter = ''));
    if (heroBox) heroBox.style.boxShadow = '';

    if (mat === 'damascus') {
      steelElems.forEach(el => ((el as SVGElement).style.filter = 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.9)) brightness(1.35)'));
      if (heroBox) heroBox.style.boxShadow = 'inset 0 0 24px rgba(56, 189, 248, 0.25), 0 0 16px rgba(56, 189, 248, 0.2)';
    } else if (mat === 'horn') {
      hornElems.forEach(el => ((el as SVGElement).style.filter = 'drop-shadow(0 0 8px rgba(223, 188, 115, 0.95)) brightness(1.4)'));
      if (heroBox) heroBox.style.boxShadow = 'inset 0 0 24px rgba(223, 188, 115, 0.25), 0 0 16px rgba(223, 188, 115, 0.2)';
    } else if (mat === 'gilt') {
      giltElems.forEach(el => ((el as SVGElement).style.filter = 'drop-shadow(0 0 8px rgba(254, 240, 138, 0.95)) brightness(1.4)'));
      if (heroBox) heroBox.style.boxShadow = 'inset 0 0 24px rgba(254, 240, 138, 0.25), 0 0 16px rgba(254, 240, 138, 0.2)';
    }
  }
}
