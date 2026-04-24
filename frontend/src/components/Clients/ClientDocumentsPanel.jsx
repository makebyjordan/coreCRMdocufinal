import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, ExternalLink, FolderOpen,
  File, Image, FileSpreadsheet, FileCode, Search,
  Filter
} from 'lucide-react'
import api from '../../api/client'

const TYPE_ICONS = {
  DNI: FileText,
  NIE: FileText,
  PASAPORTE: FileText,
  NOMINA: FileSpreadsheet,
  IRPF: FileSpreadsheet,
  CONTRATO: FileText,
  ESCRITURA: FileText,
  HIPOTECA: FileText,
  CATASTRO: FileText,
  RECIBO: FileSpreadsheet,
  SEGURO: FileText,
  FOTO: Image,
  OTRO: File,
}

const STATUS_COLORS = {
  PENDIENTE: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  VALIDADO: 'bg-green-500/10 text-green-600 border-green-200',
  RECHAZADO: 'bg-red-500/10 text-red-600 border-red-200',
}

export default function ClientDocumentsPanel({ clientId }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: documents, isLoading } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: () => api.get(`/clients/${clientId}/documents?limit=100`).then(r => r.data.data),
    enabled: !!clientId,
  })

  const filteredDocs = documents?.filter(doc => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && doc.docType !== typeFilter) return false
    return true
  })

  const uniqueTypes = [...new Set(documents?.map(d => d.docType) || [])]

  if (isLoading) return <div className="text-center py-10 text-gray-400">Cargando documentos...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <FileText size={16} className="text-[var(--primary-color)]" />
          Biblioteca de documentos
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input text-sm py-1.5 pl-8 w-48"
              placeholder="Buscar documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select text-sm py-1.5"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de documentos */}
      {filteredDocs?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDocs.map(doc => {
            const Icon = TYPE_ICONS[doc.docType] || File
            const statusClass = STATUS_COLORS[doc.status] || STATUS_COLORS.PENDIENTE

            return (
              <div key={doc.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--sidebar-bg)] flex items-center justify-center text-[var(--primary-color)] shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-main)] truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge text-[10px] bg-[var(--sidebar-bg)]">
                        {doc.docType}
                      </span>
                      <span className={`badge text-[10px] border ${statusClass}`}>
                        {doc.status}
                      </span>
                    </div>
                    {doc.expedient && (
                      <a
                        href={`/expedients/${doc.expedient.id}`}
                        className="text-[10px] text-[var(--primary-color)] hover:underline mt-1 flex items-center gap-1"
                      >
                        <FolderOpen size={10} /> {doc.expedient.code}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                  </span>
                  <div className="flex items-center gap-1">
                    {doc.driveUrl ? (
                      <a
                        href={doc.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-[var(--primary-color)] rounded transition-colors"
                        title="Ver en Drive"
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <a
                        href={`${api.defaults.baseURL}/documents/${doc.id}/download`}
                        className="p-1.5 text-gray-400 hover:text-[var(--primary-color)] rounded transition-colors"
                        title="Descargar"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <FileText size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin documentos registrados</p>
          <p className="text-xs text-gray-300 mt-1">
            Los documentos del cliente aparecerán aquí
          </p>
        </div>
      )}
    </div>
  )
}
