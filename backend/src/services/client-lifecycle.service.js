/**
 * Client Lifecycle Service
 * Calcula score (FRIO/TIBIO/CALIENTE/HOT) y lifecycle stage (LEAD/PROSPECTO/ACTIVO/RECURRENTE/PERDIDO)
 * basado en actividad y expedientes del cliente
 */

const { prisma } = require('../config/db');
const logger = require('../config/logger');
const workflowEngine = require('./workflow-engine.service');

// Scores posibles
const SCORES = {
  FRIO: 'FRIO',
  TIBIO: 'TIBIO',
  CALIENTE: 'CALIENTE',
  HOT: 'HOT',
};

// Lifecycle stages
const STAGES = {
  LEAD: 'LEAD',
  PROSPECTO: 'PROSPECTO',
  ACTIVO: 'ACTIVO',
  RECURRENTE: 'RECURRENTE',
  PERDIDO: 'PERDIDO',
};

// Fases avanzadas que indican cliente HOT
const HOT_PHASES = ['ARRAS', 'HIPOTECA', 'NOTARIA', 'CIERRE', 'POSVENTA'];

// Fases iniciales de expediente
const INITIAL_PHASES = ['CAPTACION', 'VALORACION', 'FORMULARIO', 'DOCUMENTACION', 'VALIDACION'];

/**
 * Recalcula el score de un cliente basado en actividad reciente
 * @param {string} clientId
 * @returns {Promise<string|null>} Nuevo score o null si hay error
 */
async function recalculateScore(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        score: true,
        expedients: { select: { id: true, status: true, currentPhase: true } },
      },
    });

    if (!client) {
      logger.warn(`[Lifecycle] Cliente no encontrado: ${clientId}`);
      return null;
    }

    // Calcular fecha límite (30 días atrás)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Contar eventos de los últimos 30 días
    const recentEventsCount = await prisma.activityEvent.count({
      where: {
        clientId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Contar expedientes activos
    const activeExpedients = client.expedients.filter(e => e.status === 'ACTIVO');
    const activeExpedientsCount = activeExpedients.length;

    // Verificar si hay visitas con interés HIGH en los últimos 30 días
    const expedientIds = client.expedients.map(e => e.id);
    const recentHighInterestVisits = await prisma.visit.count({
      where: {
        expedientId: { in: expedientIds },
        interestLevel: 'HIGH',
        date: { gte: thirtyDaysAgo },
      },
    });

    // Verificar si algún expediente está en fase avanzada
    const hasAdvancedPhase = client.expedients.some(e =>
      HOT_PHASES.includes(e.currentPhase)
    );

    // Calcular score
    let newScore = SCORES.FRIO;

    if (recentEventsCount === 0) {
      newScore = SCORES.FRIO;
    } else if (recentEventsCount >= 1 && recentEventsCount <= 3) {
      newScore = SCORES.TIBIO;
    } else if (recentEventsCount >= 4 && recentEventsCount <= 8) {
      newScore = SCORES.CALIENTE;
    } else if (recentEventsCount >= 9 || recentHighInterestVisits > 0 || hasAdvancedPhase) {
      newScore = SCORES.HOT;
    }

    // Actualizar si cambió
    if (newScore !== client.score) {
      await prisma.client.update({
        where: { id: clientId },
        data: { score: newScore },
      });
      logger.info(`[Lifecycle] Score actualizado: ${clientId} → ${newScore}`);
      
      // Trigger workflow: score changed
      await workflowEngine.trigger(workflowEngine.TRIGGER_EVENTS.CLIENT_SCORE_CHANGED, {
        client: { ...client, score: newScore },
        fromScore: client.score,
        toScore: newScore,
      });
    }

    return newScore;
  } catch (error) {
    logger.error('[Lifecycle] Error al recalcular score:', error.message);
    return null;
  }
}

/**
 * Recalcula el lifecycle stage de un cliente
 * @param {string} clientId
 * @returns {Promise<string|null>} Nuevo stage o null si hay error
 */
async function recalculateLifecycle(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        lifecycleStage: true,
        expedients: {
          select: {
            id: true,
            status: true,
            currentPhase: true,
            closedAt: true,
          },
        },
      },
    });

    if (!client) {
      logger.warn(`[Lifecycle] Cliente no encontrado: ${clientId}`);
      return null;
    }

    let newStage = client.lifecycleStage;

    // Sin expedientes → LEAD
    if (client.expedients.length === 0) {
      newStage = STAGES.LEAD;
    } else {
      // Verificar si tiene algún expediente cancelado
      const hasCancelled = client.expedients.some(e => e.status === 'CANCELADO');

      // Verificar si tiene expedientes completados
      const hasCompleted = client.expedients.some(e => e.status === 'COMPLETADO');

      // Verificar expedientes activos
      const activeExpedients = client.expedients.filter(e => e.status === 'ACTIVO');

      if (activeExpedients.length > 0) {
        // Algún expediente en fase avanzada → ACTIVO
        const hasAdvancedActive = activeExpedients.some(e =>
          ['ARRAS', 'HIPOTECA', 'NOTARIA', 'CIERRE'].includes(e.currentPhase)
        );

        if (hasAdvancedActive) {
          newStage = STAGES.ACTIVO;
        } else {
          // Expedientes activos en fases iniciales → PROSPECTO
          newStage = STAGES.PROSPECTO;
        }
      } else if (hasCompleted) {
        // Solo expedientes completados → RECURRENTE
        newStage = STAGES.RECURRENTE;
      } else if (hasCancelled && client.expedients.every(e => e.status === 'CANCELADO')) {
        // Todos cancelados → PERDIDO
        newStage = STAGES.PERDIDO;
      }
    }

    // Actualizar si cambió
    if (newStage !== client.lifecycleStage) {
      await prisma.client.update({
        where: { id: clientId },
        data: { lifecycleStage: newStage },
      });
      logger.info(`[Lifecycle] Lifecycle actualizado: ${clientId} → ${newStage}`);
      
      // Trigger workflow: stage changed
      await workflowEngine.trigger(workflowEngine.TRIGGER_EVENTS.CLIENT_STAGE_CHANGED, {
        client: { ...client, lifecycleStage: newStage },
        fromStage: client.lifecycleStage,
        toStage: newStage,
      });
    }

    return newStage;
  } catch (error) {
    logger.error('[Lifecycle] Error al recalcular lifecycle:', error.message);
    return null;
  }
}

