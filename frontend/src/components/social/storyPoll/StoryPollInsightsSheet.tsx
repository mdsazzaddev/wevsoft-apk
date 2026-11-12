import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';

type Insights = {
  id: string;
  question: string;
  type: string;
  status: string;
  anonymous: boolean;
  summary: {
    totalVotes: number;
    uniqueVoters: number;
    viewCount: number;
    participationRate: number;
    sliderAverage: number | null;
  };
  options: Array<{
    id: string;
    text: string;
    emoji?: string | null;
    voteCount: number;
    percentage: number;
    isCorrect?: boolean | null;
  }>;
};

type VoterRow = {
  user: { id: string; name: string; avatar?: string | null; username?: string | null };
  options: Array<{ id: string; text: string; emoji?: string | null }>;
  sliderValue: number | null;
  votedAt: string;
};

type Props = {
  storyId: string;
  token: string;
  open: boolean;
  onClose: () => void;
};

export default function StoryPollInsightsSheet({ storyId, token, open, onClose }: Props) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [filterOption, setFilterOption] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [insRes, votRes] = await Promise.all([
          fetch(`/api/stories/${storyId}/poll/insights`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/stories/${storyId}/poll/voters?limit=40`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const ins = await insRes.json().catch(() => ({}));
        const vot = await votRes.json().catch(() => ({}));
        if (cancelled) return;
        if (!insRes.ok) {
          setError(ins.error || 'Could not load insights');
          setInsights(null);
        } else {
          setInsights(ins);
        }
        if (votRes.ok) {
          setAnonymous(!!vot.anonymous);
          setVoters(vot.voters || []);
        }
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storyId, token]);

  useEffect(() => {
    if (!open || anonymous || !insights) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const params = new URLSearchParams({ limit: '40' });
      if (filterOption) params.set('optionId', filterOption);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/stories/${storyId}/poll/voters?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && res.ok) setVoters(data.voters || []);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [filterOption, q, open, anonymous, insights, storyId, token]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" role="dialog" aria-label="Poll insights">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative z-10 flex max-h-[75%] w-full flex-col rounded-t-3xl border-t border-white/10 bg-zinc-950"
      >
        <div className="shrink-0 border-b border-white/10 px-4 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Poll insights</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/70 hover:bg-white/10" aria-label="Close insights">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-white/60">{error}</p>
          ) : !insights ? (
            <p className="py-8 text-center text-sm text-white/60">No votes yet</p>
          ) : (
            <>
              <p className="mb-3 line-clamp-2 text-sm font-medium text-white" dir="auto">
                {insights.question}
              </p>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Votes" value={String(insights.summary.totalVotes)} />
                <Stat label="Voters" value={String(insights.summary.uniqueVoters)} />
                <Stat label="Views" value={String(insights.summary.viewCount)} />
                <Stat label="Participation" value={`${insights.summary.participationRate}%`} />
              </div>
              {insights.summary.sliderAverage != null ? (
                <p className="mb-3 text-xs text-white/70">Average slider: {insights.summary.sliderAverage}</p>
              ) : null}
              <div className="mb-4 space-y-2">
                {insights.options.length === 0 && insights.type === 'emoji_slider' ? (
                  <p className="text-xs text-white/50">Emoji slider — see average above.</p>
                ) : null}
                {insights.options.map((o) => (
                  <div key={o.id} className="rounded-xl bg-white/5 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-white">
                      <span className="truncate" dir="auto">
                        {o.emoji ? `${o.emoji} ` : ''}
                        {o.text}
                        {o.isCorrect ? ' ✓' : ''}
                      </span>
                      <span className="shrink-0 tabular-nums text-white/70">
                        {o.voteCount} · {o.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${o.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {insights.summary.uniqueVoters === 0 ? (
                  <p className="py-4 text-center text-xs text-white/50">No votes yet</p>
                ) : null}
              </div>

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Voters</h3>
              {anonymous ? (
                <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-xs text-white/60">
                  This poll is anonymous — voter identities are hidden.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search name"
                      className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
                    />
                    <select
                      value={filterOption}
                      onChange={(e) => setFilterOption(e.target.value)}
                      className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">All options</option>
                      {insights.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ul className="space-y-2 pb-6">
                    {voters.map((v) => (
                      <li key={v.user.id} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
                        {v.user.avatar ? (
                          <img src={v.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white">
                            {(v.user.name || '?').slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">{v.user.name}</p>
                          <p className="truncate text-[10px] text-white/50" dir="auto">
                            {v.sliderValue != null
                              ? `Slider: ${v.sliderValue}`
                              : v.options.map((o) => o.text).join(', ') || '—'}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-white/40">
                          {formatDistanceToNow(new Date(v.votedAt), { addSuffix: true })}
                        </span>
                      </li>
                    ))}
                    {!voters.length ? (
                      <p className="py-4 text-center text-xs text-white/50">No matching voters</p>
                    ) : null}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
