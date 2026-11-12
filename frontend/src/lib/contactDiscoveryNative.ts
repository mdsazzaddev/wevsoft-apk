/**
 * Native Contact Discovery bridge (Capacitor Android).
 * Web: Contact Picker / paste only — never pretends native Contacts exist.
 * Android: @capacitor-community/contacts + App resume due-check for best-effort sync.
 */
import { Capacitor } from '@capacitor/core';

export const CONTACT_SYNC_DUE_MS = 24 * 60 * 60 * 1000;
export const CONTACT_LAST_NATIVE_SYNC_KEY = 'wev_contact_discovery_last_native_sync';
export const CONTACT_SYNC_ENABLED_LOCAL_KEY = 'wev_contact_discovery_sync_enabled';

export type ContactPhoneSource = 'native' | 'picker' | 'paste' | 'none';

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function isContactPickerSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as any).contacts?.select === 'function';
}

/** Read phones via Capacitor Contacts (Android). Returns [] when unavailable / denied. */
export async function readNativeContactPhones(limit = 500): Promise<{
  phones: string[];
  source: ContactPhoneSource;
  permission: 'granted' | 'denied' | 'prompt' | 'unavailable';
}> {
  if (!isNativeAndroid()) {
    return { phones: [], source: 'none', permission: 'unavailable' };
  }
  try {
    const { Contacts } = await import('@capacitor-community/contacts');
    const perm = await Contacts.requestPermissions();
    const contactsState = (perm as any)?.contacts || (perm as any)?.readContacts || 'denied';
    if (contactsState !== 'granted' && contactsState !== 'limited') {
      return { phones: [], source: 'native', permission: 'denied' };
    }
    const result = await Contacts.getContacts({
      projection: {
        name: false,
        phones: true,
        emails: false,
        image: false,
      },
    });
    const phones: string[] = [];
    for (const c of result.contacts || []) {
      for (const p of c.phones || []) {
        const n = typeof p.number === 'string' ? p.number.trim() : '';
        if (n) phones.push(n);
        if (phones.length >= limit) break;
      }
      if (phones.length >= limit) break;
    }
    return { phones, source: 'native', permission: 'granted' };
  } catch {
    return { phones: [], source: 'native', permission: 'unavailable' };
  }
}

export async function pickWebContactPhones(): Promise<string[]> {
  const nav = navigator as Navigator & {
    contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ tel?: string[] }>> };
  };
  if (!nav.contacts?.select) return [];
  const contacts = await nav.contacts.select(['tel'], { multiple: true });
  const phones: string[] = [];
  for (const c of contacts || []) {
    for (const tel of c.tel || []) {
      if (typeof tel === 'string' && tel.trim()) phones.push(tel.trim());
    }
  }
  return phones;
}

export function markNativeSyncDone(at = Date.now()) {
  try {
    localStorage.setItem(CONTACT_LAST_NATIVE_SYNC_KEY, String(at));
  } catch {
    /* ignore */
  }
}

export function isNativeSyncDue(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(CONTACT_LAST_NATIVE_SYNC_KEY);
    if (!raw) return true;
    const last = Number(raw);
    if (!Number.isFinite(last)) return true;
    return now - last >= CONTACT_SYNC_DUE_MS;
  } catch {
    return true;
  }
}

export function setLocalSyncEnabled(enabled: boolean) {
  try {
    localStorage.setItem(CONTACT_SYNC_ENABLED_LOCAL_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function isLocalSyncEnabled(): boolean {
  try {
    return localStorage.getItem(CONTACT_SYNC_ENABLED_LOCAL_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Best-effort periodic sync trigger when the Android app returns to foreground.
 * WorkManager (native) is scheduled separately; this covers resume/due checks without guaranteeing wall-clock timing.
 */
export async function installNativeContactSyncResumeHook(opts: {
  syncEnabled: () => boolean;
  onDueSync: (phones: string[]) => Promise<void>;
}): Promise<() => void> {
  if (!isNativeAndroid()) return () => {};

  const { App } = await import('@capacitor/app');
  const handle = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) return;
    if (!opts.syncEnabled() || !isLocalSyncEnabled()) return;
    if (!isNativeSyncDue()) return;
    void (async () => {
      const { phones, permission } = await readNativeContactPhones();
      if (permission !== 'granted' || !phones.length) return;
      await opts.onDueSync(phones);
      markNativeSyncDone();
    })();
  });

  return () => {
    void handle.remove();
  };
}
