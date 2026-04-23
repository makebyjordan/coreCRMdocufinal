const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const workflowService = require('../services/workflow.service');
const checklistGenerator = require('../services/checklist.generator');
const driveService = require('../services/drive.service');
const notificationEngine = require('../services/notification.engine');
const calendarSync = require('../services/calendar-sync.service');
const logger = require('../config/logger');

// ─── Generar código de expediente ─────────────────────────────────────────────
async function generateCode() {
  const year = new Date().getFullYear();
  const count = await prisma.expedient.count();
  return `EXP-${year}-${String(count + 1).padStart(4, '0')}`;
}

// ─── Listar expedientes ───────────────────────────────────────────────────────
async function list(req, res) {
  const {
    phase, status, operationType, operationSize,
    comercialId, search, page = 1, limit = 20,
  } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(phase && { currentPhase: phase }),
    ...(status && { status }),
    ...(operationType && { operationType }),
    ...(operationSize && { operationSize }),
    ...(comercialId && {
      assignments: { some: { userId: comercialId, role: 'COMERCIAL' } },
    }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { propertyAddress: { contains: search, mode: 'insensitive' } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  // Comerciales solo ven sus propios expedientes
  if (req.user.role === 'COMERCIAL') {
    where.assignments = { some: { userId: req.user.id } };
  }

  const [data, total] = await Promise.all([
    prisma.expedient.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      include: {
        client: true,
        assignments: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { documents: true, checklists: true } },
      },
    }),
    prisma.expedient.count({ where }),
  ]);

  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
}

