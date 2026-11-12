/**
 * Media Studio "pro" helpers: video edit list math, photo retouch / background processing
 * (real canvas + MediaPipe selfie segmentation), overlay rendering for video, and the
 * server render / auto-caption API client.
 */
import {
  aspectRatioOf, isRectFull, loadImage, type Caption, type MediaEdit, type Segment, type StickerLayer, type TextLayer,
} from './mediaStudioModel';

// ---------------- edit list ----------------
export function effectiveSegments(e: MediaEdit, duration: number): Segment[] {
  if (e.segments && e.segments.length) return e.segments;
  const end = e.trimEnd ?? duration;
  return [{ id: 's0', start: e.trimStart || 0, end: end > 0 ? end : duration }];
}
export const segLen = (segs: Segment[]) => segs.reduce((t, s) => t + Math.max(0, s.end - s.start), 0);

/** Output time → (segment index, source time). */
export function outToSrc(segs: Segment[], speed: number, tOut: number): { i: number; src: number } {
  let rem = Math.max(0, tOut * speed);
  for (let i = 0; i < segs.length; i++) {
    const len = segs[i].end - segs[i].start;
    if (rem < len || i === segs.length - 1) return { i, src: segs[i].start + Math.min(rem, Math.max(0, len - 0.02)) };
    rem -= len;
  }
  return { i: 0, src: segs[0]?.start || 0 };
}
export function srcToOut(segs: Segment[], speed: number, i: number, src: number): number {
  let acc = 0;
  for (let j = 0; j < i && j < segs.length; j++) acc += segs[j].end - segs[j].start;
  const s = segs[i];
  if (!s) return 0;
  return (acc + Math.min(Math.max(0, src - s.start), s.end - s.start)) / speed;
}
/** Map a source-time cue onto the output timeline (first segment containing it). */
export function mapSourceCue(segs: Segment[], speed: number, start: number, end: number): { start: number; end: number } | null {
  let acc = 0;
  for (const s of segs) {
    const a = Math.max(start, s.start);
    const b = Math.min(end, s.end);
    if (b - a > 0.1) return { start: (acc + a - s.start) / speed, end: (acc + b - s.start) / speed };
    acc += s.end - s.start;
  }
  return null;
}
export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------------- photo processing ----------------
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function skinSmooth(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number) {
  const orig = ctx.getImageData(0, 0, W, H);
  const bc = document.createElement('canvas');
  bc.width = W;
  bc.height = H;
  const b = bc.getContext('2d')!;
  const r = Math.max(1, Math.round((Math.min(W, H) / 220) * (0.6 + (amount / 100) * 1.8)));
  b.filter = `blur(${r}px)`;
  b.drawImage(ctx.canvas, 0, 0);
  const bl = b.getImageData(0, 0, W, H).data;
  const o = orig.data;
  const k = amount / 100;
  for (let i = 0; i < o.length; i += 4) {
    const R = o[i], G = o[i + 1], B = o[i + 2];
    const cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
    const cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
    const skin = clamp01(Math.min(cb - 77, 127 - cb, cr - 133, 173 - cr) / 6);
    if (skin <= 0) continue;
    const diff = (Math.abs(R - bl[i]) + Math.abs(G - bl[i + 1]) + Math.abs(B - bl[i + 2])) / 3;
    const edge = 1 - clamp01((diff - 6) / 28); // keep eyes / edges / hair sharp
    const w = k * skin * edge * 0.92;
    o[i] = R + (bl[i] - R) * w;
    o[i + 1] = G + (bl[i + 1] - G) * w;
    o[i + 2] = B + (bl[i + 2] - B) * w;
  }
  ctx.putImageData(orig, 0, 0);
}

