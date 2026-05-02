const { prisma } = require('../config/db');

/**
 * Asignar un rol a un usuario
 */
async function assignRoleToUser(userId, role, assignedBy = null) {
  try {
    const existingRole = await prisma.userRoleAssignment.findUnique({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
    });

    if (existingRole) {
      return existingRole; // Ya tiene este rol
    }

    const userRole = await prisma.userRoleAssignment.create({
      data: {
        userId,
        role,
        assignedBy,
      },
    });

    return userRole;
  } catch (error) {
    console.error('[Roles Service] Error assigning role:', error);
    throw error;
  }
}

/**
 * Remover un rol de un usuario
 */
async function removeRoleFromUser(userId, role) {
  try {
    await prisma.userRoleAssignment.delete({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[Roles Service] Error removing role:', error);
    throw error;
  }
}

/**
 * Obtener todos los roles de un usuario
 */
async function getUserRoles(userId) {
  try {
    const roles = await prisma.userRoleAssignment.findMany({
      where: { userId },
      orderBy: { assignedAt: 'desc' },
    });

    return roles.map(r => r.role);
  } catch (error) {
    console.error('[Roles Service] Error getting user roles:', error);
    throw error;
  }
}

/**
 * Obtener detalles completos de roles de un usuario
 */
async function getUserRolesDetails(userId) {
  try {
    return await prisma.userRoleAssignment.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  } catch (error) {
    console.error('[Roles Service] Error getting user roles details:', error);
    throw error;
  }
}

/**
 * Obtener todos los usuarios con un rol específico
 */
async function getUsersByRole(role) {
  try {
    return await prisma.userRoleAssignment.findMany({
      where: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, active: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  } catch (error) {
    console.error('[Roles Service] Error getting users by role:', error);
    throw error;
  }
}

/**
 * Verificar si un usuario tiene un rol específico
 */
async function userHasRole(userId, role) {
  try {
    const userRole = await prisma.userRoleAssignment.findUnique({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
    });

    return !!userRole;
  } catch (error) {
    console.error('[Roles Service] Error checking user role:', error);
    throw error;
  }
}

/**
 * Verificar si un usuario tiene alguno de los roles especificados
 */
async function userHasAnyRole(userId, roles) {
  try {
    const userRoles = await prisma.userRoleAssignment.findMany({
      where: {
        userId,
        role: { in: roles },
      },
    });

    return userRoles.length > 0;
  } catch (error) {
    console.error('[Roles Service] Error checking user roles:', error);
    throw error;
  }
}

module.exports = {
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserRolesDetails,
  getUsersByRole,
  userHasRole,
  userHasAnyRole,
};
