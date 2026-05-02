const { isAdmin, isCommercial, userHasAnyRole } = require('../utils/roleHelper');
/**
 * ClientNotes Controller
 * Gestión de notas estructuradas de clientes
 */

const { prisma } = require('../config/db');
const activityFeed = require('../services/activity-feed.service');

// Listar notas de un cliente
async function listByClient(req, res) {
  const { id } = req.params;
  const { pinned } = req.query;

  const where = {
    clientId: id,
    ...(pinned !== undefined && { pinned: pinned === 'true' }),
  };

  const notes = await prisma.clientNote.findMany({
    where,
    orderBy: [
      { pinned: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  res.json(notes);
}

// Crear nota
async function create(req, res) {
  const { id } = req.params;
  const { content, pinned, mentions } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'El contenido es requerido' });
  }

  const note = await prisma.clientNote.create({
    data: {
      clientId: id,
      authorId: req.user.id,
      content,
      pinned: Boolean(pinned),
      mentions: mentions || [],
    },
    include: {
      author: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Registrar actividad (silencioso)
  activityFeed.recordActivity({
    type: activityFeed.ACTIVITY_TYPES.NOTE_CREATED,
    title: `Nota creada para ${note.client.firstName || ''} ${note.client.lastName || ''}`.trim(),
    clientId: id,
    userId: req.user.id,
    relatedEntityType: 'ClientNote',
    relatedEntityId: note.id,
    metadata: { pinned: note.pinned },
  }).catch(() => {});

  res.status(201).json(note);
}

// Actualizar nota (solo autor o ADMIN)
async function update(req, res) {
  const { id, noteId } = req.params;
  const { content, mentions } = req.body;

  const existing = await prisma.clientNote.findUnique({
    where: { id: noteId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  // Verificar permisos: solo autor o ADMIN
  if (existing.authorId !== req.user.id && !userHasAnyRole(req.user, 'ADMINISTRACION') && !userHasAnyRole(req.user, 'DIRECCION')) {
    return res.status(403).json({ error: 'No tienes permisos para editar esta nota' });
  }

  const note = await prisma.clientNote.update({
    where: { id: noteId },
    data: {
      content,
      mentions: mentions || existing.mentions,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  res.json(note);
}

// Eliminar nota (solo autor o ADMIN)
async function remove(req, res) {
  const { noteId } = req.params;

  const existing = await prisma.clientNote.findUnique({
    where: { id: noteId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  // Verificar permisos: solo autor o ADMIN
  if (existing.authorId !== req.user.id && !userHasAnyRole(req.user, 'ADMINISTRACION') && !userHasAnyRole(req.user, 'DIRECCION')) {
    return res.status(403).json({ error: 'No tienes permisos para eliminar esta nota' });
  }

  await prisma.clientNote.delete({
    where: { id: noteId },
  });

  res.status(204).send();
}

// Toggle pinned
async function togglePin(req, res) {
  const { noteId } = req.params;

  const existing = await prisma.clientNote.findUnique({
    where: { id: noteId },
    include: { client: true },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  const note = await prisma.clientNote.update({
    where: { id: noteId },
    data: { pinned: !existing.pinned },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  // Registrar actividad si se pinnó
  if (note.pinned) {
    activityFeed.recordActivity({
      type: activityFeed.ACTIVITY_TYPES.NOTE_PINNED,
      title: `Nota fijada para ${existing.client.firstName || ''} ${existing.client.lastName || ''}`.trim(),
      clientId: existing.clientId,
      userId: req.user.id,
      relatedEntityType: 'ClientNote',
      relatedEntityId: note.id,
    }).catch(() => {});
  }

  res.json(note);
}

module.exports = {
  listByClient,
  create,
  update,
  remove,
  togglePin,
};
