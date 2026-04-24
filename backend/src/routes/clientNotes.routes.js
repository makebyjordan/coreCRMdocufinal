const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientNotes.controller');

router.get('/:id/notes', ctrl.listByClient);
router.post('/:id/notes', ctrl.create);
router.put('/:id/notes/:noteId', ctrl.update);
router.delete('/:id/notes/:noteId', ctrl.remove);
router.patch('/:id/notes/:noteId/pin', ctrl.togglePin);

module.exports = router;
