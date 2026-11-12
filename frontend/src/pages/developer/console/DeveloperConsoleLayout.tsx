import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import CreateAppModal from '../CreateAppModal';
import { useDeveloperApps, useDeveloperMe } from '../devApi';
import { useSpaceIdentities } from '../../../lib/useSpaceIdentities';
import DeveloperConsoleShell from './DeveloperConsoleShell';
import { DevAccountCtx, type DevAccount } from './accountContext';
import { PageLoading } from './ui';
import ConsoleErrorBoundary from './ConsoleErrorBoundary';
import { dismissWevSplash } from '../../../lib/wevSplash';

/**
 * Layout route for every /developer/* page: one persistent console shell
 * (top bar + sidebar + footer), the developer account/apps queries and the
 * Create App modal. Pages render into <Outlet />.
 */
export default function DeveloperConsoleLayout() {
  useEffect(() => {
    dismissWevSplash();
  }, []);

  // Lock document scroll while the console shell is mounted. Nested sidebar
  // scrollports can otherwise expand html.scrollHeight and leave blank space
  // under the footer that the window can scroll into.
  useEffect(() => {
    const html = document.documentElement;
    const prevScrollY = window.scrollY;
    html.classList.add('dc-console-lock');
    window.scrollTo(0, 0);
    return () => {
      html.classList.remove('dc-console-lock');
      if (prevScrollY) window.scrollTo(0, prevScrollY);
    };
  }, []);

  const { pathname } = useLocation();
  const me = useDeveloperMe();
  const registered = Boolean(me.data?.registered);
  const appsQuery = useDeveloperApps(registered);
  const [createOpen, setCreateOpen] = useState(false);
  // Acting as a WevSpace you own: new apps are linked to that Space (same as the Space dashboard panel).
  const { isSpaceMode, active } = useSpaceIdentities();
  const linkSpaceId = isSpaceMode && active?.id && active.role === 'OWNER' ? active.id : null;

  const openCreate = useCallback(() => {
    if (registered) setCreateOpen(true);
    else toast('Register as a developer first.');
  }, [registered]);

  const apps = appsQuery.data || [];
  const value = useMemo<DevAccount>(
    () => ({ me, registered, appsQuery, apps, openCreate, linkSpaceId }),
    [me, registered, appsQuery, apps, openCreate, linkSpaceId],
  );

  return (
    <DevAccountCtx.Provider value={value}>
      <DeveloperConsoleShell apps={apps} onCreate={openCreate}>
        <ConsoleErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </ConsoleErrorBoundary>
        <CreateAppModal isOpen={createOpen} onClose={() => setCreateOpen(false)} wevspaceId={linkSpaceId} />
      </DeveloperConsoleShell>
    </DevAccountCtx.Provider>
  );
}
