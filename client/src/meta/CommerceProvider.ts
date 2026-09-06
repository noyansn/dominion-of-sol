/**
 * DOMINION OF SOL — COMMERCE PROVIDER & PURCHASE PIPELINE
 * 
 * Flow:
 * 1. Client chooses SKU
 * 2. Server/Service creates purchase intent
 * 3. Platform/Provider performs payment
 * 4. Provider receipt token returns
 * 5. Server/Service verifies receipt
 * 6. Checks idempotency & records ledger
 * 7. Grants entitlement
 * 8. Returns updated inventory
 * 
 * In development builds: DEV_COMMERCE_PROVIDER allows testing without real money.
 * In production: DEV_COMMERCE_PROVIDER is strictly rejected.
 */

import { catalogService, CatalogProduct } from './CatalogService';
import { walletService } from './WalletService';
import { entitlementService } from './EntitlementService';
import { seasonPassService } from './SeasonPassService';
import { accountService } from './AccountService';
import { telemetry } from './Telemetry';

export type PaymentOutcome =
  | 'SUCCESS'
  | 'USER_CANCELLED'
  | 'PAYMENT_FAILED'
  | 'RECEIPT_REJECTED'
  | 'DUPLICATE_TRANSACTION';

export interface PurchaseResult {
  success: boolean;
  outcome: PaymentOutcome;
  sku: string;
  transactionId?: string;
  error?: string;
}

export interface PurchaseIntent {
  intentId: string;
  sku: string;
  priceFormatted: string;
  timestamp: number;
}

class CommercePipeline {
  private devOutcomeOverride: PaymentOutcome | null = null;
  private processedReceipts = new Set<string>();

  public isDevMode(): boolean {
    return Boolean((import.meta as any).env?.DEV);
  }

  public setDevOutcomeOverride(outcome: PaymentOutcome | null): void {
    if (!this.isDevMode()) {
      throw new Error('[COMMERCE] Security violation: Dev outcome override is forbidden in production');
    }
    this.devOutcomeOverride = outcome;
  }

  public getDevOutcomeOverride(): PaymentOutcome | null {
    return this.devOutcomeOverride;
  }

