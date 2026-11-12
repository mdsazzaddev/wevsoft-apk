/**
 * The "who can see your WevSpaces on your profile" segmented control (spec §5).
 *
 * Presentational only: it renders the three choices and reports the pick. Both
 * places this setting appears — the profile's My WevSpaces block and Settings →
 * Privacy — render this, so the wording and the option order cannot diverge.
 */

import { Eye } from 'lucide-react';
import {
  SPACES_PROFILE_VISIBILITIES,
  SPACES_PROFILE_VISIBILITY_LABELS,
  type SpacesProfileVisibility,
} from '@wevsoft/shared/wevspace';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';
import { useSettingsTr } from '../../i18n/settingsBn';

const VISIBILITY_LABELS_BN: Record<SpacesProfileVisibility, string> = {
  everyone: 'সবাই',
  followers: 'শুধু ফলোয়াররা',
  nobody: 'কেউ না',
};

interface Props {
  value: SpacesProfileVisibility | string;
  onChange: (value: SpacesProfileVisibility) => void;
  saving?: boolean;
  label?: string;
  className?: string;
}

export default function SpacesVisibilityControl({
  value,
  onChange,
  saving = false,
  label,
  className = '',
}: Props) {
  const { t, isBn } = useMarketplaceLang();
  const tr = useSettingsTr();
  const current = (SPACES_PROFILE_VISIBILITIES as readonly string[]).includes(String(value)) ? (value as SpacesProfileVisibility) : 'everyone';
  const helper: Record<SpacesProfileVisibility, [string, string]> = {
    everyone: ['Anyone who opens your profile sees your WevSpaces.', 'যে কেউ আপনার প্রোফাইলে WevSpace দেখবে।'],
    followers: ['Only people who follow you see them.', 'শুধু আপনার ফলোয়াররা দেখবে।'],
    nobody: ['Hidden from everyone else. Only you see this list.', 'অন্য কেউ দেখবে না, শুধু আপনি দেখবেন।'],
  };
  return (
    <div className={`px-3 py-2.5 bg-card text-card-foreground border border-border rounded-xl ${className}`} aria-busy={saving}>
      <div className="flex items-start gap-2">
        <Eye size={14} className="mt-0.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-foreground">
            {label || (isBn ? t('Who can see your WevSpaces', 'কে আপনার WevSpace দেখতে পারবে') : tr('Who can see your WevSpaces'))}
          </p>
          <p className="text-[11.5px] leading-snug text-muted-foreground">{isBn ? t(helper[current][0], helper[current][1]) : tr(helper[current][0])}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label={isBn ? t('Who can see your WevSpaces on your profile', 'প্রোফাইলে কে আপনার WevSpace দেখতে পারবে') : tr('Who can see your WevSpaces on your profile')} className="mt-2 grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted">
        {SPACES_PROFILE_VISIBILITIES.map((choice) => {
          const active = current === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving}
              onClick={() => onChange(choice)}
              className={`min-w-0 px-1.5 py-1.5 rounded-md text-xs font-semibold text-center leading-tight transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              {isBn ? VISIBILITY_LABELS_BN[choice] : tr(SPACES_PROFILE_VISIBILITY_LABELS[choice])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
