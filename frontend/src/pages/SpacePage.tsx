/**
 * /space/@handle — the public WevSpace page (spec §6).
 *
 * The header and tab strip come from <SpaceIdentity>, the same component the
 * wizard preview and the edit drawer render, so what an owner previews is
 * literally what visitors get (spec §8).
 *
 * Three load outcomes are handled distinctly: the Space renders, the Space does
 * not exist (404), or the viewer is not allowed to see it (403). The 403 case
 * still shows the Space card the server attached, because "follow to see this"
 * is only actionable if the visitor can see what they would be following.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock3,
  Compass,
  Copy,
  Eye,
  EyeOff,
  Flag,
  Home,
  Layers,
  Loader2,
  Lock,
  QrCode,
  Search,
  Share2,
  X,
} from 'lucide-react';
import SpaceLangSwitch from '../components/wevspace/SpaceLangSwitch';
import { useMarketplaceLang } from '../components/marketplace/commerce/useMarketplaceLang';
import { WevSpaceIcon } from '../components/wevspace/WevSpaceIcon';
import toast from 'react-hot-toast';
import {
  SPACES_DIRECTORY_PATH,
  SPACE_TAB_LABELS,
  isSpaceTab,
  resolveSpaceAccent,
  spaceAccessMessage,
  spaceBreadcrumbJsonLd,
  spaceCategoryPath,
  spaceCompletion,
  spaceDashboardPath,
  spaceIsIndexable,
  spaceJsonLd,
  spaceOwnerStatusNotice,
  spacePublicPath,
  spaceSeoDescription,
  spaceSeoTitle,
  spaceTypeLabel,
  type SpacePublicPayload,
  type SpaceTab,
} from '@wevsoft/shared/wevspace';
import {
  SpaceApiError,
  fetchSpaceByHandle,
  fetchReviews,
  followSpace,
  trackCtaClick,
  unfollowSpace,
  updateSpace,
  uploadSpaceImage,
  type SpaceCardPayload,
} from '../lib/wevspaceApi';
import ImageEditorModal from '../components/profile/ImageEditorModal';
import { openSpaceConversation } from '../lib/wevspaceManageApi';
import { usePageSeo } from '../lib/pageSeo';
import { goBackOr } from '../lib/appNavigation';
import { useStore } from '../store';
import SpaceProfileHeader from '../components/wevspace/SpaceProfileHeader';
import { SpacesNavButton } from '../components/wevspace/SpacesSidebar';
import { pushRecentSpace } from '../lib/recentSpaces';
import { resolveSpaceAccent as accentOfSpace } from '@wevsoft/shared/wevspace';
import SpaceAboutCard from '../components/wevspace/SpaceAboutCard';
import SpaceLocationsCard from '../components/wevspace/SpaceLocationsCard';
import SpaceMediaGrid from '../components/wevspace/SpaceMediaGrid';
import SpaceOfferingsPanel from '../components/wevspace/SpaceOfferingsPanel';
import SpaceReviewsPanel from '../components/wevspace/SpaceReviewsPanel';
import SpacePostsFeed from '../components/wevspace/SpacePostsFeed';
import SpaceEventsPanel from '../components/wevspace/SpaceEventsPanel';
import SpaceHomeFeed from '../components/wevspace/SpaceHomeFeed';
import SpaceEditDrawer from '../components/wevspace/SpaceEditDrawer';
import SpaceCard from '../components/wevspace/SpaceCard';
import { SpaceHeaderSkeleton } from '../components/wevspace/SpaceSkeletons';
import { copySpaceLink, shareSpace } from '../components/wevspace/shareSpace';
import SpaceShareSheet from '../components/wevspace/SpaceShareSheet';
import ReportModal from '../components/ReportModal';

interface LoadFailure {
  status: number;
  message: string;
  /** Present on a 403: why, plus the card the server allowed us to show. */
  reason?: string;
  card?: SpaceCardPayload | null;
}

