import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import KanbanCard from './KanbanCard'
import { AlertCircle } from 'lucide-react'

const COLUMNS = [
  // Fases flujo estándar
  { id: 'CAPTACION', label: 'Captación', color: 'border-slate-400' },
  { id: 'VALORACION', label: 'Valoración', color: 'border-zinc-500' },
  { id: 'FORMULARIO', label: 'Formulario', color: 'border-blue-500' },
  { id: 'DOCUMENTACION', label: 'Documentación', color: 'border-indigo-500' },
  { id: 'VALIDACION', label: 'Validación', color: 'border-purple-500' },
  { id: 'ACUERDO', label: 'Acuerdo', color: 'border-yellow-500' },
  { id: 'MARKETING_FORMULARIO', label: 'Brief Mkt', color: 'border-orange-500' },
  { id: 'MARKETING_EJECUCION', label: 'Producción', color: 'border-rose-500' },
  { id: 'VISITAS', label: 'Visitas', color: 'border-pink-500' },
  { id: 'PREVENTA', label: 'Preventa', color: 'border-emerald-500' },
  { id: 'BUSQUEDA_ACTIVA', label: 'Búsqueda', color: 'border-teal-500' },
  { id: 'NEGOCIACION', label: 'Negociación', color: 'border-amber-500' },
  { id: 'ACUERDO_INTERESADO', label: 'Interesado', color: 'border-cyan-500' },
  { id: 'ARRAS', label: 'Arras', color: 'border-lime-500' },
  { id: 'HIPOTECA', label: 'Hipoteca', color: 'border-fuchsia-500' },
  { id: 'NOTARIA', label: 'Notaría', color: 'border-sky-500' },
  { id: 'CIERRE', label: 'Cierre', color: 'border-green-500' },
  { id: 'POSVENTA', label: 'Posventa', color: 'border-violet-500' },
  // Estados especiales
  { id: 'BLOQUEADO', label: 'Bloqueado', color: 'border-red-600' },
  { id: 'CERRADO', label: 'Cerrado', color: 'border-gray-600' },
  // Fases VENTA - Captación
  { id: 'CAPTACION_INMUEBLE', label: 'Captación Inmueble', color: 'border-stone-400' },
  { id: 'VALORACION_MERCADO', label: 'Valoración Mercado', color: 'border-stone-500' },
  { id: 'MANDATO_EXCLUSIVA', label: 'Mandato Exclusiva', color: 'border-stone-600' },
  { id: 'DOCUMENTACION_LEGAL', label: 'Doc. Legal', color: 'border-stone-700' },
  { id: 'PREPARACION_MARKETING', label: 'Prep. Marketing', color: 'border-stone-800' },
  { id: 'PUBLICACION_ACTIVO', label: 'Publicación Activo', color: 'border-stone-900' },
  // Fases VENTA - Comprador
  { id: 'CAPTACION_COMPRADOR', label: 'Captación Comprador', color: 'border-orange-400' },
  { id: 'GESTION_VISITAS', label: 'Gestión Visitas', color: 'border-orange-600' },
  { id: 'NEGOCIACION_PRECIO', label: 'Negociación Precio', color: 'border-orange-700' },
  { id: 'RESERVA_SENAL', label: 'Reserva/Señal', color: 'border-orange-800' },
  { id: 'ARRAS_PRIVADO', label: 'Arras Privado', color: 'border-orange-900' },
  { id: 'GESTION_HIPOTECA', label: 'Gestión Hipoteca', color: 'border-amber-400' },
  { id: 'PREPARACION_NOTARIA', label: 'Prep. Notaría', color: 'border-amber-600' },
  { id: 'FIRMA_ESCRITURA', label: 'Firma Escritura', color: 'border-amber-700' },
  { id: 'CIERRE_REGISTRO', label: 'Cierre Registro', color: 'border-amber-800' },
  { id: 'POSTVENTA_SEGUIMIENTO', label: 'Postventa Seguimiento', color: 'border-amber-900' },
  // Fases ALQUILER - Propietario
  { id: 'CAPTACION_PROPIEDAD', label: 'Captación Propiedad', color: 'border-cyan-400' },
  { id: 'VALORACION_RENTA', label: 'Valoración Renta', color: 'border-cyan-600' },
  { id: 'MANDATO_ALQUILER', label: 'Mandato Alquiler', color: 'border-cyan-700' },
  { id: 'DOCUMENTACION_INMUEBLE', label: 'Doc. Inmueble', color: 'border-cyan-800' },
  { id: 'MARKETING_DIFUSION', label: 'Marketing Difusión', color: 'border-cyan-900' },
  { id: 'GESTION_VISITAS_ALQ', label: 'Gestión Visitas Alq', color: 'border-teal-400' },
  // Fases ALQUILER - Inquilino
  { id: 'CAPTACION_INQUILINO', label: 'Captación Inquilino', color: 'border-emerald-400' },
  { id: 'PRESENTACION_INMUEBLES', label: 'Presentación Inmuebles', color: 'border-emerald-600' },
  { id: 'DOCUMENTACION_SOLVENCIA', label: 'Doc. Solvencia', color: 'border-emerald-700' },
  { id: 'VALIDACION_ECONOMICA', label: 'Validación Económica', color: 'border-emerald-800' },
  { id: 'NEGOCIACION_CONDICIONES', label: 'Negociación Condiciones', color: 'border-emerald-900' },
  { id: 'CONTRATO_ALQUILER', label: 'Contrato Alquiler', color: 'border-green-400' },
  { id: 'ENTREGA_INMUEBLE', label: 'Entrega Inmueble', color: 'border-green-600' },
  { id: 'GESTION_MENSUAL', label: 'Gestión Mensual', color: 'border-green-700' },
  // Fases INVERSIÓN
  { id: 'PERFILADO_INVERSOR', label: 'Perfilado Inversor', color: 'border-violet-400' },
  { id: 'KYC_SOLVENCIA', label: 'KYC Solvencia', color: 'border-violet-600' },
  { id: 'BUSQUEDA_ACTIVOS', label: 'Búsqueda Activos', color: 'border-violet-700' },
  { id: 'ANALISIS_FINANCIERO', label: 'Análisis Financiero', color: 'border-violet-800' },
  { id: 'DUE_DILIGENCE', label: 'Due Diligence', color: 'border-violet-900' },
  { id: 'NEGOCIACION_INV', label: 'Negociación Inv', color: 'border-purple-400' },
  { id: 'RESERVA_ACTIVO', label: 'Reserva Activo', color: 'border-purple-600' },
  { id: 'ARRAS_INVERSION', label: 'Arras Inversión', color: 'border-purple-700' },
  { id: 'FINANCIACION_INV', label: 'Financiación Inv', color: 'border-purple-800' },
  { id: 'CIERRE_COMPRA', label: 'Cierre Compra', color: 'border-purple-900' },
  { id: 'GESTION_POST_COMPRA', label: 'Gestión Post-Compra', color: 'border-fuchsia-400' },
]

