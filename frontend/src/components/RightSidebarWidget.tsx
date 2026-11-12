import { useTranslation } from 'react-i18next';
import { trLabel } from './settings/languagePickerShared';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, UserPlus, Check, Activity, Radio, ArrowUpRight, TrendingUp, Cpu, Server, Zap, X, RefreshCw, Smartphone, Download } from 'lucide-react';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { useUiStore } from '../stores/uiStore';

const APK_HIDE_KEY = 'wev_hide_apk_download';

function readApkHiddenKey(): string | null {
  try {
    return localStorage.getItem(APK_HIDE_KEY);
  } catch {
    return null;
  }
}

function apkHideToken(apk: { url: string; uploadedAt?: string; version?: string }) {
  return `${apk.url}|${apk.uploadedAt || ''}|${apk.version || ''}`;
}

const WevChatLayout = lazy(() =>
  import('./wevchat/WevChatLayout').then((m) => ({ default: m.WevChatLayout })),
);

interface UserSuggestion {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
  verified?: boolean;
  mutualCount?: number;
  reason?: string;
}

interface PlatformUpdate {
  id: string;
  title: string;
  description: string;
  version?: string;
  badge?: string;
  icon?: string;
  createdAt: string;
}

interface SystemStatus {
  status: string;
  operational: boolean;
  uptime: string;
  uptimeSeconds: number;
  latencyMs: number;
  services: {
    database: string;
    socket: string;
    aiGateway: string;
  };
  memoryUsage?: {
    heapUsedMB: number;
    heapTotalMB: number;
  };
}

