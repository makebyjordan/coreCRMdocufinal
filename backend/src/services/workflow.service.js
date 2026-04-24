const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const checklistGenerator = require('./checklist.generator');
const notificationEngine = require('./notification.engine');
const logger = require('../config/logger');

/**
 * Mapa de transiciones de fase del flujo de trabajo.
 * Para fases condicionales (SÍ/NO), se usa el campo "decision".
 */
const TRANSITIONS = {
  CAPTACION:             { next: 'VALORACION' },
  VALORACION:            { next: 'FORMULARIO' },
  FORMULARIO:            { next: 'DOCUMENTACION' },
  DOCUMENTACION:         { next: 'VALIDACION' },
  VALIDACION:            {
    next: 'ACUERDO',
    conditional: true,
    onNo: 'BLOQUEADO',
  },
  ACUERDO:               { next: 'MARKETING_FORMULARIO' },
  MARKETING_FORMULARIO:  { next: 'MARKETING_EJECUCION' },
  MARKETING_EJECUCION:   { next: 'VISITAS' },
  VISITAS:               { next: 'PREVENTA' },
  PREVENTA:              { next: 'BUSQUEDA_ACTIVA' },
  BUSQUEDA_ACTIVA:       {
    next: 'NEGOCIACION',
    conditional: true,
    onNo: 'ACUERDO',
  },
  NEGOCIACION:           { next: 'ACUERDO_INTERESADO' },
  ACUERDO_INTERESADO:    { next: 'ARRAS' },
  ARRAS:                 { 
    next: 'HIPOTECA',
    conditional: true,
    onNo: 'NOTARIA', // Si no requiere hipoteca, salta a Notaría
  },
  HIPOTECA:              { next: 'NOTARIA' },
  NOTARIA:               { next: 'CIERRE' },
  CIERRE:                {
    next: 'POSVENTA',
    conditional: true,
    onNo: 'ACUERDO',
  },
  POSVENTA:              { next: 'CERRADO' },
};

/**
 * Transiciones específicas para INQUILINO.
 * Flujo: Captación → Formulario → Documentación → Validación → Visitas → Negociación → Acuerdo → Cierre → Posventa
 * Excluye fases de venta: Valoración, Marketing, Preventa, Búsqueda, Arras, Hipoteca, Notaría
 */
const INQUILINO_TRANSITIONS = {
  CAPTACION:             { next: 'FORMULARIO' },              // Salta valoración
  FORMULARIO:            { next: 'DOCUMENTACION' },
  DOCUMENTACION:         { next: 'VALIDACION' },
  VALIDACION:            {
    next: 'VISITAS',                                           // Pasa directo a visitas
    conditional: true,
    onNo: 'BLOQUEADO',
  },
  VISITAS:               { next: 'NEGOCIACION' },              // De visitas a negociación directa
  NEGOCIACION:           { next: 'ACUERDO_INTERESADO' },
  ACUERDO_INTERESADO:    { next: 'CIERRE' },                   // Salta arras/hipoteca/notaría
  CIERRE:                { next: 'POSVENTA' },
  POSVENTA:              { next: 'CERRADO' },
};

/**
 * Transiciones específicas para PROPIETARIO (Alquiler).
 * Flujo: Captación → Valoración → Formulario → Documentación → Acuerdo → Marketing (Brief) → Mkt (Ejecución) → Visitas → Negociación → Cierre → Posventa
 * Excluye fases de venta: Preventa, Búsqueda, Arras, Hipoteca, Notaría
 */
const PROPIETARIO_TRANSITIONS = {
  CAPTACION:             { next: 'VALORACION' },
  VALORACION:            { next: 'FORMULARIO' },
  FORMULARIO:            { next: 'DOCUMENTACION' },
  DOCUMENTACION:         { next: 'ACUERDO' },
  ACUERDO:               { next: 'MARKETING_FORMULARIO' },
  MARKETING_FORMULARIO:  { next: 'MARKETING_EJECUCION' },
  MARKETING_EJECUCION:   { next: 'VISITAS' },
  VISITAS:               { next: 'NEGOCIACION' },
  NEGOCIACION:           { next: 'CIERRE' },
  CIERRE:                { next: 'POSVENTA' },
  POSVENTA:              { next: 'CERRADO' },
};

/**
 * Transiciones específicas para INVERSION_HOLDERS (Inversores).
 * Flujo: Captación (Perfilado) → Formulario (Criterios) → Documentación (KYC) → Búsqueda Activa → Valoración (Análisis ROI) → Visitas → Negociación (Oferta) → Arras → Cierre → Posventa
 */
