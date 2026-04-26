const { prisma } = require('../config/db');
const dniValidator = require('../utils/dni-validator');
const activityFeed = require('../services/activity-feed.service');
const lifecycleService = require('../services/client-lifecycle.service');
const logger = require('../config/logger');

async function list(req, res) {
  const {
    search, type, score, lifecycleStage, tag, active, hasActiveExpedients,
    source, page = 1, limit = 20,
  } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(type && { type }),
    ...(score && { score }),
    ...(lifecycleStage && { lifecycleStage }),
    ...(source && { source }),
    ...(active !== undefined && { active: active === 'true' }),
    ...(tag && { tags: { has: tag } }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Filtro complejo: clientes con expedientes activos
  let expedientFilter = {};
  if (hasActiveExpedients === 'true') {
    expedientFilter = { some: { status: 'ACTIVO' } };
  } else if (hasActiveExpedients === 'false') {
    expedientFilter = { none: { status: 'ACTIVO' } };
  }

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { expedients: true } },
        ...(Object.keys(expedientFilter).length > 0 && { expedients: expedientFilter }),
      },
    }),
    prisma.client.count({ where }),
  ]);

  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
}

async function getById(req, res) {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      expedients: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, code: true, operationType: true, currentPhase: true, status: true, openedAt: true, propertyPrice: true },
      },
      _count: {
        select: {
          expedients: true,
          notesStructured: true,
          tasks: true,
          communications: true,
        },
      },
    },
  });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  // Obtener última actividad
  const lastActivity = await prisma.activityEvent.findFirst({
    where: { clientId: req.params.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, type: true },
  });

  // Calcular valor total de operaciones
  let totalOperationsValue = 0;
  let totalCommissions = 0;
  client.expedients.forEach(e => {
    if (e.propertyPrice) totalOperationsValue += parseFloat(e.propertyPrice);
  });

  const response = {
    ...client,
    stats: {
      totalExpedients: client._count.expedients,
      totalNotes: client._count.notesStructured,
      totalTasks: client._count.tasks,
      totalCommunications: client._count.communications,
      totalOperationsValue,
      lastActivityAt: lastActivity?.createdAt || null,
    },
  };

  res.json(response);
}

function normalizeClientData(body, isUpdate = false) {
  const {
    type, firstName, lastName, dni, companyName, nif, contactPerson,
    email, phone, phone2, address, city, postalCode, province,
    privacyPolicy, privacyDate, notes,
    active, source, score, lifecycleStage, tags, birthDate, preferences,
  } = body;

  // Normalizar DNI si se proporciona
  let normalizedDni = dni;
  if (dni) {
    normalizedDni = dniValidator.normalizeDni(dni);
  }

  const data = {
    type, firstName, lastName,
    dni: normalizedDni,
    companyName, nif, contactPerson,
    email, phone, phone2, address, city, postalCode, province,
    privacyPolicy: privacyPolicy !== undefined ? Boolean(privacyPolicy) : undefined,
    privacyDate: privacyDate ? (privacyDate === '' ? null : new Date(privacyDate)) : undefined,
    notes,
    active: active !== undefined ? Boolean(active) : undefined,
    source,
    score,
    lifecycleStage,
    tags: tags || undefined,
    birthDate: birthDate ? new Date(birthDate) : undefined,
    preferences: preferences || undefined,
  };

  // Remove undefined keys to avoid overwriting with undefined
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  // En creación, asegurar valores por defecto
  if (!isUpdate) {
    data.active = data.active !== undefined ? data.active : true;
    data.score = data.score || 'FRIO';
    data.lifecycleStage = data.lifecycleStage || 'LEAD';
    data.firstContactDate = new Date();
  }

  return data;
}

