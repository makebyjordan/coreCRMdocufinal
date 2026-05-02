import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePreferencesStore = create(
  persist(
    (set, get) => ({
      shortcuts: {},
      mfaEnabled: false,
      theme: 'light',
      language: 'es',
      notificationSettings: {
        email: true,
        inApp: true,
        push: false,
      },

      setShortcuts: (shortcuts) => set({ shortcuts }),

      addShortcut: (key, action) =>
        set((state) => ({ shortcuts: { ...state.shortcuts, [key]: action } })),

      removeShortcut: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.shortcuts;
          return { shortcuts: rest };
        }),

      setMFAEnabled: (enabled) => set({ mfaEnabled: enabled }),

      setTheme: (theme) => set({ theme }),

      setLanguage: (language) => set({ language }),

      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        })),
    }),
    { name: 'docuinmo-preferences' }
  )
);
