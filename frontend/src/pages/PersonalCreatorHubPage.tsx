import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RouteFallback from '../components/RouteFallback';
import { spaceCreatorHubUrl } from '../lib/creatorHub';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

const CreatorDashboardPage = lazy(() => import('./CreatorDashboardPage'));

/**
 * Main-app `/creator-hub`: the PERSONAL Creator Hub.
 * While the shell is in Space mode the same URL opens that Space's own hub on
 * Business Suite instead, so a Space never sees the personal tool set (and vice versa).
 * `?as=personal` (sent by the Creator Hub account switcher on Business Suite) leaves
 * Space mode first, so choosing "Personal account" does not bounce back to the Space hub.
 */
export default function PersonalCreatorHubPage() {
  const { isSpaceMode, active, setActive } = useSpaceIdentities();
  const location = useLocation();
  const navigate = useNavigate();
  const forcePersonal = new URLSearchParams(location.search).get('as') === 'personal';
  const spaceId = !forcePersonal && isSpaceMode && active?.kind === 'space' ? active.id : null;

  useEffect(() => {
    if (!forcePersonal) return;
    setActive(null);
    const q = new URLSearchParams(location.search);
    q.delete('as');
    const rest = q.toString();
    navigate(`${location.pathname}${rest ? `?${rest}` : ''}`, { replace: true });
  }, [forcePersonal, setActive, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!spaceId) return;
    const q = new URLSearchParams(location.search);
    window.location.replace(spaceCreatorHubUrl(q.get('tab'), q.get('sub'), spaceId));
  }, [spaceId, location.search]);

  if (spaceId) return <RouteFallback />;
  return (
    <Suspense fallback={<RouteFallback />}>
      <CreatorDashboardPage />
    </Suspense>
  );
}