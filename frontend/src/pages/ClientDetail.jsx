import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, User, Mail, MapPin, FileText,
  TrendingUp, Activity, Calendar, Link2,
  MessageSquare, Hash, Tag, Thermometer,
  LifeBuoy, Briefcase, Clock, Download, History, Phone,
} from 'lucide-react'
import api from '../api/client'
import { exportClientToPDF } from '../utils/clientPdfExport'
import ClientNotesPanel from '../components/Clients/ClientNotesPanel'
import ClientActivityTimeline from '../components/Clients/ClientActivityTimeline'
import ClientTasksPanel from '../components/Clients/ClientTasksPanel'
import ClientRelationsPanel from '../components/Clients/ClientRelationsPanel'
import ClientDocumentsPanel from '../components/Clients/ClientDocumentsPanel'
import ClientCommunicationsPanel from '../components/Clients/ClientCommunicationsPanel'
import ClientHistoryPanel from '../components/Clients/ClientHistoryPanel'

const TABS = [
  { id: 'overview', label: 'Resumen', icon: User },
  { id: 'timeline', label: 'Actividad', icon: Activity },
  { id: 'notes', label: 'Notas', icon: MessageSquare },
  { id: 'tasks', label: 'Tareas', icon: Calendar },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'communications', label: 'Comunicaciones', icon: Mail },
  { id: 'relations', label: 'Relaciones', icon: Link2 },
  { id: 'history', label: 'Historial', icon: History },
]

const SCORE_CONFIG = {
  FRIO: { color: 'bg-blue-500', label: 'Frío', icon: Thermometer },
  TIBIO: { color: 'bg-yellow-500', label: 'Tibio', icon: Thermometer },
  CALIENTE: { color: 'bg-orange-500', label: 'Caliente', icon: Thermometer },
  HOT: { color: 'bg-red-500', label: 'Hot', icon: Thermometer },
}

