import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Conversation, Message } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  streamingContent: string;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  cleanupOpen: boolean;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  archiveConversation: (id: string) => void;
  restoreConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCleanupOpen: (open: boolean) => void;
  createNewConversation: (providerId: string, modelId: string, systemPrompt?: string) => string;
  deleteAllConversations: () => void;
  deleteArchivedConversations: () => void;
  getArchivedConversations: () => Conversation[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  streamingContent: '',
  sidebarOpen: true,
  settingsOpen: false,
  cleanupOpen: false,

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((s) => ({ conversations: [conversation, ...s.conversations] })),
  updateConversation: (id, updates) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeConversation: (id) =>
    set((s) => {
      const newMessages = { ...s.messages };
      delete newMessages[id];
      return {
        conversations: s.conversations.filter((c) => c.id !== id),
        messages: newMessages,
        activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
      };
    }),
  archiveConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, isArchived: true } : c
      ),
    })),
  restoreConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, isArchived: false } : c
      ),
    })),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (conversationId, messages) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: messages } })),
  addMessage: (conversationId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), message],
      },
    })),
  updateLastAssistantMessage: (conversationId, content) =>
    set((s) => {
      const msgs = s.messages[conversationId] || [];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        const updated = [...msgs];
        updated[lastIdx] = { ...updated[lastIdx], content };
        return { messages: { ...s.messages, [conversationId]: updated } };
      }
      return s;
    }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCleanupOpen: (open) => set({ cleanupOpen: open }),
  createNewConversation: (providerId, modelId, systemPrompt) => {
    const id = nanoid();
    const now = Date.now();
    const conversation: Conversation = {
      id,
      title: 'New Chat',
      providerId,
      modelId,
      systemPrompt: systemPrompt || '',
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    };
    set((s) => ({
      conversations: [conversation, ...s.conversations],
      activeConversationId: id,
      messages: { ...s.messages, [id]: [] },
    }));
    return id;
  },
  deleteAllConversations: () =>
    set({ conversations: [], messages: {}, activeConversationId: null }),
  deleteArchivedConversations: () =>
    set((s) => {
      const archived = s.conversations.filter((c) => c.isArchived);
      const newMessages = { ...s.messages };
      archived.forEach((c) => delete newMessages[c.id]);
      return {
        conversations: s.conversations.filter((c) => !c.isArchived),
        messages: newMessages,
      };
    }),
  getArchivedConversations: () => get().conversations.filter((c) => c.isArchived),
}));
