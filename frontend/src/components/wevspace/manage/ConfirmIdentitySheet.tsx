/**
 * Identity confirmation for dangerous WevSpace actions (MP4 §10).
 *
 * The server decides *whether* an action needs confirming — it answers 403 with
 * `{ code: 'REAUTH_REQUIRED', reauth: { reason, methods, action } }`. This module
 * turns that answer into a prompt and re-issues the original call with the
 * credential attached, so no call site has to know in advance which of its actions
 * are guarded. Adding a guard on the server is therefore enough; the UI follows.
 *
 * The code is what identifies a challenge, never the status. 403 rather than 401 is
 * load-bearing: `src/main.tsx` wraps `fetch` and signs the account out of any 401
 * outside `/api/auth/`, so a challenge sent as 401 ends the session instead of
 * opening this prompt.
 *
 * The prompt never appears before authorization has been checked, because the
 * challenge only arrives from a route that already accepted the caller's rights.
 * Someone poking at a Space they do not manage is told they cannot, not asked for
 * a password.
 */

import { useCallback, useState } from 'react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  reauthChallengeOf,
  type SpaceConfirmation,
  type SpaceReauthChallenge,
  type SpaceReauthMethod,
} from '../../../lib/wevspaceApi';
import { ActionButton, Field, Sheet, TextInput } from './manageUi';

/**
 * Thrown when someone closes the prompt instead of confirming.
 *
 * A distinct type rather than a generic error so a cancel does not surface as
 * "something went wrong" — backing out of a confirmation is a normal decision,
 * not a failure, and a red banner would suggest the action half-happened.
 */
export class ConfirmCancelledError extends Error {
  constructor() {
    super('Confirmation cancelled');
    this.name = 'ConfirmCancelledError';
  }
}

export function isConfirmCancelled(err: unknown): boolean {
  return (err as any)?.name === 'ConfirmCancelledError';
}

/** Human wording for the action being guarded, for the prompt's subtitle. */
const ACTION_LABELS: Record<string, string> = {
  'space.archive': 'archive this WevSpace',
  'space.delete': 'delete this WevSpace',
  'space.transfer_ownership': 'hand this WevSpace to someone else',
  'space.accept_ownership': 'take ownership of this WevSpace',
  'member.role_changed': "change an admin's role",
  'member.removed': 'remove an admin from the team',
  'settings.sessions_revoke_all': 'sign out of all your other sessions',
  'settings.account_delete': 'delete your account',
  'settings.data_export': 'download a copy of all your data',
};

type Tx = (s: string) => string;
const identity: Tx = (s) => s;

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const tail = String(action || '').split('.').pop() || '';
  return tail ? tail.replace(/_/g, ' ') : 'continue';
}

type Runner<T> = (confirm?: SpaceConfirmation) => Promise<T>;

interface PendingPrompt {
  challenge: SpaceReauthChallenge;
  run: Runner<any>;
  resolve: (value: any) => void;
  reject: (err: unknown) => void;
}

export interface IdentityConfirmation {
  /**
   * Runs `action`, and if the server asks who is calling, prompts and runs it
   * again with the answer. Resolves with the action's own result either way, so
   * callers keep their existing success handling.
   */
  run: <T>(action: Runner<T>) => Promise<T>;
  /** Render this wherever the panel already renders its sheets. */
  prompt: PendingPrompt | null;
  /** Pass as the sheet's `onClose`; clears the prompt once it has settled. */
  close: () => void;
}

/**
 * Wraps a call so a confirmation challenge becomes a prompt rather than an error.
 *
 * The retry is the *same* function the caller passed, invoked a second time with a
 * credential — not a separate "confirmed" endpoint. That keeps one code path for
 * each action, so a guarded action cannot drift from its unguarded twin.
 */
export function useIdentityConfirmation(): IdentityConfirmation {
  const [prompt, setPrompt] = useState<PendingPrompt | null>(null);

  const close = useCallback(() => setPrompt(null), []);

  const run = useCallback(<T,>(action: Runner<T>): Promise<T> => {
    return action().catch((err) => {
      const challenge = reauthChallengeOf(err);
      // Not a confirmation problem — an expired session, a permission refusal, a
      // conflict. Rethrown untouched so the caller reports what actually happened.
      if (!challenge) throw err;
      return new Promise<T>((resolve, reject) => {
        setPrompt((open) => {
          // Two guarded actions challenged at once would otherwise leave the first
          // promise hanging forever, and a caller awaiting it would spin.
          if (open) open.reject(new ConfirmCancelledError());
          return { challenge, run: action, resolve, reject };
        });
      });
    });
  }, []);

  return { run, prompt, close };
}

