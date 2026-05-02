const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const reportsCtrl = require('../controllers/reports.controller');

/**
 * GET /api/reports/client/:clientId
 * Get consolidated client report
 */
router.get('/client/:clientId', authenticate, reportsCtrl.getClientReport);

/**
 * GET /api/reports/client/:clientId/pdf
 * Download client report as PDF
 */
router.get('/client/:clientId/pdf', authenticate, reportsCtrl.getClientReportPDF);

/**
 * GET /api/reports/client/:clientId/excel
 * Download client report as Excel
 */
router.get('/client/:clientId/excel', authenticate, reportsCtrl.getClientReportExcel);

module.exports = router;
