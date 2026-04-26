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
router.use('/webhooks', require('./webhooks.routes'));
router.use('/integrations', require('./integrations.routes'));

module.exports = router;
