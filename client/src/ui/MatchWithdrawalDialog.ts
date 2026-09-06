/**
 * DOMINION OF SOL — MATCH WITHDRAWAL SHEET
 * High-discipline command-layer sheet for confirming match exit.
 *
 * Strict requirements:
 * 1. Absolute input ownership (backdrop + dialog receive pointers, world canvas underneath blocked).
 * 2. High-tier z-index (z-index: 2500) directly on document.body, free of parent opacity/display inheritance.
 * 3. Cancel gets initial focus; Tab cycles strictly within modal.
 * 4. Double-submission prevention (single execution guard).
 * 5. Clean Dominion atlas visual language (compact, graphite/glass surface, warm brass edge, muted crimson leave).
 */

export class MatchWithdrawalDialog {
  private backdrop: HTMLElement | null = null;
  private sheet: HTMLElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private leaveBtn: HTMLButtonElement | null = null;

  private isOpen = false;
  private isLeaving = false;
  private previouslyFocusedEl: HTMLElement | null = null;
  private onLeaveCallback?: () => void;

  constructor() {
    this.createDOM();
    this.bindEvents();
  }

  private createDOM(): void {
    const existing = document.getElementById('dom-match-withdrawal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'dom-match-withdrawal-backdrop';
    backdrop.className = 'dom-withdrawal-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');

    backdrop.innerHTML = `
      <div class="dom-withdrawal-sheet" role="dialog" aria-modal="true" aria-labelledby="dom-withdrawal-title" aria-describedby="dom-withdrawal-desc">
        <div class="dom-withdrawal-eyebrow">ACTIVE WORLD · SOVEREIGN COMMAND</div>
        <h2 id="dom-withdrawal-title" class="dom-withdrawal-title">LEAVE MATCH</h2>
        <p id="dom-withdrawal-desc" class="dom-withdrawal-desc">
          Leaving ends your participation in this match.<br>
          Your active operations will stop.
        </p>
        <div class="dom-withdrawal-actions">
          <button id="btn-withdrawal-cancel" class="dom-withdrawal-btn dom-withdrawal-btn--cancel" type="button" tabindex="0">
            CANCEL
          </button>
          <button id="btn-withdrawal-leave" class="dom-withdrawal-btn dom-withdrawal-btn--leave" type="button" tabindex="0">
            LEAVE MATCH
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.backdrop = backdrop;
    this.sheet = backdrop.querySelector('.dom-withdrawal-sheet');
    this.cancelBtn = backdrop.querySelector('#btn-withdrawal-cancel');
    this.leaveBtn = backdrop.querySelector('#btn-withdrawal-leave');
  }

  private bindEvents(): void {
    if (!this.backdrop || !this.sheet || !this.cancelBtn || !this.leaveBtn) return;

    // Prevent any click inside the sheet from bubbling to backdrop
    this.sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.sheet.addEventListener('click', (e) => e.stopPropagation());

    // Backdrop click cancels immediately
    this.backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === this.backdrop) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });

    // CANCEL button
    this.cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    // LEAVE MATCH button
    this.leaveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.executeLeave();
    });

    // Keyboard trap and ESC handling
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = [this.cancelBtn, this.leaveBtn].filter(Boolean) as HTMLElement[];
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }, true); // Use capture to intercept before map or blade handlers
  }

  public setOnLeave(cb: () => void): void {
    this.onLeaveCallback = cb;
  }

  public open(): void {
    if (this.isOpen || !this.backdrop) return;
    this.isOpen = true;
    this.isLeaving = false;

    // Save previous focus
    this.previouslyFocusedEl = document.activeElement as HTMLElement | null;

    // Set global modal flag so canvas, blade, and selection systems do not process input
    (window as any).__DOMINION_MODAL_OPEN__ = true;
    document.body.dataset.modalOpen = 'true';

    // Show backdrop
    this.backdrop.hidden = false;
    this.backdrop.setAttribute('aria-hidden', 'false');
    this.backdrop.classList.remove('dom-withdrawal-backdrop--closing');
    this.backdrop.classList.add('dom-withdrawal-backdrop--open');

    // Reset button states
    if (this.leaveBtn) {
      this.leaveBtn.disabled = false;
      this.leaveBtn.textContent = 'LEAVE MATCH';
    }

    // Set initial focus to CANCEL (safer destructive default)
    requestAnimationFrame(() => {
      this.cancelBtn?.focus();
    });
  }

  public close(): void {
    if (!this.isOpen || !this.backdrop) return;

    this.isOpen = false;
    (window as any).__DOMINION_MODAL_OPEN__ = false;
    document.body.dataset.modalOpen = 'false';

    this.backdrop.classList.remove('dom-withdrawal-backdrop--open');
    this.backdrop.classList.add('dom-withdrawal-backdrop--closing');

    window.setTimeout(() => {
      if (this.backdrop && !this.isOpen) {
        this.backdrop.hidden = true;
        this.backdrop.setAttribute('aria-hidden', 'true');
        this.backdrop.classList.remove('dom-withdrawal-backdrop--closing');
      }
    }, 120);

    // Restore focus
    if (this.previouslyFocusedEl && typeof this.previouslyFocusedEl.focus === 'function') {
      this.previouslyFocusedEl.focus();
    }
  }

  private executeLeave(): void {
    if (this.isLeaving) return; // Prevent double execution
    this.isLeaving = true;

    if (this.leaveBtn) {
      this.leaveBtn.disabled = true;
      this.leaveBtn.textContent = 'LEAVING...';
    }

    console.log('[DOMINION] Confirmed match withdrawal executed.');

    // Animate closure then trigger transition
    this.close();

    window.setTimeout(() => {
      if (this.onLeaveCallback) {
        this.onLeaveCallback();
      }
      this.isLeaving = false;
    }, 100);
  }

  public isDialogOpen(): boolean {
    return this.isOpen;
  }
}

export const matchWithdrawalDialog = new MatchWithdrawalDialog();
(window as any).__DOMINION_MATCH_WITHDRAWAL_DIALOG__ = matchWithdrawalDialog;