/**
 * Recalcula tanto score como lifecycle de un cliente
 * @param {string} clientId
 * @returns {Promise<Object|null>} { score, lifecycleStage } o null
 */
async function recalculateClientMetrics(clientId) {
  const [score, lifecycleStage] = await Promise.all([
    recalculateScore(clientId),
    recalculateLifecycle(clientId),
  ]);

  return { score, lifecycleStage };
}

/**
 * Recalcula métricas para múltiples clientes (batch)
 * @param {Array<string>} clientIds
 * @returns {Promise<number>} Cantidad de clientes procesados
 */
async function recalculateBatch(clientIds) {
  let count = 0;
  for (const clientId of clientIds) {
    const result = await recalculateClientMetrics(clientId);
    if (result) count++;
  }
  return count;
}

/**
 * Obtiene estadísticas de un cliente para la ficha 360
 * @param {string} clientId
 * @returns {Promise<Object>} Estadísticas del cliente
 */
async function getClientStats(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        score: true,
        lifecycleStage: true,
        lastContactDate: true,
        expedients: {
          select: {
            id: true,
            status: true,
            propertyPrice: true,
            commissionFixed: true,
            commissionPercent: true,
          },
        },
      },
    });

    if (!client) return null;

    const expedients = client.expedients;
    const totalExpedients = expedients.length;
    const activeExpedients = expedients.filter(e => e.status === 'ACTIVO').length;
    const closedExpedients = expedients.filter(e => e.status === 'COMPLETADO').length;

    // Calcular valor total de operaciones (aproximado)
    let totalOperationsValue = 0;
    expedients.forEach(e => {
      if (e.propertyPrice) {
        totalOperationsValue += parseFloat(e.propertyPrice);
      }
    });

    // Calcular comisiones totales estimadas
    let totalCommissions = 0;
    expedients.forEach(e => {
      if (e.commissionFixed) {
        totalCommissions += parseFloat(e.commissionFixed);
      } else if (e.commissionPercent && e.propertyPrice) {
        totalCommissions += parseFloat(e.propertyPrice) * (parseFloat(e.commissionPercent) / 100);
      }
    });

    // Días desde último contacto
    let daysSinceLastContact = null;
    if (client.lastContactDate) {
      const lastContact = new Date(client.lastContactDate);
      const now = new Date();
      daysSinceLastContact = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));
    }

    // Última actividad
    const lastActivity = await prisma.activityEvent.findFirst({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, type: true },
    });

    return {
      clientId,
      score: client.score,
      lifecycleStage: client.lifecycleStage,
      totalExpedients,
      activeExpedients,
      closedExpedients,
      totalOperationsValue,
      totalCommissions,
      lastContactDate: client.lastContactDate,
      daysSinceLastContact,
      lastActivityAt: lastActivity?.createdAt || null,
      lastActivityType: lastActivity?.type || null,
    };
  } catch (error) {
    logger.error('[Lifecycle] Error al obtener stats:', error.message);
    return null;
  }
}

module.exports = {
  SCORES,
  STAGES,
  recalculateScore,
  recalculateLifecycle,
  recalculateClientMetrics,
  recalculateBatch,
  getClientStats,
};
