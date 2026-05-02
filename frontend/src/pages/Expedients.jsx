import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid, List, Search, BarChart3, MessageSquare, Clock,
  MapPin, Euro, TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../api/client'
import KanbanBoard from '../components/Kanban/KanbanBoard'
import ExpedientsList from '../components/Expedients/ExpedientsList'
import ReportModal from '../components/Reports/ReportModal'

const PHASE_LABELS = {
  CAPTACION: 'Captación', FORMULARIO: 'Formulario', DOCUMENTACION: 'Documentación',
  VALIDACION: 'Validación', ACUERDO: 'Acuerdo', MARKETING_FORMULARIO: 'Brief Mkt',
  MARKETING_EJECUCION: 'Ejecución Mkt', PREVENTA: 'Preventa', BUSQUEDA_ACTIVA: 'Búsqueda',
  ACUERDO_INTERESADO: 'Ac. Interesado', CIERRE: 'Cierre', POSVENTA: 'Posventa',
}

const OPERATION_TYPES = [
  { value: 'INQUILINO', label: 'Inquilino' },
  { value: 'PROPIETARIO', label: 'Propietario' },
  { value: 'COMPRA', label: 'Compra' },
  { value: 'VENTA', label: 'Venta' },
  { value: 'INVERSION_HOLDERS', label: 'Inversión Holders' }
]

// ==================== TAB 1: Expedientes Main View ====================
function ExpedientesTab({ filters, setFilters, navigate }) {
  const [view, setView] = useState('kanban')
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Buscar expediente, cliente, dirección..."
            className="input pl-9"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>

        {/* Filtro tipo */}
        <select
          className="select w-40"
          value={filters.operationType}
          onChange={e => setFilters(f => ({ ...f, operationType: e.target.value }))}
        >
          <option value="">Todos los tipos</option>
          {OPERATION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Filtro estado */}
        <select
          className="select w-36"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">Todos</option>
          <option value="ACTIVO">Activos</option>
          <option value="BLOQUEADO">Bloqueados</option>
          <option value="COMPLETADO">Completados</option>
        </select>

        {/* Quick links */}
        <button onClick={() => setIsReportModalOpen(true)} className="btn-secondary text-sm" title="Generar reportes">
          <BarChart3 size={15} /> Reportes
        </button>
        <button onClick={() => navigate('/chat')} className="btn-secondary text-sm" title="Chat del equipo">
          <MessageSquare size={15} /> Chat
        </button>

        {/* Vista */}
        <div className="flex rounded-lg border border-[var(--border-color)] overflow-hidden">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--bg-color)]'}`}
          >
            <LayoutGrid size={15} /> Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 border-l border-[var(--border-color)] ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--bg-color)]'}`}
          >
            <List size={15} /> Lista
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0">
        {view === 'kanban'
          ? <KanbanBoard filters={filters} />
          : <ExpedientsList filters={filters} />
        }
      </div>
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  )
}