// ─── Vista Kanban ─────────────────────────────────────────────────────────────
async function kanban(req, res) {
  const phases = [
    'CAPTACION', 'FORMULARIO', 'DOCUMENTACION', 'VALIDACION',
    'ACUERDO', 'MARKETING_FORMULARIO', 'MARKETING_EJECUCION',
    'PREVENTA', 'BUSQUEDA_ACTIVA', 'ACUERDO_INTERESADO',
    'CIERRE', 'POSVENTA',
  ];

  const where = req.user.role === 'COMERCIAL'
    ? { assignments: { some: { userId: req.user.id } }, status: { not: 'CANCELADO' } }
    : { status: { not: 'CANCELADO' } };

  const expedients = await prisma.expedient.findMany({
    where,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      assignments: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const columns = phases.reduce((acc, phase) => {
    acc[phase] = expedients.filter(e => e.currentPhase === phase);
    return acc;
  }, {});

  res.json(columns);
}

// ─── Obtener por ID ───────────────────────────────────────────────────────────
async function getById(req, res) {
  const expedient = await prisma.expedient.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      assignments: { include: { user: { select: { id: true, name: true, email: true, role: true, phone: true } } } },
      checklists: {
        include: { template: true, items: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      signatures: { orderBy: { createdAt: 'desc' } },
      buyers: { orderBy: { createdAt: 'desc' } },
      visits: { orderBy: { date: 'desc' } },
      clientRoles: { include: { client: true }, orderBy: { createdAt: 'asc' } },
      phaseHistory: {
        include: { changedBy: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });
  res.json(expedient);
}

// ─── Crear expediente ─────────────────────────────────────────────────────────
async function create(req, res) {
  const code = await generateCode();
  const {
    clientId, operationType, operationSize = 'INDIVIDUAL', assignments = [],
    propertyAddress, propertyCity, propertyRef, propertyPrice, propertyM2,
    propertyRooms, propertyBaths, propertyCatastral, propertyYear, propertyStatus,
    propertyOrientation, propertyParking, propertyStorage, commissionFixed,
    commissionPercent, commissionInvoiced, commissionPaid, mortgageStatus,
    mortgageEntity, arrasAmount, arrasDeadline, notaryName, notaryDate,
    notaryAddress, valuationEstimated, valuationMarketNotes, parentExpedientId,
    expedientRole, notaryFees, registryFees, taxesAmount, linkedOperationType,
    dependencyStatus, advanceConditions, exclusivityStart, exclusivityMonths, exclusivityEnd, notes
  } = req.body;

  const data = {
    code, clientId, operationType, operationSize,
    propertyAddress, propertyCity, propertyRef, propertyPrice: propertyPrice ? parseFloat(propertyPrice) : null,
    propertyM2: propertyM2 ? parseFloat(propertyM2) : null, propertyRooms, propertyBaths,
    propertyCatastral, propertyYear, propertyStatus, propertyOrientation,
    propertyParking: Boolean(propertyParking), propertyStorage: Boolean(propertyStorage),
    commissionFixed: commissionFixed ? parseFloat(commissionFixed) : null,
    commissionPercent: commissionPercent ? parseFloat(commissionPercent) : null,
    commissionInvoiced: Boolean(commissionInvoiced), commissionPaid: Boolean(commissionPaid),
    mortgageStatus, mortgageEntity, arrasAmount: arrasAmount ? parseFloat(arrasAmount) : null,
    arrasDeadline: arrasDeadline ? new Date(arrasDeadline) : null, notaryName,
    notaryDate: notaryDate ? new Date(notaryDate) : null, notaryAddress,
    valuationEstimated: valuationEstimated ? parseFloat(valuationEstimated) : null,
    valuationMarketNotes, parentExpedientId, expedientRole,
    notaryFees: notaryFees ? parseFloat(notaryFees) : null,
    registryFees: registryFees ? parseFloat(registryFees) : null,
    taxesAmount: taxesAmount ? parseFloat(taxesAmount) : null,
    linkedOperationType, dependencyStatus, advanceConditions,
    exclusivityStart: exclusivityStart ? new Date(exclusivityStart) : null,
    exclusivityMonths, exclusivityEnd: exclusivityEnd ? new Date(exclusivityEnd) : null,
    notes, currentPhase: 'CAPTACION', status: 'ACTIVO'
  };

  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  const expedient = await prisma.expedient.create({ data });

  // Asignar comercial que crea el expediente como primario
  await prisma.expedientAssignment.create({
    data: { expedientId: expedient.id, userId: req.user.id, role: 'COMERCIAL', isPrimary: true },
  });

  // Asignaciones adicionales
  for (const a of assignments) {
    if (a.userId !== req.user.id || a.role !== 'COMERCIAL') {
      await prisma.expedientAssignment.upsert({
        where: { expedientId_role_userId: { expedientId: expedient.id, role: a.role, userId: a.userId } },
        create: { expedientId: expedient.id, userId: a.userId, role: a.role },
        update: {},
      });
    }
  }

  // Crear carpeta en Drive
  try {
    const folder = await driveService.createExpedientFolder(expedient.code, expedient.id);
    if (folder) {
      await prisma.expedient.update({
        where: { id: expedient.id },
        data: { driveFolder: folder.name, driveFolderId: folder.id },
      });
    }
  } catch (err) {
    logger.warn('Drive no disponible:', err.message);
  }

  // Generar checklists iniciales
  await checklistGenerator.generateForPhase(expedient.id, 'CAPTACION', operationType, operationSize);

  // Notificar apertura
  await notificationEngine.onExpedientCreated(expedient.id);

  const full = await prisma.expedient.findUnique({
    where: { id: expedient.id },
    include: { client: true, assignments: { include: { user: true } } },
  });

  res.status(201).json(full);
}

// ─── Actualizar expediente ────────────────────────────────────────────────────
async function update(req, res) {
  const {
    assignments,
    propertyAddress, propertyCity, propertyRef, propertyPrice, propertyM2,
    propertyRooms, propertyBaths, propertyCatastral, propertyYear, propertyStatus,
    propertyOrientation, propertyParking, propertyStorage, commissionFixed,
    commissionPercent, commissionInvoiced, commissionPaid, mortgageStatus,
    mortgageEntity, arrasAmount, arrasDeadline, notaryName, notaryDate,
    notaryAddress, valuationEstimated, valuationMarketNotes, parentExpedientId,
    expedientRole, notaryFees, registryFees, taxesAmount, linkedOperationType,
    dependencyStatus, advanceConditions, exclusivityStart, exclusivityMonths, exclusivityEnd, notes
  } = req.body;

  const data = {
    propertyAddress, propertyCity, propertyRef, propertyPrice: propertyPrice ? parseFloat(propertyPrice) : null,
    propertyM2: propertyM2 ? parseFloat(propertyM2) : null, propertyRooms, propertyBaths,
    propertyCatastral, propertyYear, propertyStatus, propertyOrientation,
    propertyParking: Boolean(propertyParking), propertyStorage: Boolean(propertyStorage),
    commissionFixed: commissionFixed ? parseFloat(commissionFixed) : null,
    commissionPercent: commissionPercent ? parseFloat(commissionPercent) : null,
    commissionInvoiced: Boolean(commissionInvoiced), commissionPaid: Boolean(commissionPaid),
    mortgageStatus, mortgageEntity, arrasAmount: arrasAmount ? parseFloat(arrasAmount) : null,
    arrasDeadline: arrasDeadline ? new Date(arrasDeadline) : null, notaryName,
    notaryDate: notaryDate ? new Date(notaryDate) : null, notaryAddress,
    valuationEstimated: valuationEstimated ? parseFloat(valuationEstimated) : null,
    valuationMarketNotes, parentExpedientId, expedientRole,
    notaryFees: notaryFees ? parseFloat(notaryFees) : null,
    registryFees: registryFees ? parseFloat(registryFees) : null,
    taxesAmount: taxesAmount ? parseFloat(taxesAmount) : null,
    linkedOperationType, dependencyStatus, advanceConditions,
    exclusivityStart: exclusivityStart ? new Date(exclusivityStart) : null,
    exclusivityMonths, exclusivityEnd: exclusivityEnd ? new Date(exclusivityEnd) : null,
    notes
  };

  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  const expedient = await prisma.expedient.update({
    where: { id: req.params.id },
    data,
  });
  res.json(expedient);
}

// ─── Eliminar expediente ──────────────────────────────────────────────────────
async function remove(req, res) {
  await prisma.expedient.update({
    where: { id: req.params.id },
    data: { status: 'CANCELADO' },
  });
  res.status(204).send();
}

// ─── Avanzar de fase ──────────────────────────────────────────────────────────
async function advancePhase(req, res) {
  const { id } = req.params;
  const { notes, decision } = req.body; // decision: 'SI' | 'NO' (para fases condicionales)

  const expedient = await prisma.expedient.findUnique({
    where: { id },
    include: { checklists: { include: { items: true } } },
  });
  if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });
  if (expedient.status === 'BLOQUEADO') {
    return res.status(400).json({ error: 'El expediente está bloqueado. Resuelve los problemas antes de avanzar.' });
  }

  const result = await workflowService.advance(expedient, req.user, notes, decision);

  if (result.error) return res.status(400).json({ error: result.error });

  res.json(result);
}

// ─── Bloquear expediente ──────────────────────────────────────────────────────
async function blockExpedient(req, res) {
  const { reason } = req.body;
  const expedient = await prisma.expedient.update({
    where: { id: req.params.id },
    data: { status: 'BLOQUEADO' },
  });
  await notificationEngine.onBlocked(expedient.id, reason);
  res.json(expedient);
}

// ─── Desbloquear expediente ───────────────────────────────────────────────────
async function unblockExpedient(req, res) {
  const expedient = await prisma.expedient.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVO' },
  });
  res.json(expedient);
}

