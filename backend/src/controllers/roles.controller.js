const rolesService = require('../services/roles.service');

/**
 * POST /api/roles/users/:userId/assign
 * Asignar un rol a un usuario
 */
async function assignRoleToUser(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'El rol es requerido' });
    }

    const userRole = await rolesService.assignRoleToUser(userId, role, req.user?.id);

    res.json(userRole);
  } catch (error) {
    console.error('[Roles Controller] Error assigning role:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/roles/users/:userId/remove/:role
 * Remover un rol de un usuario
 */
async function removeRoleFromUser(req, res) {
  try {
    const { userId, role } = req.params;

    await rolesService.removeRoleFromUser(userId, role);

    res.json({ success: true, message: `Rol ${role} removido de usuario ${userId}` });
  } catch (error) {
    console.error('[Roles Controller] Error removing role:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/roles/users/:userId
 * Obtener todos los roles de un usuario
 */
async function getUserRoles(req, res) {
  try {
    const { userId } = req.params;

    const roles = await rolesService.getUserRolesDetails(userId);

    res.json(roles);
  } catch (error) {
    console.error('[Roles Controller] Error getting user roles:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/roles/by-role/:role
 * Obtener todos los usuarios con un rol específico
 */
async function getUsersByRole(req, res) {
  try {
    const { role } = req.params;

    const users = await rolesService.getUsersByRole(role);

    res.json(users);
  } catch (error) {
    console.error('[Roles Controller] Error getting users by role:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/roles/users/:userId/has/:role
 * Verificar si un usuario tiene un rol específico
 */
async function userHasRole(req, res) {
  try {
    const { userId, role } = req.params;

    const has = await rolesService.userHasRole(userId, role);

    res.json({ userId, role, has });
  } catch (error) {
    console.error('[Roles Controller] Error checking user role:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUsersByRole,
  userHasRole,
};