  /**
   * Purchases a product using real currency via platform provider (or Dev provider).
   */
  public async purchaseWithRealCurrency(sku: string): Promise<PurchaseResult> {
    const product = catalogService.getProduct(sku);
    if (!product) {
      return { success: false, outcome: 'PAYMENT_FAILED', sku, error: 'SKU does not exist in catalog' };
    }

    telemetry.track('purchase_started', { sku, method: 'real_currency' });

    // Idempotency token
    const idempotencyKey = `idemp_${sku}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Record purchase intent
    walletService.recordTransaction({
      type: 'PURCHASE_INTENT',
      amount: 0,
      sku,
      idempotencyKey,
      metadata: { basePriceUsd: product.basePriceUsd }
    });

    // 2. Execute platform provider payment
    const outcome = await this.executePlatformPayment(sku);

    if (outcome === 'USER_CANCELLED') {
      telemetry.track('purchase_cancelled', { sku });
      return { success: false, outcome: 'USER_CANCELLED', sku, error: 'Payment was cancelled by user' };
    }

    if (outcome !== 'SUCCESS') {
      walletService.recordTransaction({
        type: 'FAILED',
        amount: 0,
        sku,
        idempotencyKey: `${idempotencyKey}_fail`,
        metadata: { outcome }
      });
      return { success: false, outcome, sku, error: `Payment failed: ${outcome}` };
    }

    // 3. Receipt verification & duplicate check
    const mockReceipt = `rcpt_${idempotencyKey}`;
    if (this.processedReceipts.has(mockReceipt)) {
      return { success: false, outcome: 'DUPLICATE_TRANSACTION', sku, error: 'Receipt replay rejected' };
    }
    this.processedReceipts.add(mockReceipt);

    walletService.recordTransaction({
      type: 'RECEIPT_VERIFIED',
      amount: 0,
      sku,
      idempotencyKey: `${idempotencyKey}_rcpt`,
    });

    // 4. Grant entitlements or wallet marks
    if (product.category === 'MARKS') {
      // Direct Marks grant
      const marksAmount = this.extractMarksFromSku(sku);
      walletService.grantMarks(marksAmount, sku, `${idempotencyKey}_grant`);
    } else {
      entitlementService.grantSku(sku);
      if (sku === 'dominion.pass.sovereign.s01') {
        seasonPassService.setPremiumOwned(true, false);
      } else if (sku === 'dominion.pass.sovereignplus.s01') {
        seasonPassService.setPremiumOwned(true, true);
      }
    }

    const tx = walletService.recordTransaction({
      type: 'ENTITLEMENT_GRANTED',
      amount: 0,
      sku,
      idempotencyKey: `${idempotencyKey}_entitle`,
    });

    telemetry.track('purchase_completed', { sku, txId: tx.transactionId });
    return { success: true, outcome: 'SUCCESS', sku, transactionId: tx.transactionId };
  }

  /**
   * Purchases a product using Sovereign Marks from the player's wallet.
   */
  public purchaseWithMarks(sku: string): PurchaseResult {
    const product = catalogService.getProduct(sku);
    if (!product) {
      return { success: false, outcome: 'PAYMENT_FAILED', sku, error: 'SKU not found' };
    }
    if (!product.premiumCurrencyPrice) {
      return { success: false, outcome: 'PAYMENT_FAILED', sku, error: 'Item cannot be purchased with Marks' };
    }

    const marksCost = product.premiumCurrencyPrice;
    const idempotencyKey = `idemp_marks_${sku}_${Date.now()}`;

    // Spend from wallet
    const spendResult = walletService.spendMarks(sku, marksCost, idempotencyKey);
    if (!spendResult.success) {
      return { success: false, outcome: 'PAYMENT_FAILED', sku, error: spendResult.reason };
    }

    // Grant entitlements
    entitlementService.grantSku(sku);
    if (sku === 'dominion.pass.sovereign.s01') {
      seasonPassService.setPremiumOwned(true, false);
    } else if (sku === 'dominion.pass.sovereignplus.s01') {
      seasonPassService.setPremiumOwned(true, true);
    }

    const tx = walletService.recordTransaction({
      type: 'ENTITLEMENT_GRANTED',
      amount: 0,
      sku,
      idempotencyKey: `${idempotencyKey}_entitle`,
    });

    return { success: true, outcome: 'SUCCESS', sku, transactionId: tx.transactionId };
  }

  /**
   * Simulates/executes refund, revoking entitlement.
   */
  public refund(sku: string): boolean {
    const idempotencyKey = `idemp_refund_${sku}_${Date.now()}`;
    entitlementService.revokeSku(sku);

    if (sku.startsWith('dominion.pass.')) {
      seasonPassService.setPremiumOwned(false, false);
    }

    walletService.recordTransaction({
      type: 'REFUND',
      amount: 0,
      sku,
      idempotencyKey,
    });

    walletService.recordTransaction({
      type: 'ENTITLEMENT_REVOKED',
      amount: 0,
      sku,
      idempotencyKey: `${idempotencyKey}_revoked`,
    });

    return true;
  }

  private async executePlatformPayment(sku: string): Promise<PaymentOutcome> {
    if (!this.isDevMode()) {
      // In production with unconfigured provider:
      throw new Error('[COMMERCE] Production payment provider not configured');
    }

    // Dev simulated outcome
    if (this.devOutcomeOverride) {
      return this.devOutcomeOverride;
    }

    // Default dev flow: simulate prompt/latency then succeed
    await new Promise(r => setTimeout(r, 200));
    return 'SUCCESS';
  }

  private extractMarksFromSku(sku: string): number {
    switch (sku) {
      case 'dominion.marks.pack.small': return 150;
      case 'dominion.marks.pack.standard': return 800;
      case 'dominion.marks.pack.large': return 1750;
      case 'dominion.marks.pack.collector': return 3800;
      default: return 100;
    }
  }
}

export const commercePipeline = new CommercePipeline();
