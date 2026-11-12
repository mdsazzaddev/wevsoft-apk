import { useSettingsTr } from '../../i18n/settingsBn';
import { useTranslation } from 'react-i18next';
import { trLabel } from './languagePickerShared';
import { useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import {
  MOBILE_BOTTOM_NAV_CATALOG,
  MOBILE_BOTTOM_NAV_MAX,
  MOBILE_BOTTOM_NAV_PREF_KEY,
  type MobileBottomNavId,
  mobileBottomNavEntry,
  parseMobileBottomNavIds,
} from '../../lib/mobileBottomNav';

export default function MobileBottomNavPanel() {
  const tr = useSettingsTr();
  const { t } = useTranslation();

  const token = useStore((s) => s.token);
  const navIds = useStore((s) => s.mobileNavItems);
  const setMobileNavItems = useStore((s) => s.setMobileNavItems);
  const [saving, setSaving] = useState(false);

  const available = useMemo(
    () => MOBILE_BOTTOM_NAV_CATALOG.filter((entry) => !navIds.includes(entry.id)),
    [navIds],
  );

  const persist = async (next: MobileBottomNavId[]) => {
    const sanitized = parseMobileBottomNavIds(next);
    const previous = navIds;
    setMobileNavItems(sanitized);
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings/account', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: { [MOBILE_BOTTOM_NAV_PREF_KEY]: sanitized } }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save bottom nav');
      }
      toast.success(trLabel(t, 'BottomNavSaved', 'Bottom nav saved'), { id: 'mobile-bottom-nav', duration: 1500 });
    } catch (err: any) {
      setMobileNavItems(previous);
      toast.error(err?.message || 'Could not save bottom nav');
    } finally {
      setSaving(false);
    }
  };

  const add = (id: MobileBottomNavId) => {
    if (navIds.includes(id) || navIds.length >= MOBILE_BOTTOM_NAV_MAX) return;
    void persist([...navIds, id]);
  };

  const remove = (id: MobileBottomNavId) => {
    if (navIds.length <= 1) {
      toast.error(trLabel(t, 'KeepOneBottomNav', 'Keep at least one item in the bottom nav'));
      return;
    }
    void persist(navIds.filter((item) => item !== id));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= navIds.length) return;
    const next = [...navIds];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Pick up to {MOBILE_BOTTOM_NAV_MAX} icons for the mobile bottom bar. Menu opens accounts,
        profile, and settings — keep it on the right with Notifications.
      </p>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          In bottom nav ({navIds.length}/{MOBILE_BOTTOM_NAV_MAX})
        </div>
        <div className="rounded-2xl border border-border divide-y divide-border/50 overflow-hidden">
          {navIds.map((id, index) => {
            const entry = mobileBottomNavEntry(id);
            if (!entry) return null;
            const Icon = entry.icon;
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-2.5 bg-card">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {entry.id === 'notifications' ? (
                    <Bell size={18} className="text-foreground" />
                  ) : (
                    <Icon size={18} className="text-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate">{trLabel(t, entry.labelKey || entry.label, entry.label)}</div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={saving || index === 0}
                    onClick={() => move(index, -1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"
                    title={trLabel(t, 'MoveLeft', 'Move left')}
                  >
                    <ChevronUp size={16} className="-rotate-90" />
                  </button>
                  <button
                    type="button"
                    disabled={saving || index === navIds.length - 1}
                    onClick={() => move(index, 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"
                    title={trLabel(t, 'MoveRight', 'Move right')}
                  >
                    <ChevronDown size={16} className="-rotate-90" />
                  </button>
                  <button
                    type="button"
                    disabled={saving || navIds.length <= 1}
                    onClick={() => remove(id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                    title={trLabel(t, 'Remove', 'Remove')}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {available.length > 0 && navIds.length < MOBILE_BOTTOM_NAV_MAX && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Add item
          </div>
          <div className="flex flex-wrap gap-2">
            {available.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={saving}
                  onClick={() => add(entry.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                >
                  <Icon size={14} />
                  {trLabel(t, entry.labelKey || entry.label, entry.label)}
                  <Plus size={12} className="opacity-70" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Loader2 size={14} className="animate-spin" />
          Saving…
        </div>
      )}
    </div>
  );
}
