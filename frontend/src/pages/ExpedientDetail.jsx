import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertTriangle,
  FolderOpen, FileText, Bell, Users, History, RefreshCw,
  Pencil, Save, X, Plus, Edit2, Trash2, PenSquare, ExternalLink, Mail,
  LayoutDashboard, Clock, Link2, Calculator, Calendar as CalIcon,
} from 'lucide-react'
import api from '../api/client'
import ChecklistPanel from '../components/Checklist/ChecklistPanel'
import DocumentPanel from '../components/Documents/DocumentPanel'
import WorkflowStepper from '../components/Workflow/WorkflowStepper'
import NotificationLog from '../components/Notifications/NotificationLog'
import OperationDashboard from '../components/Expedients/OperationDashboard'
import AlertsPanel from '../components/Expedients/AlertsPanel'
import OperationTimeline from '../components/Expedients/OperationTimeline'
import LinkedExpedientsPanel from '../components/Expedients/LinkedExpedientsPanel'
import FinancialSimulator from '../components/Expedients/FinancialSimulator'
import CombinedFinancialCalculator from '../components/Expedients/CombinedFinancialCalculator'
const TABS = [
  { id: 'dashboard', label: 'Estado', icon: LayoutDashboard },
  { id: 'checklist', label: 'Checklist', icon: CheckCircle },
  { id: 'overview', label: 'Resumen', icon: FolderOpen },
  { id: 'visits', label: 'Visitas', icon: Users },
  { id: 'signatures', label: 'Firmas', icon: PenSquare },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'linked', label: 'Vinculados', icon: Link2 },
  { id: 'financial', label: 'Financiero', icon: Calculator },
  { id: 'combined', label: 'Calc. Combinada', icon: Calculator },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'history', label: 'Historial', icon: History },
]

const SIGNATURE_STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  ENVIADO: 'Enviado',
  FIRMADO: 'Firmado',
  EXPIRADO: 'Expirado',
}

const SIGNATURE_STATUS_COLORS = {
  PENDIENTE: 'text-gray-600 bg-gray-500/20',
  ENVIADO: 'text-purple-600 bg-purple-500/20',
  FIRMADO: 'text-green-600 bg-green-500/20',
  EXPIRADO: 'text-red-600 bg-red-500/20',
}

