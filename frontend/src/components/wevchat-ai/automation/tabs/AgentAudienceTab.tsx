import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Search, X, Loader2 } from 'lucide-react';
import { useStore } from '../../../../store';
import { WevAgent } from '../../../../lib/automationApi';
import { wevchatApi } from '../../../../lib/wevchatApi';
import UserAvatar from '../../../UserAvatar';
import {
  type AgentAudienceType,
  parseAudienceTypes,
  serializeAudienceTypes,
  toggleAudienceSelection,
} from '@wevsoft/shared/agent-audience';

interface AgentAudienceTabProps {
  draft: Partial<WevAgent>;
  onChange: (patch: Partial<WevAgent> | ((prev: Partial<WevAgent>) => Partial<WevAgent>)) => void;
  assignedTargetUserIds: string[];
  setAssignedTargetUserIds: (ids: string[]) => void;
  assignedUsersDetail: { id: string; name: string; avatar?: string }[];
  setAssignedUsersDetail: (users: { id: string; name: string; avatar?: string }[]) => void;
}

type AudienceView = 'options' | 'customUsers';
type PickableUser = { id: string; name: string; avatar?: string };

const PEOPLE_LIMIT = 80;

const OPTIONS: { value: AgentAudienceType; label: string; hint: string }[] = [
  { value: 'PRIVATE', label: 'Off', hint: 'This agent will not auto-reply to anyone.' },
  { value: 'CUSTOM', label: 'Custom', hint: 'Choose people from your chats and contacts — select as many as you want.' },
  { value: 'ONLY_FRIENDS', label: 'Friends', hint: 'Accepted friends get a reply.' },
  { value: 'ONLY_FOLLOWERS', label: 'Followers', hint: 'People who follow you get a reply.' },
  { value: 'ALL_PUBLIC', label: 'Public', hint: 'Anyone who messages you gets a reply from this agent.' },
];

function toPickable(u: any): PickableUser | null {
  if (!u?.id) return null;
  return {
    id: u.id,
    name: u.name || u.username || 'Unknown',
    avatar: u.avatar || undefined,
  };
}

/** Recent 1:1 chat peers first (wevchat order), then friends, then other people. */
function mergePeople(conversations: any[], directory: any[], currentUserId?: string | null): PickableUser[] {
  const seen = new Set<string>();
  const out: PickableUser[] = [];

  const push = (raw: any) => {
    const u = toPickable(raw);
    if (!u || seen.has(u.id)) return;
    if (currentUserId && u.id === currentUserId) return;
    seen.add(u.id);
    out.push(u);
  };

  for (const c of conversations) {
    if (c?.isArchived) continue;
    const type = String(c?.type || '');
    if (type !== 'private' && type !== 'marketplace') continue;
    if (c?.otherUser) {
      push(c.otherUser);
    } else if (Array.isArray(c?.members)) {
      const other = c.members
        .map((m: any) => m.user || m)
        .find((u: any) => u?.id && u.id !== currentUserId);
      push(other);
    }
    if (out.length >= PEOPLE_LIMIT) return out;
  }

  const friends = directory.filter((u) => u?.friendStatus === 'accepted');
  const rest = directory.filter((u) => u?.friendStatus !== 'accepted');
  for (const u of [...friends, ...rest]) {
    push(u);
    if (out.length >= PEOPLE_LIMIT) break;
  }

  return out;
}