const INVERSION_TRANSITIONS = {
  CAPTACION:             { next: 'FORMULARIO' },
  FORMULARIO:            { next: 'DOCUMENTACION' },
  DOCUMENTACION:         { next: 'BUSQUEDA_ACTIVA' },
  BUSQUEDA_ACTIVA:       { next: 'VALORACION' },
  VALORACION:            { next: 'VISITAS' },
  VISITAS:               { next: 'NEGOCIACION' },
  NEGOCIACION:           { next: 'ARRAS' },
  ARRAS:                 { next: 'CIERRE' },
  CIERRE:                { next: 'POSVENTA' },
  POSVENTA:              { next: 'CERRADO' },
};

/**
 * Flujo VENTA - Lado Captación/Vendedor (expedientRole = 'CAPTACION')
 * 6 fases: desde la captación del inmueble hasta la publicación del activo
 */
const VENTA_CAPTACION_TRANSITIONS = {
  CAPTACION_INMUEBLE:     { next: 'VALORACION_MERCADO' },
  VALORACION_MERCADO:     { next: 'MANDATO_EXCLUSIVA' },
  MANDATO_EXCLUSIVA:      { next: 'DOCUMENTACION_LEGAL' },
  DOCUMENTACION_LEGAL:    { next: 'PREPARACION_MARKETING' },
  PREPARACION_MARKETING:  { next: 'PUBLICACION_ACTIVO' },
  PUBLICACION_ACTIVO:     { next: 'CERRADO' },
};

/**
 * Flujo VENTA - Lado Comprador/Negociación (expedientRole = 'VENTA' o 'COMPRA')
 * 10 fases: desde la captación del comprador hasta la postventa
 */
const VENTA_COMPRADOR_TRANSITIONS = {
  CAPTACION_COMPRADOR:   { next: 'GESTION_VISITAS' },
  GESTION_VISITAS:       { next: 'NEGOCIACION_PRECIO' },
  NEGOCIACION_PRECIO:    { next: 'RESERVA_SENAL' },
  RESERVA_SENAL:         { next: 'ARRAS_PRIVADO' },
  ARRAS_PRIVADO:         {
    next: 'GESTION_HIPOTECA',
    conditional: true,
    onNo: 'PREPARACION_NOTARIA',
  },
  GESTION_HIPOTECA:      { next: 'PREPARACION_NOTARIA' },
  PREPARACION_NOTARIA:   { next: 'FIRMA_ESCRITURA' },
  FIRMA_ESCRITURA:       { next: 'CIERRE_REGISTRO' },
  CIERRE_REGISTRO:       { next: 'POSTVENTA_SEGUIMIENTO' },
  POSTVENTA_SEGUIMIENTO: { next: 'CERRADO' },
};

/**
 * Flujo ALQUILER - Lado Propietario (expedientRole = 'PROPIETARIO_ALQUILER')
 * 6 fases: captación del inmueble hasta la gestión de visitas
 */
const ALQUILER_PROPIETARIO_TRANSITIONS = {
  CAPTACION_PROPIEDAD:  { next: 'VALORACION_RENTA' },
  VALORACION_RENTA:     { next: 'MANDATO_ALQUILER' },
  MANDATO_ALQUILER:     { next: 'DOCUMENTACION_INMUEBLE' },
  DOCUMENTACION_INMUEBLE: { next: 'MARKETING_DIFUSION' },
  MARKETING_DIFUSION:   { next: 'GESTION_VISITAS_ALQ' },
  GESTION_VISITAS_ALQ:  { next: 'CERRADO' },
};

/**
 * Flujo ALQUILER - Lado Inquilino (expedientRole = 'INQUILINO_ALQUILER')
 * 8 fases: captación del inquilino hasta la gestión mensual
 */
const ALQUILER_INQUILINO_TRANSITIONS = {
  CAPTACION_INQUILINO:      { next: 'PRESENTACION_INMUEBLES' },
  PRESENTACION_INMUEBLES:   { next: 'DOCUMENTACION_SOLVENCIA' },
  DOCUMENTACION_SOLVENCIA:  { next: 'VALIDACION_ECONOMICA' },
  VALIDACION_ECONOMICA:     {
    next: 'NEGOCIACION_CONDICIONES',
    conditional: true,
    onNo: 'BLOQUEADO',
  },
  NEGOCIACION_CONDICIONES:  { next: 'CONTRATO_ALQUILER' },
  CONTRATO_ALQUILER:        { next: 'ENTREGA_INMUEBLE' },
  ENTREGA_INMUEBLE:         { next: 'GESTION_MENSUAL' },
  GESTION_MENSUAL:          { next: 'CERRADO' },
};

