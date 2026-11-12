/**
 * QR code and share-card rendering for a WevSpace (MP3 13).
 *
 * Four decisions worth knowing before editing this file:
 *
 * 1. Everything is produced in the browser, on demand, from a lazily imported
 *    `qrcode`. A public Space link needs no server round trip to encode, and a
 *    QR encoder has no business sitting in the bundle every visitor downloads
 *    (28: nothing loads until it is needed).
 * 2. The card is a real PNG file, not a styled div. "Downloadable" and
 *    "printable" mean a file someone can attach, post or hand to a printer, so
 *    the layout is painted onto a canvas at 1080x1350 (4:5, the portrait size
 *    feeds and stories crop least) and exported.
 * 3. An avatar or cover the canvas cannot read - a remote host that sends no
 *    CORS header - taints the canvas and makes the export throw. So images are
 *    loaded first and only drawn if they arrived readable, and the export itself
 *    retries once without them. A missing photo costs a monogram, never the card.
 * 4. Only what the Space already publishes goes on the card. A follower count of
 *    `null` means the owner switched it off, and it is left out rather than
 *    counted as zero.
 *
 * Look: "quiet luxury" - onyx/navy (Dark) or pearl/ivory (Light) with
 * champagne-gold hairlines and accents, a fine grain, the Wevsoft mark +
 * wordmark in the header and the Space's own photo in a gold-ringed frame.
 */

import {
  formatFollowerCount,
  isVerifiedSpace,
  resolveSpaceAccent,
  spaceTypeLabel,
} from '@wevsoft/shared/wevspace';
import { resolveAvatarUrl } from '../UserAvatar';

/** The public facts a card can show. Satisfied by both card and page payloads. */
export interface SpaceShareSubject {
  name: string;
  handle: string;
  avatar?: string | null;
  /** Cover photo - drawn as a soft, darkened backdrop behind the header. */
  cover?: string | null;
  tagline?: string | null;
  /** Used when there is no tagline. */
  bio?: string | null;
  verificationStatus?: string | null;
  /** null when the Space hides its follower count - then it is omitted. */
  followersCount?: number | null;
  postsCount?: number | null;
  typeLabel?: string | null;
  spaceType?: unknown;
  category?: string | null;
  themePreset?: unknown;
  accentColor?: unknown;
  /** Already-resolved accent, as the public payload provides it. */
  accent?: string | null;
}

export type ShareCardTheme = 'dark' | 'light';

const CARD_W = 1080;
const CARD_H = 1350;
const FRAME = 40;
const PAD = 96;
const FONT = '"Inter", "Segoe UI", Roboto, system-ui, -apple-system, sans-serif';

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

interface Skin {
  bg: [string, string, string];
  ink: string;
  muted: string;
  dim: string;
  /** Champagne-gold ramp, dark to light. */
  gold: [string, string, string, string];
  hair: string;
  glass: string;
  glassEdge: string;
  grain: number;
  veil: [string, string];
}

const SKINS: Record<ShareCardTheme, Skin> = {
  dark: {
    bg: ['#05060A', '#0A0F1D', '#101A2F'],
    ink: '#F7F2E8',
    muted: 'rgba(247,242,232,0.68)',
    dim: 'rgba(247,242,232,0.44)',
    gold: ['#8A6A2E', '#E8CD8C', '#B9934B', '#F7E6B5'],
    hair: 'rgba(232,205,140,0.42)',
    glass: 'rgba(255,255,255,0.05)',
    glassEdge: 'rgba(232,205,140,0.34)',
    grain: 0.06,
    veil: ['rgba(5,6,10,0.6)', 'rgba(5,6,10,1)'],
  },
  light: {
    bg: ['#FEFCF8', '#F7F1E6', '#EEE5D4'],
    ink: '#16171B',
    muted: 'rgba(22,23,27,0.64)',
    dim: 'rgba(22,23,27,0.42)',
    gold: ['#6E5020', '#C29B52', '#94722F', '#DDBF7E'],
    hair: 'rgba(148,114,47,0.45)',
    glass: 'rgba(255,255,255,0.72)',
    glassEdge: 'rgba(148,114,47,0.36)',
    grain: 0.035,
    veil: ['rgba(254,252,248,0.58)', 'rgba(254,252,248,1)'],
  },
};

