import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Trash2 } from 'lucide-react'
import api from '../../api/client'

const ROLES = ['COMERCIAL', 'FIRMAS', 'MARKETING', 'DIRECCION', 'ADMINISTRACION']

export default function UserRolesManager({ userId }) {
  const [showAddRole, setShowAddRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const qc = useQueryClient()

  // Obtener roles del usuario
  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => api.get(`/roles/users/${userId}`).then(r => r.data || []),
  })

  // Asignar rol
  const assignRoleMutation = useMutation({
    mutationFn: (role) => api.post(`/roles/users/${userId}/assign`, { role }),
    onSuccess: () => {
      qc.invalidateQueries(['user-roles', userId])
      setSelectedRole('')
      setShowAddRole(false)
    },
  })

  // Remover rol
  const removeRoleMutation = useMutation({
    mutationFn: (role) => api.delete(`/roles/users/${userId}/remove/${role}`),
    onSuccess: () => {
      qc.invalidateQueries(['user-roles', userId])
    },
  })

  const userRoleNames = userRoles.map(r => r.role)
  const availableRoles = ROLES.filter(r => !userRoleNames.includes(r))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Roles del Usuario</h3>
        <button
          onClick={() => setShowAddRole(!showAddRole)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus size={16} />
          Agregar rol
        </button>
      </div>

      {/* Lista de roles actuales */}
      {isLoading ? (
        <div className="text-center text-gray-400">Cargando roles...</div>
      ) : userRoles.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          Sin roles asignados
        </div>
      ) : (
        <div className="grid gap-2">
          {userRoles.map(userRole => (
            <div
              key={userRole.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <p className="font-medium text-gray-900">{userRole.role}</p>
                <p className="text-xs text-gray-500">
                  Asignado: {new Date(userRole.assignedAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              <button
                onClick={() => removeRoleMutation.mutate(userRole.role)}
                disabled={removeRoleMutation.isPending}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Panel para agregar rol */}
      {showAddRole && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex gap-2 items-center">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Seleccionar rol...</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button
              onClick={() => selectedRole && assignRoleMutation.mutate(selectedRole)}
              disabled={!selectedRole || assignRoleMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {assignRoleMutation.isPending ? 'Asignando...' : 'Asignar'}
            </button>
            <button
              onClick={() => setShowAddRole(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
          {availableRoles.length === 0 && (
            <p className="text-xs text-gray-600 mt-2">
              El usuario ya tiene todos los roles disponibles
            </p>
          )}
        </div>
      )}
    </div>
  )
}