/**
 * The prompt itself. Rendered from `confirmation.prompt`; returns nothing when
 * there is nothing to confirm.
 */
export function ConfirmIdentitySheet({
  prompt,
  onClose,
  accent,
  t,
}: {
  prompt: PendingPrompt | null;
  /** Called after the prompt is finished with, however it ended. */
  onClose: () => void;
  accent?: string;
  /** Optional translator (Settings passes its Bangla `tr`). English when absent. */
  t?: Tx;
}) {
  const tx: Tx = t || identity;
  const [method, setMethod] = useState<SpaceReauthMethod | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!prompt) return null;

  const { challenge } = prompt;
  const methods = challenge.methods;
  // The server lists two-factor first because it is the stronger proof; honour
  // that as the default rather than defaulting to whatever is easiest to type.
  const active: SpaceReauthMethod = method && methods.includes(method) ? method : methods[0] || 'password';

  const finish = () => {
    setPassword('');
    setCode('');
    setError(null);
    setMethod(null);
    setBusy(false);
    onClose();
  };

  const cancel = () => {
    prompt.reject(new ConfirmCancelledError());
    finish();
  };

  // An account with neither a password nor two-factor cannot confirm anything.
  // Retrying is pointless, so there is no input and no confirm button — only the
  // route out. Pretending otherwise would be a dead box that never accepts.
  if (!challenge.retryable) {
    return (
      <Sheet title={tx('Confirmation not possible')} onClose={cancel}>
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/10">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-semibold leading-relaxed">{tx(challenge.message)}</p>
        </div>
        <div className="mt-4">
          <ActionButton onClick={cancel} full>
            {tx('Close')}
          </ActionButton>
        </div>
      </Sheet>
    );
  }

  const submit = async () => {
    const confirm: SpaceConfirmation =
      active === 'twofactor' ? { confirmCode: code } : { confirmPassword: password };
    if (active === 'twofactor' ? !code.trim() : !password) {
      setError(tx(active === 'twofactor' ? 'Enter the 6-digit code' : 'Enter your password'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await prompt.run(confirm);
      prompt.resolve(result);
      finish();
    } catch (err) {
      const next = reauthChallengeOf(err);
      // A wrong password comes back as another challenge. The sheet stays open so
      // a typo costs one retry rather than the whole action; anything else is the
      // caller's problem and closes the prompt with the real error.
      if (next && next.retryable) {
        setError(tx(next.message));
        setCode('');
        setBusy(false);
        return;
      }
      prompt.reject(err);
      finish();
    }
  };

  return (
    <Sheet
      title={tx('Confirm it is you')}
      onClose={cancel}
      // Always the topmost layer: this prompt is raised *by* an action, and that
      // action frequently lives in a sheet of its own (reviewing an ownership
      // offer, editing a team member). At equal elevation the sheet underneath
      // would swallow the taps meant for the password field.
      elevated
      footer={
        <>
          <ActionButton onClick={cancel} disabled={busy} full>
            {tx('Cancel')}
          </ActionButton>
          <ActionButton onClick={submit} tone="accent" accent={accent} busy={busy} full>
            {tx('Confirm')}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 p-4 rounded-2xl bg-muted">
          <ShieldCheck size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
            {t
              ? tx(`You are about to ${actionLabel(challenge.action)}.`) + ' ' + tx('This cannot be undone from here, so we check once more that it is you and not someone using your signed-in device.')
              : `You are about to ${actionLabel(challenge.action)}. This cannot be undone from here, so we check once more that it is you and not someone using your signed-in device.`}
          </p>
        </div>

        {methods.length > 1 && (
          <div className="flex gap-2">
            {methods.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMethod(option);
                  setError(null);
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-extrabold transition-colors ${
                  active === option ? 'text-primary-foreground' : 'bg-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                style={active === option ? { background: accent || 'var(--color-primary)' } : undefined}
              >
                {option === 'twofactor' ? <ShieldCheck size={13} /> : <KeyRound size={13} />}
                {tx(option === 'twofactor' ? 'Authenticator code' : 'Password')}
              </button>
            ))}
          </div>
        )}

        {active === 'twofactor' ? (
          <Field
            label={tx('Authenticator code')}
            hint={tx('Six digits from your authenticator app, or one of your backup codes.')}
            error={error}
          >
            <TextInput
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              placeholder="123456"
              disabled={busy}
            />
          </Field>
        ) : (
          <Field label={tx('Your password')} error={error}>
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              autoFocus
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={busy}
            />
          </Field>
        )}
      </div>
    </Sheet>
  );
}
