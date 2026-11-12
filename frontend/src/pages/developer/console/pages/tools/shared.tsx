/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { type DeveloperApp } from '../../../devApi';
import { cx } from '../../../devUi';
import { useAppLogs } from '../../consoleData';
import { AppSelect, Card, EmptyState, LoadingRows, Pill, btn, fmtDate, tdCls, thCls } from '../../ui';

export function deliveryTone(status: string) {
  return status === 'success' ? 'green' : status === 'failed' || status === 'dead' ? 'red' : 'amber';
}
export function useAppPicker(apps: DeveloperApp[]) {
  const [id, setId] = useState('');
  const app = apps.find((a) => a.id === id) || apps[0] || null;
  return { app, id: app?.id || '', setId };
}
/** Recent API requests for one app (real DeveloperApiLog rows). */
export function ApiLogsCard({ apps }: { apps: DeveloperApp[] }) {
  const picked = useAppPicker(apps);
  const logs = useAppLogs(picked.id, 50);
  const rows = logs.data?.logs || [];
  return (
    <Card
      title="API request logs"
      description="Calls made with this app's API keys or OAuth tokens. Sensitive headers are redacted."
      className="mt-4"
      bodyClassName="!px-0"
      action={
        <>
          <AppSelect apps={apps} value={picked.id} onChange={picked.setId} />
          <Link to="/developer/analytics" className={cx(btn.secondary, btn.sm)}>Open analytics</Link>
        </>
      }
    >
      {logs.isLoading ? (
        <div className="px-4"><LoadingRows rows={3} /></div>
      ) : logs.isError ? (
        <p className="px-4 text-[12px] text-[var(--dc-red)]">Could not load logs.</p>
      ) : rows.length === 0 ? (
        <div className="px-4"><EmptyState icon={ScrollText} title="No API requests yet" body="Requests to the developer API made with this app's credentials will appear here." /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className={thCls}>Time</th>
                <th className={thCls}>Method</th>
                <th className={thCls}>Endpoint</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Duration</th>
                <th className={thCls}>Auth</th>
                <th className={thCls}>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className={tdCls}>{fmtDate(l.createdAt, true)}</td>
                  <td className={cx(tdCls, 'font-mono')}>{l.method}</td>
                  <td className={cx(tdCls, 'font-mono max-w-[280px] truncate')}>{l.endpoint}</td>
                  <td className={tdCls}><Pill tone={l.statusCode >= 500 ? 'red' : l.statusCode >= 400 ? 'amber' : 'green'}>{l.statusCode}</Pill></td>
                  <td className={tdCls}>{l.durationMs} ms</td>
                  <td className={tdCls}>{l.authType === 'api_key' ? 'API key' : l.authType === 'oauth' ? 'OAuth' : '—'}</td>
                  <td className={cx(tdCls, 'font-mono')}>{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