const PHASE_LABELS = {
  CAPTACION: 'Captación',
  VALORACION: 'Valoración',
  FORMULARIO: 'Formulario inicial',
  DOCUMENTACION: 'Documentación',
  VALIDACION: 'Validación',
  ACUERDO: 'Acuerdo / Exclusiva',
  MARKETING_FORMULARIO: 'Brief Marketing',
  MARKETING_EJECUCION: 'Producción Mkt',
  VISITAS: 'Registro de Visitas',
  PREVENTA: 'Lanzamiento Preventa',
  BUSQUEDA_ACTIVA: 'Búsqueda activa',
  NEGOCIACION: 'Negociación',
  ACUERDO_INTERESADO: 'Propuesta / Señal',
  ARRAS: 'Contrato de Arras',
  HIPOTECA: 'Gestión Hipotecaria',
  NOTARIA: 'Notaría y Firmas',
  CIERRE: 'Cierre de operación',
  POSVENTA: 'Posventa',
  CERRADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const INQUILINO_PHASE_LABELS = {
  CAPTACION: 'Contacto inicial',
  FORMULARIO: 'Datos personales',
  DOCUMENTACION: 'Documentación inquilino',
  VALIDACION: 'Verificación solvencia',
  VISITAS: 'Visitas a inmuebles',
  NEGOCIACION: 'Negociación condiciones',
  ACUERDO_INTERESADO: 'Acuerdo / Reserva',
  CIERRE: 'Firma contrato y entrega',
  POSVENTA: 'Seguimiento post-alquiler',
  CERRADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const PROPIETARIO_PHASE_LABELS = {
  CAPTACION: 'Captación de propiedad',
  VALORACION: 'Valoración de mercado',
  FORMULARIO: 'Ficha de propiedad',
  DOCUMENTACION: 'Documentación legal',
  ACUERDO: 'Mandato de alquiler',
  MARKETING_FORMULARIO: 'Briefing marketing',
  MARKETING_EJECUCION: 'Producción y anuncios',
  VISITAS: 'Registro de visitas',
  NEGOCIACION: 'Filtro y negociación',
  CIERRE: 'Firma de contrato',
  POSVENTA: 'Gestión alquiler',
  CERRADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const INVERSOR_PHASE_LABELS = {
  CAPTACION: 'Perfilado de inversor',
  FORMULARIO: 'Criterios de inversión',
  DOCUMENTACION: 'KYC y Fondos',
  BUSQUEDA_ACTIVA: 'Búsqueda de activos',
  VALORACION: 'Análisis de ROI/Yield',
  VISITAS: 'Visitas técnicas',
  NEGOCIACION: 'Oferta y negociación',
  ARRAS: 'Reserva de activo',
  CIERRE: 'Cierre de compra',
  POSVENTA: 'Gestión rentabilidad',
  CERRADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const CONDITIONAL_PHASES = ['VALIDACION', 'BUSQUEDA_ACTIVA', 'ARRAS', 'CIERRE']

export default function ExpedientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'dashboard')
  const [advanceModal, setAdvanceModal] = useState(false)
  const [decision, setDecision] = useState('SI')
  const [notes, setNotes] = useState('')
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  const [pendingSignDoc, setPendingSignDoc] = useState(null)

  // Handle URL params for tab switching and element highlighting
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const documentId = searchParams.get('documentId')
    
    if (tabParam && tabParam !== tab) {
      setTab(tabParam)
    }

    // Scroll to and highlight specific element if documentId is provided
    if (documentId) {
      setTimeout(() => {
        const element = document.getElementById(`doc-${documentId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('highlight-flash')
          setTimeout(() => {
            element.classList.remove('highlight-flash')
          }, 2000)
        }
      }, 300)
    }
  }, [searchParams, tab])

  // Update URL when tab changes
  const handleTabChange = (newTab) => {
    setTab(newTab)
    setSearchParams({ tab: newTab })
  }

  const { data: exp, isLoading } = useQuery({
    queryKey: ['expedient', id],
    queryFn: () => api.get(`/expedients/${id}`).then(r => r.data),
  })

  // Helper: etiqueta de fase según tipo de operación
  const phaseLabel = (phase) => {
    if (exp?.operationType === 'INQUILINO') {
      return INQUILINO_PHASE_LABELS[phase] || PHASE_LABELS[phase] || phase
    }
    if (exp?.operationType === 'PROPIETARIO') {
      return PROPIETARIO_PHASE_LABELS[phase] || PHASE_LABELS[phase] || phase
    }
    if (exp?.operationType === 'INVERSION_HOLDERS') {
      return INVERSOR_PHASE_LABELS[phase] || PHASE_LABELS[phase] || phase
    }
    return PHASE_LABELS[phase] || phase
  }

  // Fases condicionales para este tipo de operación
  const isConditional = exp?.operationType === 'INQUILINO'
    ? ['VALIDACION'].includes(exp?.currentPhase) 
    : exp?.operationType === 'PROPIETARIO'
      ? ['VALIDACION'].includes(exp?.currentPhase)
      : exp?.operationType === 'INVERSION_HOLDERS'
        ? ['ARRAS'].includes(exp?.currentPhase)
        : CONDITIONAL_PHASES.includes(exp?.currentPhase)

  // Lógica de validación de checklists
  const currentChecklists = exp?.checklists?.filter(c => c.phase === exp?.currentPhase) || []
  const hasRequiredChecklists = currentChecklists.length > 0
  const isFinalPhase = ['CERRADO', 'CANCELADO'].includes(exp?.currentPhase)
  
  const pendingItemsCount = currentChecklists.reduce((acc, c) => {
    return acc + (c.items?.filter(i => i.required && !i.completed).length || 0)
  }, 0)

  // Bloqueamos si faltan ítems O si no hay checklist en una fase que debería tenerlo
  const pendingRequired = (!hasRequiredChecklists && !isFinalPhase) ? 1 : pendingItemsCount
  const canAdvance = pendingRequired === 0 && (hasRequiredChecklists || isFinalPhase)

  const advanceMutation = useMutation({
    mutationFn: (payload) => api.post(`/expedients/${id}/advance`, payload),
    onSuccess: (res) => {
      toast.success(`Avanzado a: ${phaseLabel(res.data.toPhase)}`)
      qc.invalidateQueries(['expedient', id])
      qc.invalidateQueries(['kanban'])
      setAdvanceModal(false)
      setNotes('')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al avanzar'),
  })

  const blockMutation = useMutation({
    mutationFn: (reason) => api.post(`/expedients/${id}/block`, { reason }),
    onSuccess: () => { toast.success('Expediente bloqueado'); qc.invalidateQueries(['expedient', id]) },
  })

  const unblockMutation = useMutation({
    mutationFn: () => api.post(`/expedients/${id}/unblock`),
    onSuccess: () => { toast.success('Expediente desbloqueado'); qc.invalidateQueries(['expedient', id]) },
  })

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/expedients/${id}/close`),
    onSuccess: () => { toast.success('Operación cerrada'); qc.invalidateQueries(['expedient', id]) },
  })

  const renewMutation = useMutation({
    mutationFn: (months) => api.post(`/expedients/${id}/renew-exclusivity`, { months }),
    onSuccess: () => { toast.success('Exclusividad renovada'); qc.invalidateQueries(['expedient', id]) },
  })

  const deleteParticipantMutation = useMutation({
    mutationFn: (participantId) => api.delete(`/participants/${participantId}`),
    onSuccess: () => {
      toast.success('Participante eliminado')
      qc.invalidateQueries(['expedient', id])
    },
  })

  // Manejo de estados de carga y error
  if (isLoading) return <div className="text-center py-20 text-gray-400">Cargando expediente...</div>
  if (!exp) return <div className="text-center py-20 text-red-500">Expediente no encontrado o error al cargar</div>

  const clientName = exp.client?.firstName
    ? `${exp.client.firstName} ${exp.client.lastName || ''}`.trim()
    : exp.client?.companyName || 'Sin cliente'

  const isFinal = ['CERRADO', 'CANCELADO', 'POSVENTA'].includes(exp.currentPhase)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/expedients')} className="btn-secondary px-2">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--text-main)] font-mono">{exp.code}</h2>
            <span className={`badge text-xs ${
              exp.status === 'BLOQUEADO' ? 'bg-red-500/20 text-red-400' :
              exp.status === 'COMPLETADO' ? 'bg-blue-500/20 text-blue-400' :
              'bg-green-500/20 text-green-400'
            }`}>{exp.status}</span>
            <span className="badge bg-[var(--sidebar-bg)] text-[var(--text-muted)] text-xs">{exp.operationType}</span>
            {exp.operationSize !== 'INDIVIDUAL' && (
              <span className="badge bg-purple-500/20 text-purple-400 text-xs">{exp.operationSize}</span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {clientName} · {exp.propertyAddress || 'Sin dirección'}
          </p>
          {exp.clientId && (
            <Link
              to={`/clients/${exp.clientId}`}
              className="text-xs text-[var(--primary-color)] hover:underline mt-0.5 inline-block"
            >
              Ver ficha completa del cliente →
            </Link>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {exp.status === 'BLOQUEADO' ? (
            <button onClick={() => unblockMutation.mutate()} className="btn-primary">
              <CheckCircle size={15} /> Desbloquear
            </button>
          ) : exp.status === 'ACTIVO' && !isFinal && (
            <div className="relative group">
              <button
                onClick={() => setAdvanceModal(true)}
                disabled={!canAdvance}
                className={`btn-primary flex items-center gap-2 transition-all ${
                  !canAdvance ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <ArrowRight size={15} />
                Avanzar fase
                {!canAdvance && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm font-bold">
                    {pendingRequired}
                  </span>
                )}
              </button>
              
              {!canAdvance && (
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg z-50 text-center leading-tight">
                  Quedan {pendingRequired} ítems obligatorios por completar en esta fase
                </div>
              )}
            </div>
          )}
          {exp.status === 'ACTIVO' && exp.currentPhase === 'CIERRE' && (
            <button onClick={() => closeMutation.mutate()} className="btn-primary bg-green-600 hover:bg-green-700">
              <CheckCircle size={15} /> Cerrar operación
            </button>
          )}
          {exp.driveFolder && (
            <a href={`https://drive.google.com/drive/folders/${exp.driveFolderId}`} target="_blank" rel="noreferrer"
              className="btn-secondary">
              <FolderOpen size={15} /> Drive
            </a>
          )}
        </div>
      </div>

      {/* Stepper */}
      <WorkflowStepper currentPhase={exp.currentPhase} status={exp.status} operationType={exp.operationType} />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-1">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => handleTabChange(tabId)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === tabId
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'dashboard'     && <OperationDashboard exp={exp} />}
        {tab === 'overview'      && <ExpedientOverview exp={exp} renewMutation={renewMutation} />}
        {tab === 'visits'        && <VisitsPanel expedientId={id} />}
        {tab === 'signatures'    && <SignaturesPanel expedientId={id} pendingSignDoc={pendingSignDoc} setPendingSignDoc={setPendingSignDoc} />}
        {tab === 'checklist'     && <ChecklistPanel expedientId={id} />}
        {tab === 'documents'     && <DocumentPanel expedientId={id} currentPhase={exp.currentPhase} operationType={exp.operationType} onRequestSign={(doc) => { setPendingSignDoc(doc); handleTabChange('signatures') }} />}
        {tab === 'alerts'        && <AlertsPanel exp={exp} expedientId={id} />}
        {tab === 'timeline'      && <OperationTimeline exp={exp} />}
        {tab === 'linked'        && <LinkedExpedientsPanel expedientId={id} />}
        {tab === 'financial'     && <FinancialSimulator exp={exp} />}
        {tab === 'combined'      && <CombinedFinancialCalculator exp={exp} />}
        {tab === 'notifications' && <NotificationLog expedientId={id} />}
        {tab === 'history'       && <PhaseHistoryTab history={exp.phaseHistory} operationType={exp.operationType} />}
      </div>

      {showParticipantModal && (
        <ParticipantModal 
          expedientId={id} 
          onClose={() => setShowParticipantModal(false)} 
          onSuccess={() => { setShowParticipantModal(false); qc.invalidateQueries(['expedient', id]) }} 
        />
      )}

      {/* Modal avanzar fase */}
      {advanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Fase actual: <strong>{phaseLabel(exp.currentPhase)}</strong>
            </p>

            {!canAdvance && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex gap-3 items-start">
                <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-yellow-700 leading-normal">
                  Hay <strong>{pendingRequired}</strong> ítems obligatorios sin completar. 
                  El sistema rechazará el avance. Completa el checklist antes de continuar.
                </p>
              </div>
            )}

            {isConditional && (
              <div className="mb-4">
                <label className="label">Decisión</label>
                <div className="flex gap-3">
                  {['SI', 'NO'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDecision(d)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors ${
                        decision === d ? 'border-blue-600 bg-[var(--sidebar-bg)] text-blue-700' : 'border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {d === 'SI' ? '✓ Sí' : '✗ No'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Notas (opcional)</label>
              <textarea
                className="input" rows={3} placeholder="Añade notas sobre este cambio..."
                value={notes} onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setAdvanceModal(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => advanceMutation.mutate({ decision: isConditional ? decision : undefined, notes })}
                disabled={advanceMutation.isPending}
                className="btn-primary"
              >
                {advanceMutation.isPending ? 'Procesando...' : 'Confirmar avance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ExpedientOverview({ exp, renewMutation }) {
  const qc = useQueryClient()
  const [editingInmueble, setEditingInmueble] = useState(false)
  const [editingClient, setEditingClient] = useState(false)

  const updateExpMutation = useMutation({
    mutationFn: (data) => api.put(`/expedients/${exp.id}`, data),
    onSuccess: () => {
      toast.success('Datos del inmueble actualizados')
      qc.invalidateQueries(['expedient', exp.id])
      setEditingInmueble(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  })

  const updateClientMutation = useMutation({
    mutationFn: (data) => api.put(`/clients/${exp.clientId}`, data),
    onSuccess: () => {
      toast.success('Datos del cliente actualizados')
      qc.invalidateQueries(['expedient', exp.id])
      setEditingClient(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  })

  // Form states for Inmueble
  const [inmuebleForm, setInmuebleForm] = useState({
    propertyAddress: exp.propertyAddress || '',
    propertyCity: exp.propertyCity || '',
    propertyRef: exp.propertyRef || '',
    propertyPrice: exp.propertyPrice || '',
    propertyM2: exp.propertyM2 || '',
    propertyRooms: exp.propertyRooms || '',
    propertyBaths: exp.propertyBaths || '',
    propertyCatastral: exp.propertyCatastral || '',
    propertyYear: exp.propertyYear || '',
    propertyStatus: exp.propertyStatus || '',
    propertyOrientation: exp.propertyOrientation || '',
    propertyParking: exp.propertyParking || false,
    propertyStorage: exp.propertyStorage || false,
    commissionFixed: exp.commissionFixed || '',
    commissionPercent: exp.commissionPercent || '',
    mortgageStatus: exp.mortgageStatus || '',
    mortgageEntity: exp.mortgageEntity || '',
    commissionInvoiced: exp.commissionInvoiced || false,
    commissionPaid: exp.commissionPaid || false,
    arrasAmount: exp.arrasAmount || '',
    arrasDeadline: exp.arrasDeadline ? new Date(exp.arrasDeadline).toISOString().split('T')[0] : '',
    notaryName: exp.notaryName || '',
    notaryDate: exp.notaryDate ? new Date(exp.notaryDate).toISOString().split('T')[0] : '',
    notaryAddress: exp.notaryAddress || '',
    valuationEstimated: exp.valuationEstimated || '',
    valuationMarketNotes: exp.valuationMarketNotes || '',
  })

  // Form states for Client
  const [clientForm, setClientForm] = useState({
    firstName: exp.client?.firstName || '',
    lastName: exp.client?.lastName || '',
    companyName: exp.client?.companyName || '',
    email: exp.client?.email || '',
    phone: exp.client?.phone || '',
    type: exp.client?.type || '',
    dni: exp.client?.dni || '',
    nif: exp.client?.nif || '',
    address: exp.client?.address || '',
  })

  const handleInmuebleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...inmuebleForm,
      propertyPrice: inmuebleForm.propertyPrice ? parseFloat(inmuebleForm.propertyPrice) : null,
      propertyM2: inmuebleForm.propertyM2 ? parseFloat(inmuebleForm.propertyM2) : null,
      propertyRooms: inmuebleForm.propertyRooms ? parseInt(inmuebleForm.propertyRooms) : null,
      propertyBaths: inmuebleForm.propertyBaths ? parseInt(inmuebleForm.propertyBaths) : null,
      propertyYear: inmuebleForm.propertyYear ? parseInt(inmuebleForm.propertyYear) : null,
      commissionFixed: inmuebleForm.commissionFixed ? parseFloat(inmuebleForm.commissionFixed) : null,
      commissionPercent: inmuebleForm.commissionPercent ? parseFloat(inmuebleForm.commissionPercent) : null,
      arrasAmount: inmuebleForm.arrasAmount ? parseFloat(inmuebleForm.arrasAmount) : null,
      arrasDeadline: inmuebleForm.arrasDeadline ? new Date(inmuebleForm.arrasDeadline) : null,
      notaryDate: inmuebleForm.notaryDate ? new Date(inmuebleForm.notaryDate) : null,
      valuationEstimated: inmuebleForm.valuationEstimated ? parseFloat(inmuebleForm.valuationEstimated) : null,
    }
    updateExpMutation.mutate(payload)
  }

  const handleClientSubmit = (e) => {
    e.preventDefault()
    updateClientMutation.mutate(clientForm)
  }

  const comercial = exp.assignments?.find(a => a.role === 'COMERCIAL')
  const firmas = exp.assignments?.find(a => a.role === 'FIRMAS')
  const marketing = exp.assignments?.find(a => a.role === 'MARKETING')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Datos del inmueble */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[var(--text-main)]">Datos del inmueble</h4>
          {!editingInmueble ? (
            <button onClick={() => setEditingInmueble(true)} className="text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil size={16} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button form="inmueble-form" type="submit" className="text-green-600 hover:text-green-700">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingInmueble(false)} className="text-red-500 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {!editingInmueble ? (
          <dl className="space-y-2 text-sm">
            {[
              ['Dirección', exp.propertyAddress || '—'],
              ['Ciudad', exp.propertyCity || '—'],
              ['Ref. catastral', exp.propertyRef || '—'],
              ['Precio', exp.propertyPrice ? `${Number(exp.propertyPrice).toLocaleString('es-ES')} €` : '—'],
              ['Superficie', exp.propertyM2 ? `${exp.propertyM2} m²` : '—'],
              ['Habitaciones', exp.propertyRooms || '—'],
              ['Baños', exp.propertyBaths || '—'],
              ['Catastro', exp.propertyCatastral || '—'],
              ['Año constr.', exp.propertyYear || '—'],
              ['Orientación', exp.propertyOrientation || '—'],
              ['Estado', exp.propertyStatus || '—'],
              ['Parking', exp.propertyParking ? 'Sí' : 'No'],
              ['Trastero', exp.propertyStorage ? 'Sí' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="flex">
                <dt className="w-36 text-gray-500 shrink-0">{k}</dt>
                <dd className="font-medium text-[var(--text-main)]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <form id="inmueble-form" onSubmit={handleInmuebleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label text-xs mb-0">Dirección</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setInmuebleForm({ ...inmuebleForm, propertyAddress: '' })}
                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    Sabe domicilio
                  </button>
                  <button type="button" onClick={() => setInmuebleForm({ ...inmuebleForm, propertyAddress: 'No sabe' })}
                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    No sabe
                  </button>
                </div>
              </div>
              <input type="text" className="input text-sm py-1.5" value={inmuebleForm.propertyAddress}
                onChange={e => setInmuebleForm({ ...inmuebleForm, propertyAddress: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Ciudad</label>
                <input type="text" className="input text-sm py-1.5" value={inmuebleForm.propertyCity}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyCity: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Referencia</label>
                <input type="text" className="input text-sm py-1.5" value={inmuebleForm.propertyRef}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyRef: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Precio (€)</label>
                <input type="number" className="input text-sm py-1.5" value={inmuebleForm.propertyPrice}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyPrice: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Superficie (m²)</label>
                <input type="number" className="input text-sm py-1.5" value={inmuebleForm.propertyM2}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyM2: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Orientación</label>
                <input type="text" className="input text-sm py-1.5" value={inmuebleForm.propertyOrientation}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyOrientation: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Año construcción</label>
                <input type="number" className="input text-sm py-1.5" value={inmuebleForm.propertyYear}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyYear: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label text-xs">Estado / Calidades</label>
              <input type="text" className="input text-sm py-1.5" value={inmuebleForm.propertyStatus}
                onChange={e => setInmuebleForm({ ...inmuebleForm, propertyStatus: e.target.value })} placeholder="Ej: Reformado, A estrenar..." />
            </div>

            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inmuebleForm.propertyParking} 
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyParking: e.target.checked })} />
                <span className="text-xs text-[var(--text-muted)]">Parking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inmuebleForm.propertyStorage} 
                  onChange={e => setInmuebleForm({ ...inmuebleForm, propertyStorage: e.target.checked })} />
                <span className="text-xs text-[var(--text-muted)]">Trastero</span>
              </label>
            </div>
          </form>
        )}
      </div>

      {/* Datos del cliente */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[var(--text-main)]">Cliente</h4>
          {!editingClient ? (
            <button onClick={() => setEditingClient(true)} className="text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil size={16} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button form="client-form" type="submit" className="text-green-600 hover:text-green-700">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingClient(false)} className="text-red-500 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {!editingClient ? (
          <dl className="space-y-2 text-sm">
            {[
              ['Nombre', exp.client?.firstName
                ? `${exp.client.firstName} ${exp.client.lastName || ''}`.trim()
                : exp.client?.companyName],
              ['Email', exp.client?.email],
              ['Teléfono', exp.client?.phone],
              ['Tipo', exp.client?.type],
              ['DNI/NIF', exp.client?.dni || exp.client?.nif],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex">
                <dt className="w-28 text-gray-500 shrink-0">{k}</dt>
                <dd className="font-medium text-[var(--text-main)]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <form id="client-form" onSubmit={handleClientSubmit} className="space-y-3">
            {exp.client?.companyName ? (
              <div>
                <label className="label text-xs">Razón social</label>
                <input type="text" className="input text-sm py-1.5" value={clientForm.companyName}
                  onChange={e => setClientForm({ ...clientForm, companyName: e.target.value })} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Nombre</label>
                  <input type="text" className="input text-sm py-1.5" value={clientForm.firstName}
                    onChange={e => setClientForm({ ...clientForm, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="label text-xs">Apellidos</label>
                  <input type="text" className="input text-sm py-1.5" value={clientForm.lastName}
                    onChange={e => setClientForm({ ...clientForm, lastName: e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Email</label>
                <input type="email" className="input text-sm py-1.5" value={clientForm.email}
                  onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Teléfono</label>
                <input type="text" className="input text-sm py-1.5" value={clientForm.phone}
                  onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Tipo</label>
                <select className="select text-sm py-1" value={clientForm.type}
                  onChange={e => setClientForm({ ...clientForm, type: e.target.value })}>
                  {['INQUILINO', 'PROPIETARIO', 'COMPRADOR', 'VENDEDOR', 'INVERSOR', 'EMPRESA'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">DNI/NIF</label>
                <input type="text" className="input text-sm py-1.5" value={clientForm.dni || clientForm.nif || ''}
                  onChange={e => setClientForm({ ...clientForm, dni: e.target.value, nif: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label text-xs mb-0">Dirección</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setClientForm({ ...clientForm, address: '' })}
                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    Sabe domicilio
                  </button>
                  <button type="button" onClick={() => setClientForm({ ...clientForm, address: 'No sabe' })}
                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    No sabe
                  </button>
                </div>
              </div>
              <input type="text" className="input text-sm py-1.5" value={clientForm.address}
                onChange={e => setClientForm({ ...clientForm, address: e.target.value })} />
            </div>
          </form>
        )}
      </div>

      {/* Responsables */}
      <div className="card p-5">
        <h4 className="font-semibold mb-3 text-[var(--text-main)]">Responsables</h4>
        <div className="space-y-3">
          {[
            { label: 'Comercial', user: comercial?.user },
            { label: 'Firmas', user: firmas?.user },
            { label: 'Marketing', user: marketing?.user },
          ].map(({ label, user, role }) => {
            const assignment = exp.assignments?.find(a => a.role === role)
            return (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  user ? 'bg-[var(--primary-color)]' : 'bg-gray-300'
                }`}>
                  {user ? user.name.charAt(0) : '?'}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium">{user?.name || 'Sin asignar'}</p>
                </div>
                {assignment?.commissionSplit && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Split</p>
                    <p className="text-xs font-bold text-blue-600">{assignment.commissionSplit}%</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Participantes */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[var(--text-main)]">Participantes</h4>
          <button onClick={() => setShowParticipantModal(true)} className="text-blue-600 hover:text-blue-700 transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {(exp.clientRoles || []).map(role => (
            <div key={role.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-color)] group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">
                  {role.role.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-main)]">
                    {role.client.firstName || role.client.companyName} {role.client.lastName || ''}
                  </p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{role.role}</p>
                </div>
              </div>
              <button onClick={() => deleteParticipantMutation.mutate(role.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all">
                <X size={14} />
              </button>
            </div>
          ))}
          {(exp.clientRoles || []).length === 0 && (
            <div className="text-center py-4 border border-dashed border-[var(--border-color)] rounded-lg">
              <p className="text-gray-400 text-xs">Sin coparticipantes</p>
              <p className="text-[10px] text-gray-300">Vendedor 2, Representante...</p>
            </div>
          )}
        </div>
      </div>

      {/* Financiación y Comisiones */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[var(--text-main)]">Honorarios y Financiación</h4>
          {!editingInmueble ? (
            <button onClick={() => setEditingInmueble(true)} className="text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil size={16} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button form="inmueble-form" type="submit" className="text-green-600 hover:text-green-700">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingInmueble(false)} className="text-red-500 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        
        {!editingInmueble ? (
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-32 text-gray-500">Hipoteca</dt>
              <dd className="font-medium">
                {exp.mortgageStatus || 'Pendiente'} {exp.mortgageEntity ? `(${exp.mortgageEntity})` : ''}
              </dd>
            </div>
            <div className="flex border-t pt-2 mt-2">
              <dt className="w-32 text-gray-500">Honorarios (%)</dt>
              <dd className="font-bold text-[var(--text-main)]">{exp.commissionPercent ? `${exp.commissionPercent} %` : '—'}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-gray-500">Honorarios (€)</dt>
              <dd className="font-bold text-[var(--text-main)]">{exp.commissionFixed ? `${Number(exp.commissionFixed).toLocaleString('es-ES')} €` : '—'}</dd>
            </div>
            <div className="flex pt-1 gap-4">
              <span className={`badge text-[10px] ${exp.commissionInvoiced ? 'bg-green-500/20 text-green-400' : 'bg-[var(--sidebar-bg)] text-gray-500'}`}>
                {exp.commissionInvoiced ? 'Facturado' : 'No facturado'}
              </span>
              <span className={`badge text-[10px] ${exp.commissionPaid ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--sidebar-bg)] text-gray-500'}`}>
                {exp.commissionPaid ? 'Cobrado' : 'No cobrado'}
              </span>
            </div>
          </dl>
        ) : (
          <form id="comm-form" onSubmit={handleInmuebleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Estado Hipoteca</label>
                <select className="select text-sm py-1" value={inmuebleForm.mortgageStatus} 
                  onChange={e => setInmuebleForm({ ...inmuebleForm, mortgageStatus: e.target.value })}>
                  <option value="">No aplica</option>
                  <option value="ESTUDIO">En estudio</option>
                  <option value="APROBADA">Aprobada</option>
                  <option value="DENEGADA">Denegada</option>
                  <option value="TASACION">En Tasación</option>
                  <option value="FEIN">FEIN Firmada</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Banco / Entidad</label>
                <input type="text" className="input text-sm py-1" value={inmuebleForm.mortgageEntity}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, mortgageEntity: e.target.value })} placeholder="Ej: BBVA, Caixa..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Comisión %</label>
                <input type="number" step="0.01" className="input text-sm py-1.5" value={inmuebleForm.commissionPercent}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, commissionPercent: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Importe fijo (€)</label>
                <input type="number" className="input text-sm py-1.5" value={inmuebleForm.commissionFixed}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, commissionFixed: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inmuebleForm.commissionInvoiced} 
                  onChange={e => setInmuebleForm({ ...inmuebleForm, commissionInvoiced: e.target.checked })} />
                <span className="text-xs text-[var(--text-muted)]">Facturado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inmuebleForm.commissionPaid} 
                  onChange={e => setInmuebleForm({ ...inmuebleForm, commissionPaid: e.target.checked })} />
                <span className="text-xs text-[var(--text-muted)]">Cobrado</span>
              </label>
            </div>
          </form>
        )}
      </div>

      {/* Valoración */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[var(--text-main)]">Valoración de mercado</h4>
          {!editingInmueble ? (
            <button onClick={() => setEditingInmueble(true)} className="text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil size={16} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button form="inmueble-form" type="submit" className="text-green-600 hover:text-green-700">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingInmueble(false)} className="text-red-500 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        
        {!editingInmueble ? (
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-32 text-gray-500">Precio estimado</dt>
              <dd className="font-bold text-[var(--text-main)]">
                {exp.valuationEstimated ? `${Number(exp.valuationEstimated).toLocaleString('es-ES')} €` : '—'}
              </dd>
            </div>
            <div className="mt-2 text-xs text-gray-500 bg-[var(--bg-color)] p-2 rounded italic">
              {exp.valuationMarketNotes || 'Sin notas de valoración'}
            </div>
          </dl>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label text-xs">V. estimada (€)</label>
              <input type="number" className="input text-sm py-1" value={inmuebleForm.valuationEstimated}
                onChange={e => setInmuebleForm({ ...inmuebleForm, valuationEstimated: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">Notas de mercado / Comparables</label>
              <textarea className="input text-xs" rows={3} value={inmuebleForm.valuationMarketNotes}
                onChange={e => setInmuebleForm({ ...inmuebleForm, valuationMarketNotes: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {/* Arras y Notaría */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[var(--text-main)]">
            {(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Reserva y Contrato' : 'Arras y Notaría'}
          </h4>
          {!editingInmueble ? (
            <button onClick={() => setEditingInmueble(true)} className="text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil size={16} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button form="inmueble-form" type="submit" className="text-green-600 hover:text-green-700">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingInmueble(false)} className="text-red-500 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        
        {!editingInmueble ? (
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-28 text-gray-500">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Importe Reserva' : 'Importe Arras'}</dt>
              <dd className="font-medium">{exp.arrasAmount ? `${Number(exp.arrasAmount).toLocaleString('es-ES')} €` : '—'}</dd>
            </div>
            <div className="flex">
              <dt className="w-28 text-gray-500">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Vencimiento Reserva' : 'Vencimiento Arras'}</dt>
              <dd className="font-medium text-red-600">{exp.arrasDeadline ? new Date(exp.arrasDeadline).toLocaleDateString('es-ES') : '—'}</dd>
            </div>
            <div className="flex border-t pt-2 mt-2">
              <dt className="w-28 text-gray-500">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Lugar de Firma' : 'Notario'}</dt>
              <dd className="font-medium">{exp.notaryName || '—'}</dd>
            </div>
            <div className="flex">
              <dt className="w-28 text-gray-500">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Fecha Firma' : 'Fecha Cita'}</dt>
              <dd className="font-medium text-blue-600 font-bold">{exp.notaryDate ? new Date(exp.notaryDate).toLocaleDateString('es-ES') : '—'}</dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Importe Reserva' : 'Importe Arras'}</label>
                <input type="number" className="input text-sm" value={inmuebleForm.arrasAmount}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, arrasAmount: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Vencimiento Reserva' : 'Vencimiento Arras'}</label>
                <input type="date" className="input text-sm" value={inmuebleForm.arrasDeadline}
                  onChange={e => setInmuebleForm({ ...inmuebleForm, arrasDeadline: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label text-xs">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Lugar de Firma' : 'Notario / Notaría'}</label>
              <input type="text" className="input text-sm" value={inmuebleForm.notaryName}
                onChange={e => setInmuebleForm({ ...inmuebleForm, notaryName: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">{(exp.operationType === 'INQUILINO' || exp.operationType === 'PROPIETARIO') ? 'Fecha Firma' : 'Fecha Notaría'}</label>
              <input type="date" className="input text-sm" value={inmuebleForm.notaryDate}
                onChange={e => setInmuebleForm({ ...inmuebleForm, notaryDate: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {/* Exclusividad */}
      {exp.exclusivityEnd && (
        <div className="card p-5">
          <h4 className="font-semibold mb-3 text-[var(--text-main)]">Exclusividad</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-32 text-gray-500">Inicio</dt>
              <dd>{exp.exclusivityStart ? new Date(exp.exclusivityStart).toLocaleDateString('es-ES') : '—'}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-gray-500">Fin</dt>
              <dd>{new Date(exp.exclusivityEnd).toLocaleDateString('es-ES')}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-gray-500">Duración</dt>
              <dd>{exp.exclusivityMonths} meses</dd>
            </div>
          </dl>
          <button
            onClick={() => renewMutation.mutate(3)}
            className="btn-secondary mt-3 text-xs"
          >
            <RefreshCw size={13} /> Renovar 3 meses
          </button>
        </div>
      )}

      {/* Notas */}
      {exp.notes && (
        <div className="card p-5 lg:col-span-2">
          <h4 className="font-semibold mb-2 text-[var(--text-main)]">Notas</h4>
          <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{exp.notes}</p>
        </div>
      )}
    </div>
  )
}

function PhaseHistoryTab({ history = [], operationType }) {
  const getLabel = (phase) => {
    const labels = operationType === 'INQUILINO' ? INQUILINO_PHASE_LABELS : 
                   operationType === 'PROPIETARIO' ? PROPIETARIO_PHASE_LABELS :
                   operationType === 'INVERSION_HOLDERS' ? INVERSOR_PHASE_LABELS :
                   PHASE_LABELS;
    return labels[phase] || phase
  }

  return (
    <div className="card p-5">
      <h4 className="font-semibold mb-4">Historial de cambios de fase</h4>
      {history.length === 0 && <p className="text-gray-400 text-sm">Sin historial</p>}
      <ol className="relative border-l border-[var(--border-color)] space-y-6">
        {history.map(entry => (
          <li key={entry.id} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white bg-[var(--sidebar-bg)]0" />
            <div className="text-sm">
              <p className="font-medium text-[var(--text-main)]">
                {entry.fromPhase
                  ? `${getLabel(entry.fromPhase)} → ${getLabel(entry.toPhase)}`
                  : `Apertura en ${getLabel(entry.toPhase)}`}
              </p>
              {entry.notes && <p className="text-gray-500 mt-0.5">{entry.notes}</p>}
              <p className="text-gray-400 text-xs mt-1">
                {new Date(entry.createdAt).toLocaleString('es-ES')}
                {entry.changedBy && ` · ${entry.changedBy.name}`}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function VisitsPanel({ expedientId }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)

  const { data: visits, isLoading } = useQuery({
    queryKey: ['visits', expedientId],
    queryFn: () => api.get(`/visits/expedient/${expedientId}`).then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data) => editingVisit 
      ? api.put(`/visits/${editingVisit.id}`, data)
      : api.post(`/visits/expedient/${expedientId}`, data),
    onSuccess: () => {
      toast.success(editingVisit ? 'Visita actualizada' : 'Visita registrada')
      qc.invalidateQueries(['visits', expedientId])
      setShowModal(false)
      setEditingVisit(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/visits/${id}`),
    onSuccess: () => {
      toast.success('Visita eliminada')
      qc.invalidateQueries(['visits', expedientId])
    },
  })

  if (isLoading) return <div className="p-10 text-center text-gray-400">Cargando visitas...</div>

  const visitsList = visits || []

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-lg text-[var(--text-main)]">Registro de Visitas</h3>
          <p className="text-sm text-gray-500">Historial de visitas y feedback de interesados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Registrar visita
        </button>
      </div>

      <div className="space-y-4">
        {visitsList.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-[var(--border-color)] rounded-xl">
            <Users className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-400">No hay visitas registradas aún</p>
          </div>
        )}
        
        {visitsList.map(v => (
          <div key={v.id} className="flex gap-4 p-4 rounded-xl border border-[var(--border-color)] hover:border-blue-100 hover:bg-[var(--sidebar-bg)]/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 font-bold">
              {v.visitorName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-[var(--text-main)]">{v.visitorName}</h4>
                <div className="flex items-center gap-2">
                  {v.calendarEventId && (
                    <span className="flex items-center gap-1 text-[10px] text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">
                      <CalIcon size={10} /> En calendario
                    </span>
                  )}
                  <span className={`badge text-[10px] ${
                    v.interestLevel === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                    v.interestLevel === 'MID' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-[var(--sidebar-bg)] text-[var(--text-muted)]'
                  }`}>
                    Interés {v.interestLevel}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(v.date).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)] italic">"{v.feedback || 'Sin comentarios'}"</p>
              {v.visitorPhone && <p className="text-xs text-gray-400 mt-1">Tel: {v.visitorPhone}</p>}
              {v.calendarEventId && (
                <button
                  onClick={() => navigate('/calendario')}
                  className="text-xs text-teal-600 hover:text-teal-700 mt-2 flex items-center gap-1"
                >
                  <CalIcon size={12} /> Ver en calendario
                </button>
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              <button onClick={() => { setEditingVisit(v); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
              <button onClick={() => { if (confirm('¿Eliminar visita?')) deleteMutation.mutate(v.id) }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <VisitModal 
          visit={editingVisit} 
          onClose={() => { setShowModal(false); setEditingVisit(null) }} 
          onSubmit={(d) => mutation.mutate(d)}
          isPending={mutation.isPending}
        />
      )}
    </div>
  )
}

function VisitModal({ visit, onClose, onSubmit, isPending }) {
  const [form, setForm] = useState({
    date: visit?.date ? new Date(visit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    visitorName: visit?.visitorName || '',
    visitorPhone: visit?.visitorPhone || '',
    feedback: visit?.feedback || '',
    interestLevel: visit?.interestLevel || 'MID',
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{visit ? 'Editar visita' : 'Registrar visita'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--text-muted)]"><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Interés</label>
              <select className="select" value={form.interestLevel} onChange={e => setForm({ ...form, interestLevel: e.target.value })}>
                <option value="LOW">Bajo</option>
                <option value="MID">Medio</option>
                <option value="HIGH">Alto</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Visitante</label>
            <input type="text" className="input" placeholder="Nombre completo" value={form.visitorName} onChange={e => setForm({ ...form, visitorName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input type="tel" className="input" placeholder="600 000 000" value={form.visitorPhone} onChange={e => setForm({ ...form, visitorPhone: e.target.value })} />
          </div>
          <div>
            <label className="label">Feedback / Observaciones</label>
            <textarea className="input" rows={3} placeholder="Comentarios del interesado..." value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ParticipantModal({ expedientId, onClose, onSuccess }) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('VENDEDOR')
  
  const { data: clientsRaw, isLoading } = useQuery({
    queryKey: ['clients-search', search],
    queryFn: () => api.get(`/clients?search=${search}`).then(r => r.data),
    enabled: search.length > 2
  })

  const clients = clientsRaw?.data || []

  const mutation = useMutation({
    mutationFn: (clientId) => api.post(`/participants/expedient/${expedientId}`, { clientId, role }),
    onSuccess: () => {
      toast.success('Participante añadido')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al añadir')
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="card p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-[var(--text-main)]">Añadir Participante</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--text-muted)]"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="label">Rol en el expediente</label>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="VENDEDOR">Vendedor</option>
              <option value="COMPRADOR">Comprador</option>
              <option value="PROPIETARIO">Propietario</option>
              <option value="INQUILINO">Inquilino</option>
              <option value="GARANTE">Garante / Avalista</option>
              <option value="REPRESENTANTE">Representante legal</option>
            </select>
          </div>

          <div>
            <label className="label">Buscar cliente (mín. 3 letras)</label>
            <div className="relative">
              <input 
                type="text" className="input" placeholder="Nombre, DNI, Email..." 
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-[var(--border-color)] rounded-lg">
            {isLoading && <div className="p-4 text-center text-xs text-gray-400">Buscando...</div>}
            {!isLoading && search.length > 2 && clients.length === 0 && <div className="p-4 text-center text-xs text-gray-400">No se encontraron clientes</div>}
            {clients.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-[var(--bg-color)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-main)]">{c.firstName || c.companyName} {c.lastName || ''}</p>
                  <p className="text-[10px] text-gray-500">{c.email} · {c.phone}</p>
                </div>
                <button 
                  onClick={() => mutation.mutate(c.id)} 
                  disabled={mutation.isPending}
                  className="btn-primary py-1 px-3 text-[10px]"
                >
                  Añadir
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="text-[10px] text-gray-400 italic">Si el cliente no existe, créalo primero en la sección de Clientes.</p>
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Signatures Panel ────────────────────────────────────────────────────────
// ─── Roles de firmante disponibles ───────────────────────────────────────────
const SIGNER_ROLES = [
  { value: 'AGENTE',      label: 'Agente' },
  { value: 'COMPRADOR',   label: 'Comprador' },
  { value: 'VENDEDOR',    label: 'Vendedor' },
  { value: 'PROPIETARIO', label: 'Propietario' },
  { value: 'INQUILINO',   label: 'Inquilino' },
  { value: 'ARRENDADOR',  label: 'Arrendador' },
  { value: 'AVALISTA',    label: 'Avalista' },
  { value: 'CONYUGE',     label: 'Cónyuge' },
  { value: 'OTRO',        label: 'Otro' },
]

function SignerStatusBadge({ status, signedAt }) {
  if (status === 'FIRMADO') return <span className="text-green-500 text-[10px] font-medium">✅ Firmado{signedAt ? ` (${new Date(signedAt).toLocaleDateString('es-ES')})` : ''}</span>
  if (status === 'RECHAZADO') return <span className="text-red-500 text-[10px] font-medium">❌ Rechazado</span>
  if (status === 'ENVIADO') return <span className="text-purple-500 text-[10px] font-medium">📨 Enviado</span>
  return <span className="text-gray-400 text-[10px]">⏳ Pendiente</span>
}

function SignaturesPanel({ expedientId, pendingSignDoc, setPendingSignDoc }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editingSignature, setEditingSignature] = useState(null)

  useEffect(() => {
    if (pendingSignDoc) {
      setEditingSignature(null)
      setShowModal(true)
    }
  }, [pendingSignDoc])

  const { data: signatures, isLoading } = useQuery({
    queryKey: ['signatures', expedientId],
    queryFn: () => api.get(`/expedients/${expedientId}/signatures`).then(r => r.data),
  })

  const { data: docusignStatus } = useQuery({
    queryKey: ['integrations', 'docusign'],
    queryFn: () => api.get('/integrations/docusign/status').then(r => r.data),
    staleTime: 60_000,
  })
  const docusignConfigured = docusignStatus?.configured === true

  const mutation = useMutation({
    mutationFn: (data) => editingSignature
      ? api.put(`/expedients/${expedientId}/signatures/${editingSignature.id}`, data)
      : api.post(`/expedients/${expedientId}/signatures`, data),
    onSuccess: () => {
      toast.success(editingSignature ? 'Firma actualizada' : 'Firma programada')
      qc.invalidateQueries(['signatures', expedientId])
      setShowModal(false)
      setEditingSignature(null)
      setPendingSignDoc(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expedients/${expedientId}/signatures/${id}`),
    onSuccess: () => {
      toast.success('Firma eliminada')
      qc.invalidateQueries(['signatures', expedientId])
    },
  })

  const sendToDocuSignMutation = useMutation({
    mutationFn: (signatureId) => api.post(`/expedients/${expedientId}/signatures/${signatureId}/send-to-docusign`),
    onSuccess: () => {
      toast.success('Enviado a DocuSign correctamente')
      qc.invalidateQueries(['signatures', expedientId])
    },
    onError: (err) => toast.error(err.response?.data?.message || err.response?.data?.error || 'Error al enviar a DocuSign'),
  })

  if (isLoading) return <div className="p-10 text-center text-gray-400">Cargando firmas...</div>

  const signaturesList = signatures || []

  const aggregatedStatus = (sig) => {
    const s = sig.signers || []
    if (!s.length) return sig.status
    if (s.every(x => x.status === 'FIRMADO')) return 'COMPLETADO'
    if (s.some(x => x.status === 'RECHAZADO')) return 'RECHAZADO'
    if (s.some(x => x.status === 'FIRMADO')) return 'EN_PROGRESO'
    if (s.some(x => x.status === 'ENVIADO')) return 'ENVIADO'
    return 'PENDIENTE'
  }

  const STATUS_COLOR = {
    PENDIENTE:        'text-gray-600 bg-gray-500/20',
    ENVIADO:          'text-purple-600 bg-purple-500/20',
    EN_PROGRESO:      'text-yellow-600 bg-yellow-500/20',
    COMPLETADO:       'text-green-600 bg-green-500/20',
    RECHAZADO:        'text-red-600 bg-red-500/20',
    CANCELADO:        'text-gray-500 bg-gray-400/20',
    FIRMADO_COMPLETO: 'text-green-600 bg-green-500/20',
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-lg text-[var(--text-main)]">Firmas y Documentos</h3>
          <p className="text-sm text-gray-500">Gestión de firmas electrónicas y documentos pendientes</p>
        </div>
        <button onClick={() => { setEditingSignature(null); setPendingSignDoc(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Añadir firma
        </button>
      </div>

      <div className="space-y-4">
        {signaturesList.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-[var(--border-color)] rounded-xl">
            <PenSquare className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-400">No hay firmas programadas</p>
          </div>
        )}

        {signaturesList.map(s => {
          const agg = aggregatedStatus(s)
          const allSigned = (s.signers || []).length > 0 && (s.signers || []).every(x => x.status === 'FIRMADO')
          return (
            <div key={s.id} className="p-4 rounded-xl border border-[var(--border-color)] hover:border-purple-100 hover:bg-[var(--sidebar-bg)]/30 transition-all group">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <PenSquare size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h4 className="font-bold text-[var(--text-main)] truncate">{s.documentName}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.calendarEventId && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          <CalIcon size={10} /> En calendario
                        </span>
                      )}
                      {s.envelopeId && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                          DocuSign · {s.envelopeId.slice(0, 8)}…
                        </span>
                      )}
                      <span className={`badge text-[10px] ${STATUS_COLOR[agg] || 'text-gray-600 bg-gray-500/20'}`}>
                        {agg.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>

                  {(s.signers || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Firmantes:</p>
                      {(s.signers || []).map(sg => (
                        <div key={sg.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-2">
                          <span className="font-medium">{sg.name}</span>
                          <span className="text-gray-400">&lt;{sg.email}&gt;</span>
                          <span className="text-[10px] text-gray-400">· {sg.role}</span>
                          <SignerStatusBadge status={sg.status} signedAt={sg.signedAt} />
                        </div>
                      ))}
                    </div>
                  )}

                  {s.expiresAt && (
                    <p className="text-xs text-gray-400 mt-1">Expira: {new Date(s.expiresAt).toLocaleString('es-ES')}</p>
                  )}

                  {s.document && (
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('crm_token')
                        window.open(`/api/documents/${s.document.id}/preview?token=${token}`, '_blank')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2 flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Ver documento original
                    </button>
                  )}

                  {allSigned && s.signedDocumentPath && (
                    <a
                      href={`/api/expedients/${expedientId}/signatures/${s.id}/download-signed?token=${localStorage.getItem('crm_token')}`}
                      className="text-xs text-green-600 hover:text-green-700 mt-1 flex items-center gap-1"
                      download
                    >
                      <CheckCircle size={12} /> Descargar documento firmado
                    </a>
                  )}

                  {s.calendarEventId && (
                    <button
                      onClick={() => navigate('/calendario')}
                      className="text-xs text-purple-600 hover:text-purple-700 mt-1 flex items-center gap-1"
                    >
                      <CalIcon size={12} /> Ver en calendario
                    </button>
                  )}

                  {!s.envelopeId && (
                    <div className="mt-2">
                      <button
                        onClick={() => sendToDocuSignMutation.mutate(s.id)}
                        disabled={!docusignConfigured || sendToDocuSignMutation.isPending}
                        title={!docusignConfigured ? 'Integración con DocuSign no activada. Contacta con el administrador.' : undefined}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-purple-300 text-purple-700 hover:bg-purple-50 disabled:border-gray-300 disabled:text-gray-400"
                      >
                        <Mail size={12} />
                        {sendToDocuSignMutation.isPending ? 'Enviando...' : '📨 Enviar a DocuSign'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2 shrink-0">
                  <button onClick={() => { setEditingSignature(s); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                  <button onClick={() => { if (confirm('¿Eliminar firma?')) deleteMutation.mutate(s.id) }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <SignatureModal
          expedientId={expedientId}
          signature={editingSignature}
          preselectedDocId={pendingSignDoc?.id || null}
          onClose={() => { setShowModal(false); setEditingSignature(null); setPendingSignDoc(null) }}
          onSubmit={(d) => mutation.mutate(d)}
          isPending={mutation.isPending}
        />
      )}
    </div>
  )
}

function SignatureModal({ expedientId, signature, preselectedDocId, onClose, onSubmit, isPending }) {
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', expedientId],
    queryFn: () => api.get(`/documents/expedient/${expedientId}`).then(r => r.data),
  })

  const defaultSigners = signature?.signers?.length
    ? signature.signers.map(s => ({ name: s.name, email: s.email, role: s.role, routingOrder: s.routingOrder }))
    : [
        { name: '', email: '', role: 'AGENTE', routingOrder: 1 },
        { name: '', email: '', role: 'COMPRADOR', routingOrder: 2 },
      ]

  const [documentId, setDocumentId] = useState(preselectedDocId || signature?.documentId || '')
  const [signingOrder, setSigningOrder] = useState(signature?.signingOrder || 'PARALLEL')
  const [signers, setSigners] = useState(defaultSigners)
  const [expiresAt, setExpiresAt] = useState(
    signature?.expiresAt ? new Date(signature.expiresAt).toISOString().split('T')[0] : ''
  )

  const updateSigner = (idx, field, value) =>
    setSigners(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))

  const addSigner = () =>
    setSigners(prev => [...prev, { name: '', email: '', role: 'OTRO', routingOrder: prev.length + 1 }])

  const removeSigner = (idx) => {
    if (signers.length <= 1) return
    setSigners(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, routingOrder: i + 1 })))
  }

  const moveUp = (idx) => {
    if (idx === 0) return
    setSigners(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next.map((s, i) => ({ ...s, routingOrder: i + 1 }))
    })
  }

  const moveDown = (idx) => {
    if (idx === signers.length - 1) return
    setSigners(prev => {
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next.map((s, i) => ({ ...s, routingOrder: i + 1 }))
    })
  }

  const canSave = documentId &&
    signers.length > 0 &&
    signers.every(s => s.name && s.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSave) return
    onSubmit({ documentId, signingOrder, signers, expiresAt: expiresAt || undefined })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="card p-6 w-full max-w-lg my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{signature ? 'Editar firma' : 'Añadir firma'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--text-muted)]"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Documento a firmar *</label>
            {documents.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Sube primero un documento al expediente para poder firmarlo
              </p>
            ) : (
              <select className="select" value={documentId} onChange={e => setDocumentId(e.target.value)} required>
                <option value="">— Selecciona documento —</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} — {doc.docType.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Orden de firma</label>
            <select className="select" value={signingOrder} onChange={e => setSigningOrder(e.target.value)}>
              <option value="PARALLEL">En paralelo (todos a la vez)</option>
              <option value="SEQUENTIAL">Secuencial (uno tras otro)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Firmantes *</label>
              <button type="button" onClick={addSigner} className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                <Plus size={13} /> Añadir firmante
              </button>
            </div>
            <div className="space-y-2">
              {signers.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)]">
                  {signingOrder === 'SEQUENTIAL' && (
                    <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                      <span className="text-[10px] font-bold text-gray-500 text-center w-5">{idx + 1}</span>
                      <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20">↑</button>
                      <button type="button" onClick={() => moveDown(idx)} disabled={idx === signers.length - 1} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20">↓</button>
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" placeholder="Nombre" required className="input text-xs py-1"
                      value={s.name} onChange={e => updateSigner(idx, 'name', e.target.value)} />
                    <input type="email" placeholder="Email" required className="input text-xs py-1"
                      value={s.email} onChange={e => updateSigner(idx, 'email', e.target.value)} />
                    <select className="select text-xs py-1" value={s.role} onChange={e => updateSigner(idx, 'role', e.target.value)}>
                      {SIGNER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => removeSigner(idx)} disabled={signers.length <= 1}
                    className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-20 shrink-0 mt-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Fecha de expiración (opcional)</label>
            <input type="date" className="input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending || !canSave} className="btn-primary">
              {isPending ? 'Procesando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
