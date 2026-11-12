/**
 * GuardianDashboard — Content Governance, Phase 5.
 *
 * One page that serves both roles of the guardian↔ward relationship:
 *  • As a WARD: approve pending guardian invites (by code) and see who guards you.
 *  • As a GUARDIAN: invite a ward by email, then for each active ward view their
 *    learning productivity + usage and set ParentControls (daily-minute cap,
 *    blocked categories, enable/disable) and lock Student Mode.
 *
 * All calls hit /api/governance/guardian/*; every /children/:id/* call is
 * server-gated by an active guardian link (assertGuardianOf).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ShieldCheck, UserPlus, Users, Loader2, Clock, GraduationCap, Check, X, Copy, Lock, Flame,
} from 'lucide-react';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import UserAvatar from '../components/UserAvatar';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

const API = '/api/governance/guardian';

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function GuardianDashboard() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  const token = useStore((s) => s.token);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [children, setChildren] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [childEmail, setChildEmail] = useState('');
  const [relationship, setRelationship] = useState('guardian');
  const [linking, setLinking] = useState(false);
  const [approveCode, setApproveCode] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([
        fetch(`${API}/children`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/guardians`, { headers }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setChildren(Array.isArray(c) ? c : []);
      setGuardians(Array.isArray(g) ? g : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
     
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { if (token) loadAll(); }, [token, loadAll]);

  const linkChild = async () => {
    if (!childEmail.trim()) return;
    setLinking(true);
    try {
      const res = await fetch(`${API}/link`, {
        method: 'POST', headers,
        body: JSON.stringify({ childEmail: childEmail.trim(), relationship }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      toast.success('Invite created — share the code with your ward.');
      setChildEmail('');
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLinking(false);
    }
  };

  const approve = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await fetch(`${API}/approve`, {
        method: 'POST', headers,
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      toast.success('Guardian approved.');
      setApproveCode('');
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const revoke = async (linkId: string) => {
    try {
      const res = await fetch(`${API}/links/${linkId}/revoke`, { method: 'POST', headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to revoke');
      }
      toast.success('Link revoked.');
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyCode = (code: string) => {
    try { navigator.clipboard?.writeText(code); toast.success('Code copied'); } catch { /* */ }
  };

  const pendingGuardians = guardians.filter((g) => g.status === 'pending');
  const activeGuardians = guardians.filter((g) => g.status === 'active');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold">Family &amp; Guardian Center</h1>
          <p className="text-sm text-muted-foreground">Approve guardians, and manage learning limits for your wards.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : (
        <>
          {/* ── WARD: approve a guardian ── */}
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Check size={15} /> Approve a guardian
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={approveCode}
                onChange={(e) => setApproveCode(e.target.value)}
                placeholder="Enter invite code (e.g. A1B2C3D4E5)"
                className="flex-1 bg-muted/50 p-2.5 rounded-lg border border-border text-sm uppercase tracking-widest"
              />
              <button
                onClick={() => approve(approveCode)}
                disabled={!approveCode.trim()}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
            {(pendingGuardians.length > 0 || activeGuardians.length > 0) && (
              <div className="space-y-2 pt-1">
                {pendingGuardians.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/5 p-2.5">
                    <UserAvatar user={g.guardian} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{g.guardian?.name || 'Guardian'}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Pending · {g.relationship}</p>
                    </div>
                    {g.inviteCode && (
                      <button onClick={() => approve(g.inviteCode)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                        Approve
                      </button>
                    )}
                  </div>
                ))}
                {activeGuardians.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5">
                    <UserAvatar user={g.guardian} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{g.guardian?.name || 'Guardian'}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Active · {g.relationship}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── GUARDIAN: invite a ward ── */}
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <UserPlus size={15} /> Invite a ward
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={childEmail}
                onChange={(e) => setChildEmail(e.target.value)}
                placeholder="Ward's email address"
                type="email"
                className="flex-1 bg-muted/50 p-2.5 rounded-lg border border-border text-sm"
              />
              <select
                aria-label="Relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="bg-muted/50 p-2.5 rounded-lg border border-border text-sm"
              >
                <option value="guardian">Guardian</option>
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
              </select>
              <button
                onClick={linkChild}
                disabled={linking || !childEmail.trim()}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {linking ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                Invite
              </button>
            </div>
          </section>

          {/* ── GUARDIAN: wards list ── */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2 px-1">
              <Users size={15} /> Your wards
            </h2>
            {children.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl text-sm text-muted-foreground">
                No wards yet. Invite one by email above.
              </div>
            ) : (
              children.map((link) => {
                const isPending = link.status === 'pending';
                const open = expanded === link.childUserId;
                return (
                  <div key={link.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <UserAvatar user={link.child} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{link.child?.name || link.child?.username || 'Ward'}</p>
                        <p className={`text-xs font-medium ${isPending ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {isPending ? 'Pending approval' : 'Active'} · {link.relationship}
                        </p>
                      </div>
                      {isPending && link.inviteCode && (
                        <button onClick={() => copyCode(link.inviteCode)} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-mono font-semibold tracking-widest hover:bg-muted/70">
                          {link.inviteCode} <Copy size={12} />
                        </button>
                      )}
                      {!isPending && (
                        <button onClick={() => setExpanded(open ? null : link.childUserId)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                          {open ? 'Close' : 'Manage'}
                        </button>
                      )}
                      <button onClick={() => revoke(link.id)} title="Revoke link" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500">
                        <X size={16} />
                      </button>
                    </div>
                    {open && !isPending && <WardPanel childId={link.childUserId} headers={headers} />}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

function WardPanel({ childId, headers }: { childId: string; headers: any }) {
  const [prod, setProd] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [controls, setControls] = useState<any>({});
  const [eff, setEff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minutes, setMinutes] = useState<string>('');
  const [bedStart, setBedStart] = useState('');
  const [bedEnd, setBedEnd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u, c, e] = await Promise.all([
        fetch(`${API}/children/${childId}/productivity`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/children/${childId}/usage`, { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API}/children/${childId}/controls`, { headers }).then((r): any => (r.ok ? r.json() : {})),
        fetch(`${API}/children/${childId}/effective`, { headers }).then((r) => (r.ok ? r.json() : null)),
      ]);
      setProd(p);
      setUsage(Array.isArray(u) ? u.filter((x: any) => x.period === 'daily' && x.limitValue != null) : []);
      setControls(c || {});
      setEff(e);
      setMinutes(c?.maxDailyMinutes != null ? String(c.maxDailyMinutes) : '');
      setBedStart(c?.timeRestrictions?.bedtimeStart || '');
      setBedEnd(c?.timeRestrictions?.bedtimeEnd || '');
    } finally {
      setLoading(false);
    }
     
  }, [childId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { load(); }, [load]);

  const saveControls = async (patch: any) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/children/${childId}/controls`, {
        method: 'PUT', headers, body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setControls(data || {});
      toast.success('Controls updated.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const setStudentMode = async (isEnabled: boolean, enforcedByGuardian: boolean) => {
    try {
      const res = await fetch(`${API}/children/${childId}/student-mode`, {
        method: 'PUT', headers, body: JSON.stringify({ isEnabled, enforcedByGuardian }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update Student Mode');
      toast.success('Student Mode updated.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center border-t border-border py-8 text-muted-foreground">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  const categories: { slug: string; name: string }[] = eff?.categories
    ? Object.entries(eff.categories).map(([slug, v]: any) => ({ slug, name: v?.name || slug }))
    : [];
  const blocked: string[] = controls?.blockedCategorySlugs || [];
  const allowed: string[] = controls?.allowedCategorySlugs || [];
  const sm = eff?.studentMode || { isEnabled: false, enforcedByGuardian: false };
  const controlsEnabled = controls?.isEnabled !== false;

  return (
    <div className="border-t border-border bg-muted/20 p-4 space-y-5">
      {/* Productivity summary */}
      {prod && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-background/60 border border-border/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><GraduationCap size={13} />Score</div>
            <div className="text-base font-extrabold">{Math.round(prod.learningScore || 0)}</div>
          </div>
          <div className="rounded-xl bg-background/60 border border-border/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><Flame size={13} />Streak</div>
            <div className="text-base font-extrabold">{prod.learningStreak || 0}d</div>
          </div>
          <div className="rounded-xl bg-background/60 border border-border/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><Clock size={13} />Watch</div>
            <div className="text-base font-extrabold">{fmtDuration(prod.watchTimeSec || 0)}</div>
          </div>
        </div>
      )}

      {/* Daily usage bars */}
      {usage.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today's usage</p>
          {usage.slice(0, 5).map((l: any) => {
            const pct = l.limitValue ? Math.min(100, Math.round((l.used / l.limitValue) * 100)) : 0;
            const danger = pct >= 100;
            return (
              <div key={l.categorySlug} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">{l.name || l.categorySlug}</span>
                  <span className={danger ? 'text-rose-500 font-semibold' : 'text-muted-foreground'}>{l.used}/{l.limitValue}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                  <div className={`h-full rounded-full ${danger ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Parent controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parent controls</p>
          <button
            onClick={() => saveControls({ isEnabled: !controlsEnabled })}
            disabled={saving}
            className={`relative h-5 w-9 rounded-full transition-colors ${controlsEnabled ? 'bg-primary' : 'bg-muted-foreground/40'}`}
            title={controlsEnabled ? 'Controls enabled' : 'Controls disabled'}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${controlsEnabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground flex-1">Daily screen-time cap (minutes)</label>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="none"
            inputMode="numeric"
            className="w-24 bg-background/60 p-1.5 rounded-lg border border-border text-sm text-right"
          />
          <button
            onClick={() => saveControls({ maxDailyMinutes: minutes === '' ? null : Number(minutes) })}
            disabled={saving}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </div>

        {categories.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Blocked categories</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const on = blocked.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    onClick={() => saveControls({ blockedCategorySlugs: on ? blocked.filter((s) => s !== c.slug) : [...blocked, c.slug] })}
                    disabled={saving}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${on ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Allowed-only whitelist (empty = all except blocked)</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const on = allowed.includes(c.slug);
                return (
                  <button
                    key={`allow-${c.slug}`}
                    onClick={() => saveControls({ allowedCategorySlugs: on ? allowed.filter((s) => s !== c.slug) : [...allowed, c.slug] })}
                    disabled={saving}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${on ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-muted-foreground">Bedtime window</label>
          <input type="time" value={bedStart} onChange={(e) => setBedStart(e.target.value)} className="bg-background/60 p-1.5 rounded-lg border border-border text-sm" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="time" value={bedEnd} onChange={(e) => setBedEnd(e.target.value)} className="bg-background/60 p-1.5 rounded-lg border border-border text-sm" />
          <button
            onClick={() => saveControls({
              timeRestrictions: (bedStart && bedEnd)
                ? { bedtimeStart: bedStart, bedtimeEnd: bedEnd, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }
                : {},
            })}
            disabled={saving}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Save bedtime
          </button>
        </div>
      </div>

      {/* Student mode lock */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center gap-2">
          <Lock size={15} className={sm.enforcedByGuardian ? 'text-primary' : 'text-muted-foreground'} />
          <div>
            <p className="text-sm font-semibold">Student Mode {sm.isEnabled ? '(on)' : '(off)'}</p>
            <p className="text-[11px] text-muted-foreground">{sm.enforcedByGuardian ? 'Locked — ward cannot disable' : 'Not locked'}</p>
          </div>
        </div>
        {sm.enforcedByGuardian ? (
          <button onClick={() => setStudentMode(false, false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Unlock
          </button>
        ) : (
          <button onClick={() => setStudentMode(true, true)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
            Lock on
          </button>
        )}
      </div>
    </div>
  );
}
