import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDesktopHeaderNavFloating,
  shouldShowFloatingHeaderNav,
} from './desktopHeaderNavFloating.ts';

describe('parseDesktopHeaderNavFloating', () => {
  it('treats truthy forms as on', () => {
    assert.equal(parseDesktopHeaderNavFloating(true), true);
    assert.equal(parseDesktopHeaderNavFloating('true'), true);
    assert.equal(parseDesktopHeaderNavFloating(1), true);
    assert.equal(parseDesktopHeaderNavFloating('1'), true);
  });

  it('treats everything else as off', () => {
    assert.equal(parseDesktopHeaderNavFloating(false), false);
    assert.equal(parseDesktopHeaderNavFloating('false'), false);
    assert.equal(parseDesktopHeaderNavFloating(0), false);
    assert.equal(parseDesktopHeaderNavFloating(null), false);
    assert.equal(parseDesktopHeaderNavFloating(undefined), false);
  });
});

describe('shouldShowFloatingHeaderNav', () => {
  it('requires allowFloatingChrome and the floating pref', () => {
    assert.equal(
      shouldShowFloatingHeaderNav({
        allowFloatingChrome: false,
        desktopHeaderNavFloating: true,
        showDesktopHeader: false,
        isDesktopMd: true,
      }),
      false,
    );
    assert.equal(
      shouldShowFloatingHeaderNav({
        allowFloatingChrome: true,
        desktopHeaderNavFloating: false,
        showDesktopHeader: false,
        isDesktopMd: true,
      }),
      false,
    );
  });

  it('on desktop only floats when Show header is off', () => {
    assert.equal(
      shouldShowFloatingHeaderNav({
        allowFloatingChrome: true,
        desktopHeaderNavFloating: true,
        showDesktopHeader: true,
        isDesktopMd: true,
      }),
      false,
    );
    assert.equal(
      shouldShowFloatingHeaderNav({
        allowFloatingChrome: true,
        desktopHeaderNavFloating: true,
        showDesktopHeader: false,
        isDesktopMd: true,
      }),
      true,
    );
  });

  it('on mobile floats whenever the pref is on (no desktop header bar)', () => {
    assert.equal(
      shouldShowFloatingHeaderNav({
        allowFloatingChrome: true,
        desktopHeaderNavFloating: true,
        showDesktopHeader: true,
        isDesktopMd: false,
      }),
      true,
    );
    assert.equal(
      shouldShowFloatingHeaderNav({
        allowFloatingChrome: true,
        desktopHeaderNavFloating: true,
        showDesktopHeader: false,
        isDesktopMd: false,
      }),
      true,
    );
  });
});