export default function SpacePage() {
  const params = useParams();
  const handleParam = params.handle || '';
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const { t } = useMarketplaceLang();

  const [space, setSpace] = useState<SpacePublicPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  const [followPending, setFollowPending] = useState(false);
  const [messagePending, setMessagePending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [autoCompose, setAutoCompose] = useState(false);
  // Owner "click the avatar / cover" flow: file picker -> crop editor -> upload -> PATCH.
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [photoEdit, setPhotoEdit] = useState<{ file: File; kind: 'avatar' | 'cover' } | null>(null);
  const [photoBusy, setPhotoBusy] = useState<'avatar' | 'cover' | null>(null);

  /** The `?src=` referrer is read once, at load, for the server's view stats. */
  const source = search.get('src') || undefined;
  /** Discards a response for a handle the user has already navigated away from. */
  const requestId = useRef(0);
  /** The wizard hand-off params are consumed once, not on every render. */
  const handoffDone = useRef(false);

  const load = useCallback(async () => {
    if (!handleParam) return;
    const id = ++requestId.current;
    setLoading(true);
    setFailure(null);
    try {
      const result = await fetchSpaceByHandle(handleParam, source);
      if (id !== requestId.current) return;
      setSpace(result);
    } catch (err: any) {
      if (id !== requestId.current) return;
      const status = err instanceof SpaceApiError ? err.status : 0;
      const data = err instanceof SpaceApiError ? err.data : null;
      setSpace(null);
      setFailure({
        status,
        message: data?.restricted
          ? spaceAccessMessage(data.reason)
          : err?.message || 'Could not load this WevSpace',
        reason: data?.reason,
        card: data?.space || null,
      });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // `source` is intentionally not a dependency: it is a one-time referrer, and
    // re-reading it would refetch the page every time the query string changes.
  }, [handleParam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets loading state while fetching
    void load();
  }, [load]);

  // Reset per-Space UI when navigating between Spaces without unmounting.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional per-Space reset
    setEditing(false);
    setMoreOpen(false);
    setSharingCard(false);
    setReporting(false);
    // setAutoInvite(false);
    handoffDone.current = false;
  }, [handleParam]);

  /**
   * §12. The server already serves crawlers a rewritten head, but Googlebot runs
   * JavaScript and a visitor who navigates in-app then copies the address bar
   * needs the same tags. `spaceIsIndexable` is the shared gate, so a Space that
   * is private, unpublished or opted out of discovery asks to be left out of the
   * index here for exactly the reasons the server would.
   */
  const seo = useMemo(() => {
    if (!space) return null;
    const path = spacePublicPath(space.handle);
    const url = typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
    const image = space.cover || space.avatar || null;
    if (!spaceIsIndexable(space)) {
      return {
        title: spaceSeoTitle(space),
        description: spaceSeoDescription(space),
        canonical: path,
        image,
        type: 'profile',
        robots: 'noindex, nofollow',
      };
    }
    return {
      title: spaceSeoTitle(space),
      description: spaceSeoDescription(space),
      canonical: path,
      image,
      type: 'profile',
      jsonLd: [
        spaceJsonLd(space, { url, image }),
        spaceBreadcrumbJsonLd(typeof window === 'undefined' ? '' : window.location.origin, [
          { name: 'WevSpaces', path: SPACES_DIRECTORY_PATH },
          ...(space.category
            ? [{ name: space.category, path: spaceCategoryPath(space.category) }]
            : []),
          { name: space.name, path },
        ]),
      ],
    };
  }, [space]);

  usePageSeo(seo);

  const accent = useMemo(() => (space ? resolveSpaceAccent(space) : '#2563eb'), [space?.themePreset, space?.accentColor]);
  const tabs = space?.tabs || [];
  const viewer = space?.viewer || null;
  const isOwner = !!viewer?.isOwner;
  const canEdit = !!viewer?.canEdit;
  const permissions = viewer?.permissions || [];
  const statusNotice = spaceOwnerStatusNotice(space);

  /**
   * The URL owns the tab so a tab is shareable and survives back-navigation.
   * An owner may deep-link to a tab they have hidden from visitors (that is how
   * `?invite=1` still works with the Community tab switched off) — the notice
   * below the header explains that state instead of silently redirecting.
   */
  const tabsKey = tabs.join(',');
  const requestedTab = search.get('tab');
  const activeTab: SpaceTab = useMemo(() => {
    if (isSpaceTab(requestedTab) && requestedTab !== 'community') {
      if (tabs.includes(requestedTab)) return requestedTab;
      if (canEdit) return requestedTab;
    }
    return (tabs[0] as SpaceTab) || 'home';
  }, [requestedTab, tabsKey, canEdit]);

  const tabHidden = isSpaceTab(activeTab) && tabs.length > 0 && !tabs.includes(activeTab);

  const setTab = useCallback(
    (tab: SpaceTab) => {
      const next = new URLSearchParams(search);
      if (tab === (tabs[0] || 'home')) next.delete('tab');
      else next.set('tab', tab);
      next.delete('src');
      setSearch(next, { replace: false });
    },
    [search, tabsKey],
  );

  // Wizard hand-offs (`?edit=1`, `?compose=1`, `?invite=1`) — applied once the
  // Space is loaded, then stripped so a refresh does not reopen them.
  useEffect(() => {
    if (!space || handoffDone.current) return;
    handoffDone.current = true;
    const next = new URLSearchParams(search);
    let changed = false;
    if (next.get('edit') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time URL hand-off
      if (canEdit) setEditing(true);
      next.delete('edit');
      changed = true;
    }
    if (next.get('compose') === '1') {
      // Stay on Home and open the Space composer (personal-home parity).
      next.delete('tab');
      next.delete('compose');
      setAutoCompose(true);
      changed = true;
    }
    if (next.get('invite') === '1') {
      // Team invites belong in Manage → Team (Space profile has no Friends/Community tab).
      next.delete('invite');
      changed = true;
      if (canEdit && space.handle) {
        navigate(spaceDashboardPath(space.handle, 'team'), { replace: true });
        return;
      }
    }
    if (next.has('src')) {
      next.delete('src');
      changed = true;
    }
    if (changed) setSearch(next, { replace: true });
  }, [space, canEdit]);

  const requireAuth = useCallback(() => {
    if (token) return true;
    navigate(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
    return false;
  }, [token, navigate]);

  const toggleFollow = useCallback(
    async (target?: SpacePublicPayload | null) => {
      const subject = target || space;
      if (!subject || !requireAuth()) return;
      const following = !!subject.viewer?.isFollowing;
      const before = { followersCount: subject.followersCount, viewer: subject.viewer };
      setFollowPending(true);
      // Optimistic: flip now, reconcile with the server answer, roll back on failure.
      setSpace((current) =>
        current && current.id === subject.id
          ? {
              ...current,
              followersCount:
                typeof current.followersCount === 'number' ? Math.max(0, current.followersCount + (following ? -1 : 1)) : current.followersCount,
              viewer: { ...(current.viewer || {}), isFollowing: !following } as SpacePublicPayload['viewer'],
            }
          : current,
      );
      try {
        const res = following ? await unfollowSpace(subject.id) : await followSpace(subject.id);
        setSpace((current) =>
          current && current.id === subject.id
            ? {
                ...current,
                followersCount: res.followersCount,
                viewer: { ...(current.viewer || {}), isFollowing: res.following } as SpacePublicPayload['viewer'],
              }
            : current,
        );
        if (!following) toast.success(`Following ${subject.name}`);
      } catch (err: any) {
        setSpace((current) => (current && current.id === subject.id ? { ...current, ...before } : current));
        toast.error(err?.message || t('Could not update that follow', 'ফলো আপডেট করা যায়নি'));
      } finally {
        setFollowPending(false);
      }
    },
    [space, requireAuth],
  );

  // Real rating for the header (only when the Space shows reviews and has some).
  const [rating, setRating] = useState<{ id: string; average: number; total: number } | null>(null);
  const ratingSpaceId = space?.id;
  const reviewsOn = !!space?.tabs?.includes('reviews');
  useEffect(() => {
    if (!ratingSpaceId || !reviewsOn) return;
    let live = true;
    fetchReviews(ratingSpaceId, 1, 0)
      .then((r) => {
        if (live && r.total > 0) setRating({ id: ratingSpaceId, average: Number(r.average) || 0, total: r.total });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ratingSpaceId, reviewsOn]);

  // Sidebar "Recent Spaces" (this device only).
  useEffect(() => {
    if (!space?.id || !space.handle) return;
    pushRecentSpace({ id: space.id, handle: space.handle, name: space.name, avatar: space.avatar, accent: accentOfSpace(space) });
  }, [space?.id]);

  /** Follow from the restricted screen, then retry the load. */
  const followRestricted = useCallback(async () => {
    const card = failure?.card;
    if (!card || !requireAuth()) return;
    setFollowPending(true);
    try {
      await followSpace(card.id);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not follow this WevSpace');
    } finally {
      setFollowPending(false);
    }
  }, [failure?.card, requireAuth, load]);

  /**
   * §9: the visitor's counterparty is the WevSpace, never the human who owns it.
   * The old direct-message shortcut is gone on purpose — it opened a thread with
   * the owner's personal account, which is exactly the identity mix-up the spec
   * forbids. Owners are sent to the Space inbox instead of messaging themselves.
   */
  const msgSpaceId = space?.id;
  const msgSpaceHandle = space?.handle;
  const openMessages = useCallback(async () => {
    if (!msgSpaceId || !requireAuth()) return;
    if (isOwner || viewer?.role) {
      navigate(spaceDashboardPath(msgSpaceHandle as string, 'messages'));
      return;
    }
    setMessagePending(true);
    try {
      const thread = await openSpaceConversation(msgSpaceId);
      navigate(thread?.conversationId ? `/messages/${thread.conversationId}` : '/messages');
    } catch (err: any) {
      toast.error(err?.message || 'Could not open that conversation');
    } finally {
      setMessagePending(false);
    }
  }, [msgSpaceId, msgSpaceHandle, isOwner, viewer?.role, requireAuth, navigate]);

  /**
   * Every CTA type resolves to a real action. The click is recorded first (and
   * failures there are ignored — analytics must never block the visitor).
   */
  const runCta = useCallback(() => {
    if (!space) return;
    void trackCtaClick(space.id).catch(() => {});
    switch (space.ctaType) {
      case 'WEBSITE':
      case 'BOOK':
      case 'DONATE':
      case 'LEARN_MORE':
        if (space.ctaUrl) window.open(space.ctaUrl, '_blank', 'noopener,noreferrer');
        else toast.error(t('No link has been set for this button yet', 'এই বাটনে এখনো কোনো লিংক দেওয়া হয়নি'));
        return;
      case 'EMAIL':
        if (space.contactEmail) window.location.href = `mailto:${space.contactEmail}`;
        else toast.error(t('This WevSpace has not published an email address', 'এই WevSpace কোনো ইমেইল ঠিকানা প্রকাশ করেনি'));
        return;
      case 'CALL':
        if (space.contactPhone) window.location.href = `tel:${space.contactPhone}`;
        else toast.error(t('This WevSpace has not published a phone number', 'এই WevSpace কোনো ফোন নম্বর প্রকাশ করেনি'));
        return;
      case 'SHOP':
        setTab('offerings');
        return;
      case 'JOIN':
      case 'FOLLOW':
        void toggleFollow();
        return;
      case 'MESSAGE':
      case 'CONTACT':
        void openMessages();
        return;
      default:
        return;
    }
  }, [space, setTab, toggleFollow, openMessages]);

  // ── Load states ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-3 pt-3 pb-16 sm:px-6 sm:pt-4 lg:px-8">
        <SpaceHeaderSkeleton />
        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="h-56 rounded-3xl bg-muted animate-pulse" />
          <div className="h-56 rounded-3xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (failure) {
    const restricted = failure.status === 403 && !!failure.card;
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-muted text-muted-foreground">
          {restricted ? <Lock size={24} /> : <Search size={24} />}
        </span>
        <h1 className="mt-4 text-xl font-black">
          {restricted ? failure.card?.name || t('Restricted WevSpace', 'সীমিত WevSpace') : t('WevSpace not found', 'WevSpace পাওয়া যায়নি')}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {restricted
            ? failure.message
            : t(`Nothing lives at @${handleParam.replace(/^@/, '')}. The handle may have changed, or the WevSpace may have been removed.`, `@${handleParam.replace(/^@/, '')} ঠিকানায় কিছু নেই। হ্যান্ডেল বদলে থাকতে পারে, অথবা WevSpace-টি সরিয়ে ফেলা হয়েছে।`)}
        </p>

        {restricted && failure.card && (
          <div className="mt-5 text-left">
            <SpaceCard space={failure.card} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {restricted && failure.reason === 'followers_only' && (
            <button
              type="button"
              disabled={followPending}
              onClick={() => void followRestricted()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {followPending && <Loader2 size={15} className="animate-spin" />} {t('Follow to view', 'দেখতে ফলো করুন')}
            </button>
          )}
          {!restricted && failure.status !== 404 && (
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity"
            >
              {t('Try again', 'আবার চেষ্টা করুন')}
            </button>
          )}
          <Link
            to="/spaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Compass size={15} /> {t('Explore WevSpaces', 'WevSpaces ঘুরে দেখুন')}
          </Link>
        </div>
      </div>
    );
  }

  if (!space) return null;

  // ── Permissions ──────────────────────────────────────────

  const pickSpacePhoto = (kind: 'avatar' | 'cover', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('Please choose an image file', 'একটি ছবি ফাইল বেছে নিন'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error(t('Images must be 12MB or smaller', 'ছবি ১২MB বা তার কম হতে হবে'));
      return;
    }
    setPhotoEdit({ file, kind });
  };

  const saveSpacePhoto = async (kind: 'avatar' | 'cover', file: File | null) => {
    const current = space;
    setPhotoEdit(null);
    setPhotoBusy(kind);
    try {
      const url = file ? await uploadSpaceImage(current.id, file) : null;
      const updated = await updateSpace(current.id, { [kind]: url });
      setSpace(updated);
      toast.success(
        file ? (kind === 'cover' ? 'Cover photo updated' : 'Profile photo updated') : kind === 'cover' ? 'Cover photo removed' : 'Profile photo removed',
      );
    } catch (err: any) {
      toast.error(err?.message || 'Could not update the photo');
    } finally {
      setPhotoBusy(null);
    }
  };

  const removeSpacePhoto = (kind: 'avatar' | 'cover') => {
    if (!window.confirm(kind === 'cover' ? 'Remove the cover photo?' : 'Remove the profile photo?')) return;
    void saveSpacePhoto(kind, null);
  };

  const canUpload = isOwner || permissions.includes('content.create');
  const canManageOfferings = isOwner || permissions.includes('offerings.manage');
  // The owner and the team cannot review their own Space; anonymous cannot either.
  const canReview = !!token && !isOwner && !viewer?.role;
  const completion = isOwner ? spaceCompletion(space) : null;

  const panel = () => {
    switch (activeTab) {
      case 'posts':
        return <SpacePostsFeed space={space} kind="post" accent={accent} canPost={canUpload} />;
      case 'reels':
        return <SpacePostsFeed space={space} kind="reel" accent={accent} canPost={canUpload} />;
      case 'events':
        return (
          <SpaceEventsPanel
            spaceId={space.id}
            spaceName={space.name}
            spaceHandle={space.handle}
            accent={accent}
            canManage={canEdit}
          />
        );
      case 'videos':
        return <SpaceMediaGrid spaceId={space.id} mediaType="video" canUpload={canUpload} />;
      case 'photos':
        return <SpaceMediaGrid spaceId={space.id} mediaType="image" canUpload={canUpload} />;
      case 'about':
        return <div><SpaceAboutCard space={space} /><SpaceLocationsCard spaceId={space.id} /></div>;
      case 'offerings':
        return <SpaceOfferingsPanel spaceId={space.id} canManage={canManageOfferings} accent={accent} />;
      case 'reviews':
        return (
          <SpaceReviewsPanel
            spaceId={space.id}
            spaceName={space.name}
            canReview={canReview}
            isOwner={isOwner}
            accent={accent}
          />
        );
      case 'home':
      default:
        return (
          <SpaceHomeFeed
            space={space}
            accent={accent}
            canPost={canUpload}
            tabs={tabs}
            completion={completion}
            onCustomize={() => setEditing(true)}
            onOpenTab={setTab}
            autoCompose={autoCompose}
          />
        );
    }
  };

  return (
    // Full page: the header runs edge to edge (no app sidebar on this route, see
    // DashboardLayout) and everything below sits in one centred wide container.
    <div className="min-h-full pb-24 md:pb-16">
      {/* Floating top bar over the cover (same pattern as the profile page): the
          route has no app chrome on desktop, so Back / Home live here. */}
      <div className="sticky top-0 z-40 -mb-14 flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-6 pointer-events-none">
        <button
          type="button"
          onClick={() => goBackOr(navigate, '/home')}
          aria-label={t('Back', 'ফিরে যান')}
          className="pointer-events-auto p-2 rounded-full bg-black/30 text-white shadow-sm backdrop-blur-sm hover:bg-black/45 transition-colors touch-manipulation"
        >
          <ArrowLeft size={20} />
        </button>
        <SpacesNavButton className="pointer-events-auto !rounded-full !bg-black/30 !border-transparent !text-white backdrop-blur-sm" />
        <Link
          to="/home"
          aria-label={t('Home', 'হোম')}
          className="pointer-events-auto hidden md:inline-flex p-2 rounded-full bg-black/30 text-white shadow-sm backdrop-blur-sm hover:bg-black/45 transition-colors"
        >
          <Home size={20} />
        </Link>
        <SpaceLangSwitch variant="overlay" className="pointer-events-auto ml-auto" />
      </div>
      <SpaceProfileHeader
        space={space}
        rating={rating && rating.id === space.id ? rating : null}
        activeTab={activeTab}
        onTabChange={setTab}
        viewMode={canEdit ? 'owner' : 'public'}
        followPending={followPending || messagePending}
        onFollow={() => void toggleFollow()}
        onMessage={() => void openMessages()}
        onCta={runCta}
        onShare={() => void shareSpace(space)}
        onEdit={() => setEditing(true)}
        onMore={() => setMoreOpen(true)}
        onPickAvatar={canEdit ? () => avatarFileRef.current?.click() : undefined}
        onPickCover={canEdit ? () => coverFileRef.current?.click() : undefined}
        onRemoveAvatar={canEdit ? () => removeSpacePhoto('avatar') : undefined}
        onRemoveCover={canEdit ? () => removeSpacePhoto('cover') : undefined}
        photoBusy={photoBusy}
      />
      {canEdit && (
        <>
          <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickSpacePhoto('avatar', e)} />
          <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickSpacePhoto('cover', e)} />
        </>
      )}
      {photoEdit && (
        <ImageEditorModal
          file={photoEdit.file}
          type={photoEdit.kind}
          onClose={() => setPhotoEdit(null)}
          onSave={(edited) => void saveSpacePhoto(photoEdit.kind, edited)}
        />
      )}

      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 min-w-0">
      {statusNotice && canEdit && (
        <div
          className={`mt-4 flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl border ${
            statusNotice.tone === 'danger'
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <EyeOff
            size={15}
            className={`shrink-0 ${
              statusNotice.tone === 'danger'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          />
          <p
            className={`text-xs font-bold ${
              statusNotice.tone === 'danger'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {statusNotice.text}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto px-3 py-1.5 rounded-xl bg-card border border-border text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Manage
          </button>
        </div>
      )}

      {tabHidden && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl bg-muted border border-border">
          <Eye size={15} className="text-muted-foreground shrink-0" />
          <p className="text-xs font-bold text-muted-foreground">
            {SPACE_TAB_LABELS[activeTab]} is hidden from visitors — only you and your team can open it.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto px-3 py-1.5 rounded-xl bg-card border border-border text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Enable it
          </button>
        </div>
      )}

      <div className="mt-4 lg:mt-6">{panel()}</div>
      </div>

      {/* More menu — bottom sheet on mobile, small dialog from sm: up. */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-label={`More options for ${space.name}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xs bg-card border border-border rounded-t-3xl sm:rounded-3xl p-2 pb-4 sm:pb-2"
          >
            <div className="flex items-center justify-between px-3 py-2 sm:hidden">
              <span className="text-sm font-black truncate">{space.name}</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label={t('Close', 'বন্ধ করুন')}
                className="p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void copySpaceLink(space.handle);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold hover:bg-muted transition-colors"
            >
              <Copy size={16} className="text-muted-foreground" /> Copy link
            </button>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void shareSpace(space);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold hover:bg-muted transition-colors"
            >
              <Share2 size={16} className="text-muted-foreground" /> Share
            </button>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setSharingCard(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold hover:bg-muted transition-colors"
            >
              <QrCode size={16} className="text-muted-foreground" /> QR code &amp; share card
            </button>
            <Link
              to={space.owner?.username ? `/@${space.owner.username}` : '/spaces'}
              onClick={() => setMoreOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold hover:bg-muted transition-colors"
            >
              <WevSpaceIcon size={16} className="text-muted-foreground" />
              {space.owner?.username ? `${t('Owner', 'মালিক')}: @${space.owner.username}` : t('Explore WevSpaces', 'WevSpaces ঘুরে দেখুন')}
            </Link>
            {!isOwner && (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  if (requireAuth()) setReporting(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Flag size={16} /> Report this WevSpace
              </button>
            )}
            {space.publishedAt && (
              <p className="flex items-center gap-2 px-3 pt-2 text-[11px] text-muted-foreground">
                <Clock3 size={12} /> {spaceTypeLabel(space.spaceType)} · public since{' '}
                {new Date(space.publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {reporting && <ReportModal targetId={space.id} targetType="space" onClose={() => setReporting(false)} />}

      {sharingCard && <SpaceShareSheet space={space} onClose={() => setSharingCard(false)} />}

      {editing && canEdit && (
        <SpaceEditDrawer
          space={space}
          onSaved={(updated) => {
            setSpace(updated);
            // The handle is editable, so the URL can go stale after a save.
            if (updated.handle && updated.handle !== space.handle) {
              navigate(`${spacePublicPath(updated.handle)}${search.toString() ? `?${search}` : ''}`, { replace: true });
            }
          }}
          onClose={() => setEditing(false)}
          onDeleted={() => navigate('/spaces?view=mine', { replace: true })}
        />
      )}
    </div>
  );
}
