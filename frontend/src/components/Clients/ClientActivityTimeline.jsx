import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, FileText, User, FolderOpen, CheckCircle,
  ChevronDown, ChevronUp, Clock, ArrowRight
} from 'lucide-react'
import api from '../../api/client'

const ACTIVITY_ICONS = {
  CLIENT_CREATED: User,
  CLIENT_UPDATED: User,
  EXPEDIENT_CREATED: FolderOpen,
  EXPEDIENT_PHASE_CHANGED: ArrowRight,
  EXPEDIENT_STATUS_CHANGED: FolderOpen,
  EXPEDIENT_CLOSED: CheckCircle,
  DOC_UPLOADED: FileText,
  DOC_VALIDATED: CheckCircle,
  DOC_REJECTED: FileText,
  VISIT_CREATED: User,
  VISIT_UPDATED: User,
  SIGNATURE_SENT: FileText,
  SIGNATURE_SIGNED: CheckCircle,
  SIGNATURE_EXPIRED: Clock,
  NOTE_CREATED: FileText,
  NOTE_PINNED: FileText,
  COMMUNICATION_SENT: Activity,
  TASK_CREATED: CheckCircle,
  TASK_COMPLETED: CheckCircle,
}

const ACTIVITY_COLORS = {
  CLIENT_CREATED: 'bg-blue-500',
  CLIENT_UPDATED: 'bg-blue-400',
  EXPEDIENT_CREATED: 'bg-green-500',
  EXPEDIENT_PHASE_CHANGED: 'bg-orange-500',
  EXPEDIENT_STATUS_CHANGED: 'bg-yellow-500',
  EXPEDIENT_CLOSED: 'bg-purple-500',
  DOC_UPLOADED: 'bg-gray-500',
  DOC_VALIDATED: 'bg-green-500',
  DOC_REJECTED: 'bg-red-500',
  VISIT_CREATED: 'bg-blue-500',
  VISIT_UPDATED: 'bg-blue-400',
  SIGNATURE_SENT: 'bg-purple-500',
  SIGNATURE_SIGNED: 'bg-green-500',
  SIGNATURE_EXPIRED: 'bg-red-500',
  NOTE_CREATED: 'bg-yellow-500',
  NOTE_PINNED: 'bg-yellow-600',
  COMMUNICATION_SENT: 'bg-blue-500',
  TASK_CREATED: 'bg-green-500',
  TASK_COMPLETED: 'bg-green-600',
}

export default function ClientActivityTimeline({ clientId }) {
  const [limit, setLimit] = useState(50)
  const [expandedId, setExpandedId] = useState(null)
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['client-timeline-aggregated', clientId, limit],
    queryFn: () => api.get(`/clients/${clientId}/timeline-aggregated?limit=${limit}`).then(r => r.data),
    enabled: !!clientId,
  })

  if (isLoading) return <div className="text-center py-10 text-gray-400">Cargando timeline...</div>

  const timeline = data?.timeline || []
  const total = data?.total || 0

  const filteredTimeline = filter
    ? timeline.filter(item => item.type?.toLowerCase().includes(filter.toLowerCase()))
    : timeline

  const groupedByDate = filteredTimeline.reduce((acc, item) => {
    const date = new Date(item.createdAt).toLocaleDateString('es-ES')
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Activity size={16} className="text-[var(--primary-color)]" />
          Timeline de actividad
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar por tipo..."
            className="input text-sm py-1.5 px-3 w-48"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="text-xs text-[var(--text-muted)]">
            {filteredTimeline.length} / {total} eventos
          </span>
        </div>
      </div>

      {filteredTimeline.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Clock size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin actividad registrada</p>
          <p className="text-xs text-gray-300 mt-1">Las acciones del cliente aparecerán aquí</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date}>
            <div className="sticky top-0 bg-[var(--bg-color)] py-2 z-10">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                {date}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {timeline.length < total && (
        <div className="text-center pt-4">
          <button
            onClick={() => setLimit(l => l + 50)}
            className="btn-secondary text-sm"
          >
            Cargar más eventos
          </button>
        </div>
      )}
    </div>
  )
}

function TimelineItem({ item, isExpanded, onToggle }) {
  const Icon = ACTIVITY_ICONS[item.type] || Activity
  const colorClass = ACTIVITY_COLORS[item.type] || 'bg-gray-500'
  const isPhase = item.source === 'phase'

  return (
    <div className="flex gap-3 group">
      {/* Icono y línea */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white shrink-0`}>
          <Icon size={14} />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-4">
        <div className="card p-3 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-sm text-[var(--text-main)]">{item.title}</p>
              {item.description && (
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)]">
                <span className="badge bg-[var(--sidebar-bg)] text-xs">{item.type}</span>
                {item.source && (
                  <span className="text-gray-400">via {item.source}</span>
                )}
                {item.user?.name && (
                  <span>por {item.user.name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(item.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {item.metadata && (
                <button
                  onClick={onToggle}
                  className="p-1 text-gray-400 hover:text-[var(--primary-color)] transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Metadata expandido */}
          {isExpanded && item.metadata && (
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <pre className="text-xs text-[var(--text-muted)] bg-[var(--sidebar-bg)] p-2 rounded overflow-auto">
                {JSON.stringify(item.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Link a expediente */}
          {item.expedient && (
            <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
              <a
                href={`/expedients/${item.expedient.id}`}
                className="text-xs text-[var(--primary-color)] hover:underline flex items-center gap-1"
              >
                <FolderOpen size={12} /> {item.expedient.code}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
