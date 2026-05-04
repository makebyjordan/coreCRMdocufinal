/**
 * AI Controller - Routes for AI/ML functions
 * Phase 2: ML/AI endpoints
 */

const aiService = require('../services/ai.service');
const { prisma } = require('../config/db');

/**
 * GET /ai/client/:clientId/prediction
 * Get or generate client value prediction
 */
async function predictClientValue(req, res) {
  try {
    const { clientId } = req.params;

    // Check if recent prediction exists
    const existing = await prisma.clientPrediction.findUnique({
      where: { clientId },
    });

    // Use existing if less than 7 days old
    if (existing && new Date() - new Date(existing.generatedAt) < 7 * 24 * 60 * 60 * 1000) {
      return res.json(existing);
    }

    // Generate new prediction
    const prediction = await aiService.predictClientValue(clientId);
    res.json(prediction);
  } catch (error) {
    console.error('Error en predictClientValue:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /ai/dormant-clients
 * Detect dormant clients and get reactivation plans
 */
async function detectDormantClients(req, res) {
  try {
    const { daysThreshold = 90 } = req.query;
    const analysis = await aiService.detectDormantClients(parseInt(daysThreshold));
    res.json(analysis);
  } catch (error) {
    console.error('Error en detectDormantClients:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /ai/expedient/:expedientId/recommendations
 * Get smart recommendations for an expedient
 */
async function getSmartRecommendations(req, res) {
  try {
    const { expedientId } = req.params;

    // Check if recent recommendation exists
    const existing = await prisma.expedientRecommendation.findUnique({
      where: { expedientId },
    });

    // Use existing if less than 1 day old
    if (existing && new Date() - new Date(existing.generatedAt) < 24 * 60 * 60 * 1000) {
      return res.json(existing);
    }

    // Generate new recommendations
    const recommendations = await aiService.getSmartRecommendations(expedientId);

    // Save recommendations
    if (!existing) {
      await prisma.expedientRecommendation.create({
        data: {
          expedientId,
          ...recommendations,
        },
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error en getSmartRecommendations:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * POST /ai/expedient/:expedientId/generate-template
 * Generate intelligent template for expedient
 */
async function generateTemplate(req, res) {
  try {
    const { expedientId } = req.params;
    const { templateType } = req.body;

    if (!templateType) {
      return res.status(400).json({ error: 'templateType es requerido' });
    }

    const template = await aiService.generateIntelligentTemplate(expedientId, templateType);
    res.json(template);
  } catch (error) {
    console.error('Error en generateTemplate:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * POST /ai/document/:documentId/analyze
 * Analyze document with OCR and Claude AI
 */
async function analyzeDocument(req, res) {
  try {
    const { documentId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content es requerido (OCR text)' });
    }

    const analysis = await aiService.analyzeDocumentWithAI(documentId, content);

    // Save analysis
    await prisma.documentAnalysis.create({
      data: {
        documentId,
        ...analysis,
      },
    });

    res.json(analysis);
  } catch (error) {
    console.error('Error en analyzeDocument:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /ai/stats
 * Get AI/ML usage statistics
 */
async function getAIStats(req, res) {
  try {
    const safeCount = (model) => model.count().catch(() => 0);
    const stats = await Promise.all([
      safeCount(prisma.clientPrediction),
      safeCount(prisma.dormantClientAnalysis),
      safeCount(prisma.expedientRecommendation),
      safeCount(prisma.documentAnalysis),
      safeCount(prisma.aITemplate),
    ]);

    res.json({
      predictions: stats[0],
      dormantAnalyses: stats[1],
      recommendations: stats[2],
      documentAnalyses: stats[3],
      templates: stats[4],
      totalRecords: stats.reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error('Error en getAIStats:', error);
    res.json({ predictions: 0, dormantAnalyses: 0, recommendations: 0, documentAnalyses: 0, templates: 0, totalRecords: 0 });
  }
}

/**
 * GET /ai/client/:clientId/dormant-analysis
 * Get dormant client analysis if exists
 */
async function getDormantAnalysis(req, res) {
  try {
    const { clientId } = req.params;

    const analysis = await prisma.dormantClientAnalysis.findFirst({
      where: { clientId },
      orderBy: { analyzedAt: 'desc' },
      take: 1,
    });

    if (!analysis) {
      return res.status(404).json({ error: 'No hay análisis disponible para este cliente' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error en getDormantAnalysis:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /ai/document/:documentId/analysis
 * Get document analysis
 */
async function getDocumentAnalysis(req, res) {
  try {
    const { documentId } = req.params;

    const analysis = await prisma.documentAnalysis.findUnique({
      where: { documentId },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'No hay análisis disponible para este documento' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error en getDocumentAnalysis:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /ai/expedient/:expedientId/templates
 * Get all AI templates for expedient
 */
async function getExpedientTemplates(req, res) {
  try {
    const { expedientId } = req.params;

    const templates = await prisma.aiTemplate.findMany({
      where: { expedientId },
      orderBy: { generatedAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    console.error('Error en getExpedientTemplates:', error);
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  predictClientValue,
  detectDormantClients,
  getSmartRecommendations,
  generateTemplate,
  analyzeDocument,
  getAIStats,
  getDormantAnalysis,
  getDocumentAnalysis,
  getExpedientTemplates,
};
