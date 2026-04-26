const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/webhooks.controller');

// DocuSign Connect notifica aquí los cambios de estado de envelopes
router.post('/docusign', ctrl.docusignWebhook);

module.exports = router;
