import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, Thermometer, TrendingUp, Activity,
  UserPlus, UserCheck, UserX, ArrowRight
} from 'lucide-react'
import api from '../../api/client'

const SCORE_CONFIG = {
  FRIO: { color: '#3b82f6', label: 'Frío', bg: 'rgba(59, 130, 246, 0.1)' },
  TIBIO: { color: '#eab308', label: 'Tibio', bg: 'rgba(234, 179, 8, 0.1)' },
  CALIENTE: { color: '#f97316', label: 'Caliente', bg: 'rgba(249, 115, 22, 0.1)' },
  HOT: { color: '#ef4444', label: 'Hot', bg: 'rgba(239, 68, 68, 0.1)' },
}

const STAGE_CONFIG = {
  LEAD: { color: '#6b7280', label: 'Leads' },
  PROSPECTO: { color: '#3b82f6', label: 'Prospectos' },
  ACTIVO: { color: '#10b981', label: 'Activos' },
  RECURRENTE: { color: '#8b5cf6', label: 'Recurrentes' },
  PERDIDO: { color: '#ef4444', label: 'Perdidos' },
}

export default function ClientAnalyticsWidget() {
  const { data: clientStats } = useQuery({
    queryKey: ['client-analytics'],
    queryFn: () => api.get('/clients/stats/dashboard').then(r => r.data),
    refetchInterval: 120_000,
  })

  const { data: recentClients } = useQuery({
    queryKey: ['recent-clients'],
    queryFn: () => api.get('/clients?limit=5&sort=createdAt:desc').then(r => r.data.data),
    refetchInterval: 120_000,
  })

  const scoreData = clientStats?.byScore || {}
  const stageData = clientStats?.byStage || {}
  const total = clientStats?.total || 0

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Users size={18} className="text-[var(--primary-color)]" />
          Analytics Clientes
        </h3>
        <Link
          to="/clients"
          className="text-xs text-[var(--primary-color)] hover:underline flex items-center gap-1"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-[var(--sidebar-bg)]">
          <p className="text-2xl font-bold text-[var(--text-main)]">{total}</p>
          <p className="text-xs text-[var(--text-muted)]">Total clientes</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-2xl font-bold text-green-600">
            {clientStats?.active || 0}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Activos</p>
        </div>
      </div>

      {/* Distribución por Score */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
          <Thermometer size={12} /> Por temperatura
        </p>
        <div className="space-y-2">
          {Object.entries(SCORE_CONFIG).map(([key, config]) => {
            const count = scoreData[key] || 0
            const percentage = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs w-14 text-[var(--text-muted)]">{config.label}</span>
                <div className="flex-1 h-2 bg-[var(--sidebar-bg)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percentage}%`, backgroundColor: config.color }}
                  />
                </div>
                <span className="text-xs font-medium w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Distribución por Lifecycle */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
          <TrendingUp size={12} /> Por etapa
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STAGE_CONFIG).map(([key, config]) => {
            const count = stageData[key] || 0
            return (
              <div
                key={key}
                className="px-2 py-1 rounded text-xs flex items-center gap-1"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.label}: {count}
              </div>
            )
          })}
        </div>
      </div>

      {/* Clientes recientes */}
      {recentClients?.length > 0 && (
        <div className="pt-3 border-t border-[var(--border-color)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
            <UserPlus size={12} /> Últimos añadidos
          </p>
          <div className="space-y-2">
            {recentClients.map(client => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center gap-2 p-2 rounded hover:bg-[var(--sidebar-bg)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/20 flex items-center justify-center text-[var(--primary-color)] text-xs font-bold">
                  {(client.firstName || client.companyName || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-main)] truncate">
                    {client.firstName
                      ? `${client.firstName} ${client.lastName || ''}`.trim()
                      : client.companyName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{client.type}</p>
                </div>
                {client.score && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SCORE_CONFIG[client.score]?.color || '#6b7280' }}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
