/**
 * Handle (@username) field with debounced server-side availability checking.
 *
 * Format rules are validated locally with the shared validator so the user gets
 * instant feedback; uniqueness and the reserved/brand lists are only ever
 * decided by the server (spec §3 — the client must not be the authority).
 */

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import {
  SPACE_HANDLE_MAX,
  normalizeSpaceHandle,
  spaceDisplayUrl,
  validateSpaceHandleFormat,
} from '@wevsoft/shared/wevspace';
import { checkSpaceHandle } from '../../lib/wevspaceApi';

interface Props {
  value: string;
  onChange: (handle: string) => void;
  /** Ignore this Space's own handle when checking (edit mode). */
  spaceId?: string;
  /** Reports whether the current value is confirmed usable. */
  onStatusChange?: (state: { checking: boolean; available: boolean; error: string | null }) => void;
  label?: string;
  autoFocus?: boolean;
}

export default function SpaceHandleField({
  value,
  onChange,
  spaceId,
  onStatusChange,
  label = 'Username',
  autoFocus = false,
}: Props) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const requestId = useRef(0);
  const statusRef = useRef(onStatusChange);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  statusRef.current = onStatusChange;

  useEffect(() => {
    const handle = normalizeSpaceHandle(value);
    const format = validateSpaceHandleFormat(handle);

    if (!handle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setChecking(false);
      setAvailable(false);
      setError(null);
      setSuggestions([]);
      statusRef.current?.({ checking: false, available: false, error: null });
      return;
    }

    if (!format.ok) {
      setChecking(false);
      setAvailable(false);
      setError(format.error || 'That username cannot be used');
      setSuggestions([]);
      statusRef.current?.({ checking: false, available: false, error: format.error || 'Invalid username' });
      return;
    }

    const id = ++requestId.current;
    setChecking(true);
    setError(null);
    setAvailable(false);
    statusRef.current?.({ checking: true, available: false, error: null });

    const timer = setTimeout(async () => {
      try {
        const result = await checkSpaceHandle(handle, spaceId);
        if (id !== requestId.current) return;
        setChecking(false);
        setAvailable(result.available);
        setError(result.available ? null : result.reason || 'That username is taken');
        setSuggestions(result.available ? [] : result.suggestions || []);
        statusRef.current?.({
          checking: false,
          available: result.available,
          error: result.available ? null : result.reason || 'Taken',
        });
      } catch (err: any) {
        if (id !== requestId.current) return;
        setChecking(false);
        setAvailable(false);
        setError(err?.message || 'Could not check that username');
        statusRef.current?.({ checking: false, available: false, error: 'Check failed' });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [value, spaceId]);

  const handle = normalizeSpaceHandle(value);
  const borderClass = error
    ? 'border-red-500/60 focus-within:border-red-500'
    : available
      ? 'border-emerald-500/60 focus-within:border-emerald-500'
      : 'border-border focus-within:border-primary';

  return (
    <div>
      <label htmlFor="space-handle" className="block text-sm font-extrabold mb-1.5">
        {label}
      </label>

      <div className={`flex items-center gap-1 px-3 rounded-2xl bg-card border transition-colors ${borderClass}`}>
        <span className="text-muted-foreground font-bold select-none">@</span>
        <input
          id="space-handle"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          maxLength={SPACE_HANDLE_MAX}
          onChange={(e) => onChange(normalizeSpaceHandle(e.target.value))}
          placeholder="yourname"
          className="flex-1 bg-transparent py-2.5 outline-none text-sm font-bold min-w-0"
        />
        <span className="shrink-0 w-5 grid place-items-center">
          {checking && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          {!checking && available && <Check size={16} className="text-emerald-500" />}
          {!checking && !!error && <AlertCircle size={16} className="text-red-500" />}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground font-semibold">{spaceDisplayUrl(handle)}</p>

      {error && <p className="mt-1 text-xs font-bold text-red-500">{error}</p>}
      {available && !error && (
        <p className="mt-1 text-xs font-bold text-emerald-500">@{handle} is available</p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-semibold">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange(suggestion)}
              className="px-2.5 py-1 rounded-xl bg-muted text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              @{suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
