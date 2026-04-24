import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Play, Settings, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const TRIGGER_LABELS = {
  CLIENT_SCORE_CHANGED: 'Cambio de Score',
  CLIENT_STAGE_CHANGED: 'Cambio de Etapa',
  DAYS_SINCE_CONTACT: 'Días sin contacto',
  TASK_OVERDUE: 'Tarea vencida',
  EXPEDIENT_PHASE_CHANGED: 'Cambio de fase',
  CLIENT_CREATED: 'Cliente creado',
  COMMUNICATION_RECEIVED: 'Comunicación recibida',
}

const ACTION_LABELS = {
  CREATE_TASK: 'Crear tarea',
  SEND_NOTIFICATION: 'Enviar notificación',
  UPDATE_CLIENT: 'Actualizar cliente',
  CREATE_NOTE: 'Crear nota',
  ASSIGN_USER: 'Asignar usuario',
  WEBHOOK: 'Webhook',
}

export default function WorkflowsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [testModal, setTestModal] = useState(null)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then(r => r.data.data),
  })

  const { data: events } = useQuery({
    queryKey: ['workflow-events'],
    queryFn: () => api.get('/workflows/events').then(r => r.data.events),
  })

  const { data: actionTypes } = useQuery({
    queryKey: ['workflow-actions'],
    queryFn: () => api.get('/workflows/actions').then(r => r.data.actions),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/workflows/${id}`),
    onSuccess: () => {
      toast.success('Regla eliminada')
      qc.invalidateQueries(['workflows'])
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => api.put(`/workflows/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries(['workflows']),
  })

  if (isLoading) return <div className="text-center py-10">Cargando...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-main)]">Automatizaciones (Workflows)</h2>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> Nueva regla
        </button>
      </div>

      <div className="grid gap-3">
        {rules?.map(rule => (
          <div
            key={rule.id}
            className={`card p-4 ${!rule.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-main)]">{rule.name}</h3>
                  {rule.active ? (
                    <span className="badge bg-green-500/20 text-green-600 text-xs">Activa</span>
                  ) : (
                    <span className="badge bg-gray-500/20 text-gray-600 text-xs">Inactiva</span>
                  )}
                </div>
                {rule.description && (
                  <p className="text-sm text-[var(--text-muted)] mt-1">{rule.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  <span className="badge bg-[var(--sidebar-bg)]">
                    {TRIGGER_LABELS[rule.triggerEvent] || rule.triggerEvent}
                  </span>
                  <span>{rule._count?.executions || 0} ejecuciones</span>
                  <span>Última: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleDateString() : 'Nunca'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleMutation.mutate({ id: rule.id, active: !rule.active })}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--primary-color)]"
                  title={rule.active ? 'Desactivar' : 'Activar'}
                >
                  {rule.active ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                </button>
                <button
                  onClick={() => setTestModal(rule)}
                  className="p-2 text-[var(--text-muted)] hover:text-blue-600"
                  title="Probar"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => setModal(rule)}
                  className="p-2 text-[var(--text-muted)] hover:text-blue-600"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => { if (confirm('¿Eliminar esta regla?')) deleteMutation.mutate(rule.id) }}
                  className="p-2 text-[var(--text-muted)] hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-muted)] mb-2">Acciones:</p>
              <div className="flex flex-wrap gap-2">
                {rule.actions?.map((action, idx) => (
                  <span key={idx} className="badge bg-blue-100 text-blue-700 text-xs">
                    {ACTION_LABELS[action.type] || action.type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {rules?.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Settings size={32} className="mx-auto mb-3 opacity-50" />
            <p>Sin reglas de automatización</p>
            <p className="text-xs mt-1">Crea tu primera regla para automatizar tareas</p>
          </div>
        )}
      </div>

      {modal && (
        <WorkflowModal
          rule={modal === 'create' ? null : modal}
          events={events}
          actionTypes={actionTypes}
          onClose={() => setModal(null)}
          onSaved={() => { qc.invalidateQueries(['workflows']); setModal(null) }}
        />
      )}
    </div>
  )
}

function WorkflowModal({ rule, events, actionTypes, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    triggerEvent: rule?.triggerEvent || '',
    conditions: rule?.conditions || {},
    actions: rule?.actions || [{ type: 'CREATE_TASK', config: {} }],
  })

  const mutation = useMutation({
    mutationFn: (data) => rule
      ? api.put(`/workflows/${rule.id}`, data)
      : api.post('/workflows', data),
    onSuccess: () => { toast.success(rule ? 'Regla actualizada' : 'Regla creada'); onSaved() },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  const addAction = () => {
    setForm(f => ({
      ...f,
      actions: [...f.actions, { type: 'CREATE_TASK', config: {} }],
    }))
  }

  const removeAction = (idx) => {
    setForm(f => ({
      ...f,
      actions: f.actions.filter((_, i) => i !== idx),
    }))
  }

  const updateAction = (idx, updates) => {
    setForm(f => ({
      ...f,
      actions: f.actions.map((a, i) => i === idx ? { ...a, ...updates } : a),
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg text-[var(--text-main)] mb-4">
          {rule ? 'Editar regla' : 'Nueva regla de automatización'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              className="input w-full"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Crear tarea cuando cliente pase a HOT"
              required
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <input
              type="text"
              className="input w-full"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Evento disparador *</label>
            <select
              className="select w-full"
              value={form.triggerEvent}
              onChange={(e) => setForm(f => ({ ...f, triggerEvent: e.target.value }))}
              required
            >
              <option value="">Seleccionar evento...</option>
              {events?.map(evt => (
                <option key={evt.id} value={evt.id}>{evt.label}</option>
              ))}
            </select>
          </div>

          {/* Condiciones simples */}
          <div className="p-4 bg-[var(--sidebar-bg)] rounded-lg">
            <label className="label">Condiciones (opcional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Score objetivo</label>
                <select
                  className="select w-full text-sm"
                  value={form.conditions?.score || ''}
                  onChange={(e) => setForm(f => ({
                    ...f,
                    conditions: { ...f.conditions, score: e.target.value || undefined },
                  }))}
                >
                  <option value="">Cualquiera</option>
                  <option value="FRIO">Frío</option>
                  <option value="TIBIO">Tibio</option>
                  <option value="CALIENTE">Caliente</option>
                  <option value="HOT">Hot</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Etapa objetivo</label>
                <select
                  className="select w-full text-sm"
                  value={form.conditions?.stage || ''}
                  onChange={(e) => setForm(f => ({
                    ...f,
                    conditions: { ...f.conditions, stage: e.target.value || undefined },
                  }))}
                >
                  <option value="">Cualquiera</option>
                  <option value="LEAD">Lead</option>
                  <option value="PROSPECTO">Prospecto</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="RECURRENTE">Recurrente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Acciones *</label>
              <button type="button" onClick={addAction} className="text-xs text-[var(--primary-color)] hover:underline">
                + Añadir acción
              </button>
            </div>

            <div className="space-y-3">
              {form.actions.map((action, idx) => (
                <div key={idx} className="p-3 bg-[var(--sidebar-bg)] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      className="select flex-1 text-sm"
                      value={action.type}
                      onChange={(e) => updateAction(idx, { type: e.target.value, config: {} })}
                    >
                      {actionTypes?.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAction(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Config específica por tipo */}
                  {action.type === 'CREATE_TASK' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="input w-full text-sm"
                        placeholder="Título de la tarea"
                        value={action.config?.title || ''}
                        onChange={(e) => updateAction(idx, { config: { ...action.config, title: e.target.value } })}
                      />
                      <select
                        className="select text-sm"
                        value={action.config?.priority || 'MEDIUM'}
                        onChange={(e) => updateAction(idx, { config: { ...action.config, priority: e.target.value } })}
                      >
                        <option value="LOW">Prioridad Baja</option>
                        <option value="MEDIUM">Prioridad Media</option>
                        <option value="HIGH">Prioridad Alta</option>
                      </select>
                    </div>
                  )}

                  {action.type === 'SEND_NOTIFICATION' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="input w-full text-sm"
                        placeholder="Título de la notificación"
                        value={action.config?.title || ''}
                        onChange={(e) => updateAction(idx, { config: { ...action.config, title: e.target.value } })}
                      />
                      <input
                        type="text"
                        className="input w-full text-sm"
                        placeholder="Mensaje"
                        value={action.config?.message || ''}
                        onChange={(e) => updateAction(idx, { config: { ...action.config, message: e.target.value } })}
                      />
                    </div>
                  )}

                  {action.type === 'UPDATE_CLIENT' && (
                    <div className="space-y-2">
                      <select
                        className="select text-sm"
                        value={action.config?.score || ''}
                        onChange={(e) => updateAction(idx, { config: { ...action.config, score: e.target.value } })}
                      >
                        <option value="">Sin cambio de score</option>
                        <option value="FRIO">Frío</option>
                        <option value="TIBIO">Tibio</option>
                        <option value="CALIENTE">Caliente</option>
                        <option value="HOT">Hot</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !form.name || !form.triggerEvent || form.actions.length === 0}
              className="btn-primary"
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar regla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
