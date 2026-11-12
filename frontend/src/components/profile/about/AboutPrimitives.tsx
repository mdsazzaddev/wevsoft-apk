import React, { useEffect, useRef, useState } from 'react';
import { Globe, Users, Lock, Heart, UserPlus, EyeOff, MoreHorizontal, Pencil, Trash2, Plus, Check, type LucideIcon } from 'lucide-react';
import { Button, IconButton, Input, cn } from '../../ui';
import { useMarketplaceLang } from '../../marketplace/commerce/useMarketplaceLang';
import AudienceSelectorModal from '../../social/AudienceSelectorModal';
import {
  audienceSummaryLabel,
  type VisibilityFlags,
} from '../../../lib/postVisibility';
import {
  type AboutAudiencePayload,
  normalizeAudience,
  type AboutAudience,
} from './aboutAudience.logic';

export type { AboutAudience, AboutAudiencePayload };
export { normalizeAudience };

export const AUDIENCE_META: Record<AboutAudience, { icon: LucideIcon; en: string; bn: string }> = {
  public: { icon: Globe, en: 'Public', bn: 'পাবলিক' },
  friends: { icon: Users, en: 'Friends', bn: 'বন্ধুরা' },
  close_friends: { icon: Heart, en: 'Close friends', bn: 'ক্লোজ ফ্রেন্ডস' },
  followers: { icon: UserPlus, en: 'Followers', bn: 'ফলোয়ার' },
  only_me: { icon: Lock, en: 'Only me', bn: 'শুধু আমি' },
};

const AUDIENCE_TOGGLE_ROWS: {
  key: keyof VisibilityFlags;
  en: string;
  bn: string;
  icon: LucideIcon;
  exclusiveOnlyMe?: boolean;
}[] = [
  { key: 'public', en: 'Public', bn: 'পাবলিক', icon: Globe },
  { key: 'friends', en: 'Friends', bn: 'বন্ধুরা', icon: Users },
  { key: 'closeFriends', en: 'Close friends', bn: 'ক্লোজ ফ্রেন্ডস', icon: Heart },
  { key: 'followers', en: 'Followers', bn: 'ফলোয়ার', icon: UserPlus },
  { key: 'custom', en: 'Specific people', bn: 'নির্দিষ্ট মানুষ', icon: Users },
  { key: 'hideFrom', en: 'Hide from…', bn: 'যাদের কাছ থেকে লুকাবেন…', icon: EyeOff },
];

/** Section wrapper on the right-hand pane. */
export function AboutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="px-1 pb-2 text-[17px] font-bold text-foreground">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

/** Small sub-heading inside a section, e.g. "Work" / "College". */
export function AboutSubheading({ children }: { children: React.ReactNode }) {
  return <h4 className="px-1 pt-3 pb-1 text-[15px] font-semibold text-foreground">{children}</h4>;
}

/** Facebook-style "+ Add something" row shown to the owner. */
export function AboutAddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left text-[15px] font-medium text-primary hover:bg-surface-hover transition-colors"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/50">
        <Plus size={18} strokeWidth={2} aria-hidden />
      </span>
      {label}
    </button>
  );
}

/** Muted line for visitors when a section has nothing to show. */
export function AboutEmpty({ text }: { text: string }) {
  return <p className="px-1 py-2 text-[15px] text-muted-foreground">{text}</p>;
}

