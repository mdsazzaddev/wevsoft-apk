import { useState } from 'react';
import { Building2, ClipboardCheck, Gavel, LifeBuoy, ShieldCheck } from 'lucide-react';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { AppSelect, Card, ConsolePage, EmptyState, ErrorCard, InfoNote, LoadingRows, NoAppsState, Pill, StatTile, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';
import { usePfMutation, usePfQuery } from '../platformApi';

type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';
const TONE: Record<string, Tone> = {
  approved: 'green', ok: 'green', active: 'amber', answered: 'green', open: 'blue',
  pending: 'blue', submitted: 'blue', appealed: 'blue', due_soon: 'amber', warning: 'amber',
  rejected: 'red', revoked: 'red', overdue: 'red', restricted: 'red', upheld: 'red', strike: 'red', suspension: 'red',
  overturned: 'gray', expired: 'gray', closed: 'gray', not_required: 'gray',
};
const tone = (s?: string | null): Tone => (s && TONE[s]) || 'gray';
const label = (s?: string | null) => (s || 'none').replace(/_/g, ' ');

/* ------------------------------------------------------------------ */
/* Trust & Compliance (/developer/compliance)                           */
/* ------------------------------------------------------------------ */

function BusinessVerificationCard() {
  const q = usePfQuery<any>(['business-verification'], '/api/developer/platform/business-verification');
  const [f, setF] = useState({ legalName: '', registrationNumber: '', country: 'BD', address: '', website: 'https://', contactEmail: '', documentUrl: '', notes: '' });
  const submit = usePfMutation<any>('POST', () => '/api/developer/platform/business-verification', { invalidate: [['business-verification']], success: 'Submitted for review' });
  const cur = q.data?.current;
  const canSubmit = !cur || !['pending', 'approved'].includes(cur.status);
  return (
    <Card title="Business verification" description={q.data ? `Needed for the ${q.data.requiredFor.scopes.join(', ')} scopes and the Enterprise tier. Reviewed by the Wevsoft team.` : undefined}>
      {q.isLoading ? <LoadingRows rows={2} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
            <Pill tone={cur ? tone(cur.status) : 'gray'}>{cur ? label(cur.status) : 'not submitted'}</Pill>
            {cur && <span>{cur.legalName} - submitted {fmtDate(cur.createdAt)}{cur.reviewedAt ? `, reviewed ${fmtDate(cur.reviewedAt)}` : ''}</span>}
            {cur?.adminNote && <span className="text-[var(--dc-muted)]">Reviewer note: {cur.adminNote}</span>}
          </div>
          {canSubmit && (
            <form className="grid gap-2 min-[800px]:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit.mutate({ ...f, documentUrl: f.documentUrl || undefined, notes: f.notes || undefined }); }}>
              <div><label className={labelCls} htmlFor="bv-legal">Legal business name</label><input id="bv-legal" className={inputCls} value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="bv-reg">Trade licence / registration number</label><input id="bv-reg" className={inputCls} value={f.registrationNumber} onChange={(e) => setF({ ...f, registrationNumber: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="bv-country">Country (ISO code)</label><input id="bv-country" maxLength={2} className={inputCls} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value.toUpperCase() })} /></div>
              <div><label className={labelCls} htmlFor="bv-web">Website (https)</label><input id="bv-web" className={inputCls} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div>
              <div className="min-[800px]:col-span-2"><label className={labelCls} htmlFor="bv-addr">Registered address</label><input id="bv-addr" className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="bv-email">Business contact email</label><input id="bv-email" type="email" className={inputCls} value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="bv-doc">Document link (optional, https)</label><input id="bv-doc" className={inputCls} value={f.documentUrl} onChange={(e) => setF({ ...f, documentUrl: e.target.value })} placeholder="Link to the licence / certificate" /></div>
              <div className="min-[800px]:col-span-2"><label className={labelCls} htmlFor="bv-notes">Notes (optional)</label><textarea id="bv-notes" rows={2} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
              <div><button className={btn.primary} disabled={submit.isPending}>Submit for verification</button></div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

function CheckupCard({ appId }: { appId: string }) {
  const q = usePfQuery<any>(['compliance', appId], `/api/developer/platform/apps/${appId}/compliance`);
  const [purposes, setPurposes] = useState<Record<string, string>>({});
  const [f, setF] = useState({ retentionDays: 90, sharesWithThirdParties: false, thirdParties: '', deletionProcess: '', certify: false });
  const submit = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/compliance`, { invalidate: [['compliance', appId]], success: 'Data use checkup submitted' });
  const d = q.data;
  const latest = d?.history?.[0];
  return (
    <Card title="Data use checkup" description="Production apps confirm once a year how they use each approved permission. If it is more than 30 days overdue the app gets a policy strike automatically.">
      {q.isLoading ? <LoadingRows rows={2} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : d && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
            <Pill tone={tone(d.state)}>{label(d.state)}</Pill>
            {d.mode === 'production' ? <span>Due {fmtDate(d.dueAt)}</span> : <span className="text-[var(--dc-muted)]">Only required once the app is in production mode.</span>}
            {latest?.adminNote && <span className="text-[var(--dc-muted)]">Last reviewer note: {latest.adminNote}</span>}
          </div>
          {d.state === 'submitted' ? <InfoNote>Your checkup is waiting for review.</InfoNote> : (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); submit.mutate({ ...f, purposes, thirdParties: f.thirdParties || undefined }); }}>
              {d.scopes.length === 0 ? <div className="text-[12px] text-[var(--dc-muted)]">This app has no approved permissions yet, so only retention and deletion are asked.</div> : d.scopes.map((sc: string) => (
                <div key={sc}><label className={labelCls} htmlFor={`pu-${sc}`}>How do you use <code className="dc-code">{sc}</code>?</label><input id={`pu-${sc}`} className={inputCls} value={purposes[sc] || ''} onChange={(e) => setPurposes({ ...purposes, [sc]: e.target.value })} /></div>
              ))}
              <div className="grid gap-2 min-[800px]:grid-cols-2">
                <div><label className={labelCls} htmlFor="cu-ret">Data retention (days)</label><input id="cu-ret" type="number" min={0} max={3650} className={inputCls} value={f.retentionDays} onChange={(e) => setF({ ...f, retentionDays: Number(e.target.value) })} /></div>
                <label className="mt-6 flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={f.sharesWithThirdParties} onChange={(e) => setF({ ...f, sharesWithThirdParties: e.target.checked })} /> We share Wevsoft data with third parties</label>
              </div>
              {f.sharesWithThirdParties && <div><label className={labelCls} htmlFor="cu-3p">Which third parties, and why</label><input id="cu-3p" className={inputCls} value={f.thirdParties} onChange={(e) => setF({ ...f, thirdParties: e.target.value })} /></div>}
              <div><label className={labelCls} htmlFor="cu-del">How you delete data when a person asks</label><textarea id="cu-del" rows={2} className={inputCls} value={f.deletionProcess} onChange={(e) => setF({ ...f, deletionProcess: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={f.certify} onChange={(e) => setF({ ...f, certify: e.target.checked })} /> I confirm this is accurate and follows the Wevsoft Platform Terms</label>
              <button className={btn.primary} disabled={!f.certify || submit.isPending}>Submit checkup</button>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

function AttestationCard({ appId }: { appId: string }) {
  const q = usePfQuery<any>(['attestation', appId], `/api/developer/platform/apps/${appId}/security-attestation`);
  const [controls, setControls] = useState<Record<string, boolean>>({});
  const [f, setF] = useState({ securityContactEmail: '', lastPenTestDate: '', certificationUrl: '', notes: '', certify: false });
  const submit = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/security-attestation`, { invalidate: [['attestation', appId]], success: 'Security attestation submitted' });
  const d = q.data;
  const latest = d?.history?.[0];
  return (
    <Card title="Data protection / security attestation" description={d ? `Required before the ${d.requiredFor.join(', ')} scopes can be approved. Valid for 12 months after approval.` : undefined}>
      {q.isLoading ? <LoadingRows rows={2} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : d && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
            <Pill tone={d.valid ? 'green' : latest ? tone(latest.status) : 'gray'}>{d.valid ? 'valid' : latest ? label(latest.status) : 'not submitted'}</Pill>
            {latest?.expiresAt && <span>Expires {fmtDate(latest.expiresAt)}</span>}
            {latest?.adminNote && <span className="text-[var(--dc-muted)]">Reviewer note: {latest.adminNote}</span>}
          </div>
          {latest?.status === 'pending' ? <InfoNote>Your attestation is waiting for review.</InfoNote> : (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); submit.mutate({ controls: Object.fromEntries(d.controls.map((c: any) => [c.id, !!controls[c.id]])), securityContactEmail: f.securityContactEmail, lastPenTestDate: f.lastPenTestDate || undefined, certificationUrl: f.certificationUrl || undefined, notes: f.notes || undefined, certify: f.certify }); }}>
              {d.controls.map((c: any) => (
                <label key={c.id} className="flex items-start gap-2 text-[12.5px]"><input className="mt-[3px]" type="checkbox" checked={!!controls[c.id]} onChange={(e) => setControls({ ...controls, [c.id]: e.target.checked })} /> {c.label}</label>
              ))}
              <div className="grid gap-2 min-[800px]:grid-cols-3">
                <div><label className={labelCls} htmlFor="sa-email">Security contact email</label><input id="sa-email" type="email" className={inputCls} value={f.securityContactEmail} onChange={(e) => setF({ ...f, securityContactEmail: e.target.value })} /></div>
                <div><label className={labelCls} htmlFor="sa-pt">Last penetration test (optional)</label><input id="sa-pt" type="date" className={inputCls} value={f.lastPenTestDate} onChange={(e) => setF({ ...f, lastPenTestDate: e.target.value })} /></div>
                <div><label className={labelCls} htmlFor="sa-cert">Certification link (optional)</label><input id="sa-cert" className={inputCls} placeholder="https:// (ISO 27001, SOC 2 ...)" value={f.certificationUrl} onChange={(e) => setF({ ...f, certificationUrl: e.target.value })} /></div>
              </div>
              <div><label className={labelCls} htmlFor="sa-notes">Notes (required if any control is not met: your plan and timeline)</label><textarea id="sa-notes" rows={2} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={f.certify} onChange={(e) => setF({ ...f, certify: e.target.checked })} /> I am authorised to make this attestation and it is accurate</label>
              <button className={btn.primary} disabled={!f.certify || submit.isPending}>Submit attestation</button>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

function StrikesCard({ appId, policies }: { appId: string; policies: any[] }) {
  const q = usePfQuery<any>(['strikes', appId], `/api/developer/platform/apps/${appId}/strikes`);
  const [appealFor, setAppealFor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const appeal = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/strikes/${appealFor}/appeal`, { invalidate: [['strikes', appId]], success: 'Appeal sent', onDone: () => { setAppealFor(null); setText(''); } });
  const title = (code: string) => policies.find((p) => p.code === code)?.title || code;
  const d = q.data;
  return (
    <Card title="Policy enforcement" description="Warnings and strikes on this app. Three active strikes within 12 months, or one suspension, suspends the app: its tokens and API keys stop working until it is lifted.">
      {q.isLoading ? <LoadingRows rows={2} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : d && (
        <>
          {d.suspended && <div className="mb-3 rounded-md border border-[var(--dc-border)] bg-[var(--dc-red-soft)] p-3 text-[12.5px] text-[var(--dc-red-text)]">This app is suspended since {fmtDate(d.suspendedAt, true)} ({d.suspendedReason}). Appeal the strikes below or contact support.</div>}
          {d.strikes.length === 0 ? <EmptyState icon={Gavel} title="No policy actions" body="This app has no warnings or strikes." /> : (
            <table className="w-full text-left">
              <thead><tr><th className={thCls}>Policy</th><th className={thCls}>Severity</th><th className={thCls}>Status</th><th className={thCls}>Issued</th><th className={thCls}>Expires</th><th className={thCls} /></tr></thead>
              <tbody>
                {d.strikes.map((s: any) => (
                  <tr key={s.id}>
                    <td className={tdCls}><div className="font-medium">{title(s.policyCode)}</div><div className="text-[11.5px] text-[var(--dc-muted)]">{s.reason}</div>{s.adminNote && <div className="text-[11.5px]">Reviewer: {s.adminNote}</div>}</td>
                    <td className={tdCls}><Pill tone={tone(s.severity)}>{s.severity}</Pill></td>
                    <td className={tdCls}><Pill tone={tone(s.status)}>{s.status}</Pill></td>
                    <td className={tdCls}>{fmtDate(s.createdAt)}</td>
                    <td className={tdCls}>{fmtDate(s.expiresAt)}</td>
                    <td className={tdCls}>{s.status === 'active' && s.severity !== 'warning' && <button className={btn.secondary} onClick={() => setAppealFor(s.id)}>Appeal</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {appealFor && (
            <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); appeal.mutate({ text }); }}>
              <label className={labelCls} htmlFor="appeal-text">Why should this strike be overturned? (30+ characters)</label>
              <textarea id="appeal-text" rows={3} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex gap-2"><button className={btn.primary} disabled={text.trim().length < 30 || appeal.isPending}>Send appeal</button><button type="button" className={btn.secondary} onClick={() => setAppealFor(null)}>Cancel</button></div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

export function TrustCompliancePage() {
  const { apps, appId, setAppId } = useConsoleApp();
  const pol = usePfQuery<any>(['policies'], '/api/developer/platform/policies');
  const policies = pol.data?.policies || [];
  return (
    <ConsolePage group="Developer Tools" title="Trust & Compliance" description="Business verification, the yearly data use checkup, security attestation and policy enforcement for your apps." actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}>
      {pol.data && (
        <div className="mb-4 grid gap-3 min-[640px]:grid-cols-4">
          <StatTile icon={Building2} label="Business verification for" value={pol.data.requirements.businessVerificationScopes.length} hint={`scopes, plus ${pol.data.requirements.businessVerificationPlans.join(', ')} tier`} />
          <StatTile icon={ShieldCheck} label="Attestation needed for" value={pol.data.requirements.securityAttestationScopes.length} hint={pol.data.requirements.securityAttestationScopes.join(', ')} tone="green" />
          <StatTile icon={ClipboardCheck} label="Checkup every" value={`${pol.data.requirements.dataUseCheckup.periodDays} days`} hint={`${pol.data.requirements.dataUseCheckup.graceDays}-day grace, production apps`} tone="amber" />
          <StatTile icon={Gavel} label="Strikes to suspend" value={pol.data.enforcement.strikesToSuspend} hint={`each lasts ${pol.data.enforcement.strikeLifetimeDays} days`} tone="amber" />
        </div>
      )}
      <BusinessVerificationCard />
      {apps.length === 0 ? <div className="mt-4"><NoAppsState what="compliance" /></div> : appId && (
        <div className="mt-4 grid gap-4">
          <CheckupCard key={`c-${appId}`} appId={appId} />
          <AttestationCard key={`a-${appId}`} appId={appId} />
          <StrikesCard key={`s-${appId}`} appId={appId} policies={policies} />
        </div>
      )}
      <Card title="Platform policies" description="Public at GET /api/developer/platform/policies." className="mt-4">
        {pol.isLoading ? <LoadingRows rows={3} /> : pol.isError ? <ErrorCard message={(pol.error as Error)?.message} /> : (
          <div className="divide-y divide-[var(--dc-border)]">
            {policies.map((p: any) => (
              <div key={p.code} className="py-2 text-[12.5px]"><span className="font-medium">{p.title}</span> <code className="dc-code ml-1">{p.code}</code><div className="text-[var(--dc-muted)]">{p.text}</div></div>
            ))}
          </div>
        )}
      </Card>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Developer support (/developer/support)                               */
/* ------------------------------------------------------------------ */

export function DeveloperSupportPage() {
  const q = usePfQuery<any>(['support'], '/api/developer/platform/support');
  const [f, setF] = useState({ appId: '', category: 'api', severity: 'normal', subject: '', body: '' });
  const create = usePfMutation<any>('POST', () => '/api/developer/platform/support/requests', { invalidate: [['support']], success: 'Support request sent', onDone: () => setF({ ...f, subject: '', body: '' }) });
  const close = usePfMutation<string>('POST', (id) => `/api/developer/platform/support/requests/${id}/close`, { invalidate: [['support']], success: 'Request closed', bodyFor: () => ({}) });
  const d = q.data;
  const selectedPlan = d?.apps.find((a: any) => a.id === f.appId)?.plan || 'free';
  return (
    <ConsolePage group="Developer Tools" title="Developer Support" description="Ask the Wevsoft platform team for help. Response targets depend on the app's tier.">
      {q.isLoading ? <LoadingRows rows={3} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : d && (
        <>
          <div className="grid gap-4 min-[1000px]:grid-cols-3">
            {d.plans.map((p: any) => (
              <Card key={p.plan} title={p.label} description={`First response: ${p.firstResponse}`}>
                <ul className="space-y-1 text-[12.5px]">
                  {p.severityTargets ? Object.entries(p.severityTargets).map(([sev, t]: any) => <li key={sev}><span className="capitalize">{sev}</span>: {t}</li>) : <li>No per-severity targets</li>}
                  <li>{p.availability}</li>
                  <li className="text-[var(--dc-muted)]">{p.channels.join(' - ')}</li>
                </ul>
              </Card>
            ))}
          </div>
          <InfoNote className="mt-3">Response targets are goals for the Wevsoft team, not a contractual SLA with service credits. Enterprise customers with a signed agreement follow that agreement.</InfoNote>
          <Card title="New request" className="mt-4">
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); create.mutate({ ...f, appId: f.appId || undefined }); }}>
              <div className="grid gap-2 min-[800px]:grid-cols-3">
                <div><label className={labelCls} htmlFor="sr-app">App</label><select id="sr-app" className={selectCls} value={f.appId} onChange={(e) => setF({ ...f, appId: e.target.value })}><option value="">No specific app (free tier)</option>{d.apps.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.plan})</option>)}</select></div>
                <div><label className={labelCls} htmlFor="sr-cat">Category</label><select id="sr-cat" className={selectCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{d.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className={labelCls} htmlFor="sr-sev">Severity</label><select id="sr-sev" className={selectCls} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>{d.severities.map((s: string) => <option key={s} value={s} disabled={s === 'critical' && selectedPlan === 'free'}>{s}{s === 'critical' && selectedPlan === 'free' ? ' (Standard / Enterprise)' : ''}</option>)}</select></div>
              </div>
              <div><label className={labelCls} htmlFor="sr-subj">Subject</label><input id="sr-subj" className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="sr-body">What is happening? Include request ids (X-Request-Id / traceId) if you have them.</label><textarea id="sr-body" rows={4} className={inputCls} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
              <button className={btn.primary} disabled={create.isPending || f.subject.trim().length < 5 || f.body.trim().length < 20}>Send request</button>
            </form>
          </Card>
          <Card title="Your requests" className="mt-4">
            {d.requests.length === 0 ? <EmptyState icon={LifeBuoy} title="No support requests yet" body="Requests you send appear here with the team's answers." /> : (
              <table className="w-full text-left">
                <thead><tr><th className={thCls}>Subject</th><th className={thCls}>Tier</th><th className={thCls}>Severity</th><th className={thCls}>Status</th><th className={thCls}>Sent</th><th className={thCls} /></tr></thead>
                <tbody>
                  {d.requests.map((r: any) => (
                    <tr key={r.id}>
                      <td className={tdCls}><div className="font-medium">{r.subject}</div>{r.answer && <div className="mt-1 whitespace-pre-wrap text-[12px] text-[var(--dc-text-2)]">Answer: {r.answer}</div>}</td>
                      <td className={tdCls}>{r.plan}</td>
                      <td className={tdCls}><Pill tone={r.severity === 'critical' ? 'red' : r.severity === 'high' ? 'amber' : 'gray'}>{r.severity}</Pill></td>
                      <td className={tdCls}><Pill tone={tone(r.status)}>{r.status}</Pill></td>
                      <td className={tdCls}>{fmtDate(r.createdAt, true)}</td>
                      <td className={tdCls}>{r.status !== 'closed' && <button className={btn.secondary} onClick={() => close.mutate(r.id)}>Close</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </ConsolePage>
  );
}
