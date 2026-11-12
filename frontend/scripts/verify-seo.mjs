/**
 * Static SEO checks against the built site (run after `vite build`).
 * Usage: node frontend/scripts/verify-seo.mjs
 * Checks head tags per pre-rendered route, JSON-LD validity, favicon files/sizes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
const ORIGIN = 'https://www.wevsoft.com';
const routes = ['/', '/auth', '/spaces', '/wevmall', '/privacy', '/terms'];

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures += 1;
};
const count = (html, re) => (html.match(re) || []).length;

const titles = new Set();
const descriptions = new Set();
for (const route of routes) {
  const file = path.join(dist, route === '/' ? 'index.html' : `${route.slice(1)}.html`);
  const html = fs.readFileSync(file, 'utf8');
  const tag = `[${route}]`;
  ok(count(html, /<title>/g) === 1, `${tag} exactly one <title>`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  ok(title.length > 3 && title.length <= 70, `${tag} title length ${title.length}: ${title}`);
  titles.add(title);
  ok(count(html, /<meta name="description"/g) === 1, `${tag} exactly one meta description`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  ok(desc.length >= 30 && desc.length <= 200, `${tag} description length ${desc.length}`);
  descriptions.add(route === '/' ? 'home' : desc);
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  const ogUrl = (html.match(/<meta property="og:url" content="([^"]*)"/) || [])[1];
  if (route === '/') {
    // The shared shell serves every unknown route, so it must NOT carry a static
    // canonical/og:url (boot-theme.js adds them per URL on www.wevsoft.com).
    ok(count(html, /rel="canonical"/g) === 0 && !ogUrl, `${tag} shell has no static canonical/og:url (added by JS per URL)`);
  } else {
    ok(count(html, /rel="canonical"/g) === 1, `${tag} exactly one canonical`);
    ok(canonical === `${ORIGIN}${route}`, `${tag} canonical = ${canonical}`);
    ok(ogUrl === `${ORIGIN}${route}`, `${tag} og:url matches canonical`);
  }
  ok(count(html, /property="og:title"/g) === 1 && count(html, /name="twitter:title"/g) === 1, `${tag} one og:title / twitter:title`);
  ok(/og:image" content="https:\/\/www\.wevsoft\.com\/icon-512\.png"/.test(html), `${tag} absolute og:image`);
  ok(!/noindex/i.test(html), `${tag} not noindex`);
  ok(/<meta\s+name="viewport"\s+content="[^"]*width=device-width/.test(html), `${tag} mobile viewport`);
  const ld = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (route === '/') {
    ok(Boolean(ld), '[/] has JSON-LD');
    if (ld) {
      const data = JSON.parse(ld[1]);
      const graph = data['@graph'];
      const site = graph.find((n) => n['@type'] === 'WebSite');
      const org = graph.find((n) => n['@type'] === 'Organization');
      ok(site?.url === `${ORIGIN}/` && site?.name === 'Wevsoft', '[/] WebSite name+url');
      ok(org?.url === `${ORIGIN}/` && org?.name === 'Wevsoft', '[/] Organization name+url');
      const logo = org?.logo?.url;
      ok(logo === `${ORIGIN}/icon-512.png` && fs.existsSync(path.join(dist, 'icon-512.png')), '[/] Organization logo exists');
    }
  } else {
    ok(!ld, `${tag} no homepage-only JSON-LD`);
  }
}
ok(titles.size === routes.length, 'all route titles are unique');
ok(descriptions.size === routes.length, 'all route descriptions are unique');

// Favicons
const pngSize = (f) => {
  const b = fs.readFileSync(path.join(dist, f));
  return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
};
for (const [f, size] of [['favicon-48.png', 48], ['favicon-96.png', 96], ['icon-192.png', 192]]) {
  const s = pngSize(f);
  ok(s && s[0] === size && s[1] === size && size % 48 === 0, `${f} is ${size}x${size} (multiple of 48)`);
}
const ico = fs.readFileSync(path.join(dist, 'favicon.ico'));
const entries = [];
if (ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1) {
  for (let i = 0; i < ico.readUInt16LE(4); i += 1) entries.push(`${ico[6 + i * 16] || 256}x${ico[7 + i * 16] || 256}`);
}
ok(entries.includes('48x48') && entries.includes('32x32') && entries.includes('16x16'), `favicon.ico is a real ICO with ${entries.join(', ')}`);
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const m of home.matchAll(/<link rel="icon"[^>]*href="([^"?]+)/g)) {
  ok(fs.existsSync(path.join(dist, m[1])), `rel=icon target exists: ${m[1]}`);
}
ok(!/rel="icon"[^>]*logo\.svg/.test(home), 'non-square logo.svg is not a rel=icon');

const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
ok(/Sitemap: https:\/\/www\.wevsoft\.com\/sitemap\.xml/.test(robots), 'robots.txt lists the sitemap');
ok(!/^Disallow: \/\s*$/m.test(robots), 'robots.txt does not block the whole site');

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll SEO checks passed');
process.exit(failures ? 1 : 0);
