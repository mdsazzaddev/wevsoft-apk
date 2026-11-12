import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { creatorHubAppUrl } from '../lib/creatorHub';
import { getBusinessAppOrigin } from '../lib/businessAppUrl';
import RouteFallback from './RouteFallback';

/**
 * Main-app entry for Creator Hub → hard-nav to Business Suite Space hub (:3004).
 * Preserves ?tab= / ?sub= from the current URL.
 */
export default function CreatorHubAppRedirect({ tab, sub }: { tab?: string | null; sub?: string | null } = {}) {
  const location = useLocation();
  const [params] = useSearchParams();
  useEffect(() => {
    if (getBusinessAppOrigin() === window.location.origin) return;
    const nextTab = tab ?? params.get('tab');
    const nextSub = sub ?? params.get('sub');
    window.location.replace(creatorHubAppUrl(nextTab, nextSub) + (location.hash || ''));
  }, [location.hash, params, tab, sub]);
  return <RouteFallback />;
}
