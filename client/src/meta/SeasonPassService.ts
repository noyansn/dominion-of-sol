/**
 * DOMINION OF SOL — SOVEREIGN PASS ARCHITECTURE
 * 
 * Rules:
 * 1. Data-driven and season-based.
 * 2. Rewards are COSMETIC AND META ONLY (Marks, Reactions, Blade Skins, Frames, Titles).
 * 3. NO Population, NO attack bonuses, NO doctrine bonuses.
 * 4. Progression rewards strategic play (matches, area control, contest participation).
 */

import { accountService } from './AccountService';
import { walletService } from './WalletService';
import { entitlementService } from './EntitlementService';
import { telemetry } from './Telemetry';
import { safeStorage } from './StorageHelper';

export interface PassReward {
  type: 'marks' | 'blade' | 'reaction' | 'frame' | 'title';
  id: string;
  displayName: string;
  amount?: number;
  iconSvg?: string;
}

export interface PassTier {
  tierNumber: number;
  freeReward?: PassReward;
  premiumReward?: PassReward;
}

export interface PassMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
}

export interface SeasonPassState {
  seasonId: string;
  currentXp: number;
  isPremium: boolean;
  isPlus: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
}

const XP_PER_TIER = 1000;
const TOTAL_TIERS = 20;

export const SEASON_01_TIERS: PassTier[] = [
  {
    tierNumber: 1,
    freeReward: { type: 'title', id: 'title_pioneer', displayName: 'Title: "Frontier Pioneer"' },
    premiumReward: { type: 'marks', id: 'marks', displayName: '100 Sovereign Marks', amount: 100 },
  },
  {
    tierNumber: 2,
    freeReward: { type: 'marks', id: 'marks', displayName: '50 Sovereign Marks', amount: 50 },
    premiumReward: { type: 'reaction', id: 'reaction_turk_salute', displayName: 'Kilij Salute Reaction' },
  },
  {
    tierNumber: 3,
    freeReward: { type: 'frame', id: 'frame_border', displayName: 'Iron Border Frame' },
    premiumReward: { type: 'marks', id: 'marks', displayName: '150 Sovereign Marks', amount: 150 },
  },
  {
    tierNumber: 4,
    freeReward: { type: 'marks', id: 'marks', displayName: '50 Sovereign Marks', amount: 50 },
    premiumReward: { type: 'reaction', id: 'reaction_roma_triumph', displayName: 'Imperial Laurel Reaction' },
  },
  {
    tierNumber: 5,
    freeReward: { type: 'title', id: 'title_consul', displayName: 'Title: "First Consul"' },
    premiumReward: { type: 'blade', id: 'blade_norse_raven', displayName: 'Raven Forge Blade Skin' },
  },
  {
    tierNumber: 6,
    freeReward: { type: 'marks', id: 'marks', displayName: '75 Sovereign Marks', amount: 75 },
    premiumReward: { type: 'marks', id: 'marks', displayName: '150 Sovereign Marks', amount: 150 },
  },
  {
    tierNumber: 7,
    freeReward: { type: 'reaction', id: 'reaction_pers_court', displayName: 'Isfahan Salute Reaction' },
    premiumReward: { type: 'frame', id: 'frame_sun_halo', displayName: 'Solar Halo Frame' },
  },
  {
    tierNumber: 8,
    freeReward: { type: 'marks', id: 'marks', displayName: '75 Sovereign Marks', amount: 75 },
    premiumReward: { type: 'reaction', id: 'reaction_misir_pyramid', displayName: 'Temple Gate Seal' },
  },
  {
    tierNumber: 9,
    freeReward: { type: 'title', id: 'title_heir', displayName: 'Title: "Realm Heir"' },
    premiumReward: { type: 'marks', id: 'marks', displayName: '200 Sovereign Marks', amount: 200 },
  },
  {
    tierNumber: 10,
    freeReward: { type: 'marks', id: 'marks', displayName: '100 Sovereign Marks', amount: 100 },
    premiumReward: { type: 'blade', id: 'blade_pers_shamshir', displayName: 'Solar Shamshir Blade' },
  },
  {
    tierNumber: 11,
    freeReward: { type: 'reaction', id: 'reaction_han_bow', displayName: 'Court Deference Reaction' },
    premiumReward: { type: 'marks', id: 'marks', displayName: '150 Sovereign Marks', amount: 150 },
  },
  {
    tierNumber: 12,
    freeReward: { type: 'marks', id: 'marks', displayName: '100 Sovereign Marks', amount: 100 },
    premiumReward: { type: 'reaction', id: 'reaction_yamato_bow', displayName: 'Martial Bow Reaction' },
  },
  {
    tierNumber: 13,
    freeReward: { type: 'frame', id: 'frame_gilded_edge', displayName: 'Gilded Edge Frame' },
    premiumReward: { type: 'marks', id: 'marks', displayName: '200 Sovereign Marks', amount: 200 },
  },
  {
    tierNumber: 14,
    freeReward: { type: 'marks', id: 'marks', displayName: '100 Sovereign Marks', amount: 100 },
    premiumReward: { type: 'reaction', id: 'reaction_norse_horn', displayName: 'Horn Toast Reaction' },
  },
  {
    tierNumber: 15,
    freeReward: { type: 'title', id: 'title_tactician', displayName: 'Title: "Master Tactician"' },
    premiumReward: { type: 'blade', id: 'blade_misir_khopesh', displayName: 'Pharaonic Khopesh Skin' },
  },
  {
    tierNumber: 16,
    freeReward: { type: 'marks', id: 'marks', displayName: '125 Sovereign Marks', amount: 125 },
    premiumReward: { type: 'marks', id: 'marks', displayName: '250 Sovereign Marks', amount: 250 },
  },
  {
    tierNumber: 17,
    freeReward: { type: 'reaction', id: 'reaction_maya_sun', displayName: 'Solstice Ray Reaction' },
    premiumReward: { type: 'frame', id: 'frame_sovereign_gold', displayName: 'High Sovereign Gold Frame' },
  },
  {
    tierNumber: 18,
    freeReward: { type: 'marks', id: 'marks', displayName: '150 Sovereign Marks', amount: 150 },
    premiumReward: { type: 'reaction', id: 'reaction_lakota_campfire', displayName: 'Council Smoke Reaction' },
  },
  {
    tierNumber: 19,
    freeReward: { type: 'title', id: 'title_conqueror', displayName: 'Title: "World Conqueror"' },
    premiumReward: { type: 'marks', id: 'marks', displayName: '350 Sovereign Marks', amount: 350 },
  },
  {
    tierNumber: 20,
    freeReward: { type: 'marks', id: 'marks', displayName: '250 Sovereign Marks', amount: 250 },
    premiumReward: { type: 'blade', id: 'blade_turk_imperial', displayName: 'Imperial Crescent Blade' },
  },
];

