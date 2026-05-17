require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./src/config/logger');
const { prisma } = require('./src/config/db'); // Singleton PrismaClient
const routes = require('./src/routes');
const { startPostventaScheduler } = require('./src/jobs/postventa.scheduler');
const { initializeRedis } = require('./src/config/redis');
const { initializeSchedulers } = require('./src/config/scheduler');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Validaciones de seguridad críticas ──────────────────────────────────────
const CRITICAL_SECRETS = ['JWT_SECRET', 'DATABASE_URL'];
const PLACEHOLDER_PATTERNS = [
  'cambia_este',
  'tu-correo',
  'contraseña',
  'example',
  'placeholder',
  '[PROJECT-REF]',
  '[PASSWORD]',
];

function validateCriticalEnv() {
  const errors = [];

  for (const secret of CRITICAL_SECRETS) {
    const value = process.env[secret];
    if (!value) {
      errors.push(`❌ ${secret} no está definido`);
    } else if (PLACEHOLDER_PATTERNS.some(p => value.toLowerCase().includes(p.toLowerCase()))) {
      errors.push(`❌ ${secret} contiene valor placeholder: ${value.substring(0, 20)}...`);
    }
  }

  // Validar longitud mínima de JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('❌ JWT_SECRET debe tener al menos 32 caracteres');
  }

  if (errors.length > 0) {
    console.error('\n🔴 ERRORES DE SEGURIDAD CRÍTICOS:');
    errors.forEach(e => console.error(e));
    console.error('\n⚠️  El servidor no puede arrancar hasta que configures correctamente el .env\n');
    process.exit(1);
  }

  console.log('✅ Validaciones de seguridad pasadas');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    // Permitir cualquier subdominio de vercel.app
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Error handler global ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Inicio ───────────────────────────────────────────────────────────────────
async function main() {
  validateCriticalEnv();

  // Start listening immediately so Render's health check can pass
  app.listen(PORT, () => {
    logger.info(`Servidor CRM escuchando en http://localhost:${PORT}`);
  });

  // Connect to DB with retries — don't crash the process on first failure
  let dbConnected = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await prisma.$connect();
      logger.info('[DB] Conexión a PostgreSQL establecida');
      dbConnected = true;
      break;
    } catch (error) {
      logger.warn(`[DB] Intento ${attempt}/5 fallido: ${error.message}`);
      if (attempt < 5) {
        await new Promise(r => setTimeout(r, attempt * 3000)); // 3s, 6s, 9s, 12s
      }
    }
  }

  if (!dbConnected) {
    logger.error('[DB] No se pudo conectar a PostgreSQL tras 5 intentos. El servidor seguirá activo pero las queries fallarán.');
  }

  try {
    // Inicializar Redis (con fallback a in-memory si no está configurado)
    await initializeRedis();

    // Arrancar todos los schedulers
    startPostventaScheduler();
    initializeSchedulers();
    logger.info('Schedulers iniciados (postventa + segmentación + backup + forecast + reporting)');
  } catch (error) {
    logger.warn('Schedulers/Redis no iniciados:', error.message);
  }
}

main();

module.exports = { app, prisma };
