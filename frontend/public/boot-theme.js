/* WevSoft first-paint theme + SW eviction (no inline script — CSP script-src 'self').
 * Loaded twice from index.html:
 *   1) top of <head> — set theme classes before boot-shell.css (no white flash)
 *   2) end of <head> — SEO / canonical / font flip after those nodes exist
 */
(function () {
  var isSeoPass = false;
  try {
    isSeoPass = !!(
      document.currentScript &&
      document.currentScript.getAttribute('data-wev-boot-theme-seo')
    );
  } catch (e) {
    isSeoPass = false;
  }

  function applyTheme() {
    try {
      var host = String(location.hostname || '').toLowerCase();
      if (host === 'wevsoft.com') {
        location.replace(
          'https://www.wevsoft.com' +
            (location.pathname || '/') +
            location.search +
            location.hash,
        );
        return;
      }

      var raw = (localStorage.getItem('theme') || 'Light mode').toLowerCase();
      var paint = (localStorage.getItem('wev_theme_paint') || '').toLowerCase();
      var oled =
        raw.indexOf('oled') !== -1 ||
        raw.indexOf('true black') !== -1 ||
        raw.indexOf('amoled') !== -1 ||
        paint === 'oled';
      var system = raw.indexOf('system') !== -1;
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // System: prefer last painted mode (platform Dark often ≠ OS light) to avoid FOUC.
      var systemDark =
        system &&
        (paint === 'dark' || paint === 'oled'
          ? true
          : paint === 'light'
            ? false
            : prefersDark);
      var dark =
        raw.indexOf('dark') !== -1 || oled || systemDark;
      var light = !dark;
      // Explicit Dark/OLED always wins over a stale light paint key.
      if (raw.indexOf('dark') !== -1 && !oled) {
        paint = 'dark';
      }
      var root = document.documentElement;
      root.classList.remove('dark', 'oled', 'theme-oled', 'theme-light', 'is-standalone');
      if (oled) {
        root.classList.add('dark', 'oled', 'theme-oled');
      } else if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.add('theme-light');
      }

      var isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (typeof navigator !== 'undefined' &&
          'standalone' in navigator &&
          navigator.standalone === true) ||
        (document.referrer && document.referrer.indexOf('android-app://') === 0);
      if (isStandalone) {
        root.classList.add('is-standalone');
      }

      var color;
      if (isStandalone) {
        color = '#0b0e11';
      } else if (oled) {
        color = '#000000';
      } else if (dark) {
        color = '#0b0e11';
      } else {
        color = '#ffffff';
      }
      var scheme = dark || isStandalone ? 'dark' : 'light';
      root.style.colorScheme = scheme;
      root.style.backgroundColor = color;
      if (document.body) document.body.style.backgroundColor = color;
      root.style.setProperty('--wev-status-bar-bg', color);

      function setThemeColor(el, value) {
        if (el) el.setAttribute('content', value);
      }
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) setThemeColor(metas[i], color);

      var colorScheme = document.querySelector('meta[name="color-scheme"]');
      if (colorScheme) colorScheme.setAttribute('content', dark ? 'dark' : 'light');

      var apple = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      );
      if (apple)
        apple.setAttribute(
          'content',
          dark || isStandalone ? 'black-translucent' : 'default',
        );

      var msNav = document.querySelector('meta[name="msapplication-navbutton-color"]');
      if (msNav) msNav.setAttribute('content', color);

      var manifest = document.querySelector('link[rel="manifest"]');
      if (manifest) manifest.setAttribute('href', '/manifest.json?v=20261107');

      var bootMode = light ? 'light' : oled ? 'oled' : 'dark';
      root.setAttribute('data-wev-boot-theme', bootMode);
      try {
        localStorage.setItem('wev_theme_paint', bootMode);
      } catch (e2) {
        /* ignore */
      }
    } catch (e) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('theme-light');
      document.documentElement.style.colorScheme = 'dark';
    }
  }

  function applySeo() {
    try {
      var path = location.pathname.replace(/\/+$/, '') || '/';
      if (location.hostname === 'www.wevsoft.com') {
        var cleanUrl = 'https://www.wevsoft.com' + (path === '/' ? '/' : path);
        var canon = document.querySelector('link[rel="canonical"]');
        if (!canon) {
          canon = document.createElement('link');
          canon.rel = 'canonical';
          document.head.appendChild(canon);
        }
        if (canon.getAttribute('href') !== cleanUrl) canon.setAttribute('href', cleanUrl);
        var og = document.querySelector('meta[property="og:url"]');
        if (!og) {
          og = document.createElement('meta');
          og.setAttribute('property', 'og:url');
          document.head.appendChild(og);
        }
        if (og.getAttribute('content') !== cleanUrl) og.setAttribute('content', cleanUrl);
      }
      if (path !== '/') {
        var homeLd = document.querySelector('script[data-wev-home-ld]');
        if (homeLd && homeLd.parentNode) homeLd.parentNode.removeChild(homeLd);
      }

      var flipFont = function () {
        var fontLink = document.getElementById('wev-font-inter');
        if (fontLink && fontLink.getAttribute('media') === 'print') {
          fontLink.setAttribute('media', 'all');
        }
      };
      if (document.readyState === 'complete') flipFont();
      else window.addEventListener('load', flipFont, { once: true });
    } catch (e) {
      /* ignore SEO failures */
    }
  }

  applyTheme();
  if (isSeoPass) applySeo();
})();
