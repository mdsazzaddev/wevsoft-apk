import assert from 'node:assert/strict';
import {
  HARDCODED_NAV_ICON_DEFAULTS,
  parseNavIconPref,
  parseNavIconStyle,
  parseNavIconStyleDefaults,
  resolveAppearanceTheme,
  resolveNavIconStyle,
} from './nav-icon-style.js';

// parse aliases
assert.equal(parseNavIconStyle('Colorful A'), 'colorful-a');
assert.equal(parseNavIconStyle('Colorful B (Fluent official)'), 'colorful-b');
assert.equal(parseNavIconStyle('Outline'), 'outline');
assert.equal(parseNavIconStyle('lucide'), 'outline');
assert.equal(parseNavIconStyle('nope'), null);
assert.equal(parseNavIconStyle(''), null);
assert.equal(parseNavIconPref('Use default'), 'default');
assert.equal(parseNavIconPref('default'), 'default');
assert.equal(parseNavIconPref('Colorful A'), 'colorful-a');

// admin defaults fill missing / invalid with hardcoded
assert.deepEqual(parseNavIconStyleDefaults(undefined), { ...HARDCODED_NAV_ICON_DEFAULTS });
assert.deepEqual(parseNavIconStyleDefaults({ light: 'colorful-b' }), {
  light: 'colorful-b',
  dark: 'outline',
});
assert.deepEqual(parseNavIconStyleDefaults({ light: 'bogus', dark: 'colorful-a' }), {
  light: 'colorful-a',
  dark: 'colorful-a',
});

// appearance
assert.equal(resolveAppearanceTheme('Light mode'), 'light');
assert.equal(resolveAppearanceTheme('Dark mode'), 'dark');
assert.equal(resolveAppearanceTheme('OLED True Black'), 'dark');
assert.equal(resolveAppearanceTheme('System default', false), 'light');
assert.equal(resolveAppearanceTheme('System default', true), 'dark');

// user > admin > hardcoded, per theme
assert.equal(
  resolveNavIconStyle({ theme: 'light', userLight: 'Use default', userDark: 'Use default' }),
  'colorful-a',
);
assert.equal(
  resolveNavIconStyle({ theme: 'dark', userLight: 'Use default', userDark: 'Use default' }),
  'outline',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'light',
    userLight: 'default',
    adminDefaults: { light: 'colorful-b', dark: 'colorful-a' },
  }),
  'colorful-b',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'dark',
    userDark: 'Use default',
    adminDefaults: { light: 'colorful-b', dark: 'colorful-a' },
  }),
  'colorful-a',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'light',
    userLight: 'Colorful B',
    adminDefaults: { light: 'outline', dark: 'outline' },
  }),
  'colorful-b',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'dark',
    userDark: 'Colorful A',
    adminDefaults: { light: 'colorful-b', dark: 'outline' },
  }),
  'colorful-a',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'light',
    userLight: 'outline',
    adminDefaults: { light: 'colorful-a', dark: 'colorful-a' },
  }),
  'outline',
);
// invalid user value falls through to admin, then hardcoded
assert.equal(
  resolveNavIconStyle({
    theme: 'light',
    userLight: 'not-a-style',
    adminDefaults: { light: 'colorful-b' },
  }),
  'colorful-b',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'dark',
    userDark: '???',
    adminDefaults: { dark: 'nope' },
  }),
  'outline',
);
// missing user + missing admin
assert.equal(resolveNavIconStyle({ theme: 'light' }), 'colorful-a');
assert.equal(resolveNavIconStyle({ theme: 'dark' }), 'outline');
// light user choice must not leak into dark, and vice versa
assert.equal(
  resolveNavIconStyle({
    theme: 'dark',
    userLight: 'Colorful B',
    userDark: 'Use default',
  }),
  'outline',
);
assert.equal(
  resolveNavIconStyle({
    theme: 'light',
    userLight: 'Use default',
    userDark: 'Colorful B',
  }),
  'colorful-a',
);
