/**
 * Tasks Controller
 * Gestión de tareas individuales con sincronización a calendario
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const calendarSync = require('../services/calendar-sync.service');
const activityFeed = require('../services/activity-feed.service');
const logger = require('../config/logger');

// Tipos y prioridades válidos
const VALID_TYPES = ['LLAMAR', 'EMAIL', 'VISITA', 'REVISAR_DOC', 'FIRMAR', 'OTRA'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

// Listar tareas con filtros
async function list(req, res) {
  const {
    assignedToId,
    clientId,
    expedientId,
    completed,
    priority,
    type,
    dueFrom,
    dueTo,
    limit = 50,
    offset = 0,
  } = req.query;

  const where = {
    ...(assignedToId && { assignedToId }),
    ...(clientId && { clientId }),
    ...(expedientId && { expedientId }),
    ...(priority && { priority }),
    ...(type && { type }),
    ...(completed !== undefined && {
      completedAt: completed === 'true' ? { not: null } : null,
    }),
    ...(dueFrom || dueTo) && {
      dueDate: {
        ...(dueFrom && { gte: new Date(dueFrom) }),
        ...(dueTo && { lte: new Date(dueTo) }),
      },
    },
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [
        { completedAt: 'asc' }, // Primero las no completadas
        { priority: 'desc' },    // Luego por prioridad
        { dueDate: 'asc' },      // Luego por fecha
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        expedient: { select: { id: true, code: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        calendarEvent: { select: { id: true, startAt: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  res.json({ data: tasks, total, limit: parseInt(limit), offset: parseInt(offset) });
}

// Crear tarea
async function create(req, res) {
  const {
    title,
    description,
    clientId,
    expedientId,
    assignedToId,
    dueDate,
    priority = 'MEDIUM',
    type = 'OTRA',
  } = req.body;

  // Validaciones
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` });
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Prioridad inválida. Válidas: ${VALID_PRIORITIES.join(', ')}` });
  }

  // Verificar client/expedient si se proporcionan
  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  if (expedientId) {
    const expedient = await prisma.expedient.findUnique({ where: { id: expedientId } });
    if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });
  }

  // Crear tarea
  const task = await prisma.task.create({
    data: {
      title,
      description,
      clientId,
      expedientId,
      assignedToId,
      createdById: req.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      type,
    },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      expedient: { select: { id: true, code: true, clientId: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Si tiene dueDate, sincronizar con calendario
  if (dueDate) {
    try {
      await calendarSync.syncTaskWithCalendar(task, req.user.id);
    } catch (err) {
      logger.warn('[Tasks] Error al sincronizar con calendario:', err.message);
    }
  }

  // Registrar actividad
  activityFeed.recordActivity({
    type: activityFeed.ACTIVITY_TYPES.TASK_CREATED,
    title: `Tarea creada: ${title}`,
    description,
    clientId,
    expedientId,
    userId: req.user.id,
    relatedEntityType: 'Task',
    relatedEntityId: task.id,
    metadata: { type, priority, dueDate },
  }).catch(() => {});

  res.status(201).json(task);
}

// Obtener tarea por ID
async function getById(req, res) {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      expedient: { select: { id: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      calendarEvent: { select: { id: true, startAt: true, endAt: true } },
    },
  });

  if (!task) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  res.json(task);
}

// Actualizar tarea
async function update(req, res) {
  const { id } = req.params;
  const {
    title,
    description,
    clientId,
    expedientId,
    assignedToId,
    dueDate,
    priority,
    type,
  } = req.body;

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { calendarEvent: true },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  // Validaciones
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Prioridad inválida. Válidas: ${VALID_PRIORITIES.join(', ')}` });
  }

  const data = {
    title,
    description,
    clientId,
    expedientId,
    assignedToId,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    priority,
    type,
  };

  // Remover undefined
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      expedient: { select: { id: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      calendarEvent: true,
    },
  });

  // Sincronizar con calendario si hay dueDate o cambió
  if (dueDate || existing.calendarEvent) {
    try {
      await calendarSync.syncTaskWithCalendar(task, req.user.id);
    } catch (err) {
      logger.warn('[Tasks] Error al sincronizar con calendario:', err.message);
    }
  }

  res.json(task);
}

// Eliminar tarea
async function remove(req, res) {
  const { id } = req.params;

  const existing = await prisma.task.findUnique({
    where: { id },
    select: { calendarEventId: true },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  // Eliminar evento de calendario si existe
  if (existing.calendarEventId) {
    try {
      await calendarSync.deleteTaskCalendarEvent(id);
    } catch (err) {
      logger.warn('[Tasks] Error al eliminar evento de calendario:', err.message);
    }
  }

  await prisma.task.delete({
    where: { id },
  });

  res.status(204).send();
}

// Marcar tarea como completada
async function complete(req, res) {
  const { id } = req.params;

  const existing = await prisma.task.findUnique({
    where: { id },
    include: {
      client: true,
      expedient: true,
      calendarEvent: true,
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  if (existing.completedAt) {
    return res.status(400).json({ error: 'La tarea ya está completada' });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { completedAt: new Date() },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      expedient: { select: { id: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      calendarEvent: true,
    },
  });

  // Actualizar evento de calendario como completado
  if (existing.calendarEvent) {
    try {
      await prisma.calendarEvent.update({
        where: { id: existing.calendarEvent.id },
        data: { completed: true },
      });
    } catch (err) {
      logger.warn('[Tasks] Error al actualizar evento de calendario:', err.message);
    }
  }

  // Registrar actividad
  activityFeed.recordActivity({
    type: activityFeed.ACTIVITY_TYPES.TASK_COMPLETED,
    title: `Tarea completada: ${existing.title}`,
    clientId: existing.clientId,
    expedientId: existing.expedientId,
    userId: req.user.id,
    relatedEntityType: 'Task',
    relatedEntityId: id,
    metadata: { type: existing.type },
  }).catch(() => {});

  res.json(task);
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
  complete,
};
