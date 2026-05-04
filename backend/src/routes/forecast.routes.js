const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * GET /forecast/market-data/:city/:zone
 * Datos de mercado por ciudad y zona
 */
router.get('/market-data/:city/:zone', async (req, res) => {
  try {
    const { city, zone } = req.params;
    const data = await prisma.propertyMarketData.findFirst({
      where: { city, zone },
      orderBy: { lastUpdated: 'desc' },
    }).catch(() => null);

    if (!data) {
      // Devolver datos de ejemplo si no hay datos reales
      return res.json({
        city, zone,
        avgPrice: 0,
        avgPricePerSqm: 0,
        trendPercentage: 0,
        lastUpdated: new Date(),
        message: 'Sin datos de mercado disponibles para esta zona',
      });
    }
    res.json(data);
  } catch (error) {
    logger.error('[Forecast] market-data error:', error);
    res.status(500).json({ error: 'Error obteniendo datos de mercado' });
  }
});

/**
 * GET /forecast/trend-data/:city/:propertyType
 * Tendencias de mercado
 */
router.get('/trend-data/:city/:propertyType', async (req, res) => {
  try {
    const { city, propertyType } = req.params;
    const data = await prisma.propertyMarketData.findMany({
      where: { city, propertyType },
      orderBy: { lastUpdated: 'desc' },
      take: 12,
    }).catch(() => []);

    res.json({ city, propertyType, dataPoints: data });
  } catch (error) {
    logger.error('[Forecast] trend-data error:', error);
    res.status(500).json({ error: 'Error obteniendo tendencias' });
  }
});

/**
 * POST /forecast/property-valuation
 * Valoración estimada de inmueble
 */
router.post('/property-valuation', async (req, res) => {
  try {
    const { address, sqm, bedrooms, city } = req.body;

    if (!sqm || !city) {
      return res.status(400).json({ error: 'sqm y city son obligatorios' });
    }

    const marketData = await prisma.propertyMarketData.findFirst({
      where: { city },
      orderBy: { lastUpdated: 'desc' },
    }).catch(() => null);

    const pricePerSqm = marketData?.avgPricePerSqm || 2500;
    const estimatedValue = parseFloat(sqm) * pricePerSqm;

    res.json({
      address,
      sqm: parseFloat(sqm),
      bedrooms: parseInt(bedrooms) || 0,
      city,
      estimatedValue,
      pricePerSqm,
      confidence: marketData ? 75 : 40,
      basedOnMarketData: !!marketData,
      calculatedAt: new Date(),
    });
  } catch (error) {
    logger.error('[Forecast] property-valuation error:', error);
    res.status(500).json({ error: 'Error calculando valoración' });
  }
});

/**
 * GET /forecast/commission/:userId
 * Previsión de comisiones por usuario
 */
router.get('/commission/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const commissions = await prisma.commission.findMany({
      where: { userId },
      include: { expedient: { select: { code: true, operationType: true } } },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const totalEarned = commissions
      .filter(c => c.paid)
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    const totalPending = commissions
      .filter(c => !c.paid)
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    res.json({
      userId,
      commissions,
      summary: {
        totalEarned,
        totalPending,
        total: totalEarned + totalPending,
        count: commissions.length,
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error('[Forecast] commission error:', error);
    res.status(500).json({ error: 'Error obteniendo comisiones' });
  }
});

module.exports = router;
