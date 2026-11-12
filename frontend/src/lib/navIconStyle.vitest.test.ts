import { describe, expect, it } from 'vitest';
import {
  HARDCODED_NAV_ICON_DEFAULTS,
  parseNavIconPref,
  parseNavIconStyle,
  parseNavIconStyleDefaults,
  resolveAppearanceTheme,
  resolveNavIconStyle,
} from '@wevsoft/shared/nav-icon-style';

describe('nav icon style preference resolution', () => {
  it('parses labels, ids, and aliases', () => {
    expect(parseNavIconStyle('Colorful A')).toBe('colorful-a');
    expect(parseNavIconStyle('Colorful B (Fluent official)')).toBe('colorful-b');
    expect(parseNavIconStyle('Outline')).toBe('outline');
    expect(parseNavIconStyle('lucide')).toBe('outline');
    expect(parseNavIconStyle('nope')).toBeNull();
    expect(parseNavIconPref('Use default')).toBe('default');
    expect(parseNavIconPref('Colorful A')).toBe('colorful-a');
  });

  it('fills missing or invalid admin defaults with the hardcoded fallback', () => {
    expect(parseNavIconStyleDefaults(undefined)).toEqual({ ...HARDCODED_NAV_ICON_DEFAULTS });
    expect(parseNavIconStyleDefaults({ light: 'colorful-b' })).toEqual({
      light: 'colorful-b',
      dark: 'outline',
    });
    expect(parseNavIconStyleDefaults({ light: 'bogus', dark: 'colorful-a' })).toEqual({
      light: 'colorful-a',
      dark: 'colorful-a',
    });
  });

  it('resolves appearance theme, treating OLED as dark', () => {
    expect(resolveAppearanceTheme('Light mode')).toBe('light');
    expect(resolveAppearanceTheme('Dark mode')).toBe('dark');
    expect(resolveAppearanceTheme('OLED True Black')).toBe('dark');
    expect(resolveAppearanceTheme('System default', false)).toBe('light');
    expect(resolveAppearanceTheme('System default', true)).toBe('dark');
  });

  it('uses hardcoded defaults when the user chose Use default and admin has no override', () => {
    expect(
      resolveNavIconStyle({ theme: 'light', userLight: 'Use default', userDark: 'Use default' }),
    ).toBe('colorful-a');
    expect(
      resolveNavIconStyle({ theme: 'dark', userLight: 'Use default', userDark: 'Use default' }),
    ).toBe('outline');
  });

  it('prefers the admin platform default over hardcoded when the user chose Use default', () => {
    expect(
      resolveNavIconStyle({
        theme: 'light',
        userLight: 'default',
        adminDefaults: { light: 'colorful-b', dark: 'colorful-a' },
      }),
    ).toBe('colorful-b');
    expect(
      resolveNavIconStyle({
        theme: 'dark',
        userDark: 'Use default',
        adminDefaults: { light: 'colorful-b', dark: 'colorful-a' },
      }),
    ).toBe('colorful-a');
  });

  it('prefers the user choice over admin and hardcoded, per theme', () => {
    expect(
      resolveNavIconStyle({
        theme: 'light',
        userLight: 'Colorful B',
        adminDefaults: { light: 'outline', dark: 'outline' },
      }),
    ).toBe('colorful-b');
    expect(
      resolveNavIconStyle({
        theme: 'dark',
        userDark: 'Colorful A',
        adminDefaults: { light: 'colorful-b', dark: 'outline' },
      }),
    ).toBe('colorful-a');
    expect(
      resolveNavIconStyle({
        theme: 'light',
        userLight: 'outline',
        adminDefaults: { light: 'colorful-a', dark: 'colorful-a' },
      }),
    ).toBe('outline');
  });

  it('falls through invalid user values, then invalid admin values, to hardcoded', () => {
    expect(
      resolveNavIconStyle({
        theme: 'light',
        userLight: 'not-a-style',
        adminDefaults: { light: 'colorful-b' },
      }),
    ).toBe('colorful-b');
    expect(
      resolveNavIconStyle({
        theme: 'dark',
        userDark: '???',
        adminDefaults: { dark: 'nope' },
      }),
    ).toBe('outline');
    expect(resolveNavIconStyle({ theme: 'light' })).toBe('colorful-a');
    expect(resolveNavIconStyle({ theme: 'dark' })).toBe('outline');
  });

  it('does not leak a light-mode user choice into dark mode, or vice versa', () => {
    expect(
      resolveNavIconStyle({
        theme: 'dark',
        userLight: 'Colorful B',
        userDark: 'Use default',
      }),
    ).toBe('outline');
    expect(
      resolveNavIconStyle({
        theme: 'light',
        userLight: 'Use default',
        userDark: 'Colorful B',
      }),
    ).toBe('colorful-a');
  });
});