function healSpot(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, r: number) {
  const R2 = Math.ceil(r * 1.6);
  const x0 = Math.max(0, Math.floor(cx - R2)), y0 = Math.max(0, Math.floor(cy - R2));
  const x1 = Math.min(W, Math.ceil(cx + R2)), y1 = Math.min(H, Math.ceil(cy + R2));
  if (x1 <= x0 || y1 <= y0) return;
  const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data;
  const w = x1 - x0;
  let sr = 0, sg = 0, sb = 0, n = 0, dr = 0, dg = 0, db = 0, dn = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const i = ((y - y0) * w + (x - x0)) * 4;
      if (dist >= r && dist <= R2) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; }
      else if (dist < r) { dr += d[i]; dg += d[i + 1]; db += d[i + 2]; dn++; }
    }
  if (!n || !dn) return;
  const ar = sr / n, ag = sg / n, ab = sb / n;
  const mr = dr / dn, mg = dg / dn, mb = db / dn;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const t = Math.hypot(x - cx, y - cy) / r;
      if (t >= 1) continue;
      const wgt = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      const i = ((y - y0) * w + (x - x0)) * 4;
      // replace the blemish with surrounding skin tone, keep a little texture
      const tr = ar + (d[i] - mr) * 0.25, tg = ag + (d[i + 1] - mg) * 0.25, tb = ab + (d[i + 2] - mb) * 0.25;
      d[i] += (tr - d[i]) * wgt;
      d[i + 1] += (tg - d[i + 1]) * wgt;
      d[i + 2] += (tb - d[i + 2]) * wgt;
    }
  ctx.putImageData(img, x0, y0);
}

function fixRedEye(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, r: number) {
  const x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(W, Math.ceil(cx + r)), y1 = Math.min(H, Math.ceil(cy + r));
  if (x1 <= x0 || y1 <= y0) return;
  const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data;
  const w = x1 - x0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const t = Math.hypot(x - cx, y - cy) / r;
      if (t >= 1) continue;
      const i = ((y - y0) * w + (x - x0)) * 4;
      const R = d[i], G = d[i + 1], B = d[i + 2];
      const mx = Math.max(G, B);
      // only strongly saturated red (pupil glare), never normal skin tones
      if (R > 70 && R > 2 * mx && R - mx > 60) {
        const fall = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        const target = Math.min(mx, (G + B) / 2 + 10);
        d[i] = R + (target - R) * fall;
        d[i + 1] = G * (1 - 0.15 * fall);
        d[i + 2] = B * (1 - 0.15 * fall);
      }
    }
  ctx.putImageData(img, x0, y0);
}

let segmenterPromise: Promise<any> | null = null;
function getSegmenter(): Promise<any> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks('/studio-ml/wasm');
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/studio-ml/selfie_segmenter.tflite', delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })();
    segmenterPromise.catch(() => {
      segmenterPromise = null;
    });
  }
  return segmenterPromise;
}

const maskCache = new Map<string, { canvas: HTMLCanvasElement; coverage: number }>();

/** Person mask (alpha = person confidence) as a canvas, plus coverage 0..1. */
async function personMask(src: HTMLCanvasElement, cacheKey: string) {
  const hit = maskCache.get(cacheKey);
  if (hit) return hit;
  const seg = await getSegmenter();
  const S = Math.min(1, 512 / Math.max(src.width, src.height));
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(src.width * S));
  small.height = Math.max(1, Math.round(src.height * S));
  small.getContext('2d')!.drawImage(src, 0, 0, small.width, small.height);
  const res = seg.segment(small);
  const m = res.confidenceMasks?.[0];
  if (!m) throw new Error('Segmentation returned no mask');
  const arr: Float32Array = m.getAsFloat32Array();
  const mw = m.width, mh = m.height;
  const mc = document.createElement('canvas');
  mc.width = mw;
  mc.height = mh;
  const mctx = mc.getContext('2d')!;
  const id = mctx.createImageData(mw, mh);
  let cov = 0;
  for (let i = 0; i < arr.length; i++) {
    const a = clamp01((arr[i] - 0.25) / 0.5);
    cov += a;
    id.data[i * 4] = 255;
    id.data[i * 4 + 1] = 255;
    id.data[i * 4 + 2] = 255;
    id.data[i * 4 + 3] = Math.round(a * 255);
  }
  mctx.putImageData(id, 0, 0);
  try { res.close?.(); } catch { /* ignore */ }
  const out = { canvas: mc, coverage: cov / arr.length };
  if (maskCache.size > 12) maskCache.clear();
  maskCache.set(cacheKey, out);
  return out;
}

export type PhotoProcessInfo = { personCoverage: number | null; error: string | null };

