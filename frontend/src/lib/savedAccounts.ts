import { isAdminRole } from '@wevsoft/shared/types/roles';

export type SavedAccount = {
  id: string;
  name: string;
  email?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  theme?: string | null;
  token: string;
  lastUsedAt: number;
};

const STORAGE_KEY = 'wev_saved_accounts';
const MAX_ACCOUNTS = 8;

function readRaw(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const accounts = parsed.filter(
      (item) => item && typeof item.id === 'string' && typeof item.token === 'string',
    );
    const consumer = accounts.filter((item) => !isAdminRole(item.role));
    if (consumer.length !== accounts.length) writeRaw(consumer);
    return consumer;
  } catch {
    return [];
  }
}

function writeRaw(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)));
}

export function getSavedAccounts(): SavedAccount[] {
  return readRaw().sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}

export function upsertSavedAccount(input: {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  theme?: string | null;
  token: string;
}): SavedAccount[] {
  if (isAdminRole(input.role)) return getSavedAccounts();
  if (!input.id || !input.token) return getSavedAccounts();
  const existing = readRaw();
  const previous = existing.find((item) => item.id === input.id);
  const next: SavedAccount = {
    id: input.id,
    name: input.name || previous?.name || 'Account',
    email: input.email ?? previous?.email ?? null,
    username: input.username ?? previous?.username ?? null,
    avatar: input.avatar ?? previous?.avatar ?? null,
    role: input.role ?? previous?.role ?? null,
    theme: input.theme ?? previous?.theme ?? null,
    token: input.token,
    lastUsedAt: Date.now(),
  };
  forgetSignedOutAccount(input.id);
  const accounts = [next, ...existing.filter((item) => item.id !== input.id)];
  writeRaw(accounts);
  return accounts;
}

export function removeSavedAccount(userId: string): SavedAccount[] {
  const accounts = readRaw().filter((item) => item.id !== userId);
  writeRaw(accounts);
  return accounts;
}

export function findSavedAccount(userId: string): SavedAccount | undefined {
  return readRaw().find((item) => item.id === userId);
}

/**
 * Accounts that were used on this device but are signed out. Profile info only
 * (never a token), so they can be listed in account pickers and signed back into.
 */
export type SignedOutAccount = Omit<SavedAccount, 'token' | 'role' | 'theme'>;
const SIGNED_OUT_KEY = 'wev_signed_out_accounts';

function readSignedOut(): SignedOutAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIGNED_OUT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((a) => a && typeof a.id === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberSignedOutAccount(a: SavedAccount | undefined | null) {
  if (!a || isAdminRole(a.role)) return;
  const entry: SignedOutAccount = { id: a.id, name: a.name, email: a.email ?? null, username: a.username ?? null, avatar: a.avatar ?? null, lastUsedAt: Date.now() };
  const list = [entry, ...readSignedOut().filter((x) => x.id !== a.id)].slice(0, MAX_ACCOUNTS);
  localStorage.setItem(SIGNED_OUT_KEY, JSON.stringify(list));
}

export function forgetSignedOutAccount(userId: string) {
  const list = readSignedOut();
  const next = list.filter((x) => x.id !== userId);
  if (next.length !== list.length) localStorage.setItem(SIGNED_OUT_KEY, JSON.stringify(next));
}

/** Signed-out accounts that are not currently signed in on this device. */
export function getSignedOutAccounts(): SignedOutAccount[] {
  const signedIn = new Set(readRaw().map((a) => a.id));
  return readSignedOut().filter((a) => !signedIn.has(a.id)).sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}
