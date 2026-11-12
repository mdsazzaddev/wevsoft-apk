import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeCoverCrop, clampCoverOffset } from './useCoverCrop';

describe('computeCoverCrop', () => {
  it('takes a centred 16:9 band from a 4:3 photo', () => {
    const c = computeCoverCrop({ w: 1600, h: 1200 }, 640, 360, 1, 0, { x: 0, y: 0 });
    assert.equal(c.width, 1600);
    assert.equal(c.height, 900);
    assert.equal(c.y, 150);
  });
  it('halves crop at zoom 2', () => {
    const c = computeCoverCrop({ w: 1920, h: 1080 }, 640, 360, 2, 0, { x: 0, y: 0 });
    assert.equal(c.width, 960);
    assert.equal(c.x, 480);
  });
  it('uses rotated dimensions', () => {
    const c = computeCoverCrop({ w: 1200, h: 1600 }, 640, 360, 1, 90, { x: 0, y: 0 });
    assert.equal(c.width, 1600);
    assert.equal(c.height, 900);
  });
  it('clamps panning to the image edge', () => {
    const o = clampCoverOffset({ w: 1600, h: 1200 }, 640, 360, 1, 0, { x: 999, y: 999 });
    assert.equal(o.x, 0);
    assert.equal(o.y, 60);
  });
});