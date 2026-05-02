const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collaborators.controller');

/**
 * POST /api/collaborators/expedients/:expedientId/add
 * Agregar un colaborador a un expediente
 */
router.post('/expedients/:expedientId/add', ctrl.addCollaborator);

/**
 * DELETE /api/collaborators/expedients/:expedientId/users/:userId
 * Remover un colaborador de un expediente
 */
router.delete('/expedients/:expedientId/users/:userId', ctrl.removeCollaborator);

/**
 * GET /api/collaborators/expedients/:expedientId
 * Obtener todos los colaboradores de un expediente
 */
router.get('/expedients/:expedientId', ctrl.getExpedientCollaborators);

/**
 * GET /api/collaborators/users/:userId/expedients
 * Obtener todos los expedientes en los que un usuario es colaborador
 */
router.get('/users/:userId/expedients', ctrl.getUserExpedientCollaborations);

/**
 * GET /api/collaborators/expedients/:expedientId/role/:role
 * Obtener colaboradores con un rol específico en un expediente
 */
router.get('/expedients/:expedientId/role/:role', ctrl.getExpedientCollaboratorsByRole);

module.exports = router;
