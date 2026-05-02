const schedule = require('node-schedule');
const securityService = require('../services/security.service');
const logger = require('../config/logger');

function scheduleAutomaticBackup() {
  // Backup diario a las 2 AM
  schedule.scheduleJob('0 2 * * *', async () => {
    logger.info('[BackupScheduler] Starting automatic backup...');
    try {
      const backup = await securityService.createBackup('AUTOMATIC');
      logger.info(`[BackupScheduler] Backup completed: ${backup.id}`);
    } catch (err) {
      logger.error('[BackupScheduler] Backup job failed:', err);
    }
  });

  // Rotación de backups cada lunes a la 1 AM (mantener 30 días)
  schedule.scheduleJob('0 1 * * 1', async () => {
    logger.info('[BackupScheduler] Starting backup rotation...');
    try {
      const deleted = await securityService.rotateBackups(30);
      logger.info(`[BackupScheduler] Rotation complete: ${deleted} old backups removed`);
    } catch (err) {
      logger.error('[BackupScheduler] Rotation job failed:', err);
    }
  });

  logger.info('[BackupScheduler] Scheduled daily backup at 2 AM + rotation Mondays at 1 AM');
}

module.exports = { scheduleAutomaticBackup };
