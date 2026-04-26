const { prisma } = require('../config/db');
const checklistGenerator = require('../services/checklist.generator');
const notificationEngine = require('../services/notification.engine');

async function listTemplates(req, res) {
  const { operationType, phase } = req.query;
  const where = {
    ...(operationType && { operationType }),
    ...(phase && { phase }),
    active: true,
  };
  const templates = await prisma.checklistTemplate.findMany({
    where,
    include: { items: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });
  res.json(templates);
}

async function createTemplate(req, res) {
  const { items = [], ...templateData } = req.body;
  const template = await prisma.checklistTemplate.create({
    data: {
      ...templateData,
      items: { create: items.map((item, i) => ({ ...item, order: i })) },
    },
    include: { items: true },
  });
  res.status(201).json(template);
}

async function updateTemplate(req, res) {
  const { items, ...data } = req.body;
  const templateId = req.params.id;

  // Actualizar datos básicos
  const template = await prisma.checklistTemplate.update({
    where: { id: templateId },
    data,
  });

  // Si vienen items, sincronizarlos
  if (items) {
    // 1. Obtener IDs actuales para saber cuáles borrar
    const currentItems = await prisma.checklistTemplateItem.findMany({
      where: { templateId },
      select: { id: true },
    });
    const currentIds = currentItems.map(i => i.id);
    const newIds = items.map(i => i.id).filter(Boolean);
    const toDelete = currentIds.filter(id => !newIds.includes(id));

    // 2. Borrar eliminados
    if (toDelete.length > 0) {
      await prisma.checklistTemplateItem.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    // 3. Upsert de los nuevos/editados
    for (const [index, item] of items.entries()) {
      if (item.id && currentIds.includes(item.id)) {
        await prisma.checklistTemplateItem.update({
          where: { id: item.id },
          data: { label: item.label, required: item.required, order: index },
        });
      } else {
        await prisma.checklistTemplateItem.create({
          data: {
            templateId,
            label: item.label,
            required: item.required,
            order: index,
          },
        });
      }
    }
  }

  const updated = await prisma.checklistTemplate.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: { order: 'asc' } } },
  });

  res.json(updated);
}

async function deleteTemplate(req, res, next) {
  try {
    console.log(`Intentando borrar checklistTemplate ID: ${req.params.id}`);
    await prisma.checklistTemplate.delete({
      where: { id: req.params.id },
    });
    console.log(`ChecklistTemplate ${req.params.id} borrado exitosamente.`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al borrar checklistTemplate:', err);
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede eliminar esta fase porque ya está siendo utilizada en expedientes activos. Tendrías que borrar esos expedientes primero.' });
    }
    next(err);
  }
}

async function listByExpedient(req, res) {
  const instances = await prisma.checklistInstance.findMany({
    where: { expedientId: req.params.expedientId },
    include: {
      template: true,
      items: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Añadir porcentaje de completitud
  const withProgress = instances.map(inst => {
    const total = inst.items.length;
    const done = inst.items.filter(i => i.completed).length;
    const required = inst.items.filter(i => i.required).length;
    const requiredDone = inst.items.filter(i => i.required && i.completed).length;
    return {
      ...inst,
      progress: { total, done, required, requiredDone, percent: total ? Math.round((done / total) * 100) : 0 },
    };
  });

  res.json(withProgress);
}

async function generateForExpedient(req, res) {
  const { expedientId } = req.params;
  const { phase } = req.body;

  const expedient = await prisma.expedient.findUnique({ where: { id: expedientId } });
  if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });

  const instances = await checklistGenerator.generateForPhase(
    expedientId, phase || expedient.currentPhase,
    expedient.operationType, expedient.operationSize
  );

  res.status(201).json(instances);
}

async function updateItem(req, res) {
  const { instanceId, itemId } = req.params;
  const { completed, notes } = req.body;

  const item = await prisma.checklistInstanceItem.update({
    where: { id: itemId },
    data: {
      completed,
      notes,
      ...(completed && { completedAt: new Date(), completedBy: req.user.name }),
      ...(!completed && { completedAt: null, completedBy: null }),
    },
  });

  // Verificar si la instancia completa está terminada
  const instance = await prisma.checklistInstance.findUnique({
    where: { id: instanceId },
    include: { items: true },
  });

  const allRequiredDone = instance.items.filter(i => i.required).every(i => i.completed);
  if (allRequiredDone && !instance.completedAt) {
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { completedAt: new Date() },
    });
  } else if (!allRequiredDone && instance.completedAt) {
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { completedAt: null },
    });
  }

  res.json(item);
}

async function completeChecklist(req, res) {
  const instance = await prisma.checklistInstance.update({
    where: { id: req.params.instanceId },
    data: { completedAt: new Date() },
    include: { items: true },
  });
  res.json(instance);
}

async function bulkUpdateOrder(req, res) {
  const { templates } = req.body; // Array de { id, order }

  const updates = templates.map(t => 
    prisma.checklistTemplate.update({
      where: { id: t.id },
      data: { order: t.order }
    })
  );

  await prisma.$transaction(updates);
  res.json({ success: true });
}

module.exports = {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, bulkUpdateOrder,
  listByExpedient, generateForExpedient,
  updateItem, completeChecklist,
};
