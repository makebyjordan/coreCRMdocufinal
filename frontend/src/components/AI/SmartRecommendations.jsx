import { useQuery } from '@tanstack/react-query'
import { Lightbulb, AlertCircle, CheckCircle, Zap } from 'lucide-react'
import api from '../../api/client'

export default function SmartRecommendations({ expedientId }) {
  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['expedient-recommendations', expedientId],
    queryFn: () => api.get(`/ai/expedient/${expedientId}/recommendations`).then(r => r.data),
    enabled: !!expedientId,
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded mb-4 w-1/3" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
      </div>
    )
  }

  if (error || !recommendations) return null

  const healthScore = recommendations.healthScore || 0
  const healthColor = healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="card p-6 space-y-4 border-l-4 border-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100">
            <Lightbulb size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-main)' }} className="font-semibold">
              Recomendaciones inteligentes
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs">
              Análisis generado por IA Claude
            </p>
          </div>
        </div>
      </div>

      {/* Health Score */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--sidebar-bg)]">
        <div>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium">Puntuación de salud</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 rounded-full bg-gray-300 overflow-hidden">
            <div
              className={`h-full ${
                healthScore >= 75 ? 'bg-green-600' : healthScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <span className={`font-bold text-sm ${healthColor}`}>{healthScore}/100</span>
        </div>
      </div>

      {/* Estimated days to close */}
      {recommendations.estimatedDaysToClose && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-1">
            Días estimados para cierre
          </p>
          <p className="text-lg font-bold text-blue-600">
            {recommendations.estimatedDaysToClose} días
          </p>
        </div>
      )}

      {/* Immediate Actions */}
      {recommendations.immediateActions && recommendations.immediateActions.length > 0 && (
        <div>
          <p style={{ color: 'var(--text-main)' }} className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" />
            Acciones inmediatas
          </p>
          <ul className="space-y-2">
            {recommendations.immediateActions.slice(0, 3).map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--text-main)]">
                <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optimizations */}
      {recommendations.optimizations && recommendations.optimizations.length > 0 && (
        <div>
          <p style={{ color: 'var(--text-main)' }} className="text-sm font-semibold mb-2">
            Optimizaciones recomendadas
          </p>
          <ul className="space-y-1">
            {recommendations.optimizations.slice(0, 2).map((opt, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--text-muted)]">
                <span className="text-blue-500">→</span>
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {recommendations.risks && recommendations.risks.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p style={{ color: 'var(--text-main)' }} className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-700">
            <AlertCircle size={16} />
            Riesgos identificados
          </p>
          <ul className="space-y-1">
            {recommendations.risks.slice(0, 2).map((risk, i) => (
              <li key={i} className="text-xs text-red-600 flex gap-2">
                <span className="font-bold">!</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
