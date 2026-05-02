const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * Calcula score de valor de un cliente (0-100)
 * Basado en: número de expedientes, valor total, ciclo de vida
 * @param {string} clientId
 * @returns {number} Score 0-100
 */
async function calculateClientScore(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        expedients: {
          select: {
            id: true,
            status: true,
            propertyPrice: true,
            closedAt: true,
          },
        },
        segment: true,
      },
    });

    if (!client) return 0;

    let score = 0;

    // Puntos por número de expedientes (max 30 puntos)
    const expedientCount = client.expedients.length;
    score += Math.min(expedientCount * 5, 30);

    // Puntos por expedientes cerrados (max 25 puntos)
    const closedCount = client.expedients.filter(e => e.status === 'COMPLETADO').length;
    score += Math.min(closedCount * 10, 25);

    // Puntos por valor total (max 30 puntos)
    const totalValue = client.expedients.reduce((sum, e) => sum + (parseFloat(e.propertyPrice) || 0), 0);
    const valueScore = Math.min(totalValue / 10000, 30); // 100k = 30 puntos
    score += valueScore;

    // Puntos por ciclo de vida (max 15 puntos)
    const lifecyclePoints = {
      RECURRENTE: 15,
      ACTIVO: 10,
      PROSPECTO: 5,
      LEAD: 0,
      PERDIDO: -10,
    };
    score += lifecyclePoints[client.lifecycleStage] || 0;

    // Asegurar que está entre 0 y 100
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
  } catch (error) {
    logger.error('[Segment] Error calculating client score:', error);
    throw error;
  }
}

/**
 * Segmenta un cliente basado en su score y actividad
 * @param {string} clientId
 * @returns {string} Segmento: VIP, NORMAL, RIESGO, DORMIDO
 */
async function segmentClient(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        activityEvents: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { timestamp: true },
        },
      },
    });

    if (!client) return 'NORMAL';

    const score = await calculateClientScore(clientId);
    const lastActivityDays = client.activityEvents[0]
      ? Math.floor((Date.now() - client.activityEvents[0].timestamp) / (1000 * 60 * 60 * 24))
      : null;

    let segment = 'NORMAL';

    // VIP: score >= 75 y actividad reciente
    if (score >= 75 && (!lastActivityDays || lastActivityDays <= 30)) {
      segment = 'VIP';
    }
    // DORMIDO: sin actividad > 90 días
    else if (lastActivityDays && lastActivityDays > 90) {
      segment = 'DORMIDO';
    }
    // RIESGO: score <= 25 y sin actividad > 60 días
    else if (score <= 25 && lastActivityDays && lastActivityDays > 60) {
      segment = 'RIESGO';
    }

    // Guardar segmentación
    await prisma.clientSegment.upsert({
      where: { clientId },
      update: {
        segment,
        score,
        lastCalculated: new Date(),
      },
      create: {
        clientId,
        segment,
        score,
        lastCalculated: new Date(),
      },
    });

    logger.info(`[Segment] Client ${clientId} segmented as ${segment} (score: ${score})`);

    return segment;
  } catch (error) {
    logger.error('[Segment] Error segmenting client:', error);
    throw error;
  }
}

/**
 * Recalcula segmentación de todos los clientes
 * Se ejecuta como job diario
 */
async function recalculateSegments() {
  try {
    logger.info('[Segment] Starting bulk recalculation of all client segments...');

    const clients = await prisma.client.findMany({
      select: { id: true },
      where: { active: true },
    });

    let updated = 0;
    for (const client of clients) {
      try {
        await segmentClient(client.id);
        updated++;
      } catch (e) {
        logger.warn(`[Segment] Failed to segment client ${client.id}`);
      }
    }

    logger.info(`[Segment] Recalculation completed: ${updated}/${clients.length} clients updated`);
  } catch (error) {
    logger.error('[Segment] Error recalculating segments:', error);
  }
}

/**
 * Obtiene la cadena de referidos (quién refirió a quién)
 * @param {string} clientId
 * @returns {Object} Árbol de referidos
 */
async function getReferralChain(clientId) {
  try {
    const referrer = await prisma.clientReferral.findFirst({
      where: { referredClientId: clientId },
      include: {
        referrerClient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const referrals = await prisma.clientReferral.findMany({
      where: { referrerClientId: clientId },
      include: {
        referredClient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const result = {
      clientId,
      referredBy: referrer
        ? {
            id: referrer.referrerClient.id,
            name: `${referrer.referrerClient.firstName} ${referrer.referrerClient.lastName}`,
          }
        : null,
      hasReferred: referrals.map(r => ({
        id: r.referredClient.id,
        name: `${r.referredClient.firstName} ${r.referredClient.lastName}`,
        closedExpedients: r.closedExpedients,
        value: r.value,
      })),
      totalReferredValue: referrals.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0),
    };

    return result;
  } catch (error) {
    logger.error('[Segment] Error getting referral chain:', error);
    throw error;
  }
}

/**
 * Obtiene historial de scores de un cliente (tendencia)
 * @param {string} clientId
 * @returns {Array} Histórico de scores
 */
async function getClientValueHistory(clientId) {
  try {
    const segments = await prisma.clientSegment.findMany({
      where: { clientId },
      orderBy: { lastCalculated: 'asc' },
      take: 12, // Últimos 12 cálculos
    });

    return segments.map(s => ({
      date: s.lastCalculated,
      score: s.score,
      segment: s.segment,
      valueEstimate: s.valueEstimate,
    }));
  } catch (error) {
    logger.error('[Segment] Error getting client value history:', error);
    throw error;
  }
}

/**
 * Obtiene clientes por segmento
 * @param {string} segment - VIP, NORMAL, RIESGO, DORMIDO
 * @param {number} limit
 * @returns {Array} Clientes del segmento
 */
async function getClientsBySegment(segment, limit = 50) {
  try {
    const clients = await prisma.clientSegment.findMany({
      where: { segment },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            score: true,
            lifecycleStage: true,
          },
        },
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return clients.map(c => ({
      ...c.client,
      segmentScore: c.score,
      valueEstimate: c.valueEstimate,
    }));
  } catch (error) {
    logger.error('[Segment] Error getting clients by segment:', error);
    throw error;
  }
}

/**
 * Registra una referencia entre clientes
 * @param {string} referrerClientId
 * @param {string} referredClientId
 * @param {string} notes
 */
async function createReferral(referrerClientId, referredClientId, notes = null) {
  try {
    const referral = await prisma.clientReferral.create({
      data: {
        referrerClientId,
        referredClientId,
        notes,
      },
    });

    logger.info(`[Segment] Referral created: ${referrerClientId} → ${referredClientId}`);

    return referral;
  } catch (error) {
    logger.error('[Segment] Error creating referral:', error);
    throw error;
  }
}

/**
 * Actualiza valor estimado de un cliente
 * @param {string} clientId
 * @param {number} estimatedValue
 */
async function updateValueEstimate(clientId, estimatedValue) {
  try {
    const segment = await prisma.clientSegment.upsert({
      where: { clientId },
      update: { valueEstimate: estimatedValue },
      create: {
        clientId,
        segment: 'NORMAL',
        score: 50,
        valueEstimate: estimatedValue,
      },
    });

    return segment;
  } catch (error) {
    logger.error('[Segment] Error updating value estimate:', error);
    throw error;
  }
}

module.exports = {
  calculateClientScore,
  segmentClient,
  recalculateSegments,
  getReferralChain,
  getClientValueHistory,
  getClientsBySegment,
  createReferral,
  updateValueEstimate,
};
