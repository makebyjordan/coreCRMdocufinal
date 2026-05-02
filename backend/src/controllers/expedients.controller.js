const { prisma } = require('../config/db');
const path = require('path');
const fs = require('fs');
const workflowService = require('../services/workflow.service');
const checklistGenerator = require('../services/checklist.generator');
const driveService = require('../services/drive.service');
const notificationEngine = require('../services/notification.engine');
const calendarSync = require('../services/calendar-sync.service');
const activityFeed = require('../services/activity-feed.service');
const lifecycleService = require('../services/client-lifecycle.service');
const logger = require('../config/logger');
const docusignService = require('../services/docusign.service');
const { isCommercial } = require('../utils/roleHelper');

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
  if (isCommercial(req.user)) {
    where.assignments = { some: { userId: req.user.id } };
  }

  const [data, total] = await Promise.all([
    prisma.expedient.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      include: {
        client: true,
        assignments: { include: { user: { select: { id: true, name: true, userRoles: true } } } },
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
    // Fases flujo estándar
    'CAPTACION', 'VALORACION', 'FORMULARIO', 'DOCUMENTACION', 'VALIDACION',
    'ACUERDO', 'MARKETING_FORMULARIO', 'MARKETING_EJECUCION',
    'VISITAS', 'PREVENTA', 'BUSQUEDA_ACTIVA', 'NEGOCIACION',
    'ACUERDO_INTERESADO', 'ARRAS', 'HIPOTECA', 'NOTARIA',
    'CIERRE', 'POSVENTA',
    // Estados finales/especiales
    'BLOQUEADO', 'CERRADO',
    // Fases VENTA - Captación
    'CAPTACION_INMUEBLE', 'VALORACION_MERCADO', 'MANDATO_EXCLUSIVA',
    'DOCUMENTACION_LEGAL', 'PREPARACION_MARKETING', 'PUBLICACION_ACTIVO',
    // Fases VENTA - Comprador
    'CAPTACION_COMPRADOR', 'GESTION_VISITAS', 'NEGOCIACION_PRECIO',
    'RESERVA_SENAL', 'ARRAS_PRIVADO', 'GESTION_HIPOTECA',
    'PREPARACION_NOTARIA', 'FIRMA_ESCRITURA', 'CIERRE_REGISTRO',
    'POSTVENTA_SEGUIMIENTO',
    // Fases ALQUILER - Propietario
    'CAPTACION_PROPIEDAD', 'VALORACION_RENTA', 'MANDATO_ALQUILER',
    'DOCUMENTACION_INMUEBLE', 'MARKETING_DIFUSION', 'GESTION_VISITAS_ALQ',
    // Fases ALQUILER - Inquilino
    'CAPTACION_INQUILINO', 'PRESENTACION_INMUEBLES', 'DOCUMENTACION_SOLVENCIA',
    'VALIDACION_ECONOMICA', 'NEGOCIACION_CONDICIONES', 'CONTRATO_ALQUILER',
    'ENTREGA_INMUEBLE', 'GESTION_MENSUAL',
    // Fases INVERSIÓN
    'PERFILADO_INVERSOR', 'KYC_SOLVENCIA', 'BUSQUEDA_ACTIVOS',
    'ANALISIS_FINANCIERO', 'DUE_DILIGENCE', 'NEGOCIACION_INV',
    'RESERVA_ACTIVO', 'ARRAS_INVERSION', 'FINANCIACION_INV',
    'CIERRE_COMPRA', 'GESTION_POST_COMPRA',
  ];

  const where = isCommercial(req.user)
    ? { assignments: { some: { userId: req.user.id } }, status: { not: 'CANCELADO' } }
    : { status: { not: 'CANCELADO' } };

  const expedients = await prisma.expedient.findMany({
    where,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      assignments: { include: { user: { select: { id: true, name: true, userRoles: true } } } },
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
      assignments: { include: { user: { select: { id: true, name: true, email: true, userRoles: { select: { role: true } }, phone: true } } } },
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
        include: { changedBy: { select: { name: true, userRoles: { select: { role: true } } } } },
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

  // ─── ACTIVITY FEED + LIFECYCLE (post-commit, silencioso) ─────────────
  try {
    activityFeed.recordActivity({
      type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_CREATED,
      title: `Expediente creado: ${full.code}`,
      description: `Tipo: ${operationType}`,
      clientId: full.clientId,
      expedientId: expedient.id,
      userId: req.user?.id,
      relatedEntityType: 'Expedient',
      relatedEntityId: expedient.id,
    }).catch(() => {});

    // Recalcular lifecycle del cliente (puede pasar a PROSPECTO)
    lifecycleService.recalculateLifecycle(full.clientId).catch(() => {});
  } catch (_) {
    // Nunca debe bloquear la operación
  }

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

  // ─── ACTIVITY FEED + LIFECYCLE (post-commit, silencioso) ─────────────
  try {
    activityFeed.recordActivity({
      type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_PHASE_CHANGED,
      title: `Fase cambiada: ${result.fromPhase} → ${result.toPhase}`,
      clientId: expedient.clientId,
      expedientId: expedient.id,
      userId: req.user?.id,
      metadata: { fromPhase: result.fromPhase, toPhase: result.toPhase },
    }).catch(() => {});

    // Recalcular score (la actividad de cambio de fase puede afectar score)
    lifecycleService.recalculateScore(expedient.clientId).catch(() => {});
    lifecycleService.recalculateLifecycle(expedient.clientId).catch(() => {});
  } catch (_) {}

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

  // ─── ACTIVITY FEED + LIFECYCLE (post-commit, silencioso) ─────────────
  try {
    activityFeed.recordActivity({
      type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_CLOSED,
      title: `Expediente cerrado: ${expedient.code}`,
      description: 'Operación completada exitosamente',
      clientId: expedient.clientId,
      expedientId: expedient.id,
      userId: req.user?.id,
      relatedEntityType: 'Expedient',
      relatedEntityId: expedient.id,
    }).catch(() => {});

    lifecycleService.recalculateLifecycle(expedient.clientId).catch(() => {});
  } catch (_) {}

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
    include: { user: { select: { id: true, name: true, email: true, userRoles: { select: { role: true } }, phone: true } } },
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
    include: { changedBy: { select: { name: true, userRoles: { select: { role: true } } } } },
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
        assignments: { include: { user: { select: { id: true, name: true, userRoles: true } } } },
        _count: { select: { documents: true, checklists: true } },
      },
    }),
    expedient.parentExpedientId
      ? prisma.expedient.findUnique({
          where: { id: expedient.parentExpedientId },
          include: {
            client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
            assignments: { include: { user: { select: { id: true, name: true, userRoles: true } } } },
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getSignatures(req, res) {
  const signatures = await prisma.signature.findMany({
    where: { expedientId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      calendarEvent: { select: { id: true, startAt: true, completed: true } },
      signers: { orderBy: { routingOrder: 'asc' } },
      document: { select: { id: true, name: true, docType: true } },
    },
  });
  res.json(signatures);
}

async function createSignature(req, res) {
  const { documentId, signingOrder = 'PARALLEL', signers, expiresAt } = req.body;
  const expedientId = req.params.id;

  if (!documentId) return res.status(400).json({ error: 'documentId es requerido' });
  if (!Array.isArray(signers) || signers.length === 0) {
    return res.status(400).json({ error: 'signers debe ser un array con al menos un firmante' });
  }

  // Validar emails
  for (const s of signers) {
    if (!s.name || !s.email) return res.status(400).json({ error: 'Cada firmante debe tener name y email' });
    if (!EMAIL_REGEX.test(s.email)) return res.status(400).json({ error: `Email inválido: ${s.email}` });
  }

  // Validar routingOrder único si secuencial
  if (signingOrder === 'SEQUENTIAL') {
    const orders = signers.map(s => Number(s.routingOrder));
    if (orders.some(o => !Number.isFinite(o))) {
      return res.status(400).json({ error: 'En modo SEQUENTIAL todos los firmantes deben tener routingOrder numérico' });
    }
    if (new Set(orders).size !== orders.length) {
      return res.status(400).json({ error: 'Los valores de routingOrder deben ser únicos' });
    }
  }

  // Verificar que el documento pertenece al expediente
  const document = await prisma.document.findFirst({
    where: { id: documentId, expedientId },
  });
  if (!document) return res.status(404).json({ error: 'Documento no encontrado en este expediente' });

  const expedient = await prisma.expedient.findUnique({
    where: { id: expedientId },
    select: { clientId: true, code: true },
  });
  if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });

  // Ordenar firmantes si secuencial
  const sortedSigners = signingOrder === 'SEQUENTIAL'
    ? [...signers].sort((a, b) => Number(a.routingOrder) - Number(b.routingOrder))
    : signers;

  // Primer firmante para campos legacy de retrocompatibilidad
  const primarySigner = sortedSigners[0];

  const result = await prisma.$transaction(async (tx) => {
    const signature = await tx.signature.create({
      data: {
        expedientId,
        documentId,
        documentName: document.name,
        signerName: primarySigner.name,
        signerEmail: primarySigner.email,
        signerRole: primarySigner.role || null,
        signingOrder,
        status: 'PENDIENTE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        signers: {
          create: sortedSigners.map((s, i) => ({
            name: s.name,
            email: s.email,
            role: s.role || 'OTRO',
            routingOrder: signingOrder === 'SEQUENTIAL' ? Number(s.routingOrder) : i + 1,
            status: 'PENDIENTE',
          })),
        },
      },
      include: {
        expedient: { select: { clientId: true, code: true } },
        signers: { orderBy: { routingOrder: 'asc' } },
        document: { select: { id: true, name: true, docType: true } },
      },
    });

    // Crear evento de calendario
    const eventData = calendarSync.buildCalendarEventFromSignature(signature);
    const calendarEvent = await tx.calendarEvent.create({
      data: { ...eventData, signatureId: signature.id, createdById: req.user.id },
    });

    await tx.signature.update({
      where: { id: signature.id },
      data: { calendarEventId: calendarEvent.id },
    });

    return { ...signature, calendarEvent };
  });

  res.status(201).json(result);
}

async function updateSignature(req, res) {
  const { documentId, signingOrder, signers, expiresAt, status } = req.body;
  const signatureId = req.params.signatureId;
  const expedientId = req.params.id;

  const signature = await prisma.signature.findUnique({
    where: { id: signatureId },
    include: { signers: true },
  });
  if (!signature) return res.status(404).json({ error: 'Firma no encontrada' });

  // Validar documento si se cambia
  let documentName = signature.documentName;
  if (documentId && documentId !== signature.documentId) {
    const document = await prisma.document.findFirst({ where: { id: documentId, expedientId } });
    if (!document) return res.status(404).json({ error: 'Documento no encontrado en este expediente' });
    documentName = document.name;
  }

  const updateData = {
    ...(documentId && { documentId, documentName }),
    ...(signingOrder && { signingOrder }),
    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    ...(status && { status }),
  };

  // Actualizar firmantes si se envían
  if (Array.isArray(signers) && signers.length > 0) {
    for (const s of signers) {
      if (!s.name || !s.email) return res.status(400).json({ error: 'Cada firmante debe tener name y email' });
      if (!EMAIL_REGEX.test(s.email)) return res.status(400).json({ error: `Email inválido: ${s.email}` });
    }

    const finalOrder = signingOrder || signature.signingOrder;
    const sortedSigners = finalOrder === 'SEQUENTIAL'
      ? [...signers].sort((a, b) => Number(a.routingOrder) - Number(b.routingOrder))
      : signers;

    const primarySigner = sortedSigners[0];
    updateData.signerName = primarySigner.name;
    updateData.signerEmail = primarySigner.email;
    updateData.signerRole = primarySigner.role || null;

    // Reemplazar firmantes en cascada
    await prisma.signatureSigner.deleteMany({ where: { signatureId } });
    updateData.signers = {
      create: sortedSigners.map((s, i) => ({
        name: s.name,
        email: s.email,
        role: s.role || 'OTRO',
        routingOrder: finalOrder === 'SEQUENTIAL' ? Number(s.routingOrder) : i + 1,
        status: 'PENDIENTE',
      })),
    };
  }

  const result = await calendarSync.updateSignatureStatus(signatureId, status || signature.status, updateData);
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

  const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
  if (!signature) return res.status(404).json({ error: 'Firma no encontrada' });

  // Si ya fue enviada a DocuSign, intentar anularla antes de borrar
  if (signature.envelopeId) {
    try {
      await docusignService.voidEnvelope(signature.envelopeId, 'Eliminado desde el CRM');
    } catch (err) {
      logger.warn(`[Firmas] No se pudo anular el envelope ${signature.envelopeId} en DocuSign:`, err.message);
      // No bloqueamos el delete local aunque falle el proveedor
    }
  }

  await calendarSync.deleteSignatureCalendarEvent(signatureId);
  await prisma.signature.delete({ where: { id: signatureId } });
  res.status(204).send();
}

async function sendSignatureToDocuSign(req, res) {
  const { signatureId } = req.params;

  if (!docusignService.isConfigured()) {
    return res.status(501).json({
      error: 'DOCUSIGN_NOT_CONFIGURED',
      message: 'La integración con DocuSign no está activada todavía. Contacta con el administrador.',
    });
  }

  const signature = await prisma.signature.findUnique({
    where: { id: signatureId },
    include: {
      document: true,
      signers: { orderBy: { routingOrder: 'asc' } },
    },
  });
  if (!signature) return res.status(404).json({ error: 'Firma no encontrada' });

  if (signature.envelopeId) {
    return res.status(409).json({ error: 'Esta firma ya fue enviada a DocuSign' });
  }

  if (!signature.document?.filePath) {
    return res.status(400).json({ error: 'El documento asociado no tiene archivo local disponible' });
  }

  try {
    const { envelopeId, recipientIds } = await docusignService.createEnvelope({
      documentPath: signature.document.filePath,
      documentName: signature.document.name,
      signers: signature.signers.map(s => ({
        name: s.name,
        email: s.email,
        role: s.role,
        routingOrder: s.routingOrder,
      })),
      signingOrder: signature.signingOrder,
      expiresAt: signature.expiresAt || null,
      metadata: { expedientId: signature.expedientId, signatureId },
    });

    // Persistir envelopeId y recipientIds en los signers
    await prisma.$transaction([
      prisma.signature.update({
        where: { id: signatureId },
        data: { envelopeId, provider: 'DOCUSIGN', status: 'ENVIADO' },
      }),
      ...signature.signers.map(s =>
        prisma.signatureSigner.update({
          where: { id: s.id },
          data: {
            recipientId: recipientIds?.[s.id] || null,
            status: 'ENVIADO',
          },
        })
      ),
    ]);

    const updated = await prisma.signature.findUnique({
      where: { id: signatureId },
      include: { signers: { orderBy: { routingOrder: 'asc' } }, document: { select: { id: true, name: true, docType: true } } },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'DOCUSIGN_NOT_CONFIGURED') {
      return res.status(501).json({ error: err.code, message: err.message });
    }
    logger.error('[Firmas] Error enviando a DocuSign:', err.message);
    res.status(500).json({ error: err.message || 'Error al enviar a DocuSign' });
  }
}

async function downloadSignedSignature(req, res) {
  const { signatureId } = req.params;

  const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
  if (!signature) return res.status(404).json({ error: 'Firma no encontrada' });

  // Si el archivo firmado ya está en disco, servirlo directamente
  if (signature.signedDocumentPath && fs.existsSync(signature.signedDocumentPath)) {
    const absolutePath = path.resolve(signature.signedDocumentPath);
    res.setHeader('Content-Disposition', `attachment; filename="firmado_${signatureId}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    return res.sendFile(absolutePath);
  }

  // Si no está en disco pero hay envelope y DocuSign está configurado, intentar descargarlo
  if (signature.envelopeId) {
    if (!docusignService.isConfigured()) {
      return res.status(501).json({
        error: 'DOCUSIGN_NOT_CONFIGURED',
        message: 'La integración con DocuSign no está activada todavía.',
      });
    }
    try {
      const buffer = await docusignService.downloadSignedDocument(signature.envelopeId);
      const savePath = path.join('backend', 'uploads', 'signed', `${signatureId}.pdf`);
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, buffer);
      await prisma.signature.update({ where: { id: signatureId }, data: { signedDocumentPath: savePath } });
      res.setHeader('Content-Disposition', `attachment; filename="firmado_${signatureId}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(buffer);
    } catch (err) {
      logger.error('[Firmas] Error descargando firmado de DocuSign:', err.message);
      return res.status(500).json({ error: err.message || 'Error al descargar el documento firmado' });
    }
  }

  res.status(404).json({ error: 'Esta firma aún no ha sido enviada a firma electrónica' });
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
  sendSignatureToDocuSign, downloadSignedSignature,
};
