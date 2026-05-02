const { isAdmin, isCommercial, userHasAnyRole } = require('../utils/roleHelper');
const { prisma } = require('../config/db');
const auditService = require('../services/audit.service');
const logger = require('../config/logger');

/**
 * GET /audit/trail/:expedientId
 * Obtener historial completo de cambios en expediente
 */
async function getAuditTrail(req, res) {
  try {
    const { expedientId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const trail = await auditService.getAuditTrail(expedientId);
    const paginated = trail.slice(offset, offset + limit);

    res.json({
      expedientId,
      totalChanges: trail.length,
      changes: paginated,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('[Audit] Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
}

/**
 * GET /audit/user-activity/:userId
 * Actividad de usuario en rango de fechas
 */
async function getUserActivityLog(req, res) {
  try {
    const { userId } = req.params;
    const { dateFrom, dateTo, limit = 100, offset = 0 } = req.query;

    // Restricción: usuarios pueden ver su propia actividad, ADMIN ve todo
    if (req.user.id !== userId && !userHasAnyRole(req.user, 'ADMINISTRACION') && !userHasAnyRole(req.user, 'DIRECCION')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const log = await auditService.getUserActivityLog(userId, {
      from: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: dateTo ? new Date(dateTo) : new Date(),
    });

    const paginated = log.slice(offset, offset + limit);

    res.json({
      userId,
      totalActions: log.length,
      actions: paginated,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('[Audit] Get user activity error:', error);
    res.status(500).json({ error: 'Failed to get activity log' });
  }
}

/**
 * GET /audit/change-history/:expedientId/:fieldName
 * Historial de cambios de un campo específico
 */
async function getChangeHistory(req, res) {
  try {
    const { expedientId, fieldName } = req.params;

    const history = await auditService.getChangeHistory(expedientId, fieldName);

    res.json({
      expedientId,
      fieldName,
      changes: history,
    });
  } catch (error) {
    logger.error('[Audit] Get change history error:', error);
    res.status(500).json({ error: 'Failed to get change history' });
  }
}

/**
 * GET /audit/export
 * Exportar logs de auditoría (GDPR compliance)
 */
async function exportAuditLog(req, res) {
  try {
    const { dateFrom, dateTo, format = 'json' } = req.query;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format (json or csv)' });
    }

    const logs = await auditService.exportAuditLog({
      from: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: dateTo ? new Date(dateTo) : new Date(),
    });

    if (format === 'csv') {
      // Convertir a CSV
      const csv = convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
      res.send(csv);
    } else {
      res.json(logs);
    }

    logger.info('[Audit] Exported audit log for user ' + req.user.id);
  } catch (error) {
    logger.error('[Audit] Export audit log error:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
}

/**
 * GET /audit/statistics
 * Estadísticas de auditoría (solo ADMIN)
 */
async function getAuditStatistics(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const stats = await auditService.getAuditStatistics();

    res.json(stats);
  } catch (error) {
    logger.error('[Audit] Get statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
}

/**
 * GET /audit/suspicious-activity
 * Detectar actividad sospechosa (solo ADMIN)
 */
async function detectSuspiciousActivity(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const suspicious = await auditService.detectSuspiciousActivity();

    res.json({
      suspiciousActivities: suspicious,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('[Audit] Detect suspicious activity error:', error);
    res.status(500).json({ error: 'Failed to detect suspicious activity' });
  }
}

/**
 * Helper: Convert array of objects to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(',')),
  ].join('\n');

  return csv;
}

module.exports = {
  getAuditTrail,
  getUserActivityLog,
  getChangeHistory,
  exportAuditLog,
  getAuditStatistics,
  detectSuspiciousActivity,
};
