const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * Configura un atajo de teclado para un usuario
 * @param {string} userId
 * @param {string} shortcutKey - Ej: 'ctrl+e', 'cmd+shift+s'
 * @param {string} action - Ej: 'CREATE_EXPEDIENT', 'SEARCH', 'TOGGLE_PHASE'
 */
async function setKeyboardShortcut(userId, shortcutKey, action) {
  try {
    const prefs = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        shortcuts: async (current) => {
          const shortcuts = current || {};
          shortcuts[shortcutKey] = action;
          return shortcuts;
        },
      },
      create: {
        userId,
        shortcuts: { [shortcutKey]: action },
      },
    });

    logger.info(`[Productivity] Shortcut set for user ${userId}: ${shortcutKey} → ${action}`);

    return prefs.shortcuts;
  } catch (error) {
    logger.error('[Productivity] Error setting keyboard shortcut:', error);
    throw error;
  }
}

/**
 * Obtiene todos los atajos de teclado del usuario
 * @param {string} userId
 * @returns {Object} Atajos guardados
 */
async function getShortcuts(userId) {
  try {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId },
      select: { shortcuts: true },
    });

    return prefs?.shortcuts || {};
  } catch (error) {
    logger.error('[Productivity] Error getting shortcuts:', error);
    throw error;
  }
}

/**
 * Ejecuta una acción en lote sobre múltiples expedientes
 * @param {string} userId
 * @param {string} actionType - CHANGE_PHASE, ASSIGN_USER, ADD_TAG, etc
 * @param {Array} expedientIds
 * @param {Object} parameters - { phase, assignedTo, tags, etc }
 * @returns {Object} BulkAction creado
 */
async function executeBulkAction(userId, actionType, expedientIds, parameters) {
  try {
    if (expedientIds.length === 0) {
      throw new Error('No expedients selected');
    }

    const bulkAction = await prisma.bulkAction.create({
      data: {
        userId,
        type: actionType,
        expedientIds,
        parameters,
        status: 'EXECUTING',
        totalCount: expedientIds.length,
      },
    });

    // Ejecutar en background
    executeBulkActionAsync(bulkAction.id, actionType, expedientIds, parameters).catch(err =>
      logger.error('[Productivity] Error in background bulk action:', err)
    );

    logger.info(
      `[Productivity] Bulk action started: ${actionType} on ${expedientIds.length} expedients`
    );

    return bulkAction;
  } catch (error) {
    logger.error('[Productivity] Error executing bulk action:', error);
    throw error;
  }
}

/**
 * Ejecuta la acción en lote (llamado en background)
 */
async function executeBulkActionAsync(bulkActionId, actionType, expedientIds, parameters) {
  let successCount = 0;
  let failureCount = 0;
  let errorLog = [];

  try {
    for (const expedientId of expedientIds) {
      try {
        if (actionType === 'CHANGE_PHASE') {
          await prisma.expedient.update({
            where: { id: expedientId },
            data: { currentPhase: parameters.phase },
          });
        } else if (actionType === 'ASSIGN_USER') {
          await prisma.expedientAssignment.upsert({
            where: {
              expedientId_role_userId: {
                expedientId,
                role: parameters.role,
                userId: parameters.assignedTo,
              },
            },
            update: { isPrimary: true },
            create: {
              expedientId,
              userId: parameters.assignedTo,
              role: parameters.role || 'COMERCIAL',
              isPrimary: true,
            },
          });
        } else if (actionType === 'ADD_TAG') {
          const expedient = await prisma.expedient.findUnique({
            where: { id: expedientId },
            select: { tags: true },
          });
          // Los tags se guardarían en metadatos o en una tabla separada
        }
        successCount++;
      } catch (e) {
        failureCount++;
        errorLog.push(`Expedient ${expedientId}: ${e.message}`);
      }
    }

    // Actualizar estado del bulk action
    await prisma.bulkAction.update({
      where: { id: bulkActionId },
      data: {
        status: failureCount === 0 ? 'COMPLETED' : 'COMPLETED',
        successCount,
        failureCount,
        errorLog: errorLog.join('\n'),
        completedAt: new Date(),
      },
    });

    logger.info(
      `[Productivity] Bulk action completed: ${successCount} success, ${failureCount} failed`
    );
  } catch (error) {
    logger.error('[Productivity] Fatal error in bulk action:', error);
    await prisma.bulkAction.update({
      where: { id: bulkActionId },
      data: {
        status: 'FAILED',
        errorLog: error.message,
      },
    });
  }
}

