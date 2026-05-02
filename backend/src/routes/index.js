const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

console.log('[DEBUG] Loading routes...');

router.use('/auth', require('./auth.routes'));
router.use('/clients', authenticate, require('./clients.routes'));
router.use('/clients', authenticate, require('./clientNotes.routes'));
router.use('/clients', authenticate, require('./clientCommunications.routes'));
router.use('/clients', authenticate, require('./clientRelations.routes'));
router.use('/expedients', authenticate, require('./expedients.routes'));
router.use('/expedients', authenticate, require('./expedientLinks.routes'));
router.use('/checklists', authenticate, require('./checklists.routes'));
router.use('/documents', authenticate, require('./documents.routes'));
router.use('/notifications', authenticate, require('./notifications.routes'));
router.use('/dashboard', authenticate, require('./dashboard.routes'));
router.use('/email-templates', authenticate, require('./emailTemplates.routes'));
router.use('/users', authenticate, require('./users.routes'));
router.use('/calendar', require('./calendar.routes'));
router.use('/visits', authenticate, require('./visits.routes'));
router.use('/participants', authenticate, require('./expedientClients.routes'));
router.use('/base-documents', authenticate, require('./baseDocuments.routes'));
router.use('/document-validations', authenticate, require('./documentValidations.routes'));
router.use('/client-journey', authenticate, require('./clientJourney.routes'));
router.use('/tasks', authenticate, require('./tasks.routes'));
router.use('/workflows', authenticate, require('./workflows.routes'));
router.use('/media', authenticate, require('./media.routes'));
router.use('/webhooks', require('./webhooks.routes'));
router.use('/integrations', require('./integrations.routes'));

// FASE 1-3: Nuevas rutas para 43 funciones
router.use('/reporting', authenticate, require('./reporting.routes'));
router.use('/search', authenticate, require('./search.routes'));
router.use('/chat', authenticate, require('./chat.routes'));
router.use('/audit', authenticate, require('./audit.routes'));
router.use('/clients-advanced', authenticate, require('./clients-advanced.routes'));
router.use('/security', authenticate, require('./security.routes'));
router.use('/productivity', authenticate, require('./productivity.routes'));

// ROLES Y COLABORADORES
router.use('/roles', authenticate, require('./roles.routes'));
router.use('/collaborators', authenticate, require('./collaborators.routes'));

// FASE 2: Mobile & Push Notifications
router.use('/mobile', authenticate, require('./mobile.routes'));

// FASE 2: AI/ML Functions
router.use('/ai', authenticate, require('./ai.routes'));
router.use('/reports', authenticate, require('./reports.routes'));

module.exports = router;
