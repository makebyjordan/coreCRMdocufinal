const { prisma } = require('../config/db');

async function list(req, res) {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { type: 'asc' } });
  res.json(templates);
}

async function getById(req, res) {
  const template = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json(template);
}

async function update(req, res) {
  const { subject, bodyHtml, bodyText, active } = req.body;
  const template = await prisma.emailTemplate.update({
    where: { id: req.params.id },
    data: { subject, bodyHtml, bodyText, active },
  });
  res.json(template);
}

async function preview(req, res) {
  const template = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });

  // Reemplazar variables de ejemplo
  const sample = {
    expedientCode: 'EXP-2024-0001',
    clientName: 'Juan García',
    operationType: 'Venta',
    propertyAddress: 'Calle Mayor 10, Madrid',
    currentPhase: 'VALIDACION',
    agencyName: 'Inmobiliaria Ejemplo',
    commercialName: 'María López',
    commercialEmail: 'maria@agencia.com',
    commercialPhone: '600 000 000',
    reviewUrl: 'https://g.page/r/EJEMPLO/review',
    year: new Date().getFullYear(),
  };

  let html = template.bodyHtml;
  for (const [key, value] of Object.entries(sample)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  res.json({ subject: template.subject, bodyHtml: html });
}

module.exports = { list, getById, update, preview };
