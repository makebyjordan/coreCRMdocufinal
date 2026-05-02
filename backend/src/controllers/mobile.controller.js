const { isAdmin, isCommercial, userHasAnyRole } = require('../utils/roleHelper');
const mobileService = require('../services/mobile.service');
const logger = require('../config/logger');

/**
 * POST /mobile/devices/register
 * Registra el token push de un dispositivo para el usuario autenticado.
 * Body: { deviceToken, platform, deviceName }
 */
async function registerDevice(req, res) {
  try {
    const { deviceToken, platform, deviceName } = req.body;

    if (!deviceToken || !platform) {
      return res.status(400).json({ error: 'deviceToken y platform son requeridos' });
    }

    if (!['iOS', 'Android', 'Web'].includes(platform)) {
      return res.status(400).json({ error: 'platform debe ser iOS, Android o Web' });
    }

    const device = await mobileService.registerDeviceToken(
      req.user.id,
      deviceToken,
      platform,
      deviceName || `Dispositivo ${platform}`
    );

    res.json({ message: 'Dispositivo registrado', device });
  } catch (error) {
    logger.error('[Mobile] Register device error:', error);
    res.status(500).json({ error: 'Error al registrar dispositivo' });
  }
}

/**
 * DELETE /mobile/devices/:deviceToken
 * Elimina el token push de un dispositivo (logout del dispositivo).
 */
async function unregisterDevice(req, res) {
  try {
    const { deviceToken } = req.params;
    await mobileService.unregisterDeviceToken(decodeURIComponent(deviceToken));
    res.json({ message: 'Dispositivo eliminado' });
  } catch (error) {
    logger.error('[Mobile] Unregister device error:', error);
    res.status(500).json({ error: 'Error al eliminar dispositivo' });
  }
}

/**
 * GET /mobile/devices
 * Lista los dispositivos registrados del usuario autenticado.
 */
async function listDevices(req, res) {
  try {
    const devices = await mobileService.getDevices(req.user.id);
    res.json({ data: devices, total: devices.length });
  } catch (error) {
    logger.error('[Mobile] List devices error:', error);
    res.status(500).json({ error: 'Error al obtener dispositivos' });
  }
}

/**
 * POST /mobile/push/send
 * Envía push a un usuario específico.
 * Solo DIRECCION / ADMINISTRACION.
 * Body: { userId, title, body, data }
 */
async function sendPushToUser(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { userId, title, body, data = {} } = req.body;
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title y body son requeridos' });
    }

    const result = await mobileService.sendPushNotification(userId, title, body, data);
    res.json({ message: 'Notificación enviada', ...result });
  } catch (error) {
    logger.error('[Mobile] Send push error:', error);
    res.status(500).json({ error: 'Error al enviar notificación' });
  }
}

/**
 * POST /mobile/push/broadcast
 * Envía push masivo a todos los usuarios de un rol.
 * Solo DIRECCION / ADMINISTRACION.
 * Body: { role, title, body, data }
 */
async function broadcastPush(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { role, title, body, data = {} } = req.body;
    const validRoles = ['COMERCIAL', 'FIRMAS', 'MARKETING', 'DIRECCION', 'ADMINISTRACION'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `role debe ser uno de: ${validRoles.join(', ')}` });
    }

    if (!title || !body) {
      return res.status(400).json({ error: 'title y body son requeridos' });
    }

    const result = await mobileService.broadcastPushAlert(title, body, role, data);
    res.json({ message: 'Broadcast enviado', ...result });
  } catch (error) {
    logger.error('[Mobile] Broadcast push error:', error);
    res.status(500).json({ error: 'Error al enviar broadcast' });
  }
}

module.exports = {
  registerDevice,
  unregisterDevice,
  listDevices,
  sendPushToUser,
  broadcastPush,
};
