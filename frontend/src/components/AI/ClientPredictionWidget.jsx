import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertCircle, Target, Zap } from 'lucide-react'
import api from '../../api/client'

export default function ClientPredictionWidget({ clientId }) {
  const { data: prediction, isLoading, error, isFetching } = useQuery({
    queryKey: ['client-prediction', clientId],
    queryFn: () => api.get(`/ai/client/${clientId}/prediction`).then(r => r.data),
    enabled: !!clientId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  })

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded mb-4 w-1/3" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 border-l-4 border-yellow-500 bg-yellow-50">
        <div className="flex gap-3">
          <AlertCircle size={20} className="text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-900">Error en predicción</p>
            <p className="text-xs text-yellow-700">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!prediction) return null

  const segmentColor = {
    VIP: 'bg-purple-100 text-purple-800 border-purple-300',
    NORMAL: 'bg-blue-100 text-blue-800 border-blue-300',
    RIESGO: 'bg-red-100 text-red-800 border-red-300',
  }[prediction.recommendedSegment] || 'bg-gray-100 text-gray-800'

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <h3 style={{ color: 'var(--text-main)' }} className="font-semibold">
            Predicción de valor
          </h3>
          {isFetching && <Zap size={14} className="text-yellow-500 animate-spin" />}
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-[var(--sidebar-bg)]">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-1">
            Valor anual estimado
          </p>
          <p style={{ color: 'var(--primary-color)' }} className="text-lg font-bold">
            €{prediction.annualValueForecast?.toLocaleString() || '—'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-[var(--sidebar-bg)]">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-1">
            Probabilidad de cierre
          </p>
          <p style={{ color: 'var(--primary-color)' }} className="text-lg font-bold">
            {prediction.closureProbability || '—'}%
          </p>
        </div>
      </div>

      {/* Segment */}
      <div>
        <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-2">
          Segmentación recomendada
        </p>
        <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold border ${segmentColor}`}>
          {prediction.recommendedSegment}
        </span>
      </div>

      {/* Recommendations */}
      {prediction.recommendations && prediction.recommendations.length > 0 && (
        <div>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-2 flex items-center gap-1">
            <Target size={14} /> Recomendaciones
          </p>
          <ul className="space-y-1">
            {prediction.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="text-xs text-[var(--text-main)] flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk factors */}
      {prediction.riskFactors && prediction.riskFactors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs font-medium mb-2 flex items-center gap-1 text-red-700">
            <AlertCircle size={14} /> Factores de riesgo
          </p>
          <ul className="space-y-1">
            {prediction.riskFactors.slice(0, 2).map((risk, i) => (
              <li key={i} className="text-xs text-red-700 flex gap-2">
                <span className="font-bold">!</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ color: 'var(--text-muted)' }} className="text-xs">
        Generado por IA Claude - Actualizar cada 7 días
      </p>
    </div>
  )
}