// ─── Cerrar expediente (venta cerrada) ───────────────────────────────────────
async function closeExpedient(req, res) {
  const { closedAt = new Date() } = req.body;
  const closedDate = new Date(closedAt);

  const expedient = await prisma.expedient.update({
    where: { id: req.params.id },
    data: {
      status: 'COMPLETADO',
      currentPhase: 'POSVENTA',
      closedAt: closedDate,
      postventa3At: new Date(closedDate.getTime() + 90 * 24 * 60 * 60 * 1000),
      postventa6At: new Date(closedDate.getTime() + 180 * 24 * 60 * 60 * 1000),
      postventa12At: new Date(closedDate.getTime() + 365 * 24 * 60 * 60 * 1000),
    },
    include: { client: true, assignments: { include: { user: true } } },
  });

  await notificationEngine.onOperacionCerrada(expedient.id);
  res.json(expedient);
}

// ─── Cancelar expediente ──────────────────────────────────────────────────────
async function cancelExpedient(req, res) {
  const expedient = await prisma.expedient.update({
    where: { id: req.params.id },
    data: { status: 'CANCELADO', currentPhase: 'CANCELADO' },
  });
  res.json(expedient);
}

// ─── Renovar exclusividad ─────────────────────────────────────────────────────
async function renewExclusivity(req, res) {
  const { months = 3 } = req.body;
  const start = new Date();
  const end = new Date(start.getTime() + months * 30 * 24 * 60 * 60 * 1000);

  const expedient = await prisma.expedient.update({
    where: { id: req.params.id },
    data: {
      exclusivityStart: start,
      exclusivityMonths: months,
      exclusivityEnd: end,
      currentPhase: 'ACUERDO',
      status: 'ACTIVO',
    },
  });

  await notificationEngine.onRenovarExclusividad(expedient.id);
  res.json(expedient);
}

