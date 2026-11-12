import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, MessageCircle, Phone, Video, UserPlus, UserCheck,
  MapPin, Calendar, Share2, ExternalLink, CheckCircle2, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { profileHandleFor, profilePathFor } from '../../lib/profileLinks';
import UserAvatar from '../UserAvatar';
import { Button } from '../ui/Button';
import { ScheduledMessagesPanel } from './ScheduledMessagesPanel';
import type { ScheduledMessageItem } from './scheduleUtils';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import { toastSpaceModeFriendsBlocked } from '../../lib/spaceModeFriends';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: string;
    name: string;
    username?: string;
    profileSlug?: string;
    handle?: string;
    avatar?: string;
    cover?: string;
    bio?: string;
    location?: string;
    joinedDate?: string;
    isVerified?: boolean;
  } | null;
  onStartCall?: (type: 'audio' | 'video') => void;
  scheduledMessages?: ScheduledMessageItem[];
  onCancelScheduled?: (id: string) => void;
  onSendScheduledNow?: (id: string) => void;
  onUpdateScheduled?: (id: string, payload: { text?: string; scheduledFor?: string }) => void | Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onStartCall,
  scheduledMessages = [],
  onCancelScheduled,
  onSendScheduledNow,
  onUpdateScheduled,
}) => {
  const navigate = useNavigate();
  useOverlayBack(isOpen, onClose);
  const token = useStore((s) => s.token);
  const { isSpaceMode } = useSpaceIdentities();
  const [isFriend, setIsFriend] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setIsFriend(false);
  }, [user?.id]);

  if (!isOpen || !user) return null;

  const safeName = user.name || 'User';
  const userHandle = profileHandleFor(user) || safeName.toLowerCase().replace(/\s+/g, '_');
  const profilePath = profilePathFor(user);

  const handleFriendAction = async () => {
    if (isSpaceMode) {
      toastSpaceModeFriendsBlocked();
      return;
    }
    if (!user.id || isFriend) return;
    try {
      setSendingRequest(true);
      const res = await fetch(`/api/friends/request/${user.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to send friend request');
      setIsFriend(true);
      toast.success('Friend request sent!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        >
          {/* Header Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + `/u/${userHandle}`);
                toast.success('Profile link copied!');
              }}
              className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all"
              title="Share Profile"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {/* Cover Banner & Avatar */}
            <div className="relative">
              <div className="h-44 md:h-52 w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/40" />
              </div>

              {/* High-Res Avatar */}
              <div className="px-6 relative -mt-16 flex items-end justify-between">
                <div className="relative">
                  <UserAvatar user={user} className="w-28 h-28 md:w-32 md:h-32 border-4 border-card shadow-2xl text-4xl" />
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 mb-2">
                  {!isSpaceMode ? (
                    <button
                      onClick={handleFriendAction}
                      disabled={isFriend || sendingRequest}
                      className={`px-4 py-2 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-70 ${
                        isFriend
                          ? 'bg-card border border-border text-foreground'
                          : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      {isFriend ? <UserCheck size={14} /> : <UserPlus size={14} />}
                      <span>{isFriend ? 'Request Sent' : sendingRequest ? 'Sending...' : 'Add Friend'}</span>
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      onClose();
                      if (profilePath) navigate(profilePath);
                      else toast.error('Profile link unavailable');
                    }}
                    className="p-2.5 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-bold text-xs flex items-center gap-1"
                    title="View Full Web Profile"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              {/* Bio & Details Header */}
              <div className="px-6 pt-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">{safeName}</h2>
                    {user.isVerified && <CheckCircle2 size={18} className="text-blue-500 fill-blue-500/20" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">@{userHandle}</p>
                </div>

                {user.bio && (
                  <p className="text-xs text-foreground/90 leading-relaxed max-w-xl font-medium">
                    {user.bio}
                  </p>
                )}

                {(user.location || user.joinedDate) && (
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-semibold pt-1">
                    {user.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-red-400" /> {user.location}
                      </span>
                    )}
                    {user.joinedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} className="text-purple-400" /> Joined {user.joinedDate}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Communication Bar */}
              <div className="px-6 pt-4">
                <div className="grid grid-cols-3 gap-3 p-2.5 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-md">
                  <Button
                    onClick={onClose}
                    fullWidth
                    size="sm"
                  >
                    <MessageCircle size={16} />
                    <span>Message</span>
                  </Button>

                  <button
                    onClick={() => {
                      onClose();
                      onStartCall?.('audio');
                    }}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-extrabold text-xs hover:bg-emerald-500/20 transition-all"
                  >
                    <Phone size={16} />
                    <span>Audio Call</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onStartCall?.('video');
                    }}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500/10 text-blue-400 font-extrabold text-xs hover:bg-blue-500/20 transition-all"
                  >
                    <Video size={16} />
                    <span>Video Call</span>
                  </button>
                </div>
              </div>

              <div className="px-6 pt-4 pb-2">
                <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <div className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                    <Clock size={14} /> Scheduled messages
                  </div>
                  <ScheduledMessagesPanel
                    items={scheduledMessages}
                    onCancel={(id) => onCancelScheduled?.(id)}
                    onSendNow={onSendScheduledNow}
                    onUpdate={onUpdateScheduled}
                    emptyLabel="No scheduled messages for this chat"
                  />
                </div>
              </div>
            </div>

            {/* Full profile link — posts/photos/mutual friends live on the full web profile */}
            <div className="p-6">
              <button
                onClick={() => {
                  onClose();
                  if (profilePath) navigate(profilePath);
                  else toast.error('Profile link unavailable');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-card/40 border border-border text-xs font-extrabold text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <ExternalLink size={16} />
                View full profile, posts & mutual friends
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
