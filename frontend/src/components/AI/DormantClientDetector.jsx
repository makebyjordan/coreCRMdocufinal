import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Send, Clock, TrendingDown } from 'lucide-react'
import api from '../../api/client'

export default function DormantClientDetector() {
  const { data: dormantClients = [], isLoading } = useQuery({
    queryKey: ['dormant-clients'],
    queryFn: () => api.get('/ai/dormant-clients?daysThreshold=90').then(r => r.data || []),
    refetchInterval: 24 * 60 * 60 * 1000, // Daily refresh
  })

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded mb-4 w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-gray-300 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (dormantClients.length === 0) {
    return null
  }

  return (
    <div className="card p-6 border-l-4 border-orange-500 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-100">
            <TrendingDown size={20} className="text-orange-600" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-main)' }} className="font-semibold">
              Clientes dormidos detectados
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs">
              {dormantClients.length} cliente{dormantClients.length > 1 ? 's' : ''} inactivo{dormantClients.length > 1 ? 's' : ''} por más de 90 días
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {dormantClients.slice(0, 5).map((client) => (
          <div
            key={client.clientId}
            className="p-3 rounded-lg border border-orange-200 bg-orange-50 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p style={{ color: 'var(--text-main)' }} className="font-medium text-sm">
                {client.clientName}
              </p>
              <span className="badge bg-orange-200 text-orange-800 text-xs">
                Prioridad: {client.reactivationPriority}/10
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-orange-700">
              <Clock size={14} />
              {client.lastActivityDays} días sin contacto
            </div>

            {client.reactivationMessage && (
              <div className="p-2 bg-white rounded border border-orange-100">
                <p className="text-xs text-[var(--text-main)]">
                  {client.reactivationMessage.substring(0, 100)}...
                </p>
              </div>
            )}

            {client.immediateActions && client.immediateActions.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-orange-600 mt-0.5" />
                <div className="text-xs text-orange-700">
                  <p className="font-medium mb-1">Acciones inmediatas:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {client.immediateActions.slice(0, 2).map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button className="w-full mt-2 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
              <Send size={12} />
              Activar plan de reactivación
            </button>
          </div>
        ))}
      </div>

      {dormantClients.length > 5 && (
        <p style={{ color: 'var(--text-muted)' }} className="text-xs text-center">
          +{dormantClients.length - 5} clientes más...
        </p>
      )}
    </div>
  )
}
