import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listIsPinnedToBottom,
  messageComposerPlaceholder,
  shouldFollowThreadOutput,
  typingMarksPeerActive,
  virtuosoBottomIndex,
} from './wevchatThread.logic.js';

test('composer placeholder clears as soon as any character is typed', () => {
  assert.equal(messageComposerPlaceholder('', false), 'Type a message…');
  assert.equal(messageComposerPlaceholder('', true), 'Private message…');
  assert.equal(messageComposerPlaceholder('H', false), '');
  assert.equal(messageComposerPlaceholder('Hi', true), '');
});

test('typing marks the peer active unless presence is hidden', () => {
  assert.equal(typingMarksPeerActive(undefined), true);
  assert.equal(typingMarksPeerActive(true), true);
  assert.equal(typingMarksPeerActive(false), false);
});

test('a short thread and a thread within the bottom threshold are pinned', () => {
  assert.equal(listIsPinnedToBottom(null, 80), null);
  assert.equal(listIsPinnedToBottom({ scrollHeight: 400, scrollTop: 0, clientHeight: 0 }, 80), null);
  assert.equal(listIsPinnedToBottom({ scrollHeight: 400, scrollTop: 0, clientHeight: 500 }, 80), true);
  assert.equal(listIsPinnedToBottom({ scrollHeight: 2000, scrollTop: 1500, clientHeight: 480 }, 80), true);
  assert.equal(listIsPinnedToBottom({ scrollHeight: 2000, scrollTop: 1000, clientHeight: 480 }, 80), false);
});

test('bottom index accounts for the Virtuoso firstItemIndex shift', () => {
  assert.equal(virtuosoBottomIndex(1_000_000, 0), null);
  assert.equal(virtuosoBottomIndex(1_000_000, 3), 1_000_002);
  assert.equal(virtuosoBottomIndex(999_990, 12), 1_000_001);
});

test('new messages follow when either Virtuoso or our pin says we are at the bottom', () => {
  assert.equal(shouldFollowThreadOutput(false, false), false);
  assert.equal(shouldFollowThreadOutput(true, false), 'auto');
  assert.equal(shouldFollowThreadOutput(false, true), 'auto');
});
