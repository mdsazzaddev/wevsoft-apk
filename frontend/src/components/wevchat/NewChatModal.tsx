import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Users, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { wevchatApi } from '../../lib/wevchatApi';
import UserAvatar from '../UserAvatar';

interface UserOption {
  id: string;
  name: string;
  avatar?: string;
}

export type GroupChatOption = {
  id: string;
  name?: string | null;
  photo?: string | null;
  type?: string;
  members?: { userId?: string; user?: { id: string; name?: string; avatar?: string } }[];
};

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectCreated: (conversation: any) => void;
  /** Open an existing group conversation (Group Chat tab). */
  onOpenGroup: (conversation: GroupChatOption) => void;
  groups: GroupChatOption[];
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onDirectCreated,
  onOpenGroup,
  groups,
}) => {
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<UserOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      wevchatApi.getAllUsers().then((data) => {
        if (Array.isArray(data)) {
          setAllUsers(data.map((u: any) => ({ id: u.id, name: u.name, avatar: u.avatar })));
        }
      }).catch(console.error);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setQuery('');
      setSelected(null);
      setMode('direct');
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode !== 'direct') return;
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setResults(allUsers);
      return;
    }
    const t = setTimeout(() => {
      wevchatApi.searchUsers(query).then((data) => {
        if (Array.isArray(data)) {
          setResults(data.map((u: any) => ({ id: u.id, name: u.name, avatar: u.avatar })));
        }
      }).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, allUsers, mode]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (groups || []).filter((g) => {
      const t = String(g.type || '').toLowerCase();
      return t === 'group' || t === 'groups';
    });
    if (!q) return list;
    return list.filter((g) => {
      const name = (g.name || '').toLowerCase();
      return name.includes(q) || g.id.toLowerCase().includes(q);
    });
  }, [groups, query]);

  if (!isOpen) return null;

  const groupLabel = (g: GroupChatOption) => {
    if (g.name?.trim()) return g.name.trim();
    const names = (g.members || [])
      .map((m) => m.user?.name)
      .filter(Boolean)
      .slice(0, 3);
    return names.length ? names.join(', ') : 'Group chat';
  };

  const handleStartDirect = async () => {
    if (!selected) return toast.error('Select a person to message');
    try {
      setLoading(true);
      const convo = await wevchatApi.getOrCreateDirect(selected.id);
      onDirectCreated(convo);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md max-h-[min(90dvh,36rem)] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="New conversation"
        >
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <h3 className="font-black text-sm text-foreground">New Conversation</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-3 min-h-0 flex flex-col overflow-hidden">
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setMode('direct'); setQuery(''); setSelected(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${mode === 'direct' ? 'bg-primary text-primary-foreground' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}
              >
                <MessageCircle size={14} /> Direct Message
              </button>
              <button
                type="button"
                onClick={() => { setMode('group'); setQuery(''); setSelected(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${mode === 'group' ? 'bg-primary text-primary-foreground' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}
              >
                <Users size={14} /> Group Chat
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'group' ? 'Search groups...' : 'Search people...'}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            {mode === 'direct' ? (
              <>
                <div className="min-h-0 flex-1 max-h-56 overflow-y-auto no-scrollbar space-y-1">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelected(u)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${selected?.id === u.id ? 'bg-primary/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      <UserAvatar user={u} className="w-8 h-8 text-[11px]" />
                      <span className="text-xs font-semibold text-foreground truncate">{u.name}</span>
                    </button>
                  ))}
                  {query && results.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-3">No users found</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleStartDirect}
                  disabled={loading || !selected}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                >
                  {loading ? 'Opening...' : 'Start Chat'}
                </button>
              </>
            ) : (
              <div className="min-h-0 flex-1 max-h-64 overflow-y-auto no-scrollbar space-y-1">
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-[11px] text-muted-foreground">
                      {query.trim() ? 'No groups match that search.' : 'No group chats yet.'}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onOpenGroup(g);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                      <UserAvatar
                        user={{ name: groupLabel(g), avatar: g.photo }}
                        className="w-9 h-9 text-[11px]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{groupLabel(g)}</p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {g.id}
                        </p>
                      </div>
                      <Users size={14} className="text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
