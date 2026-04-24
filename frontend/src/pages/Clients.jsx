import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, X, Filter, Thermometer, TrendingUp } from 'lucide-react'
import api from '../api/client'

const SCORE_OPTIONS = [
  { value: '', label: 'Todos scores' },
  { value: 'FRIO', label: 'Frío', color: 'blue' },
  { value: 'TIBIO', label: 'Tibio', color: 'yellow' },
  { value: 'CALIENTE', label: 'Caliente', color: 'orange' },
  { value: 'HOT', label: 'Hot', color: 'red' },
]

const STAGE_OPTIONS = [
  { value: '', label: 'Todas etapas' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'PROSPECTO', label: 'Prospecto' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'RECURRENTE', label: 'Recurrente' },
  { value: 'PERDIDO', label: 'Perdido' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos tipos' },
  { value: 'INQUILINO', label: 'Inquilino' },
  { value: 'PROPIETARIO', label: 'Propietario' },
  { value: 'COMPRADOR', label: 'Comprador' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'INVERSOR', label: 'Inversor' },
  { value: 'EMPRESA', label: 'Empresa' },
]

export default function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    score: '',
    lifecycleStage: '',
    type: '',
    active: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [modal, setModal] = useState(null) // null | 'create' | client object

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, filters],
    queryFn: () => api.get('/clients', {
      params: {
        search,
        limit: 50,
        ...(filters.score && { score: filters.score }),
        ...(filters.lifecycleStage && { lifecycleStage: filters.lifecycleStage }),
        ...(filters.type && { type: filters.type }),
        ...(filters.active !== '' && { active: filters.active }),
      }
    }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success('Cliente eliminado'); qc.invalidateQueries(['clients']) },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al eliminar'),
  })

  const clients = data?.data || []

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input pl-9" placeholder="Buscar cliente..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-[var(--primary-color)] text-white' : ''}`}
          >
            <Filter size={15} /> Filtros
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="card p-4 flex flex-wrap gap-3">
            <select
              className="select text-sm"
              value={filters.score}
              onChange={(e) => setFilters(f => ({ ...f, score: e.target.value }))}
            >
              {SCORE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="select text-sm"
              value={filters.lifecycleStage}
              onChange={(e) => setFilters(f => ({ ...f, lifecycleStage: e.target.value }))}
            >
              {STAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="select text-sm"
              value={filters.type}
              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="select text-sm"
              value={filters.active}
              onChange={(e) => setFilters(f => ({ ...f, active: e.target.value }))}
            >
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
      </div>

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
                  onClick={() => window.location.href = `/clients/${c.id}`}
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
                    <span className="badge bg-[var(--bg-color)] text-[var(--text-muted)] border border-[var(--border-color)]">{c._count?.expedients || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModal(c)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary-color)] transition-colors">
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

function ClientModal({ client, onClose, onSaved }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: client || {},
  })

  const mutation = useMutation({
    mutationFn: (data) => client
      ? api.put(`/clients/${client.id}`, data)
      : api.post('/clients', data),
    onSuccess: () => { toast.success(client ? 'Cliente actualizado' : 'Cliente creado'); onSaved() },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
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
                  <option key={t} value={t} className="bg-[var(--card-bg)]">{t}</option>
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

          {/* DNI con lookup */}
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
                <button
                  type="button"
                  onClick={() => setValue('address', '')}
                  className="text-xs font-medium text-[var(--secondary-color)] hover:opacity-80 transition-opacity"
                >
                  Sabe domicilio
                </button>
                <button
                  type="button"
                  onClick={() => setValue('address', 'No sabe')}
                  className="text-xs font-medium text-[var(--secondary-color)] hover:opacity-80 transition-opacity"
                >
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
            <input type="checkbox" id="privacy" {...register('privacyPolicy')} className="text-[var(--primary-color)] focus:ring-[var(--primary-color)]" />
            <label htmlFor="privacy" className="text-sm text-[var(--text-muted)]">Política de privacidad aceptada</label>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea rows={3} className="input resize-none" placeholder="Observaciones sobre el cliente..."
              {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary bg-transparent border border-[var(--border-color)]">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente DNI Lookup para búsqueda y autocompletado
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
        // No existe, prellenar el DNI
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
    setValue('dni', foundClient.dni)
    setValue('firstName', foundClient.firstName)
    setValue('lastName', foundClient.lastName)
    setValue('companyName', foundClient.companyName)
    setValue('email', foundClient.email)
    setValue('phone', foundClient.phone)
    setValue('type', foundClient.type)
    setValue('nif', foundClient.nif)
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
              type="text"
              className="input flex-1"
              placeholder="12345678A"
              value={dniInput}
              onChange={(e) => setDniInput(e.target.value.toUpperCase())}
              onBlur={() => dniInput.length >= 5 && searchDni()}
            />
            <button
              type="button"
              onClick={searchDni}
              disabled={isSearching || dniInput.length < 5}
              className="btn-secondary px-3"
            >
              {isSearching ? '...' : <Search size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Introduce DNI y pulsa buscar para verificar duplicados
          </p>
        </div>
        <div>
          <label className="label">NIF (empresa)</label>
          <input type="text" className="input" onChange={(e) => setValue('nif', e.target.value)} />
        </div>
      </div>

      {/* Modal de confirmación si existe cliente */}
      {showConfirm && foundClient && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-color)]/20 flex items-center justify-center text-[var(--primary-color)] text-lg font-bold shrink-0">
              {(foundClient.firstName || foundClient.companyName || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--text-main)]">
                Cliente encontrado con este DNI
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {foundClient.firstName
                  ? `${foundClient.firstName} ${foundClient.lastName || ''}`.trim()
                  : foundClient.companyName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {foundClient.email} · {foundClient.phone}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={fillExistingClient}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  Cargar datos existentes
                </button>
                <button
                  type="button"
                  onClick={cancelAndContinue}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
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
