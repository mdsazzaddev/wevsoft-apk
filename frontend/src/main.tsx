// First import on purpose: renames the persisted `sora_*` storage keys to
// `wev_*` before any module that reads them is evaluated.
import './lib/brandStorage';
import { cssReady } from './lib/asyncCss';
import { installStaleChunkReload } from './lib/staleChunkReload';
import './lib/cookieAuthEnv';
import { installApiFetchInterceptor } from '@wevsoft/shared/api/fetch-interceptor';
import { bearerRefreshBinding } from './lib/bearerRefresh';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { ReducedMotionProvider } from './components/ReducedMotionProvider';
import './index.css';
import './i18n';
import { useStore } from './store';
import { apiUrl } from './lib/apiBase';
import { bootstrapServiceWorker } from './lib/pwaDisplay';
import {
  applyDisplayModeToDocument,
  resolveThemeLabelForPaint,
} from './lib/statusBarTheme';
import { armWevSplashFailsafe } from './lib/wevSplash';

// A deploy replaces every hashed chunk; reload once instead of showing a blank page.
installStaleChunkReload();

// SW register/purge runs AFTER the page has loaded and gone idle: registering during
// boot made the precache download compete with the first-visit bundle on slow
// mobile networks, delaying first paint and the install flow.
function scheduleServiceWorkerBootstrap(): void {
  const run = () => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => void bootstrapServiceWorker(), { timeout: 4000 });
    } else {
      window.setTimeout(() => void bootstrapServiceWorker(), 1500);
    }
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
scheduleServiceWorkerBootstrap();

try {
  applyDisplayModeToDocument(
    resolveThemeLabelForPaint(localStorage.getItem('theme')),
  );
} catch {
  applyDisplayModeToDocument('Light mode');
}
// Single safety net only: the splash is normally removed when the app shell mounts.
armWevSplashFailsafe(8000);

// Start downloading the signed-in shell + home in parallel with React boot.
if (useStore.getState().token) {
  void import('./components/DashboardLayout');
  void import('./pages/HomePage');
}

installApiFetchInterceptor({
  resolveBackendUrl: apiUrl,
  bearerRefresh: bearerRefreshBinding,
  onUnauthorized: () => {
    const store = useStore.getState();
    if (store.token) store.logout();
  },
});

// Mount only once the deferred (non-render-blocking) stylesheet is applied; the
// HTML splash stays up meanwhile, so there is never an unstyled flash.
void cssReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ReducedMotionProvider>
        <App />
      </ReducedMotionProvider>
    </StrictMode>,
  );
});
