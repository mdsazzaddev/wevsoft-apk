import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Globe,
  GripVertical,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Play,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { PERSONAL_CREATOR_HUB_PATH, personalCreatorHubPath } from '../../lib/creatorHub';
import {
  PROFILE_ACTION_PRESETS,
  buildActionUrl,
  presetForType,
  type ProfileActionType,
} from './profileManageShared';

const ACTION_ICONS: Record<string, LucideIcon> = {
  MessageCircle,
  Phone,
  Mail,
  UserRound,
  UserPlus,
  Play,
  Globe,
  ShoppingBag,
  Calendar,
  Bell,
  Sparkles,
};

type Section = 'action-buttons' | 'professional-mode' | 'verification' | 'ads' | 'copyright';

const SECTIONS: { id: Section; title: string }[] = [
  { id: 'action-buttons', title: 'Action buttons' },
  { id: 'professional-mode', title: 'Professional mode' },
  { id: 'verification', title: 'Profile verification' },
  { id: 'ads', title: 'Advertising Center' },
  { id: 'copyright', title: 'Copyright & rights' },
];

type ActionButton = {
  id: string;
  type: string;
  label: string;
  url?: string | null;
  visibility: string;
  enabled: boolean;
  sortOrder: number;
};

export default function ProfileManagePage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const active = (SECTIONS.find((s) => s.id === section)?.id ||
    'action-buttons') as Section;

  useEffect(() => {
    if (!SECTIONS.some((s) => s.id === section)) {
      navigate('/profile/manage/action-buttons', { replace: true });
    }
  }, [section, navigate]);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Profile Manager</h1>
          <p className="text-xs text-muted-foreground">
            {SECTIONS.find((s) => s.id === active)?.title}
          </p>
        </div>
      </div>

      <nav className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <Link
            key={s.id}
            to={`/profile/manage/${s.id}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              active === s.id
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground'
            }`}
          >
            {s.title}
          </Link>
        ))}
      </nav>

      {!token ? (
        <p className="text-sm text-muted-foreground">Sign in required.</p>
      ) : active === 'action-buttons' ? (
        <ActionButtonsPanel token={token} />
      ) : active === 'professional-mode' ? (
        <ProfessionalModePanel token={token} />
      ) : active === 'verification' ? (
        <VerificationPanel token={token} />
      ) : active === 'ads' ? (
        <AdsBridgePanel />
      ) : (
        <CopyrightPanel token={token} />
      )}
    </div>
  );
}

function ActionButtonsPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<ActionButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<ProfileActionType>('WEVCHAT');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = presetForType(type);
  const SelectedIcon = ACTION_ICONS[selected.icon] || Sparkles;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/action-buttons', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setRows(Array.isArray(data.buttons) ? data.buttons : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void load();
  }, [token]);

  const pickType = (next: ProfileActionType) => {
    setType(next);
    const p = presetForType(next);
    setLabel(p.label);
    setUrl('');
  };

  const add = async () => {
    setBusy(true);
    try {
      const built = buildActionUrl(type, url);
      const res = await fetch('/api/profile/action-buttons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          label: label || selected.label,
          url: built,
          visibility: 'public',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Button added');
      setUrl('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/profile/action-buttons/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast.error('Could not delete');
      return;
    }
    await load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const next = [...rows];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setRows(next);
    await fetch('/api/profile/action-buttons/reorder', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: next.map((r) => r.id) }),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-foreground">Choose a button</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          WevChat, Call, Email, Contact me, Sign up, Watch now — up to 8 on your profile.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROFILE_ACTION_PRESETS.filter((p) => p.type !== 'MESSAGE').map((p) => {
          const Icon = ACTION_ICONS[p.icon] || Sparkles;
          const active = type === p.type;
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => pickType(p.type)}
              className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                active
                  ? `${p.accent} ring-2 ring-foreground/15 shadow-sm`
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${p.accent}`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{p.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground line-clamp-2">
                  {p.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selected.accent}`}
          >
            <SelectedIcon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">{selected.label}</p>
            <p className="text-[11px] text-muted-foreground">{selected.hint}</p>
          </div>
        </div>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          placeholder="Button label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        {selected.urlKind !== 'none' && (
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            placeholder={selected.urlPlaceholder || 'https://…'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode={selected.urlKind === 'tel' ? 'tel' : selected.urlKind === 'mailto' ? 'email' : 'url'}
          />
        )}
        {/* Live preview chip */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </span>
          <span
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold ${selected.accent}`}
          >
            <SelectedIcon size={15} />
            {label.trim() || selected.label}
          </span>
        </div>
        <button
          type="button"
          disabled={busy || rows.length >= 8}
          onClick={() => void add()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2.5 text-sm font-bold text-background disabled:opacity-60"
        >
          <Plus size={16} /> Add to profile
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">On your profile ({rows.length}/8)</h3>
        {loading ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const p = presetForType(r.type);
              const Icon = ACTION_ICONS[p.icon] || Sparkles;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5"
                >
                  <GripVertical size={16} className="text-muted-foreground shrink-0" />
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${p.accent}`}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.label}
                      {r.url ? ` · ${r.url}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-lg bg-muted font-semibold"
                    onClick={() => move(r.id, -1)}
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-lg bg-muted font-semibold"
                    onClick={() => move(r.id, 1)}
                    disabled={i === rows.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="p-2 text-destructive"
                    onClick={() => remove(r.id)}
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
            {!rows.length && (
              <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No buttons yet — pick one above.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfessionalModePanel({ token }: { token: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/profile/professional-mode', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        setEnabled(!!data.enabled);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const res = await fetch('/api/profile/professional-mode', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEnabled(!!data.enabled);
      toast.success(next ? 'Professional mode on' : 'Professional mode off');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Professional mode highlights Creator Hub tools on your profile. Turning it on or off never
        deletes posts, followers, messages, or content.
      </p>
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle(!enabled)}
          className={`rounded-xl px-4 py-3 text-sm font-bold ${
            enabled ? 'bg-emerald-600 text-white' : 'bg-foreground text-background'
          }`}
        >
          {enabled ? 'Disable Professional mode' : 'Enable Professional mode'}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        <Link to={PERSONAL_CREATOR_HUB_PATH} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
          Open Creator Hub
        </Link>
        <Link to={personalCreatorHubPath('analytics')} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
          Insights
        </Link>
        <Link to={personalCreatorHubPath('monetization')} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
          Monetization
        </Link>
      </div>
    </div>
  );
}

function VerificationPanel({ token }: { token: string }) {
  const [verified, setVerified] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [type, setType] = useState('creator');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch('/api/profile/verification', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    setVerified(!!data.verifiedBadge);
    setRequests(Array.isArray(data.requests) ? data.requests : []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void load();
  }, [token]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/profile/verification', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Application submitted — staff will review');
      setNote('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const appeal = async (id: string) => {
    const res = await fetch(`/api/profile/verification/${id}/appeal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note: 'Please reconsider my application.' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Appeal failed');
      return;
    }
    toast.success('Appeal submitted');
    await load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Verification is reviewed by Wevsoft staff. You cannot assign a verified badge yourself.
        Paid subscriptions are not the same as identity verification.
      </p>
      <div className="rounded-xl border border-border bg-card p-3 text-sm">
        Status:{' '}
        <strong>{verified ? 'Verified badge active' : 'Not verified'}</strong>
      </div>
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="identity">Identity</option>
          <option value="creator">Creator</option>
          <option value="business">Business</option>
          <option value="organization">Organization</option>
        </select>
        <textarea
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
          placeholder="Why should Wevsoft verify this profile?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || verified}
          onClick={() => void submit()}
          className="rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background disabled:opacity-50"
        >
          Submit application
        </button>
      </div>
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="rounded-xl border border-border px-3 py-2 text-sm">
            <div className="font-semibold">
              {r.type} · {r.status}
            </div>
            {r.status === 'rejected' && (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-primary"
                onClick={() => void appeal(r.id)}
              >
                Appeal
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdsBridgePanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Promote eligible posts and reels, or open paid campaign tools. Audience data stays private.
      </p>
      <div className="grid gap-2">
        <Link
          to={personalCreatorHubPath('boost')}
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"
        >
          Boost & promote (organic)
        </Link>
        <Link
          to="/settings?opt=pro_ad_campaigns"
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"
        >
          Ad campaign settings
        </Link>
        <a
          href="/api/ads"
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = personalCreatorHubPath('boost');
          }}
        >
          WevAds entry (via Boost hub)
        </a>
      </div>
    </div>
  );
}

function CopyrightPanel({ token }: { token: string }) {
  const [filed, setFiled] = useState<any[]>([]);
  const [against, setAgainst] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch('/api/profile/copyright/claims', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    setFiled(Array.isArray(data.filed) ? data.filed : []);
    setAgainst(Array.isArray(data.against) ? data.against : []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void load();
  }, [token]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/profile/copyright/claims', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: 'other',
          rightsBasis: 'ownership',
          description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Claim filed for human review');
      setDescription('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Report suspected copyright issues. Matches are not automatic infringement — staff review
        every dispute. Wevsoft cannot promise zero claims.
      </p>
      <Link
        to={personalCreatorHubPath('security')}
        className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-semibold"
      >
        Open Creator copyright tools
      </Link>
      <textarea
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
        placeholder="Describe the content and your rights (min 20 characters)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background"
      >
        File claim
      </button>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">Filed by you</h3>
          {filed.map((c) => (
            <div key={c.id} className="mb-1 rounded border border-border p-2 text-xs">
              {c.status}: {c.description?.slice(0, 80)}
            </div>
          ))}
          {!filed.length && <p className="text-xs text-muted-foreground">None</p>}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">Against you</h3>
          {against.map((c) => (
            <div key={c.id} className="mb-1 rounded border border-border p-2 text-xs">
              {c.status}: {c.description?.slice(0, 80)}
            </div>
          ))}
          {!against.length && <p className="text-xs text-muted-foreground">None</p>}
        </div>
      </div>
    </div>
  );
}
