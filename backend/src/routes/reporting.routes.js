const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reporting.controller');

router.post('/export', ctrl.exportExpedients);
router.post('/commission-report', ctrl.generateCommissionReport);
router.get('/timeline-analysis/:operationType', ctrl.getTimelineAnalysis);
router.get('/kpi-dashboard', ctrl.getKPIDashboard);
router.get('/postventa/:expedientId', ctrl.getPostventaReport);
router.get('/benchmark/:expedientId', ctrl.getBenchmark);
router.get('/reports', ctrl.listReports);
router.delete('/reports/:reportId', ctrl.deleteReport);

module.exports = router;
