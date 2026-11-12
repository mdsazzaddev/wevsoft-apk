import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aspectLabelOf,
  estimateUploadBytes,
  formatDurationLabel,
  orientationOf,
  qualityOptionsForSource,
  qualityTierOf,
  type ReelVideoAnalysis,
} from './reelVideoAnalysis.ts';

test('qualityTierOf uses the shorter edge for portrait 1080x1920', () => {
  assert.equal(qualityTierOf(1080, 1920), '1080p');
  assert.equal(qualityTierOf(1920, 1080), '1080p');
  assert.equal(qualityTierOf(3840, 2160), '2160p');
});

test('aspectLabelOf snaps common reel ratios', () => {
  assert.equal(aspectLabelOf(1080, 1920), '9:16');
  assert.equal(aspectLabelOf(1920, 1080), '16:9');
  assert.equal(aspectLabelOf(1080, 1080), '1:1');
});

test('orientationOf classifies portrait landscape square', () => {
  assert.equal(orientationOf(1080, 1920), 'portrait');
  assert.equal(orientationOf(1920, 1080), 'landscape');
  assert.equal(orientationOf(1000, 1000), 'square');
});

test('qualityOptionsForSource never offers upscale past source', () => {
  const analysis: ReelVideoAnalysis = {
    width: 1080,
    height: 1920,
    durationSec: 42,
    fps: 30,
    aspectLabel: '9:16',
    orientation: 'portrait',
    qualityTier: '1080p',
    hasAudio: true,
    fileSize: 80 * 1024 * 1024,
    mimeType: 'video/mp4',
    fileName: 'clip.mp4',
    estimatedUploadBytes: 80 * 1024 * 1024,
  };
  const opts = qualityOptionsForSource(analysis);
  assert.ok(opts.some((o) => o.value === 'full_hd'));
  assert.ok(!opts.some((o) => o.value === '4k' || o.value === '2k'));
  assert.ok(opts.some((o) => o.value === 'standard'));
});

test('formatDurationLabel and estimateUploadBytes', () => {
  assert.equal(formatDurationLabel(65), '1:05');
  assert.ok(estimateUploadBytes(10 * 1024 * 1024, 0.5) <= 10 * 1024 * 1024);
});
