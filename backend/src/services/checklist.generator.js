const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * Genera instancias de checklist para un expediente en una fase dada,
 * buscando en las plantillas las que correspondan al tipo de operación.
 */
async function generateForPhase(expedientId, phase, operationType, operationSize = 'INDIVIDUAL') {
  const templates = await prisma.checklistTemplate.findMany({
    where: {
      phase,
      active: true,
      OR: [
        { operationType, operationSize },
        { operationType, operationSize: 'INDIVIDUAL' },
      ],
    },
    include: { items: { orderBy: { order: 'asc' } } },
  });

  // Si no hay plantillas específicas, buscar genéricas para el tipo de operación
  let toCreate = templates;
  if (toCreate.length === 0) {
    const fallback = await prisma.checklistTemplate.findMany({
      where: { phase, active: true, operationType },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    toCreate = fallback;
  }

  const instances = [];
  for (const template of toCreate) {
    // Verificar que no exista ya una instancia para este expediente y plantilla
    const existing = await prisma.checklistInstance.findFirst({
      where: { expedientId, templateId: template.id },
    });
    if (existing) {
      instances.push(existing);
      continue;
    }

    const instance = await prisma.checklistInstance.create({
      data: {
        expedientId,
        templateId: template.id,
        phase,
        items: {
          create: template.items.map(item => ({
            label: item.label,
            description: item.description,
            required: item.required,
            order: item.order,
          })),
        },
      },
      include: { items: true, template: true },
    });
    instances.push(instance);
  }

  logger.info(`[Checklist] Generadas ${instances.length} instancias para fase ${phase} en expediente ${expedientId}`);
  return instances;
}

/**
 * Verifica si todos los checklists obligatorios de una fase están completos.
 */
async function isPhaseComplete(expedientId, phase) {
  // Buscar TODAS las instancias de esta fase (completadas y activas)
  const allInstances = await prisma.checklistInstance.findMany({
    where: { expedientId, phase },
    include: { items: true },
  });

  // Si no hay instancias en absoluto, intentar generarlas
  if (allInstances.length === 0) {
    const exp = await prisma.expedient.findUnique({ where: { id: expedientId } });
    if (exp && !['CERRADO', 'CANCELADO', 'POSVENTA'].includes(phase)) {
      await generateForPhase(exp.id, phase, exp.operationType, exp.operationSize);
      // Recargar instancias recién creadas
      const newInstances = await prisma.checklistInstance.findMany({
        where: { expedientId, phase },
        include: { items: true },
      });
      // Verificar que las nuevas instancias estén completas
      for (const instance of newInstances) {
        const requiredItems = instance.items.filter(i => i.required);
        const allDone = requiredItems.every(i => i.completed);
        if (!allDone) return false;
      }
      return true;
    }
    // Sin instancias en fases finales = OK
    if (['CERRADO', 'CANCELADO'].includes(phase)) return true;
    return false;
  }

  // Filtrar solo instancias activas (no completadas) para verificar
  const activeInstances = allInstances.filter(i => i.completedAt === null);
  
  // Si hay instancias activas, verificar que estén completas
  if (activeInstances.length > 0) {
    for (const instance of activeInstances) {
      const requiredItems = instance.items.filter(i => i.required);
      const allDone = requiredItems.every(i => i.completed);
      if (!allDone) return false;
    }
    return true;
  }

  // Si no hay instancias activas pero sí completadas, la fase está completa
  return true;
}

module.exports = { generateForPhase, isPhaseComplete };
