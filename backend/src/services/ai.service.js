/**
 * AI Service - Anthropic Claude Integration
 * Phase 2: ML/AI Functions
 * - Client value prediction
 * - Dormant client detection
 * - Smart recommendations
 * - Intelligent templates
 * - Document OCR
 */

const Anthropic = require('@anthropic-ai/sdk');
const { prisma } = require('../config/db');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model selection based on environment
const MODEL = process.env.NODE_ENV === 'production'
  ? 'claude-sonnet-4-6'
  : 'claude-haiku-4-5';

/**
 * 1. CLIENTE VALUE PREDICTION
 * Analyze client history and predict future value
 */
async function predictClientValue(clientId) {
  try {
    const client_data = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        expedients: {
          include: { assignments: true, documents: true },
        },
        notes: true,
        tasks: true,
      },
    });

    if (!client_data) {
      throw new Error('Cliente no encontrado');
    }

    // Prepare context for Claude
    const expedientsSummary = client_data.expedients.map(e => ({
      code: e.code,
      operationType: e.operationType,
      status: e.status,
      currentPhase: e.currentPhase,
      propertyPrice: e.propertyPrice,
      createdAt: e.createdAt,
      completedAt: e.completedAt,
    }));

    const totalValue = client_data.expedients.reduce((sum, e) => sum + (e.propertyPrice || 0), 0);
    const completedCount = client_data.expedients.filter(e => e.status === 'COMPLETADO').length;
    const activeCount = client_data.expedients.filter(e => e.status === 'ACTIVO').length;
    const daysActive = Math.floor((Date.now() - new Date(client_data.createdAt)) / (1000 * 60 * 60 * 24));

    const prompt = `
Analiza el siguiente cliente inmobiliario y predice su valor futuro en los próximos 12 meses.

DATOS DEL CLIENTE:
- Nombre: ${client_data.firstName} ${client_data.lastName || client_data.companyName || ''}
- Tipo: ${client_data.type || 'Desconocido'}
- Años como cliente: ${daysActive / 365}
- Score actual: ${client_data.score || 'No asignado'}
- Etapa: ${client_data.lifecycleStage || 'Lead'}

HISTÓRICO DE EXPEDIENTES:
- Total de expedientes: ${client_data.expedients.length}
- Completados: ${completedCount}
- Activos: ${activeCount}
- Valor total operado: €${totalValue.toLocaleString()}
- Valor promedio por operación: €${client_data.expedients.length > 0 ? Math.round(totalValue / client_data.expedients.length).toLocaleString() : '0'}

TIPOS DE OPERACIONES:
${Object.entries(client_data.expedients.reduce((acc, e) => {
  acc[e.operationType] = (acc[e.operationType] || 0) + 1;
  return acc;
}, {})).map(([type, count]) => `- ${type}: ${count} operaciones`).join('\n')}

ACTIVIDAD RECIENTE:
- Notas: ${client_data.notes?.length || 0}
- Tareas pendientes: ${client_data.tasks?.filter(t => !t.completed).length || 0}
- Última actividad: Hace ${Math.floor((Date.now() - new Date(client_data.updatedAt)) / (1000 * 60 * 60 * 24))} días

Proporciona:
1. Predicción de valor anual (€)
2. Probabilidad de cierre (%)
3. Recomendaciones específicas para aumentar valor
4. Factores de riesgo identificados
5. Segmentación recomendada (VIP/NORMAL/RIESGO)

Formato: JSON con campos: annualValueForecast, closureProbability, recommendations[], riskFactors[], recommendedSegment
`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : parseFallbackPrediction(content);

    // Save prediction
    await prisma.clientPrediction.upsert({
      where: { clientId },
      update: {
        annualValueForecast: prediction.annualValueForecast,
        closureProbability: prediction.closureProbability,
        recommendations: prediction.recommendations,
        riskFactors: prediction.riskFactors,
        recommendedSegment: prediction.recommendedSegment,
        generatedAt: new Date(),
      },
      create: {
        clientId,
        annualValueForecast: prediction.annualValueForecast,
        closureProbability: prediction.closureProbability,
        recommendations: prediction.recommendations,
        riskFactors: prediction.riskFactors,
        recommendedSegment: prediction.recommendedSegment,
      },
    });

    return prediction;
  } catch (error) {
    console.error('Error en predictClientValue:', error);
    throw error;
  }
}

