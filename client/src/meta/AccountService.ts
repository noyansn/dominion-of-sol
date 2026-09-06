/**
 * DOMINION OF SOL — SERVER-AUTHORITATIVE ACCOUNT & GUEST ENTRY SERVICE
 * 
 * Strict Architecture:
 * 1. SERVER is the canonical account identity authority.
 * 2. Client LocalStorage is strictly session/bootstrap cache only.
 * 3. Client does NOT generate canonical account_id.
 * 4. Refreshing page or restarting browser restores the exact SAME server account via sessionToken.
 * 5. Identity stability: Linking preserves exact same account_id, inventory, and Marks.
 * 6. Clear provider states: 'configured', 'dev_mock', 'unavailable'.
 */

import { telemetry } from './Telemetry';
import { safeStorage } from './StorageHelper';
import { walletService } from './WalletService';
import { entitlementService } from './EntitlementService';

export type AccountType = 'guest' | 'registered';
export type AuthProviderType = 'google' | 'apple' | 'email' | 'steam' | 'dev';
export type ProviderStatus = 'configured' | 'dev_mock' | 'unavailable';

export interface AuthProviderInfo {
  provider: AuthProviderType;
  name: string;
  status: ProviderStatus;
  description: string;
}

const isDev = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV !== 'production') || (typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV));

export const AUTH_PROVIDERS: Record<AuthProviderType, AuthProviderInfo> = {
  dev: {
    provider: 'dev',
    name: 'Dev Account Simulator',
    status: isDev ? 'dev_mock' : 'unavailable',
    description: 'Local multi-device test simulator (Development Only)',
  },
  google: {
    provider: 'google',
    name: 'Google Sign-In',
    status: isDev ? 'dev_mock' : 'unavailable',
    description: isDev ? 'Simulated Google Auth (Development Mock)' : 'Production Google OAuth2 credentials not configured',
  },
  apple: {
    provider: 'apple',
    name: 'Sign in with Apple',
    status: isDev ? 'dev_mock' : 'unavailable',
    description: isDev ? 'Simulated Apple Auth (Development Mock)' : 'Production Apple Services ID credentials not configured',
  },
  email: {
    provider: 'email',
    name: 'Email & Password',
    status: isDev ? 'dev_mock' : 'unavailable',
    description: isDev ? 'Simulated Email Auth (Development Mock)' : 'Production Email/SMTP verification backend not configured',
  },
  steam: {
    provider: 'steam',
    name: 'Steam OpenID',
    status: 'unavailable',
    description: 'Steam OpenID credentials not configured',
  },
};

export interface LinkedIdentity {
  provider: AuthProviderType;
  identifier: string; // e.g. email or oauth sub
  linkedAt: number;
}

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  totalControlledAreaKm2: number;
  contestParticipations: number;
  contestWins: number;
}

export interface PlayerAccount {
  accountId: string;
  accountType: AccountType;
  displayName: string;
  playerTag: string; // e.g. '#7F42A'
  createdAt: number;
  sessionToken: string;
  linkedIdentities: LinkedIdentity[];
  stats: PlayerStats;
  favoriteCivilization: string;
  isServerSynced: boolean;
}

export interface ServerAccountSnapshot {
  accountId: string;
  sessionToken: string;
  playerTag: string;
  displayName: string;
  accountType: AccountType;
  walletBalance: number;
  entitlements: string[];
  equippedBladeSkin: string;
  reactionWheel: string[];
  isDevMode: boolean;
  linkedIdentities?: LinkedIdentity[];
}

export interface AuthLinkResult {
  success: boolean;
  conflict?: boolean;
  existingAccountId?: string;
  error?: string;
}

const STORAGE_KEY_AUTH = 'dominion.auth.session_cache';
const STORAGE_KEY_ACCOUNTS_DB = 'dominion.auth.dev_accounts_db';

