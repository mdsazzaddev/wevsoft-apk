import React, { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { APP_DETAIL_TABS, APP_SCOPED_SECTIONS, useConsole } from './DeveloperConsoleShell';
import { useDevAccount } from './accountContext';
import { PageLoading } from './ui';

/**
 * /developer/apps/:id/:section? - one route for everything that belongs to a single app.
 * `section` is either an app-scoped console feature (test-users, domains, embed, api-keys, access)
 * or a tab of the app detail page (settings, credentials, oauth, ...). The top-bar app switcher
 * follows the app in the URL, so deep links and bookmarks open the right app.
 */
export function AppSectionRoute({ sections, detail: Detail }: { sections: Record<string, React.ElementType>; detail: React.ElementType }) {
  const { id = '', section = '' } = useParams<{ id: string; section?: string }>();
  const { apps, selectedApp, selectApp } = useConsole();
  const { me, registered, appsQuery } = useDevAccount();
  const known = apps.some((a) => a.id === id);

  useEffect(() => {
    if (known && selectedApp?.id !== id) selectApp(id);
  }, [known, id, selectedApp?.id, selectApp]);

  const Page = sections[section];
  if (Page) {
    if (me.isLoading || (registered && appsQuery.isLoading)) return <PageLoading />;
    // Unknown / deleted app: fall back to the feature's global route (it picks the current app).
    if (registered && !known) return <Navigate to={APP_SCOPED_SECTIONS[section] || '/developer/apps'} replace />;
    return <Page key={id} />;
  }
  if (!section || (APP_DETAIL_TABS as readonly string[]).includes(section)) return <Detail />;
  return <Navigate to={`/developer/apps/${id}`} replace />;
}

/**
 * Global entry of an app-scoped feature (/developer/test-users, ...). With an app available it
 * redirects (replace, so Back skips it) to /developer/apps/:id/<section>; `?app=<id>` picks the app.
 * Without apps or a developer account it renders the page itself (register / no-apps states).
 */
export function AppScopedRedirect({ section, children }: { section: string; children: React.ReactNode }) {
  const { apps, selectedApp } = useConsole();
  const { me, registered, appsQuery } = useDevAccount();
  const { search, hash } = useLocation();
  if (me.isLoading || (registered && appsQuery.isLoading)) return <PageLoading />;
  const q = new URLSearchParams(search);
  const wanted = q.get('app') || q.get('appId');
  const target = (wanted && apps.find((a) => a.id === wanted)) || selectedApp;
  if (registered && target) {
    q.delete('app');
    q.delete('appId');
    const rest = q.toString();
    return <Navigate to={`/developer/apps/${target.id}/${section}${rest ? `?${rest}` : ''}${hash}`} replace />;
  }
  return <>{children}</>;
}
