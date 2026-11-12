import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const out = 'C:/Users/sazza/wev-groups-src/shots';
fs.mkdirSync(out, { recursive: true });

const login = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'testuser_1790441892429', password: 'Password@123' }),
});
const payload = await login.json();
const token = payload.token;
const rawUser = payload.user;
if (!token) throw new Error('login failed: ' + JSON.stringify(payload));

const browser = await chromium.launch({ channel: process.env.CH || 'msedge' });

async function prepTheme(page, dark) {
  await page.evaluate((isDark) => {
    const r = document.documentElement;
    if (isDark) {
      r.classList.add('dark');
      r.classList.remove('oled', 'theme-oled');
      r.style.colorScheme = 'dark';
      r.style.backgroundColor = '#0b0d14';
      document.body.style.backgroundColor = '#0b0d14';
    } else {
      r.classList.remove('dark', 'oled', 'theme-oled');
      r.style.colorScheme = 'light';
      r.style.backgroundColor = '#f4f6fb';
      document.body.style.backgroundColor = '#f4f6fb';
    }
    try { localStorage.setItem('theme', isDark ? 'Dark mode' : 'Light mode'); } catch {}
  }, dark);
  await page.waitForTimeout(500);
}

async function shot(name, { dark = false } = {}) {
  const user = { ...rawUser, theme: dark ? 'Dark mode' : 'Light mode' };
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: dark ? 'dark' : 'light',
  });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('theme', u.theme);
    localStorage.setItem('wev.groups.layout', 'list');
    localStorage.setItem('wev.groups.sort', 'recent');
  }, [token, user]);

  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); console.log('pageerror', name, e.message); });

  await page.goto('http://localhost:3000/groups', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('text=Your Groups Feed', { timeout: 45000 });
  await page.waitForSelector('text=Most Recent', { timeout: 15000 });
  await page.waitForSelector('text=Most Discussed', { timeout: 10000 });
  await page.waitForSelector('input[placeholder*="Search groups"]', { timeout: 10000 });
  await prepTheme(page, dark);
  await page.waitForTimeout(2000);

  const checks = {
    yourFeed: await page.locator('text=Your Feed').count(),
    discoverSoft: await page.locator('button:has-text("Discover Groups")').count(),
    shareGroups: await page.locator('text=Share something with your groups').count(),
    feelingActivity: await page.locator('text=Feeling/Activity').count(),
    trending: await page.locator('text=Trending Topics').count(),
    suggested: await page.locator('text=Suggested Groups').count(),
    startNew: await page.locator('text=Start a New Group').count(),
    errs: errs.length,
  };
  console.log(name, checks);

  const dest = path.join(out, name + '.png');
  await page.screenshot({ path: dest, fullPage: false });
  console.log('saved', dest);
  await ctx.close();
  return checks;
}

const light = await shot('groups-exact-light', { dark: false });
const dark = await shot('groups-exact-dark', { dark: true });

await browser.close();
console.log('done', { light, dark });
