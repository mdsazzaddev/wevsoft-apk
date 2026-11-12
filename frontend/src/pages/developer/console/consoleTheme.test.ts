import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONSOLE_THEME_LABELS,
  LEGACY_CONSOLE_THEME_KEY,
  consoleRootClasses,
  migrateLegacyConsoleTheme,
  modeFromClassList,
  themeForProfileSync,
} from './consoleTheme';
import { resolveStatusBarMode } from '../../../lib/statusBarTheme';

const cls = (...c: string[]) => ({ contains: (t: string) => c.includes(t) });
const mem = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), removeItem: (k: string) => void m.delete(k), has: (k: string) => m.has(k) };
};

test('modeFromClassList follows html.dark / html.oled', () => {
  assert.equal(modeFromClassList(cls()), 'light');
  assert.equal(modeFromClassList(cls('dark')), 'dark');
  assert.equal(modeFromClassList(cls('dark', 'oled', 'theme-oled')), 'oled');
  assert.equal(modeFromClassList(cls('theme-oled')), 'oled');
  assert.equal(modeFromClassList(null), 'light');
});

test('console root classes: OLED stacks on the dark tokens', () => {
  assert.deepEqual(consoleRootClasses('light'), []);
  assert.deepEqual(consoleRootClasses('dark'), ['dc-dark']);
  assert.deepEqual(consoleRootClasses('oled'), ['dc-dark', 'dc-oled']);
});

test('theme labels round-trip through the global resolver', () => {
  for (const mode of ['light', 'dark', 'oled'] as const) assert.equal(resolveStatusBarMode(CONSOLE_THEME_LABELS[mode], false), mode);
});

test('legacy console key migrates once and never downgrades', () => {
  const a = mem({ [LEGACY_CONSOLE_THEME_KEY]: 'dark' });
  assert.equal(migrateLegacyConsoleTheme(a, 'light'), 'Dark mode');
  assert.equal(a.has(LEGACY_CONSOLE_THEME_KEY), false);
  assert.equal(migrateLegacyConsoleTheme(a, 'light'), null, 'second run is a no-op');
  assert.equal(migrateLegacyConsoleTheme(mem({ [LEGACY_CONSOLE_THEME_KEY]: 'dark' }), 'oled'), null);
  assert.equal(migrateLegacyConsoleTheme(mem({ [LEGACY_CONSOLE_THEME_KEY]: 'light' }), 'dark'), null);
  assert.equal(migrateLegacyConsoleTheme(mem({}), 'light'), null);
});

test('profile re-sync only applies a changed profile theme', () => {
  assert.equal(themeForProfileSync('Dark mode', null), 'Dark mode');
  assert.equal(themeForProfileSync('Dark mode', 'Dark mode'), undefined);
  assert.equal(themeForProfileSync('Light mode', 'Dark mode'), 'Light mode');
  assert.equal(themeForProfileSync('', 'Dark mode'), undefined);
  assert.equal(themeForProfileSync(undefined, null), undefined);
});
