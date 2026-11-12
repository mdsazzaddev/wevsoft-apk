/**
 * Content Analyze — deterministic, local rule engine.
 * Everything here is computed from the content itself (text, file metadata).
 * Anything that needs AI or audience history is reported as `available: false`
 * with a reason — never estimated or invented.
 */
import { useStore } from '../store';

export type Platform = 'facebook' | 'instagram' | 'youtube' | 'websoft';
export type SourceType = 'file' | 'text' | 'url';
export type Status = 'excellent' | 'good' | 'fair' | 'needs_work' | 'unavailable';

export interface MediaMeta {
  kind: 'image' | 'video' | 'other';
  name: string;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

export interface AnalysisInput {
  sourceType: SourceType;
  platform: Platform;
  title: string;
  text: string;
  media?: MediaMeta | null;
  url?: string;
  targetKeyword?: string;
  urlMeta?: { domain: string; title: string; description: string; h1Count: number; hasCanonical: boolean; image?: string } | null;
}

export interface Check { id: string; label: string; status: Status; detail: string; category: 'content' | 'seo' | 'media' | 'engagement' | 'readability' }
export interface Score { available: boolean; value: number | null; label: string; reason?: string }

export interface AnalysisResult {
  version: 1;
  engine: 'local-rules-v1';
  analyzedAt: string;
  input: Omit<AnalysisInput, 'media'> & { media?: MediaMeta | null };
  thumbDataUrl?: string | null;
  stats: {
    chars: number; words: number; sentences: number; avgWordsPerSentence: number;
    hashtags: string[]; mentions: string[]; emojis: number; links: number;
    questions: number; exclamations: number; capsRatio: number; script: 'latin' | 'bangla' | 'mixed' | 'none';
  };
  keywords: { term: string; count: number; inTitle: boolean; inFirstLine: boolean }[];
  scores: { quality: Score; seo: Score; engagement: Score; readability: Score };
  checks: Check[];
  recommendations: { id: string; text: string; priority: 'high' | 'medium' | 'low'; category: Check['category'] }[];
}

export const PLATFORM_RULES: Record<Platform, { label: string; captionMax: number; idealCaption: [number, number]; idealHashtags: [number, number]; titleMax: number; videoIdealSec?: [number, number] }> = {
  facebook: { label: 'Facebook', captionMax: 63206, idealCaption: [40, 300], idealHashtags: [1, 3], titleMax: 255, videoIdealSec: [15, 180] },
  instagram: { label: 'Instagram', captionMax: 2200, idealCaption: [70, 600], idealHashtags: [3, 10], titleMax: 2200, videoIdealSec: [7, 90] },
  youtube: { label: 'YouTube', captionMax: 5000, idealCaption: [150, 2000], idealHashtags: [1, 5], titleMax: 100, videoIdealSec: [60, 900] },
  websoft: { label: 'WebSoft', captionMax: 10000, idealCaption: [40, 800], idealHashtags: [1, 5], titleMax: 150, videoIdealSec: [10, 300] },
};

const STOP = new Set(('a an the and or but if of to in on at for with from by is are was were be been it its this that these those i you he she we they me my our your their as so not no do does did have has had can will just than then there here what when where who why how all any some more most very also into out up about over after before again only own same too s t ve ll re d m am get got let lets new one two').split(' '));
const CTA_RE = /\b(comment|share|follow|subscribe|like|save|tag|click|tap|join|sign ?up|buy|shop|order|download|watch|learn more|link in bio|dm|visit|check out|let me know|tell me|register|try)\b|কমেন্ট|শেয়ার|ফলো|সাবস্ক্রাইব|লাইক|জানাও|জানান|দেখুন|কিনুন/i;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

function countSyllables(w: string) {
  const word = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  const m = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export const scoreLabel = (v: number | null) => v == null ? 'Not available' : v >= 85 ? 'Excellent' : v >= 70 ? 'Good' : v >= 50 ? 'Fair' : 'Needs work';
const statusOf = (ok: boolean, partial = false): Status => ok ? 'excellent' : partial ? 'fair' : 'needs_work';

export function analyzeContent(input: AnalysisInput, thumbDataUrl?: string | null): AnalysisResult {
  const rules = PLATFORM_RULES[input.platform];
  const text = (input.text || '').trim();
  const title = (input.title || '').trim();
  const full = [title, text].filter(Boolean).join('\n');
  const hashtags = Array.from(new Set((full.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.toLowerCase())));
  const mentions = Array.from(new Set(full.match(/@[\w.]+/g) || []));
  const links = (full.match(/https?:\/\/\S+/g) || []).length;
  const emojis = (full.match(EMOJI_RE) || []).length;
  const clean = text.replace(/https?:\/\/\S+/g, ' ').replace(/[#@][\p{L}\p{N}_.]+/gu, ' ');
  const words = clean.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const sentences = Math.max(words.length ? 1 : 0, (clean.match(/[.!?।]+(\s|$)/g) || []).length);
  const avgWps = sentences ? words.length / sentences : 0;
  const latin = (clean.match(/[A-Za-z]/g) || []).length;
  const bangla = (clean.match(/[\u0980-\u09FF]/g) || []).length;
  const script: AnalysisResult['stats']['script'] = !latin && !bangla ? 'none' : bangla && latin ? (bangla / (latin + bangla) > 0.8 ? 'bangla' : latin / (latin + bangla) > 0.8 ? 'latin' : 'mixed') : bangla ? 'bangla' : 'latin';
  const letters = (clean.match(/[A-Za-z]/g) || []).length;
  const caps = (clean.match(/[A-Z]/g) || []).length;
  const capsRatio = letters ? caps / letters : 0;
  const questions = (text.match(/\?/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;

  // keywords
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (k.length < 3 || STOP.has(k) || /^\d+$/.test(k)) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  for (const h of hashtags) { const k = h.slice(1); freq.set(k, (freq.get(k) || 0) + 1); }
  const firstLine = (text.split(/\n|[.!?।]/)[0] || '').toLowerCase();
  const keywords = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([term, count]) => ({ term, count, inTitle: title.toLowerCase().includes(term), inFirstLine: firstLine.includes(term) }));

  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // ---------- readability ----------
  let readability: Score;
  if (!words.length) readability = { available: false, value: null, label: 'Not available', reason: 'Add a caption or text to measure readability.' };
  else if (script === 'latin') {
    const syl = words.reduce((s, w) => s + countSyllables(w), 0);
    const fre = 206.835 - 1.015 * avgWps - 84.6 * (syl / words.length);
    const v = Math.round(clamp(fre));
    readability = { available: true, value: v, label: scoreLabel(v), reason: 'Flesch Reading Ease (English).' };
  } else {
    // Non-Latin: Flesch syllable rules don't apply; use sentence-length band only.
    const v = Math.round(clamp(100 - Math.max(0, avgWps - 12) * 4));
    readability = { available: true, value: v, label: scoreLabel(v), reason: 'Sentence-length based (Flesch is English-only).' };
  }
  add({ id: 'sentence_len', category: 'readability', label: 'Sentence length', status: !words.length ? 'unavailable' : avgWps <= 20 ? 'excellent' : avgWps <= 28 ? 'fair' : 'needs_work', detail: words.length ? `${avgWps.toFixed(1)} words per sentence on average.` : 'No text.' });

  // ---------- content ----------
  const capOk = text.length >= rules.idealCaption[0] && text.length <= rules.idealCaption[1];
  add({ id: 'caption_len', category: 'content', label: 'Caption length', status: !text ? 'needs_work' : text.length > rules.captionMax ? 'needs_work' : statusOf(capOk, true), detail: `${text.length} characters · ${rules.label} guideline ${rules.idealCaption[0]}–${rules.idealCaption[1]} (max ${rules.captionMax.toLocaleString()}).` });
  const firstWords = firstLine.split(/\s+/).filter(Boolean).length;
  const hookStrong = !!text && firstWords > 0 && firstWords <= 15 && (/[?!]/.test(text.split(/\n/)[0] || '') || /^(how|why|what|stop|this|imagine|\d)/i.test(text));
  add({ id: 'hook', category: 'engagement', label: 'Hook strength', status: !text ? 'needs_work' : hookStrong ? 'excellent' : firstWords <= 20 ? 'fair' : 'needs_work', detail: hookStrong ? 'Short opening line that asks or exclaims.' : 'Open with a short question or bold statement (≤15 words).' });
  const hasCta = CTA_RE.test(full);
  add({ id: 'cta', category: 'engagement', label: 'CTA effectiveness', status: hasCta ? 'excellent' : 'needs_work', detail: hasCta ? 'Call-to-action detected.' : 'No clear call-to-action (comment, share, follow, link…).' });
  add({ id: 'caps', category: 'content', label: 'Capitalization', status: capsRatio > 0.4 ? 'needs_work' : capsRatio > 0.25 ? 'fair' : 'excellent', detail: `${Math.round(capsRatio * 100)}% uppercase letters.` });
  const emojiRatio = words.length ? emojis / words.length : 0;
  add({ id: 'emoji', category: 'content', label: 'Emoji balance', status: emojis === 0 ? 'fair' : emojiRatio > 0.3 ? 'needs_work' : 'excellent', detail: `${emojis} emoji${emojis === 1 ? '' : 's'} in ${words.length} words.` });
  add({ id: 'grammar', category: 'content', label: 'Grammar & spelling', status: 'unavailable', detail: 'Needs AI — run AI Improve → Fix grammar.' });
  add({ id: 'sentiment', category: 'content', label: 'Sentiment & tone', status: 'unavailable', detail: 'Needs AI analysis; not estimated.' });
  add({ id: 'audience', category: 'engagement', label: 'Audience relevance', status: 'unavailable', detail: 'Needs audience data; see Performance for your real history.' });

  // ---------- seo ----------
  const hc = hashtags.length;
  add({ id: 'hashtags', category: 'seo', label: 'Hashtags', status: hc === 0 ? 'needs_work' : hc >= rules.idealHashtags[0] && hc <= rules.idealHashtags[1] ? 'excellent' : 'fair', detail: `${hc} hashtag${hc === 1 ? '' : 's'} · ${rules.label} guideline ${rules.idealHashtags[0]}–${rules.idealHashtags[1]}.` });
  const tLen = title.length;
  add({ id: 'title', category: 'seo', label: 'Title', status: !tLen ? 'needs_work' : tLen > rules.titleMax ? 'needs_work' : tLen >= 20 && tLen <= 70 ? 'excellent' : 'fair', detail: tLen ? `${tLen} characters (aim for 20–70).` : 'Add a title.' });
  const tk = (input.targetKeyword || '').trim().toLowerCase();
  const top = tk ? { term: tk, count: (full.toLowerCase().split(tk).length - 1), inTitle: title.toLowerCase().includes(tk), inFirstLine: firstLine.includes(tk) } : keywords[0];
  add({ id: 'kw_title', category: 'seo', label: 'Main keyword in title', status: !top ? 'unavailable' : top.inTitle ? 'excellent' : 'needs_work', detail: top ? `Top keyword “${top.term}” ${top.inTitle ? 'appears' : 'does not appear'} in the title.` : 'Not enough text for keywords.' });
  add({ id: 'kw_first', category: 'seo', label: 'Keyword in first line', status: !top ? 'unavailable' : top.inFirstLine ? 'excellent' : 'fair', detail: top ? `“${top.term}” ${top.inFirstLine ? 'is' : 'is not'} in the opening line.` : '—' });
  if (input.urlMeta) {
    add({ id: 'url_desc', category: 'seo', label: 'Meta description', status: input.urlMeta.description.length >= 50 && input.urlMeta.description.length <= 160 ? 'excellent' : input.urlMeta.description ? 'fair' : 'needs_work', detail: input.urlMeta.description ? `${input.urlMeta.description.length} characters (50–160 recommended).` : 'Page has no meta description.' });
    add({ id: 'url_h1', category: 'seo', label: 'H1 heading', status: input.urlMeta.h1Count === 1 ? 'excellent' : input.urlMeta.h1Count ? 'fair' : 'needs_work', detail: `${input.urlMeta.h1Count} H1 tag(s) found.` });
    add({ id: 'url_canon', category: 'seo', label: 'Canonical link', status: input.urlMeta.hasCanonical ? 'excellent' : 'fair', detail: input.urlMeta.hasCanonical ? 'Canonical URL set.' : 'No canonical link tag.' });
  }

  // ---------- media ----------
  const m = input.media;
  if (m && (m.kind === 'image' || m.kind === 'video')) {
    const short = Math.min(m.width || 0, m.height || 0);
    add({ id: 'resolution', category: 'media', label: 'Resolution', status: !m.width ? 'unavailable' : short >= 1080 ? 'excellent' : short >= 720 ? 'good' : 'needs_work', detail: m.width ? `${m.width} × ${m.height}${short >= 1080 ? ' (Full HD+)' : short >= 720 ? ' (HD)' : ' (below HD)'}` : 'Could not read dimensions.' });
    const ar = m.width && m.height ? m.width / m.height : 0;
    add({ id: 'aspect', category: 'media', label: 'Aspect ratio', status: !ar ? 'unavailable' : 'good', detail: ar ? `${ar >= 1.7 ? '16:9 landscape' : ar <= 0.6 ? '9:16 vertical' : ar > 0.95 && ar < 1.05 ? '1:1 square' : ar < 1 ? 'portrait' : 'landscape'} (${ar.toFixed(2)})` : '—' });
    if (m.kind === 'video' && rules.videoIdealSec) {
      const d = m.durationSec || 0;
      const [a, b] = rules.videoIdealSec;
      add({ id: 'duration', category: 'media', label: 'Video length', status: !d ? 'unavailable' : d >= a && d <= b ? 'excellent' : 'fair', detail: d ? `${fmtDuration(d)} · ${rules.label} guideline ${fmtDuration(a)}–${fmtDuration(b)}.` : 'Unknown duration.' });
    }
    add({ id: 'filesize', category: 'media', label: 'File size', status: m.sizeBytes > 4 * 1024 ** 3 ? 'needs_work' : 'excellent', detail: fmtBytes(m.sizeBytes) });
  }

  // ---------- scores ----------
  const pts = (ids: string[]) => {
    const sel = checks.filter((c) => ids.includes(c.id) && c.status !== 'unavailable');
    if (!sel.length) return null;
    const w: Record<Status, number> = { excellent: 100, good: 80, fair: 60, needs_work: 25, unavailable: 0 };
    return Math.round(sel.reduce((s, c) => s + w[c.status], 0) / sel.length);
  };
  const qv = pts(['caption_len', 'hook', 'cta', 'caps', 'emoji', 'sentence_len', 'resolution', 'duration']);
  const sv = pts(['hashtags', 'title', 'kw_title', 'kw_first', 'url_desc', 'url_h1', 'url_canon']);
  const scores = {
    quality: { available: qv != null, value: qv, label: scoreLabel(qv), reason: 'Rule-based: length, hook, CTA, formatting, media.' },
    seo: { available: sv != null, value: sv, label: scoreLabel(sv), reason: 'Rule-based: title, keywords, hashtags.' },
    engagement: { available: false, value: null, label: 'Not available', reason: 'Predicting engagement needs AI and audience history — not estimated.' },
    readability,
  };

  // ---------- recommendations ----------
  const recText: Record<string, string> = {
    caption_len: `Adjust caption to ${rules.idealCaption[0]}–${rules.idealCaption[1]} characters for ${rules.label}`,
    hook: 'Start with a short hook — a question or bold statement',
    cta: 'Add a clear call-to-action (ask to comment, share or follow)',
    caps: 'Reduce ALL-CAPS text',
    emoji: emojis === 0 ? 'Add 1–3 relevant emojis' : 'Use fewer emojis',
    sentence_len: 'Use shorter sentences (under 20 words)',
    hashtags: `Use ${rules.idealHashtags[0]}–${rules.idealHashtags[1]} relevant hashtags`,
    title: 'Write a 20–70 character title',
    kw_title: top ? `Put “${top.term}” in the title` : 'Add a keyword to the title',
    kw_first: top ? `Mention “${top.term}” in the first line` : 'Mention your keyword early',
    resolution: 'Upload at least 1080p for sharper playback',
    duration: rules.videoIdealSec ? `Trim to ${fmtDuration(rules.videoIdealSec[0])}–${fmtDuration(rules.videoIdealSec[1])}` : 'Adjust video length',
    url_desc: 'Write a 50–160 character meta description',
    url_h1: 'Use exactly one H1 heading',
    url_canon: 'Add a canonical link tag',
  };
  const recommendations = checks
    .filter((c) => (c.status === 'needs_work' || c.status === 'fair') && recText[c.id])
    .map((c) => ({ id: c.id, text: recText[c.id], priority: (c.status === 'needs_work' ? 'high' : 'medium') as 'high' | 'medium', category: c.category }));
  if (!checks.some((c) => c.id === 'grammar' && c.status !== 'unavailable')) recommendations.push({ id: 'ai_grammar', text: 'Run AI Improve to check grammar and tone', priority: 'low' as any, category: 'content' });

  return {
    version: 1, engine: 'local-rules-v1', analyzedAt: new Date().toISOString(),
    input: { ...input }, thumbDataUrl: thumbDataUrl || null,
    stats: { chars: text.length, words: words.length, sentences, avgWordsPerSentence: Math.round(avgWps * 10) / 10, hashtags, mentions, emojis, links, questions, exclamations, capsRatio: Math.round(capsRatio * 100) / 100, script },
    keywords, scores, checks, recommendations,
  };
}

export const overallOf = (r: AnalysisResult) => {
  const v = [r.scores.quality, r.scores.seo, r.scores.readability].filter((s) => s.available).map((s) => s.value as number);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

export function fmtBytes(n: number) { if (!n) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; const i = Math.min(3, Math.floor(Math.log(n) / Math.log(1024))); return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`; }
export function fmtDuration(s: number) { s = Math.round(s); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
export const fmtCount = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

/** Read real metadata from a local file in the browser + a small thumbnail. */
export function readMediaFile(file: File): Promise<{ meta: MediaMeta; previewUrl: string; thumb: string | null }> {
  const kind: MediaMeta['kind'] = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other';
  const previewUrl = URL.createObjectURL(file);
  const base: MediaMeta = { kind, name: file.name, mime: file.type || 'unknown', sizeBytes: file.size };
  const thumbOf = (el: CanvasImageSource, w: number, h: number) => {
    try { const c = document.createElement('canvas'); const s = 240 / Math.max(w, h); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s)); c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); } catch { return null; }
  };
  return new Promise((resolve) => {
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => resolve({ meta: { ...base, width: img.naturalWidth, height: img.naturalHeight }, previewUrl, thumb: thumbOf(img, img.naturalWidth, img.naturalHeight) });
      img.onerror = () => resolve({ meta: base, previewUrl, thumb: null });
      img.src = previewUrl;
    } else if (kind === 'video') {
      const v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      let done = false;
      const finish = (thumb: string | null) => { if (done) return; done = true; resolve({ meta: { ...base, width: v.videoWidth || undefined, height: v.videoHeight || undefined, durationSec: Number.isFinite(v.duration) ? v.duration : undefined }, previewUrl, thumb }); };
      v.onloadedmetadata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 2); } catch { finish(null); } };
      v.onseeked = () => finish(thumbOf(v, v.videoWidth, v.videoHeight));
      v.onerror = () => finish(null);
      setTimeout(() => finish(null), 6000);
      v.src = previewUrl;
    } else resolve({ meta: base, previewUrl, thumb: null });
  });
}

// ---------- API ----------
const headers = (json = false) => { const t = useStore.getState().token; return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) }; };
async function req<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, init); const txt = await r.text(); let b: any; try { b = txt ? JSON.parse(txt) : null; } catch { b = { error: txt }; }
  if (!r.ok) { const e: any = new Error(b?.error || `Request failed (${r.status})`); e.status = r.status; e.code = b?.code; throw e; }
  return b as T;
}
export interface SavedSummary { id: string; title: string; sourceType: SourceType; platform: Platform; thumbnailUrl: string | null; overallScore: number | null; createdAt: string }
export const listAnalyses = (limit = 20, q = '') => req<{ items: SavedSummary[] }>(`/api/content-analysis?limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`, { headers: headers() });
export const getAnalysis = (id: string) => req<SavedSummary & { result: AnalysisResult }>(`/api/content-analysis/${id}`, { headers: headers() });
export const deleteAnalysis = (id: string) => req<any>(`/api/content-analysis/${id}`, { method: 'DELETE', headers: headers() });
export const saveAnalysis = (r: AnalysisResult) => req<{ id: string }>('/api/content-analysis', { method: 'POST', headers: headers(true), body: JSON.stringify({ title: r.input.title || r.input.media?.name || 'Untitled', sourceType: r.input.sourceType, platform: r.input.platform, overallScore: overallOf(r), result: r }) });
export const fetchPerformance = () => req<{ items: { id: string; kind: 'video' | 'post'; title: string; thumbnailUrl: string | null; createdAt: string; views: number; likes: number; comments: number; shares: number; durationSec?: number }[] }>('/api/content-analysis/performance', { headers: headers() });
export const fetchUrlMeta = (url: string) => req<any>(`/api/content-analysis/url-meta?url=${encodeURIComponent(url)}`, { headers: headers() });
export const fetchAiStatus = () => req<{ configured: boolean; reason: string | null }>('/api/content-analysis/ai-status', { headers: headers() });
export const aiImprove = (content: string, action: string, language?: string) => req<{ content: string; model: string }>('/api/ai/improve-content', { method: 'POST', headers: headers(true), body: JSON.stringify({ content, action, language }) });

// ---------- Report ----------
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export function downloadReport(r: AnalysisResult) {
  const sc = (s: Score) => s.available ? `${s.value}/100 — ${s.label}` : `Not available — ${s.reason || ''}`;
  const rows = r.checks.map((c) => `<tr><td>${esc(c.label)}</td><td class="s ${c.status}">${esc(c.status.replace('_', ' '))}</td><td>${esc(c.detail)}</td></tr>`).join('');
  const recs = r.recommendations.map((x) => `<li><b>${esc(x.priority)}</b> · ${esc(x.text)}</li>`).join('');
  const m = r.input.media;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Content Analysis — ${esc(r.input.title)}</title><style>body{font:14px/1.5 system-ui,Segoe UI,sans-serif;max-width:860px;margin:32px auto;color:#0f172a;padding:0 16px}h1{margin:0}small{color:#64748b}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.c{border:1px solid #e2e8f0;border-radius:12px;padding:12px}.c b{display:block;font-size:22px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}.s{text-transform:capitalize;font-weight:600}.excellent,.good{color:#16a34a}.fair{color:#d97706}.needs_work{color:#dc2626}.unavailable{color:#94a3b8}</style></head><body>
<h1>Content Analysis Report</h1><small>Wevsoft · ${esc(new Date(r.analyzedAt).toLocaleString())} · engine ${esc(r.engine)} (local, rule-based)</small>
<h2>${esc(r.input.title || 'Untitled')}</h2><p>${esc(r.input.text).replace(/\n/g, '<br>')}</p>
<p><small>Platform: ${esc(PLATFORM_RULES[r.input.platform].label)} · Source: ${esc(r.input.sourceType)}${m ? ` · ${esc(m.name)} · ${esc(m.mime)} · ${m.width ? `${m.width}×${m.height}` : ''} ${m.durationSec ? fmtDuration(m.durationSec) : ''} · ${fmtBytes(m.sizeBytes)}` : ''}${r.input.url ? ` · ${esc(r.input.url)}` : ''}</small></p>
<div class="g"><div class="c">Content Quality<b>${esc(sc(r.scores.quality))}</b></div><div class="c">SEO<b>${esc(sc(r.scores.seo))}</b></div><div class="c">Engagement Potential<b>${esc(sc(r.scores.engagement))}</b></div><div class="c">Readability<b>${esc(sc(r.scores.readability))}</b></div></div>
<h3>Checks</h3><table><tr><th>Check</th><th>Status</th><th>Detail</th></tr>${rows}</table>
<h3>Keywords</h3><p>${r.keywords.map((k) => `${esc(k.term)} (${k.count})`).join(', ') || '—'}</p>
<h3>Recommendations</h3><ul>${recs || '<li>No issues found.</li>'}</ul>
<p><small>Scores are deterministic rule checks computed from the content itself. Engagement prediction, grammar and sentiment require AI/audience data and are not estimated.</small></p></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `content-analysis-${(r.input.title || 'report').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}.html`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
