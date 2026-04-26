/**
 * ClientRelations Controller
 * Red social entre clientes (relaciones familiares, referidos, etc.)
 */

const { prisma } = require('../config/db');

// Tipos de relación válidos
const VALID_TYPES = ['FAMILIAR', 'AMIGO', 'SOCIA', 'REFERIDO_POR', 'REFIERE_A', 'OTRO'];

// Listar relaciones de un cliente
async function listByClient(req, res) {
  const { id } = req.params;
  const { type } = req.query;

  try {
    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Buscar relaciones donde el cliente es A o B
    const relations = await prisma.clientRelation.findMany({
      where: {
        OR: [
          { clientAId: id },
          { clientBId: id },
        ],
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        clientA: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        clientB: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    // Normalizar: para cada relación, indicar cuál es el cliente "otro"
    const normalized = relations.map(r => {
      const isClientA = r.clientAId === id;
      return {
        ...r,
        otherClient: isClientA ? r.clientB : r.clientA,
        direction: isClientA ? 'outgoing' : 'incoming',
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('[Relations] Error:', err.message);
    // Si la tabla no existe, devolver array vacío
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      return res.json([]);
    }
    res.status(500).json({ error: 'Error al obtener relaciones' });
  }
}

// Crear relación entre clientes
async function create(req, res) {
  const { id } = req.params;
  const { otherClientId, type, notes } = req.body;

  // Validaciones
  if (!otherClientId) {
    return res.status(400).json({ error: 'otherClientId es requerido' });
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` });
  }

  // No permitir relación consigo mismo
  if (id === otherClientId) {
    return res.status(400).json({ error: 'No se puede crear una relación con el mismo cliente' });
  }

  // Verificar que ambos clientes existen
  const [clientA, clientB] = await Promise.all([
    prisma.client.findUnique({ where: { id }, select: { id: true } }),
    prisma.client.findUnique({ where: { id: otherClientId }, select: { id: true } }),
  ]);

  if (!clientA) {
    return res.status(404).json({ error: 'Cliente origen no encontrado' });
  }

  if (!clientB) {
    return res.status(404).json({ error: 'Cliente destino no encontrado' });
  }

  // Verificar que no existe ya esta relación (evitar duplicados)
  const existing = await prisma.clientRelation.findFirst({
    where: {
      OR: [
        { clientAId: id, clientBId: otherClientId, type },
        { clientAId: otherClientId, clientBId: id, type },
      ],
    },
  });

  if (existing) {
    return res.status(409).json({ error: 'Ya existe una relación de este tipo entre estos clientes' });
  }

  // Crear relación (ordenamos IDs para consistencia)
  const [smallerId, largerId] = id < otherClientId ? [id, otherClientId] : [otherClientId, id];
  const isOriginalDirection = id === smallerId;

  const relation = await prisma.clientRelation.create({
    data: {
      clientAId: smallerId,
      clientBId: largerId,
      type,
      notes,
    },
    include: {
      clientA: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      clientB: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  // Normalizar respuesta
  const normalized = {
    ...relation,
    otherClient: isOriginalDirection ? relation.clientB : relation.clientA,
    direction: isOriginalDirection ? 'outgoing' : 'incoming',
  };

  res.status(201).json(normalized);
}

// Eliminar relación
async function remove(req, res) {
  const { relationId } = req.params;

  const existing = await prisma.clientRelation.findUnique({
    where: { id: relationId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Relación no encontrada' });
  }

  await prisma.clientRelation.delete({
    where: { id: relationId },
  });

  res.status(204).send();
}

// Buscar referencias (quién refirió a quién)
async function getReferrals(req, res) {
  const { id } = req.params;

  // Buscar quién refirió a este cliente
  const referredBy = await prisma.clientRelation.findFirst({
    where: {
      OR: [
        { clientAId: id, type: 'REFERIDO_POR' },
        { clientBId: id, type: 'REFIERE_A' },
      ],
    },
    include: {
      clientA: { select: { id: true, firstName: true, lastName: true } },
      clientB: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Buscar a quiénes refirió este cliente
  const referredOthers = await prisma.clientRelation.findMany({
    where: {
      OR: [
        { clientAId: id, type: 'REFIERE_A' },
        { clientBId: id, type: 'REFERIDO_POR' },
      ],
    },
    include: {
      clientA: { select: { id: true, firstName: true, lastName: true } },
      clientB: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json({
    referredBy,
    referredOthers,
  });
}

module.exports = {
  listByClient,
  create,
  remove,
  getReferrals,
};
