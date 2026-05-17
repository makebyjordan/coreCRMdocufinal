import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Edit2, X, UserCheck, UserX } from 'lucide-react'
import api from '../api/client'
import UserRolesManager from '../components/Users/UserRolesManager'

const ROLE_COLORS = {
  COMERCIAL: 'bg-blue-500/20 text-blue-400',
  FIRMAS: 'bg-green-500/20 text-green-400',
  MARKETING: 'bg-purple-500/20 text-purple-400',
  DIRECCION: 'bg-orange-500/20 text-orange-400',
  ADMINISTRACION: 'bg-[var(--sidebar-bg)] text-[var(--text-muted)]',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: users, isLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    retry: 2,
  })

  const toggleMutation = useMutation({
    mutationFn: (user) => api.put(`/users/${user.id}`, { active: !user.active }),
    onSuccess: () => { toast.success('Usuario actualizado'); qc.invalidateQueries(['users']) },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <div className="text-center text-gray-400 py-10">Cargando...</div>
        : usersError ? (
          <div className="text-center text-red-500 py-10 px-4">
            <p className="font-semibold">Error al cargar usuarios</p>
            <p className="text-sm mt-1 text-gray-500">{usersError.response?.data?.error || usersError.message}</p>
            <button onClick={() => qc.invalidateQueries(['users'])} className="mt-3 text-sm text-blue-600 hover:underline">Reintentar</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-color)] border-b border-[var(--border-color)]">
              <tr>
                {['Nombre', 'Email', 'Rol', 'Teléfono', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users || []).map(u => (
                <tr key={u.id} className={`hover:bg-[var(--bg-color)] ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.userRoles?.length > 0)
                        ? u.userRoles.map(r => (
                            <span key={r.id} className={`badge ${ROLE_COLORS[r.role] || 'bg-[var(--sidebar-bg)]'}`}>{r.role}</span>
                          ))
                        : <span className="badge bg-[var(--sidebar-bg)] text-gray-500">Sin rol</span>
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.active ? 'bg-green-500/20 text-green-400' : 'bg-[var(--sidebar-bg)] text-gray-500'}`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => toggleMutation.mutate(u)} className="p-1.5 text-gray-400 hover:text-orange-500 rounded"
                        title={u.active ? 'Desactivar' : 'Activar'}>
                        {u.active ? <UserX size={15} /> : <UserCheck size={15} />}
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
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { qc.invalidateQueries(['users']); setModal(null) }}
        />
      )}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }) {
  const { register, handleSubmit } = useForm({ defaultValues: user || {} })

  const mutation = useMutation({
    mutationFn: (data) => user ? api.put(`/users/${user.id}`, data) : api.post('/users', data),
    onSuccess: () => { toast.success(user ? 'Usuario actualizado' : 'Usuario creado'); onSaved() },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="card p-6 w-full max-w-md my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{user ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input type="text" className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" {...register('email', { required: true })} />
          </div>
          <div>
            <label className="label">Contraseña {user ? '(dejar en blanco para no cambiar)' : '*'}</label>
            <input type="password" className="input" {...register('password', { required: !user })} />
          </div>
          <div>
            <label className="label">Rol *</label>
            <select className="select" {...register('role', { required: true })}>
              {['COMERCIAL', 'FIRMAS', 'MARKETING', 'DIRECCION', 'ADMINISTRACION'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input type="tel" className="input" {...register('phone')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

        {/* Gestor de roles - solo cuando se edita */}
        {user && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <UserRolesManager userId={user.id} />
          </div>
        )}
      </div>
    </div>
  )
}
