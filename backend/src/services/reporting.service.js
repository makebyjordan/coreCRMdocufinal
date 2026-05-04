const { prisma } = require('../config/db');
const logger = require('../config/logger');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Genera un reporte de exportación de expedientes en CSV, XLSX o PDF
 * @param {Object} filters - Filtros: operationType, status, phase, comercialId, dateFrom, dateTo
 * @param {string} format - CSV, XLSX, PDF
 * @returns {Object} { fileUrl, fileName, format, rowCount }
 */
async function generateExpedientExport(filters, format = 'CSV', userId) {
  try {
    const where = {};
    if (filters.operationType) where.operationType = filters.operationType;
    if (filters.status) where.status = filters.status;
    if (filters.currentPhase) where.currentPhase = filters.currentPhase;
    if (filters.comercialId) {
      where.assignments = { some: { userId: filters.comercialId, role: 'COMERCIAL' } };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.openedAt = {};
      if (filters.dateFrom) where.openedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.openedAt.lte = new Date(filters.dateTo);
    }

    const expedients = await prisma.expedient.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, email: true, phone: true } },
        assignments: { where: { role: 'COMERCIAL' }, include: { user: { select: { name: true } } } },
      },
      orderBy: { openedAt: 'desc' },
    });

    const data = expedients.map(e => ({
      Código: e.code,
      Cliente: `${e.client?.firstName || ''} ${e.client?.lastName || ''}`,
      Operación: e.operationType,
      Fase: e.currentPhase,
      Estado: e.status,
      Precio: e.propertyPrice?.toString() || '',
      Dirección: e.propertyAddress || '',
      Comercial: e.assignments[0]?.user?.name || '',
      Creado: e.openedAt.toISOString().split('T')[0],
      Cerrado: e.closedAt ? e.closedAt.toISOString().split('T')[0] : 'Abierto',
    }));

    const fileName = `expedientes_${Date.now()}.${format.toLowerCase()}`;
    const filePath = path.join(REPORTS_DIR, fileName);

    if (format === 'XLSX') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expedientes');
      XLSX.writeFile(wb, filePath);
    } else if (format === 'CSV') {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      fs.writeFileSync(filePath, csv, 'utf-8');
    }

    // Save report metadata
    await prisma.report.create({
      data: {
        name: `Exportación expedientes ${new Date().toLocaleDateString()}`,
        type: 'EXPEDIENTS_EXPORT',
        format,
        createdById: userId,
        fileUrl: `/reports/${fileName}`,
        fileSize: fs.statSync(filePath).size,
        filters,
      },
    });

    logger.info(`[Reporting] Expedients export created: ${fileName} (${data.length} rows)`);

    return {
      fileUrl: `/reports/${fileName}`,
      fileName,
      format,
      rowCount: data.length,
    };
  } catch (error) {
    logger.error('[Reporting] Error generating expedient export:', error);
    throw error;
  }
}

/**
 * Genera reporte de comisiones por comercial y período
 * @param {string} userId - ID del usuario (comercial)
 * @param {Object} dateRange - { from: Date, to: Date }
 * @returns {Object} { totalCommissions, byMonth, fileUrl }
 */
