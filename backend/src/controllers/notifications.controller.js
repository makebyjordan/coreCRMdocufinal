const { prisma } = require('../config/db');
const emailService = require('../services/email.service');

async function list(req, res) {
  const { status, type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    ...(status && { status }),
    ...(type && { type }),
  };
  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { expedient: { select: { code: true } } },
    }),
    prisma.notification.count({ where }),
  ]);
  res.json({ data, total });
}

async function listByExpedient(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { expedientId: req.params.expedientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
}

async function resend(req, res) {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) return res.status(404).json({ error: 'Notificación no encontrada' });

  await emailService.send({
    to: notification.toEmail,
    subject: notification.subject,
    html: notification.bodyHtml,
  });

  await prisma.notification.update({
    where: { id: req.params.id },
    data: { status: 'ENVIADO', sentAt: new Date(), retries: { increment: 1 } },
  });

  res.json({ message: 'Notificación reenviada' });
}

async function sendTest(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  await emailService.send({
    to: email,
    subject: 'Test de notificación CRM Inmobiliaria',
    html: `<h2>Test de correo</h2><p>El sistema de notificaciones del CRM está funcionando correctamente.</p><p>Fecha: ${new Date().toLocaleString('es-ES')}</p>`,
  });

  res.json({ message: 'Email de prueba enviado' });
}

module.exports = { list, listByExpedient, resend, sendTest };
