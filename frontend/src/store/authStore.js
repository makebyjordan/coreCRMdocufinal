import { create } from 'zustand'
import api from '../api/client'

// ─── Lectura segura de localStorage ──────────────────────────
function readStoredUser() {
  try {
    const raw = localStorage.getItem('crm_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    // JSON corrupto: limpiamos para no volver a fallar
    localStorage.removeItem('crm_user')
    localStorage.removeItem('crm_token')
    return null
  }
}

const useAuthStore = create((set) => ({
  user: readStoredUser(),
  token: localStorage.getItem('crm_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('crm_token', data.token)
      localStorage.setItem('crm_user', JSON.stringify(data.user))
      set({ user: data.user, token: data.token, loading: false })
      return data
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
