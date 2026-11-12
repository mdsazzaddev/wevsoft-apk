/**
 * Existing app pages shown inside the WevDesk shell (one route each):
 * Content Studio, Business AI agents, Business CRM.
 * Creator Hub is hosted on Business Suite (:3004) — desk deep-links bounce there.
 */

import { useEffect } from 'react';
import ContentStudioPage from '../ContentStudioPage';
import { BusinessAIAgentConfig } from '../../components/business/BusinessAIAgentConfig';
import { CRMLeadKanban } from '../../components/business/CRMLeadKanban';
import { spaceCreatorHubUrl } from '../../lib/creatorHub';
import RouteFallback from '../../components/RouteFallback';
import { useDesk } from './deskContext';

export type DeskEmbedPage = 'content-studio' | 'ai-agents' | 'crm' | 'creator-hub';

/** WevDesk is a Space desk, so its Creator Hub entry opens the Space hub for that Space. */
function CreatorHubDeskRedirect({ spaceId }: { spaceId?: string | null }) {
  useEffect(() => {
    window.location.replace(spaceCreatorHubUrl(null, null, spaceId));
  }, [spaceId]);
  return <RouteFallback />;
}

export default function WevDeskEmbeds({ page }: { page: DeskEmbedPage }) {
  const { space } = useDesk();
  if (page === 'creator-hub') {
    return (
      <div className="wd-embed h-full min-h-[calc(100vh-64px)] flex">
        <CreatorHubDeskRedirect spaceId={space?.id} />
      </div>
    );
  }
  return (
    <div className="wd-embed px-1 sm:px-3 pt-1 pb-10 max-w-[1400px]">
      {page === 'content-studio' && <ContentStudioPage space={{ id: space.id, name: space.name }} />}
      {page === 'ai-agents' && <BusinessAIAgentConfig />}
      {page === 'crm' && <CRMLeadKanban />}
    </div>
  );
}