const STAGE_CONFIG = {
  LEAD: { color: 'bg-gray-500', label: 'Lead' },
  PROSPECTO: { color: 'bg-blue-500', label: 'Prospecto' },
  ACTIVO: { color: 'bg-green-500', label: 'Activo' },
  RECURRENTE: { color: 'bg-purple-500', label: 'Recurrente' },
  PERDIDO: { color: 'bg-red-500', label: 'Perdido' },
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: stats } = useQuery({
    queryKey: ['client-stats', id],
    queryFn: () => api.get(`/clients/${id}/stats`).then(r => r.data),
    enabled: !!id,
  })

  const { data: expedients } = useQuery({
    queryKey: ['client-expedients', id],
    queryFn: () => api.get(`/clients/${id}/expedients`).then(r => r.data),
    enabled: !!id,
  })

  const { data: clientNotes } = useQuery({
    queryKey: ['client-notes-pdf', id],
    queryFn: () => api.get(`/clients/${id}/notes?limit=100`).then(r => r.data),
    enabled: !!id,
  })

  const { data: clientTasks } = useQuery({
    queryKey: ['client-tasks-pdf', id],
    queryFn: () => api.get(`/tasks?clientId=${id}&limit=100`).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: clientRelations } = useQuery({
    queryKey: ['client-relations-pdf', id],
    queryFn: () => api.get(`/clients/${id}/relations`).then(r => r.data),
    enabled: !!id,
  })

  const { data: summary } = useQuery({
    queryKey: ['client-summary', id],
    queryFn: () => api.get(`/clients/${id}/summary`).then(r => r.data),
    enabled: !!id,
  })

  const handleExportPDF = () => {
    exportClientToPDF(client, stats, expedients, clientNotes, clientTasks, clientRelations)
  }

  if (isLoading) return <div className="text-center text-gray-400 py-20">Cargando cliente...</div>
  if (!client) return <div className="text-center text-red-500 py-20">Cliente no encontrado</div>

  const scoreConfig = SCORE_CONFIG[client.score] || SCORE_CONFIG.FRIO
  const stageConfig = STAGE_CONFIG[client.lifecycleStage] || STAGE_CONFIG.LEAD
  const ScoreIcon = scoreConfig.icon

  const fullName = client.firstName
    ? `${client.firstName} ${client.lastName || ''}`.trim()
    : client.companyName || 'Sin nombre'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/clients')} className="btn-secondary px-2 mt-1">
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-[var(--text-main)]">{fullName}</h2>

            {/* Badges Score y Lifecycle */}
            <span className={`badge ${scoreConfig.color} text-white text-xs flex items-center gap-1`}>
              <ScoreIcon size={12} /> {scoreConfig.label}
            </span>
            <span className={`badge ${stageConfig.color} text-white text-xs`}>
              {stageConfig.label}
            </span>
            {client.active === false && (
              <span className="badge bg-gray-500 text-white text-xs">Inactivo</span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-muted)] flex-wrap">
            {client.dni && (
              <span className="flex items-center gap-1">
                <Hash size={14} /> {client.dni}
              </span>
            )}
            {client.email && (
              <span className="flex items-center gap-1">
                <Mail size={14} /> {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone size={14} /> {client.phone}
              </span>
            )}
            {client.type && (
              <span className="badge bg-[var(--sidebar-bg)] text-[var(--text-muted)] text-xs">
                {client.type}
              </span>
            )}
          </div>
        </div>

        {/* Stats rápidos + Exportar */}
        <div className="flex gap-3 items-start">
          <div className="text-center px-3 py-2 rounded-lg bg-[var(--sidebar-bg)]">
            <p className="text-lg font-bold text-[var(--text-main)]">{client._count?.expedients || 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Expedientes</p>
          </div>
          <div className="text-center px-3 py-2 rounded-lg bg-[var(--sidebar-bg)]">
            <p className="text-lg font-bold text-[var(--text-main)]">{client._count?.tasks || 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Tareas</p>
          </div>
          <div className="text-center px-3 py-2 rounded-lg bg-[var(--sidebar-bg)]">
            <p className="text-lg font-bold text-[var(--text-main)]">{client._count?.notesStructured || 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Notas</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="btn-secondary px-3 py-2 flex flex-col items-center justify-center h-[52px]"
            title="Exportar ficha a PDF"
          >
            <Download size={18} />
            <span className="text-[10px] mt-0.5">PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-1">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
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

      {/* Content */}
      <div>
        {tab === 'overview' && (
          <ClientOverview
            client={client}
            stats={stats}
            expedients={expedients}
            summary={summary}
            onViewHistory={() => setTab('history')}
          />
        )}
        {tab === 'timeline' && <ClientActivityTimeline clientId={id} />}
        {tab === 'notes' && <ClientNotesPanel clientId={id} />}
        {tab === 'tasks' && <ClientTasksPanel clientId={id} />}
        {tab === 'documents' && <ClientDocumentsPanel clientId={id} />}
        {tab === 'communications' && <ClientCommunicationsPanel clientId={id} />}
        {tab === 'relations' && <ClientRelationsPanel clientId={id} />}
        {tab === 'history' && <ClientHistoryPanel clientId={id} />}
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ClientOverview({ client, stats, expedients, summary, onViewHistory }) {
  const fullName = client.firstName
    ? `${client.firstName} ${client.lastName || ''}`.trim()
    : client.companyName || 'Sin nombre'

  const es = summary?.expedientsStats
  const rs = summary?.resourcesStats
  const recentExps = summary?.recentExpedients ?? expedients?.slice(0, 3) ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Info principal */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <User size={16} className="text-[var(--primary-color)]" />
          Información de contacto
        </h3>

        <dl className="space-y-3 text-sm">
          <div className="flex">
            <dt className="w-28 text-gray-500 shrink-0">Nombre</dt>
            <dd className="font-medium text-[var(--text-main)]">{fullName}</dd>
          </div>
          {client.companyName && (
            <div className="flex">
              <dt className="w-28 text-gray-500 shrink-0">Empresa</dt>
              <dd className="font-medium text-[var(--text-main)]">{client.companyName}</dd>
            </div>
          )}
          <div className="flex">
            <dt className="w-28 text-gray-500 shrink-0">Email</dt>
            <dd className="font-medium text-[var(--text-main)]">
              <a href={`mailto:${client.email}`} className="hover:text-blue-600">{client.email}</a>
            </dd>
          </div>
          <div className="flex">
            <dt className="w-28 text-gray-500 shrink-0">Teléfono</dt>
            <dd className="font-medium text-[var(--text-main)]">
              <a href={`tel:${client.phone}`} className="hover:text-blue-600">{client.phone}</a>
              {client.phone2 && <span className="text-gray-400 ml-2">/ {client.phone2}</span>}
            </dd>
          </div>
          {client.dni && (
            <div className="flex">
              <dt className="w-28 text-gray-500 shrink-0">DNI/NIE</dt>
              <dd className="font-medium text-[var(--text-main)]">{client.dni}</dd>
            </div>
          )}
          {client.nif && (
            <div className="flex">
              <dt className="w-28 text-gray-500 shrink-0">NIF</dt>
              <dd className="font-medium text-[var(--text-main)]">{client.nif}</dd>
            </div>
          )}
          {client.address && (
            <div className="flex">
              <dt className="w-28 text-gray-500 shrink-0">Dirección</dt>
              <dd className="font-medium text-[var(--text-main)] flex items-start gap-1">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                {client.address}
                {client.city && `, ${client.city}`}
                {client.postalCode && ` ${client.postalCode}`}
              </dd>
            </div>
          )}
          {client.birthDate && (
            <div className="flex">
              <dt className="w-28 text-gray-500 shrink-0">Nacimiento</dt>
              <dd className="font-medium text-[var(--text-main)]">
                {new Date(client.birthDate).toLocaleDateString('es-ES')}
              </dd>
            </div>
          )}
        </dl>

        {client.tags && client.tags.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-color)]">
            <p className="text-xs text-gray-500 mb-2">Etiquetas</p>
            <div className="flex flex-wrap gap-1">
              {client.tags.map(tag => (
                <span key={tag} className="badge bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Métricas de expedientes (5 KPIs) */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--primary-color)]" />
          Métricas
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-[var(--sidebar-bg)] text-center">
            <p className="text-xl font-bold text-[var(--text-main)]">{es?.total ?? stats?.totalExpedients ?? 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Total</p>
          </div>
          <div className="p-2.5 rounded-lg bg-green-500/10 text-center">
            <p className="text-xl font-bold text-green-600">{es?.active ?? stats?.activeExpedients ?? 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Activos</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-center">
            <p className="text-xl font-bold text-blue-600">{es?.completed ?? stats?.closedExpedients ?? 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Completados</p>
          </div>
          <div className="p-2.5 rounded-lg bg-gray-500/10 text-center">
            <p className="text-xl font-bold text-gray-500">{es?.cancelled ?? 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Cancelados</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-500/10 text-center">
            <p className="text-xl font-bold text-red-500">{es?.blocked ?? 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Bloqueados</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--sidebar-bg)] text-center">
            <p className="text-xl font-bold text-[var(--text-main)]">
              {stats?.daysSinceLastContact ?? '-'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Días sin contacto</p>
          </div>
        </div>

        {(es?.totalCommissionValue > 0 || stats?.totalOperationsValue > 0) && (
          <div className="p-3 rounded-lg bg-[var(--primary-color)]/10">
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Briefcase size={12} /> Valor estimado en comisiones
            </p>
            <p className="text-lg font-bold text-[var(--primary-color)]">
              {Number(es?.totalCommissionValue ?? stats?.totalOperationsValue ?? 0).toLocaleString('es-ES')} €
            </p>
          </div>
        )}

        {client.source && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="text-xs">Origen:</span>
            <span className="badge bg-[var(--sidebar-bg)] text-xs">{client.source}</span>
          </div>
        )}
      </div>

      {/* Expedientes recientes */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <FileText size={16} className="text-[var(--primary-color)]" />
          Expedientes recientes
        </h3>

        {recentExps.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Sin expedientes registrados
          </div>
        )}

        <div className="space-y-3">
          {recentExps.map(exp => (
            <Link
              key={exp.id}
              to={`/expedients/${exp.id}`}
              className="block p-3 rounded-lg bg-[var(--sidebar-bg)] hover:bg-[var(--border-color)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-[var(--primary-color)]">{exp.code}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{exp.operationType}</p>
                  {exp.currentPhase && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                      <Clock size={9} /> {exp.currentPhase}
                    </p>
                  )}
                </div>
                <span className={`badge text-[10px] ${
                  exp.status === 'ACTIVO' ? 'bg-green-500/20 text-green-600' :
                  exp.status === 'COMPLETADO' ? 'bg-blue-500/20 text-blue-600' :
                  'bg-gray-500/20 text-gray-600'
                }`}>
                  {exp.status}
                </span>
              </div>
              {exp.propertyAddress && (
                <p className="text-[10px] text-[var(--text-muted)] mt-2 truncate">
                  {exp.propertyAddress}
                </p>
              )}
            </Link>
          ))}
        </div>

        <button
          onClick={onViewHistory}
          className="w-full text-xs text-[var(--primary-color)] hover:underline text-center pt-1"
        >
          Ver historial completo →
        </button>
      </div>

      {/* Recursos */}
      {rs && (
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
            <Activity size={16} className="text-[var(--primary-color)]" />
            Recursos
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--sidebar-bg)]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <MessageSquare size={12} /> Notas
              </span>
              <span className="font-bold text-[var(--text-main)]">{rs.notes}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--sidebar-bg)]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <Calendar size={12} /> Tareas
              </span>
              <span className="font-bold text-[var(--text-main)]">
                {rs.tasks.pending}<span className="text-gray-400 text-[10px]">/{rs.tasks.pending + rs.tasks.completed}</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--sidebar-bg)]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <FileText size={12} /> Documentos
              </span>
              <span className="font-bold text-[var(--text-main)]">{rs.documents}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--sidebar-bg)]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <Mail size={12} /> Comunicaciones
              </span>
              <span className="font-bold text-[var(--text-main)]">{rs.communications}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--sidebar-bg)] col-span-2">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <Link2 size={12} /> Relaciones
              </span>
              <span className="font-bold text-[var(--text-main)]">{rs.relations}</span>
            </div>
          </div>
        </div>
      )}

      {/* Última actividad */}
      {summary?.lastActivity && (
        <div className="card p-5 space-y-2">
          <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
            <Clock size={16} className="text-[var(--primary-color)]" />
            Última actividad
          </h3>
          <p className="text-sm text-[var(--text-main)]">{summary.lastActivity.description}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {new Date(summary.lastActivity.date).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          <span className="badge bg-[var(--sidebar-bg)] text-[10px] text-[var(--text-muted)]">
            {summary.lastActivity.type}
          </span>
        </div>
      )}

      {/* Preferencias */}
      {client.preferences && Object.keys(client.preferences).length > 0 && (
        <div className="card p-5 lg:col-span-3">
          <h3 className="font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
            <LifeBuoy size={16} className="text-[var(--primary-color)]" />
            Preferencias
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(client.preferences).map(([key, value]) => (
              <div key={key} className="p-2 rounded bg-[var(--sidebar-bg)]">
                <p className="text-[10px] text-gray-500 uppercase">{key}</p>
                <p className="font-medium text-[var(--text-main)]">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas legacy */}
      {client.notes && (
        <div className="card p-5 lg:col-span-3">
          <h3 className="font-semibold text-[var(--text-main)] mb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--primary-color)]" />
            Notas generales
          </h3>
          <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  )
}
