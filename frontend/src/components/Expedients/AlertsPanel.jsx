import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, FileX, UserX, CalendarX, Link2, ShieldOff, ShieldCheck } from 'lucide-react'
import api from '../../api/client'

function computeAlerts(exp) {
  if (!exp) return { critical: [], important: [], info: [] }

  const now = new Date()
  const critical = []
  const important = []
  const info = []

  const docs = exp.documents || []
  const visits = exp.visits || []
  const checklists = exp.checklists || []

  // ── CRÍTICAS ────────────────────────────────────────────────────────────────

  const rejectedDocs = docs.filter(d => d.status === 'RECHAZADO')
  rejectedDocs.forEach(d => {
    critical.push({
      id: `doc-rejected-${d.id}`,
      icon: FileX,
      title: 'Documento rechazado',
      description: `"${d.name}"${d.rejectedReason ? ` — ${d.rejectedReason}` : ''}`,
      action: 'Resubir documento',
      type: 'document',
      expedientId: exp.id,
      documentId: d.id,
    })
  })

  const currentChecklists = checklists.filter(c => c.phase === exp.currentPhase)
  const pendingRequired = currentChecklists.reduce((acc, c) => {
    return acc + (c.items?.filter(i => i.required && !i.completed).length || 0)
  }, 0)
  if (pendingRequired > 0) {
    critical.push({
      id: 'checklist-pending',
      icon: AlertTriangle,
      title: `${pendingRequired} ítems obligatorios sin completar`,
      description: `Completa el checklist de la fase "${exp.currentPhase}" para poder avanzar`,
      action: 'Ver checklist',
      type: 'checklist',
      expedientId: exp.id,
      phase: exp.currentPhase,
    })
  }

  if (exp.exclusivityEnd) {
    const daysLeft = Math.ceil((new Date(exp.exclusivityEnd) - now) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) {
      critical.push({
        id: 'exclusivity-expired',
        icon: CalendarX,
        title: 'Exclusividad vencida',
        description: `Venció hace ${Math.abs(daysLeft)} días — ${new Date(exp.exclusivityEnd).toLocaleDateString('es-ES')}`,
        action: 'Renovar exclusividad',
        type: 'expedient',
        expedientId: exp.id,
      })
    } else if (daysLeft <= 15) {
      critical.push({
        id: 'exclusivity-near',
        icon: Clock,
        title: `Exclusividad vence en ${daysLeft} días`,
        description: `Fecha de vencimiento: ${new Date(exp.exclusivityEnd).toLocaleDateString('es-ES')}`,
        action: 'Renovar exclusividad',
        type: 'expedient',
        expedientId: exp.id,
      })
    }
  }

  if (exp.arrasDeadline) {
    const daysLeft = Math.ceil((new Date(exp.arrasDeadline) - now) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) {
      critical.push({
        id: 'arras-expired',
        icon: AlertTriangle,
        title: 'Arras vencidas',
        description: `El contrato de arras venció hace ${Math.abs(daysLeft)} días`,
        action: 'Revisar contrato',
        type: 'expedient',
        expedientId: exp.id,
      })
    } else if (daysLeft <= 7) {
      critical.push({
        id: 'arras-near',
        icon: Clock,
        title: `Arras vencen en ${daysLeft} días`,
        description: `Fecha límite: ${new Date(exp.arrasDeadline).toLocaleDateString('es-ES')}`,
        action: 'Revisar contrato',
        type: 'expedient',
        expedientId: exp.id,
      })
    }
  }

  if (exp.status === 'BLOQUEADO') {
    critical.push({
      id: 'blocked',
      icon: AlertCircle,
      title: 'Expediente bloqueado',
      description: 'El expediente está bloqueado. Resuelve los problemas para continuar.',
      action: 'Desbloquear',
      type: 'expedient',
      expedientId: exp.id,
    })
  }

  // ── IMPORTANTES ─────────────────────────────────────────────────────────────

  const visitsSinFeedback = visits.filter(v => {
    const hoursAgo = (now - new Date(v.date)) / (1000 * 60 * 60)
    return !v.feedback && hoursAgo > 48
  })
  if (visitsSinFeedback.length > 0) {
    important.push({
      id: 'visits-no-feedback',
      icon: UserX,
      title: `${visitsSinFeedback.length} visita${visitsSinFeedback.length > 1 ? 's' : ''} sin feedback`,
      description: `Han pasado más de 48h sin registrar feedback de visitantes`,
      action: 'Registrar feedback',
      type: 'expedient',
      expedientId: exp.id,
    })
  }

  const pendingDocs = docs.filter(d => d.status === 'PENDIENTE')
  if (pendingDocs.length > 3) {
    important.push({
      id: 'docs-pending',
      icon: FileX,
      title: `${pendingDocs.length} documentos pendientes de revisión`,
      description: 'Hay documentos subidos que aún no han sido validados',
      action: 'Revisar documentos',
      type: 'documents',
      expedientId: exp.id,
    })
  }

  if (exp.notaryDate) {
    const daysToNotary = Math.ceil((new Date(exp.notaryDate) - now) / (1000 * 60 * 60 * 24))
    if (daysToNotary >= 0 && daysToNotary <= 7) {
      important.push({
        id: 'notary-soon',
        icon: Clock,
        title: `Cita notaría en ${daysToNotary} días`,
        description: `${exp.notaryName || 'Notaría'} — ${new Date(exp.notaryDate).toLocaleDateString('es-ES')}`,
        action: 'Ver detalles',
        type: 'expedient',
        expedientId: exp.id,
      })
    }
  }

  // ── INFORMATIVAS ─────────────────────────────────────────────────────────────

  const recentlyValidated = docs.filter(d => {
    if (d.status !== 'VALIDADO' || !d.validatedAt) return false
    const hoursAgo = (now - new Date(d.validatedAt)) / (1000 * 60 * 60)
    return hoursAgo < 24
  })
  if (recentlyValidated.length > 0) {
    info.push({
      id: 'docs-validated',
      icon: CheckCircle,
      title: `${recentlyValidated.length} documento${recentlyValidated.length > 1 ? 's' : ''} validado${recentlyValidated.length > 1 ? 's' : ''} hoy`,
      description: recentlyValidated.map(d => d.name).join(', '),
      type: 'documents',
      expedientId: exp.id,
      documentId: recentlyValidated.length === 1 ? recentlyValidated[0].id : null,
    })
  }

  const highInterestVisits = visits.filter(v => v.interestLevel === 'HIGH')
  if (highInterestVisits.length > 0) {
    info.push({
      id: 'high-interest',
      icon: Info,
      title: `${highInterestVisits.length} interesado${highInterestVisits.length > 1 ? 's' : ''} de alta prioridad`,
      description: highInterestVisits.map(v => v.visitorName).join(', '),
      type: 'expedient',
      expedientId: exp.id,
    })
  }

  return { critical, important, info }
}

