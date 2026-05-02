/**
 * AI Routes - Phase 2 ML/AI endpoints
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * Client Value Prediction
 */
router.get('/client/:clientId/prediction', authenticate, aiController.predictClientValue);

/**
 * Dormant Client Detection
 */
router.get('/dormant-clients', authenticate, aiController.detectDormantClients);
router.get('/client/:clientId/dormant-analysis', authenticate, aiController.getDormantAnalysis);

/**
 * Smart Recommendations
 */
router.get('/expedient/:expedientId/recommendations', authenticate, aiController.getSmartRecommendations);

/**
 * Intelligent Templates
 */
router.post('/expedient/:expedientId/generate-template', authenticate, aiController.generateTemplate);
router.get('/expedient/:expedientId/templates', authenticate, aiController.getExpedientTemplates);

/**
 * Document Analysis (OCR + AI)
 */
router.post('/document/:documentId/analyze', authenticate, aiController.analyzeDocument);
router.get('/document/:documentId/analysis', authenticate, aiController.getDocumentAnalysis);

/**
 * Statistics
 */
router.get('/stats', authenticate, aiController.getAIStats);

module.exports = router;
