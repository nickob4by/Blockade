/**
 * Converts a username or identifier into a valid email address for Supabase GoTrue.
 * Supabase requires a valid public Top-Level Domain (TLD) and rejects reserved/local domains like .local.
 */
export function normalizeAuthEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  const cleanUsername = trimmed.replace(/[^a-z0-9_.-]/g, '') || 'player';
  return `${cleanUsername}@blockadegame.com`;
}

export interface RememberedAccount {
  username: string;
  displayName: string;
  emoji?: string;
  avatarUrl?: string;
  lastLoginAt: number;
}

export const REMEMBERED_ACCOUNTS_KEY = 'blockade_remembered_accounts';
export const REMEMBERED_ACCOUNT_KEY = 'blockade_remembered_account';

/**
 * Retrieves all remembered accounts stored on this device, ordered with most recent first.
 */
export function getRememberedAccounts(): RememberedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback to legacy single key if present
    const singleRaw = localStorage.getItem(REMEMBERED_ACCOUNT_KEY);
    if (singleRaw) {
      const parsed = JSON.parse(singleRaw);
      if (parsed?.username) {
        return [parsed];
      }
    }
  } catch (err) {
    console.error('Failed to parse remembered accounts:', err);
  }
  return [];
}

/**
 * Returns the most recently logged in account, or null if none saved.
 */
export function getLatestRememberedAccount(): RememberedAccount | null {
  const accounts = getRememberedAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Saves or updates a remembered account in localStorage.
 */
export function saveRememberedAccount(account: RememberedAccount): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRememberedAccounts().filter(
      (a) => a.username.toLowerCase() !== account.username.toLowerCase()
    );
    const updated = [account, ...existing].slice(0, 5);
    localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(updated));
    localStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify(account));
  } catch (err) {
    console.error('Failed to save remembered account:', err);
  }
}

/**
 * Removes a specific account from remembered accounts on this device.
 */
export function removeRememberedAccount(username: string): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = getRememberedAccounts().filter(
      (a) => a.username.toLowerCase() !== username.toLowerCase()
    );
    localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(updated));
    if (updated.length > 0) {
      localStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify(updated[0]));
    } else {
      localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
      localStorage.removeItem(REMEMBERED_ACCOUNTS_KEY);
    }
  } catch (err) {
    console.error('Failed to remove remembered account:', err);
  }
}