const PHASE_ORDER = [
  'CAPTACION','VALORACION','FORMULARIO','DOCUMENTACION','VALIDACION','ACUERDO',
  'MARKETING_FORMULARIO','MARKETING_EJECUCION','VISITAS','PREVENTA',
  'BUSQUEDA_ACTIVA','NEGOCIACION','ACUERDO_INTERESADO','ARRAS',
  'HIPOTECA','NOTARIA','CIERRE','POSVENTA','CERRADO',
]

function phaseIndex(p) {
  const i = PHASE_ORDER.indexOf(p)
  return i === -1 ? 0 : i
}

function computeLinkedAlerts(linksData) {
  if (!linksData) return { critical: [], important: [], info: [] }
  const critical = [], important = [], info = []
  const outgoing = linksData.outgoing || []
  const incoming = linksData.incoming || []

  // Vínculos bloqueantes que aún no se han cumplido
  outgoing.filter(l => l.isBlocking && l.requiredPhase).forEach(link => {
    const linked = link.linkedExpedient
    const linkedIdx = phaseIndex(linked?.currentPhase)
    const requiredIdx = phaseIndex(link.requiredPhase)
    if (linkedIdx < requiredIdx) {
      critical.push({
        id: `link-blocking-${link.id}`,
        icon: ShieldOff,
        title: `Avance bloqueado por vínculo`,
        description: `${linked?.code} debe alcanzar la fase ${link.requiredPhase} (ahora: ${linked?.currentPhase}). Tipo: ${link.linkType.replace(/_/g, ' ')}`,
        action: 'Ver expediente vinculado',
        type: 'expedient',
        expedientId: linked?.id,
      })
    }
  })

  // Expedientes vinculados que alcanzaron la fase requerida recientemente (últimas 48h) → desbloqueados
  outgoing.filter(l => l.isBlocking && l.requiredPhase).forEach(link => {
    const linked = link.linkedExpedient
    const linkedIdx = phaseIndex(linked?.currentPhase)
    const requiredIdx = phaseIndex(link.requiredPhase)
    if (linkedIdx >= requiredIdx) {
      // Check if last phase change was recent (within 48h)
      info.push({
        id: `link-unblocked-${link.id}`,
        icon: ShieldCheck,
        title: `Vínculo desbloqueado`,
        description: `${linked?.code} alcanzó la fase ${linked?.currentPhase} (requerida: ${link.requiredPhase}). Ya puedes avanzar.`,
        type: 'expedient',
        expedientId: linked?.id,
      })
    }
  })

  // Expedientes vinculados entrantes con status reciente
  incoming.forEach(link => {
    const source = link.expedient
    if (source?.status === 'BLOQUEADO') {
      important.push({
        id: `incoming-blocked-${link.id}`,
        icon: Link2,
        title: `Expediente vinculado bloqueado`,
        description: `${source?.code} (${link.linkType.replace(/_/g, ' ')}) está bloqueado, lo que puede afectar a esta operación`,
        action: 'Ver expediente',
        type: 'expedient',
        expedientId: source?.id,
      })
    }
    if (source?.status === 'CANCELADO') {
      important.push({
        id: `incoming-cancelled-${link.id}`,
        icon: Link2,
        title: `Expediente vinculado cancelado`,
        description: `${source?.code} ha sido cancelado. Revisa si afecta a las condiciones de esta operación.`,
        action: 'Ver vínculo',
        type: 'expedient',
        expedientId: source?.id,
      })
    }
  })

  return { critical, important, info }
}

