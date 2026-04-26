/**
 * Workflow Engine Service
 * Sistema de reglas y automatizaciones para el CRM
 */

const { prisma } = require('../config/db');
const logger = require('../config/logger');
const notificationEngine = require('./notification.engine');
const activityFeed = require('./activity-feed.service');

const TRIGGER_EVENTS = {
  CLIENT_SCORE_CHANGED: 'CLIENT_SCORE_CHANGED',
  CLIENT_STAGE_CHANGED: 'CLIENT_STAGE_CHANGED',
  DAYS_SINCE_CONTACT: 'DAYS_SINCE_CONTACT',
  TASK_OVERDUE: 'TASK_OVERDUE',
  EXPEDIENT_PHASE_CHANGED: 'EXPEDIENT_PHASE_CHANGED',
  CLIENT_CREATED: 'CLIENT_CREATED',
  COMMUNICATION_RECEIVED: 'COMMUNICATION_RECEIVED',
};

const ACTION_TYPES = {
  CREATE_TASK: 'CREATE_TASK',
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
  UPDATE_CLIENT: 'UPDATE_CLIENT',
  CREATE_NOTE: 'CREATE_NOTE',
  ASSIGN_USER: 'ASSIGN_USER',
  WEBHOOK: 'WEBHOOK',
};

/**
 * Evaluar y ejecutar workflows para un evento
 * @param {string} event - Tipo de evento
 * @param {object} context - Contexto del evento (cliente, expediente, etc.)
 */
async function trigger(event, context) {
  try {
    // Buscar reglas activas para este evento
    const rules = await prisma.workflowRule.findMany({
      where: {
        triggerEvent: event,
        active: true,
      },
    });

    if (rules.length === 0) return;

    logger.info(`[Workflow] ${rules.length} reglas encontradas para ${event}`);

    // Evaluar cada regla
    for (const rule of rules) {
      try {
        const shouldExecute = evaluateConditions(rule.conditions, context);
        
        if (shouldExecute) {
          await executeRule(rule, context);
        }
      } catch (err) {
        logger.error(`[Workflow] Error ejecutando regla ${rule.id}:`, err);
        await logExecution(rule.id, context, 'FAILED', null, err.message);
      }
    }
  } catch (err) {
    logger.error('[Workflow] Error en trigger:', err);
  }
}

/**
 * Evaluar condiciones de una regla
 * @param {object} conditions - Condiciones de la regla
 * @param {object} context - Contexto del evento
 * @returns {boolean}
 */
function evaluateConditions(conditions, context) {
  if (!conditions) return true; // Sin condiciones = siempre ejecutar

  const { client, expedient, task, fromScore, fromStage } = context;

  // Condiciones de Score
  if (conditions.score && client?.score !== conditions.score) {
    return false;
  }
  if (conditions.fromScore && fromScore !== conditions.fromScore) {
    return false;
  }
  if (conditions.scoreNot && client?.score === conditions.scoreNot) {
    return false;
  }

  // Condiciones de Stage
  if (conditions.stage && client?.lifecycleStage !== conditions.stage) {
    return false;
  }
  if (conditions.fromStage && fromStage !== conditions.fromStage) {
    return false;
  }

  // Condiciones de tipo de cliente
  if (conditions.clientType && client?.type !== conditions.clientType) {
    return false;
  }

  // Condiciones de expediente
  if (conditions.expedientType && expedient?.operationType !== conditions.expedientType) {
    return false;
  }
  if (conditions.expedientPhase && expedient?.currentPhase !== conditions.expedientPhase) {
    return false;
  }

  // Condiciones de tarea
  if (conditions.taskType && task?.type !== conditions.taskType) {
    return false;
  }
  if (conditions.taskPriority && task?.priority !== conditions.taskPriority) {
    return false;
  }

  // Condiciones de tiempo (días sin contacto)
  if (conditions.daysSinceContact !== undefined) {
    const days = calculateDaysSince(client?.lastContactDate);
    if (days < conditions.daysSinceContact) {
      return false;
    }
  }

  // Condiciones de etiquetas
  if (conditions.hasTag && !client?.tags?.includes(conditions.hasTag)) {
    return false;
  }

  return true;
}

/**
 * Ejecutar acciones de una regla
 * @param {object} rule - Regla a ejecutar
 * @param {object} context - Contexto
 */
