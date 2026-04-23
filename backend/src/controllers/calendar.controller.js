const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list(req, res) {
  const { from, to, types } = req.query;
  const where = {};
  
  if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = new Date(from);
    if (to) where.startAt.lte = new Date(to);
  }
  
  // Filter by event types (comma-separated list)
  if (types) {
    where.type = { in: types.split(',') };
  }
  
  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, email: true } },
      expedient: { select: { id: true, code: true, operationType: true, propertyAddress: true } },
      visit: true,
      signature: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.json(events);
}

async function create(req, res) {
  const { title, type, startAt, endAt, allDay, notes, clientId, expedientId } = req.body;
  const data = {
    title, type, startAt: startAt ? new Date(startAt) : null,
    endAt: endAt ? new Date(endAt) : null,
    allDay: Boolean(allDay), notes, clientId, expedientId,
    createdById: req.user.id
  };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  const event = await prisma.calendarEvent.create({
    data,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, email: true } },
      visit: true,
      signature: true,
      expedient: { select: { id: true, code: true, operationType: true, propertyAddress: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(event);
}

async function update(req, res) {
  const { title, type, startAt, endAt, allDay, notes, clientId, expedientId, completed } = req.body;
  const data = {
    title, type, startAt: startAt ? new Date(startAt) : null,
    endAt: endAt ? new Date(endAt) : null,
    allDay: Boolean(allDay), notes, clientId, expedientId,
    completed: Boolean(completed)
  };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  const event = await prisma.calendarEvent.update({
    where: { id: req.params.id },
    data,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, email: true } },
      visit: true,
      signature: true,
      expedient: { select: { id: true, code: true, operationType: true, propertyAddress: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.json(event);
}

async function remove(req, res) {
  await prisma.calendarEvent.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, create, update, remove };
