const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PHASE_ORDER = [
  // Flujo estándar
  'CAPTACION','VALORACION','FORMULARIO','DOCUMENTACION','VALIDACION','ACUERDO',
  'MARKETING_FORMULARIO','MARKETING_EJECUCION','VISITAS','PREVENTA',
  'BUSQUEDA_ACTIVA','NEGOCIACION','ACUERDO_INTERESADO','ARRAS',
  'HIPOTECA','NOTARIA','CIERRE','POSVENTA',
  // VENTA - Captación
  'CAPTACION_INMUEBLE','VALORACION_MERCADO','MANDATO_EXCLUSIVA',
  'DOCUMENTACION_LEGAL','PREPARACION_MARKETING','PUBLICACION_ACTIVO',
  // VENTA - Comprador
  'CAPTACION_COMPRADOR','GESTION_VISITAS','NEGOCIACION_PRECIO',
  'RESERVA_SENAL','ARRAS_PRIVADO','GESTION_HIPOTECA',
  'PREPARACION_NOTARIA','FIRMA_ESCRITURA','CIERRE_REGISTRO','POSTVENTA_SEGUIMIENTO',
  // ALQUILER - Propietario
  'CAPTACION_PROPIEDAD','VALORACION_RENTA','MANDATO_ALQUILER',
  'DOCUMENTACION_INMUEBLE','MARKETING_DIFUSION','GESTION_VISITAS_ALQ',
  // ALQUILER - Inquilino
  'CAPTACION_INQUILINO','PRESENTACION_INMUEBLES','DOCUMENTACION_SOLVENCIA',
  'VALIDACION_ECONOMICA','NEGOCIACION_CONDICIONES','CONTRATO_ALQUILER',
  'ENTREGA_INMUEBLE','GESTION_MENSUAL',
  // INVERSIÓN
  'PERFILADO_INVERSOR','KYC_SOLVENCIA','BUSQUEDA_ACTIVOS',
  'ANALISIS_FINANCIERO','DUE_DILIGENCE','NEGOCIACION_INV',
  'RESERVA_ACTIVO','ARRAS_INVERSION','FINANCIACION_INV',
  'CIERRE_COMPRA','GESTION_POST_COMPRA',
  // Estados finales
  'CERRADO','CANCELADO','BLOQUEADO',
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

// Called after an expedient advances — finds expedients that were waiting on
// this one and logs/notifies that their blocking link is now satisfied.
async function checkAndNotifyUnblockedLinks(expedientId, newPhase, prismaClient) {
  const db = prismaClient || prisma

  // Find all outgoing blocking links FROM other expedients TO this one
  const waitingLinks = await db.expedientLink.findMany({
    where: { linkedExpedientId: expedientId, isBlocking: true },
    include: {
      expedient: {
        select: { id: true, code: true, currentPhase: true, status: true },
      },
    },
  })

  for (const link of waitingLinks) {
    if (!link.requiredPhase) continue
    const nowIdx = phaseIndex(newPhase)
    const reqIdx = phaseIndex(link.requiredPhase)

    if (nowIdx >= reqIdx) {
      // This link is now unblocked — log it
      console.info(
        `[Links] Expediente ${link.expedient.code} desbloqueado: su vínculo con expediente ${expedientId} ` +
        `alcanzó la fase requerida ${link.requiredPhase} (nueva fase: ${newPhase})`
      )

      // Update dependencyStatus on the waiting expedient to DESBLOQUEADO
      await db.expedient.update({
        where: { id: link.expedient.id },
        data: { dependencyStatus: 'DESBLOQUEADO' },
      }).catch(() => {}) // non-fatal
    }
  }
}

module.exports = { validateAdvanceWithLinks, checkAndNotifyUnblockedLinks }
