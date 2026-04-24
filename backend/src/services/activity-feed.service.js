/**
 * Activity Feed Service
 * Registra eventos de actividad en el timeline unificado
 * NO lanza errores al caller - si falla el log, solo warning y sigue
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../config/logger');

// Tipos de eventos estándar
const ACTIVITY_TYPES = {
  // Clientes
  CLIENT_CREATED: 'CLIENT_CREATED',
  CLIENT_UPDATED: 'CLIENT_UPDATED',
  CLIENT_LINKED_TO_EXPEDIENT: 'CLIENT_LINKED_TO_EXPEDIENT',

  // Expedientes
  EXPEDIENT_CREATED: 'EXPEDIENT_CREATED',
  EXPEDIENT_PHASE_CHANGED: 'EXPEDIENT_PHASE_CHANGED',
  EXPEDIENT_STATUS_CHANGED: 'EXPEDIENT_STATUS_CHANGED',
  EXPEDIENT_CLOSED: 'EXPEDIENT_CLOSED',

  // Documentos
  DOC_UPLOADED: 'DOC_UPLOADED',
  DOC_VALIDATED: 'DOC_VALIDATED',
  DOC_REJECTED: 'DOC_REJECTED',
  DOCUMENT_LINKED_TO_EXPEDIENT: 'DOCUMENT_LINKED_TO_EXPEDIENT',

  // Visitas y Firmas
  VISIT_CREATED: 'VISIT_CREATED',
  VISIT_UPDATED: 'VISIT_UPDATED',
  SIGNATURE_SENT: 'SIGNATURE_SENT',
  SIGNATURE_SIGNED: 'SIGNATURE_SIGNED',
  SIGNATURE_EXPIRED: 'SIGNATURE_EXPIRED',

  // Notas y Comunicaciones
  NOTE_CREATED: 'NOTE_CREATED',
  NOTE_PINNED: 'NOTE_PINNED',
  COMMUNICATION_SENT: 'COMMUNICATION_SENT',

  // Tareas
  TASK_CREATED: 'TASK_CREATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
};

/**
 * Registra una actividad en el timeline
 * @param {Object} params
 * @param {string} params.type - Tipo de actividad (de ACTIVITY_TYPES)
 * @param {string} params.title - Título descriptivo
 * @param {string} [params.description] - Descripción opcional
 * @param {string} [params.clientId] - ID del cliente relacionado
 * @param {string} [params.expedientId] - ID del expediente relacionado
 * @param {string} [params.userId] - ID del usuario que realiza la acción
 * @param {Object} [params.metadata] - Datos adicionales en JSON
 * @param {string} [params.relatedEntityType] - Tipo de entidad relacionada
 * @param {string} [params.relatedEntityId] - ID de entidad relacionada
 * @returns {Promise<Object|null>} ActivityEvent creado o null si falla
 */
async function recordActivity({
  type,
  title,
  description,
  clientId,
  expedientId,
  userId,
  metadata,
  relatedEntityType,
  relatedEntityId,
}) {
  try {
    // Crear el evento de actividad
    const activity = await prisma.activityEvent.create({
      data: {
        type,
        title,
        description,
        clientId,
        expedientId,
        userId,
        metadata,
        relatedEntityType,
        relatedEntityId,
      },
    });

    // Actualizar lastContactDate del cliente si hay clientId
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { lastContactDate: new Date() },
      });
    }

    return activity;
  } catch (error) {
    // NO lanzar error - solo loggear warning
    logger.warn('[ActivityFeed] Error al registrar actividad:', {
      error: error.message,
      type,
      clientId,
      expedientId,
    });
    return null;
  }
}

/**
 * Registra múltiples actividades (batch)
 * Útil para backfills o migraciones
 * @param {Array<Object>} activities - Array de parámetros para recordActivity
 * @returns {Promise<number>} Cantidad de actividades registradas
 */
