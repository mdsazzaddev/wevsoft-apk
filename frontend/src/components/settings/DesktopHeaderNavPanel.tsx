import { useSettingsTr } from '../../i18n/settingsBn';
import { useTranslation } from 'react-i18next';
import { trLabel } from './languagePickerShared';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import {
  DESKTOP_HEADER_NAV_CATALOG,
  DESKTOP_HEADER_NAV_MAX,
  DESKTOP_HEADER_NAV_PREF_KEY,
  type DesktopHeaderNavId,
  desktopHeaderNavEntry,
  parseDesktopHeaderNavIds,
} from '../../lib/desktopHeaderNav';

export default function DesktopHeaderNavPanel() {
  const tr = useSettingsTr();
  const { t } = useTranslation();

  const token = useStore((s) => s.token);
  const navIds = useStore((s) => s.desktopHeaderNavIds);
  const setDesktopHeaderNavIds = useStore((s) => s.setDesktopHeaderNavIds);
  const [saving, setSaving] = useState(false);

  const available = useMemo(
    () => DESKTOP_HEADER_NAV_CATALOG.filter((entry) => !navIds.includes(entry.id)),
    [navIds],
  );

  const persist = async (next: DesktopHeaderNavId[]) => {
    const sanitized = parseDesktopHeaderNavIds(next);
    const previous = navIds;
    setDesktopHeaderNavIds(sanitized);
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings/account', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: { [DESKTOP_HEADER_NAV_PREF_KEY]: sanitized } }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save header shortcuts');
      }
      toast.success(trLabel(t, 'HeaderShortcutsSaved', 'Header shortcuts saved'), { id: 'desktop-header-nav', duration: 1500 });
    } catch (err: any) {
      setDesktopHeaderNavIds(previous);
      toast.error(err?.message || 'Could not save header shortcuts');
    } finally {
      setSaving(false);
    }
  };

  const add = (id: DesktopHeaderNavId) => {
    if (navIds.includes(id) || navIds.length >= DESKTOP_HEADER_NAV_MAX) return;
    void persist([...navIds, id]);
  };

  const remove = (id: DesktopHeaderNavId) => {
    if (navIds.length <= 1) {
      toast.error(trLabel(t, 'KeepOneHeaderShortcut', 'Keep at least one shortcut in the header'));
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
        Pick up to {DESKTOP_HEADER_NAV_MAX} shortcuts for the center of the desktop header. Reorder them
        left to right — the same order appears in the top bar.
      </p>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          In header ({navIds.length}/{DESKTOP_HEADER_NAV_MAX})
        </div>
        <div className="rounded-2xl border border-border divide-y divide-border/50 overflow-hidden">
          {navIds.map((id, index) => {
            const entry = desktopHeaderNavEntry(id);
            if (!entry) return null;
            const Icon = entry.icon;
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-2.5 bg-card">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-foreground" />
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

      {available.length > 0 && navIds.length < DESKTOP_HEADER_NAV_MAX && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Add shortcut
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
