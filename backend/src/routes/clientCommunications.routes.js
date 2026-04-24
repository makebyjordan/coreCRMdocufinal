const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientCommunications.controller');

router.get('/:id/communications', ctrl.listByClient);
router.post('/:id/communications', ctrl.create);
router.get('/:id/communications/:communicationId', ctrl.getById);
router.put('/:id/communications/:communicationId', ctrl.update);
router.delete('/:id/communications/:communicationId', ctrl.remove);

module.exports = router;