/**
 * Flujo INVERSIÓN - Completo (operationType = INVERSION con expedientRole = 'INVERSION')
 * 11 fases: perfilado inversor hasta gestión post-compra
 */
const INVERSION_COMPLETO_TRANSITIONS = {
  PERFILADO_INVERSOR:    { next: 'KYC_SOLVENCIA' },
  KYC_SOLVENCIA:         { next: 'BUSQUEDA_ACTIVOS' },
  BUSQUEDA_ACTIVOS:      { next: 'ANALISIS_FINANCIERO' },
  ANALISIS_FINANCIERO:   { next: 'DUE_DILIGENCE' },
  DUE_DILIGENCE:         { next: 'NEGOCIACION_INV' },
  NEGOCIACION_INV:       { next: 'RESERVA_ACTIVO' },
  RESERVA_ACTIVO:        { next: 'ARRAS_INVERSION' },
  ARRAS_INVERSION:       {
    next: 'FINANCIACION_INV',
    conditional: true,
    onNo: 'CIERRE_COMPRA',
  },
  FINANCIACION_INV:      { next: 'CIERRE_COMPRA' },
  CIERRE_COMPRA:         { next: 'GESTION_POST_COMPRA' },
  GESTION_POST_COMPRA:   { next: 'CERRADO' },
};

const PHASE_LABELS = {
  CAPTACION: 'Captación',
  VALORACION: 'Valoración',
  FORMULARIO: 'Formulario inicial',
  DOCUMENTACION: 'Documentación',
  VALIDACION: 'Validación',
  ACUERDO: 'Acuerdo / Exclusiva',
  MARKETING_FORMULARIO: 'Brief Marketing',
  MARKETING_EJECUCION: 'Producción Mkt',
  VISITAS: 'Registro de Visitas',
  PREVENTA: 'Lanzamiento Preventa',
  BUSQUEDA_ACTIVA: 'Búsqueda activa',
  NEGOCIACION: 'Negociación',
  ACUERDO_INTERESADO: 'Propuesta / Señal',
  ARRAS: 'Contrato de Arras',
  HIPOTECA: 'Gestión Hipotecaria',
  NOTARIA: 'Notaría y Firmas',
  CIERRE: 'Cierre de operación',
  POSVENTA: 'Posventa',
  CERRADO: 'Finalizado',
};

// Etiquetas para los nuevos flujos de fases
const NEW_PHASE_LABELS = {
  CAPTACION_INMUEBLE:     'Captación del inmueble',
  VALORACION_MERCADO:     'Valoración de mercado',
  MANDATO_EXCLUSIVA:      'Mandato / Exclusiva',
  DOCUMENTACION_LEGAL:    'Documentación legal',
  PREPARACION_MARKETING:  'Preparación marketing',
  PUBLICACION_ACTIVO:     'Publicación del activo',
  CAPTACION_COMPRADOR:    'Captación comprador',
  GESTION_VISITAS:        'Gestión de visitas',
  NEGOCIACION_PRECIO:     'Negociación de precio',
  RESERVA_SENAL:          'Reserva / Señal',
  ARRAS_PRIVADO:          'Contrato de arras',
  GESTION_HIPOTECA:       'Gestión hipotecaria',
  PREPARACION_NOTARIA:    'Preparación notaría',
  FIRMA_ESCRITURA:        'Firma escritura',
  CIERRE_REGISTRO:        'Cierre y registro',
  POSTVENTA_SEGUIMIENTO:  'Seguimiento postventa',
  CAPTACION_PROPIEDAD:    'Captación de propiedad',
  VALORACION_RENTA:       'Valoración de renta',
  MANDATO_ALQUILER:       'Mandato de alquiler',
  DOCUMENTACION_INMUEBLE: 'Documentación inmueble',
  MARKETING_DIFUSION:     'Marketing y difusión',
  GESTION_VISITAS_ALQ:    'Gestión de visitas',
  CAPTACION_INQUILINO:    'Captación inquilino',
  PRESENTACION_INMUEBLES: 'Presentación inmuebles',
  DOCUMENTACION_SOLVENCIA:'Documentación solvencia',
  VALIDACION_ECONOMICA:   'Validación económica',
  NEGOCIACION_CONDICIONES:'Negociación condiciones',
  CONTRATO_ALQUILER:      'Contrato de alquiler',
  ENTREGA_INMUEBLE:       'Entrega del inmueble',
  GESTION_MENSUAL:        'Gestión mensual',
  PERFILADO_INVERSOR:     'Perfilado del inversor',
  KYC_SOLVENCIA:          'KYC y solvencia',
  BUSQUEDA_ACTIVOS:       'Búsqueda de activos',
  ANALISIS_FINANCIERO:    'Análisis financiero',
  DUE_DILIGENCE:          'Due diligence',
  NEGOCIACION_INV:        'Negociación',
  RESERVA_ACTIVO:         'Reserva de activo',
  ARRAS_INVERSION:        'Arras inversión',
  FINANCIACION_INV:       'Financiación',
  CIERRE_COMPRA:          'Cierre de compra',
  GESTION_POST_COMPRA:    'Gestión post-compra',
};

