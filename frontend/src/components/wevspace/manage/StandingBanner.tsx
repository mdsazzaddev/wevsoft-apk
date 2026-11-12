/**
 * The owner's side of moderation (Master Prompt 3 §4, §5, §29).
 *
 * A Space under a sanction stops working in ways that look, from the inside, like
 * bugs: posts refuse to publish, the inbox will not send, a settings field snaps
 * back. §4 says the owner is told — and they are, once, by notification, which is
 * exactly the kind of thing people miss, clear, or read on a phone in a queue.
 * This is the standing record they can come back to: what is in force, until when,
 * why, and what still works.
 *
 * Rendered by the dashboard shell above whichever section is open, not inside
 * Overview. An owner who deep-links straight to Settings, tries to save, and is
 * refused would otherwise get a bare error and never see the explanation. A
 * sanction that blocks half the dashboard belongs on all of it.
 *
 * Three rules it follows:
 *
 *  - Nothing is invented. Every line comes from the `standing` block the server
 *    sends; there is no client-side inference about why a Space was sanctioned.
 *  - Nothing staff-only appears, because nothing staff-only is in the payload. The
 *    internal note and the identity of whoever acted never leave the admin console
 *    (§23), so there is no filtering here to get wrong.
 *  - A Space in good standing renders nothing at all. §29 wants no blank screens,
 *    not a reassurance card on a dashboard that has real work on it.
 *
 * Deadlines go through `dateTime`, which renders in the reader's own timezone. The
 * server deliberately sends the raw instant rather than a sentence so that this is
 * possible — an owner in Dhaka should not have to convert from the server's clock
 * to know when they can post again. `spaceSuspensionMessage` in shared/wevspace.ts
 * was the earlier attempt at this copy and has been removed rather than called: it
 * flattened title, consequence and staff reason into one sentence, which loses the
 * distinction between what Wevsoft is telling the owner and what the owner must
 * act on, and it formatted its date with a bare `toLocaleString()` — correct on a
 * client, silently the server's timezone if anything ever rendered it there.
 */

import React from 'react';
import { AlertTriangle, Ban, Clock, Lock, ShieldAlert, Wallet } from 'lucide-react';
import type { SpaceStanding } from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import { dateTime, relativeTime } from './manageUi';

type Tone = 'grave' | 'caution';

const TONE_CLASS: Record<Tone, string> = {
  grave: 'border-rose-500/30 bg-rose-500/10',
  caution: 'border-amber-500/30 bg-amber-500/10',
};

const ICON_CLASS: Record<Tone, string> = {
  grave: 'text-rose-600 dark:text-rose-400',
  caution: 'text-amber-600 dark:text-amber-400',
};

export default function StandingBanner() {
  const { standing, goto } = useManage();
  if (!standing) return null;

  const notices = buildNotices(standing, () => goto('settings'));
  if (!notices.length) return null;

  return (
    <section className="space-y-3 mb-4" aria-label="Moderation standing">
      {notices}
    </section>
  );
}

