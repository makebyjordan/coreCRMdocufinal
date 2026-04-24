import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, Settings,
  Building2, UserCog, CalendarDays, FileText,
  // FASE 4 - Pendiente: Workflow,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/expedients', icon: FolderKanban, label: 'Expedientes' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  // FASE 4 - Pendiente de activar: Automatizaciones/Workflows. Reactivar cuando estén las tablas workflow_rules en Supabase.
  // { to: '/workflows', icon: Workflow, label: 'Automatizaciones', roles: ['DIRECCION', 'ADMINISTRACION'] },
  { to: '/users', icon: UserCog, label: 'Usuarios', roles: ['DIRECCION', 'ADMINISTRACION'] },
  { to: '/settings', icon: Settings, label: 'Configuración', roles: ['DIRECCION', 'ADMINISTRACION'] },
]

const bottomItems = [
  { to: '/calendar', icon: CalendarDays, label: 'Calendario' },
]

export default function Sidebar() {
  const user = useAuthStore(s => s.user)

  return (
    <aside 
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
      className="w-60 flex flex-col shrink-0 transition-colors duration-300"
    >
      {/* Logo */}
      <div 
        style={{ borderColor: 'var(--border-color)' }}
        className="flex items-center gap-3 px-5 py-5 border-b"
      >
        <div style={{ backgroundColor: 'var(--primary-color)' }} className="w-8 h-8 rounded-lg flex items-center justify-center">
          <Building2 size={18} className="text-white" />
        </div>
        <div>
          <p style={{ color: 'var(--sidebar-text)' }} className="font-bold text-sm leading-tight">InmoHabitat</p>
          <p style={{ color: 'var(--sidebar-text-muted)' }} className="text-xs">Gestión documental</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems
          .filter(item => !item.roles || item.roles.includes(user?.role))
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

      {/* Calendario (abajo) */}
      <div 
        style={{ borderColor: 'var(--border-color)' }}
        className="px-3 pb-2 border-t pt-3"
      >
        {bottomItems.map(({ to, icon: Icon, label }) => (
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
      </div>

      {/* Usuario */}
      <div 
        style={{ borderColor: 'var(--border-color)' }}
        className="px-4 py-4 border-t"
      >
        <div className="flex items-center gap-3">
          <div 
            style={{ backgroundColor: 'var(--primary-color)' }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p style={{ color: 'var(--sidebar-text)' }} className="text-sm font-medium truncate">{user?.name}</p>
            <p style={{ color: 'var(--sidebar-text-muted)' }} className="text-xs truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
