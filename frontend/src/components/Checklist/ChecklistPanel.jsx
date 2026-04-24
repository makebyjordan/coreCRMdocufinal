import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { CheckCircle, Circle, ChevronDown, ChevronRight, RefreshCw, Layers } from 'lucide-react'
import { useState, useEffect } from 'react'

// Human-readable phase labels (mirrors backend enum keys)
const PHASE_LABELS = {
  CAPTACION: 'Captación / Perfilado',
  VALORACION: 'Valoración / ROI',
  FORMULARIO: 'Ficha / Criterios',
  DOCUMENTACION: 'Documentación / KYC',
  VALIDACION: 'Validación / Solvencia',
  ACUERDO: 'Acuerdo / Mandato',
  MARKETING_FORMULARIO: 'Briefing Marketing',
  MARKETING_EJECUCION: 'Marketing activo',
  PREVENTA: 'Preventa',
  BUSQUEDA_ACTIVA: 'Búsqueda activa',
  VISITAS: 'Visitas',
  NEGOCIACION: 'Negociación',
  PROPUESTA: 'Propuesta',
  ARRAS: 'Reserva / Arras',
  ACUERDO_INTERESADO: 'Acuerdo Inquilino',
  HIPOTECA: 'Hipoteca',
  NOTARIA: 'Notaría',
  CIERRE: 'Cierre / Contrato',
  POSVENTA: 'Cierre / Gestión',
  CERRADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

export default function ChecklistPanel({ expedientId }) {
  const qc = useQueryClient()

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists', expedientId],
    queryFn: () => api.get(`/checklists/expedient/${expedientId}`).then(r => r.data),
  })

  const toggleItem = useMutation({
    mutationFn: ({ instanceId, itemId, completed, notes }) =>
      api.put(`/checklists/instance/${instanceId}/item/${itemId}`, { completed, notes }),
    onSuccess: () => qc.invalidateQueries(['checklists', expedientId]),
    onError: () => toast.error('Error al actualizar el ítem'),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/checklists/expedient/${expedientId}/generate`),
    onSuccess: () => { toast.success('Checklist generada'); qc.invalidateQueries(['checklists', expedientId]) },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color)] mr-3" />
      Cargando checklists...
    </div>
  )

  if (!checklists?.length) {
    return (
      <div className="card p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-glow)] flex items-center justify-center mx-auto mb-4">
          <Layers size={28} className="text-[var(--primary-color)]" />
        </div>
        <p className="font-semibold text-[var(--text-main)] mb-1">No hay checklists para esta fase</p>
        <p className="text-sm text-[var(--text-muted)] mb-5">
          Genera los checklists automáticamente para la fase actual.
        </p>
        <button onClick={() => generateMutation.mutate()} className="btn-primary mx-auto" disabled={generateMutation.isPending}>
          <RefreshCw size={15} className={generateMutation.isPending ? 'animate-spin' : ''} />
          {generateMutation.isPending ? 'Generando...' : 'Generar checklist'}
        </button>
      </div>
    )
  }

  // ── Group instances by their template.phase ──────────────────────────────
  const grouped = {}
  for (const instance of checklists) {
    const phase = instance.template?.phase || 'SIN_FASE'
    if (!grouped[phase]) grouped[phase] = []
    grouped[phase].push(instance)
  }

  const phaseKeys = Object.keys(grouped)
  const multiplePhases = phaseKeys.length > 1

  return (
    <div className="space-y-6">
      {phaseKeys.map((phase, phaseIdx) => {
        const instances = grouped[phase]

        // Overall progress across all instances in this phase group
        const totalItems = instances.reduce((s, i) => s + i.progress.total, 0)
        const doneItems = instances.reduce((s, i) => s + i.progress.done, 0)
        const phasePct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

        return (
          <div key={phase}>
            {/* Phase group header — only shown when there are multiple phases */}
            {multiplePhases && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 flex items-center gap-3">
                  <div
                    className="h-px flex-1 bg-[var(--border-color)]"
                    style={{ maxWidth: '24px' }}
                  />
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--sidebar-hover)] rounded-full border border-[var(--border-color)]">
                    <Layers size={12} className="text-[var(--primary-color)] shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {PHASE_LABELS[phase] || phase}
                    </span>
                    <span className="ml-1 text-[10px] font-semibold text-[var(--text-muted)] opacity-70">
                      · {doneItems}/{totalItems}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>
              </div>
            )}

            {/* Checklist instances in this phase */}
            <div className="space-y-3">
              {instances.map(instance => (
                <ChecklistInstance
                  key={instance.id}
                  instance={instance}
                  onToggle={(itemId, completed) =>
                    toggleItem.mutate({ instanceId: instance.id, itemId, completed })
                  }
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChecklistInstance({ instance, onToggle }) {
  const [expanded, setExpanded] = useState(true)
  const { progress } = instance

  // Colapsar automáticamente cuando se completa o cambia la instancia
  useEffect(() => {
    if (instance.completedAt) {
      setExpanded(false)
    }
  }, [instance.id, instance.completedAt])

  return (
    <div className={`card overflow-hidden border-l-4 transition-all ${
      instance.completedAt
        ? 'border-l-green-500'
        : progress.percent > 0
          ? 'border-l-[var(--primary-color)]'
          : 'border-l-[var(--border-color)]'
    }`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown size={16} className="text-[var(--text-muted)]" />
          </div>
          <span className="font-semibold text-[var(--text-main)] truncate">{instance.template?.name}</span>
          {instance.completedAt && (
            <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] shrink-0">
              ✓ Completada
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs font-medium text-[var(--text-muted)]">{progress.done}/{progress.total}</span>
          <div className="w-28 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.percent === 100 ? 'bg-emerald-500' :
                progress.percent > 50 ? 'bg-[var(--primary-color)]' : 'bg-amber-400'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums w-8 text-right ${
            progress.percent === 100 ? 'text-emerald-600' : 'text-[var(--text-muted)]'
          }`}>
            {progress.percent}%
          </span>
        </div>
      </div>

      {/* Items */}
      {expanded && (
        <div className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {instance.items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-4 px-5 py-3.5 cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors ${
                item.completed ? 'opacity-60' : ''
              }`}
              onClick={() => onToggle(item.id, !item.completed)}
            >
              <div className="mt-0.5 shrink-0">
                {item.completed
                  ? <CheckCircle size={18} className="text-emerald-500" />
                  : <Circle size={18} className="text-[var(--text-muted)]" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${
                  item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'
                }`}>
                  {item.label}
                  {item.required && !item.completed && (
                    <span className="ml-2 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                      *obligatorio
                    </span>
                  )}
                </p>
                {item.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</p>
                )}
                {item.completedAt && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ✓ {item.completedBy} · {new Date(item.completedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
