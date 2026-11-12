import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import { forgetSignedOutAccount, getSignedOutAccounts, type SignedOutAccount } from '../../lib/savedAccounts';
import { useValueChanged } from '../../hooks/useValueChanged';

/** Google-style "Signed out" accounts remembered on this device (profile only, never a token). */
export default function SignedOutAccountsList({
  onPick,
  compact = false,
  allowRemove = true,
  /** Arrow affordance instead of the "Signed out" label (login page). */
  continueArrow = false,
  refreshKey = 0,
}: {
  onPick: (a: SignedOutAccount) => void;
  compact?: boolean;
  /** When false, hide the per-row trash (e.g. login page — remove via ⋯ menu). */
  allowRemove?: boolean;
  continueArrow?: boolean;
  /** Bump to re-read localStorage after an external remove. */
  refreshKey?: number;
}) {
  const [list, setList] = useState<SignedOutAccount[]>(() => getSignedOutAccounts());
  // refreshKey bump → re-read localStorage (during render instead of an effect).
  const refreshed = useValueChanged(refreshKey);
  if (refreshed) setList(getSignedOutAccounts());
  if (list.length === 0) return null;
  return (
    <div className={compact ? 'space-y-0.5 pt-1' : 'space-y-1'}>
      {list.map((a) => (
        <div key={a.id} className="w-full flex items-center gap-1 rounded-xl border border-transparent hover:bg-muted px-1">
          <button
            type="button"
            onClick={() => onPick(a)}
            aria-label={`Continue as ${a.name}`}
            className="min-w-0 flex-1 flex items-center gap-3 px-1 py-1.5 text-left opacity-80"
          >
            <UserAvatar user={a as any} className={compact ? 'w-7 h-7 text-[10px]' : 'w-10 h-10 text-sm'} />
            <div className="min-w-0 flex-1">
              <div className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`}>{a.name}</div>
              <div className={`text-muted-foreground truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>{a.username ? `@${a.username}` : a.email}</div>
            </div>
            {continueArrow ? (
              <ChevronRight size={compact ? 16 : 18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted-foreground/15 text-muted-foreground shrink-0">Signed out</span>
            )}
          </button>
          {allowRemove ? (
            <button type="button" title="Remove from this device" className="p-1.5 rounded-full text-muted-foreground hover:text-red-400"
              onClick={() => { forgetSignedOutAccount(a.id); setList(getSignedOutAccounts()); }}>
              <Trash2 size={compact ? 13 : 15} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}