async function executeRule(rule, context) {
  const { client, expedient, user } = context;
  
  logger.info(`[Workflow] Ejecutando regla "${rule.name}" para cliente ${client?.id}`);

  const execution = await logExecution(rule.id, context, 'RUNNING');
  const results = [];

  try {
    for (const action of rule.actions) {
      const result = await executeAction(action, context);
      results.push(result);
    }

    // Actualizar regla
    await prisma.workflowRule.update({
      where: { id: rule.id },
      data: {
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    });

    await logExecution(rule.id, context, 'COMPLETED', results);
    
    // Registrar en activity feed
    if (client?.id) {
      await activityFeed.recordActivity({
        type: 'WORKFLOW_EXECUTED',
        title: `Automatización: ${rule.name}`,
        description: `${results.length} acciones ejecutadas`,
        clientId: client.id,
        expedientId: expedient?.id,
        metadata: { ruleId: rule.id, ruleName: rule.name, results },
      });
    }

  } catch (err) {
    await logExecution(rule.id, context, 'FAILED', results, err.message);
    throw err;
  }
}

/**
 * Ejecutar una acción individual
 * @param {object} action - Acción a ejecutar
 * @param {object} context - Contexto
 */
async function executeAction(action, context) {
  const { client, expedient, user } = context;

  switch (action.type) {
    case ACTION_TYPES.CREATE_TASK:
      return await createTaskAction(action.config, context);
    
    case ACTION_TYPES.SEND_NOTIFICATION:
      return await sendNotificationAction(action.config, context);
    
    case ACTION_TYPES.UPDATE_CLIENT:
      return await updateClientAction(action.config, context);
    
    case ACTION_TYPES.CREATE_NOTE:
      return await createNoteAction(action.config, context);
    
    case ACTION_TYPES.ASSIGN_USER:
      return await assignUserAction(action.config, context);
    
    case ACTION_TYPES.WEBHOOK:
      return await webhookAction(action.config, context);
    
    default:
      throw new Error(`Tipo de acción no soportado: ${action.type}`);
  }
}

// ============ ACCIONES ============

async function createTaskAction(config, { client, expedient, user }) {
  const task = await prisma.task.create({
    data: {
      title: config.title,
      description: config.description,
      type: config.taskType || 'OTRA',
      priority: config.priority || 'MEDIUM',
      clientId: client?.id,
      expedientId: expedient?.id,
      assignedToId: config.assignedToId || user?.id,
      dueDate: config.dueDays ? new Date(Date.now() + config.dueDays * 24 * 60 * 60 * 1000) : null,
    },
  });

  logger.info(`[Workflow] Tarea creada: ${task.id}`);
  return { type: 'CREATE_TASK', taskId: task.id };
}

async function sendNotificationAction(config, { client, expedient }) {
  const notification = await notificationEngine.send({
    userId: config.userId,
    type: config.notificationType || 'WORKFLOW_ALERT',
    title: config.title.replace(/\{clientName\}/g, client?.firstName || 'Cliente'),
    message: config.message
      ?.replace(/\{clientName\}/g, `${client?.firstName || ''} ${client?.lastName || ''}`.trim())
      ?.replace(/\{clientEmail\}/g, client?.email || '')
      ?.replace(/\{expedientCode\}/g, expedient?.code || ''),
    link: config.link || (client?.id ? `/clients/${client.id}` : null),
  });

  return { type: 'SEND_NOTIFICATION', notificationId: notification?.id };
}

async function updateClientAction(config, { client }) {
  if (!client?.id) return { type: 'UPDATE_CLIENT', error: 'No client' };

  const update = {};
  if (config.score) update.score = config.score;
  if (config.lifecycleStage) update.lifecycleStage = config.lifecycleStage;
  if (config.tags) update.tags = { push: config.tags };
  if (config.source) update.source = config.source;

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: update,
  });

  return { type: 'UPDATE_CLIENT', clientId: updated.id };
}

async function createNoteAction(config, { client, user }) {
  if (!client?.id) return { type: 'CREATE_NOTE', error: 'No client' };

  const note = await prisma.clientNote.create({
    data: {
      clientId: client.id,
      authorId: config.authorId || user?.id,
      content: config.content,
      pinned: config.pinned || false,
    },
  });

  return { type: 'CREATE_NOTE', noteId: note.id };
}

async function assignUserAction(config, { expedient }) {
  if (!expedient?.id) return { type: 'ASSIGN_USER', error: 'No expedient' };

  const assignment = await prisma.expedientAssignment.create({
    data: {
      expedientId: expedient.id,
      userId: config.userId,
      role: config.role || 'COMERCIAL',
    },
  });

  return { type: 'ASSIGN_USER', assignmentId: assignment.id };
}

async function webhookAction(config, context) {
  try {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify({
        event: context.event,
        timestamp: new Date().toISOString(),
        data: context,
      }),
    });

    return { 
      type: 'WEBHOOK', 
      status: response.status,
      ok: response.ok 
    };
  } catch (err) {
    logger.error('[Workflow] Webhook failed:', err);
    return { type: 'WEBHOOK', error: err.message };
  }
}

// ============ UTILIDADES ============

async function logExecution(ruleId, context, status, output = null, error = null) {
  return await prisma.workflowExecution.create({
    data: {
      ruleId,
      clientId: context.client?.id,
      expedientId: context.expedient?.id,
      status,
      input: context,
      output,
      error,
      completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : null,
    },
  });
}

function calculateDaysSince(date) {
  if (!date) return Infinity;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============ CRON JOBS ============

/**
 * Ejecutar reglas basadas en tiempo (días sin contacto, etc.)
 * Llamar desde un cron job cada día
 */
async function runScheduledRules() {
  try {
    // Buscar clientes que cumplan condiciones de tiempo
    const rules = await prisma.workflowRule.findMany({
      where: {
        triggerEvent: TRIGGER_EVENTS.DAYS_SINCE_CONTACT,
        active: true,
      },
    });

    for (const rule of rules) {
      const days = rule.conditions?.daysSinceContact;
      if (!days) continue;

      const clients = await prisma.client.findMany({
        where: {
          active: true,
          OR: [
            { lastContactDate: { lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
            { lastContactDate: null },
          ],
        },
      });

      for (const client of clients) {
        await trigger(TRIGGER_EVENTS.DAYS_SINCE_CONTACT, { client });
      }
    }

    logger.info(`[Workflow] Scheduled rules executed`);
  } catch (err) {
    logger.error('[Workflow] Error en scheduled rules:', err);
  }
}

module.exports = {
  trigger,
  runScheduledRules,
  TRIGGER_EVENTS,
  ACTION_TYPES,
  evaluateConditions,
};
