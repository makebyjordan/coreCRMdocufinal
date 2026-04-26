const cron = require('node-cron');
const { prisma } = require('../config/db');
const notificationEngine = require('../services/notification.engine');
const logger = require('../config/logger');

/**
 * Ejecuta cada día a las 09:00 y busca expedientes con postventa programada
 * para hoy o días pasados sin enviar.
 */
function startPostventaScheduler() {
  // Cada día a las 09:00
  cron.schedule('0 9 * * *', async () => {
    logger.info('[PostventaScheduler] Ejecutando comprobación de postventa...');

    const now = new Date();

    try {
      // ─── 3 meses ──────────────────────────────────────────────────────────
      const due3 = await prisma.expedient.findMany({
        where: { postventa3At: { lte: now }, status: 'COMPLETADO' },
        select: { id: true, code: true },
      });
      for (const exp of due3) {
        logger.info(`[PostventaScheduler] Enviando postventa 3m → ${exp.code}`);
        await notificationEngine.sendPostventa3(exp.id);
      }

      // ─── 6 meses ──────────────────────────────────────────────────────────
      const due6 = await prisma.expedient.findMany({
        where: { postventa6At: { lte: now }, status: 'COMPLETADO' },
        select: { id: true, code: true },
      });
      for (const exp of due6) {
        logger.info(`[PostventaScheduler] Enviando postventa 6m → ${exp.code}`);
        await notificationEngine.sendPostventa6(exp.id);
      }

      // ─── 12 meses ─────────────────────────────────────────────────────────
      const due12 = await prisma.expedient.findMany({
        where: { postventa12At: { lte: now }, status: 'COMPLETADO' },
        select: { id: true, code: true },
      });
      for (const exp of due12) {
        logger.info(`[PostventaScheduler] Enviando postventa 12m → ${exp.code}`);
        await notificationEngine.sendPostventa12(exp.id);
      }

      logger.info(`[PostventaScheduler] Completado. (3m: ${due3.length}, 6m: ${due6.length}, 12m: ${due12.length})`);
    } catch (err) {
      logger.error('[PostventaScheduler] Error:', err.message);
    }
  }, { timezone: 'Europe/Madrid' });

  logger.info('[PostventaScheduler] Cron registrado (09:00 Europe/Madrid)');
}

module.exports = { startPostventaScheduler };
