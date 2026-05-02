const { prisma } = require('../config/db');

/**
 * Agregar un colaborador a un expediente
 */
async function addCollaborator(expedientId, userId, collaboratorRole, addedBy = null, notes = null) {
  try {
    const existingCollaborator = await prisma.expedientCollaborator.findUnique({
      where: {
        expedientId_userId: {
          expedientId,
          userId,
        },
      },
    });

    if (existingCollaborator) {
      // Si ya existe, actualizar el rol y notas
      return await prisma.expedientCollaborator.update({
        where: {
          expedientId_userId: {
            expedientId,
            userId,
          },
        },
        data: {
          collaboratorRole,
          notes,
          addedBy: addedBy || existingCollaborator.addedBy,
        },
      });
    }

    return await prisma.expedientCollaborator.create({
      data: {
        expedientId,
        userId,
        collaboratorRole,
        addedBy,
        notes,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  } catch (error) {
    console.error('[Collaborators Service] Error adding collaborator:', error);
    throw error;
  }
}

/**
 * Remover un colaborador de un expediente
 */
async function removeCollaborator(expedientId, userId) {
  try {
    await prisma.expedientCollaborator.delete({
      where: {
        expedientId_userId: {
          expedientId,
          userId,
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[Collaborators Service] Error removing collaborator:', error);
    throw error;
  }
}

/**
 * Obtener todos los colaboradores de un expediente
 */
async function getExpedientCollaborators(expedientId) {
  try {
    return await prisma.expedientCollaborator.findMany({
      where: { expedientId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ collaboratorRole: 'asc' }, { addedAt: 'desc' }],
    });
  } catch (error) {
    console.error('[Collaborators Service] Error getting expedient collaborators:', error);
    throw error;
  }
}

/**
 * Obtener todos los expedientes en los que un usuario es colaborador
 */
async function getUserExpedientCollaborations(userId) {
  try {
    return await prisma.expedientCollaborator.findMany({
      where: { userId },
      include: {
        expedient: {
          select: {
            id: true,
            code: true,
            currentPhase: true,
            operationType: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
  } catch (error) {
    console.error('[Collaborators Service] Error getting user collaborations:', error);
    throw error;
  }
}

/**
 * Obtener colaboradores con un rol específico en un expediente
 */
async function getExpedientCollaboratorsByRole(expedientId, role) {
  try {
    return await prisma.expedientCollaborator.findMany({
      where: {
        expedientId,
        collaboratorRole: role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Collaborators Service] Error getting collaborators by role:', error);
    throw error;
  }
}

/**
 * Verificar si un usuario es colaborador de un expediente
 */
async function isExpedientCollaborator(expedientId, userId) {
  try {
    const collaborator = await prisma.expedientCollaborator.findUnique({
      where: {
        expedientId_userId: {
          expedientId,
          userId,
        },
      },
    });

    return !!collaborator;
  } catch (error) {
    console.error('[Collaborators Service] Error checking collaborator:', error);
    throw error;
  }
}

/**
 * Obtener rol de un usuario en un expediente
 */
async function getUserRoleInExpedient(expedientId, userId) {
  try {
    const collaborator = await prisma.expedientCollaborator.findUnique({
      where: {
        expedientId_userId: {
          expedientId,
          userId,
        },
      },
    });

    return collaborator?.collaboratorRole || null;
  } catch (error) {
    console.error('[Collaborators Service] Error getting user role in expedient:', error);
    throw error;
  }
}

module.exports = {
  addCollaborator,
  removeCollaborator,
  getExpedientCollaborators,
  getUserExpedientCollaborations,
  getExpedientCollaboratorsByRole,
  isExpedientCollaborator,
  getUserRoleInExpedient,
};
