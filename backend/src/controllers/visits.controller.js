const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listByExpedient(req, res) {
  const { expedientId } = req.params;
  const visits = await prisma.visit.findMany({
    where: { expedientId },
    orderBy: { date: 'desc' },
  });
  res.json(visits);
}

async function create(req, res) {
  const { expedientId } = req.params;
  const { date, visitorName, visitorPhone, feedback, interestLevel } = req.body;
  
  // Get expedient data for calendar event title
  const expedient = await prisma.expedient.findUnique({
    where: { id: expedientId },
    include: { client: { select: { firstName: true, lastName: true, companyName: true } } },
  });
  
  if (!expedient) {
    return res.status(404).json({ error: 'Expediente no encontrado' });
  }
  
  const visitDate = new Date(date);
  const endDate = new Date(visitDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  
  // Create visit and calendar event in transaction
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.create({
      data: {
        expedientId,
        date: visitDate,
        visitorName,
        visitorPhone,
        feedback,
        interestLevel,
      },
    });
    
    // Create corresponding calendar event
    const calendarEvent = await tx.calendarEvent.create({
      data: {
        title: `Visita: ${visitorName} - ${expedient.code}`,
        type: 'VISITA',
        startAt: visitDate,
        endAt: endDate,
        allDay: false,
        notes: `Interesado: ${visitorName}\nTeléfono: ${visitorPhone || 'N/A'}\nInterés: ${interestLevel}\nFeedback: ${feedback || 'Pendiente'}`,
        expedientId,
        clientId: expedient.clientId,
        visitId: visit.id,
        createdById: req.user?.id,
      },
    });
    
    // Update visit with calendarEventId
    const updatedVisit = await tx.visit.update({
      where: { id: visit.id },
      data: { calendarEventId: calendarEvent.id },
    });
    
    return updatedVisit;
  });
  
  res.status(201).json(result);
}

async function update(req, res) {
  const { id } = req.params;
  const { date, visitorName, visitorPhone, feedback, interestLevel } = req.body;
  
  // Get current visit with calendar event
  const currentVisit = await prisma.visit.findUnique({
    where: { id },
    include: { calendarEvent: true, expedient: { include: { client: true } } },
  });
  
  if (!currentVisit) {
    return res.status(404).json({ error: 'Visita no encontrada' });
  }
  
  const visitDate = date ? new Date(date) : currentVisit.date;
  const endDate = new Date(visitDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  
  // Update visit and sync calendar event
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({
      where: { id },
      data: {
        date: visitDate,
        visitorName,
        visitorPhone,
        feedback,
        interestLevel,
      },
    });
    
    // Update or create calendar event if it exists
    if (currentVisit.calendarEvent) {
      await tx.calendarEvent.update({
        where: { id: currentVisit.calendarEvent.id },
        data: {
          title: `Visita: ${visitorName || currentVisit.visitorName} - ${currentVisit.expedient.code}`,
          startAt: visitDate,
          endAt: endDate,
          notes: `Interesado: ${visitorName || currentVisit.visitorName}\nTeléfono: ${visitorPhone || currentVisit.visitorPhone || 'N/A'}\nInterés: ${interestLevel || currentVisit.interestLevel}\nFeedback: ${feedback || currentVisit.feedback || 'Pendiente'}`,
        },
      });
    }
    
    return visit;
  });
  
  res.json(result);
}

async function remove(req, res) {
  const { id } = req.params;
  
  // Delete visit (calendar event will be cascade deleted due to relation)
  await prisma.visit.delete({ where: { id } });
  
  res.status(204).send();
}

module.exports = { listByExpedient, create, update, remove };
