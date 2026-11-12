import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Heart, MessageCircle, UserPlus, Sparkles, CheckCheck, 
  Trash2, Filter, Clock, ChevronRight, AlertCircle, Shield, Award, Radio 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { useWebSocket } from '../components/providers/WebSocketProvider';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
  avatar?: string;
  link?: string;
  actorName?: string;
  senderUsername?: string;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { active, isSpaceMode } = useSpaceIdentities();
  const activeSpaceId = isSpaceMode && active?.kind === 'space' && active.id ? String(active.id) : null;
  const [filter, setFilter] = useState<'all' | 'unread' | 'social' | 'mentions'>('all');
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const formatTitle = (type: string, actorName?: string) => {
    if (actorName) return actorName;
    switch (type) {
      case 'friend_request': return t('Friend request') || 'Friend request';
      case 'post_reaction': return t('New reaction') || 'New reaction';
      case 'comment_reaction': return t('New reaction') || 'New reaction';
      case 'comment': return t('New comment') || 'New comment';
      case 'reply': return t('New reply') || 'New reply';
      case 'mention': return t('You were mentioned') || 'You were mentioned';
      case 'direct_message':
      case 'message': return t('New message') || 'New message';
      case 'follow': return t('New follower') || 'New follower';
      case 'share': return t('Post shared') || 'Post shared';
      case 'live': return t('Live now') || 'Live now';
      case 'security_alert': return t('Security alert') || 'Security alert';
      default: return type ? type.replace(/_/g, ' ') : 'Notification';
    }
  };

  const SOCIAL_TYPES = new Set([
    'friend_request', 'follow', 'comment', 'reply', 'post_reaction', 'comment_reaction',
    'share', 'reshare', 'like', 'story_reply', 'story_reaction', 'story_share',
    'direct_message', 'message', 'live',
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({ limit: '50' });
        if (filter === 'unread') params.set('unread', 'true');
        if (filter === 'mentions') params.set('type', 'mention');
        if (filter === 'social') params.set('category', 'social');
        if (activeSpaceId) params.set('spaceId', activeSpaceId);
        const res = await fetch(`/api/notifications?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load notifications');
        const payload = await res.json();
        if (!cancelled && Array.isArray(payload.notifications)) {
          setNotifications(payload.notifications.map((n: any) => ({
            ...n,
            title: n.title || formatTitle(n.type, n.actorName),
            description: n.description || n.text || n.message || '',
            timeAgo: n.createdAt ? new Date(n.createdAt).toLocaleString() : '',
          })));
        }
      } catch { if (!cancelled) toast.error('Could not load notifications'); }
    })();
    return () => { cancelled = true; };
  }, [filter, activeSpaceId]);

  const { socket } = useWebSocket();
  useEffect(() => {
    if (!socket) return;
    const handleNew = (payload: any) => {
      if (activeSpaceId && payload?.spaceId !== activeSpaceId) return;
      setNotifications((prev) => {
        const isDuplicate = prev.some((n) => n.id === payload.id);
        if (isDuplicate) return prev;
        const newItem = {
          ...payload,
          title: payload.title || formatTitle(payload.type, payload.actorName),
          description: payload.description || payload.text || payload.message || '',
          timeAgo: payload.createdAt ? new Date(payload.createdAt).toLocaleString() : new Date().toLocaleString(),
        };
        return [newItem, ...prev];
      });
    };
    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [socket, activeSpaceId]);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    const qs = activeSpaceId ? `?spaceId=${encodeURIComponent(activeSpaceId)}` : '';
    await fetch(`/api/notifications/read-all${qs}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success(t('All notifications marked as read') || 'All notifications marked as read');
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success(t('Notification removed') || 'Notification removed');
  };

  const toggleRead = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.read) toggleRead(item.id);
    if (item.link) {
      navigate(item.link);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (isSpaceMode && String(n.type) === 'friend_request') return false;
    if (filter === 'unread') return !n.read;
    if (filter === 'mentions') return String(n.type) === 'mention';
    if (filter === 'social') return SOCIAL_TYPES.has(String(n.type));
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'post_reaction':
      case 'comment_reaction':
        return <Heart className="text-rose-500 fill-rose-500" size={18} />;
      case 'comment':
      case 'reply':
      case 'direct_message':
      case 'message':
        return <MessageCircle className="text-cyan-400 fill-cyan-400/20" size={18} />;
      case 'follow':
      case 'friend_request':
        return <UserPlus className="text-purple-400" size={18} />;
      case 'live':
        return <Radio className="text-red-500" size={18} />;
      case 'mention':
        return <Sparkles className="text-amber-400" size={18} />;
      case 'ai':
        return <Sparkles className="text-amber-400 animate-pulse" size={18} />;
      default:
        return <Shield className="text-teal-400" size={18} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-xl p-6 rounded-3xl border border-border/50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {t('Notifications') || 'Notifications'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {t('Stay updated with your community and AI insights') || 'Stay updated with your community and AI insights'}
            </p>
          </div>
        </div>

        <button
          onClick={markAllAsRead}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors border border-primary/20 shrink-0"
        >
          <CheckCheck size={16} />
          <span>{t('Mark all as read') || 'Mark all as read'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {([
          { id: 'all' as const, label: t('All') || 'All' },
          { id: 'unread' as const, label: t('Unread') || 'Unread' },
          { id: 'social' as const, label: t('Social') || 'Social' },
          { id: 'mentions' as const, label: t('Mentions') || 'Mentions' },
        ]).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs transition-all shrink-0 ${
              filter === chip.id
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md'
                : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {chip.label}
            {chip.id === 'all' ? ` (${notifications.length})` : ''}
            {chip.id === 'unread' ? ` (${notifications.filter((n) => !n.read).length})` : ''}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-card/40 rounded-3xl border border-border/50 p-8"
            >
              <Bell className="mx-auto text-muted-foreground/40 mb-3" size={48} />
              <h3 className="text-lg font-bold text-foreground">
                {t('No notifications found') || 'No notifications found'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t('You are all caught up!') || 'You are all caught up!'}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleNotificationClick(item)}
                className={`group relative flex items-start gap-4 p-4 sm:p-5 rounded-3xl border transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none cursor-pointer ${
                  !item.read 
                    ? 'bg-card border-primary/40 shadow-lg shadow-primary/5' 
                    : 'bg-card/40 border-border/40 hover:bg-card/70'
                }`}
              >
                {/* Unread indicator */}
                {!item.read && (
                  <span className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50"></span>
                )}

                {/* Avatar / Icon */}
                <div className="relative shrink-0">
                  {item.avatar ? (
                    <img 
                      src={item.avatar} 
                      alt="" 
                      className="w-12 h-12 rounded-2xl object-cover border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-cyan-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                      {getIcon(item.type)}
                    </div>
                  )}
                  {item.avatar && (
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border shadow">
                      {getIcon(item.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground truncate">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground/70 font-medium">
                    <Clock size={12} />
                    <span>{item.timeAgo}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => deleteNotification(item.id, e)}
                    className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                    title={t('Delete') || 'Delete'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