export const AgentAudienceTab: React.FC<AgentAudienceTabProps> = ({
  draft,
  onChange,
  assignedTargetUserIds,
  setAssignedTargetUserIds,
  assignedUsersDetail,
  setAssignedUsersDetail,
}) => {
  const token = useStore((s) => s.token);
  const currentUserId = useStore((s) => s.user?.id);
  const [view, setView] = useState<AudienceView>('options');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PickableUser[]>([]);
  const [people, setPeople] = useState<PickableUser[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [searching, setSearching] = useState(false);

  const selected = parseAudienceTypes(draft.audienceType);
  const customCount = assignedTargetUserIds.length;
  const assignedSet = useMemo(() => new Set(assignedTargetUserIds), [assignedTargetUserIds]);

  const isSearching = query.trim().length > 0;
  const listUsers = useMemo(() => {
    if (!isSearching) return people;
    if (searchResults.length > 0) return searchResults;
    const q = query.trim().toLowerCase();
    return people.filter((u) => u.name.toLowerCase().includes(q));
  }, [isSearching, people, searchResults, query]);

  useEffect(() => {
    if (view !== 'customUsers') return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoadingPeople(true);

    Promise.all([
      wevchatApi.getConversations().catch(() => []),
      fetch('/api/users', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([conversations, directory]) => {
        if (cancelled) return;
        setPeople(
          mergePeople(
            Array.isArray(conversations) ? conversations : [],
            Array.isArray(directory) ? directory : [],
            currentUserId
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingPeople(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view, token, currentUserId]);

  const selectOption = (value: AgentAudienceType) => {
    if (value === 'CUSTOM') {
      onChange((prev) => {
        const current = parseAudienceTypes(prev.audienceType);
        const next = current.includes('CUSTOM')
          ? current
          : toggleAudienceSelection(current, 'CUSTOM');
        return { audienceType: serializeAudienceTypes(next) };
      });
      setView('customUsers');
      return;
    }

    onChange((prev) => ({
      audienceType: serializeAudienceTypes(toggleAudienceSelection(parseAudienceTypes(prev.audienceType), value)),
    }));
  };

  const turnOffCustom = () => {
    onChange((prev) => ({
      audienceType: serializeAudienceTypes(toggleAudienceSelection(parseAudienceTypes(prev.audienceType), 'CUSTOM')),
    }));
    setView('options');
    setQuery('');
    setSearchResults([]);
  };

  const runSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await wevchatApi.searchUsers(q);
      setSearchResults(Array.isArray(users) ? users.map((u: any) => toPickable(u)).filter(Boolean) as PickableUser[] : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleUser = (user: PickableUser) => {
    if (assignedSet.has(user.id)) {
      setAssignedTargetUserIds(assignedTargetUserIds.filter((id) => id !== user.id));
      setAssignedUsersDetail(assignedUsersDetail.filter((u) => u.id !== user.id));
      return;
    }
    setAssignedTargetUserIds([...assignedTargetUserIds, user.id]);
    setAssignedUsersDetail([...assignedUsersDetail, user]);
  };

  if (view === 'customUsers') {
    return (
      <div className="flex flex-col gap-3 min-h-0 h-full">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setView('options');
              setQuery('');
              setSearchResults([]);
            }}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to audience options"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground">Custom users</h4>
            <p className="text-[11px] text-muted-foreground">
              Select multiple people — {customCount} selected.
            </p>
          </div>
          {selected.includes('CUSTOM') && (
            <button
              type="button"
              onClick={turnOffCustom}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground shrink-0"
            >
              Turn off
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search by name or username..."
            autoFocus
            className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          {(searching || loadingPeople) && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
            {isSearching ? 'Search results' : 'People'}
          </p>
          {loadingPeople && !isSearching ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : listUsers.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-y-auto divide-y divide-border min-h-[220px] max-h-[min(52vh,420px)]">
              {listUsers.map((u) => {
                const checked = assignedSet.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40 text-left transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}
                    >
                      {checked && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                    </div>
                    <UserAvatar user={u} className="w-8 h-8 shrink-0 text-xs" />
                    <span className="text-sm text-foreground flex-1 truncate">{u.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border">
              {isSearching ? 'No people matched that search.' : 'No people found yet — try searching by name.'}
            </p>
          )}
        </div>

        {assignedUsersDetail.length > 0 && (
          <div className="space-y-1.5 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selected ({customCount})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {assignedUsersDetail.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full pl-1 pr-1.5 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <UserAvatar user={u} className="w-5 h-5 text-[9px]" />
                  <span className="max-w-[100px] truncate">{u.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleUser(u)}
                    className="p-0.5 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${u.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground leading-snug">
        Select as many as you need — Custom, Friends, Followers, and Public can be on together. Off turns auto-reply off.
      </p>
      {OPTIONS.map((opt) => {
        const active = selected.includes(opt.value);
        const isCustom = opt.value === 'CUSTOM';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectOption(opt.value)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all ${
              active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3.5 h-3.5 rounded-[3px] border-2 flex items-center justify-center shrink-0 ${
                  active ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                }`}
              >
                {active && <Check size={8} className="text-primary-foreground" strokeWidth={3} />}
              </div>
              <span className="text-[12px] font-semibold text-foreground flex-1">{opt.label}</span>
              {isCustom && active && (
                <span className="text-[10px] font-medium text-primary">
                  {customCount > 0 ? `${customCount} selected` : 'Add people'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 ml-5 leading-snug line-clamp-1">{opt.hint}</p>
          </button>
        );
      })}
    </div>
  );
};
