const { prisma } = require('../config/db');
const logger = require('../config/logger');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const BACKUPS_DIR = path.join(__dirname, '../../backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Habilita encriptación en un documento
 * @param {string} documentId
 * @param {Array} accessList - IDs de usuarios que pueden desencriptar
 */
async function enableDocumentEncryption(documentId, accessList = []) {
  try {
    // Generar clave de encriptación
    const key = crypto.randomBytes(32).toString('hex');

    const encryption = await prisma.documentEncryption.upsert({
      where: { documentId },
      update: { accessList },
      create: {
        documentId,
        encryptionKey: crypto.createHash('sha256').update(key).digest('hex'),
        accessList,
      },
    });

    logger.info(`[Security] Document ${documentId} encryption enabled for ${accessList.length} users`);

    return encryption;
  } catch (error) {
    logger.error('[Security] Error enabling document encryption:', error);
    throw error;
  }
}

/**
 * Desencripta un documento si el usuario tiene permiso
 * @param {string} documentId
 * @param {string} userId
 * @returns {Object} Documento desencriptado
 */
async function decryptDocument(documentId, userId) {
  try {
    const encryption = await prisma.documentEncryption.findUnique({
      where: { documentId },
    });

    if (!encryption) {
      throw new Error('Document not encrypted');
    }

    if (!encryption.accessList.includes(userId)) {
      logger.warn(`[Security] Unauthorized decryption attempt by user ${userId}`);
      throw new Error('User not authorized to decrypt this document');
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    logger.info(`[Security] Document ${documentId} decrypted for user ${userId}`);

    return document;
  } catch (error) {
    logger.error('[Security] Error decrypting document:', error);
    throw error;
  }
}

/**
 * Genera un token de sesión para un usuario
 * @param {string} userId
 * @param {Object} req - Express request object
 * @returns {Object} UserSession
 */
async function generateSessionToken(userId, req) {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const ipAddress = req
      ? req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress
      : null;

    const userAgent = req?.headers['user-agent'] || null;

    const session = await prisma.userSession.create({
      data: {
        userId,
        token: crypto.randomBytes(32).toString('hex'),
        status: 'ACTIVE',
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    logger.info(`[Security] Session created for user ${userId}`);

    return session;
  } catch (error) {
    logger.error('[Security] Error generating session token:', error);
    throw error;
  }
}

/**
 * Invalida todas las sesiones de un usuario (logout global)
 * @param {string} userId
 */
async function invalidateAllUserSessions(userId) {
  try {
    const result = await prisma.userSession.updateMany({
      where: { userId },
      data: { status: 'REVOKED' },
    });

    logger.info(`[Security] All sessions revoked for user ${userId} (${result.count} sessions)`);

    return result.count;
  } catch (error) {
    logger.error('[Security] Error invalidating sessions:', error);
    throw error;
  }
}

/**
 * Inicia setup de MFA (TOTP)
 * Retorna QR code para escanear en app autenticadora
 * @param {string} userId
 * @returns {Object} { secret, qrCode, manualCode }
 */
async function initiateMFA(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) throw new Error('User not found');

    // Generar secret TOTP
    const secret = speakeasy.generateSecret({
      name: `Docuinmo (${user.email})`,
      issuer: 'Docuinmo',
      length: 32,
    });

    // Generar QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    logger.info(`[Security] MFA setup initiated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCode,
      manualCode: secret.base32, // Para entrada manual si es necesario
    };
  } catch (error) {
    logger.error('[Security] Error initiating MFA:', error);
    throw error;
  }
}

/**
 * Verifica código TOTP y habilita MFA
 * @param {string} userId
 * @param {string} secret - Base32 secret
 * @param {string} code - Código TOTP de 6 dígitos
 */
async function verifyMFA(userId, secret, code) {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new Error('Invalid TOTP code');
    }

    // Guardar secret encriptado
    const encryptedSecret = crypto
      .createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key')
      .update(secret, 'utf8', 'hex');

    const prefs = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaMethod: 'TOTP',
      },
      create: {
        userId,
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaMethod: 'TOTP',
      },
    });

    logger.info(`[Security] MFA enabled for user ${userId}`);

    return prefs;
  } catch (error) {
    logger.error('[Security] Error verifying MFA:', error);
    throw error;
  }
}

/**
 * Valida código TOTP del usuario
 * @param {string} userId
 * @param {string} code
 * @returns {boolean}
 */
async function validateMFACode(userId, code) {
  try {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!prefs?.mfaEnabled || !prefs.mfaSecret) {
      return false;
    }

    // Desencriptar secret
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key');
    const secret = decipher.update(prefs.mfaSecret, 'hex', 'utf8');

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      logger.warn(`[Security] Invalid MFA code for user ${userId}`);
    }

    return verified;
  } catch (error) {
    logger.error('[Security] Error validating MFA code:', error);
    return false;
  }
}

/**
 * Crea un backup manual de la base de datos
 * En producción, esto llamaría a un servicio de backup (pg_dump, etc)
 * @param {string} type - 'AUTOMATIC' o 'MANUAL'
 * @returns {Object} BackupLog
 */
async function createBackup(type = 'MANUAL') {
  try {
    const startedAt = new Date();

    const backupLog = await prisma.backupLog.create({
      data: {
        type,
        status: 'PENDING',
        startedAt,
      },
    });

    // Simulación: en producción, ejecutaría pg_dump o similar
    // const fileName = `backup_${Date.now()}.sql`;
    // const backupPath = path.join(BACKUPS_DIR, fileName);
    // await executeBackup(backupPath);

    const completedAt = new Date();
    const updated = await prisma.backupLog.update({
      where: { id: backupLog.id },
      data: {
        status: 'COMPLETED',
        completedAt,
        fileSize: 0, // Placeholder
        s3Path: `s3://docuinmo-backups/backup_${Date.now()}.sql`,
      },
    });

    logger.info(`[Security] Backup created: ${updated.s3Path}`);

    return updated;
  } catch (error) {
    logger.error('[Security] Error creating backup:', error);

    // Registrar fallo
    await prisma.backupLog.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

/**
 * Rota backups: mantiene solo los últimos N días
 * @param {number} retentionDays
 */
async function rotateBackups(retentionDays = 30) {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await prisma.backupLog.deleteMany({
      where: {
        status: 'COMPLETED',
        completedAt: { lt: cutoffDate },
      },
    });

    logger.info(`[Security] Backup rotation completed: ${deleted.count} old backups removed`);

    return deleted.count;
  } catch (error) {
    logger.error('[Security] Error rotating backups:', error);
    throw error;
  }
}

/**
 * Obtiene todas las sesiones activas de un usuario
 * @param {string} userId
 * @returns {Array} UserSessions activas
 */
async function getActiveSessions(userId) {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        loginAt: true,
        lastActivityAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { loginAt: 'desc' },
    });

    return sessions;
  } catch (error) {
    logger.error('[Security] Error getting active sessions:', error);
    throw error;
  }
}

/**
 * Revoca una sesión específica
 * @param {string} sessionId
 */
async function revokeSession(sessionId) {
  try {
    const session = await prisma.userSession.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' },
    });

    logger.info(`[Security] Session ${sessionId} revoked`);

    return session;
  } catch (error) {
    logger.error('[Security] Error revoking session:', error);
    throw error;
  }
}

module.exports = {
  enableDocumentEncryption,
  decryptDocument,
  generateSessionToken,
  invalidateAllUserSessions,
  initiateMFA,
  verifyMFA,
  validateMFACode,
  createBackup,
  rotateBackups,
  getActiveSessions,
  revokeSession,
};
