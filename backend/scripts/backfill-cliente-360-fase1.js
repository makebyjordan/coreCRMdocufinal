#!/usr/bin/env node
/**
 * Backfill Cliente 360 - Fase 1
 * Script idempotente para migrar datos existentes al nuevo modelo centrado en cliente
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../src/config/logger');
const lifecycleService = require('../src/services/client-lifecycle.service');
const activityFeed = require('../src/services/activity-feed.service');

const BATCH_SIZE = 100;

// Mapeo de operationType a rol en ExpedientClient
const OPERATION_ROLE_MAP = {
  ALQUILER: { PROPIETARIO: 'PROPIETARIO', INQUILINO: 'INQUILINO' },
  VENTA: 'VENDEDOR',
  COMPRA: 'COMPRADOR',
  INVERSION: 'INVERSOR',
  PROMOCION: 'INVERSOR',
  EDIFICIO: 'INVERSOR',
  RESORT: 'INVERSOR',
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── PASO A: Crear ExpedientClient para clientes sin roles ────────────────────
async function backfillExpedientClients() {
  logger.info('[Backfill] PASO A: Creando ExpedientClient para clientes sin roles...');

  const expedients = await prisma.expedient.findMany({
    include: {
      client: true,
      clientRoles: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const expedient of expedients) {
    // Si ya tiene ExpedientClient rows, saltar
    if (expedient.clientRoles.length > 0) {
      skipped++;
      continue;
    }

    // Determinar rol basado en operationType y expedientRole
    let role = 'CLIENTE';
    const opType = expedient.operationType;
    const expRole = expedient.expedientRole;

    if (opType === 'ALQUILER' && expRole) {
      role = expRole === 'PROPIETARIO' ? 'PROPIETARIO' : 'INQUILINO';
    } else if (OPERATION_ROLE_MAP[opType]) {
      role = OPERATION_ROLE_MAP[opType];
    }

    try {
      await prisma.expedientClient.create({
        data: {
          expedientId: expedient.id,
          clientId: expedient.clientId,
          role,
        },
      });
      created++;

      if (created % 10 === 0) {
        logger.info(`[Backfill] PASO A: Creados ${created} ExpedientClient...`);
      }
    } catch (err) {
      if (err.code === 'P2002') {
        skipped++; // Ya existe (race condition)
      } else {
        logger.error(`[Backfill] Error creando ExpedientClient para expediente ${expedient.id}:`, err.message);
      }
    }
  }

  logger.info(`[Backfill] PASO A completado: ${created} creados, ${skipped} saltados`);
  return { created, skipped };
}

// ─── PASO B: Calcular firstContactDate y lastContactDate ──────────────────────
async function backfillContactDates() {
  logger.info('[Backfill] PASO B: Calculando fechas de contacto...');

  const clients = await prisma.client.findMany({
    select: { id: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const client of clients) {
    // Obtener expedientes del cliente
    const expedients = await prisma.expedient.findMany({
      where: { clientId: client.id },
      select: { createdAt: true, updatedAt: true },
    });

    // Obtener activity events del cliente
    const activities = await prisma.activityEvent.findMany({
      where: { clientId: client.id },
      select: { createdAt: true },
    });

    // Obtener visitas del cliente (vía expedientes)
    const expedientIds = expedients.map(e => e.id).filter(Boolean);
    const visits = await prisma.visit.findMany({
      where: { expedientId: { in: expedientIds } },
      select: { date: true, createdAt: true, updatedAt: true },
    });

    // Calcular fechas
    const allDates = [
      ...expedients.map(e => e.createdAt),
      ...expedients.map(e => e.updatedAt),
      ...activities.map(a => a.createdAt),
      ...visits.map(v => v.date),
      ...visits.map(v => v.createdAt),
      ...visits.map(v => v.updatedAt),
    ].filter(d => d);

    if (allDates.length === 0) {
      skipped++;
      continue;
    }

    const firstContactDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const lastContactDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    try {
      await prisma.client.update({
        where: { id: client.id },
        data: { firstContactDate, lastContactDate },
      });
      updated++;

      if (updated % 50 === 0) {
        logger.info(`[Backfill] PASO B: Actualizados ${updated} clientes...`);
      }
    } catch (err) {
      logger.error(`[Backfill] Error actualizando fechas de cliente ${client.id}:`, err.message);
    }
  }

  logger.info(`[Backfill] PASO B completado: ${updated} actualizados, ${skipped} saltados`);
  return { updated, skipped };
}

// ─── PASO C: Recalcular score y lifecycle para todos los clientes ─────────────
async function backfillLifecycleMetrics() {
  logger.info('[Backfill] PASO C: Recalculando métricas de lifecycle...');

  const clients = await prisma.client.findMany({
    select: { id: true },
  });

  let processed = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      await lifecycleService.recalculateClientMetrics(client.id);
      processed++;

      if (processed % 50 === 0) {
        logger.info(`[Backfill] PASO C: Procesados ${processed} clientes...`);
      }
    } catch (err) {
      errors++;
      logger.error(`[Backfill] Error recalculando métricas de cliente ${client.id}:`, err.message);
    }
  }

  logger.info(`[Backfill] PASO C completado: ${processed} procesados, ${errors} errores`);
  return { processed, errors };
}

// ─── PASO D: Setear ownerClientId en documentos existentes ────────────────────
async function backfillDocumentOwners() {
  logger.info('[Backfill] PASO D: Seteando ownerClientId en documentos...');

  const documents = await prisma.document.findMany({
    where: { ownerClientId: null },
    include: { expedient: { select: { clientId: true } } },
  });

  let updated = 0;
  let skipped = 0;

  for (const doc of documents) {
    if (!doc.expedient?.clientId) {
      skipped++;
      continue;
    }

    try {
      await prisma.document.update({
        where: { id: doc.id },
        data: { ownerClientId: doc.expedient.clientId },
      });
      updated++;

      if (updated % 50 === 0) {
        logger.info(`[Backfill] PASO D: Actualizados ${updated} documentos...`);
      }
    } catch (err) {
      logger.error(`[Backfill] Error actualizando documento ${doc.id}:`, err.message);
    }
  }

  logger.info(`[Backfill] PASO D completado: ${updated} actualizados, ${skipped} saltados`);
  return { updated, skipped };
}

// ─── PASO E: Crear DocumentExpedientLink para documentos existentes ────────────
async function backfillDocumentExpedientLinks() {
  logger.info('[Backfill] PASO E: Creando DocumentExpedientLink existentes...');

  // Obtener todos los documentos y filtrar en JS (Prisma no permite filtrar por null directamente)
  const allDocuments = await prisma.document.findMany({
    select: { id: true, expedientId: true },
  });

  const docsWithExpedient = allDocuments.filter(d => d.expedientId != null);

  let created = 0;
  let skipped = 0;

  for (const doc of docsWithExpedient) {
    try {
      // Verificar si ya existe el link
      const existing = await prisma.documentExpedientLink.findUnique({
        where: {
          documentId_expedientId: {
            documentId: doc.id,
            expedientId: doc.expedientId,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.documentExpedientLink.create({
        data: {
          documentId: doc.id,
          expedientId: doc.expedientId,
        },
      });
      created++;

      if (created % 50 === 0) {
        logger.info(`[Backfill] PASO E: Creados ${created} links...`);
      }
    } catch (err) {
      if (err.code === 'P2002') {
        skipped++;
      } else {
        logger.error(`[Backfill] Error creando link para documento ${doc.id}:`, err.message);
      }
    }
  }

  logger.info(`[Backfill] PASO E completado: ${created} creados, ${skipped} saltados`);
  return { created, skipped };
}

// ─── PASO F: Generar ActivityEvents retroactivos ──────────────────────────────
async function backfillActivityEvents() {
  logger.info('[Backfill] PASO F: Generando ActivityEvents retroactivos...');

  let created = 0;
  const BATCH_SIZE_ACT = 50;

  // 1. Expedientes creados
  const expedients = await prisma.expedient.findMany({
    select: { id: true, code: true, clientId: true, operationType: true, openedAt: true },
  });

  for (let i = 0; i < expedients.length; i += BATCH_SIZE_ACT) {
    const batch = expedients.slice(i, i + BATCH_SIZE_ACT);

    for (const exp of batch) {
      // Verificar si ya existe evento para este expediente
      const existing = await prisma.activityEvent.findFirst({
        where: {
          expedientId: exp.id,
          type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_CREATED,
        },
      });

      if (existing) continue;

      try {
        await prisma.activityEvent.create({
          data: {
            type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_CREATED,
            title: `Expediente creado: ${exp.code}`,
            description: `Tipo: ${exp.operationType}`,
            clientId: exp.clientId,
            expedientId: exp.id,
            createdAt: exp.openedAt,
          },
        });
        created++;
      } catch (err) {
        // Ignorar errores individuales
      }
    }

    if (i % 100 === 0) {
      logger.info(`[Backfill] PASO F.1: Procesados ${i}/${expedients.length} expedientes...`);
    }
  }

  // 2. Cambios de fase (PhaseHistory)
  const phaseHistories = await prisma.phaseHistory.findMany({
    select: { id: true, expedientId: true, fromPhase: true, toPhase: true, createdAt: true, changedById: true },
    orderBy: { createdAt: 'asc' },
  });

  let phaseEventsCreated = 0;
  for (let i = 0; i < phaseHistories.length; i += BATCH_SIZE_ACT) {
    const batch = phaseHistories.slice(i, i + BATCH_SIZE_ACT);

    for (const ph of batch) {
      // Verificar si ya existe
      const existing = await prisma.activityEvent.findFirst({
        where: {
          expedientId: ph.expedientId,
          type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_PHASE_CHANGED,
          metadata: { path: ['fromPhase'], equals: ph.fromPhase },
          createdAt: ph.createdAt,
        },
      });

      if (existing) continue;

      const expedient = await prisma.expedient.findUnique({
        where: { id: ph.expedientId },
        select: { clientId: true },
      });

      try {
        await prisma.activityEvent.create({
          data: {
            type: activityFeed.ACTIVITY_TYPES.EXPEDIENT_PHASE_CHANGED,
            title: `Fase cambiada: ${ph.fromPhase || 'Inicio'} → ${ph.toPhase}`,
            clientId: expedient?.clientId,
            expedientId: ph.expedientId,
            userId: ph.changedById,
            metadata: { fromPhase: ph.fromPhase, toPhase: ph.toPhase },
            createdAt: ph.createdAt,
          },
        });
        phaseEventsCreated++;
      } catch (err) {
        // Ignorar errores individuales
      }
    }
  }

  // 3. Visitas
  const visits = await prisma.visit.findMany({
    select: { id: true, expedientId: true, visitorName: true, interestLevel: true, date: true },
  });

  let visitEventsCreated = 0;
  for (let i = 0; i < visits.length; i += BATCH_SIZE_ACT) {
    const batch = visits.slice(i, i + BATCH_SIZE_ACT);

    for (const visit of batch) {
      const existing = await prisma.activityEvent.findFirst({
        where: {
          relatedEntityType: 'Visit',
          relatedEntityId: visit.id,
          type: activityFeed.ACTIVITY_TYPES.VISIT_CREATED,
        },
      });

      if (existing) continue;

      const expedient = await prisma.expedient.findUnique({
        where: { id: visit.expedientId },
        select: { clientId: true },
      });

      try {
        await prisma.activityEvent.create({
          data: {
            type: activityFeed.ACTIVITY_TYPES.VISIT_CREATED,
            title: `Visita registrada: ${visit.visitorName}`,
            description: `Interés: ${visit.interestLevel}`,
            clientId: expedient?.clientId,
            expedientId: visit.expedientId,
            relatedEntityType: 'Visit',
            relatedEntityId: visit.id,
            createdAt: visit.date,
          },
        });
        visitEventsCreated++;
      } catch (err) {
        // Ignorar errores individuales
      }
    }
  }

  // 4. Documentos subidos
  const documents = await prisma.document.findMany({
    select: { id: true, expedientId: true, name: true, docType: true, createdAt: true },
  });

  let docEventsCreated = 0;
  for (let i = 0; i < documents.length; i += BATCH_SIZE_ACT) {
    const batch = documents.slice(i, i + BATCH_SIZE_ACT);

    for (const doc of batch) {
      const existing = await prisma.activityEvent.findFirst({
        where: {
          relatedEntityType: 'Document',
          relatedEntityId: doc.id,
          type: activityFeed.ACTIVITY_TYPES.DOC_UPLOADED,
        },
      });

      if (existing) continue;

      const expedient = await prisma.expedient.findUnique({
        where: { id: doc.expedientId },
        select: { clientId: true },
      });

      try {
        await prisma.activityEvent.create({
          data: {
            type: activityFeed.ACTIVITY_TYPES.DOC_UPLOADED,
            title: `Documento subido: ${doc.name}`,
            description: `Tipo: ${doc.docType}`,
            clientId: expedient?.clientId,
            expedientId: doc.expedientId,
            relatedEntityType: 'Document',
            relatedEntityId: doc.id,
            createdAt: doc.createdAt,
          },
        });
        docEventsCreated++;
      } catch (err) {
        // Ignorar errores individuales
      }
    }
  }

  logger.info(`[Backfill] PASO F completado: ${created} expedientes, ${phaseEventsCreated} fases, ${visitEventsCreated} visitas, ${docEventsCreated} documentos`);
  return { expedients: created, phases: phaseEventsCreated, visits: visitEventsCreated, documents: docEventsCreated };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('  BACKFILL CLIENTE 360 - FASE 1');
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('Este script es IDEMPOTENTE - puede ejecutarse múltiples veces');
  logger.info('═══════════════════════════════════════════════════════════════');

  const startTime = Date.now();
  const results = {};

  try {
    results.expedientClients = await backfillExpedientClients();
    await sleep(500);

    results.contactDates = await backfillContactDates();
    await sleep(500);

    results.lifecycle = await backfillLifecycleMetrics();
    await sleep(500);

    results.documentOwners = await backfillDocumentOwners();
    await sleep(500);

    results.documentLinks = await backfillDocumentExpedientLinks();
    await sleep(500);

    results.activityEvents = await backfillActivityEvents();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('  RESUMEN DEL BACKFILL');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info(`  PASO A (ExpedientClient): ${results.expedientClients.created} creados, ${results.expedientClients.skipped} saltados`);
    logger.info(`  PASO B (Contact Dates): ${results.contactDates.updated} actualizados, ${results.contactDates.skipped} saltados`);
    logger.info(`  PASO C (Lifecycle): ${results.lifecycle.processed} procesados, ${results.lifecycle.errors} errores`);
    logger.info(`  PASO D (Doc Owners): ${results.documentOwners.updated} actualizados, ${results.documentOwners.skipped} saltados`);
    logger.info(`  PASO E (Doc Links): ${results.documentLinks.created} creados, ${results.documentLinks.skipped} saltados`);
    logger.info(`  PASO F (Activities): ${results.activityEvents.expedients} exp, ${results.activityEvents.phases} fases, ${results.activityEvents.visits} visitas, ${results.activityEvents.documents} docs`);
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info(`  Duración total: ${duration}s`);
    logger.info('═══════════════════════════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    logger.error('[Backfill] Error fatal:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
