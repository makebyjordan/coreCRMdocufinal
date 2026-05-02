import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, Settings,
  Building2, UserCog, CalendarDays, FileText,
  BarChart3, Search, Users2, Globe,
  Workflow, Shield, Brain, ChevronLeft, ChevronRight,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useSidebarStore from '../../store/sidebarStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/expedients', icon: FolderKanban, label: 'Expedientes' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendario' },

  { to: '/users', icon: UserCog, label: 'Usuarios', roles: ['DIRECCION', 'ADMINISTRACION'] },
  { to: '/settings', icon: Settings, label: 'Configuración', roles: ['DIRECCION', 'ADMINISTRACION'] },
  { to: '/security', icon: Shield, label: 'Seguridad' },
]

const analyticsItems = [
  { to: '/market', icon: Globe, label: 'Mercado' },
  { to: '/ai', icon: Brain, label: 'Inteligencia Artificial' },
]

export default function Sidebar() {
  const user = useAuthStore(s => s.user)
  const { isOpen, toggle } = useSidebarStore()

  return (
    <>
      {/* Toggle Button - siempre visible */}
      <button
        onClick={toggle}
        className="fixed top-1/2 -translate-y-1/2 z-50 p-2 rounded-r-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg"
        style={{ left: isOpen ? '240px' : '80px', transition: 'left 300ms ease-out' }}
        title={isOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Sidebar - Full */}
      <aside
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
        className={`fixed left-0 top-0 h-screen flex flex-col shrink-0 transition-all duration-300 overflow-y-auto z-40 ${
          isOpen ? 'w-60 translate-x-0' : 'w-20 -translate-x-full'
        }`}
      >
      {/* Logo */}
      <div
        style={{ borderColor: 'var(--border-color)' }}
        className={`flex items-center gap-3 px-5 py-5 border-b transition-all duration-300 ${isOpen ? 'justify-start' : 'justify-center'}`}
      >
        <div style={{ backgroundColor: 'var(--primary-color)' }} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        {isOpen && (
          <div>
            <p style={{ color: 'var(--sidebar-text)' }} className="font-bold text-sm leading-tight">DocuInmo</p>
            <p style={{ color: 'var(--sidebar-text-muted)' }} className="text-xs">Gestión Documental Inmobiliaria</p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className={`py-4 transition-all duration-300 ${isOpen ? 'px-3 space-y-1' : 'px-2 space-y-2'}`}>
        {navItems
          .filter(item => {
            if (!item.roles) return true
            const userRoles = user?.userRoles?.map(ur => ur.role) || []
            return item.roles.some(role => userRoles.includes(role))
          })
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={!isOpen ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all justify-${isOpen ? 'start' : 'center'} ${
                  isActive
                    ? 'shadow-md shadow-[var(--primary-glow)]'
                    : 'hover:bg-[var(--sidebar-hover)]'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                color: isActive ? 'white' : 'var(--sidebar-text-muted)',
              })}
            >
              <Icon size={18} className="flex-shrink-0" />
              {isOpen && label}
            </NavLink>
          ))}
      </nav>

      {/* Analytics & Tools */}
      {isOpen && (
        <div style={{ borderColor: 'var(--border-color)' }} className="border-t">
          <div className="px-4 py-3">
            <p style={{ color: 'var(--sidebar-text-muted)' }} className="text-xs font-semibold uppercase tracking-wider">
              Analytics & Tools
            </p>
          </div>
          <nav className="py-2 px-3 space-y-1">
            {analyticsItems
              .filter(item => {
                if (!item.roles) return true
                const userRoles = user?.userRoles?.map(ur => ur.role) || []
                return item.roles.some(role => userRoles.includes(role))
              })
              .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'shadow-md shadow-[var(--primary-glow)]'
                      : 'hover:bg-[var(--sidebar-hover)]'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                  color: isActive ? 'white' : 'var(--sidebar-text-muted)',
                })}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Usuario - siempre visible al final */}
      <div
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--sidebar-bg)' }}
        className={`py-4 border-t mt-auto sticky bottom-0 transition-all duration-300 ${isOpen ? 'px-4' : 'px-2'}`}
      >
        <div className={`flex items-center gap-3 ${isOpen ? 'justify-start' : 'justify-center'}`}>
          <div
            style={{ backgroundColor: 'var(--primary-color)' }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {isOpen && (
            <div className="min-w-0">
              <p style={{ color: 'var(--sidebar-text)' }} className="text-sm font-medium truncate">{user?.name}</p>
              <p style={{ color: 'var(--sidebar-text-muted)' }} className="text-xs truncate">
                {user?.userRoles?.map(ur => ur.role).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}
