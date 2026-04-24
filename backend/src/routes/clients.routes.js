const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clients.controller');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/search', ctrl.searchByDni);
router.post('/lookup-or-create', ctrl.lookupOrCreate);
router.get('/stats/dashboard', ctrl.getDashboardStats);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Sub-rutas para datos relacionados
router.get('/:id/expedients', ctrl.getClientExpedients);
router.get('/:id/documents', ctrl.getClientDocuments);
router.get('/:id/activity', ctrl.getClientActivity);
router.get('/:id/stats', ctrl.getClientStats);
router.get('/:id/summary', ctrl.getSummary);
router.get('/:id/timeline-aggregated', ctrl.getAggregatedTimeline);

module.exports = router;
