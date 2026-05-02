const express = require('express');
const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications (stub)
 */
router.get('/', (req, res) => {
  res.json([]);
});

/**
 * GET /api/notifications/expedient/:expedientId
 * Get notifications for an expedient (stub)
 */
router.get('/expedient/:expedientId', (req, res) => {
  res.json([]);
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read (stub)
 */
router.post('/:id/read', (req, res) => {
  res.json({ success: true });
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read (stub)
 */
router.post('/mark-all-read', (req, res) => {
  res.json({ success: true });
});

/**
 * DELETE /api/notifications/:id
 * Delete notification (stub)
 */
router.delete('/:id', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
