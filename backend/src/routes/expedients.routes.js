const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/expedients.controller');
const { authorize } = require('../middleware/auth.middleware');

// CRUD
router.get('/', ctrl.list);
router.get('/kanban', ctrl.kanban);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', authorize('DIRECCION', 'ADMINISTRACION'), ctrl.remove);

// Flujo de trabajo
router.post('/:id/advance', ctrl.advancePhase);
router.post('/:id/block', ctrl.blockExpedient);
router.post('/:id/unblock', ctrl.unblockExpedient);
router.post('/:id/close', ctrl.closeExpedient);
router.post('/:id/cancel', ctrl.cancelExpedient);
router.post('/:id/renew-exclusivity', ctrl.renewExclusivity);

// Asignaciones
router.get('/:id/assignments', ctrl.getAssignments);
router.post('/:id/assignments', ctrl.setAssignment);
router.delete('/:id/assignments/:assignmentId', ctrl.removeAssignment);

// Compradores / interesados
router.get('/:id/buyers', ctrl.getBuyers);
router.post('/:id/buyers', ctrl.addBuyer);
router.put('/:id/buyers/:buyerId', ctrl.updateBuyer);
router.delete('/:id/buyers/:buyerId', ctrl.removeBuyer);

// Historial
router.get('/:id/history', ctrl.getPhaseHistory);

// Firmas
router.get('/:id/signatures', ctrl.getSignatures);
router.post('/:id/signatures', ctrl.createSignature);
router.put('/:id/signatures/:signatureId', ctrl.updateSignature);
router.patch('/:id/signatures/:signatureId/status', ctrl.updateSignatureStatus);
router.delete('/:id/signatures/:signatureId', ctrl.deleteSignature);

// Expedientes vinculados
router.get('/:id/linked', ctrl.getLinkedExpedients);
router.post('/:id/link', ctrl.linkExpedient);
router.delete('/:id/link/:childId', ctrl.unlinkExpedient);
router.patch('/:id/role', ctrl.setExpedientRole);

module.exports = router;
