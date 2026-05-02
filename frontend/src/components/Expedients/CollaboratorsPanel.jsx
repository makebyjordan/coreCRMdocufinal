import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Trash2, Users } from 'lucide-react'
import api from '../../api/client'

const COLLABORATOR_ROLES = [
  { value: 'ASIGNADO', label: 'Asignado (Principal)', color: 'bg-blue-100 text-blue-700' },
  { value: 'CO_RESPONSABLE', label: 'Co-responsable', color: 'bg-purple-100 text-purple-700' },
  { value: 'REVISOR', label: 'Revisor', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'OBSERVADOR', label: 'Observador', color: 'bg-gray-100 text-gray-700' },
]

export default function CollaboratorsPanel({ expedientId }) {
  const [showAddCollaborator, setShowAddCollaborator] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('ASIGNADO')
  const [notes, setNotes] = useState('')
  const qc = useQueryClient()

  // Obtener colaboradores
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['expedient-collaborators', expedientId],
    queryFn: () => api.get(`/collaborators/expedients/${expedientId}`).then(r => r.data || []),
  })

  // Obtener lista de usuarios
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data?.data || []),
  })

  // Agregar colaborador
  const addCollaboratorMutation = useMutation({
    mutationFn: () =>
      api.post(`/collaborators/expedients/${expedientId}/add`, {
        userId: selectedUserId,
        collaboratorRole: selectedRole,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries(['expedient-collaborators', expedientId])
      setSelectedUserId('')
      setSelectedRole('ASIGNADO')
      setNotes('')
      setShowAddCollaborator(false)
    },
  })

  // Remover colaborador
  const removeCollaboratorMutation = useMutation({
    mutationFn: (userId) => api.delete(`/collaborators/expedients/${expedientId}/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries(['expedient-collaborators', expedientId])
    },
  })

  const assignedUserIds = collaborators.map(c => c.userId)
  const availableUsers = users.filter(u => !assignedUserIds.includes(u.id))

  const getRoleLabel = (role) => COLLABORATOR_ROLES.find(r => r.value === role)
  const getRoleColor = (role) => getRoleLabel(role)?.color || 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Colaboradores</h3>
        </div>
        <button
          onClick={() => setShowAddCollaborator(!showAddCollaborator)}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          <Plus size={16} />
          Agregar
        </button>
      </div>

      {/* Lista de colaboradores */}
      {loadingCollaborators ? (
        <div className="text-center text-gray-400 py-6">Cargando colaboradores...</div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          Sin colaboradores asignados
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map(collab => {
            const roleInfo = getRoleLabel(collab.collaboratorRole)
            return (
              <div
                key={collab.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {collab.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{collab.user.name}</p>
                      <p className="text-xs text-gray-500">{collab.user.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded ${getRoleColor(collab.collaboratorRole)}`}>
                      {roleInfo?.label}
                    </span>
                    {collab.notes && (
                      <span className="text-xs text-gray-600 italic">
                        "{collab.notes}"
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeCollaboratorMutation.mutate(collab.userId)}
                  disabled={removeCollaboratorMutation.isPending}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title="Remover colaborador"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Panel para agregar colaborador */}
      {showAddCollaborator && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar usuario
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers || availableUsers.length === 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol en el expediente
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {COLLABORATOR_ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Responsable de valoración"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => selectedUserId && addCollaboratorMutation.mutate()}
              disabled={!selectedUserId || addCollaboratorMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {addCollaboratorMutation.isPending ? 'Agregando...' : 'Agregar colaborador'}
            </button>
            <button
              onClick={() => setShowAddCollaborator(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          {availableUsers.length === 0 && (
            <p className="text-xs text-gray-600">
              No hay usuarios disponibles para asignar
            </p>
          )}
        </div>
      )}
    </div>
  )
}
