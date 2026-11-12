import React, { useEffect, useRef, useState } from 'react';
import { mapLegacyManageUrl } from '@wevsoft/shared/wevspace';
import { Bell, Search, X } from 'lucide-react';
import { WevChatIcon } from '../../icons/WevChatIcon';
import { useNavigate } from 'react-router-dom';
import { WevChatLayout } from '../wevchat/WevChatLayout';
import { NotificationBadge } from '../ui/NotificationBadge';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { wevchatApi } from '../../lib/wevchatApi';
import { useStore } from '../../store';
import ReelsHoverReveal from './ReelsHoverReveal';
import { useReelsUiMode } from '../../lib/reelsUiPrefs';

type NotifRow = {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
  link?: string;
};

/**
 * Desktop-only Reels chrome: WevChat + Notifications above the phone frame.
 * WevChat opens a small floating wevchat so reels keep playing underneath.
 */
export default function ReelsDesktopChrome({ onSearch, searchOpen }: { onSearch?: () => void; searchOpen?: boolean } = {}) {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const { unread: notifUnread } = useUnreadNotifications();
  const wevchatMode = useReelsUiMode('wevchat');
  const notifMode = useReelsUiMode('notifications');
  const searchMode = useReelsUiMode('search');
  const [chatOpen, setChatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    wevchatApi
      .getConversations()
      .then((list: any) => {
        if (cancelled) return;
        const rows = Array.isArray(list) ? list : [];
        const total = rows.reduce((n: number, c: any) => n + (Number(c?.unreadCount) || 0), 0);
        setChatUnread(total);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, chatOpen]);

  useEffect(() => {
    if (!notifOpen || !token) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setNotifLoading(true);
    fetch('/api/notifications?limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        const rows = Array.isArray(payload.notifications) ? payload.notifications : [];
        setNotifications(
          rows.map((n: any) => ({
            id: String(n.id),
            title: n.title || n.type || 'Notification',
            description: n.description || n.text || n.message || '',
            timeAgo: n.createdAt ? new Date(n.createdAt).toLocaleString() : '',
            read: !!n.read,
            link: n.link || undefined,
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setNotifLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notifOpen, token]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  const openChat = () => {
    setNotifOpen(false);
    setChatOpen(true);
  };

  const iconBtn =
    'relative w-10 h-10 flex items-center justify-center bg-transparent border-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-110 active:scale-95 transition-transform duration-200';

  return (
    <>
      <div
        ref={panelRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-40 hidden md:flex justify-end pt-3 pr-4"
      >
        <nav
          className="pointer-events-auto relative flex items-center gap-1"
          aria-label="Reels quick actions"
        >
          {onSearch && searchMode !== 'hidden' && (
            // lg+ only: below 1024px the mobile header already shows a search icon.
            <ReelsHoverReveal mode={searchMode} forceShow={searchOpen} className="hidden lg:block" hotspotClassName="p-1 -m-1">
            <button
              type="button"
              title="Search reels"
              aria-label="Search reels"
              onClick={onSearch}
              className={iconBtn}
            >
              <Search size={22} strokeWidth={2.2} />
            </button>
            </ReelsHoverReveal>
          )}
          <ReelsHoverReveal mode={wevchatMode} forceShow={chatOpen} hotspotClassName="p-1 -m-1">
          <button
            type="button"
            title="WevChat"
            aria-label="Open WevChat"
            aria-pressed={chatOpen}
            onClick={openChat}
            className={`${iconBtn} ${chatOpen ? 'text-sky-300' : ''}`}
          >
            <WevChatIcon size={22} strokeWidth={2.2} />
            <NotificationBadge count={chatUnread} variant="blue" size="sm" className="absolute top-0.5 right-0.5" />
          </button>
          </ReelsHoverReveal>
          <ReelsHoverReveal mode={notifMode} forceShow={notifOpen} hotspotClassName="p-1 -m-1">
          <button
            type="button"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v);
              setChatOpen(false);
            }}
            className={`${iconBtn} ${notifOpen ? 'text-amber-300' : ''}`}
          >
            <Bell size={22} strokeWidth={2.2} />
            <NotificationBadge count={notifUnread} variant="rose" size="sm" className="absolute top-0.5 right-0.5" />
          </button>
          </ReelsHoverReveal>

          {notifOpen && (
            <div className="absolute top-[calc(100%+10px)] right-0 w-[min(360px,calc(100vw-2rem))] max-h-[min(420px,70dvh)] overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a0a] shadow-2xl">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
                <span className="text-sm font-bold text-white">Notifications</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/notifications');
                    }}
                  >
                    See all
                  </button>
                  <button
                    type="button"
                    aria-label="Close"
                    className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => setNotifOpen(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[min(360px,60dvh)] no-scrollbar">
                {notifLoading && (
                  <p className="px-4 py-8 text-center text-xs text-white/45">Loading…</p>
                )}
                {!notifLoading && notifications.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-white/45">No notifications yet</p>
                )}
                {!notifLoading &&
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`w-full text-left px-3.5 py-2.5 border-b border-white/5 hover:bg-white/6 transition-colors ${
                        n.read ? 'opacity-70' : ''
                      }`}
                      onClick={() => {
                        setNotifOpen(false);
                        if (n.link) navigate(mapLegacyManageUrl(n.link));
                        else navigate('/notifications');
                      }}
                    >
                      <p className="text-[13px] font-semibold text-white truncate">{n.title}</p>
                      {n.description ? (
                        <p className="text-[11px] text-white/55 line-clamp-2 mt-0.5">{n.description}</p>
                      ) : null}
                      {n.timeAgo ? (
                        <p className="text-[10px] text-white/35 mt-1">{n.timeAgo}</p>
                      ) : null}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      {chatOpen ? <WevChatLayout pip onClose={() => setChatOpen(false)} /> : null}
    </>
  );
}
