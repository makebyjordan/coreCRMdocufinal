const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/audit.controller');

// GET /audit/trail/:expedientId - Historial de cambios
router.get('/trail/:expedientId', authenticate, ctrl.getAuditTrail);

// GET /audit/user-activity/:userId - Actividad de usuario
router.get('/user-activity/:userId', authenticate, ctrl.getUserActivityLog);

// GET /audit/change-history/:expedientId/:fieldName - Historial de campo específico
router.get('/change-history/:expedientId/:fieldName', authenticate, ctrl.getChangeHistory);

// GET /audit/export - Exportar logs (GDPR compliance)
router.get('/export', authenticate, authorize('ADMINISTRACION', 'DIRECCION'), ctrl.exportAuditLog);

// GET /audit/statistics - Estadísticas (solo ADMIN)
router.get('/statistics', authenticate, authorize('ADMINISTRACION', 'DIRECCION'), ctrl.getAuditStatistics);

// GET /audit/suspicious-activity - Detectar actividad sospechosa (solo ADMIN)
router.get('/suspicious-activity', authenticate, authorize('ADMINISTRACION', 'DIRECCION'), ctrl.detectSuspiciousActivity);

module.exports = router;
