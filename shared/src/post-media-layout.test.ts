import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adjustLayoutForCount,
  cropToObjectPosition,
  defaultLayoutForPhotoCount,
  layoutsForPhotoCount,
  parseMediaCropData,
  resolvePostLayout,
} from './post-media-layout.js';

test('layoutsForPhotoCount gates by minimum and keeps stack layouts above 4', () => {
  assert.deepEqual(layoutsForPhotoCount(1), []);
  const two = layoutsForPhotoCount(2);
  assert.ok(two.includes('split_2'));
  assert.ok(two.includes('carousel'));
  assert.ok(two.includes('column'));
  assert.ok(two.includes('row'));
  assert.ok(two.includes('frame'));
  assert.ok(two.includes('feature_stick'));
  assert.ok(!two.includes('triptych'));
  assert.ok(layoutsForPhotoCount(3).includes('main_2side'));
  assert.ok(layoutsForPhotoCount(3).includes('mosaic'));
  assert.ok(layoutsForPhotoCount(3).includes('triptych'));
  assert.ok(layoutsForPhotoCount(4).includes('grid_4'));
  assert.ok(layoutsForPhotoCount(4).includes('hero_strip'));
  assert.ok(layoutsForPhotoCount(4).includes('brick'));
  const five = layoutsForPhotoCount(5);
  assert.ok(five.includes('carousel'));
  assert.ok(five.includes('waterfall'));
  assert.ok(five.includes('captain'));
  assert.ok(five.includes('mosaic'));
  assert.ok(!five.includes('grid_4'));
});

test('resolvePostLayout keeps new templates and maps legacy grid', () => {
  assert.equal(resolvePostLayout('split_2', 2), 'split_2');
  assert.equal(resolvePostLayout('grid_4', 2), 'split_2');
  assert.equal(resolvePostLayout('main_2side', 2), 'split_2');
  assert.equal(resolvePostLayout('column', 3), 'column');
  assert.equal(resolvePostLayout('row', 4), 'row');
  assert.equal(resolvePostLayout('frame', 2), 'frame');
  assert.equal(resolvePostLayout('feature_stick', 3), 'feature_stick');
  assert.equal(resolvePostLayout('mosaic', 3), 'mosaic');
  assert.equal(resolvePostLayout('mosaic', 2), 'split_2');
  assert.equal(resolvePostLayout('triptych', 3), 'triptych');
  assert.equal(resolvePostLayout('waterfall', 6), 'waterfall');
  assert.equal(resolvePostLayout('captain', 5), 'captain');
  assert.equal(resolvePostLayout('col', 3), 'column');
  assert.equal(resolvePostLayout('grid', 3), 'legacy_grid');
  assert.equal(resolvePostLayout(null, 5), 'waterfall');
  assert.equal(resolvePostLayout('split_2', 5), 'waterfall');
  assert.equal(resolvePostLayout('column', 5), 'column');
  assert.equal(resolvePostLayout('feature_stick', 5), 'feature_stick');
  assert.equal(resolvePostLayout('mosaic', 5), 'mosaic');
  assert.equal(resolvePostLayout('anything', 1), null);
});

test('adjustLayoutForCount clears under 2 and prefers densest fit', () => {
  assert.equal(adjustLayoutForCount('grid_4', 1), null);
  assert.equal(adjustLayoutForCount('grid_4', 2), 'split_2');
  assert.equal(adjustLayoutForCount('grid_4', 3), 'main_2side');
  assert.equal(adjustLayoutForCount('carousel', 4), 'carousel');
  assert.equal(adjustLayoutForCount('column', 5), 'column');
  assert.equal(adjustLayoutForCount('grid_4', 5), 'waterfall');
});

test('defaultLayoutForPhotoCount picks a sensible starter', () => {
  assert.equal(defaultLayoutForPhotoCount(2), 'split_2');
  assert.equal(defaultLayoutForPhotoCount(3), 'main_2side');
  assert.equal(defaultLayoutForPhotoCount(4), 'grid_4');
  assert.equal(defaultLayoutForPhotoCount(6), 'waterfall');
  assert.equal(defaultLayoutForPhotoCount(1), null);
});

test('parseMediaCropData clamps and rejects invalid', () => {
  assert.deepEqual(parseMediaCropData({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 }), {
    x: 0.1,
    y: 0.2,
    w: 0.5,
    h: 0.5,
  });
  assert.equal(parseMediaCropData({ x: 0, y: 0, w: 0, h: 1 }), null);
  assert.deepEqual(parseMediaCropData('{"x":0,"y":0,"w":1,"h":1}'), { x: 0, y: 0, w: 1, h: 1 });
});

test('cropToObjectPosition targets crop center', () => {
  assert.equal(cropToObjectPosition({ x: 0, y: 0, w: 1, h: 1 }), '50.00% 50.00%');
  assert.equal(cropToObjectPosition({ x: 0, y: 0, w: 0.5, h: 0.5 }), '25.00% 25.00%');
});
