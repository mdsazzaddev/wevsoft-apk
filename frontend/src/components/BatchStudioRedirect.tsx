import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getBusinessAppUrl } from '../lib/businessAppUrl';
import { legacyBatchRedirectPath } from '../lib/batchStudio';
import RouteFallback from './RouteFallback';

/** Main-app `/studio/content?view=batch-*` → Business Suite Batch Upload. */
export default function BatchStudioRedirect() {
  const location = useLocation();
  useEffect(() => {
    window.location.replace(getBusinessAppUrl(legacyBatchRedirectPath(location.search)));
  }, [location.search]);
  return <RouteFallback />;
}
