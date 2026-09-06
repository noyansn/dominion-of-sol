/**
 * DOMINION OF SOL — STORE CATALOG & SKU ARCHITECTURE
 * Authoritative client catalog and regional pricing system.
 * Zero pay-to-win: No product sold can ever modify combat, population, doctrine or map advantage.
 */

import { regionalPricingService, StoreRegion } from './RegionalPricingService';

export type CatalogCategory =
  | 'FEATURED'
  | 'BLADES'
  | 'REACTIONS'
  | 'IDENTITY'
  | 'PASS'
  | 'MARKS'
  | 'CIVILIZATION'
  | 'COMMAND BLADES'
  | 'PROFILE';

export type ProductRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type ProductPreviewType =
  | 'blade'
  | 'reaction'
  | 'bundle'
  | 'pass'
  | 'frame'
  | 'title'
  | 'marks';

export type PriceRegion = 'US' | 'TR' | 'EU' | 'UK' | 'JP';

export interface RegionalCurrencyInfo {
  region: PriceRegion;
  currencyCode: string;
  currencySymbol: string;
  symbolPosition: 'before' | 'after';
  multiplier: number;
  decimalPlaces: number;
}

export const REGIONAL_CURRENCIES: Record<PriceRegion, RegionalCurrencyInfo> = {
  US: { region: 'US', currencyCode: 'USD', currencySymbol: '$', symbolPosition: 'before', multiplier: 1.0, decimalPlaces: 2 },
  TR: { region: 'TR', currencyCode: 'TRY', currencySymbol: '₺', symbolPosition: 'after', multiplier: 34.5, decimalPlaces: 2 },
  EU: { region: 'EU', currencyCode: 'EUR', currencySymbol: '€', symbolPosition: 'before', multiplier: 0.92, decimalPlaces: 2 },
  UK: { region: 'UK', currencyCode: 'GBP', currencySymbol: '£', symbolPosition: 'before', multiplier: 0.79, decimalPlaces: 2 },
  JP: { region: 'JP', currencyCode: 'JPY', currencySymbol: '¥', symbolPosition: 'before', multiplier: 155.0, decimalPlaces: 0 },
};

