/**
 * ClientCommunications Controller
 * Registro de comunicaciones con clientes (llamadas, emails, whatsapp, etc.)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const activityFeed = require('../services/activity-feed.service');
const logger = require('../config/logger');

// Canales válidos
const VALID_CHANNELS = ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'MEETING'];
const VALID_DIRECTIONS = ['OUTBOUND', 'INBOUND'];
const VALID_STATUSES = ['SENT', 'DELIVERED', 'OPENED', 'FAILED', 'PENDING'];

// Listar comunicaciones de un cliente
async function listByClient(req, res) {
  const { id } = req.params;
  const { channel, direction, from, to, limit = 50, offset = 0 } = req.query;

  const where = {
    clientId: id,
    ...(channel && { channel }),
    ...(direction && { direction }),
    ...(from || to) && {
      sentAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [communications, total] = await Promise.all([
    prisma.clientCommunication.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        sentBy: { select: { id: true, name: true } },
        expedient: { select: { id: true, code: true } },
      },
    }),
    prisma.clientCommunication.count({ where }),
  ]);

  res.json({ data: communications, total, limit: parseInt(limit), offset: parseInt(offset) });
}

// Crear comunicación (registro manual)
async function create(req, res) {
  const { id } = req.params;
  const {
    channel,
    direction = 'OUTBOUND',
    subject,
    body,
    expedientId,
    sentAt,
    status = 'SENT',
    metadata,
  } = req.body;

  // Validaciones
  if (!channel || !VALID_CHANNELS.includes(channel)) {
    return res.status(400).json({ error: `Canal inválido. Válidos: ${VALID_CHANNELS.join(', ')}` });
  }

  if (!VALID_DIRECTIONS.includes(direction)) {
    return res.status(400).json({ error: `Dirección inválida. Válidas: ${VALID_DIRECTIONS.join(', ')}` });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
  }

  // Verificar que el expediente existe si se proporciona
  if (expedientId) {
    const expedient = await prisma.expedient.findUnique({
      where: { id: expedientId },
      select: { id: true, clientId: true },
    });
    if (!expedient) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    // Opcional: verificar que el expediente pertenece al cliente
  }

  const communication = await prisma.clientCommunication.create({
    data: {
      clientId: id,
      expedientId,
      channel,
      direction,
      subject,
      body,
      sentById: req.user.id,
      sentAt: sentAt ? new Date(sentAt) : new Date(),
      status,
      metadata,
    },
    include: {
      sentBy: { select: { id: true, name: true } },
      expedient: { select: { id: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Registrar actividad
  activityFeed.recordActivity({
    type: activityFeed.ACTIVITY_TYPES.COMMUNICATION_SENT,
    title: `${channel}: ${subject || 'Sin asunto'}`,
    description: body?.substring(0, 200),
    clientId: id,
    expedientId,
    userId: req.user.id,
    relatedEntityType: 'ClientCommunication',
    relatedEntityId: communication.id,
    metadata: { channel, direction, status },
  }).catch(() => {});

  res.status(201).json(communication);
}

// Obtener una comunicación por ID
async function getById(req, res) {
  const { communicationId } = req.params;

  const communication = await prisma.clientCommunication.findUnique({
    where: { id: communicationId },
    include: {
      sentBy: { select: { id: true, name: true } },
      expedient: { select: { id: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!communication) {
    return res.status(404).json({ error: 'Comunicación no encontrada' });
  }

  res.json(communication);
}

// Actualizar comunicación
async function update(req, res) {
  const { communicationId } = req.params;
  const { subject, body, status, metadata } = req.body;

  const existing = await prisma.clientCommunication.findUnique({
    where: { id: communicationId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Comunicación no encontrada' });
  }

  // Solo permitir actualizar si el usuario es el creador o admin
  if (existing.sentById !== req.user.id && req.user.role !== 'ADMINISTRACION' && req.user.role !== 'DIRECCION') {
    return res.status(403).json({ error: 'No tienes permisos para editar esta comunicación' });
  }

  const communication = await prisma.clientCommunication.update({
    where: { id: communicationId },
    data: {
      subject,
      body,
      status,
      metadata,
    },
    include: {
      sentBy: { select: { id: true, name: true } },
      expedient: { select: { id: true, code: true } },
    },
  });

  res.json(communication);
}

// Eliminar comunicación
async function remove(req, res) {
  const { communicationId } = req.params;

  const existing = await prisma.clientCommunication.findUnique({
    where: { id: communicationId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Comunicación no encontrada' });
  }

  if (existing.sentById !== req.user.id && req.user.role !== 'ADMINISTRACION' && req.user.role !== 'DIRECCION') {
    return res.status(403).json({ error: 'No tienes permisos para eliminar esta comunicación' });
  }

  await prisma.clientCommunication.delete({
    where: { id: communicationId },
  });

  res.status(204).send();
}

module.exports = {
  listByClient,
  create,
  getById,
  update,
  remove,
};
