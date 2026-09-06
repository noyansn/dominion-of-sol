/**
 * DOMINION OF SOL — SOVEREIGN REACTIONS & SOCIAL EXPRESSION
 * 
 * STRICT ARCHITECTURAL SEPARATION:
 * 1. COMMAND PINGS: Tactical gameplay communication (Attack, Defend, Danger, Look).
 *    ALWAYS 100% free, never sold, never premium.
 * 2. SOCIAL EXPRESSIONS: Cultural, emotional & character expressions.
 *    - 10 Universal Free Expressions
 *    - 180 Master-Quality Civilization Expressions (Exactly 20 per civilization × 9 civilizations)
 * 
 * ALL 9 CIVILIZATION REACTION PACKS:
 * 20 Reactions · $2.99 · 450 Marks.
 * Zero generic circular coin frames; organic silhouettes with normalized optical scale.
 */

export type ReactionRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ReactionCategory = 'social_expression' | 'command_ping';

export type ReactionAnimationType =
  | 'pulse-unfurl'
  | 'shield-clash'
  | 'seal-stamp'
  | 'soar-rise'
  | 'radiate-gleam'
  | 'bow-honor'
  | 'strike-ring'
  | 'laugh'
  | 'mock'
  | 'clap'
  | 'rage'
  | 'shock'
  | 'cry'
  | 'smug'
  | 'yawn'
  | 'facepalm'
  | 'cheer'
  | 'nod'
  | 'side-eye'
  | 'challenge';

export interface ReactionVisualMetrics {
  opticalScale: number;
  offsetX: number;
  offsetY: number;
  wheelScale?: number;
  collectionScale?: number;
}

export interface SovereignReaction {
  id: string;
  name: string;
  civilization: string;
  category: ReactionCategory;
  isFree: boolean;
  isFaceExpression: boolean;
  rarity: ReactionRarity;
  entitlementSku: string;
  tagline: string;
  animationType: ReactionAnimationType;
  animationCue: string;
  accentColor: string;
  svgIcon: string;
  visualMetrics?: ReactionVisualMetrics;
}