export interface CatalogProduct {
  sku: string;
  category: CatalogCategory;
  displayName: string;
  description: string;
  basePriceUsd: number; // In USD dollars (e.g. 2.99)
  premiumCurrencyPrice?: number; // Sovereign Marks price (e.g. 450)
  entitlements: string[];
  civilizationRestriction?: string;
  rarity: ProductRarity;
  previewType: ProductPreviewType;
  previewReferenceId: string;
  availability: 'available' | 'season_limited';
  season?: string;
  featuredOrder?: number;
  badgeLabel?: string;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  // ============================================================
  // FEATURED & STARTER
  // ============================================================
  {
    sku: 'dominion.starter.founder01',
    category: 'FEATURED',
    displayName: 'First Dominion Pack',
    description: 'Founder Frame · Title · 300 Marks',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    entitlements: ['frame_founder', 'title_founder', 'marks_grant_300'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'starter_bundle',
    availability: 'available',
    featuredOrder: 1,
  },
  {
    sku: 'dominion.bundle.turk.ottoman01',
    category: 'CIVILIZATION',
    displayName: 'Ottoman Imperial Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 12.99,
    premiumCurrencyPrice: 1950,
    civilizationRestriction: 'OTTOMAN',
    entitlements: [
      'blade_turk_imperial',
      'reaction_turk_victory_laugh',
      'reaction_turk_pasha_smirk',
      'reaction_turk_sultan_nod',
      'reaction_turk_divan_side_eye',
      'reaction_turk_too_easy',
      'reaction_turk_slow_clap',
      'reaction_turk_facepalm',
      'reaction_turk_disbelief',
      'reaction_turk_janissary_roar',
      'reaction_turk_furious_rage',
      'reaction_turk_crying_defeat',
      'reaction_turk_nervous_sweat',
      'reaction_turk_deadpan',
      'reaction_turk_respectful_nod',
      'reaction_turk_salute',
      'reaction_turk_scheming',
      'reaction_turk_mischief',
      'reaction_turk_yawn',
      'reaction_turk_mehter_triumph',
      'reaction_turk_challenge',
      'frame_turk_divan',
      'pennant_turk',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_turk_imperial',
    availability: 'available',
    featuredOrder: 2,
  },
  {
    sku: 'dominion.bundle.roma.triumph01',
    category: 'CIVILIZATION',
    displayName: 'ROMA Triumphal Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 7.99,
    premiumCurrencyPrice: 1200,
    civilizationRestriction: 'ROMA',
    entitlements: [
      'blade_roma_legion',
      'reaction_roma_triumph_laugh',
      'reaction_roma_senator_smirk',
      'reaction_roma_caesar_nod',
      'reaction_roma_senator_side_eye',
      'reaction_roma_too_easy',
      'reaction_roma_slow_clap',
      'reaction_roma_facepalm',
      'reaction_roma_shock',
      'reaction_roma_centurion_roar',
      'reaction_roma_fury',
      'reaction_roma_crying',
      'reaction_roma_nervous',
      'reaction_roma_deadpan',
      'reaction_roma_respect',
      'reaction_roma_salute',
      'reaction_roma_scheming',
      'reaction_roma_mischief',
      'reaction_roma_yawn',
      'reaction_roma_colosseum_cheer',
      'reaction_roma_gladiator_challenge',
      'frame_roma_laurel',
      'pennant_roma',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_roma_legion',
    availability: 'available',
    featuredOrder: 3,
  },
  {
    sku: 'dominion.bundle.pers01',
    category: 'CIVILIZATION',
    displayName: 'PERS Royal Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 5.49,
    premiumCurrencyPrice: 825,
    civilizationRestriction: 'PERS',
    entitlements: [
      'blade_pers_shamshir',
      'reaction_pers_royal_laugh',
      'reaction_pers_shah_smirk',
      'reaction_pers_cyrus_nod',
      'reaction_pers_court_side_eye',
      'reaction_pers_too_easy',
      'reaction_pers_slow_clap',
      'reaction_pers_facepalm',
      'reaction_pers_shock',
      'reaction_pers_immortal_roar',
      'reaction_pers_fury',
      'reaction_pers_crying',
      'reaction_pers_nervous',
      'reaction_pers_deadpan',
      'reaction_pers_respect',
      'reaction_pers_salute',
      'reaction_pers_scheming',
      'reaction_pers_mischief',
      'reaction_pers_yawn',
      'reaction_pers_cheer',
      'reaction_pers_challenge',
      'frame_pers_apadana',
      'pennant_pers',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_pers_shamshir',
    availability: 'available',
  },
  {
    sku: 'dominion.bundle.misir01',
    category: 'CIVILIZATION',
    displayName: 'MISIR Dynasty Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 7.49,
    premiumCurrencyPrice: 1125,
    civilizationRestriction: 'MISIR',
    entitlements: [
      'blade_misir_khopesh',
      'reaction_misir_pharaoh_laugh',
      'reaction_misir_vizier_smirk',
      'reaction_misir_pharaoh_nod',
      'reaction_misir_priest_side_eye',
      'reaction_misir_too_easy',
      'reaction_misir_slow_clap',
      'reaction_misir_facepalm',
      'reaction_misir_shock',
      'reaction_misir_warrior_roar',
      'reaction_misir_fury',
      'reaction_misir_crying',
      'reaction_misir_nervous',
      'reaction_misir_deadpan',
      'reaction_misir_respect',
      'reaction_misir_salute',
      'reaction_misir_scheming',
      'reaction_misir_mischief',
      'reaction_misir_yawn',
      'reaction_misir_cheer',
      'reaction_misir_challenge',
      'frame_misir_dynastic',
      'pennant_misir',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_misir_khopesh',
    availability: 'available',
  },
  {
    sku: 'dominion.bundle.han.dynasty01',
    category: 'CIVILIZATION',
    displayName: 'Grand Han Dynasty Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 7.99,
    premiumCurrencyPrice: 1200,
    civilizationRestriction: 'HAN',
    entitlements: [
      'blade_han_celestial',
      'reaction_han_emperor_laugh',
      'reaction_han_strategist_smirk',
      'reaction_han_son_nod',
      'reaction_han_minister_side_eye',
      'reaction_han_too_easy',
      'reaction_han_slow_clap',
      'reaction_han_facepalm',
      'reaction_han_shock',
      'reaction_han_general_roar',
      'reaction_han_fury',
      'reaction_han_crying',
      'reaction_han_nervous',
      'reaction_han_deadpan',
      'reaction_han_respect',
      'reaction_han_salute',
      'reaction_han_scheming',
      'reaction_han_mischief',
      'reaction_han_yawn',
      'reaction_han_cheer',
      'reaction_han_challenge',
      'frame_han_celestial',
      'pennant_han',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_han_celestial',
    availability: 'available',
  },
  {
    sku: 'dominion.bundle.yamato01',
    category: 'CIVILIZATION',
    displayName: 'YAMATO Shogunate Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 7.99,
    premiumCurrencyPrice: 1200,
    civilizationRestriction: 'YAMATO',
    entitlements: [
      'blade_yamato_shogunate',
      'reaction_yamato_shogun_laugh',
      'reaction_yamato_ronin_smirk',
      'reaction_yamato_daimyo_nod',
      'reaction_yamato_shinobi_side_eye',
      'reaction_yamato_too_easy',
      'reaction_yamato_slow_clap',
      'reaction_yamato_facepalm',
      'reaction_yamato_shock',
      'reaction_yamato_samurai_roar',
      'reaction_yamato_fury',
      'reaction_yamato_crying',
      'reaction_yamato_nervous',
      'reaction_yamato_deadpan',
      'reaction_yamato_respect',
      'reaction_yamato_salute',
      'reaction_yamato_scheming',
      'reaction_yamato_mischief',
      'reaction_yamato_yawn',
      'reaction_yamato_cheer',
      'reaction_yamato_challenge',
      'frame_yamato_shogunate',
      'pennant_yamato',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_yamato_shogunate',
    availability: 'available',
  },
  {
    sku: 'dominion.bundle.norse01',
    category: 'CIVILIZATION',
    displayName: 'NORSE Valhalla Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 7.99,
    premiumCurrencyPrice: 1200,
    civilizationRestriction: 'NORSE',
    entitlements: [
      'blade_norse_raven',
      'reaction_norse_jarl_laugh',
      'reaction_norse_skald_smirk',
      'reaction_norse_allfather_nod',
      'reaction_norse_shieldmaiden_side_eye',
      'reaction_norse_too_easy',
      'reaction_norse_slow_clap',
      'reaction_norse_facepalm',
      'reaction_norse_shock',
      'reaction_norse_berserker_roar',
      'reaction_norse_fury',
      'reaction_norse_crying',
      'reaction_norse_nervous',
      'reaction_norse_deadpan',
      'reaction_norse_respect',
      'reaction_norse_salute',
      'reaction_norse_scheming',
      'reaction_norse_mischief',
      'reaction_norse_yawn',
      'reaction_norse_cheer',
      'reaction_norse_challenge',
      'frame_norse_raven',
      'pennant_norse',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_norse_raven',
    availability: 'available',
  },
  {
    sku: 'dominion.bundle.maya01',
    category: 'CIVILIZATION',
    displayName: 'MAYA Solar Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 7.49,
    premiumCurrencyPrice: 1125,
    civilizationRestriction: 'MAYA',
    entitlements: [
      'blade_maya_macuahuitl',
      'reaction_maya_king_laugh',
      'reaction_maya_priest_smirk',
      'reaction_maya_sun_nod',
      'reaction_maya_scribe_side_eye',
      'reaction_maya_too_easy',
      'reaction_maya_slow_clap',
      'reaction_maya_facepalm',
      'reaction_maya_shock',
      'reaction_maya_jaguar_roar',
      'reaction_maya_fury',
      'reaction_maya_crying',
      'reaction_maya_nervous',
      'reaction_maya_deadpan',
      'reaction_maya_respect',
      'reaction_maya_salute',
      'reaction_maya_scheming',
      'reaction_maya_mischief',
      'reaction_maya_yawn',
      'reaction_maya_cheer',
      'reaction_maya_challenge',
      'frame_maya_solar',
      'pennant_maya',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_maya_macuahuitl',
    availability: 'available',
  },
  {
    sku: 'dominion.bundle.lakota01',
    category: 'CIVILIZATION',
    displayName: 'LAKOTA Plains Collection',
    description: 'Blade · 20 Expressions · Identity Set · Pennant',
    basePriceUsd: 5.49,
    premiumCurrencyPrice: 825,
    civilizationRestriction: 'LAKOTA',
    entitlements: [
      'blade_lakota_command',
      'reaction_lakota_rider_laugh',
      'reaction_lakota_scout_smirk',
      'reaction_lakota_chief_nod',
      'reaction_lakota_hunter_side_eye',
      'reaction_lakota_too_easy',
      'reaction_lakota_slow_clap',
      'reaction_lakota_facepalm',
      'reaction_lakota_shock',
      'reaction_lakota_warrior_roar',
      'reaction_lakota_fury',
      'reaction_lakota_crying',
      'reaction_lakota_nervous',
      'reaction_lakota_deadpan',
      'reaction_lakota_respect',
      'reaction_lakota_salute',
      'reaction_lakota_scheming',
      'reaction_lakota_mischief',
      'reaction_lakota_yawn',
      'reaction_lakota_cheer',
      'reaction_lakota_challenge',
      'frame_lakota_council',
      'pennant_lakota',
    ],
    rarity: 'legendary',
    previewType: 'bundle',
    previewReferenceId: 'blade_lakota_command',
    availability: 'available',
  },

  // ============================================================
  // SOVEREIGN PASS
  // ============================================================
  {
    sku: 'dominion.pass.sovereign.s01',
    category: 'PASS',
    displayName: 'Sovereign Pass — Season 1',
    description: '20 Tiers of Cultural Cosmetics & Marks',
    basePriceUsd: 5.99,
    premiumCurrencyPrice: 900,
    entitlements: ['pass_season_01_premium'],
    rarity: 'epic',
    previewType: 'pass',
    previewReferenceId: 'season_01',
    availability: 'season_limited',
    season: 's01',
    featuredOrder: 4,
  },
  {
    sku: 'dominion.pass.sovereignplus.s01',
    category: 'PASS',
    displayName: 'Sovereign Pass Plus — Season 1',
    description: 'Instant 15 Tiers · Vanguard Banner · Title',
    basePriceUsd: 9.99,
    premiumCurrencyPrice: 1500,
    entitlements: ['pass_season_01_premium', 'pass_season_01_plus', 'title_vanguard'],
    rarity: 'legendary',
    previewType: 'pass',
    previewReferenceId: 'season_01',
    availability: 'season_limited',
    season: 's01',
  },

  // ============================================================
  // COMMAND BLADES (REBALANCED PRICING LADDER)
  // ============================================================
  {
    sku: 'dominion.blade.imperial01',
    category: 'COMMAND BLADES',
    displayName: 'Imperial Crescent Blade',
    description: 'Curved Kilij · Flared Yalman',
    basePriceUsd: 9.99,
    premiumCurrencyPrice: 1500,
    civilizationRestriction: 'TÜRK',
    entitlements: ['blade_turk_imperial'],
    rarity: 'legendary',
    previewType: 'blade',
    previewReferenceId: 'blade_turk_imperial',
    availability: 'available',
    badgeLabel: 'MASTERWORK',
  },
  {
    sku: 'dominion.blade.shamshir01',
    category: 'COMMAND BLADES',
    displayName: 'Solar Shamshir',
    description: 'Sweeping Crucible Damascus',
    basePriceUsd: 0.49,
    premiumCurrencyPrice: 75,
    civilizationRestriction: 'PERS',
    entitlements: ['blade_pers_shamshir'],
    rarity: 'rare',
    previewType: 'blade',
    previewReferenceId: 'blade_pers_shamshir',
    availability: 'available',
    badgeLabel: 'ENTRY OFFER',
  },
  {
    sku: 'dominion.blade.blackhills01',
    category: 'COMMAND BLADES',
    displayName: 'Plains Forged Command',
    description: 'River-Tempered Prairie Carbon',
    basePriceUsd: 0.49,
    premiumCurrencyPrice: 75,
    civilizationRestriction: 'LAKOTA',
    entitlements: ['blade_lakota_command'],
    rarity: 'rare',
    previewType: 'blade',
    previewReferenceId: 'blade_lakota_command',
    availability: 'available',
    badgeLabel: 'ENTRY OFFER',
  },
  {
    sku: 'dominion.blade.legion01',
    category: 'COMMAND BLADES',
    displayName: 'Legion Command Blade',
    description: 'Polished Spanish Steel Spatha',
    basePriceUsd: 3.99,
    premiumCurrencyPrice: 600,
    civilizationRestriction: 'ROMA',
    entitlements: ['blade_roma_legion'],
    rarity: 'epic',
    previewType: 'blade',
    previewReferenceId: 'blade_roma_legion',
    availability: 'available',
  },
  {
    sku: 'dominion.blade.celestial01',
    category: 'COMMAND BLADES',
    displayName: 'Celestial Steel Jian',
    description: 'Folded Straight Masterwork',
    basePriceUsd: 3.99,
    premiumCurrencyPrice: 600,
    civilizationRestriction: 'HAN',
    entitlements: ['blade_han_celestial'],
    rarity: 'legendary',
    previewType: 'blade',
    previewReferenceId: 'blade_han_celestial',
    availability: 'available',
  },
  {
    sku: 'dominion.blade.shogunate01',
    category: 'COMMAND BLADES',
    displayName: 'Shogunate Edge Katana',
    description: 'Black Mirror Roiro Katana',
    basePriceUsd: 3.99,
    premiumCurrencyPrice: 600,
    civilizationRestriction: 'YAMATO',
    entitlements: ['blade_yamato_shogunate'],
    rarity: 'legendary',
    previewType: 'blade',
    previewReferenceId: 'blade_yamato_shogunate',
    availability: 'available',
  },
  {
    sku: 'dominion.blade.raven01',
    category: 'COMMAND BLADES',
    displayName: 'Raven Forge Blade',
    description: 'Arctic Runic Fuller Iron',
    basePriceUsd: 3.99,
    premiumCurrencyPrice: 600,
    civilizationRestriction: 'NORSE',
    entitlements: ['blade_norse_raven'],
    rarity: 'epic',
    previewType: 'blade',
    previewReferenceId: 'blade_norse_raven',
    availability: 'available',
  },
  {
    sku: 'dominion.blade.khopesh01',
    category: 'COMMAND BLADES',
    displayName: 'Pharaonic Khopesh',
    description: 'Sickled Cleaving Bronze Alloy',
    basePriceUsd: 3.49,
    premiumCurrencyPrice: 525,
    civilizationRestriction: 'MISIR',
    entitlements: ['blade_misir_khopesh'],
    rarity: 'rare',
    previewType: 'blade',
    previewReferenceId: 'blade_misir_khopesh',
    availability: 'available',
  },
  {
    sku: 'dominion.blade.macuahuitl01',
    category: 'COMMAND BLADES',
    displayName: 'Obsidian Sun Macuahuitl',
    description: 'Mahogany Core · Obsidian Facets',
    basePriceUsd: 3.49,
    premiumCurrencyPrice: 525,
    civilizationRestriction: 'MAYA',
    entitlements: ['blade_maya_macuahuitl'],
    rarity: 'rare',
    previewType: 'blade',
    previewReferenceId: 'blade_maya_macuahuitl',
    availability: 'available',
  },

  // ============================================================
  // REACTION PACKS (ALL 9 CIVILIZATIONS: EXACTLY 20 REACTIONS, $2.99 / 450 MARKS)
  // ============================================================
  {
    sku: 'dominion.reactions.turk.court01',
    category: 'REACTIONS',
    displayName: 'Ottoman Court Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'TÜRK',
    entitlements: [
      'reaction_turk_victory_laugh',
      'reaction_turk_pasha_smirk',
      'reaction_turk_sultan_nod',
      'reaction_turk_divan_side_eye',
      'reaction_turk_too_easy',
      'reaction_turk_slow_clap',
      'reaction_turk_facepalm',
      'reaction_turk_disbelief',
      'reaction_turk_janissary_roar',
      'reaction_turk_furious_rage',
      'reaction_turk_crying_defeat',
      'reaction_turk_nervous_sweat',
      'reaction_turk_deadpan',
      'reaction_turk_respectful_nod',
      'reaction_turk_salute',
      'reaction_turk_scheming',
      'reaction_turk_mischief',
      'reaction_turk_yawn',
      'reaction_turk_mehter_triumph',
      'reaction_turk_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_turk_pasha_smirk',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.roma.legion01',
    category: 'REACTIONS',
    displayName: 'Roman Legion Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'ROMA',
    entitlements: [
      'reaction_roma_triumph_laugh',
      'reaction_roma_senator_smirk',
      'reaction_roma_caesar_nod',
      'reaction_roma_senator_side_eye',
      'reaction_roma_too_easy',
      'reaction_roma_slow_clap',
      'reaction_roma_facepalm',
      'reaction_roma_shock',
      'reaction_roma_centurion_roar',
      'reaction_roma_fury',
      'reaction_roma_crying',
      'reaction_roma_nervous',
      'reaction_roma_deadpan',
      'reaction_roma_respect',
      'reaction_roma_salute',
      'reaction_roma_scheming',
      'reaction_roma_mischief',
      'reaction_roma_yawn',
      'reaction_roma_colosseum_cheer',
      'reaction_roma_gladiator_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_roma_triumph_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.pers01',
    category: 'REACTIONS',
    displayName: 'Persian Court Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'PERS',
    entitlements: [
      'reaction_pers_royal_laugh',
      'reaction_pers_shah_smirk',
      'reaction_pers_cyrus_nod',
      'reaction_pers_court_side_eye',
      'reaction_pers_too_easy',
      'reaction_pers_slow_clap',
      'reaction_pers_facepalm',
      'reaction_pers_shock',
      'reaction_pers_immortal_roar',
      'reaction_pers_fury',
      'reaction_pers_crying',
      'reaction_pers_nervous',
      'reaction_pers_deadpan',
      'reaction_pers_respect',
      'reaction_pers_salute',
      'reaction_pers_scheming',
      'reaction_pers_mischief',
      'reaction_pers_yawn',
      'reaction_pers_cheer',
      'reaction_pers_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_pers_royal_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.misir01',
    category: 'REACTIONS',
    displayName: 'Pharaonic Royal Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'MISIR',
    entitlements: [
      'reaction_misir_pharaoh_laugh',
      'reaction_misir_vizier_smirk',
      'reaction_misir_pharaoh_nod',
      'reaction_misir_priest_side_eye',
      'reaction_misir_too_easy',
      'reaction_misir_slow_clap',
      'reaction_misir_facepalm',
      'reaction_misir_shock',
      'reaction_misir_warrior_roar',
      'reaction_misir_fury',
      'reaction_misir_crying',
      'reaction_misir_nervous',
      'reaction_misir_deadpan',
      'reaction_misir_respect',
      'reaction_misir_salute',
      'reaction_misir_scheming',
      'reaction_misir_mischief',
      'reaction_misir_yawn',
      'reaction_misir_cheer',
      'reaction_misir_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_misir_pharaoh_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.han.dynasty01',
    category: 'REACTIONS',
    displayName: 'Han Imperial Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'HAN',
    entitlements: [
      'reaction_han_emperor_laugh',
      'reaction_han_strategist_smirk',
      'reaction_han_son_nod',
      'reaction_han_minister_side_eye',
      'reaction_han_too_easy',
      'reaction_han_slow_clap',
      'reaction_han_facepalm',
      'reaction_han_shock',
      'reaction_han_general_roar',
      'reaction_han_fury',
      'reaction_han_crying',
      'reaction_han_nervous',
      'reaction_han_deadpan',
      'reaction_han_respect',
      'reaction_han_salute',
      'reaction_han_scheming',
      'reaction_han_mischief',
      'reaction_han_yawn',
      'reaction_han_cheer',
      'reaction_han_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_han_emperor_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.yamato.honor01',
    category: 'REACTIONS',
    displayName: 'Yamato Honor Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'YAMATO',
    entitlements: [
      'reaction_yamato_shogun_laugh',
      'reaction_yamato_ronin_smirk',
      'reaction_yamato_daimyo_nod',
      'reaction_yamato_shinobi_side_eye',
      'reaction_yamato_too_easy',
      'reaction_yamato_slow_clap',
      'reaction_yamato_facepalm',
      'reaction_yamato_shock',
      'reaction_yamato_samurai_roar',
      'reaction_yamato_fury',
      'reaction_yamato_crying',
      'reaction_yamato_nervous',
      'reaction_yamato_deadpan',
      'reaction_yamato_respect',
      'reaction_yamato_salute',
      'reaction_yamato_scheming',
      'reaction_yamato_mischief',
      'reaction_yamato_yawn',
      'reaction_yamato_cheer',
      'reaction_yamato_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_yamato_shogun_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.norse.valhalla01',
    category: 'REACTIONS',
    displayName: 'Norse War Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'NORSE',
    entitlements: [
      'reaction_norse_jarl_laugh',
      'reaction_norse_skald_smirk',
      'reaction_norse_allfather_nod',
      'reaction_norse_shieldmaiden_side_eye',
      'reaction_norse_too_easy',
      'reaction_norse_slow_clap',
      'reaction_norse_facepalm',
      'reaction_norse_shock',
      'reaction_norse_berserker_roar',
      'reaction_norse_fury',
      'reaction_norse_crying',
      'reaction_norse_nervous',
      'reaction_norse_deadpan',
      'reaction_norse_respect',
      'reaction_norse_salute',
      'reaction_norse_scheming',
      'reaction_norse_mischief',
      'reaction_norse_yawn',
      'reaction_norse_cheer',
      'reaction_norse_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_norse_jarl_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.maya01',
    category: 'REACTIONS',
    displayName: 'Maya Solar Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'MAYA',
    entitlements: [
      'reaction_maya_king_laugh',
      'reaction_maya_priest_smirk',
      'reaction_maya_sun_nod',
      'reaction_maya_scribe_side_eye',
      'reaction_maya_too_easy',
      'reaction_maya_slow_clap',
      'reaction_maya_facepalm',
      'reaction_maya_shock',
      'reaction_maya_jaguar_roar',
      'reaction_maya_fury',
      'reaction_maya_crying',
      'reaction_maya_nervous',
      'reaction_maya_deadpan',
      'reaction_maya_respect',
      'reaction_maya_salute',
      'reaction_maya_scheming',
      'reaction_maya_mischief',
      'reaction_maya_yawn',
      'reaction_maya_cheer',
      'reaction_maya_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_maya_king_laugh',
    availability: 'available',
  },
  {
    sku: 'dominion.reactions.lakota01',
    category: 'REACTIONS',
    displayName: 'Lakota Horizon Expressions',
    description: '20 Cultural Expressions · Masterwork Set',
    basePriceUsd: 2.99,
    premiumCurrencyPrice: 450,
    civilizationRestriction: 'LAKOTA',
    entitlements: [
      'reaction_lakota_rider_laugh',
      'reaction_lakota_scout_smirk',
      'reaction_lakota_chief_nod',
      'reaction_lakota_hunter_side_eye',
      'reaction_lakota_too_easy',
      'reaction_lakota_slow_clap',
      'reaction_lakota_facepalm',
      'reaction_lakota_shock',
      'reaction_lakota_warrior_roar',
      'reaction_lakota_fury',
      'reaction_lakota_crying',
      'reaction_lakota_nervous',
      'reaction_lakota_deadpan',
      'reaction_lakota_respect',
      'reaction_lakota_salute',
      'reaction_lakota_scheming',
      'reaction_lakota_mischief',
      'reaction_lakota_yawn',
      'reaction_lakota_cheer',
      'reaction_lakota_challenge',
    ],
    rarity: 'epic',
    previewType: 'reaction',
    previewReferenceId: 'reaction_lakota_rider_laugh',
    availability: 'available',
  },

  // ============================================================
  // SOVEREIGN MARKS (PREMIUM CURRENCY PACKS)
  // ============================================================
  {
    sku: 'dominion.marks.pack.small',
    category: 'MARKS',
    displayName: 'Marks Cache (150 Marks)',
    description: 'Modest Cache for Expressions',
    basePriceUsd: 0.99,
    entitlements: ['marks_grant_150'],
    rarity: 'common',
    previewType: 'marks',
    previewReferenceId: 'marks_small',
    availability: 'available',
  },
  {
    sku: 'dominion.marks.pack.standard',
    category: 'MARKS',
    displayName: 'Marks Coffer (800 Marks)',
    description: 'Commander Treasury for Blades & Packs',
    basePriceUsd: 4.99,
    entitlements: ['marks_grant_800'],
    rarity: 'rare',
    previewType: 'marks',
    previewReferenceId: 'marks_standard',
    availability: 'available',
  },
  {
    sku: 'dominion.marks.pack.large',
    category: 'MARKS',
    displayName: 'Marks Treasury (1,750 Marks)',
    description: 'Substantial Reserve for Pass & Sets',
    basePriceUsd: 9.99,
    entitlements: ['marks_grant_1750'],
    rarity: 'epic',
    previewType: 'marks',
    previewReferenceId: 'marks_large',
    availability: 'available',
  },
  {
    sku: 'dominion.marks.pack.collector',
    category: 'MARKS',
    displayName: 'Marks Vault (3,800 Marks)',
    description: 'High Reserve for Grand Collections',
    basePriceUsd: 19.99,
    entitlements: ['marks_grant_3800'],
    rarity: 'legendary',
    previewType: 'marks',
    previewReferenceId: 'marks_collector',
    availability: 'available',
  },

  // ============================================================
  // PROFILE / FRAMES, PENNANTS & TITLES
  // ============================================================
  {
    sku: 'dominion.profile.imperialframe',
    category: 'PROFILE',
    displayName: 'Imperial Sunburst Frame',
    description: 'Solar Crown Filigree Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    entitlements: ['frame_imperial_sun'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_imperial_sun',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.title.strategos',
    category: 'PROFILE',
    displayName: 'Title: "Grand Strategos"',
    description: 'Prestigious Match Dossier Title',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    entitlements: ['title_grand_strategos'],
    rarity: 'rare',
    previewType: 'title',
    previewReferenceId: 'title_grand_strategos',
    availability: 'available',
  },

  // 9 Standalone Civilization Profile Frames ($1.99 each)
  {
    sku: 'dominion.profile.frame.turk',
    category: 'PROFILE',
    displayName: 'Divan Frame',
    description: 'Imperial Ottoman Divan Border Filigree',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'TÜRK',
    entitlements: ['frame_turk_divan'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_turk_divan',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.roma',
    category: 'PROFILE',
    displayName: 'Imperial Laurel Frame',
    description: 'Roman Consular Gilded Laurel Wreath Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'ROMA',
    entitlements: ['frame_roma_laurel'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_roma_laurel',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.pers',
    category: 'PROFILE',
    displayName: 'Royal Apadana Frame',
    description: 'Achaemenid Grand Column Court Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'PERS',
    entitlements: ['frame_pers_apadana'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_pers_apadana',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.misir',
    category: 'PROFILE',
    displayName: 'Dynastic Frame',
    description: 'Pharaonic Lapis-Inlaid Gold Cartouche Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'MISIR',
    entitlements: ['frame_misir_dynastic'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_misir_dynastic',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.han',
    category: 'PROFILE',
    displayName: 'Celestial Court Frame',
    description: 'Imperial Jade Filigree Palace Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'HAN',
    entitlements: ['frame_han_celestial'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_han_celestial',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.yamato',
    category: 'PROFILE',
    displayName: 'Shogunate Frame',
    description: 'Black Lacquer and Gold Dust Bakufu Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'YAMATO',
    entitlements: ['frame_yamato_shogunate'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_yamato_shogunate',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.norse',
    category: 'PROFILE',
    displayName: 'Raven Hall Frame',
    description: 'Interlaced Dragon Wood & Runic Iron Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'NORSE',
    entitlements: ['frame_norse_raven'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_norse_raven',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.maya',
    category: 'PROFILE',
    displayName: 'Solar Court Frame',
    description: 'Sun Priest Stele Stepped Glyph Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'MAYA',
    entitlements: ['frame_maya_solar'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_maya_solar',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.frame.lakota',
    category: 'PROFILE',
    displayName: 'Plains Council Frame',
    description: 'Sacred Circle Quillwork & Ledger Border',
    basePriceUsd: 1.99,
    premiumCurrencyPrice: 300,
    civilizationRestriction: 'LAKOTA',
    entitlements: ['frame_lakota_council'],
    rarity: 'rare',
    previewType: 'frame',
    previewReferenceId: 'frame_lakota_council',
    availability: 'available',
  },

  // 9 Standalone Civilization Ceremonial Pennants ($1.49 each)
  {
    sku: 'dominion.profile.pennant.turk',
    category: 'PROFILE',
    displayName: 'TÜRK Ceremonial Pennant',
    description: 'Double-Tailed Tug Banner with Crescent Finial',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'TÜRK',
    entitlements: ['pennant_turk'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_turk',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.roma',
    category: 'PROFILE',
    displayName: 'ROMA Ceremonial Pennant',
    description: 'Purple Vexillum with Gilded Aquila Crest',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'ROMA',
    entitlements: ['pennant_roma'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_roma',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.pers',
    category: 'PROFILE',
    displayName: 'PERS Ceremonial Pennant',
    description: 'Derafsh Kaviani Silk Standard with Jeweled Fringe',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'PERS',
    entitlements: ['pennant_pers'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_pers',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.misir',
    category: 'PROFILE',
    displayName: 'MISIR Ceremonial Pennant',
    description: 'Dynastic Lotus Standard with Horus Insignia',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'MISIR',
    entitlements: ['pennant_misir'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_misir',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.han',
    category: 'PROFILE',
    displayName: 'HAN Ceremonial Pennant',
    description: 'Celestial Vermilion Banner with Gold Dragon Trim',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'HAN',
    entitlements: ['pennant_han'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_han',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.yamato',
    category: 'PROFILE',
    displayName: 'YAMATO Ceremonial Pennant',
    description: 'Nobori War Banner with Chrysanthemum Crest',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'YAMATO',
    entitlements: ['pennant_yamato'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_yamato',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.norse',
    category: 'PROFILE',
    displayName: 'NORSE Ceremonial Pennant',
    description: 'Raven Banner with Braided Wool Weather-Vane',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'NORSE',
    entitlements: ['pennant_norse'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_norse',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.maya',
    category: 'PROFILE',
    displayName: 'MAYA Ceremonial Pennant',
    description: 'Quetzal Feather Standard with Jade Beads',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'MAYA',
    entitlements: ['pennant_maya'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_maya',
    availability: 'available',
  },
  {
    sku: 'dominion.profile.pennant.lakota',
    category: 'PROFILE',
    displayName: 'LAKOTA Ceremonial Pennant',
    description: 'Eagle Feather Lance Banner with Rawhide Fringe',
    basePriceUsd: 1.49,
    premiumCurrencyPrice: 200,
    civilizationRestriction: 'LAKOTA',
    entitlements: ['pennant_lakota'],
    rarity: 'rare',
    previewType: 'bundle',
    previewReferenceId: 'pennant_lakota',
    availability: 'available',
  },
];

export interface BundleOwnershipState {
  bundleSku: string;
  totalEntitlements: number; // Exactly 23
  ownedEntitlements: string[];
  missingEntitlements: string[];
  remainingStandaloneValue: number;
  upgradePrice: number;
  completionPercent: number;
}

export interface BundleValueBreakdown {
  componentValue: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
}

class CatalogService {
  private products: CatalogProduct[] = [...CATALOG_PRODUCTS];
  private currentRegion: PriceRegion = 'US';

  public getProducts(category?: CatalogCategory): CatalogProduct[] {
    if (!category) return [...this.products];
    if (category === 'BLADES') {
      return this.products.filter(p => p.category === 'BLADES' || p.category === 'COMMAND BLADES');
    }
    if (category === 'IDENTITY') {
      return this.products.filter(p => p.category === 'IDENTITY' || p.category === 'PROFILE');
    }
    if (category === 'FEATURED') {
      return this.products.filter(p => p.category === 'FEATURED' || p.category === 'CIVILIZATION');
    }
    return this.products.filter(p => p.category === category);
  }

  public getProduct(sku: string): CatalogProduct | undefined {
    return this.products.find(p => p.sku === sku);
  }

  public getFeaturedProducts(): CatalogProduct[] {
    return this.products
      .filter(p => typeof p.featuredOrder === 'number')
      .sort((a, b) => (a.featuredOrder || 99) - (b.featuredOrder || 99));
  }

  public getRegion(): PriceRegion {
    return this.currentRegion;
  }

  public setRegion(region: PriceRegion): void {
    if (REGIONAL_CURRENCIES[region]) {
      this.currentRegion = region;
      regionalPricingService.setRegion(region as StoreRegion);
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('dominion:catalog-region-changed', {
          detail: { region }
        }));
      }
    }
  }

  public formatPrice(product: CatalogProduct): string {
    const reg = REGIONAL_CURRENCIES[this.currentRegion];
    const converted = product.basePriceUsd * reg.multiplier;
    const formattedNum = reg.decimalPlaces === 0
      ? Math.round(converted).toLocaleString('en-US')
      : converted.toFixed(reg.decimalPlaces);

    return reg.symbolPosition === 'before'
      ? `${reg.currencySymbol}${formattedNum}`
      : `${formattedNum} ${reg.currencySymbol}`;
  }

  public formatStorefrontPrice(product: CatalogProduct): string {
    return regionalPricingService.formatPrice(product.basePriceUsd);
  }

  public getMarksPrice(product: CatalogProduct): number | undefined {
    return product.premiumCurrencyPrice;
  }

  /**
   * Authoritative dynamic component value calculation:
   * Sums actual standalone current prices of exact SKUs contained in that civilization bundle.
   */
  public getBundleComponentValue(bundleSku: string): number {
    const bundle = this.getProduct(bundleSku);
    if (!bundle) return 0;

    let total = 0;

    // 1. Standalone Blade SKU
    const bladeEnt = bundle.entitlements.find(e => e.startsWith('blade_'));
    if (bladeEnt) {
      const bladeProd = this.products.find(p => p.category === 'COMMAND BLADES' && p.entitlements.includes(bladeEnt));
      if (bladeProd) total += bladeProd.basePriceUsd;
    }

    // 2. Standalone 20-Reaction Pack SKU
    const rxEnts = bundle.entitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
    if (rxEnts.length > 0) {
      const rxProd = this.products.find(p => p.category === 'REACTIONS' && p.civilizationRestriction === bundle.civilizationRestriction);
      if (rxProd) total += rxProd.basePriceUsd;
      else total += 2.99;
    }

    // 3. Standalone Profile Frame SKU
    const frameEnt = bundle.entitlements.find(e => e.startsWith('frame_'));
    if (frameEnt) {
      const frameProd = this.products.find(p => p.entitlements.includes(frameEnt) && p.sku.startsWith('dominion.profile.frame.'));
      if (frameProd) total += frameProd.basePriceUsd;
      else total += 1.99;
    }

    // 4. Standalone Ceremonial Pennant SKU
    const pennantEnt = bundle.entitlements.find(e => e.startsWith('pennant_'));
    if (pennantEnt) {
      const pennantProd = this.products.find(p => p.entitlements.includes(pennantEnt) && p.sku.startsWith('dominion.profile.pennant.'));
      if (pennantProd) total += pennantProd.basePriceUsd;
      else total += 1.49;
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Authoritative bundle savings breakdown.
   */
  public getBundleValueBreakdown(bundleSku: string): BundleValueBreakdown {
    const bundle = this.getProduct(bundleSku);
    const bundlePrice = bundle ? bundle.basePriceUsd : 0;
    const componentValue = this.getBundleComponentValue(bundleSku);
    const savings = Math.round(Math.max(0, componentValue - bundlePrice) * 100) / 100;
    const savingsPercent = componentValue > 0 && savings > 0 ? Math.round((savings / componentValue) * 100) : 0;

    return {
      componentValue,
      bundlePrice,
      savings,
      savingsPercent,
    };
  }

  /**
   * Determines exact ownership-aware upgrade state so players are never charged twice for owned content.
   */
  public getBundleOwnershipState(bundleSkuOrCiv: string, accountId?: string): BundleOwnershipState {
    let bundle = this.getProduct(bundleSkuOrCiv);
    if (!bundle) {
      const civUpper = bundleSkuOrCiv.toUpperCase();
      bundle = this.products.find(p => p.category === 'CIVILIZATION' && p.civilizationRestriction === civUpper);
    }
    if (!bundle) {
      bundle = this.getProduct('dominion.bundle.turk.ottoman01')!;
    }

    const entitlements = bundle.entitlements;
    const entService = (typeof window !== 'undefined' && (window as any).__ENTITLEMENT_SERVICE__)
      ? (window as any).__ENTITLEMENT_SERVICE__
      : (typeof globalThis !== 'undefined' && (globalThis as any).__ENTITLEMENT_SERVICE__)
      ? (globalThis as any).__ENTITLEMENT_SERVICE__
      : null;

    const isOwned = (ent: string) => {
      if (entService && typeof entService.ownsEntitlement === 'function') {
        return entService.ownsEntitlement(ent);
      }
      return false;
    };

    const ownedEntitlements = entitlements.filter(e => isOwned(e));
    const missingEntitlements = entitlements.filter(e => !isOwned(e));
    const totalEntitlements = entitlements.length;
    const completionPercent = totalEntitlements > 0 ? Math.round((ownedEntitlements.length / totalEntitlements) * 100) : 0;

    if (missingEntitlements.length === 0 || (entService && entService.ownsSku && entService.ownsSku(bundle.sku))) {
      return {
        bundleSku: bundle.sku,
        totalEntitlements,
        ownedEntitlements: [...entitlements],
        missingEntitlements: [],
        remainingStandaloneValue: 0,
        upgradePrice: 0,
        completionPercent: 100,
      };
    }

    // Calculate base standalone value of missing items
    let remainingStandaloneValue = 0;

    // Missing Blade
    const missingBlade = missingEntitlements.find(e => e.startsWith('blade_'));
    if (missingBlade) {
      const bladeProd = this.products.find(p => p.category === 'COMMAND BLADES' && p.entitlements.includes(missingBlade));
      if (bladeProd) remainingStandaloneValue += bladeProd.basePriceUsd;
    }

    // Missing Frame
    const missingFrame = missingEntitlements.find(e => e.startsWith('frame_'));
    if (missingFrame) {
      const frameProd = this.products.find(p => p.entitlements.includes(missingFrame) && p.sku.startsWith('dominion.profile.frame.'));
      if (frameProd) remainingStandaloneValue += frameProd.basePriceUsd;
      else remainingStandaloneValue += 1.99;
    }

    // Missing Pennant
    const missingPennant = missingEntitlements.find(e => e.startsWith('pennant_'));
    if (missingPennant) {
      const pennantProd = this.products.find(p => p.entitlements.includes(missingPennant) && p.sku.startsWith('dominion.profile.pennant.'));
      if (pennantProd) remainingStandaloneValue += pennantProd.basePriceUsd;
      else remainingStandaloneValue += 1.49;
    }

    // Missing Reactions
    const missingRx = missingEntitlements.filter(e => e.startsWith('reaction_') || e.startsWith('rx_'));
    if (missingRx.length > 0) {
      const rxProd = this.products.find(p => p.category === 'REACTIONS' && p.civilizationRestriction === bundle.civilizationRestriction);
      const fullPackPrice = rxProd ? rxProd.basePriceUsd : 2.99;
      remainingStandaloneValue += Math.round(((missingRx.length / 20) * fullPackPrice) * 100) / 100;
    }

    remainingStandaloneValue = Math.round(remainingStandaloneValue * 100) / 100;

    // Apply bundle completion discount
    const componentValue = this.getBundleComponentValue(bundle.sku);
    const bundlePrice = bundle.basePriceUsd;
    const discountRatio = componentValue > 0 ? (bundlePrice / componentValue) : 1.0;

    const upgradePrice = Math.round((remainingStandaloneValue * discountRatio) * 100) / 100;

    return {
      bundleSku: bundle.sku,
      totalEntitlements,
      ownedEntitlements,
      missingEntitlements,
      remainingStandaloneValue,
      upgradePrice,
      completionPercent,
    };
  }
}

export const catalogService = new CatalogService();

