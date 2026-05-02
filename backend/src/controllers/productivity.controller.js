const { prisma } = require('../config/db');
const productivityService = require('../services/productivity.service');
const logger = require('../config/logger');

/**
 * POST /productivity/shortcuts
 * Configurar atajo de teclado
 */
async function setKeyboardShortcut(req, res) {
  try {
    const { shortcutKey, action } = req.body;

    if (!shortcutKey || !action) {
      return res.status(400).json({ error: 'shortcutKey and action required' });
    }

    const shortcuts = await productivityService.setKeyboardShortcut(req.user.id, shortcutKey, action);

    logger.info(`[Productivity] Shortcut set for user ${req.user.id}: ${shortcutKey} → ${action}`);

    res.json({ shortcuts });
  } catch (error) {
    logger.error('[Productivity] Set shortcut error:', error);
    res.status(500).json({ error: 'Failed to set shortcut' });
  }
}

/**
 * GET /productivity/shortcuts
 * Obtener atajos del usuario
 */
async function getShortcuts(req, res) {
  try {
    const shortcuts = await productivityService.getShortcuts(req.user.id);

    res.json(shortcuts);
  } catch (error) {
    logger.error('[Productivity] Get shortcuts error:', error);
    res.status(500).json({ error: 'Failed to get shortcuts' });
  }
}

/**
 * POST /productivity/bulk-actions
 * Ejecutar acción en lote sobre múltiples expedientes
 */
async function executeBulkAction(req, res) {
  try {
    const { actionType, expedientIds, parameters } = req.body;

    if (!actionType || !expedientIds || expedientIds.length === 0) {
      return res.status(400).json({ error: 'actionType and expedientIds required' });
    }

    const bulkAction = await productivityService.executeBulkAction(
      req.user.id,
      actionType,
      expedientIds,
      parameters
    );

    logger.info(`[Productivity] Bulk action started: ${actionType} on ${expedientIds.length} expedients`);

    res.json(bulkAction);
  } catch (error) {
    logger.error('[Productivity] Execute bulk action error:', error);
    res.status(500).json({ error: 'Failed to execute bulk action' });
  }
}

/**
 * GET /productivity/bulk-actions/:bulkActionId
 * Obtener estado de acción en lote
 */
async function getBulkActionStatus(req, res) {
  try {
    const { bulkActionId } = req.params;

    const status = await productivityService.getBulkActionStatus(bulkActionId);

    if (!status) {
      return res.status(404).json({ error: 'Bulk action not found' });
    }

    res.json(status);
  } catch (error) {
    logger.error('[Productivity] Get bulk action status error:', error);
    res.status(500).json({ error: 'Failed to get bulk action status' });
  }
}

/**
 * POST /productivity/expedients/:expedientId/duplicate
 * Duplicar expediente con overrides
 */
async function duplicateExpedient(req, res) {
  try {
    const { expedientId } = req.params;
    const { overrides = {} } = req.body;

    const newExpedient = await productivityService.duplicateExpedient(expedientId, overrides);

    logger.info(`[Productivity] Expedient duplicated: ${expedientId} → ${newExpedient.id}`);

    res.json(newExpedient);
  } catch (error) {
    logger.error('[Productivity] Duplicate expedient error:', error);
    res.status(500).json({ error: 'Failed to duplicate expedient' });
  }
}

/**
 * GET /productivity/calendar-availability/:userId
 * Obtener disponibilidad de usuario en período
 */
async function getCalendarAvailability(req, res) {
  try {
    const { userId } = req.params;
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo required' });
    }

    const availability = await productivityService.getCalendarAvailability(
      userId,
      new Date(dateFrom),
      new Date(dateTo)
    );

    res.json({
      userId,
      dateRange: { from: dateFrom, to: dateTo },
      availability,
    });
  } catch (error) {
    logger.error('[Productivity] Get calendar availability error:', error);
    res.status(500).json({ error: 'Failed to get availability' });
  }
}

/**
 * GET /productivity/expedient-templates/:userId
 * Obtener plantillas de expedientes (completados con buen desempeño)
 */
async function getExpedientTemplates(req, res) {
  try {
    const { userId } = req.params;

    const templates = await productivityService.getExpedientTemplates(userId);

    res.json({
      userId,
      templates,
      totalTemplates: templates.length,
    });
  } catch (error) {
    logger.error('[Productivity] Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
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