/** Orientation + retouch + background replacement → object URL of the working image. */
export async function processPhoto(src: string, e: MediaEdit): Promise<{ url: string; info: PhotoProcessInfo }> {
  const info: PhotoProcessInfo = { personCoverage: null, error: null };
  const rt = e.retouch;
  const needs = e.rotation || e.flipH || rt.smooth > 0 || rt.spots.length || rt.redEye.length || e.background.mode !== 'none';
  if (!needs) return { url: src, info };
  const img = await loadImage(src);
  const swap = e.rotation === 90 || e.rotation === 270;
  const c = document.createElement('canvas');
  c.width = swap ? img.naturalHeight : img.naturalWidth;
  c.height = swap ? img.naturalWidth : img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.save();
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((e.rotation * Math.PI) / 180);
  if (e.flipH) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
  const W = c.width, H = c.height, base = Math.min(W, H);

  if (e.background.mode !== 'none') {
    try {
      const { canvas: mask, coverage } = await personMask(c, `${src}|${e.rotation}|${e.flipH}`);
      info.personCoverage = coverage;
      const person = document.createElement('canvas');
      person.width = W;
      person.height = H;
      const p = person.getContext('2d')!;
      p.drawImage(c, 0, 0);
      p.globalCompositeOperation = 'destination-in';
      p.filter = `blur(${Math.max(1, Math.round(base / 400))}px)`;
      p.drawImage(mask, 0, 0, W, H);
      p.filter = 'none';
      p.globalCompositeOperation = 'source-over';
      const bg = document.createElement('canvas');
      bg.width = W;
      bg.height = H;
      const g = bg.getContext('2d')!;
      if (e.background.mode === 'blur') {
        g.filter = `blur(${Math.max(2, Math.round((base / 30) * (e.background.amount / 100)))}px)`;
        g.drawImage(c, 0, 0);
        g.filter = 'none';
      } else {
        g.fillStyle = /^#[0-9a-f]{6}$/i.test(e.background.color) ? e.background.color : '#ffffff';
        g.fillRect(0, 0, W, H);
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0);
      ctx.drawImage(person, 0, 0);
    } catch (err: any) {
      info.error = `Background segmentation unavailable: ${err?.message || 'failed to load model'}`;
    }
  }
  if (rt.smooth > 0) skinSmooth(ctx, W, H, rt.smooth);
  for (const s of rt.spots) healSpot(ctx, W, H, s.x * W, s.y * H, Math.max(2, s.r * base));
  for (const s of rt.redEye) fixRedEye(ctx, W, H, s.x * W, s.y * H, Math.max(2, s.r * base));
  const blob: Blob = await new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error('Export failed'))), 'image/png'));
  return { url: URL.createObjectURL(blob), info };
}

// ---------------- video overlays ----------------
type OverlayItem =
  | { kind: 'text'; t: TextLayer }
  | { kind: 'sticker'; s: StickerLayer }
  | { kind: 'caption'; c: Caption };

export function drawCaption(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  const base = Math.min(W, H);
  const px = Math.max(12, Math.round(base * 0.055));
  ctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = W * 0.86;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  const lh = px * 1.3;
  const total = lines.length * lh;
  const yBottom = H * 0.9;
  lines.forEach((l, i) => {
    const y = yBottom - total + lh * (i + 0.5);
    const tw = ctx.measureText(l).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const padX = px * 0.4, padY = px * 0.12;
    ctx.fillRect(W / 2 - tw / 2 - padX, y - lh / 2 + padY / 2, tw + padX * 2, lh - padY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(l, W / 2, y);
  });
}

function drawItems(ctx: CanvasRenderingContext2D, W: number, H: number, items: OverlayItem[]) {
  const base = Math.min(W, H);
  for (const it of items) {
    if (it.kind === 'text') {
      const t = it.t;
      const px = Math.round((t.size / 100) * base);
      ctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, px / 10);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(t.text, t.x * W, t.y * H);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x * W, t.y * H);
    } else if (it.kind === 'sticker') {
      const s = it.s;
      const px = Math.round((s.size / 100) * base);
      ctx.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji, s.x * W, s.y * H);
    } else {
      drawCaption(ctx, W, H, it.c.text);
    }
  }
}

