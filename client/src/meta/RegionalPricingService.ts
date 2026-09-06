/**
 * DOMINION OF SOL — REGIONAL PRICING & VALUE PROGRESSION SERVICE
 * 
 * Commercial Principles:
 * 1. STORE REGION TEST CONFIGURATION:
 *    Simulates storefront region configurations (never hidden personal profiling,
 *    never race, ethnicity, or inferred wealth). Note: Live production storefront integration
 *    will be supplied by official platform billing providers (App Store / Steam / Google Play).
 * 2. NATURAL STOREFRONT ROUNDING:
 *    Prices are rounded to clean storefront psychological price points
 *    (e.g., $2.99, £2.49, €2.99, ₺49.99, ¥450) instead of awkward raw floating points.
 * 3. NON-DISCRIMINATORY DIGNITY:
 *    Never displays "cheap", "local discount", or "PPP discount".
 *    All users in the same store region see the same dignified local prices.
 * 4. FIRST HERITAGE ONE-TIME INTRODUCTORY OFFER:
 *    One-time onboarding opportunity where the player chooses ANY one civilization
 *    to receive their 20 Reaction Pack + Ceremonial Pennant at an accessible intro price (~$0.99 base tier).
 */

import { safeStorage } from './StorageHelper';

export type StoreRegion = 'US' | 'GB' | 'EU' | 'TR' | 'JP' | 'BR';

export type PriceTierName = 'FULL' | 'HIGH' | 'MID' | 'ACCESSIBLE';

export interface RegionalPriceTier {
  name: PriceTierName;
  multiplier: number; // Configurable test multiplier
  description: string;
}

export const REGIONAL_PRICE_TIERS: Record<PriceTierName, RegionalPriceTier> = {
  FULL: { name: 'FULL', multiplier: 1.00, description: 'Standard global baseline storefront tier' },
  HIGH: { name: 'HIGH', multiplier: 0.80, description: 'High-tier regional purchasing power tier' },
  MID: { name: 'MID', multiplier: 0.60, description: 'Mid-tier regional purchasing power tier' },
  ACCESSIBLE: { name: 'ACCESSIBLE', multiplier: 0.40, description: 'Accessible regional storefront tier' },
};

export interface StoreRegionConfig {
  region: StoreRegion;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  symbolPosition: 'before' | 'after';
  defaultTier: PriceTierName;
  // Discrete natural price ladders for common price anchors
  priceLadder: Record<number, string>;
}

export const STORE_REGION_CONFIGS: Record<StoreRegion, StoreRegionConfig> = {
  US: {
    region: 'US',
    countryName: 'United States',
    currencyCode: 'USD',
    currencySymbol: '$',
    symbolPosition: 'before',
    defaultTier: 'FULL',
    priceLadder: {
      0.49: '$0.49',
      0.79: '$0.79',
      0.99: '$0.99',
      1.49: '$1.49',
      1.99: '$1.99',
      2.99: '$2.99',
      3.49: '$3.49',
      3.99: '$3.99',
      5.49: '$5.49',
      6.96: '$6.96',
      7.49: '$7.49',
      7.99: '$7.99',
      9.96: '$9.96',
      9.99: '$9.99',
      10.46: '$10.46',
      12.99: '$12.99',
      16.46: '$16.46',
    },
  },
  GB: {
    region: 'GB',
    countryName: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    symbolPosition: 'before',
    defaultTier: 'FULL',
    priceLadder: {
      0.49: '£0.39',
      0.79: '£0.69',
      0.99: '£0.79',
      1.49: '£1.19',
      1.99: '£1.59',
      2.99: '£2.49',
      3.49: '£2.99',
      3.99: '£3.29',
      5.49: '£4.49',
      6.96: '£5.59',
      7.49: '£5.99',
      7.99: '£6.49',
      9.96: '£7.99',
      9.99: '£7.99',
      10.46: '£8.49',
      12.99: '£10.99',
      16.46: '£13.49',
    },
  },
  EU: {
    region: 'EU',
    countryName: 'European Union',
    currencyCode: 'EUR',
    currencySymbol: '€',
    symbolPosition: 'before',
    defaultTier: 'FULL',
    priceLadder: {
      0.49: '€0.49',
      0.79: '€0.79',
      0.99: '€0.99',
      1.49: '€1.49',
      1.99: '€1.99',
      2.99: '€2.99',
      3.49: '€3.49',
      3.99: '€3.99',
      5.49: '€5.49',
      6.96: '€6.96',
      7.49: '€7.49',
      7.99: '€7.99',
      9.96: '€9.96',
      9.99: '€9.99',
      10.46: '€10.46',
      12.99: '€12.99',
      16.46: '€16.46',
    },
  },
  TR: {
    region: 'TR',
    countryName: 'Türkiye',
    currencyCode: 'TRY',
    currencySymbol: '₺',
    symbolPosition: 'after',
    defaultTier: 'ACCESSIBLE',
    priceLadder: {
      0.49: '9,99 ₺',
      0.79: '14,99 ₺',
      0.99: '19,99 ₺',
      1.49: '24,99 ₺',
      1.99: '29,99 ₺',
      2.99: '49,99 ₺',
      3.49: '59,99 ₺',
      3.99: '69,99 ₺',
      5.49: '89,99 ₺',
      6.96: '114,99 ₺',
      7.49: '124,99 ₺',
      7.99: '129,99 ₺',
      9.96: '164,99 ₺',
      9.99: '169,99 ₺',
      10.46: '174,99 ₺',
      12.99: '219,99 ₺',
      16.46: '279,99 ₺',
    },
  },
  JP: {
    region: 'JP',
    countryName: 'Japan',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    symbolPosition: 'before',
    defaultTier: 'FULL',
    priceLadder: {
      0.49: '¥75',
      0.79: '¥120',
      0.99: '¥150',
      1.49: '¥220',
      1.99: '¥300',
      2.99: '¥450',
      3.49: '¥520',
      3.99: '¥600',
      5.49: '¥820',
      6.96: '¥1,050',
      7.49: '¥1,120',
      7.99: '¥1,200',
      9.96: '¥1,500',
      9.99: '¥1,500',
      10.46: '¥1,580',
      12.99: '¥1,950',
      16.46: '¥2,480',
    },
  },
  BR: {
    region: 'BR',
    countryName: 'Brazil',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    symbolPosition: 'before',
    defaultTier: 'MID',
    priceLadder: {
      0.49: 'R$1,99',
      0.79: 'R$2,99',
      0.99: 'R$3,99',
      1.49: 'R$5,99',
      1.99: 'R$7,99',
      2.99: 'R$11,99',
      3.49: 'R$13,99',
      3.99: 'R$15,99',
      5.49: 'R$21,99',
      6.96: 'R$27,99',
      7.49: 'R$29,99',
      7.99: 'R$31,99',
      9.96: 'R$39,99',
      9.99: 'R$39,99',
      10.46: 'R$41,99',
      12.99: 'R$49,99',
      16.46: 'R$65,99',
    },
  },
};

