import React from 'react';
import type { Status, Score } from '../../lib/contentAnalysis';

export const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/[0.07] dark:bg-[#12141d]';
export const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06] disabled:opacity-50';
export const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-white';

const STATUS: Record<Status, { label: string; cls: string }> = {
  excellent: { label: 'Excellent', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20' },
  good: { label: 'Good', cls: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20' },
  fair: { label: 'Fair', cls: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20' },
  needs_work: { label: 'Needs Work', cls: 'bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20' },
  unavailable: { label: 'Not available', cls: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10' },
};
export function StatusPill({ status }: { status: Status }) {
  const s = STATUS[status];
  return <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.cls}`}>{s.label}</span>;
}

export function ScorePill({ v }: { v: number | null }) {
  const cls = v == null ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' : v >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : v >= 70 ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : v >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300';
  return <span className={`rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${cls}`}>{v == null ? '—' : `${v}/100`}</span>;
}

export function Ring({ score, color, size = 84 }: { score: Score; color: string; size?: number }) {
  const r = size / 2 - 7; const c = 2 * Math.PI * r; const v = score.available ? (score.value as number) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} className="fill-none stroke-slate-100 dark:stroke-white/[0.06]" />
        {score.available && <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} fill="none" stroke={color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        {score.available ? <div><span className="text-[22px] font-extrabold text-slate-900 dark:text-white">{v}</span><span className="text-[11px] font-medium text-slate-400">/100</span></div> : <span className="text-lg font-bold text-slate-300 dark:text-slate-600">—</span>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{children}</h3>{right}</div>;
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">{icon}</div>
      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</div>
      <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{body}</p>
      {action}
    </div>
  );
}

export const FacebookIcon = (p: { className?: string }) => (<svg viewBox="0 0 24 24" className={p.className} aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2" /><path fill="#fff" d="M13.4 19.5v-6h2l.3-2.4h-2.3V9.6c0-.7.2-1.2 1.2-1.2h1.2V6.3c-.2 0-1-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.8h-2v2.4h2v6h2.4z" /></svg>);
export const InstagramIcon = (p: { className?: string }) => (<svg viewBox="0 0 24 24" className={p.className} aria-hidden="true"><defs><radialGradient id="igg" cx="30%" cy="107%" r="150%"><stop offset="0" stopColor="#fdf497" /><stop offset=".05" stopColor="#fdf497" /><stop offset=".45" stopColor="#fd5949" /><stop offset=".6" stopColor="#d6249f" /><stop offset=".9" stopColor="#285AEB" /></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#igg)" /><rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" /><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" /><circle cx="16.1" cy="7.9" r="1" fill="#fff" /></svg>);
export const YoutubeIcon = (p: { className?: string }) => (<svg viewBox="0 0 24 24" className={p.className} aria-hidden="true"><rect y="4" width="24" height="16" rx="5" fill="#FF0000" /><path d="M10 8.6v6.8l5.8-3.4z" fill="#fff" /></svg>);
export const WebSoftIcon = (p: { className?: string }) => (<svg viewBox="0 0 24 24" className={p.className} aria-hidden="true"><rect width="24" height="24" rx="7" fill="#7C3AED" /><path d="M5.5 8l2.2 8 2.3-6 2 6 2.3-6 2.2 6 2-8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
