/**
 * Regenerate PWA / favicon assets from the current brand mark (public/logo.png).
 * Usage: node frontend/scripts/generate-pwa-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const sourcePath = path.join(publicDir, 'logo.png');

if (!fs.existsSync(sourcePath)) {
  console.error('Missing source:', sourcePath);
  process.exit(1);
}

const meta = await sharp(sourcePath).metadata();
const srcW = meta.width || 1024;
const srcH = meta.height || 1024;

/** Fit logo on a square black canvas with padding (maskable needs ~20% safe zone). */
async function renderSquare(size, { padRatio = 0.12 } = {}) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const scale = Math.min(inner / srcW, inner / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));
  const left = Math.round((size - drawW) / 2);
  const top = Math.round((size - drawH) / 2);

  const resized = await sharp(sourcePath)
    .resize(drawW, drawH, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

const jobs = [
  { file: 'icon-192.png', size: 192, padRatio: 0.1 },
  { file: 'icon-512.png', size: 512, padRatio: 0.1 },
  { file: 'icon-512-maskable.png', size: 512, padRatio: 0.2 },
  { file: 'apple-touch-icon.png', size: 180, padRatio: 0.1 },
  { file: 'favicon-32.png', size: 32, padRatio: 0.08 },
  { file: 'favicon-16.png', size: 16, padRatio: 0.08 },
  { file: 'favicon.png', size: 48, padRatio: 0.08 },
  // Google Search wants a square favicon whose size is a multiple of 48px.
  { file: 'favicon-48.png', size: 48, padRatio: 0.08 },
  { file: 'favicon-96.png', size: 96, padRatio: 0.08 },
];

for (const job of jobs) {
  const buf = await renderSquare(job.size, { padRatio: job.padRatio });
  const out = path.join(publicDir, job.file);
  fs.writeFileSync(out, buf);
  console.log('wrote', job.file, buf.length, 'bytes');
}

/** Real multi-size .ico (PNG-embedded entries) so /favicon.ico is a valid ICO file. */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

const icoEntries = [];
for (const size of [16, 32, 48]) {
  icoEntries.push({ size, buf: await renderSquare(size, { padRatio: 0.08 }) });
}
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buildIco(icoEntries));
console.log('wrote favicon.ico (16, 32, 48)');

console.log('Done. Reinstall the PWA (or clear site data) to refresh the home-screen icon.');
