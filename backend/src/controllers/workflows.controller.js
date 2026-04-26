/**
 * Workflows Controller
 * Administra reglas de automatización
 */

const { prisma } = require('../config/db');
const workflowEngine = require('../services/workflow-engine.service');

// GET /workflows - Listar todas las reglas
async function list(req, res) {
  const { active, triggerEvent } = req.query;

  const where = {
    ...(active !== undefined && { active: active === 'true' }),
    ...(triggerEvent && { triggerEvent }),
  };

  const rules = await prisma.workflowRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { executions: true } },
    },
  });

  res.json({ data: rules });
}

// GET /workflows/:id - Obtener una regla
async function getById(req, res) {
  const { id } = req.params;

  const rule = await prisma.workflowRule.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      executions: {
        take: 20,
        orderBy: { startedAt: 'desc' },
      },
    },
  });

  if (!rule) {
    return res.status(404).json({ error: 'Regla no encontrada' });
  }

  res.json(rule);
}

// POST /workflows - Crear nueva regla
async function create(req, res) {
  const { name, description, triggerEvent, conditions, actions } = req.body;

  if (!name || !triggerEvent || !actions) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const rule = await prisma.workflowRule.create({
      data: {
        name,
        description,
        triggerEvent,
        conditions: conditions || {},
        actions,
        createdById: req.user?.id,
      },
    });

    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /workflows/:id - Actualizar regla
async function update(req, res) {
  const { id } = req.params;
  const { name, description, active, conditions, actions } = req.body;

  try {
    const rule = await prisma.workflowRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        ...(conditions && { conditions }),
        ...(actions && { actions }),
      },
    });

    res.json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /workflows/:id - Eliminar regla
async function remove(req, res) {
  const { id } = req.params;

  try {
    await prisma.workflowRule.delete({ where: { id } });
    res.json({ message: 'Regla eliminada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /workflows/:id/test - Probar una regla
async function test(req, res) {
  const { id } = req.params;
  const { clientId, expedientId } = req.body;

  const rule = await prisma.workflowRule.findUnique({ where: { id } });
  if (!rule) {
    return res.status(404).json({ error: 'Regla no encontrada' });
  }

  // Obtener datos de prueba
  const client = clientId ? await prisma.client.findUnique({
    where: { id: clientId },
  }) : null;

  const expedient = expedientId ? await prisma.expedient.findUnique({
    where: { id: expedientId },
  }) : null;

  // Simular ejecución
  const context = {
    client,
    expedient,
    user: req.user,
    event: rule.triggerEvent,
  };

  const shouldExecute = workflowEngine.evaluateConditions(rule.conditions, context);

  res.json({
    rule: { id: rule.id, name: rule.name },
    context,
    shouldExecute,
    conditions: rule.conditions,
  });
}

// GET /workflows/events - Listar eventos disponibles
function getEvents(req, res) {
  res.json({
    events: Object.entries(workflowEngine.TRIGGER_EVENTS).map(([key, value]) => ({
      id: value,
      label: key.replace(/_/g, ' '),
    })),
  });
}

// GET /workflows/actions - Listar tipos de acciones
function getActionTypes(req, res) {
  res.json({
    actions: [
      { id: 'CREATE_TASK', label: 'Crear tarea', icon: 'task' },
      { id: 'SEND_NOTIFICATION', label: 'Enviar notificación', icon: 'bell' },
      { id: 'UPDATE_CLIENT', label: 'Actualizar cliente', icon: 'user' },
      { id: 'CREATE_NOTE', label: 'Crear nota', icon: 'note' },
      { id: 'ASSIGN_USER', label: 'Asignar usuario', icon: 'assign' },
      { id: 'WEBHOOK', label: 'Llamar webhook', icon: 'webhook' },
    ],
  });
}

// GET /workflows/executions - Historial de ejecuciones
async function getExecutions(req, res) {
  const { ruleId, clientId, status, limit = 50 } = req.query;

  const executions = await prisma.workflowExecution.findMany({
    where: {
      ...(ruleId && { ruleId }),
      ...(clientId && { clientId }),
      ...(status && { status }),
    },
    take: parseInt(limit),
    orderBy: { startedAt: 'desc' },
    include: {
      rule: { select: { id: true, name: true } },
    },
  });

  res.json({ data: executions });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  test,
  getEvents,
  getActionTypes,
  getExecutions,
};
