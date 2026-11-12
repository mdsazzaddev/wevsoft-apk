import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Lock, UserPlus, Users } from 'lucide-react';
import {
  audienceSummaryLabel,
  flagsFromPrivacy,
  type VisibilityFlags,
} from '../../lib/postVisibility';

const OPTIONS: {
  key: keyof VisibilityFlags;
  label: string;
  hint: string;
  icon: typeof Lock;
  locked?: boolean;
}[] = [
  { key: 'onlyMe', label: 'Only Me', hint: 'You always keep access', icon: Lock, locked: true },
  { key: 'friends', label: 'Friends', hint: 'People you are friends with', icon: Users },
  { key: 'followers', label: 'Followers', hint: 'People who follow you', icon: UserPlus },
  { key: 'public', label: 'Public', hint: 'Anyone on or off Wevsoft', icon: Globe },
  { key: 'custom', label: 'Custom', hint: 'Specific people you choose', icon: Users },
];

/** Accept legacy string privacy values or the post-style flags object. */
export function coercePrivacyFlags(value: unknown): VisibilityFlags {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const v = value as Partial<VisibilityFlags>;
    return {
      onlyMe: true,
      friends: !!v.friends,
      followers: !!v.followers,
      public: !!v.public,
      custom: !!v.custom,
      hideFrom: !!v.hideFrom,
      closeFriends: !!v.closeFriends,
    };
  }
  const raw = String(value || 'public').toLowerCase();
  const normalized =
    raw === 'only_me' || raw === 'private'
      ? 'private'
      : raw === 'custom_friends' || raw === 'custom'
        ? 'custom'
        : raw === 'friends_only' || raw === 'friends'
          ? 'friends'
          : raw === 'followers'
            ? 'followers'
            : raw === 'public'
              ? 'public'
              : raw;
  return flagsFromPrivacy(normalized);
}

export default function PrivacySelect({
  value,
  onChange,
  disabled,
}: {
  value: string | VisibilityFlags;
  onChange: (v: VisibilityFlags) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<VisibilityFlags>(() => coercePrivacyFlags(value));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!open) setFlags(coercePrivacyFlags(value));
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const summary = audienceSummaryLabel(flags);
  const SummaryIcon = flags.public
    ? Globe
    : flags.friends || flags.followers || flags.custom
      ? Users
      : Lock;

  const toggle = (key: keyof VisibilityFlags) => {
    if (disabled || key === 'onlyMe') return;
    setFlags((prev) => {
      const next: VisibilityFlags = { ...prev, [key]: !prev[key], onlyMe: true };
      onChange(next);
      return next;
    });
  };

  return (
    <div className="relative group inline-block" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="appearance-none bg-muted/50 border border-border text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed max-w-[11rem] truncate text-left"
        title={summary}
      >
        {summary}
      </button>
      <SummaryIcon
        size={12}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-foreground"
      />
      <ChevronDown
        size={11}
        className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
      />

      {open && (
        <div className="absolute right-0 top-full z-[120] mt-1 w-[13.5rem] rounded-xl border border-border bg-card shadow-xl p-1 space-y-px">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const checked = !!flags[opt.key];
            const locked = !!opt.locked;
            return (
              <label
                key={opt.key}
                title={opt.hint}
                className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors ${
                  locked ? 'bg-muted/40 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors shrink-0 ${
                    checked
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border bg-background'
                  }`}
                >
                  {checked ? <Check size={9} strokeWidth={3} /> : null}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={locked || disabled}
                  onChange={() => toggle(opt.key)}
                />
                <Icon size={13} className="text-muted-foreground shrink-0" />
                <span className="min-w-0 flex-1 text-[11px] font-semibold flex items-center gap-1 truncate">
                  {opt.label}
                  {locked && (
                    <span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">
                      On
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
