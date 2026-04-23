/**
 * Script de backfill para crear CalendarEvents para:
 * - Firmas existentes sin evento vinculado
 * - Visitas existentes sin evento vinculado
 * 
 * Uso: node scripts/backfill-calendar-events.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillSignatures() {
  console.log('🔍 Buscando firmas sin evento de calendario...\n');
  
  const signatures = await prisma.signature.findMany({
    where: { calendarEventId: null },
    include: {
      expedient: { select: { id: true, clientId: true, code: true } },
    },
  });
  
  console.log(`📋 Encontradas ${signatures.length} firmas sin evento vinculado`);
  
  let created = 0;
  let errors = 0;
  
  for (const signature of signatures) {
    try {
      // Build calendar event data
      const isCompleted = signature.status === 'FIRMADO';
      const isExpired = signature.status === 'EXPIRADO';
      
      let title = `Firma: ${signature.documentName}`;
      if (signature.signerName) {
        title += ` - ${signature.signerName}`;
      }
      
      let startAt = signature.createdAt || new Date();
      let endAt = signature.expiresAt;
      
      if (signature.signedAt) {
        startAt = signature.signedAt;
        endAt = new Date(new Date(signature.signedAt).getTime() + 30 * 60 * 1000);
      } else if (!endAt) {
        endAt = new Date(new Date(startAt).getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      
      const notes = [
        `Tipo: ${signature.signerRole || 'Documento'}`,
        `Estado: ${signature.status}`,
        signature.signUrl ? `Link: ${signature.signUrl}` : null,
      ].filter(Boolean).join('\n');
      
      // Create calendar event
      const calendarEvent = await prisma.calendarEvent.create({
        data: {
          title,
          type: 'FIRMA',
          startAt,
          endAt,
          allDay: false,
          notes,
          clientId: signature.expedient?.clientId || null,
          expedientId: signature.expedientId,
          signatureId: signature.id,
          completed: isCompleted,
        },
      });
      
      // Update signature with calendarEventId
      await prisma.signature.update({
        where: { id: signature.id },
        data: { calendarEventId: calendarEvent.id },
      });
      
      created++;
      console.log(`  ✅ Creado evento para firma ${signature.id}: ${title}`);
    } catch (error) {
      errors++;
      console.error(`  ❌ Error procesando firma ${signature.id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Firmas: ${created} creadas, ${errors} errores\n`);
  return { created, errors };
}

async function backfillVisits() {
  console.log('🔍 Buscando visitas sin evento de calendario...\n');
  
  const visits = await prisma.visit.findMany({
    where: { calendarEventId: null },
    include: {
      expedient: { select: { id: true, clientId: true, code: true } },
    },
  });
  
  console.log(`📋 Encontradas ${visits.length} visitas sin evento vinculado`);
  
  let created = 0;
  let errors = 0;
  
  for (const visit of visits) {
    try {
      const calendarEvent = await prisma.calendarEvent.create({
        data: {
          title: `Visita: ${visit.visitorName}`,
          type: 'VISITA',
          startAt: visit.date,
          endAt: new Date(new Date(visit.date).getTime() + 60 * 60 * 1000),
          allDay: false,
          notes: visit.feedback || `Interés: ${visit.interestLevel}`,
          clientId: visit.expedient?.clientId || null,
          expedientId: visit.expedientId,
          visitId: visit.id,
          completed: false,
        },
      });
      
      await prisma.visit.update({
        where: { id: visit.id },
        data: { calendarEventId: calendarEvent.id },
      });
      
      created++;
      console.log(`  ✅ Creado evento para visita ${visit.id}: ${visit.visitorName}`);
    } catch (error) {
      errors++;
      console.error(`  ❌ Error procesando visita ${visit.id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Visitas: ${created} creadas, ${errors} errores\n`);
  return { created, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     BACKFILL DE EVENTOS DE CALENDARIO - CRM INMOBILIARIA    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    const signaturesResult = await backfillSignatures();
    const visitsResult = await backfillVisits();
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                      RESUMEN FINAL                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Firmas:  ${signaturesResult.created.toString().padStart(3)} creadas  |  ${signaturesResult.errors.toString().padStart(3)} errores          ║`);
    console.log(`║  Visitas: ${visitsResult.created.toString().padStart(3)} creadas  |  ${visitsResult.errors.toString().padStart(3)} errores          ║`);
    console.log(`║  Total:   ${(signaturesResult.created + visitsResult.created).toString().padStart(3)} creadas  |  ${(signaturesResult.errors + visitsResult.errors).toString().padStart(3)} errores          ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
