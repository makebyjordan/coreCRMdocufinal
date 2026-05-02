# Phase 2: AI/ML Functions - Docuinmo CRM

## Overview

La Fase 2 implementa 5 funciones de Inteligencia Artificial impulsadas por Claude API (Anthropic-only):

1. **Predicción de Valor de Cliente**
2. **Detección de Clientes Dormidos**
3. **Recomendaciones Inteligentes de Expedientes**
4. **Generación de Plantillas Inteligentes**
5. **Análisis de Documentos (OCR + IA)**

---

## 1. Predicción de Valor de Cliente

**Propósito:** Análisis inteligente del potencial de cada cliente basado en su historial completo.

### Endpoint
```
GET /api/ai/client/:clientId/prediction
```

### Response
```json
{
  "annualValueForecast": 125000,
  "closureProbability": 78,
  "recommendations": [
    "Revisar documentación pendiente",
    "Priorizar contacto mensual",
    "Ofrecer operaciones complementarias"
  ],
  "riskFactors": [
    "Baja frecuencia de contacto últimamente",
    "Expedientes pendientes hace más de 90 días"
  ],
  "recommendedSegment": "VIP"
}
```

### Componente Frontend
```jsx
<ClientPredictionWidget clientId={clientId} />
```

### Análisis Incluido
- Historial completo de operaciones
- Valor total y promedio por operación
- Patrón de actividad
- Ciclo de vida actual
- Factores de éxito/riesgo

---

## 2. Detección de Clientes Dormidos

**Propósito:** Identificar clientes sin actividad y generar planes de reactivación.

### Endpoint
```
GET /api/ai/dormant-clients?daysThreshold=90
```

### Response
```json
[
  {
    "clientId": "cuid123",
    "clientName": "Juan García",
    "lastActivityDays": 120,
    "activeExpedients": 2,
    "reactivationReason": "Patrón de inactividad con operaciones pendientes",
    "reactivationPriority": 8,
    "reactivationStrategy": "Contacto telefónico + email personalizad",
    "reactivationMessage": "Hola Juan, notamos que...",
    "immediateActions": [
      "Llamar para verificar interés",
      "Resolver documentación pendiente"
    ]
  }
]
```

### Componente Frontend
```jsx
<DormantClientDetector />
```

### Características
- Detección automática de inactividad
- Análisis de razones probables
- Planes de reactivación personalizados
- Mensajes de contacto generados por IA
- Priorización por oportunidad

---

## 3. Recomendaciones Inteligentes de Expedientes

**Propósito:** Análisis en tiempo real de expedientes con recomendaciones para acelerar cierre.

### Endpoint
```
GET /api/ai/expedient/:expedientId/recommendations
```

### Response
```json
{
  "healthScore": 72,
  "estimatedDaysToClose": 21,
  "immediateActions": [
    "Obtener firma de cliente en documentación",
    "Validar documentación legal con notaría"
  ],
  "optimizations": [
    "Asignar FIRMAS más temprano en proceso",
    "Paralelizar validación de documentos"
  ],
  "risks": [
    "Demora en respuesta de cliente",
    "Documentación incompleta en fase actual"
  ]
}
```

### Componente Frontend
```jsx
<SmartRecommendations expedientId={expedientId} />
```

### Análisis Incluido
- Progreso de checklist
- Documentos/firmas pendientes
- Histórico de cambios de fase
- Asignaciones del equipo
- Estimación de tiempo a cierre

---

## 4. Plantillas Inteligentes

**Propósito:** Generación automática de documentos personalizados para cada expediente.

### Endpoint
```
POST /api/ai/expedient/:expedientId/generate-template
Body: { "templateType": "CONTRATO" }
```

### Tipos Disponibles
- `CONTRATO` - Contrato de compraventa
- `OFERTA` - Oferta de compra
- `PROPUESTA` - Propuesta de precio
- `DOCUMENTO_INFORMATIVO` - Documento informativo
- `MANDATO` - Mandato de venta
- `CARTA_PRESENTACION` - Carta de presentación

### Response
```json
{
  "title": "Contrato de Compraventa - Propiedad Calle Mayor",
  "content": "<html>...</html>",
  "variables": [
    "{{CLIENT_NAME}}",
    "{{PROPERTY_ADDRESS}}",
    "{{PRICE}}",
    "{{NOTARY_DATE}}"
  ],
  "description": "Contrato personalizado para esta operación"
}
```

### Componente Frontend
```jsx
<TemplateGenerator expedientId={expedientId} />
```

### Características
- Personalización automática con datos del expediente
- Variables reemplazables
- Edición post-generación
- Descarga en múltiples formatos
- Historial de plantillas generadas

---

## 5. Análisis de Documentos (OCR + IA)

**Propósito:** Extracción automática de datos y validación de documentos escaneados.

### Endpoint
```
POST /api/ai/document/:documentId/analyze
Body: { "content": "Texto extraído por OCR..." }
```