/** Render text / stickers / captions into transparent full-frame PNGs grouped by time window. */
export async function renderVideoOverlays(e: MediaEdit, W: number, H: number): Promise<Array<{ blob: Blob; start: number | null; end: number | null }>> {
  const groups = new Map<string, { start: number | null; end: number | null; items: OverlayItem[] }>();
  const add = (start: number | null | undefined, end: number | null | undefined, item: OverlayItem) => {
    const s = start ?? null, en = end ?? null;
    const k = `${s}|${en}`;
    if (!groups.has(k)) groups.set(k, { start: s, end: en, items: [] });
    groups.get(k)!.items.push(item);
  };
  e.texts.forEach((t) => add(t.start, t.end, { kind: 'text', t }));
  e.stickers.forEach((s) => add(s.start, s.end, { kind: 'sticker', s }));
  e.captions.filter((c) => c.text.trim()).forEach((c) => add(c.start, c.end, { kind: 'caption', c }));
  const out: Array<{ blob: Blob; start: number | null; end: number | null }> = [];
  for (const g of groups.values()) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    drawItems(c.getContext('2d')!, W, H, g.items);
    const blob: Blob = await new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error('Overlay render failed'))), 'image/png'));
    out.push({ blob, start: g.start, end: g.end });
  }
  return out;
}

export function buildVideoSpec(e: MediaEdit, duration: number, overlays: Array<{ url: string; start: number | null; end: number | null }>) {
  const segs = effectiveSegments(e, duration);
  return {
    segments: segs.map((s) => ({ start: s.start, end: s.end })),
    speed: e.speed,
    rotation: e.rotation,
    flipH: e.flipH,
    crop: isRectFull(e.crop) ? null : e.crop,
    aspect: aspectRatioOf(e.aspect),
    fit: e.fit,
    padColor: e.padFill || '#000000',
    adjust: e.adjust,
    preset: e.preset,
    effects: e.effects,
    stabilize: e.stabilize,
    denoise: e.denoise,
    fadeIn: e.fadeIn,
    fadeOut: e.fadeOut,
    audio: {
      volume: (e.volume ?? 100) / 100,
      muted: e.muted,
      fadeIn: e.audioFadeIn,
      fadeOut: e.audioFadeOut,
      musicUrl: e.music?.url || null,
      musicVolume: (e.music?.volume ?? 50) / 100,
    },
    overlays,
  };
}

// ---------------- API ----------------
async function jsonOrThrow(res: Response) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

export async function renderVideoOnServer(
  token: string,
  sourceUrl: string,
  spec: unknown,
  onProgress: (pct: number, stage: string) => void,
): Promise<{ url: string; duration: number; width: number; height: number }> {
  const start = await jsonOrThrow(
    await fetch('/api/media-studio/render', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl, spec }),
    }),
  );
  const jobId = start.jobId as string;
  let misses = 0;
  for (;;) {
    await new Promise((r) => setTimeout(r, 700));
    let j: any;
    try {
      j = await jsonOrThrow(await fetch(`/api/media-studio/render/${jobId}`, { headers: { Authorization: `Bearer ${token}` } }));
      misses = 0;
    } catch (err) {
      if (++misses > 6) throw err;
      continue;
    }
    onProgress(Number(j.progress) || 0, j.stage || '');
    if (j.status === 'done') return j;
    if (j.status === 'error') throw new Error(j.error || 'Render failed');
  }
}

export async function fetchAsFile(url: string, name: string, type = 'video/mp4'): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the rendered file (${res.status})`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || type, lastModified: Date.now() });
}

export async function requestAutoCaptions(token: string, sourceUrl: string): Promise<Array<{ start: number; end: number; text: string }>> {
  const j = await jsonOrThrow(
    await fetch('/api/media-studio/captions/auto', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl }),
    }),
  );
  return Array.isArray(j.captions) ? j.captions : [];
}

/** WebVTT for the caption track (downloadable sidecar). */
export function captionsToVtt(caps: Caption[]): string {
  const ts = (t: number) => {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
  };
  return ['WEBVTT', '', ...[...caps].sort((a, b) => a.start - b.start).flatMap((c, i) => [`${i + 1}`, `${ts(c.start)} --> ${ts(c.end)}`, c.text, ''])].join('\n');
}
