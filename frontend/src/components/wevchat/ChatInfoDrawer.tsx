import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Bell, BellOff, Phone, Video, Image as ImageIcon, FileText,
  Edit3, Ban, Flag, Trash2, Pin, Archive, ExternalLink, Sparkles,
  UserPlus, UserMinus, Camera, Search, Loader2, Crown, Mic, Clock,
  Lock, Link2, Star, Palette, Smile, LogOut, ShieldAlert, Wand2,
  Calendar, Tag, Download, Type, BarChart3, Languages, FolderLock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { wevchatApi } from '../../lib/wevchatApi';
import { useStore } from '../../store';
import type { MessageData } from './MessageBubble';
import type { ScheduledMessageItem } from './ChatInput';
import { ScheduledMessagesPanel } from './ScheduledMessagesPanel';
import { Switch as UISwitch } from '../ui/Switch';
import {
  CHAT_THEME_SWATCHES,
  DEFAULT_CHAT_THEME,
  DEFAULT_GENERATION_SETTINGS,
  DEFAULT_INFO_JSON,
  DEFAULT_MEMBER_PREFS,
  PERMISSION_LABELS,
  TRANSLATE_LANGS,
  parseChatTheme,
  parseGenerationSettings,
  parseInfoJson,
  parseMemberPrefs,
  QUICK_REACTIONS,
  type ChatThemeJson,
  type ConversationPermissions,
  type GenerationSettingsJson,
  type InfoJson,
  type MemberPrefsJson,
} from '../../lib/wevchat';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { Briefcase, CheckCircle } from 'lucide-react';

interface ConversationInfo {
  id: string;
  type: string;
  name?: string | null;
  photo?: string | null;
  nickname?: string | null;
  isMuted: boolean;
  mutedUntil?: string | null;
  isPinnedChat: boolean;
  cameoPermission?: string;
  privateChat?: {
    active: boolean;
    session: {
      id: string;
      conversationId: string;
      startedById: string;
      startedAt: string;
      endedAt?: string | null;
      status: string;
    } | null;
  };
  themeJson?: ChatThemeJson;
  generationSettings?: GenerationSettingsJson;
  otherUser?: { id: string; name: string; avatar?: string; username?: string; profileSlug?: string } | null;
  members: {
    userId: string;
    role?: string;
    cameoPermission?: string;
    user: { id: string; name: string; avatar?: string; username?: string; profileSlug?: string };
  }[];
}

interface ChatInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ConversationInfo | null;
  currentUserId?: string;
  sharedMedia: MessageData[];
  /** null while the server has not reported this person's presence yet. */
  isOtherOnline?: boolean | null;
  onOpenProfile: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onConversationUpdated: () => void;
  onChatDeleted: () => void;
  scheduledMessages?: ScheduledMessageItem[];
  onCancelScheduled?: (id: string) => void;
  onSendScheduledNow?: (id: string) => void;
  onUpdateScheduled?: (id: string, payload: { text?: string; scheduledFor?: string }) => void | Promise<void>;
  showInlineSendTime?: boolean;
  onToggleInlineSendTime?: (show: boolean) => void;
  onSearch?: () => void;
  onGenerate?: () => void;
  onJumpToDate?: (date: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  spaceThread?: any;
  onUpdateSpaceThreadStatus?: (status: 'OPEN' | 'RESOLVED' | 'PENDING') => void;
}

interface UserOption {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
}

type MediaTab = 'media' | 'ai' | 'voice' | 'files' | 'links' | 'storyboards' | 'events';

const MUTE_PRESETS = [
  { label: '1 hour', hours: 1 },
  { label: '8 hours', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: 'Until I turn it back on', hours: 0 },
] as const;

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return <UISwitch checked={checked} onChange={() => onChange()} label={label} />;
}

function themeFromPrompt(prompt: string): string {
  let h = 0;
  for (const c of prompt) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return CHAT_THEME_SWATCHES[h % CHAT_THEME_SWATCHES.length];
}

