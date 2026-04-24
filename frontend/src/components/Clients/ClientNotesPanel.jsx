import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pin, PinOff, Trash2, Edit2, X, Save, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

export default function ClientNotesPanel({ clientId }) {
  const qc = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newNote, setNewNote] = useState('')
  const [newPinned, setNewPinned] = useState(false)
  const [editContent, setEditContent] = useState('')

  const { data: notes, isLoading } = useQuery({
    queryKey: ['client-notes', clientId],
    queryFn: () => api.get(`/clients/${clientId}/notes`).then(r => r.data),
    enabled: !!clientId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/clients/${clientId}/notes`, data),
    onSuccess: () => {
      toast.success('Nota creada')
      setIsCreating(false)
      setNewNote('')
      setNewPinned(false)
      qc.invalidateQueries(['client-notes', clientId])
      qc.invalidateQueries(['client', clientId])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al crear nota'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/clients/${clientId}/notes/${id}`, data),
    onSuccess: () => {
      toast.success('Nota actualizada')
      setEditingId(null)
      setEditContent('')
      qc.invalidateQueries(['client-notes', clientId])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/clients/${clientId}/notes/${id}`),
    onSuccess: () => {
      toast.success('Nota eliminada')
      qc.invalidateQueries(['client-notes', clientId])
      qc.invalidateQueries(['client', clientId])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al eliminar'),
  })

  const pinMutation = useMutation({
    mutationFn: (id) => api.patch(`/clients/${clientId}/notes/${id}/pin`),
    onSuccess: () => qc.invalidateQueries(['client-notes', clientId]),
  })

  const handleCreate = () => {
    if (!newNote.trim()) return
    createMutation.mutate({ content: newNote, pinned: newPinned })
  }

  const handleUpdate = (id) => {
    if (!editContent.trim()) return
    updateMutation.mutate({ id, data: { content: editContent } })
  }

  if (isLoading) return <div className="text-center py-10 text-gray-400">Cargando notas...</div>

  const pinnedNotes = notes?.filter(n => n.pinned) || []
  const unpinnedNotes = notes?.filter(n => !n.pinned) || []

  return (
    <div className="space-y-4">
      {/* Botón crear */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <MessageSquare size={16} className="text-[var(--primary-color)]" />
          Notas estructuradas
        </h3>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary text-sm py-1.5 px-3"
          >
            <Plus size={14} /> Nueva nota
          </button>
        )}
      </div>

      {/* Formulario crear */}
      {isCreating && (
        <div className="card p-4 border-2 border-[var(--primary-color)]">
          <textarea
            className="input w-full resize-none"
            rows={4}
            placeholder="Escribe una nota..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={newPinned}
                onChange={(e) => setNewPinned(e.target.checked)}
                className="rounded"
              />
              <Pin size={14} /> Fijar nota
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setIsCreating(false); setNewNote(''); setNewPinned(false) }}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !newNote.trim()}
                className="btn-primary text-sm py-1.5 px-3"
              >
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notas fijadas */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--primary-color)] uppercase tracking-wide flex items-center gap-1">
            <Pin size={12} /> Fijadas
          </h4>
          {pinnedNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isEditing={editingId === note.id}
              editContent={editContent}
              setEditContent={setEditContent}
              onStartEdit={() => { setEditingId(note.id); setEditContent(note.content) }}
              onCancelEdit={() => { setEditingId(null); setEditContent('') }}
              onSave={() => handleUpdate(note.id)}
              onDelete={() => { if (confirm('¿Eliminar esta nota?')) deleteMutation.mutate(note.id) }}
              onTogglePin={() => pinMutation.mutate(note.id)}
            />
          ))}
        </div>
      )}

      {/* Notas normales */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mt-6">
              Notas
            </h4>
          )}
          {unpinnedNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isEditing={editingId === note.id}
              editContent={editContent}
              setEditContent={setEditContent}
              onStartEdit={() => { setEditingId(note.id); setEditContent(note.content) }}
              onCancelEdit={() => { setEditingId(null); setEditContent('') }}
              onSave={() => handleUpdate(note.id)}
              onDelete={() => { if (confirm('¿Eliminar esta nota?')) deleteMutation.mutate(note.id) }}
              onTogglePin={() => pinMutation.mutate(note.id)}
            />
          ))}
        </div>
      )}

      {notes?.length === 0 && !isCreating && (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin notas registradas</p>
          <p className="text-xs text-gray-300 mt-1">Crea la primera nota para este cliente</p>
        </div>
      )}
    </div>
  )
}

function NoteCard({
  note,
  isEditing,
  editContent,
  setEditContent,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTogglePin,
}) {
  const canEdit = !isEditing

  return (
    <div className={`card p-4 ${note.pinned ? 'border-l-4 border-l-[var(--primary-color)]' : ''}`}>
      {isEditing ? (
        <>
          <textarea
            className="input w-full resize-none"
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={onCancelEdit} className="btn-secondary text-sm py-1 px-2">
              <X size={14} />
            </button>
            <button onClick={onSave} className="btn-primary text-sm py-1 px-2">
              <Save size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>{note.author?.name || 'Usuario'}</span>
              <span>·</span>
              <span>{new Date(note.createdAt).toLocaleDateString('es-ES')}</span>
              {note.updatedAt !== note.createdAt && (
                <span className="text-gray-400">(editado)</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onTogglePin}
                className={`p-1.5 rounded transition-colors ${
                  note.pinned ? 'text-[var(--primary-color)] bg-blue-50' : 'text-gray-400 hover:text-[var(--primary-color)]'
                }`}
                title={note.pinned ? 'Desfijar' : 'Fijar'}
              >
                {note.pinned ? <Pin size={14} /> : <PinOff size={14} />}
              </button>
              <button
                onClick={onStartEdit}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
