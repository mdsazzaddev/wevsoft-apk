import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Manifest MIME + self-unregistering SW and no-cache headers for dev/tunnel. */
function pwaStaticHeaders(): Plugin {
  return {
    name: 'wevsoft-pwa-static-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (url === '/sw.js' || url.startsWith('/sw.js')) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.end(
            'self.addEventListener("install", () => self.skipWaiting());\n' +
            'self.addEventListener("activate", (e) => {\n' +
            '  e.waitUntil(\n' +
            '    self.registration.unregister().then(() => {\n' +
            '      return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));\n' +
            '    })\n' +
            '  );\n' +
            '});\n'
          );
          return;
        }
        if (url === '/' || url === '/index.html') {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        }
        if (
          url === '/manifest.json' ||
          url === '/manifest-light.json' ||
          url === '/manifest-dark.json' ||
          url === '/manifest-oled.json'
        ) {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (url === '/' || url === '/index.html') {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        }
        if (
          url === '/manifest.json' ||
          url === '/manifest-light.json' ||
          url === '/manifest-dark.json' ||
          url === '/manifest-oled.json'
        ) {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
        next();
      });
    },
  };
}

/**
 * The entry stylesheet is ~700 KB. As a plain <link rel="stylesheet"> in <head>
 * it blocks the first paint, so the inline-SVG splash could not show until the
 * whole CSS arrived (seconds on mobile data / first install). Preload it at high
 * priority but attach it with media="print"; `src/lib/asyncCss.ts` flips it to
 * `all` and main.tsx waits for it before mounting React, so users never see an
 * unstyled app — only the splash until it is ready.
 */
function deferMainCss(): Plugin {
  return {
    name: 'wevsoft-defer-main-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /<link rel="stylesheet"((?: crossorigin(?:="[^"]*")?)?) href="(\/assets\/[^"]+\.css)">/g,
          (_m, co: string, href: string) =>
            `<link rel="preload" as="style"${co} href="${href}">\n    ` +
            `<link rel="stylesheet"${co} href="${href}" media="print" data-wev-css>`,
        );
      },
    },
  };
}

/**
 * The site is a SPA, so Cloudflare Pages answers every route with the same shell and
 * Google would see one title/description for all of them. After the build, write a
 * copy of the final index.html (same hashed bundles) with route-specific head tags
 * to dist/<route>.html; Pages serves it for exactly that path and the SPA
 * takes over as normal. Head only — no body content is added or removed.
 */
const SEO_ORIGIN = 'https://www.wevsoft.com';
const SEO_ROUTES: Array<{ path: string; title: string; description: string }> = [
  {
    path: '/auth',
    title: 'Log in or sign up | Wevsoft',
    description:
      'Log in to Wevsoft or create an account to connect with your batch, seniors and juniors - reels, jobs, events and more.',
  },
  {
    path: '/spaces',
    title: 'WevSpace - Pages, communities and businesses | Wevsoft',
    description:
      'Explore WevSpace on Wevsoft: public pages and communities for businesses, clubs and creators. Follow them and stay in touch.',
  },
  {
    path: '/wevmall',
    title: 'WevMall - Shop on Wevsoft',
    description:
      'WevMall is the marketplace built into Wevsoft. Browse products and shop from sellers in the Wevsoft community.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Wevsoft',
    description: 'How Wevsoft collects, uses and protects your information.',
  },
  {
    path: '/terms',
    title: 'Terms of Service | Wevsoft',
    description: 'The terms that apply when you use Wevsoft.',
  },
];

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function renderSeoRouteHtml(
  html: string,
  route: { path: string; title: string; description: string },
): string {
  const url = `${SEO_ORIGIN}${route.path}`;
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);
  const setMeta = (src: string, attr: 'name' | 'property', key: string, value: string) =>
    src.replace(
      new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
      (_m, a: string, b: string) => `${a}${value}${b}`,
    );
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = setMeta(out, 'name', 'description', description);
  out = setMeta(out, 'property', 'og:title', title);
  out = setMeta(out, 'property', 'og:description', description);
  out = setMeta(out, 'name', 'twitter:title', title);
  out = setMeta(out, 'name', 'twitter:description', description);
  // The shared shell has no canonical / og:url (it serves every unknown route), so
  // these pre-rendered pages add their own, right after the og:site_name tag.
  out = out.replace(
    /(<meta property="og:site_name"[^>]*>)/,
    `<link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n    $1`,
  );
  // Organization/WebSite markup belongs on the homepage only.
  out = out.replace(/\s*<script type="application\/ld\+json" data-wev-home-ld>[\s\S]*?<\/script>/, '');
  return out;
}

function seoStaticPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'wevsoft-seo-static-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      order: 'pre',
      async handler() {
        const fs = await import('node:fs');
        const indexPath = path.join(outDir, 'index.html');
        if (!fs.existsSync(indexPath)) return;
        const shell = fs.readFileSync(indexPath, 'utf8');
        for (const route of SEO_ROUTES) {
          // `<route>.html`, NOT `<route>/index.html`: Pages 308-redirects /auth -> /auth/
          // for directory indexes, but serves auth.html at the clean /auth URL.
          fs.writeFileSync(
            path.join(outDir, `${route.path.replace(/^\//, '')}.html`),
            renderSeoRouteHtml(shell, route),
          );
        }
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [
      react(),
      tailwindcss(),
      pwaStaticHeaders(),
      deferMainCss(),
      seoStaticPages(),
      VitePWA({
        // Single SW source: src/sw.ts → dist/sw.js (no public/sw.js duplicate).
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        // Controlled SW registration lives in `main.tsx` → bootstrapServiceWorker().
        // Auto-inject would leave a ghost offline SPA after preview:lan is killed.
        injectRegister: false,
        // Static manifest lives in public/manifest.json (linked from index.html).
        manifest: false,
        includeAssets: [
          'icon-192.png',
          'icon-512.png',
          'icon-512-maskable.png',
          'favicon-32.png',
          'favicon-16.png',
          'apple-touch-icon.png',
          'logo.png',
        ],
        injectManifest: {
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          // Precache only the entry shell + core vendor chunks + icons so the
          // first visit doesn't download 12 MB of lazy route chunks in the
          // background. Route chunks are cached on demand in src/sw.ts.
          // index.html is deliberately NOT precached: a cached shell pointed at the
          // previous build's hashed chunks (deleted on every Pages deploy) and left a
          // blank page until a manual refresh. Navigations are NetworkOnly in sw.ts.
          globPatterns: [
            'boot-theme.js',
            'boot-shell.css',
            'assets/index-*.{js,css}',
            'assets/vendor-*.js',
            // Signed-in shell + home so repeat launches paint without the network.
            'assets/DashboardLayout-*.{js,css}',
            'assets/HomePage-*.{js,css}',
            '*.{ico,svg,woff2}',
            'icon-*.png',
            'favicon*.png',
            'apple-touch-icon.png',
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@wevsoft/shared': path.resolve(__dirname, '../shared/src'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/components/DashboardLayout.tsx',
          './src/pages/HomePage.tsx',
          './src/components/feed/UnifiedFeed.tsx',
        ],
      },
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true },
        '/media': { target: apiTarget, changeOrigin: true },
        '/live-media': { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
        '/widgets': { target: apiTarget, changeOrigin: true },
        '/docs': { target: apiTarget, changeOrigin: true },
        '/robots.txt': { target: apiTarget, changeOrigin: true },
        '/sitemap.xml': { target: apiTarget, changeOrigin: true },
      },
    },

    // Same host/proxy for `npm run preview:lan` (bundled phone preview).
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true },
        '/media': { target: apiTarget, changeOrigin: true },
        '/live-media': { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
        '/widgets': { target: apiTarget, changeOrigin: true },
        '/docs': { target: apiTarget, changeOrigin: true },
        '/robots.txt': { target: apiTarget, changeOrigin: true },
        '/sitemap.xml': { target: apiTarget, changeOrigin: true },
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('\\react\\') ||
              id.includes('\\react-dom\\') ||
              id.includes('\\scheduler\\')
            ) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@tanstack/react-query') || id.includes('@tanstack/query-core')) {
              return 'vendor-query';
            }
            if (id.includes('motion-dom') || id.includes('motion-utils') || id.includes('/motion/') || id.includes('\\motion\\') || id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            return undefined;
          },
        },
      },
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'react-hot-toast',
        'i18next',
        'react-i18next',
        'socket.io-client',
        'date-fns',
        'motion',
        'motion/react',
        'react-virtuoso',
        'react-rnd',
        'dompurify',
      ],
    },

    // ─── Vitest ───────────────────────────────────────────────────────────────
    // Run pure utility / lib tests in a Node-like jsdom environment.
    // Component tests (React Testing Library) will be added incrementally.
    test: {
      environment: 'jsdom',
      // Only pick up files explicitly in src/lib and src/stores for now.
      // Expanding to components is Phase 11 work.
      include: [
        'src/lib/**/*.vitest.test.ts',
        'src/stores/**/*.test.ts',
        'src/hooks/**/*.test.ts', 'src/features/**/*.vitest.test.ts',
        'src/components/**/*.vitest.test.ts',
        'src/components/**/*.vitest.test.tsx',
      ],
      globals: true,
      setupFiles: [],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@wevsoft/shared': path.resolve(__dirname, '../shared/src'),
      },
    },
  };
});
