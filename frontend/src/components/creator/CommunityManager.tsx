import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, MessageCircle, Loader2, ShieldCheck, ShieldAlert, Link as LinkIcon, UserX,
  Clock, Hash, Phone, AlertTriangle, Eye, Trash2, Plus, X, Sparkles, CheckCircle2,
  Award, Zap, Star, Search, Sliders, Check, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';

type CommunityUser = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  username?: string | null;
};

type FanBadge = {
  type: 'top_fan' | 'rising_fan' | 'milestone';
  label: string;
};

type CommunityComment = {
  id: string;
  text?: string;
  content?: string;
  createdAt: string;
  user: CommunityUser;
  post?: { id: string; content?: string | null };
  fanBadge?: FanBadge | null;
};

export interface TopFanItem {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  badgeType: 'top_fan' | 'rising_fan' | 'milestone';
  badgeLabel: string;
  score: number;
  tenureMonths: number;
  isManuallyAwarded: boolean;
  isRevoked: boolean;
  rank: number;
}

export interface CreatorFanBadgesConfig {
  enabled: boolean;
  showBadgesOnComments: boolean;
  excludedUserIds: string[];
  manualTopFanUserIds: string[];
}

export interface TopFansStats {
  totalTopFans: number;
  risingCount: number;
  milestoneCount: number;
  fanBadgesEnabled: boolean;
}

interface ModerationAssistSettings {
  enabled: boolean;
  hideLinks: boolean;
  hideNoAvatar: boolean;
  hideNewAccounts: boolean;
  hideKeywords: boolean;
  bannedKeywords: string[];
  hideRepeatSpam: boolean;
  hidePhoneNumbers: boolean;
}

interface ModerationLogItem {
  id: string;
  text: string;
  status: string;
  moderatedBy: string | null;
  ruleLabel: string;
  moderatedAt: string;
  createdAt: string;
  author: CommunityUser;
  post: {
    id?: string;
    preview?: string;
  };
}

const DEFAULT_SETTINGS: ModerationAssistSettings = {
  enabled: true,
  hideLinks: true,
  hideNoAvatar: false,
  hideNewAccounts: true,
  hideKeywords: true,
  bannedKeywords: ['free gift', 'crypto', 'whatsapp me', 'telegram', 'inbox me for details'],
  hideRepeatSpam: true,
  hidePhoneNumbers: false,
};

