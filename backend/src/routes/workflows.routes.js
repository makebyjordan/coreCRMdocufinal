const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workflows.controller');

router.get('/', ctrl.list);
router.get('/events', ctrl.getEvents);
router.get('/actions', ctrl.getActionTypes);
router.get('/executions', ctrl.getExecutions);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/test', ctrl.test);

module.exports = router;
