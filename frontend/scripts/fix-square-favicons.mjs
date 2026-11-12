/**
 * Rebuild 1:1 Wevsoft tab icons from public/logo.png (wide W → square canvas).
 * Does not touch the wide logo.svg used in the header.
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
const srcW = meta.width || 375;
const srcH = meta.height || 186;

async function renderSquare(size, { padRatio = 0.12, bg = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const pad = Math.round(size * padRatio);
  const inner = Math.max(1, size - pad * 2);
  const scale = Math.min(inner / srcW, inner / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));
  const left = Math.round((size - drawW) / 2);
  const top = Math.round((size - drawH) / 2);

  const resized = await sharp(sourcePath)
    .resize(drawW, drawH, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

const jobs = [
  { file: 'favicon-16.png', size: 16, padRatio: 0.08 },
  { file: 'favicon-32.png', size: 32, padRatio: 0.08 },
  { file: 'favicon.png', size: 48, padRatio: 0.08 },
  { file: 'favicon-48.png', size: 48, padRatio: 0.08 },
  { file: 'favicon-96.png', size: 96, padRatio: 0.08 },
  { file: 'apple-touch-icon.png', size: 180, padRatio: 0.1 },
  { file: 'icon-192.png', size: 192, padRatio: 0.1 },
  { file: 'icon-512.png', size: 512, padRatio: 0.1 },
  { file: 'icon-512-maskable.png', size: 512, padRatio: 0.2 },
];

for (const job of jobs) {
  const buf = await renderSquare(job.size, { padRatio: job.padRatio });
  fs.writeFileSync(path.join(publicDir, job.file), buf);
  const m = await sharp(buf).metadata();
  console.log('wrote', job.file, `${m.width}x${m.height}`);
}

const icoEntries = [];
for (const size of [16, 32, 48]) {
  icoEntries.push({ size, buf: await renderSquare(size, { padRatio: 0.08 }) });
}
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buildIco(icoEntries));
console.log('wrote favicon.ico (16/32/48)');

// Square SVG mark for browsers that prefer SVG icons (never use wide logo.svg as favicon).
const scale = Math.min((512 * 0.78) / 375, (512 * 0.78) / 186);
const w = 375 * scale;
const h = 186 * scale;
const x = (512 - w) / 2;
const y = (512 - h) / 2;
const logoMark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" role="img" aria-label="Wevsoft">
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(6)})">
    <polygon points="344,5 343,6 338,6 334,7 329,9 324,12 319,16 315,21 312,27 312,36 313,39 315,43 335,67 338,72 342,77 346,81 348,82 350,82 352,81 353,80 360,65 360,63 369,45 373,36 375,29 375,25 373,18 371,15 368,12 365,10 361,8 354,6 349,6 348,5" fill="#3b82f6"/>
    <polygon points="200,10 194,16 189,25 187,34 187,40 188,45 191,53 201,66 251,127 266,144 283,166 295,179 302,183 308,185 316,186 327,184 336,179 343,172 346,167 349,158 349,147 346,137 334,121 243,11 239,8 233,5 225,3 217,3 212,4" fill="#3b82f6"/>
    <polygon points="7,9 2,17 0,25 1,36 5,44 12,51 21,55 28,56 61,56 69,60 83,75 91,86 165,176 172,182 182,186 196,186 206,182 215,175 220,168 223,160 223,145 220,137 119,13 110,4 100,0 24,0 13,4" fill="#3b82f6"/>
  </g>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'logo-mark.svg'), logoMark);
console.log('wrote logo-mark.svg 512x512 viewBox');
