import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMessageListAtBottom,
  messageListGap,
  peerPresenceDot,
  shouldFollowTail,
} from './wevchatViewLogic.js';

test('a thread that fits the pane is at the bottom', () => {
  assert.equal(isMessageListAtBottom({ scrollHeight: 400, scrollTop: 0, clientHeight: 500 }), true);
  assert.equal(messageListGap({ scrollHeight: 400, scrollTop: 0, clientHeight: 500 }), -100);
});

test('an unmeasured scroller does not count as needing a jump', () => {
  assert.equal(isMessageListAtBottom({ scrollHeight: 800, scrollTop: 0, clientHeight: 0 }), true);
});

test('a real gap below the fold is not at the bottom', () => {
  assert.equal(isMessageListAtBottom({ scrollHeight: 2000, scrollTop: 400, clientHeight: 600 }), false);
  assert.equal(isMessageListAtBottom({ scrollHeight: 2000, scrollTop: 1304, clientHeight: 600 }), true);
});

test('tail follow waits for the opening scroll and a pin', () => {
  assert.equal(shouldFollowTail({ initialScrollDone: false, virtuosoAtBottom: true, stuckToBottom: true }), false);
  assert.equal(shouldFollowTail({ initialScrollDone: true, virtuosoAtBottom: false, stuckToBottom: true }), 'auto');
  assert.equal(shouldFollowTail({ initialScrollDone: true, virtuosoAtBottom: false, stuckToBottom: false }), false);
});

test('typing turns the presence dot green unless status is hidden', () => {
  assert.equal(peerPresenceDot({
    presenceKnown: true,
    listedOnline: false,
    typing: true,
    presenceVisible: true,
  }), 'online');
  assert.equal(peerPresenceDot({
    presenceKnown: true,
    listedOnline: false,
    typing: true,
    presenceVisible: false,
  }), 'hidden');
  assert.equal(peerPresenceDot({
    presenceKnown: true,
    listedOnline: false,
    typing: false,
    presenceVisible: true,
  }), 'offline');
  assert.equal(peerPresenceDot({
    presenceKnown: false,
    listedOnline: false,
    typing: false,
    presenceVisible: true,
  }), 'hidden');
});
