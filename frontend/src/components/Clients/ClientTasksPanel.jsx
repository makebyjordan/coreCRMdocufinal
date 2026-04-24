import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, CheckCircle, Circle, Calendar, User, AlertCircle,
  Clock, ArrowRight, X, Filter, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

const TYPE_LABELS = {
  LLAMAR: 'Llamada',
  EMAIL: 'Email',
  VISITA: 'Visita',
  REVISAR_DOC: 'Revisar Doc',
  FIRMAR: 'Firma',
  OTRA: 'Tarea',
}

const TYPE_ICONS = {
  LLAMAR: PhoneIcon,
  EMAIL: MailIcon,
  VISITA: VisitIcon,
  REVISAR_DOC: DocIcon,
  FIRMAR: SignIcon,
  OTRA: TaskIcon,
}

const PRIORITY_COLORS = {
  HIGH: 'text-red-600 bg-red-500/10 border-red-200',
  MEDIUM: 'text-yellow-600 bg-yellow-500/10 border-yellow-200',
  LOW: 'text-green-600 bg-green-500/10 border-green-200',
}

const PRIORITY_LABELS = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

export default function ClientTasksPanel({ clientId }) {
  const qc = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState({ completed: false, priority: '', type: '' })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', { clientId }],
    queryFn: () => api.get('/tasks', { params: { clientId } }).then(r => r.data.data),
    enabled: !!clientId,
  })

  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/tasks/${id}/complete`),
    onSuccess: () => {
      toast.success('Tarea completada')
      qc.invalidateQueries(['tasks', { clientId }])
      qc.invalidateQueries(['client', clientId])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      toast.success('Tarea eliminada')
      qc.invalidateQueries(['tasks', { clientId }])
      qc.invalidateQueries(['client', clientId])
    },
  })

  const filteredTasks = tasks?.filter(t => {
    if (filter.completed === false && t.completedAt) return false
    if (filter.priority && t.priority !== filter.priority) return false
    if (filter.type && t.type !== filter.type) return false
    return true
  })

  const pendingTasks = filteredTasks?.filter(t => !t.completedAt) || []
  const completedTasks = filteredTasks?.filter(t => t.completedAt) || []

  if (isLoading) return <div className="text-center py-10 text-gray-400">Cargando tareas...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Calendar size={16} className="text-[var(--primary-color)]" />
          Tareas
        </h3>
        <div className="flex items-center gap-2">
          <select
            className="select text-sm py-1"
            value={filter.priority}
            onChange={(e) => setFilter(f => ({ ...f, priority: e.target.value }))}
          >
            <option value="">Todas prioridades</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
          <select
            className="select text-sm py-1"
            value={filter.type}
            onChange={(e) => setFilter(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">Todos tipos</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={filter.completed}
              onChange={(e) => setFilter(f => ({ ...f, completed: e.target.checked }))}
            />
            Ver completadas
          </label>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-sm py-1.5 px-3"
          >
            <Plus size={14} /> Nueva
          </button>
        </div>
      </div>

      {/* Tareas pendientes */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[var(--primary-color)] uppercase tracking-wide">
            Pendientes ({pendingTasks.length})
          </h4>
          {pendingTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => completeMutation.mutate(task.id)}
              onDelete={() => { if (confirm('¿Eliminar esta tarea?')) deleteMutation.mutate(task.id) }}
            />
          ))}
        </div>
      )}

      {/* Tareas completadas */}
      {filter.completed && completedTasks.length > 0 && (
        <div className="space-y-2 mt-6">
          <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            Completadas ({completedTasks.length})
          </h4>
          {completedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isCompleted
              onDelete={() => { if (confirm('¿Eliminar esta tarea?')) deleteMutation.mutate(task.id) }}
            />
          ))}
        </div>
      )}

      {filteredTasks?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin tareas registradas</p>
          <p className="text-xs text-gray-300 mt-1">Crea tareas para seguimiento del cliente</p>
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal
          clientId={clientId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            qc.invalidateQueries(['tasks', { clientId }])
            qc.invalidateQueries(['client', clientId])
          }}
        />
      )}
    </div>
  )
}

function TaskCard({ task, onComplete, onDelete, isCompleted }) {
  const typeLabel = TYPE_LABELS[task.type] || task.type
  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completedAt

  return (
    <div className={`card p-3 flex items-start gap-3 ${isCompleted ? 'opacity-60' : ''}`}>
      {!isCompleted && (
        <button
          onClick={onComplete}
          className="mt-0.5 text-gray-400 hover:text-green-600 transition-colors"
        >
          <Circle size={20} />
        </button>
      )}
      {isCompleted && (
        <CheckCircle size={20} className="mt-0.5 text-green-600" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-[var(--text-main)]'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <span className={`badge text-[10px] ${priorityClass}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="badge bg-[var(--sidebar-bg)] text-xs flex items-center gap-1">
            {typeLabel}
          </span>
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Clock size={12} />
              {new Date(task.dueDate).toLocaleDateString('es-ES')}
              {isOverdue && ' (vencida)'}
            </span>
          )}
          {task.assignedTo?.name && (
            <span className="flex items-center gap-1">
              <User size={12} /> {task.assignedTo.name}
            </span>
          )}
          {task.expedient && (
            <a
              href={`/expedients/${task.expedient.id}`}
              className="text-[var(--primary-color)] hover:underline flex items-center gap-1"
            >
              <ArrowRight size={12} /> {task.expedient.code}
            </a>
          )}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-600 transition-colors p-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function CreateTaskModal({ clientId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'OTRA',
    priority: 'MEDIUM',
    dueDate: '',
  })

  const mutation = useMutation({
    mutationFn: (data) => api.post('/tasks', { ...data, clientId }),
    onSuccess: () => {
      toast.success('Tarea creada')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al crear'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-lg">
        <h3 className="font-bold text-lg text-[var(--text-main)] mb-4">Nueva tarea</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Título *</label>
            <input
              type="text"
              className="input w-full"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Llamar cliente para seguimiento"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select
                className="select w-full"
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select
                className="select w-full"
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Fecha límite</label>
            <input
              type="datetime-local"
              className="input w-full"
              value={form.dueDate}
              onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !form.title.trim()}
              className="btn-primary"
            >
              {mutation.isPending ? 'Creando...' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Icon helpers
function PhoneIcon() { return null }
function MailIcon() { return null }
function VisitIcon() { return null }
function DocIcon() { return null }
function SignIcon() { return null }
function TaskIcon() { return null }
