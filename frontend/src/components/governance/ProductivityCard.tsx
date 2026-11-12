/**
 * ProductivityCard — learning-productivity widget (Content Governance, Phase 5).
 *
 * Reads the current user's productivity + today's category limits from the
 * governance API and renders a compact score ring, streak/completion stats, and
 * per-category daily quota bars. Self-contained; mount on the own profile.
 */
import React, { useEffect, useState } from 'react';
import { GraduationCap, Flame, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { useStore } from '../../store';

type Productivity = {
  learningScore: number;
  watchTimeSec: number;
  learningWatchTimeSec: number;
  completionRate: number;
  learningStreak: number;
  longestStreak: number;
  lastLearningDate: string | null;
};

type UsageView = {
  categorySlug: string;
  name: string;
  period: string;
  used: number;
  limitValue: number | null;
  isUnlimited: boolean;
  remaining: number | null;
  isBlocked: boolean;
};

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ScoreRing({ value }: { value: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const off = c - (clamped / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border/60" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className="text-emerald-500 transition-[stroke-dashoffset] duration-500"
          strokeDasharray={c} strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">{clamped}</div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border/60 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">{icon}{label}</div>
      <div className="mt-0.5 text-sm font-bold">
        {value}
        {sub && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export default function ProductivityCard() {
  const token = useStore((s) => s.token);
  const [data, setData] = useState<Productivity | null>(null);
  const [usage, setUsage] = useState<UsageView[]>([]);
  const [progress, setProgress] = useState<{ contentType: string; contentId: string; progressPercent: number; isCompleted: boolean; categorySlug?: string }[]>([]);
  const [recs, setRecs] = useState<{ slug: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/governance/me/productivity', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/governance/me/usage', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/governance/me/progress', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/governance/me/recommendations', { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, u, prog, rec]) => {
        if (!alive) return;
        setData(p);
        setUsage(Array.isArray(u) ? u.filter((x: UsageView) => x.period === 'daily' && x.limitValue != null) : []);
        setProgress(Array.isArray(prog) ? prog.slice(0, 5) : []);
        setRecs(Array.isArray(rec) ? rec.slice(0, 5) : []);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  if (loading) return <div className="rounded-2xl border border-border bg-muted/40 p-4 h-40 animate-pulse" />;
  if (!data) return null;

  const score = Math.round(data.learningScore || 0);
  const completion = Math.round((data.completionRate || 0) * 100);
  const ratio = data.watchTimeSec > 0 ? Math.round((data.learningWatchTimeSec / data.watchTimeSec) * 100) : 0;
  const topLimits = [...usage].sort((a, b) => b.used - a.used).slice(0, 4);

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
          <GraduationCap size={16} />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Learning Productivity</h3>
      </div>

      <div className="flex items-center gap-4">
        <ScoreRing value={score} />
        <div className="space-y-0.5 text-sm">
          <p className="font-bold">
            {score}
            <span className="ml-1 font-medium text-muted-foreground">/100 learning score</span>
          </p>
          <p className="text-xs text-muted-foreground">{ratio}% of your watch time is learning content</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Flame size={14} />} label="Streak" value={`${data.learningStreak}d`} sub={`best ${data.longestStreak}d`} />
        <Stat icon={<CheckCircle2 size={14} />} label="Completion" value={`${completion}%`} />
        <Stat icon={<Clock size={14} />} label="Watch time" value={fmtDuration(data.watchTimeSec)} />
        <Stat icon={<BookOpen size={14} />} label="Learning" value={fmtDuration(data.learningWatchTimeSec)} />
      </div>

      {topLimits.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today's limits</p>
          {topLimits.map((l) => {
            const pct = l.limitValue ? Math.min(100, Math.round((l.used / l.limitValue) * 100)) : 0;
            const danger = pct >= 100;
            return (
              <div key={l.categorySlug} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">{l.name || l.categorySlug}</span>
                  <span className={danger ? 'text-rose-500 font-semibold' : 'text-muted-foreground'}>
                    {l.used}/{l.limitValue}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                  <div className={`h-full rounded-full ${danger ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {progress.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent learning</p>
          {progress.map((p) => (
            <div key={`${p.contentType}:${p.contentId}`} className="flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{p.contentType}{p.categorySlug ? ` · ${p.categorySlug}` : ''}</span>
              <span className={p.isCompleted ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}>
                {p.isCompleted ? 'Done' : `${Math.round(p.progressPercent || 0)}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {recs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Learn next</p>
          {recs.map((r) => (
            <div key={r.slug} className="flex items-center justify-between text-xs">
              <span className="capitalize font-medium">{r.slug}</span>
              <span className="text-muted-foreground truncate ml-2">{r.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
