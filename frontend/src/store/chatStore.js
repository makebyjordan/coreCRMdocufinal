import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  threads: [],
  currentThread: null,
  messages: {},
  unreadCount: 0,

  setThreads: (threads) => set({ threads }),

  setCurrentThread: (threadId) => set({ currentThread: threadId }),

  setMessages: (threadId, messages) =>
    set((state) => ({ messages: { ...state.messages, [threadId]: messages } })),

  addMessage: (threadId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: [...(state.messages[threadId] || []), message],
      },
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  decrementUnread: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  markThreadRead: (threadId) =>
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, unreadCount: 0 } : t
      ),
    })),
}));
