const logger = require('./logger');

function initializeSchedulers() {
  if (process.env.NODE_ENV === 'test') return;

  try {
    const { scheduleSegmentRecalculation } = require('../jobs/segmentation.scheduler');
    const { scheduleAutomaticBackup } = require('../jobs/backup.scheduler');
    const { scheduleReportingJobs } = require('../jobs/reporting.scheduler');

    scheduleSegmentRecalculation();
    scheduleAutomaticBackup();
    scheduleReportingJobs();

    logger.info('[Scheduler] All background jobs initialized');
  } catch (err) {
    logger.error('[Scheduler] Failed to initialize schedulers:', err);
  }
}

module.exports = { initializeSchedulers };
