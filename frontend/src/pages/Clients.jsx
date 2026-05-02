import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Search, Edit2, Trash2, X, Filter,
  Users, Users2, BarChart2
} from 'lucide-react'
import api from '../api/client'

// ─── Opciones de filtros ───────────────────────────────────────────────────
const SCORE_OPTIONS = [
  { value: '', label: 'Todos scores' },
  { value: 'FRIO',     label: 'Frío' },
  { value: 'TIBIO',    label: 'Tibio' },
  { value: 'CALIENTE', label: 'Caliente' },
  { value: 'HOT',      label: 'Hot' },
]

const STAGE_OPTIONS = [
  { value: '',           label: 'Todas etapas' },
  { value: 'LEAD',       label: 'Lead' },
  { value: 'PROSPECTO',  label: 'Prospecto' },
  { value: 'ACTIVO',     label: 'Activo' },
  { value: 'RECURRENTE', label: 'Recurrente' },
  { value: 'PERDIDO',    label: 'Perdido' },
]

const TYPE_OPTIONS = [
  { value: '',           label: 'Todos tipos' },
  { value: 'INQUILINO',  label: 'Inquilino' },
  { value: 'PROPIETARIO',label: 'Propietario' },
  { value: 'COMPRADOR',  label: 'Comprador' },
  { value: 'VENDEDOR',   label: 'Vendedor' },
  { value: 'INVERSOR',   label: 'Inversor' },
  { value: 'EMPRESA',    label: 'Empresa' },
]

const SEGMENTS = ['VIP', 'NORMAL', 'RIESGO', 'DORMIDO']
const SEGMENT_COLORS = {
  VIP:     'bg-purple-100 text-purple-800 border-purple-200',
  NORMAL:  'bg-green-100 text-green-800 border-green-200',
  RIESGO:  'bg-orange-100 text-orange-800 border-orange-200',
  DORMIDO: 'bg-gray-100 text-gray-700 border-gray-200',
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('lista')
  const [modal, setModal] = useState(null)

  const tabs = [
    { id: 'lista',         label: 'Clientes',         icon: Users },
    { id: 'segmentacion',  label: 'Segmentación',      icon: Users2 },
    { id: 'busqueda',      label: 'Búsqueda Avanzada', icon: BarChart2 },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex border-b border-[var(--border-color)] gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'lista' && (
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={15} /> Nuevo cliente
          </button>
        )}
      </div>

      {/* Contenido por tab */}
      {activeTab === 'lista' && (
        <ClientsListTab
          qc={qc}
          navigate={navigate}
          modal={modal}
          setModal={setModal}
        />
      )}
      {activeTab === 'segmentacion' && (
        <SegmentacionTab navigate={navigate} />
      )}
      {activeTab === 'busqueda' && (
        <BusquedaAvanzadaTab navigate={navigate} />
      )}
    </div>
  )
}

