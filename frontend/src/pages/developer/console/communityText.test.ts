import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCommunityText, safeHref } from './communityText';

const XSS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '[click](javascript:alert(1))',
  '<a href="javascript:alert(1)">x</a>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  '<svg onload=alert(1)>',
  '"><iframe src=//evil>',
  'https://user:pass@evil.example/',
  '`<b>code</b>`',
];

test('XSS vectors never produce non-http links or markup', () => {
  for (const v of XSS) {
    const segs = renderCommunityText(v);
    for (const s of segs) {
      if (s.type === 'link') assert.match(s.href, /^https?:\/\//, v);
      assert.ok(!('html' in (s as any)), 'no html segments');
    }
    const joined = segs.map((s) => ('text' in s ? s.text : '\n')).join('');
    assert.equal(joined.replace(/\n/g, ''), v.replace(/`/g, '').replace(/\n/g, ''), `text preserved literally: ${v}`);
  }
  assert.equal(safeHref('javascript:alert(1)'), null);
  assert.equal(safeHref('https://user:pass@evil.example/'), null);
});

test('links, code and newlines', () => {
  const segs = renderCommunityText('See https://wevsoft.com/docs.\nRun `wev login`');
  assert.deepEqual(segs.map((s) => s.type), ['text', 'link', 'text', 'br', 'text', 'code']);
  assert.equal((segs[1] as any).href, 'https://wevsoft.com/docs');
});
