const { createLogger, format, transports } = require('winston');
const path = require('path');

// Campos sensibles que deben ser redactados en logs
const SENSITIVE_FIELDS = [
  'password', 'pass', 'pwd', 'contraseña',
  'token', 'jwt', 'secret', 'key', 'apikey', 'api_key',
  'authorization', 'auth', 'cookie',
  'smtp_pass', 'email_pass', 'email_password',
  'database_url', 'db_url', 'connection_string',
];

// Función para sanitizar objetos recursivamente
function sanitizeObject(obj, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, seen));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Si es campo sensible, redactar
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, seen);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Formatter de sanitización
const sanitizeFormat = format((info) => {
  // Sanitizar el mensaje si es string y contiene posibles datos sensibles
  if (typeof info.message === 'string') {
    SENSITIVE_FIELDS.forEach(field => {
      const regex = new RegExp(`("${field}"\\s*:\\s*")([^"]*)(")`, 'gi');
      info.message = info.message.replace(regex, `"${field}":"[REDACTED]"$3`);
    });
  }

  // Sanitizar metadata
  const { timestamp, level, message, ...meta } = info;
  if (Object.keys(meta).length > 0) {
    const sanitizedMeta = sanitizeObject(meta);
    return { timestamp, level, message, ...sanitizedMeta };
  }

  return info;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    sanitizeFormat(), // Sanitizar campos sensibles
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level}: ${message} ${metaStr}`;
        })
      ),
    }),
    new transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
    }),
  ],
});

module.exports = logger;
