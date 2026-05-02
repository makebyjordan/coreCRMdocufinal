const { prisma } = require('../config/db');

// ─── Listar validaciones de un documento ─────────────────────────────────────
async function listByDocument(req, res) {
  const validations = await prisma.documentValidation.findMany({
    where: { documentId: req.params.documentId },
    include: {
      validator: { select: { id: true, name: true, userRoles: { select: { role: true } } } },
    },
    orderBy: { validatedAt: 'desc' },
  });
  res.json(validations);
}

// ─── Crear validación ────────────────────────────────────────────────────────
async function create(req, res) {
  const { documentId } = req.params;
  const { status, comments, expiryDate } = req.body;

  if (!['APROBADO', 'RECHAZADO', 'REQUIERE_CAMBIOS'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Use: APROBADO, RECHAZADO, REQUIERE_CAMBIOS' });
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const validation = await prisma.documentValidation.create({
    data: {
      documentId,
      validatedBy: req.user.id,
      status,
      comments: comments || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
    include: {
      validator: { select: { id: true, name: true, userRoles: { select: { role: true } } } },
    },
  });

  // Actualizar estado del documento según la validación
  const docStatus =
    status === 'APROBADO' ? 'VALIDADO' :
    status === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE';

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: docStatus,
      validatedAt: status === 'APROBADO' ? new Date() : null,
      rejectedReason: status === 'RECHAZADO' ? (comments || null) : null,
    },
  });

  res.status(201).json(validation);
}

// ─── Listar validaciones por expediente (todos sus docs) ─────────────────────
async function listByExpedient(req, res) {
  const { expedientId } = req.params;

  const documents = await prisma.document.findMany({
    where: { expedientId },
    include: {
      validations: {
        include: { validator: { select: { id: true, name: true, userRoles: { select: { role: true } } } } },
        orderBy: { validatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(documents);
}

// ─── Eliminar validación ──────────────────────────────────────────────────────
async function remove(req, res) {
  await prisma.documentValidation.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { listByDocument, create, listByExpedient, remove };
