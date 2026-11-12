/**
 * Renders an existing Space manage section (Products, Team, Analytics, …) inside
 * the WevDesk shell. The panel is the same component /space/:handle/manage/<section>
 * uses, so there is one implementation; the section is only shown when this
 * viewer may open it there (same visibleDashboardSections gate), and the server
 * re-checks every call.
 */

import { ShieldAlert } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { isSpaceDashboardSection, type SpaceDashboardSection } from '@wevsoft/shared/wevspace';
import ManageSectionPanel from '../../components/wevspace/manage/ManageSectionPanel';
import { useDesk } from './deskContext';
import { DeskButton } from './deskUi';

export default function WevDeskSection({ section }: { section: SpaceDashboardSection }) {
  const desk = useDesk();
  if (!desk.sectionIds.includes(section)) {
    return (
      <div className="px-3 sm:px-5 pt-6">
        <div className="wd-card max-w-lg mx-auto p-7 text-center">
          <ShieldAlert className="mx-auto text-[var(--wd-muted)]" />
          <h1 className="mt-3 text-[17px] font-semibold">Not available for your role</h1>
          <p className="mt-1.5 text-[13px] text-[var(--wd-muted)]">Your role on {desk.space.name} does not include this section, or the Space has it turned off.</p>
          <div className="mt-4"><DeskButton to={desk.deskPath()}>Back to Home</DeskButton></div>
        </div>
      </div>
    );
  }
  return (
    <div className="wd-embed px-3 sm:px-5 pt-2 pb-10 max-w-[1400px]">
      <ManageSectionPanel section={section} />
    </div>
  );
}

/** /space/:handle/desk/s/:section - any manage section without its own WevDesk page. */
export function WevDeskSectionRoute() {
  const { section } = useParams();
  const desk = useDesk();
  if (!isSpaceDashboardSection(section)) return <Navigate to={desk.deskPath()} replace />;
  return <WevDeskSection section={section} />;
}
