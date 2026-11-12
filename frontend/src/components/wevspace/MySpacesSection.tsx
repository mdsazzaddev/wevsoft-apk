/**
 * "My Spaces" — the owner's list on their own profile (spec §4), including
 * the privacy control that decides whether other people see this list at all
 * (spec §5), any pending team invitations, and any offer of ownership someone has
 * made to this account (MP4 §10).
 *
 * All of it arrives in the single `/mine` payload. The two things waiting on a
 * decision — an invitation and an ownership offer — both expire, so neither may
 * depend on a screen the recipient has no reason to open.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Layers, Loader2, Plus, RefreshCw } from 'lucide-react';
import { WevSpaceIcon } from './WevSpaceIcon';
import toast from 'react-hot-toast';
import { spaceDashboardPath } from '@wevsoft/shared/wevspace';
import {
  fetchMySpaces,
  respondToInvite,
  type MySpacesResponse,
} from '../../lib/wevspaceApi';
import SpaceCard from './SpaceCard';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';
import OwnershipOfferPanel from './OwnershipOfferPanel';
import { SpaceCardGridSkeleton } from './SpaceSkeletons';

interface Props {
  /** Collapses to a single row of cards for tighter layouts. */
  className?: string;
  /** Narrow column (profile sidebar): single column, smaller cards, tighter spacing. */
  compact?: boolean;
}

/**
 * §1's entry point from the personal profile. The card body already opens the
 * public Space, so this is the one place that says "and here is the back of it".
 */
function DashboardLink({ handle }: { handle: string }) {
  const { t } = useMarketplaceLang();
  return (
    <Link
      to={spaceDashboardPath(handle)}
      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    >
      <LayoutDashboard size={13} /> {t('Open dashboard', 'ড্যাশবোর্ড খুলুন')}
    </Link>
  );
}

export default function MySpacesSection({ className = '', compact = false }: Props) {
  const gridCls = compact ? 'grid gap-2 grid-cols-1' : 'grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]';
  const cardVariant = compact ? 'dense' : 'compact';
  const { t } = useMarketplaceLang();
  const [data, setData] = useState<MySpacesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMySpaces());
    } catch (err: any) {
      setError(err?.message || t('Could not load your Space', 'আপনার স্পেস লোড করা যায়নি'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, []);

  const respond = async (spaceId: string, accept: boolean) => {
    setRespondingTo(spaceId);
    try {
      await respondToInvite(spaceId, accept);
      toast.success(accept ? t('Invitation accepted', 'আমন্ত্রণ গ্রহণ করা হয়েছে') : t('Invitation declined', 'আমন্ত্রণ প্রত্যাখ্যান করা হয়েছে'));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t('Could not respond to that invitation', 'আমন্ত্রণের উত্তর দেওয়া যায়নি'));
    } finally {
      setRespondingTo(null);
    }
  };

  const owned = data?.owned || [];
  const managed = data?.managed || [];
  const pending = managed.filter((m) => m.membershipStatus === 'PENDING');
  const active = managed.filter((m) => m.membershipStatus !== 'PENDING');
  const atLimit = !!data && owned.length >= data.limit;

  return (
    <section className={className}>
      <div className={`flex items-center justify-between gap-3 ${compact ? 'mb-2' : 'mb-3'}`}>
        <h2 className={`flex items-center gap-2 font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
          <WevSpaceIcon size={17} className="text-muted-foreground" />
          {t('My Spaces', 'আমার স্পেস')}
          {owned.length > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
              {owned.length}
            </span>
          )}
        </h2>

        {!atLimit && (
          <Link
            to="/spaces/create"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> {t('Create Space', 'স্পেস তৈরি করুন')}
          </Link>
        )}
      </div>

      {loading && <SpaceCardGridSkeleton count={3} />}

      {!loading && error && (
        <div className="bg-card border border-border rounded-3xl p-5 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={13} /> {t('Try again', 'আবার চেষ্টা করুন')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* MP4 §10 — offers of ownership made to this account, above the lists
              because an offer lapses and a Space does not. */}
          <OwnershipOfferPanel
            className="mb-4"
            offers={data?.ownershipOffers || []}
            onAnswered={load}
            atLimit={atLimit}
            limit={data?.limit}
          />

          {owned.length === 0 && managed.length === 0 ? (
            <Link
              to="/spaces/create"
              className="block border-2 border-dashed border-border rounded-3xl p-8 text-center hover:border-primary/60 transition-colors"
            >
              <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
                <Plus size={20} />
              </span>
              <span className="block mt-3 font-semibold text-sm">{t('Create your first Space', 'আপনার প্রথম স্পেস তৈরি করুন')}</span>
              <span className="block mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                {t('A public presence for your work, business, brand or community — separate from your personal profile, but run from this account.', 'আপনার কাজ, বিজনেস, ব্র্যান্ড বা কমিউনিটির পাবলিক উপস্থিতি — ব্যক্তিগত প্রোফাইল থেকে আলাদা, কিন্তু এই অ্যাকাউন্ট থেকেই চালানো হয়।')}
              </span>
            </Link>
          ) : (
            <div className={gridCls}>
              {owned.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  showOwnerMeta
                  variant={cardVariant}
                  footer={<DashboardLink handle={space.handle} />}
                />
              ))}
              {atLimit && (
                <div className="grid place-items-center border-2 border-dashed border-border rounded-3xl p-5 text-center">
                  <p className="text-xs text-muted-foreground font-semibold">
                    You have reached the limit of {data?.limit} Space.
                  </p>
                </div>
              )}
            </div>
          )}

          {pending.length > 0 && (
            <div className={compact ? 'mt-3' : 'mt-5'}>
              <h3 className="font-semibold text-sm mb-2">{t('Invitations', 'আমন্ত্রণ')}</h3>
              <div className={gridCls}>
                {pending.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    showOwnerMeta
                    variant={cardVariant}
                    footer={
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={respondingTo === space.id}
                          onClick={() => void respond(space.id, true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {respondingTo === space.id && <Loader2 size={13} className="animate-spin" />}
                          {t('Accept', 'গ্রহণ করুন')}
                        </button>
                        <button
                          type="button"
                          disabled={respondingTo === space.id}
                          onClick={() => void respond(space.id, false)}
                          className="px-3 py-2 rounded-xl bg-muted text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                        >
                          {t('Decline', 'প্রত্যাখ্যান')}
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div className={compact ? 'mt-3' : 'mt-5'}>
              <h3 className="font-semibold text-sm mb-2">{t('Space you help manage', 'যে স্পেস আপনি পরিচালনায় সাহায্য করেন')}</h3>
              <div className={gridCls}>
                {active.map((space) => (
                  // Every assignable role carries permissions, so an accepted
                  // teammate always has something to open.
                  <SpaceCard
                    key={space.id}
                    space={space}
                    showOwnerMeta
                    variant={cardVariant}
                    footer={<DashboardLink handle={space.handle} />}
                  />
                ))}
              </div>
            </div>
          )}

          {owned.length > 0 && (
            // The visibility control itself lives in Settings > Privacy; the profile only shows a pointer to it.
            <p className={(compact ? 'mt-2' : 'mt-4') + ' text-xs text-muted-foreground'}>
              {t('Visibility', 'Visibility')}: {(() => { const v = String(data?.spacesVisibility || 'everyone'); return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '); })()}
              {' ? '}
              <Link to="/settings?opt=sec_wevspaces_visibility" className="font-medium text-primary hover:underline">
                {t('Change', 'Change')}
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
