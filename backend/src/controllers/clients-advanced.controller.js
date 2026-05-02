const { prisma } = require('../config/db');
const segmentService = require('../services/segment.service');
const logger = require('../config/logger');

/**
 * GET /clients/:clientId/value-score
 * Obtener score de valor del cliente (0-100)
 */
async function getClientValueScore(req, res) {
  try {
    const { clientId } = req.params;

    const score = await segmentService.calculateClientScore(clientId);
    const segment = await segmentService.segmentClient(clientId);

    res.json({
      clientId,
      score,
      segment,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('[Clients Advanced] Get value score error:', error);
    res.status(500).json({ error: 'Failed to get value score' });
  }
}

/**
 * GET /clients/:clientId/referrals
 * Obtener cadena de referidos (árbol)
 */
async function getReferralChain(req, res) {
  try {
    const { clientId } = req.params;

    const chain = await segmentService.getReferralChain(clientId);

    res.json(chain);
  } catch (error) {
    logger.error('[Clients Advanced] Get referral chain error:', error);
    res.status(500).json({ error: 'Failed to get referral chain' });
  }
}

/**
 * GET /clients/:clientId/value-history
 * Historial de evolución de score (tendencia)
 */
async function getClientValueHistory(req, res) {
  try {
    const { clientId } = req.params;
    const { limit = 12 } = req.query;

    const history = await segmentService.getClientValueHistory(clientId);
    const limited = history.slice(-parseInt(limit));

    res.json({
      clientId,
      history: limited,
      dataPoints: limited.length,
    });
  } catch (error) {
    logger.error('[Clients Advanced] Get value history error:', error);
    res.status(500).json({ error: 'Failed to get value history' });
  }
}

/**
 * POST /clients/:referrerClientId/refer/:referredClientId
 * Crear relación de referido
 */
async function createReferral(req, res) {
  try {
    const { referrerClientId, referredClientId } = req.params;
    const { notes } = req.body;

    if (!referrerClientId || !referredClientId) {
      return res.status(400).json({ error: 'Both client IDs required' });
    }

    if (referrerClientId === referredClientId) {
      return res.status(400).json({ error: 'Cannot refer to self' });
    }

    const referral = await segmentService.createReferral(referrerClientId, referredClientId, notes);

    logger.info(`[Clients Advanced] Referral created: ${referrerClientId} → ${referredClientId}`);

    res.json(referral);
  } catch (error) {
    logger.error('[Clients Advanced] Create referral error:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
}

/**
 * PUT /clients/:clientId/value-estimate
 * Actualizar estimación de valor del cliente
 */
async function updateValueEstimate(req, res) {
  try {
    const { clientId } = req.params;
    const { estimatedValue } = req.body;

    if (!estimatedValue || estimatedValue < 0) {
      return res.status(400).json({ error: 'Valid estimatedValue required' });
    }

    const segment = await segmentService.updateValueEstimate(clientId, estimatedValue);

    logger.info(`[Clients Advanced] Value estimate updated for client ${clientId}`);

    res.json({
      clientId,
      estimatedValue,
      segment: segment.segment,
    });
  } catch (error) {
    logger.error('[Clients Advanced] Update value estimate error:', error);
    res.status(500).json({ error: 'Failed to update value estimate' });
  }
}

/**
 * GET /clients/by-segment/:segment
 * Obtener clientes por segmento (VIP, NORMAL, RIESGO, DORMIDO)
 */
async function getClientsBySegment(req, res) {
  try {
    const { segment } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const validSegments = ['VIP', 'NORMAL', 'RIESGO', 'DORMIDO'];
    if (!validSegments.includes(segment)) {
      return res.status(400).json({ error: 'Invalid segment' });
    }

    const clients = await segmentService.getClientsBySegment(segment, parseInt(limit));
    const paginated = clients.slice(offset, offset + parseInt(limit));

    res.json({
      segment,
      totalClients: clients.length,
      clients: paginated,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('[Clients Advanced] Get by segment error:', error);
    res.status(500).json({ error: 'Failed to get clients by segment' });
  }
}

/**
 * GET /clients/:clientId/communication-history
 * Obtener historial de comunicaciones con cliente
 */
async function getClientCommunicationHistory(req, res) {
  try {
    const { clientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const communications = await prisma.clientCommunication.findMany({
      where: { clientId },
      include: {
        sentBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit),
    });

    const total = await prisma.clientCommunication.count({
      where: { clientId },
    });

    res.json({
      clientId,
      totalCommunications: total,
      communications,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('[Clients Advanced] Get communication history error:', error);
    res.status(500).json({ error: 'Failed to get communication history' });
  }
}

module.exports = {
  getClientValueScore,
  getReferralChain,
  getClientValueHistory,
  createReferral,
  updateValueEstimate,
  getClientsBySegment,
  getClientCommunicationHistory,
};