/** Geometry of the Wevsoft "W" - same artwork as components/auth/WevsoftMark.tsx. */
const MARK_VIEW = { w: 375, h: 186 };
const MARK_SHAPES = [
  '344,5 343,6 338,6 334,7 329,9 324,12 319,16 315,21 312,27 312,36 313,39 315,43 335,67 338,72 342,77 346,81 348,82 350,82 352,81 353,80 360,65 360,63 369,45 373,36 375,29 375,25 373,18 371,15 368,12 365,10 361,8 354,6 349,6 348,5',
  '200,10 194,16 189,25 187,34 187,40 188,45 191,53 201,66 251,127 266,144 283,166 295,179 302,183 308,185 316,186 327,184 336,179 343,172 346,167 349,158 349,147 346,137 334,121 243,11 239,8 233,5 225,3 217,3 212,4',
  '7,9 2,17 0,25 1,36 5,44 12,51 21,55 28,56 61,56 69,60 83,75 91,86 165,176 172,182 182,186 196,186 206,182 215,175 220,168 223,160 223,145 220,137 119,13 110,4 100,0 24,0 13,4',
];

export function shareSubjectAccent(subject: SpaceShareSubject): string {
  return (
    subject.accent ||
    resolveSpaceAccent({ themePreset: subject.themePreset, accentColor: subject.accentColor })
  );
}

/** `#rrggbb` -> `rgba(r,g,b,a)`, so an accent can be used as a soft wash. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(int)) return `rgba(99,102,241,${alpha})`;
  return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${alpha})`;
}

/**
 * Loaded with `crossOrigin` so a remote image fails *here*, where a null is
 * harmless, instead of poisoning the canvas and breaking the export.
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Inter is on the page already; make sure the weights we paint with are ready. */
async function ensureFonts(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? (document as any).fonts : null;
  if (!fonts?.load) return;
  const wanted = ['800 76px Inter', '700 24px Inter', '600 34px Inter', '500 30px Inter'];
  const loading = Promise.all(wanted.map((f) => fonts.load(f).catch(() => null)));
  // Never let a blocked font CDN hold the card hostage.
  await Promise.race([loading, new Promise((r) => setTimeout(r, 1500))]);
  await Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 500))]);
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function setTracking(ctx: Ctx, px: number): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function goldGradient(ctx: Ctx, skin: Skin, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, skin.gold[0]);
  g.addColorStop(0.3, skin.gold[1]);
  g.addColorStop(0.62, skin.gold[2]);
  g.addColorStop(1, skin.gold[3]);
  return g;
}