export const SOVEREIGN_REACTIONS: Record<string, SovereignReaction> = {
  // ============================================================
  // TACTICAL COMMAND PINGS (100% FREE GAMEPLAY COMMUNICATION)
  // ============================================================
  'ping_attack': {
    id: 'ping_attack',
    name: 'Attack Here',
    civilization: 'Universal',
    category: 'command_ping',
    isFree: true,
    isFaceExpression: false,
    rarity: 'common',
    entitlementSku: 'dominion.pings.universal',
    tagline: 'Orders coordinated tactical offensive push to target sector.',
    animationType: 'strike-ring',
    animationCue: 'strike-ring',
    accentColor: '#ef4444',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <circle cx="32" cy="32" r="28" fill="#1c0709" stroke="#ef4444" stroke-width="2.4"/>
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.75"/>
        <circle cx="32" cy="32" r="14" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2"/>
        <line x1="32" y1="9" x2="32" y2="21" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
        <line x1="32" y1="43" x2="32" y2="55" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
        <line x1="9" y1="32" x2="21" y2="32" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
        <line x1="43" y1="32" x2="55" y2="32" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
        <polygon points="32,21 39,36 32,33 25,36" fill="#ef4444"/>
        <circle cx="32" cy="32" r="2.5" fill="#ffffff"/>
      </svg>`,
  },
  'ping_defend': {
    id: 'ping_defend',
    name: 'Defend Here',
    civilization: 'Universal',
    category: 'command_ping',
    isFree: true,
    isFaceExpression: false,
    rarity: 'common',
    entitlementSku: 'dominion.pings.universal',
    tagline: 'Orders fortification and defensive reinforcements on position.',
    animationType: 'shield-clash',
    animationCue: 'shield-clash',
    accentColor: '#3b82f6',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <circle cx="32" cy="32" r="28" fill="#071324" stroke="#3b82f6" stroke-width="2.4"/>
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.75"/>
        <path d="M 20 16 L 44 16 L 44 34 C 44 46, 32 52, 32 52 C 32 52, 20 46, 20 34 Z" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2.4"/>
        <path d="M 24 20 L 40 20 L 40 33 C 40 42, 32 47, 32 47 C 32 47, 24 42, 24 33 Z" fill="#2563eb"/>
        <line x1="32" y1="19" x2="32" y2="46" stroke="#ffffff" stroke-width="2.2"/>
        <line x1="24" y1="28" x2="40" y2="28" stroke="#ffffff" stroke-width="2.2"/>
        <circle cx="32" cy="28" r="2.6" fill="#fde047"/>
      </svg>`,
  },
  'ping_danger': {
    id: 'ping_danger',
    name: 'Danger Warning',
    civilization: 'Universal',
    category: 'command_ping',
    isFree: true,
    isFaceExpression: false,
    rarity: 'common',
    entitlementSku: 'dominion.pings.universal',
    tagline: 'Broadcasts hostile mobilization or encirclement threat.',
    animationType: 'pulse-unfurl',
    animationCue: 'pulse-unfurl',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <polygon points="32,6 60,54 4,54" fill="#240c03" stroke="#f97316" stroke-width="2.6" stroke-linejoin="round"/>
        <polygon points="32,14 53,50 11,50" fill="#7c2d12"/>
        <line x1="32" y1="22" x2="32" y2="38" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="32" cy="44" r="2.5" fill="#ffffff"/>
      </svg>`,
  },
  'ping_look': {
    id: 'ping_look',
    name: 'Observe Sector',
    civilization: 'Universal',
    category: 'command_ping',
    isFree: true,
    isFaceExpression: false,
    rarity: 'common',
    entitlementSku: 'dominion.pings.universal',
    tagline: 'Draws ally attention to suspicious movements or strategic opening.',
    animationType: 'radiate-gleam',
    animationCue: 'radiate-gleam',
    accentColor: '#eab308',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <circle cx="32" cy="32" r="28" fill="#1b1404" stroke="#eab308" stroke-width="2.4"/>
        <path d="M 12 32 Q 32 14 52 32 Q 32 50 12 32 Z" fill="#713f12" stroke="#facc15" stroke-width="2.4"/>
        <circle cx="32" cy="32" r="9" fill="#0f172a" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="32" cy="32" r="4.5" fill="#fde047"/>
        <circle cx="34" cy="30" r="1.8" fill="#ffffff"/>
      </svg>`,
  },

  // ============================================================
  // UNIVERSAL FREE SOCIAL EXPRESSIONS (10/10 FREE)
  // ============================================================
  'reaction_gg': {
    id: 'reaction_gg',
    name: 'Good Game',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Universal honorable match greeting and recognition.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 17 22 Q 22 14 32 14 Q 42 14 47 22" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
        <circle cx="21" cy="18" r="2" fill="#38bdf8"/>
        <circle cx="43" cy="18" r="2" fill="#38bdf8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#0b1726" stroke="#38bdf8" stroke-width="2.8"/>
        <path d="M 21 28 Q 26 24 31 28" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 24 43 28" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none"/>
        <rect x="23" y="36" width="18" height="12" rx="3" fill="#0369a1" stroke="#38bdf8" stroke-width="1.8"/>
        <text x="32" y="45" font-family="'Cinzel',sans-serif" font-weight="900" font-size="8.5" fill="#ffffff" text-anchor="middle">GG</text>
      </svg>`,
  },
  'reaction_smile': {
    id: 'reaction_smile',
    name: 'Noble Smile',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Serene smile of noble sovereign assent.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#eab308',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 22 18 L 26 10 L 32 14 L 38 10 L 42 18 Z" fill="#ca8a04" stroke="#eab308" stroke-width="2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#1c1917" stroke="#eab308" stroke-width="2.8"/>
        <circle cx="24" cy="30" r="2.8" fill="#eab308"/>
        <circle cx="40" cy="30" r="2.8" fill="#eab308"/>
        <path d="M 24 40 Q 32 47 40 40" stroke="#eab308" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      </svg>`,
  },
  'reaction_laugh': {
    id: 'reaction_laugh',
    name: 'Hearty Laugh',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Booming uninhibited laughter across the battlefield.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#10b981',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#062e24" stroke="#10b981" stroke-width="2.8"/>
        <path d="M 21 28 Q 26 24 31 28" stroke="#10b981" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 24 43 28" stroke="#10b981" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 20 36 Q 32 54 44 36 Z" fill="#047857" stroke="#10b981" stroke-width="2.5"/>
        <path d="M 22 36 Q 32 42 42 36" fill="#ffffff" stroke="#10b981" stroke-width="1.5"/>
      </svg>`,
  },
  'reaction_angry': {
    id: 'reaction_angry',
    name: 'Fierce Wrath',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Furious martial displeasure and gnashing teeth.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#ef4444',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#2d0608" stroke="#ef4444" stroke-width="2.8"/>
        <path d="M 17 23 L 30 28" stroke="#ef4444" stroke-width="3.8" stroke-linecap="round"/>
        <path d="M 47 23 L 34 28" stroke="#ef4444" stroke-width="3.8" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#ef4444"/>
        <circle cx="40" cy="30" r="2.2" fill="#ef4444"/>
        <rect x="21" y="39" width="22" height="8" rx="1" fill="#ffffff" stroke="#ef4444" stroke-width="2.4"/>
        <line x1="26" y1="39" x2="26" y2="47" stroke="#ef4444" stroke-width="1.8"/>
        <line x1="32" y1="39" x2="32" y2="47" stroke="#ef4444" stroke-width="1.8"/>
        <line x1="38" y1="39" x2="38" y2="47" stroke="#ef4444" stroke-width="1.8"/>
      </svg>`,
  },
  'reaction_surprised': {
    id: 'reaction_surprised',
    name: 'Shocked Awe',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Wide-eyed astonishment at sudden tactical turns.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#c084fc',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#1e1028" stroke="#c084fc" stroke-width="2.8"/>
        <circle cx="23" cy="28" r="6" fill="#ffffff" stroke="#c084fc" stroke-width="2.6"/>
        <circle cx="41" cy="28" r="6" fill="#ffffff" stroke="#c084fc" stroke-width="2.6"/>
        <circle cx="23" cy="28" r="2.2" fill="#581c87"/>
        <circle cx="41" cy="28" r="2.2" fill="#581c87"/>
        <ellipse cx="32" cy="44" rx="7" ry="9" fill="#0f0518" stroke="#c084fc" stroke-width="2.6"/>
      </svg>`,
  },
  'reaction_cry': {
    id: 'reaction_cry',
    name: 'Bitter Sorrow',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Solemn mourning over catastrophic defeat.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#082032" stroke="#38bdf8" stroke-width="2.8"/>
        <path d="M 20 28 L 30 24" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <path d="M 44 28 L 34 24" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8"/>
      </svg>`,
  },
  'reaction_smirk': {
    id: 'reaction_smirk',
    name: 'Cunning Smirk',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Knowing asymmetric grin before closing a trap.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#fbbf24',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#201a07" stroke="#fbbf24" stroke-width="2.8"/>
        <path d="M 19 24 Q 25 20 30 25" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 L 45 25" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="29" r="2.5" fill="#fbbf24"/>
        <circle cx="39" cy="28" r="2.5" fill="#fbbf24"/>
        <path d="M 24 42 Q 34 44 45 36" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      </svg>`,
  },
  'reaction_applause': {
    id: 'reaction_applause',
    name: 'Sincere Applause',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Sincere clapping tribute to masterful tactical play.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#f472b6',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#240c1a" stroke="#f472b6" stroke-width="2.8"/>
        <circle cx="24" cy="28" r="2.5" fill="#f472b6"/>
        <circle cx="40" cy="28" r="2.5" fill="#f472b6"/>
        <path d="M 25 38 Q 32 43 39 38" stroke="#f472b6" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Two distinct clapping hands -->
        <path d="M 12 52 Q 22 40 28 46 Q 24 54 14 56 Z" fill="#f472b6"/>
        <path d="M 52 52 Q 42 40 36 46 Q 40 54 48 56 Z" fill="#f472b6"/>
        <line x1="31" y1="41" x2="29" y2="37" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <line x1="33" y1="41" x2="35" y2="37" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  'reaction_facepalm': {
    id: 'reaction_facepalm',
    name: 'Exasperated Facepalm',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Profound facepalm over blundered ally movements.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#241006" stroke="#f97316" stroke-width="2.8"/>
        <path d="M 20 29 L 29 32" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
        <path d="M 23 44 Q 30 40 39 46" stroke="#f97316" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 33 16 Q 48 14 54 26 Q 50 38 41 36 Q 35 34 33 26 Z" fill="#f97316" stroke="#ffffff" stroke-width="1.8"/>
        <line x1="37" y1="19" x2="48" y2="23" stroke="#241006" stroke-width="2"/>
        <line x1="38" y1="24" x2="49" y2="28" stroke="#241006" stroke-width="2"/>
        <line x1="38" y1="29" x2="47" y2="33" stroke="#241006" stroke-width="2"/>
      </svg>`,
  },
  'reaction_bored': {
    id: 'reaction_bored',
    name: 'Deep Yawn',
    civilization: 'Universal',
    category: 'social_expression',
    isFree: true,
    isFaceExpression: true,
    rarity: 'common',
    entitlementSku: 'dominion.reactions.universal.free',
    tagline: 'Casual boredom while waiting for the enemy to act.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#94a3b8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#0f172a" stroke="#94a3b8" stroke-width="2.8"/>
        <path d="M 20 27 Q 25 31 30 27" stroke="#94a3b8" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#94a3b8" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8" ry="10" fill="#020617" stroke="#94a3b8" stroke-width="2.8"/>
      </svg>`,
  },

  // ============================================================
  // TÜRK MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_turk_victory_laugh': {
    id: 'reaction_turk_victory_laugh',
    name: 'Pasha Laugh',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Pasha Laugh expression from the TÜRK Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Ottoman Turban -->
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#e2cfb2" stroke-width="2"/>
        
      <!-- Moustache -->
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#ef4444" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#ef4444" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_turk_pasha_smirk': {
    id: 'reaction_turk_pasha_smirk',
    name: 'Pasha Smirk',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Pasha Smirk expression from the TÜRK Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#e2cfb2" stroke-width="2"/>
        
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_turk_sultan_nod': {
    id: 'reaction_turk_sultan_nod',
    name: 'Sultan Nod',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Sultan Nod expression from the TÜRK Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: YOUNG_SOLDIER -->
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 36, 41 50, 32 52 C 23 50, 18 36, 18 24 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 19 26 C 19 35, 23 47, 32 50 C 41 47, 45 35, 45 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#1e293b"/>
        <circle cx="39" cy="30" r="2.6" fill="#1e293b"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_divan_side_eye': {
    id: 'reaction_turk_divan_side_eye',
    name: 'Divan Side-Eye',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Divan Side-Eye expression from the TÜRK Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#e2cfb2" stroke-width="2"/>
        
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_turk_too_easy': {
    id: 'reaction_turk_too_easy',
    name: 'Too Easy',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Too Easy expression from the TÜRK Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: LEAN_SCHEMER -->
        <path d="M 19 23 C 19 19, 45 20, 45 23 C 44 38, 38 54, 31 56 C 24 54, 19 39, 19 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 20 26 C 20 37, 24 49, 31 54 C 38 49, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_slow_clap': {
    id: 'reaction_turk_slow_clap',
    name: 'Divan Clap',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Divan Clap expression from the TÜRK Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Ottoman Turban -->
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Moustache -->
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_turk_facepalm': {
    id: 'reaction_turk_facepalm',
    name: 'Grand Facepalm',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Grand Facepalm expression from the TÜRK Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Ottoman Turban -->
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Moustache -->
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_turk_disbelief': {
    id: 'reaction_turk_disbelief',
    name: 'Divan Shock',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Divan Shock expression from the TÜRK Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Ottoman Turban -->
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Moustache -->
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_turk_janissary_roar': {
    id: 'reaction_turk_janissary_roar',
    name: 'Janissary Roar',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Janissary Roar expression from the TÜRK Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#ef4444" stroke-width="1.8"/>
        
      <!-- Ottoman Turban -->
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Moustache -->
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_turk_furious_rage': {
    id: 'reaction_turk_furious_rage',
    name: 'Porte Rage',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Porte Rage expression from the TÜRK Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 20 20 L 44 20 L 46 8 L 32 12 L 18 8 Z" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
                <path d="M 42 12 Q 54 22 52 38 L 46 36 Q 48 24 38 16 Z" fill="#e2e8f0" stroke="#dfbc73" stroke-width="1.8"/>
                <rect x="22" y="18" width="20" height="5" rx="2" fill="#dfbc73"/>
                <polygon points="32,5 36,12 28,12" fill="#dfbc73"/>
        
        <!-- Morphological Archetype: JOVIAL_COURTIER -->
        <path d="M 17 24 C 17 20, 47 20, 47 24 C 48 42, 43 55, 32 56 C 21 55, 16 42, 17 24 Z" fill="#fef0e2" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 18 27 C 18 40, 23 51, 32 54 C 41 51, 46 40, 46 27" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 40 Q 22 36 14 43 Q 22 41 32 43 Q 42 41 50 43 Q 42 36 32 40 Z" fill="#1e293b" stroke="#dfbc73" stroke-width="1.2"/>
        
        <path d="M 15 22 L 30 28" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#991b1b"/>
        <circle cx="40" cy="30" r="2.2" fill="#991b1b"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#1e293b" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#1e293b" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#1e293b" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#1e293b" stroke-width="2"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_crying_defeat': {
    id: 'reaction_turk_crying_defeat',
    name: 'Defeat Tears',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Defeat Tears expression from the TÜRK Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: LEAN_SCHEMER -->
        <path d="M 19 23 C 19 19, 45 20, 45 23 C 44 38, 38 54, 31 56 C 24 54, 19 39, 19 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 20 26 C 20 37, 24 49, 31 54 C 38 49, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <path d="M 19 28 L 30 24" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#1e293b" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#1e293b" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#1e293b" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#1e293b" stroke-width="1.6"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_nervous_sweat': {
    id: 'reaction_turk_nervous_sweat',
    name: 'Nervous Pasha',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Nervous Pasha expression from the TÜRK Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: WIDE_COMMANDER -->
        <path d="M 14 25 C 14 21, 50 21, 50 25 C 51 40, 45 53, 32 55 C 19 53, 13 40, 14 25 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 16 28 C 16 38, 20 48, 32 53 C 44 48, 48 38, 48 28" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <circle cx="24" cy="28" r="3.2" fill="#1e293b"/>
        <circle cx="40" cy="28" r="3.2" fill="#1e293b"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#1e293b" stroke-width="1.8"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_deadpan': {
    id: 'reaction_turk_deadpan',
    name: 'Cold Vizier',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Cold Vizier expression from the TÜRK Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: NARROW_COURT -->
        <path d="M 20 23 C 20 19, 44 19, 44 23 C 45 37, 39 55, 32 57 C 25 55, 19 37, 20 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 21 26 C 21 37, 25 50, 32 55 C 39 50, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_respectful_nod': {
    id: 'reaction_turk_respectful_nod',
    name: 'Sovereign Respect',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Sovereign Respect expression from the TÜRK Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fef3c7" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fef3c7" stroke="#1e293b" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#1e293b" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#1e293b" stroke-width="1.8"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_salute': {
    id: 'reaction_turk_salute',
    name: 'Ottoman Salute',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Ottoman Salute expression from the TÜRK Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: YOUNG_SOLDIER -->
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 36, 41 50, 32 52 C 23 50, 18 36, 18 24 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 19 26 C 19 35, 23 47, 32 50 C 41 47, 45 35, 45 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <circle cx="23" cy="28" r="2.8" fill="#1e293b"/>
        <circle cx="39" cy="28" r="2.8" fill="#1e293b"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fef3c7" stroke="#1e293b" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#1e293b" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#1e293b" stroke-width="1.8"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_scheming': {
    id: 'reaction_turk_scheming',
    name: 'Pasha Schemes',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Pasha Schemes expression from the TÜRK Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef3c7" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#1e293b"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#1e293b"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#dfbc73" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fef3c7" stroke="#1e293b" stroke-width="1.8"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_mischief': {
    id: 'reaction_turk_mischief',
    name: 'Bazaar Mischief',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Bazaar Mischief expression from the TÜRK Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 22 22 L 30 4 L 38 7 L 42 22 Z" fill="#b45309" stroke="#dfbc73" stroke-width="2.2"/>
                <ellipse cx="32" cy="22" rx="11" ry="3" fill="#dfbc73"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef3c7" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#1e293b"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_yawn': {
    id: 'reaction_turk_yawn',
    name: 'Divan Yawn',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Divan Yawn expression from the TÜRK Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <ellipse cx="32" cy="18" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
              <path d="M 16 20 Q 32 13 48 20" stroke="#dfbc73" stroke-width="2.2" fill="none"/>
              <circle cx="32" cy="14" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
              <path d="M 32 11 L 32 4" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
        
        <!-- Morphological Archetype: WIDE_COMMANDER -->
        <path d="M 14 25 C 14 21, 50 21, 50 25 C 51 40, 45 53, 32 55 C 19 53, 13 40, 14 25 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 16 28 C 16 38, 20 48, 32 53 C 44 48, 48 38, 48 28" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fef3c7" stroke="#1e293b" stroke-width="2.4"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_mehter_triumph': {
    id: 'reaction_turk_mehter_triumph',
    name: 'Mehter Hype',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Mehter Hype expression from the TÜRK Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 20 20 L 44 20 L 42 6 L 22 6 Z" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
                <rect x="20" y="18" width="24" height="4" fill="#dfbc73"/>
                <circle cx="32" cy="6" r="3" fill="#059669"/>
        
        <!-- Morphological Archetype: NARROW_COURT -->
        <path d="M 20 23 C 20 19, 44 19, 44 23 C 45 37, 39 55, 32 57 C 25 55, 19 37, 20 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 21 26 C 21 37, 25 50, 32 55 C 39 50, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
        
        <circle cx="23" cy="25" r="3.2" fill="#1e293b"/>
        <circle cx="41" cy="25" r="3.2" fill="#1e293b"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      
      
        <!-- Handcrafted Enamel Pin Accents: Gold Catchlight & Amber Edge -->
        <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fff3b0" opacity="0.8" class="gold-catchlight"/>
        <line x1="28" y1="20" x2="36" y2="20" stroke="#b47922" stroke-width="0.75" opacity="0.6"/>
    </g>
    </svg>`,
  },
  'reaction_turk_challenge': {
    id: 'reaction_turk_challenge',
    name: 'Sipahi Taunt',
    civilization: 'TÜRK',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.turk.court01',
    tagline: 'Sipahi Taunt expression from the TÜRK Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#dfbc73',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <ellipse cx="32" cy="17" rx="18" ry="11" fill="#991b1b" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 16 19 Q 32 12 48 19" stroke="#dfbc73" stroke-width="2" fill="none"/>
      <circle cx="32" cy="13" r="3.2" fill="#059669" stroke="#dfbc73" stroke-width="1.8"/>
      <path d="M 32 10 L 32 3" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 32 42 Q 22 38 15 45 Q 23 43 32 44 Q 41 43 49 45 Q 42 38 32 42 Z" fill="#1e293b"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Sipahi Scimitar / Challenge Dagger -->
      <path d="M 52 28 Q 58 18 63 12 L 62 10 Q 56 16 50 24 Z" fill="#dfbc73" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // ROMA MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_roma_triumph_laugh': {
    id: 'reaction_roma_triumph_laugh',
    name: 'Caesar Laugh',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Caesar Laugh expression from the ROMA Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Laurel Wreath -->
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#c8b69f" stroke-width="2"/>
        
      <!-- Roman Stubble & Chiseled Chin -->
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#a855f7" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#a855f7" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_roma_senator_smirk': {
    id: 'reaction_roma_senator_smirk',
    name: 'Senator Smirk',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Senator Smirk expression from the ROMA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#c8b69f" stroke-width="2"/>
        
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_roma_caesar_nod': {
    id: 'reaction_roma_caesar_nod',
    name: 'Caesar Nod',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Caesar Nod expression from the ROMA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: LEAN_SCHEMER -->
        <path d="M 19 23 C 19 19, 45 20, 45 23 C 44 38, 38 54, 31 56 C 24 54, 19 39, 19 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 20 26 C 20 37, 24 49, 31 54 C 38 49, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#1c1917"/>
        <circle cx="39" cy="30" r="2.6" fill="#1c1917"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_senator_side_eye': {
    id: 'reaction_roma_senator_side_eye',
    name: 'Senator Side-Eye',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Senator Side-Eye expression from the ROMA Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#c8b69f" stroke-width="2"/>
        
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_roma_too_easy': {
    id: 'reaction_roma_too_easy',
    name: 'Too Easy Caesar',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Too Easy Caesar expression from the ROMA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: NARROW_COURT -->
        <path d="M 20 23 C 20 19, 44 19, 44 23 C 45 37, 39 55, 32 57 C 25 55, 19 37, 20 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 21 26 C 21 37, 25 50, 32 55 C 39 50, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_slow_clap': {
    id: 'reaction_roma_slow_clap',
    name: 'Patrician Clap',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Patrician Clap expression from the ROMA Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Laurel Wreath -->
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Roman Stubble & Chiseled Chin -->
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_roma_facepalm': {
    id: 'reaction_roma_facepalm',
    name: 'Imperial Facepalm',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Imperial Facepalm expression from the ROMA Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Laurel Wreath -->
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Roman Stubble & Chiseled Chin -->
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_roma_shock': {
    id: 'reaction_roma_shock',
    name: 'Brutus Shock',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Brutus Shock expression from the ROMA Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Laurel Wreath -->
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Roman Stubble & Chiseled Chin -->
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_roma_centurion_roar': {
    id: 'reaction_roma_centurion_roar',
    name: 'Legion Roar',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Legion Roar expression from the ROMA Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#a855f7" stroke-width="1.8"/>
        
      <!-- Laurel Wreath -->
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Roman Stubble & Chiseled Chin -->
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_roma_fury': {
    id: 'reaction_roma_fury',
    name: 'Jupiter Rage',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Jupiter Rage expression from the ROMA Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 16 14 Q 32 9 48 14 L 48 24 L 16 24 Z" fill="#7f1d1d" stroke="#d97706" stroke-width="2.2"/>
                <rect x="14" y="6" width="36" height="7" rx="2" fill="#7f1d1d" stroke="#d97706" stroke-width="2"/>
                <line x1="16" y1="24" x2="48" y2="24" stroke="#d97706" stroke-width="2.4"/>
                <path d="M 14 24 L 12 36 L 18 34 Z" fill="#d97706"/>
                <path d="M 50 24 L 52 36 L 46 34 Z" fill="#d97706"/>
        
        <!-- Morphological Archetype: WIDE_COMMANDER -->
        <path d="M 14 25 C 14 21, 50 21, 50 25 C 51 40, 45 53, 32 55 C 19 53, 13 40, 14 25 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 16 28 C 16 38, 20 48, 32 53 C 44 48, 48 38, 48 28" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 15 22 L 30 28" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#7f1d1d"/>
        <circle cx="40" cy="30" r="2.2" fill="#7f1d1d"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#1c1917" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#1c1917" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#1c1917" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#1c1917" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#1c1917" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_crying': {
    id: 'reaction_roma_crying',
    name: 'Cannae Tears',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Cannae Tears expression from the ROMA Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: NARROW_COURT -->
        <path d="M 20 23 C 20 19, 44 19, 44 23 C 45 37, 39 55, 32 57 C 25 55, 19 37, 20 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 21 26 C 21 37, 25 50, 32 55 C 39 50, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 19 28 L 30 24" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#1c1917" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#1c1917" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_nervous': {
    id: 'reaction_roma_nervous',
    name: 'Nervous Tribune',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Nervous Tribune expression from the ROMA Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: ELDER_WARRIOR -->
        <path d="M 16 24 C 16 20, 48 20, 48 24 C 48 39, 44 52, 32 54 C 20 52, 16 39, 16 24 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 18 27 C 18 38, 22 49, 32 52 C 42 49, 46 38, 46 27" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <circle cx="24" cy="28" r="3.2" fill="#1c1917"/>
        <circle cx="40" cy="28" r="3.2" fill="#1c1917"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_deadpan': {
    id: 'reaction_roma_deadpan',
    name: 'Stoic Legionary',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Stoic Legionary expression from the ROMA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: YOUNG_SOLDIER -->
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 36, 41 50, 32 52 C 23 50, 18 36, 18 24 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 19 26 C 19 35, 23 47, 32 50 C 41 47, 45 35, 45 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_respect': {
    id: 'reaction_roma_respect',
    name: 'Gladiator Respect',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Gladiator Respect expression from the ROMA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.8"/>
        
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#1c1917" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_salute': {
    id: 'reaction_roma_salute',
    name: 'Ave',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Ave expression from the ROMA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 16 14 Q 32 9 48 14 L 48 24 L 16 24 Z" fill="#7f1d1d" stroke="#d97706" stroke-width="2.2"/>
                <rect x="14" y="6" width="36" height="7" rx="2" fill="#7f1d1d" stroke="#d97706" stroke-width="2"/>
                <line x1="16" y1="24" x2="48" y2="24" stroke="#d97706" stroke-width="2.4"/>
                <path d="M 14 24 L 12 36 L 18 34 Z" fill="#d97706"/>
                <path d="M 50 24 L 52 36 L 46 34 Z" fill="#d97706"/>
        
        <!-- Morphological Archetype: LEAN_SCHEMER -->
        <path d="M 19 23 C 19 19, 45 20, 45 23 C 44 38, 38 54, 31 56 C 24 54, 19 39, 19 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 20 26 C 20 37, 24 49, 31 54 C 38 49, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <circle cx="23" cy="28" r="2.8" fill="#1c1917"/>
        <circle cx="39" cy="28" r="2.8" fill="#1c1917"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#1c1917" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_scheming': {
    id: 'reaction_roma_scheming',
    name: 'Senator Plot',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Senator Plot expression from the ROMA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.8"/>
        
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#1c1917"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#1c1917"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#d97706" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fef3c7" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_mischief': {
    id: 'reaction_roma_mischief',
    name: 'Saturnalia Grin',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Saturnalia Grin expression from the ROMA Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.8"/>
        
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#1c1917" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#1c1917"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#1c1917" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_yawn': {
    id: 'reaction_roma_yawn',
    name: 'Patrician Yawn',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Patrician Yawn expression from the ROMA Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: ELDER_WARRIOR -->
        <path d="M 16 24 C 16 20, 48 20, 48 24 C 48 39, 44 52, 32 54 C 20 52, 16 39, 16 24 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 18 27 C 18 38, 22 49, 32 52 C 42 49, 46 38, 46 27" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#1c1917" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_colosseum_cheer': {
    id: 'reaction_roma_colosseum_cheer',
    name: 'Colosseum Hype',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Colosseum Hype expression from the ROMA Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 16 22 Q 22 13 32 13 Q 42 13 48 22" fill="none" stroke="#d97706" stroke-width="2.8"/>
              <circle cx="20" cy="17" r="2.4" fill="#d97706"/>
              <circle cx="26" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="38" cy="14" r="2.4" fill="#d97706"/>
              <circle cx="44" cy="17" r="2.4" fill="#d97706"/>
        
        <!-- Morphological Archetype: YOUNG_SOLDIER -->
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 36, 41 50, 32 52 C 23 50, 18 36, 18 24 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 19 26 C 19 35, 23 47, 32 50 C 41 47, 45 35, 45 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <circle cx="23" cy="25" r="3.2" fill="#1c1917"/>
        <circle cx="41" cy="25" r="3.2" fill="#1c1917"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#1c1917" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#1c1917" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#d97706" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#d97706" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#d97706" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_roma_gladiator_challenge': {
    id: 'reaction_roma_gladiator_challenge',
    name: 'Gladiator Taunt',
    civilization: 'ROMA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.roma.legion01',
    tagline: 'Gladiator Taunt expression from the ROMA Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#f87171',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <ellipse cx="32" cy="19" rx="16" ry="7" fill="#78350f" stroke="#ca8a04" stroke-width="1.5" opacity="0.4"/>
      <path d="M 16 20 C 16 13, 24 12, 32 15 C 40 12, 48 13, 48 20" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 19 16 L 16 12 M 25 14 L 23 10 M 39 14 L 41 10 M 45 16 L 48 12" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="15" r="2.5" fill="#fef08a"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 28 47 L 36 47" stroke="#94a3b8" stroke-width="1.2" opacity="0.6"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Roman Pugio Dagger -->
      <polygon points="50,26 62,12 64,13 52,29" fill="#dfbc73" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // PERS MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_pers_royal_laugh': {
    id: 'reaction_pers_royal_laugh',
    name: 'Shah Laugh',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Shah Laugh expression from the PERS Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Persian Pleated Kidaris Tiara -->
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#d4bc9e" stroke-width="2"/>
        
      <!-- Persian Court Beard -->
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#3b82f6" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#3b82f6" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_pers_shah_smirk': {
    id: 'reaction_pers_shah_smirk',
    name: 'Shah Smirk',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Shah Smirk expression from the PERS Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#d4bc9e" stroke-width="2"/>
        
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_pers_cyrus_nod': {
    id: 'reaction_pers_cyrus_nod',
    name: 'Cyrus Nod',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Cyrus Nod expression from the PERS Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 16 20 L 20 8 L 26 14 L 32 7 L 38 14 L 44 8 L 48 20 Z" fill="#eab308" stroke="#0891b2" stroke-width="2.2"/>
                <circle cx="32" cy="14" r="2.5" fill="#4338ca"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#0f172a"/>
        <circle cx="39" cy="30" r="2.6" fill="#0f172a"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_court_side_eye': {
    id: 'reaction_pers_court_side_eye',
    name: 'Satrap Side-Eye',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Satrap Side-Eye expression from the PERS Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#d4bc9e" stroke-width="2"/>
        
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_pers_too_easy': {
    id: 'reaction_pers_too_easy',
    name: 'Too Easy Shah',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Too Easy Shah expression from the PERS Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_slow_clap': {
    id: 'reaction_pers_slow_clap',
    name: 'Royal Clap',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Royal Clap expression from the PERS Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Persian Pleated Kidaris Tiara -->
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Persian Court Beard -->
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_pers_facepalm': {
    id: 'reaction_pers_facepalm',
    name: 'Royal Facepalm',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Royal Facepalm expression from the PERS Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Persian Pleated Kidaris Tiara -->
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Persian Court Beard -->
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_pers_shock': {
    id: 'reaction_pers_shock',
    name: 'Court Shock',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Court Shock expression from the PERS Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Persian Pleated Kidaris Tiara -->
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Persian Court Beard -->
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_pers_immortal_roar': {
    id: 'reaction_pers_immortal_roar',
    name: 'Immortal Roar',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Immortal Roar expression from the PERS Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#3b82f6" stroke-width="1.8"/>
        
      <!-- Persian Pleated Kidaris Tiara -->
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Persian Court Beard -->
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_pers_fury': {
    id: 'reaction_pers_fury',
    name: 'Shah\'s Wrath',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Shah\'s Wrath expression from the PERS Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 16 20 L 20 8 L 26 14 L 32 7 L 38 14 L 44 8 L 48 20 Z" fill="#eab308" stroke="#0891b2" stroke-width="2.2"/>
                <circle cx="32" cy="14" r="2.5" fill="#4338ca"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 15 22 L 30 28" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#0891b2"/>
        <circle cx="40" cy="30" r="2.2" fill="#0891b2"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#0f172a" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#0f172a" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#0f172a" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#0f172a" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#0f172a" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_crying': {
    id: 'reaction_pers_crying',
    name: 'Fallen Satrap',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Fallen Satrap expression from the PERS Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 19 28 L 30 24" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#0f172a" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#0f172a" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_nervous': {
    id: 'reaction_pers_nervous',
    name: 'Vizier Sweat',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Vizier Sweat expression from the PERS Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <circle cx="24" cy="28" r="3.2" fill="#0f172a"/>
        <circle cx="40" cy="28" r="3.2" fill="#0f172a"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_deadpan': {
    id: 'reaction_pers_deadpan',
    name: 'Immortal Silence',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Immortal Silence expression from the PERS Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 16 L 46 16 L 42 8 L 32 10 L 22 8 Z" fill="#eab308" stroke="#0891b2" stroke-width="2.2"/>
                <path d="M 16 34 Q 32 38 48 34 L 46 54 Q 32 58 18 54 Z" fill="#0f172a" stroke="#0891b2" stroke-width="2.2"/>
                <line x1="20" y1="42" x2="44" y2="42" stroke="#0891b2" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_respect': {
    id: 'reaction_pers_respect',
    name: 'Court Homage',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Court Homage expression from the PERS Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#0f172a" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_salute': {
    id: 'reaction_pers_salute',
    name: 'Persepolis Salute',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Persepolis Salute expression from the PERS Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <circle cx="23" cy="28" r="2.8" fill="#0f172a"/>
        <circle cx="39" cy="28" r="2.8" fill="#0f172a"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#0f172a" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_scheming': {
    id: 'reaction_pers_scheming',
    name: 'Vizier Plot',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Vizier Plot expression from the PERS Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#0f172a"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#0f172a"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#eab308" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fde68a" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_mischief': {
    id: 'reaction_pers_mischief',
    name: 'Bazaar Wink',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Bazaar Wink expression from the PERS Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#0f172a" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#0f172a"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#0f172a" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_yawn': {
    id: 'reaction_pers_yawn',
    name: 'Palace Yawn',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Palace Yawn expression from the PERS Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#0f172a" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_cheer': {
    id: 'reaction_pers_cheer',
    name: 'Persepolis Hype',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Persepolis Hype expression from the PERS Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 20 L 24 10 L 40 10 L 46 20 Z" fill="#0891b2" stroke="#eab308" stroke-width="2.2"/>
              <circle cx="32" cy="15" r="2.5" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fde68a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 24 45 C 22 56, 42 56, 40 45 Q 32 49 24 45 Z" fill="#0f172a" stroke="#0891b2" stroke-width="1"/>
        
        <circle cx="23" cy="25" r="3.2" fill="#0f172a"/>
        <circle cx="41" cy="25" r="3.2" fill="#0f172a"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#eab308" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#eab308" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#eab308" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_pers_challenge': {
    id: 'reaction_pers_challenge',
    name: 'Cataphract Taunt',
    civilization: 'PERS',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.pers01',
    tagline: 'Cataphract Taunt expression from the PERS Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#2dd4bf',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <polygon points="17,21 21,11 43,11 47,21" fill="#1e3a8a" stroke="#dfbc73" stroke-width="2.2"/>
      <line x1="24" y1="11" x2="23" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="32" y1="11" x2="32" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <line x1="40" y1="11" x2="41" y2="21" stroke="#dfbc73" stroke-width="1.4"/>
      <circle cx="32" cy="16" r="2.6" fill="#38bdf8" stroke="#dfbc73" stroke-width="1.5"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 25 43 Q 32 46 39 43 Q 36 54 32 56 Q 28 54 25 43 Z" fill="#1e293b"/>
      <path d="M 27 48 Q 32 50 37 48" stroke="#dfbc73" stroke-width="1" fill="none" opacity="0.6"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Persian Shamshir Tip -->
      <path d="M 50 27 Q 56 16 63 10 Q 57 18 51 29 Z" fill="#dfbc73" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // MISIR MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_misir_pharaoh_laugh': {
    id: 'reaction_misir_pharaoh_laugh',
    name: 'Pharaoh Laugh',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Pharaoh Laugh expression from the MISIR Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Striped Nemes Cloth -->
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <!-- Uraeus Serpent -->
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#c49f75" stroke-width="2"/>
        
      <!-- Kohl Eyes & Pharaonic Beard -->
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#eab308" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#eab308" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_misir_vizier_smirk': {
    id: 'reaction_misir_vizier_smirk',
    name: 'Scribe Smirk',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Scribe Smirk expression from the MISIR Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#c49f75" stroke-width="2"/>
        
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_misir_pharaoh_nod': {
    id: 'reaction_misir_pharaoh_nod',
    name: 'Osiris Nod',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Osiris Nod expression from the MISIR Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 12 20 L 52 20 L 48 36 L 42 28 L 32 30 L 22 28 L 16 36 Z" fill="#1d4ed8" stroke="#ca8a04" stroke-width="2.2"/>
                <path d="M 18 20 L 18 32 M 25 20 L 25 28 M 39 20 L 39 28 M 46 20 L 46 32" stroke="#ca8a04" stroke-width="2"/>
                <ellipse cx="32" cy="18" rx="3.5" ry="4.5" fill="#ca8a04"/>
                <line x1="32" y1="14" x2="32" y2="10" stroke="#ca8a04" stroke-width="2.2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#0f172a"/>
        <circle cx="39" cy="30" r="2.6" fill="#0f172a"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_priest_side_eye': {
    id: 'reaction_misir_priest_side_eye',
    name: 'Priest Side-Eye',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Priest Side-Eye expression from the MISIR Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#c49f75" stroke-width="2"/>
        
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_misir_too_easy': {
    id: 'reaction_misir_too_easy',
    name: 'Too Easy Scribe',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Too Easy Scribe expression from the MISIR Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 12 20 L 52 20 L 48 36 L 42 28 L 32 30 L 22 28 L 16 36 Z" fill="#1d4ed8" stroke="#ca8a04" stroke-width="2.2"/>
                <path d="M 18 20 L 18 32 M 25 20 L 25 28 M 39 20 L 39 28 M 46 20 L 46 32" stroke="#ca8a04" stroke-width="2"/>
                <ellipse cx="32" cy="18" rx="3.5" ry="4.5" fill="#ca8a04"/>
                <line x1="32" y1="14" x2="32" y2="10" stroke="#ca8a04" stroke-width="2.2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_slow_clap': {
    id: 'reaction_misir_slow_clap',
    name: 'Temple Clap',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Temple Clap expression from the MISIR Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Striped Nemes Cloth -->
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <!-- Uraeus Serpent -->
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Kohl Eyes & Pharaonic Beard -->
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_misir_facepalm': {
    id: 'reaction_misir_facepalm',
    name: 'Dynasty Facepalm',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Dynasty Facepalm expression from the MISIR Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Striped Nemes Cloth -->
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <!-- Uraeus Serpent -->
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Kohl Eyes & Pharaonic Beard -->
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_misir_shock': {
    id: 'reaction_misir_shock',
    name: 'Tomb Shock',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Tomb Shock expression from the MISIR Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Striped Nemes Cloth -->
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <!-- Uraeus Serpent -->
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Kohl Eyes & Pharaonic Beard -->
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_misir_warrior_roar': {
    id: 'reaction_misir_warrior_roar',
    name: 'Medjay Roar',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Medjay Roar expression from the MISIR Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#eab308" stroke-width="1.8"/>
        
      <!-- Striped Nemes Cloth -->
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <!-- Uraeus Serpent -->
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Kohl Eyes & Pharaonic Beard -->
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_misir_fury': {
    id: 'reaction_misir_fury',
    name: 'Sekhmet Rage',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Sekhmet Rage expression from the MISIR Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 22 Q 22 8 32 8 Q 42 8 46 22 Z" fill="#1e3a8a" stroke="#ca8a04" stroke-width="2.2"/>
                <circle cx="28" cy="14" r="2" fill="#ca8a04"/>
                <circle cx="36" cy="14" r="2" fill="#ca8a04"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 15 22 L 30 28" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#1d4ed8"/>
        <circle cx="40" cy="30" r="2.2" fill="#1d4ed8"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#0f172a" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#0f172a" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#0f172a" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#0f172a" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#0f172a" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_crying': {
    id: 'reaction_misir_crying',
    name: 'Nile Tears',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Nile Tears expression from the MISIR Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 19 28 L 30 24" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#0f172a" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#0f172a" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_nervous': {
    id: 'reaction_misir_nervous',
    name: 'Nervous Embalmer',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Nervous Embalmer expression from the MISIR Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <circle cx="24" cy="28" r="3.2" fill="#0f172a"/>
        <circle cx="40" cy="28" r="3.2" fill="#0f172a"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_deadpan': {
    id: 'reaction_misir_deadpan',
    name: 'Sphinx Gaze',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Sphinx Gaze expression from the MISIR Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_respect': {
    id: 'reaction_misir_respect',
    name: 'Solar Homage',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Solar Homage expression from the MISIR Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#0f172a" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_salute': {
    id: 'reaction_misir_salute',
    name: 'Pharaoh Salute',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Pharaoh Salute expression from the MISIR Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 12 20 L 52 20 L 48 36 L 42 28 L 32 30 L 22 28 L 16 36 Z" fill="#1d4ed8" stroke="#ca8a04" stroke-width="2.2"/>
                <path d="M 18 20 L 18 32 M 25 20 L 25 28 M 39 20 L 39 28 M 46 20 L 46 32" stroke="#ca8a04" stroke-width="2"/>
                <ellipse cx="32" cy="18" rx="3.5" ry="4.5" fill="#ca8a04"/>
                <line x1="32" y1="14" x2="32" y2="10" stroke="#ca8a04" stroke-width="2.2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <circle cx="23" cy="28" r="2.8" fill="#0f172a"/>
        <circle cx="39" cy="28" r="2.8" fill="#0f172a"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#0f172a" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_scheming': {
    id: 'reaction_misir_scheming',
    name: 'Vizier Scheme',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Vizier Scheme expression from the MISIR Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#0f172a"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#0f172a"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#ca8a04" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fed7aa" stroke="#0f172a" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_mischief': {
    id: 'reaction_misir_mischief',
    name: 'Scarab Grin',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Scarab Grin expression from the MISIR Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#0f172a" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#0f172a"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#0f172a" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_yawn': {
    id: 'reaction_misir_yawn',
    name: 'Oasis Yawn',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Oasis Yawn expression from the MISIR Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#0f172a" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_cheer': {
    id: 'reaction_misir_cheer',
    name: 'Karnak Hype',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Karnak Hype expression from the MISIR Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 20 Q 32 15 46 20" stroke="#ca8a04" stroke-width="3" fill="none"/>
              <circle cx="32" cy="18" r="2.5" fill="#ca8a04"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2.8"/>
        
        
        <circle cx="23" cy="25" r="3.2" fill="#0f172a"/>
        <circle cx="41" cy="25" r="3.2" fill="#0f172a"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#0f172a" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#ca8a04" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#ca8a04" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#ca8a04" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_misir_challenge': {
    id: 'reaction_misir_challenge',
    name: 'Khopesh Taunt',
    civilization: 'MISIR',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.misir01',
    tagline: 'Khopesh Taunt expression from the MISIR Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#facc15',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <path d="M 14 24 C 14 14, 22 10, 32 10 C 42 10, 50 14, 50 24 L 54 40 L 48 38 L 47 24 L 17 24 L 16 38 L 10 40 Z" fill="#0284c7" stroke="#eab308" stroke-width="2"/>
      <line x1="20" y1="14" x2="44" y2="14" stroke="#eab308" stroke-width="2"/>
      <line x1="16" y1="20" x2="48" y2="20" stroke="#eab308" stroke-width="2"/>
      <path d="M 32 14 Q 34 8 32 6" stroke="#eab308" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 31 49 L 33 49 L 33 58 L 31 58 Z" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#dfc19c" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Khopesh Sickle Hook -->
      <path d="M 50 28 Q 58 20 62 13 Q 63 18 57 26 Z" fill="#dfbc73" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // HAN MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_han_emperor_laugh': {
    id: 'reaction_han_emperor_laugh',
    name: 'Emperor Laugh',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Emperor Laugh expression from the HAN Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Han Guan Cap & Hairpin -->
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#dbe1ea" stroke-width="2"/>
        
      <!-- Sleek Imperial Goatee -->
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#10b981" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#10b981" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_han_strategist_smirk': {
    id: 'reaction_han_strategist_smirk',
    name: 'Scholar Smirk',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Scholar Smirk expression from the HAN Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#dbe1ea" stroke-width="2"/>
        
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_han_son_nod': {
    id: 'reaction_han_son_nod',
    name: 'Mandate Nod',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Mandate Nod expression from the HAN Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <rect x="14" y="10" width="36" height="6" rx="2" fill="#dc2626" stroke="#059669" stroke-width="2.2"/>
                <line x1="18" y1="16" x2="18" y2="24" stroke="#059669" stroke-width="2"/>
                <line x1="25" y1="16" x2="25" y2="24" stroke="#eab308" stroke-width="2"/>
                <line x1="32" y1="16" x2="32" y2="24" stroke="#059669" stroke-width="2"/>
                <line x1="39" y1="16" x2="39" y2="24" stroke="#eab308" stroke-width="2"/>
                <line x1="46" y1="16" x2="46" y2="24" stroke="#059669" stroke-width="2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#1e293b"/>
        <circle cx="39" cy="30" r="2.6" fill="#1e293b"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_minister_side_eye': {
    id: 'reaction_han_minister_side_eye',
    name: 'Minister Side-Eye',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Minister Side-Eye expression from the HAN Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#dbe1ea" stroke-width="2"/>
        
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_han_too_easy': {
    id: 'reaction_han_too_easy',
    name: 'Too Easy Master',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Too Easy Master expression from the HAN Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_slow_clap': {
    id: 'reaction_han_slow_clap',
    name: 'Court Clap',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Court Clap expression from the HAN Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Han Guan Cap & Hairpin -->
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Sleek Imperial Goatee -->
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_han_facepalm': {
    id: 'reaction_han_facepalm',
    name: 'Imperial Facepalm',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Imperial Facepalm expression from the HAN Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Han Guan Cap & Hairpin -->
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Sleek Imperial Goatee -->
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_han_shock': {
    id: 'reaction_han_shock',
    name: 'Dragon Shock',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Dragon Shock expression from the HAN Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Han Guan Cap & Hairpin -->
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Sleek Imperial Goatee -->
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_han_general_roar': {
    id: 'reaction_han_general_roar',
    name: 'Dragon Warcry',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Dragon Warcry expression from the HAN Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#10b981" stroke-width="1.8"/>
        
      <!-- Han Guan Cap & Hairpin -->
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Sleek Imperial Goatee -->
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_han_fury': {
    id: 'reaction_han_fury',
    name: 'Heaven\'s Wrath',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Heaven\'s Wrath expression from the HAN Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 22 Q 32 10 46 22 L 44 26 L 20 26 Z" fill="#dc2626" stroke="#059669" stroke-width="2.2"/>
                <path d="M 32 10 L 32 2" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
                <polygon points="32,2 36,8 28,8" fill="#eab308"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 15 22 L 30 28" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#dc2626"/>
        <circle cx="40" cy="30" r="2.2" fill="#dc2626"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#1e293b" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#1e293b" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#1e293b" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#1e293b" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_crying': {
    id: 'reaction_han_crying',
    name: 'Exile Tears',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Exile Tears expression from the HAN Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 19 28 L 30 24" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#1e293b" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#1e293b" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#1e293b" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#1e293b" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_nervous': {
    id: 'reaction_han_nervous',
    name: 'Nervous Scholar',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Nervous Scholar expression from the HAN Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <circle cx="24" cy="28" r="3.2" fill="#1e293b"/>
        <circle cx="40" cy="28" r="3.2" fill="#1e293b"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#1e293b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_deadpan': {
    id: 'reaction_han_deadpan',
    name: 'Terracotta Stoic',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Terracotta Stoic expression from the HAN Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_respect': {
    id: 'reaction_han_respect',
    name: 'Bowing Homage',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Bowing Homage expression from the HAN Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#1e293b" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#1e293b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_salute': {
    id: 'reaction_han_salute',
    name: 'Fist & Palm',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Fist & Palm expression from the HAN Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <circle cx="23" cy="28" r="2.8" fill="#1e293b"/>
        <circle cx="39" cy="28" r="2.8" fill="#1e293b"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#1e293b" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#1e293b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_scheming': {
    id: 'reaction_han_scheming',
    name: 'Strategist Plot',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Strategist Plot expression from the HAN Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#1e293b"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#1e293b"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#059669" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fef08a" stroke="#1e293b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_mischief': {
    id: 'reaction_han_mischief',
    name: 'Monkey Mischief',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Monkey Mischief expression from the HAN Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#1e293b"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_yawn': {
    id: 'reaction_han_yawn',
    name: 'Pavilion Yawn',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Pavilion Yawn expression from the HAN Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_cheer': {
    id: 'reaction_han_cheer',
    name: 'Imperial Hype',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Imperial Hype expression from the HAN Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 22 18 Q 32 10 42 18 L 40 24 L 24 24 Z" fill="#1e293b" stroke="#059669" stroke-width="2.2"/>
              <rect x="22" y="22" width="20" height="3.5" fill="#059669"/>
              <line x1="10" y1="22" x2="22" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="42" y1="22" x2="54" y2="22" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fef08a" stroke="#1e293b" stroke-width="2.8"/>
        
        
        <circle cx="23" cy="25" r="3.2" fill="#1e293b"/>
        <circle cx="41" cy="25" r="3.2" fill="#1e293b"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#059669" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#059669" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#059669" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_han_challenge': {
    id: 'reaction_han_challenge',
    name: 'Halberd Taunt',
    civilization: 'HAN',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.han01',
    tagline: 'Halberd Taunt expression from the HAN Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#34d399',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <rect x="23" y="11" width="18" height="11" rx="2" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <line x1="15" y1="17" x2="49" y2="17" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15" cy="17" r="2.2" fill="#dc2626"/>
      <circle cx="49" cy="17" r="2.2" fill="#dc2626"/>
      <path d="M 32 11 L 32 7" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 31 46 Q 32 52 33 46" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Han Dao Blade -->
      <polygon points="50,27 63,12 64,14 51,30" fill="#dfbc73" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // YAMATO MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_yamato_shogun_laugh': {
    id: 'reaction_yamato_shogun_laugh',
    name: 'Shogun Laugh',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Shogun Laugh expression from the YAMATO Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Samurai Eboshi / Crest -->
      <path d="M 22 21 C 22 12, 28 8, 32 8 C 36 8, 42 12, 42 21 Z" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <!-- Kuwagata Gold Antler Crest -->
      <path d="M 32 16 L 24 6 M 32 16 L 40 6" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="17" r="2.8" fill="#e11d48"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#dde3ea" stroke-width="2"/>
        
      <!-- Clean Honorable Line -->
      <path d="M 26 44 Q 32 47 38 44" stroke="#1e293b" stroke-width="1.8" fill="none"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#f43f5e" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#f43f5e" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_ronin_smirk': {
    id: 'reaction_yamato_ronin_smirk',
    name: 'Ronin Smirk',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Ronin Smirk expression from the YAMATO Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <ellipse cx="32" cy="18" rx="17" ry="9" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 22 17 L 17 8 L 26 13 M 42 17 L 47 8 L 38 13" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="13" r="2.8" fill="#f43f5e"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#fbf5ee" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#fbf5ee" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#dfd4c5" stroke-width="2"/>
        
      <path d="M 30 45 L 34 45" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_daimyo_nod': {
    id: 'reaction_yamato_daimyo_nod',
    name: 'Daimyo Nod',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Daimyo Nod expression from the YAMATO Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: NARROW_COURT -->
        <path d="M 20 23 C 20 19, 44 19, 44 23 C 45 37, 39 55, 32 57 C 25 55, 19 37, 20 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 21 26 C 21 37, 25 50, 32 55 C 39 50, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#09090b"/>
        <circle cx="39" cy="30" r="2.6" fill="#09090b"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_shinobi_side_eye': {
    id: 'reaction_yamato_shinobi_side_eye',
    name: 'Shadow Side-Eye',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Shadow Side-Eye expression from the YAMATO Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <ellipse cx="32" cy="18" rx="17" ry="9" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 22 17 L 17 8 L 26 13 M 42 17 L 47 8 L 38 13" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="13" r="2.8" fill="#f43f5e"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#fbf5ee" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#dfd4c5" stroke-width="2"/>
        
      <path d="M 30 45 L 34 45" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_too_easy': {
    id: 'reaction_yamato_too_easy',
    name: 'Too Easy Ronin',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Too Easy Ronin expression from the YAMATO Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 10 24 L 32 12 L 54 24 Z" fill="#78350f" stroke="#ea580c" stroke-width="2.2"/>
                <line x1="20" y1="24" x2="32" y2="13" stroke="#ea580c" stroke-width="1.5"/>
                <line x1="44" y1="24" x2="32" y2="13" stroke="#ea580c" stroke-width="1.5"/>
        
        <!-- Morphological Archetype: YOUNG_SOLDIER -->
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 36, 41 50, 32 52 C 23 50, 18 36, 18 24 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 19 26 C 19 35, 23 47, 32 50 C 41 47, 45 35, 45 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#09090b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#09090b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#09090b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#09090b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_slow_clap': {
    id: 'reaction_yamato_slow_clap',
    name: 'Dojo Clap',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Dojo Clap expression from the YAMATO Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Samurai Eboshi / Crest -->
      <path d="M 22 21 C 22 12, 28 8, 32 8 C 36 8, 42 12, 42 21 Z" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <!-- Kuwagata Gold Antler Crest -->
      <path d="M 32 16 L 24 6 M 32 16 L 40 6" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="17" r="2.8" fill="#e11d48"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Clean Honorable Line -->
      <path d="M 26 44 Q 32 47 38 44" stroke="#1e293b" stroke-width="1.8" fill="none"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_facepalm': {
    id: 'reaction_yamato_facepalm',
    name: 'Shame Facepalm',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Shame Facepalm expression from the YAMATO Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Samurai Eboshi / Crest -->
      <path d="M 22 21 C 22 12, 28 8, 32 8 C 36 8, 42 12, 42 21 Z" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <!-- Kuwagata Gold Antler Crest -->
      <path d="M 32 16 L 24 6 M 32 16 L 40 6" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="17" r="2.8" fill="#e11d48"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Clean Honorable Line -->
      <path d="M 26 44 Q 32 47 38 44" stroke="#1e293b" stroke-width="1.8" fill="none"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_shock': {
    id: 'reaction_yamato_shock',
    name: 'Kabuki Shock',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Kabuki Shock expression from the YAMATO Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Samurai Eboshi / Crest -->
      <path d="M 22 21 C 22 12, 28 8, 32 8 C 36 8, 42 12, 42 21 Z" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <!-- Kuwagata Gold Antler Crest -->
      <path d="M 32 16 L 24 6 M 32 16 L 40 6" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="17" r="2.8" fill="#e11d48"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Clean Honorable Line -->
      <path d="M 26 44 Q 32 47 38 44" stroke="#1e293b" stroke-width="1.8" fill="none"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_samurai_roar': {
    id: 'reaction_yamato_samurai_roar',
    name: 'Samurai Roar',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Samurai Roar expression from the YAMATO Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#f43f5e" stroke-width="1.8"/>
        
      <!-- Samurai Eboshi / Crest -->
      <path d="M 22 21 C 22 12, 28 8, 32 8 C 36 8, 42 12, 42 21 Z" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <!-- Kuwagata Gold Antler Crest -->
      <path d="M 32 16 L 24 6 M 32 16 L 40 6" stroke="#dfbc73" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="17" r="2.8" fill="#e11d48"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Clean Honorable Line -->
      <path d="M 26 44 Q 32 47 38 44" stroke="#1e293b" stroke-width="1.8" fill="none"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_yamato_fury': {
    id: 'reaction_yamato_fury',
    name: 'Oni Wrath',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Oni Wrath expression from the YAMATO Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: ELDER_WARRIOR -->
        <path d="M 16 24 C 16 20, 48 20, 48 24 C 48 39, 44 52, 32 54 C 20 52, 16 39, 16 24 Z" fill="#e2d5c3" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 18 27 C 18 38, 22 49, 32 52 C 42 49, 46 38, 46 27" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 15 22 L 30 28" stroke="#09090b" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#09090b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#18181b"/>
        <circle cx="40" cy="30" r="2.2" fill="#18181b"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#09090b" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#09090b" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#09090b" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#09090b" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#09090b" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_crying': {
    id: 'reaction_yamato_crying',
    name: 'Autumn Tears',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Autumn Tears expression from the YAMATO Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: YOUNG_SOLDIER -->
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 36, 41 50, 32 52 C 23 50, 18 36, 18 24 Z" fill="#fdf0d5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 19 26 C 19 35, 23 47, 32 50 C 41 47, 45 35, 45 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 19 28 L 30 24" stroke="#09090b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#09090b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#09090b" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#09090b" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#09090b" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#09090b" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_nervous': {
    id: 'reaction_yamato_nervous',
    name: 'Sweating Retainer',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Sweating Retainer expression from the YAMATO Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: JOVIAL_COURTIER -->
        <path d="M 17 24 C 17 20, 47 20, 47 24 C 48 42, 43 55, 32 56 C 21 55, 16 42, 17 24 Z" fill="#fef0e2" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 18 27 C 18 40, 23 51, 32 54 C 41 51, 46 40, 46 27" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <circle cx="24" cy="28" r="3.2" fill="#09090b"/>
        <circle cx="40" cy="28" r="3.2" fill="#09090b"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#09090b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_deadpan': {
    id: 'reaction_yamato_deadpan',
    name: 'Iron Menpo',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Iron Menpo expression from the YAMATO Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: LEAN_SCHEMER -->
        <path d="M 19 23 C 19 19, 45 20, 45 23 C 44 38, 38 54, 31 56 C 24 54, 19 39, 19 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 20 26 C 20 37, 24 49, 31 54 C 38 49, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_respect': {
    id: 'reaction_yamato_respect',
    name: 'Samurai Bow',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Samurai Bow expression from the YAMATO Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fef3c7" stroke="#09090b" stroke-width="2.8"/>
        
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#09090b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fef3c7" stroke="#09090b" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#09090b" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#09090b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_salute': {
    id: 'reaction_yamato_salute',
    name: 'Katana Salute',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Katana Salute expression from the YAMATO Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: NARROW_COURT -->
        <path d="M 20 23 C 20 19, 44 19, 44 23 C 45 37, 39 55, 32 57 C 25 55, 19 37, 20 23 Z" fill="#f6f8fb" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 21 26 C 21 37, 25 50, 32 55 C 39 50, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <circle cx="23" cy="28" r="2.8" fill="#09090b"/>
        <circle cx="39" cy="28" r="2.8" fill="#09090b"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#09090b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fef3c7" stroke="#09090b" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#09090b" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#09090b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_scheming': {
    id: 'reaction_yamato_scheming',
    name: 'Kitsune Plot',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Kitsune Plot expression from the YAMATO Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef3c7" stroke="#09090b" stroke-width="2.8"/>
        
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#09090b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#09090b"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#09090b"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#09090b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#ea580c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fef3c7" stroke="#09090b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_mischief': {
    id: 'reaction_yamato_mischief',
    name: 'Tanuki Grin',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Tanuki Grin expression from the YAMATO Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fef3c7" stroke="#09090b" stroke-width="2.8"/>
        
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#09090b" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#09090b"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#09090b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_yawn': {
    id: 'reaction_yamato_yawn',
    name: 'Tea Yawn',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Tea Yawn expression from the YAMATO Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 27 22 L 32 8 L 37 22 Z" fill="#09090b" stroke="#ea580c" stroke-width="2"/>
              <rect x="22" y="20" width="20" height="4" rx="1" fill="#09090b"/>
        
        <!-- Morphological Archetype: JOVIAL_COURTIER -->
        <path d="M 17 24 C 17 20, 47 20, 47 24 C 48 42, 43 55, 32 56 C 21 55, 16 42, 17 24 Z" fill="#fef0e2" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 18 27 C 18 40, 23 51, 32 54 C 41 51, 46 40, 46 27" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#09090b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#09090b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#09090b" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fef3c7" stroke="#09090b" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_cheer': {
    id: 'reaction_yamato_cheer',
    name: 'Banzai Hype',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Banzai Hype expression from the YAMATO Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 16 20 Q 32 13 48 20 L 46 25 L 18 25 Z" fill="#18181b" stroke="#ea580c" stroke-width="2.2"/>
                <path d="M 26 18 Q 18 4 12 6 Q 22 13 28 17" fill="#ea580c"/>
                <path d="M 38 18 Q 46 4 52 6 Q 42 13 36 17" fill="#ea580c"/>
                <circle cx="32" cy="18" r="3.2" fill="#ea580c"/>
        
        <!-- Morphological Archetype: LEAN_SCHEMER -->
        <path d="M 19 23 C 19 19, 45 20, 45 23 C 44 38, 38 54, 31 56 C 24 54, 19 39, 19 23 Z" fill="#eedbc5" stroke="#1e293b" stroke-width="2.8"/>
        <!-- Subtle Cheek Tone & Jaw Definition -->
        <path d="M 20 26 C 20 37, 24 49, 31 54 C 38 49, 43 37, 43 26" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.8"/>
    
        
        
        <circle cx="23" cy="25" r="3.2" fill="#09090b"/>
        <circle cx="41" cy="25" r="3.2" fill="#09090b"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#09090b" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#09090b" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#ea580c" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#ea580c" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#ea580c" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_yamato_challenge': {
    id: 'reaction_yamato_challenge',
    name: 'Blade Taunt',
    civilization: 'YAMATO',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.yamato01',
    tagline: 'Blade Taunt expression from the YAMATO Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#fb923c',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <ellipse cx="32" cy="18" rx="17" ry="9" fill="#1e293b" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 22 17 L 17 8 L 26 13 M 42 17 L 47 8 L 38 13" stroke="#dfbc73" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="13" r="2.8" fill="#f43f5e"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#fbf5ee" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 30 45 L 34 45" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#fbf5ee" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Katana Kissaki -->
      <path d="M 50 27 Q 56 18 63 12 L 62 10 Q 55 16 49 26 Z" fill="#dfbc73" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // NORSE MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_norse_jarl_laugh': {
    id: 'reaction_norse_jarl_laugh',
    name: 'Jarl Laugh',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Jarl Laugh expression from the NORSE Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Norse Spangenhelm -->
      <path d="M 17 22 C 17 12, 24 9, 32 9 C 40 9, 47 12, 47 22 Z" fill="#475569" stroke="#dfbc73" stroke-width="2.2"/>
      <!-- Nasal Spectacle Guard -->
      <path d="M 24 21 Q 32 24 40 21 L 34 29 L 30 29 Z" fill="#334155" stroke="#dfbc73" stroke-width="1.8"/>
      <circle cx="32" cy="11" r="2" fill="#dfbc73"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#cbd5e1" stroke-width="2"/>
        
      <!-- Norse Braided Beard -->
      <path d="M 22 40 Q 32 48 42 40 Q 38 58 32 60 Q 26 58 22 40 Z" fill="#d97706" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="#b45309" stroke-width="1.6"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#06b6d4" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#06b6d4" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_norse_skald_smirk': {
    id: 'reaction_norse_skald_smirk',
    name: 'Skald Smirk',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Skald Smirk expression from the NORSE Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <path d="M 18 22 C 18 13, 46 13, 46 22 Z" fill="#334155" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 19 18 C 15 14, 13 8, 11 5 C 13 8, 16 11, 19 14 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <path d="M 45 18 C 49 14, 51 8, 53 5 C 51 8, 48 11, 45 14 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <rect x="23" y="19" width="18" height="4" fill="#dfbc73"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#f4ede4" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#f4ede4" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#d8c7b5" stroke-width="2"/>
        
      <path d="M 23 41 C 23 52, 28 58, 32 60 C 36 58, 41 52, 41 41 Z" fill="#b45309" stroke="#1e293b" stroke-width="1.6"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_norse_allfather_nod': {
    id: 'reaction_norse_allfather_nod',
    name: 'Odin Nod',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Odin Nod expression from the NORSE Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#d97706"/>
        <circle cx="39" cy="30" r="2.6" fill="#d97706"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_shieldmaiden_side_eye': {
    id: 'reaction_norse_shieldmaiden_side_eye',
    name: 'Frost Side-Eye',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Frost Side-Eye expression from the NORSE Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <path d="M 18 22 C 18 13, 46 13, 46 22 Z" fill="#334155" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 19 18 C 15 14, 13 8, 11 5 C 13 8, 16 11, 19 14 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <path d="M 45 18 C 49 14, 51 8, 53 5 C 51 8, 48 11, 45 14 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <rect x="23" y="19" width="18" height="4" fill="#dfbc73"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#f4ede4" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#d8c7b5" stroke-width="2"/>
        
      <path d="M 23 41 C 23 52, 28 58, 32 60 C 36 58, 41 52, 41 41 Z" fill="#b45309" stroke="#1e293b" stroke-width="1.6"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_norse_too_easy': {
    id: 'reaction_norse_too_easy',
    name: 'Too Easy Viking',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Too Easy Viking expression from the NORSE Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#d97706" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#d97706" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#d97706" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#d97706" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_slow_clap': {
    id: 'reaction_norse_slow_clap',
    name: 'Longhouse Clap',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Longhouse Clap expression from the NORSE Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Norse Spangenhelm -->
      <path d="M 17 22 C 17 12, 24 9, 32 9 C 40 9, 47 12, 47 22 Z" fill="#475569" stroke="#dfbc73" stroke-width="2.2"/>
      <!-- Nasal Spectacle Guard -->
      <path d="M 24 21 Q 32 24 40 21 L 34 29 L 30 29 Z" fill="#334155" stroke="#dfbc73" stroke-width="1.8"/>
      <circle cx="32" cy="11" r="2" fill="#dfbc73"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Norse Braided Beard -->
      <path d="M 22 40 Q 32 48 42 40 Q 38 58 32 60 Q 26 58 22 40 Z" fill="#d97706" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="#b45309" stroke-width="1.6"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_norse_facepalm': {
    id: 'reaction_norse_facepalm',
    name: 'Saga Facepalm',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Saga Facepalm expression from the NORSE Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Norse Spangenhelm -->
      <path d="M 17 22 C 17 12, 24 9, 32 9 C 40 9, 47 12, 47 22 Z" fill="#475569" stroke="#dfbc73" stroke-width="2.2"/>
      <!-- Nasal Spectacle Guard -->
      <path d="M 24 21 Q 32 24 40 21 L 34 29 L 30 29 Z" fill="#334155" stroke="#dfbc73" stroke-width="1.8"/>
      <circle cx="32" cy="11" r="2" fill="#dfbc73"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Norse Braided Beard -->
      <path d="M 22 40 Q 32 48 42 40 Q 38 58 32 60 Q 26 58 22 40 Z" fill="#d97706" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="#b45309" stroke-width="1.6"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_norse_shock': {
    id: 'reaction_norse_shock',
    name: 'Fjord Shock',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Fjord Shock expression from the NORSE Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Norse Spangenhelm -->
      <path d="M 17 22 C 17 12, 24 9, 32 9 C 40 9, 47 12, 47 22 Z" fill="#475569" stroke="#dfbc73" stroke-width="2.2"/>
      <!-- Nasal Spectacle Guard -->
      <path d="M 24 21 Q 32 24 40 21 L 34 29 L 30 29 Z" fill="#334155" stroke="#dfbc73" stroke-width="1.8"/>
      <circle cx="32" cy="11" r="2" fill="#dfbc73"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Norse Braided Beard -->
      <path d="M 22 40 Q 32 48 42 40 Q 38 58 32 60 Q 26 58 22 40 Z" fill="#d97706" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="#b45309" stroke-width="1.6"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_norse_berserker_roar': {
    id: 'reaction_norse_berserker_roar',
    name: 'Berserker Roar',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Berserker Roar expression from the NORSE Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#06b6d4" stroke-width="1.8"/>
        
      <!-- Norse Spangenhelm -->
      <path d="M 17 22 C 17 12, 24 9, 32 9 C 40 9, 47 12, 47 22 Z" fill="#475569" stroke="#dfbc73" stroke-width="2.2"/>
      <!-- Nasal Spectacle Guard -->
      <path d="M 24 21 Q 32 24 40 21 L 34 29 L 30 29 Z" fill="#334155" stroke="#dfbc73" stroke-width="1.8"/>
      <circle cx="32" cy="11" r="2" fill="#dfbc73"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Norse Braided Beard -->
      <path d="M 22 40 Q 32 48 42 40 Q 38 58 32 60 Q 26 58 22 40 Z" fill="#d97706" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="#b45309" stroke-width="1.6"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_norse_fury': {
    id: 'reaction_norse_fury',
    name: 'Thor\'s Wrath',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Thor\'s Wrath expression from the NORSE Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 16 22 Q 32 9 48 22 L 46 25 L 18 25 Z" fill="#475569" stroke="#38bdf8" stroke-width="2.4"/>
                <path d="M 32 10 L 32 30" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                <line x1="20" y1="24" x2="44" y2="24" stroke="#38bdf8" stroke-width="2.2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 15 22 L 30 28" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#475569"/>
        <circle cx="40" cy="30" r="2.2" fill="#475569"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#d97706" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#d97706" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#d97706" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#d97706" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#d97706" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_crying': {
    id: 'reaction_norse_crying',
    name: 'Valkyrie Weep',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Valkyrie Weep expression from the NORSE Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 19 28 L 30 24" stroke="#d97706" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#d97706" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#d97706" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#d97706" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#d97706" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#d97706" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_nervous': {
    id: 'reaction_norse_nervous',
    name: 'Oarsman Sweat',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Oarsman Sweat expression from the NORSE Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <circle cx="24" cy="28" r="3.2" fill="#d97706"/>
        <circle cx="40" cy="28" r="3.2" fill="#d97706"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#d97706" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_deadpan': {
    id: 'reaction_norse_deadpan',
    name: 'Runestone Face',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Runestone Face expression from the NORSE Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_respect': {
    id: 'reaction_norse_respect',
    name: 'Shield Salute',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Shield Salute expression from the NORSE Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#d97706" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#d97706" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#d97706" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_salute': {
    id: 'reaction_norse_salute',
    name: 'Axe Salute',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Axe Salute expression from the NORSE Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <circle cx="23" cy="28" r="2.8" fill="#d97706"/>
        <circle cx="39" cy="28" r="2.8" fill="#d97706"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#d97706" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#d97706" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#d97706" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_scheming': {
    id: 'reaction_norse_scheming',
    name: 'Loki Scheme',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Loki Scheme expression from the NORSE Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#d97706" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#d97706"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#d97706"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#d97706" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#38bdf8" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#f1f5f9" stroke="#d97706" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_mischief': {
    id: 'reaction_norse_mischief',
    name: 'Raven Wink',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Raven Wink expression from the NORSE Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#d97706" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#d97706"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#d97706" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_yawn': {
    id: 'reaction_norse_yawn',
    name: 'Winter Yawn',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Winter Yawn expression from the NORSE Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 22 Q 32 16 46 22" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
              <circle cx="32" cy="19" r="2.5" fill="#78350f"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#d97706" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#d97706" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#d97706" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_cheer': {
    id: 'reaction_norse_cheer',
    name: 'Valhalla Hype',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Valhalla Hype expression from the NORSE Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 16 22 Q 32 9 48 22 L 46 25 L 18 25 Z" fill="#475569" stroke="#38bdf8" stroke-width="2.4"/>
                <path d="M 32 10 L 32 30" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                <line x1="20" y1="24" x2="44" y2="24" stroke="#38bdf8" stroke-width="2.2"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#f1f5f9" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 20 42 C 20 58, 44 58, 44 42 Q 32 48 20 42 Z" fill="#d97706"/>
                  <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
        
        <circle cx="23" cy="25" r="3.2" fill="#d97706"/>
        <circle cx="41" cy="25" r="3.2" fill="#d97706"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#d97706" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#d97706" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_norse_challenge': {
    id: 'reaction_norse_challenge',
    name: 'Holmgang Taunt',
    civilization: 'NORSE',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.norse01',
    tagline: 'Holmgang Taunt expression from the NORSE Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#38bdf8',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <path d="M 18 22 C 18 13, 46 13, 46 22 Z" fill="#334155" stroke="#dfbc73" stroke-width="2.2"/>
      <path d="M 19 18 C 15 14, 13 8, 11 5 C 13 8, 16 11, 19 14 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <path d="M 45 18 C 49 14, 51 8, 53 5 C 51 8, 48 11, 45 14 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <rect x="23" y="19" width="18" height="4" fill="#dfbc73"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#f4ede4" stroke="#1e293b" stroke-width="2.8"/>
        
      <path d="M 23 41 C 23 52, 28 58, 32 60 C 36 58, 41 52, 41 41 Z" fill="#b45309" stroke="#1e293b" stroke-width="1.6"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#f4ede4" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Viking Bearded Axe -->
      <polygon points="50,26 62,14 64,18 58,22 51,29" fill="#06b6d4" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // MAYA MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_maya_king_laugh': {
    id: 'reaction_maya_king_laugh',
    name: 'Ajaw Laugh',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Ajaw Laugh expression from the MAYA Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Jade Diadem & Quetzal Plumes -->
      <rect x="20" y="14" width="24" height="7" rx="1.5" fill="#15803d" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 26 14 C 24 6, 20 4, 16 3 M 32 14 C 32 5, 32 2, 32 1 M 38 14 C 40 6, 44 4, 48 3" stroke="#65a30d" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="17.5" r="1.8" fill="#fef08a"/>
      <circle cx="32" cy="17.5" r="2" fill="#ef4444"/>
      <circle cx="38" cy="17.5" r="1.8" fill="#fef08a"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#b45309" stroke-width="2"/>
        
      <!-- Jade Ear Flares & Facial Line -->
      <circle cx="15" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
      <circle cx="49" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#84cc16" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#84cc16" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_maya_priest_smirk': {
    id: 'reaction_maya_priest_smirk',
    name: 'Priest Smirk',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Priest Smirk expression from the MAYA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <path d="M 18 20 C 18 13, 46 13, 46 20 Z" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 22 14 C 18 7, 16 2, 14 0 M 32 12 C 32 5, 32 1, 32 0 M 42 14 C 46 7, 48 2, 50 0" stroke="#84cc16" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="16" r="3" fill="#eab308"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#c99a68" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#c99a68" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#aa7a48" stroke-width="2"/>
        
      <circle cx="21" cy="44" r="1.8" fill="#047857"/>
      <circle cx="43" cy="44" r="1.8" fill="#047857"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_maya_sun_nod': {
    id: 'reaction_maya_sun_nod',
    name: 'Solar Nod',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Solar Nod expression from the MAYA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 18 Q 24 4 32 4 Q 40 4 46 18 Z" fill="#047857" stroke="#b45309" stroke-width="2.2"/>
                <line x1="26" y1="5" x2="18" y2="0" stroke="#991b1b" stroke-width="3" stroke-linecap="round"/>
                <line x1="32" y1="4" x2="32" y2="-2" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>
                <line x1="38" y1="5" x2="46" y2="0" stroke="#991b1b" stroke-width="3" stroke-linecap="round"/>
                <circle cx="14" cy="36" r="3.8" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
                <circle cx="50" cy="36" r="3.8" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#18181b"/>
        <circle cx="39" cy="30" r="2.6" fill="#18181b"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_scribe_side_eye': {
    id: 'reaction_maya_scribe_side_eye',
    name: 'Glyph Side-Eye',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Glyph Side-Eye expression from the MAYA Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <path d="M 18 20 C 18 13, 46 13, 46 20 Z" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 22 14 C 18 7, 16 2, 14 0 M 32 12 C 32 5, 32 1, 32 0 M 42 14 C 46 7, 48 2, 50 0" stroke="#84cc16" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="16" r="3" fill="#eab308"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#c99a68" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#aa7a48" stroke-width="2"/>
        
      <circle cx="21" cy="44" r="1.8" fill="#047857"/>
      <circle cx="43" cy="44" r="1.8" fill="#047857"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_maya_too_easy': {
    id: 'reaction_maya_too_easy',
    name: 'Too Easy Jag',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Too Easy Jag expression from the MAYA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#18181b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#18181b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_slow_clap': {
    id: 'reaction_maya_slow_clap',
    name: 'Plaza Clap',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Plaza Clap expression from the MAYA Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Jade Diadem & Quetzal Plumes -->
      <rect x="20" y="14" width="24" height="7" rx="1.5" fill="#15803d" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 26 14 C 24 6, 20 4, 16 3 M 32 14 C 32 5, 32 2, 32 1 M 38 14 C 40 6, 44 4, 48 3" stroke="#65a30d" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="17.5" r="1.8" fill="#fef08a"/>
      <circle cx="32" cy="17.5" r="2" fill="#ef4444"/>
      <circle cx="38" cy="17.5" r="1.8" fill="#fef08a"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Jade Ear Flares & Facial Line -->
      <circle cx="15" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
      <circle cx="49" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_maya_facepalm': {
    id: 'reaction_maya_facepalm',
    name: 'Jungle Facepalm',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Jungle Facepalm expression from the MAYA Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Jade Diadem & Quetzal Plumes -->
      <rect x="20" y="14" width="24" height="7" rx="1.5" fill="#15803d" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 26 14 C 24 6, 20 4, 16 3 M 32 14 C 32 5, 32 2, 32 1 M 38 14 C 40 6, 44 4, 48 3" stroke="#65a30d" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="17.5" r="1.8" fill="#fef08a"/>
      <circle cx="32" cy="17.5" r="2" fill="#ef4444"/>
      <circle cx="38" cy="17.5" r="1.8" fill="#fef08a"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Jade Ear Flares & Facial Line -->
      <circle cx="15" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
      <circle cx="49" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_maya_shock': {
    id: 'reaction_maya_shock',
    name: 'Eclipse Shock',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Eclipse Shock expression from the MAYA Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Jade Diadem & Quetzal Plumes -->
      <rect x="20" y="14" width="24" height="7" rx="1.5" fill="#15803d" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 26 14 C 24 6, 20 4, 16 3 M 32 14 C 32 5, 32 2, 32 1 M 38 14 C 40 6, 44 4, 48 3" stroke="#65a30d" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="17.5" r="1.8" fill="#fef08a"/>
      <circle cx="32" cy="17.5" r="2" fill="#ef4444"/>
      <circle cx="38" cy="17.5" r="1.8" fill="#fef08a"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Jade Ear Flares & Facial Line -->
      <circle cx="15" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
      <circle cx="49" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_maya_jaguar_roar': {
    id: 'reaction_maya_jaguar_roar',
    name: 'Jaguar Roar',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Jaguar Roar expression from the MAYA Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#84cc16" stroke-width="1.8"/>
        
      <!-- Jade Diadem & Quetzal Plumes -->
      <rect x="20" y="14" width="24" height="7" rx="1.5" fill="#15803d" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 26 14 C 24 6, 20 4, 16 3 M 32 14 C 32 5, 32 2, 32 1 M 38 14 C 40 6, 44 4, 48 3" stroke="#65a30d" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="17.5" r="1.8" fill="#fef08a"/>
      <circle cx="32" cy="17.5" r="2" fill="#ef4444"/>
      <circle cx="38" cy="17.5" r="1.8" fill="#fef08a"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#d97706" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Jade Ear Flares & Facial Line -->
      <circle cx="15" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
      <circle cx="49" cy="38" r="2.8" fill="#15803d" stroke="#dfbc73" stroke-width="1.2"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_maya_fury': {
    id: 'reaction_maya_fury',
    name: 'Chaac Wrath',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Chaac Wrath expression from the MAYA Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 15 22 L 30 28" stroke="#18181b" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#18181b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#047857"/>
        <circle cx="40" cy="30" r="2.2" fill="#047857"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#18181b" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#18181b" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#18181b" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#18181b" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#18181b" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_crying': {
    id: 'reaction_maya_crying',
    name: 'Cenote Tears',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Cenote Tears expression from the MAYA Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 19 28 L 30 24" stroke="#18181b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#18181b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#18181b" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#18181b" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#18181b" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#18181b" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_nervous': {
    id: 'reaction_maya_nervous',
    name: 'Nervous Scout',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Nervous Scout expression from the MAYA Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <circle cx="24" cy="28" r="3.2" fill="#18181b"/>
        <circle cx="40" cy="28" r="3.2" fill="#18181b"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#18181b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_deadpan': {
    id: 'reaction_maya_deadpan',
    name: 'Stela Silence',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Stela Silence expression from the MAYA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#18181b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#18181b" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#18181b" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_respect': {
    id: 'reaction_maya_respect',
    name: 'Feather Homage',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Feather Homage expression from the MAYA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#18181b" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#18181b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_salute': {
    id: 'reaction_maya_salute',
    name: 'Spear Salute',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Spear Salute expression from the MAYA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <circle cx="23" cy="28" r="2.8" fill="#18181b"/>
        <circle cx="39" cy="28" r="2.8" fill="#18181b"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#18181b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#18181b" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#18181b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_scheming': {
    id: 'reaction_maya_scheming',
    name: 'Ahau Plot',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Ahau Plot expression from the MAYA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#18181b"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#18181b"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#b45309" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fed7aa" stroke="#18181b" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_mischief': {
    id: 'reaction_maya_mischief',
    name: 'Monkey Grin',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Monkey Grin expression from the MAYA Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#18181b" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#18181b"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#18181b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_yawn': {
    id: 'reaction_maya_yawn',
    name: 'Zenith Yawn',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Zenith Yawn expression from the MAYA Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 20 Q 32 16 46 20" stroke="#b45309" stroke-width="3" fill="none"/>
              <circle cx="14" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
              <circle cx="50" cy="36" r="3.5" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#18181b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#18181b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#18181b" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_cheer': {
    id: 'reaction_maya_cheer',
    name: 'Pyramid Hype',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Pyramid Hype expression from the MAYA Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 18 Q 24 4 32 4 Q 40 4 46 18 Z" fill="#047857" stroke="#b45309" stroke-width="2.2"/>
                <line x1="26" y1="5" x2="18" y2="0" stroke="#991b1b" stroke-width="3" stroke-linecap="round"/>
                <line x1="32" y1="4" x2="32" y2="-2" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>
                <line x1="38" y1="5" x2="46" y2="0" stroke="#991b1b" stroke-width="3" stroke-linecap="round"/>
                <circle cx="14" cy="36" r="3.8" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
                <circle cx="50" cy="36" r="3.8" fill="#b45309" stroke="#047857" stroke-width="1.8"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#18181b" stroke-width="2.8"/>
        
        
        <circle cx="23" cy="25" r="3.2" fill="#18181b"/>
        <circle cx="41" cy="25" r="3.2" fill="#18181b"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#18181b" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#18181b" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#b45309" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#b45309" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#b45309" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_maya_challenge': {
    id: 'reaction_maya_challenge',
    name: 'Ballcourt Taunt',
    civilization: 'MAYA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.maya01',
    tagline: 'Ballcourt Taunt expression from the MAYA Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#4ade80',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <path d="M 18 20 C 18 13, 46 13, 46 20 Z" fill="#047857" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 22 14 C 18 7, 16 2, 14 0 M 32 12 C 32 5, 32 1, 32 0 M 42 14 C 46 7, 48 2, 50 0" stroke="#84cc16" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="16" r="3" fill="#eab308"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#c99a68" stroke="#1e293b" stroke-width="2.8"/>
        
      <circle cx="21" cy="44" r="1.8" fill="#047857"/>
      <circle cx="43" cy="44" r="1.8" fill="#047857"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#c99a68" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Macuahuitl Blade Edge -->
      <polygon points="50,27 61,13 63,15 52,30" fill="#1e293b" stroke="#84cc16" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },

  // ============================================================
  // LAKOTA MASTERWORK EXPRESSIONS (20/20 COMPLETE)
  // ============================================================
  'reaction_lakota_rider_laugh': {
    id: 'reaction_lakota_rider_laugh',
    name: 'Rider Laugh',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Rider Laugh expression from the LAKOTA Masterwork Set.',
    animationType: 'laugh',
    animationCue: 'rx-playing-laugh',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-7 32 32) translate(0, -2)">
        
      <!-- Eagle Feather & Headband -->
      <rect x="18" y="15" width="28" height="6" rx="1" fill="#ea580c" stroke="#dfbc73" stroke-width="1.8"/>
      <!-- Upright Eagle Feather -->
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Face: Extended dropped jaw for hearty laugh -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 47 38, 42 58, 32 60 C 22 58, 17 38, 18 23 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 26 C 20 38, 24 53, 32 57 C 40 53, 44 38, 44 26" fill="none" stroke="#9a3412" stroke-width="2"/>
        
      <!-- Ceremonial Paint Stripe & Long Braids -->
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- Eyes: Laughing crescents compressed tight -->
        <path d="M 21 28 Q 26 23 31 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 28 Q 38 23 43 28" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Wide open laughing mouth cavity extending into jaw -->
        <path d="M 20 37 Q 32 57 44 37 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <path d="M 22 37 Q 32 43 42 37" fill="#fef3c7" stroke="#1e293b" stroke-width="1.6"/>
        <!-- Laughing cheeks -->
        <circle cx="16" cy="36" r="3.2" fill="#f97316" opacity="0.45"/>
        <circle cx="48" cy="36" r="3.2" fill="#f97316" opacity="0.45"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_scout_smirk': {
    id: 'reaction_lakota_scout_smirk',
    name: 'Scout Smirk',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Scout Smirk expression from the LAKOTA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(10 32 32)">
        
      <ellipse cx="32" cy="20" rx="16" ry="4" fill="#ea580c" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Asymmetric Neck Entry on Left -->
        <path d="M 14 36 C 12 39, 13 46, 17 48 L 20 42 Z" fill="#bd8658" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Face: Distinct 3/4 Skull Rotation with Left Cheek Compressed & Right Cheek Puffed -->
        <path d="M 21 21 C 21 16, 44 15, 48 20 C 53 26, 53 36, 48 46 C 44 52, 40 58, 37 59 C 27 57, 19 46, 18 36 C 17 28, 20 22, 21 21 Z" fill="#bd8658" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 20 25 C 20 36, 25 48, 37 55" fill="none" stroke="#9d683a" stroke-width="2"/>
        
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- Asymmetric Eyebrows: One cocked high, one furrowed flat -->
        <path d="M 20 23 Q 26 17 31 23" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 35 27 L 45 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Eyes: Smirking gaze -->
        <circle cx="27" cy="27" r="2.8" fill="#1e293b"/>
        <circle cx="41" cy="28" r="2.8" fill="#1e293b"/>
        <!-- Asymmetric smirk curl -->
        <path d="M 25 43 Q 34 46 46 35" stroke="#1e293b" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M 45 35 Q 48 33 47 38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_chief_nod': {
    id: 'reaction_lakota_chief_nod',
    name: 'Council Nod',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Council Nod expression from the LAKOTA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M 36 18 Q 46 3 50 1 Q 42 10 38 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
                <path d="M 40 19 Q 52 5 56 3 Q 48 12 42 19" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
                <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
                <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 20 28 Q 25 31 30 28" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 31 44 28" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="30" r="2.6" fill="#1c1917"/>
        <circle cx="39" cy="30" r="2.6" fill="#1c1917"/>
        <path d="M 25 41 Q 32 45 39 41" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_hunter_side_eye': {
    id: 'reaction_lakota_hunter_side_eye',
    name: 'Prairie Side-Eye',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Prairie Side-Eye expression from the LAKOTA Masterwork Set.',
    animationType: 'side-eye',
    animationCue: 'rx-playing-side-eye',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-10 32 32) translate(-2, 1)">
        
      <ellipse cx="32" cy="20" rx="16" ry="4" fill="#ea580c" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Face: Distinct Profile Shift with Protruding Nose on Left & Narrow Right Jaw -->
        <path d="M 22 20 C 26 15, 46 16, 47 21 C 48 29, 44 42, 40 48 C 34 56, 28 58, 25 58 C 19 56, 17 48, 16 42 L 12 34 C 11 31, 13 28, 16 26 C 16 23, 19 21, 22 20 Z" fill="#bd8658" stroke="#1e293b" stroke-width="2.8"/>
        <path d="M 21 25 C 21 35, 23 48, 25 55" fill="none" stroke="#9d683a" stroke-width="2"/>
        
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- Sidelong suspicious brow -->
        <path d="M 17 24 L 28 25" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 25 L 43 23" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Displaced eyes shifted hard to left edge -->
        <ellipse cx="22" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <ellipse cx="36" cy="29" rx="4.5" ry="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
        <circle cx="19.5" cy="29" r="2.2" fill="#1e293b"/>
        <circle cx="33.5" cy="29" r="2.2" fill="#1e293b"/>
        <!-- Sidelong compressed mouth -->
        <path d="M 23 44 Q 28 46 35 43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_too_easy': {
    id: 'reaction_lakota_too_easy',
    name: 'Too Easy Rider',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Too Easy Rider expression from the LAKOTA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 20 28 Q 25 32 30 28" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 28 Q 39 32 44 28" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 23 40 Q 32 46 41 40" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 12 50 Q 18 42 22 46" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 52 50 Q 46 42 42 46" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_slow_clap': {
    id: 'reaction_lakota_slow_clap',
    name: 'Council Clap',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Council Clap expression from the LAKOTA Masterwork Set.',
    animationType: 'clap',
    animationCue: 'rx-playing-clap',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Eagle Feather & Headband -->
      <rect x="18" y="15" width="28" height="6" rx="1" fill="#ea580c" stroke="#dfbc73" stroke-width="1.8"/>
      <!-- Upright Eagle Feather -->
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Standard noble head -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 46 36, 42 49, 32 51 C 22 49, 18 36, 18 22 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Ceremonial Paint Stripe & Long Braids -->
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <path d="M 21 25 L 29 26" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <path d="M 35 26 L 43 25" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="29" r="2.5" fill="#1e293b"/>
        <circle cx="39" cy="29" r="2.5" fill="#1e293b"/>
        <path d="M 26 40 Q 32 44 38 40" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- VISIBLE HANDS BELOW CHIN (Extending outside face silhouette) -->
        <!-- Left Palm -->
        <path d="M 15 54 C 15 48, 22 46, 26 48 L 30 56 L 23 62 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Right Palm clapping against left -->
        <path d="M 49 54 C 49 48, 42 46, 38 48 L 34 56 L 41 62 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.2"/>
        <!-- Acoustic Clap Motion Rays -->
        <line x1="32" y1="46" x2="32" y2="42" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="47" x2="25" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
        <line x1="36" y1="47" x2="39" y2="44" stroke="#dfbc73" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_facepalm': {
    id: 'reaction_lakota_facepalm',
    name: 'Trail Facepalm',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Trail Facepalm expression from the LAKOTA Masterwork Set.',
    animationType: 'facepalm',
    animationCue: 'rx-playing-facepalm',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-6 32 32)">
        
      <!-- Eagle Feather & Headband -->
      <rect x="18" y="15" width="28" height="6" rx="1" fill="#ea580c" stroke="#dfbc73" stroke-width="1.8"/>
      <!-- Upright Eagle Feather -->
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Face base -->
        <path d="M 18 23 C 18 19, 46 19, 46 23 C 46 38, 42 52, 32 54 C 22 52, 18 38, 18 23 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Ceremonial Paint Stripe & Long Braids -->
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- Free eye (pained squint) -->
        <path d="M 36 29 Q 41 33 44 28" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 28 44 Q 35 42 42 45" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

        <!-- BIG ASYMMETRICAL HAND COVERING FOREHEAD & EYE (35% of face) -->
        <path d="M 12 40 C 10 30, 14 20, 22 17 L 34 17 C 36 22, 34 32, 26 38 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.4"/>
        <!-- Fingers across face -->
        <line x1="20" y1="18" x2="22" y2="34" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="17" x2="27" y2="35" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="18" x2="31" y2="33" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="33" y1="20" x2="34" y2="30" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Sweat drop of exasperation -->
        <path d="M 48 24 Q 50 28 48 30 Q 46 28 48 24 Z" fill="#38bdf8"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_shock': {
    id: 'reaction_lakota_shock',
    name: 'Thunder Shock',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Thunder Shock expression from the LAKOTA Masterwork Set.',
    animationType: 'shock',
    animationCue: 'rx-playing-shock',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g>
        
      <!-- Eagle Feather & Headband -->
      <rect x="18" y="15" width="28" height="6" rx="1" fill="#ea580c" stroke="#dfbc73" stroke-width="1.8"/>
      <!-- Upright Eagle Feather -->
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Face: Retracted chin, startled oval -->
        <path d="M 18 22 C 18 18, 46 18, 46 22 C 47 38, 43 55, 32 58 C 21 55, 17 38, 18 22 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Ceremonial Paint Stripe & Long Braids -->
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- High Arched Eyebrows -->
        <path d="M 18 20 Q 25 14 31 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <path d="M 33 20 Q 39 14 46 20" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <!-- Huge Startled Eyes with Pinpoint Pupils -->
        <ellipse cx="25" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <ellipse cx="39" cy="27" rx="5" ry="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
        <circle cx="25" cy="27" r="1.8" fill="#1e293b"/>
        <circle cx="39" cy="27" r="1.8" fill="#1e293b"/>
        <!-- Large O-Mouth Cavity -->
        <ellipse cx="32" cy="46" rx="6.5" ry="8.5" fill="#200a0a" stroke="#1e293b" stroke-width="2.6"/>
        <ellipse cx="32" cy="42" rx="4.5" ry="2" fill="#fef3c7"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_warrior_roar': {
    id: 'reaction_lakota_warrior_roar',
    name: 'Plains Cry',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Plains Cry expression from the LAKOTA Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 1)">
        <!-- WIDE AGGRESSIVE COLLAR/SHOULDER SILHOUETTE AT BASE -->
        <path d="M 4 63 Q 32 49 60 63 L 64 64 L 0 64 Z" fill="#1e293b" stroke="#f97316" stroke-width="1.8"/>
        
      <!-- Eagle Feather & Headband -->
      <rect x="18" y="15" width="28" height="6" rx="1" fill="#ea580c" stroke="#dfbc73" stroke-width="1.8"/>
      <!-- Upright Eagle Feather -->
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Forward aggressive head lean -->
        <path d="M 16 23 C 16 19, 48 19, 48 23 C 49 39, 45 54, 32 56 C 19 54, 15 39, 16 23 Z" fill="#c2410c" stroke="#1e293b" stroke-width="2.8"/>
        
      <!-- Ceremonial Paint Stripe & Long Braids -->
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- Slanted Furious Brows -->
        <path d="M 17 24 L 30 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M 47 24 L 34 29" stroke="#1e293b" stroke-width="4.2" stroke-linecap="round"/>
        <!-- Furious squinting eyes -->
        <circle cx="25" cy="31" r="2.6" fill="#ef4444"/>
        <circle cx="39" cy="31" r="2.6" fill="#ef4444"/>
        <!-- Wide open horizontal roar mouth with teeth -->
        <path d="M 18 39 L 46 39 Q 32 55 18 39 Z" fill="#450a0a" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Teeth row -->
        <path d="M 21 39 L 23 43 L 25 39 L 27 43 L 29 39 L 31 43 L 33 39 L 35 43 L 37 39 L 39 43 L 41 39 L 43 43" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M 23 50 Q 32 53 41 50" stroke="#fef3c7" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`,
  },
  'reaction_lakota_fury': {
    id: 'reaction_lakota_fury',
    name: 'Bison Fury',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Bison Fury expression from the LAKOTA Masterwork Set.',
    animationType: 'rage',
    animationCue: 'rx-playing-rage',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 15 22 L 30 28" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 49 22 L 34 28" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="30" r="2.2" fill="#9a3412"/>
        <circle cx="40" cy="30" r="2.2" fill="#9a3412"/>
        <!-- Gritted Bared Teeth Grid -->
        <rect x="20" y="38" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#1c1917" stroke-width="2.6"/>
        <line x1="26" y1="38" x2="26" y2="47" stroke="#1c1917" stroke-width="2"/>
        <line x1="32" y1="38" x2="32" y2="47" stroke="#1c1917" stroke-width="2"/>
        <line x1="38" y1="38" x2="38" y2="47" stroke="#1c1917" stroke-width="2"/>
        <line x1="20" y1="42.5" x2="44" y2="42.5" stroke="#1c1917" stroke-width="2"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_crying': {
    id: 'reaction_lakota_crying',
    name: 'Winter Tears',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Winter Tears expression from the LAKOTA Masterwork Set.',
    animationType: 'cry',
    animationCue: 'rx-playing-cry',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 19 28 L 30 24" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 45 28 L 34 24" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 21 29 Q 26 27 30 29" stroke="#1c1917" stroke-width="2.2" fill="none"/>
        <path d="M 34 29 Q 38 27 43 29" stroke="#1c1917" stroke-width="2.2" fill="none"/>
        <path d="M 23 44 Q 32 38 41 44" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Descending Teardrops -->
        <path d="M 21 33 C 19 39, 27 39, 25 33 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="1.6"/>
        <path d="M 39 33 C 37 39, 45 39, 43 33 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="1.6"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_nervous': {
    id: 'reaction_lakota_nervous',
    name: 'Scout Sweat',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Scout Sweat expression from the LAKOTA Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <circle cx="24" cy="28" r="3.2" fill="#1c1917"/>
        <circle cx="40" cy="28" r="3.2" fill="#1c1917"/>
        <path d="M 23 43 Q 28 39 32 44 Q 36 39 41 43" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Giant sweat drop on temple -->
        <path d="M 48 16 C 44 24, 54 24, 50 16 Z" fill="#38bdf8" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_deadpan': {
    id: 'reaction_lakota_deadpan',
    name: 'Granite Resolve',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Granite Resolve expression from the LAKOTA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <line x1="18" y1="28" x2="30" y2="28" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="34" y1="28" x2="46" y2="28" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="42" y2="42" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_respect': {
    id: 'reaction_lakota_respect',
    name: 'Hand to Heart',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Hand to Heart expression from the LAKOTA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-4 32 32)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 26 C 18 22, 46 22, 46 26 C 46 41, 41 52, 32 54 C 23 52, 18 41, 18 26 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 20 29 Q 26 32 31 29" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 33 29 Q 38 32 44 29" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 25 39 Q 32 43 39 39" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <!-- Prominent Hand placed over chest / heart -->
        <path d="M 19 44 Q 32 40 43 45 L 39 55 Q 28 52 17 51 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="25" y1="46" x2="35" y2="49" stroke="#1c1917" stroke-width="1.8"/>
        <line x1="23" y1="49" x2="33" y2="52" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_salute': {
    id: 'reaction_lakota_salute',
    name: 'Feather Salute',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Feather Salute expression from the LAKOTA Masterwork Set.',
    animationType: 'nod',
    animationCue: 'rx-playing-nod',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(5 32 32)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <circle cx="23" cy="28" r="2.8" fill="#1c1917"/>
        <circle cx="39" cy="28" r="2.8" fill="#1c1917"/>
        <line x1="24" y1="41" x2="38" y2="41" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Hand touching brow / headgear brim in salute -->
        <path d="M 37 17 L 57 15 L 55 26 L 41 26 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="43" y1="20" x2="53" y2="19" stroke="#1c1917" stroke-width="1.8"/>
        <line x1="42" y1="23" x2="52" y2="22" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_scheming': {
    id: 'reaction_lakota_scheming',
    name: 'Coyote Scheme',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Coyote Scheme expression from the LAKOTA Masterwork Set.',
    animationType: 'smug',
    animationCue: 'rx-playing-smug',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, -2)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 19 22 Q 25 18 30 23" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 34 26 L 45 24" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="28" cy="28" rx="2.8" ry="2.4" fill="#1c1917"/>
        <ellipse cx="43" cy="28" rx="2.8" ry="2.4" fill="#1c1917"/>
        <path d="M 24 39 Q 34 44 44 36" stroke="#1c1917" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <!-- Steepled Fingers Touching beneath Chin -->
        <path d="M 23 56 L 32 44 L 41 56" stroke="#0284c7" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="32" cy="44" r="2.8" fill="#fed7aa" stroke="#1c1917" stroke-width="1.8"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_mischief': {
    id: 'reaction_lakota_mischief',
    name: 'Prairie Wink',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Prairie Wink expression from the LAKOTA Masterwork Set.',
    animationType: 'mock',
    animationCue: 'rx-playing-mock',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="translate(0, 3)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 19 23 C 18 19, 47 19, 47 23 C 47 39, 43 51, 33 53 C 23 51, 19 39, 19 23 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <line x1="19" y1="27" x2="29" y2="27" stroke="#1c1917" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="39" cy="27" r="3.8" fill="#1c1917"/>
        <circle cx="39" cy="25" r="1.3" fill="#ffffff"/>
        <path d="M 22 40 Q 30 46 45 34" stroke="#1c1917" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_yawn': {
    id: 'reaction_lakota_yawn',
    name: 'Campfire Yawn',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'rare',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Campfire Yawn expression from the LAKOTA Masterwork Set.',
    animationType: 'yawn',
    animationCue: 'rx-playing-yawn',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(-3 32 32) translate(-1, 1)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M 38 18 Q 48 4 52 2 Q 44 10 40 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
              <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
              <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <path d="M 20 27 Q 25 31 30 27" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 34 27 Q 39 31 44 27" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="43" rx="8.5" ry="10.5" fill="#1c0709" stroke="#1c1917" stroke-width="2.8"/>
        <!-- Hand covering yawn slightly -->
        <path d="M 36 39 Q 49 37 47 50 Q 38 52 36 45 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.4"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_cheer': {
    id: 'reaction_lakota_cheer',
    name: 'Sun Dance Hype',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'legendary',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Sun Dance Hype expression from the LAKOTA Masterwork Set.',
    animationType: 'cheer',
    animationCue: 'rx-playing-cheer',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32) translate(1, -1)">
        <path d="M 18 22 Q 32 17 46 22" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M 36 18 Q 46 3 50 1 Q 42 10 38 18" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
                <path d="M 40 19 Q 52 5 56 3 Q 48 12 42 19" fill="#f8fafc" stroke="#9a3412" stroke-width="1.8"/>
                <line x1="14" y1="24" x2="12" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
                <line x1="50" y1="24" x2="52" y2="46" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
        <path d="M 18 24 C 18 20, 46 20, 46 24 C 46 40, 42 52, 32 54 C 22 52, 18 40, 18 24 Z" fill="#fed7aa" stroke="#1c1917" stroke-width="2.8"/>
        <line x1="16" y1="34" x2="26" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
                  <line x1="38" y1="34" x2="48" y2="34" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/>
        
        <circle cx="23" cy="25" r="3.2" fill="#1c1917"/>
        <circle cx="41" cy="25" r="3.2" fill="#1c1917"/>
        <path d="M 19 35 Q 32 54 45 35 Z" fill="#450a0a" stroke="#1c1917" stroke-width="2.8"/>
        <path d="M 21 35 Q 32 41 43 35" fill="#ffffff" stroke="#1c1917" stroke-width="1.8"/>
        <!-- Triumphant Radiance Rays -->
        <line x1="11" y1="11" x2="7" y2="7" stroke="#0284c7" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="53" y1="11" x2="57" y2="7" stroke="#0284c7" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="32" y1="3" x2="32" y2="-1" stroke="#0284c7" stroke-width="2.6" stroke-linecap="round"/>
      
      </g>
    </svg>`,
  },
  'reaction_lakota_challenge': {
    id: 'reaction_lakota_challenge',
    name: 'Count Coup',
    civilization: 'LAKOTA',
    category: 'social_expression',
    isFree: false,
    isFaceExpression: true,
    rarity: 'epic',
    entitlementSku: 'dominion.reactions.lakota01',
    tagline: 'Count Coup expression from the LAKOTA Masterwork Set.',
    animationType: 'challenge',
    animationCue: 'rx-playing-challenge',
    accentColor: '#f97316',
    visualMetrics: { opticalScale: 1.0, offsetX: 0, offsetY: 0, wheelScale: 1.0, collectionScale: 1.0 },
    svgIcon: `<svg viewBox="0 0 64 64" width="64" height="64" class="sov-reaction-svg">
      <g transform="rotate(4 32 32)">
        
      <ellipse cx="32" cy="20" rx="16" ry="4" fill="#ea580c" stroke="#dfbc73" stroke-width="2"/>
      <path d="M 32 15 C 30 7, 31 2, 33 1 C 35 2, 36 7, 34 15 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <polygon points="32,1 34,1 34,5 32,5" fill="#1e293b"/>
      <line x1="33" y1="5" x2="33" y2="15" stroke="#ea580c" stroke-width="1"/>
    
        <!-- Face base with challenge tilt -->
        <path d="M 16 23 C 16 19, 44 19, 44 23 C 44 38, 40 53, 30 55 C 20 53, 16 38, 16 23 Z" fill="#bd8658" stroke="#1e293b" stroke-width="2.8"/>
        
      <line x1="22" y1="36" x2="42" y2="36" stroke="#dc2626" stroke-width="2.2" opacity="0.8"/>
      <path d="M 16 32 L 15 52 M 48 32 L 49 52" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    
        <!-- Cocky smirk eyes -->
        <path d="M 18 25 L 27 27" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M 32 24 Q 38 20 43 24" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>
        <circle cx="23" cy="30" r="2.4" fill="#1e293b"/>
        <circle cx="38" cy="27" r="2.8" fill="#1e293b"/>
        <!-- Taunting side smile -->
        <path d="M 22 43 Q 30 45 40 38" stroke="#1e293b" stroke-width="3.4" stroke-linecap="round" fill="none"/>

        <!-- MASSIVE EXTERNAL ARM & POINTING CHALLENGE GESTURE (Occupies >25% of silhouette width!) -->
        <path d="M 38 48 C 42 45, 46 45, 50 40 L 56 34 C 60 30, 63 24, 63 16 C 63 12, 59 12, 57 16 L 53 26 L 49 28 L 47 34 L 41 42 Z" fill="#bd8658" stroke="#1e293b" stroke-width="2.6"/>
        <!-- Culture Specific Weapon/Implement Tip -->
        
      <!-- Coup Stick / Lance Tip -->
      <polygon points="50,27 63,11 64,13 52,30" fill="#f97316" stroke="#1e293b" stroke-width="1.6"/>
    
      </g>
    </svg>`,
  },
};

export const REACTION_ALIASES: Record<string, string> = {
  // Legacy aliases
  'reaction_salute': 'reaction_smile',
  'reaction_attack': 'ping_attack',
  'reaction_defense': 'ping_defend',

  // HAN Legacy
  'reaction_han_strategist_smile': 'reaction_han_strategist_smirk',
  'reaction_han_general_fury': 'reaction_han_general_roar',
  'reaction_han_emperor_approval': 'reaction_han_son_nod',

  // YAMATO Legacy
  'reaction_yamato_shogun_iron': 'reaction_yamato_deadpan',
  'reaction_yamato_samurai_bow': 'reaction_yamato_respect',
  'reaction_yamato_ronin_grin': 'reaction_yamato_ronin_smirk',

  // NORSE Legacy
  'reaction_norse_berserker_roar': 'reaction_norse_berserker_roar',
  'reaction_norse_jarl_smirk': 'reaction_norse_skald_smirk',
  'reaction_norse_valkyrie_tear': 'reaction_norse_crying',

  // MISIR Legacy
  'reaction_misir_pharaoh_eternal': 'reaction_misir_pharaoh_laugh',
  'reaction_misir_anubis_snarl': 'reaction_misir_warrior_roar',
  'reaction_misir_priest_awe': 'reaction_misir_shock',

  // MAYA Legacy
  'reaction_maya_jaguar_strike': 'reaction_maya_jaguar_roar',
  'reaction_maya_kukulcan_wisdom': 'reaction_maya_sun_nod',
  'reaction_maya_halach_command': 'reaction_maya_king_laugh',

  // LAKOTA Legacy
  'reaction_lakota_warrior_stand': 'reaction_lakota_warrior_roar',
  'reaction_lakota_chief_wisdom': 'reaction_lakota_chief_nod',
  'reaction_lakota_scout_vigil': 'reaction_lakota_scout_smirk',
};

export function getReaction(id?: string | null): SovereignReaction | undefined {
  if (!id) return undefined;
  if (SOVEREIGN_REACTIONS[id]) return SOVEREIGN_REACTIONS[id];
  if (REACTION_ALIASES[id] && SOVEREIGN_REACTIONS[REACTION_ALIASES[id]]) {
    return SOVEREIGN_REACTIONS[REACTION_ALIASES[id]];
  }
  const rxKey = id.replace(/^reaction_/, 'rx_');
  if (SOVEREIGN_REACTIONS[rxKey]) return SOVEREIGN_REACTIONS[rxKey];
  const revKey = id.replace(/^rx_/, 'reaction_');
  if (SOVEREIGN_REACTIONS[revKey]) return SOVEREIGN_REACTIONS[revKey];
  if (id === 'reaction_salute') return SOVEREIGN_REACTIONS['reaction_smile'];
  if (id === 'reaction_attack') return SOVEREIGN_REACTIONS['ping_attack'];
  if (id === 'reaction_defense') return SOVEREIGN_REACTIONS['ping_defend'];
  return undefined;
}

export function getAllReactions(): SovereignReaction[] {
  return Object.values(SOVEREIGN_REACTIONS);
}

export function getReactionsByCivilization(civ: string): SovereignReaction[] {
  const norm = (s: string) => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = norm(civ);
  return Object.values(SOVEREIGN_REACTIONS).filter(r => 
    r.civilization.toUpperCase() === civ.toUpperCase() || norm(r.civilization) === target
  );
}

export const getReactionsForCivilization = getReactionsByCivilization;

export function getFreeReactions(): SovereignReaction[] {
  return Object.values(SOVEREIGN_REACTIONS).filter(r => r.isFree);
}

export const COMMAND_PING_IDS = [
  'ping_attack',
  'ping_defend',
  'ping_danger',
  'ping_look',
] as const;

export function getAllCommandPings(): SovereignReaction[] {
  return COMMAND_PING_IDS.map(id => SOVEREIGN_REACTIONS[id]).filter((r): r is SovereignReaction => Boolean(r));
}

export function getAllSocialExpressions(): SovereignReaction[] {
  return Object.values(SOVEREIGN_REACTIONS).filter(r => r.category === 'social_expression');
}

if (typeof window !== 'undefined') {
  (window as any).__SOVEREIGN_REACTIONS__ = SOVEREIGN_REACTIONS;
  (window as any).__REACTION_REGISTRY__ = {
    getReaction,
    getAllReactions,
    getReactionsByCivilization,
    getFreeReactions,
    getAllSocialExpressions,
  };
}
