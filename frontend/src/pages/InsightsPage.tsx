import { Navigate } from 'react-router-dom';

/** Legacy /insights → Creator Hub Insights (Facebook Professional Dashboard home). */
export default function InsightsPage() {
  return <Navigate to="/creator-hub?tab=analytics" replace />;
}