/**
 * 2. DORMANT CLIENT DETECTION
 * Identify clients with no activity and suggest reactivation
 */
async function detectDormantClients(daysThreshold = 90) {
  try {
    const dormantDate = new Date();
    dormantDate.setDate(dormantDate.getDate() - daysThreshold);

    const dormantClients = await prisma.client.findMany({
      where: {
        updatedAt: { lt: dormantDate },
        active: true,
      },
      include: {
        expedients: {
          where: { status: { in: ['ACTIVO', 'BLOQUEADO'] } },
          take: 5,
        },
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      take: 50,
    });

    const analysis = await Promise.all(
      dormantClients.map(async (dormantClient) => {
        const lastContactDays = Math.floor((Date.now() - new Date(dormantClient.updatedAt)) / (1000 * 60 * 60 * 24));

        const prompt = `
Como especialista en reactivación de clientes inmobiliarios, analiza este cliente dormido y proporciona un plan de reactivación.

CLIENTE:
- Nombre: ${dormantClient.firstName} ${dormantClient.lastName || dormantClient.companyName || ''}
- Inactivo por: ${lastContactDays} días
- Operaciones pendientes: ${dormantClient.expedients.length}
- Valor total históricamente: €${dormantClient.expedients.reduce((sum, e) => sum + (e.propertyPrice || 0), 0).toLocaleString()}
- Tipo de cliente: ${dormantClient.type || 'Desconocido'}

EXPEDIENTES ACTIVOS:
${dormantClient.expedients.map(e => `- ${e.code} (${e.operationType}): ${e.currentPhase}`).join('\n')}

Proporciona un plan JSON con:
1. Motivo probable de inactividad (reason)
2. Prioridad de reactivación (1-10)
3. Estrategia de contacto recomendada (strategy)
4. Mensaje de reactivación personalizado (reactivationMessage)
5. Acciones inmediatas (immediateActions[])

Formato: JSON
`;

        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        return {
          clientId: dormantClient.id,
          clientName: `${dormantClient.firstName} ${dormantClient.lastName || dormantClient.companyName || ''}`,
          lastActivityDays: lastContactDays,
          activeExpedients: dormantClient.expedients.length,
          ...plan,
        };
      })
    );

    return analysis;
  } catch (error) {
    console.error('Error en detectDormantClients:', error);
    throw error;
  }
}

/**
 * 3. SMART RECOMMENDATIONS
 * Analyze expedient and provide intelligent recommendations
 */
async function getSmartRecommendations(expedientId) {
  try {
    const expedient = await prisma.expedient.findUnique({
      where: { id: expedientId },
      include: {
        client: true,
        assignments: { include: { user: true } },
        checklist: true,
        documents: true,
        signatures: true,
        phaseHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!expedient) {
      throw new Error('Expediente no encontrado');
    }

    const checklistProgress = expedient.checklist.filter(c => c.completed).length / expedient.checklist.length || 0;
    const pendingDocs = expedient.documents.filter(d => !d.uploadedAt).length;
    const pendingSigs = expedient.signatures.filter(s => s.status === 'PENDIENTE').length;

    const prompt = `
Eres un asesor experto en operaciones inmobiliarias. Analiza este expediente y proporciona recomendaciones inteligentes para acelerar su cierre.

EXPEDIENTE:
- Código: ${expedient.code}
- Tipo: ${expedient.operationType}
- Fase actual: ${expedient.currentPhase}
- Estado: ${expedient.status}
- Creado hace: ${Math.floor((Date.now() - new Date(expedient.createdAt)) / (1000 * 60 * 60 * 24))} días

CLIENTE:
- ${expedient.client.firstName} ${expedient.client.lastName || expedient.client.companyName || ''}
- Score: ${expedient.client.score}

PROGRESO:
- Checklist: ${Math.round(checklistProgress * 100)}% completado
- Documentos pendientes: ${pendingDocs}
- Firmas pendientes: ${pendingSigs}

ASIGNACIONES:
${expedient.assignments.map(a => `- ${a.user.name}: ${a.role}`).join('\n')}

HISTORIAL RECIENTE:
${expedient.phaseHistory.map(h => `- ${h.fromPhase} → ${h.toPhase} (Hace ${Math.floor((Date.now() - new Date(h.createdAt)) / (1000 * 60 * 60 * 24))} días)`).join('\n')}

Proporciona recomendaciones JSON con:
1. Acciones inmediatas (immediateActions[])
2. Riesgos identificados (risks[])
3. Optimizaciones (optimizations[])
4. Estimación de días para cierre (estimatedDaysToClose)
5. Puntuación de salud (healthScore 0-100)

Formato: JSON
`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      expedientId,
      expedientCode: expedient.code,
      ...recommendations,
    };
  } catch (error) {
    console.error('Error en getSmartRecommendations:', error);
    throw error;
  }
}

/**
 * 4. INTELLIGENT TEMPLATES
 * Generate personalized document templates using Claude
 */
async function generateIntelligentTemplate(expedientId, templateType) {
  try {
    const expedient = await prisma.expedient.findUnique({
      where: { id: expedientId },
      include: {
        client: true,
        assignments: { include: { user: true } },
      },
    });

    if (!expedient) {
      throw new Error('Expediente no encontrado');
    }

    const commercialUser = expedient.assignments.find(a => a.role === 'COMERCIAL')?.user;
    const firmasUser = expedient.assignments.find(a => a.role === 'FIRMAS')?.user;

    const prompt = `
Genera una plantilla profesional personalizada de ${templateType} para una operación inmobiliaria.

CONTEXTO:
- Cliente: ${expedient.client.firstName} ${expedient.client.lastName || expedient.client.companyName || ''}
- Tipo operación: ${expedient.operationType}
- Propiedad: ${expedient.propertyAddress || 'Por determinar'}
- Precio: €${expedient.propertyPrice?.toLocaleString() || '0'}
- Comercial: ${commercialUser?.name || 'No asignado'}
- Responsable firmas: ${firmasUser?.name || 'No asignado'}
- Fecha: ${new Date().toLocaleDateString('es-ES')}

TIPO DE PLANTILLA: ${templateType}

Genera el contenido HTML de la plantilla con:
1. Encabezado profesional con logo placeholder
2. Datos personalizados del cliente
3. Detalles de la operación
4. Términos y condiciones relevantes
5. Espacios para firmas

Incluye variables como {{CLIENT_NAME}}, {{PROPERTY_ADDRESS}}, {{PRICE}} que puedan ser reemplazadas.

Retorna JSON con:
- title: Título de la plantilla
- content: HTML completo
- variables: Lista de variables disponibles
- description: Descripción breve
`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/s);
    const template = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Save template
    await prisma.document.create({
      data: {
        expedientId,
        name: template.title || templateType,
        type: templateType,
        template: true,
        content: template.content || '',
        uploadedBy: 'ai-generated',
      },
    });

    return template;
  } catch (error) {
    console.error('Error en generateIntelligentTemplate:', error);
    throw error;
  }
}

/**
 * 5. DOCUMENT OCR & ANALYSIS
 * Extract text from documents and analyze with Claude
 */
async function analyzeDocumentWithAI(documentId, documentContent) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { expedient: true },
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    const prompt = `
Analiza el siguiente contenido de documento inmobiliario extraído por OCR.
Extrae información clave y valida su integridad.

DOCUMENTO:
- Tipo: ${document.type || 'Desconocido'}
- Expediente: ${document.expedient.code}
- Contenido:

${documentContent}

Proporciona análisis JSON con:
1. Tipo detectado (detectedType)
2. Datos extraídos (extractedData con campos clave)
3. Completitud (completeness 0-100)
4. Alertas o problemas (alerts[])
5. Acción recomendada (recommendedAction)
6. Confianza en análisis (confidence 0-100)

Formato: JSON
`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      documentId,
      documentType: document.type,
      ...analysis,
    };
  } catch (error) {
    console.error('Error en analyzeDocumentWithAI:', error);
    throw error;
  }
}

/**
 * Helper: Parse fallback prediction when JSON fails
 */
function parseFallbackPrediction(text) {
  return {
    annualValueForecast: 50000,
    closureProbability: 60,
    recommendations: ['Revisar documentación', 'Contactar cliente'],
    riskFactors: ['Parse error - check manually'],
    recommendedSegment: 'NORMAL',
  };
}

module.exports = {
  predictClientValue,
  detectDormantClients,
  getSmartRecommendations,
  generateIntelligentTemplate,
  analyzeDocumentWithAI,
};
