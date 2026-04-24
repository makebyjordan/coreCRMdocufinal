const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientRelations.controller');

router.get('/:id/relations', ctrl.listByClient);
router.post('/:id/relations', ctrl.create);
router.delete('/:id/relations/:relationId', ctrl.remove);
router.get('/:id/referrals', ctrl.getReferrals);

module.exports = router;
