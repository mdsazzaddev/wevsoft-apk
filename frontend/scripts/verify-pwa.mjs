import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');

const required = ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'sw.js', 'manifest.json'];
const missing = required.filter((f) => !fs.existsSync(path.join(dist, f)));

const htmlRegisters =
  html.includes('serviceWorker') ||
  html.includes('registerSW') ||
  html.includes('/sw.js') ||
  /src="[^"]*registerSW[^"]*"/.test(html) ||
  // Controlled registration from main bundle (injectRegister: false).
  /bootstrapServiceWorker|shouldRegisterServiceWorker/.test(
    fs.readdirSync(dist)
      .filter((f) => f.endsWith('.js'))
      .map((f) => fs.readFileSync(path.join(dist, f), 'utf8'))
      .join('\n'),
  );

const checks = {
  missingFiles: missing,
  display: manifest.display,
  id: manifest.id,
  scope: manifest.scope,
  start_url: manifest.start_url,
  icons: manifest.icons.map((i) => `${i.sizes}:${i.purpose}`),
  hasManifestLink: html.includes('href="/manifest.json"'),
  themeColor: (html.match(/name="theme-color"\s+content="([^"]+)"/) || [])[1] || null,
  viewportFit: html.includes('viewport-fit=cover'),
  appleCapable: html.includes('apple-mobile-web-app-capable'),
  swHasPrecache: sw.includes('precache'),
  swHasSkipWaiting: sw.includes('skipWaiting'),
  swBytes: sw.length,
  htmlRegistersSw: htmlRegisters,
  standaloneOk: manifest.display === 'standalone',
};

console.log(JSON.stringify(checks, null, 2));
console.log('\n--- index.html script tags ---');
for (const m of html.matchAll(/<script[^>]*>/g)) console.log(m[0]);

if (missing.length || !checks.standaloneOk || !checks.htmlRegistersSw || !checks.hasManifestLink) {
  process.exit(1);
}
