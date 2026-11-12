/**
 * WevDesk → Integrations & API. A summary of the Developer Console data
 * (apps, OAuth clients, connected platforms) inside the desk shell; each row deep-links
 * to the matching Developer Console page for the full tool. The console keeps its own
 * shell and account context, so it is linked rather than re-rendered here.
 */

import { Code2 } from 'lucide-react';
import { useConnectedPlatforms } from '../developer/console/consoleData';
import { useDeveloperApps, useDeveloperMe } from '../developer/devApi';
import { DeskButton, DeskCard, EmptyNote, PageHeader, Pill, Row, StatTile, fmtNum } from './deskUi';

export default function WevDeskIntegrations() {
  const me = useDeveloperMe();
  const registered = Boolean(me.data?.registered);
  const apps = useDeveloperApps(registered);
  const platforms = useConnectedPlatforms();
  const appList: any[] = apps.data || [];
  const connected = (platforms.data || []).filter((p) => p.isConnected);

  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1400px]">
      <PageHeader
        icon={Code2}
        title="Integrations & API"
        subtitle="Your apps, API keys, OAuth clients, webhooks and connected platforms. Open any row for the full Developer Console tool."
        actions={<DeskButton to="/developer">Developer Console</DeskButton>}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Developer account" value={me.isLoading ? '—' : registered ? 'Active' : 'Not set up'} sub={registered ? 'Registered' : 'Create one in the console'} />
        <StatTile label="Apps" value={registered ? fmtNum(appList.length) : '—'} sub="OAuth / API apps" />
        <StatTile label="Connected platforms" value={platforms.data ? fmtNum(connected.length) : '—'} sub="Social & other accounts" />
        <StatTile label="Webhooks" value="—" sub="Per app, in the console" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DeskCard title="Your apps" to="/developer/apps">
          {!registered ? (
            <EmptyNote title="No developer account yet">Set one up in the Developer Console to create apps and API keys.</EmptyNote>
          ) : appList.length === 0 ? (
            <EmptyNote title="No apps yet">Create an app to get OAuth credentials and API keys.</EmptyNote>
          ) : (
            appList.slice(0, 6).map((a) => (
              <Row key={a.id} label={a.name || a.id}>
                <DeskButton to={`/developer/apps/${a.id}`}>Open</DeskButton>
              </Row>
            ))
          )}
          <div className="pt-2 flex flex-wrap gap-2"><DeskButton to="/developer/apps/new">Create app</DeskButton></div>
        </DeskCard>
        <DeskCard title="Access & automation">
          <Row label="API keys & secrets"><DeskButton to="/developer/credentials">Manage</DeskButton></Row>
          <Row label="OAuth clients"><DeskButton to="/developer/oauth/clients">Open</DeskButton></Row>
          <Row label="Webhooks (n8n, Zapier…)"><DeskButton to="/developer/webhooks">Open</DeskButton></Row>
          <Row label="API explorer"><DeskButton to="/developer/api-explorer">Try</DeskButton></Row>
          <Row label="Logs & usage"><DeskButton to="/developer/logs">View</DeskButton></Row>
        </DeskCard>
        <DeskCard title="Connected platforms" to="/developer/integrations/social">
          {connected.length === 0 ? (
            <EmptyNote title="Nothing connected">Connect Facebook, Instagram, YouTube and others in Social platforms.</EmptyNote>
          ) : (
            connected.map((p) => (
              <Row key={p.platform} label={String(p.platform).charAt(0).toUpperCase() + String(p.platform).slice(1)}>
                <Pill tone={p.connection?.needsReconnect ? 'grey' : 'green'}>{p.connection?.needsReconnect ? 'Reconnect' : 'Connected'}</Pill>
              </Row>
            ))
          )}
        </DeskCard>
        <DeskCard title="More integrations">
          <Row label="WevChat integrations"><DeskButton to="/developer/integrations/wevchat">Open</DeskButton></Row>
          <Row label="AI providers & your own key"><DeskButton to="/developer/integrations/ai">Open</DeskButton></Row>
          <Row label="Storage & files"><DeskButton to="/developer/integrations/storage">Open</DeskButton></Row>
          <Row label="Payments & commerce"><DeskButton to="/developer/integrations/payments">Open</DeskButton></Row>
        </DeskCard>
      </div>
    </div>
  );
}
