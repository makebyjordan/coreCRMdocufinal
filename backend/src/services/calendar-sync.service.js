/**
 * Calendar Sync Service
 * Centraliza la lógica de sincronización entre entidades y CalendarEvent
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Build CalendarEvent data from a Visit
 * @param {Object} visit - Visit object with related data
 * @returns {Object} CalendarEvent data
 */
function buildCalendarEventFromVisit(visit) {
  return {
    title: `Visita: ${visit.visitorName}`,
    type: 'VISITA',
    startAt: visit.date,
    endAt: new Date(new Date(visit.date).getTime() + 60 * 60 * 1000), // +1 hour
    allDay: false,
    notes: visit.feedback || `Interés: ${visit.interestLevel}`,
    clientId: visit.expedient?.clientId || null,
    expedientId: visit.expedientId,
    completed: false,
  };
}

/**
 * Build CalendarEvent data from a Signature
 * @param {Object} signature - Signature object with related data
 * @returns {Object} CalendarEvent data
 */
function buildCalendarEventFromSignature(signature) {
  const isCompleted = signature.status === 'FIRMADO';
  const isExpired = signature.status === 'EXPIRADO';
  
  let title = `Firma: ${signature.documentName}`;
  if (signature.signerName) {
    title += ` - ${signature.signerName}`;
  }

  // Determine dates
  let startAt = signature.createdAt || new Date();
  let endAt = signature.expiresAt;
  
  // If signed, use signedAt as the event date
  if (signature.signedAt) {
    startAt = signature.signedAt;
    endAt = new Date(new Date(signature.signedAt).getTime() + 30 * 60 * 1000); // +30 min
  } else if (!endAt) {
    // Default expiration if not set: 7 days from creation
    endAt = new Date(new Date(startAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const notes = [
    `Tipo: ${signature.signerRole || 'Documento'}`,
    `Estado: ${signature.status}`,
    signature.signUrl ? `Link: ${signature.signUrl}` : null,
  ].filter(Boolean).join('\n');

  return {
    title,
    type: 'FIRMA',
    startAt,
    endAt,
    allDay: false,
    notes,
    clientId: signature.expedient?.clientId || null,
    expedientId: signature.expedientId,
    completed: isCompleted,
  };
}

/**
 * Get status color for a signature status
 * @param {string} status - SignatureStatus
 * @returns {string} Color code
 */
function getSignatureStatusColor(status) {
  switch (status) {
    case 'FIRMADO':
      return 'text-green-400';
    case 'EXPIRADO':
      return 'text-red-400';
    case 'ENVIADO':
      return 'text-purple-400';
    case 'PENDIENTE':
    default:
      return 'text-gray-400';
  }
}

/**
 * Sync a Visit with CalendarEvent (create or update)
 * @param {Object} visit - Visit object
 * @param {string} userId - User ID creating the event
 * @returns {Promise<Object>} Updated visit with calendarEvent
 */
async function syncVisitWithCalendar(visit, userId) {
  const eventData = buildCalendarEventFromVisit(visit);
  eventData.createdById = userId;

  return await prisma.$transaction(async (tx) => {
    let calendarEvent;

    if (visit.calendarEventId) {
      // Update existing event
      calendarEvent = await tx.calendarEvent.update({
        where: { id: visit.calendarEventId },
        data: eventData,
      });
    } else {
      // Create new event
      calendarEvent = await tx.calendarEvent.create({
        data: { ...eventData, visitId: visit.id },
      });
      
      // Update visit with calendarEventId
      await tx.visit.update({
        where: { id: visit.id },
        data: { calendarEventId: calendarEvent.id },
      });
    }

    return { ...visit, calendarEvent };
  });
}

/**
 * Sync a Signature with CalendarEvent (create or update)
 * @param {Object} signature - Signature object
 * @param {string} userId - User ID creating the event
 * @returns {Promise<Object>} Updated signature with calendarEvent
 */
async function syncSignatureWithCalendar(signature, userId) {
  const eventData = buildCalendarEventFromSignature(signature);
  eventData.createdById = userId;

  return await prisma.$transaction(async (tx) => {
    let calendarEvent;

    if (signature.calendarEventId) {
      // Update existing event
      calendarEvent = await tx.calendarEvent.update({
        where: { id: signature.calendarEventId },
        data: eventData,
      });
    } else {
      // Create new event
      calendarEvent = await tx.calendarEvent.create({
        data: { ...eventData, signatureId: signature.id },
      });
      
      // Update signature with calendarEventId
      await tx.signature.update({
        where: { id: signature.id },
        data: { calendarEventId: calendarEvent.id },
      });
    }

    return { ...signature, calendarEvent };
  });
}

/**
 * Delete CalendarEvent associated with a Visit
 * @param {string} visitId - Visit ID
 * @returns {Promise<void>}
 */
async function deleteVisitCalendarEvent(visitId) {
  await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({
      where: { id: visitId },
      select: { calendarEventId: true },
    });

    if (visit?.calendarEventId) {
      await tx.calendarEvent.delete({
        where: { id: visit.calendarEventId },
      });
    }
  });
}

/**
 * Delete CalendarEvent associated with a Signature
 * @param {string} signatureId - Signature ID
 * @returns {Promise<void>}
 */
async function deleteSignatureCalendarEvent(signatureId) {
  await prisma.$transaction(async (tx) => {
    const signature = await tx.signature.findUnique({
      where: { id: signatureId },
      select: { calendarEventId: true },
    });

    if (signature?.calendarEventId) {
      await tx.calendarEvent.delete({
        where: { id: signature.calendarEventId },
      });
    }
  });
}

/**
 * Update signature status and sync with calendar
 * @param {string} signatureId - Signature ID
 * @param {string} newStatus - New status (PENDIENTE, ENVIADO, FIRMADO, EXPIRADO)
 * @param {Object} additionalData - Additional data (signedAt, expiresAt, etc.)
 * @returns {Promise<Object>} Updated signature
 */
async function updateSignatureStatus(signatureId, newStatus, additionalData = {}) {
  return await prisma.$transaction(async (tx) => {
    // Update signature
    const signature = await tx.signature.update({
      where: { id: signatureId },
      data: {
        status: newStatus,
        ...additionalData,
      },
      include: {
        expedient: { select: { clientId: true, code: true } },
      },
    });

    // Build event data
    const eventData = buildCalendarEventFromSignature(signature);
    
    // Update or create calendar event
    if (signature.calendarEventId) {
      await tx.calendarEvent.update({
        where: { id: signature.calendarEventId },
        data: eventData,
      });
    } else {
      const calendarEvent = await tx.calendarEvent.create({
        data: {
          ...eventData,
          signatureId: signature.id,
        },
      });
      
      await tx.signature.update({
        where: { id: signature.id },
        data: { calendarEventId: calendarEvent.id },
      });
    }

    return signature;
  });
}

module.exports = {
  buildCalendarEventFromVisit,
  buildCalendarEventFromSignature,
  getSignatureStatusColor,
  syncVisitWithCalendar,
  syncSignatureWithCalendar,
  deleteVisitCalendarEvent,
  deleteSignatureCalendarEvent,
  updateSignatureStatus,
};
