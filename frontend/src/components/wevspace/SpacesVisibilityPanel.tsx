/**
 * Settings → Privacy → "WevSpaces on your profile".
 *
 * The value lives on AccountSettings.spacesVisibility behind
 * PUT /api/spaces/visibility, not in the generic consumer-settings blob, so this
 * panel talks to the Space API directly — the same call the control on the
 * profile makes. Whichever surface the user changes it on, the other reflects it
 * on next load (spec §12 — settings are database-backed, not local state).
 */

import { useEffect, useState } from 'react';
import { useSettingsTr } from '../../i18n/settingsBn';
import { Link } from 'react-router-dom';
import { Layers, Loader2, RefreshCw } from 'lucide-react';
import { WevSpaceIcon } from './WevSpaceIcon';
import toast from 'react-hot-toast';
import type { SpacesProfileVisibility } from '@wevsoft/shared/wevspace';
import { fetchMySpaces, setSpacesVisibility } from '../../lib/wevspaceApi';
import SpacesVisibilityControl from './SpacesVisibilityControl';

export default function SpacesVisibilityPanel() {
  const tr = useSettingsTr();
  const [value, setValue] = useState<SpacesProfileVisibility | string>('everyone');
  const [ownedCount, setOwnedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMySpaces();
      setValue(res.spacesVisibility || 'everyone');
      setOwnedCount((res.owned || []).length);
    } catch (err: any) {
      setError(err?.message || 'Could not load your WevSpace privacy setting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, []);

  const change = async (next: SpacesProfileVisibility) => {
    if (saving || next === value) return;
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      await setSpacesVisibility(next);
      toast.success(tr('Saved'), { id: 'spaces-visibility', duration: 1500 });
    } catch (err: any) {
      setValue(previous);
      toast.error(err?.message || tr('Could not save that setting'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> {tr('Loading…')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={13} />{tr('Try again')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SpacesVisibilityControl value={value} saving={saving} onChange={(next) => void change(next)} />
      <p className="px-1 text-xs text-muted-foreground">
        {tr('This only controls the list on your personal profile. Each WevSpace has its own visibility, set from that Space\'s own settings — hiding the list does not unpublish a Space.')}
      </p>
      <Link
        to={ownedCount > 0 ? '/spaces?view=mine' : '/spaces/create'}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <WevSpaceIcon size={14} />
        {ownedCount > 0 ? (ownedCount === 1 ? tr('Manage your {n} WevSpace').replace('{n}', String(ownedCount)) : tr('Manage your {n} WevSpaces').replace('{n}', String(ownedCount))) : tr('Create a WevSpace')}
      </Link>
    </div>
  );
}