function buildNotices(standing: SpaceStanding, editSettings: () => void): React.ReactNode[] {
  const notices: React.ReactNode[] = [];

  /*
   * Removal and suspension are exclusive on purpose. A removed Space is also
   * usually suspended, and stacking both would read as two penalties for one
   * decision — removal is the one that explains why the public address is dead.
   */
  if (standing.removed) {
    notices.push(
      <Notice key="removed" tone="grave" icon={Ban} title="This WevSpace has been removed from Wevsoft" pill="Removed">
        <p>
          It is hidden from search, Explore and its public address. Nothing has been deleted — posts, media,
          followers, messages and your team are all intact, and everything comes back if the decision is
          reversed.
        </p>
        {standing.suspensionReason && <Reason>{standing.suspensionReason}</Reason>}
        <p className="text-[11px]">You can still read everything here and export your data.</p>
      </Notice>,
    );
  } else if (standing.suspended) {
    notices.push(
      <Notice
        key="suspended"
        tone="grave"
        icon={ShieldAlert}
        title={
          standing.permanent
            ? 'This WevSpace is suspended indefinitely'
            : `This WevSpace is suspended until ${dateTime(standing.suspendedUntil)}`
        }
        pill={standing.permanent ? 'No end date' : `Ends ${relativeTime(standing.suspendedUntil)}`}
      >
        <p>
          Publishing, messaging and promotion campaigns are switched off, and some settings are locked.{' '}
          <strong className="font-extrabold text-foreground">Nothing is deleted.</strong> Your posts, media,
          followers, messages and team stay exactly as they are.
        </p>
        {standing.suspensionReason && <Reason>{standing.suspensionReason}</Reason>}
        <p className="text-[11px]">
          {standing.permanent
            ? 'Reading, exporting your data and appealing all stay open.'
            : 'Everything switches back on by itself when the suspension ends — you do not need to do anything. Reading, exporting your data and appealing stay open in the meantime.'}
        </p>
      </Notice>,
    );
  }

  if (standing.reachRestricted) {
    notices.push(
      <Notice key="restricted" tone="caution" icon={AlertTriangle} title="Reach is restricted" pill="Limited">
        <p>
          This WevSpace has been taken out of Explore, recommendations and search suggestions. You can still
          post, and your followers still see everything you publish — but nobody new will be shown it.
        </p>
        {/* Under a suspension the reason is already quoted above; twice is noise. */}
        {!standing.suspended && !standing.removed && standing.suspensionReason && (
          <Reason>{standing.suspensionReason}</Reason>
        )}
      </Notice>,
    );
  }

  if (standing.monetizationFrozen) {
    notices.push(
      <Notice
        key="monetization"
        tone="caution"
        icon={Wallet}
        title="Monetization is frozen"
        pill={standing.monetizationFrozenAt ? `Since ${dateTime(standing.monetizationFrozenAt)}` : 'Frozen'}
      >
        <p>
          Payouts and tier changes are on hold while this is reviewed. Money already earned is not affected and
          nothing has been taken back — it stays in your balance until the freeze lifts.
        </p>
      </Notice>,
    );
  }

  if (standing.handleChangeRequiredAt) {
    notices.push(
      <Notice
        key="handle"
        tone="caution"
        icon={Clock}
        title="You need to choose a new username"
        pill={`Asked ${relativeTime(standing.handleChangeRequiredAt)}`}
      >
        <p>
          The current username cannot stay. Publishing is paused until you pick a new one — everything else,
          including your settings and your inbox, still works.
        </p>
        <p>
          <button
            type="button"
            onClick={editSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-foreground text-background text-[11px] font-extrabold hover:opacity-90 transition-opacity"
          >
            Change the username
          </button>
        </p>
      </Notice>,
    );
  }

  /*
   * Named, not counted. A settings form that silently refuses to save is the worst
   * version of §4's field locks, and the owner should be able to read which group
   * is frozen without going and finding out one field at a time.
   */
  if (standing.lockedSettings.length > 0) {
    notices.push(
      <Notice
        key="locked"
        tone="caution"
        icon={Lock}
        title={
          standing.lockedSettings.length === 1
            ? 'One group of settings is locked'
            : `${standing.lockedSettings.length} groups of settings are locked`
        }
        pill="Locked by staff"
      >
        <p>These will not save until the lock is lifted. Everything else in settings works normally.</p>
        <ul className="space-y-1">
          {standing.lockedSettings.map((setting) => (
            <li key={setting.id} className="text-[11px]">
              <span className="font-extrabold text-foreground">{setting.label}</span>
              {setting.hint ? <span> — {setting.hint}</span> : null}
            </li>
          ))}
        </ul>
      </Notice>,
    );
  }

  /*
   * Warnings stand alone only when nothing stronger is in force. Under a suspension
   * the strike count is noise — the owner already has the thing that matters at the
   * top of the list — and repeating it would read as a second, separate penalty.
   */
  if (!notices.length && standing.warnings > 0) {
    notices.push(
      <Notice
        key="warnings"
        tone="caution"
        icon={AlertTriangle}
        title={
          standing.warnings === 1
            ? 'This WevSpace has one warning on record'
            : `This WevSpace has ${standing.warnings} warnings on record`
        }
        pill={standing.lastWarningAt ? `Latest ${relativeTime(standing.lastWarningAt)}` : 'On record'}
      >
        <p>Nothing is restricted. A warning is a note on the record — it is here so it is not a surprise later.</p>
        {standing.suspensionReason && <Reason>{standing.suspensionReason}</Reason>}
      </Notice>,
    );
  }

  return notices;
}

function Notice({
  tone,
  icon: Icon,
  title,
  pill,
  children,
}: {
  tone: Tone;
  icon: any;
  title: string;
  pill?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border rounded-3xl p-4 sm:p-5 ${TONE_CLASS[tone]}`} role="status">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 ${ICON_CLASS[tone]}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black">{title}</h3>
            {pill && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-background/60 text-[10px] font-black uppercase tracking-wide">
                {pill}
              </span>
            )}
          </div>
          <div className="mt-1.5 space-y-2 text-xs font-semibold text-muted-foreground leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** What staff wrote, quoted rather than paraphrased — it is the part the owner must act on. */
function Reason({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
        What Wevsoft told you
      </p>
      <p className="mt-1 text-xs font-bold text-foreground whitespace-pre-line break-words">{children}</p>
    </div>
  );
}