async function create(req, res) {
  try {
    const data = normalizeClientData(req.body);

    // Validar DNI si se proporciona
    if (data.dni && !dniValidator.isValidDocument(data.dni)) {
      return res.status(400).json({
        error: 'DNI/NIE/NIF inválido',
        details: 'El formato del documento no es válido. Use 12345678A para DNI, X1234567A para NIE.',
      });
    }

    const client = await prisma.client.create({ data });

    // Registrar actividad (silencioso, no bloquea)
    activityFeed.recordActivity({
      type: activityFeed.ACTIVITY_TYPES.CLIENT_CREATED,
      title: `Cliente creado: ${client.firstName || ''} ${client.lastName || ''}`.trim() || client.companyName || 'Sin nombre',
      description: `Tipo: ${client.type}, Email: ${client.email}`,
      clientId: client.id,
      userId: req.user?.id,
      relatedEntityType: 'Client',
      relatedEntityId: client.id,
    }).catch(() => {});

    res.status(201).json(client);
  } catch (err) {
    logger.error('[Clients] Error al crear cliente:', err);
    // Manejar error de DNI duplicado (unique constraint)
    if (err.code === 'P2002' && err.meta?.target?.includes('dni')) {
      return res.status(409).json({
        error: 'Ya existe un cliente con este DNI',
        existing: true,
      });
    }
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const data = normalizeClientData(req.body, true);

    // Validar DNI si se está actualizando
    if (data.dni && !dniValidator.isValidDocument(data.dni)) {
      return res.status(400).json({
        error: 'DNI/NIE/NIF inválido',
        details: 'El formato del documento no es válido.',
      });
    }

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data,
    });

    // Registrar actividad
    activityFeed.recordActivity({
      type: activityFeed.ACTIVITY_TYPES.CLIENT_UPDATED,
      title: `Datos de cliente actualizados`,
      clientId: client.id,
      userId: req.user?.id,
    }).catch(() => {});

    res.json(client);
  } catch (err) {
    logger.error('[Clients] Error al actualizar cliente:', err);
    if (err.code === 'P2002' && err.meta?.target?.includes('dni')) {
      return res.status(409).json({ error: 'Ya existe otro cliente con este DNI' });
    }
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  const count = await prisma.expedient.count({ where: { clientId: req.params.id } });
  if (count > 0) {
    return res.status(400).json({ error: 'No se puede eliminar un cliente con expedientes activos' });
  }
  await prisma.client.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

// ─── NUEVOS ENDPOINTS FASE 1 ─────────────────────────────────────────────────

// GET /clients/search?dni=X - Búsqueda rápida por DNI para deduplicación
async function searchByDni(req, res) {
  const { dni } = req.query;
  if (!dni) {
    return res.status(400).json({ error: 'DNI requerido' });
  }

  const normalizedDni = dniValidator.normalizeDni(dni);
  const client = await prisma.client.findUnique({
    where: { dni: normalizedDni },
    include: {
      _count: { select: { expedients: true } },
      expedients: {
        select: { id: true, code: true, status: true, operationType: true },
        take: 5,
      },
    },
  });

  if (!client) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  res.json(client);
}

// POST /clients/lookup-or-create - Busca por DNI o crea si no existe
async function lookupOrCreate(req, res) {
  const { dni, ...basicData } = req.body;

  if (!dni) {
    return res.status(400).json({ error: 'DNI es requerido para lookup-or-create' });
  }

  const normalizedDni = dniValidator.normalizeDni(dni);

  // Validar formato DNI
  if (!dniValidator.isValidDocument(normalizedDni)) {
    return res.status(400).json({
      error: 'DNI/NIE/NIF inválido',
      details: 'El formato del documento no es válido.',
    });
  }

  // Buscar existente
  const existing = await prisma.client.findUnique({
    where: { dni: normalizedDni },
    include: {
      expedients: {
        select: { id: true, code: true, status: true, operationType: true },
        take: 5,
      },
    },
  });

  if (existing) {
    return res.json({ existing: true, client: existing });
  }

  // Crear nuevo
  const data = normalizeClientData({ dni: normalizedDni, ...basicData });
  const client = await prisma.client.create({ data });

  // Registrar actividad
  activityFeed.recordActivity({
    type: activityFeed.ACTIVITY_TYPES.CLIENT_CREATED,
    title: `Cliente creado (lookup-or-create): ${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre',
    clientId: client.id,
    userId: req.user?.id,
  }).catch(() => {});

  res.status(201).json({ existing: false, client });
}

// GET /clients/:id/expedients - Expedientes con rol del cliente
async function getClientExpedients(req, res) {
  const { id } = req.params;
  const { status } = req.query;

  // Expedientes donde es cliente principal
  const directExpedients = await prisma.expedient.findMany({
    where: {
      clientId: id,
      ...(status && { status }),
    },
    include: {
      _count: { select: { documents: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Expedientes donde tiene rol via ExpedientClient
  const roleExpedients = await prisma.expedientClient.findMany({
    where: { clientId: id },
    include: {
      expedient: {
        include: {
          _count: { select: { documents: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Unificar resultados
  const allExpedients = [
    ...directExpedients.map(e => ({ ...e, clientRole: 'PRIMARY' })),
    ...roleExpedients.map(re => ({
      ...re.expedient,
      clientRole: re.role,
      joinedAt: re.createdAt,
    })),
  ];

  // Eliminar duplicados (si un cliente es primario y también tiene rol)
  const unique = allExpedients.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  );

  res.json(unique);
}

// GET /clients/:id/documents - Biblioteca unificada de documentos
async function getClientDocuments(req, res) {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Obtener IDs de expedientes donde participa el cliente
  const clientData = await prisma.client.findUnique({
    where: { id },
    select: {
      expedients: { select: { id: true } },
      roles: { select: { expedientId: true } },
    },
  });

  if (!clientData) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const expedientIds = [
    ...clientData.expedients.map(e => e.id),
    ...clientData.roles.map(r => r.expedientId),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Documentos donde es owner o está en expedientes
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: {
        OR: [
          { ownerClientId: id },
          { expedientId: { in: expedientIds } },
        ],
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        expedient: { select: { id: true, code: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.document.count({
      where: {
        OR: [
          { ownerClientId: id },
          { expedientId: { in: expedientIds } },
        ],
      },
    }),
  ]);

  res.json({ data: documents, total, page: parseInt(page), limit: parseInt(limit) });
}

// GET /clients/:id/activity - Timeline de actividad
async function getClientActivity(req, res) {
  const { id } = req.params;
  const { type, from, to, limit = 50, offset = 0 } = req.query;

  const activity = await activityFeed.getClientTimeline(id, {
    type,
    from,
    to,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  res.json(activity);
}

// GET /clients/:id/stats - KPIs del cliente
async function getClientStats(req, res) {
  const { id } = req.params;
  const stats = await lifecycleService.getClientStats(id);

  if (!stats) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  res.json(stats);
}

// GET /clients/:id/timeline-aggregated - Timeline enriquecido
async function getAggregatedTimeline(req, res) {
  const { id } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  const timeline = await activityFeed.getAggregatedTimeline(id, {
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  res.json(timeline);
}

// GET /clients/:id/summary - Resumen agregado del cliente (hub central)
async function getSummary(req, res) {
  const { id } = req.params;

  const [client, expedients] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      select: {
        id: true, firstName: true, lastName: true, companyName: true,
        email: true, phone: true, type: true, score: true, lifecycleStage: true,
      },
    }),
    prisma.expedient.findMany({
      where: { clientId: id },
      select: {
        id: true, code: true, operationType: true, status: true,
        currentPhase: true, propertyAddress: true, propertyPrice: true,
        commissionFixed: true, commissionPercent: true, openedAt: true,
        phaseHistory: {
          orderBy: { createdAt: 'asc' },
          select: { fromPhase: true, toPhase: true, createdAt: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    }),
  ]);

  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const expedientIds = expedients.map(e => e.id);

  const [notesCount, tasks, docsCount, commsCount, relationsCount, lastActivity] = await Promise.all([
    prisma.clientNote.count({ where: { clientId: id } }),
    prisma.task.findMany({ where: { clientId: id }, select: { completedAt: true } }),
    prisma.document.count({
      where: {
        OR: expedientIds.length > 0
          ? [{ ownerClientId: id }, { expedientId: { in: expedientIds } }]
          : [{ ownerClientId: id }],
      },
    }),
    prisma.clientCommunication.count({ where: { clientId: id } }),
    prisma.clientRelation.count({ where: { OR: [{ clientAId: id }, { clientBId: id }] } }),
    prisma.activityEvent.findFirst({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      select: { type: true, createdAt: true, title: true },
    }),
  ]);

  const totalCommissionValue = expedients.reduce((sum, e) => {
    if (e.commissionFixed) return sum + Number(e.commissionFixed);
    if (e.commissionPercent && e.propertyPrice)
      return sum + Number(e.propertyPrice) * (Number(e.commissionPercent) / 100);
    return sum;
  }, 0);

  res.json({
    client,
    expedientsStats: {
      total: expedients.length,
      active: expedients.filter(e => e.status === 'ACTIVO').length,
      completed: expedients.filter(e => e.status === 'COMPLETADO').length,
      cancelled: expedients.filter(e => e.status === 'CANCELADO').length,
      blocked: expedients.filter(e => e.status === 'BLOQUEADO').length,
      totalCommissionValue,
    },
    resourcesStats: {
      notes: notesCount,
      tasks: {
        pending: tasks.filter(t => !t.completedAt).length,
        completed: tasks.filter(t => t.completedAt).length,
      },
      documents: docsCount,
      communications: commsCount,
      relations: relationsCount,
    },
    recentExpedients: expedients.slice(0, 3).map(({ phaseHistory, commissionFixed, commissionPercent, ...rest }) => rest),
    lastActivity: lastActivity
      ? { type: lastActivity.type, date: lastActivity.createdAt, description: lastActivity.title }
      : null,
    phaseHistorySummary: expedients.flatMap(e => e.phaseHistory || []),
  });
}

// GET /clients/stats/dashboard - Stats globales para dashboard
async function getDashboardStats(req, res) {
  const [
    total,
    active,
    byScore,
    byStage,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { active: true } }),
    prisma.client.groupBy({
      by: ['score'],
      _count: { score: true },
    }),
    prisma.client.groupBy({
      by: ['lifecycleStage'],
      _count: { lifecycleStage: true },
    }),
  ]);

  const byScoreObj = byScore.reduce((acc, item) => {
    acc[item.score] = item._count.score;
    return acc;
  }, {});

  const byStageObj = byStage.reduce((acc, item) => {
    acc[item.lifecycleStage] = item._count.lifecycleStage;
    return acc;
  }, {});

  res.json({
    total,
    active,
    byScore: byScoreObj,
    byStage: byStageObj,
  });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  searchByDni,
  lookupOrCreate,
  getClientExpedients,
  getClientDocuments,
  getClientActivity,
  getClientStats,
  getAggregatedTimeline,
  getDashboardStats,
  getSummary,
};
