import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Wand2, FileText, Download, Copy, Loader } from 'lucide-react'
import api from '../../api/client'

const TEMPLATE_TYPES = [
  { value: 'CONTRATO', label: 'Contrato de compraventa' },
  { value: 'OFERTA', label: 'Oferta de compra' },
  { value: 'PROPUESTA', label: 'Propuesta de precio' },
  { value: 'DOCUMENTO_INFORMATIVO', label: 'Documento informativo' },
  { value: 'MANDATO', label: 'Mandato de venta' },
  { value: 'CARTA_PRESENTACION', label: 'Carta de presentación' },
]

export default function TemplateGenerator({ expedientId }) {
  const [selectedType, setSelectedType] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const queryClient = useQueryClient()

  const { data: templates = [] } = useQuery({
    queryKey: ['expedient-templates', expedientId],
    queryFn: () => api.get(`/ai/expedient/${expedientId}/templates`).then(r => r.data || []),
    enabled: !!expedientId,
  })

  const generateMutation = useMutation({
    mutationFn: (templateType) =>
      api.post(`/ai/expedient/${expedientId}/generate-template`, { templateType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedient-templates', expedientId] })
      setSelectedType('')
    },
  })

  const handleGenerate = () => {
    if (selectedType) {
      generateMutation.mutate(selectedType)
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 style={{ color: 'var(--text-main)' }} className="font-semibold flex items-center gap-2">
          <Wand2 size={18} className="text-purple-500" />
          Generador de plantillas inteligentes
        </h3>
      </div>

      {/* Selector de tipo */}
      <div>
        <label style={{ color: 'var(--text-main)' }} className="block text-sm font-medium mb-2">
          Tipo de plantilla
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="select w-full"
        >
          <option value="">Seleccionar tipo...</option>
          {TEMPLATE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Botón generar */}
      <button
        onClick={handleGenerate}
        disabled={!selectedType || generateMutation.isPending}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {generateMutation.isPending ? (
          <>
            <Loader size={16} className="animate-spin" />
            Generando plantilla...
          </>
        ) : (
          <>
            <Wand2 size={16} />
            Generar plantilla
          </>
        )}
      </button>

      {/* Plantillas generadas */}
      {templates.length > 0 && (
        <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium">
            Plantillas generadas ({templates.length})
          </p>

          {templates.map((template) => (
            <div key={template.id} className="p-3 rounded-lg border border-[var(--border-color)] space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p style={{ color: 'var(--text-main)' }} className="font-medium text-sm">
                    {template.title}
                  </p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                    {template.templateType}
                  </p>
                </div>
              </div>

              {template.description && (
                <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                  {template.description}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <FileText size={12} />
                  {showPreview === template.id ? 'Ocultar' : 'Vista previa'}
                </button>
                <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Download size={12} />
                  Descargar
                </button>
                <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Copy size={12} />
                  Copiar
                </button>
              </div>

              {showPreview === template.id && template.content && (
                <div className="mt-2 p-3 bg-[var(--sidebar-bg)] rounded border border-[var(--border-color)] overflow-y-auto max-h-60">
                  <div
                    className="prose prose-sm text-xs"
                    dangerouslySetInnerHTML={{ __html: template.content.substring(0, 500) + '...' }}
                  />
                </div>
              )}

              {template.variables && template.variables.length > 0 && (
                <div className="text-xs text-[var(--text-muted)]">
                  <p className="font-medium mb-1">Variables disponibles:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(v => (
                      <code key={v} className="bg-[var(--sidebar-bg)] px-2 py-1 rounded">
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ color: 'var(--text-muted)' }} className="text-xs">
        Las plantillas se generan personalizadas con datos del expediente y se pueden editar.
      </p>
    </div>
  )
}
