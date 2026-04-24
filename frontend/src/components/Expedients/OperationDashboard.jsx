import { CheckCircle, Clock, AlertTriangle, TrendingUp, Home, Users, FileText, Calendar } from 'lucide-react'

const ALL_PHASE_LABELS = {
  // Flujo estándar
  CAPTACION: 'Captación', VALORACION: 'Valoración', FORMULARIO: 'Formulario', DOCUMENTACION: 'Documentación',
  VALIDACION: 'Validación', ACUERDO: 'Acuerdo/Exclusiva', MARKETING_FORMULARIO: 'Brief Marketing',
  MARKETING_EJECUCION: 'Producción Mkt', VISITAS: 'Visitas', PREVENTA: 'Preventa',
  BUSQUEDA_ACTIVA: 'Búsqueda activa', NEGOCIACION: 'Negociación', ACUERDO_INTERESADO: 'Propuesta/Señal',
  ARRAS: 'Arras', HIPOTECA: 'Hipoteca', NOTARIA: 'Notaría', CIERRE: 'Cierre', POSVENTA: 'Posventa',
  // Estados especiales
  CERRADO: 'Finalizado', CANCELADO: 'Cancelado', BLOQUEADO: 'Bloqueado',
  // VENTA - Captación
  CAPTACION_INMUEBLE: 'Captación inmueble', VALORACION_MERCADO: 'Valoración mercado',
  MANDATO_EXCLUSIVA: 'Mandato/Exclusiva', DOCUMENTACION_LEGAL: 'Doc. legal',
  PREPARACION_MARKETING: 'Prep. marketing', PUBLICACION_ACTIVO: 'Publicación',
  // VENTA - Comprador
  CAPTACION_COMPRADOR: 'Captación comprador', GESTION_VISITAS: 'Gestión visitas',
  NEGOCIACION_PRECIO: 'Negociación precio', RESERVA_SENAL: 'Reserva/Señal',
  ARRAS_PRIVADO: 'Arras', GESTION_HIPOTECA: 'Hipoteca',
  PREPARACION_NOTARIA: 'Prep. notaría', FIRMA_ESCRITURA: 'Firma escritura',
  CIERRE_REGISTRO: 'Cierre/Registro', POSTVENTA_SEGUIMIENTO: 'Postventa',
  // ALQUILER - Propietario
  CAPTACION_PROPIEDAD: 'Captación propiedad', VALORACION_RENTA: 'Valoración renta',
  MANDATO_ALQUILER: 'Mandato alquiler', DOCUMENTACION_INMUEBLE: 'Doc. inmueble',
  MARKETING_DIFUSION: 'Marketing/Difusión', GESTION_VISITAS_ALQ: 'Visitas',
  // ALQUILER - Inquilino
  CAPTACION_INQUILINO: 'Captación inquilino', PRESENTACION_INMUEBLES: 'Presentación',
  DOCUMENTACION_SOLVENCIA: 'Doc. solvencia', VALIDACION_ECONOMICA: 'Validación económica',
  NEGOCIACION_CONDICIONES: 'Negociación', CONTRATO_ALQUILER: 'Contrato alquiler',
  ENTREGA_INMUEBLE: 'Entrega inmueble', GESTION_MENSUAL: 'Gestión mensual',
  // INVERSIÓN
  PERFILADO_INVERSOR: 'Perfilado inversor', KYC_SOLVENCIA: 'KYC solvencia',
  BUSQUEDA_ACTIVOS: 'Búsqueda activos', ANALISIS_FINANCIERO: 'Análisis financiero',
  DUE_DILIGENCE: 'Due diligence', NEGOCIACION_INV: 'Negociación',
  RESERVA_ACTIVO: 'Reserva activo', ARRAS_INVERSION: 'Arras inversión',
  FINANCIACION_INV: 'Financiación', CIERRE_COMPRA: 'Cierre compra',
  GESTION_POST_COMPRA: 'Gestión post-compra',
}

function getPhaseLabel(phase) {
  return ALL_PHASE_LABELS[phase] || phase
}

