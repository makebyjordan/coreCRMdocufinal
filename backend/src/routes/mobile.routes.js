const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mobile.controller');

// Gestión de dispositivos
router.post('/devices/register', ctrl.registerDevice);
router.delete('/devices/:deviceToken', ctrl.unregisterDevice);
router.get('/devices', ctrl.listDevices);

// Notificaciones push
router.post('/push/send', ctrl.sendPushToUser);
router.post('/push/broadcast', ctrl.broadcastPush);

module.exports = router;