/** Greedy wrap, capped at `maxLines` with an ellipsis on the last one. */
function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words[0];
  let consumed = 1;
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      consumed = i + 1;
      continue;
    }
    lines.push(line);
    line = words[i];
    consumed = i + 1;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines) lines.push(line);
  const last = lines.length - 1;
  const truncated = consumed < words.length || lines.length > maxLines;
  if (lines.length > maxLines) lines.length = maxLines;
  if (ctx.measureText(lines[last] ?? '').width > maxWidth || (truncated && lines.length === maxLines)) {
    let clipped = lines[lines.length - 1];
    while (clipped.length > 1 && ctx.measureText(`${clipped}\u2026`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    lines[lines.length - 1] = `${clipped.trimEnd()}\u2026`;
  }
  return lines;
}

/** Fine film grain - what keeps big gradients from looking like flat vector fills. */
function paintGrain(ctx: Ctx, alpha: number): void {
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const t = tile.getContext('2d');
  if (!t) return;
  const img = t.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.restore();
}

/**
 * Soft blur without `ctx.filter` (Safari has none): shrink hard, scale back up
 * with smoothing. Cover-fit into the target box.
 */
function drawSoftCover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const small = document.createElement('canvas');
  small.width = 48;
  small.height = Math.max(8, Math.round((48 * h) / w));
  const s = small.getContext('2d');
  if (!s) return;
  const scale = Math.max(small.width / img.width, small.height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  s.drawImage(img, (small.width - dw) / 2, (small.height - dh) / 2, dw, dh);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  ctx.drawImage(small, x - 24, y - 24, w + 48, h + 48);
  ctx.restore();
}

function drawMark(ctx: Ctx, x: number, y: number, height: number): number {
  const scale = height / MARK_VIEW.h;
  const width = MARK_VIEW.w * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const face = ctx.createLinearGradient(0, 0, MARK_VIEW.w, MARK_VIEW.h);
  face.addColorStop(0, '#38bdf8');
  face.addColorStop(0.48, '#2563eb');
  face.addColorStop(1, '#1e40af');
  const gloss = ctx.createLinearGradient(0, 0, MARK_VIEW.w, MARK_VIEW.h);
  gloss.addColorStop(0, 'rgba(255,255,255,0.5)');
  gloss.addColorStop(0.55, 'rgba(255,255,255,0.06)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  const paths = MARK_SHAPES.map((pts) => {
    const p = new Path2D();
    pts.split(' ').forEach((pair, i) => {
      const [px, py] = pair.split(',').map(Number);
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    });
    p.closePath();
    return p;
  });
  for (const p of paths) {
    ctx.save();
    ctx.translate(0, 5);
    ctx.fillStyle = 'rgba(8,20,48,0.55)';
    ctx.fill(p);
    ctx.restore();
  }
  for (const p of paths) {
    ctx.fillStyle = face;
    ctx.fill(p);
    ctx.fillStyle = gloss;
    ctx.fill(p);
  }
  ctx.restore();
  return width;
}

/** The blue tick, drawn rather than fetched so the card needs no extra request. */
function drawVerifiedMark(ctx: Ctx, cx: number, cy: number, r: number, ring: string): void {
  ctx.save();
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, '#4F9BFF');
  g.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(3, r * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.04);
  ctx.lineTo(cx - r * 0.08, cy + r * 0.38);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.34);
  ctx.stroke();
  ctx.restore();
}

function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'W';
  const first = Array.from(parts[0])[0] || '';
  const second = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || '' : '';
  return (first + second).toUpperCase();
}

/** Gold-edged glass pill; returns its width. */
function measurePill(ctx: Ctx, text: string): number {
  ctx.font = `700 22px ${FONT}`;
  setTracking(ctx, 4);
  const w = ctx.measureText(text.toUpperCase()).width + 52;
  setTracking(ctx, 0);
  return w;
}

