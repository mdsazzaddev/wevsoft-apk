import {
  parseNavIconPref,
  parseNavIconStyleDefaults,
  type NavIconPref,
  type NavIconStyleDefaults,
  type NavIconUserPrefs,
} from '@wevsoft/shared/nav-icon-style';

export const NAV_ICON_USER_LS_KEY = 'wevsoft.navIconStyle.user';
export const NAV_ICON_ADMIN_LS_KEY = 'wevsoft.navIconStyle.admin';

type NavIconStyleState = {
  user: NavIconUserPrefs;
  admin: NavIconStyleDefaults;
};

const listeners = new Set<() => void>();

function readJson(key: string): unknown {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function loadInitial(): NavIconStyleState {
  const userRaw = readJson(NAV_ICON_USER_LS_KEY);
  const adminRaw = readJson(NAV_ICON_ADMIN_LS_KEY);
  return {
    user: {
      light: parseNavIconPref((userRaw as { light?: unknown } | null)?.light) ?? 'default',
      dark: parseNavIconPref((userRaw as { dark?: unknown } | null)?.dark) ?? 'default',
    },
    admin: parseNavIconStyleDefaults(adminRaw),
  };
}

let state: NavIconStyleState = loadInitial();

function emit() {
  writeJson(NAV_ICON_USER_LS_KEY, state.user);
  writeJson(NAV_ICON_ADMIN_LS_KEY, state.admin);
  for (const listener of listeners) listener();
}

export function getNavIconStyleState(): NavIconStyleState {
  return state;
}

export function subscribeNavIconStyleState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrateNavIconUserPrefs(input: { light?: unknown; dark?: unknown }, opts?: { replaceMissing?: boolean }) {
  const replaceMissing = opts?.replaceMissing === true;
  const nextLight =
    input.light !== undefined
      ? parseNavIconPref(input.light) ?? (replaceMissing ? 'default' : state.user.light)
      : replaceMissing
        ? 'default'
        : state.user.light;
  const nextDark =
    input.dark !== undefined
      ? parseNavIconPref(input.dark) ?? (replaceMissing ? 'default' : state.user.dark)
      : replaceMissing
        ? 'default'
        : state.user.dark;
  if (nextLight === state.user.light && nextDark === state.user.dark) return;
  state = { ...state, user: { light: nextLight, dark: nextDark } };
  emit();
}

export function setNavIconUserPref(theme: 'light' | 'dark', raw: unknown) {
  const pref: NavIconPref = parseNavIconPref(raw) ?? 'default';
  if (state.user[theme] === pref) return;
  state = { ...state, user: { ...state.user, [theme]: pref } };
  emit();
}

export function hydrateNavIconAdminDefaults(raw: unknown) {
  const next = parseNavIconStyleDefaults(raw);
  if (next.light === state.admin.light && next.dark === state.admin.dark) return;
  state = { ...state, admin: next };
  emit();
}
