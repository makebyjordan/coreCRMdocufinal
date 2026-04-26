const { prisma } = require('../config/db');

async function getJourney(req, res) {
  try {
    const { clientId } = req.params

    const [client, expedients] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true, firstName: true, lastName: true, companyName: true,
          email: true, phone: true, type: true,
        },
      }),
      prisma.expedient.findMany({
        where: { clientId },
        select: {
          id: true, code: true, operationType: true, operationSize: true,
          currentPhase: true, status: true, expedientRole: true,
          propertyAddress: true, propertyPrice: true,
          commissionFixed: true, commissionPercent: true,
          openedAt: true, closedAt: true,
          phaseHistory: {
            orderBy: { createdAt: 'asc' },
            select: { fromPhase: true, toPhase: true, createdAt: true },
          },
        },
        orderBy: { openedAt: 'asc' },
      }),
    ])

    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })

    const totalValue = expedients.reduce((sum, e) => {
      if (e.commissionFixed) return sum + Number(e.commissionFixed)
      if (e.commissionPercent && e.propertyPrice)
        return sum + Number(e.propertyPrice) * (Number(e.commissionPercent) / 100)
      return sum
    }, 0)

    await prisma.clientJourney.upsert({
      where: { clientId },
      create: { clientId, expedients: expedients.map(e => e.id), totalValue },
      update: { expedients: expedients.map(e => e.id), totalValue },
    })

    res.json({ client, expedients, totalValue, count: expedients.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener historial del cliente' })
  }
}

module.exports = { getJourney }
