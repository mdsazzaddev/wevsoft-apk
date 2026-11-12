import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReelEditState,
  cssFilterFromEdit,
  editNeedsHeavyProcess,
  parseReelEditState,
} from './reelEditState.ts';

test('createReelEditState defaults are non-destructive', () => {
  const s = createReelEditState();
  assert.equal(s.filterPreset, 'none');
  assert.equal(s.trimStart, 0);
  assert.equal(s.trimEnd, null);
  assert.equal(editNeedsHeavyProcess(s), false);
});

test('editNeedsHeavyProcess detects trim and filters', () => {
  assert.equal(editNeedsHeavyProcess(createReelEditState({ trimStart: 1.5 })), true);
  assert.equal(editNeedsHeavyProcess(createReelEditState({ filterPreset: 'warm' })), true);
  assert.equal(editNeedsHeavyProcess(createReelEditState({ music: {
    musicId: 'm1',
    startTime: 0,
    endTime: 10,
    volume: 1,
    originalAudioMuted: false,
    title: 'Song',
    audioUrl: '/x.mp3',
    duration: 60,
  } })), true);
});

test('parseReelEditState round-trips JSON', () => {
  const raw = JSON.stringify(createReelEditState({ aspectMode: 'crop', speed: 1.5, showSafeArea: false }));
  const parsed = parseReelEditState(raw);
  assert.ok(parsed);
  assert.equal(parsed!.aspectMode, 'crop');
  assert.equal(parsed!.speed, 1.5);
  assert.equal(parsed!.showSafeArea, false);
});

test('cssFilterFromEdit returns a filter string', () => {
  const css = cssFilterFromEdit(createReelEditState({ filterPreset: 'bw', adjustments: {
    brightness: 110,
    contrast: 100,
    saturation: 100,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    sharpness: 0,
    fade: 0,
    vignette: 0,
  } }));
  assert.ok(css.includes('grayscale') || css.includes('brightness'));
});
