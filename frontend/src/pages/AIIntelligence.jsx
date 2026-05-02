import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Users, FileText, Zap, TrendingUp, ArrowLeft } from 'lucide-react'
import ClientPredictionWidget from '../components/AI/ClientPredictionWidget'
import DormantClientDetector from '../components/AI/DormantClientDetector'
import SmartRecommendations from '../components/AI/SmartRecommendations'
import TemplateGenerator from '../components/AI/TemplateGenerator'
import DocumentAnalyzer from '../components/AI/DocumentAnalyzer'

export default function AIIntelligencePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="btn-secondary px-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Brain size={24} className="text-purple-600" />
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Inteligencia Artificial</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">
            Funciones impulsadas por Claude AI para automatizar y optimizar tu negocio inmobiliario
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{ borderColor: 'var(--border-color)' }}
        className="flex gap-8 border-b"
      >
        {[
          { id: 'overview', label: 'Resumen', icon: Brain },
          { id: 'predictions', label: 'Predicciones', icon: TrendingUp },
          { id: 'dormant', label: 'Clientes inactivos', icon: Users },
          { id: 'templates', label: 'Plantillas inteligentes', icon: FileText },
          { id: 'documents', label: 'Análisis OCR', icon: Zap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-[var(--primary-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div
                style={{ backgroundColor: 'var(--primary-color)' }}
                className="absolute bottom-0 left-0 right-0 h-0.5"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6 space-y-4">
              <h3 style={{ color: 'var(--text-main)' }} className="font-semibold text-lg flex items-center gap-2">
                <Brain size={20} className="text-purple-600" />
                Función 1: Predicción de Valor de Cliente
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Análisis inteligente del potencial de cada cliente basado en su historial, operaciones y comportamiento.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-main)]">
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Valor estimado anual en comisiones
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Probabilidad de cierre de operaciones
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Recomendaciones personalizadas
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Identificación de factores de riesgo
                </li>
              </ul>
              <button className="btn-primary w-full text-sm" onClick={() => setActiveTab('predictions')}>
                Ver predicciones
              </button>
            </div>

            <div className="card p-6 space-y-4">
              <h3 style={{ color: 'var(--text-main)' }} className="font-semibold text-lg flex items-center gap-2">
                <Users size={20} className="text-orange-600" />
                Función 2: Detección de Clientes Dormidos
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Identifica clientes sin actividad y genera planes de reactivación personalizados.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-main)]">
                <li className="flex gap-2">
                  <span className="text-orange-500">✓</span>
                  Detección automática de clientes inactivos
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">✓</span>
                  Análisis de razones de inactividad
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">✓</span>
                  Planes de reactivación inteligentes
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">✓</span>
                  Mensajes personalizados de contacto
                </li>
              </ul>
              <button className="btn-primary w-full text-sm" onClick={() => setActiveTab('dormant')}>
                Ver análisis
              </button>
            </div>

            <div className="card p-6 space-y-4">
              <h3 style={{ color: 'var(--text-main)' }} className="font-semibold text-lg flex items-center gap-2">
                <Zap size={20} className="text-yellow-600" />
                Función 3: Recomendaciones Inteligentes
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Análisis en tiempo real de cada expediente con recomendaciones para acelerar cierre.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-main)]">
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Acciones inmediatas por fase
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Identificación de riesgos operacionales
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Estimación de días para cierre
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Puntuación de salud del expediente
                </li>
              </ul>
              <button className="btn-primary w-full text-sm">
                Acceder desde detalles de expediente
              </button>
            </div>

            <div className="card p-6 space-y-4">
              <h3 style={{ color: 'var(--text-main)' }} className="font-semibold text-lg flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Función 4 & 5: Plantillas + OCR
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Generación automática de documentos y análisis inteligente de contenido.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-main)]">
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Plantillas personalizadas por expediente
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Extracción automática de datos (OCR)
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Validación de integridad de documentos
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  Detección de datos faltantes
                </li>
              </ul>
              <button className="btn-primary w-full text-sm" onClick={() => setActiveTab('templates')}>
                Generar plantillas
              </button>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 style={{ color: 'var(--text-main)' }} className="font-semibold mb-4">
                Búsqueda de cliente
              </h3>
              <input
                type="text"
                placeholder="Buscar cliente por nombre, DNI o código..."
                className="input w-full mb-4"
              />
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                Ingresa los datos de un cliente para ver su predicción de valor y recomendaciones
              </p>
            </div>
            <div className="card p-6">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Las predicciones se generan analizando:
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--text-main)]">
                <li className="flex gap-2">
                  <span className="text-green-500">→</span>
                  Historial completo de operaciones
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">→</span>
                  Valor y tipos de operaciones
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">→</span>
                  Patrón de actividad
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">→</span>
                  Ciclo de vida del cliente
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'dormant' && (
          <div>
            <DormantClientDetector />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="card p-6">
            <p style={{ color: 'var(--text-muted)' }} className="mb-4">
              Las plantillas inteligentes se generan desde los detalles de cada expediente.
              Accede a un expediente para generar plantillas personalizadas.
            </p>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Los tipos de plantillas disponibles incluyen: Contratos, Ofertas, Propuestas, Documentos informativos, Mandatos y más.
            </p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card p-6">
            <p style={{ color: 'var(--text-muted)' }} className="mb-4">
              El análisis OCR de documentos se ejecuta desde la sección de Documentos de cada expediente.
            </p>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Carga documentos escaneados o con imagen para que IA extraiga datos automáticamente y valide la integridad.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
