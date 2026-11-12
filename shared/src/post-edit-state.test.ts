import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeNeedsHeavyProcess,
  createEmptyPostEditState,
  parsePostEditState,
  serializePostEditState,
} from './post-edit-state.js';

test('createEmptyPostEditState seeds version and private audience', () => {
  const s = createEmptyPostEditState('c1');
  assert.equal(s.clientDraftId, 'c1');
  assert.equal(s.version, 1);
  assert.equal(s.audience.privacy, 'private');
});

test('parsePostEditState tolerates JSON string and drops bad media', () => {
  const raw = serializePostEditState({
    ...createEmptyPostEditState('abc'),
    content: 'hello',
    media: [
      { localId: '1', url: '/uploads/a.jpg', kind: 'image', order: 0 },
      { localId: '2', url: '', kind: 'image', order: 1 } as any,
    ],
  });
  const parsed = parsePostEditState(raw);
  assert.equal(parsed?.content, 'hello');
  assert.equal(parsed?.media.length, 1);
});

test('computeNeedsHeavyProcess flags video trim and music-on-video', () => {
  assert.equal(
    computeNeedsHeavyProcess({
      media: [{ localId: '1', url: '/v.mp4', kind: 'video', order: 0, trim: { start: 2, end: 10 } }],
      music: null,
    }),
    true,
  );
  assert.equal(
    computeNeedsHeavyProcess({
      media: [{ localId: '1', url: '/a.jpg', kind: 'image', order: 0 }],
      music: { musicId: 'm', startTime: 0, endTime: 10, volume: 1, originalAudioMuted: false },
    }),
    false,
  );
  assert.equal(
    computeNeedsHeavyProcess({
      media: [{ localId: '1', url: '/v.mp4', kind: 'video', order: 0 }],
      music: { musicId: 'm', startTime: 0, endTime: 10, volume: 1, originalAudioMuted: true },
    }),
    true,
  );
});
