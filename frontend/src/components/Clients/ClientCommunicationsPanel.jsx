import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Phone, MessageCircle, Send, Plus, X,
  CheckCircle, Clock, AlertCircle, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

const CHANNEL_ICONS = {
  EMAIL: Mail,
  PHONE: Phone,
  WHATSAPP: MessageCircle,
  SMS: MessageCircle,
  MEETING: Clock,
}

const CHANNEL_LABELS = {
  EMAIL: 'Email',
  PHONE: 'Teléfono',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  MEETING: 'Reunión',
}

const DIRECTION_LABELS = {
  OUTBOUND: 'Enviado',
  INBOUND: 'Recibido',
}

const STATUS_COLORS = {
  SENT: 'bg-blue-500/10 text-blue-600',
  DELIVERED: 'bg-green-500/10 text-green-600',
  OPENED: 'bg-purple-500/10 text-purple-600',
  FAILED: 'bg-red-500/10 text-red-600',
  PENDING: 'bg-yellow-500/10 text-yellow-600',
}

export default function ClientCommunicationsPanel({ clientId }) {
  const qc = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState({ channel: '', direction: '' })

  const { data: communications, isLoading } = useQuery({
    queryKey: ['client-communications', clientId],
    queryFn: () => api.get(`/clients/${clientId}/communications?limit=100`).then(r => r.data.data),
    enabled: !!clientId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/clients/${clientId}/communications`, data),
    onSuccess: () => {
      toast.success('Comunicación registrada')
      setShowCreateModal(false)
      qc.invalidateQueries(['client-communications', clientId])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al registrar'),
  })

  const filteredComms = communications?.filter(c => {
    if (filter.channel && c.channel !== filter.channel) return false
    if (filter.direction && c.direction !== filter.direction) return false
    return true
  })

  if (isLoading) return <div className="text-center py-10 text-gray-400">Cargando comunicaciones...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Mail size={16} className="text-[var(--primary-color)]" />
          Historial de comunicaciones
        </h3>
        <div className="flex items-center gap-2">
          <select
            className="select text-sm py-1.5"
            value={filter.channel}
            onChange={(e) => setFilter(f => ({ ...f, channel: e.target.value }))}
          >
            <option value="">Todos canales</option>
            {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            className="select text-sm py-1.5"
            value={filter.direction}
            onChange={(e) => setFilter(f => ({ ...f, direction: e.target.value }))}
          >
            <option value="">Ambas direcciones</option>
            <option value="OUTBOUND">Enviados</option>
            <option value="INBOUND">Recibidos</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-sm py-1.5 px-3"
          >
            <Plus size={14} /> Registrar
          </button>
        </div>
      </div>

      {/* Timeline */}
      {filteredComms?.length > 0 ? (
        <div className="space-y-3">
          {filteredComms.map((comm) => {
            const Icon = CHANNEL_ICONS[comm.channel] || Mail
            const isOutbound = comm.direction === 'OUTBOUND'

            return (
              <div
                key={comm.id}
                className={`card p-4 ${isOutbound ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isOutbound ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-[var(--text-main)]">
                          {comm.subject || `${CHANNEL_LABELS[comm.channel]} ${DIRECTION_LABELS[comm.direction].toLowerCase()}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge text-[10px] bg-[var(--sidebar-bg)]">
                            {CHANNEL_LABELS[comm.channel]}
                          </span>
                          <span className={`badge text-[10px] ${isOutbound ? 'text-blue-600' : 'text-green-600'}`}>
                            {DIRECTION_LABELS[comm.direction]}
                          </span>
                          <span className={`badge text-[10px] ${STATUS_COLORS[comm.status] || STATUS_COLORS.PENDING}`}>
                            {comm.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(comm.sentAt || comm.createdAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {comm.body && (
                      <div className="mt-3 p-3 bg-[var(--sidebar-bg)] rounded-lg text-sm text-[var(--text-muted)]">
                        {comm.body}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-muted)]">
                      <span>por {comm.sentBy?.name || 'Usuario'}</span>
                      {comm.expedient && (
                        <a
                          href={`/expedients/${comm.expedient.id}`}
                          className="text-[var(--primary-color)] hover:underline"
                        >
                          {comm.expedient.code}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <Mail size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin comunicaciones registradas</p>
          <p className="text-xs text-gray-300 mt-1">
            Registra llamadas, emails y otros contactos con el cliente
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateCommunicationModal
          clientId={clientId}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  )
}

function CreateCommunicationModal({ clientId, onClose, onSubmit, isPending }) {
  const [form, setForm] = useState({
    channel: 'EMAIL',
    direction: 'OUTBOUND',
    subject: '',
    body: '',
    status: 'SENT',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-lg">
        <h3 className="font-bold text-lg text-[var(--text-main)] mb-4">Registrar comunicación</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Canal</label>
              <select
                className="select w-full"
                value={form.channel}
                onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}
              >
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Dirección</label>
              <select
                className="select w-full"
                value={form.direction}
                onChange={(e) => setForm(f => ({ ...f, direction: e.target.value }))}
              >
                <option value="OUTBOUND">Enviado</option>
                <option value="INBOUND">Recibido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Asunto / Resumen</label>
            <input
              type="text"
              className="input w-full"
              value={form.subject}
              onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Ej: Llamada de seguimiento"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Detalles</label>
            <textarea
              className="input w-full resize-none"
              rows={4}
              value={form.body}
              onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Contenido o resumen de la comunicación..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