const ALL_PHASE_LABELS = { ...PHASE_LABELS, ...NEW_PHASE_LABELS };

const PHASE_GROUPS = {
  CAPTACION: ['CAPTACION_INMUEBLE','VALORACION_MERCADO','MANDATO_EXCLUSIVA','DOCUMENTACION_LEGAL','PREPARACION_MARKETING','PUBLICACION_ACTIVO'],
  VENTA: ['CAPTACION_COMPRADOR','GESTION_VISITAS','NEGOCIACION_PRECIO','RESERVA_SENAL','ARRAS_PRIVADO','GESTION_HIPOTECA','PREPARACION_NOTARIA','FIRMA_ESCRITURA','CIERRE_REGISTRO','POSTVENTA_SEGUIMIENTO'],
  PROPIETARIO_ALQUILER: ['CAPTACION_PROPIEDAD','VALORACION_RENTA','MANDATO_ALQUILER','DOCUMENTACION_INMUEBLE','MARKETING_DIFUSION','GESTION_VISITAS_ALQ'],
  INQUILINO_ALQUILER: ['CAPTACION_INQUILINO','PRESENTACION_INMUEBLES','DOCUMENTACION_SOLVENCIA','VALIDACION_ECONOMICA','NEGOCIACION_CONDICIONES','CONTRATO_ALQUILER','ENTREGA_INMUEBLE','GESTION_MENSUAL'],
  INVERSION: ['PERFILADO_INVERSOR','KYC_SOLVENCIA','BUSQUEDA_ACTIVOS','ANALISIS_FINANCIERO','DUE_DILIGENCE','NEGOCIACION_INV','RESERVA_ACTIVO','ARRAS_INVERSION','FINANCIACION_INV','CIERRE_COMPRA','GESTION_POST_COMPRA'],
};

/**
 * Selecciona el mapa de transiciones correcto según tipo y rol del expediente.
 */
function selectTransitionMap(expedient) {
  const role = expedient.expedientRole;

  // Flujos nuevos basados en expedientRole
  if (role === 'CAPTACION')           return VENTA_CAPTACION_TRANSITIONS;
  if (role === 'VENTA' || role === 'COMPRA') return VENTA_COMPRADOR_TRANSITIONS;
  if (role === 'PROPIETARIO_ALQUILER') return ALQUILER_PROPIETARIO_TRANSITIONS;
  if (role === 'INQUILINO_ALQUILER')  return ALQUILER_INQUILINO_TRANSITIONS;
  if (role === 'INVERSION')           return INVERSION_COMPLETO_TRANSITIONS;

  // Flujos legacy por operationType
  if (expedient.operationType === 'INQUILINO')         return INQUILINO_TRANSITIONS;
  if (expedient.operationType === 'PROPIETARIO')       return PROPIETARIO_TRANSITIONS;
  if (expedient.operationType === 'INVERSION_HOLDERS') return INVERSION_TRANSITIONS;

  return TRANSITIONS;
}

/**
 * Determina la siguiente fase basada en el contexto del expediente.
 */
