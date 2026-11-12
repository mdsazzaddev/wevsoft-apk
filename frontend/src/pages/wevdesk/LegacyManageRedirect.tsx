import { Navigate, useLocation, useParams } from 'react-router-dom';
import { spaceDashboardPath } from '@wevsoft/shared/wevspace';

/**
 * /space/:handle/manage[/:section] used to render the old Manage page. That page
 * was replaced by WevDesk, so old links (notifications, payment returns, bookmarks)
 * land on the WevDesk equivalent. Query string and hash are kept (e.g. billing=1).
 */
export default function LegacyManageRedirect() {
  const { handle = '', section } = useParams();
  const location = useLocation();
  const fromPath = location.pathname.match(/\/manage\/([^/]+)/)?.[1];
  return <Navigate to={`${spaceDashboardPath(handle, section || fromPath)}${location.search}${location.hash}`} replace />;
}
