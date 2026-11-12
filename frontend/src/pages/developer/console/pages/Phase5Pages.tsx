/*
 * Phase 5 console pages (each gated by its DEV_* flag; when off they render nothing / a notice):
 * - ChangelogFollowPanel (W1) inside API Versions & Changelog
 * - AppMarketPage (W2) /developer/app-market
 * - AssistantPage (W3) /developer/assistant
 * - CommunityPage (W4) /developer/community
 */
import { useState } from 'react';
import { Bell, Bot, MessagesSquare, Star, Store, ThumbsUp } from 'lucide-react';
import { Card, ConsolePage, EmptyState, ErrorCard, btn, inputCls, labelCls, selectCls } from '../ui';
import { cx } from '../../devUi';
import { useDeveloperFeatures } from '../../devApi';
import { usePfMutation, usePfQuery } from '../platformApi';
import { renderCommunityText } from '../communityText';

const CATS = ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'];

function Disabled({ name }: { name: string }) {
  return <EmptyState icon={Bell} title={`${name} is not enabled`} body="This feature is turned off on this server." />;
}

export function ChangelogFollowPanel() {
  const { changelogSubs } = useDeveloperFeatures();
  const sub = usePfQuery<any>(['changelogSub'], changelogSubs ? '/api/developer/changelog/subscription' : null);
  const notes = usePfQuery<any>(['changelogNotes'], changelogSubs ? '/api/developer/changelog/notifications' : null);
  const save = usePfMutation<any>('PUT', () => '/api/developer/changelog/subscription', { invalidate: [['changelogSub']], success: 'Changelog subscription saved' });
  const stop = usePfMutation<void>('DELETE', () => '/api/developer/changelog/subscription', { invalidate: [['changelogSub']], success: 'Unfollowed the changelog' });
  const [draft, setDraft] = useState<{ categories: string[]; emailFrequency: string; appDeprecations: boolean } | null>(null);
  if (!changelogSubs) return null;
  const current = sub.data?.subscribed ? sub.data : null;
  const d = draft ?? { categories: current?.categories ?? [], emailFrequency: current?.emailFrequency ?? 'off', appDeprecations: current?.appDeprecations ?? true };
  const toggle = (c: string) => setDraft({ ...d, categories: d.categories.includes(c) ? d.categories.filter((x) => x !== c) : [...d.categories, c] });
  return (
    <Card className="mt-4" title="Follow the changelog" description="Get an in-app notification (and optional email digest) when the API changes.">
      <div data-testid="changelog-follow" className="space-y-3 text-[13px]">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <label key={c} className="flex items-center gap-1">
              <input type="checkbox" checked={d.categories.includes(c)} onChange={() => toggle(c)} /> {c}
            </label>
          ))}
          <span className="text-[12px] opacity-70">(none selected = all)</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className={labelCls}>
            Email digest{' '}
            <select aria-label="Email digest" className={cx(selectCls, '!w-auto')} value={d.emailFrequency} onChange={(e) => setDraft({ ...d, emailFrequency: e.target.value })}>
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={d.appDeprecations} onChange={(e) => setDraft({ ...d, appDeprecations: e.target.checked })} /> Alert me when a deprecation affects my apps
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" className={cx(btn.primary, btn.sm)} disabled={save.isPending} onClick={() => save.mutate(d)}>{current ? 'Save' : 'Follow'}</button>
          {current && <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => stop.mutate()}>Unfollow</button>}
        </div>
        {(notes.data?.notifications || []).length > 0 && (
          <ul className="mt-2 space-y-1">
            {notes.data.notifications.slice(0, 5).map((n: any) => <li key={n.id}>{n.text}</li>)}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function AppMarketPage() {
  const { marketplaceV2 } = useDeveloperFeatures();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');
  const list = usePfQuery<any>(['appMarket', q, sort], marketplaceV2 ? `/api/developer/app-market/apps?sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ''}` : null);
  return (
    <ConsolePage group="Apps & Publishing" title="App Marketplace" description="Discover published apps by installs, rating and verified publishers.">
      {!marketplaceV2 ? <Disabled name="The app marketplace" /> : (
        <Card title="Apps" action={
          <div className="flex gap-2">
            <input aria-label="Search apps" className={cx(inputCls, '!h-[30px]')} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <select aria-label="Sort" className={cx(selectCls, '!h-[30px] !w-auto')} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">Newest</option><option value="installs">Most installed</option><option value="rating">Top rated</option>
            </select>
          </div>}>
          {list.isError ? <ErrorCard message={(list.error as Error)?.message} onRetry={() => list.refetch()} /> : !list.data ? <p className="text-[13px]">Loading…</p> : list.data.apps.length === 0 ? <EmptyState icon={Store} title="No apps found" body="Try another search." /> : (
            <ul data-testid="app-market-list" className="divide-y text-[13px]">
              {list.data.apps.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <span>{a.name} {a.verifiedPublisher && <span className="text-[11px]">✔ verified</span>} {a.featured && <span className="text-[11px]">★ featured</span>}</span>
                  <span className="flex items-center gap-3 opacity-80"><span>{a.installCount} installs</span><span><Star size={12} className="inline" /> {a.ratingAvg ?? '–'} ({a.ratingCount})</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </ConsolePage>
  );
}

export function AssistantPage() {
  const { aiAssistant } = useDeveloperFeatures();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any>(null);
  const ask = usePfMutation<{ question: string }, any>('POST', () => '/api/developer/assistant/ask', { onDone: setAnswer });
  const feedback = usePfMutation<any>('POST', () => '/api/developer/assistant/feedback', { success: 'Thanks for the feedback' });
  return (
    <ConsolePage group="Developer Tools" title="API Assistant" description="Ask questions about the Wevsoft API. Answers come only from the API reference and cite operations.">
      {!aiAssistant ? <Disabled name="The API assistant" /> : (
        <Card title="Ask a question">
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (question.trim().length >= 3) ask.mutate({ question }); }}>
            <textarea aria-label="Question" maxLength={1000} className={cx(inputCls, 'min-h-[80px]')} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="How do I publish a post?" />
            <p className="text-[11px] opacity-70">Do not paste API keys or secrets. They are removed before the question is sent.</p>
            <button type="submit" className={cx(btn.primary, btn.sm)} disabled={ask.isPending}><Bot size={13} /> Ask</button>
          </form>
          {answer && (
            <div data-testid="assistant-answer" className="mt-3 space-y-2 text-[13px]">
              <p className="whitespace-pre-wrap">{answer.answer}</p>
              {answer.citations?.length > 0 && (
                <ul className="text-[12px]">
                  {answer.citations.map((c: any) => <li key={c.operationId}><a className="underline" href={c.explorerUrl}>{c.operationId}</a></li>)}
                </ul>
              )}
              <p className="text-[11px] opacity-70">{answer.disclaimer}</p>
              <div className="flex gap-2">
                <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => feedback.mutate({ answerId: answer.answerId, helpful: true, citedOps: answer.citations.map((c: any) => c.operationId) })}><ThumbsUp size={12} /> Helpful</button>
                <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => feedback.mutate({ answerId: answer.answerId, helpful: false, citedOps: [] })}>Not helpful</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </ConsolePage>
  );
}

function SafeText({ text }: { text: string }) {
  return (
    <>
      {renderCommunityText(text).map((s, i) =>
        s.type === 'br' ? <br key={i} /> : s.type === 'code' ? <code key={i} className="rounded bg-black/5 px-1">{s.text}</code> : s.type === 'link' ? <a key={i} className="underline" href={s.href} target="_blank" rel="noopener noreferrer nofollow ugc">{s.text}</a> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

export function CommunityPage() {
  const { community } = useDeveloperFeatures();
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState('');
  const list = usePfQuery<any>(['community'], community ? '/api/developer/community/threads' : null);
  const thread = usePfQuery<any>(['communityThread', open], community && open ? `/api/developer/community/threads/${open}` : null);
  const create = usePfMutation<any>('POST', () => '/api/developer/community/threads', { invalidate: [['community']], success: 'Question posted', onDone: () => { setTitle(''); setBody(''); } });
  const answer = usePfMutation<any>('POST', () => `/api/developer/community/threads/${open}/posts`, { invalidate: [['communityThread', open]], success: 'Answer posted', onDone: () => setReply('') });
  const vote = usePfMutation<string>('POST', (id) => `/api/developer/community/posts/${id}/vote`, { bodyFor: () => ({}), invalidate: [['communityThread', open]] });
  const report = usePfMutation<any>('POST', () => '/api/developer/community/report', { success: 'Reported to moderators' });
  return (
    <ConsolePage group="Developer Tools" title="Community Q&A" description="Ask and answer questions with other developers. Plain text only.">
      {!community ? <Disabled name="Community Q&A" /> : (
        <div className="space-y-4">
          <Card title="Ask a question">
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); create.mutate({ title, body, anchorType: 'general' }); }}>
              <input aria-label="Title" maxLength={150} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <textarea aria-label="Details" maxLength={5000} className={cx(inputCls, 'min-h-[80px]')} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details (plain text)" />
              <button type="submit" className={cx(btn.primary, btn.sm)} disabled={create.isPending}>Post question</button>
            </form>
          </Card>
          <Card title="Questions">
            {list.isError ? <ErrorCard message={(list.error as Error)?.message} /> : !list.data ? <p className="text-[13px]">Loading…</p> : list.data.threads.length === 0 ? <EmptyState icon={MessagesSquare} title="No questions yet" body="Be the first to ask." /> : (
              <ul data-testid="community-threads" className="divide-y text-[13px]">
                {list.data.threads.map((t: any) => (
                  <li key={t.id} className="py-2">
                    <button type="button" className="text-left underline" onClick={() => setOpen(t.id)}>{t.title}</button>
                    <span className="ml-2 opacity-70">{t.answerCount} answers{t.acceptedPostId ? ' · answered' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {open && thread.data && (
            <Card title={thread.data.thread.title}>
              <div data-testid="community-thread" className="space-y-3 text-[13px]">
                <p><SafeText text={thread.data.thread.body} /></p>
                {thread.data.posts.map((p: any) => (
                  <div key={p.id} className="rounded border p-2">
                    <p><SafeText text={p.body} /></p>
                    <div className="mt-1 flex gap-2 text-[12px]">
                      <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => vote.mutate(p.id)}><ThumbsUp size={12} /> {p.votes}</button>
                      {p.accepted && <span>✔ accepted</span>}
                      <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => report.mutate({ targetType: 'post', targetId: p.id, reason: 'Reported from console' })}>Report</button>
                    </div>
                  </div>
                ))}
                {!thread.data.thread.locked && (
                  <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); answer.mutate({ body: reply }); }}>
                    <textarea aria-label="Your answer" maxLength={5000} className={cx(inputCls, 'min-h-[60px]')} value={reply} onChange={(e) => setReply(e.target.value)} />
                    <button type="submit" className={cx(btn.primary, btn.sm)}>Answer</button>
                  </form>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </ConsolePage>
  );
}
