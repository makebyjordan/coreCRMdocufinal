import { create } from 'zustand';

export const useSegmentStore = create((set) => ({
  activeSegment: 'VIP',
  clientScores: {},
  lastRefreshed: null,

  setActiveSegment: (segment) => set({ activeSegment: segment }),

  cacheClientScore: (clientId, score, segment) =>
    set((state) => ({
      clientScores: { ...state.clientScores, [clientId]: { score, segment, cachedAt: Date.now() } },
    })),

  getClientScore: (clientId) => (state) => state.clientScores[clientId] || null,

  setLastRefreshed: () => set({ lastRefreshed: Date.now() }),
}));
