import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FileText, Plus, Search, Trash2, ExternalLink,
  FileIcon, Filter, Upload, X, Pencil, Download, Building2,
  FileSignature, CheckCircle, Tag
} from 'lucide-react'
import api from '../api/client'
import useAuthStore from '../store/authStore'

// ─── Categorías gestionadas en localStorage ───────────────────────────────────
const DEFAULT_CATEGORIES = [
  { value: 'GENERAL', label: 'General / Oficina' },
  { value: 'VENTA',   label: 'Ventas' },
  { value: 'ALQUILER',label: 'Alquileres' },
  { value: 'LEGAL',   label: 'Legal / LOPD' },
]
const STORAGE_KEY = 'docuinmo_categories'

function getCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    // Merge defaults + custom, sin duplicados por value
    const map = new Map(DEFAULT_CATEGORIES.map(c => [c.value, c]))
    stored.forEach(c => map.set(c.value, c))
    return [...map.values()]
  } catch {
    return DEFAULT_CATEGORIES
  }
}

function saveCategory(value, label) {
  const current = getCategories()
  if (current.some(c => c.value === value)) return
  const updated = [...current, { value, label }]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

/**
 * CategorySelect
 * Desplegable de categorías con opción "+ Nueva categoría".
 * Props:
 *   value, onChange(newValue)
 *   showAllOption  — si true, añade "Todas las categorías" al inicio
 *   className
 */
function CategorySelect({ value, onChange, showAllOption = false, className = '' }) {
  const [categories, setCategories] = useState(getCategories)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function handleSelectChange(e) {
    if (e.target.value === '__ADD__') {
      setAdding(true)
    } else {
      onChange(e.target.value)
    }
  }

  function confirmNew(e) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    // Generar value: mayúsculas, sin espacios, sin tildes
    const val = label.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
    saveCategory(val, label)
    const updated = getCategories()
    setCategories(updated)
    onChange(val)
    setNewLabel('')
    setAdding(false)
    toast.success(`Categoría "${label}" creada`)
  }

  function cancelNew() {
    setAdding(false)
    setNewLabel('')
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <select
          className={`select pl-10 h-11 ${className}`}
          value={adding ? '__ADD__' : value}
          onChange={handleSelectChange}
        >
          {showAllOption && <option value="ALL">Todas las categorías</option>}
          {categories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
          <option value="__ADD__">＋ Nueva categoría...</option>
        </select>
      </div>

      {adding && (
        <form onSubmit={confirmNew} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Nombre de la categoría"
              className="input h-9 pl-8 text-sm"
              maxLength={40}
            />
          </div>
          <button
            type="submit"
            disabled={!newLabel.trim()}
            className="h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={cancelNew}
            className="h-9 px-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </form>
      )}
    </div>
  )
}

export default function BaseDocuments() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [filter, setFilter] = useState('ALL') // ALL | templates | files
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [configuringTemplate, setConfiguringTemplate] = useState(null)

  const token = useAuthStore(s => s.token)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['base-documents', { filter, category }],
    queryFn: () => api.get('/base-documents', { params: { filter: filter !== 'ALL' ? filter : undefined, category: category !== 'ALL' ? category : undefined } }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/base-documents/${id}`),
    onSuccess: () => {
      toast.success('Documento eliminado')
      qc.invalidateQueries(['base-documents'])
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/base-documents/${id}`, data),
    onSuccess: () => {
      toast.success('Documento actualizado')
      setEditingDoc(null)
      qc.invalidateQueries(['base-documents'])
    },
  })

  const filteredDocs = (Array.isArray(docs) ? docs : []).filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  if (isLoading) return <div className="p-10 text-center text-gray-400 font-mono animate-pulse">Cargando repositorio de documentos...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] p-6 rounded-2xl shadow-sm border border-[var(--border-color)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Repositorio de Documentos</h1>
          <p className="text-gray-500 text-sm">Gestiona plantillas y documentos base para toda la organización</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center justify-center gap-2 group"
        >
          <Plus size={18} className="transition-transform group-hover:rotate-90" />
          <span>Nuevo documento base</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text" className="input pl-10 h-11" placeholder="Buscar por nombre..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <CategorySelect
          value={category}
          onChange={setCategory}
          showAllOption
        />
        <div className="relative">
          <FileSignature className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select
            className="select pl-10 h-11"
            value={filter} onChange={e => setFilter(e.target.value)}
          >
            <option value="ALL">Todos los archivos</option>
            <option value="templates">Solo plantillas</option>
            <option value="files">Solo documentos</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="group bg-[var(--card-bg)] px-4 py-3 rounded-xl border border-[var(--border-color)] hover:border-blue-200 hover:shadow-sm transition-all flex items-center gap-4">
            {/* Icono */}
            <div className={`p-2 rounded-lg shrink-0 ${doc.isTemplate ? 'bg-purple-100 text-purple-600' : 'bg-[var(--sidebar-bg)] text-blue-600'}`}>
              {doc.isTemplate ? <FileSignature size={20} /> : <FileText size={20} />}
            </div>
            
            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[var(--text-main)] leading-tight truncate" title={doc.name}>
                {doc.name}
              </h3>
              <div className="flex items-center gap-2 text-[10px] mt-0.5 whitespace-nowrap overflow-hidden">
                {doc.isTemplate && (
                  <span className="font-extrabold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle size={10} />
                    PLANTILLA
                  </span>
                )}
                <span className="font-extrabold text-blue-600 uppercase tracking-wider">{doc.category}</span>
                <span className="text-[var(--border-color)]">•</span>
                <span className="text-gray-400">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ''}</span>
                <span className="text-[var(--border-color)]">•</span>
                <span className="font-bold text-gray-500 uppercase">{doc.name.split('.').pop() || 'DOC'}</span>
              </div>
            </div>

            {/* Acciones Secundarias (Edit/Delete) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {doc.driveUrl && (
                <a href={doc.driveUrl} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600" title="Google Drive">
                  <ExternalLink size={16} />
                </a>
              )}
              {doc.isTemplate && (
                <button 
                  onClick={() => setConfiguringTemplate(doc)}
                  className="p-1.5 text-gray-400 hover:text-purple-600" title="Configurar plantilla"
                >
                  <FileSignature size={16} />
                </button>
              )}
              <button 
                onClick={() => setEditingDoc(doc)}
                className="p-1.5 text-gray-400 hover:text-blue-600" title="Editar"
              >
                <Pencil size={16} />
              </button>
              <button 
                onClick={() => { if (confirm('¿Eliminar documento base?')) deleteMutation.mutate(doc.id) }}
                className="p-1.5 text-gray-400 hover:text-red-600" title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Botones de acción principales */}
            <div className="flex items-center gap-2 shrink-0 border-l border-gray-50 pl-4 ml-2">
              <button 
                onClick={() => window.open(`/api/base-documents/${doc.id}/preview?token=${token}`, '_blank')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={12} /> Ver local
              </button>
              <a 
                href={`/api/base-documents/${doc.id}/download?token=${token}`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--sidebar-bg)] text-[var(--text-muted)] hover:bg-gray-200 rounded-lg text-[10px] font-bold transition-colors"
              >
                <Download size={12} /> Bajar
              </a>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center bg-[var(--bg-color)]/50 rounded-2xl border-2 border-dashed border-[var(--border-color)]">
            <FileIcon className="mx-auto text-[var(--border-color)] mb-3" size={48} />
            <p className="text-gray-400 font-medium">No se encontraron documentos</p>
            <p className="text-[var(--border-color)] text-sm">Prueba con otra búsqueda o añade uno nuevo</p>
          </div>
        )}
      </div>

      {showUploadModal && (
        <UploadBaseModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { setShowUploadModal(false); qc.invalidateQueries(['base-documents']) }}
        />
      )}

      {editingDoc && (
        <EditBaseModal
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSave={(data) => editMutation.mutate({ id: editingDoc.id, ...data })}
          isPending={editMutation.isPending}
        />
      )}

      {configuringTemplate && (
        <TemplateConfigModal
          doc={configuringTemplate}
          onClose={() => setConfiguringTemplate(null)}
          onConfigured={() => {
            setConfiguringTemplate(null)
            qc.invalidateQueries(['base-documents'])
          }}
        />
      )}

    </div>
  )
}


