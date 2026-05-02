const { prisma } = require('../config/db');
const { validationResult } = require('express-validator');
const reportingService = require('../services/reporting.service');
const logger = require('../config/logger');
const { isCommercial, isAdmin } = require('../utils/roleHelper');

/**
 * POST /reporting/export
 * Exporta expedientes a CSV o XLSX
 */
async function exportExpedients(req, res) {
  try {
    const { format, operationType, status, phase, comercialId, dateFrom, dateTo } = req.body;

    // Validación
    if (!format || !['CSV', 'XLSX'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format (CSV or XLSX required)' });
    }

    const filters = { operationType, status, currentPhase: phase, comercialId, dateFrom, dateTo };

    const result = await reportingService.generateExpedientExport(filters, format, req.user.id);

    // Registrar en BD
    await prisma.report.create({
      data: {
        name: `Exportación expedientes ${new Date().toLocaleDateString()}`,
        type: 'EXPEDIENTS_EXPORT',
        format,
        createdById: req.user.id,
        fileUrl: result.fileUrl,
        filters,
      },
    });

    res.json({
      message: 'Export completed',
      ...result,
      downloadUrl: `${process.env.BACKEND_URL || 'http://localhost:4000'}${result.fileUrl}`,
    });
  } catch (error) {
    logger.error('[Reporting] Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}

/**
 * POST /reporting/commission-report
 * Genera reporte de comisiones de un usuario
 * Solo DIRECCION, ADMINISTRACION o el mismo usuario
 */
async function generateCommissionReport(req, res) {
  try {
    const { userId, dateFrom, dateTo } = req.body;

    // Autorización
    if (isCommercial(req.user) && req.user.id !== userId && !isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await reportingService.generateCommissionReport(userId, {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    });

    res.json(result);
  } catch (error) {
    logger.error('[Reporting] Commission report error:', error);
    res.status(500).json({ error: 'Report generation failed' });
  }
}

/**
 * GET /reporting/timeline-analysis/:operationType
 * Analiza tiempo promedio de cada fase
 */
async function getTimelineAnalysis(req, res) {
  try {
    const { operationType } = req.params;

    const result = await reportingService.generateTimelineAnalysis(operationType);

    res.json(result);
  } catch (error) {
    logger.error('[Reporting] Timeline analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
}

/**
 * GET /reporting/kpi-dashboard
 * Obtiene dashboard con KPIs principales
 * Solo DIRECCION y ADMINISTRACION
 */
async function getKPIDashboard(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await reportingService.generateKPIDashboard();

    res.json(result);
  } catch (error) {
    logger.error('[Reporting] KPI dashboard error:', error);
    res.status(500).json({ error: 'Dashboard generation failed' });
  }
}

/**
 * GET /reporting/postventa/:expedientId
 * Reporte de postventa para un expediente
 */
async function getPostventaReport(req, res) {
  try {
    const { expedientId } = req.params;

    const result = await reportingService.generatePostventaReport(expedientId);

    res.json(result);
  } catch (error) {
    logger.error('[Reporting] Postventa report error:', error);
    res.status(500).json({ error: 'Report generation failed' });
  }
}

/**
 * GET /reporting/benchmark/:expedientId
 * Compara expediente con similares
 */
async function getBenchmark(req, res) {
  try {
    const { expedientId } = req.params;

    const result = await reportingService.generateBenchmark(expedientId);

    res.json(result);
  } catch (error) {
    logger.error('[Reporting] Benchmark error:', error);
    res.status(500).json({ error: 'Benchmark generation failed' });
  }
}

/**
 * GET /reporting/reports
 * Lista reportes generados por el usuario
 */
async function listReports(req, res) {
  try {
    const { skip = 0, limit = 20 } = req.query;

    const reports = await prisma.report.findMany({
      where: { createdById: req.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        format: true,
        generatedAt: true,
        fileUrl: true,
      },
      orderBy: { generatedAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    const total = await prisma.report.count({
      where: { createdById: req.user.id },
    });

    res.json({ data: reports, total, skip: parseInt(skip), limit: parseInt(limit) });
  } catch (error) {
    logger.error('[Reporting] List reports error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
}

/**
 * DELETE /reporting/reports/:reportId
 * Elimina un reporte antiguo
 */
async function deleteReport(req, res) {
  try {
    const { reportId } = req.params;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Solo el creador puede eliminar
    if (report.createdById !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.report.delete({
      where: { id: reportId },
    });

    res.json({ message: 'Report deleted' });
  } catch (error) {
    logger.error('[Reporting] Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
}

module.exports = {
  exportExpedients,
  generateCommissionReport,
  getTimelineAnalysis,
  getKPIDashboard,
  getPostventaReport,
  getBenchmark,
  listReports,
  deleteReport,
};
