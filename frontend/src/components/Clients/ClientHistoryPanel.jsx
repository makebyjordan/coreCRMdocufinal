import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

const STATUS_COLORS = {
  ACTIVO: 'bg-green-500',
  COMPLETADO: 'bg-blue-500',
  CANCELADO: 'bg-gray-500',
  BLOQUEADO: 'bg-red-500',
}

const OP_LABELS = {
  ALQUILER: 'Alquiler', VENTA: 'Venta', COMPRA: 'Compra',
  INVERSION: 'Inversión', PROMOCION: 'Promoción', EDIFICIO: 'Edificio',
  RESORT: 'Resort', INQUILINO: 'Inquilino', PROPIETARIO: 'Propietario',
  INVERSION_HOLDERS: 'Inv. Holders',
}

function PhaseBar({ history }) {
  if (!history || history.length === 0) return null
  const phases = history.slice(-5)
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {phases.map((h, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-[9px] text-[var(--text-muted)] bg-[var(--sidebar-bg)] px-1 py-0.5 rounded">
            {h.toPhase}
          </span>
          {i < phases.length - 1 && <ArrowRight size={8} className="text-gray-500" />}
        </span>
      ))}
    </div>
  )
}

export default function ClientHistoryPanel({ clientId, currentExpedientId = null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['client-journey', clientId],
    queryFn: () => api.get(`/client-journey/${clientId}`).then(r => r.data),
    enabled: !!clientId,
  })

  if (!clientId) return (
    <div className="card p-8 text-center text-gray-400">
      <Users size={28} className="mx-auto mb-2 text-gray-300" />
      <p>No hay cliente asociado</p>
    </div>
  )

  if (isLoading) return <div className="p-10 text-center text-gray-400">Cargando historial...</div>

  const { client, expedients = [], totalValue = 0 } = data || {}
  const completed = expedients.filter(e => e.status === 'COMPLETADO').length
  const active = expedients.filter(e => e.status === 'ACTIVO').length

  return (
    <div className="space-y-4">
      {/* Cabecera cliente */}
      <div className="card p-5">
        <h3 className="font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
          <Users size={16} className="text-[var(--primary-color)]" />
          Historial del cliente
        </h3>
        {client && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-color)]/20 flex items-center justify-center text-[var(--primary-color)] font-bold text-lg shrink-0">
              {(client.firstName || client.companyName || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-main)]">
                {client.firstName ? `${client.firstName} ${client.lastName || ''}`.trim() : client.companyName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{client.email} · {client.phone}</p>
              <p className="text-xs text-[var(--text-muted)] capitalize">{client.type?.toLowerCase()}</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2.5 rounded-lg bg-[var(--sidebar-bg)]">
            <p className="text-lg font-bold text-[var(--text-main)]">{expedients.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Total expedientes</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-green-500/10">
            <p className="text-lg font-bold text-green-400">{active}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Activos</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-blue-500/10">
            <p className="text-lg font-bold text-blue-400">{completed}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Completados</p>
          </div>
        </div>

        {totalValue > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--primary-color)]/10 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <TrendingUp size={12} /> Valor total estimado en comisiones
            </span>
            <span className="font-bold text-[var(--primary-color)]">
              {Number(totalValue).toLocaleString('es-ES')} €
            </span>
          </div>
        )}
      </div>

      {/* Timeline de expedientes */}
      <div className="card p-5">
        <h4 className="font-semibold text-sm text-[var(--text-main)] mb-4">Recorrido de operaciones</h4>

        {expedients.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">Sin expedientes registrados</div>
        )}

        <div className="relative">
          {expedients.map((e, idx) => {
            const isCurrent = currentExpedientId !== null && e.id === currentExpedientId
            return (
              <div key={e.id} className="flex gap-3 mb-4">
                {/* Línea vertical */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${STATUS_COLORS[e.status] || 'bg-gray-500'} ${isCurrent ? 'ring-2 ring-offset-2 ring-[var(--primary-color)]' : ''}`} />
                  {idx < expedients.length - 1 && <div className="w-px flex-1 bg-[var(--border-color)] mt-1 min-h-[20px]" />}
                </div>

                {/* Contenido */}
                <div className={`flex-1 pb-2 ${isCurrent ? 'opacity-100' : 'opacity-80'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/expedients/${e.id}`}
                          className="font-mono text-xs font-bold text-[var(--primary-color)] hover:underline">
                          {e.code}
                        </Link>
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--sidebar-bg)] px-1.5 py-0.5 rounded">
                          {OP_LABELS[e.operationType] || e.operationType}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-1.5 py-0.5 rounded">
                            Actual
                          </span>
                        )}
                      </div>
                      {e.propertyAddress && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{e.propertyAddress}</p>
                      )}
                      <PhaseBar history={e.phaseHistory} />
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(e.openedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                      </p>
                      {e.status === 'COMPLETADO' && e.closedAt && (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          → {new Date(e.closedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      <div className={`w-1.5 h-1.5 rounded-full ml-auto mt-1 ${STATUS_COLORS[e.status] || 'bg-gray-500'}`} />
                    </div>
                  </div>

                  {e.propertyPrice && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      <TrendingUp size={10} />
                      {Number(e.propertyPrice).toLocaleString('es-ES')} €
                      {e.currentPhase && (
                        <span className="ml-1 flex items-center gap-1">
                          <Clock size={9} /> {e.currentPhase}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