// ─── Asignaciones ─────────────────────────────────────────────────────────────
async function getAssignments(req, res) {
  const assignments = await prisma.expedientAssignment.findMany({
    where: { expedientId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true, phone: true } } },
  });
  res.json(assignments);
}

async function setAssignment(req, res) {
  const { userId, role, isPrimary = false } = req.body;
  const assignment = await prisma.expedientAssignment.upsert({
    where: { expedientId_role_userId: { expedientId: req.params.id, role, userId } },
    create: { expedientId: req.params.id, userId, role, isPrimary },
    update: { isPrimary },
    include: { user: true },
  });
  res.json(assignment);
}

async function removeAssignment(req, res) {
  await prisma.expedientAssignment.delete({ where: { id: req.params.assignmentId } });
  res.status(204).send();
}

// ─── Compradores / Interesados ────────────────────────────────────────────────
async function getBuyers(req, res) {
  const buyers = await prisma.buyer.findMany({
    where: { expedientId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(buyers);
}

async function addBuyer(req, res) {
  const { name, email, phone, offer, notes, accepted } = req.body;
  const data = {
    name, email, phone,
    offer: offer ? parseFloat(offer) : null,
    notes, accepted: Boolean(accepted),
    expedientId: req.params.id
  };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  const buyer = await prisma.buyer.create({ data });
  res.status(201).json(buyer);
}

async function updateBuyer(req, res) {
  const { name, email, phone, offer, notes, accepted } = req.body;
  const data = {
    name, email, phone,
    offer: offer ? parseFloat(offer) : null,
    notes, accepted: Boolean(accepted)
  };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  const buyer = await prisma.buyer.update({
    where: { id: req.params.buyerId },
    data,
  });
  res.json(buyer);
}

async function removeBuyer(req, res) {
  await prisma.buyer.delete({ where: { id: req.params.buyerId } });
  res.status(204).send();
}

// ─── Historial de fases ───────────────────────────────────────────────────────
async function getPhaseHistory(req, res) {
  const history = await prisma.phaseHistory.findMany({
    where: { expedientId: req.params.id },
    include: { changedBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(history);
}

// ─── Expedientes vinculados ───────────────────────────────────────────────────
async function getLinkedExpedients(req, res) {
  const { id } = req.params;

  const expedient = await prisma.expedient.findUnique({
    where: { id },
    select: { parentExpedientId: true },
  });
  if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });

  const [children, parent] = await Promise.all([
    prisma.expedient.findMany({
      where: { parentExpedientId: id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        assignments: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { documents: true, checklists: true } },
      },
    }),
    expedient.parentExpedientId
      ? prisma.expedient.findUnique({
          where: { id: expedient.parentExpedientId },
          include: {
            client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
            assignments: { include: { user: { select: { id: true, name: true, role: true } } } },
          },
        })
      : null,
  ]);

  res.json({ parent, children });
}

async function linkExpedient(req, res) {
  const { id } = req.params;
  const { childId, expedientRole } = req.body;

  if (!childId) return res.status(400).json({ error: 'childId es requerido' });

  const updated = await prisma.expedient.update({
    where: { id: childId },
    data: {
      parentExpedientId: id,
      ...(expedientRole && { expedientRole }),
    },
    include: { client: true },
  });

  res.json(updated);
}

async function unlinkExpedient(req, res) {
  const { childId } = req.params;

  const updated = await prisma.expedient.update({
    where: { id: childId },
    data: { parentExpedientId: null },
  });

  res.json(updated);
}

async function setExpedientRole(req, res) {
  const { id } = req.params;
  const { expedientRole } = req.body;

  const updated = await prisma.expedient.update({
    where: { id },
    data: { expedientRole },
  });

  res.json(updated);
}

// ─── Firmas ────────────────────────────────────────────────────────────────────
async function getSignatures(req, res) {
  const signatures = await prisma.signature.findMany({
    where: { expedientId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { calendarEvent: { select: { id: true, startAt: true, completed: true } } },
  });
  res.json(signatures);
}

async function createSignature(req, res) {
  const { documentName, signerName, signerEmail, signerRole, expiresAt, signUrl, externalId } = req.body;
  const expedientId = req.params.id;
  
  // Get expedient for client info
  const expedient = await prisma.expedient.findUnique({
    where: { id: expedientId },
    select: { clientId: true, code: true },
  });
  
  if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });

  // Create signature and sync with calendar
  const result = await prisma.$transaction(async (tx) => {
    // Create signature
    const signature = await tx.signature.create({
      data: {
        expedientId,
        documentName,
        signerName,
        signerEmail,
        signerRole,
        status: signUrl ? 'ENVIADO' : 'PENDIENTE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        signUrl,
        externalId,
      },
      include: { expedient: { select: { clientId: true, code: true } } },
    });

    // Create calendar event
    const eventData = calendarSync.buildCalendarEventFromSignature(signature);
    const calendarEvent = await tx.calendarEvent.create({
      data: {
        ...eventData,
        signatureId: signature.id,
        createdById: req.user.id,
      },
    });

    // Update signature with calendarEventId
    await tx.signature.update({
      where: { id: signature.id },
      data: { calendarEventId: calendarEvent.id },
    });

    return { ...signature, calendarEvent };
  });

  res.status(201).json(result);
}

async function updateSignature(req, res) {
  const { documentName, signerName, signerEmail, signerRole, expiresAt, signUrl, status } = req.body;
  const signatureId = req.params.signatureId;

  const signature = await prisma.signature.findUnique({
    where: { id: signatureId },
    include: { expedient: { select: { clientId: true, code: true } } },
  });

  if (!signature) return res.status(404).json({ error: 'Firma no encontrada' });

  const data = {
    documentName, signerName, signerEmail, signerRole,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    signUrl, status,
  };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  // Update signature and sync calendar
  const result = await calendarSync.updateSignatureStatus(signatureId, status || signature.status, data);
  
  res.json(result);
}

async function updateSignatureStatus(req, res) {
  const { status, signedAt, expiresAt, signUrl } = req.body;
  const signatureId = req.params.signatureId;

  const additionalData = {};
  if (signedAt) additionalData.signedAt = new Date(signedAt);
  if (expiresAt) additionalData.expiresAt = new Date(expiresAt);
  if (signUrl) additionalData.signUrl = signUrl;

  const result = await calendarSync.updateSignatureStatus(signatureId, status, additionalData);
  
  res.json(result);
}

async function deleteSignature(req, res) {
  const signatureId = req.params.signatureId;
  
  await calendarSync.deleteSignatureCalendarEvent(signatureId);
  await prisma.signature.delete({ where: { id: signatureId } });
  
  res.status(204).send();
}

module.exports = {
  list, kanban, getById, create, update, remove,
  advancePhase, blockExpedient, unblockExpedient, closeExpedient,
  cancelExpedient, renewExclusivity,
  getAssignments, setAssignment, removeAssignment,
  getBuyers, addBuyer, updateBuyer, removeBuyer,
  getPhaseHistory,
  getLinkedExpedients, linkExpedient, unlinkExpedient, setExpedientRole,
  getSignatures, createSignature, updateSignature, updateSignatureStatus, deleteSignature,
};
