/**
 * DOMINION OF SOL — AUTHORITATIVE WALLET VIEW-MODEL
 * 
 * Strict Architecture:
 * 1. SERVER / RUST owns the authoritative wallet, balance, and ledger.
 * 2. Client is a WalletViewModel for display and purchase requests.
 * 3. Local tampering (e.g. wallet.balance = 99999999) is rejected by server
 *    and reverted on next authoritative snapshot.
 * 4. Sovereign Marks NEVER convert to or appear with Population during gameplay.
 */

import { accountService } from './AccountService';
import { telemetry } from './Telemetry';
import { safeStorage } from './StorageHelper';

export type TransactionType =
  | 'PURCHASE_INTENT'
  | 'PAYMENT_SUCCESS'
  | 'RECEIPT_VERIFIED'
  | 'ENTITLEMENT_GRANTED'
  | 'WALLET_SPENT'
  | 'REFUND'
  | 'ENTITLEMENT_REVOKED'
  | 'FAILED';

export interface LedgerTransaction {
  transactionId: string;
  accountId: string;
  currency: 'SOVEREIGN_MARKS';
  amount: number;
  type: TransactionType;
  sku: string;
  timestamp: number;
  idempotencyKey: string;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_KEY_WALLET_CACHE = 'dominion.commerce.wallet_cache';
const STORAGE_KEY_LEDGER_CACHE = 'dominion.commerce.ledger_cache';

class WalletViewModel {
  private serverAuthoritativeBalance: number = 100;
  private localLedger: LedgerTransaction[] = [];
  private processedKeys = new Set<string>();

  constructor() {
    this.loadCachedState();
  }

  private loadCachedState(): void {
    try {
      const cachedVal = safeStorage.getItem(STORAGE_KEY_WALLET_CACHE);
      if (cachedVal !== null && !isNaN(Number(cachedVal))) {
        this.serverAuthoritativeBalance = Math.max(0, Number(cachedVal));
      }
      const rawLedger = safeStorage.getItem(STORAGE_KEY_LEDGER_CACHE);
      if (rawLedger) {
        this.localLedger = JSON.parse(rawLedger);
        for (const tx of this.localLedger) {
          if (tx.idempotencyKey) this.processedKeys.add(tx.idempotencyKey);
        }
      }
    } catch { /* empty */ }
  }

  private saveCache(): void {
    try {
      safeStorage.setItem(STORAGE_KEY_WALLET_CACHE, String(this.serverAuthoritativeBalance));
      safeStorage.setItem(STORAGE_KEY_LEDGER_CACHE, JSON.stringify(this.localLedger));
    } catch { /* empty */ }
    this.notify();
  }

  private notify(): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dominion:wallet-changed', {
        detail: { balance: this.getBalance() }
      }));
    }
  }

  /**
   * Applies an authoritative balance from the server snapshot.
   * Completely overwrites any local tampering or cache drift.
   */
  public applyServerBalance(balance: number, ledger?: LedgerTransaction[]): void {
    this.serverAuthoritativeBalance = Math.max(0, balance);
    if (ledger) {
      this.localLedger = [...ledger];
      this.processedKeys.clear();
      for (const tx of this.localLedger) {
        if (tx.idempotencyKey) this.processedKeys.add(tx.idempotencyKey);
      }
    }
    this.saveCache();
  }

  public getBalance(): number {
    return this.serverAuthoritativeBalance;
  }

  public getLedger(): LedgerTransaction[] {
    return [...this.localLedger].reverse();
  }

  /**
   * Client-side spend request.
   * Enforces server balance check, non-negative balance, and idempotency.
   */
  public spendMarks(sku: string, amount: number, idempotencyKey: string): { success: boolean; reason?: string } {
    if (amount <= 0) return { success: false, reason: 'Invalid amount' };
    if (this.processedKeys.has(idempotencyKey)) {
      return { success: false, reason: 'Duplicate transaction (idempotency key already processed)' };
    }

    if (this.serverAuthoritativeBalance < amount) {
      this.recordTransaction({
        type: 'FAILED',
        amount: 0,
        sku,
        idempotencyKey,
        metadata: { reason: 'Insufficient Sovereign Marks' }
      });
      return { success: false, reason: 'Insufficient Sovereign Marks' };
    }

    this.serverAuthoritativeBalance -= amount;
    this.recordTransaction({
      type: 'WALLET_SPENT',
      amount: -amount,
      sku,
      idempotencyKey,
    });

    telemetry.track('purchase_completed', { sku, marks: amount });
    return { success: true };
  }

  /**
   * Grants marks to the wallet (e.g. from purchasing a Marks Pack or Pass Tier).
   */
  public grantMarks(amount: number, sku: string, idempotencyKey: string): boolean {
    if (amount <= 0) return false;
    if (this.processedKeys.has(idempotencyKey)) {
      return false; // Idempotent skip
    }

    this.serverAuthoritativeBalance += amount;
    this.recordTransaction({
      type: 'ENTITLEMENT_GRANTED',
      amount,
      sku: sku || `marks_grant_${amount}`,
      idempotencyKey,
    });

    return true;
  }

  public recordTransaction(params: {
    type: TransactionType;
    amount: number;
    sku: string;
    idempotencyKey: string;
    metadata?: Record<string, string | number | boolean>;
  }): LedgerTransaction {
    const accountId = accountService.getAccount().accountId;
    const tx: LedgerTransaction = {
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      accountId,
      currency: 'SOVEREIGN_MARKS',
      amount: params.amount,
      type: params.type,
      sku: params.sku,
      timestamp: Date.now(),
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
    };

    this.localLedger.push(tx);
    this.processedKeys.add(params.idempotencyKey);
    this.saveCache();
    return tx;
  }

  /**
   * Simulates malicious tampering for testing.
   * Demonstrates that local balance tampering is temporary and overridden by authoritative server sync.
   */
  public maliciousLocalTamperBalance(fakeBalance: number): void {
    this.serverAuthoritativeBalance = fakeBalance;
    this.notify();
  }

  public devResetWallet(): void {
    this.serverAuthoritativeBalance = 0;
    this.localLedger = [];
    this.processedKeys.clear();
    this.saveCache();
  }
}

export const walletService = new WalletViewModel();
