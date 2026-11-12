import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getBusinessAppOrigin, getBusinessAppUrl } from '../lib/businessAppUrl';
import RouteFallback from './RouteFallback';

/** /business/* lives in the standalone Business Suite (business.wevsoft.com, :3004 in dev). */
export default function BusinessAppRedirect() {
  const location = useLocation();
  useEffect(() => {
    if (getBusinessAppOrigin() === window.location.origin) return;
    const target = getBusinessAppUrl(`${location.pathname}${location.search}`);
    // WS7c: never put a token in the URL. The business app bounces to /auth with a
    // PKCE challenge and AuthPage hands back a one-time code.
    window.location.replace(target);
  }, [location.pathname, location.search]);
  return <RouteFallback />;
}
