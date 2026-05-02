const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/productivity.controller');

// POST /productivity/shortcuts - Configurar atajo
router.post('/shortcuts', authenticate, ctrl.setKeyboardShortcut);

// GET /productivity/shortcuts - Obtener atajos
router.get('/shortcuts', authenticate, ctrl.getShortcuts);

// POST /productivity/bulk-actions - Ejecutar acción en lote
router.post('/bulk-actions', authenticate, ctrl.executeBulkAction);

// GET /productivity/bulk-actions/:bulkActionId - Estado de bulk action
router.get('/bulk-actions/:bulkActionId', authenticate, ctrl.getBulkActionStatus);

// POST /productivity/expedients/:expedientId/duplicate - Duplicar expediente
router.post('/expedients/:expedientId/duplicate', authenticate, ctrl.duplicateExpedient);

// GET /productivity/calendar-availability/:userId - Disponibilidad de calendario
router.get('/calendar-availability/:userId', authenticate, ctrl.getCalendarAvailability);

// GET /productivity/expedient-templates/:userId - Plantillas de expedientes
router.get('/expedient-templates/:userId', authenticate, ctrl.getExpedientTemplates);

module.exports = router;