async function getNextPhase(expedient, currentPhase, decision) {
  const transitionMap = selectTransitionMap(expedient);
  const transition = transitionMap[currentPhase];

  if (transition) {
    if (transition.conditional) {
      if (!decision) return null;
      return decision === 'NO' ? transition.onNo : transition.next;
    }
    // Excepción legacy: COMPRA salta valoración
    if (currentPhase === 'CAPTACION' && expedient.operationType === 'COMPRA' && !expedient.expedientRole) {
      return 'FORMULARIO';
    }
    return transition.next;
  }

  // LÓGICA DINÁMICA: buscar por orden de plantillas si no hay mapa hardcoded
  const templates = await prisma.checklistTemplate.findMany({
    where: { operationType: expedient.operationType, active: true },
    orderBy: { order: 'asc' },
  });

  const uniquePhases = [];
  const seen = new Set();
  for (const t of templates) {
    if (!seen.has(t.phase)) {
      uniquePhases.push(t.phase);
      seen.add(t.phase);
    }
  }

  const currentIdx = uniquePhases.indexOf(currentPhase);
  if (currentIdx !== -1 && currentIdx < uniquePhases.length - 1) {
    return uniquePhases[currentIdx + 1];
  }

  return null;
}

/**
 * Avanzar un expediente a la siguiente fase del flujo.
 * @param {Object} expedient - El expediente actual (con datos completos)
 * @param {Object} user - El usuario que realiza la acción
 * @param {string} notes - Notas opcionales
 * @param {string} decision - 'SI' o 'NO' para fases condicionales
 */
async function advance(expedient, user, notes, decision) {
  const currentPhase = expedient.currentPhase;

  const transitionMap = selectTransitionMap(expedient);
  const transition = transitionMap[currentPhase];

  if (!transition) {
    return { error: `No hay transición definida desde la fase ${currentPhase}` };
  }

  // Verificar que la checklist actual esté completa antes de avanzar
  const checklistOk = await checklistGenerator.isPhaseComplete(expedient.id, currentPhase);
  if (!checklistOk) {
    return { error: 'Hay ítems obligatorios del checklist sin completar en esta fase.' };
  }

  // Verificar bloqueos por expedientes vinculados
  try {
    const { validateAdvanceWithLinks } = require('./expedientLinksValidator.service')
    const blockers = await validateAdvanceWithLinks(expedient.id)
    if (blockers.length > 0) {
      const msg = blockers.map(b => `${b.code} debe estar en ${b.requiredPhase} (ahora: ${b.currentPhase})`).join('; ')
      return { error: `Avance bloqueado por expedientes vinculados: ${msg}` }
    }
  } catch (_) { /* no bloquear si el módulo no existe */ }

  // Determinar la siguiente fase inteligentemente
  let nextPhase = await getNextPhase(expedient, currentPhase, decision);
  
  if (transition.conditional && !decision) {
    return { error: 'Esta fase requiere una decisión: SI o NO' };
  }

  let newStatus = 'ACTIVO';
  if (nextPhase === 'BLOQUEADO') {
    newStatus = 'BLOQUEADO';
    nextPhase = currentPhase; // Se queda en la misma fase pero bloqueado
  }

  // Registrar cambio de fase
  await prisma.phaseHistory.create({
    data: {
      expedientId: expedient.id,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      changedById: user?.id,
      notes,
    },
  });

  // Actualizar el expediente
  const updated = await prisma.expedient.update({
    where: { id: expedient.id },
    data: { currentPhase: nextPhase, status: newStatus },
    include: {
      client: true,
      assignments: { include: { user: true } },
    },
  });

  // Generar checklists para la nueva fase
  if (nextPhase !== currentPhase) {
    await checklistGenerator.generateForPhase(
      expedient.id, nextPhase,
      expedient.operationType, expedient.operationSize
    );
  }

  // Disparar notificaciones según la transición
  await notificationEngine.onPhaseTransition(updated, currentPhase, nextPhase, decision);

  // Notificar a expedientes que tenían este como bloqueo y ya están desbloqueados
  try {
    const { checkAndNotifyUnblockedLinks } = require('./expedientLinksValidator.service')
    await checkAndNotifyUnblockedLinks(expedient.id, nextPhase, prisma)
  } catch (_) {}

  logger.info(`[Workflow] Expediente ${expedient.code}: ${currentPhase} → ${nextPhase}`);

  return {
    expedient: updated,
    fromPhase: currentPhase,
    toPhase: nextPhase,
    label: PHASE_LABELS[nextPhase] || nextPhase,
  };
}

module.exports = { advance, PHASE_LABELS, ALL_PHASE_LABELS, NEW_PHASE_LABELS, PHASE_GROUPS, TRANSITIONS };
