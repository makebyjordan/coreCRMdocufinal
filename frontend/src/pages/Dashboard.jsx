import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, TrendingUp, Clock, AlertTriangle,
  FileText, CheckCircle, XCircle, BarChart3,
  Users, PenSquare, Phone, CalendarDays, ChevronRight,
} from 'lucide-react'
import { format, parseISO, isPast, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../api/client'
import ClientAnalyticsWidget from '../components/Dashboard/ClientAnalyticsWidget'
import TasksWidget from '../components/Dashboard/TasksWidget'

const PHASE_LABELS = {
  CAPTACION: 'Captación', FORMULARIO: 'Formulario', DOCUMENTACION: 'Documentación',
  VALIDACION: 'Validación', ACUERDO: 'Acuerdo', MARKETING_FORMULARIO: 'Brief Mkt',
  MARKETING_EJECUCION: 'Ejecución Mkt', PREVENTA: 'Preventa', BUSQUEDA_ACTIVA: 'Búsqueda',
  ACUERDO_INTERESADO: 'Ac. Interesado', CIERRE: 'Cierre', POSVENTA: 'Posventa',
}

const TYPE_COLORS = {
  VENTA: '#3b82f6', // Blue
  INQUILINO: '#10b981', // Emerald
  COMPRA: '#f59e0b', // Amber
  PROPIETARIO: '#f97316', // Orange
  INVERSION_HOLDERS: '#6366f1', // Indigo
}

const STATUS_COLORS = { ACTIVO: '#10b981', BLOQUEADO: '#ef4444', COMPLETADO: '#3b82f6' }

const EVENT_TYPE_CONFIG = {
  VISITA: { icon: Users, color: '#0d9488', label: 'Visita' }, // teal-600
  FIRMA: { icon: PenSquare, color: '#a855f7', label: 'Firma' }, // purple-500
  LLAMADA: { icon: Phone, color: '#eab308', label: 'Llamada' }, // yellow-500
  REUNION: { icon: CalendarDays, color: '#4f46e5', label: 'Reunión' }, // indigo-600
  OTRO: { icon: CalendarDays, color: '#9ca3af', label: 'Otro' }, // gray-400
}

function getEventIcon(type) {
  return EVENT_TYPE_CONFIG[type]?.icon || CalendarDays
}

function getEventColor(type) {
  return EVENT_TYPE_CONFIG[type]?.color || '#9ca3af'
}

function getEventLabel(type) {
  return EVENT_TYPE_CONFIG[type]?.label || type
}

function StatCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colors = {
    blue: { bg: 'var(--primary-glow)', text: 'var(--primary-color)' },
    green: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
    yellow: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
    indigo: { bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--secondary-color)' },
  }
  const themeColor = colors[color] || colors.blue;

  return (
    <div className="card p-6 flex items-start gap-5 hover:translate-y-[-4px] hover:shadow-xl transition-all duration-300 group">
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: themeColor.bg, color: themeColor.text }}
      >
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p style={{ color: 'var(--text-main)' }} className="text-2xl font-extrabold tracking-tight">{value}</p>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm font-semibold uppercase tracking-wider">{label}</p>
        {sub && <p style={{ color: 'var(--tertiary-color)' }} className="text-xs mt-1 leading-relaxed">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/dashboard/activity').then(r => r.data),
  })

  const { data: calendarEvents } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: () => api.get('/calendar?limit=10').then(r => r.data),
    refetchInterval: 60_000,
  })
  
  const navigate = useNavigate()
  
  // Get upcoming events (not in the past, not completed)
  const upcomingEvents = calendarEvents
    ?.filter(e => !isPast(parseISO(e.startAt)) && !e.completed)
    ?.sort((a, b) => parseISO(a.startAt) - parseISO(b.startAt))
    ?.slice(0, 5) || []

  const phaseData = stats?.byPhase
    ? Object.entries(stats.byPhase).map(([phase, count]) => ({
        name: PHASE_LABELS[phase] || phase,
        expedientes: count,
      }))
    : []

  const typeData = stats?.byType
    ? Object.entries(stats.byType).map(([type, count]) => ({
        name: type, value: count, color: TYPE_COLORS[type] || '#6b7280',
      }))
    : []

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Expedientes activos" value={stats?.expedients.active ?? '—'} color="blue" />
        <StatCard icon={CheckCircle} label="Operaciones cerradas" value={stats?.expedients.closed ?? '—'} color="green" />
        <StatCard icon={XCircle} label="Bloqueados" value={stats?.expedients.blocked ?? '—'} color="red" />
        <StatCard icon={TrendingUp} label="Tasa de cierre" value={stats ? `${stats.closureRate}%` : '—'} color="yellow"
          sub={`Media ${stats?.avgDaysToClose ?? '—'} días`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Documentos pendientes" value={stats?.pendingDocs ?? '—'} color="yellow" />
        <StatCard icon={Clock} label="Firmas pendientes" value={stats?.pendingSignatures ?? '—'} color="yellow" />
        <StatCard icon={AlertTriangle} label="Expedientes bloqueados" value={alerts?.blocked?.length ?? '—'} color="red" />
        <StatCard icon={BarChart3} label="Sin actividad 7 días" value={alerts?.stale?.length ?? '—'} color="red" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por fase */}
        <div className="card p-5">
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-4">Expedientes por fase</h3>
          {phaseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={phaseData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar 
                  dataKey="expedientes" 
                  fill="var(--primary-color)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">Sin datos</p>
          )}
        </div>

        {/* Por tipo */}
        <div className="card p-5">
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-4">Expedientes por tipo</h3>
          {typeData.length > 0 ? (
            <div className="flex items-center gap-6">
              <PieChart width={160} height={160}>
                <Pie data={typeData} cx={75} cy={75} outerRadius={65} dataKey="value">
                  {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
              <div className="space-y-2">
                {typeData.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-main)' }} className="font-bold ml-auto pl-4">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">Sin datos</p>
          )}
        </div>
      </div>

      {/* Client 360 Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientAnalyticsWidget />
        <TasksWidget />
      </div>

      {/* Alertas */}
      {alerts?.blocked?.length > 0 && (
        <div className="card p-5">
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Expedientes bloqueados
          </h3>
          <div className="space-y-2">
            {alerts.blocked.map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-2 px-3 bg-[var(--sidebar-bg)] rounded-lg">
                <div>
                  <span className="font-mono text-sm font-bold text-gray-800">{exp.code}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {exp.client?.firstName || exp.client?.companyName}
                  </span>
                </div>
                <span className="text-xs text-red-600">
                  {formatDistanceToNow(new Date(exp.updatedAt), { addSuffix: true, locale: es })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos eventos del calendario */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-500" />
            Próximos eventos
          </h3>
          <button 
            onClick={() => navigate('/calendario')}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Ver calendario <ChevronRight size={14} />
          </button>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map(event => {
              const Icon = getEventIcon(event.type)
              const color = getEventColor(event.type)
              return (
                <div 
                  key={event.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--sidebar-bg)] hover:bg-[var(--sidebar-bg)]/80 transition-colors cursor-pointer"
                  onClick={() => navigate('/calendario')}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-main)] truncate">{event.title}</span>
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: color }}
                      >
                        {getEventLabel(event.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                      <span>{format(parseISO(event.startAt), 'EEEE d MMM, HH:mm', { locale: es })}</span>
                      {event.expedient && (
                        <span className="font-mono">{event.expedient.code}</span>
                      )}
                    </div>
                    {event.client && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.client.firstName} {event.client.lastName}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">No hay eventos próximos</p>
        )}
      </div>

      {/* Actividad reciente */}
      <div className="card p-5">
        <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-3">Actividad reciente</h3>
        {activity?.recentPhaseChanges?.length > 0 ? (
          <div className="space-y-2">
            {activity.recentPhaseChanges.map(change => (
              <div key={change.id} className="flex items-center gap-3 text-sm py-3 border-b border-[var(--border-color)] last:border-0 group">
                <div className="w-2 h-2 rounded-full bg-[var(--primary-color)] opacity-40 shrink-0 group-hover:opacity-100 transition-opacity" />
                <span className="font-mono text-[var(--text-muted)] text-xs font-bold">{change.expedient?.code}</span>
                <span className="text-[var(--text-main)] flex-1">
                  <span className="text-[var(--text-muted)]">{PHASE_LABELS[change.fromPhase] || change.fromPhase}</span>
                  <span className="mx-2 opacity-30">→</span>
                  <strong className="text-[var(--primary-color)]">{PHASE_LABELS[change.toPhase] || change.toPhase}</strong>
                </span>
                <span className="text-gray-400 text-xs">
                  {change.changedBy?.name || 'Sistema'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">Sin actividad reciente</p>
        )}
      </div>
    </div>
  )
}
