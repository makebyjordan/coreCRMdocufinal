import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogOut, Plus, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import useAuthStore from '../../store/authStore'
import NotificationBell from './NotificationBell'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/expedients': 'Expedientes',
  '/expedients/new': 'Nuevo expediente',
  '/clients': 'Clientes',
  '/users': 'Usuarios',
  '/settings': 'Configuración',
}

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const logout = useAuthStore(s => s.logout)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const title = PAGE_TITLES[pathname] || 'CRM Inmobiliaria'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header 
      className="glass sticky top-0 z-10 px-6 py-4 flex items-center justify-between shrink-0 transition-all duration-300"
    >
      <h1 style={{ color: 'var(--text-main)' }} className="text-xl font-bold tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <NotificationBell />

        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2.5 rounded-xl hover:bg-[var(--sidebar-hover)] transition-all border border-transparent hover:border-[var(--border-color)]"
          style={{ color: 'var(--text-muted)' }}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun size={19} className="text-yellow-400" /> : <Moon size={19} className="text-slate-600" />}
        </button>

        {pathname === '/expedients' && (
          <Link to="/expedients/new" className="btn-primary py-2.5">
            <Plus size={16} />
            Nuevo expediente
          </Link>
        )}

        <div className="h-6 w-px bg-[var(--border-color)] mx-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium transition-all px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 hover:shadow-sm"
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  )
}
