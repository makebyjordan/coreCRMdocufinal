import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isLoading: true,

  // ─── Inicializar desde SecureStore ──────────────────────────────────────────
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userJson = await SecureStore.getItemAsync('auth_user');
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // ─── Login ───────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('auth_token', data.token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    return data;
  },

  // ─── Logout ──────────────────────────────────────────────────────────────────
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
