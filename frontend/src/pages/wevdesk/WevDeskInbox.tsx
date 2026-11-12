/** WevDesk → Unified Inbox: the phase-1 Space Inbox rendered inside the WevDesk shell. */

import { lazy } from 'react';
import { useDesk } from './deskContext';

const SpaceInbox = lazy(() => import('../../components/wevspace/inbox/SpaceInbox'));

export default function WevDeskInbox() {
  const { sectionIds, can } = useDesk();
  if (!can('messages.read')) {
    return (
      <div className="h-full grid place-items-center p-6">
        <div className="wd-card max-w-md p-7 text-center">
          <h2 className="text-[17px] font-semibold">Inbox not available</h2>
          <p className="mt-1.5 text-[13px] text-[var(--wd-muted)]">Your role on this Space does not include reading messages. Ask the owner for the messages permission.</p>
        </div>
      </div>
    );
  }
  return <SpaceInbox embedded sectionIds={sectionIds} />;
}
