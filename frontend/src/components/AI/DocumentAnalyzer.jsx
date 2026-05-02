import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileText, Loader, AlertCircle, CheckCircle2, Eye, BarChart3 } from 'lucide-react'
import api from '../../api/client'

export default function DocumentAnalyzer({ documentId, documentContent }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showExtracted, setShowExtracted] = useState(false)

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['document-analysis', documentId],
    queryFn: () => api.get(`/ai/document/${documentId}/analysis`).then(r => r.data),
    enabled: !!documentId,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => {
      if (!documentContent) {
        throw new Error('Se requiere contenido del documento')
      }
      return api.post(`/ai/document/${documentId}/analyze`, {
        content: documentContent,
      })
    },
  })

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      await analyzeMutation.mutateAsync()
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (isLoading && !analysis) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded mb-4 w-1/3" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="card p-6 border-l-4 border-blue-500 space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold">
            Análisis de documento con IA
          </h3>
        </div>

        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          Analiza el contenido del documento usando IA para extraer datos, validar integridad y detectar problemas.
        </p>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !documentContent || analyzeMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isAnalyzing || analyzeMutation.isPending ? (
            <>
              <Loader size={16} className="animate-spin" />
              Analizando documento...
            </>
          ) : (
            <>
              <BarChart3 size={16} />
              Analizar documento
            </>
          )}
        </button>

        {analyzeMutation.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <p className="text-xs text-red-700">{analyzeMutation.error.message}</p>
          </div>
        )}
      </div>
    )
  }

  // Display analysis results
  const completeness = analysis.completeness || 0
  const confidence = analysis.confidence || 0

  return (
    <div className="card p-6 border-l-4 border-green-500 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-100">
            <FileText size={20} className="text-green-600" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-main)' }} className="font-semibold">
              Análisis completado
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs">
              Tipo detectado: {analysis.detectedType || 'Desconocido'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[var(--sidebar-bg)]">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-1">
            Integridad
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-300 overflow-hidden">
              <div
                className={`h-full ${completeness >= 90 ? 'bg-green-600' : completeness >= 70 ? 'bg-yellow-600' : 'bg-red-600'}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="font-bold text-sm">{completeness}%</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--sidebar-bg)]">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-1">
            Confianza
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-300 overflow-hidden">
              <div
                className={`h-full ${confidence >= 85 ? 'bg-green-600' : confidence >= 70 ? 'bg-yellow-600' : 'bg-orange-600'}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="font-bold text-sm">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* Extracted Data */}
      {analysis.extractedData && Object.keys(analysis.extractedData).length > 0 && (
        <div>
          <button
            onClick={() => setShowExtracted(!showExtracted)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <Eye size={14} />
              Datos extraídos ({Object.keys(analysis.extractedData).length})
            </div>
            <span>{showExtracted ? '▼' : '▶'}</span>
          </button>

          {showExtracted && (
            <div className="mt-2 p-3 bg-[var(--sidebar-bg)] rounded space-y-2">
              {Object.entries(analysis.extractedData).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <p style={{ color: 'var(--text-muted)' }} className="font-medium">
                    {key}
                  </p>
                  <p style={{ color: 'var(--text-main)' }} className="ml-2 break-words">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {analysis.alerts && analysis.alerts.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 space-y-2">
          <p className="text-xs font-medium text-yellow-800 flex items-center gap-1">
            <AlertCircle size={14} />
            Alertas detectadas ({analysis.alerts.length})
          </p>
          <ul className="space-y-1">
            {analysis.alerts.slice(0, 3).map((alert, i) => (
              <li key={i} className="text-xs text-yellow-700 flex gap-2">
                <span>!</span>
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      {analysis.recommendedAction && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs font-medium text-blue-900 mb-1 flex items-center gap-1">
            <CheckCircle2 size={14} />
            Acción recomendada
          </p>
          <p className="text-xs text-blue-800">{analysis.recommendedAction}</p>
        </div>
      )}

      <p style={{ color: 'var(--text-muted)' }} className="text-xs">
        Análisis generado por IA Claude - Basado en contenido OCR del documento
      </p>
    </div>
  )
}
