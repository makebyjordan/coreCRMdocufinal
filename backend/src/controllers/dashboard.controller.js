const { prisma } = require('../config/db');

async function getStats(req, res) {
  try {
    const [totalActive, totalClosed, totalBlocked, pendingDocs, pendingSignatures] = await Promise.all([
      prisma.expedient.count({ where: { status: 'ACTIVO' } }),
      prisma.expedient.count({ where: { status: 'COMPLETADO' } }),
      prisma.expedient.count({ where: { status: 'BLOQUEADO' } }),
      prisma.document.count({ where: { status: 'PENDIENTE' } }),
      prisma.signature.count({ where: { status: 'PENDIENTE' } }),
    ]);

    // groupBy manual (compatible SQLite)
    const allExpedients = await prisma.expedient.findMany({
      where: { status: { not: 'CANCELADO' } },
      select: { currentPhase: true, operationType: true, operationSize: true },
    });

    const byPhase = {}, byType = {}, bySize = {};
    for (const e of allExpedients) {
      byPhase[e.currentPhase] = (byPhase[e.currentPhase] || 0) + 1;
      byType[e.operationType] = (byType[e.operationType] || 0) + 1;
      bySize[e.operationSize] = (bySize[e.operationSize] || 0) + 1;
    }

    const totalNonCancelled = allExpedients.length;
    const closureRate = totalNonCancelled > 0 ? Math.round((totalClosed / totalNonCancelled) * 100) : 0;

    const closed = await prisma.expedient.findMany({
      where: { status: 'COMPLETADO', closedAt: { not: null } },
      select: { openedAt: true, closedAt: true },
    });
    const avgDays = closed.length > 0
      ? Math.round(closed.reduce((sum, e) => sum + (new Date(e.closedAt) - new Date(e.openedAt)) / (1000 * 60 * 60 * 24), 0) / closed.length)
      : 0;

    res.json({
      expedients: { active: totalActive, closed: totalClosed, blocked: totalBlocked },
      closureRate, avgDaysToClose: avgDays,
      pendingDocs, pendingSignatures,
      byPhase, byType, bySize,
    });
  } catch (err) {
    console.error('Error en getStats:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getAlerts(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const [blocked, stale, incompleteChecklists, pendingSignatures] = await Promise.all([
      prisma.expedient.findMany({
        where: { status: 'BLOQUEADO', updatedAt: { lt: twoDaysAgo } },
        include: { client: true },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.expedient.findMany({
        where: { status: 'ACTIVO', updatedAt: { lt: sevenDaysAgo } },
        include: { client: true },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      prisma.checklistInstance.findMany({
        where: { completedAt: null, createdAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } },
        include: { expedient: true, template: true },
        take: 10,
      }),
      prisma.signature.findMany({
        where: { status: 'ENVIADO', updatedAt: { lt: sevenDaysAgo } },
        include: { expedient: true },
        take: 10,
      }),
    ]);

    res.json({ blocked, stale, incompleteChecklists, pendingSignatures });
  } catch (err) {
    console.error('Error en getAlerts:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getRecentActivity(req, res) {
  try {
    const [recentExpedients, recentPhaseChanges, recentNotifications] = await Promise.all([
      prisma.expedient.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: true },
      }),
      prisma.phaseHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          expedient: true,
          changedBy: true,
        },
      }),
      prisma.notification.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { status: 'ENVIADO' },
      }),
    ]);

    res.json({ recentExpedients, recentPhaseChanges, recentNotifications });
  } catch (err) {
    console.error('Error en getRecentActivity:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getStats, getAlerts, getRecentActivity };
