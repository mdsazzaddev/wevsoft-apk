import { describe, expect, it } from 'vitest';
import {
  mobileBottomNavStyleLabel,
  parseMobileBottomNavStyle,
  styleFromLegacyTransparent,
} from './mobileBottomNavStyle';

describe('mobileBottomNavStyle', () => {
  it('parses labels and legacy keys', () => {
    expect(parseMobileBottomNavStyle('Solid bar')).toBe('classic');
    expect(parseMobileBottomNavStyle('Feed blend')).toBe('blend');
    expect(parseMobileBottomNavStyle('Icons only')).toBe('transparent');
    expect(parseMobileBottomNavStyle('blend')).toBe('blend');
  });

  it('migrates transparent toggle', () => {
    expect(styleFromLegacyTransparent(false)).toBe('classic');
    expect(styleFromLegacyTransparent(true)).toBe('transparent');
  });

  it('round-trips labels', () => {
    expect(mobileBottomNavStyleLabel('blend')).toBe('Feed blend');
  });
});
