import { useEffect, useRef, useState } from 'react';
import { setStepUpPrompt, type StepUpAnswer, type StepUpChallenge } from '../lib/api';

/**
 * Global identity-confirmation prompt for guarded actions made through lib/api
 * (Phase 1 WS2: Developer secret rotation/reveal, app delete, ownership transfer).
 * Mount once near the app root.
 */
export function StepUpHost() {
  const [challenge, setChallenge] = useState<StepUpChallenge | null>(null);
  const [value, setValue] = useState('');
  const resolver = useRef<((a: StepUpAnswer) => void) | null>(null);

  useEffect(() => {
    setStepUpPrompt(
      (c) =>
        new Promise<StepUpAnswer>((resolve) => {
          resolver.current?.(null);
          resolver.current = resolve;
          setValue('');
          setChallenge(c);
        })
    );
    return () => setStepUpPrompt(null);
  }, []);

  if (!challenge) return null;
  const useCode = challenge.methods.includes('twofactor');
  const finish = (answer: StepUpAnswer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setChallenge(null);
  };
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    finish(useCode ? { confirmCode: v } : { confirmPassword: value });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="stepup-title">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl">
        <h2 id="stepup-title" className="text-base font-semibold text-slate-900 dark:text-white">Confirm it is you</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {challenge.reason === 'invalid' ? challenge.message : useCode ? 'Enter the 6-digit code from your authenticator app (or a backup code).' : 'Enter your password to continue.'}
        </p>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            autoFocus
            type={useCode ? 'text' : 'password'}
            inputMode={useCode ? 'numeric' : undefined}
            autoComplete={useCode ? 'one-time-code' : 'current-password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
            aria-label={useCode ? 'Authentication code' : 'Password'}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => finish(null)} className="rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}