async function generateCommissionReport(userId, dateRange) {
  try {
    const where = {
      userId,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    };

    const commissions = await prisma.commission.findMany({
      where,
      include: { expedient: { select: { code: true, propertyAddress: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const byMonth = {};

    commissions.forEach(c => {
      const month = c.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!byMonth[month]) byMonth[month] = 0;
      byMonth[month] += parseFloat(c.amount);
    });

    const fileName = `comisiones_${userId}_${Date.now()}.json`;
    const filePath = path.join(REPORTS_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify({ total, byMonth, commissions }, null, 2));

    logger.info(`[Reporting] Commission report generated for user ${userId}: €${total.toFixed(2)}`);

    return { totalCommissions: total, byMonth, fileUrl: `/reports/${fileName}` };
  } catch (error) {
    logger.error('[Reporting] Error generating commission report:', error);
    throw error;
  }
}

/**
 * Analiza tiempo promedio de cada fase para un tipo de operación
 * @param {string} operationType - VENTA, ALQUILER, COMPRA, etc
 * @returns {Object} { phases: { CAPTACION: { avgDays: X, count: Y }, ... } }
 */
async function generateTimelineAnalysis(operationType) {
  try {
    const expedients = await prisma.expedient.findMany({
      where: {
        operationType,
        status: 'COMPLETADO', // solo expedientes cerrados tienen datos confiables
      },
      include: { phaseHistory: { orderBy: { createdAt: 'asc' } } },
    });

    const phaseTimings = {};

    expedients.forEach(exp => {
      const phases = exp.phaseHistory;
      for (let i = 0; i < phases.length - 1; i++) {
        const currentPhase = phases[i].toPhase;
        const nextPhase = phases[i + 1];
        const daysDiff = Math.ceil(
          (nextPhase.createdAt - phases[i].createdAt) / (1000 * 60 * 60 * 24)
        );

        if (!phaseTimings[currentPhase]) {
          phaseTimings[currentPhase] = { totalDays: 0, count: 0 };
        }
        phaseTimings[currentPhase].totalDays += daysDiff;
        phaseTimings[currentPhase].count += 1;
      }
    });

    const result = {};
    Object.entries(phaseTimings).forEach(([phase, data]) => {
      result[phase] = {
        avgDays: Math.round(data.totalDays / data.count),
        count: data.count,
      };
    });

    logger.info(`[Reporting] Timeline analysis for ${operationType}: ${Object.keys(result).length} phases analyzed`);

    return { operationType, phases: result, totalExpedients: expedients.length };
  } catch (error) {
    logger.error('[Reporting] Error generating timeline analysis:', error);
    throw error;
  }
}

/**
 * Genera dashboard con KPIs principales
 * @returns {Object} KPIs aggregados
 */
async function generateKPIDashboard() {
  try {
    const [activeCount, closedCount, blockedCount, totalCommissions] =
      await Promise.all([
        prisma.expedient.count({ where: { status: 'ACTIVO' } }),
        prisma.expedient.count({ where: { status: 'COMPLETADO' } }),
        prisma.expedient.count({ where: { status: 'BLOQUEADO' } }),
        prisma.commission.aggregate({
          _sum: { amount: true },
          where: { paid: true },
        }).catch(() => ({ _sum: { amount: 0 } })),
      ]);

    const totalExpedients = activeCount + closedCount + blockedCount;
    const closureRate = totalExpedients > 0 ? Math.round((closedCount / totalExpedients) * 100) : 0;

    // Expedientes por tipo
    const byOperationType = await prisma.expedient.groupBy({
      by: ['operationType'],
      _count: true,
      where: { status: { not: 'CANCELADO' } },
    });

    // Expedientes por fase
    const byPhase = await prisma.expedient.groupBy({
      by: ['currentPhase'],
      _count: true,
      where: { status: 'ACTIVO' },
    });

    logger.info(`[Reporting] KPI Dashboard generated: ${closureRate}% closure rate`);

    return {
      expedients: {
        active: activeCount,
        closed: closedCount,
        blocked: blockedCount,
        total: totalExpedients,
        closureRate,
      },
      commissions: {
        totalPaid: totalCommissions._sum.amount || 0,
      },
      byOperationType: Object.fromEntries(byOperationType.map(x => [x.operationType, x._count])),
      byPhase: Object.fromEntries(byPhase.map(x => [x.currentPhase, x._count])),
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error('[Reporting] Error generating KPI dashboard:', error);
    throw error;
  }
}

/**
 * Genera reporte de postventa: actividad después del cierre
 * @param {string} expedientId
 * @returns {Object} { clientCommunications, notificationsSent, surveyStatus }
 */
async function generatePostventaReport(expedientId) {
  try {
    const expedient = await prisma.expedient.findUnique({
      where: { id: expedientId },
      include: {
        client: { select: { id: true, email: true, firstName: true } },
      },
    });

    if (!expedient || !expedient.closedAt) {
      throw new Error('Expedient not found or not closed');
    }

    const [communications, notifications] = await Promise.all([
      prisma.clientCommunication.findMany({
        where: {
          clientId: expedient.client.id,
          createdAt: { gte: expedient.closedAt },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          expedientId,
          createdAt: { gte: expedient.closedAt },
        },
      }),
    ]);

    logger.info(`[Reporting] Postventa report for ${expedientId}: ${communications.length} communications`);

    return {
      expedientId,
      closedAt: expedient.closedAt,
      clientName: expedient.client.firstName,
      communications: communications.length,
      notificationsSent: notifications.length,
      lastContact: communications[0]?.createdAt || null,
    };
  } catch (error) {
    logger.error('[Reporting] Error generating postventa report:', error);
    throw error;
  }
}

/**
 * Compara un expediente con otros similares (mismo tipo, tamaño, zona)
 * @param {string} expedientId
 * @returns {Object} { currentExpedient, comparables, avgDays, avgCommission }
 */
async function generateBenchmark(expedientId) {
  try {
    const current = await prisma.expedient.findUnique({
      where: { id: expedientId },
      include: { client: true },
    });

    if (!current) throw new Error('Expedient not found');

    // Find similar expedients
    const comparables = await prisma.expedient.findMany({
      where: {
        operationType: current.operationType,
        operationSize: current.operationSize,
        status: 'COMPLETADO',
        propertyCity: current.propertyCity,
        id: { not: expedientId },
      },
      select: {
        code: true,
        closedAt: true,
        openedAt: true,
        propertyPrice: true,
      },
      take: 10,
    });

    const avgDays =
      comparables.length > 0
        ? Math.round(
            comparables.reduce(
              (sum, c) =>
                sum +
                Math.ceil(
                  (new Date(c.closedAt) - new Date(c.openedAt)) / (1000 * 60 * 60 * 24)
                ),
              0
            ) / comparables.length
          )
        : 0;

    const avgPrice =
      comparables.length > 0
        ? comparables.reduce((sum, c) => sum + parseFloat(c.propertyPrice || 0), 0) /
          comparables.length
        : 0;

    logger.info(`[Reporting] Benchmark for ${expedientId}: ${comparables.length} comparables found`);

    return {
      currentExpedient: {
        code: current.code,
        type: current.operationType,
        price: current.propertyPrice,
        city: current.propertyCity,
      },
      comparable: {
        count: comparables.length,
        avgDaysToClose: avgDays,
        avgPrice,
      },
      recommendation:
        avgDays > 0 ? `Expedientes similares cierran en ${avgDays} días promedio` : 'Datos insuficientes',
    };
  } catch (error) {
    logger.error('[Reporting] Error generating benchmark:', error);
    throw error;
  }
}

module.exports = {
  generateExpedientExport,
  generateCommissionReport,
  generateTimelineAnalysis,
  generateKPIDashboard,
  generatePostventaReport,
  generateBenchmark,
};
