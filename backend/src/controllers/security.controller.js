const { isAdmin, isCommercial, userHasAnyRole } = require('../utils/roleHelper');
const { prisma } = require('../config/db');
const securityService = require('../services/security.service');
const logger = require('../config/logger');

/**
 * POST /security/2fa/setup
 * Iniciar setup de MFA (TOTP)
 * Retorna QR code
 */
async function initiateMFA(req, res) {
  try {
    const mfaSetup = await securityService.initiateMFA(req.user.id);

    logger.info(`[Security] MFA setup initiated for user ${req.user.id}`);

    res.json(mfaSetup);
  } catch (error) {
    logger.error('[Security] Initiate MFA error:', error);
    res.status(500).json({ error: 'Failed to initiate MFA' });
  }
}

/**
 * POST /security/2fa/verify
 * Verificar código TOTP y habilitar MFA
 */
async function verifyMFA(req, res) {
  try {
    const { secret, code } = req.body;

    if (!secret || !code) {
      return res.status(400).json({ error: 'secret and code required' });
    }

    const prefs = await securityService.verifyMFA(req.user.id, secret, code);

    logger.info(`[Security] MFA verified for user ${req.user.id}`);

    res.json({
      mfaEnabled: prefs.mfaEnabled,
      message: 'MFA enabled successfully',
    });
  } catch (error) {
    logger.error('[Security] Verify MFA error:', error);
    res.status(500).json({ error: 'Failed to verify MFA code' });
  }
}

/**
 * POST /security/backup
 * Crear backup manual de BD
 */
async function createBackup(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const backup = await securityService.createBackup('MANUAL');

    logger.info(`[Security] Manual backup created: ${backup.id}`);

    res.json(backup);
  } catch (error) {
    logger.error('[Security] Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
}

/**
 * GET /security/sessions
 * Obtener sesiones activas del usuario
 */
async function getActiveSessions(req, res) {
  try {
    const sessions = await securityService.getActiveSessions(req.user.id);

    res.json({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    logger.error('[Security] Get active sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
}

/**
 * POST /security/sessions/:sessionId/revoke
 * Revocar sesión específica
 */
async function revokeSession(req, res) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.user.id && !userHasAnyRole(req.user, 'ADMINISTRACION')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await securityService.revokeSession(sessionId);

    logger.info(`[Security] Session ${sessionId} revoked`);

    res.json({ message: 'Session revoked' });
  } catch (error) {
    logger.error('[Security] Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
}

/**
 * POST /security/sessions/revoke-all
 * Revocar todas las sesiones del usuario (logout global)
 */
async function invalidateAllSessions(req, res) {
  try {
    const count = await securityService.invalidateAllUserSessions(req.user.id);

    logger.info(`[Security] Revoked ${count} sessions for user ${req.user.id}`);

    res.json({
      message: `Revoked ${count} sessions`,
      count,
    });
  } catch (error) {
    logger.error('[Security] Invalidate all sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
}

/**
 * POST /security/documents/:documentId/encrypt
 * Habilitar encriptación en documento
 */
async function enableDocumentEncryption(req, res) {
  try {
    const { documentId } = req.params;
    const { accessList = [] } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'documentId required' });
    }

    const encryption = await securityService.enableDocumentEncryption(documentId, accessList);

    logger.info(`[Security] Document ${documentId} encryption enabled for ${accessList.length} users`);

    res.json(encryption);
  } catch (error) {
    logger.error('[Security] Enable document encryption error:', error);
    res.status(500).json({ error: 'Failed to enable encryption' });
  }
}

/**
 * POST /security/documents/:documentId/decrypt
 * Desencriptar documento (si el usuario tiene permiso)
 */
async function decryptDocument(req, res) {
  try {
    const { documentId } = req.params;

    const document = await securityService.decryptDocument(documentId, req.user.id);

    logger.info(`[Security] Document ${documentId} decrypted for user ${req.user.id}`);

    res.json(document);
  } catch (error) {
    logger.error('[Security] Decrypt document error:', error);
    res.status(500).json({ error: error.message || 'Failed to decrypt document' });
  }
}

module.exports = {
  initiateMFA,
  verifyMFA,
  createBackup,
  getActiveSessions,
  revokeSession,
  invalidateAllSessions,
  enableDocumentEncryption,
  decryptDocument,
};
