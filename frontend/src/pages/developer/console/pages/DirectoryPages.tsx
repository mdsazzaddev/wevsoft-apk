import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Globe,
  Search,
  CheckCircle,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Download,
  Building2,
  Users,
  AlertCircle,
  Boxes,
  Star,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import api from '../../../../lib/api';
import { cx } from '../../devUi';
import { Card, ConsolePage, EmptyState, LoadingRows, Pill, StatTile, btn, fmtDate } from '../ui';
import { APP_CATEGORIES, categoryLabel } from '../../devApi';

export interface DirectoryApp {
  id: string;
  name: string;
  logoUrl: string | null;
  category: string;
  clientId: string;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  approvedScopes: string[];
  installsCount: number;
  isVerified?: boolean;
  trustBadge?: 'verified_app' | 'official_partner' | 'standard';
  rating?: number;
  reviewsCount?: number;
  developer: {
    companyName: string;
    website: string | null;
    description: string | null;
  };
  createdAt: string;
}

export function DirectoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewingApp, setReviewingApp] = useState<DirectoryApp | null>(null);

  const directoryQuery = useQuery<{ data: DirectoryApp[]; pagination: { total: number; page: number; totalPages: number } }>({
    queryKey: ['developerDirectory', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      const res = await api.get(`/api/developer/directory?${params.toString()}`);
      return res.data;
    },
    staleTime: 30_000,
  });

  const apps = directoryQuery.data?.data || [];
  const total = directoryQuery.data?.pagination?.total || 0;

  const categories = useMemo(() => [
    { value: 'all', label: 'All Categories' },
    ...APP_CATEGORIES,
  ], []);

  return (
    <ConsolePage
      group="Applications"
      title="App Directory & Showcase"
      description="Discover verified third-party applications built on the WebSoft Developer Platform."
      requiresAccount={false}
      actions={
        <Link to="/developer/apps/new" className={btn.primary}>
          <Sparkles size={13} /> Publish your app
        </Link>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3 mb-5">
        <StatTile icon={Globe} label="Live Ecosystem Apps" value={total} tone="blue" />
        <StatTile icon={Shield} label="Verified & Secure" value="100%" tone="green" hint="Every live app passes audit" />
        <StatTile icon={Users} label="Total Authorizations" value={apps.reduce((acc, a) => acc + (a.installsCount || 0), 0)} tone="amber" />
      </div>

      <Card className="mb-5" bodyClassName="!p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dc-muted)] w-4 h-4" />
            <input
              type="text"
              placeholder="Search apps by name or developer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)] text-[var(--dc-text)] placeholder-[var(--dc-muted)] focus:outline-none focus:border-[var(--dc-blue)]"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((c) => {
              const active = selectedCategory === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedCategory(c.value)}
                  className={cx(
                    'px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors font-medium',
                    active
                      ? 'bg-[var(--dc-blue)] text-white'
                      : 'border border-[var(--dc-border)] text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {directoryQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : directoryQuery.isError ? (
        <Card>
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-[var(--dc-red)] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--dc-text)]">Could not load app directory</p>
            <p className="text-xs text-[var(--dc-muted)] mt-1">{(directoryQuery.error as Error)?.message || 'An error occurred while fetching apps.'}</p>
            <button onClick={() => directoryQuery.refetch()} className={cx(btn.secondary, btn.sm, 'mt-3')}>
              Retry
            </button>
          </div>
        </Card>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No applications found"
          body={searchQuery || selectedCategory !== 'all' ? 'Try adjusting your search query or category filter.' : 'Be the first developer to publish an app to the WebSoft Ecosystem!'}
          action={
            <Link to="/developer/apps/new" className={btn.primary}>
              Create an App
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.id} bodyClassName="!p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {app.logoUrl ? (
                      <img src={app.logoUrl} alt={app.name} className="w-11 h-11 rounded-xl object-cover border border-[var(--dc-border)] shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/30 border border-blue-500/30 text-[var(--dc-blue)] font-bold text-base grid place-items-center shrink-0">
                        {app.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-sm text-[var(--dc-text)] truncate">{app.name}</h3>
                        {app.trustBadge === 'official_partner' ? (
                          <span title="Official Partner" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-semibold border border-amber-500/30">
                            <Sparkles size={10} className="fill-amber-400 text-amber-500 shrink-0" /> Partner
                          </span>
                        ) : app.isVerified || app.trustBadge === 'verified_app' ? (
                          <span title="Verified Application" className="inline-flex items-center">
                            <CheckCircle size={13} className="text-[var(--dc-blue)] shrink-0" />
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--dc-muted)] flex items-center gap-1 mt-0.5">
                        <Building2 size={11} /> {app.developer.companyName}
                      </p>
                    </div>
                  </div>
                  <Pill tone="blue">{categoryLabel(app.category)}</Pill>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span>{app.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewingApp(app)}
                    className="text-[11px] text-[var(--dc-muted)] hover:text-[var(--dc-blue)] hover:underline flex items-center gap-1"
                  >
                    <MessageSquare size={11} /> {app.reviewsCount || 0} reviews
                  </button>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-[var(--dc-muted)] line-clamp-2">
                    {app.developer.description || 'Integrates with WebSoft accounts to provide enhanced functionality, sharing, and productivity.'}
                  </p>
                </div>

                {app.approvedScopes.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--dc-border)]">
                    <p className="text-[10px] uppercase font-semibold text-[var(--dc-muted)] tracking-wider mb-1.5">Permissions requested</p>
                    <div className="flex flex-wrap gap-1">
                      {app.approvedScopes.map((sc) => (
                        <span key={sc} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--dc-track)] text-[var(--dc-muted)] font-mono">
                          {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--dc-border)] flex items-center justify-between gap-2">
                <div className="text-[11px] text-[var(--dc-muted)] flex items-center gap-1">
                  <Users size={12} /> {app.installsCount} active users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewingApp(app)}
                    className={cx(btn.secondary, btn.sm, '!p-1.5')}
                    title="Reviews & Ratings"
                  >
                    <Star size={12} className="text-amber-400" />
                  </button>
                  {app.developer.website && (
                    <a
                      href={app.developer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cx(btn.secondary, btn.sm, '!p-1.5')}
                      title="Developer Website"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <a
                    href={`/oauth/authorize?client_id=${encodeURIComponent(app.clientId)}&response_type=code&scope=${encodeURIComponent(app.approvedScopes.join(' ') || 'profile')}`}
                    className={cx(btn.primary, btn.sm)}
                  >
                    Authorize App
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {reviewingApp && (
        <AppReviewsModal app={reviewingApp} onClose={() => setReviewingApp(null)} />
      )}
    </ConsolePage>
  );
}

function AppReviewsModal({ app, onClose }: { app: DirectoryApp; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ['developerDirectoryReviews', app.id],
    queryFn: async () => {
      const res = await api.get(`/api/developer/directory/${app.id}/reviews`);
      return res.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/developer/directory/${app.id}/reviews`, { rating, comment });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      setComment('');
      reviewsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Could not submit review. Please log in first.');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const res = await api.post(`/api/developer/apps/${app.id}/reviews/${reviewId}/reply`, { reply });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Reply posted!');
      setReplyingTo(null);
      reviewsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Only app developer can reply to reviews.');
    },
  });

  const data = reviewsQuery.data;
  const reviews = data?.reviews || [];
  const distribution = data?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = data?.totalReviews || 0;
  const avg = data?.averageRating || 5.0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--dc-card)] border border-[var(--dc-border)] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-[var(--dc-border)]">
          <div className="flex items-center gap-3">
            {app.logoUrl ? (
              <img src={app.logoUrl} alt={app.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-[var(--dc-blue)] font-bold text-xs grid place-items-center">
                {app.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-sm text-[var(--dc-text)]">{app.name} Reviews</h3>
              <p className="text-[11px] text-[var(--dc-muted)]">{total} verified ratings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Rating Summary Bar */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-[var(--dc-track)] border border-[var(--dc-border)]">
            <div className="text-center shrink-0">
              <div className="text-3xl font-extrabold text-[var(--dc-text)] flex items-center justify-center gap-1">
                {avg.toFixed(1)} <Star size={20} className="fill-amber-400 text-amber-400" />
              </div>
              <p className="text-[11px] text-[var(--dc-muted)] mt-1">out of 5 stars</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = (distribution as any)[star] || 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-[11px]">
                    <span className="w-3 text-[var(--dc-muted)] font-mono">{star}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--dc-border)] overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-[var(--dc-muted)] font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Review Box */}
          <div className="p-4 rounded-xl border border-[var(--dc-border)] bg-[var(--dc-bg)] space-y-3">
            <h4 className="text-xs font-semibold text-[var(--dc-text)]">Rate this application</h4>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 text-amber-400 transition-transform hover:scale-110"
                >
                  <Star size={20} className={s <= rating ? 'fill-amber-400' : 'text-[var(--dc-muted)]'} />
                </button>
              ))}
              <span className="text-xs font-medium text-[var(--dc-muted)] ml-2">{rating} Star{rating > 1 ? 's' : ''}</span>
            </div>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review or feedback for the developer..."
              className="w-full text-xs p-2.5 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-card)] text-[var(--dc-text)] placeholder-[var(--dc-muted)] focus:outline-none focus:border-[var(--dc-blue)]"
            />
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className={cx(btn.primary, btn.sm, 'w-full justify-center')}
            >
              <Send size={12} /> {submitMutation.isPending ? 'Submitting...' : 'Post Review'}
            </button>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--dc-text)]">Community Feedback ({reviews.length})</h4>
            {reviewsQuery.isLoading ? (
              <LoadingRows rows={3} />
            ) : reviews.length === 0 ? (
              <p className="text-xs text-[var(--dc-muted)] text-center py-4">No reviews posted yet. Be the first!</p>
            ) : (
              reviews.map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl border border-[var(--dc-border)] bg-[var(--dc-card)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-[var(--dc-blue)] font-bold text-[10px] grid place-items-center">
                        {r.user.name.slice(0, 1)}
                      </div>
                      <span className="text-xs font-medium text-[var(--dc-text)]">{r.user.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={11} className="fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-[var(--dc-muted)] leading-relaxed">{r.comment}</p>}
                  {r.developerReply ? (
                    <div className="mt-2 pl-3 border-l-2 border-[var(--dc-blue)] text-xs space-y-1 bg-[var(--dc-track)] p-2 rounded-r-lg">
                      <p className="font-semibold text-[var(--dc-blue)] text-[11px] flex items-center gap-1">
                        Developer response:
                      </p>
                      <p className="text-[var(--dc-muted)] text-[11px]">{r.developerReply.reply}</p>
                    </div>
                  ) : (
                    <div className="pt-1">
                      {replyingTo === r.id ? (
                        <div className="space-y-2 mt-1">
                          <input
                            type="text"
                            placeholder="Type developer reply..."
                            value={replyInputs[r.id] || ''}
                            onChange={(e) => setReplyInputs({ ...replyInputs, [r.id]: e.target.value })}
                            className="w-full text-xs p-1.5 rounded border border-[var(--dc-border)] bg-[var(--dc-bg)] text-[var(--dc-text)]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => replyMutation.mutate({ reviewId: r.id, reply: replyInputs[r.id] || '' })}
                              disabled={replyMutation.isPending || !replyInputs[r.id]?.trim()}
                              className={cx(btn.primary, btn.sm, '!py-1 !text-[11px]')}
                            >
                              Post Reply
                            </button>
                            <button
                              onClick={() => setReplyingTo(null)}
                              className={cx(btn.secondary, btn.sm, '!py-1 !text-[11px]')}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(r.id)}
                          className="text-[10px] text-[var(--dc-blue)] hover:underline"
                        >
                          Reply as developer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
