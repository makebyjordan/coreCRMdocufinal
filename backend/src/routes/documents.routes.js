const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/documents.controller');
const upload = require('../middleware/upload.middleware');

// Listado y subida
router.get('/expedient/:expedientId', ctrl.listByExpedient);
router.post('/expedient/:expedientId', upload.single('file'), ctrl.upload);

// Generación desde plantilla
router.post('/expedient/:expedientId/generate-from-template', ctrl.generateFromTemplate);

// Validación y rechazo
router.put('/:id/validate', ctrl.validate);
router.put('/:id/reject', ctrl.reject);

// Descarga y preview
router.get('/:id/download', ctrl.download);
router.get('/:id/preview', ctrl.preview);

// Eliminar
router.delete('/:id', ctrl.remove);

module.exports = router;
