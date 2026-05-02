const schedule = require('node-schedule');
const segmentService = require('../services/segment.service');
const logger = require('../config/logger');

function scheduleSegmentRecalculation() {
  // Diariamente a las 3 AM
  schedule.scheduleJob('0 3 * * *', async () => {
    logger.info('[SegmentScheduler] Starting daily client segmentation recalculation...');
    try {
      await segmentService.recalculateSegments();
      logger.info('[SegmentScheduler] Daily segmentation recalculation complete');
    } catch (err) {
      logger.error('[SegmentScheduler] Segmentation job failed:', err);
    }
  });

  logger.info('[SegmentScheduler] Scheduled daily segmentation at 3 AM');
}

module.exports = { scheduleSegmentRecalculation };