const INITIAL_PASS_MISSIONS: PassMission[] = [
  { id: 'm1', title: 'Frontier Vanguard', description: 'Participate in 3 World matches.', xpReward: 1500, progress: 1, maxProgress: 3, completed: false },
  { id: 'm2', title: 'Arena of Sol', description: 'Enter a synchronized World Contest championship.', xpReward: 2000, progress: 0, maxProgress: 1, completed: false },
  { id: 'm3', title: 'Sovereign Hegemony', description: 'Control 500,000 km² across all matches.', xpReward: 2500, progress: 142000, maxProgress: 500000, completed: false },
  { id: 'm4', title: 'Triumphal Command', description: 'Secure a decisive victory in any World realm.', xpReward: 2000, progress: 0, maxProgress: 1, completed: false },
];

const STORAGE_KEY_PASS = 'dominion.commerce.pass';

class SeasonPassService {
  private state: SeasonPassState;
  private missions: PassMission[] = [...INITIAL_PASS_MISSIONS];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): SeasonPassState {
    const accountId = accountService.getAccount().accountId;
    try {
      const raw = safeStorage.getItem(`${STORAGE_KEY_PASS}_${accountId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.seasonId === 's01') {
          return parsed;
        }
      }
    } catch { /* empty */ }

    return {
      seasonId: 's01',
      currentXp: 1250, // Starter XP
      isPremium: false,
      isPlus: false,
      claimedFreeTiers: [],
      claimedPremiumTiers: [],
    };
  }

  private saveState(): void {
    const accountId = accountService.getAccount().accountId;
    try {
      safeStorage.setItem(`${STORAGE_KEY_PASS}_${accountId}`, JSON.stringify(this.state));
    } catch { /* empty */ }
    this.notify();
  }

  private notify(): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dominion:pass-changed', {
        detail: { ...this.state }
      }));
    }
  }

  public getState(): SeasonPassState {
    return {
      ...this.state,
      claimedFreeTiers: [...this.state.claimedFreeTiers],
      claimedPremiumTiers: [...this.state.claimedPremiumTiers],
    };
  }

  public getTiers(): PassTier[] {
    return [...SEASON_01_TIERS];
  }

  public getMissions(): PassMission[] {
    return [...this.missions];
  }

  public getCurrentTier(): number {
    return Math.min(TOTAL_TIERS, Math.floor(this.state.currentXp / XP_PER_TIER) + 1);
  }

  public getTierProgressPercent(): number {
    const tier = this.getCurrentTier();
    if (tier >= TOTAL_TIERS) return 100;
    const currentTierXp = this.state.currentXp % XP_PER_TIER;
    return Math.round((currentTierXp / XP_PER_TIER) * 100);
  }

  public addXp(amount: number): void {
    if (amount <= 0) return;
    this.state.currentXp += amount;
    this.saveState();
  }

  public claimReward(tierNumber: number, isPremiumReward: boolean): { success: boolean; reward?: PassReward; reason?: string } {
    const currentTier = this.getCurrentTier();
    if (tierNumber > currentTier) {
      return { success: false, reason: 'Tier not yet reached' };
    }

    const tier = SEASON_01_TIERS.find(t => t.tierNumber === tierNumber);
    if (!tier) return { success: false, reason: 'Invalid tier' };

    if (isPremiumReward) {
      if (!this.state.isPremium) {
        return { success: false, reason: 'Sovereign Pass Premium required' };
      }
      if (this.state.claimedPremiumTiers.includes(tierNumber)) {
        return { success: false, reason: 'Reward already claimed' };
      }
      if (!tier.premiumReward) {
        return { success: false, reason: 'No premium reward on this tier' };
      }

      this.grantRewardItem(tier.premiumReward);
      this.state.claimedPremiumTiers.push(tierNumber);
      this.saveState();
      return { success: true, reward: tier.premiumReward };
    } else {
      if (this.state.claimedFreeTiers.includes(tierNumber)) {
        return { success: false, reason: 'Reward already claimed' };
      }
      if (!tier.freeReward) {
        return { success: false, reason: 'No free reward on this tier' };
      }

      this.grantRewardItem(tier.freeReward);
      this.state.claimedFreeTiers.push(tierNumber);
      this.saveState();
      return { success: true, reward: tier.freeReward };
    }
  }

  private grantRewardItem(reward: PassReward): void {
    if (reward.type === 'marks' && reward.amount) {
      walletService.grantMarks(reward.amount, `pass_reward_tier_${reward.amount}`, `pass_tx_${Date.now()}_${reward.amount}`);
    } else if (reward.type === 'blade') {
      entitlementService.grantEntitlement(reward.id);
    } else if (reward.type === 'reaction') {
      entitlementService.grantEntitlement(reward.id);
    } else if (reward.type === 'frame') {
      entitlementService.grantEntitlement(reward.id);
    } else if (reward.type === 'title') {
      entitlementService.grantEntitlement(reward.id);
    }
  }

  public setPremiumOwned(owned: boolean, isPlus = false): void {
    this.state.isPremium = owned;
    this.state.isPlus = isPlus;
    if (isPlus) {
      // Sovereign Pass Plus grants instant 15 tiers (15,000 XP)
      this.state.currentXp = Math.max(this.state.currentXp, 15000);
    }
    this.saveState();
  }

  // ============================================================
  // DEV COMMERCE CONTROLS (Gated in Dev Environment)
  // ============================================================

  public devSetXp(xp: number): void {
    this.state.currentXp = Math.max(0, xp);
    this.saveState();
  }

  public devJumpTier(tier: number): void {
    const target = Math.max(1, Math.min(TOTAL_TIERS, tier));
    this.state.currentXp = (target - 1) * XP_PER_TIER;
    this.saveState();
  }

  public devResetProgress(): void {
    this.state = {
      seasonId: 's01',
      currentXp: 0,
      isPremium: false,
      isPlus: false,
      claimedFreeTiers: [],
      claimedPremiumTiers: [],
    };
    this.saveState();
  }
}

export const seasonPassService = new SeasonPassService();
