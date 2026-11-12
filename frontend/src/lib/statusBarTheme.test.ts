import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATUS_BAR_COLORS,
  appleStatusBarStyleForMode,
  resolveStatusBarMode,
  resolveThemeLabelForPaint,
  statusBarColorForMode,
  themeLabelForPaintMode,
} from './statusBarTheme.ts';

test('resolveStatusBarMode maps Display-mode labels', () => {
  assert.equal(resolveStatusBarMode('Light mode'), 'light');
  assert.equal(resolveStatusBarMode('Dark mode'), 'dark');
  assert.equal(resolveStatusBarMode('OLED True Black'), 'oled');
  assert.equal(resolveStatusBarMode('System default', true), 'dark');
  assert.equal(resolveStatusBarMode('System default', false), 'light');
});

test('status bar colors match Light / Dark / OLED shells', () => {
  assert.equal(statusBarColorForMode('light'), STATUS_BAR_COLORS.light);
  assert.equal(statusBarColorForMode('dark'), '#0b0e11');
  assert.equal(statusBarColorForMode('oled'), '#000000');
});

test('apple status bar style is translucent only for dark shells', () => {
  assert.equal(appleStatusBarStyleForMode('light'), 'default');
  assert.equal(appleStatusBarStyleForMode('dark'), 'black-translucent');
  assert.equal(appleStatusBarStyleForMode('oled'), 'black-translucent');
});

test('resolveThemeLabelForPaint prefers platform default over System', () => {
  assert.equal(
    resolveThemeLabelForPaint('System default', 'Dark mode'),
    'Dark mode',
  );
  assert.equal(
    resolveThemeLabelForPaint('Dark mode', 'Light mode'),
    'Dark mode',
  );
  assert.equal(themeLabelForPaintMode('oled'), 'OLED True Black');
  assert.equal(themeLabelForPaintMode('dark'), 'Dark mode');
});
