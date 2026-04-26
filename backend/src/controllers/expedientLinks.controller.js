const { prisma } = require('../config/db');

const PHASE_ORDER = [
  'CAPTACION','VALORACION','FORMULARIO','DOCUMENTACION','VALIDACION','ACUERDO',
  'MARKETING_FORMULARIO','MARKETING_EJECUCION','VISITAS','PREVENTA',
  'BUSQUEDA_ACTIVA','NEGOCIACION','ACUERDO_INTERESADO','ARRAS',
  'HIPOTECA','NOTARIA','CIERRE','POSVENTA','CERRADO','CANCELADO','BLOQUEADO',
]

function phaseIndex(phase) {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx === -1 ? 999 : idx
}

async function validateAdvanceWithLinks(expedientId) {
  const links = await prisma.expedientLink.findMany({
    where: { expedientId, isBlocking: true },
    include: { linkedExpedient: { select: { id: true, code: true, currentPhase: true } } },
  })

  const blocked = []
  for (const link of links) {
    if (link.requiredPhase) {
      const linkedIdx = phaseIndex(link.linkedExpedient.currentPhase)
      const requiredIdx = phaseIndex(link.requiredPhase)
      if (linkedIdx < requiredIdx) {
        blocked.push({
          code: link.linkedExpedient.code,
          currentPhase: link.linkedExpedient.currentPhase,
          requiredPhase: link.requiredPhase,
          linkType: link.linkType,
        })
      }
    }
  }
  return blocked
}

async function listLinks(req, res) {
  try {
    const { id } = req.params
    const [outgoing, incoming] = await Promise.all([
      prisma.expedientLink.findMany({
        where: { expedientId: id },
        include: {
          linkedExpedient: {
            select: {
              id: true, code: true, operationType: true, currentPhase: true,
              status: true, expedientRole: true, propertyAddress: true,
              client: { select: { firstName: true, lastName: true, companyName: true } },
            },
          },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expedientLink.findMany({
        where: { linkedExpedientId: id },
        include: {
          expedient: {
            select: {
              id: true, code: true, operationType: true, currentPhase: true,
              status: true, expedientRole: true, propertyAddress: true,
              client: { select: { firstName: true, lastName: true, companyName: true } },
            },
          },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    res.json({ outgoing, incoming })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener vínculos' })
  }
}

async function createLink(req, res) {
  try {
    const { id } = req.params
    const {
      linkedExpedientId, linkType = 'RELACIONADO', linkDirection = 'UNIDIRECCIONAL',
      condition, isBlocking = false, requiredPhase, notes,
    } = req.body

    if (!linkedExpedientId) return res.status(400).json({ error: 'linkedExpedientId es obligatorio' })
    if (linkedExpedientId === id) return res.status(400).json({ error: 'No puedes vincular un expediente consigo mismo' })

    const existing = await prisma.expedientLink.findFirst({
      where: {
        OR: [
          { expedientId: id, linkedExpedientId },
          { expedientId: linkedExpedientId, linkedExpedientId: id },
        ],
      },
    })
    if (existing) return res.status(409).json({ error: 'Ya existe un vínculo entre estos expedientes' })

    const link = await prisma.expedientLink.create({
      data: {
        expedientId: id,
        linkedExpedientId,
        linkType,
        linkDirection,
        condition: condition || null,
        isBlocking,
        requiredPhase: requiredPhase || null,
        notes: notes || null,
        createdBy: req.user.id,
      },
      include: {
        linkedExpedient: {
          select: { id: true, code: true, operationType: true, currentPhase: true, status: true },
        },
      },
    })

    if (linkDirection === 'BIDIRECCIONAL') {
      await prisma.expedientLink.upsert({
        where: { expedientId_linkedExpedientId: { expedientId: linkedExpedientId, linkedExpedientId: id } },
        create: {
          expedientId: linkedExpedientId,
          linkedExpedientId: id,
          linkType,
          linkDirection,
          condition: condition || null,
          isBlocking,
          requiredPhase: requiredPhase || null,
          notes: notes || null,
          createdBy: req.user.id,
        },
        update: {},
      })
    }

    res.status(201).json(link)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear vínculo' })
  }
}

async function updateLink(req, res) {
  try {
    const { linkId } = req.params
    const { condition, isBlocking, requiredPhase, notes, linkType, linkDirection } = req.body
    const link = await prisma.expedientLink.update({
      where: { id: linkId },
      data: {
        ...(condition !== undefined && { condition }),
        ...(isBlocking !== undefined && { isBlocking }),
        ...(requiredPhase !== undefined && { requiredPhase: requiredPhase || null }),
        ...(notes !== undefined && { notes }),
        ...(linkType !== undefined && { linkType }),
        ...(linkDirection !== undefined && { linkDirection }),
      },
    })
    res.json(link)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar vínculo' })
  }
}

async function deleteLink(req, res) {
  try {
    const { linkId } = req.params
    const link = await prisma.expedientLink.findUnique({ where: { id: linkId } })
    if (!link) return res.status(404).json({ error: 'Vínculo no encontrado' })

    await prisma.expedientLink.deleteMany({
      where: {
        OR: [
          { id: linkId },
          { expedientId: link.linkedExpedientId, linkedExpedientId: link.expedientId },
        ],
      },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar vínculo' })
  }
}

async function checkBlockers(req, res) {
  try {
    const { id } = req.params
    const { targetPhase } = req.query
    if (!targetPhase) return res.status(400).json({ error: 'targetPhase es obligatorio' })
    const blocked = await validateAdvanceWithLinks(id, targetPhase)
    res.json({ blocked, isBlocked: blocked.length > 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al verificar bloqueos' })
  }
}

module.exports = { listLinks, createLink, updateLink, deleteLink, checkBlockers, validateAdvanceWithLinks }
