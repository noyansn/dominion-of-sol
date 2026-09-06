/**
 * DOMINION OF SOL — TELEMETRY HOOKS
 * Privacy-conscious product telemetry.
 * Strictly avoids harvesting user private text, passwords, or personal data.
 */

export type TelemetryEventType =
  | 'guest_created'
  | 'account_link_started'
  | 'account_link_completed'
  | 'armory_opened'
  | 'item_previewed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'item_equipped'
  | 'reaction_sent'
  | 'reaction_muted'
  | 'pass_viewed';

export interface TelemetryPayload {
  event: TelemetryEventType;
  timestamp: number;
  properties?: Record<string, string | number | boolean | null | undefined>;
}

export type TelemetryListener = (payload: TelemetryPayload) => void;

class TelemetryService {
  private listeners: TelemetryListener[] = [];
  private history: TelemetryPayload[] = [];
  private maxHistory = 100;

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public track(event: TelemetryEventType, properties?: Record<string, string | number | boolean | null | undefined>): void {
    const payload: TelemetryPayload = {
      event,
      timestamp: Date.now(),
      properties: properties ? { ...properties } : undefined,
    };

    this.history.push(payload);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (typeof window !== 'undefined' && (window as any).__DEV_LOG_TELEMETRY__) {
      console.log(`[TELEMETRY] ${event}`, payload.properties ?? '');
    }

    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.warn('[TELEMETRY] Listener error:', err);
      }
    }
  }

  public getRecentEvents(): TelemetryPayload[] {
    return [...this.history];
  }
}

export const telemetry = new TelemetryService();
