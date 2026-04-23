const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list(req, res) {
  const { search, type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(type && { type }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { expedients: true } } },
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
        select: { id: true, code: true, operationType: true, currentPhase: true, status: true, openedAt: true },
      },
    },
  });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
}

function normalizeClientData(body) {
  const {
    type, firstName, lastName, dni, companyName, nif, contactPerson,
    email, phone, phone2, address, city, postalCode, province,
    privacyPolicy, privacyDate, notes
  } = body;

  const data = {
    type, firstName, lastName, dni, companyName, nif, contactPerson,
    email, phone, phone2, address, city, postalCode, province,
    privacyPolicy: Boolean(privacyPolicy),
    privacyDate: privacyDate ? (privacyDate === '' ? null : new Date(privacyDate)) : null,
    notes
  };

  // Remove undefined keys to avoid overwriting with undefined
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  return data;
}

async function create(req, res) {
  try {
    const client = await prisma.client.create({ data: normalizeClientData(req.body) });
    res.status(201).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: normalizeClientData(req.body),
    });
    res.json(client);
  } catch (err) {
    console.error(err);
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

module.exports = { list, getById, create, update, remove };
