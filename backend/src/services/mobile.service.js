/**
 * mobile.service.js
 * Gestión de dispositivos móviles y notificaciones push.
 * Usa Firebase Cloud Messaging (FCM) HTTP v1 API.
 * Si FCM_SERVER_KEY no está configurado, las notificaciones se loguean en consola.
 */

const { prisma } = require('../config/db');
const logger = require('../config/logger');

// ─── FCM HTTP v1 helper ───────────────────────────────────────────────────────
async function sendFCMNotification(deviceToken, title, body, data = {}) {
  const FCM_KEY = process.env.FCM_SERVER_KEY;

  if (!FCM_KEY) {
    logger.info(`[Mobile] FCM not configured — push simulada: "${title}" → ${deviceToken.substring(0, 20)}...`);
    return { simulated: true };
  }

  const payload = {
    message: {
      token: deviceToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID || 'docuinmo'}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FCM_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM error ${res.status}: ${err}`);
  }

  return res.json();
}

// ─── Registro de dispositivos ────────────────────────────────────────────────

/**
 * Registra (o actualiza) el token de dispositivo de un usuario.
 * @param {string} userId
 * @param {string} deviceToken - Token FCM / APNS / Web Push
 * @param {'iOS'|'Android'|'Web'} platform
 * @param {string} deviceName - Nombre amigable ("iPhone de Ana")
 */
async function registerDeviceToken(userId, deviceToken, platform, deviceName) {
  const existing = await prisma.deviceRegistration.findFirst({
    where: { deviceToken },
  });

  if (existing) {
    // Actualizar último uso y reasignar al usuario correcto
    return prisma.deviceRegistration.update({
      where: { id: existing.id },
      data: { userId, platform, deviceName, lastUsedAt: new Date() },
    });
  }

  return prisma.deviceRegistration.create({
    data: { userId, deviceToken, platform, deviceName },
  });
}

/**
 * Elimina el token de dispositivo (logout del dispositivo).
 */
async function unregisterDeviceToken(deviceToken) {
  await prisma.deviceRegistration.deleteMany({ where: { deviceToken } });
}

/**
 * Devuelve todos los dispositivos registrados de un usuario.
 */
async function getDevices(userId) {
  return prisma.deviceRegistration.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      platform: true,
      deviceName: true,
      registeredAt: true,
      lastUsedAt: true,
    },
  });
}

// ─── Envío de notificaciones ─────────────────────────────────────────────────

/**
 * Envía push a TODOS los dispositivos activos de un usuario.
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function sendPushNotification(userId, title, body, data = {}) {
  const devices = await prisma.deviceRegistration.findMany({
    where: { userId },
    select: { id: true, deviceToken: true },
  });

  if (!devices.length) {
    logger.info(`[Mobile] No devices registered for user ${userId}`);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const staleTokens = [];

  for (const device of devices) {
    try {
      await sendFCMNotification(device.deviceToken, title, body, data);
      sent++;

      // Actualizar lastUsedAt
      await prisma.deviceRegistration.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (err) {
      failed++;
      logger.warn(`[Mobile] Push failed for device ${device.id}: ${err.message}`);

      // Si el token es inválido (FCM 404 / UNREGISTERED), marcarlo para eliminación
      if (err.message.includes('404') || err.message.includes('UNREGISTERED')) {
        staleTokens.push(device.id);
      }
    }
  }

  // Limpiar tokens inválidos
  if (staleTokens.length) {
    await prisma.deviceRegistration.deleteMany({
      where: { id: { in: staleTokens } },
    });
    logger.info(`[Mobile] Removed ${staleTokens.length} stale tokens`);
  }

  logger.info(`[Mobile] Push "${title}" → user ${userId}: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Envía push masivo a todos los usuarios con un rol determinado.
 * @param {string} role - "COMERCIAL" | "FIRMAS" | "MARKETING" | "DIRECCION" | "ADMINISTRACION"
 */
async function broadcastPushAlert(title, body, role, data = {}) {
  const users = await prisma.user.findMany({
    where: { role, active: true },
    select: { id: true },
  });

  let totalSent = 0;
  let totalFailed = 0;

  for (const user of users) {
    const result = await sendPushNotification(user.id, title, body, data);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  logger.info(`[Mobile] Broadcast "${title}" → role ${role}: ${users.length} users, ${totalSent} sent`);
  return { users: users.length, sent: totalSent, failed: totalFailed };
}

/**
 * Envía notificación de nuevo expediente asignado.
 */
async function notifyExpedientAssigned(userId, expedientCode, assignedBy) {
  return sendPushNotification(
    userId,
    '📋 Nuevo expediente asignado',
    `${assignedBy} te ha asignado el expediente ${expedientCode}`,
    { type: 'EXPEDIENT_ASSIGNED', expedientCode }
  );
}

/**
 * Envía notificación de tarea pendiente.
 */
async function notifyTaskDue(userId, taskTitle, expedientCode) {
  return sendPushNotification(
    userId,
    '⏰ Tarea pendiente',
    `"${taskTitle}" vence hoy — ${expedientCode}`,
    { type: 'TASK_DUE', expedientCode }
  );
}

/**
 * Envía notificación de documento firmado.
 */
async function notifyDocumentSigned(userId, documentName, signerName) {
  return sendPushNotification(
    userId,
    '✅ Documento firmado',
    `${signerName} ha firmado "${documentName}"`,
    { type: 'DOCUMENT_SIGNED', documentName }
  );
}

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  getDevices,
  sendPushNotification,
  broadcastPushAlert,
  notifyExpedientAssigned,
  notifyTaskDue,
  notifyDocumentSigned,
};
