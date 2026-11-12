import { useSettingsTr } from '../../i18n/settingsBn';
import { SettingsNavRow } from './SettingsRows';
import { DESTRUCTIVE_OPTION_IDS } from '../../lib/settingsControlKind';
import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, Fingerprint, Users, AtSign, BadgeCheck, Download, Gavel, KeyRound, Link2, Mail, Phone, ShieldCheck, Trash2,
} from 'lucide-react';
import { AccountSummaryCard } from './AccountCenterPanels';
import type { ConsumerSettingOption } from '../../pages/consumerSettingsData';
import AccountPausePanel from '../account/AccountPausePanel';
import AccountLifecyclePanel from '../account/AccountLifecyclePanel';

/* Grouped overview of the Account settings section, with live status chips. */

type Tone = 'success' | 'warning' | 'neutral' | 'danger';
type Chip = { label: string; tone: Tone } | null;

const CHIP_TONE: Record<Tone, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  neutral: 'bg-muted text-muted-foreground',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  acc_username: AtSign,
  acc_identity_verification: BadgeCheck,
  acc_email_addresses: Mail,
  acc_phone_numbers: Phone,
  acc_password_change: KeyRound,
  acc_connected_accounts: Link2,
  acc_security_shortcut: ShieldCheck,
  acc_activity_log: Activity,
  acc_passkeys: Fingerprint,
  acc_profiles: Users,
  acc_standing: Gavel,
  acc_data_download: Download,
  acc_account_ownership: Trash2,
};

const GROUPS: { key: string; title: string; description: string; ids: string[]; danger?: boolean }[] = [
  { key: 'profile', title: 'Profile & identity', description: 'How people find and recognise you', ids: ['acc_username', 'acc_profiles', 'acc_identity_verification'] },
  { key: 'contact', title: 'Contact info', description: 'Private. Used for sign-in, alerts and recovery', ids: ['acc_email_addresses', 'acc_phone_numbers'] },
  { key: 'signin', title: 'Sign-in', description: 'How you get into your account', ids: ['acc_password_change', 'acc_passkeys', 'acc_connected_accounts', 'acc_security_shortcut', 'acc_activity_log'] },
  { key: 'status', title: 'Your account & data', description: 'Standing with the community and a copy of your information', ids: ['acc_standing', 'acc_data_download'] },
  { key: 'danger', title: 'Danger zone', description: 'Actions that affect your whole account', ids: ['acc_account_ownership'], danger: true },
];

type Status = {
  trust?: { identityVerified?: boolean; nidStatus?: string | null; phoneVerified?: boolean } | null;
  contact?: { email?: string | null; emailVerified?: boolean; phone?: string | null; phoneVerified?: boolean; isSecondaryProfile?: boolean } | null;
  username?: { username?: string; canChange?: boolean; nextEligibleLabel?: string | null } | null;
};

