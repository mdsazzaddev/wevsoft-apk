/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import { Link } from 'react-router-dom';
import { useDevAccount } from '../../accountContext';
import { ConsolePage, LoadingRows, btn } from '../../ui';
import { WebhookManager } from './WebhookManager';

export function WebhooksPage() {
  const { appsQuery } = useDevAccount();
  return (
    <ConsolePage
      group="Developer Tools"
      title="Webhooks"
      description="Receive signed HTTP callbacks when events happen on Wevsoft."
      actions={<Link to="/developer/api-reference#webhooks" className={btn.secondary}>Verification guide</Link>}
    >
      {appsQuery.isLoading ? <LoadingRows rows={4} /> : <WebhookManager />}
    </ConsolePage>
  );
}
