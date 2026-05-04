const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/chat.controller');

// POST /chat/threads - Crear nuevo thread
router.post('/threads', authenticate, ctrl.createChatThread);

// POST /chat/direct - Obtener o crear conversación directa entre dos usuarios
router.post('/direct', authenticate, ctrl.getOrCreateDirectThread);

// GET /chat/threads - Obtener threads del usuario
router.get('/threads', authenticate, ctrl.getUserChatThreads);

// GET /chat/threads/:threadId - Obtener detalle de thread
router.get('/threads/:threadId', authenticate, ctrl.getChatThread);

// POST /chat/messages - Enviar mensaje
router.post('/messages', authenticate, ctrl.sendMessage);

// PUT /chat/messages/:messageId - Editar mensaje
router.put('/messages/:messageId', authenticate, ctrl.editMessage);

// GET /chat/unread - Obtener conteo de no leídos
router.get('/unread', authenticate, ctrl.getUnreadCount);

// POST /chat/threads/:threadId/mark-read - Marcar como leído
router.post('/threads/:threadId/mark-read', authenticate, ctrl.markThreadAsRead);

// POST /chat/threads/:threadId/add-participant - Agregar participante
router.post('/threads/:threadId/add-participant', authenticate, ctrl.addParticipant);

module.exports = router;