interface AboutRowProps {
  icon: LucideIcon;
  value: React.ReactNode;
  sub?: React.ReactNode;
  audience?: AboutAudiencePayload;
  isOwner?: boolean;
  onAudience?: (payload: AboutAudiencePayload) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function summaryIcon(flags: VisibilityFlags): LucideIcon {
  if (flags.public) return Globe;
  if (flags.closeFriends) return Heart;
  if (flags.hideFrom) return EyeOff;
  if (flags.friends || flags.followers || flags.custom) return Users;
  return Lock;
}

/** One fact: icon, value, sub-label, multi-select audience + edit/delete (owner only). */
export function AboutRow({
  icon: Icon,
  value,
  sub,
  audience,
  isOwner,
  onAudience,
  onEdit,
  onDelete,
}: AboutRowProps) {
  const { t } = useMarketplaceLang();
  const [menu, setMenu] = useState<null | 'actions' | 'audience'>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<AboutAudiencePayload | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const flags = audience?.flags || { onlyMe: true, friends: false, followers: false, public: true, custom: false, hideFrom: false, closeFriends: false };
  const customUsers = audience?.customUsers || [];
  const hideFromUsers = audience?.hideFromUsers || [];
  const audLabel = audienceSummaryLabel(flags, customUsers.length, hideFromUsers.length);
  const Aud = summaryIcon(flags);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const openAudienceMenu = () => {
    setDraft({
      flags: { ...flags, onlyMe: true },
      customUsers: [...customUsers],
      hideFromUsers: [...hideFromUsers],
    });
    setMenu(menu === 'audience' ? null : 'audience');
  };

  const toggleFlag = (key: keyof VisibilityFlags) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextFlags: VisibilityFlags = { ...prev.flags, onlyMe: true };
      if (key === 'onlyMe') {
        return {
          ...prev,
          flags: {
            onlyMe: true,
            friends: false,
            followers: false,
            public: false,
            custom: false,
            hideFrom: false,
            closeFriends: false,
          },
          customUsers: [],
          hideFromUsers: [],
        };
      }
      const turningOn = !nextFlags[key];
      nextFlags[key] = turningOn;
      if (key === 'public' && turningOn) {
        nextFlags.friends = false;
        nextFlags.followers = false;
        nextFlags.custom = false;
        nextFlags.closeFriends = false;
      }
      if (key === 'closeFriends' && turningOn) {
        nextFlags.public = false;
        nextFlags.friends = false;
        nextFlags.followers = false;
        nextFlags.custom = false;
      }
      if ((key === 'friends' || key === 'followers' || key === 'custom') && turningOn) {
        nextFlags.public = false;
        nextFlags.closeFriends = false;
      }
      if (key === 'custom' && !turningOn) {
        return { ...prev, flags: nextFlags, customUsers: [] };
      }
      if (key === 'hideFrom' && !turningOn) {
        return { ...prev, flags: nextFlags, hideFromUsers: [] };
      }
      return { ...prev, flags: nextFlags };
    });
  };

  const onlyMeSelected =
    !!draft &&
    !draft.flags.public &&
    !draft.flags.friends &&
    !draft.flags.closeFriends &&
    !draft.flags.followers &&
    !draft.flags.custom;

  const commitDraft = () => {
    if (!draft || !onAudience) return;
    const needsPeople =
      (draft.flags.custom && draft.customUsers.length === 0) ||
      (draft.flags.hideFrom && draft.hideFromUsers.length === 0);
    if (needsPeople) {
      setPickerOpen(true);
      return;
    }
    onAudience(draft);
    setMenu(null);
    setDraft(null);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-3 rounded-lg px-1 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={18} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] text-foreground ${typeof value === 'string' ? 'truncate' : 'break-words'}`}>
          {value}
        </div>
        {sub && <div className="truncate text-[13px] text-muted-foreground">{sub}</div>}
      </div>
      {isOwner && onAudience ? (
        <IconButton
          label={t('Audience', 'কে দেখবে') + ': ' + audLabel}
          size="sm"
          icon={<Aud size={16} strokeWidth={2} />}
          onClick={openAudienceMenu}
        />
      ) : isOwner ? (
        <span className="text-muted-foreground" title={audLabel}><Aud size={16} strokeWidth={2} aria-hidden /></span>
      ) : null}
      {isOwner && (onEdit || onDelete) && (
        <IconButton
          label={t('Options', 'অপশন')}
          size="sm"
          icon={<MoreHorizontal size={18} strokeWidth={2} />}
          onClick={() => setMenu(menu === 'actions' ? null : 'actions')}
        />
      )}
      {menu === 'audience' && draft && (
        <div className="absolute right-0 top-full z-(--z-dropdown) mt-1 w-[16.5rem] overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('Who can see this?', 'কে এটা দেখতে পারবে?')}
          </p>
          <label className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-hover', onlyMeSelected && 'bg-primary/10 text-primary')}>
            <span className={cn('flex h-4 w-4 items-center justify-center rounded border', onlyMeSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
              {onlyMeSelected ? <Check size={10} strokeWidth={3} /> : null}
            </span>
            <input type="checkbox" className="sr-only" checked={onlyMeSelected} onChange={() => toggleFlag('onlyMe')} />
            <Lock size={15} strokeWidth={2} aria-hidden />
            {t('Only me', 'শুধু আমি')}
          </label>
          {AUDIENCE_TOGGLE_ROWS.map((row) => {
            const checked = !!draft.flags[row.key];
            const MIcon = row.icon;
            return (
              <label
                key={row.key}
                className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-hover', checked && 'bg-primary/10 text-primary')}
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded border', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {checked ? <Check size={10} strokeWidth={3} /> : null}
                </span>
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleFlag(row.key)} />
                <MIcon size={15} strokeWidth={2} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t(row.en, row.bn)}</span>
              </label>
            );
          })}
          {(draft.flags.custom || draft.flags.hideFrom) && (
            <button
              type="button"
              className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-primary hover:bg-surface-hover"
              onClick={() => setPickerOpen(true)}
            >
              <Users size={15} strokeWidth={2} aria-hidden />
              {t('Choose people…', 'মানুষ বেছে নিন…')}
              {(draft.customUsers.length > 0 || draft.hideFromUsers.length > 0) && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {draft.customUsers.length + draft.hideFromUsers.length}
                </span>
              )}
            </button>
          )}
          <div className="mt-1 flex gap-1 border-t border-border pt-1.5">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setMenu(null); setDraft(null); }}>
              {t('Cancel', 'বাতিল')}
            </Button>
            <Button size="sm" className="flex-1" onClick={commitDraft}>
              {t('Done', 'হয়ে গেছে')}
            </Button>
          </div>
        </div>
      )}
      {menu === 'actions' && (
        <div className="absolute right-0 top-full z-(--z-dropdown) mt-1 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
          {onEdit && (
            <button type="button" onClick={() => { onEdit(); setMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-surface-hover">
              <Pencil size={16} strokeWidth={2} aria-hidden /> {t('Edit', 'এডিট করুন')}
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => { onDelete(); setMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-surface-hover">
              <Trash2 size={16} strokeWidth={2} aria-hidden /> {t('Delete', 'মুছে ফেলুন')}
            </button>
          )}
        </div>
      )}
      <AudienceSelectorModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('About audience', 'অ্যাবাউট অডিয়েন্স')}
        initialFlags={draft?.flags || flags}
        initialCustomUsers={draft?.customUsers || customUsers}
        initialHideFromUsers={draft?.hideFromUsers || hideFromUsers}
        onSave={(payload) => {
          const next = {
            flags: payload.flags,
            customUsers: payload.customUsers,
            hideFromUsers: payload.hideFromUsers,
          };
          setDraft(next);
          onAudience?.(next);
          setPickerOpen(false);
          setMenu(null);
          setDraft(null);
        }}
      />
    </div>
  );
}

export interface FieldSpec {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'url' | 'email' | 'tel' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

/** Inline add/edit form used by every section. */
export function AboutInlineForm({
  fields,
  initial,
  onCancel,
  onSave,
}: {
  fields: FieldSpec[];
  initial?: Record<string, string>;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void | Promise<void>;
}) {
  const { t } = useMarketplaceLang();
  const [values, setValues] = useState<Record<string, string>>(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  };
  const fieldCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40';
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-3">
      {fields.map((f) =>
        f.type === 'textarea' ? (
          <label key={f.name} className="block space-y-1">
            <span className="text-body-sm font-semibold text-foreground">{f.label}</span>
            <textarea
              rows={4}
              className={`${fieldCls} wev-profile-bio min-h-[6rem]`}
              value={values[f.name] || ''}
              placeholder={f.placeholder}
              spellCheck={false}
              onChange={(e) => set(f.name, e.target.value)}
            />
          </label>
        ) : f.type === 'select' ? (
          <label key={f.name} className="block space-y-1">
            <span className="text-body-sm font-semibold text-foreground">{f.label}</span>
            <select className={fieldCls} value={values[f.name] || ''} onChange={(e) => set(f.name, e.target.value)}>
              <option value="">—</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        ) : (
          <Input key={f.name} label={f.label} type={f.type || 'text'} value={values[f.name] || ''} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
        ),
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>{t('Cancel', 'বাতিল')}</Button>
        <Button type="submit" size="sm" loading={saving}>{t('Save', 'সেভ করুন')}</Button>
      </div>
    </form>
  );
}
