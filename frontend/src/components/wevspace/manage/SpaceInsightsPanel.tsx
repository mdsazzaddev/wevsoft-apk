/** Space manage / WevDesk "Analytics" section — the Insights dashboard scoped to this Space. */
import InsightsDashboard from '../../insights/InsightsDashboard';
import { useManage } from './ManageContext';

export default function SpaceInsightsPanel() {
  const { spaceId, space } = useManage() as any;
  return <InsightsDashboard embedded spaceId={spaceId} spaceName={space?.name} />;
}