async function recordActivitiesBatch(activities) {
  let count = 0;
  for (const activity of activities) {
    const result = await recordActivity(activity);
    if (result) count++;
  }
  return count;
}

/**
 * Obtiene el timeline de actividad de un cliente
 * @param {string} clientId
 * @param {Object} options
 * @param {string} [options.type] - Filtrar por tipo
 * @param {Date} [options.from] - Fecha desde
 * @param {Date} [options.to] - Fecha hasta
 * @param {number} [options.limit=50] - Límite de resultados
 * @param {number} [options.offset=0] - Offset para paginación
 * @returns {Promise<Array>} ActivityEvents
 */
async function getClientTimeline(clientId, { type, from, to, limit = 50, offset = 0 } = {}) {
  const where = {
    clientId,
    ...(type && { type }),
    ...(from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [events, total] = await Promise.all([
    prisma.activityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: { select: { id: true, name: true } },
        expedient: { select: { id: true, code: true } },
      },
    }),
    prisma.activityEvent.count({ where }),
  ]);

  return { events, total, limit, offset };
}

/**
 * Obtiene el timeline de actividad de un expediente
 * @param {string} expedientId
 * @param {Object} options
 * @returns {Promise<Array>} ActivityEvents
 */
async function getExpedientTimeline(expedientId, { type, from, to, limit = 50, offset = 0 } = {}) {
  const where = {
    expedientId,
    ...(type && { type }),
    ...(from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [events, total] = await Promise.all([
    prisma.activityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.activityEvent.count({ where }),
  ]);

  return { events, total, limit, offset };
}

/**
 * Genera un timeline agregado para un cliente incluyendo:
 * - ActivityEvents propios
 * - PhaseHistory de sus expedientes
 * Ordenado cronológicamente
 * @param {string} clientId
 * @param {Object} options
 * @returns {Promise<Array>} Timeline agregado
 */
async function getAggregatedTimeline(clientId, { limit = 100, offset = 0 } = {}) {
  // Obtener expedientes del cliente
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      expedients: { select: { id: true } },
      roles: { select: { expedientId: true } },
    },
  });

  if (!client) return { timeline: [], total: 0 };

  // Unificar IDs de expedientes
  const expedientIds = [
    ...client.expedients.map(e => e.id),
    ...client.roles.map(r => r.expedientId),
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  // Obtener activity events del cliente
  const activityEvents = await prisma.activityEvent.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      expedient: { select: { id: true, code: true } },
    },
  });

  // Obtener phase history de todos sus expedientes
  const phaseHistories = await prisma.phaseHistory.findMany({
    where: { expedientId: { in: expedientIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: { select: { id: true, name: true } },
      expedient: { select: { id: true, code: true } },
    },
  });

  // Merge y ordenar cronológicamente (descendente)
  const timeline = [
    ...activityEvents.map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      createdAt: e.createdAt,
      source: 'activity',
      user: e.user,
      expedient: e.expedient,
      metadata: e.metadata,
    })),
    ...phaseHistories.map(h => ({
      id: `ph-${h.id}`,
      type: ACTIVITY_TYPES.EXPEDIENT_PHASE_CHANGED,
      title: `Cambio de fase: ${h.fromPhase || 'Inicio'} → ${h.toPhase}`,
      description: h.notes,
      createdAt: h.createdAt,
      source: 'phase',
      user: h.changedBy,
      expedient: h.expedient,
      metadata: { fromPhase: h.fromPhase, toPhase: h.toPhase },
    })),
  ];

  // Ordenar por fecha descendente
  timeline.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = timeline.length;
  const paginated = timeline.slice(offset, offset + limit);

  return { timeline: paginated, total, limit, offset };
}

module.exports = {
  ACTIVITY_TYPES,
  recordActivity,
  recordActivitiesBatch,
  getClientTimeline,
  getExpedientTimeline,
  getAggregatedTimeline,
};
