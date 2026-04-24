const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tasks.controller');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/complete', ctrl.complete);

module.exports = router;
