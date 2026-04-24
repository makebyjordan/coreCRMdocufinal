import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Users, Link2, User, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

const RELATION_TYPES = {
  FAMILIAR: { label: 'Familiar', color: 'bg-pink-500' },
  AMIGO: { label: 'Amigo', color: 'bg-blue-500' },
  SOCIA: { label: 'Socio/a', color: 'bg-purple-500' },
  REFERIDO_POR: { label: 'Referido por', color: 'bg-green-500' },
  REFIERE_A: { label: 'Refiere a', color: 'bg-orange-500' },
  OTRO: { label: 'Otro', color: 'bg-gray-500' },
}

export default function ClientRelationsPanel({ clientId }) {
  const qc = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: relations, isLoading } = useQuery({
    queryKey: ['client-relations', clientId],
    queryFn: () => api.get(`/clients/${clientId}/relations`).then(r => r.data),
    enabled: !!clientId,
  })

  const deleteMutation = useMutation({
    mutationFn: (relationId) => api.delete(`/clients/${clientId}/relations/${relationId}`),
    onSuccess: () => {
      toast.success('Relación eliminada')
      qc.invalidateQueries(['client-relations', clientId])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al eliminar'),
  })

  if (isLoading) return <div className="text-center py-10 text-gray-400">Cargando relaciones...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Link2 size={16} className="text-[var(--primary-color)]" />
          Red de relaciones
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-sm py-1.5 px-3"
        >
          <Plus size={14} /> Añadir relación
        </button>
      </div>

      {/* Grid de relaciones */}
      {relations?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {relations.map((relation) => {
            const typeConfig = RELATION_TYPES[relation.type] || RELATION_TYPES.OTRO
            const other = relation.otherClient

            return (
              <div key={relation.id} className="card p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${typeConfig.color} flex items-center justify-center text-white shrink-0`}>
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <a
                        href={`/clients/${other.id}`}
                        className="font-medium text-[var(--text-main)] hover:text-[var(--primary-color)] block truncate"
                      >
                        {other.firstName
                          ? `${other.firstName} ${other.lastName || ''}`.trim()
                          : other.companyName}
                      </a>
                      <p className="text-xs text-[var(--text-muted)]">{other.email}</p>
                      {other.phone && (
                        <p className="text-xs text-[var(--text-muted)]">{other.phone}</p>
                      )}
                    </div>
                    <span className={`badge ${typeConfig.color} text-white text-[10px] shrink-0`}>
                      {typeConfig.label}
                    </span>
                  </div>
                  {relation.notes && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 italic">{relation.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm('¿Eliminar esta relación?')) deleteMutation.mutate(relation.id) }}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin relaciones registradas</p>
          <p className="text-xs text-gray-300 mt-1">
            Conecta este cliente con familiares, referidos o socios
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateRelationModal
          clientId={clientId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            qc.invalidateQueries(['client-relations', clientId])
          }}
        />
      )}
    </div>
  )
}

function CreateRelationModal({ clientId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    otherClientId: '',
    type: 'FAMILIAR',
    notes: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)

  const qc = useQueryClient()

  const searchClients = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }
    try {
      const res = await api.get('/clients', { params: { search: query, limit: 10 } })
      // Filtrar el cliente actual
      const filtered = res.data.data.filter(c => c.id !== clientId)
      setSearchResults(filtered)
    } catch {
      setSearchResults([])
    }
  }

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/clients/${clientId}/relations`, data),
    onSuccess: () => {
      toast.success('Relación creada')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al crear'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedClient) return
    mutation.mutate({
      otherClientId: selectedClient.id,
      type: form.type,
      notes: form.notes,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-lg">
        <h3 className="font-bold text-lg text-[var(--text-main)] mb-4">Nueva relación</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buscador de cliente */}
          <div>
            <label className="label">Cliente relacionado *</label>
            {!selectedClient ? (
              <>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Buscar cliente por nombre, email o DNI..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchClients(e.target.value)
                  }}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto border border-[var(--border-color)] rounded-lg">
                    {searchResults.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(client)
                          setSearchResults([])
                        }}
                        className="w-full text-left p-3 hover:bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] last:border-0"
                      >
                        <p className="font-medium text-sm text-[var(--text-main)]">
                          {client.firstName
                            ? `${client.firstName} ${client.lastName || ''}`.trim()
                            : client.companyName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{client.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between p-3 bg-[var(--sidebar-bg)] rounded-lg">
                <div>
                  <p className="font-medium text-[var(--text-main)]">
                    {selectedClient.firstName
                      ? `${selectedClient.firstName} ${selectedClient.lastName || ''}`.trim()
                      : selectedClient.companyName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{selectedClient.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de relación</label>
              <select
                className="select w-full"
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {Object.entries(RELATION_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              className="input w-full resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Detalles adicionales sobre la relación..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !selectedClient}
              className="btn-primary"
            >
              {mutation.isPending ? 'Creando...' : 'Crear relación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
