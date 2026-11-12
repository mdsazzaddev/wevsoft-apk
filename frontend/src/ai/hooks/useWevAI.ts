import { create } from 'zustand';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isAction?: boolean;
  actionDetails?: any;
}

interface WevAIState {
  isOpen: boolean;
  messages: AIMessage[];
  isTyping: boolean;
  conversationId: string | null;
  pendingAction: any | null; // For tool confirmation
  
  toggleAssistant: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  addMessage: (msg: Omit<AIMessage, 'id'>) => void;
  setTyping: (typing: boolean) => void;
  setConversationId: (id: string) => void;
  setPendingAction: (action: any) => void;
  clearPendingAction: () => void;
}

export const useWevAI = create<WevAIState>((set) => ({
  isOpen: false,
  messages: [{ id: '1', role: 'assistant', content: 'Hi there! I am Wevsoft. How can I help you today?' }],
  isTyping: false,
  conversationId: null,
  pendingAction: null,
  
  toggleAssistant: () => set((state) => ({ isOpen: !state.isOpen })),
  openAssistant: () => set({ isOpen: true }),
  closeAssistant: () => set({ isOpen: false }),
  
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { ...msg, id: Math.random().toString(36).substring(7) }]
  })),
  
  setTyping: (typing) => set({ isTyping: typing }),
  setConversationId: (id) => set({ conversationId: id }),
  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),
}));
