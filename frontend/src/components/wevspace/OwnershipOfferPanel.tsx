/**
 * The receiving end of MP4 §10's ownership transfer.
 *
 * A transfer is an offer, not a push: the sender's Settings panel makes it, and it
 * only takes effect when the named account agrees here. That asymmetry is the whole
 * point — accepting means inheriting responsibility for everything the Space has
 * published, plus its monetization and payouts, and spending one of your own Space
 * slots. So the consequences are shown in a dialog you have to pass through, from
 * the same shared list the sender was shown, and the accept itself is challenged by
 * the server before it lands.
 *
 * Declining is deliberately cheaper than accepting: one confirm, no credential.
 * Making someone dig out an authenticator app to refuse a Space they never asked
 * for is a reason to leave the offer sitting there instead of saying no.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_OWNERSHIP_TRANSFER_CONSEQUENCES,
  ownershipTransferCountdown,
  spaceDashboardPath,
} from '@wevsoft/shared/wevspace';
import { respondToSpaceTransfer, type SpaceOwnershipTransfer } from '../../lib/wevspaceApi';
import { ConfirmIdentitySheet, isConfirmCancelled, useIdentityConfirmation } from './manage/ConfirmIdentitySheet';
import { ActionButton, Sheet, confirmAction, dateTime } from './manage/manageUi';
import UserAvatar from '../UserAvatar';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

/** Same order as SPACE_OWNERSHIP_TRANSFER_CONSEQUENCES. */
const CONSEQUENCES_BN = [
  'আপনি মালিক হবেন: স্পেস, এর কনটেন্ট, টিম ও সেটিংসের পূর্ণ নিয়ন্ত্রণ আপনার।',
  'স্পেস যা প্রকাশ করেছে সবই প্রকাশিত থাকবে এবং স্পেসের নামেই থাকবে।',
  'এই স্পেস আপনার নিজের স্পেস সীমার মধ্যে গণনা হবে।',
  'স্পেসের যেকোনো মনিটাইজেশন, পেআউট ও বিলিংয়ের দায়িত্ব আপনার হবে।',
  'এই হস্তান্তর স্থায়ী। শুধু নতুন মালিকই এটি আবার ফেরত দিতে পারবেন।',
];

interface Props {
  /** Only open, still-acceptable offers. The server filters; this does not re-check. */
  offers: SpaceOwnershipTransfer[];
  /** Refetch the surrounding list once an offer has been answered. */
  onAnswered: () => void | Promise<void>;
  /**
   * True when the account already owns as many Spaces as it is allowed. The server
   * refuses the acceptance in that case, so the button says why up front rather
   * than collecting a password for a call that cannot succeed.
   */
  atLimit?: boolean;
  /** How many Spaces the account may own, for the message above. */
  limit?: number;
  className?: string;
}

