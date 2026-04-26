const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/integrations.controller');

router.get('/docusign/status', authenticate, ctrl.docusignStatus);

module.exports = router;