export const CommunityManager = () => {
  const token = useStore((s) => s.token);
  // Space hub: comments/followers/Moderation Assist logs are scoped to the Space
  // (?spaceId=). Top Fans and the Moderation Assist rules are personal-account
  // settings (stored per user), so they are hidden here.
  const { spaceId } = useCreatorSpace();
  const inSpace = !!spaceId;
  const scoped = (path: string) => withCreatorSpaceQuery(path, spaceId);
  const [params, setParams] = useSearchParams();
  const subParam = params.get('sub');

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'comments' | 'followers' | 'moderation_assist' | 'top_fans'>(
    subParam === 'moderation_assist'
      ? 'moderation_assist'
      : subParam === 'top_fans' && !inSpace
      ? 'top_fans'
      : 'comments'
  );

  useEffect(() => {
    if (subParam === 'moderation_assist') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setTab('moderation_assist');
    } else if (subParam === 'top_fans' && !inSpace) {
      setTab('top_fans');
    } else if (!subParam || subParam === 'community' || subParam === 'comments') {
      // Sidebar "All Comments" sets sub=community; treat that as the comments inbox.
      setTab('comments');
    }
  }, [subParam, inSpace]);

  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [followers, setFollowers] = useState<CommunityUser[]>([]);
  const [commentFilter, setCommentFilter] = useState<'all' | 'top_fans'>('all');

  // Moderation Assist states
  const [modSettings, setModSettings] = useState<ModerationAssistSettings>(DEFAULT_SETTINGS);
  const [hiddenThisMonth, setHiddenThisMonth] = useState(0);
  const [modLogs, setModLogs] = useState<ModerationLogItem[]>([]);
  const [loadingMod, setLoadingMod] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [modSubTabRaw, setModSubTab] = useState<'rules' | 'logs'>('rules');
  const modSubTab = inSpace ? 'logs' : modSubTabRaw;

  // Top Fans states
  const [topFansList, setTopFansList] = useState<TopFanItem[]>([]);
  const [fanConfig, setFanConfig] = useState<CreatorFanBadgesConfig>({
    enabled: true,
    showBadgesOnComments: true,
    excludedUserIds: [],
    manualTopFanUserIds: [],
  });
  const [fanStats, setFanStats] = useState<TopFansStats>({
    totalTopFans: 0,
    risingCount: 0,
    milestoneCount: 0,
    fanBadgesEnabled: true,
  });
  const [loadingFans, setLoadingFans] = useState(false);
  const [savingFanConfig, setSavingFanConfig] = useState(false);
  const [fanSearch, setFanSearch] = useState('');

  const selectTab = (nextTab: 'comments' | 'followers' | 'moderation_assist' | 'top_fans') => {
    setTab(nextTab);
    const nextParams = new URLSearchParams(params);
    if (nextTab === 'moderation_assist') nextParams.set('sub', 'moderation_assist');
    else if (nextTab === 'top_fans') nextParams.set('sub', 'top_fans');
    else nextParams.delete('sub');
    setParams(nextParams, { replace: true });
  };

  const loadTopFans = async () => {
    if (!token) return;
    setLoadingFans(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/top-fans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTopFansList(data.topFans || []);
        if (data.config) setFanConfig(data.config);
        if (data.stats) setFanStats(data.stats);
      }
    } catch {
      toast.error('Failed to load top fans');
    } finally {
      setLoadingFans(false);
    }
  };

  useEffect(() => {
    if (tab === 'top_fans' && !inSpace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      loadTopFans();
    }
  }, [token, tab, inSpace]);

  const handleToggleFanSettings = async (patch: Partial<CreatorFanBadgesConfig>) => {
    if (!token) return;
    const nextConfig = { ...fanConfig, ...patch };
    setFanConfig(nextConfig);
    setSavingFanConfig(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/top-fans/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextConfig),
      });
      if (res.ok) {
        toast.success('Fan Badges settings saved');
        loadTopFans();
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingFanConfig(false);
    }
  };

  const handleAwardTopFan = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/top-fans/award/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Top Fan badge awarded');
        loadTopFans();
      }
    } catch {
      toast.error('Failed to award badge');
    }
  };

  const handleRevokeTopFan = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/top-fans/revoke/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Top Fan badge revoked');
        loadTopFans();
      }
    } catch {
      toast.error('Failed to revoke badge');
    }
  };

  // Load basic comments & followers
  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(scoped('/api/v1/jobs-creator/creator/community'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setComments(data.comments || []);
            setFollowers(data.followers || []);
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to load community');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, spaceId]);

  // Load Moderation Assist settings & logs when active
  useEffect(() => {
    if (!token || tab !== 'moderation_assist') return;
    let cancelled = false;
    (async () => {
      setLoadingMod(true);
      try {
        const [settingsRes, logsRes] = await Promise.all([
          inSpace
            ? Promise.resolve(null)
            : fetch('/api/v1/jobs-creator/creator/moderation-assist/settings', {
                headers: { Authorization: `Bearer ${token}` },
              }),
          fetch(scoped('/api/v1/jobs-creator/creator/moderation-assist/logs'), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (settingsRes?.ok) {
          const sData = await settingsRes.json();
          if (!cancelled && sData.settings) {
            setModSettings(sData.settings);
            setHiddenThisMonth(sData.hiddenCountThisMonth || 0);
          }
        }

        if (logsRes.ok) {
          const lData = await logsRes.json();
          if (!cancelled && Array.isArray(lData.logs)) {
            setModLogs(lData.logs);
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to load moderation assist data');
      } finally {
        if (!cancelled) setLoadingMod(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tab, spaceId]);

  const saveSettings = async (patch: Partial<ModerationAssistSettings>) => {
    if (!token) return;
    const updated = { ...modSettings, ...patch };
    setModSettings(updated);
    setSavingSettings(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/moderation-assist/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        toast.success('Moderation Assist rules updated');
      } else {
        toast.error('Failed to save rules');
      }
    } catch {
      toast.error('Failed to save rules');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim().toLowerCase();
    if (!clean) return;
    if (modSettings.bannedKeywords.includes(clean)) {
      toast.error('Keyword already exists');
      return;
    }
    const nextList = [...modSettings.bannedKeywords, clean];
    setNewKeyword('');
    saveSettings({ bannedKeywords: nextList });
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const nextList = modSettings.bannedKeywords.filter((k) => k !== keywordToRemove);
    saveSettings({ bannedKeywords: nextList });
  };

  const handleUnhideComment = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(scoped(`/api/v1/jobs-creator/creator/moderation-assist/unhide/${id}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Comment restored to visible');
        setModLogs((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error('Failed to restore comment');
      }
    } catch {
      toast.error('Failed to restore comment');
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(scoped(`/api/v1/jobs-creator/creator/moderation-assist/delete/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Comment permanently deleted');
        setModLogs((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error('Failed to delete comment');
      }
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={28} />
        <span className="text-sm">Loading community...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Community</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comments, followers and moderation in one place.
            </p>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => selectTab('comments')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'comments'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Comments ({comments.length})
            </button>
            <button
              type="button"
              onClick={() => selectTab('followers')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'followers'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              type="button"
              onClick={() => selectTab('moderation_assist')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'moderation_assist'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck size={14} /> Moderation Assist
            </button>
            {!inSpace && <button
              type="button"
              onClick={() => selectTab('top_fans')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'top_fans'
                  ? 'bg-amber-500 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Award size={14} /> Top Fans {fanStats.totalTopFans > 0 ? `(${fanStats.totalTopFans})` : ''}
            </button>}
          </div>
        </div>

        {/* ─── TAB 1: COMMENTS ─── */}
        {tab === 'comments' && (
          <div className="flex-1 bg-card border border-border rounded-2xl p-4 overflow-y-auto flex flex-col">
            {/* Comments filter bar */}
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
              <span className="text-xs text-muted-foreground font-medium">Filter Comments</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-0.5 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setCommentFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    commentFilter === 'all'
                      ? 'bg-white text-slate-900 shadow dark:bg-white/10 dark:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({comments.length})
                </button>
                {!inSpace && <button
                  type="button"
                  onClick={() => setCommentFilter('top_fans')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    commentFilter === 'top_fans'
                      ? 'bg-amber-500 text-white shadow'
                      : 'text-muted-foreground hover:text-amber-400'
                  }`}
                >
                  <Award size={12} /> Top Fans ({comments.filter((c) => Boolean(c.fanBadge)).length})
                </button>}
              </div>
            </div>

            {(() => {
              const displayedComments = commentFilter === 'top_fans' && !inSpace
                ? comments.filter((c) => Boolean(c.fanBadge))
                : comments;

              if (displayedComments.length === 0) {
                return (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-muted-foreground">
                    <MessageCircle size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">
                      {commentFilter === 'top_fans'
                        ? 'No comments from badge holders yet.'
                        : 'No recent comments on your posts.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-border">
                  {displayedComments.map((c) => {
                    const body = c.text || c.content || '';
                    const postSnippet = (c.post?.content || '').trim();
                    return (
                      <div key={c.id} className="flex gap-3 py-3">
                        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {c.user?.avatar ? (
                            <img src={c.user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={14} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {c.user?.name || c.user?.username || 'User'}
                            </span>
                            {c.fanBadge && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.fanBadge.type === 'top_fan'
                                    ? 'bg-primary/10 text-primary border border-border'
                                    : c.fanBadge.type === 'rising_fan'
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-primary/10 text-primary border border-border'
                                }`}
                              >
                                {c.fanBadge.type === 'top_fan' ? (
                                  <Award size={10} />
                                ) : c.fanBadge.type === 'rising_fan' ? (
                                  <Zap size={10} />
                                ) : (
                                  <Star size={10} />
                                )}
                                {c.fanBadge.label}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{body}</p>
                          {postSnippet && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1">
                              on: {postSnippet}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── TAB 2: FOLLOWERS ─── */}
        {tab === 'followers' && (
          <div className="flex-1 bg-card border border-border rounded-2xl p-4 overflow-y-auto">
            {followers.length === 0 ? (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Users size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No recent followers yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {followers.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {f.avatar ? (
                        <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users size={14} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{f.name || f.username || 'User'}</div>
                      {f.username && <div className="text-xs text-muted-foreground">@{f.username}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: MODERATION ASSIST (Facebook Professional Dashboard style) ─── */}
        {tab === 'moderation_assist' && (
          <div className="space-y-6">
            {/* Header Telemetry Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    Moderation Assist Active
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                      Live Protection
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {inSpace
                      ? 'Comments hidden on this Space\'s posts. Restore or delete them here.'
                      : 'Automatically screens incoming comments on your personal creator posts'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!inSpace && <div className="text-right">
                  <div className="text-xs text-muted-foreground">Filtered This Month</div>
                  <div className="text-lg font-semibold text-foreground">{hiddenThisMonth} comments</div>
                </div>}

                <div className="flex rounded-lg bg-slate-100 dark:bg-black/30 p-1 border border-border">
                  {!inSpace && (
                  <button
                    type="button"
                    onClick={() => setModSubTab('rules')}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      modSubTab === 'rules' ? 'bg-muted text-white' : 'text-muted-foreground'
                    }`}
                  >
                    Criteria ({Object.values(modSettings).filter((v) => v === true).length})
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModSubTab('logs')}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      modSubTab === 'logs' ? 'bg-muted text-white' : 'text-muted-foreground'
                    }`}
                  >
                    Activity Log ({modLogs.length})
                  </button>
                </div>
              </div>
            </div>

            {loadingMod ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={24} className="animate-spin text-emerald-400" />
                <span className="text-xs">Loading Moderation Assist...</span>
              </div>
            ) : modSubTab === 'rules' ? (
              /* Rules Configuration */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rule 1: Links */}
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                        <LinkIcon size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">Links in comments</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Auto-hide comments containing web links or URLs to prevent external phishing and spam.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modSettings.hideLinks}
                        onChange={(e) => saveSettings({ hideLinks: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Rule 2: No Avatar */}
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                        <UserX size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">No profile picture</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Auto-hide comments from profiles without an avatar or profile photo.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modSettings.hideNoAvatar}
                        onChange={(e) => saveSettings({ hideNoAvatar: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Rule 3: New Accounts */}
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">New accounts (&lt; 24h old)</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Auto-hide comments from freshly registered accounts to stop automated bot bursts.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modSettings.hideNewAccounts}
                        onChange={(e) => saveSettings({ hideNewAccounts: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Rule 4: Phone Numbers */}
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">Phone & WhatsApp digits</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Auto-hide comments containing direct phone or WhatsApp contact numbers.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modSettings.hidePhoneNumbers}
                        onChange={(e) => saveSettings({ hidePhoneNumbers: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Rule 5: Repeat Spam Flood */}
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 mt-0.5">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">Repeat spam comments</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Auto-hide if the same user posts more than 3 comments on a post in 2 minutes.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modSettings.hideRepeatSpam}
                        onChange={(e) => saveSettings({ hideRepeatSpam: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Rule 6: Keywords Toggle */}
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                        <Hash size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">Restricted keywords</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Auto-hide comments matching your personal list of blocked words and spam terms.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modSettings.hideKeywords}
                        onChange={(e) => saveSettings({ hideKeywords: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {/* Keyword Tag Editor */}
                {modSettings.hideKeywords && (
                  <div className="p-5 bg-card border border-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Hash size={14} className="text-primary" /> Banned Keywords List
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {modSettings.bannedKeywords.length} active keyword filters
                      </span>
                    </div>

                    <form onSubmit={handleAddKeyword} className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add a spam phrase or word (e.g. 'whatsapp me', 'free coins')..."
                        className="flex-1 bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        type="submit"
                        disabled={savingSettings || !newKeyword.trim()}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Add Word
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {modSettings.bannedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 border border-border text-xs text-foreground"
                        >
                          {kw}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-muted-foreground hover:text-rose-400 transition-colors ml-1"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Moderation Assist Activity Log */
              <div className="bg-card border border-border rounded-2xl p-4 min-h-[350px]">
                {modLogs.length === 0 ? (
                  <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <CheckCircle2 size={32} className="text-emerald-400 mb-2 opacity-60" />
                    <p className="text-sm font-semibold text-foreground">Activity Log is clean</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No comments have been auto-hidden recently. When Moderation Assist catches spam, it will show up here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {modLogs.map((log) => (
                      <div
                        key={log.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {log.author?.avatar ? (
                              <img src={log.author.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users size={14} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {log.author?.name || log.author?.username || 'User'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                                <ShieldAlert size={10} /> {log.ruleLabel}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-foreground/90 mt-1 break-words italic">
                              "{log.text}"
                            </p>
                            {log.post?.preview && (
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                                on post: {log.post.preview}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleUnhideComment(log.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-colors"
                          >
                            <Eye size={12} /> Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(log.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: TOP FANS (Facebook Professional Dashboard style) ─── */}
        {tab === 'top_fans' && (
          <div className="space-y-6">
            {/* Top Fans Hero & KPI strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-semibold">Top Fans</span>
                  <Award size={18} />
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-foreground">{fanStats.totalTopFans}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Top-tier frequent engagers</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-semibold">Rising Fans</span>
                  <Zap size={18} />
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-foreground">{fanStats.risingCount}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">High 7-day momentum</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-semibold">Milestone Engagers</span>
                  <Star size={18} />
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-foreground">{fanStats.milestoneCount}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Consistent loyal supporters</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Fan Badges Program</span>
                  <button
                    type="button"
                    disabled={savingFanConfig}
                    onClick={() => handleToggleFanSettings({ enabled: !fanConfig.enabled })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      fanConfig.enabled ? 'bg-primary justify-end' : 'bg-muted justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">Show in Comments</span>
                  <button
                    type="button"
                    disabled={savingFanConfig || !fanConfig.enabled}
                    onClick={() =>
                      handleToggleFanSettings({ showBadgesOnComments: !fanConfig.showBadgesOnComments })
                    }
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      fanConfig.showBadgesOnComments && fanConfig.enabled
                        ? 'bg-emerald-500 justify-end'
                        : 'bg-muted justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={fanSearch}
                  onChange={(e) => setFanSearch(e.target.value)}
                  placeholder="Search top fans..."
                  className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-bold text-foreground">
                  {topFansList.filter((f) =>
                    !fanSearch.trim() ||
                    f.name?.toLowerCase().includes(fanSearch.toLowerCase()) ||
                    f.username?.toLowerCase().includes(fanSearch.toLowerCase())
                  ).length}
                </span>{' '}
                ranked fans
              </div>
            </div>

            {/* Fans List / Table */}
            {loadingFans ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={24} className="animate-spin text-amber-400" />
                <span className="text-xs">Computing fan engagement metrics...</span>
              </div>
            ) : (() => {
              const filteredFans = topFansList.filter(
                (f) =>
                  !fanSearch.trim() ||
                  f.name?.toLowerCase().includes(fanSearch.toLowerCase()) ||
                  f.username?.toLowerCase().includes(fanSearch.toLowerCase())
              );

              if (filteredFans.length === 0) {
                return (
                  <div className="py-16 bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <Award size={36} className="text-amber-400/40 mb-3" />
                    <h4 className="text-sm font-bold text-foreground">No Top Fans Found</h4>
                    <p className="text-xs max-w-sm mt-1">
                      {fanSearch
                        ? 'No fan matched your search criteria.'
                        : 'Followers earn Top Fan and Rising Fan badges automatically by liking, reacting, and commenting on your posts and reels.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-4">Fan</div>
                    <div className="col-span-3">Badge Standing</div>
                    <div className="col-span-2 text-center">Score</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {filteredFans.map((fan) => (
                    <div
                      key={fan.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-slate-200 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Rank */}
                      <div className="col-span-1 flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            fan.rank === 1
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : fan.rank === 2
                              ? 'bg-slate-300/20 text-slate-600 dark:text-slate-300 border border-slate-300/40'
                              : fan.rank === 3
                              ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                              : 'text-muted-foreground bg-muted/50'
                          }`}
                        >
                          {fan.rank}
                        </span>
                      </div>

                      {/* Fan Info */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {fan.avatar ? (
                            <img src={fan.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={16} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">
                            {fan.name || fan.username || 'User'}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                            <span>@{fan.username || fan.id.slice(0, 8)}</span>
                            {fan.tenureMonths > 0 && (
                              <>
                                <span>•</span>
                                <span>{fan.tenureMonths} mo fan</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badge Standing */}
                      <div className="col-span-3 flex items-center gap-2 flex-wrap">
                        {fan.isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 line-through">
                            Badge Revoked
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fan.badgeType === 'top_fan'
                                ? 'bg-primary/10 text-primary border border-border'
                                : fan.badgeType === 'rising_fan'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-primary/10 text-primary border border-border'
                            }`}
                          >
                            {fan.badgeType === 'top_fan' ? (
                              <Award size={11} />
                            ) : fan.badgeType === 'rising_fan' ? (
                              <Zap size={11} />
                            ) : (
                              <Star size={11} />
                            )}
                            {fan.badgeLabel}
                            {fan.isManuallyAwarded && (
                              <span className="text-[9px] opacity-75 font-normal">(VIP)</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Score */}
                      <div className="col-span-2 text-left sm:text-center">
                        <div className="text-xs font-bold text-foreground">{fan.score} pts</div>
                        <div className="w-full bg-muted/50 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full rounded-full"
                            style={{ width: `${Math.min(100, (fan.score / 50) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-start sm:justify-end gap-1.5">
                        {fan.isRevoked ? (
                          <button
                            type="button"
                            onClick={() => handleAwardTopFan(fan.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold transition-colors"
                          >
                            <RotateCcw size={11} /> Restore
                          </button>
                        ) : (
                          <>
                            {!fan.isManuallyAwarded && fan.badgeType !== 'top_fan' && (
                              <button
                                type="button"
                                onClick={() => handleAwardTopFan(fan.id)}
                                title="Award Permanent VIP Top Fan"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/10 text-[11px] font-semibold transition-colors"
                              >
                                <Award size={11} /> VIP
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRevokeTopFan(fan.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 text-[11px] font-semibold transition-colors"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