export default function OwnershipOfferPanel({
  offers,
  onAnswered,
  atLimit = false,
  limit,
  className = '',
}: Props) {
  const [reviewing, setReviewing] = useState<SpaceOwnershipTransfer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const confirmation = useIdentityConfirmation();
  const { t, isBn, formatNum } = useMarketplaceLang();
  const lapses = (state: SpaceOwnershipTransfer['state']) => {
    if (!isBn) return `Lapses ${ownershipTransferCountdown(state)}`;
    if (state.daysLeft >= 1) return `${formatNum(state.daysLeft)} দিনের মধ্যে মেয়াদ শেষ`;
    if (state.hoursLeft >= 1) return `${formatNum(state.hoursLeft)} ঘণ্টার মধ্যে মেয়াদ শেষ`;
    return 'এক ঘণ্টার কম সময়ে মেয়াদ শেষ';
  };

  if (offers.length === 0) return null;

  const decline = async (offer: SpaceOwnershipTransfer) => {
    const name = offer.spaceName || t('this WevSpace', 'এই WevSpace');
    if (!confirmAction(t(`Decline ownership of ${name}? The owner keeps it, and would have to send a new offer.`, `${name}-এর মালিকানা প্রত্যাখ্যান করবেন? মালিক এটি রেখে দেবেন, এবং নতুন অফার পাঠাতে হবে।`))) {
      return;
    }
    setBusyId(offer.id);
    try {
      await respondToSpaceTransfer(offer.id, false);
      toast.success(t('Offer declined', 'অফার প্রত্যাখ্যান করা হয়েছে'));
      setReviewing(null);
      await onAnswered();
    } catch (err: any) {
      toast.error(err?.message || t('Could not decline that offer', 'অফারটি প্রত্যাখ্যান করা যায়নি'));
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (offer: SpaceOwnershipTransfer) => {
    setBusyId(offer.id);
    try {
      const result = await confirmation.run((confirm) => respondToSpaceTransfer(offer.id, true, confirm));
      toast.success(t(`You are now the owner of ${offer.spaceName || 'this WevSpace'}`, `আপনি এখন ${offer.spaceName || 'এই WevSpace'}-এর মালিক`));
      setReviewing(null);
      // The live handle from the response, not the snapshot on the offer: the Space
      // may have been renamed during the fourteen days it sat unanswered.
      if (result?.handle) navigate(spaceDashboardPath(result.handle));
      else await onAnswered();
    } catch (err: any) {
      if (!isConfirmCancelled(err)) toast.error(err?.message || t('Could not accept that offer', 'অফারটি গ্রহণ করা যায়নি'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={className}>
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} />

      <h3 className="flex items-center gap-2 font-black text-sm mb-2">
        <Crown size={16} className="text-amber-500" />
        {offers.length === 1 ? t('Ownership offer', 'মালিকানার অফার') : t(`Ownership offers (${offers.length})`, `মালিকানার অফার (${formatNum(offers.length)})`)}
      </h3>

      <div className="space-y-2">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{offer.spaceName || t('A WevSpace', 'একটি WevSpace')}</p>
                {offer.handle && <p className="text-[11px] font-bold text-muted-foreground truncate">@{offer.handle}</p>}
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wide shrink-0">
                <Clock3 size={11} /> {lapses(offer.state)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <UserAvatar user={(offer.from || {}) as any} className="w-9 h-9 text-[11px]" />
              <div className="min-w-0">
                {/* Wraps rather than truncates: at 390px a single line clips this to
                    "…hand this WevSpace to …", which drops the one word that says
                    the offer is addressed to the reader. The line below it is a
                    handle and a date, where truncation loses nothing. */}
                <p className="text-xs font-bold">
                  {t(`${offer.from?.name || 'The current owner'} wants to hand this WevSpace to you`, `${offer.from?.name || 'বর্তমান মালিক'} এই WevSpace আপনাকে দিতে চান`)}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {offer.from?.username ? `@${offer.from.username} · ` : ''}
                  {t('Offered', 'অফার করা হয়েছে')} {dateTime(offer.createdAt)}
                </p>
              </div>
            </div>

            {offer.message && (
              <p className="mt-2.5 text-[11px] italic text-muted-foreground">“{offer.message}”</p>
            )}

            <p className="mt-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {t('Nothing has changed yet. You become the owner only if you accept.', 'এখনও কিছু বদলায়নি। আপনি গ্রহণ করলেই কেবল মালিক হবেন।')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton tone="accent" onClick={() => setReviewing(offer)} disabled={busyId === offer.id}>
                {t('Review offer', 'অফার দেখুন')}
              </ActionButton>
              <ActionButton onClick={() => void decline(offer)} busy={busyId === offer.id}>
                {t('Decline', 'প্রত্যাখ্যান')}
              </ActionButton>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <Sheet
          title={t(`Take ownership of ${reviewing.spaceName || 'this WevSpace'}?`, `${reviewing.spaceName || 'এই WevSpace'}-এর মালিকানা নেবেন?`)}
          onClose={() => setReviewing(null)}
          footer={
            <>
              <ActionButton onClick={() => setReviewing(null)} disabled={busyId === reviewing.id} full>
                {t('Not now', 'এখন না')}
              </ActionButton>
              <ActionButton
                tone="accent"
                onClick={() => void accept(reviewing)}
                busy={busyId === reviewing.id}
                disabled={atLimit}
                full
              >
                {t('Accept ownership', 'মালিকানা গ্রহণ করুন')}
              </ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <UserAvatar user={(reviewing.from || {}) as any} className="w-10 h-10 text-xs" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {t(`Offered by ${reviewing.from?.name || 'the current owner'}`, `অফার করেছেন ${reviewing.from?.name || 'বর্তমান মালিক'}`)}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {reviewing.from?.username ? `@${reviewing.from.username} · ` : ''}
                  {lapses(reviewing.state)}
                </p>
              </div>
            </div>

            {reviewing.message && (
              <p className="p-3 rounded-2xl bg-muted text-[11px] italic text-muted-foreground">
                “{reviewing.message}”
              </p>
            )}

            <div>
              <p className="text-xs font-extrabold mb-1.5">{t('What accepting does', 'গ্রহণ করলে যা হবে')}</p>
              <ul className="space-y-1.5">
                {SPACE_OWNERSHIP_TRANSFER_CONSEQUENCES.map((line, i) => (
                  <li key={line} className="flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                    <span>{isBn ? CONSEQUENCES_BN[i] || line : line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {atLimit ? (
              <p className="p-3 rounded-2xl bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {t(
                  `You already own ${limit} WevSpaces, which is the maximum, so this one cannot be added. Archive one you no longer run, then come back — the offer stays open until it lapses.`,
                  `আপনি ইতিমধ্যে সর্বোচ্চ ${formatNum(limit ?? 0)}টি WevSpace-এর মালিক, তাই এটি যোগ করা যাবে না। যেটি আর চালান না সেটি আর্কাইভ করে আবার আসুন — মেয়াদ শেষ হওয়া পর্যন্ত অফারটি খোলা থাকবে।`,
                )}
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t('You will be asked to confirm it is you before this goes through.', 'এটি সম্পন্ন হওয়ার আগে আপনার পরিচয় নিশ্চিত করতে বলা হবে।')}
              </p>
            )}

            <div>
              <ActionButton tone="danger" onClick={() => void decline(reviewing)} busy={busyId === reviewing.id}>
                {t('Decline this offer', 'এই অফার প্রত্যাখ্যান করুন')}
              </ActionButton>
            </div>
          </div>
        </Sheet>
      )}
    </section>
  );
}
