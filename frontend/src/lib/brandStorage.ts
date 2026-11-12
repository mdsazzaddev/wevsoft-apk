/**
 * One-time rename of persisted browser-storage keys from the `sora_` era to
 * `wev_`.
 *
 * Everything the app remembers locally — saved accounts, the device id, muted
 * creators, watch-later, reel preferences, wevchat window geometry and the
 * end-to-end-encryption key material — lived under a `sora_` prefix. The Wevsoft
 * rename would otherwise orphan all of it: users would silently lose saved
 * accounts and, worse, the private keys needed to read their own encrypted
 * messages. So instead of leaving the old keys behind we move them.
 *
 * The rule is a prefix swap rather than a list of names, which means keys with a
 * dynamic suffix (`sora_e2ee_<userId>`, `sora_chat_inline_send_time:<id>`) are
 * carried over too, and nothing can be forgotten by omission.
 *
 * Each key is copied and then removed individually, and the "done" flag is only
 * written at the very end, so an interrupted run simply resumes on the next boot.
 *
 * Imported for its side effect as the first statement of `main.tsx`: module
 * bodies are evaluated in dependency order, so this finishes before any store or
 * component module reads storage at import time.
 */

const DONE_FLAG = 'wev_storage_migrated_v1';
const OLD_PREFIX = 'sora_';
const NEW_PREFIX = 'wev_';

/** Keys that did not follow the prefix convention. */
const EXPLICIT_RENAMES: Record<string, string> = {
  showSoraAssistant: 'showWevAssistant',
};

function migrate(store: Storage) {
  // Snapshot the names first: renaming while iterating a live Storage index
  // would skip entries.
  const names: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key) names.push(key);
  }

  for (const oldKey of names) {
    const newKey = EXPLICIT_RENAMES[oldKey]
      ? EXPLICIT_RENAMES[oldKey]
      : oldKey.startsWith(OLD_PREFIX)
        ? NEW_PREFIX + oldKey.slice(OLD_PREFIX.length)
        : null;
    if (!newKey) continue;

    const value = store.getItem(oldKey);
    if (value === null) continue;
    // Never clobber a newer value — if the new key already exists the user has
    // been on a post-rename build and that value is the current one.
    if (store.getItem(newKey) === null) store.setItem(newKey, value);
    store.removeItem(oldKey);
  }
}

export function migrateBrandedStorageKeys() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(DONE_FLAG) === '1') return;
    migrate(window.localStorage);
    migrate(window.sessionStorage);
    window.localStorage.setItem(DONE_FLAG, '1');
  } catch {
    // Private browsing or a full quota. Nothing is lost — the old keys are still
    // there and the flag is unset, so the next boot tries again.
  }
}

migrateBrandedStorageKeys();