function useAccountStatus(token: string) {
  const [status, setStatus] = useState<Status>({});
  useEffect(() => {
    let alive = true;
    const get = (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    Promise.all([get('/api/v1/trust/me'), get('/api/me/contact'), get('/api/account/username')]).then(([trust, contact, username]) => {
      if (alive) setStatus({ trust, contact, username });
    });
    return () => { alive = false; };
  }, [token]);
  return status;
}

function chipFor(id: string, s: Status): Chip {
  switch (id) {
    case 'acc_username':
      if (!s.username?.username) return null;
      return { label: `@${s.username.username}`, tone: 'neutral' };
    case 'acc_identity_verification': {
      if (!s.trust) return null;
      if (s.trust.identityVerified) return { label: 'Verified', tone: 'success' };
      if (s.trust.nidStatus && /pending|review/i.test(s.trust.nidStatus)) return { label: 'In review', tone: 'warning' };
      if (s.trust.nidStatus && /reject/i.test(s.trust.nidStatus)) return { label: 'Rejected', tone: 'danger' };
      return { label: 'Not verified', tone: 'neutral' };
    }
    case 'acc_email_addresses':
      if (!s.contact) return null;
      if (!s.contact.email) return { label: 'Not added', tone: 'warning' };
      return s.contact.emailVerified ? { label: 'Verified', tone: 'success' } : { label: 'Not verified', tone: 'warning' };
    case 'acc_phone_numbers':
      if (!s.contact) return null;
      if (!s.contact.phone) return { label: 'Not added', tone: 'neutral' };
      return s.contact.phoneVerified ? { label: 'Verified', tone: 'success' } : { label: 'Not verified', tone: 'warning' };
    default:
      return null;
  }
}

function subtitleFor(id: string, s: Status, fallback: string): string {
  if (id === 'acc_email_addresses' && s.contact?.email) return s.contact.email;
  if (id === 'acc_phone_numbers' && s.contact?.phone) return s.contact.phone;
  if (id === 'acc_username' && s.username && s.username.canChange === false && s.username.nextEligibleLabel) {
    return `You can change it again on ${s.username.nextEligibleLabel}`;
  }
  return fallback;
}

export default function AccountSettingsOverview({
  token, options, onOpen, onOpenSecurity,
}: {
  token: string;
  options: ConsumerSettingOption[];
  onOpen: (opt: ConsumerSettingOption) => void;
  onOpenSecurity: () => void;
}) {
  const status = useAccountStatus(token);
  const byId = new Map(options.map((o) => [o.id, o]));

  return (
    <div className="space-y-6">
      <AccountSummaryCard token={token} />
      {GROUPS.map((g) => {
        // Linked (secondary) profiles sign in through the main account: no own password or sign-in contact.
        const hidden = status.contact?.isSecondaryProfile ? new Set(['acc_password_change', 'acc_email_addresses', 'acc_phone_numbers']) : null;
        const rows = g.ids.filter((id) => !hidden?.has(id)).map((id) => byId.get(id)).filter(Boolean) as ConsumerSettingOption[];
        if (!rows.length) return null;
        return (
          <section key={g.key} aria-labelledby={`acc-group-${g.key}`} className="space-y-2">
            <div className="px-1">
              <h3 id={`acc-group-${g.key}`} className={`text-xs font-bold uppercase tracking-wider ${g.danger ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                {g.title}
              </h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5">{g.description}</p>
            </div>
            <div className={`bg-card border rounded-2xl overflow-hidden shadow-sm divide-y ${g.danger ? 'border-red-500/30 divide-red-500/15' : 'border-border divide-border/40'}`}>
              {rows.map((opt) => {
                const Icon = ICONS[opt.id] ?? ShieldCheck;
                const chip = chipFor(opt.id, status);
                const isLink = opt.id === 'acc_security_shortcut';
                return (
                  <SettingsNavRow
                    key={opt.id}
                    title={opt.name}
                    subtitle={subtitleFor(opt.id, status, opt.description)}
                    onClick={() => (isLink ? onOpenSecurity() : onOpen(opt))}
                    destructive={!!g.danger || DESTRUCTIVE_OPTION_IDS.has(opt.id)}
                    icon={<Icon size={18} />}
                    trailing={chip ? (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full max-w-[9rem] truncate ${CHIP_TONE[chip.tone]}`}>{chip.label}</span>
                    ) : undefined}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** One place for the three account-lifecycle choices: pause, deactivate, delete. */
export function AccountDangerZonePanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { t: 'Pause', d: 'Sign out until a date you pick. Posts stay visible.' },
          { t: 'Deactivate', d: 'Hide your profile until you sign back in.' },
          { t: 'Delete', d: 'Schedule permanent deletion. You can cancel before it completes.' },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-sm font-semibold text-foreground">{c.t}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.d}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">{tr('Pause your account')}</h3>
        <AccountPausePanel token={token} />
      </section>
      <section className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-4 space-y-3">
        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 inline-flex items-center gap-1.5"><AlertTriangle size={16} />{tr('Deactivate or delete')}</h3>
        <AccountLifecyclePanel token={token} />
      </section>
    </div>
  );
}

/** Shown when "Security & login" is opened directly (e.g. from search). */
export function SecurityShortcutPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <p className="text-sm text-muted-foreground">Two-step verification, signed-in devices and recovery contacts are in Privacy &amp; security.</p>
      <button type="button" onClick={onOpen} className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <ShieldCheck size={16} />Open Security
      </button>
    </div>
  );
}