const STORAGE_KEY_FIRST_HERITAGE = 'dominion.first_heritage_redeemed';

export interface FirstHeritageOffer {
  available: boolean;
  basePriceUsd: number; // ~$0.99 equivalent baseline
  formattedPrice: string;
  selectedCiv: string;
  eligibleCivs: string[];
}

export class RegionalPricingService {
  private currentRegion: StoreRegion = 'US';
  private activeTier: PriceTierName = 'FULL';
  private firstHeritageRedeemed: boolean = false;

  constructor() {
    this.firstHeritageRedeemed = safeStorage.getItem(STORAGE_KEY_FIRST_HERITAGE) === 'true';
  }

  public getRegion(): StoreRegion {
    return this.currentRegion;
  }

  public setRegion(region: StoreRegion): void {
    if (STORE_REGION_CONFIGS[region]) {
      this.currentRegion = region;
      this.activeTier = STORE_REGION_CONFIGS[region].defaultTier;
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('dominion:store-region-changed', {
          detail: { region, tier: this.activeTier }
        }));
      }
    }
  }

  public getTier(): PriceTierName {
    return this.activeTier;
  }

  public setTier(tier: PriceTierName): void {
    if (REGIONAL_PRICE_TIERS[tier]) {
      this.activeTier = tier;
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('dominion:store-tier-changed', {
          detail: { tier }
        }));
      }
    }
  }

  /**
   * Format any base USD price into clean, natural storefront regional price
   */
  public formatPrice(basePriceUsd: number): string {
    const config = STORE_REGION_CONFIGS[this.currentRegion] || STORE_REGION_CONFIGS.US;
    
    // Check exact ladder match first
    if (config.priceLadder[basePriceUsd]) {
      return config.priceLadder[basePriceUsd];
    }

    // Otherwise apply tier multiplier with natural rounding
    const tier = REGIONAL_PRICE_TIERS[this.activeTier] || REGIONAL_PRICE_TIERS.FULL;
    const adjustedUsd = basePriceUsd * tier.multiplier;
    
    // Find closest anchor in ladder or format cleanly
    const anchors = Object.keys(config.priceLadder).map(Number).sort((a, b) => a - b);
    let closest = anchors[0];
    let minDiff = Math.abs(adjustedUsd - closest);
    for (const a of anchors) {
      const diff = Math.abs(adjustedUsd - a);
      if (diff < minDiff) {
        minDiff = diff;
        closest = a;
      }
    }

    // If close enough to an anchor (within 12%), use the natural ladder string
    if (minDiff <= 0.12 * closest && config.priceLadder[closest]) {
      return config.priceLadder[closest];
    }

    // Fallback standard currency formatting
    const isZeroDecimal = config.currencyCode === 'JPY';
    const amountStr = isZeroDecimal
      ? Math.round(adjustedUsd * 150).toLocaleString('en-US')
      : (adjustedUsd * (this.currentRegion === 'TR' ? 34.5 : this.currentRegion === 'BR' ? 5.5 : 1.0)).toFixed(2);

    return config.symbolPosition === 'before'
      ? `${config.currencySymbol}${amountStr}`
      : `${amountStr} ${config.currencySymbol}`;
  }

  /**
   * Status of First Heritage one-time intro offer
   */
  public getFirstHeritageOffer(selectedCiv: string = 'TÜRK'): FirstHeritageOffer {
    const isAvailable = !this.firstHeritageRedeemed;
    const basePriceUsd = 0.99;
    const formattedPrice = this.formatPrice(basePriceUsd);

    return {
      available: isAvailable,
      basePriceUsd,
      formattedPrice,
      selectedCiv,
      eligibleCivs: ['TÜRK', 'ROMA', 'PERS', 'MISIR', 'HAN', 'YAMATO', 'NORSE', 'MAYA', 'LAKOTA'],
    };
  }

  public isFirstHeritageClaimed(): boolean {
    return this.firstHeritageRedeemed;
  }

  public claimFirstHeritage(civ: string): boolean {
    return this.redeemFirstHeritage(civ);
  }

  public redeemFirstHeritage(civ: string): boolean {
    if (this.firstHeritageRedeemed) return false;
    this.firstHeritageRedeemed = true;
    safeStorage.setItem(STORAGE_KEY_FIRST_HERITAGE, 'true');
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dominion:first-heritage-redeemed', {
        detail: { civ }
      }));
    }
    return true;
  }
}

export const regionalPricingService = new RegionalPricingService();
