const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/security.controller');

// POST /security/2fa/setup - Iniciar setup de MFA
router.post('/2fa/setup', authenticate, ctrl.initiateMFA);

// POST /security/2fa/verify - Verificar código TOTP
router.post('/2fa/verify', authenticate, ctrl.verifyMFA);

// POST /security/backup - Crear backup manual
router.post('/backup', authenticate, authorize('ADMINISTRACION', 'DIRECCION'), ctrl.createBackup);

// GET /security/sessions - Obtener sesiones activas
router.get('/sessions', authenticate, ctrl.getActiveSessions);

// POST /security/sessions/:sessionId/revoke - Revocar sesión
router.post('/sessions/:sessionId/revoke', authenticate, ctrl.revokeSession);

// POST /security/sessions/revoke-all - Revocar todas las sesiones (logout global)
router.post('/sessions/revoke-all', authenticate, ctrl.invalidateAllSessions);

// POST /security/documents/:documentId/encrypt - Encriptar documento
router.post('/documents/:documentId/encrypt', authenticate, authorize('ADMINISTRACION'), ctrl.enableDocumentEncryption);

// POST /security/documents/:documentId/decrypt - Desencriptar documento
router.post('/documents/:documentId/decrypt', authenticate, ctrl.decryptDocument);

module.exports = router;