interface ApkDownloadInfo {
  enabled: boolean;
  url: string;
  version: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export const RightSidebarWidget: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const token = useStore(state => state.token);
  const { isSpaceMode } = useSpaceIdentities();
  const wevChatOpen = useUiStore((s) => s.wevChatDesktopFloat);
  const wevChatOpenMinimized = useUiStore((s) => s.wevChatOpenMinimized);
  const closeWevChatDesktopFloat = useUiStore((s) => s.closeWevChatDesktopFloat);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [apkDownload, setApkDownload] = useState<ApkDownloadInfo | null>(null);
  const [apkHidden, setApkHidden] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [trending, setTrending] = useState<{ tag: string; count: string }[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (wevChatOpen && !wevChatOpenMinimized) return;
    fetchWidgetData();
  }, [token, isSpaceMode, wevChatOpen, wevChatOpenMinimized]);

  const fetchSuggestions = async () => {
    if (!token || isSpaceMode) {
      setSuggestions([]);
      return;
    }
    const sugRes = await fetch('/api/v1/feed/suggestions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (sugRes.ok) {
      const data = await sugRes.json();
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    }
  };

  const fetchWidgetData = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      await fetchSuggestions();

      const updRes = await fetch('/api/v1/system/updates', { headers });
      if (updRes.ok) {
        const data = await updRes.json();
        if (Array.isArray(data.updates)) {
          setUpdates(data.updates);
        }
        const apk = data.apkDownload && data.apkDownload.enabled && data.apkDownload.url
          ? (data.apkDownload as ApkDownloadInfo)
          : null;
        setApkDownload(apk);
        if (apk) {
          const hidden = readApkHiddenKey();
          setApkHidden(hidden === apkHideToken(apk));
        } else {
          setApkHidden(false);
        }
      }

      const statRes = await fetch('/api/v1/system/status', { headers });
      if (statRes.ok) {
        const data = await statRes.json();
        setStatus(data);
      }

      if (token) {
        const trendRes = await fetch('/api/recommendations/hashtags?limit=8', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (trendRes.ok) {
          const data = await trendRes.json();
          const rows = Array.isArray(data.recommendations) ? data.recommendations : [];
          setTrending(
            rows.map((row: any) => {
              const raw = String(row.hashtag || row.tag || '').replace(/^#/, '');
              const n = Number(row.postCount24h || row.count || 0);
              const count =
                n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n > 0 ? String(n) : '';
              return { tag: raw, count };
            }).filter((t: { tag: string }) => t.tag),
          );
        }
      }
    } catch (err) {
      console.error('[RightSidebarWidget] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSuggestions = async () => {
    setRefreshing(true);
    try {
      await fetchSuggestions();
      toast.success(trLabel(t, 'SuggestionsRefreshed', 'Suggestions refreshed'));
    } catch {
      toast.error(trLabel(t, 'CouldNotRefresh', 'Could not refresh'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (userId: string) => {
    setSuggestions((prev) => prev.filter((u) => u.id !== userId));
    try {
      if (token) {
        await fetch('/api/recommendations/friends/dismiss', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFollow = async (userId: string, name: string) => {
    setFollowingMap(prev => ({ ...prev, [userId]: true }));
    toast.success(`Started following ${name}`);

    try {
      if (token) {
        await fetch(`/api/users/${userId}/follow`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // WevChat takes over this rail when restored (not the minimized pill).
  // List + conversation share one fixed width (no resize when opening a chat).
  if (wevChatOpen && !wevChatOpenMinimized) {
    return (
      <aside
        className="w-[360px] shrink-0 border-l border-border bg-card hidden lg:flex flex-col overflow-hidden min-h-0"
        aria-label="WevChat"
      >
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              Loading WevChat…
            </div>
          }
        >
          <WevChatLayout
            embedded
            desktopFloat
            onClose={closeWevChatDesktopFloat}
          />
        </Suspense>
      </aside>
    );
  }

  return (
    <aside className="w-[300px] shrink-0 border-l border-border bg-card hidden lg:flex flex-col p-4 overflow-y-auto no-scrollbar space-y-4">
      
      <div className="bg-muted/40 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400 animate-pulse" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-foreground truncate">{trLabel(t, 'PlatformUpdates', 'Platform Updates')}</h3>
          </div>
          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
            LIVE
          </span>
        </div>

        <div className="space-y-3">
          {apkDownload && !apkHidden ? (
            <div className="p-3 bg-muted/20 border border-emerald-500/25 rounded-2xl hover:bg-muted/40 transition-colors relative group">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(APK_HIDE_KEY, apkHideToken(apkDownload));
                  } catch { /* ignore */ }
                  setApkHidden(true);
                  toast.success(trLabel(t, 'AppDownloadHidden', 'App download card hidden on this device'));
                }}
                className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                title={trLabel(t, 'HideOnThisDevice', 'Hide on this device')}
                aria-label={trLabel(t, 'HideAndroidAppDownload', 'Hide Android app download')}
              >
                <X size={12} />
              </button>
              <div className="flex items-center justify-between mb-1 pr-6">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  APP
                </span>
                {apkDownload.version ? (
                  <span className="text-[10px] font-mono text-muted-foreground">{apkDownload.version}</span>
                ) : null}
              </div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Smartphone size={13} className="text-emerald-400 shrink-0" />
                Install Android app
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                Download the Wevsoft APK for your phone
                {apkDownload.sizeBytes
                  ? ` · ${(apkDownload.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                  : ''}
                .
              </p>
              <a
                href={apkDownload.url}
                download={apkDownload.fileName || 'wevsoft-android.apk'}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                <Download size={13} /> Download APK
              </a>
            </div>
          ) : null}
          {updates.slice(0, apkDownload && !apkHidden ? 2 : 3).map((upd) => (
            <div 
              key={upd.id} 
              className="p-3 bg-muted/20 border border-border rounded-2xl hover:bg-muted/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {upd.badge || 'UPDATE'}
                </span>
                {upd.version && (
                  <span className="text-[10px] font-mono text-muted-foreground">{upd.version}</span>
                )}
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-purple-400 transition-colors flex items-center justify-between">
                <span>{upd.title}</span>
                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{upd.description}</p>
            </div>
          ))}
        </div>
      </div>

      {!isSpaceMode ? (
      <div className="bg-muted/40 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-cyan-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-foreground truncate">{trLabel(t, 'PeopleYouMayKnow', 'People you may know')}</h3>
          </div>
          <button
            type="button"
            onClick={() => void handleRefreshSuggestions()}
            disabled={refreshing || !token}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground disabled:opacity-40"
            title={trLabel(t, 'RefreshSuggestions', 'Refresh suggestions')}
            aria-label={trLabel(t, 'RefreshSuggestions', 'Refresh suggestions')}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted/20 rounded-2xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-20 bg-black/10 dark:bg-white/10 rounded"></div>
                  <div className="h-2 w-14 bg-black/10 dark:bg-white/10 rounded"></div>
                </div>
              </div>
            ))
          ) : suggestions.length > 0 ? (
            suggestions.map((u) => {
              const isFollowing = followingMap[u.id];
              return (
                <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-2xl hover:bg-muted/30 transition-colors group">
                  <Link to={`/u/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 to-purple-500 shrink-0">
                      <img 
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                        alt={u.name}
                        loading="lazy"
                        className="w-full h-full rounded-full object-cover border border-card" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-cyan-400 transition-colors">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>
                      {u.mutualCount ? (
                        <p className="text-[9px] text-cyan-400/80 font-medium">{u.mutualCount} mutual friends</p>
                      ) : u.reason && u.reason !== 'Recommended for you' ? (
                        <p className="text-[9px] text-muted-foreground truncate">{u.reason}</p>
                      ) : null}
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleDismiss(u.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      title={trLabel(t, 'RemoveSuggestion', 'Remove suggestion')}
                      aria-label={trLabel(t, 'RemoveSuggestion', 'Remove suggestion')}
                    >
                      <X size={12} />
                    </button>
                    <button
                      onClick={() => handleFollow(u.id, u.name)}
                      disabled={isFollowing}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border ${
                        isFollowing 
                          ? 'bg-muted/40 border-border text-muted-foreground' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-md shadow-cyan-500/20 hover:opacity-90'
                      }`}
                    >
                      {isFollowing ? <><Check size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">{trLabel(t, 'NoSuggestionsNow', 'No suggestions at this moment.')}</p>
          )}
        </div>
      </div>
      ) : null}

      <div className="bg-muted/40 border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-pink-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-foreground truncate">{trLabel(t, 'TrendingTopics', 'Trending Topics')}</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {(trending.length
            ? trending
            : [
                { tag: 'WevsoftAI', count: '' },
                { tag: 'CampusLife', count: '' },
                { tag: 'TechNews', count: '' },
              ]
          ).map((t) => (
            <Link
              key={t.tag}
              to={`/explore?q=${encodeURIComponent(t.tag)}`}
              className="px-3 py-1.5 bg-muted/30 border border-border hover:border-pink-500/40 rounded-full text-xs font-medium text-foreground hover:bg-pink-500/10 hover:text-pink-400 transition-all flex items-center gap-1.5 shadow-sm group"
            >
              <span className="text-pink-400 font-bold">#</span>
              {t.tag}
              {t.count ? (
                <span className="text-[9px] text-muted-foreground group-hover:text-pink-400/70">{t.count}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>

      {status && (
        <div className="bg-muted/40 border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className={status.operational ? 'text-emerald-400' : 'text-rose-400'} />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-foreground truncate">{trLabel(t, 'SystemStatus', 'System Status')}</h3>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Server size={12} /> API</span>
              <span className={status.operational ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {status.operational ? 'Operational' : 'Degraded'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Cpu size={12} /> Latency</span>
              <span className="font-mono text-foreground">{status.latencyMs}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Radio size={12} /> Uptime</span>
              <span className="font-mono text-foreground">{status.uptime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Zap size={12} /> DB</span>
              <span className="font-medium text-foreground capitalize">{status.services?.database || 'ok'}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
});

RightSidebarWidget.displayName = 'RightSidebarWidget';