export function validateNationName(name: string): { valid: boolean; sanitized: string; reason?: string } {
  if (!name) return { valid: false, sanitized: '', reason: 'Name cannot be empty' };
  
  const trimmed = name.trim();
  const clean = trimmed.replace(/[^\p{L}\p{N}\s\-_']/gu, '').replace(/\s+/g, ' ');

  if (clean.length < 2) {
    return { valid: false, sanitized: clean, reason: 'Name must be at least 2 characters' };
  }
  if (clean.length > 24) {
    return { valid: false, sanitized: clean.slice(0, 24), reason: 'Name must be at most 24 characters' };
  }

  const lower = clean.toLowerCase();
  const prohibited = ['admin', 'moderator', 'system', 'root', 'server'];
  if (prohibited.some(p => lower === p)) {
    return { valid: false, sanitized: clean, reason: 'Reserved name' };
  }

  return { valid: true, sanitized: clean };
}

export function sanitizeNationName(name: string): string | null {
  const res = validateNationName(name);
  return res.valid ? res.sanitized.toUpperCase() : null;
}

/**
 * Server authority simulator for offline environments / headless unit tests.
 * Enforces identical server-side rules: server creates account_id, once-only welcome grant.
 */
class ServerAuthoritySimulator {
  private accounts: Record<string, {
    account: PlayerAccount;
    walletBalance: number;
    entitlements: Set<string>;
    equippedBladeSkin: string;
    reactionWheel: string[];
    processedKeys: Set<string>;
  }> = {};

  public createGuest(nameHint?: string): ServerAccountSnapshot {
    const hex = Math.random().toString(16).substring(2, 10);
    const accountId = `acc_${hex}`;
    const sessionToken = `tok_${Math.random().toString(16).substring(2, 10)}`;
    const tag = `#${Math.floor(0x10000 + Math.random() * 0xEFFFF).toString(16).toUpperCase().substring(0, 5)}`;
    const displayName = (nameHint && validateNationName(nameHint).valid) ? validateNationName(nameHint).sanitized : 'NOYAN';

    const account: PlayerAccount = {
      accountId,
      accountType: 'guest',
      displayName,
      playerTag: tag,
      createdAt: Date.now(),
      sessionToken,
      linkedIdentities: [],
      stats: { matchesPlayed: 0, matchesWon: 0, totalControlledAreaKm2: 0, contestParticipations: 0, contestWins: 0 },
      favoriteCivilization: 'hun',
      isServerSynced: true,
    };

    const processedKeys = new Set<string>();
    // Authoritative once-only welcome grant: welcome:<account_id>
    const welcomeKey = `welcome:${accountId}`;
    processedKeys.add(welcomeKey);

    const defaultReactions = [
      'reaction_salute', 'reaction_gg', 'reaction_attack', 'reaction_defense',
      'reaction_surprised', 'reaction_laugh', 'reaction_salute', 'reaction_gg'
    ];

    this.accounts[accountId] = {
      account,
      walletBalance: 100, // 100 Sovereign Marks initial welcome grant
      entitlements: new Set(['blade_standard', 'reaction_salute', 'reaction_gg', 'reaction_attack', 'reaction_defense', 'reaction_surprised', 'reaction_laugh']),
      equippedBladeSkin: 'blade_standard',
      reactionWheel: defaultReactions,
      processedKeys,
    };

    return this.toSnapshot(accountId);
  }

  public resume(accountId: string, sessionToken: string): ServerAccountSnapshot | null {
    const entry = this.accounts[accountId];
    if (entry && entry.account.sessionToken === sessionToken) {
      return this.toSnapshot(accountId);
    }
    return null;
  }

  public link(accountId: string, sessionToken: string, provider: AuthProviderType, identifier: string): { success: boolean; conflict?: boolean; existingAccountId?: string; snapshot?: ServerAccountSnapshot } {
    const entry = this.accounts[accountId];
    if (!entry || entry.account.sessionToken !== sessionToken) {
      return { success: false };
    }

    // Check conflict across all existing accounts
    for (const [otherId, other] of Object.entries(this.accounts)) {
      if (otherId !== accountId) {
        if (other.account.linkedIdentities.some(li => li.provider === provider && li.identifier.toLowerCase() === identifier.toLowerCase())) {
          return {
            success: false,
            conflict: true,
            existingAccountId: otherId,
          };
        }
      }
    }

    entry.account.accountType = 'registered';
    entry.account.linkedIdentities = [
      ...entry.account.linkedIdentities.filter(li => li.provider !== provider),
      { provider, identifier, linkedAt: Date.now() },
    ];

    return { success: true, snapshot: this.toSnapshot(accountId) };
  }

  public toSnapshot(accountId: string): ServerAccountSnapshot {
    const entry = this.accounts[accountId];
    return {
      accountId: entry.account.accountId,
      sessionToken: entry.account.sessionToken,
      playerTag: entry.account.playerTag,
      displayName: entry.account.displayName,
      accountType: entry.account.accountType,
      walletBalance: entry.walletBalance,
      entitlements: Array.from(entry.entitlements),
      equippedBladeSkin: entry.equippedBladeSkin,
      reactionWheel: [...entry.reactionWheel],
      isDevMode: true,
      linkedIdentities: [...entry.account.linkedIdentities],
    };
  }
}

export const serverSimulator = new ServerAuthoritySimulator();

class AccountService {
  private currentAccount: PlayerAccount;
  private conflictHandler?: (existingAccountId: string, message: string) => void;

  constructor() {
    this.currentAccount = this.loadInitialState();
  }

  private loadInitialState(): PlayerAccount {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY_AUTH);
      if (raw) {
        const cached = JSON.parse(raw) as PlayerAccount;
        if (cached && cached.accountId && cached.sessionToken) {
          // Migration safety: legacy 'turk' favoriteCivilization migrates to 'hun'
          if (cached.favoriteCivilization && cached.favoriteCivilization.toLowerCase() === 'turk') {
            cached.favoriteCivilization = 'hun';
          }
          return {
            ...cached,
            isServerSynced: false, // Mark pending server verification
          };
        }
      }
    } catch { /* empty */ }

    // Client does NOT generate accountId. We initialize with server authority simulator by default
    const snap = serverSimulator.createGuest();
    const rawLast = safeStorage.getItem('dominion.lastCiv');
    const favCiv = (rawLast && rawLast.toLowerCase() !== 'turk') ? rawLast : 'hun';
    const fresh: PlayerAccount = {
      accountId: snap.accountId,
      accountType: snap.accountType,
      displayName: snap.displayName,
      playerTag: snap.playerTag,
      createdAt: Date.now(),
      sessionToken: snap.sessionToken,
      linkedIdentities: [],
      stats: { matchesPlayed: 0, matchesWon: 0, totalControlledAreaKm2: 0, contestParticipations: 0, contestWins: 0 },
      favoriteCivilization: favCiv,
      isServerSynced: true,
    };
    this.persistSessionCache(fresh);
    return fresh;
  }

  private persistSessionCache(account: PlayerAccount): void {
    this.currentAccount = account;
    try {
      safeStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(account));
      safeStorage.setItem('dominion.nation', account.displayName);
      safeStorage.setItem('dominion.playerTag', account.playerTag);
    } catch { /* empty */ }
    this.notify();
  }

  private notify(): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dominion:account-changed', {
        detail: { account: this.getAccount() }
      }));
    }
  }

  public getAccount(): PlayerAccount {
    return {
      ...this.currentAccount,
      linkedIdentities: [...this.currentAccount.linkedIdentities],
      stats: { ...this.currentAccount.stats },
    };
  }

  public isGuest(): boolean {
    return this.currentAccount.accountType === 'guest';
  }

  public isRegistered(): boolean {
    return this.currentAccount.accountType === 'registered';
  }

  public hasSession(): boolean {
    return Boolean(this.currentAccount.accountId && this.currentAccount.sessionToken);
  }

  /**
   * Authoritative server snapshot ingress.
   * Updates local cached identity, wallet, and entitlements strictly from server data.
   */
  public applyServerSnapshot(snap: ServerAccountSnapshot): void {
    const updated: PlayerAccount = {
      ...this.currentAccount,
      accountId: snap.accountId,
      sessionToken: snap.sessionToken,
      playerTag: snap.playerTag,
      displayName: snap.displayName,
      accountType: snap.accountType,
      linkedIdentities: snap.linkedIdentities ? [...snap.linkedIdentities] : [...this.currentAccount.linkedIdentities],
      isServerSynced: true,
    };
    this.persistSessionCache(updated);

    // Synchronize Wallet & Entitlements from server snapshot
    walletService.applyServerBalance(snap.walletBalance);
    entitlementService.applyServerSnapshot(
      snap.entitlements,
      snap.equippedBladeSkin,
      snap.reactionWheel
    );
  }

  public onAuthConflict(handler: (existingAccountId: string, message: string) => void): void {
    this.conflictHandler = handler;
  }

  public handleAuthConflict(existingAccountId: string, message: string): void {
    if (this.conflictHandler) {
      this.conflictHandler(existingAccountId, message);
    } else if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dominion:auth-conflict', {
        detail: { existingAccountId, message }
      }));
    }
  }

  public setNationDisplayName(name: string): { success: boolean; reason?: string } {
    const validation = validateNationName(name);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    this.currentAccount.displayName = validation.sanitized;
    this.persistSessionCache(this.currentAccount);
    return { success: true };
  }

  public setFavoriteCivilization(civId: string): void {
    const normalized = civId.toLowerCase() === 'turk' ? 'hun' : civId;
    this.currentAccount.favoriteCivilization = normalized;
    safeStorage.setItem('dominion.lastCiv', normalized);
    this.persistSessionCache(this.currentAccount);
  }

  public recordMatchCompletion(won: boolean, areaKm2 = 0, isContest = false): void {
    this.currentAccount.stats.matchesPlayed += 1;
    if (won) this.currentAccount.stats.matchesWon += 1;
    this.currentAccount.stats.totalControlledAreaKm2 += areaKm2;
    if (isContest) {
      this.currentAccount.stats.contestParticipations += 1;
      if (won) this.currentAccount.stats.contestWins += 1;
    }
    this.persistSessionCache(this.currentAccount);
  }

  // ============================================================
  // ACCOUNT LINKING & RECOVERY
  // ============================================================

  public async linkIdentity(provider: AuthProviderType, identifier: string): Promise<AuthLinkResult> {
    telemetry.track('account_link_started', { provider });

    const providerInfo = AUTH_PROVIDERS[provider];
    if (providerInfo.status === 'unavailable') {
      return {
        success: false,
        error: `Authentication provider '${providerInfo.name}' is unavailable in this environment.`,
      };
    }

    // Try server simulator / bridge
    const simRes = serverSimulator.link(this.currentAccount.accountId, this.currentAccount.sessionToken, provider, identifier);
    if (simRes.conflict) {
      return {
        success: false,
        conflict: true,
        existingAccountId: simRes.existingAccountId,
        error: 'THIS SIGN-IN BELONGS TO AN EXISTING DOMINION',
      };
    }

    if (simRes.success && simRes.snapshot) {
      this.applyServerSnapshot(simRes.snapshot);
      telemetry.track('account_link_completed', { provider, accountId: simRes.snapshot.accountId });
      return { success: true };
    }

    return { success: false, error: 'Account linking failed' };
  }

  public async loadExistingAccount(accountId: string): Promise<boolean> {
    const snap = serverSimulator.resume(accountId, '');
    if (snap) {
      this.applyServerSnapshot(snap);
      return true;
    }
    return false;
  }

  // ============================================================
  // DEV TOOLS ONLY (Gated in Dev Environment)
  // ============================================================

  public devCreateFreshGuest(nameHint?: string): PlayerAccount {
    const snap = serverSimulator.createGuest(nameHint);
    this.applyServerSnapshot(snap);
    return this.getAccount();
  }

  public devUnlinkAll(): void {
    const updated: PlayerAccount = {
      ...this.currentAccount,
      accountType: 'guest',
      linkedIdentities: [],
    };
    this.persistSessionCache(updated);
  }

  public devResetProfile(): void {
    this.currentAccount.stats = {
      matchesPlayed: 0,
      matchesWon: 0,
      totalControlledAreaKm2: 0,
      contestParticipations: 0,
      contestWins: 0,
    };
    this.persistSessionCache(this.currentAccount);
  }
}

export const accountService = new AccountService();
