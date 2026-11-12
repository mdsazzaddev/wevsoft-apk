import type { MessageData } from './MessageBubble';
export type { MessageData };

import type { ChatThemeJson, GenerationSettingsJson, InfoJson } from '../../lib/wevchat';

export type { ChatThemeJson, GenerationSettingsJson, InfoJson };

export interface ConversationSummary {
  id: string;
  type: string;
  name?: string | null;
  photo?: string | null;
  otherUser?: { id: string; name: string; avatar?: string; username?: string; profileSlug?: string } | null;
  lastMessage?: MessageData | null;
  unreadCount: number;
  isMuted: boolean;
  mutedUntil?: string | null;
  isArchived: boolean;
  isPinnedChat: boolean;
  isE2ee?: boolean;
  nickname?: string | null;
  cameoPermission?: string;
  themeJson?: ChatThemeJson;
  generationSettings?: GenerationSettingsJson;
  infoJson?: InfoJson;
  memberPrefsJson?: unknown;
  members: { userId: string; role?: string; cameoPermission?: string; user: { id: string; name: string; avatar?: string; username?: string; profileSlug?: string } }[];
  updatedAt: string;
  privateChat?: {
    active: boolean;
    session: {
      id: string;
      conversationId: string;
      startedById: string;
      startedAt: string;
      endedAt?: string | null;
      status: string;
      active?: boolean;
    } | null;
  };
  inboxState?: string;
}
