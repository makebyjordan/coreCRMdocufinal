const express = require('express');
const router = express.Router();
const { login, me, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { loginLimiter, passwordChangeLimiter } = require('../middleware/rate-limit.middleware');

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, passwordChangeLimiter, changePassword);

module.exports = router;
