const { prisma } = require('../config/db');
const chatService = require('../services/chat.service');
const logger = require('../config/logger');

/**
 * POST /chat/threads
 * Crear nuevo hilo de chat (con expediente o directo entre usuarios)
 */
async function createChatThread(req, res) {
  try {
    const { expedientId, subject, participantIds = [], isDirect = false } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'subject required' });
    }

    const allParticipants = [req.user.id, ...participantIds.filter(id => id !== req.user.id)];

    const thread = await prisma.chatThread.create({
      data: {
        subject,
        expedientId: expedientId || null,
        isDirect: !!isDirect,
        createdById: req.user.id,
        lastMessageAt: new Date(),
        participants: {
          create: allParticipants.map(userId => ({ userId })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        expedient: { select: { id: true, code: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    res.json(thread);
  } catch (error) {
    logger.error('[Chat] Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
}

/**
 * POST /chat/direct
 * Obtener o crear conversación directa con otro usuario
 */
async function getOrCreateDirectThread(req, res) {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId required' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Buscar hilo directo existente entre estos dos usuarios
    const existing = await prisma.chatThread.findFirst({
      where: {
        isDirect: true,
        AND: [
          { participants: { some: { userId: req.user.id } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
      },
    });

    if (existing) {
      return res.json(existing);
    }

    // Obtener nombre del usuario destino para el subject
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Crear hilo directo nuevo
    const thread = await prisma.chatThread.create({
      data: {
        subject: `DM: ${req.user.name} ↔ ${targetUser.name}`,
        isDirect: true,
        createdById: req.user.id,
        lastMessageAt: new Date(),
        participants: {
          create: [{ userId: req.user.id }, { userId: targetUserId }],
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
      },
    });

    res.json(thread);
  } catch (error) {
    logger.error('[Chat] Get/create direct thread error:', error);
    res.status(500).json({ error: 'Failed to get or create direct thread' });
  }
}

/**
 * GET /chat/threads
 * Obtener todos los threads del usuario (directos + de expedientes)
 */
async function getUserChatThreads(req, res) {
  try {
    const { skip = 0, limit = 50 } = req.query;

    const threads = await prisma.chatThread.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        expedient: { select: { id: true, code: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    res.json({ threads, total: threads.length });
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
    const { skip = 0, limit = 100 } = req.query;

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        messages: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          skip: parseInt(skip),
          take: parseInt(limit),
        },
        expedient: { select: { id: true, code: true } },
      },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Marcar como leído
    await prisma.chatParticipant.updateMany({
      where: { threadId, userId: req.user.id },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });

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
    const { threadId, content, mentions = [] } = req.body;

    if (!threadId || !content || content.trim().length === 0) {
      return res.status(400).json({ error: 'threadId and content required' });
    }

    // Crear mensaje
    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        userId: req.user.id,
        content: content.trim(),
        mentions,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Actualizar lastMessageAt del thread
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Incrementar unread para otros participantes
    await prisma.chatParticipant.updateMany({
      where: { threadId, userId: { not: req.user.id } },
      data: { unreadCount: { increment: 1 } },
    });

    res.json(message);
  } catch (error) {
    logger.error('[Chat] Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * GET /chat/unread
 * Obtener conteo de mensajes no leídos
 */
async function getUnreadCount(req, res) {
  try {
    const result = await prisma.chatParticipant.aggregate({
      where: { userId: req.user.id },
      _sum: { unreadCount: true },
    });

    res.json({ unreadCount: result._sum.unreadCount || 0 });
  } catch (error) {
    logger.error('[Chat] Get unread count error:', error);
    res.json({ unreadCount: 0 });
  }
}

/**
 * POST /chat/threads/:threadId/mark-read
 */
async function markThreadAsRead(req, res) {
  try {
    await prisma.chatParticipant.updateMany({
      where: { threadId: req.params.threadId, userId: req.user.id },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
}

/**
 * PUT /chat/messages/:messageId
 */
async function editMessage(req, res) {
  try {
    const { content } = req.body;
    const message = await prisma.chatMessage.findUnique({ where: { id: req.params.messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.chatMessage.update({
      where: { id: req.params.messageId },
      data: { content, edited: true, editedAt: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
}

/**
 * POST /chat/threads/:threadId/add-participant
 */
async function addParticipant(req, res) {
  try {
    const { userId } = req.body;
    await prisma.chatParticipant.upsert({
      where: { threadId_userId: { threadId: req.params.threadId, userId } },
      update: {},
      create: { threadId: req.params.threadId, userId },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add participant' });
  }
}

module.exports = {
  createChatThread,
  getOrCreateDirectThread,
  getUserChatThreads,
  getChatThread,
  sendMessage,
  getUnreadCount,
  markThreadAsRead,
  editMessage,
  addParticipant,
};
