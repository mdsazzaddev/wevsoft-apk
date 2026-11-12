import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractAiJsonObject,
  normalizeAiPostPayload,
  resolvePostGenLanguage,
  stripAiReasoning,
  stripAiReasoningDeep,
  unwrapAiContentText,
} from './ai-text.js';

test('stripAiReasoning removes think blocks and keeps the answer', () => {
  const raw = `<think>
Thinking Process:
1. Deconstruct the Request
</think>

তোমার চোখে চাঁদ আছে ❤️`;
  const cleaned = stripAiReasoning(raw);
  assert.equal(cleaned.includes('<think>'), false);
  assert.equal(cleaned.includes('Thinking Process'), false);
  assert.match(cleaned, /চাঁদ/);
});

test('stripAiReasoning handles unclosed think tags', () => {
  const raw = `<think>internal notes forever
{"content":"hello"}`;
  const cleaned = stripAiReasoning(raw);
  assert.equal(cleaned.includes('<think>'), false);
  assert.match(cleaned, /hello/);
});

test('stripAiReasoningDeep cleans nested JSON fields', () => {
  const parsed = stripAiReasoningDeep({
    content: '<think>x</think>Real post',
    caption: '<thinking>y</thinking>Short',
    hashtags: ['#a'],
  });
  assert.equal(parsed.content, 'Real post');
  assert.equal(parsed.caption, 'Short');
  assert.deepEqual(parsed.hashtags, ['#a']);
});

test('extractAiJsonObject picks the real post JSON from noisy meta chatter', () => {
  const raw = `
All good. I will output only the JSON. No markdown.
Language: English overrides bangla. I'll stick to English.
Self-Correction/Verification during thought:
- Check word count: 195 words.
Proceeds.
[Output Generation]
{"content":"Love in quiet moments.","caption":"Quiet love ❤️","hashtags":["#Love"],"keywords":["romance"],"emojis":["❤️"],"cta":"Share yours","relatedTopics":["love"],"suggestedAudience":"couples"}
Matches perfectly. Output matches.
`;
  const obj = extractAiJsonObject(raw);
  assert.ok(obj);
  assert.equal(obj!.content, 'Love in quiet moments.');
  assert.equal(obj!.caption, 'Quiet love ❤️');
});

test('unwrapAiContentText strips JSON wrapper to plain post text', () => {
  const raw = `{ "content": "Sometimes the most beautiful parts of a relationship are quiet.", "caption": "Quiet love" }`;
  assert.equal(
    unwrapAiContentText(raw),
    'Sometimes the most beautiful parts of a relationship are quiet.',
  );
});

test('normalizeAiPostPayload fixes content that is itself a JSON blob', () => {
  const normalized = normalizeAiPostPayload({
    content: `{ "content": "Love in quiet moments.", "caption": "Quiet love ❤️", "hashtags": ["#Love"] }`,
    caption: '',
    hashtags: [],
  });
  assert.equal(normalized.content, 'Love in quiet moments.');
  assert.equal(normalized.caption, 'Quiet love ❤️');
  assert.deepEqual(normalized.hashtags, ['#Love']);
});

test('unwrapAiContentText handles truncated JSON content field', () => {
  const raw = `{ "content": "Romance thrives in the ordinary`;
  assert.equal(unwrapAiContentText(raw), 'Romance thrives in the ordinary');
});

test('resolvePostGenLanguage honors bangla in the user prompt', () => {
  assert.equal(resolvePostGenLanguage('creat a romantic post in bangla', 'en'), 'bn');
  assert.equal(resolvePostGenLanguage('creat a romantic post in bangla', 'auto'), 'bn');
  assert.equal(resolvePostGenLanguage('creat a romantic post in bangla', ''), 'bn');
  assert.equal(resolvePostGenLanguage('একটা রোমান্টিক পোস্ট', 'auto'), 'bn');
  assert.equal(resolvePostGenLanguage('write a funny tweet', 'auto'), 'en');
  assert.equal(resolvePostGenLanguage('write a funny tweet', 'en'), 'en');
});
