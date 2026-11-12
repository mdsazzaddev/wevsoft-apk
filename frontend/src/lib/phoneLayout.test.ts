import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DESKTOP_DEVICE_QUERY, PHONE_DEVICE_QUERY } from './phoneLayout.js';
import { DESKTOP_MD_QUERY } from './desktopHeader.js';
import { MOBILE_MD_MAX_QUERY } from './mobileTopHeader.js';

describe('phoneLayout device queries', () => {
  it('uses device-width (not viewport width) so desktop resize stays desktop', () => {
    assert.match(PHONE_DEVICE_QUERY, /max-device-width:\s*767px/);
    assert.match(DESKTOP_DEVICE_QUERY, /min-device-width:\s*768px/);
    assert.doesNotMatch(PHONE_DEVICE_QUERY, /max-width:\s*767px(?!\))/);
  });

  it('desktop header query stays aligned with device desktop', () => {
    assert.equal(DESKTOP_MD_QUERY, DESKTOP_DEVICE_QUERY);
    assert.equal(MOBILE_MD_MAX_QUERY, PHONE_DEVICE_QUERY);
  });
});
