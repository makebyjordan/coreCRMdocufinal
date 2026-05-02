const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roles.controller');

/**
 * POST /api/roles/users/:userId/assign
 * Asignar un rol a un usuario
 */
router.post('/users/:userId/assign', ctrl.assignRoleToUser);

/**
 * DELETE /api/roles/users/:userId/remove/:role
 * Remover un rol de un usuario
 */
router.delete('/users/:userId/remove/:role', ctrl.removeRoleFromUser);

/**
 * GET /api/roles/users/:userId
 * Obtener todos los roles de un usuario
 */
router.get('/users/:userId', ctrl.getUserRoles);

/**
 * GET /api/roles/by-role/:role
 * Obtener todos los usuarios con un rol específico
 */
router.get('/by-role/:role', ctrl.getUsersByRole);

/**
 * GET /api/roles/users/:userId/has/:role
 * Verificar si un usuario tiene un rol específico
 */
router.get('/users/:userId/has/:role', ctrl.userHasRole);

module.exports = router;
