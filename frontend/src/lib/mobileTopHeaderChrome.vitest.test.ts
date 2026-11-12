import { describe, expect, it } from 'vitest';
import {
  mobileTopHeaderChromeLabel,
  parseMobileTopHeaderChrome,
} from './mobileTopHeaderChrome';

describe('mobileTopHeaderChrome', () => {
  it('parses labels and legacy keys', () => {
    expect(parseMobileTopHeaderChrome('Solid bar')).toBe('classic');
    expect(parseMobileTopHeaderChrome('Feed blend')).toBe('blend');
    expect(parseMobileTopHeaderChrome('Icons only')).toBe('transparent');
    expect(parseMobileTopHeaderChrome('blend')).toBe('blend');
    expect(parseMobileTopHeaderChrome('minimal')).toBe('transparent');
  });

  it('round-trips labels', () => {
    expect(mobileTopHeaderChromeLabel('blend')).toBe('Feed blend');
  });
});
