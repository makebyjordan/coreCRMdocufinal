const { prisma } = require('../config/db');
const logger = require('../config/logger');
const notificationEngine = require('./notification.engine');

/**
 * Crea un nuevo thread de chat para un expediente
 * @param {string} expedientId
 * @param {string} subject
 * @param {string} createdById
 * @param {Array} participantIds - IDs de usuarios a agregar
 * @returns {Object} ChatThread creado
 */
async function createChatThread(expedientId, subject, createdById, participantIds = []) {
  try {
    // Incluir al creador automáticamente
    const uniqueParticipants = [...new Set([createdById, ...participantIds])];

    const thread = await prisma.chatThread.create({
      data: {
        expedientId,
        subject,
        createdById,
        participants: {
          createMany: {
            data: uniqueParticipants.map(userId => ({ userId })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    logger.info(`[Chat] Thread created: ${thread.id} for expedient ${expedientId}`);

    return thread;
  } catch (error) {
    logger.error('[Chat] Error creating thread:', error);
    throw error;
  }
}

/**
 * Envía un mensaje en un thread de chat
 * @param {string} threadId
 * @param {string} userId - ID del autor
 * @param {string} content
 * @param {Array} mentions - ['userId1', 'userId2']
 * @param {Array} attachments - [{filename, path, mimeType}]
 * @returns {Object} ChatMessage creado
 */
async function sendMessage(threadId, userId, content, mentions = [], attachments = []) {
  try {
    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        userId,
        content,
        mentions,
        attachments: attachments.length > 0 ? attachments : null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Actualizar lastMessageAt del thread
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Notificar a participantes mencionados
    if (mentions.length > 0) {
      await notifyMentions(threadId, mentions, message, userId);
    }

    // Marcar como no leído para otros participantes
    await prisma.chatParticipant.updateMany({
      where: { threadId, userId: { not: userId } },
      data: { unreadCount: { increment: 1 } },
    });

    logger.info(`[Chat] Message sent in thread ${threadId}`);

    return message;
  } catch (error) {
    logger.error('[Chat] Error sending message:', error);
    throw error;
  }
}

/**
 * Obtiene un thread de chat con todos sus mensajes
 * @param {string} threadId
 * @param {number} limit - Límite de mensajes
 * @returns {Object} ChatThread con mensajes
 */
async function getChatThread(threadId, limit = 50) {
  try {
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        expedient: { select: { id: true, code: true } },
        messages: {
          take: -limit,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return thread;
  } catch (error) {
    logger.error('[Chat] Error getting chat thread:', error);
    throw error;
  }
}

/**
 * Obtiene todos los threads del usuario
 * @param {string} userId
 * @param {number} limit
 * @returns {Array} ChatThreads
 */
async function getUserChatThreads(userId, limit = 20) {
  try {
    const threads = await prisma.chatThread.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        expedient: { select: { code: true } },
        createdBy: { select: { name: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        },
        participants: {
          where: { userId },
          select: { unreadCount: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
    });

    return threads;
  } catch (error) {
    logger.error('[Chat] Error getting user threads:', error);
    throw error;
  }
}

/**
 * Extrae menciones (@usuario) de un mensaje
 * @param {string} message
 * @returns {Array} usernames mencionados
 */
function getMentions(message) {
  const mentionRegex = /@(\w+)/g;
  const matches = message.match(mentionRegex) || [];
  return matches.map(m => m.substring(1)); // Remove @
}

/**
 * Notifica a usuarios mencionados
 * @param {string} threadId
 * @param {Array} userIds - IDs de usuarios mencionados
 * @param {Object} message - Mensaje que contiene la mención
 * @param {string} senderUserId - ID del usuario que envió
 */
async function notifyMentions(threadId, userIds, message, senderUserId) {
  try {
    const sender = await prisma.user.findUnique({
      where: { id: senderUserId },
      select: { name: true, email: true },
    });

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      select: { subject: true, expedientId: true },
    });

    for (const userId of userIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        // Aquí se enviaría un email, pero por ahora solo se registra
        logger.info(
          `[Chat] Mention notification queued for ${user.email} in thread ${thread.subject}`
        );
      }
    }
  } catch (error) {
    logger.error('[Chat] Error notifying mentions:', error);
  }
}

/**
 * Marca un thread como leído para un usuario
 * @param {string} threadId
 * @param {string} userId
 */
async function markThreadAsRead(threadId, userId) {
  try {
    await prisma.chatParticipant.update({
      where: {
        threadId_userId: { threadId, userId },
      },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    logger.info(`[Chat] Marked thread ${threadId} as read for user ${userId}`);
  } catch (error) {
    logger.error('[Chat] Error marking thread as read:', error);
    throw error;
  }
}

/**
 * Obtiene número de mensajes no leídos de un usuario
 * @param {string} userId
 * @returns {number} Total de mensajes no leídos
 */
async function getUnreadCount(userId) {
  try {
    const unread = await prisma.chatParticipant.aggregate({
      _sum: { unreadCount: true },
      where: { userId },
    });

    return unread._sum.unreadCount || 0;
  } catch (error) {
    logger.error('[Chat] Error getting unread count:', error);
    throw error;
  }
}

/**
 * Obtiene threads no leídos del usuario
 * @param {string} userId
 * @returns {Array} Threads con mensajes no leídos
 */
async function getUnreadThreads(userId) {
  try {
    const threads = await prisma.chatThread.findMany({
      where: {
        participants: {
          some: {
            userId,
            unreadCount: { gt: 0 },
          },
        },
      },
      include: {
        expedient: { select: { code: true } },
        participants: {
          where: { userId },
          select: { unreadCount: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return threads;
  } catch (error) {
    logger.error('[Chat] Error getting unread threads:', error);
    throw error;
  }
}

/**
 * Edita un mensaje
 * @param {string} messageId
 * @param {string} newContent
 */
async function editMessage(messageId, newContent) {
  try {
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        edited: true,
        editedAt: new Date(),
      },
    });

    logger.info(`[Chat] Message ${messageId} edited`);
    return message;
  } catch (error) {
    logger.error('[Chat] Error editing message:', error);
    throw error;
  }
}

/**
 * Archiva un thread de chat
 * @param {string} threadId
 */
async function archiveThread(threadId) {
  try {
    const thread = await prisma.chatThread.update({
      where: { id: threadId },
      data: { archivedAt: new Date() },
    });

    logger.info(`[Chat] Thread ${threadId} archived`);
    return thread;
  } catch (error) {
    logger.error('[Chat] Error archiving thread:', error);
    throw error;
  }
}

/**
 * Agrega un usuario a un thread de chat
 * @param {string} threadId
 * @param {string} userId
 */
async function addParticipant(threadId, userId) {
  try {
    const participant = await prisma.chatParticipant.create({
      data: { threadId, userId },
    });

    logger.info(`[Chat] User ${userId} added to thread ${threadId}`);
    return participant;
  } catch (error) {
    logger.error('[Chat] Error adding participant:', error);
    throw error;
  }
}

module.exports = {
  createChatThread,
  sendMessage,
  getChatThread,
  getUserChatThreads,
  getMentions,
  notifyMentions,
  markThreadAsRead,
  getUnreadCount,
  getUnreadThreads,
  editMessage,
  archiveThread,
  addParticipant,
};