/**
 * Obtiene estado de una acción en lote
 * @param {string} bulkActionId
 * @returns {Object} BulkAction con estado
 */
async function getBulkActionStatus(bulkActionId) {
  try {
    const bulkAction = await prisma.bulkAction.findUnique({
      where: { id: bulkActionId },
      select: {
        id: true,
        type: true,
        status: true,
        totalCount: true,
        successCount: true,
        failureCount: true,
        errorLog: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return bulkAction;
  } catch (error) {
    logger.error('[Productivity] Error getting bulk action status:', error);
    throw error;
  }
}

/**
 * Duplica un expediente con overrides opcionales
 * @param {string} sourceExpedientId
 * @param {Object} overrides - Cambios a aplicar { propertyCity, operationType, etc }
 * @returns {Object} Nuevo expediente duplicado
 */
async function duplicateExpedient(sourceExpedientId, overrides = {}) {
  try {
    const source = await prisma.expedient.findUnique({
      where: { id: sourceExpedientId },
    });

    if (!source) throw new Error('Source expedient not found');

    // Generar nuevo código
    const newCode = await generateExpedientCode();

    const newExpedient = await prisma.expedient.create({
      data: {
        code: newCode,
        clientId: source.clientId,
        operationType: overrides.operationType || source.operationType,
        operationSize: overrides.operationSize || source.operationSize,
        currentPhase: 'CAPTACION',
        status: 'ACTIVO',
        propertyAddress: overrides.propertyAddress || source.propertyAddress,
        propertyCity: overrides.propertyCity || source.propertyCity,
        propertyPrice: overrides.propertyPrice || source.propertyPrice,
        propertyM2: overrides.propertyM2 || source.propertyM2,
        propertyRooms: overrides.propertyRooms || source.propertyRooms,
        propertyBaths: overrides.propertyBaths || source.propertyBaths,
        exclusivityMonths: source.exclusivityMonths,
      },
    });

    logger.info(
      `[Productivity] Expedient duplicated: ${sourceExpedientId} → ${newExpedient.id}`
    );

    return newExpedient;
  } catch (error) {
    logger.error('[Productivity] Error duplicating expedient:', error);
    throw error;
  }
}

/**
 * Genera nuevo código de expediente (YYYY-NNNN)
 */
async function generateExpedientCode() {
  const year = new Date().getFullYear();
  const count = await prisma.expedient.count();
  return `EXP-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Obtiene disponibilidad de un usuario en un período
 * Basado en calendario de eventos
 * @param {string} userId
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Object} Disponibilidad por fecha
 */
async function getCalendarAvailability(userId, dateFrom, dateTo) {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        id: true,
        date: true,
        title: true,
        allDay: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { date: 'asc' },
    });

    // Agrupar por fecha
    const availabilityMap = {};
    const current = new Date(dateFrom);

    while (current <= dateTo) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.date.toISOString().split('T')[0] === dateStr);

      availabilityMap[dateStr] = {
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
        allDayEvent: dayEvents.some(e => e.allDay),
        events: dayEvents,
      };

      current.setDate(current.getDate() + 1);
    }

    return availabilityMap;
  } catch (error) {
    logger.error('[Productivity] Error getting calendar availability:', error);
    throw error;
  }
}

/**
 * Obtiene plantillas de expedientes guardadas para duplicación rápida
 * @param {string} userId
 * @returns {Array} Expedientes marcados como plantilla
 */
async function getExpedientTemplates(userId) {
  try {
    // Esto podría implementarse marcando ciertos expedientes como "template"
    // Por ahora, devolvemos expedientes completados del usuario con buen desempeño
    const templates = await prisma.expedient.findMany({
      where: {
        status: 'COMPLETADO',
        assignments: {
          some: {
            userId,
            role: 'COMERCIAL',
          },
        },
      },
      select: {
        id: true,
        code: true,
        operationType: true,
        operationSize: true,
        closedAt: true,
      },
      orderBy: { closedAt: 'desc' },
      take: 5,
    });

    return templates;
  } catch (error) {
    logger.error('[Productivity] Error getting expedient templates:', error);
    throw error;
  }
}

module.exports = {
  setKeyboardShortcut,
  getShortcuts,
  executeBulkAction,
  getBulkActionStatus,
  duplicateExpedient,
  getCalendarAvailability,
  getExpedientTemplates,
};
