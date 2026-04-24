/**
 * Rate Limiting Middleware
 * Protección simple contra fuerza bruta - sin dependencias externas
 */

const logger = require('../config/logger');

// Almacenamiento en memoria para intentos (IP -> { count, resetTime })
const attempts = new Map();

// Configuración
const CONFIG = {
  // Login: 5 intentos por 15 minutos
  LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  // Cambio de contraseña: 3 intentos por hora
  PASSWORD_CHANGE: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
};

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] 
    || req.connection.remoteAddress 
    || req.ip 
    || 'unknown';
}

function cleanup() {
  const now = Date.now();
  for (const [key, data] of attempts) {
    if (data.resetTime < now) {
      attempts.delete(key);
    }
  }
}

// Limpiar entradas antiguas cada 10 minutos
setInterval(cleanup, 10 * 60 * 1000);

function createRateLimiter(configKey, message = 'Demasiados intentos. Inténtalo más tarde.') {
  const config = CONFIG[configKey];

  return function rateLimiter(req, res, next) {
    const ip = getClientIP(req);
    const key = `${ip}:${configKey}`;
    const now = Date.now();

    let data = attempts.get(key);

    // Si no existe o expiró, crear nuevo
    if (!data || data.resetTime < now) {
      data = { count: 1, resetTime: now + config.windowMs };
      attempts.set(key, data);
      return next();
    }

    // Incrementar contador
    data.count++;

    // Si supera el límite
    if (data.count > config.maxAttempts) {
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      logger.warn(`[RateLimit] Bloqueado ${ip} en ${configKey} (${data.count} intentos)`);

      return res.status(429).json({
        error: message,
        retryAfter,
        retryAfterMinutes: Math.ceil(retryAfter / 60),
      });
    }

    next();
  };
}

// Middlewares específicos
const loginLimiter = createRateLimiter('LOGIN', 'Demasiados intentos de login. Espera 15 minutos.');
const passwordChangeLimiter = createRateLimiter('PASSWORD_CHANGE', 'Demasiados intentos de cambio de contraseña. Espera 1 hora.');

module.exports = {
  loginLimiter,
  passwordChangeLimiter,
  createRateLimiter,
};
