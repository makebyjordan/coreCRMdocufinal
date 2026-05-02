import { create } from 'zustand';

export const useSearchStore = create((set, get) => ({
  savedSearches: [],
  currentSearch: { query: '', filters: {} },
  searchResults: null,
  isLoading: false,

  setCurrentSearch: (search) => set({ currentSearch: search }),

  setSearchResults: (results) => set({ searchResults: results }),

  setSavedSearches: (searches) => set({ savedSearches: searches }),

  addSavedSearch: (search) =>
    set((state) => ({ savedSearches: [...state.savedSearches, search] })),

  removeSavedSearch: (id) =>
    set((state) => ({ savedSearches: state.savedSearches.filter((s) => s.id !== id) })),

  clearSearch: () => set({ currentSearch: { query: '', filters: {} }, searchResults: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));