function drawPill(ctx: Ctx, skin: Skin, x: number, y: number, text: string): void {
  const w = measurePill(ctx, text);
  const h = 52;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = skin.glass;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = skin.glassEdge;
  ctx.stroke();
  ctx.font = `700 22px ${FONT}`;
  setTracking(ctx, 4);
  ctx.fillStyle = goldGradient(ctx, skin, x, y, x + w, y + h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // letterSpacing adds trailing space after the last glyph; centre optically.
  ctx.fillText(text.toUpperCase(), x + 26 + 2, y + h / 2 + 1);
  setTracking(ctx, 0);
}

interface QrOptions {
  width?: number;
  margin?: number;
}

/**
 * Kept black-on-white regardless of the card theme: a tinted QR looks smarter
 * and scans worse, and this one exists to be scanned off a phone or a poster.
 */
export async function buildSpaceQrPng(url: string, options: QrOptions = {}): Promise<string> {
  const mod: any = await import('qrcode');
  const api = mod?.default || mod;
  return api.toDataURL(url, {
    width: options.width || 1024,
    margin: options.margin ?? 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B0B0FFF', light: '#FFFFFFFF' },
  });
}

function paintCard(
  canvas: HTMLCanvasElement,
  subject: SpaceShareSubject,
  theme: ShareCardTheme,
  url: string,
  qr: HTMLImageElement | null,
  avatar: HTMLImageElement | null,
  cover: HTMLImageElement | null,
): void {
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new Error('This browser cannot draw the card.');
  const skin = SKINS[theme];
  const dark = theme === 'dark';
  const accent = shareSubjectAccent(subject);
  const verified = isVerifiedSpace(subject.verificationStatus);
  const cx = CARD_W / 2;

  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // -- Ground ---------------------------------------------------------------
  const ground = ctx.createLinearGradient(0, 0, CARD_W * 0.35, CARD_H);
  ground.addColorStop(0, skin.bg[0]);
  ground.addColorStop(0.55, skin.bg[1]);
  ground.addColorStop(1, skin.bg[2]);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const heroH = 600;
  if (cover) {
    // Soft cover + tint on its own layer, then faded out with an alpha mask so it
    // melts into the ground instead of ending on a visible edge.
    const layer = document.createElement('canvas');
    layer.width = CARD_W;
    layer.height = heroH;
    const l = layer.getContext('2d');
    if (l) {
      drawSoftCover(l as Ctx, cover, 0, 0, CARD_W, heroH);
      l.fillStyle = skin.veil[0];
      l.fillRect(0, 0, CARD_W, heroH);
      l.globalCompositeOperation = 'destination-in';
      const fade = l.createLinearGradient(0, 0, 0, heroH);
      fade.addColorStop(0, 'rgba(0,0,0,0.95)');
      fade.addColorStop(0.45, 'rgba(0,0,0,0.7)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = fade;
      l.fillRect(0, 0, CARD_W, heroH);
      ctx.drawImage(layer, 0, 0);
    }
  }

  // The Space's accent as one soft halo behind the portrait - personal, not loud.
  const halo = ctx.createRadialGradient(cx, 360, 20, cx, 360, 520);
  halo.addColorStop(0, hexToRgba(accent, dark ? 0.34 : 0.16));
  halo.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Champagne glow low on the card, under the scan panel.
  const glow = ctx.createRadialGradient(CARD_W * 0.18, CARD_H * 0.98, 10, CARD_W * 0.18, CARD_H * 0.98, 720);
  glow.addColorStop(0, dark ? 'rgba(232,205,140,0.16)' : 'rgba(194,155,82,0.14)');
  glow.addColorStop(1, 'rgba(232,205,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  paintGrain(ctx, skin.grain);

  // -- Frame: a single gold hairline, inset like a printed invitation ------
  ctx.save();
  roundRectPath(ctx, FRAME, FRAME, CARD_W - FRAME * 2, CARD_H - FRAME * 2, 44);
  ctx.lineWidth = 2;
  ctx.strokeStyle = goldGradient(ctx, skin, FRAME, FRAME, CARD_W - FRAME, CARD_H - FRAME);
  ctx.globalAlpha = dark ? 0.7 : 0.8;
  ctx.stroke();
  ctx.restore();

  // -- Header: Wevsoft mark + wordmark, WEVSPACE label ----------------------
  const headY = 92;
  const markH = 38;
  const markW = drawMark(ctx, PAD, headY, markH);
  ctx.font = `800 38px ${FONT}`;
  setTracking(ctx, -0.5);
  ctx.fillStyle = skin.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText('Wevsoft', PAD + markW + 16, headY + markH / 2 + 1);
  setTracking(ctx, 0);

  ctx.font = `700 20px ${FONT}`;
  setTracking(ctx, 6);
  ctx.textAlign = 'right';
  const label = 'WEVSPACE';
  ctx.fillStyle = goldGradient(ctx, skin, CARD_W - PAD - 160, headY, CARD_W - PAD, headY + markH);
  ctx.fillText(label, CARD_W - PAD + 6, headY + markH / 2 + 1);
  const labelW = ctx.measureText(label).width;
  setTracking(ctx, 0);
  ctx.textAlign = 'left';
  // Small gold rule leading into the label.
  ctx.fillStyle = skin.hair;
  ctx.fillRect(CARD_W - PAD - labelW - 44, headY + markH / 2, 30, 1.5);

  // -- Scan panel (anchored to the bottom) ----------------------------------
  const footY = CARD_H - FRAME - 52;
  const panelH = 280;
  const panelY = footY - 44 - panelH;
  const panelX = PAD;
  const panelW = CARD_W - PAD * 2;

  // -- Identity block, laid out to fit between header and panel -------------
  const top = headY + markH + 48;
  const bottom = panelY - 44;
  const nameMax = CARD_W - PAD * 2 - (verified ? 70 : 0);

  const typeText = subject.typeLabel || spaceTypeLabel(subject.spaceType) || '';
  const pills = [typeText, subject.category || ''].filter((t, i, all) => t && all.indexOf(t) === i);
  const about = (subject.tagline || subject.bio || '').replace(/\s+/g, ' ').trim();
  const stats: Array<[string, string]> = [];
  // A brand-new Space saying "0 followers" is worse than saying nothing.
  if (typeof subject.followersCount === 'number' && subject.followersCount > 0) {
    stats.push([formatFollowerCount(subject.followersCount), 'Followers']);
  }
  if (typeof subject.postsCount === 'number' && subject.postsCount > 0) {
    stats.push([formatFollowerCount(subject.postsCount), 'Posts']);
  }

  let nameSize = 74;
  ctx.font = `800 ${nameSize}px ${FONT}`;
  setTracking(ctx, -1);
  let nameLines = wrapText(ctx, subject.name || 'WevSpace', nameMax, 2);
  if (nameLines.length > 1) {
    nameSize = 62;
    ctx.font = `800 ${nameSize}px ${FONT}`;
    nameLines = wrapText(ctx, subject.name || 'WevSpace', nameMax, 2);
  }
  setTracking(ctx, 0);
  const nameLead = Math.round(nameSize * 1.12);

  ctx.font = `500 29px ${FONT}`;
  let aboutLines = about ? wrapText(ctx, about, CARD_W - PAD * 2 - 80, 2) : [];

  let avatarR = 132;
  const blockHeight = () =>
    avatarR * 2 + 28 + // portrait + ring
    34 +
    nameLines.length * nameLead +
    14 + 40 + // handle
    (pills.length ? 30 + 52 : 0) +
    (aboutLines.length ? 30 + aboutLines.length * 42 : 0) +
    (stats.length ? 34 + 62 : 0);
  const avail = bottom - top;
  let showStats = stats.length > 0;
  if (blockHeight() > avail) avatarR = 112;
  if (blockHeight() > avail) avatarR = 96;
  if (blockHeight() > avail && aboutLines.length > 1) {
    ctx.font = `500 29px ${FONT}`;
    aboutLines = wrapText(ctx, about, CARD_W - PAD * 2 - 80, 1);
  }
  if (blockHeight() > avail && showStats) {
    showStats = false;
    stats.length = 0;
  }
  if (blockHeight() > avail) aboutLines = [];

  let y = top + Math.max(0, (avail - blockHeight()) / 2);

  // Portrait with a champagne ring.
  const ringR = avatarR + 14;
  const acy = y + ringR;
  ctx.save();
  ctx.shadowColor = dark ? 'rgba(0,0,0,0.55)' : 'rgba(60,40,10,0.22)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = dark ? '#0B0F1C' : '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, acy, ringR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const conic = (ctx as any).createConicGradient
    ? (ctx as any).createConicGradient(-Math.PI / 3, cx, acy)
    : null;
  let ringFill: CanvasGradient;
  if (conic) {
    conic.addColorStop(0, skin.gold[3]);
    conic.addColorStop(0.25, skin.gold[2]);
    conic.addColorStop(0.5, skin.gold[1]);
    conic.addColorStop(0.75, skin.gold[0]);
    conic.addColorStop(1, skin.gold[3]);
    ringFill = conic;
  } else {
    ringFill = goldGradient(ctx, skin, cx - ringR, acy - ringR, cx + ringR, acy + ringR);
  }
  ctx.lineWidth = 7;
  ctx.strokeStyle = ringFill;
  ctx.beginPath();
  ctx.arc(cx, acy, avatarR + 7, 0, Math.PI * 2);
  ctx.stroke();
  // Outer hairline orbit.
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = skin.hair;
  ctx.beginPath();
  ctx.arc(cx, acy, ringR + 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, acy, avatarR, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    // Cover-fit: crop the long side instead of squashing the photo.
    const scale = Math.max((avatarR * 2) / avatar.width, (avatarR * 2) / avatar.height);
    const w = avatar.width * scale;
    const h = avatar.height * scale;
    ctx.drawImage(avatar, cx - w / 2, acy - h / 2, w, h);
  } else {
    const mono = ctx.createLinearGradient(cx - avatarR, acy - avatarR, cx + avatarR, acy + avatarR);
    mono.addColorStop(0, dark ? '#1A2340' : '#20283F');
    mono.addColorStop(1, dark ? '#070A14' : '#0D1120');
    ctx.fillStyle = mono;
    ctx.fillRect(cx - avatarR, acy - avatarR, avatarR * 2, avatarR * 2);
    const sheen = ctx.createRadialGradient(cx - avatarR * 0.4, acy - avatarR * 0.5, 4, cx, acy, avatarR * 1.2);
    sheen.addColorStop(0, hexToRgba(accent, 0.45));
    sheen.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = sheen;
    ctx.fillRect(cx - avatarR, acy - avatarR, avatarR * 2, avatarR * 2);
    const letters = initials(subject.name);
    ctx.font = `800 ${Math.round(avatarR * (letters.length > 1 ? 0.78 : 0.95))}px ${FONT}`;
    setTracking(ctx, letters.length > 1 ? 2 : 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = goldGradient(ctx, SKINS.dark, cx - avatarR, acy - avatarR, cx + avatarR, acy + avatarR);
    ctx.fillText(letters, cx + (letters.length > 1 ? 1 : 0), acy + avatarR * 0.05);
    setTracking(ctx, 0);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  y = acy + ringR + 34;

  // Name (+ verified tick after the last line).
  ctx.font = `800 ${nameSize}px ${FONT}`;
  setTracking(ctx, -1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  nameLines.forEach((line, index) => {
    const baseline = y + nameSize * 0.92;
    const w = ctx.measureText(line).width;
    const isLast = index === nameLines.length - 1;
    const shift = verified && isLast ? 30 : 0;
    ctx.fillStyle = skin.ink;
    ctx.fillText(line, cx - shift, baseline);
    if (verified && isLast) {
      drawVerifiedMark(ctx, cx - shift + w / 2 + 38, baseline - nameSize * 0.34, 22, dark ? '#0A0F1D' : '#FFFFFF');
    }
    y += nameLead;
  });
  setTracking(ctx, 0);

  // Handle in gold.
  y += 14;
  ctx.font = `600 34px ${FONT}`;
  setTracking(ctx, 0.5);
  const handle = `@${subject.handle}`;
  const hw = ctx.measureText(handle).width;
  ctx.fillStyle = goldGradient(ctx, skin, cx - hw / 2, y, cx + hw / 2, y + 40);
  ctx.fillText(handle, cx, y + 32);
  setTracking(ctx, 0);
  y += 40;

  // Pills.
  if (pills.length) {
    y += 30;
    const widths = pills.map((p) => measurePill(ctx, p));
    const total = widths.reduce((a, b) => a + b, 0) + (pills.length - 1) * 14;
    let px = cx - total / 2;
    pills.forEach((p, i) => {
      drawPill(ctx, skin, px, y, p);
      px += widths[i] + 14;
    });
    y += 52;
  }

  // About.
  if (aboutLines.length) {
    y += 30;
    ctx.font = `500 29px ${FONT}`;
    ctx.fillStyle = skin.muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const line of aboutLines) {
      ctx.fillText(line, cx, y + 30);
      y += 42;
    }
  }

  // Stats: number over tracked label, gold diamond between.
  if (showStats && stats.length) {
    y += 34;
    const colW = 220;
    const startX = cx - ((stats.length - 1) * colW) / 2;
    stats.forEach(([num, lab], i) => {
      const sx = startX + i * colW;
      ctx.textAlign = 'center';
      ctx.font = `800 36px ${FONT}`;
      ctx.fillStyle = skin.ink;
      ctx.fillText(num, sx, y + 34);
      ctx.font = `700 17px ${FONT}`;
      setTracking(ctx, 4);
      ctx.fillStyle = skin.dim;
      ctx.fillText(lab.toUpperCase(), sx + 2, y + 60);
      setTracking(ctx, 0);
      if (i > 0) {
        const dx = sx - colW / 2;
        ctx.save();
        ctx.translate(dx, y + 30);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = skin.gold[1];
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    });
    y += 62;
  }
  ctx.textAlign = 'left';

  // -- Scan panel -----------------------------------------------------------
  ctx.save();
  ctx.shadowColor = dark ? 'rgba(0,0,0,0.45)' : 'rgba(60,40,10,0.12)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRectPath(ctx, panelX, panelY, panelW, panelH, 36);
  ctx.fillStyle = dark ? 'rgba(14,20,36,0.72)' : 'rgba(255,255,255,0.82)';
  ctx.fill();
  ctx.restore();
  roundRectPath(ctx, panelX, panelY, panelW, panelH, 36);
  ctx.fillStyle = skin.glass;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = goldGradient(ctx, skin, panelX, panelY, panelX + panelW, panelY + panelH);
  ctx.globalAlpha = 0.75;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const tile = panelH - 48;
  const tileX = panelX + 24;
  const tileY = panelY + 24;
  roundRectPath(ctx, tileX, tileY, tile, tile, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = skin.glassEdge;
  ctx.stroke();
  if (qr) {
    const inset = 14;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, tileX + inset, tileY + inset, tile - inset * 2, tile - inset * 2);
    ctx.imageSmoothingEnabled = true;
  }

  const textX = tileX + tile + 44;
  const textW = panelX + panelW - 36 - textX;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 20px ${FONT}`;
  setTracking(ctx, 6);
  ctx.fillStyle = goldGradient(ctx, skin, textX, 0, textX + 240, 0);
  ctx.fillText('SCAN TO VISIT', textX, panelY + 72);
  setTracking(ctx, 0);

  // The address is the whole point of the card, so it shrinks to fit rather than
  // ending in an ellipsis. Long handles and long hosts both land here.
  const shown = url.replace(/^https?:\/\//i, '');
  const slash = shown.indexOf('/');
  const host = slash > 0 ? shown.slice(0, slash) : shown;
  const path = slash > 0 ? shown.slice(slash) : '';
  let urlSize = 34;
  for (const size of [34, 31, 28, 25, 22]) {
    urlSize = size;
    ctx.font = `800 ${size}px ${FONT}`;
    if (Math.max(ctx.measureText(host).width, ctx.measureText(path).width) <= textW) break;
  }
  ctx.font = `600 ${urlSize}px ${FONT}`;
  ctx.fillStyle = skin.muted;
  ctx.fillText(host, textX, panelY + 124);
  if (path) {
    ctx.font = `800 ${urlSize}px ${FONT}`;
    ctx.fillStyle = skin.ink;
    ctx.fillText(path, textX, panelY + 124 + urlSize * 1.25);
  }

  ctx.fillStyle = skin.hair;
  ctx.fillRect(textX, panelY + panelH - 92, 56, 1.5);
  ctx.font = `500 23px ${FONT}`;
  ctx.fillStyle = skin.dim;
  const hint = wrapText(ctx, 'Open your camera and point it at the code.', textW, 2);
  hint.forEach((line, i) => ctx.fillText(line, textX, panelY + panelH - 56 + i * 30));

  // -- Footer ---------------------------------------------------------------
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 17px ${FONT}`;
  setTracking(ctx, 5);
  ctx.fillStyle = skin.dim;
  const foot = 'A WEVSPACE ON WEVSOFT';
  const fw = ctx.measureText(foot).width;
  ctx.fillText(foot, cx + 2, footY);
  setTracking(ctx, 0);
  ctx.fillStyle = skin.hair;
  ctx.fillRect(cx - fw / 2 - 64, footY, 40, 1.5);
  ctx.fillRect(cx + fw / 2 + 24, footY, 40, 1.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * The finished card as a PNG data URL. The retry without photos covers the
 * one failure this can hit in practice: an image the browser had already cached
 * without CORS headers, which taints the canvas only at export time.
 */
export async function buildSpaceCardPng(
  subject: SpaceShareSubject,
  theme: ShareCardTheme,
  url: string,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  const avatarUrl = resolveAvatarUrl(subject.avatar || null);
  const coverUrl = resolveAvatarUrl(subject.cover || null);
  const [qrDataUrl, avatar, cover] = await Promise.all([
    buildSpaceQrPng(url, { width: 768, margin: 1 }),
    avatarUrl ? loadImage(avatarUrl) : Promise.resolve(null),
    coverUrl ? loadImage(coverUrl) : Promise.resolve(null),
    ensureFonts(),
  ]);
  const qr = await loadImage(qrDataUrl);

  paintCard(canvas, subject, theme, url, qr, avatar, cover);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    paintCard(canvas, subject, theme, url, qr, null, null);
    return canvas.toDataURL('image/png');
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/png';
  const binary = atob(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Object URL rather than the data URL itself: Safari refuses long data hrefs. */
export function downloadImage(dataUrl: string, filename: string): void {
  const href = URL.createObjectURL(dataUrlToBlob(dataUrl));
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"]/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string),
  );
}

/**
 * Prints through an offscreen iframe instead of `window.open`, which pop-up
 * blockers eat even on a click.
 */
export function printImage(dataUrl: string, title: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error('This browser blocked the print view.');
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>${escapeHtml(title)}</title>` +
      '<style>@page{margin:14mm}html,body{margin:0;padding:0}' +
      'img{display:block;width:100%;height:auto}</style></head>' +
      `<body><img alt="" src="${dataUrl}"></body></html>`,
  );
  doc.close();

  const done = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => frame.remove(), 2000);
    }
  };
  const img = doc.images[0];
  if (!img || img.complete) done();
  else {
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', () => frame.remove(), { once: true });
  }
}

/**
 * Hands the PNG itself to the OS share sheet. Returns false when the browser
 * cannot share files, so the caller can fall back to sharing the link (§26).
 */
export async function shareImageFile(
  dataUrl: string,
  filename: string,
  payload: { title?: string; text?: string },
): Promise<boolean> {
  const nav = navigator as any;
  if (typeof nav?.share !== 'function' || typeof nav?.canShare !== 'function') return false;
  let file: File;
  try {
    file = new File([dataUrlToBlob(dataUrl)], filename, { type: 'image/png' });
  } catch {
    return false;
  }
  if (!nav.canShare({ files: [file] })) return false;
  try {
    await nav.share({ ...payload, files: [file] });
  } catch {
    /* dismissed — not an error */
  }
  return true;
}

/** `wevsoft-mystudio-card.png`, safe on every filesystem. */
export function shareFileName(handle: unknown, kind: 'card' | 'qr'): string {
  const clean = String(handle || 'wevspace').replace(/[^a-z0-9_-]+/gi, '').toLowerCase() || 'wevspace';
  return `wevsoft-${clean}-${kind}.png`;
}
