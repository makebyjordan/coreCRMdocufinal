const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/baseDocuments.controller');
const upload = require('../middleware/upload.middleware');

router.get('/', ctrl.list);
router.post('/', upload.single('file'), ctrl.upload);
router.put('/:id', ctrl.update);
router.get('/:id/preview', ctrl.preview);
router.get('/:id/download', ctrl.download);
router.delete('/:id', ctrl.remove);

// Template endpoints
router.post('/:id/detect-placeholders', ctrl.detectPlaceholders);
router.get('/template-variables', ctrl.getTemplateVariables);

module.exports = router;
