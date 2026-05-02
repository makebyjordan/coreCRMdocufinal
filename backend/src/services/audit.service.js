const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * Registra una acción en el log de auditoría
 * @param {Object} params - { userId, action, expedientId, clientId, entityType, entityId, changes, req }
 */
async function logAction(params) {
  try {
    const {
      userId,
      action,
      expedientId = null,
      clientId = null,
      entityType,
      entityId,
      fieldChanged = null,
      oldValue = null,
      newValue = null,
      description = null,
      req = null,
    } = params;

    const ipAddress = req
      ? req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        req.ip
      : null;

    const userAgent = req?.headers['user-agent'] || null;

    const auditLog = await prisma.detailedActivityLog.create({
      data: {
        userId,
        action,
        expedientId,
        clientId,
        entityType,
        entityId,
        fieldChanged,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        description,
        ipAddress,
        userAgent,
      },
    });

    logger.info(`[Audit] ${action} on ${entityType} ${entityId} by user ${userId}`);
    return auditLog;
  } catch (error) {
    logger.error('[Audit] Error logging action:', error);
    // No lanzar error para no interrumpir flujos principales
  }
}

/**
 * Obtiene trail de auditoría completo de un expediente
 * @param {string} expedientId
 * @returns {Array} Actividades ordenadas por fecha
 */
async function getAuditTrail(expedientId) {
  try {
    const trail = await prisma.detailedActivityLog.findMany({
      where: { expedientId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
    });

    return trail;
  } catch (error) {
    logger.error('[Audit] Error getting audit trail:', error);
    throw error;
  }
}

/**
 * Obtiene historial de actividad de un usuario
 * @param {string} userId
 * @param {Object} dateRange - { from: Date, to: Date }
 * @returns {Array} Actividades del usuario
 */
async function getUserActivityLog(userId, dateRange = {}) {
  try {
    const where = {
      userId,
      ...(dateRange.from && dateRange.to && { timestamp: { gte: dateRange.from, lte: dateRange.to } }),
    };

    const activities = await prisma.detailedActivityLog.findMany({
      where,
      include: {
        expedient: { select: { code: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return activities;
  } catch (error) {
    logger.error('[Audit] Error getting user activity log:', error);
    throw error;
  }
}

/**
 * Obtiene historial de cambios de un campo específico
 * @param {string} expedientId
 * @param {string} fieldName - Nombre del campo que cambió
 * @returns {Array} Cambios del campo ordenados cronológicamente
 */
async function getChangeHistory(expedientId, fieldName) {
  try {
    const changes = await prisma.detailedActivityLog.findMany({
      where: {
        expedientId,
        fieldChanged: fieldName,
        action: 'UPDATED',
      },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'asc' },
    });

    return changes.map(c => ({
      timestamp: c.timestamp,
      changedBy: c.user.name,
      oldValue: c.oldValue,
      newValue: c.newValue,
    }));
  } catch (error) {
    logger.error('[Audit] Error getting change history:', error);
    throw error;
  }
}

/**
 * Exporta log de auditoría para GDPR compliance
 * @param {Object} params - { expedientId, clientId, dateRange }
 * @returns {Array} Registros de auditoría
 */
async function exportAuditLog(params = {}) {
  try {
    const { expedientId = null, clientId = null, dateRange = {} } = params;

    const where = {};
    if (expedientId) where.expedientId = expedientId;
    if (clientId) where.clientId = clientId;
    if (dateRange.from && dateRange.to) {
      where.timestamp = {
        gte: dateRange.from,
        lte: dateRange.to,
      };
    }

    const logs = await prisma.detailedActivityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        expedient: { select: { code: true } },
        client: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    logger.info(`[Audit] Exported ${logs.length} audit logs`);

    return logs;
  } catch (error) {
    logger.error('[Audit] Error exporting audit log:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de auditoría
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Object} Estadísticas
 */
async function getAuditStatistics(dateFrom, dateTo) {
  try {
    const logs = await prisma.detailedActivityLog.findMany({
      where: {
        timestamp: { gte: dateFrom, lte: dateTo },
      },
    });

    const byAction = {};
    const byUser = {};
    const byEntityType = {};

    logs.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byUser[log.userId] = (byUser[log.userId] || 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      dateRange: { from: dateFrom, to: dateTo },
      byAction,
      byUser,
      byEntityType,
    };
  } catch (error) {
    logger.error('[Audit] Error getting audit statistics:', error);
    throw error;
  }
}

/**
 * Crea un registro de auditoría en la tabla AuditLog (más compacta)
 * @param {Object} params
 */
async function createAuditRecord(params) {
  try {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      changes = null,
      ipAddress = null,
      userAgent = null,
    } = params;

    const record = await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        changes,
        ipAddress,
        userAgent,
      },
    });

    return record;
  } catch (error) {
    logger.error('[Audit] Error creating audit record:', error);
  }
}

/**
 * Busca registros de auditoría por recurso
 * @param {string} resourceType
 * @param {string} resourceId
 * @returns {Array} Registros de auditoría
 */
async function getResourceAuditLog(resourceType, resourceId) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
    });

    return logs;
  } catch (error) {
    logger.error('[Audit] Error getting resource audit log:', error);
    throw error;
  }
}

/**
 * Detecta actividades sospechosas
 * @param {string} userId
 * @returns {Array} Actividades anómalas detectadas
 */
async function detectSuspiciousActivity(userId) {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    // Obtener actividades en la última hora
    const recentLogs = await prisma.detailedActivityLog.findMany({
      where: {
        userId,
        timestamp: { gte: lastHour },
      },
    });

    // Detectar patrones anómalos
    const anomalies = [];

    // Demasiadas acciones en poco tiempo (más de 50 en 1 hora)
    if (recentLogs.length > 50) {
      anomalies.push({
        type: 'EXCESSIVE_ACTIVITY',
        description: `${recentLogs.length} acciones en la última hora`,
        severity: 'MEDIUM',
      });
    }

    // Demasiados intentos fallidos de cierta acción
    const failedActions = recentLogs.filter(l => l.action === 'DELETED').length;
    if (failedActions > 10) {
      anomalies.push({
        type: 'EXCESSIVE_DELETIONS',
        description: `${failedActions} eliminaciones en la última hora`,
        severity: 'HIGH',
      });
    }

    return anomalies;
  } catch (error) {
    logger.error('[Audit] Error detecting suspicious activity:', error);
    throw error;
  }
}

module.exports = {
  logAction,
  getAuditTrail,
  getUserActivityLog,
  getChangeHistory,
  exportAuditLog,
  getAuditStatistics,
  createAuditRecord,
  getResourceAuditLog,
  detectSuspiciousActivity,
};
