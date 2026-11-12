/**
 * WevDesk → Automations (route /space/:handle/desk/workflows).
 *
 * Inbox automations for the Space: instant reply, welcome greeting + FAQ quick questions, away
 * message (manual toggle or weekly business hours in the Space's timezone) and keyword rules.
 * Backend: wevspace-automation.service.ts via /api/spaces/manage/:id/automation and /auto-replies.
 * Viewing needs messages.read; saving needs settings.modify (the server re-checks both).
 */

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useDesk } from './deskContext';
import { DeskButton, PageHeader, Pill, Row, StatTile, Toggle, cx, fmtNum } from './deskUi';
import {
  AUTOMATION_DAYS,
  createAutoReplyRule,
  deleteAutoReplyRule,
  fetchInboxAutomation,
  reorderAutoReplyRules,
  saveInboxAutomation,
  updateAutoReplyRule,
  type AutoReplyRule,
  type InboxAutomationConfig,
  type InboxAutomationPayload,
} from '../../lib/wevspaceManageApi';

const DAY_LABEL: Record<string, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const input = 'w-full rounded-[10px] border border-[var(--wd-btn-border)] bg-transparent px-3 py-2 text-[13px] text-[var(--wd-text)] outline-none focus:border-[var(--wd-teal)]';
const label = 'block text-[11.5px] font-semibold text-[var(--wd-text-2)] mb-1';

function norm(s: string) {
  return String(s || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').toLocaleLowerCase().replace(/[\p{P}\p{S}\u0964\u0965]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
function fill(t: string, space: string) {
  return t.replace(/\{\s*customer_name\s*\}/gi, 'Rahim').replace(/\{\s*space_name\s*\}/gi, space);
}
function localMinutes(tz: string): { day: string; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date());
    const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
    return { day: g('weekday').slice(0, 3).toLowerCase(), minutes: (Number(g('hour')) % 24) * 60 + Number(g('minute')) };
  } catch {
    const d = new Date();
    return { day: AUTOMATION_DAYS[d.getDay()], minutes: d.getHours() * 60 + d.getMinutes() };
  }
}
const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
function openNow(cfg: InboxAutomationConfig['away']): boolean {
  const { day, minutes } = localMinutes(cfg.timezone);
  const idx = AUTOMATION_DAYS.indexOf(day as any);
  const today = cfg.schedule[day as keyof typeof cfg.schedule];
  if (today?.open) {
    const f = toMin(today.from), t = toMin(today.to);
    if (t > f ? minutes >= f && minutes < t : minutes >= f) return true;
  }
  const prev = cfg.schedule[AUTOMATION_DAYS[(idx + 6) % 7]];
  return !!prev?.open && toMin(prev.to) <= toMin(prev.from) && minutes < toMin(prev.to);
}

/** Client-side mirror of decideAutomatedReply() for the live preview (no cooldown state). */
function previewReply(cfg: InboxAutomationConfig, rules: AutoReplyRule[], text: string, firstMessage: boolean) {
  const msg = norm(text);
  if (cfg.welcome.enabled && msg) {
    const f = cfg.welcome.faqs.find((x) => norm(x.question) === msg);
    if (f) return { kind: 'FAQ answer', text: f.answer };
  }
  if (cfg.keywords.enabled && msg) {
    const r = [...rules].filter((x) => x.isActive).sort((a, b) => a.priority - b.priority).find((x) =>
      x.keywords.some((k) => (x.matchType === 'exact' ? msg === norm(k) : ` ${msg} `.includes(` ${norm(k)} `))),
    );
    if (r) return { kind: 'Keyword rule', text: r.replyText };
  }
  if (cfg.away.enabled && (cfg.away.manualAway || (cfg.away.useSchedule && !openNow(cfg.away)))) return { kind: 'Away message', text: cfg.away.text };
  if (cfg.instantReply.enabled && firstMessage) return { kind: 'Instant reply', text: cfg.instantReply.text };
  return null;
}

type RuleDraft = { id?: string; keywords: string; matchType: 'contains' | 'exact'; replyText: string; isActive: boolean };

