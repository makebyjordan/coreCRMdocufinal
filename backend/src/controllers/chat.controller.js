const { isAdmin, isCommercial, userHasAnyRole } = require('../utils/roleHelper');
const { prisma } = require('../config/db');
const chatService = require('../services/chat.service');
const logger = require('../config/logger');

/**
 * POST /chat/threads
 * Crear nuevo hilo de chat para expediente
 */
async function createChatThread(req, res) {
  try {
    const { expedientId, subject, participantIds = [] } = req.body;

    if (!expedientId || !subject) {
      return res.status(400).json({ error: 'expedientId and subject required' });
    }

    // Verificar que el usuario pueda acceder al expediente
    const hasAccess = await prisma.expedientAssignment.findFirst({
      where: { expedientId, userId: req.user.id },
    });

    if (!hasAccess && isCommercial(req.user)) {
      return res.status(403).json({ error: 'No access to this expedient' });
    }

    const thread = await chatService.createChatThread(expedientId, subject, [
      req.user.id,
      ...participantIds,
    ]);

    logger.info(`[Chat] Thread created: ${thread.id} for expedient ${expedientId}`);

    res.json(thread);
  } catch (error) {
    logger.error('[Chat] Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
}

/**
 * GET /chat/threads
 * Obtener todos los threads del usuario
 */
async function getUserChatThreads(req, res) {
  try {
    const { skip = 0, limit = 20 } = req.query;

    const threads = await prisma.chatThread.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
      },
      include: {
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
        participants: { select: { user: { select: { id: true, name: true, email: true } } } },
        expedient: { select: { id: true, code: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    const total = await prisma.chatThread.count({
      where: { participants: { some: { userId: req.user.id } } },
    });

    res.json({
      threads,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('[Chat] Get user threads error:', error);
    res.status(500).json({ error: 'Failed to get threads' });
  }
}

/**
 * GET /chat/threads/:threadId
 * Obtener detalle de thread con mensajes
 */
async function getChatThread(req, res) {
  try {
    const { threadId } = req.params;
    const { skip = 0, limit = 50 } = req.query;

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        participants: { select: { user: { select: { id: true, name: true, email: true } } } },
        messages: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
          skip: parseInt(skip),
          take: parseInt(limit),
        },
        expedient: { select: { id: true, code: true, clientId: true } },
      },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Marcar como leído
    await chatService.markThreadAsRead(threadId, req.user.id);

    res.json(thread);
  } catch (error) {
    logger.error('[Chat] Get thread error:', error);
    res.status(500).json({ error: 'Failed to get thread' });
  }
}

/**
 * POST /chat/messages
 * Enviar mensaje en thread
 */
async function sendMessage(req, res) {
  try {
    const { threadId, content, mentions = [], attachments = null } = req.body;

    if (!threadId || !content || content.trim().length === 0) {
      return res.status(400).json({ error: 'threadId and content required' });
    }

    const message = await chatService.sendMessage(threadId, req.user.id, content, mentions, attachments);

    // Notificar menciones
    if (mentions.length > 0) {
      await chatService.notifyMentioned(mentions, message);
    }

    logger.info(`[Chat] Message sent in thread ${threadId} by user ${req.user.id}`);

    res.json(message);
  } catch (error) {
    logger.error('[Chat] Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * PUT /chat/messages/:messageId
 * Editar mensaje
 */
async function editMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'content required' });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.userId !== req.user.id && !userHasAnyRole(req.user, 'ADMINISTRACION')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, updatedAt: new Date() },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    logger.info(`[Chat] Message ${messageId} edited`);

    res.json(updated);
  } catch (error) {
    logger.error('[Chat] Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
}

/**
 * GET /chat/unread
 * Obtener conteo de mensajes no leídos
 */
async function getUnreadCount(req, res) {
  try {
    const unreadCount = await chatService.getUnreadCount(req.user.id);

    res.json({ unreadCount });
  } catch (error) {
    logger.error('[Chat] Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

/**
 * POST /chat/threads/:threadId/mark-read
 * Marcar thread como leído
 */
async function markThreadAsRead(req, res) {
  try {
    const { threadId } = req.params;

    await chatService.markThreadAsRead(threadId, req.user.id);

    res.json({ message: 'Thread marked as read' });
  } catch (error) {
    logger.error('[Chat] Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
}

/**
 * POST /chat/threads/:threadId/add-participant
 * Agregar participante a thread
 */
async function addParticipant(req, res) {
  try {
    const { threadId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const result = await chatService.addParticipant(threadId, userId);

    logger.info(`[Chat] User ${userId} added to thread ${threadId}`);

    res.json(result);
  } catch (error) {
    logger.error('[Chat] Add participant error:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
}

module.exports = {
  createChatThread,
  getUserChatThreads,
  getChatThread,
  sendMessage,
  editMessage,
  getUnreadCount,
  markThreadAsRead,
  addParticipant,
};