export default function KanbanBoard({ filters }) {
  const { data: columns, isLoading, error } = useQuery({
    queryKey: ['kanban', filters],
    queryFn: () => api.get('/expedients/kanban').then(r => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando tablero...</div>
  if (error) return (
    <div className="flex items-center justify-center h-64 gap-2 text-red-500">
      <AlertCircle size={18} /> Error al cargar el tablero
    </div>
  )

  // Aplicar filtros locales
  const filter = (items = []) => {
    return items.filter(exp => {
      if (filters?.search) {
        const q = filters.search.toLowerCase()
        const match = exp.code.toLowerCase().includes(q)
          || exp.propertyAddress?.toLowerCase().includes(q)
          || exp.client?.firstName?.toLowerCase().includes(q)
          || exp.client?.lastName?.toLowerCase().includes(q)
          || exp.client?.companyName?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filters?.operationType && exp.operationType !== filters.operationType) return false
      if (filters?.status && exp.status !== filters.status) return false
      return true
    })
  }

  return (
    <div className="flex gap-3 overflow-x-auto h-full pb-4">
      {COLUMNS.map(col => {
        const cards = filter(columns?.[col.id] || [])
        return (
          <div key={col.id} className="flex-shrink-0 w-72 flex flex-col h-full bg-[var(--sidebar-bg)]/50 rounded-xl border border-[var(--border-color)] overflow-hidden">
            {/* Column header */}
            <div className={`px-4 py-3 bg-[var(--sidebar-bg)] border-t-4 ${col.color} flex items-center justify-between shadow-sm`}>
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">{col.label}</span>
              <span className="text-[10px] bg-[var(--bg-color)] border border-[var(--border-color)] rounded-full px-2 py-0.5 font-bold text-[var(--text-muted)]">
                {cards.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
              {cards.map(exp => (
                <Link key={exp.id} to={`/expedients/${exp.id}`}>
                  <KanbanCard expedient={exp} />
                </Link>
              ))}
              {cards.length === 0 && (
                <p className="text-center text-gray-400 text-xs py-4">Sin expedientes</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
