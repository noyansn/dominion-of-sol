/**
 * DOMINION OF SOL — REGIONAL PRICING & FIRST HERITAGE TESTS
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { regionalPricingService, REGIONAL_PRICE_TIERS, STORE_REGION_CONFIGS } from '../src/meta/RegionalPricingService';

describe('Dominion of Sol — Regional Pricing & First Heritage Suite', () => {
  it('1. Regional price tiers: FULL (1.00), HIGH (0.80), MID (0.60), ACCESSIBLE (0.40)', () => {
    assert.strictEqual(REGIONAL_PRICE_TIERS.FULL.multiplier, 1.00);
    assert.strictEqual(REGIONAL_PRICE_TIERS.HIGH.multiplier, 0.80);
    assert.strictEqual(REGIONAL_PRICE_TIERS.MID.multiplier, 0.60);
    assert.strictEqual(REGIONAL_PRICE_TIERS.ACCESSIBLE.multiplier, 0.40);
  });

  it('2. Official billing storefront region support (US, GB, EU, TR, JP, BR)', () => {
    const regions = Object.keys(STORE_REGION_CONFIGS);
    assert.ok(regions.includes('US'));
    assert.ok(regions.includes('GB'));
    assert.ok(regions.includes('EU'));
    assert.ok(regions.includes('TR'));
    assert.ok(regions.includes('JP'));
    assert.ok(regions.includes('BR'));
  });

  it('3. Natural storefront price rounding (No raw floating decimals like 37.41)', () => {
    // US
    regionalPricingService.setRegion('US');
    assert.strictEqual(regionalPricingService.formatPrice(0.49), '$0.49');
    assert.strictEqual(regionalPricingService.formatPrice(2.99), '$2.99');
    assert.strictEqual(regionalPricingService.formatPrice(9.99), '$9.99');

    // TR
    regionalPricingService.setRegion('TR');
    assert.strictEqual(regionalPricingService.formatPrice(0.49), '9,99 ₺');
    assert.strictEqual(regionalPricingService.formatPrice(2.99), '49,99 ₺');
    assert.strictEqual(regionalPricingService.formatPrice(9.99), '169,99 ₺');

    // GB
    regionalPricingService.setRegion('GB');
    assert.strictEqual(regionalPricingService.formatPrice(0.49), '£0.39');
    assert.strictEqual(regionalPricingService.formatPrice(2.99), '£2.49');
    assert.strictEqual(regionalPricingService.formatPrice(9.99), '£7.99');

    // JP
    regionalPricingService.setRegion('JP');
    assert.strictEqual(regionalPricingService.formatPrice(0.49), '¥75');
    assert.strictEqual(regionalPricingService.formatPrice(2.99), '¥450');
    assert.strictEqual(regionalPricingService.formatPrice(9.99), '¥1,500');
  });

  it('4. First Heritage one-time introductory offer lifecycle', () => {
    regionalPricingService.setRegion('US');
    const offer = regionalPricingService.getFirstHeritageOffer('TÜRK');
    
    assert.strictEqual(offer.available, true);
    assert.strictEqual(offer.basePriceUsd, 0.99);
    assert.strictEqual(offer.formattedPrice, '$0.99');
    assert.strictEqual(offer.eligibleCivs.length, 9);
    assert.ok(offer.eligibleCivs.includes('TÜRK'));
    assert.ok(offer.eligibleCivs.includes('ROMA'));
    assert.ok(offer.eligibleCivs.includes('PERS'));

    // Redeem for chosen civ
    const success = regionalPricingService.redeemFirstHeritage('TÜRK');
    assert.strictEqual(success, true);
    assert.strictEqual(regionalPricingService.isFirstHeritageClaimed(), true);

    // Subsequent redemption rejected (one-time only)
    const duplicate = regionalPricingService.redeemFirstHeritage('ROMA');
    assert.strictEqual(duplicate, false);

    const afterOffer = regionalPricingService.getFirstHeritageOffer('TÜRK');
    assert.strictEqual(afterOffer.available, false);
  });
});
