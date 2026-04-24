# Migración a PrismaClient Singleton

## Problema
Hay 31 instancias de `new PrismaClient()` en el codebase, lo cual puede agotar el pool de conexiones en producción.

## Solución Implementada
Se creó `/backend/src/config/db.js` con un singleton pattern usando `global.__prisma`.

## Patrón de Migración

### Antes (cada archivo):
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```

### Después:
```javascript
const { prisma } = require('../config/db');
```

## Archivos Pendientes de Migración

### Controllers (20 archivos)
- [ ] auth.controller.js
- [ ] baseDocuments.controller.js
- [ ] calendar.controller.js
- [ ] checklists.controller.js
- [ ] clientCommunications.controller.js
- [ ] clientJourney.controller.js
- [ ] clientNotes.controller.js
- [ ] clientRelations.controller.js
- [ ] clients.controller.js
- [ ] dashboard.controller.js
- [ ] documentValidations.controller.js
- [ ] documents.controller.js
- [ ] emailTemplates.controller.js
- [ ] expedientClients.controller.js
- [ ] expedientLinks.controller.js
- [ ] expedients.controller.js
- [ ] notifications.controller.js
- [ ] tasks.controller.js
- [ ] users.controller.js
- [ ] visits.controller.js
- [ ] workflows.controller.js

### Services (8 archivos)
- [ ] activity-feed.service.js
- [ ] calendar-sync.service.js
- [ ] checklist.generator.js
- [ ] client-lifecycle.service.js
- [ ] expedientLinksValidator.service.js
- [ ] notification.engine.js
- [ ] workflow-engine.service.js
- [ ] workflow.service.js

### Middleware (1 archivo)
- [ ] auth.middleware.js

## Notas
- El cambio es **100% backward compatible** - no cambia la API de Prisma
- Se recomienda migrar gradualmente, archivo por archivo
- El server.js ya usa el singleton
- Los tests deben verificar que no haya regresiones