### Response
```json
{
  "detectedType": "Documento de identidad",
  "completeness": 95,
  "confidence": 88,
  "extractedData": {
    "documentNumber": "12345678",
    "expiryDate": "2025-12-31",
    "issueDate": "2022-01-15"
  },
  "alerts": [
    "Documento cerca de vencer"
  ],
  "recommendedAction": "Pedir renovación antes de cierre"
}
```

### Componente Frontend
```jsx
<DocumentAnalyzer documentId={documentId} documentContent={ocrText} />
```

### Análisis Incluido
- Tipo de documento detectado
- Datos extraídos (automático)
- Completitud del documento
- Confianza del análisis
- Alertas (campos faltantes, vencimientos)
- Acciones recomendadas

---

## Backend Architecture

### Services
- **ai.service.js** - Lógica principal de IA con llamadas a Claude API

### Controllers
- **ai.controller.js** - Endpoints REST para todas las funciones

### Routes
- **ai.routes.js** - Rutas y autenticación

### Database Models (Prisma)
```prisma
model ClientPrediction {
  id                    String @id @default(cuid())
  clientId              String @unique
  annualValueForecast   Decimal
  closureProbability    Int
  recommendations       String[]
  riskFactors          String[]
  recommendedSegment   String
  generatedAt          DateTime
  updatedAt            DateTime
}

model DormantClientAnalysis {
  id                  String @id @default(cuid())
  clientId            String
  inactiveDays        Int
  reactivationReason  String
  reactivationPriority Int
  reactivationStrategy String
  reactivationMessage String?
  immediateActions    String[]
  analyzedAt          DateTime
}

model ExpedientRecommendation {
  id                  String @id @default(cuid())
  expedientId         String
  immediateActions    String[]
  risks               String[]
  optimizations       String[]
  estimatedDaysToClose Int
  healthScore         Int
  generatedAt         DateTime
}

model AITemplate {
  id              String @id @default(cuid())
  expedientId     String
  templateType    String
  title           String
  content         String
  variables       String[]
  description     String?
  generatedAt     DateTime
}

model DocumentAnalysis {
  id              String @id @default(cuid())
  documentId      String
  detectedType    String
  extractedData   Json
  completeness    Int
  alerts          String[]
  recommendedAction String
  confidence      Int
  analyzedAt      DateTime
}
```

---

## Frontend Components

### Components
- `ClientPredictionWidget.jsx` - Widget para predicción de cliente
- `DormantClientDetector.jsx` - Detector de clientes inactivos
- `SmartRecommendations.jsx` - Recomendaciones de expedientes
- `TemplateGenerator.jsx` - Generador de plantillas
- `DocumentAnalyzer.jsx` - Analizador de documentos

### Pages
- `AIIntelligence.jsx` - Página principal con 5 pestañas

---

## Environment Variables

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
NODE_ENV=production  # usa claude-sonnet-4-6
NODE_ENV=development # usa claude-haiku-4-5
```

---

## Usage Examples

### 1. Get Client Prediction
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/ai/client/cuid123/prediction
```

### 2. Detect Dormant Clients
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/ai/dormant-clients?daysThreshold=90
```

### 3. Get Expedient Recommendations
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/ai/expedient/exp456/recommendations
```

### 4. Generate Template
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"templateType":"CONTRATO"}' \
  http://localhost:4000/api/ai/expedient/exp456/generate-template
```

### 5. Analyze Document
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Documento extraido por OCR..."}' \
  http://localhost:4000/api/ai/document/doc789/analyze
```

---

## Integration Points

### ClientDetail Page
```jsx
import ClientPredictionWidget from '../components/AI/ClientPredictionWidget'

<ClientPredictionWidget clientId={clientId} />
```

### ExpedientDetail Page
```jsx
import SmartRecommendations from '../components/AI/SmartRecommendations'
import TemplateGenerator from '../components/AI/TemplateGenerator'

<SmartRecommendations expedientId={expedientId} />
<TemplateGenerator expedientId={expedientId} />
```

### DocumentPanel
```jsx
import DocumentAnalyzer from '../components/AI/DocumentAnalyzer'

<DocumentAnalyzer documentId={documentId} documentContent={ocrText} />
```

### Dashboard
```jsx
import DormantClientDetector from '../components/AI/DormantClientDetector'

<DormantClientDetector />
```

---

## Caching Strategy

- **Client Predictions**: Cache 7 días (no regenerar cada vez)
- **Dormant Clients**: Cache 24 horas (análisis diario)
- **Expedient Recommendations**: Cache 1 hora (cambios frecuentes)
- **Templates**: Cache indefinido (no cambian)
- **Document Analysis**: Cache indefinido (resultado fijo)

---

## Performance Notes

- Predicciones y recomendaciones se generan on-demand
- Se cachean automáticamente para evitar llamadas redundantes
- Las llamadas a Claude API tienen ~2-3 segundos de latencia
- Los análisis se guardan en BD para auditoría y consultas históricas

---

## Future Enhancements

- [ ] Análisis de tendencias de mercado basado en histórico
- [ ] Predicciones de demanda por zona
- [ ] Alertas automáticas basadas en anomalías
- [ ] Generación de reportes ejecutivos personalizados
- [ ] Integración con modelos de visión (análisis de fotos)
