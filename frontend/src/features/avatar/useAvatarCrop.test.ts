import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeAvatarCrop, clampOffset } from './useAvatarCrop';

describe('computeAvatarCrop', () => {
  it('centre-crops a landscape image at zoom 1', () => {
    const c = computeAvatarCrop({ w: 2000, h: 1000 }, 280, 1, 0, { x: 0, y: 0 });
    assert.equal(Math.round(c.width), 1000);
    assert.equal(Math.round(c.height), 1000);
    assert.equal(Math.round(c.x), 500);
    assert.equal(Math.round(c.y), 0);
  });
  it('halves the crop size at zoom 2', () => {
    const c = computeAvatarCrop({ w: 1000, h: 1000 }, 280, 2, 0, { x: 0, y: 0 });
    assert.equal(Math.round(c.width), 500);
    assert.equal(Math.round(c.x), 250);
  });
  it('swaps dimensions for 90deg rotation', () => {
    const c = computeAvatarCrop({ w: 2000, h: 1000 }, 280, 1, 90, { x: 0, y: 0 });
    assert.equal(Math.round(c.width), 1000);
    assert.equal(Math.round(c.y), 500);
  });
});

describe('clampOffset', () => {
  it('prevents panning past the image edge', () => {
    const o = clampOffset({ w: 2000, h: 1000 }, 280, 1, 0, { x: 9999, y: 9999 });
    assert.equal(o.x, 140);
    assert.equal(o.y, 0);
  });
});