function StatusBadge({ status }) {
  const cfg = {
    ACTIVO:     { color: 'bg-green-500/20 text-green-400',  icon: '●', label: 'En curso' },
    COMPLETADO: { color: 'bg-blue-500/20 text-blue-400',    icon: '✓', label: 'Completado' },
    BLOQUEADO:  { color: 'bg-red-500/20 text-red-400',      icon: '✗', label: 'Bloqueado' },
    CANCELADO:  { color: 'bg-gray-500/20 text-gray-400',    icon: '—', label: 'Cancelado' },
  }[status] || { color: 'bg-gray-500/20 text-gray-400', icon: '?', label: status }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

export default function OperationDashboard({ exp }) {
  if (!exp) return null

  const docs = exp.documents || []
  const checklists = exp.checklists || []
  const visits = exp.visits || []

  // Métricas de documentos
  const totalDocs = docs.length
  const validatedDocs = docs.filter(d => d.status === 'VALIDADO').length
  const pendingDocs = docs.filter(d => d.status === 'PENDIENTE').length
  const rejectedDocs = docs.filter(d => d.status === 'RECHAZADO').length

  // Métricas de checklists por fase actual
  const currentChecklists = checklists.filter(c => c.phase === exp.currentPhase)
  const totalItems = currentChecklists.reduce((a, c) => a + (c.items?.length || 0), 0)
  const completedItems = currentChecklists.reduce((a, c) => a + (c.items?.filter(i => i.completed).length || 0), 0)
  const checklistPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Métricas de visitas
  const highInterest = visits.filter(v => v.interestLevel === 'HIGH').length
  const midInterest  = visits.filter(v => v.interestLevel === 'MID').length

  // Exclusividad
  const exclusivityDaysLeft = exp.exclusivityEnd
    ? Math.ceil((new Date(exp.exclusivityEnd) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // Arras deadline
  const arrasDaysLeft = exp.arrasDeadline
    ? Math.ceil((new Date(exp.arrasDeadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // Valor de comisión calculado
  const commissionValue = exp.commissionFixed
    ? Number(exp.commissionFixed)
    : exp.commissionPercent && exp.propertyPrice
      ? (Number(exp.propertyPrice) * Number(exp.commissionPercent)) / 100
      : null

  return (
    <div className="space-y-4">
      {/* Cabecera operación */}
      <div className="card p-5 border-l-4 border-[var(--primary-color)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Home size={18} className="text-[var(--primary-color)]" />
              <h3 className="font-bold text-lg text-[var(--text-main)]">
                {exp.propertyAddress || 'Sin dirección'}
              </h3>
              <StatusBadge status={exp.status} />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {exp.operationType} · {exp.code}
              {exp.expedientRole && (
                <span className="ml-2 px-2 py-0.5 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-[10px] font-bold uppercase">
                  {exp.expedientRole}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--text-main)]">
              {exp.propertyPrice ? `${Number(exp.propertyPrice).toLocaleString('es-ES')} €` : '—'}
            </p>
            {exp.valuationEstimated && Number(exp.valuationEstimated) !== Number(exp.propertyPrice) && (
              <p className="text-xs text-[var(--text-muted)]">
                Valoración: {Number(exp.valuationEstimated).toLocaleString('es-ES')} €
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Fase actual */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-[var(--primary-color)]" />
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Fase actual</p>
          </div>
          <p className="font-bold text-[var(--text-main)] text-sm leading-tight">{getPhaseLabel(exp.currentPhase)}</p>
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
              <span>Checklist</span>
              <span>{completedItems}/{totalItems}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-color)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${checklistPct === 100 ? 'bg-green-500' : 'bg-[var(--primary-color)]'}`}
                style={{ width: `${checklistPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Documentos */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={15} className="text-blue-500" />
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Documentos</p>
          </div>
          <p className="font-bold text-[var(--text-main)] text-xl">{totalDocs}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-green-400">{validatedDocs} validados</span>
            {pendingDocs > 0 && <span className="text-[10px] text-yellow-400">{pendingDocs} pend.</span>}
            {rejectedDocs > 0 && <span className="text-[10px] text-red-400">{rejectedDocs} rech.</span>}
          </div>
        </div>

        {/* Visitas */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-purple-500" />
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Visitas</p>
          </div>
          <p className="font-bold text-[var(--text-main)] text-xl">{visits.length}</p>
          <div className="flex gap-2 mt-1">
            {highInterest > 0 && <span className="text-[10px] text-green-400">{highInterest} alto interés</span>}
            {midInterest > 0 && <span className="text-[10px] text-blue-400">{midInterest} medio</span>}
          </div>
        </div>

        {/* Comisión */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={15} className="text-green-500" />
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Comisión</p>
          </div>
          <p className="font-bold text-[var(--text-main)] text-sm">
            {commissionValue ? `${commissionValue.toLocaleString('es-ES')} €` : '—'}
          </p>
          <div className="flex gap-2 mt-1">
            <span className={`text-[10px] ${exp.commissionInvoiced ? 'text-green-400' : 'text-gray-400'}`}>
              {exp.commissionInvoiced ? '✓ Facturada' : '○ Sin facturar'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas de plazos */}
      {(exclusivityDaysLeft !== null || arrasDaysLeft !== null || rejectedDocs > 0) && (
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-[var(--text-main)]">
            <AlertTriangle size={15} className="text-yellow-500" />
            Plazos y alertas
          </h4>
          <div className="space-y-2">
            {exclusivityDaysLeft !== null && (
              <div className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                exclusivityDaysLeft < 0 ? 'bg-red-500/10 border border-red-500/30' :
                exclusivityDaysLeft < 15 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                'bg-green-500/10 border border-green-500/30'
              }`}>
                <span className="text-[var(--text-muted)]">Exclusividad hasta</span>
                <span className={`font-bold text-sm ${
                  exclusivityDaysLeft < 0 ? 'text-red-400' :
                  exclusivityDaysLeft < 15 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {exclusivityDaysLeft < 0
                    ? `Vencida hace ${Math.abs(exclusivityDaysLeft)} días`
                    : `${exclusivityDaysLeft} días restantes`}
                </span>
              </div>
            )}
            {arrasDaysLeft !== null && (
              <div className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                arrasDaysLeft < 0 ? 'bg-red-500/10 border border-red-500/30' :
                arrasDaysLeft < 7 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                'bg-blue-500/10 border border-blue-500/30'
              }`}>
                <span className="text-[var(--text-muted)]">Vencimiento arras</span>
                <span className={`font-bold ${
                  arrasDaysLeft < 0 ? 'text-red-400' :
                  arrasDaysLeft < 7 ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {arrasDaysLeft < 0
                    ? `Vencido hace ${Math.abs(arrasDaysLeft)} días`
                    : `${arrasDaysLeft} días restantes`}
                </span>
              </div>
            )}
            {rejectedDocs > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30">
                <span className="text-[var(--text-muted)]">Documentos rechazados</span>
                <span className="font-bold text-red-400">{rejectedDocs} doc{rejectedDocs !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notaría próxima */}
      {exp.notaryDate && (
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-[var(--text-main)]">
            <Calendar size={15} className="text-blue-500" />
            Próxima cita
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-main)]">{exp.notaryName || 'Notaría'}</p>
              {exp.notaryAddress && <p className="text-xs text-[var(--text-muted)]">{exp.notaryAddress}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold text-[var(--primary-color)]">
                {new Date(exp.notaryDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {Math.ceil((new Date(exp.notaryDate) - new Date()) / (1000 * 60 * 60 * 24))} días
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compradores/interesados destacados */}
      {(exp.buyers || []).length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3 text-[var(--text-main)]">Interesados activos</h4>
          <div className="space-y-2">
            {(exp.buyers || []).filter(b => !b.accepted).slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">
                    {b.name.charAt(0)}
                  </div>
                  <span className="text-[var(--text-main)]">{b.name}</span>
                </div>
                {b.offer && (
                  <span className="font-bold text-[var(--primary-color)]">
                    {Number(b.offer).toLocaleString('es-ES')} €
                  </span>
                )}
              </div>
            ))}
            {(exp.buyers || []).length > 3 && (
              <p className="text-xs text-[var(--text-muted)]">+{(exp.buyers || []).length - 3} más</p>
            )}
          </div>
        </div>
      )}

      {/* Gastos de operación (nuevos campos) */}
      {(exp.notaryFees || exp.registryFees || exp.taxesAmount) && (
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3 text-[var(--text-main)]">Desglose de gastos</h4>
          <dl className="space-y-2 text-sm">
            {exp.notaryFees && (
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Gastos notaría</dt>
                <dd className="font-medium">{Number(exp.notaryFees).toLocaleString('es-ES')} €</dd>
              </div>
            )}
            {exp.registryFees && (
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Registro propiedad</dt>
                <dd className="font-medium">{Number(exp.registryFees).toLocaleString('es-ES')} €</dd>
              </div>
            )}
            {exp.taxesAmount && (
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Impuestos (ITP/AJD)</dt>
                <dd className="font-medium">{Number(exp.taxesAmount).toLocaleString('es-ES')} €</dd>
              </div>
            )}
            {exp.notaryFees && exp.registryFees && exp.taxesAmount && (
              <div className="flex justify-between border-t pt-2 font-bold">
                <dt className="text-[var(--text-main)]">Total gastos</dt>
                <dd className="text-[var(--primary-color)]">
                  {(Number(exp.notaryFees || 0) + Number(exp.registryFees || 0) + Number(exp.taxesAmount || 0)).toLocaleString('es-ES')} €
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
