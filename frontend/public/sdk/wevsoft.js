/*! Wevsoft embed SDK v0.1.0  <script src="https://YOUR-WEVSOFT-HOST/sdk/wevsoft.js" data-client-id="CLIENT_ID" async></script> */
(function () {
  'use strict';
  if (window.Wevsoft && window.Wevsoft.__loaded) return;
  var script = document.currentScript || document.querySelector('script[src*="/sdk/wevsoft.js"]');
  var BASE = script ? new URL(script.src, location.href).origin : location.origin;
  var defaultClientId = script && script.getAttribute('data-client-id');
  var configs = {};
  var STYLE_ID = 'wevsoft-embed-style';

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.wev-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:8px;border:0;background:#1663f2;color:#fff;font:600 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer}' +
      '.wev-btn:hover{filter:brightness(1.08)}.wev-btn.wev-light{background:#fff;color:#1663f2;border:1px solid #c9d8fb}' +
      '.wev-err{font:12px system-ui,sans-serif;color:#b42318}' +
      '.wev-bubble{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;background:#1663f2;color:#fff;box-shadow:0 8px 24px rgba(22,99,242,.35);cursor:pointer;z-index:2147483000;font:600 22px/56px system-ui}' +
      '.wev-onetap{position:fixed;top:16px;right:16px;width:320px;background:#fff;border:1px solid #e3e8ef;border-radius:12px;box-shadow:0 12px 32px rgba(16,24,40,.18);padding:16px;z-index:2147483001;font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#101828}' +
      '.wev-onetap b{display:block;font-size:14px;margin-bottom:4px}.wev-onetap .wev-x{position:absolute;top:8px;right:10px;border:0;background:none;font-size:18px;cursor:pointer;color:#667085}' +
      '.wev-onetap .wev-btn{width:100%;justify-content:center;margin-top:10px}';
    document.head.appendChild(s);
  }

  /** Ask Wevsoft whether this page's origin may embed the app (browser-set Origin header decides). */
  function config(clientId) {
    clientId = clientId || defaultClientId;
    if (!clientId) return Promise.reject(new Error('Wevsoft: data-client-id is required'));
    if (!configs[clientId]) {
      configs[clientId] = fetch(BASE + '/api/embed/config?client_id=' + encodeURIComponent(clientId), { credentials: 'omit' })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.allowed) throw new Error(j.message || j.reason || 'This site is not allowed to embed Wevsoft widgets'); return j; }); });
      configs[clientId].catch(function () { delete configs[clientId]; });
    }
    return configs[clientId];
  }

  function popup(url, name, w, h) {
    var y = Math.max(0, (window.outerHeight - h) / 2 + window.screenY), x = Math.max(0, (window.outerWidth - w) / 2 + window.screenX);
    return window.open(url, name, 'popup=yes,width=' + w + ',height=' + h + ',left=' + x + ',top=' + y);
  }

  function fail(el, err) {
    el.innerHTML = '';
    var s = document.createElement('span');
    s.className = 'wev-err';
    s.textContent = 'Wevsoft: ' + (err && err.message ? err.message : err);
    el.appendChild(s);
    if (window.console) console.warn('[Wevsoft]', err);
  }

  function button(label, light) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wev-btn' + (light ? ' wev-light' : '');
    b.textContent = label;
    return b;
  }

  // Messages from Wevsoft windows are accepted only from BASE and only from a window we opened.
  var listeners = [];
  window.addEventListener('message', function (e) {
    if (e.origin !== BASE || !e.data || typeof e.data.type !== 'string' || e.data.type.indexOf('wevsoft:') !== 0) return;
    for (var i = 0; i < listeners.length; i++) if (listeners[i].source === e.source) listeners[i].fn(e.data);
  });
  function onMessageFrom(source, fn) { listeners.push({ source: source, fn: fn }); }

  function renderShare(el) {
    var url = el.getAttribute('data-href') || location.href;
    var b = button(el.getAttribute('data-label') || 'Share on Wevsoft', el.getAttribute('data-theme') === 'light');
    b.onclick = function () { popup(BASE + '/share?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(el.getAttribute('data-title') || document.title), 'wevsoft_share', 620, 680); };
    el.innerHTML = ''; el.appendChild(b);
  }

  function renderFollow(el, cfg) {
    var username = (el.getAttribute('data-username') || '').replace(/^@/, '');
    if (!username) return fail(el, 'data-username is required');
    var b = button(el.getAttribute('data-label') || 'Follow @' + username, el.getAttribute('data-theme') === 'light');
    b.onclick = function () {
      // Following happens in a top-level Wevsoft window (never inside an iframe), so it cannot be clickjacked.
      var w = popup(BASE + '/embed/follow?username=' + encodeURIComponent(username) + '&token=' + encodeURIComponent(cfg.token), 'wevsoft_follow', 420, 520);
      if (!w) return;
      onMessageFrom(w, function (msg) {
        if (msg.type === 'wevsoft:follow') {
          b.textContent = msg.following ? 'Following @' + username : 'Follow @' + username;
          el.dispatchEvent(new CustomEvent('wevsoft:follow', { detail: { username: username, following: !!msg.following }, bubbles: true }));
        }
      });
    };
    el.innerHTML = ''; el.appendChild(b);
  }

  function renderPost(el, cfg) {
    var id = el.getAttribute('data-post-id');
    if (!id) return fail(el, 'data-post-id is required');
    var f = document.createElement('iframe');
    f.src = BASE + '/embed/post/' + encodeURIComponent(id) + '?token=' + encodeURIComponent(cfg.token);
    f.title = 'Wevsoft post';
    f.loading = 'lazy';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    f.style.cssText = 'width:100%;max-width:' + (el.getAttribute('data-width') || '520') + 'px;height:220px;border:0;border-radius:12px;overflow:hidden';
    el.innerHTML = ''; el.appendChild(f);
    onMessageFrom(f.contentWindow, function (msg) {
      if (msg.type === 'wevsoft:resize' && typeof msg.height === 'number') f.style.height = Math.min(Math.max(msg.height, 80), 2000) + 'px';
    });
  }

  function renderChat(el) {
    var handle = el.getAttribute('data-space');
    if (!handle) return fail(el, 'data-space is required');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'wev-bubble'; b.setAttribute('aria-label', 'Chat with us on WevChat'); b.textContent = '\u{1F4AC}';
    b.onclick = function () { popup(BASE + '/space/' + encodeURIComponent(handle), 'wevsoft_chat', 420, 640); };
    el.innerHTML = ''; el.appendChild(b);
  }

  var RENDERERS = { share: renderShare, follow: renderFollow, post: renderPost, chat: renderChat };

  function parse(root) {
    css();
    var nodes = (root || document).querySelectorAll('[data-wevsoft]:not([data-wevsoft-done])');
    Array.prototype.forEach.call(nodes, function (el) {
      var kind = el.getAttribute('data-wevsoft');
      var r = RENDERERS[kind];
      if (!r) return;
      el.setAttribute('data-wevsoft-done', '1');
      if (kind === 'share') return r(el);
      config(el.getAttribute('data-client-id')).then(function (cfg) { r(el, cfg); }, function (err) { fail(el, err); });
    });
  }

  // ---------- One-Tap sign-in (OAuth 2.0 + PKCE in a popup) ----------
  function b64url(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }

  /**
   * Wevsoft.oneTap({ clientId, redirectUri, scopes, auto }) -> Promise<{ code, codeVerifier, redirectUri, state }>
   * redirectUri must be a page on THIS origin that calls Wevsoft.completeSignIn().
   * Exchange the code on your server (or with @wevsoft/sdk exchangeCode) using codeVerifier.
   */
  function oneTap(opts) {
    opts = opts || {};
    css();
    var clientId = opts.clientId || defaultClientId;
    var redirectUri = opts.redirectUri;
    return config(clientId).then(function (cfg) {
      if (!redirectUri || new URL(redirectUri, location.href).origin !== location.origin) throw new Error('redirectUri must be on ' + location.origin);
      return new Promise(function (resolve, reject) {
        var card = document.createElement('div');
        card.className = 'wev-onetap'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Sign in with Wevsoft');
        var x = document.createElement('button'); x.className = 'wev-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '\u00D7';
        var t = document.createElement('b'); t.textContent = 'Sign in to ' + (opts.siteName || location.hostname);
        var p = document.createElement('div'); p.textContent = 'Use your Wevsoft account with ' + (cfg.app && cfg.app.name ? cfg.app.name : 'this app') + '.';
        var go = button('Continue with Wevsoft');
        card.appendChild(x); card.appendChild(t); card.appendChild(p); card.appendChild(go);
        document.body.appendChild(card);
        x.onclick = function () { card.remove(); reject(new Error('dismissed')); };
        go.onclick = function () {
          var verifier = rand(48), state = rand(16);
          crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (d) {
            var u = new URL(BASE + '/oauth/authorize');
            u.searchParams.set('response_type', 'code');
            u.searchParams.set('client_id', clientId);
            u.searchParams.set('redirect_uri', redirectUri);
            u.searchParams.set('scope', (opts.scopes || ['profile']).join(' '));
            u.searchParams.set('state', state);
            u.searchParams.set('code_challenge', b64url(new Uint8Array(d)));
            u.searchParams.set('code_challenge_method', 'S256');
            var w = popup(u.toString(), 'wevsoft_onetap', 480, 640);
            if (!w) return reject(new Error('Popup blocked'));
            card.remove();
            function onMsg(e) {
              // The callback page runs on our own origin and is a window we opened.
              if (e.origin !== location.origin || e.source !== w || !e.data || e.data.type !== 'wevsoft:oauth-callback') return;
              window.removeEventListener('message', onMsg);
              try {
                var cb = new URL(e.data.href);
                if (cb.searchParams.get('error')) throw new Error(cb.searchParams.get('error'));
                if (cb.searchParams.get('state') !== state) throw new Error('state mismatch');
                var code = cb.searchParams.get('code');
                if (!code) throw new Error('no code');
                resolve({ code: code, codeVerifier: verifier, redirectUri: redirectUri, state: state });
              } catch (err) { reject(err); }
            }
            window.addEventListener('message', onMsg);
          });
        };
      });
    });
  }

  /** Call on your redirectUri page (same origin as the page that started oneTap). */
  function completeSignIn() {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'wevsoft:oauth-callback', href: location.href }, location.origin);
      window.close();
      return true;
    }
    return false;
  }

  window.Wevsoft = { __loaded: true, version: '0.1.0', base: BASE, parse: parse, config: config, oneTap: oneTap, completeSignIn: completeSignIn };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { parse(); });
  else parse();
})();
