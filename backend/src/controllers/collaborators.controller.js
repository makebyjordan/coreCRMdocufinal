const collaboratorsService = require('../services/collaborators.service');

/**
 * POST /api/collaborators/expedients/:expedientId/add
 * Agregar un colaborador a un expediente
 */
async function addCollaborator(req, res) {
  try {
    const { expedientId } = req.params;
    const { userId, collaboratorRole, notes } = req.body;

    if (!userId || !collaboratorRole) {
      return res.status(400).json({ error: 'userId y collaboratorRole son requeridos' });
    }

    const collaborator = await collaboratorsService.addCollaborator(
      expedientId,
      userId,
      collaboratorRole,
      req.user?.id,
      notes
    );

    res.json(collaborator);
  } catch (error) {
    console.error('[Collaborators Controller] Error adding collaborator:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/collaborators/expedients/:expedientId/users/:userId
 * Remover un colaborador de un expediente
 */
async function removeCollaborator(req, res) {
  try {
    const { expedientId, userId } = req.params;

    await collaboratorsService.removeCollaborator(expedientId, userId);

    res.json({ success: true, message: `Colaborador removido del expediente` });
  } catch (error) {
    console.error('[Collaborators Controller] Error removing collaborator:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/collaborators/expedients/:expedientId
 * Obtener todos los colaboradores de un expediente
 */
async function getExpedientCollaborators(req, res) {
  try {
    const { expedientId } = req.params;

    const collaborators = await collaboratorsService.getExpedientCollaborators(expedientId);

    res.json(collaborators);
  } catch (error) {
    console.error('[Collaborators Controller] Error getting expedient collaborators:', error);
    // Si la tabla no existe (migración pendiente), devolver array vacío
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      return res.json([]);
    }
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/collaborators/users/:userId/expedients
 * Obtener todos los expedientes en los que un usuario es colaborador
 */
async function getUserExpedientCollaborations(req, res) {
  try {
    const { userId } = req.params;

    const collaborations = await collaboratorsService.getUserExpedientCollaborations(userId);

    res.json(collaborations);
  } catch (error) {
    console.error('[Collaborators Controller] Error getting user collaborations:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/collaborators/expedients/:expedientId/role/:role
 * Obtener colaboradores con un rol específico en un expediente
 */
async function getExpedientCollaboratorsByRole(req, res) {
  try {
    const { expedientId, role } = req.params;

    const collaborators = await collaboratorsService.getExpedientCollaboratorsByRole(
      expedientId,
      role
    );

    res.json(collaborators);
  } catch (error) {
    console.error('[Collaborators Controller] Error getting collaborators by role:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  addCollaborator,
  removeCollaborator,
  getExpedientCollaborators,
  getUserExpedientCollaborations,
  getExpedientCollaboratorsByRole,
};
