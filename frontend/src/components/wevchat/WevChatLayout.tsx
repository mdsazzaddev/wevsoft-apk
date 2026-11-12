import React, { Suspense, lazy, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Search, Phone, Video, Info, ChevronLeft, ChevronDown, Plus, Pin, BellOff, Lock, FolderLock, MessageCircle, X, Copy, Forward, Star, Trash2, Share2, Check, SquarePen, Users } from 'lucide-react';
import { ChatInput, type ScheduledMessageItem } from './ChatInput';
import type { ChatThemeJson, GenerationSettingsJson, InfoJson } from '../../lib/wevchat';
import { parseInfoJson } from '../../lib/wevchat';
import { MessageBubble, type MessageData } from './MessageBubble';
import { MessageReportModal, extractFirstUrl } from './MessageActionSheet';

const ChatInfoDrawer = lazy(() => import('./ChatInfoDrawer').then((m) => ({ default: m.ChatInfoDrawer })));
const UserProfileModal = lazy(() => import('./UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const NewChatModal = lazy(() => import('./NewChatModal').then((m) => ({ default: m.NewChatModal })));
import { WevChatProfileStrip } from './WevChatProfileStrip';
import { WevChatFriendsCircles } from './WevChatFriendsCircles';
import { WevChatIcon } from '../../icons/WevChatIcon';
import { PrivateChatToggle } from './PrivateChatToggle';
import { useAuthenticatedSrc } from './AuthenticatedMedia';
import { useStore } from '../../store';
import { useUiStore } from '../../stores/uiStore';
import { useConnectCall } from '../connect/ConnectCallProvider';
import { useWebSocket } from '../providers/WebSocketProvider';
import { wevchatApi, WevChatApiError } from '../../lib/wevchatApi';
import { encryptMessage, decryptMessage, importPublicKey, deriveSharedSecret, importPrivateKey } from '../../lib/wevchatCrypto';
import toast from 'react-hot-toast';
import { getShowInlineSendTime, setShowInlineSendTime, MESSAGE_TIME_GAP_MS } from '../../lib/wevchatTimePrefs';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import UserAvatar from '../UserAvatar';
import { Rnd } from 'react-rnd';
import { Minus, Maximize2, Minimize2, CheckCircle, Clock, MessageSquarePlus, ShoppingBag } from 'lucide-react';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import * as wevspaceManageApi from '../../lib/wevspaceManageApi';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { DESKTOP_MD_QUERY, isDesktopMd } from '../../lib/desktopHeader';
import { WEVCHAT_DOCK_RIGHT_KEY, WEVCHAT_LIST_ONLY_KEY } from '../../lib/wevchatNav';
import { createPresenceTrack } from '../../lib/presenceClient';
import {
  listIsPinnedToBottom,
  shouldFollowThreadOutput,
  typingMarksPeerActive,
  virtuosoBottomIndex,
} from './utils/wevchatThread.logic';

/** Stable Virtuoso row wrapper — an inline `components.Item` remounts every parent render and blinks the list. */
const WevChatVirtuosoItem: React.FC<
  React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement> & { 'data-index'?: number }>
> = ({ children, ...props }) => (
  <div {...props} className="w-full box-border">
    {children}
  </div>
);

/** Bottom spacer so the last bubble (and its shadow/reactions) sits fully above the composer. */
const WevChatVirtuosoFooter: React.FC = () => <div aria-hidden className="h-3" />;

const WEVCHAT_VIRTUOSO_COMPONENTS = { Item: WevChatVirtuosoItem, Footer: WevChatVirtuosoFooter };

// ─── Memoized conversation list item ─────────────────────────────────────────
// Extracted so re-renders caused by unrelated parent state (typing, scroll,
// atBottom, etc.) don't re-render every item in the list.
interface ConversationItemProps {
  chat: ConversationSummary;
  isActive: boolean;
  online: boolean;
  onSelect: () => void;
}
const ConversationItem = React.memo(function ConversationItem({
  chat, isActive, online, onSelect,
}: ConversationItemProps) {
  const name = displayName(chat);
  const unread = chat.unreadCount > 0;
  const time = chat.lastMessage ? safeTime(chat.lastMessage.createdAt) : '';
  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-2.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-colors duration-150 motion-reduce:transition-none ${isActive ? 'bg-primary/[0.08] border-primary/15 dark:bg-primary/15' : 'bg-card border-border/50 hover:bg-muted/60 hover:border-border'}`}
    >
      <div className="relative shrink-0">
        <UserAvatar user={{ ...chat.otherUser, name }} src={chat.photo || chat.otherUser?.avatar} className="w-12 h-12 text-sm" />
        {online && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-[3px] ring-card" />}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <p className={`min-w-0 flex-1 text-[15px] leading-5 flex items-center gap-1.5 ${unread ? 'font-bold' : 'font-medium'} text-foreground`}>
            {chat.isPinnedChat && <Pin size={12} className="shrink-0 text-muted-foreground" />}
            {chat.privateChat?.active && <Lock size={12} className="shrink-0 text-amber-500" />}
            <span className="truncate">{name}</span>
            {chat.isMuted && <BellOff size={12} className="shrink-0 text-muted-foreground" />}
          </p>
          {time && <span className={`wevchat-msg-time shrink-0 text-[12px] leading-5 tabular-nums ${unread ? 'font-semibold text-primary' : 'font-normal text-muted-foreground'}`}>{time}</span>}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <p className={`min-w-0 flex-1 truncate text-[13px] leading-5 ${isActive ? 'text-primary' : unread ? 'font-medium text-foreground/90' : 'text-muted-foreground'}`}>
            {previewText(chat.lastMessage)}
          </p>
          {unread ? (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm flex items-center justify-center shrink-0 tabular-nums" aria-label={`${chat.unreadCount} unread`}>
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

import type { ConversationSummary } from './types';

import {
  displayName,
  safeTime,
  groupDateLabel,
  previewText,
  normalizeConversation,
  SIDEBAR_WIDTH_KEY,
  SIDEBAR_DEFAULT,
  SIDEBAR_MIN,
  SIDEBAR_MAX,
  FLOAT_CONVERSATION_MIN,
  CONVERSATION_MIN,
  APP_NAV_WIDTH,
  wevchatAvailWidth,
  sidebarMaxForViewport,
  clampSidebarWidth,
  clampSidebarWidthInShell,
  readSidebarWidth,
  chatAvatar,
  makeClientId,
  sameContent,
  ACTIVE_CHAT_STORAGE_KEY,
  writeStoredActiveChatId,
} from './utils/wevchatUtils';

export const WevChatLayout: React.FC<{
  /** Picture-in-picture overlay (e.g. Reels) — floating window, never fills the route. */
  pip?: boolean;
  /** Desktop glass window over home/feed (mounted from DashboardLayout). */
  desktopFloat?: boolean;
  /** Fills the home right rail (stacked list → chat). No Rnd chrome. */
  embedded?: boolean;
  onClose?: () => void;
}> = ({ pip = false, desktopFloat = false, embedded = false, onClose }) => {
  const setIsChatActive = useStore((state) => state.setIsChatActive);
  const user = useStore((s) => s.user);
  const closeWevChatDesktopFloat = useUiStore((s) => s.closeWevChatDesktopFloat);
  const setWevChatFloatConversationId = useUiStore((s) => s.setWevChatFloatConversationId);
  const setWevChatOpenMinimized = useUiStore((s) => s.setWevChatOpenMinimized);
  const wevChatFloatConversationId = useUiStore((s) => s.wevChatFloatConversationId);
  const wevChatOpenMinimized = useUiStore((s) => s.wevChatOpenMinimized);


  useEffect(() => {
    async function initE2EE() {
      try {
        const storedPrivate = localStorage.getItem('wevchat_e2ee_private');
        const storedPublic = localStorage.getItem('wevchat_e2ee_public');
        if (!storedPrivate || !storedPublic) {
          const { generateKeyPair, exportPublicKey, exportPrivateKey } = await import('../../lib/wevchatCrypto');
          const keyPair = await generateKeyPair();
          const pubB64 = await exportPublicKey(keyPair.publicKey);
          const privB64 = await exportPrivateKey(keyPair.privateKey);

          await wevchatApi.uploadPublicKey(pubB64);

          localStorage.setItem('wevchat_e2ee_public', pubB64);
          localStorage.setItem('wevchat_e2ee_private', privB64);
          console.log('E2EE Keys initialized');
        }
      } catch (err) {
        console.error('Failed to init E2EE keys', err);
      }
    }
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => initE2EE());
    } else {
      setTimeout(initE2EE, 2000);
    }
  }, []);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversationId: conversationIdParam } = useParams<{ conversationId?: string }>();
  const { socket } = useWebSocket();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const call = useConnectCall();
  const callMenuRef = useRef<HTMLDivElement>(null);
  const callMenuButtonRef = useRef<HTMLButtonElement>(null);
  const pendingProfileCallRef = useRef(false);

  /** Debounce markRead: fire at most once per 1.5s per open conversation. */
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markReadDebounced = useCallback((conversationId: string) => {
    if (markReadTimerRef.current) return; // already scheduled
    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null;
      wevchatApi.markRead(conversationId).catch(() => { });
    }, 1500);
  }, []);

  const [activeTab, setActiveTab] = useState<'All' | 'Direct' | 'Groups' | 'Unread' | 'AI Bots' | 'WevMall' | 'Requests'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  // Hide the 'No conversations yet' empty state until the first fetch answers (avoids a flash).
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messageRequests, setMessageRequests] = useState<ConversationSummary[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [conversationsOffset, setConversationsOffset] = useState(0);
  const [conversationsHasMore, setConversationsHasMore] = useState(true);
  const [requestsOffset, setRequestsOffset] = useState(0);
  const [requestsHasMore, setRequestsHasMore] = useState(true);
  const LIMIT = 20;
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [wevchatDisabled, setWevChatDisabled] = useState(false);
  const [wevchatDisabledMessage, setWevChatDisabledMessage] = useState('Wev Chat is disabled');
  /** Selected conversation — null until the user intentionally opens one. */
  const [activeChat, setActiveChat] = useState<ConversationSummary | null>(null);

  // Profile → /messages/:id?call=audio|video starts a 1:1 call once the thread is open.
  useEffect(() => {
    const kind = searchParams.get('call');
    if (kind !== 'audio' && kind !== 'video') {
      pendingProfileCallRef.current = false;
      return;
    }
    if (!activeChat?.otherUser?.id || call.callState !== 'idle') return;
    if (pendingProfileCallRef.current) return;
    pendingProfileCallRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('call');
    setSearchParams(next, { replace: true });
    void call.startCall(activeChat.otherUser.id, displayName(activeChat), kind, activeChat.id).then((ok) => {
      if (!ok) pendingProfileCallRef.current = false;
    });
  }, [searchParams, setSearchParams, activeChat, call.callState, call.startCall]);

  const { active, isSpaceMode } = useSpaceIdentities();
  const [spaceThread, setSpaceThread] = useState<any>(null);

  useEffect(() => {
    if (isSpaceMode && activeChat?.id && active?.id) {
      wevspaceManageApi.fetchInboxThreadByConversation(active.id, activeChat.id)
        .then(res => setSpaceThread(res.thread))
        .catch(err => { console.error('Failed to fetch space thread:', err); setSpaceThread(null); });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSpaceThread(null);
    }
  }, [isSpaceMode, activeChat?.id, active?.id]);

  // Customer side of a Space chat: the Space's automated greeting + FAQ quick questions,
  // shown while the conversation is still empty (wevspace-automation.service.ts getSpaceGreeting).
  const greetingSpaceId: string | null =
    !isSpaceMode && (activeChat as any)?.otherUser?.isSpace ? ((activeChat as any).otherUser.spaceId ?? null) : null;
  const [spaceGreeting, setSpaceGreeting] = useState<{ spaceId: string; text: string; faqs: string[] } | null>(null);
  useEffect(() => {
    if (!greetingSpaceId) return;
    let cancelled = false;
    wevspaceManageApi
      .fetchSpaceGreeting(greetingSpaceId)
      .then((g) => { if (!cancelled) setSpaceGreeting(g.enabled ? { spaceId: greetingSpaceId, text: g.text, faqs: g.faqs || [] } : null); })
      .catch(() => { if (!cancelled) setSpaceGreeting(null); });
    return () => { cancelled = true; };
  }, [greetingSpaceId]);
  const activeGreeting = spaceGreeting && spaceGreeting.spaceId === greetingSpaceId ? spaceGreeting : null;

  const handleUpdateSpaceThreadStatus = async (status: string) => {
    if (!isSpaceMode || !activeChat?.id || !active?.id) return;
    try {
      await wevspaceManageApi.patchInboxThreadByConversation(active.id, activeChat.id, { status: status as any });
      setSpaceThread((prev: any) => prev ? { ...prev, status } : prev);
      toast.success(`Marked as ${status.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleUpdateSpaceThreadCrm = async (patch: any) => {
    if (!isSpaceMode || !activeChat?.id || !active?.id) return;
    try {
      const updated = await wevspaceManageApi.patchInboxThreadByConversation(active.id, activeChat.id, patch);
      setSpaceThread((prev: any) => prev ? { ...prev, ...updated } : prev);
      toast.success('CRM Details saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save details');
    }
  };
  const { resolved: chatWallpaperSrc } = useAuthenticatedSrc(activeChat?.themeJson?.wallpaperUrl || null);
  const [showInlineSendTime, setShowInlineSendTimeState] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  /** Mobile stack: false = chat list, true = conversation. Desktop keeps list+conversation via CSS. */
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  /** False until the server answers presence:sync, so we don't label everyone Offline first. */
  const [presenceKnown, setPresenceKnown] = useState(false);
  const presenceTrackRef = useRef(createPresenceTrack());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageData | null>(null);
  const [conversationMedia, setConversationMedia] = useState<MessageData[]>([]);
  const [forwardingMessage, setForwardingMessage] = useState<MessageData | null>(null);
  const [forwardTargets, setForwardTargets] = useState<Set<string>>(new Set());
  const [forwardingBatch, setForwardingBatch] = useState<MessageData[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reportingMessage, setReportingMessage] = useState<MessageData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ m: MessageData; everyone: boolean } | null>(null);
  const [showPinnedList, setShowPinnedList] = useState(false);
  /** id of a message temporarily highlighted after a jump (reply-quote click / unread jump). */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; name: string; username?: string; avatar?: string }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'text' | 'image' | 'video' | 'audio' | 'file' | 'link'>('all');
  const [searchSenderId, setSearchSenderId] = useState('');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(() => {
    try { return sessionStorage.getItem('wev_vault_unlocked') === '1'; } catch { return false; }
  });
  const [chatSearchQ, setChatSearchQ] = useState('');
  const [chatSearchHits, setChatSearchHits] = useState<MessageData[]>([]);
  const [chatSearchCursor, setChatSearchCursor] = useState<string | null>(null);
  const [chatSearchHasMore, setChatSearchHasMore] = useState(false);
  const [chatSearchLoading, setChatSearchLoading] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<MessageData[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessageItem[]>([]);

  // Window Management State — nav first-open starts minimized.
  const [windowState, setWindowState] = useState<'maximized' | 'normal' | 'minimized'>(() => {
    if (pip) return 'normal';
    if (desktopFloat) {
      if (useUiStore.getState().wevChatOpenMinimized) return 'minimized';
      try {
        if (sessionStorage.getItem('wev_wevchat_start_minimized') === '1') {
          sessionStorage.removeItem('wev_wevchat_start_minimized');
          return 'minimized';
        }
      } catch { /* ignore */ }
      return 'normal';
    }
    return 'maximized';
  });

  // Nav restore (clear openMinimized) → expand the floating / rail panel.
  useEffect(() => {
    if (!desktopFloat) return;
    if (!wevChatOpenMinimized && windowState === 'minimized') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setWindowState('normal');
    }
  }, [desktopFloat, wevChatOpenMinimized, windowState]);

  const isOverlayWindow = pip || desktopFloat;
  /** Stack list and conversation (never side-by-side) — pip + home right-rail. */
  const isStackedPane = pip || embedded;

  const getInitialRndSize = () => {
    if (typeof window === 'undefined') {
      return pip || desktopFloat ? { width: 380, height: 560 } : { width: 720, height: 520 };
    }
    if (pip) {
      return {
        width: Math.min(400, Math.max(340, window.innerWidth - 48)),
        height: Math.min(560, Math.max(420, window.innerHeight - 80)),
      };
    }
    // First open from nav: same size for list-only and conversation (stable across minimize).
    if (desktopFloat) {
      try {
        if (sessionStorage.getItem(WEVCHAT_LIST_ONLY_KEY) === '1') {
          sessionStorage.removeItem(WEVCHAT_LIST_ONLY_KEY);
          const saved = localStorage.getItem('wev_wevchat_rnd_size');
          if (saved) {
            const parsed = JSON.parse(saved) as { width?: number; height?: number };
            if (parsed?.width && parsed?.height) {
              return {
                width: Math.min(Math.max(360, parsed.width), window.innerWidth - 16),
                height: Math.min(Math.max(300, parsed.height), window.innerHeight - 16),
              };
            }
          }
          return {
            width: Math.min(420, Math.max(360, Math.floor(window.innerWidth * 0.32))),
            height: Math.min(window.innerHeight - 72, Math.max(480, window.innerHeight - 96)),
          };
        }
      } catch { /* ignore */ }
    }
    let size = { width: 720, height: 520 };
    try {
      const saved = localStorage.getItem('wev_wevchat_rnd_size');
      if (saved) size = JSON.parse(saved);
    } catch { /* ignore */ }
    size.width = Math.min(Math.max(360, size.width), window.innerWidth - 16);
    size.height = Math.min(Math.max(300, size.height), window.innerHeight - 16);
    return size;
  };

  const getInitialRndPos = (size: { width: number, height: number }) => {
    if (typeof window === 'undefined') return { x: 50, y: 50 };
    if (pip) {
      return {
        x: Math.max(16, window.innerWidth - size.width - 24),
        y: Math.max(16, window.innerHeight - size.height - 24),
      };
    }
    if (desktopFloat) {
      try {
        if (sessionStorage.getItem(WEVCHAT_DOCK_RIGHT_KEY) === '1') {
          sessionStorage.removeItem(WEVCHAT_DOCK_RIGHT_KEY);
          return {
            x: Math.max(8, window.innerWidth - size.width - 16),
            y: Math.max(56, Math.min(72, window.innerHeight - size.height - 16)),
          };
        }
      } catch { /* ignore */ }
    }
    let pos = { x: 50, y: 50 };
    try {
      const saved = localStorage.getItem('wev_wevchat_rnd_pos');
      if (saved) pos = JSON.parse(saved);
    } catch { /* ignore */ }
    pos.x = Math.max(0, Math.min(pos.x, window.innerWidth - size.width));
    pos.y = Math.max(0, Math.min(pos.y, window.innerHeight - size.height));
    return pos;
  };

  const [rndSize, setRndSize] = useState(getInitialRndSize());
  const [rndPos, setRndPos] = useState(getInitialRndPos(rndSize));

  // Save to localStorage whenever size/position changes (skip pip — ephemeral overlay).
  useEffect(() => {
    if (pip) return;
    localStorage.setItem('wev_wevchat_rnd_size', JSON.stringify(rndSize));
  }, [rndSize, pip]);

  useEffect(() => {
    if (pip) return;
    localStorage.setItem('wev_wevchat_rnd_pos', JSON.stringify(rndPos));
  }, [rndPos, pip]);

  useEffect(() => {
    if (!activeChat?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setShowInlineSendTimeState(getShowInlineSendTime(activeChat.id));
  }, [activeChat?.id]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- manual memoization kept as-is (existing behavior)
  const toggleInlineSendTime = useCallback((show: boolean) => {
    if (!activeChat?.id) return;
    setShowInlineSendTime(activeChat.id, show);
    setShowInlineSendTimeState(show);
  }, [activeChat?.id]);

  /** true while the message list is scrolled near the bottom — governs autoscroll + jump button. */
  const [atBottom, setAtBottom] = useState(true);
  /**
   * Older pages are prepended through Virtuoso's firstItemIndex (decremented per prepend), so the
   * list keeps the user's position natively instead of us nudging scrollTop with estimated heights.
   * Keyed by chat id so a newly opened conversation starts from the base index.
   */
  const [prepended, setPrepended] = useState<{ chatId: string | null; count: number }>({ chatId: null, count: 0 });
  /** count of inbound messages received while scrolled up, shown on the jump-to-latest pill. */
  const [newBelowCount, setNewBelowCount] = useState(0);
  /** createdAt boundary for the "unread" separator, frozen when a conversation opens. */
  const [unreadMarkerAt, setUnreadMarkerAt] = useState<string | null>(null);
  /** true when the active conversation may have older messages to page in. */
  const [hasMore, setHasMore] = useState(false);
  /** true while an older-messages page is being fetched (top infinite scroll). */
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchScrollYRef = useRef<number | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<ConversationSummary | null>(null);
  const atBottomRef = useRef(true);
  const didInitialScrollRef = useRef<string | null>(null);
  /** Gate: only autoscroll on message appends AFTER the initial per-chat scroll has landed. */
  const initialScrollDoneRef = useRef(false);
  /** Mirrors unreadMarkerAt so the rAF scroll loop always reads the latest value, not a stale closure. */
  const unreadMarkerRef = useRef<string | null>(null);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  unreadMarkerRef.current = unreadMarkerAt;
  /** Mirror pagination flags so the scroll handler reads live values without re-binding. */
  const hasMoreRef = useRef(false);
  const loadingOlderRef = useRef(false);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  hasMoreRef.current = hasMore;
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  loadingOlderRef.current = loadingOlder;
  /** Anchor (oldest message id + its viewport top) captured before prepending older messages, to hold the viewport in place even if a new message lands at the bottom concurrently. */
  const prependAnchorRef = useRef<{ id: string; top: number } | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const pendingJumpRef = useRef<string | null>(null);
  const isResizingRef = useRef(false);
  const sidebarWidthRef = useRef(readSidebarWidth());
  /** Mirrors the message list so the scroll handler reads the current oldest message without re-binding. */
  const messagesRef = useRef<MessageData[]>([]);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  messagesRef.current = messages;
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  activeChatRef.current = activeChat;
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  atBottomRef.current = atBottom;

  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Floating Rnd window is desktop-only — force maximized below md.
  // Pip overlays stay floating on any viewport (stacked list ↔ chat).
  // Desktop float collapses back to the full /messages page on small screens.
  useEffect(() => {
    if (pip) return;
    if (desktopFloat) {
      const mq = window.matchMedia(DESKTOP_MD_QUERY);
      const sync = () => {
        if (!mq.matches) {
          const id = useUiStore.getState().wevChatFloatConversationId;
          closeWevChatDesktopFloat();
          navigate(id ? `/messages/${id}` : '/messages', { replace: true });
        }
      };
      sync();
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    const mq = window.matchMedia(DESKTOP_MD_QUERY);
    const sync = () => {
      if (!mq.matches) setWindowState('maximized');
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [pip, desktopFloat, closeWevChatDesktopFloat, navigate]);

  // Re-clamp chat-list width when the viewport shrinks (tablet / narrow desktop).
  useEffect(() => {
    const onResize = () => {
      setSidebarWidth((w) => clampSidebarWidth(w));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => () => {
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
  }, []);

  const stopSidebarResize = () => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isResizingRef.current || !layoutRef.current) return;
      // Only track the primary pointer (finger or mouse button that started the drag).
      const rect = layoutRef.current.getBoundingClientRect();
      const next = clampSidebarWidthInShell(e.clientX - rect.left, rect.width);
      setSidebarWidth(next);
    };

    // pointerup and pointercancel both end the drag — cancel fires on touch
    // interruption (phone call, scroll steal, etc.) where mouseup never would.
    const onPointerUp = () => stopSidebarResize();
    const onPointerCancel = () => stopSidebarResize();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      // Always release on unmount — prevents a permanently-stuck resize cursor
      // if the component unmounts mid-drag (navigation away, error boundary, etc.).
      stopSidebarResize();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
     
  }, []);

  const startSidebarResize = (e: React.PointerEvent) => {
    // Capture the pointer so pointermove/pointerup keep firing even when the
    // cursor leaves the handle element — identical to native drag behaviour.
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // ─── Scroll helpers ──────────────────────────────────────────────────────
  const NEAR_BOTTOM_PX = 120;
  /** Distance from the top that triggers loading the previous page of messages. */
  const LOAD_OLDER_PX = 200;
  /** Virtuoso firstItemIndex base; must stay positive after many prepends. */
  const VIRTUOSO_BASE_INDEX = 1_000_000;
  /** Server default page size (GET messages limit) — a full page implies more may exist. */
  const MESSAGE_PAGE_SIZE = 30;

  const bottomSettleRef = useRef(0);
  /** True while a jump-to-latest should keep winning over Virtuoso's estimated offset. */
  const stickToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  /** Ignore our own scrollToIndex moving upward for a moment so it cannot cancel the jump. */
  const ignoreUpwardScrollUntilRef = useRef(0);
  /**
   * Land on the TRUE bottom of the virtualized list. A smooth scrollToIndex targets estimated heights
   * (defaultItemHeight) and stops short once the real rows below are measured (2-3 messages hidden
   * under the composer). So: jump instantly to the last index, then re-pin the native scroller each
   * frame until scrollHeight stops growing and we are within 1px of the bottom.
   */
  const firstItemIndexRef = useRef(VIRTUOSO_BASE_INDEX);

  const applyPinned = useCallback((near: boolean) => {
    atBottomRef.current = near;
    setAtBottom((prev) => (prev === near ? prev : near));
    if (near) setNewBelowCount(0);
  }, []);

  const scrollToBottom = useCallback((_behavior: ScrollBehavior = 'auto') => {
    const count = messagesRef.current.length;
    const index = virtuosoBottomIndex(firstItemIndexRef.current, count);
    if (index == null) return;
    atBottomRef.current = true;
    stickToBottomRef.current = true;
    ignoreUpwardScrollUntilRef.current = performance.now() + 450;
    setNewBelowCount(0);
    virtuosoRef.current?.scrollToIndex({ index, align: 'end', behavior: 'auto' });
    virtuosoRef.current?.autoscrollToBottom();
    const token = ++bottomSettleRef.current;
    let frames = 0;
    let stable = 0;
    let lastHeight = -1;
    const settle = () => {
      if (token !== bottomSettleRef.current) return; // a newer request (or user scroll-up) superseded us
      const el = scrollContainerRef.current;
      if (!el) {
        if (++frames < 30) requestAnimationFrame(settle);
        return;
      }
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (gap > 1) el.scrollTop = el.scrollHeight;
      const pinned = listIsPinnedToBottom(el, NEAR_BOTTOM_PX) === true;
      // Don't publish "not at bottom" on the way down — that flashes the jump button
      // and clears the pin before the list has finished measuring.
      if (pinned) applyPinned(true);
      stable = el.scrollHeight === lastHeight && gap <= 1 ? stable + 1 : 0;
      lastHeight = el.scrollHeight;
      if (stable < 3 && ++frames < 30) requestAnimationFrame(settle);
      else if (!pinned) {
        stickToBottomRef.current = false;
        applyPinned(false);
      }
    };
    requestAnimationFrame(settle);
  }, [applyPinned]);

  const cancelBottomSettle = useCallback(() => {
    bottomSettleRef.current++;
    stickToBottomRef.current = false;
  }, []);
  const setVirtuosoScroller = useCallback((ref: HTMLElement | Window | null) => {
    scrollContainerRef.current = (ref && 'scrollTop' in ref ? ref : null) as HTMLDivElement | null;
  }, []);

  const firstItemIndex = VIRTUOSO_BASE_INDEX - (prepended.chatId === activeChat?.id ? prepended.count : 0);
  firstItemIndexRef.current = firstItemIndex;

  const followOutput = useCallback(
    (isAtBottom: boolean) => shouldFollowThreadOutput(isAtBottom, atBottomRef.current),
    [],
  );

  const computeMessageKey = useCallback(
    (_index: number, m: MessageData) => m.id || m.clientId || `idx-${_index}`,
    [],
  );

  /** Page in the previous batch of messages when the user scrolls near the top. */
  const loadOlderMessages = useCallback(() => {
    const el = scrollContainerRef.current;
    const current = activeChatRef.current;
    const oldest = messagesRef.current[0];
    if (!el || !current || !oldest || !oldest.id || loadingOlderRef.current || !hasMoreRef.current) return;
    setLoadingOlder(true);
    prependAnchorRef.current = null;
    wevchatApi.getMessages(current.id, oldest.createdAt).then((data) => {
      const older: MessageData[] = Array.isArray(data) ? data : [];
      if (activeChatRef.current?.id !== current.id) {
        prependAnchorRef.current = null;
        setLoadingOlder(false);
        return;
      }
      setHasMore(older.length >= MESSAGE_PAGE_SIZE);
      if (older.length === 0) {
        prependAnchorRef.current = null;
        setLoadingOlder(false);
        return;
      }
      const existing = new Set(messagesRef.current.map((m) => m.id));
      const fresh = older.filter((m) => !existing.has(m.id));
      if (fresh.length) {
        setPrepended((p) => ({ chatId: current.id, count: (p.chatId === current.id ? p.count : 0) + fresh.length }));
        setMessages((prev) => [...fresh, ...prev]);
      }
      setLoadingOlder(false);
    }).catch(() => {
      prependAnchorRef.current = null;
      setLoadingOlder(false);
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = listIsPinnedToBottom(el, NEAR_BOTTOM_PX);
    const movedUp = el.scrollTop + 8 < lastScrollTopRef.current;
    lastScrollTopRef.current = el.scrollTop;
    if (
      stickToBottomRef.current &&
      movedUp &&
      gap > NEAR_BOTTOM_PX &&
      performance.now() > ignoreUpwardScrollUntilRef.current
    ) {
      cancelBottomSettle();
    }
    if (pinned === true) {
      stickToBottomRef.current = true;
      applyPinned(true);
    } else if (pinned === false && !stickToBottomRef.current) {
      applyPinned(false);
    }
    if (el.scrollTop <= LOAD_OLDER_PX && hasMoreRef.current && !loadingOlderRef.current) {
      loadOlderMessages();
    }
  }, [applyPinned, cancelBottomSettle, loadOlderMessages]);

  const hasThreadMessages = messages.length > 0;
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => handleScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [handleScroll, activeChat?.id, hasThreadMessages]);

  /** Scroll a message into view and pulse-highlight it (reply-quote / unread jump). */
  const jumpToMessage = useCallback((messageId: string) => {
    const el = scrollContainerRef.current?.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (!el) {
      toast('Message not in view yet — scroll up to load it');
      return;
    }
    stickToBottomRef.current = false;
    cancelBottomSettle();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(messageId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedId(null), 1800);
  }, [cancelBottomSettle]);

  const handleJumpToDate = useCallback(async (date: string) => {
    if (!activeChatRef.current) return;
    const conversationId = activeChatRef.current.id;
    const local = messagesRef.current?.find((m) => (m.createdAt || '').slice(0, 10) === date);
    if (local) {
      jumpToMessage(local.id);
      return;
    }
    try {
      const msg = await wevchatApi.getMessageOnDate(conversationId, date);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())));
      setTimeout(() => jumpToMessage(msg.id), 80);
    } catch {
      toast.error('No messages on that date');
    }
  }, [jumpToMessage]);

  const hasSelection = Boolean(activeChat);
  // Wide shells get an Instagram-style two-pane layout even before a chat is picked.
  const [shellWide, setShellWide] = useState(false);
  useEffect(() => {
    const el = layoutRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setShellWide(entry.contentRect.width >= 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /** Mobile: conversation covers the screen. Desktop: CSS keeps list visible alongside it. */
  const mobileConversationVisible = hasSelection && isChatOpen;

  useEffect(() => {
    setIsChatActive(mobileConversationVisible);
    return () => setIsChatActive(false);
  }, [mobileConversationVisible, setIsChatActive]);

  // Soft-keyboard: track visualViewport so the open-chat shell fits the visible area.
  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    if (!mobileConversationVisible) {
      el.style.removeProperty('--wevchat-vvh');
      el.classList.remove('wevchat-shell--chat-open');
      return;
    }
    el.classList.add('wevchat-shell--chat-open');
    const vv = window.visualViewport;
    let lastH = -1;
    const apply = () => {
      const h = Math.round(vv?.height ?? window.innerHeight);
      if (h === lastH) return;
      lastH = h;
      el.style.setProperty('--wevchat-vvh', `${h}px`);
      // Keyboard open/close or browser-bar resize: if the user was at the bottom, keep the last message visible.
      if (atBottomRef.current && initialScrollDoneRef.current) {
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    };
    apply();
    vv?.addEventListener('resize', apply);
    window.addEventListener('resize', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      window.removeEventListener('resize', apply);
      el.style.removeProperty('--wevchat-vvh');
      el.classList.remove('wevchat-shell--chat-open');
    };
  }, [mobileConversationVisible]);

  const clearChatUrl = useCallback(() => {
    writeStoredActiveChatId(null);
    if (desktopFloat) {
      setWevChatFloatConversationId(null);
      return;
    }
    if (!conversationIdParam) return;
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/messages', { replace: true });
  }, [conversationIdParam, navigate, desktopFloat, setWevChatFloatConversationId]);

  const closeConversationMobile = () => {
    setIsChatOpen(false);
    setShowCallMenu(false);
    clearChatUrl();
  };

  const loadConversations = useCallback((_silent = false) => {
    wevchatApi.getConversations().then((data) => {
      if (!Array.isArray(data)) return;
      setWevChatDisabled(false);
      setConversations(data.map((c: ConversationSummary) => normalizeConversation(c, user?.id)));
      setConversationsLoaded(true);
      // Keep the open conversation (and thus the info drawer) in sync with membership,
      // group name/photo, and role changes without forcing a re-select.
      const current = activeChatRef.current;
      if (current) {
        const fresh = data.find((c: ConversationSummary) => c.id === current.id);
        if (fresh) setActiveChat(normalizeConversation(fresh, user?.id));
      }
    }).catch((err) => {
      const code = err instanceof WevChatApiError ? err.code : (err as any)?.code;
      if (code === 'WEVCHAT_DISABLED' || code === 'WEVCHAT_DISABLED_BY_ADMIN') {
        setWevChatDisabled(true);
        setWevChatDisabledMessage(err?.message || 'Wev Chat is disabled');
        setConversations([]);
        setActiveChat(null);
        return;
      }
      setConversationsLoaded(true);
      console.error('Failed to load conversations', err);
    });
  }, [user?.id]);

  const loadMessageRequests = useCallback((_reset = true) => {
    setRequestsLoading(true);
    wevchatApi.getMessageRequests()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMessageRequests(list.map((c: ConversationSummary) => normalizeConversation(c, user?.id)));
      })
      .catch((err) => {
        console.error('Failed to load message requests', err);
        setMessageRequests([]);
      })
      .finally(() => setRequestsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    loadConversations(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadMessageRequests();
  }, [loadConversations, loadMessageRequests]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (activeTab === 'Requests') loadMessageRequests();
  }, [activeTab, loadMessageRequests]);

  const acceptMessageRequest = async (chat: ConversationSummary) => {
    setRequestBusyId(chat.id);
    try {
      await wevchatApi.acceptMessageRequest(chat.id);
      setMessageRequests((prev) => prev.filter((c) => c.id !== chat.id));
      loadConversations(true);
      toast.success('Request accepted');
      selectChat({ ...chat, inboxState: 'active', unreadCount: chat.unreadCount ?? 0 }, activeChat?.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not accept request');
    } finally {
      setRequestBusyId(null);
    }
  };

  const declineMessageRequest = async (chat: ConversationSummary) => {
    setRequestBusyId(chat.id);
    try {
      await wevchatApi.declineMessageRequest(chat.id);
      setMessageRequests((prev) => prev.filter((c) => c.id !== chat.id));
      if (activeChat?.id === chat.id) {
        setActiveChat(null);
        setIsChatOpen(false);
        clearChatUrl();
      }
      toast.success('Request deleted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not delete request');
    } finally {
      setRequestBusyId(null);
    }
  };

  const applyPrivateChatState = useCallback((
    conversationId: string,
    privateChat: ConversationSummary['privateChat'],
  ) => {
    setConversations((prev) => prev.map((c) => (
      c.id === conversationId ? { ...c, privateChat } : c
    )));
    if (activeChatRef.current?.id === conversationId) {
      setActiveChat((prev) => (prev ? { ...prev, privateChat } : prev));
    }
  }, []);

  // ─── Select a conversation: join room, load history, mark read ─────────
  const selectChat = useCallback(async (chat: ConversationSummary, prevChatId?: string) => {
    const normalized = normalizeConversation(chat, user?.id);
    if (prevChatId) socket.emit('leave-conversation', prevChatId);
    socket.emit('join-conversation', normalized.id);
    setActiveChat(normalized);
    setIsChatOpen(true);
    setShowCallMenu(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setShowPinnedList(false);
    writeStoredActiveChatId(normalized.id);
    if (desktopFloat) {
      setWevChatFloatConversationId(normalized.id);
      // Keep window size stable when opening a conversation (list ↔ chat).
    } else if (!pip && !embedded && conversationIdParam !== normalized.id) {
      navigate(`/messages/${normalized.id}`);
    }
    setReplyingTo(null);
    setEditingMessage(null);
    setTypingUsers({});
    setConversationMedia([]);
    setNewBelowCount(0);
    setAtBottom(true);
    stickToBottomRef.current = true;
    atBottomRef.current = true;
    setUnreadMarkerAt(null);
    setHasMore(false);
    setLoadingOlder(false);
    prependAnchorRef.current = null;
    didInitialScrollRef.current = null;
    initialScrollDoneRef.current = false;
    setLoadingMessages(true);
    setPinnedMessages([]);
    setScheduledMessages([]);
    // ── Fire all 4 chat-init requests in parallel (was sequential: ~3× slower) ──
    const [, pinnedData, scheduledData, messagesData] = await Promise.allSettled([
      wevchatApi.getPrivateChat(normalized.id).then((state) => {
        if (activeChatRef.current?.id !== normalized.id) return;
        applyPrivateChatState(normalized.id, {
          active: !!state?.active,
          session: state?.session ?? null,
        });
      }).catch(() => { }),
      wevchatApi.getPinned(normalized.id),
      wevchatApi.getScheduled(normalized.id),
      wevchatApi.getMessages(normalized.id),
    ]);

    // Pinned messages
    if (pinnedData.status === 'fulfilled' && Array.isArray(pinnedData.value)) {
      if (activeChatRef.current?.id === normalized.id) setPinnedMessages(pinnedData.value);
    } else {
      setPinnedMessages([]);
    }

    // Scheduled messages
    if (scheduledData.status === 'fulfilled' && Array.isArray(scheduledData.value)) {
      if (activeChatRef.current?.id === normalized.id) setScheduledMessages(scheduledData.value);
    } else {
      setScheduledMessages([]);
    }

    // Messages history
    if (messagesData.status === 'fulfilled') {
      const list: MessageData[] = Array.isArray(messagesData.value) ? messagesData.value : [];
      if (activeChatRef.current?.id !== normalized.id) return;
      setMessages(list);
      setHasMore(list.length >= MESSAGE_PAGE_SIZE);
      setLoadingMessages(false);
      if (normalized.unreadCount > 0) {
        const firstUnread = list.find((m) => m.senderId !== user?.id);
        const idx = normalized.unreadCount <= list.length ? list.length - normalized.unreadCount : 0;
        const boundary = list[idx] && list[idx].senderId !== user?.id ? list[idx] : firstUnread;
        setUnreadMarkerAt(boundary?.id ?? null);
      } else {
        setUnreadMarkerAt(null);
      }
      wevchatApi.markRead(normalized.id).catch(() => { });
      setConversations((prev) => prev.map((c) => (c.id === normalized.id ? { ...c, unreadCount: 0 } : c)));
      if (pendingJumpRef.current) {
        const jumpId = pendingJumpRef.current;
        pendingJumpRef.current = null;
        didInitialScrollRef.current = normalized.id;
        initialScrollDoneRef.current = true;
        setTimeout(() => jumpToMessage(jumpId), 250);
      }
    } else {
      if (activeChatRef.current?.id === normalized.id) {
        setMessages([]);
        setLoadingMessages(false);
        setUnreadMarkerAt(null);
      }
    }
  }, [socket, user?.id, navigate, conversationIdParam, applyPrivateChatState, pip, desktopFloat, embedded, setWevChatFloatConversationId]);

  // Restore open conversation after refresh (/messages/:conversationId) or desktop float.
  // First open from nav clears float conversation id — stay on the profiles list.
  useEffect(() => {
    const targetId = conversationIdParam
      || (desktopFloat ? wevChatFloatConversationId : null);
    if (conversations.length === 0 || !targetId) return;
    if (activeChatRef.current?.id === targetId) {
      setIsChatOpen(true);
      return;
    }
    const found = conversations.find((c) => c.id === targetId);
    if (found) {
      selectChat(found);
      return;
    }
    if (!desktopFloat) {
      writeStoredActiveChatId(null);
      navigate('/messages', { replace: true });
    }
  }, [conversations, conversationIdParam, wevChatFloatConversationId, desktopFloat, selectChat, navigate]);

  useEffect(() => {
    if (!showCallMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        callMenuRef.current &&
        !callMenuRef.current.contains(target) &&
        callMenuButtonRef.current &&
        !callMenuButtonRef.current.contains(target)
      ) {
        setShowCallMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCallMenu]);

  // Initial jump when a conversation's history loads: to the first unread if any, else bottom.
  // A fresh navigation can paint before the flex column resolves the scroll viewport's height,
  // and the target bubbles mount a frame or two after the effect fires — so a single rAF can run
  // against a zero-height container or missing target and no-op. We drive a self-perpetuating rAF
  // loop keyed to the chat id: it is NOT torn down by the effect cleanup (which would cancel it
  // under StrictMode double-invoke / rapid dep changes), and it stops itself once the scroll lands
  // or the chat changes. Reads unreadMarkerRef so it always sees the latest boundary.
  useEffect(() => {
    if (loadingMessages || !activeChat) return;
    if (didInitialScrollRef.current === activeChat.id) return;
    didInitialScrollRef.current = activeChat.id;

    const chatId = activeChat.id;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    let timer: ReturnType<typeof setTimeout>;

    // Driven by setTimeout, not requestAnimationFrame: rAF callbacks are paused while the tab is
    // hidden, which would leave the thread stuck at the top if a chat is opened in a background
    // tab. setTimeout still fires (throttled) when hidden, so the initial scroll always lands.
    const run = () => {
      if (activeChatRef.current?.id !== chatId) return;
      if (initialScrollDoneRef.current) return;

      const container = scrollContainerRef.current;
      const laidOut = !!container && container.clientHeight > 0;
      const marker = unreadMarkerRef.current;
      const target = laidOut && marker
        ? container!.querySelector(`[data-message-id="${CSS.escape(marker)}"]`)
        : null;
      const bottomReady = laidOut && !marker && messagesRef.current.length > 0;

      if (target) {
        target.scrollIntoView({ block: 'center' });
        initialScrollDoneRef.current = true;
        stickToBottomRef.current = false;
        handleScroll();
        return;
      }
      if (bottomReady) {
        scrollToBottom('auto');
        initialScrollDoneRef.current = true;
        handleScroll();
        return;
      }
      if (attempts++ < MAX_ATTEMPTS) {
        timer = setTimeout(run, 16);
      } else if (container) {
        // Give up waiting for the target; land at bottom so the newest message is visible.
        scrollToBottom('auto');
        initialScrollDoneRef.current = true;
        handleScroll();
      }
    };

    timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
     
  }, [loadingMessages, activeChat?.id]);

  // After prepending an older page, restore the viewport so the messages the user was reading
  // stay put instead of jumping. Anchoring to the oldest previously-rendered bubble (rather than a
  // raw scrollHeight delta) keeps the position correct even if a new message lands at the bottom in
  // the same commit. Runs synchronously before paint, so there is no visible flit.
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    const anchor = prependAnchorRef.current;
    if (el && anchor) {
      const anchorEl = el.querySelector(`[data-message-id="${CSS.escape(anchor.id)}"]`);
      if (anchorEl) {
        const delta = anchorEl.getBoundingClientRect().top - anchor.top;
        if (delta !== 0) el.scrollTop += delta;
      }
      prependAnchorRef.current = null;
    }
  }, [messages]);

  const tailMessageId = messages.length > 0 ? messages[messages.length - 1]?.id ?? null : null;
  // A new tail (incoming or our own send) should stay in view when the reader is already
  // at the bottom. Virtuoso's followOutput skips this while it still thinks the list is short.
  useLayoutEffect(() => {
    if (!tailMessageId || !initialScrollDoneRef.current || !atBottomRef.current) return;
    scrollToBottom('auto');
  }, [tailMessageId, scrollToBottom]);

  // Autoscroll on new messages only after the initial scroll has landed, and only when near the bottom.
  // (Handled by Virtuoso's followOutput: when the user is at the bottom, a new message keeps the view
  // pinned. A second delayed smooth scroll here used to fight it and make the thread jump.)

  // ─── Optimistic send reconciliation ─────────────────────────────────────
  // Merge a server message (from POST ack or socket echo) with any optimistic placeholder.
  const reconcileServerMessage = useCallback((serverMsg: MessageData & { conversationId?: string }) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === serverMsg.id && !m.clientId)) return prev; // already reconciled
      const idx = prev.findIndex((m) => m.clientId && m.senderId === serverMsg.senderId && sameContent(m, serverMsg));
      if (idx !== -1) {
        const next = prev.slice();
        const optimistic = prev[idx];
        next[idx] = {
          ...serverMsg,
          text: optimistic.text || serverMsg.text,
          clientId: undefined,
          status: serverMsg.status || 'sent',
          sendPayload: undefined,
        };
        return next;
      }
      return [...prev, serverMsg];
    });
  }, []);

  const postSend = useCallback((payload: Record<string, any>, clientId: string) => {
    wevchatApi.sendMessage(payload)
      .then((res) => { if (res && res.id) reconcileServerMessage(res); })
      .catch((error: any) => {
        setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m)));
        toast.error(error?.message || 'Failed to send message');
      });
  }, [reconcileServerMessage]);

  // ─── Socket event wiring ────────────────────────────────────────────────
  useEffect(() => {
    const onNewMessage = (msg: MessageData & { conversationId: string }) => {
      const current = activeChatRef.current;
      // A message from someone means they are active; re-sync so the dot follows
      // the server (which respects their privacy) instead of a missed live event.
      if (msg?.senderId && msg.senderId !== user?.id) socket?.emit('presence:sync');
      if (current && (msg as any).conversationId === current.id) {
        reconcileServerMessage(msg);
        if (msg.privateSessionId && !current.privateChat?.active) {
          applyPrivateChatState(current.id, {
            active: true,
            session: current.privateChat?.session ?? {
              id: msg.privateSessionId,
              conversationId: current.id,
              startedById: msg.senderId,
              startedAt: msg.createdAt,
              status: 'ACTIVE',
              active: true,
            },
          });
        }
        if (!atBottomRef.current && msg.senderId !== user?.id) {
          setNewBelowCount((c) => c + 1);
        }
        markReadDebounced(current.id);
      }
      // Surgically update the conversation list instead of a full network refetch.
      // Bumps lastMessage, updatedAt and unreadCount for the affected conversation,
      // then moves it to the top — no API round-trip needed.
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === (msg as any).conversationId);
        if (idx === -1) {
          // Unknown conversation (e.g. brand-new DM) — do a full refresh.
          loadConversations(true);
          return prev;
        }
        const isActive = activeChatRef.current?.id === (msg as any).conversationId;
        const updated = prev.slice();
        updated[idx] = {
          ...updated[idx],
          lastMessage: msg as any,
          updatedAt: msg.createdAt,
          // Don't increment unread when the conversation is open (already marked read).
          unreadCount: isActive ? 0 : (updated[idx].unreadCount ?? 0) + (msg.senderId !== user?.id ? 1 : 0),
        };
        // Float updated conversation to the top.
        const [bumped] = updated.splice(idx, 1);
        return [bumped, ...updated];
      });
    };
    const onEditMessage = (msg: MessageData) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    const onDeleteMessage = (msg: MessageData) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    const onPinMessage = (msg: MessageData) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      setPinnedMessages((prev) => {
        if (msg.isPinned) return [msg, ...prev.filter((m) => m.id !== msg.id)];
        return prev.filter((m) => m.id !== msg.id);
      });
    };
    const onReaction = (data: { messageId: string; userId: string; emoji: string | null }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== data.messageId) return m;
        const reactions = (m.reactions || []).filter((r) => r?.userId !== data.userId);
        if (data.emoji) reactions.push({ userId: data.userId, emoji: data.emoji });
        return { ...m, reactions };
      }));
    };
    const onTyping = (data: { conversationId: string; senderId: string; senderName?: string; activityVisible?: boolean }) => {
      if (activeChatRef.current?.id === data.conversationId && data.senderId !== user?.id) {
        setTypingUsers((prev) => ({ ...prev, [data.senderId]: data.senderName || 'Someone' }));
        // Typing implies active, unless this person hides their online status.
        if (typingMarksPeerActive(data.activityVisible)) {
          track.note(data.senderId, true);
          const userId = data.senderId;
          setOnlineUserIds((prev) => (prev.has(userId) ? prev : new Set(prev).add(userId)));
        }
      }
    };
    const onStopTyping = (data: { conversationId: string; senderId: string }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[data.senderId];
        return next;
      });
    };
    const onReadReceipt = (data: { conversationId: string; userId: string; readAt: string }) => {
      // Ignore our own echoed receipt: a receipt marks MY messages "read" only when the OTHER party reads.
      if (activeChatRef.current?.id === data.conversationId && data.userId !== user?.id) {
        setMessages((prev) => prev.map((m) => (
          m.senderId === user?.id && m.status !== 'sending' && m.status !== 'failed'
            ? { ...m, status: 'read' }
            : m
        )));
      }
    };
    const track = presenceTrackRef.current;
    const onUserOnline = (data: { userId?: string }) => {
      if (!data?.userId) return;
      track.note(data.userId, true);
      const userId = data.userId;
      setOnlineUserIds((prev) => new Set(prev).add(userId));
    };
    const onUserOffline = (data: { userId?: string }) => {
      if (!data?.userId) return;
      track.note(data.userId, false);
      const userId = data.userId;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };
    const onConversationChange = () => loadConversations(true);

    const onScheduledCreated = (row: ScheduledMessageItem) => {
      if (activeChatRef.current?.id !== row.conversationId) return;
      setScheduledMessages((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row].sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()));
    };
    const onScheduledUpdated = (row: ScheduledMessageItem) => {
      setScheduledMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
    };
    const onScheduledCancelled = (data: { id: string; conversationId: string }) => {
      setScheduledMessages((prev) => prev.filter((m) => m.id !== data.id));
    };
    const onScheduledSent = (data: { id: string; conversationId: string; message?: MessageData }) => {
      setScheduledMessages((prev) => prev.filter((m) => m.id !== data.id));
      if (data.message && activeChatRef.current?.id === data.conversationId) {
        reconcileServerMessage(data.message);
      }
    };

    const onPrivateSessionStarted = (data: {
      conversationId: string;
      session: NonNullable<ConversationSummary['privateChat']>['session'];
      startedById: string;
    }) => {
      applyPrivateChatState(data.conversationId, { active: true, session: data.session });
      if (data.startedById !== user?.id) {
        toast('🔒 Private Chat is ON');
      }
    };

    const onPrivateSessionEnded = (data: {
      conversationId: string;
      sessionId: string;
      messageIds?: string[];
      endedById?: string;
    }) => {
      applyPrivateChatState(data.conversationId, { active: false, session: null });
      if (activeChatRef.current?.id === data.conversationId) {
        const endedIds = new Set(data.messageIds || []);
        setMessages((prev) => prev.filter((m) => {
          if (endedIds.size && endedIds.has(m.id)) return false;
          if (m.privateSessionId && m.privateSessionId === data.sessionId) return false;
          return true;
        }));
      }
      if (data.endedById !== user?.id) {
        toast('Private Chat ended');
      }
      loadConversations(true);
    };

    const onPrivateMessageSent = (msg: MessageData & { conversationId: string }) => {
      const current = activeChatRef.current;
      if (current && msg.conversationId === current.id) {
        reconcileServerMessage(msg);
      }
    };

    const onOnlineList = (ids: unknown) => {
      const list = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
      setOnlineUserIds(track.applySnapshot(list));
      setPresenceKnown(true);
    };

    if (!socket) return;
    const requestPresence = () => socket.emit('presence:sync');
    // On (re)connect, the socket has left every room it was in, so conversation-scoped events
    // (new-message/typing/read-receipt) stop arriving. Re-join the active conversation room and
    // catch up on anything missed while offline, reconciling against optimistic/failed messages.
    const onReconnect = () => {
      requestPresence();
      loadConversations(true);
      const current = activeChatRef.current;
      if (!current) return;
      socket.emit('join-conversation', current.id);
      wevchatApi.getPrivateChat(current.id).then((state) => {
        if (activeChatRef.current?.id !== current.id) return;
        applyPrivateChatState(current.id, {
          active: !!state?.active,
          session: state?.session ?? null,
        });
      }).catch(() => { });
      wevchatApi.getMessages(current.id).then((data) => {
        if (activeChatRef.current?.id !== current.id) return;
        const server: MessageData[] = Array.isArray(data) ? data : [];
        // Replace with server list so ended private-session messages disappear.
        setMessages(server);
        markReadDebounced(current.id);
        wevchatApi.getScheduled(current.id).then((rows) => {
          if (activeChatRef.current?.id !== current.id) return;
          if (Array.isArray(rows)) setScheduledMessages(rows);
        }).catch(() => { });
      }).catch(() => { });
    };

    if (!socket) return;
    socket.on('connect', onReconnect);
    socket.on('new-message', onNewMessage);
    socket.on('edit-message', onEditMessage);
    socket.on('delete-message', onDeleteMessage);
    socket.on('pin-message', onPinMessage);
    socket.on('message-reaction', onReaction);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);
    socket.on('read-receipt', onReadReceipt);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('conversation-created', onConversationChange);
    socket.on('conversation-updated', onConversationChange);
    socket.on('member-left', onConversationChange);
    socket.on('presence:online-list', onOnlineList);
    socket.on('scheduled-created', onScheduledCreated);
    socket.on('scheduled-updated', onScheduledUpdated);
    socket.on('scheduled-cancelled', onScheduledCancelled);
    socket.on('scheduled-sent', onScheduledSent);
    socket.on('PRIVATE_SESSION_STARTED', onPrivateSessionStarted);
    socket.on('PRIVATE_SESSION_ENDED', onPrivateSessionEnded);
    socket.on('PRIVATE_MESSAGE_SENT', onPrivateMessageSent);
    requestPresence();
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) requestPresence();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Safety net: converge on server truth even if a live event was missed.
    const presenceTimer = window.setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && socket.connected) requestPresence();
    }, 45_000);

    return () => {
      window.clearInterval(presenceTimer);
      document.removeEventListener('visibilitychange', onVisible);
      socket.off('connect', onReconnect);
      socket.off('new-message', onNewMessage);
      socket.off('edit-message', onEditMessage);
      socket.off('delete-message', onDeleteMessage);
      socket.off('pin-message', onPinMessage);
      socket.off('message-reaction', onReaction);
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
      socket.off('read-receipt', onReadReceipt);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('conversation-created', onConversationChange);
      socket.off('conversation-updated', onConversationChange);
      socket.off('member-left', onConversationChange);
      socket.off('presence:online-list', onOnlineList);
      socket.off('scheduled-created', onScheduledCreated);
      socket.off('scheduled-updated', onScheduledUpdated);
      socket.off('scheduled-cancelled', onScheduledCancelled);
      socket.off('scheduled-sent', onScheduledSent);
      socket.off('PRIVATE_SESSION_STARTED', onPrivateSessionStarted);
      socket.off('PRIVATE_SESSION_ENDED', onPrivateSessionEnded);
      socket.off('PRIVATE_MESSAGE_SENT', onPrivateMessageSent);
    };
  }, [socket, user?.id, loadConversations, reconcileServerMessage, applyPrivateChatState]);

  // ─── Composer actions ───────────────────────────────────────────────────
  /** Insert an optimistic bubble, fire the send, and reconcile/fail via postSend. */
  const dispatchOptimistic = useCallback((payload: Record<string, any>, preview: Partial<MessageData>) => {
    if (!user) return;
    const clientId = makeClientId();
    const optimistic: MessageData = {
      id: clientId,
      clientId,
      senderId: user.id,
      sender: { id: user.id, name: user.name, avatar: user.avatar },
      createdAt: new Date().toISOString(),
      status: 'sending',
      sendPayload: payload,
      replyTo: replyingTo || null,
      ...preview,
    };
    setMessages((prev) => [...prev, optimistic]);
    setAtBottom(true);
    scrollToBottom('auto');
    postSend(payload, clientId);
  }, [user, replyingTo, postSend, scrollToBottom]);

  const handleSendMessage = async (text: string) => {
    if (!activeChat) return;
    const privateSessionId = activeChat.privateChat?.active
      ? activeChat.privateChat.session?.id ?? null
      : null;
    dispatchOptimistic(
      {
        conversationId: activeChat.id,
        text,
        replyId: replyingTo?.id,
        receiverId: activeChat.otherUser?.id,
      },
      { text, privateSessionId },
    );
    setReplyingTo(null);
  };

  const handleSendMedia = (media: {
    url: string;
    mediaType: string;
    fileName: string;
    fileSize: number;
    text?: string;
    storageProvider?: string | null;
    driveFileId?: string | null;
  }) => {
    if (!activeChat) return;
    const privateSessionId = activeChat.privateChat?.active
      ? activeChat.privateChat.session?.id ?? null
      : null;
    const payload: Record<string, any> = {
      conversationId: activeChat.id,
      receiverId: activeChat.otherUser?.id,
      fileName: media.fileName,
      fileSize: media.fileSize,
      mediaType: media.mediaType,
    };
    const preview: Partial<MessageData> = {
      fileName: media.fileName,
      mediaType: media.mediaType,
      privateSessionId,
    };
    if (media.text) {
      payload.text = media.text;
      preview.text = media.text;
    }
    if (media.mediaType === 'image') { payload.imageUrl = media.url; preview.imageUrl = media.url; }
    else if (media.mediaType === 'video') { payload.videoUrl = media.url; preview.videoUrl = media.url; }
    else if (media.mediaType === 'audio') { payload.audioUrl = media.url; preview.audioUrl = media.url; }
    else { payload.fileUrl = media.url; preview.fileUrl = media.url; }
    if (media.driveFileId || (media.url && media.url.startsWith('drive-pending:'))) {
      payload.driveFileId = media.driveFileId || media.url.replace(/^drive-pending:/, '');
      payload.storageProvider = media.storageProvider || 'GOOGLE_DRIVE';
    }
    dispatchOptimistic(payload, preview);
  };

  const handleSendGenerate = (prompt: string) => {
    if (!activeChat) return;
    dispatchOptimistic(
      {
        conversationId: activeChat.id,
        text: prompt,
        mediaType: 'ai_generation',
        fileName: `ai:${prompt.slice(0, 80)}`,
        isAiGenerated: true,
        receiverId: activeChat.otherUser?.id,
      },
      { text: prompt, mediaType: 'ai_generation', isAiGenerated: true },
    );
  };

  const handleSendPoll = async (data: { question: string; options: string[] }) => {
    if (!activeChat || !user) return;
    const token = useStore.getState().token;
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ question: data.question, options: data.options }),
      });
      const poll = await res.json();
      if (!res.ok || !poll?.id) {
        toast.error(poll.error || 'Could not create poll');
        return;
      }
      dispatchOptimistic(
        {
          conversationId: activeChat.id,
          text: poll.question,
          mediaType: 'poll',
          fileName: `poll:${poll.id}`,
          receiverId: activeChat.otherUser?.id,
        },
        {
          text: poll.question,
          mediaType: 'poll',
          fileName: `poll:${poll.id}`,
          poll: {
            id: poll.id,
            question: poll.question,
            totalVotes: 0,
            userVotes: [],
            options: (poll.options || []).map((o: any) => ({ id: o.id, text: o.text, voteCount: 0, percentage: 0 })),
          },
        },
      );
    } catch {
      toast.error('Could not create poll');
    }
  };

  const handleSendEvent = (data: { eventId: string; title: string; image?: string | null }) => {
    if (!activeChat) return;
    dispatchOptimistic(
      {
        conversationId: activeChat.id,
        text: data.title,
        mediaType: 'event',
        fileName: `event:${data.eventId}`,
        imageUrl: data.image || undefined,
        receiverId: activeChat.otherUser?.id,
      },
      { text: data.title, mediaType: 'event', fileName: `event:${data.eventId}`, imageUrl: data.image || undefined },
    );
  };

  const handleScheduleMessage = async (text: string, scheduledFor: string) => {
    if (!activeChat) return;
    try {
      const row = await wevchatApi.scheduleMessage({
        conversationId: activeChat.id,
        text,
        scheduledFor,
        replyId: replyingTo?.id,
      });
      if (row?.id) {
        setScheduledMessages((prev) => [...prev.filter((m) => m.id !== row.id), row].sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()));
      }
      setReplyingTo(null);
      const when = new Date(scheduledFor);
      toast.success(`Scheduled for ${when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    } catch (e: any) {
      toast.error(e.message || 'Could not schedule message');
    }
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      await wevchatApi.cancelScheduled(id);
      setScheduledMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success('Scheduled message cancelled');
    } catch (e: any) {
      toast.error(e.message || 'Could not cancel');
    }
  };

  const handleUpdateScheduled = async (id: string, payload: { text?: string; scheduledFor?: string }) => {
    try {
      const updated = await wevchatApi.updateScheduled(id, payload);
      setScheduledMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      toast.success('Scheduled message updated');
    } catch (e: any) {
      toast.error(e.message || 'Could not update');
      throw e;
    }
  };

  const handleSendScheduledNow = async (id: string) => {
    try {
      const sent = await wevchatApi.sendScheduledNow(id);
      setScheduledMessages((prev) => prev.filter((m) => m.id !== id));
      if (sent?.id) reconcileServerMessage(sent);
      toast.success('Sent now');
    } catch (e: any) {
      toast.error(e.message || 'Could not send now');
    }
  };

  /** Retry a failed optimistic send: flip back to sending and re-POST the stored payload. */
  const handleRetry = useCallback((m: MessageData) => {
    if (!m.clientId || !m.sendPayload) return;
    setMessages((prev) => prev.map((msg) => (msg.clientId === m.clientId ? { ...msg, status: 'sending' } : msg)));
    postSend(m.sendPayload as Record<string, any>, m.clientId);
  }, [postSend]);

  const handleTyping = () => {
    if (!activeChat || !user) return;
    socket.emit('typing', { conversationId: activeChat.id, senderId: user?.id, senderName: user?.name });
  };
  const handleStopTyping = () => {
    if (!activeChat || !user) return;
    socket.emit('stop_typing', { conversationId: activeChat.id, senderId: user?.id });
  };

  const handleTogglePrivateChat = async (enabled: boolean) => {
    if (!activeChat) return;
    try {
      const updated = await wevchatApi.togglePrivateChat(activeChat.id, enabled);
      const privateChat = {
        active: !!updated?.active,
        session: updated?.session ?? null,
      };
      applyPrivateChatState(activeChat.id, privateChat);
      toast.success(privateChat.active ? '🔒 Private Chat is ON' : 'Private Chat ended');
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle Private Chat');
    }
  };

  const handleEditSubmit = async (text: string) => {
    if (!editingMessage) return;
    try {
      await wevchatApi.editMessage(editingMessage.id, text);
      setEditingMessage(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteMessage = async (m: MessageData) => {
    setDeleteConfirm({ m, everyone: true });
  };
  const handleDeleteForMe = async (m: MessageData) => {
    setDeleteConfirm({ m, everyone: false });
  };
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { m, everyone } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (everyone) await wevchatApi.deleteMessage(m.id);
      else {
        await wevchatApi.deleteForMe(m.id);
        setMessages((prev) => prev.filter((msg) => msg.id !== m.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(m.id);
          return next;
        });
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handlePin = async (m: MessageData) => {
    try {
      const updated = await wevchatApi.pinMessage(m.id);
      const nextPinned = !!updated?.isPinned;
      setMessages((prev) => prev.map((msg) => (msg.id === m.id ? { ...msg, isPinned: nextPinned } : msg)));
      if (activeChat) {
        wevchatApi.getPinned(activeChat.id).then((data) => {
          if (Array.isArray(data)) setPinnedMessages(data);
        }).catch(() => { });
      }
      toast.success(nextPinned ? 'Pinned' : 'Unpinned');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleStar = async (m: MessageData) => {
    const isStarred = m.starredBy?.some((s) => s?.userId === user?.id);
    try {
      if (isStarred) await wevchatApi.unstarMessage(m.id);
      else await wevchatApi.starMessage(m.id);
      setMessages((prev) => prev.map((msg) => {
        if (msg.id !== m.id) return msg;
        const starredBy = isStarred ? (msg.starredBy || []).filter((s) => s?.userId !== user?.id) : [...(msg.starredBy || []), { userId: user!.id }];
        return { ...msg, starredBy };
      }));
      toast.success(isStarred ? 'Unstarred' : 'Starred');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleReact = async (m: MessageData, emoji: string) => {
    try {
      await wevchatApi.reactToMessage(m.id, emoji);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleForward = (m: MessageData) => {
    setForwardingMessage(m);
    setForwardingBatch([m]);
    setForwardTargets(new Set());
  };

  const submitForward = async () => {
    const targets = Array.from(forwardTargets);
    const batch = forwardingBatch.length ? forwardingBatch : (forwardingMessage ? [forwardingMessage] : []);
    if (!targets.length || !batch.length) {
      toast.error('Select at least one chat');
      return;
    }
    try {
      for (const targetConversationId of targets) {
        for (const msg of batch) {
          await wevchatApi.sendMessage({
            conversationId: targetConversationId,
            text: msg.text,
            imageUrl: msg.imageUrl,
            videoUrl: msg.videoUrl,
            audioUrl: msg.audioUrl,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            mediaType: msg.mediaType,
            forwardId: msg.id,
          });
        }
      }
      toast.success(`Forwarded to ${targets.length} chat${targets.length > 1 ? 's' : ''}`);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || 'Failed to forward message');
    } finally {
      setForwardingMessage(null);
      setForwardingBatch([]);
      setForwardTargets(new Set());
    }
  };

  const handleShare = async (m: MessageData) => {
    const url = extractFirstUrl(m.text) || m.imageUrl || m.videoUrl || m.fileUrl || '';
    const text = m.text || m.fileName || 'Shared from Wev Chat';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'Wevsoft message',
          text,
          url: url || undefined,
        });
        return;
      }
    } catch {
      /* user cancelled or unsupported */
    }
    // Fallback: open forward picker
    handleForward(m);
  };

  const handleReport = (m: MessageData) => {
    setReportingMessage(m);
  };

  const submitReport = async (reason: string, description?: string) => {
    if (!reportingMessage) return;
    try {
      await wevchatApi.reportMessage(reportingMessage.id, reason, description);
      toast.success('Message reported to moderators');
      setReportingMessage(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const enterSelection = (m: MessageData) => {
    setSelectionMode(true);
    setSelectedIds(new Set([m.id]));
  };

  const toggleSelect = (m: MessageData) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectedMessages = useMemo(
    () => messages.filter((m) => selectedIds.has(m.id)),
    [messages, selectedIds],
  );

  const selectionCopy = () => {
    const text = selectedMessages.map((m) => m.text).filter(Boolean).join('\n\n');
    if (!text) {
      toast.error('No text to copy');
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success('Message copied');
  };

  const selectionForward = () => {
    if (!selectedMessages.length) return;
    setForwardingBatch(selectedMessages);
    setForwardingMessage(selectedMessages[0]);
    setForwardTargets(new Set());
  };

  const selectionStar = async () => {
    for (const m of selectedMessages) {
      await handleStar(m);
    }
  };

  const selectionDelete = async () => {
    for (const m of selectedMessages) {
      try {
        await wevchatApi.deleteForMe(m.id);
      } catch { /* continue */ }
    }
    setMessages((prev) => prev.filter((msg) => !selectedIds.has(msg.id)));
    clearSelection();
    toast.success('Deleted for you');
  };

  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        selectionCopy();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectionMode, selectedIds]);

  const handleDirectCreated = (convo: any) => {
    loadConversations(true);
    const members = Array.isArray(convo?.members) ? convo.members : [];
    selectChat({
      ...convo,
      unreadCount: 0,
      isMuted: false,
      isArchived: false,
      isPinnedChat: false,
      members: Array.isArray(convo.members) ? convo.members : [],
      otherUser: members.find((m: any) => m?.userId !== user?.id)?.user || null,
    } as ConversationSummary);
  };
  const handleOpenGroup = (convo: any) => {
    loadConversations(true);
    selectChat({
      ...convo,
      unreadCount: convo.unreadCount ?? 0,
      isMuted: !!convo.isMuted,
      isArchived: !!convo.isArchived,
      isPinnedChat: !!convo.isPinnedChat,
      members: Array.isArray(convo?.members) ? convo.members : [],
    } as ConversationSummary);
  };

  // ─── Filters ─────────────────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    // infoJson is already a parsed object from the server — parseInfoJson is a
    // no-op when passed an object, but calling it per-item on every re-render
    // still adds object-allocation overhead.  Read .isVaultLocked directly.
    let list = conversations.filter((c) => !c.isArchived);
    if (!vaultUnlocked) {
      list = list.filter((c) => !(c.infoJson as any)?.isVaultLocked);
    }
    if (activeTab === 'Direct') list = list.filter((c) => c.type === 'private');
    if (activeTab === 'Groups') list = list.filter((c) => c.type === 'group');
    if (activeTab === 'Unread') list = list.filter((c) => c.unreadCount > 0);
    if (activeTab === 'AI Bots') list = list.filter((c) => c.lastMessage?.isAiGenerated);
    if (activeTab === 'WevMall') list = list.filter((c) => c.type === 'marketplace');
    return [...list].sort((a, b) => {
      if (a.isPinnedChat !== b.isPinnedChat) return a.isPinnedChat ? -1 : 1;
      // ISO strings sort lexicographically without new Date() overhead.
      return b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0;
    });
  }, [conversations, activeTab, vaultUnlocked]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setUserSearchResults([]);
      return;
    }
    const controller = new AbortController();
    setUserSearchLoading(true);
    const t = window.setTimeout(() => {
      wevchatApi.searchUsers(q)
        .then((data) => {
          if (controller.signal.aborted) return;
          const rows = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
          setUserSearchResults(rows.map((u: { id: string; name: string; username?: string; avatar?: string }) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatar,
          })));
        })
        .catch(() => { if (!controller.signal.aborted) setUserSearchResults([]); })
        .finally(() => { if (!controller.signal.aborted) setUserSearchLoading(false); });
    }, 280);
    return () => { controller.abort(); window.clearTimeout(t); };
  }, [searchQuery]);

  useEffect(() => {
    if (!showChatSearch || !activeChat) return;
    const q = chatSearchQ.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setChatSearchHits([]);
      setChatSearchCursor(null);
      setChatSearchHasMore(false);
      return;
    }
    const controller = new AbortController();
    setChatSearchLoading(true);
    setChatSearchCursor(null);
    const t = window.setTimeout(() => {
      wevchatApi.search(q, { scope: 'conversation', conversationId: activeChat.id, type: searchType, senderId: searchSenderId, from: searchFrom, to: searchTo, signal: controller.signal }).then((data) => {
        const payload = data?.data || data;
        setChatSearchHits(Array.isArray(payload?.messages) ? payload.messages : []);
        setChatSearchCursor(payload?.meta?.nextCursor || null);
        setChatSearchHasMore(Boolean(payload?.meta?.hasMore));
      }).catch((error) => { if (error?.name !== 'AbortError') setChatSearchHits([]); })
        .finally(() => { if (!controller.signal.aborted) setChatSearchLoading(false); });
    }, 280);
    return () => { controller.abort(); window.clearTimeout(t); };
  }, [chatSearchQ, showChatSearch, activeChat?.id, searchType, searchSenderId, searchFrom, searchTo]);

  const loadMoreChatSearch = async () => {
    const q = chatSearchQ.trim();
    if (!q || !activeChat || !chatSearchCursor || chatSearchLoading) return;
    setChatSearchLoading(true);
    try {
      const data = await wevchatApi.search(q, { scope: 'conversation', conversationId: activeChat.id, type: searchType, senderId: searchSenderId, from: searchFrom, to: searchTo, cursor: chatSearchCursor });
      const payload = data?.data || data;
      setChatSearchHits((current) => [...current, ...(Array.isArray(payload?.messages) ? payload.messages : [])]);
      setChatSearchCursor(payload?.meta?.nextCursor || null);
      setChatSearchHasMore(Boolean(payload?.meta?.hasMore));
    } finally { setChatSearchLoading(false); }
  };

  const openUserFromSearch = async (person: { id: string; name: string; avatar?: string }) => {
    try {
      const convo = await wevchatApi.getOrCreateDirect(person.id);
      setSearchQuery('');
      setUserSearchResults([]);
      loadConversations(true);
      selectChat({
        ...convo,
        unreadCount: 0,
        isMuted: false,
        isArchived: false,
        isPinnedChat: false,
        members: Array.isArray(convo?.members) ? convo.members : [],
        otherUser: convo?.otherUser || { id: person.id, name: person.name, avatar: person.avatar },
      } as ConversationSummary);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not open chat');
    }
  };

  const openSearchHit = (hit: MessageData & { conversationId?: string }) => {
    const convoId = hit.conversationId;
    if (!convoId) {
      jumpToMessage(hit.id);
      return;
    }
    pendingJumpRef.current = hit.id;
    const convo = conversations.find((c) => c.id === convoId);
    if (convo) {
      selectChat(convo, activeChat?.id);
    } else {
      wevchatApi.getConversations().then((data) => {
        const list = Array.isArray(data) ? data.map((c: ConversationSummary) => normalizeConversation(c, user?.id)) : [];
        setConversations(list);
        const found = list.find((c) => c.id === convoId);
        if (found) selectChat(found, activeChat?.id);
      }).catch(() => { });
    }
  };

  const typingLabel = Object.values(typingUsers)[0];
  const isOtherOnline = activeChat?.otherUser ? onlineUserIds.has(activeChat.otherUser.id) : false;
  const peerPresence: boolean | null = !activeChat?.otherUser
    ? false
    : isOtherOnline
      ? true
      : presenceKnown
        ? false
        : null;

  // Header status (typing / online) changes can resize the thread viewport for a frame on mobile.
  // If the reader was at the latest message, keep them pinned there instead of letting the list jump.
  useEffect(() => {
    if (!atBottomRef.current || !initialScrollDoneRef.current) return;
    const raf = requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      applyPinned(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [typingLabel, peerPresence, applyPinned]);
  if (wevchatDisabled) {
    return (
      <div className="h-full min-h-0 w-full flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-3 rounded-3xl border border-border bg-card/60 px-6 py-10 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
            <MessageCircle size={22} />
          </div>
          <h2 className="text-lg font-bold text-foreground">Wev Chat is disabled</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {wevchatDisabledMessage || 'Messaging is currently unavailable for your account.'}
          </p>
        </div>
      </div>
    );
  }

  const openInfoDrawer = () => {
    setShowInfoDrawer(true);
    if (activeChat) wevchatApi.getConversationMedia(activeChat.id).then(setConversationMedia).catch(() => { });
  };

  const dismissWindow = () => {
    if (desktopFloat) {
      closeWevChatDesktopFloat();
      onClose?.();
      return;
    }
    if (onClose) onClose();
    else navigate('/');
  };

  const enterFloatingOverHome = () => {
    // Navigate home first, then open the float from DashboardLayout after
    // /messages unmounts — avoids StrictMode remount clearing the flag.
    try {
      sessionStorage.setItem(
        'wev_pending_desktop_float',
        activeChatRef.current?.id ?? '',
      );
    } catch { /* ignore */ }
    navigate('/');
  };

  const enterFullscreenPage = () => {
    const id = activeChatRef.current?.id;
    if (desktopFloat) {
      closeWevChatDesktopFloat();
      navigate(id ? `/messages/${id}` : '/messages');
      return;
    }
    setWindowState('maximized');
  };

  // Floating / PiP / desktop-float glass shell — drag + see-through page behind the window.
  // Embedded right-rail is opaque in-layout chrome (no Rnd / drag).
  const isFloatingWindow = !embedded && (isOverlayWindow || windowState === 'normal');

  // Full-page /messages has no floating chrome — hide min/max/close there.
  // Keep controls only for embedded right-rail and floating / PiP overlays.
  const showWindowControls = embedded || isFloatingWindow;

  const windowControls = !showWindowControls ? null : embedded ? (
    <div className="flex items-center gap-0.5 shrink-0" role="toolbar" aria-label="WevChat window controls">
      <button
        type="button"
        onClick={enterFullscreenPage}
        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        title="Open full WevChat"
        aria-label="Open full WevChat"
      >
        <Maximize2 size={14} />
      </button>
      <button
        type="button"
        onClick={dismissWindow}
        className="p-1 hover:bg-red-500 hover:text-white rounded-md transition-colors text-muted-foreground"
        title="Close"
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  ) : (
    <div className="hidden md:flex items-center gap-0.5 shrink-0" role="toolbar" aria-label="WevChat window controls">
      <button
        type="button"
        onClick={() => {
          if (windowState === 'minimized') {
            setWevChatOpenMinimized(false);
            setWindowState('normal');
            return;
          }
          if (!isOverlayWindow && windowState === 'maximized') {
            try { sessionStorage.setItem('wev_wevchat_start_minimized', '1'); } catch { /* ignore */ }
            enterFloatingOverHome();
            return;
          }
          setWevChatOpenMinimized(true);
          setWindowState('minimized');
        }}
        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        title="Minimize"
        aria-label="Minimize"
      >
        <Minus size={14} />
      </button>
      {!pip && (
        <button
          type="button"
          onClick={() => {
            if (desktopFloat || windowState === 'normal') enterFullscreenPage();
            else enterFloatingOverHome();
          }}
          className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title={desktopFloat || windowState === 'normal' ? 'Full screen' : 'Exit full screen'}
          aria-label={desktopFloat || windowState === 'normal' ? 'Full screen' : 'Exit full screen'}
        >
          {desktopFloat || windowState === 'normal' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      )}
      <button
        type="button"
        onClick={dismissWindow}
        className="p-1 hover:bg-red-500 hover:text-white rounded-md transition-colors text-muted-foreground"
        title="Close"
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );

  const InnerContent = (
    <div
      ref={layoutRef}
      className={`wevchat-shell h-full min-h-0 w-full flex overflow-hidden ${embedded
        ? 'bg-background wevchat-shell--rail-compact'
        : isFloatingWindow
          ? 'bg-transparent'
          : 'bg-background'
        } ${pip || embedded
          ? ''
          : hasSelection
            ? 'md:border-t md:border-border/60'
            : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
        }`}
    >
      {/* Desktop sidebar width — only when a chat is open; alone, fill the pane.
          Floating shells lock the list width (no 46% cap) so the conversation
          pane absorbs shrink instead of crushing the tabs header. */}
      {hasSelection && !isStackedPane ? (
        <style>{`
          @media (min-width: 768px) {
            .wevchat-chat-list {
              width: ${sidebarWidth}px !important;
              flex: 0 0 ${sidebarWidth}px !important;
              min-width: ${SIDEBAR_MIN}px !important;
              max-width: ${isFloatingWindow ? `${Math.min(SIDEBAR_MAX, sidebarWidth)}px` : `min(${SIDEBAR_MAX}px, 46%)`} !important;
              flex-shrink: 0 !important;
            }
            .wevchat-conversation {
              flex: 1 1 0% !important;
              min-width: ${isFloatingWindow ? `${FLOAT_CONVERSATION_MIN}px` : `${CONVERSATION_MIN}px`} !important;
            }
          }
        `}</style>
      ) : null}

      {/* ─── LEFT PANE — chat list ───────────────────────────────────────── */}
      <div
        className={`wevchat-chat-list flex flex-col shrink-0 w-full overflow-x-hidden ${isFloatingWindow
          ? 'bg-card/30 backdrop-blur-md'
          : 'bg-card/30'
          } ${hasSelection && !isStackedPane ? '' : 'min-w-0'} ${isStackedPane
            ? (mobileConversationVisible ? 'hidden' : 'flex h-full')
            : `${mobileConversationVisible ? 'hidden md:flex' : 'flex'} ${hasSelection
              ? `md:border-r md:border-border ${isFloatingWindow ? '' : 'md:bg-muted/20'}`
              : shellWide && !isStackedPane
                ? 'md:w-[384px] md:flex-none md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.12)] md:border-r md:border-border/60 md:bg-card'
                : `md:flex-1 md:w-full md:min-w-0 ${isFloatingWindow ? '' : 'md:bg-card'}`
            }`
          }`}
      >
        <div
          className={`px-4 pt-4 pb-3 space-y-3.5 min-w-0 w-full ${isFloatingWindow ? 'drag-handle cursor-move bg-card/30' : ''
            }`}
        >
          <WevChatProfileStrip
            trailing={windowControls}
            actions={
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="h-9 w-9 flex items-center justify-center text-foreground hover:text-primary active:scale-95 transition-colors shrink-0"
                title="New conversation"
                aria-label="New conversation"
              >
                <SquarePen size={20} strokeWidth={2.1} />
              </button>
            }
          />
          <div className="no-drag flex items-center gap-1.5 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} strokeWidth={1.9} />
              <input
                id="wevchat-search-users"
                name="wevchat_search_users"
                aria-label="Search users"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full h-11 bg-card dark:bg-white/[0.05] border border-border/70 rounded-2xl pl-10 pr-4 shadow-sm text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-background focus:border-primary/40 transition-colors"
              />
            </div>
          </div>

          {!embedded && (
            <div className="no-drag">
              <WevChatFriendsCircles
                onlineUserIds={onlineUserIds}
                onOpenFriend={(friend) => openUserFromSearch(friend)}
              />
            </div>
          )}
          <div className="no-drag flex flex-wrap gap-1.5 min-w-0 w-full">
            {(['All', 'Direct', 'Groups', 'WevMall', 'Unread', 'AI Bots', 'Requests'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-full border text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === tab ? 'bg-primary/10 border-primary/20 text-primary dark:bg-primary/20' : 'bg-card border-border/70 text-foreground/80 hover:bg-muted hover:text-foreground'
                  }`}
              >
                {tab}
                {tab === 'Requests' && messageRequests.length > 0 && activeTab !== 'Requests' ? (
                  <span className="ml-1 inline-flex min-w-[1.1rem] justify-center rounded-full bg-primary text-primary-foreground px-1 text-[10px]">
                    {messageRequests.length}
                  </span>
                ) : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = !vaultUnlocked;
                setVaultUnlocked(next);
                try { sessionStorage.setItem('wev_vault_unlocked', next ? '1' : '0'); } catch { /* ignore */ }
              }}
              className={`px-3 py-1 rounded-full border text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${vaultUnlocked ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400' : 'bg-card border-border/70 text-foreground/80 hover:bg-muted hover:text-foreground'}`}
              title={vaultUnlocked ? 'Hide vault chats' : 'Show vault chats'}
              aria-pressed={vaultUnlocked}
            >
              <FolderLock size={13} strokeWidth={2} />
              Vault
            </button>
          </div>
          {/* Mobile float controls — desktop min/max/close already sit on the profile strip. */}
          {!embedded && (pip || windowState !== 'maximized') && (
            <div className="flex md:hidden justify-end items-center bg-transparent drag-handle cursor-move">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setWevChatOpenMinimized(true);
                    setWindowState('minimized');
                  }}
                  className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-muted-foreground"
                  title="Minimize"
                  aria-label="Minimize"
                >
                  <Minus size={14} />
                </button>
                <button type="button" onClick={dismissWindow} className="p-1.5 hover:bg-red-500 hover:text-white rounded-full text-muted-foreground" title="Close" aria-label="Close">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 pt-1 space-y-1.5" onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
              if (activeTab === 'Requests') {
                loadMessageRequests(false);
              } else {
                loadConversations(false);
              }
            }
          }}>
          {searchQuery.trim().length >= 2 && (
            <div className="px-1 pb-2 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">People</p>
              {userSearchLoading && (
                <p className="text-[11px] text-muted-foreground px-2 py-2">Searching...</p>
              )}
              {!userSearchLoading && userSearchResults.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-2 py-2">No users found</p>
              )}
              {userSearchResults.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => openUserFromSearch(person)}
                  className="w-full text-left p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3"
                >
                  <UserAvatar user={person} src={person.avatar} className="w-11 h-11 text-sm shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{person.name}</p>
                    {person.username && (
                      <p className="text-xs text-muted-foreground truncate">@{person.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searchQuery.trim() && activeTab === 'Requests' && (
            <div className="space-y-1">
              {requestsLoading && (
                <p className="text-[11px] text-muted-foreground px-3 py-4">Loading requests…</p>
              )}
              {!requestsLoading && messageRequests.length === 0 && (
                <div className="flex flex-col items-center gap-2 text-center py-12 px-4">
                  <MessageCircle size={28} className="text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground max-w-[min(220px,100%)] leading-relaxed">
                    No message requests right now.
                  </p>
                </div>
              )}
              {messageRequests.map((chat) => {
                const name = displayName(chat);
                const busy = requestBusyId === chat.id;
                return (
                  <div
                    key={chat.id}
                    className="p-3.5 rounded-2xl flex items-center gap-3.5 hover:bg-black/5 dark:hover:bg-white/5 border-l-4 border-amber-500/40"
                  >
                    <UserAvatar
                      user={{ ...chat.otherUser, name }}
                      src={chat.photo || chat.otherUser?.avatar}
                      className="w-12 h-12 text-sm shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-sm text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {chat.lastMessage?.text || 'Wants to message you'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => acceptMessageRequest(chat)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-blue-600 text-white disabled:opacity-50"
                        >
                          <Check size={12} />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => declineMessageRequest(chat)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-black/5 dark:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {conversationsLoaded && !searchQuery.trim() && activeTab !== 'Requests' && filteredConversations.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-center py-12 px-4">
              <MessageCircle size={28} className="text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground max-w-[min(220px,100%)] leading-relaxed">
                {activeTab !== 'All'
                  ? `No ${activeTab.toLowerCase()} chats right now.`
                  : 'No conversations yet. Tap + to start one.'}
              </p>
            </div>
          )}
          {!searchQuery.trim() && activeTab !== 'Requests' && filteredConversations.map((chat) => {
            const online = chat.otherUser ? onlineUserIds.has(chat.otherUser.id) : false;
            return (
              <ConversationItem
                key={chat.id}
                chat={chat}
                isActive={activeChat?.id === chat.id}
                online={online}
                onSelect={() => selectChat(chat, activeChat?.id)}
              />
            );
          })}
        </div>
      </div>
      {/* ─── RESIZE HANDLE (desktop + conversation selected only) ──────── */}
      {hasSelection && !isStackedPane && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat list"
          onPointerDown={startSidebarResize}
          className="hidden md:block w-1 shrink-0 cursor-col-resize bg-border/40 hover:bg-primary/40 active:bg-primary/60 transition-colors touch-none"
        />
      )}

      {/* ─── CONVERSATION PANE — only after a chat is selected ──────────── */}
      {!hasSelection && shellWide && !isStackedPane && (
        <div className="hidden md:flex flex-1 min-w-0 flex-col items-center justify-center gap-5 px-8 text-center bg-gradient-to-br from-background via-indigo-50/60 to-violet-100/60 dark:from-background dark:via-indigo-950/20 dark:to-violet-950/30">
          <div className="relative w-28 h-28 rounded-full p-[5px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/25 ring-8 ring-card/80">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <WevChatIcon size={44} strokeWidth={1.6} className="text-indigo-500" />
            </div>
          </div>
          <div className="space-y-1 max-w-xs">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Your messages</h2>
            <p className="text-sm text-muted-foreground">Send private messages, photos and WevMall deals to friends and groups.</p>
          </div>
          <button type="button" onClick={() => setShowNewChatModal(true)} className="px-6 h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[15px] font-semibold shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-opacity">Send message</button>
        </div>
      )}
      {hasSelection && activeChat && (
        <div
          className={`wevchat-conversation min-w-0 flex flex-col relative flex-1 h-full min-h-0 overflow-hidden overflow-x-hidden ${isFloatingWindow
            ? 'bg-background/25 backdrop-blur-md'
            : 'bg-background md:bg-card/10'
            } ${activeChat.privateChat?.active ? 'border-l border-amber-400/30' : ''
            } ${isStackedPane
              ? (mobileConversationVisible ? 'flex' : 'hidden')
              : (mobileConversationVisible ? '' : 'hidden md:flex')
            } ${embedded || activeChat.themeJson?.bubbleDensity === 'compact' ? 'is-compact' : ''}`}
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            ['--wev-chat-theme' as string]: activeChat.themeJson?.color || '#0084ff',
          }}
        >
          <div className={`shrink-0 border-b border-border/60 ${embedded
            ? 'px-2 py-1.5'
            : 'px-3 py-2.5 md:px-4 md:py-3'
            } ${isFloatingWindow
              ? 'drag-handle cursor-move bg-card/40 backdrop-blur-xl'
              : 'bg-card/80 backdrop-blur-xl'
            } flex items-center justify-between gap-1.5 sticky top-0 z-10 ${embedded ? '' : 'shadow-sm'}`}>
            <div className={`flex items-center min-w-0 flex-1 overflow-hidden ${embedded ? 'gap-1.5' : 'gap-2'}`}>
              <button
                onClick={closeConversationMobile}
                className={`${embedded ? 'flex' : 'md:hidden'} shrink-0 flex items-center justify-center ${embedded ? 'h-8 w-8 -ml-0.5' : 'h-10 w-10 -ml-1.5'} text-muted-foreground hover:bg-muted rounded-full transition-colors`}
                aria-label="Back to chats"
              >
                <ChevronLeft size={embedded ? 18 : 22} />
              </button>

              <div onClick={openInfoDrawer} className={`no-drag flex items-center cursor-pointer group hover:opacity-90 transition-all min-w-0 flex-1 overflow-hidden ${embedded ? 'gap-1.5' : 'gap-2.5'}`}>
                <div className="relative shrink-0">
                  <UserAvatar user={{ ...activeChat.otherUser, name: displayName(activeChat) }} src={chatAvatar(activeChat)} className={`${embedded ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'} shadow-sm group-hover:scale-105 transition-transform shrink-0`} />
                  {activeChat.type !== 'group' && peerPresence === true && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className={`${embedded ? 'text-xs' : 'text-sm'} font-extrabold group-hover:text-primary transition-colors truncate text-foreground`}>
                    {displayName(activeChat)}
                  </h2>
                  <div className={`${embedded ? 'text-[9px]' : 'text-[10px]'} font-bold flex items-center gap-1 min-w-0 h-3.5 leading-[14px] overflow-hidden`}>
                    {typingLabel ? (
                      <span className="inline-flex items-center gap-1 min-w-0 text-blue-600 dark:text-blue-400">
                        {activeChat.type !== 'group' && peerPresence !== false && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                        )}
                        <span className="truncate">{typingLabel} is typing...</span>
                      </span>
                    ) : activeChat.type === 'group' ? (
                      <span className="truncate text-muted-foreground">{activeChat.members?.length || 0} members</span>
                    ) : peerPresence == null ? null : (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${peerPresence ? 'bg-emerald-400' : 'bg-muted-foreground/50'}`} />
                        <span className={`truncate ${peerPresence ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {peerPresence ? 'Online' : 'Offline'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex items-center shrink-0 ${embedded ? 'gap-0' : 'gap-0.5 sm:gap-1'}`}>

              {isSpaceMode && spaceThread && (
                <div className="hidden md:flex items-center gap-1.5 mr-1 pr-2 border-r border-border">
                  <button
                    onClick={() => handleUpdateSpaceThreadStatus('RESOLVED')}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg flex items-center transition-colors ${spaceThread.status === 'RESOLVED' ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`}
                    title="Mark as Done"
                  >
                    <CheckCircle size={14} className="mr-1" /> {spaceThread.status === 'RESOLVED' ? 'Resolved' : 'Done'}
                  </button>
                  <button
                    onClick={() => handleUpdateSpaceThreadStatus('OPEN')}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg flex items-center transition-colors ${spaceThread.status === 'OPEN' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'}`}
                    title="Follow-up"
                  >
                    <Clock size={14} className="mr-1" /> Follow-up
                  </button>
                </div>
              )}

              <PrivateChatToggle
                isActive={!!activeChat.privateChat?.active}
                onToggle={handleTogglePrivateChat}
              />
              <div className="relative">
                <button
                  ref={callMenuButtonRef}
                  type="button"
                  onClick={() => setShowCallMenu((v) => !v)}
                  disabled={activeChat.type === 'group' ? false : !activeChat.otherUser}
                  className={`flex items-center justify-center ${embedded ? 'h-7 w-7' : 'h-9 w-9'} rounded-full transition-colors disabled:opacity-40 ${showCallMenu
                    ? 'text-blue-600 dark:text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                  title="Call"
                  aria-label="Call"
                  aria-expanded={showCallMenu}
                >
                  <Phone size={embedded ? 14 : 16} />
                </button>
                {showCallMenu && (
                  <motion.div
                    ref={callMenuRef}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 z-50 w-48 overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-2xl shadow-2xl"
                  >
                    {activeChat.type === 'group' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCallMenu(false);
                          const name = encodeURIComponent(displayName(activeChat).slice(0, 80) || 'Group room');
                          navigate(`/sfu?create=1&title=${name}`);
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
                          <Users size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-extrabold text-foreground">Group room</span>
                          <span className="block text-[10px] text-muted-foreground">LiveKit / SFU</span>
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCallMenu(false);
                            if (activeChat.otherUser) {
                              call.startCall(activeChat.otherUser.id, displayName(activeChat), 'audio', activeChat.id);
                            }
                          }}
                          className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                            <Phone size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-extrabold text-foreground">Audio call</span>
                            <span className="block text-[10px] text-muted-foreground">Voice only</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCallMenu(false);
                            if (activeChat.otherUser) {
                              call.startCall(activeChat.otherUser.id, displayName(activeChat), 'video', activeChat.id);
                            }
                          }}
                          className="flex w-full items-center gap-3 px-3.5 py-3 text-left border-t border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                            <Video size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-extrabold text-foreground">Video call</span>
                            <span className="block text-[10px] text-muted-foreground">Camera on</span>
                          </span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowChatSearch((v) => !v);
                  if (showChatSearch) {
                    setChatSearchQ('');
                    setChatSearchHits([]);
                  }
                }}
                className={`no-drag flex items-center justify-center ${embedded ? 'h-7 w-7' : 'h-9 w-9'} rounded-full transition-colors ${showChatSearch
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                title="Search in conversation"
                aria-label="Search in conversation"
                aria-pressed={showChatSearch}
              >
                <Search size={embedded ? 14 : 16} />
              </button>
              <button onClick={openInfoDrawer} className={`flex items-center justify-center ${embedded ? 'h-7 w-7' : 'h-9 w-9'} rounded-full text-muted-foreground hover:text-foreground transition-colors`} title="Chat Info & Settings">
                <Info size={embedded ? 14 : 16} />
              </button>
              {windowState === 'normal' && (
                <>
                  <div className="w-px h-5 bg-border mx-0.5 hidden md:block" />
                  <div className="hidden md:block drag-handle cursor-move w-7 h-7 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" title="Drag Window" />
                </>
              )}
            </div>
          </div>

          {activeChat.privateChat?.active && (
            <div className="px-3 py-2 border-b border-amber-400/20 bg-amber-500/10 text-[11px] font-bold text-amber-800 dark:text-amber-100 flex items-center gap-2">
              <Lock size={13} className="text-amber-500 shrink-0" />
              🔒 Private Chat is ON
            </div>
          )}
          {!!parseInfoJson(activeChat.infoJson).autoTranslateLang && (
            <div className="px-3 py-1.5 border-b border-border bg-black/5 dark:bg-white/5 text-[11px] font-bold text-muted-foreground">
              Auto-translate is on ({parseInfoJson(activeChat.infoJson).autoTranslateLang}). Use a message’s ⋮ menu or /ai translate for a draft.
            </div>
          )}

          {selectionMode ? (
            <div className="shrink-0 px-3 py-2.5 border-b border-border bg-card/95 flex items-center gap-2 sticky top-0 z-20">
              <button type="button" onClick={clearSelection} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground" aria-label="Cancel selection">
                <X size={18} />
              </button>
              <span className="text-sm font-extrabold flex-1">{selectedIds.size} selected</span>
              <button type="button" onClick={selectionCopy} className="p-2 rounded-xl hover:bg-muted text-muted-foreground" title="Copy"><Copy size={16} /></button>
              <button type="button" onClick={selectionForward} className="p-2 rounded-xl hover:bg-muted text-muted-foreground" title="Forward"><Forward size={16} /></button>
              <button type="button" onClick={() => selectedMessages[0] && handleShare(selectedMessages[0])} className="p-2 rounded-xl hover:bg-muted text-muted-foreground" title="Share"><Share2 size={16} /></button>
              <button type="button" onClick={selectionStar} className="p-2 rounded-xl hover:bg-muted text-muted-foreground" title="Star"><Star size={16} /></button>
              <button type="button" onClick={selectionDelete} className="p-2 rounded-xl hover:bg-red-500/10 text-red-500" title="Delete"><Trash2 size={16} /></button>
            </div>
          ) : pinnedMessages.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPinnedList((v) => !v)}
                className="w-full px-3 py-2 border-b border-amber-500/20 bg-amber-500/10 text-left flex items-center gap-2 hover:bg-amber-500/15"
              >
                <Pin size={13} className="text-amber-500 shrink-0" />
                <span className="text-[11px] font-bold text-foreground truncate">
                  📌 {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}
                  {pinnedMessages[0]?.text ? ` · ${pinnedMessages[0].text}` : ''}
                </span>
              </button>
              {showPinnedList && (
                <div className="absolute left-0 right-0 top-full z-30 border-b border-border bg-card shadow-xl max-h-48 overflow-y-auto">
                  {pinnedMessages.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => { setShowPinnedList(false); jumpToMessage(pm.id); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 border-b border-border/50 last:border-0"
                    >
                      <p className="text-[11px] font-semibold text-foreground line-clamp-2">{pm.text || pm.fileName || 'Pinned media'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div
            className="flex-1 min-h-0 overflow-hidden relative"
          >
            {chatWallpaperSrc ? (
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-90"
                style={{ backgroundImage: `url(${chatWallpaperSrc})` }}
                aria-hidden
              >
                <div className="absolute inset-0 bg-background/55 dark:bg-background/65" />
              </div>
            ) : null}
            <div
              className="relative z-[1] h-full min-h-0"
              onTouchStart={(e) => { touchScrollYRef.current = e.touches[0]?.clientY ?? null; }}
              onTouchMove={(e) => {
                const y = e.touches[0]?.clientY;
                const prev = touchScrollYRef.current;
                if (y == null || prev == null) return;
                touchScrollYRef.current = y;
                // Finger moving down scrolls the thread upward, away from the latest messages.
                if (y - prev > 10) cancelBottomSettle();
              }}
              onWheel={(e) => { if (e.deltaY < -2) cancelBottomSettle(); }}
            >
              {loadingMessages && <p className="text-center text-xs text-muted-foreground py-4">Loading messages...</p>}
              {!loadingMessages && loadingOlder && (
                <p className="text-center text-xs text-muted-foreground py-2" aria-live="polite">Loading earlier messages...</p>
              )}
              {!loadingMessages && messages.length === 0 && (activeGreeting ? (
                <div className="mx-auto mt-6 max-w-sm px-4 text-center space-y-2.5">
                  <p className="inline-block rounded-2xl border border-border bg-card/90 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap text-left">
                    {activeGreeting.text}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Automated greeting</p>
                  {activeGreeting.faqs.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {activeGreeting.faqs.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSendMessage(q)}
                          className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-xs py-4 text-muted-foreground">
                  No messages yet. Say hello!
                </p>
              ))}
              {(messages.length > 0) && (
                <Virtuoso
                  key={activeChat.id}
                  ref={virtuosoRef}
                  scrollerRef={setVirtuosoScroller}
                  className="no-scrollbar wevchat-message-scroller"
                  style={{ height: '100%', width: '100%', background: 'transparent' }}
                  data={messages}
                  computeItemKey={computeMessageKey}
                  defaultItemHeight={72}
                  firstItemIndex={firstItemIndex}
                  initialTopMostItemIndex={messages.length - 1}
                  followOutput={followOutput}
                  atBottomThreshold={NEAR_BOTTOM_PX}
                  increaseViewportBy={{ top: 400, bottom: 200 }}
                  alignToBottom
                  components={WEVCHAT_VIRTUOSO_COMPONENTS}
                  atTopStateChange={(atTop) => {
                    // Only page older history from a real scroll to the top: a short thread that fits the
                    // screen (alignToBottom) reports atTop while the user is at the bottom, which used to
                    // prepend a page and yank the view upward.
                    const scroller = scrollContainerRef.current;
                    const overflows = !!scroller && scroller.scrollHeight > scroller.clientHeight + 1;
                    if (atTop && overflows && initialScrollDoneRef.current && !loadingMessages && !loadingOlder && hasMore) {
                      loadOlderMessages();
                    }
                  }}
                  atBottomStateChange={(bottom) => {
                    // Virtuoso reports "not at bottom" while item heights are still estimates,
                    // even when the scroller is already on the latest message. Trust the DOM gap,
                    // and don't drop a jump that is still running.
                    const measured = listIsPinnedToBottom(scrollContainerRef.current, NEAR_BOTTOM_PX);
                    const near = measured == null ? bottom : measured;
                    if (near) applyPinned(true);
                    else if (!stickToBottomRef.current) applyPinned(false);
                  }}
                  itemContent={(absIdx, m) => {
                    const list = messages;
                    const idx = absIdx - firstItemIndex;
                    const showDateDivider = idx === 0 || groupDateLabel(m.createdAt) !== groupDateLabel(list[idx - 1]?.createdAt);
                    const isMine = m.senderId === user?.id;
                    const prev = list[idx - 1];
                    const next = list[idx + 1];
                    const prevTs = prev?.createdAt ? new Date(prev.createdAt).getTime() : NaN;
                    const currTs = m.createdAt ? new Date(m.createdAt).getTime() : NaN;
                    const gapMs = Number.isFinite(prevTs) && Number.isFinite(currTs) ? currTs - prevTs : Number.POSITIVE_INFINITY;
                    const showGapTime = !showInlineSendTime && (idx === 0 || gapMs >= MESSAGE_TIME_GAP_MS);
                    const dateLabel = groupDateLabel(m.createdAt);
                    const timeLabel = safeTime(m.createdAt);
                    const centerChip = showDateDivider && showGapTime && dateLabel && timeLabel
                      ? `${dateLabel} · ${timeLabel}`
                      : showDateDivider
                        ? dateLabel
                        : showGapTime
                          ? timeLabel
                          : '';

                    const isGroupStart = !prev || prev.senderId !== m.senderId || showDateDivider || showGapTime;
                    const nextIsDivider = next ? groupDateLabel(next.createdAt) !== groupDateLabel(m.createdAt) : true;
                    const isGroupEnd = !next || next.senderId !== m.senderId || nextIsDivider;
                    const showUnreadMarker = unreadMarkerAt === m.id && m.id !== undefined;
                    const showPrivateSessionStart = !!(
                      m.privateSessionId &&
                      (!prev || prev.privateSessionId !== m.privateSessionId)
                    );
                    return (
                      <div className="wevchat-msg-row w-full px-4 sm:px-5 md:px-6 box-border">
                        {centerChip && (
                          <div className="flex justify-center my-3">
                            <span className="wevchat-date-chip text-[10px] font-extrabold text-muted-foreground">
                              {centerChip}
                            </span>
                          </div>
                        )}
                        {showPrivateSessionStart && (
                          <div className="flex justify-center my-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 border border-amber-400/30 text-amber-800 dark:text-amber-100 shadow-sm">
                              🔒 Private Chat
                            </span>
                          </div>
                        )}
                        {showUnreadMarker && (
                          <div className="flex items-center gap-2 my-3" aria-label="Unread messages">
                            <span className="flex-1 h-px bg-blue-500/40" />
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow">
                              Unread
                            </span>
                            <span className="flex-1 h-px bg-blue-500/40" />
                          </div>
                        )}
                        <MessageBubble peerId={activeChat?.otherUser?.id}
                          message={m}
                          isMine={isMine}
                          isGroup={activeChat.type === 'group'}
                          currentUserId={user?.id || ''}
                          showAvatar={isGroupEnd}
                          isGroupStart={isGroupStart}
                          isGroupEnd={isGroupEnd}
                          highlighted={highlightedId === m.id}
                          selectionMode={selectionMode}
                          selected={selectedIds.has(m.id)}
                          onToggleSelect={toggleSelect}
                          onEnterSelection={enterSelection}
                          onReply={setReplyingTo}
                          onEdit={setEditingMessage}
                          onDelete={handleDeleteMessage}
                          onDeleteForMe={handleDeleteForMe}
                          onForward={handleForward}
                          onPin={handlePin}
                          onStar={handleStar}
                          onReact={handleReact}
                          onReport={handleReport}
                          onShare={handleShare}
                          onRetry={handleRetry}
                          onJumpToMessage={jumpToMessage}
                          showInlineTime={showInlineSendTime}
                          skipEnterAnimation
                        />
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </div>

          {/* Floating jump-to-latest — above composer + safe area (nav hidden while chat open) */}
          {!atBottom && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToBottom('auto');
              }}
              className="wevchat-jump-latest absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-1/2 right-auto z-20 flex items-center gap-1.5 pl-3 pr-3.5 py-2.5 min-h-10 rounded-full bg-card text-foreground border border-border shadow-xl hover:opacity-90 transition-all -translate-x-1/2"
              aria-label="Scroll to latest messages"
            >
              <ChevronDown size={16} />
              {newBelowCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white dark:bg-gradient-to-r dark:from-purple-600 dark:to-cyan-500 dark:text-white text-[10px] font-black flex items-center justify-center">
                  {newBelowCount}
                </span>
              )}
            </button>
          )}

          {showChatSearch && (
            <div className="shrink-0 px-3 pt-2 pb-1.5 border-t border-border bg-card/90 backdrop-blur-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  id="wevchat-search-current-chat"
                  name="wevchat_search_current_chat"
                  aria-label="Search this chat"
                  autoFocus
                  value={chatSearchQ}
                  onChange={(e) => setChatSearchQ(e.target.value)}
                  placeholder="Search this chat..."
                  className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowChatSearch(false);
                    setChatSearchQ('');
                    setChatSearchHits([]);
                  }}
                  className="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground"
                  title="Close search"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select id="wevchat-search-type" name="wevchat_search_type" aria-label="Filter content type" value={searchType} onChange={(e) => setSearchType(e.target.value as typeof searchType)} className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-2 py-1 text-[10px] text-foreground outline-none">
                  <option value="all">All content</option><option value="text">Text</option><option value="image">Images</option><option value="video">Videos</option><option value="audio">Audio</option><option value="file">Files</option><option value="link">Links</option>
                </select>
                <select id="wevchat-search-sender" name="wevchat_search_sender" value={searchSenderId} onChange={(e) => setSearchSenderId(e.target.value)} aria-label="Filter by sender" className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-2 py-1 text-[10px] text-foreground outline-none max-w-32">
                  <option value="">Any sender</option>{(activeChat.members || []).map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
                </select>
                <input id="wevchat-search-date-from" name="wevchat_search_date_from" type="date" value={searchFrom} onChange={(e) => setSearchFrom(e.target.value)} aria-label="Search from date" className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
                <input id="wevchat-search-date-to" name="wevchat_search_date_to" type="date" value={searchTo} onChange={(e) => setSearchTo(e.target.value)} aria-label="Search to date" className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
              </div>
              {chatSearchHits.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {chatSearchHits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => jumpToMessage(hit.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <p className="text-[11px] text-foreground truncate">{hit.text}</p>
                    </button>
                  ))}
                  {chatSearchHasMore && <button type="button" onClick={loadMoreChatSearch} disabled={chatSearchLoading} className="w-full py-1 text-[10px] font-bold text-primary disabled:opacity-50">{chatSearchLoading ? 'Loading...' : 'Load more results'}</button>}
                </div>
              )}
            </div>
          )}

          <ChatInput
            conversationId={activeChat.id}
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onSubmitEdit={handleEditSubmit}
            onSendPoll={handleSendPoll}
            onSendEvent={handleSendEvent}
            onScheduleMessage={handleScheduleMessage}
            scheduledMessages={scheduledMessages}
            onCancelScheduled={handleCancelScheduled}
            onSendScheduledNow={handleSendScheduledNow}
            onUpdateScheduled={handleUpdateScheduled}
            isPrivateChat={!!activeChat.privateChat?.active}
            onSendGenerate={handleSendGenerate}
            compact={embedded}
          />
        </div>
      )}

      {/* Call chrome lives in ConnectCallProvider (app shell) so sessions survive navigation. */}

      {showInfoDrawer && (
        <Suspense fallback={null}>
          <ChatInfoDrawer
            isOpen={showInfoDrawer}
            onClose={() => setShowInfoDrawer(false)}
            conversation={activeChat}
            currentUserId={user?.id}
            sharedMedia={conversationMedia}
            isOtherOnline={peerPresence}
            onOpenProfile={() => {
              setShowInfoDrawer(false);
              setShowUserProfileModal(true);
            }}
            onStartCall={(type) => activeChat?.otherUser && call.startCall(activeChat.otherUser.id, displayName(activeChat), type, activeChat.id)}
            onConversationUpdated={loadConversations}
            onChatDeleted={() => {
              setShowInfoDrawer(false);
              setActiveChat(null);
              setIsChatOpen(false);
              setShowCallMenu(false);
              writeStoredActiveChatId(null);
              navigate('/messages', { replace: true });
              loadConversations(true);
            }}
            scheduledMessages={scheduledMessages}
            onCancelScheduled={handleCancelScheduled}
            onSendScheduledNow={handleSendScheduledNow}
            onUpdateScheduled={handleUpdateScheduled}
            showInlineSendTime={showInlineSendTime}
            onToggleInlineSendTime={toggleInlineSendTime}
            onSearch={() => {
              setShowChatSearch(true);
              setChatSearchQ('');
              setChatSearchHits([]);
            }}
            onGenerate={() => {
              window.dispatchEvent(new CustomEvent('wev-open-ai-composer'));
            }}
            onJumpToDate={handleJumpToDate}
            onJumpToMessage={(id) => {
              setShowInfoDrawer(false);
              jumpToMessage(id);
            }}
          />
        </Suspense>
      )}

      {showUserProfileModal && (
        <Suspense fallback={null}>
          <UserProfileModal
            isOpen={showUserProfileModal}
            onClose={() => setShowUserProfileModal(false)}
            user={activeChat?.otherUser || null}
            onStartCall={(type) => activeChat?.otherUser && call.startCall(activeChat.otherUser.id, displayName(activeChat), type, activeChat.id)}
            scheduledMessages={scheduledMessages}
            onCancelScheduled={handleCancelScheduled}
            onSendScheduledNow={handleSendScheduledNow}
            onUpdateScheduled={handleUpdateScheduled}
          />
        </Suspense>
      )}

      {showNewChatModal && (
        <Suspense fallback={null}>
          <NewChatModal
            isOpen={showNewChatModal}
            onClose={() => setShowNewChatModal(false)}
            onDirectCreated={handleDirectCreated}
            onOpenGroup={handleOpenGroup}
            groups={conversations.filter((c) => String(c.type || '').toLowerCase() === 'group')}
          />
        </Suspense>
      )}

      {forwardingMessage && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-background/80 backdrop-blur-3xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-sm text-foreground">Forward to</h3>
              <button onClick={() => { setForwardingMessage(null); setForwardTargets(new Set()); setForwardingBatch([]); }} className="text-muted-foreground hover:text-foreground text-xs font-bold">Cancel</button>
            </div>
            <div className="max-h-80 overflow-y-auto no-scrollbar p-2">
              {conversations.map((c) => {
                const checked = forwardTargets.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setForwardTargets((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors duration-150 ${checked ? 'bg-primary/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                      {checked && <span className="text-[10px] font-black">✓</span>}
                    </span>
                    <UserAvatar user={{ name: displayName(c), avatar: chatAvatar(c) }} className="w-8 h-8 text-[11px]" />
                    <span className="text-xs font-semibold text-foreground truncate">{displayName(c)}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-border">
              <button
                type="button"
                onClick={submitForward}
                disabled={forwardTargets.size === 0}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold disabled:opacity-40"
              >
                Send to {forwardTargets.size || 0} chat{forwardTargets.size === 1 ? '' : 's'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}

      <MessageReportModal
        open={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        onSubmit={submitReport}
      />

      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-background/80 backdrop-blur-3xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs bg-card border border-border rounded-3xl shadow-2xl p-5">
            <h3 className="font-black text-sm mb-1">
              {deleteConfirm.everyone ? 'Delete for everyone?' : 'Delete for you?'}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              {deleteConfirm.everyone
                ? 'This removes the message for all participants.'
                : 'This hides the message only in your chat.'}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold">Cancel</button>
              <button type="button" onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-extrabold">Delete</button>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  );

  // Home right-rail embed: always in-flow content (no Rnd portal).
  if (embedded) {
    return InnerContent;
  }

  // Desktop floating window only — never Rnd on mobile/tablet (< md).
  // Pip / desktop-float overlays always stay floating — never expand into a full page shell.
  const effectiveWindowState = isOverlayWindow
    ? (windowState === 'minimized' ? 'minimized' : 'normal')
    : (isDesktopMd() ? windowState : 'maximized');

  if (effectiveWindowState === 'maximized') {
    return InnerContent;
  }

  if (effectiveWindowState === 'minimized') {
    const recentPeers = conversations
      .filter((c) => !c.isArchived)
      .slice(0, 3);
    const restore = () => {
      setWevChatOpenMinimized(false);
      setWindowState('normal');
    };
    return createPortal(
      <div
        role="button"
        tabIndex={0}
        onClick={restore}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            restore();
          }
        }}
        className="fixed bottom-5 right-5 z-[120] flex h-[64px] min-w-[300px] max-w-[360px] cursor-pointer items-center gap-3.5 rounded-full border border-white/30 bg-gradient-to-b from-white/35 to-white/10 px-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-black/10 backdrop-blur-2xl transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] active:scale-[0.99] dark:border-white/15 dark:from-white/18 dark:to-black/55 dark:ring-white/10"
        title="Open Chat"
        aria-label="Open Chat"
      >
        <div className="flex shrink-0 -space-x-2.5" aria-hidden="true">
          {recentPeers.length > 0 ? (
            recentPeers.map((c, i) => (
              <div
                key={c.id}
                className="relative rounded-full ring-2 ring-white/50 dark:ring-black/40"
                style={{ zIndex: 3 - i }}
              >
                <UserAvatar
                  user={{ ...c.otherUser, name: displayName(c) }}
                  src={chatAvatar(c) || c.photo || c.otherUser?.avatar}
                  className="h-10 w-10 text-[11px] shadow-md"
                />
              </div>
            ))
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 ring-2 ring-white/40 dark:bg-white/10 dark:ring-white/15">
              <MessageCircle size={18} className="text-foreground/80" strokeWidth={2.2} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold leading-tight tracking-tight text-foreground drop-shadow-sm">
            Chat
          </p>
          <p className="mt-0.5 truncate text-[12px] font-medium text-foreground/60">
            {recentPeers.length > 0
              ? recentPeers.map((c) => displayName(c)).join(', ')
              : 'No recent chats'}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={restore}
            className="rounded-full p-2 text-foreground/80 transition-colors hover:bg-white/25 hover:text-foreground dark:hover:bg-white/10"
            title="Restore"
            aria-label="Restore"
          >
            <Maximize2 size={17} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={dismissWindow}
            className="rounded-full p-2 text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
            title="Close"
            aria-label="Close"
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const syncRndBox = (_e: unknown, _direction: unknown, ref: HTMLElement, _delta: unknown, position: { x: number; y: number }) => {
    setRndSize({ width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10) });
    setRndPos(position);
  };

  const floating = (
    <div className={`fixed inset-0 pointer-events-none ${pip ? 'z-[120]' : 'z-[80]'}`}>
      <Rnd
        className="pointer-events-auto shadow-2xl rounded-2xl overflow-hidden border border-border/30 bg-background/20 dark:bg-background/25 backdrop-blur-xl"
        size={{ width: rndSize.width, height: rndSize.height }}
        position={{ x: rndPos.x, y: rndPos.y }}
        onDragStop={(_e, d) => setRndPos({ x: d.x, y: d.y })}
        onResize={syncRndBox}
        onResizeStop={syncRndBox}
        minWidth={pip
          ? 320
          : hasSelection
            ? Math.min(
                typeof window !== 'undefined' ? window.innerWidth - 16 : 1200,
                Math.max(SIDEBAR_MIN + FLOAT_CONVERSATION_MIN + 8, sidebarWidth + FLOAT_CONVERSATION_MIN + 8),
              )
            : 360}
        minHeight={pip ? 360 : 300}
        maxWidth={typeof window !== 'undefined' ? window.innerWidth - 16 : undefined}
        maxHeight={typeof window !== 'undefined' ? window.innerHeight - 16 : undefined}
        bounds="window"
        dragHandleClassName="drag-handle"
        cancel="input,textarea,button,a,select,label,[role='button'],.no-drag"
        enableUserSelectHack
        resizeHandleStyles={{
          bottomRight: { width: 18, height: 18, right: 2, bottom: 2 },
          bottomLeft: { width: 14, height: 14, left: 2, bottom: 2 },
          topRight: { width: 14, height: 14, right: 2, top: 2 },
          topLeft: { width: 14, height: 14, left: 2, top: 2 },
        }}
      >
        {InnerContent}
        {/* Visible resize affordance */}
        <div
          className="pointer-events-none absolute bottom-1 right-1 h-3.5 w-3.5 rounded-sm border-r-2 border-b-2 border-muted-foreground/45"
          aria-hidden
        />
      </Rnd>
    </div>
  );

  return isOverlayWindow ? createPortal(floating, document.body) : floating;
};
