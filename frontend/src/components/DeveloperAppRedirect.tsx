import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getDeveloperAppOrigin, getDeveloperAppUrl } from '../lib/developerAppUrl';
import RouteFallback from './RouteFallback';

/**
 * /developer/* moved to the standalone Developer app (developer.wevsoft.com, :3003 in dev).
 * Signed-in users get their session via the one-time handoff code flow (WS7c).
 */
export default function DeveloperAppRedirect() {
  const location = useLocation();
  useEffect(() => {
    // Guard against a loop if the developer app is ever served from this same origin.
    if (getDeveloperAppOrigin() === window.location.origin) return;
    const target = getDeveloperAppUrl(`${location.pathname}${location.search}`);
    // WS7c: never put a token in the URL. The developer app bounces to /auth with a
    // PKCE challenge and AuthPage hands back a one-time code.
    window.location.replace(target);
  }, [location.pathname, location.search]);
  return <RouteFallback />;
}
