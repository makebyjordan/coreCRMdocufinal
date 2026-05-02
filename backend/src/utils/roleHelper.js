/**
 * Helper utilities para manejo de roles multi-rol
 */

/**
 * Verifica si un usuario tiene un rol específico
 * @param {Object} user - User object con propiedad roles (array)
 * @param {string} role - Role a verificar
 * @returns {boolean}
 */
function userHasRole(user, role) {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

/**
 * Verifica si un usuario tiene al menos uno de los roles especificados
 * @param {Object} user - User object con propiedad roles (array)
 * @param {string[]} roles - Array de roles a verificar
 * @returns {boolean}
 */
function userHasAnyRole(user, ...roles) {
  if (!user || !user.roles) return false;
  return roles.some(role => user.roles.includes(role));
}

/**
 * Verifica si un usuario tiene todos los roles especificados
 * @param {Object} user - User object con propiedad roles (array)
 * @param {string[]} roles - Array de roles a verificar
 * @returns {boolean}
 */
function userHasAllRoles(user, ...roles) {
  if (!user || !user.roles) return false;
  return roles.every(role => user.roles.includes(role));
}

/**
 * Verifica si un usuario es administrador
 * @param {Object} user - User object
 * @returns {boolean}
 */
function isAdmin(user) {
  return userHasAnyRole(user, 'ADMINISTRACION', 'DIRECCION');
}

/**
 * Verifica si un usuario es comercial
 * @param {Object} user - User object
 * @returns {boolean}
 */
function isCommercial(user) {
  return userHasRole(user, 'COMERCIAL');
}

module.exports = {
  userHasRole,
  userHasAnyRole,
  userHasAllRoles,
  isAdmin,
  isCommercial,
};
