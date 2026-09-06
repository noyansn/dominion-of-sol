import { flagAtlas, FlagDescriptor } from './FlagAtlas';

const axes = ['offense', 'defense', 'expansion', 'maritime'] as const;

export class NationCreator {
  private readonly root = document.getElementById('nation-creator');
  private readonly form = document.getElementById('nation-creator-form') as HTMLFormElement | null;

  constructor() {
    const open = document.getElementById('btn-create-nation');
    const close = document.getElementById('btn-close-nation-creator');
    open?.addEventListener('click', () => this.open());
    close?.addEventListener('click', () => this.close());
    this.form?.addEventListener('submit', (event) => this.save(event));
    for (const input of this.form?.querySelectorAll<HTMLInputElement>('input[data-doctrine]') || []) {
      input.addEventListener('input', () => this.rebalanceDoctrine(input.dataset.doctrine as typeof axes[number]));
    }
    this.loadSavedValues();
  }

  private open(): void { if (this.root) this.root.hidden = false; }
  private close(): void { if (this.root) this.root.hidden = true; }

  private loadSavedValues(): void {
    const name = localStorage.getItem('dominion.nation');
    const nameInput = document.getElementById('nation-name-input') as HTMLInputElement | null;
    if (name && nameInput) nameInput.value = name;
    const descriptorRaw = localStorage.getItem('dominion.flagDescriptor');
    if (descriptorRaw) {
      try {
        const descriptor = flagAtlas.normalizeDescriptor(JSON.parse(descriptorRaw));
        (document.getElementById('nation-primary-input') as HTMLInputElement).value = descriptor.primaryColor;
        (document.getElementById('nation-secondary-input') as HTMLInputElement).value = descriptor.secondaryColor;
        (document.getElementById('nation-accent-input') as HTMLInputElement).value = descriptor.accentColor;
        (document.getElementById('nation-layout-input') as HTMLSelectElement).value = descriptor.layout;
        (document.getElementById('nation-emblem-input') as HTMLSelectElement).value = descriptor.emblem;
      } catch { /* invalid local data is replaced by the safe defaults */ }
    }
    const start = localStorage.getItem('dominion.startCell');
    const startInput = document.getElementById('nation-start-cell-input') as HTMLInputElement | null;
    if (start && startInput) startInput.value = start;
  }

  private rebalanceDoctrine(changed: typeof axes[number]): void {
    const inputs = axes.map(axis => document.querySelector<HTMLInputElement>(`input[data-doctrine="${axis}"]`)!);
    let values = inputs.map(input => Number(input.value) || 0);
    // Convert the user's four-axis gesture into a bounded zero-sum vector.
    // No axis can create a free bonus: the mean is removed and the vector is
    // scaled if its largest absolute value would exceed six points.
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    values = values.map(value => value - mean);
    const maxAbs = Math.max(...values.map(value => Math.abs(value)), 1);
    if (maxAbs > 6) values = values.map(value => value * 6 / maxAbs);
    values = values.map(value => Math.round(value));
    const residual = values.reduce((sum, value) => sum + value, 0);
    if (residual !== 0) {
      const changedIndex = axes.indexOf(changed);
      values[changedIndex] -= residual;
    }
    values = values.map(value => Math.max(-6, Math.min(6, value)));
    inputs.forEach((input, index) => {
      input.value = String(values[index]);
      const output = document.getElementById(`doctrine-${axes[index]}-value`);
      if (output) output.textContent = `${values[index] > 0 ? '+' : ''}${values[index]}`;
    });
  }

  private save(event: SubmitEvent): void {
    event.preventDefault();
    const descriptor: FlagDescriptor = flagAtlas.normalizeDescriptor({
      layout: (document.getElementById('nation-layout-input') as HTMLSelectElement).value,
      primaryColor: (document.getElementById('nation-primary-input') as HTMLInputElement).value,
      secondaryColor: (document.getElementById('nation-secondary-input') as HTMLInputElement).value,
      accentColor: (document.getElementById('nation-accent-input') as HTMLInputElement).value,
      emblem: (document.getElementById('nation-emblem-input') as HTMLSelectElement).value,
    });
    const name = ((document.getElementById('nation-name-input') as HTMLInputElement).value || 'Dominion of Sol').trim().slice(0, 32);
    localStorage.setItem('dominion.nation', name);
    localStorage.setItem('dominion.color', descriptor.primaryColor);
    localStorage.setItem('dominion.flag', 'flag_custom');
    localStorage.setItem('dominion.flagDescriptor', flagAtlas.serializeDescriptor(descriptor));
    const start = Number((document.getElementById('nation-start-cell-input') as HTMLInputElement).value);
    if (Number.isInteger(start) && start >= 0) localStorage.setItem('dominion.startCell', String(start));
    else localStorage.removeItem('dominion.startCell');
    for (const axis of axes) {
      const value = Number(document.querySelector<HTMLInputElement>(`input[data-doctrine="${axis}"]`)?.value || 0);
      localStorage.setItem(`dominion.doctrine.${axis}`, (value / 100).toFixed(4));
    }
    const status = document.getElementById('nation-creator-status');
    if (status) status.textContent = 'Charter saved. Reconnecting the authoritative match…';
    window.setTimeout(() => window.location.reload(), 160);
  }
}

