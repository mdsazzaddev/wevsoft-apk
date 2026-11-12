import { Navigate, useLocation } from 'react-router-dom';
import { PERSONAL_CREATOR_HUB_PATH } from '../lib/creatorHub';

/** /creator, /pro-studio, /professional-dashboard, /business/dashboard -> Creator Hub, keeping ?tab= etc. */
export default function CreatorHubRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={`${PERSONAL_CREATOR_HUB_PATH}${search}${hash}`} replace />;
}
