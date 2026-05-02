const schedule = require('node-schedule');
const reportingService = require('../services/reporting.service');
const logger = require('../config/logger');

function scheduleReportingJobs() {
  // Análisis de timeline cada viernes a las 5 PM
  schedule.scheduleJob('0 17 * * 5', async () => {
    logger.info('[ReportingScheduler] Generating weekly timeline analysis...');
    try {
      const types = ['VENTA', 'ALQUILER', 'COMPRA', 'INVERSION'];
      for (const type of types) {
        try {
          await reportingService.generateTimelineAnalysis(type);
        } catch (err) {
          logger.warn(`[ReportingScheduler] Timeline analysis failed for ${type}`);
        }
      }
      logger.info('[ReportingScheduler] Weekly timeline analysis complete');
    } catch (err) {
      logger.error('[ReportingScheduler] Timeline job failed:', err);
    }
  });

  logger.info('[ReportingScheduler] Scheduled: timeline analysis Fridays at 5 PM');
}

module.exports = { scheduleReportingJobs };
