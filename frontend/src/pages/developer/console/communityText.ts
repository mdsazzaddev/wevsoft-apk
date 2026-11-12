/**
 * Phase 5 W4: safe client rendering for community posts. Input is plain text (HTML is never
 * interpreted). Output is a list of segments the page renders as React text nodes; only
 * http(s) URLs become links and they always open with rel="noopener noreferrer nofollow ugc".
 */
export type CommunitySegment = { type: 'text'; text: string } | { type: 'link'; text: string; href: string } | { type: 'code'; text: string } | { type: 'br' };

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi;

export function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function inline(line: string, out: CommunitySegment[]) {
  const parts = line.split(/(`[^`\n]{1,300}`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      out.push({ type: 'code', text: part.slice(1, -1) });
      continue;
    }
    let last = 0;
    for (const m of part.matchAll(URL_RE)) {
      const raw = m[0].replace(/[.,;:!?)\]]+$/, '');
      const idx = m.index ?? 0;
      if (idx > last) out.push({ type: 'text', text: part.slice(last, idx) });
      const href = safeHref(raw);
      out.push(href ? { type: 'link', text: raw, href } : { type: 'text', text: raw });
      last = idx + raw.length;
    }
    if (last < part.length) out.push({ type: 'text', text: part.slice(last) });
  }
}

export function renderCommunityText(text: string): CommunitySegment[] {
  const out: CommunitySegment[] = [];
  String(text || '').split('\n').forEach((line, i) => {
    if (i > 0) out.push({ type: 'br' });
    inline(line, out);
  });
  return out;
}