// ==================== TAB 2: Búsqueda Avanzada ====================
function BusquedaAvanzadaTab({ navigate }) {
  const [query, setQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState({
    minPrice: '', maxPrice: '', operationType: '', minDays: '', maxDays: ''
  })
  const queryClient = useQueryClient()

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['expedient-search', query, searchFilters],
    queryFn: () => {
      if (query.length < 2 && !searchFilters.operationType) return Promise.resolve([])
      return api.get('/expedients/search', {
        params: { q: query, ...searchFilters }
      }).then(r => r.data?.results || [])
    },
    enabled: query.length > 1 || !!searchFilters.operationType,
  })

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['saved-searches-expedients'],
    queryFn: () => api.get('/search/saved').then(r => r.data || []),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/search/saved', {
        name: `Búsqueda: ${query || 'Filtros'}`,
        filters: { query, ...searchFilters }
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches-expedients'] }),
  })

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)] p-6">
        <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-4">Filtros de búsqueda</h3>

        <div className="space-y-4">
          {/* Búsqueda por código/cliente/dirección */}
          <div>
            <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Código, cliente, dirección..."
                className="input pl-9 w-full"
              />
            </div>
          </div>

          {/* Tipo de operación */}
          <div>
            <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">Tipo de operación</label>
            <select
              value={searchFilters.operationType}
              onChange={(e) => setSearchFilters(f => ({ ...f, operationType: e.target.value }))}
              className="select w-full"
            >
              <option value="">Todos</option>
              {OPERATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Rango de precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">Precio mín. (€)</label>
              <input
                type="number"
                value={searchFilters.minPrice}
                onChange={(e) => setSearchFilters(f => ({ ...f, minPrice: e.target.value }))}
                placeholder="0"
                className="input w-full"
              />
            </div>
            <div>
              <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">Precio máx. (€)</label>
              <input
                type="number"
                value={searchFilters.maxPrice}
                onChange={(e) => setSearchFilters(f => ({ ...f, maxPrice: e.target.value }))}
                placeholder="1000000"
                className="input w-full"
              />
            </div>
          </div>

          {/* Días en el sistema */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">Días desde creación (mín.)</label>
              <input
                type="number"
                value={searchFilters.minDays}
                onChange={(e) => setSearchFilters(f => ({ ...f, minDays: e.target.value }))}
                placeholder="0"
                className="input w-full"
              />
            </div>
            <div>
              <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">Días desde creación (máx.)</label>
              <input
                type="number"
                value={searchFilters.maxDays}
                onChange={(e) => setSearchFilters(f => ({ ...f, maxDays: e.target.value }))}
                placeholder="365"
                className="input w-full"
              />
            </div>
          </div>

          {/* Guardar búsqueda */}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary w-full text-sm"
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar esta búsqueda'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {isLoading && (
        <div style={{ color: 'var(--text-muted)' }} className="text-center py-8">Buscando...</div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((exp) => (
            <div
              key={exp.id}
              className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-lg hover:border-[var(--primary-color)] cursor-pointer transition-colors"
              onClick={() => navigate(`/expedients/${exp.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-[var(--primary-color)]">{exp.code}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {exp.operationType}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      exp.status === 'ACTIVO' ? 'bg-green-100 text-green-700' :
                      exp.status === 'BLOQUEADO' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {exp.status}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-main)' }} className="font-medium">
                    {exp.client?.firstName} {exp.client?.lastName || exp.client?.companyName}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {exp.propertyAddress && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {exp.propertyAddress}
                      </span>
                    )}
                    {exp.propertyPrice && (
                      <span className="flex items-center gap-1 font-medium text-green-600">
                        <Euro size={14} /> {exp.propertyPrice.toLocaleString()}
                      </span>
                    )}
                    {exp.currentPhase && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {PHASE_LABELS[exp.currentPhase] || exp.currentPhase}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && (query.length > 1 || searchFilters.operationType) && (
        <div style={{ color: 'var(--text-muted)' }} className="text-center py-8">
          No se encontraron expedientes
        </div>
      )}

      {/* Búsquedas guardadas */}
      {savedSearches.length > 0 && (
        <div>
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-3">Búsquedas guardadas</h3>
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <button
                key={search.id}
                onClick={() => {
                  const filters = JSON.parse(search.filters)
                  setQuery(filters.query || '')
                  setSearchFilters(filters)
                }}
                className="block w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <p style={{ color: 'var(--primary-color)' }} className="font-medium">{search.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== TAB 3: Actividad ====================
function ActividadTab() {
  const { data: activityData = {}, isLoading } = useQuery({
    queryKey: ['expedients-activity'],
    queryFn: () => api.get('/dashboard/activity').then(r => r.data || {}),
    refetchInterval: 30_000,
  })

  const activity = activityData.recentPhaseChanges || []

  if (isLoading) {
    return <div style={{ color: 'var(--text-muted)' }} className="text-center py-8">Cargando actividad...</div>
  }

  if (activity.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }} className="text-center py-8">Sin actividad reciente</div>
  }

  return (
    <div className="space-y-3">
      {activity.map((item) => (
        <div
          key={item.id}
          className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-lg flex items-start gap-4"
        >
          <div className="pt-1">
            {item.action === 'PHASE_CHANGED' && <TrendingUp size={18} className="text-blue-500" />}
            {item.action === 'BLOCKED' && <AlertCircle size={18} className="text-red-500" />}
            {item.action === 'COMPLETED' && <CheckCircle2 size={18} className="text-green-500" />}
            {!['PHASE_CHANGED', 'BLOCKED', 'COMPLETED'].includes(item.action) && (
              <Clock size={18} className="text-gray-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-[var(--primary-color)]">{item.expedient?.code}</span>
              <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                {item.expedient?.client?.firstName} {item.expedient?.client?.lastName}
              </span>
            </div>

            {item.action === 'PHASE_CHANGED' && (
              <p style={{ color: 'var(--text-main)' }} className="text-sm">
                Cambió de fase:
                <span className="text-[var(--text-muted)]"> {PHASE_LABELS[item.oldValue] || item.oldValue}</span>
                <span className="mx-1 opacity-40">→</span>
                <strong className="text-[var(--primary-color)]">{PHASE_LABELS[item.newValue] || item.newValue}</strong>
              </p>
            )}
            {item.action === 'BLOCKED' && (
              <p style={{ color: 'var(--text-main)' }} className="text-sm">
                <strong className="text-red-600">Expediente bloqueado</strong>
                {item.reason && <span className="text-[var(--text-muted)]">: {item.reason}</span>}
              </p>
            )}
            {item.action === 'COMPLETED' && (
              <p style={{ color: 'var(--text-main)' }} className="text-sm">
                <strong className="text-green-600">Expediente completado</strong>
              </p>
            )}
            {!['PHASE_CHANGED', 'BLOCKED', 'COMPLETED'].includes(item.action) && (
              <p style={{ color: 'var(--text-main)' }} className="text-sm">
                {item.description || item.action}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2">
              <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                {item.user?.name || 'Sistema'}
              </span>
              <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                {(() => {
                  const d = new Date(item.createdAt || item.timestamp)
                  return isNaN(d.getTime()) ? 'Fecha desconocida' : formatDistanceToNow(d, { addSuffix: true, locale: es })
                })()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== MAIN PAGE ====================
export default function ExpedientsPage() {
  const [activeTab, setActiveTab] = useState('expedientes') // 'expedientes' | 'busqueda' | 'actividad'
  const [filters, setFilters] = useState({ search: '', operationType: '', status: '' })
  const navigate = useNavigate()

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Tab Header */}
      <div
        style={{ borderColor: 'var(--border-color)' }}
        className="flex gap-8 border-b"
      >
        <button
          onClick={() => setActiveTab('expedientes')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'expedientes'
              ? 'text-[var(--primary-color)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Expedientes
          {activeTab === 'expedientes' && (
            <div
              style={{ backgroundColor: 'var(--primary-color)' }}
              className="absolute bottom-0 left-0 right-0 h-0.5"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('busqueda')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'busqueda'
              ? 'text-[var(--primary-color)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Búsqueda Avanzada
          {activeTab === 'busqueda' && (
            <div
              style={{ backgroundColor: 'var(--primary-color)' }}
              className="absolute bottom-0 left-0 right-0 h-0.5"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('actividad')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'actividad'
              ? 'text-[var(--primary-color)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Actividad
          {activeTab === 'actividad' && (
            <div
              style={{ backgroundColor: 'var(--primary-color)' }}
              className="absolute bottom-0 left-0 right-0 h-0.5"
            />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'expedientes' && (
          <ExpedientesTab filters={filters} setFilters={setFilters} navigate={navigate} />
        )}
        {activeTab === 'busqueda' && (
          <BusquedaAvanzadaTab navigate={navigate} />
        )}
        {activeTab === 'actividad' && (
          <ActividadTab />
        )}
      </div>
    </div>
  )
}