function EditBaseModal({ doc, onClose, onSave, isPending }) {
  const [name, setName] = useState(doc.name)
  const [category, setCategory] = useState(doc.category)
  const [isTemplate, setIsTemplate] = useState(doc.isTemplate || false)
  const [requiresSignature, setRequiresSignature] = useState(doc.requiresSignature || false)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <h3 className="font-bold text-lg text-[var(--text-main)]">Editar Documento Base</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--sidebar-bg)] rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ name, category, isTemplate, requiresSignature }) }} className="p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">NOMBRE DEL DOCUMENTO</label>
            <input
              type="text" className="input h-11"
              value={name} onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">CATEGORÍA</label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTemplate}
                onChange={e => setIsTemplate(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-[var(--text-main)]">Es plantilla rellenable</span>
            </label>
            
            {isTemplate && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={requiresSignature}
                  onChange={e => setRequiresSignature(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-[var(--text-main)]">Requiere firma digital</span>
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-color)] font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
            >
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TemplateConfigModal({ doc, onClose, onConfigured }) {
  const [isPending, setIsPending] = useState(false)
  const [placeholders, setPlaceholders] = useState([])

  useState(() => {
    if (doc.placeholders) {
      try {
        const parsed = typeof doc.placeholders === 'string' ? JSON.parse(doc.placeholders) : doc.placeholders
        setPlaceholders(parsed || [])
      } catch (e) {
        setPlaceholders([])
      }
    }
  }, [doc])

  const handleDetect = async () => {
    setIsPending(true)
    try {
      const res = await api.post(`/base-documents/${doc.id}/detect-placeholders`)
      setPlaceholders(res.data.placeholders || [])
      toast.success(`${res.data.placeholders?.length || 0} placeholders detectados`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al detectar')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div>
            <h3 className="font-bold text-lg text-[var(--text-main)]">Configurar Plantilla</h3>
            <p className="text-sm text-gray-500">{doc.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--sidebar-bg)] rounded-full"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="flex gap-2">
            <button
              onClick={handleDetect}
              disabled={isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {isPending ? 'Detectando...' : 'Detectar Placeholders'}
            </button>
          </div>

          {placeholders.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-[var(--text-main)]">Placeholders detectados:</h4>
              <div className="grid grid-cols-2 gap-2">
                {placeholders.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[var(--sidebar-bg)] rounded-lg text-sm">
                    <code className="text-purple-600 font-mono">{'{{'}{p.key}{'}}'}</code>
                    <span className="text-gray-500">-</span>
                    <span className="text-gray-700">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hay placeholders configurados. Haz clic en "Detectar Placeholders" para analizar el documento.</p>
          )}

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-medium">Variables disponibles:</p>
            <p className="mt-1">cliente.nombre, cliente.apellidos, cliente.dni, cliente.email, cliente.telefono...</p>
            <p className="mt-1 text-blue-600">Usa la sintaxis {'{{variable.subvariable}}'} en tu documento DOCX.</p>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cerrar</button>
          <button 
            onClick={onConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  )
}

function UploadBaseModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [isTemplate, setIsTemplate] = useState(false)
  const [requiresSignature, setRequiresSignature] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Selecciona un archivo')

    setIsPending(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name || file.name)
    formData.append('category', category)
    formData.append('isTemplate', isTemplate)
    formData.append('requiresSignature', requiresSignature)

    try {
      await api.post('/base-documents', formData)
      toast.success('Documento subido correctamente')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <h3 className="font-bold text-lg text-[var(--text-main)]">Subir Documento Base</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--sidebar-bg)] rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-5">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-blue-300 bg-[var(--sidebar-bg)]/50' : 'border-[var(--border-color)] hover:border-gray-300'
              }`}
          >
            <input
              type="file" id="file-upload" className="hidden"
              onChange={e => {
                const f = e.target.files[0]
                setFile(f)
                if (f && !name) setName(f.name)
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="mx-auto w-12 h-12 bg-[var(--card-bg)] shadow-sm border border-[var(--border-color)] rounded-full flex items-center justify-center mb-3">
                <Upload size={20} className={file ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[var(--text-main)] truncate max-w-[200px] mx-auto">{file.name}</p>
                  <p className="text-[10px] text-blue-600 uppercase">Archivo seleccionado</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-main)]">Haz clic para buscar</p>
                  <p className="text-xs text-gray-400">Cualquier tipo de archivo</p>
                </div>
              )}
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">NOMBRE DEL DOCUMENTO</label>
            <input
              type="text" className="input h-11" placeholder="Ej: Contrato de Arras Tipo"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">CATEGORÍA</label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTemplate}
                onChange={e => setIsTemplate(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-[var(--text-main)]">Es plantilla rellenable</span>
            </label>
            
            {isTemplate && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={requiresSignature}
                  onChange={e => setRequiresSignature(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-[var(--text-main)]">Requiere firma digital</span>
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-color)] font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
            >
              {isPending ? 'Subiendo...' : 'Confirmar subida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