// ─── Tab 1: Lista de clientes ──────────────────────────────────────────────
function ClientsListTab({ qc, navigate, modal, setModal }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ score: '', lifecycleStage: '', type: '', active: '' })
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, filters],
    queryFn: () => api.get('/clients', {
      params: {
        search,
        limit: 50,
        ...(filters.score          && { score: filters.score }),
        ...(filters.lifecycleStage && { lifecycleStage: filters.lifecycleStage }),
        ...(filters.type           && { type: filters.type }),
        ...(filters.active !== ''  && { active: filters.active }),
      }
    }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success('Cliente eliminado'); qc.invalidateQueries(['clients']) },
    onError:   (err) => toast.error(err.response?.data?.error || 'Error al eliminar'),
  })

  const clients = data?.data || []

  return (
    <div className="space-y-3">
      {/* Barra búsqueda + filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" className="input pl-9" placeholder="Buscar cliente..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary ${showFilters ? 'bg-[var(--primary-color)] text-white' : ''}`}
        >
          <Filter size={15} /> Filtros
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 flex flex-wrap gap-3">
          <select className="select text-sm" value={filters.score}
            onChange={e => setFilters(f => ({ ...f, score: e.target.value }))}>
            {SCORE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select text-sm" value={filters.lifecycleStage}
            onChange={e => setFilters(f => ({ ...f, lifecycleStage: e.target.value }))}>
            {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select text-sm" value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select text-sm" value={filters.active}
            onChange={e => setFilters(f => ({ ...f, active: e.target.value }))}>
            <option value="">Todos estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          <button
            onClick={() => setFilters({ score: '', lifecycleStage: '', type: '', active: '' })}
            className="text-xs text-[var(--primary-color)] hover:underline ml-auto"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center text-gray-400 py-10">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                {['Nombre / Empresa', 'Tipo', 'Email', 'Teléfono', 'Expedientes', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {clients.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">Sin clientes</td></tr>
              )}
              {clients.map(c => (
                <tr
                  key={c.id}
                  className="table-row cursor-pointer hover:bg-[var(--sidebar-bg)]/50 transition-colors"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-[var(--text-main)]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold hover:text-[var(--primary-color)]">
                        {c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.companyName}
                      </span>
                      {c.dni && <span className="text-xs text-[var(--text-muted)]">({c.dni})</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-[var(--bg-color)] text-[var(--secondary-color)] border border-[var(--border-color)]">{c.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{c.email}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-[var(--bg-color)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {c._count?.expedients || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModal(c)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary-color)] transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => { if (confirm('¿Eliminar cliente?')) deleteMutation.mutate(c.id) }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ClientModal
          client={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { qc.invalidateQueries(['clients']); setModal(null) }}
        />
      )}
    </div>
  )
}

// ─── Tab 2: Segmentación ──────────────────────────────────────────────────
function SegmentacionTab({ navigate }) {
  const [activeSegment, setActiveSegment] = useState('VIP')

  const { data: segmentData = { clients: [], totalClients: 0 }, isLoading } = useQuery({
    queryKey: ['clients-by-segment', activeSegment],
    queryFn: () => api.get(`/clients-advanced/by-segment/${activeSegment}`).then(r => r.data),
  })

  // Contadores por segmento
  const { data: counts = {} } = useQuery({
    queryKey: ['segment-counts'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        SEGMENTS.map(s =>
          api.get(`/clients-advanced/by-segment/${s}`).then(r => ({ [s]: r.data.totalClients || 0 }))
        )
      )
      return results.reduce((acc, r) => r.status === 'fulfilled' ? { ...acc, ...r.value } : acc, {})
    },
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6">
      {/* Tabs de segmento con contadores */}
      <div className="grid grid-cols-4 gap-3">
        {SEGMENTS.map(seg => (
          <button
            key={seg}
            onClick={() => setActiveSegment(seg)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeSegment === seg
                ? `${SEGMENT_COLORS[seg]} border-current shadow-sm`
                : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold">{counts[seg] ?? '—'}</div>
            <div className={`text-sm font-semibold mt-0.5 ${activeSegment === seg ? '' : 'text-gray-500'}`}>{seg}</div>
          </button>
        ))}
      </div>

      {/* Lista de clientes del segmento */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando clientes...</div>
      ) : (segmentData?.clients?.length || 0) === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          No hay clientes en el segmento <strong>{activeSegment}</strong>
        </div>
      ) : (
        <div className="grid gap-3">
          {segmentData.clients.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="card p-5 flex items-center justify-between hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base shrink-0">
                  {(client.firstName?.[0] || client.companyName?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-color)] transition-colors">
                    {client.firstName ? `${client.firstName} ${client.lastName || ''}`.trim() : client.companyName}
                  </div>
                  <div className="text-sm text-gray-500">{client.email}</div>
                  {client.phone && <div className="text-xs text-gray-400">{client.phone}</div>}
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-xl font-bold text-[var(--primary-color)]">{client.segmentScore || 0}</div>
                  <div className="text-xs text-gray-400">Score</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${SEGMENT_COLORS[activeSegment]}`}>
                  {activeSegment}
                </span>
                {client.valueEstimate && (
                  <div className="text-right hidden sm:block">
                    <div className="font-semibold text-green-600">€{parseInt(client.valueEstimate).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Valor est.</div>
                  </div>
                )}
                <span className="text-[var(--primary-color)] text-sm opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-400 text-right">
        {segmentData.totalClients || 0} clientes en segmento {activeSegment}
      </div>
    </div>
  )
}

// ─── Tab 3: Búsqueda Avanzada ─────────────────────────────────────────────
function BusquedaAvanzadaTab({ navigate }) {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', type: '' })
  const [savedName, setSavedName] = useState('')

  const { data: results = { results: [] }, isLoading } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () =>
      query.length > 2
        ? api.get('/search/query', { params: { query, ...filters } }).then(r => r.data)
        : Promise.resolve({ results: [] }),
    enabled: query.length > 2,
  })

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => api.get('/search/saved').then(r => r.data?.searches || r.data || []),
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/search/saved', {
        name: savedName || `Búsqueda: ${query}`,
        filters: { query, ...filters },
      }),
    onSuccess: () => {
      toast.success('Búsqueda guardada')
      setSavedName('')
      qc.invalidateQueries(['saved-searches'])
    },
    onError: () => toast.error('Error al guardar'),
  })

  const deleteSaved = useMutation({
    mutationFn: (id) => api.delete(`/search/saved/${id}`),
    onSuccess: () => qc.invalidateQueries(['saved-searches']),
  })

  const applySearch = (saved) => {
    try {
      const f = typeof saved.filters === 'string' ? JSON.parse(saved.filters) : saved.filters
      setQuery(f.query || '')
      setFilters({ minPrice: f.minPrice || '', maxPrice: f.maxPrice || '', type: f.type || '' })
    } catch {
      setQuery(saved.name)
    }
  }

  return (
    <div className="space-y-5">
      {/* Formulario de búsqueda */}
      <div className="card p-5 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por dirección, cliente, referencia, email..."
            className="input pl-9 text-base"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Precio mínimo (€)</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
              placeholder="100.000"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Precio máximo (€)</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
              placeholder="500.000"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Tipo</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="select"
            >
              <option value="">Todos</option>
              <option value="expedient">Expedientes</option>
              <option value="client">Clientes</option>
            </select>
          </div>
        </div>

        {query.length > 2 && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={savedName}
              onChange={e => setSavedName(e.target.value)}
              placeholder="Nombre para guardar esta búsqueda..."
              className="input flex-1 text-sm"
            />
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!query || saveMutation.isPending}
              className="btn-secondary text-sm"
            >
              Guardar búsqueda
            </button>
          </div>
        )}
      </div>

      {/* Resultados */}
      {query.length > 2 && (
        <div>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Buscando...</div>
          ) : results.results?.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              Sin resultados para <strong>"{query}"</strong>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 font-medium">
                {results.results?.length || 0} resultados encontrados
              </p>
              {results.results?.map(item => {
                const isExpedient = !!item.code
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(isExpedient ? `/expedients/${item.id}` : `/clients/${item.id}`)}
                    className="card p-4 flex items-center justify-between hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                        isExpedient
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {isExpedient ? 'Expediente' : 'Cliente'}
                      </span>
                      <div>
                        <div className="font-semibold text-[var(--text-main)]">
                          {item.code || `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.companyName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.propertyAddress || item.email}
                        </div>
                        {item.currentPhase && (
                          <div className="text-xs text-gray-400">Fase: {item.currentPhase}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.propertyPrice && (
                        <span className="font-semibold text-green-600">€{item.propertyPrice.toLocaleString()}</span>
                      )}
                      <span className="text-[var(--primary-color)] text-sm opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Búsquedas guardadas */}
      {savedSearches.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
            Búsquedas guardadas
          </h3>
          <div className="space-y-2">
            {savedSearches.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--sidebar-bg)] transition-colors">
                <button
                  onClick={() => applySearch(s)}
                  className="text-sm font-medium text-[var(--text-main)] hover:text-[var(--primary-color)] flex-1 text-left"
                >
                  🔍 {s.name}
                </button>
                <button
                  onClick={() => deleteSaved.mutate(s.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal crear / editar cliente ─────────────────────────────────────────
function ClientModal({ client, onClose, onSaved }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: client || {},
  })

  const mutation = useMutation({
    mutationFn: (data) => client
      ? api.put(`/clients/${client.id}`, data)
      : api.post('/clients', data),
    onSuccess: () => { toast.success(client ? 'Cliente actualizado' : 'Cliente creado'); onSaved() },
    onError:   (err) => {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al guardar'
      toast.error(msg)
    },
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[var(--text-main)]">{client ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" {...register('type', { required: true })}>
                {['INQUILINO', 'PROPIETARIO', 'COMPRADOR', 'VENDEDOR', 'INVERSOR', 'EMPRESA'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input type="text" className="input" {...register('firstName')} />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input type="text" className="input" {...register('lastName')} />
            </div>
          </div>

          <div>
            <label className="label">Empresa (si aplica)</label>
            <input type="text" className="input" {...register('companyName')} />
          </div>

          {!client && <DniLookupInput setValue={setValue} />}
          {client && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">DNI/NIE</label>
                <input type="text" className="input" {...register('dni')} />
              </div>
              <div>
                <label className="label">NIF (empresa)</label>
                <input type="text" className="input" {...register('nif')} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" {...register('email', { required: true })} />
            </div>
            <div>
              <label className="label">Teléfono *</label>
              <input type="tel" className="input" {...register('phone', { required: true })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Dirección</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setValue('address', '')}
                  className="text-xs font-medium text-[var(--secondary-color)] hover:opacity-80">
                  Sabe domicilio
                </button>
                <button type="button" onClick={() => setValue('address', 'No sabe')}
                  className="text-xs font-medium text-[var(--secondary-color)] hover:opacity-80">
                  No sabe
                </button>
              </div>
            </div>
            <input type="text" className="input" {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ciudad</label>
              <input type="text" className="input" {...register('city')} />
            </div>
            <div>
              <label className="label">Código postal</label>
              <input type="text" className="input" {...register('postalCode')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="privacy" {...register('privacyPolicy')}
              className="text-[var(--primary-color)] focus:ring-[var(--primary-color)]" />
            <label htmlFor="privacy" className="text-sm text-[var(--text-muted)]">Política de privacidad aceptada</label>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea rows={3} className="input resize-none" placeholder="Observaciones..."
              {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── DNI Lookup ───────────────────────────────────────────────────────────
function DniLookupInput({ setValue }) {
  const [dniInput, setDniInput] = useState('')
  const [foundClient, setFoundClient] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const searchDni = async () => {
    if (!dniInput || dniInput.length < 5) return
    setIsSearching(true)
    try {
      const res = await api.get('/clients/search', { params: { dni: dniInput } })
      if (res.data) {
        setFoundClient(res.data)
        setShowConfirm(true)
      } else {
        setValue('dni', dniInput)
        toast.success('DNI no encontrado. Creando nuevo cliente.')
      }
    } catch {
      setValue('dni', dniInput)
    } finally {
      setIsSearching(false)
    }
  }

  const fillExistingClient = () => {
    if (!foundClient) return
    Object.entries(foundClient).forEach(([k, v]) => setValue(k, v))
    setShowConfirm(false)
    toast.success('Datos del cliente cargados')
  }

  const cancelAndContinue = () => {
    setValue('dni', dniInput)
    setShowConfirm(false)
    setFoundClient(null)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">DNI/NIE *</label>
          <div className="flex gap-2">
            <input
              type="text" className="input flex-1" placeholder="12345678A"
              value={dniInput}
              onChange={e => setDniInput(e.target.value.toUpperCase())}
              onBlur={() => dniInput.length >= 5 && searchDni()}
            />
            <button type="button" onClick={searchDni}
              disabled={isSearching || dniInput.length < 5} className="btn-secondary px-3">
              {isSearching ? '...' : <Search size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Introduce DNI y pulsa buscar para verificar duplicados
          </p>
        </div>
        <div>
          <label className="label">NIF (empresa)</label>
          <input type="text" className="input" onChange={e => setValue('nif', e.target.value)} />
        </div>
      </div>

      {showConfirm && foundClient && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-color)]/20 flex items-center justify-center text-[var(--primary-color)] text-lg font-bold shrink-0">
              {(foundClient.firstName || foundClient.companyName || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--text-main)]">Cliente encontrado con este DNI</p>
              <p className="text-sm text-[var(--text-muted)]">
                {foundClient.firstName ? `${foundClient.firstName} ${foundClient.lastName || ''}`.trim() : foundClient.companyName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{foundClient.email} · {foundClient.phone}</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={fillExistingClient} className="btn-primary text-sm py-1.5 px-3">
                  Cargar datos existentes
                </button>
                <button type="button" onClick={cancelAndContinue} className="btn-secondary text-sm py-1.5 px-3">
                  Continuar con DNI nuevo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