function getAlertRoute(alert) {
  if (!alert) return null
  if (alert.type === 'document' && alert.expedientId) {
    return `/expedients/${alert.expedientId}?tab=documents`
  }
  if (alert.type === 'visit' && alert.expedientId) {
    return `/expedients/${alert.expedientId}?tab=visits`
  }
  if (alert.type === 'checklist' && alert.expedientId) {
    return `/expedients/${alert.expedientId}?tab=checklist`
  }
  if (alert.type === 'signature' && alert.expedientId) {
    return `/expedients/${alert.expedientId}?tab=signatures`
  }
  if (alert.expedientId) {
    return `/expedients/${alert.expedientId}`
  }
  return null
}

function AlertGroup({ title, color, bgColor, borderColor, icon: GroupIcon, items, navigate }) {
  if (items.length === 0) return null

  const handleClick = (alert, e) => {
    const route = getAlertRoute(alert)
    if (route) {
      navigate(route)
    }
  }
  
  const handleKeyDown = (alert, e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(alert, e)
    }
  }
  
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg ${bgColor} ${borderColor} border`}>
        <GroupIcon size={14} className={color} />
        <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{title}</span>
        <span className={`ml-auto text-xs font-bold ${color}`}>{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map(alert => {
          const Icon = alert.icon
          const route = getAlertRoute(alert)
          const isClickable = !!route
          
          return (
            <div
              key={alert.id}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={(e) => handleClick(alert, e)}
              onKeyDown={(e) => handleKeyDown(alert, e)}
              className={`flex gap-3 p-3 rounded-lg border ${borderColor} bg-[var(--bg-color)] transition-all duration-200 ${
                isClickable 
                  ? 'cursor-pointer hover:bg-[var(--sidebar-bg)] hover:shadow-md hover:border-opacity-50 active:scale-[0.99]' 
                  : ''
              }`}
            >
              <Icon size={16} className={`${color} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] leading-tight">{alert.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{alert.description}</p>
              </div>
              {alert.action && (
                <span className={`text-[10px] font-semibold ${color} shrink-0 self-start mt-0.5 whitespace-nowrap`}>
                  {alert.action}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AlertsPanel({ exp, expedientId }) {
  const navigate = useNavigate()

  const { data: linksData } = useQuery({
    queryKey: ['links', expedientId],
    queryFn: () => api.get(`/expedients/${expedientId}/links`).then(r => r.data),
    enabled: !!expedientId,
    staleTime: 30000,
  })

  const base = computeAlerts(exp)
  const linked = computeLinkedAlerts(linksData)

  const critical = [...base.critical, ...linked.critical]
  const important = [...base.important, ...linked.important]
  const info = [...base.info, ...linked.info]
  const total = critical.length + important.length + info.length

  if (total === 0) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
        <h3 className="font-bold text-lg text-[var(--text-main)]">Sin alertas activas</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">El expediente está al día. No hay problemas detectados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center border-red-500/30">
          <p className="text-2xl font-bold text-red-400">{critical.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Críticas</p>
        </div>
        <div className="card p-3 text-center border-yellow-500/30">
          <p className="text-2xl font-bold text-yellow-400">{important.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Importantes</p>
        </div>
        <div className="card p-3 text-center border-blue-500/30">
          <p className="text-2xl font-bold text-blue-400">{info.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Informativas</p>
        </div>
      </div>

      <AlertGroup
        title="Críticas — bloquean el avance"
        color="text-red-400" bgColor="bg-red-500/10" borderColor="border-red-500/30"
        icon={AlertTriangle} items={critical} navigate={navigate}
      />
      <AlertGroup
        title="Importantes"
        color="text-yellow-400" bgColor="bg-yellow-500/10" borderColor="border-yellow-500/30"
        icon={AlertCircle} items={important} navigate={navigate}
      />
      <AlertGroup
        title="Informativas"
        color="text-blue-400" bgColor="bg-blue-500/10" borderColor="border-blue-500/30"
        icon={Info} items={info} navigate={navigate}
      />
    </div>
  )
}