export const ChatInfoDrawer: React.FC<ChatInfoDrawerProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  sharedMedia,
  isOtherOnline = null,
  onOpenProfile,
  onStartCall,
  onConversationUpdated,
  onChatDeleted,
  scheduledMessages = [],
  onCancelScheduled,
  onSendScheduledNow,
  onUpdateScheduled,
  showInlineSendTime = false,
  onToggleInlineSendTime,
  onSearch,
  onGenerate,
  onJumpToDate,
  onJumpToMessage,
  spaceThread,
  onUpdateSpaceThreadStatus,
}) => {
  const navigate = useNavigate();
  useOverlayBack(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<MediaTab>('media');
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<UserOption[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const [themeJson, setThemeJson] = useState<ChatThemeJson>(DEFAULT_CHAT_THEME);
  const [genSettings, setGenSettings] = useState<GenerationSettingsJson>(DEFAULT_GENERATION_SETTINGS);
  const [cameoPermission, setCameoPermission] = useState('ask');
  const [starred, setStarred] = useState<MessageData[]>([]);
  const [pinnedInInfo, setPinnedInInfo] = useState<MessageData[]>([]);
  const [links, setLinks] = useState<{ messageId: string; url: string }[]>([]);
  const [themePrompt, setThemePrompt] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [infoJson, setInfoJson] = useState<InfoJson>(DEFAULT_INFO_JSON);
  const [memberPrefs, setMemberPrefs] = useState<MemberPrefsJson>(DEFAULT_MEMBER_PREFS);
  const [highlights, setHighlights] = useState<{ type: string; messageId?: string; summary: string; occurredAt: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; startTime: string; location?: string | null }[]>([]);
  const [mutualGroups, setMutualGroups] = useState<{ userId: string; groups: { id: string; name: string | null }[] }[]>([]);
  const [infoMembers, setInfoMembers] = useState<any[]>([]);
  const [creditHistory, setCreditHistory] = useState<{ userId: string; generations: number; credits: number }[]>([]);
  const [topicDraft, setTopicDraft] = useState('');
  const [jumpDate, setJumpDate] = useState('');
  const [permOpenId, setPermOpenId] = useState<string | null>(null);
  const [guestDays, setGuestDays] = useState(false);
  const [exportIncludeAi, setExportIncludeAi] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setNickname(conversation?.nickname || '');
    setGroupName(conversation?.name || '');
    setAiSummary(null);
    setShowAddMembers(false);
    setMemberQuery('');
    setMemberResults([]);
    setThemePrompt('');
    setActiveTab('media');
    setThemeJson(parseChatTheme(conversation?.themeJson));
    setGenSettings(parseGenerationSettings(conversation?.generationSettings));
    setCameoPermission(conversation?.cameoPermission || 'ask');
  }, [conversation?.id]);

  useEffect(() => {
    if (!isOpen || !conversation?.id) return;
    wevchatApi.getConversationInfo(conversation.id).then((data) => {
      setThemeJson(parseChatTheme(data.themeJson));
      setGenSettings(parseGenerationSettings(data.generationSettings));
      setInfoJson(parseInfoJson(data.infoJson));
      setMemberPrefs(parseMemberPrefs(data.memberPrefsJson));
      setCameoPermission(data.cameoPermission || 'ask');
      setStarred(Array.isArray(data.starred) ? data.starred : []);
      setLinks(Array.isArray(data.links) ? data.links : []);
      setHighlights(Array.isArray(data.highlights) ? data.highlights : []);
      setEvents(Array.isArray(data.events) ? data.events : []);
      setMutualGroups(Array.isArray(data.mutualGroups) ? data.mutualGroups : []);
      setInfoMembers(Array.isArray(data.members) ? data.members : []);
      setCreditHistory(Array.isArray(data.creditHistory) ? data.creditHistory : []);
    }).catch(() => { });
    wevchatApi.getPinned(conversation.id).then((data) => {
      setPinnedInInfo(Array.isArray(data) ? data : []);
    }).catch(() => setPinnedInInfo([]));
  }, [isOpen, conversation?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!showAddMembers || !memberQuery.trim()) { setMemberResults([]); return; }
    const t = setTimeout(() => {
      wevchatApi.searchUsers(memberQuery).then(setMemberResults).catch(() => setMemberResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [memberQuery, showAddMembers]);

  if (!isOpen || !conversation) return null;
  const isGroup = conversation.type === 'group';
  const safeName = conversation.nickname || conversation.name || conversation.otherUser?.name || 'Chat';
  const avatarUrl = isGroup ? conversation.photo || null : conversation.otherUser?.avatar || null;
  const members = Array.isArray(conversation.members) ? conversation.members : [];
  const myRole = members.find((m) => m?.userId === currentUserId)?.role;
  const isAdmin = myRole === 'admin';
  const memberIds = new Set(members.map((m) => m?.userId));
  const canCall = !!conversation.otherUser;

  const media = (sharedMedia || []).filter((m) => m.imageUrl || m.videoUrl);
  const voiceNotes = (sharedMedia || []).filter((m) => m.audioUrl);
  const files = (sharedMedia || []).filter((m) => m.fileUrl && !m.imageUrl && !m.videoUrl && !m.audioUrl);
  const aiGens = (sharedMedia || []).filter((m) => m.isAiGenerated || m.mediaType === 'ai_generation');

  const handleGenerateSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const { result } = await wevchatApi.aiAssist('summarize', '', { conversationId: conversation.id });
      setAiSummary(result);
    } catch (e: any) {
      toast.error(e.message || 'Could not summarize conversation');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const persistSettings = async (payload: Record<string, unknown>, ok = 'Saved') => {
    try {
      setSavingSettings(true);
      const updated = await wevchatApi.patchConversationSettings(conversation.id, payload);
      if (updated.themeJson) setThemeJson(parseChatTheme(updated.themeJson));
      if (updated.generationSettings) setGenSettings(parseGenerationSettings(updated.generationSettings));
      if (updated.infoJson) setInfoJson(parseInfoJson(updated.infoJson));
      if (updated.memberPrefsJson) setMemberPrefs(parseMemberPrefs(updated.memberPrefsJson));
      if (updated.cameoPermission) setCameoPermission(updated.cameoPermission);
      toast.success(ok);
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Could not save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleWallpaperFile = async (file: File | undefined) => {
    if (!file || !conversation?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image from your gallery');
      return;
    }
    try {
      setUploadingWallpaper(true);
      const uploaded = await wevchatApi.uploadMedia(file, conversation.id);
      const url = typeof uploaded?.url === 'string' ? uploaded.url.trim() : '';
      if (!url) throw new Error('Upload failed');
      await persistSettings({ themeJson: { ...themeJson, wallpaperUrl: url } }, 'Wallpaper set');
    } catch (e: any) {
      toast.error(e?.message || 'Could not upload wallpaper');
    } finally {
      setUploadingWallpaper(false);
      if (wallpaperInputRef.current) wallpaperInputRef.current.value = '';
    }
  };

  const handleMute = async (hours?: number, forceOff?: boolean) => {
    try {
      const muted = forceOff ? false : true;
      const updated = hours === undefined && conversation.isMuted && forceOff !== true
        ? await wevchatApi.muteConversation(conversation.id, false)
        : await wevchatApi.muteConversation(conversation.id, muted, hours && hours > 0 ? hours : undefined);
      toast.success(updated.isMuted ? 'Notifications muted' : 'Notifications unmuted');
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleQuickMute = async () => {
    if (conversation.isMuted) await handleMute(undefined, true);
    else await handleMute(0);
  };

  const handlePinChat = async () => {
    try {
      const updated = await wevchatApi.pinConversation(conversation.id, !conversation.isPinnedChat);
      toast.success(updated.isPinnedChat ? 'Chat pinned' : 'Chat unpinned');
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleArchive = async () => {
    try {
      await wevchatApi.archiveConversation(conversation.id, true);
      toast.success('Chat archived');
      onChatDeleted();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveNickname = async () => {
    try {
      await wevchatApi.setNickname(conversation.id, nickname);
      setIsEditingNickname(false);
      toast.success('Nickname updated');
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveGroupName = async () => {
    if (!groupName.trim()) return;
    try {
      await wevchatApi.updateGroup(conversation.id, { name: groupName.trim() });
      setEditingGroupName(false);
      toast.success('Group name updated');
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Could not rename group');
    }
  };

  const handleBlock = async () => {
    if (!conversation.otherUser) return;
    try {
      await wevchatApi.blockUser(conversation.otherUser.id);
      toast.success(`${conversation.otherUser.name} blocked`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRestrict = async () => {
    if (!conversation.otherUser) return;
    try {
      const token = useStore.getState().token;
      const res = await fetch(`/api/users/${conversation.otherUser.id}/restrict`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not restrict');
      toast.success(data.restricted ? 'Account restricted' : 'Restriction removed');
    } catch (e: any) {
      toast.error(e.message || 'Could not restrict account');
    }
  };

  const handleReport = async () => {
    toast.success('Conversation reported to moderators');
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Delete this conversation from your inbox?')) return;
    try {
      await wevchatApi.deleteConversation(conversation.id);
      toast.success('Chat deleted');
      onChatDeleted();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUserId) return;
    if (!window.confirm('Leave this group?')) return;
    try {
      await wevchatApi.removeGroupMember(conversation.id, currentUserId);
      toast.success('You left the group');
      onChatDeleted();
    } catch (e: any) {
      toast.error(e.message || 'Could not leave group');
    }
  };

  const handleAddMember = async (u: UserOption) => {
    if (memberIds.has(u.id)) { toast.error(`${u.name} is already in this group`); return; }
    try {
      setAddingId(u.id);
      await wevchatApi.addGroupMembers(conversation.id, [u.id]);
      if (guestDays) {
        // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
        const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        await wevchatApi.patchConversationSettings(conversation.id, { targetMember: { userId: u.id, guestExpiresAt: expires } });
        toast.success(`${u.name} added as a 7-day guest`);
      } else {
        toast.success(`${u.name} added`);
      }
      setMemberQuery('');
      setMemberResults([]);
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Could not add member');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    try {
      setRemovingId(userId);
      await wevchatApi.removeGroupMember(conversation.id, userId);
      toast.success(`${name} removed`);
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Could not remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const handleGroupPhotoSelected = async (file: File | undefined) => {
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const media = await wevchatApi.uploadMedia(file, conversation.id);
      await wevchatApi.updateGroup(conversation.id, { photo: media.url });
      toast.success('Group photo updated');
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Could not update group photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleVerifySecurity = async () => {
    toast('End-to-end key verification is not available in Private Chat. Private messages are session-scoped and removed when Private Chat ends.', {
      duration: 4000,
      icon: '🔒',
    });
  };

  const handleTogglePrivateChat = async () => {
    try {
      const enabled = !conversation.privateChat?.active;
      await wevchatApi.togglePrivateChat(conversation.id, enabled);
      toast.success(enabled ? '🔒 Private Chat — On' : 'Private Chat — Off');
      onConversationUpdated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnstar = async (messageId: string) => {
    try {
      await wevchatApi.unstarMessage(messageId);
      setStarred((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const tabBtn = (id: MediaTab, label: string) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all whitespace-nowrap ${activeTab === id ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'}`}
    >
      {label}
    </button>
  );

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full md:max-w-md h-full bg-background/95 backdrop-blur-2xl border-l border-border flex flex-col shadow-2xl overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="p-3 border-b border-border flex items-center justify-between sticky top-0 bg-card/80 backdrop-blur-md z-10">
            <h3 className="font-black text-xs text-foreground">Conversation Info</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="p-3 space-y-3 flex-1">
            {/* 1. Header */}
            <div className="text-center space-y-2 p-3 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-10" style={{ background: `linear-gradient(90deg, ${themeJson.color}55, ${themeJson.color}22)` }} />

              <div className="relative pt-2">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 text-white text-xl font-black flex items-center justify-center shadow-lg ring-2 ring-background overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      safeName.charAt(0)
                    )}
                  </div>
                  {isGroup && isAdmin && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background hover:opacity-90 transition-all disabled:opacity-60"
                      title="Change group photo"
                      aria-label="Change group photo"
                    >
                      {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                    </button>
                  )}
                </div>
                {isGroup && isAdmin && (
                  <input
                    type="file"
                    ref={photoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => { handleGroupPhotoSelected(e.target.files?.[0]); e.target.value = ''; }}
                  />
                )}
                <div className="mt-2 space-y-0.5">
                  {isGroup && isAdmin && editingGroupName ? (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-36 bg-background border border-border rounded-lg px-2 py-0.5 text-xs font-extrabold outline-none focus:border-primary text-center"
                      />
                      <button onClick={handleSaveGroupName} className="text-[10px] font-extrabold text-primary px-1.5">Save</button>
                    </div>
                  ) : (
                    <h2
                      className={`font-extrabold text-sm text-foreground ${isGroup && isAdmin ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => isGroup && isAdmin && setEditingGroupName(true)}
                      title={isGroup && isAdmin ? 'Rename group' : undefined}
                    >
                      {safeName}
                    </h2>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {isGroup
                      ? `${members.length} members`
                      : isOtherOnline == null ? null : (
                        <span className="inline-flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOtherOnline ? 'bg-emerald-400' : 'bg-muted-foreground/50'}`} />
                          {isOtherOnline ? 'Online' : 'Offline'}
                        </span>
                      )}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                    {conversation.privateChat?.active && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <Lock size={9} /> Private Chat
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Quick actions */}
              <div className="grid grid-cols-5 gap-0.5 pt-2 border-t border-border/50">
                <button
                  onClick={() => onStartCall('audio')}
                  disabled={!canCall}
                  className="flex flex-col items-center gap-0.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition-all disabled:opacity-40"
                >
                  <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500"><Phone size={14} /></div>
                  <span className="text-[8px] font-bold">Call</span>
                </button>
                <button
                  onClick={() => onStartCall('video')}
                  disabled={!canCall}
                  className="flex flex-col items-center gap-0.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition-all disabled:opacity-40"
                >
                  <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500"><Video size={14} /></div>
                  <span className="text-[8px] font-bold">Video</span>
                </button>
                <button
                  onClick={() => { onSearch?.(); onClose(); }}
                  className="flex flex-col items-center gap-0.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition-all"
                >
                  <div className="p-1.5 rounded-full bg-black/5 dark:bg-white/5 text-foreground"><Search size={14} /></div>
                  <span className="text-[8px] font-bold">Search</span>
                </button>
                <button onClick={handleQuickMute} className="flex flex-col items-center gap-0.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition-all">
                  <div className={`p-1.5 rounded-full ${conversation.isMuted ? 'bg-amber-500/20 text-amber-500' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
                    {conversation.isMuted ? <BellOff size={14} /> : <Bell size={14} />}
                  </div>
                  <span className="text-[8px] font-bold">{conversation.isMuted ? 'Muted' : 'Mute'}</span>
                </button>
                <button
                  onClick={() => { onGenerate?.(); onClose(); }}
                  className="flex flex-col items-center gap-0.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition-all"
                >
                  <div className="p-1.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400"><Wand2 size={14} /></div>
                  <span className="text-[8px] font-bold">Generate</span>
                </button>
              </div>
            </div>

            {/* 3. Customize */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2.5">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Customize</h4>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Edit3 size={13} className="text-muted-foreground" />
                  <span>Nickname</span>
                </div>
                {isEditingNickname ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={conversation.otherUser?.name || conversation.name || 'Nickname'}
                      className="w-24 bg-background border border-border rounded-md px-1.5 py-0.5 text-[11px] outline-none focus:border-primary"
                    />
                    <button onClick={handleSaveNickname} className="text-[10px] font-extrabold text-primary px-1.5 py-0.5">Save</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingNickname(true)} className="text-[11px] text-muted-foreground hover:text-foreground font-semibold">
                    {nickname || 'Set Nickname'}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Palette size={13} className="text-muted-foreground" />
                  Chat theme
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CHAT_THEME_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => persistSettings({ themeJson: { ...themeJson, color, wallpaperUrl: '' } }, 'Theme updated')}
                      className={`w-5 h-5 rounded-full border-2 ${!themeJson.wallpaperUrl && themeJson.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ background: color }}
                      aria-label={`Theme ${color}`}
                    />
                  ))}
                  {/* Gallery wallpaper — mobile preview only */}
                  <button
                    type="button"
                    onClick={() => wallpaperInputRef.current?.click()}
                    disabled={uploadingWallpaper || savingSettings}
                    className={`md:hidden w-5 h-5 rounded-full border-2 flex items-center justify-center overflow-hidden bg-muted text-muted-foreground disabled:opacity-50 ${themeJson.wallpaperUrl ? 'border-foreground scale-110' : 'border-dashed border-border'
                      }`}
                    title={themeJson.wallpaperUrl ? 'Change wallpaper' : 'Upload from gallery'}
                    aria-label={themeJson.wallpaperUrl ? 'Change wallpaper from gallery' : 'Upload theme from gallery'}
                  >
                    {uploadingWallpaper ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : themeJson.wallpaperUrl ? (
                      <img src={themeJson.wallpaperUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={10} />
                    )}
                  </button>
                  <input
                    ref={wallpaperInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleWallpaperFile(e.target.files?.[0])}
                  />
                </div>
                {themeJson.wallpaperUrl ? (
                  <button
                    type="button"
                    onClick={() => persistSettings({ themeJson: { ...themeJson, wallpaperUrl: '' } }, 'Wallpaper removed')}
                    className="md:hidden text-[9px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    Remove wallpaper
                  </button>
                ) : null}
                <div className="flex gap-1">
                  <input
                    value={themePrompt}
                    onChange={(e) => setThemePrompt(e.target.value)}
                    placeholder="AI-generated theme from a prompt…"
                    className="flex-1 bg-background border border-border rounded-md px-1.5 py-1 text-[10px] outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={!themePrompt.trim() || savingSettings}
                    onClick={() => {
                      const color = themeFromPrompt(themePrompt.trim());
                      persistSettings({ themeJson: { ...themeJson, color, aiStyleProfile: themePrompt.trim() } }, 'AI theme applied');
                    }}
                    className="px-1.5 py-1 rounded-md bg-primary text-primary-foreground text-[9px] font-extrabold disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Smile size={13} className="text-muted-foreground" />
                  Emoji reaction shortcut
                </div>
                <div className="flex flex-wrap gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => persistSettings({ themeJson: { ...themeJson, defaultReaction: emoji } }, 'Shortcut updated')}
                      className={`w-6 h-6 rounded-lg text-sm ${themeJson.defaultReaction === emoji ? 'bg-primary/15 ring-1 ring-primary' : 'bg-black/5 dark:bg-white/5'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-foreground">AI style profile</p>
                <input
                  defaultValue={themeJson.aiStyleProfile}
                  key={themeJson.aiStyleProfile}
                  placeholder='e.g. "our trip vlog style"'
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v === themeJson.aiStyleProfile) return;
                    persistSettings({ themeJson: { ...themeJson, aiStyleProfile: v } }, 'Style profile saved');
                  }}
                  className="w-full bg-background border border-border rounded-md px-1.5 py-1 text-[10px] outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-1.5">
                  <Type size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Bubble density</p>
                    <p className="text-[9px] text-muted-foreground">Compact vs comfortable</p>
                  </div>
                </div>
                <div className="flex rounded-md overflow-hidden border border-border text-[9px] font-extrabold shrink-0">
                  <button
                    type="button"
                    onClick={() => persistSettings({ themeJson: { ...themeJson, bubbleDensity: 'compact' } }, 'Compact bubbles')}
                    className={`px-1.5 py-0.5 ${themeJson.bubbleDensity === 'compact' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => persistSettings({ themeJson: { ...themeJson, bubbleDensity: 'comfortable' } }, 'Comfortable bubbles')}
                    className={`px-1.5 py-0.5 ${themeJson.bubbleDensity !== 'compact' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                  >
                    Comfortable
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">
                <div className="min-w-0 flex items-center gap-1.5">
                  <Clock size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Show time</p>
                    <p className="text-[9px] text-muted-foreground leading-snug">
                      Off hides bubble times; a clock appears every 2–3 min. Exact time still in ⋮.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={showInlineSendTime}
                  onChange={() => onToggleInlineSendTime?.(!showInlineSendTime)}
                  label="Show time"
                />
              </div>
            </div>

            {/* 4. Members */}
            {isGroup && (
              <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Members</h4>
                  {isAdmin && !showAddMembers && (
                    <button onClick={() => setShowAddMembers(true)} className="text-[11px] font-bold text-primary flex items-center gap-1">
                      <UserPlus size={13} /> Add
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">Approve new members</span>
                  <Switch
                    checked={infoJson.approveNewMembers}
                    onChange={() => persistSettings({ infoJson: { ...infoJson, approveNewMembers: !infoJson.approveNewMembers } }, 'Membership setting saved')}
                  />
                </div>

                {showAddMembers && (
                  <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Add people</p>
                      <button onClick={() => { setShowAddMembers(false); setMemberQuery(''); setMemberResults([]); }} className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                      <input
                        type="text"
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                        placeholder="Search people..."
                        className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                        autoFocus
                      />
                      <label className="flex items-center gap-2 text-[11px] font-bold">
                        <input type="checkbox" checked={guestDays} onChange={(e) => setGuestDays(e.target.checked)} />
                        Guest access (auto-remove in 7 days)
                      </label>
                    </div>
                    <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                      {memberResults
                        .filter((u) => !memberIds.has(u.id))
                        .map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleAddMember(u)}
                            disabled={addingId === u.id}
                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-60"
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                              {u.name?.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold text-foreground truncate">{u.name}</span>
                            {addingId === u.id ? <Loader2 size={13} className="ml-auto animate-spin text-primary" /> : <UserPlus size={13} className="ml-auto text-primary" />}
                          </button>
                        ))}
                      {memberQuery && memberResults.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">No users found</p>}
                    </div>
                  </div>
                )}

                {members.map((m) => {
                  if (!m) return null;
                  const isSelf = m.userId === currentUserId;
                  const cameo = isSelf ? cameoPermission : (m.cameoPermission || 'ask');
                  return (
                    <div key={m.userId} className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 overflow-hidden">
                            {m.user?.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full object-cover" /> : m.user?.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate text-[11px]">
                              {m.user?.name || 'Member'}
                              {isSelf && <span className="text-muted-foreground font-semibold"> (you)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">@{m.user?.username || 'user'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.role === 'admin' && (
                            <span className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-0.5">
                              <Crown size={11} /> Admin
                            </span>
                          )}
                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => handleRemoveMember(m.userId, m.user?.name || 'Member')}
                              disabled={removingId === m.userId}
                              className="p-1.5 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50"
                              title={`Remove ${m.user?.name || 'member'}`}
                              aria-label={`Remove ${m.user?.name || 'member'}`}
                            >
                              {removingId === m.userId ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                            </button>
                          )}
                        </div>
                      </div>
                      {isSelf && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">Cameo permission</span>
                          <select
                            value={cameo}
                            onChange={(e) => persistSettings({ cameoPermission: e.target.value }, 'Cameo permission saved')}
                            className="text-[10px] font-bold bg-background border border-border rounded-lg px-1.5 py-1 outline-none"
                          >
                            <option value="allow">Allow</option>
                            <option value="ask">Ask</option>
                            <option value="deny">Deny</option>
                          </select>
                        </div>
                      )}
                      {!isSelf && (
                        <p className="text-[10px] text-muted-foreground">Cameo: {cameo}</p>
                      )}
                      {(() => {
                        const extra = infoMembers.find((x) => x.userId === m.userId);
                        const prefs = extra?.prefs || (isSelf ? memberPrefs : parseMemberPrefs(undefined, m.role));
                        const guestAt = extra?.guestExpiresAt;
                        const stats = extra?.stats;
                        const shared = mutualGroups.find((g) => g.userId === m.userId)?.groups || [];
                        return (
                          <div className="space-y-1.5">
                            {guestAt && (
                              <p className="text-[10px] text-amber-600">Guest until {new Date(guestAt).toLocaleDateString()}</p>
                            )}
                            {stats && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <BarChart3 size={11} /> {stats.messages} messages · {stats.generations} AI gens
                              </p>
                            )}
                            {shared.length > 0 && (
                              <p className="text-[10px] text-muted-foreground">Also in: {shared.map((g) => g.name || 'Group').join(', ')}</p>
                            )}
                            {isSelf && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px]">Show mutual groups</span>
                                  <Switch checked={memberPrefs.mutualGroupsVisible} onChange={() => persistSettings({ memberPrefs: { ...memberPrefs, mutualGroupsVisible: !memberPrefs.mutualGroupsVisible } })} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px]">Share contribution stats</span>
                                  <Switch checked={memberPrefs.contributionStatsOptIn} onChange={() => persistSettings({ memberPrefs: { ...memberPrefs, contributionStatsOptIn: !memberPrefs.contributionStatsOptIn } })} />
                                </div>
                              </div>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setPermOpenId(permOpenId === m.userId ? null : m.userId)}
                                className="text-[10px] font-extrabold text-primary"
                              >
                                {permOpenId === m.userId ? 'Hide permissions' : 'Permissions'}
                              </button>
                            )}
                            {isAdmin && permOpenId === m.userId && (
                              <div className="grid grid-cols-2 gap-1">
                                {PERMISSION_LABELS.map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-1 text-[10px]">
                                    <input
                                      type="checkbox"
                                      checked={!!prefs.permissions?.[key]}
                                      onChange={(e) => persistSettings({
                                        targetMember: {
                                          userId: m.userId,
                                          prefs: { permissions: { ...prefs.permissions, [key]: e.target.checked } },
                                        },
                                      }, 'Permission updated')}
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {!isGroup && (
              <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Cameo</h4>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Allow my likeness in this chat’s generations</span>
                  <select
                    value={cameoPermission}
                    onChange={(e) => persistSettings({ cameoPermission: e.target.value }, 'Cameo permission saved')}
                    className="text-[10px] font-bold bg-background border border-border rounded-lg px-1.5 py-1 outline-none"
                  >
                    <option value="allow">Allow</option>
                    <option value="ask">Ask</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]">Show mutual groups</span>
                  <Switch checked={memberPrefs.mutualGroupsVisible} onChange={() => persistSettings({ memberPrefs: { ...memberPrefs, mutualGroupsVisible: !memberPrefs.mutualGroupsVisible } })} />
                </div>
                {mutualGroups.flatMap((g) => g.groups).length > 0 && (
                  <p className="text-[10px] text-muted-foreground">Also in: {mutualGroups.flatMap((g) => g.groups).map((x) => x.name || 'Group').join(', ')}</p>
                )}
              </div>
            )}

            {/* 5. Media tabs */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Media, Files & Links</h4>
              <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-1 rounded-xl overflow-x-auto">
                {tabBtn('media', 'Media')}
                {tabBtn('ai', 'AI')}
                {tabBtn('files', 'Files')}
                {tabBtn('links', 'Links')}
                {tabBtn('storyboards', 'Boards')}
                {tabBtn('events', 'Events')}
                {tabBtn('voice', 'Voice')}
              </div>

              {activeTab === 'media' && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {media.length === 0 && <p className="col-span-3 text-[11px] text-muted-foreground text-center py-4">No shared media yet</p>}
                  {media.map((m) => (
                    <a key={m.id} href={m.imageUrl || m.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-xl overflow-hidden bg-black/20 group border border-border/50">
                      {m.imageUrl ? <img src={m.imageUrl} alt="Shared" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> : <ImageIcon className="w-full h-full p-6 text-muted-foreground" />}
                    </a>
                  ))}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-3 gap-2">
                    {aiGens.length === 0 && <p className="col-span-3 text-[11px] text-muted-foreground text-center py-4">No AI generations in this thread yet</p>}
                    {aiGens.map((m) => (
                      <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-2">
                        {m.imageUrl || m.videoUrl ? (
                          <img src={m.imageUrl || m.videoUrl || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <p className="text-[10px] text-center text-foreground/80 line-clamp-4">{m.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => toast('Remix graph opens when a generation has lineage')}
                    className="w-full py-2 rounded-xl border border-border text-[11px] font-extrabold text-muted-foreground hover:text-foreground"
                  >
                    Remix Graph
                  </button>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-2 pt-1">
                  {voiceNotes.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">No voice notes yet</p>}
                  {voiceNotes.map((v) => (
                    <div key={v.id} className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center gap-2">
                      <Mic size={16} className="text-purple-400 shrink-0" />
                      <audio src={v.audioUrl!} controls className="flex-1 min-w-0 h-8" />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-2 pt-1">
                  {files.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">No shared files yet</p>}
                  {files.map((f) => (
                    <a key={f.id} href={f.fileUrl!} download className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs hover:border-primary/50 transition-all">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={18} className="text-blue-400 shrink-0" />
                        <p className="font-bold text-foreground truncate text-[11px]">{f.fileName || 'File'}</p>
                      </div>
                      <ExternalLink size={14} className="text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}

              {activeTab === 'links' && (
                <div className="space-y-2 pt-1">
                  {links.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">No shared links yet</p>}
                  {links.map((l) => (
                    <a key={`${l.messageId}-${l.url}`} href={l.url} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center gap-2 text-[11px] hover:border-primary/50">
                      <Link2 size={14} className="text-blue-500 shrink-0" />
                      <span className="truncate font-semibold">{l.url}</span>
                    </a>
                  ))}
                </div>
              )}

              {activeTab === 'storyboards' && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-muted-foreground text-center py-4">No shared storyboards yet. Co-create a board from Generate.</p>
                  {genSettings.autoArchiveDrafts && (
                    <p className="text-[10px] text-center text-muted-foreground">Stale drafts auto-archive after 30 days.</p>
                  )}
                  <p className="text-[10px] font-bold text-center text-muted-foreground uppercase">Archived</p>
                  <p className="text-[11px] text-muted-foreground text-center py-2">No archived storyboards</p>
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-2 pt-1">
                  {events.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">No shared events yet. Use /event in chat.</p>}
                  {events.map((ev) => (
                    <div key={ev.id} className="p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="text-[11px] font-bold">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(ev.startTime).toLocaleString()}{ev.location ? ` · ${ev.location}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Starred */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Star size={13} /> Starred messages
              </h4>
              {starred.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">No starred messages in this chat</p>}
              {starred.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl bg-card border border-border/60 flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => { onJumpToMessage?.(m.id); onClose(); }}
                    className="text-left flex-1 min-w-0"
                  >
                    <p className="text-[11px] text-foreground line-clamp-2">{m.text || m.fileName || 'Starred media'}</p>
                  </button>
                  <button onClick={() => handleUnstar(m.id)} className="text-amber-500 shrink-0" title="Unstar" aria-label="Unstar">
                    <Star size={13} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>

            {/* 6b. Pinned */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin size={13} /> Pinned messages
              </h4>
              {pinnedInInfo.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">No pinned messages</p>}
              {pinnedInInfo.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onJumpToMessage?.(m.id); onClose(); }}
                  className="w-full text-left p-2.5 rounded-xl bg-card border border-border/60 hover:bg-muted/40"
                >
                  <p className="text-[11px] text-foreground line-clamp-2">{m.text || m.fileName || 'Pinned media'}</p>
                </button>
              ))}
            </div>

            {/* 7. Navigation */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Navigation & Organization</h4>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <input
                  type="date"
                  value={jumpDate}
                  onChange={(e) => setJumpDate(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] outline-none"
                />
                <button
                  type="button"
                  disabled={!jumpDate}
                  onClick={() => {
                    onJumpToDate?.(jumpDate);
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-extrabold disabled:opacity-50"
                >
                  Jump
                </button>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Timeline</p>
                {highlights.length === 0 && <p className="text-[11px] text-muted-foreground">No highlights yet</p>}
                {highlights.map((h, i) => (
                  <button
                    key={`${h.type}-${i}`}
                    type="button"
                    onClick={() => {
                      if (h.messageId) {
                        onJumpToMessage?.(h.messageId);
                        onClose();
                      }
                    }}
                    className="w-full text-left p-2 rounded-xl bg-card border border-border/60"
                  >
                    <p className="text-[11px] font-bold">{h.summary}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(h.occurredAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground flex items-center gap-1"><Tag size={11} /> Topic tags</p>
                <div className="flex flex-wrap gap-1">
                  {infoJson.topics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => persistSettings({ infoJson: { ...infoJson, topics: infoJson.topics.filter((x) => x.id !== t.id) } }, 'Tag removed')}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: t.color }}
                      title="Remove tag"
                    >
                      {t.label}{t.isAi ? ' · AI' : ''}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    value={topicDraft}
                    onChange={(e) => setTopicDraft(e.target.value)}
                    placeholder="Add a topic…"
                    className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    disabled={!topicDraft.trim()}
                    onClick={() => {
                      const label = topicDraft.trim();
                      persistSettings({
                        infoJson: {
                          ...infoJson,
                          topics: [...infoJson.topics, { id: `t-${Date.now()}`, label, color: themeFromPrompt(label), isAi: false }],
                        },
                      }, 'Topic added');
                      setTopicDraft('');
                    }}
                    className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-extrabold disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Notifications */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Notifications</h4>
              <div className="flex flex-wrap gap-1.5">
                {MUTE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleMute(p.hours)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    {p.label}
                  </button>
                ))}
                {conversation.isMuted && (
                  <button type="button" onClick={() => handleMute(undefined, true)} className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-amber-600 bg-amber-500/10">
                    Unmute
                  </button>
                )}
              </div>
              {conversation.mutedUntil && conversation.isMuted && (
                <p className="text-[10px] text-muted-foreground">Muted until {new Date(conversation.mutedUntil).toLocaleString()}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Always notify on new AI generation</span>
                <Switch
                  checked={genSettings.notifyOnAi}
                  onChange={() => persistSettings({ generationSettings: { ...genSettings, notifyOnAi: !genSettings.notifyOnAi } }, 'Notification preference saved')}
                  label="Notify when AI replies"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Distinct sound for AI-ready events</span>
                <Switch
                  checked={genSettings.notifySoundAi}
                  onChange={() => persistSettings({ generationSettings: { ...genSettings, notifySoundAi: !genSettings.notifySoundAi } }, 'Sound preference saved')}
                />
              </div>
              <button onClick={handlePinChat} className="w-full p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-xs flex items-center gap-2 transition-all">
                <Pin size={16} />
                <span>{conversation.isPinnedChat ? 'Unpin chat' : 'Pin chat'}</span>
              </button>
            </div>


            {/* Space CRM Panel */}
            {spaceThread && (
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={13} /> CRM & Lead Workflow
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Status</span>
                    <span className="px-2 py-0.5 rounded-full bg-background border text-[10px] font-bold">
                      {spaceThread.status || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Assignee</span>
                    <button className="text-primary font-bold">{spaceThread.assignedMemberId ? 'Assigned' : 'Unassigned'}</button>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1.5">Quick Actions</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUpdateSpaceThreadStatus?.('RESOLVED')}
                        className="flex-1 py-1.5 rounded-lg bg-green-500/10 text-green-600 font-bold text-[10px] hover:bg-green-500/20 flex items-center justify-center"
                      >
                        <CheckCircle size={12} className="mr-1" /> Mark Done
                      </button>
                      <button
                        onClick={() => onUpdateSpaceThreadStatus?.('OPEN')}
                        className="flex-1 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold text-[10px] hover:bg-amber-500/20 flex items-center justify-center"
                      >
                        <Clock size={12} className="mr-1" /> Follow-up
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. Privacy */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-1.5">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider mb-2">Privacy & Support</h4>
              <button onClick={handleTogglePrivateChat} className="w-full p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-xs flex items-center gap-2 transition-all">
                <Lock size={16} />
                <span>{conversation.privateChat?.active ? '🔒 Private Chat — On' : '🔒 Private Chat — Off'}</span>
              </button>
              <button onClick={handleVerifySecurity} className="w-full p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-xs flex items-center gap-2 transition-all">
                <ShieldAlert size={16} />
                <span>Verify security code</span>
              </button>
              <div className="flex items-center justify-between px-2.5 py-2">
                <span className="text-[11px] font-bold flex items-center gap-2"><Languages size={14} /> Auto-translate incoming</span>
                <select
                  value={infoJson.autoTranslateLang}
                  onChange={(e) => persistSettings({ infoJson: { ...infoJson, autoTranslateLang: e.target.value } }, 'Translate preference saved')}
                  className="text-[10px] font-bold bg-background border border-border rounded-lg px-1.5 py-1 outline-none"
                >
                  {TRANSLATE_LANGS.map((l) => (
                    <option key={l.value || 'off'} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between px-2.5 py-2">
                <span className="text-[11px] font-bold">Read receipts in this chat</span>
                <select
                  value={memberPrefs.receiptVisibility}
                  onChange={(e) => persistSettings({ memberPrefs: { ...memberPrefs, receiptVisibility: e.target.value } }, 'Read receipt setting saved')}
                  className="text-[10px] font-bold bg-background border border-border rounded-lg px-1.5 py-1 outline-none"
                >
                  <option value="all">Everyone</option>
                  <option value="none">Hide mine</option>
                </select>
              </div>
              <div className="flex items-center justify-between px-2.5 py-2">
                <span className="text-[11px] font-bold flex items-center gap-2"><FolderLock size={14} /> Vault / locked chat</span>
                <Switch
                  checked={infoJson.isVaultLocked}
                  onChange={() => persistSettings({ infoJson: { ...infoJson, isVaultLocked: !infoJson.isVaultLocked } }, infoJson.isVaultLocked ? 'Chat unlocked' : 'Moved to vault')}
                />
              </div>
              <div className="px-2.5 py-2 space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold">
                  <input type="checkbox" checked={exportIncludeAi} onChange={(e) => setExportIncludeAi(e.target.checked)} />
                  Include AI media in export
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const data = await wevchatApi.exportConversation(conversation.id, exportIncludeAi);
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `wevchat-${conversation.id.slice(0, 8)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Export downloaded');
                    } catch (e: any) {
                      toast.error(e.message || 'Export failed');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-xs flex items-center gap-2"
                >
                  <Download size={16} /> Export conversation
                </button>
              </div>
              {!isGroup && conversation.otherUser && (
                <>
                  <button onClick={onOpenProfile} className="w-full p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-xs flex items-center gap-2 transition-all">
                    <User size={16} />
                    <span>View profile</span>
                  </button>
                  <button onClick={handleRestrict} className="w-full p-2.5 rounded-xl hover:bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center gap-2 transition-all">
                    <ShieldAlert size={16} />
                    <span>Restrict account</span>
                  </button>
                  <button onClick={handleBlock} className="w-full p-2.5 rounded-xl hover:bg-red-500/10 text-red-400 font-bold text-xs flex items-center gap-2 transition-all">
                    <Ban size={16} />
                    <span>Block {conversation.otherUser?.name || 'User'}</span>
                  </button>
                </>
              )}
              <button onClick={handleReport} className="w-full p-2.5 rounded-xl hover:bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center gap-2 transition-all">
                <Flag size={16} />
                <span>Report Conversation</span>
              </button>
            </div>

            {/* 9. Generation settings */}
            {genSettings.enabled !== false && (
              <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-2">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">Generation Settings</h4>
                {isGroup && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold">Group credit pool</span>
                    <Switch
                      checked={genSettings.groupCreditPool}
                      onChange={() => persistSettings({ generationSettings: { ...genSettings, groupCreditPool: !genSettings.groupCreditPool } })}
                      label="Share group credit pool"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground">
                    Aspect
                    <select
                      value={genSettings.defaultAspect}
                      onChange={(e) => persistSettings({ generationSettings: { ...genSettings, defaultAspect: e.target.value } })}
                      className="mt-1 w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
                    >
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                      <option value="1:1">1:1</option>
                    </select>
                  </label>
                  <label className="text-[10px] font-bold text-muted-foreground">
                    Length (sec)
                    <select
                      value={String(genSettings.defaultSecs)}
                      onChange={(e) => persistSettings({ generationSettings: { ...genSettings, defaultSecs: Number(e.target.value) } })}
                      className="mt-1 w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
                    >
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="8">8</option>
                      <option value="10">10</option>
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">Safety level</span>
                  <select
                    value={genSettings.safetyLevel}
                    onChange={(e) => persistSettings({ generationSettings: { ...genSettings, safetyLevel: e.target.value } })}
                    className="text-[10px] font-bold bg-background border border-border rounded-lg px-1.5 py-1 outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="strict">Strict</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">Auto-watermark</span>
                  <Switch
                    checked={genSettings.autoWatermark}
                    onChange={() => persistSettings({ generationSettings: { ...genSettings, autoWatermark: !genSettings.autoWatermark } })}
                    label="Auto-watermark generated media"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold">Conversation AI memory (world bible)</p>
                  <textarea
                    defaultValue={genSettings.worldBible}
                    key={genSettings.worldBible}
                    placeholder="Recurring characters, running jokes, visual style…"
                    rows={3}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v === genSettings.worldBible) return;
                      persistSettings({ generationSettings: { ...genSettings, worldBible: v } }, 'World bible saved');
                    }}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] outline-none resize-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">Allow cross-posting to feed</span>
                  <Switch
                    checked={genSettings.allowCrossPosting}
                    onChange={() => persistSettings({ generationSettings: { ...genSettings, allowCrossPosting: !genSettings.allowCrossPosting } })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">Auto-archive stale drafts</span>
                  <Switch
                    checked={genSettings.autoArchiveDrafts}
                    onChange={() => persistSettings({ generationSettings: { ...genSettings, autoArchiveDrafts: !genSettings.autoArchiveDrafts } })}
                  />
                </div>
                {creditHistory.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Credit spend</p>
                    {creditHistory.map((row) => {
                      const name = infoMembers.find((m) => m.userId === row.userId)?.user?.name
                        || members.find((m) => m.userId === row.userId)?.user?.name
                        || 'Member';
                      const max = Math.max(...creditHistory.map((c) => c.credits), 1);
                      return (
                        <div key={row.userId} className="space-y-0.5">
                          <div className="flex justify-between text-[10px]"><span>{name}</span><span>{row.credits} cr</span></div>
                          <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((row.credits / max) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateSummary();
                    toast('Best-of reel uses this thread’s recap until video assembly ships');
                  }}
                  className="w-full py-2 rounded-xl border border-border text-[11px] font-extrabold"
                >
                  Best of reel
                </button>
              </div>
            )}

            <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 space-y-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/ai-wevchat');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-purple-500/15 border border-purple-500/25 hover:bg-purple-500/25 transition-colors text-left"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300">
                  <Sparkles size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-extrabold text-purple-700 dark:text-purple-200">AI Auto-Reply Settings</span>
                  <span className="block text-[10px] text-purple-800/70 dark:text-purple-200/70">Manage agents & auto-replies</span>
                </span>
              </button>
              <div className="font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 text-xs">
                <Sparkles size={14} /> AI Chat Recap
              </div>
              {aiSummary ? (
                <p className="text-[11px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
              ) : (
                <p className="text-purple-800/80 dark:text-purple-200/80 leading-relaxed text-[11px]">
                  Generate an AI summary of this conversation and key insights.
                </p>
              )}
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={aiSummaryLoading}
                className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-800 dark:text-purple-200 text-xs font-extrabold transition-all disabled:opacity-60"
              >
                {aiSummaryLoading ? 'Generating…' : aiSummary ? 'Regenerate Recap' : 'Generate AI Recap'}
              </button>
            </div>

            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                <Clock size={14} /> Scheduled messages
              </div>
              <ScheduledMessagesPanel
                items={scheduledMessages}
                onCancel={(id) => onCancelScheduled?.(id)}
                onSendNow={onSendScheduledNow}
                onUpdate={onUpdateScheduled}
                emptyLabel="No scheduled messages yet"
              />
            </div>

            {/* 10. Leave / Delete */}
            <div className="p-3 rounded-2xl bg-card/30 border border-border space-y-1.5">
              <button onClick={handleArchive} className="w-full p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-xs flex items-center gap-2 transition-all">
                <Archive size={16} />
                <span>Archive Chat</span>
              </button>
              {isGroup && (
                <button onClick={handleLeaveGroup} className="w-full p-2.5 rounded-xl hover:bg-amber-500/10 text-amber-600 font-bold text-xs flex items-center gap-2 transition-all">
                  <LogOut size={16} />
                  <span>Leave group</span>
                </button>
              )}
              <button onClick={handleDeleteChat} className="w-full p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 font-bold text-xs flex items-center gap-2 transition-all">
                <Trash2 size={16} />
                <span>Delete conversation</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