export default function WevDeskWorkflows() {
  const { spaceId, deskPath } = useDesk();
  const qc = useQueryClient();
  const key = ['wevdesk', 'automation', spaceId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchInboxAutomation(spaceId) });
  const [draft, setDraft] = useState<InboxAutomationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rule, setRule] = useState<RuleDraft | null>(null);
  const [testText, setTestText] = useState('');
  const [testFirst, setTestFirst] = useState(true);

  const data = q.data;
  const cfg = draft ?? data?.config ?? null;
  const rules = data?.rules ?? [];
  const canEdit = !!data?.canEdit;
  const dirty = !!draft;
  const spaceName = data?.spaceName || 'your Space';

  const set = (fn: (c: InboxAutomationConfig) => void) => {
    if (!cfg) return;
    const next = structuredClone(cfg);
    fn(next);
    setDraft(next);
    setNotice(null);
  };
  const put = (payload: InboxAutomationPayload) => qc.setQueryData(key, payload);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'Something went wrong');

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      put(await saveInboxAutomation(spaceId, draft));
      setDraft(null);
      setNotice('Saved. New customer messages will use these settings.');
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveRule() {
    if (!rule || !data) return;
    setError(null);
    const body = { keywords: rule.keywords.split(',').map((k) => k.trim()).filter(Boolean), matchType: rule.matchType, replyText: rule.replyText, isActive: rule.isActive };
    try {
      const saved = rule.id ? await updateAutoReplyRule(rule.id, body) : await createAutoReplyRule(spaceId, body);
      put({ ...data, rules: rule.id ? rules.map((r) => (r.id === saved.id ? saved : r)) : [...rules, saved] });
      setRule(null);
    } catch (e) {
      fail(e);
    }
  }
  async function toggleRule(r: AutoReplyRule, isActive: boolean) {
    if (!data) return;
    try {
      const saved = await updateAutoReplyRule(r.id, { isActive });
      put({ ...data, rules: rules.map((x) => (x.id === saved.id ? saved : x)) });
    } catch (e) {
      fail(e);
    }
  }
  async function removeRule(r: AutoReplyRule) {
    if (!data || !window.confirm('Delete this keyword rule?')) return;
    try {
      await deleteAutoReplyRule(r.id);
      put({ ...data, rules: rules.filter((x) => x.id !== r.id) });
    } catch (e) {
      fail(e);
    }
  }
  async function move(i: number, dir: -1 | 1) {
    if (!data) return;
    const ids = rules.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      const res = await reorderAutoReplyRules(spaceId, ids);
      put({ ...data, rules: res.rules });
    } catch (e) {
      fail(e);
    }
  }

  const preview = useMemo(() => (cfg ? previewReply(cfg, rules, testText, testFirst) : null), [cfg, rules, testText, testFirst]);
  const awayActiveNow = cfg ? cfg.away.enabled && (cfg.away.manualAway || (cfg.away.useSchedule && !openNow(cfg.away))) : false;
  const activeCount = cfg ? [cfg.instantReply.enabled, cfg.welcome.enabled, cfg.away.enabled, cfg.keywords.enabled].filter(Boolean).length : 0;

  if (q.isLoading) return <div className="px-5 py-10 text-[13px] text-[var(--wd-muted)]">Loading automations…</div>;
  if (q.isError || !cfg) return <div className="px-5 py-10 text-[13px] text-red-600">{(q.error as Error)?.message || 'Could not load automations.'}</div>;

  const dis = !canEdit;
  return (
    <div className="px-3 sm:px-5 pb-28 pt-2 space-y-4 max-w-[1400px]">
      <PageHeader
        icon={Zap}
        title="Automations"
        subtitle="Automatic replies sent as your Space in WevChat. They never answer your own team or other automated messages, and each has a cooldown so customers aren't spammed."
        badge={<Pill tone={activeCount ? 'green' : 'grey'}>{activeCount ? `${activeCount} on` : 'All off'}</Pill>}
        actions={<DeskButton to={deskPath('inbox')}>Open inbox</DeskButton>}
      />
      {!canEdit && <p className="wd-card px-4 py-3 text-[12.5px] text-[var(--wd-muted)]">You can view these settings. Only teammates who can change Space settings can edit them.</p>}
      {error && <p className="wd-card px-4 py-3 text-[12.5px] text-red-600" role="alert">{error}</p>}
      {notice && <p className="wd-card px-4 py-3 text-[12.5px] text-[var(--wd-green)]">{notice}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Automations on" value={fmtNum(activeCount)} sub="Instant, welcome, away, keywords" />
        <StatTile label="Keyword rules" value={fmtNum(rules.length)} sub={`${rules.filter((r) => r.isActive).length} active`} />
        <StatTile label="Rule replies sent" value={fmtNum(rules.reduce((n, r) => n + (r.hitCount || 0), 0))} sub="All time" />
        <StatTile label="Away right now" value={awayActiveNow ? 'Yes' : 'No'} sub={cfg.away.timezone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 min-w-0">
          {/* Instant reply */}
          <section className="wd-card p-[18px] space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-[15px] font-semibold">Instant reply</h2>
                <p className="text-[11.5px] text-[var(--wd-muted)]">Sent on a customer's first message, and again after a period of inactivity.</p>
              </div>
              <Toggle on={cfg.instantReply.enabled} disabled={dis} onChange={(v) => set((c) => { c.instantReply.enabled = v; })} />
            </div>
            <textarea className={cx(input, 'min-h-[84px]')} disabled={dis} value={cfg.instantReply.text} maxLength={1000} onChange={(e) => set((c) => { c.instantReply.text = e.target.value; })} />
            <label className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--wd-text-2)]">
              Send again after
              <input type="number" min={0} max={720} className={cx(input, 'w-24')} disabled={dis} value={cfg.instantReply.reopenAfterHours} onChange={(e) => set((c) => { c.instantReply.reopenAfterHours = Math.max(0, Number(e.target.value) || 0); })} />
              hours of no messages <span className="text-[11px] text-[var(--wd-faint)]">(0 = first message only)</span>
            </label>
          </section>

          {/* Welcome + FAQ */}
          <section className="wd-card p-[18px] space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-[15px] font-semibold">Welcome greeting & FAQ</h2>
                <p className="text-[11.5px] text-[var(--wd-muted)]">Shown when someone opens an empty chat with your Space. Customers can tap a question, and the matching answer is sent automatically.</p>
              </div>
              <Toggle on={cfg.welcome.enabled} disabled={dis} onChange={(v) => set((c) => { c.welcome.enabled = v; })} />
            </div>
            <textarea className={cx(input, 'min-h-[70px]')} disabled={dis} value={cfg.welcome.text} maxLength={1000} onChange={(e) => set((c) => { c.welcome.text = e.target.value; })} />
            <div className="space-y-2">
              {cfg.welcome.faqs.map((f, i) => (
                <div key={i} className="rounded-[12px] border border-[var(--wd-line)] p-3 space-y-2">
                  <div className="flex gap-2">
                    <input className={input} placeholder="Question (e.g. Do you deliver?)" disabled={dis} value={f.question} maxLength={120} onChange={(e) => set((c) => { c.welcome.faqs[i].question = e.target.value; })} />
                    {!dis && <button type="button" aria-label="Remove question" className="shrink-0 px-2 text-[var(--wd-muted)] hover:text-red-600" onClick={() => set((c) => { c.welcome.faqs.splice(i, 1); })}><Trash2 size={15} /></button>}
                  </div>
                  <textarea className={cx(input, 'min-h-[56px]')} placeholder="Answer sent automatically" disabled={dis} value={f.answer} maxLength={1000} onChange={(e) => set((c) => { c.welcome.faqs[i].answer = e.target.value; })} />
                </div>
              ))}
              {!dis && cfg.welcome.faqs.length < (data?.limits?.faqMax ?? 6) && (
                <DeskButton onClick={() => set((c) => { c.welcome.faqs.push({ question: '', answer: '' }); })}><Plus size={14} /> Add question</DeskButton>
              )}
              <p className="text-[11px] text-[var(--wd-faint)]">Questions without an answer are dropped when you save.</p>
            </div>
          </section>

          {/* Away */}
          <section className="wd-card p-[18px] space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-[15px] font-semibold">Away message</h2>
                <p className="text-[11.5px] text-[var(--wd-muted)]">Sent when you're marked away or outside business hours. At most once per conversation per cooldown.</p>
              </div>
              <Toggle on={cfg.away.enabled} disabled={dis} onChange={(v) => set((c) => { c.away.enabled = v; })} />
            </div>
            <textarea className={cx(input, 'min-h-[70px]')} disabled={dis} value={cfg.away.text} maxLength={1000} onChange={(e) => set((c) => { c.away.text = e.target.value; })} />
            <Row tall label="I'm away now (overrides business hours)"><Toggle on={cfg.away.manualAway} disabled={dis} onChange={(v) => set((c) => { c.away.manualAway = v; })} /></Row>
            <Row tall label="Use business hours below"><Toggle on={cfg.away.useSchedule} disabled={dis} onChange={(v) => set((c) => { c.away.useSchedule = v; })} /></Row>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className={label}>Timezone</span><input className={input} disabled={dis} value={cfg.away.timezone} list="wd-tz" onChange={(e) => set((c) => { c.away.timezone = e.target.value; })} /></label>
              <label><span className={label}>Cooldown (minutes)</span><input type="number" min={1} className={input} disabled={dis} value={cfg.away.cooldownMinutes} onChange={(e) => set((c) => { c.away.cooldownMinutes = Math.max(1, Number(e.target.value) || 1); })} /></label>
            </div>
            <datalist id="wd-tz">{['Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'].map((z) => <option key={z} value={z} />)}</datalist>
            <div className={cx('space-y-1.5', !cfg.away.useSchedule && 'opacity-50')}>
              {AUTOMATION_DAYS.map((d) => {
                const s = cfg.away.schedule[d];
                return (
                  <div key={d} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <span className="w-10 font-semibold">{DAY_LABEL[d]}</span>
                    <Toggle on={s.open} disabled={dis} onChange={(v) => set((c) => { c.away.schedule[d].open = v; })} />
                    {s.open ? (
                      <>
                        <input type="time" className={cx(input, 'w-[118px]')} disabled={dis} value={s.from} onChange={(e) => set((c) => { c.away.schedule[d].from = e.target.value; })} />
                        <span className="text-[var(--wd-muted)]">to</span>
                        <input type="time" className={cx(input, 'w-[118px]')} disabled={dis} value={s.to} onChange={(e) => set((c) => { c.away.schedule[d].to = e.target.value; })} />
                        {toMin(s.to) <= toMin(s.from) && <span className="text-[11px] text-[var(--wd-faint)]">overnight</span>}
                      </>
                    ) : (
                      <span className="text-[var(--wd-muted)]">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Keyword rules */}
          <section className="wd-card p-[18px] space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-[15px] font-semibold">Keyword replies</h2>
                <p className="text-[11.5px] text-[var(--wd-muted)]">The first matching rule (top to bottom) replies. Matching ignores case and punctuation and works with Bangla.</p>
              </div>
              <Toggle on={cfg.keywords.enabled} disabled={dis} onChange={(v) => set((c) => { c.keywords.enabled = v; })} />
            </div>
            <label className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--wd-text-2)]">
              Don't repeat the same rule in a conversation for
              <input type="number" min={0} className={cx(input, 'w-24')} disabled={dis} value={cfg.keywords.cooldownMinutes} onChange={(e) => set((c) => { c.keywords.cooldownMinutes = Math.max(0, Number(e.target.value) || 0); })} />
              minutes
            </label>
            <p className="text-[11px] text-[var(--wd-faint)]">The switch and cooldown are saved with "Save changes". Rules below save immediately.</p>

            <div className="space-y-2">
              {rules.length === 0 && <p className="text-[12.5px] text-[var(--wd-muted)]">No rules yet.</p>}
              {rules.map((r, i) => (
                <div key={r.id} className={cx('rounded-[12px] border border-[var(--wd-line)] p-3 flex gap-3', !r.isActive && 'opacity-60')}>
                  <div className="flex flex-col gap-1">
                    <button type="button" aria-label="Move up" disabled={dis || i === 0} onClick={() => move(i, -1)} className="text-[var(--wd-muted)] disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Move down" disabled={dis || i === rules.length - 1} onClick={() => move(i, 1)} className="text-[var(--wd-muted)] disabled:opacity-30"><ArrowDown size={14} /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10.5px] font-semibold uppercase text-[var(--wd-faint)] mr-1">{r.matchType}</span>
                      {r.keywords.map((k) => <span key={k} className="rounded-full bg-[var(--wd-chip)] px-2 py-0.5 text-[11.5px]">{k}</span>)}
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-[var(--wd-text-2)] whitespace-pre-wrap break-words">{r.replyText}</p>
                    <p className="mt-1 text-[10.5px] text-[var(--wd-faint)]">Used {fmtNum(r.hitCount)} times</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Toggle on={r.isActive} disabled={dis} onChange={(v) => toggleRule(r, v)} />
                    {!dis && (
                      <div className="flex gap-2">
                        <button type="button" aria-label="Edit rule" className="text-[var(--wd-muted)] hover:text-[var(--wd-teal)]" onClick={() => setRule({ id: r.id, keywords: r.keywords.join(', '), matchType: r.matchType, replyText: r.replyText, isActive: r.isActive })}><Pencil size={14} /></button>
                        <button type="button" aria-label="Delete rule" className="text-[var(--wd-muted)] hover:text-red-600" onClick={() => removeRule(r)}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {rule ? (
              <div className="rounded-[12px] border border-[var(--wd-teal)] p-3 space-y-2">
                <label><span className={label}>Keywords (comma separated)</span><input className={input} value={rule.keywords} placeholder="price, দাম, cost" onChange={(e) => setRule({ ...rule, keywords: e.target.value })} /></label>
                <div className="flex flex-wrap gap-3 text-[12.5px]">
                  {(['contains', 'exact'] as const).map((m) => (
                    <label key={m} className="flex items-center gap-1.5"><input type="radio" checked={rule.matchType === m} onChange={() => setRule({ ...rule, matchType: m })} />{m === 'contains' ? 'Message contains a keyword' : 'Message is exactly a keyword'}</label>
                  ))}
                </div>
                <label><span className={label}>Reply</span><textarea className={cx(input, 'min-h-[70px]')} maxLength={1000} value={rule.replyText} placeholder="Our prices start at ৳500. {customer_name}, want the catalogue?" onChange={(e) => setRule({ ...rule, replyText: e.target.value })} /></label>
                <div className="flex gap-2 justify-end">
                  <DeskButton onClick={() => setRule(null)}>Cancel</DeskButton>
                  <DeskButton onClick={saveRule}>{rule.id ? 'Save rule' : 'Add rule'}</DeskButton>
                </div>
              </div>
            ) : (
              !dis && <DeskButton onClick={() => setRule({ keywords: '', matchType: 'contains', replyText: '', isActive: true })}><Plus size={14} /> Add keyword rule</DeskButton>
            )}
          </section>
        </div>

        {/* Live preview */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <section className="wd-card p-[18px] space-y-3">
            <h2 className="text-[15px] font-semibold">Live preview</h2>
            <p className="text-[11.5px] text-[var(--wd-muted)]">Type what a customer might send. Variables: <code>{'{customer_name}'}</code>, <code>{'{space_name}'}</code>.</p>
            {cfg.welcome.enabled && (
              <div className="rounded-[12px] bg-[var(--wd-chip)] p-3 space-y-2">
                <p className="text-[12.5px] whitespace-pre-wrap">{fill(cfg.welcome.text, spaceName)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cfg.welcome.faqs.filter((f) => f.question).map((f, i) => (
                    <button key={i} type="button" className="rounded-full border border-[var(--wd-teal)] px-2.5 py-1 text-[11.5px] text-[var(--wd-teal)]" onClick={() => setTestText(f.question)}>{f.question}</button>
                  ))}
                </div>
              </div>
            )}
            <input className={input} placeholder="Customer message…" value={testText} onChange={(e) => setTestText(e.target.value)} />
            <label className="flex items-center gap-2 text-[12px] text-[var(--wd-text-2)]"><input type="checkbox" checked={testFirst} onChange={(e) => setTestFirst(e.target.checked)} /> First message in the conversation</label>
            {preview ? (
              <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-blue-600 px-3 py-2 text-[12.5px] text-white whitespace-pre-wrap">
                {fill(preview.text, spaceName)}
                <div className="mt-1 text-[10px] font-bold opacity-80">Automated · {preview.kind}</div>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--wd-muted)]">No automatic reply for this message.</p>
            )}
          </section>
        </aside>
      </div>

      {canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--wd-line)] bg-[var(--wd-card,#fff)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-end gap-2 shadow-lg">
          <span className="mr-auto text-[12px] text-[var(--wd-muted)]">Unsaved changes</span>
          <DeskButton onClick={() => setDraft(null)} disabled={saving}>Discard</DeskButton>
          <DeskButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</DeskButton>
        </div>
      )}
    </div>
  );
}
