require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./src/config/logger');
const { prisma } = require('./src/config/db'); // Singleton PrismaClient
const routes = require('./src/routes');
const { startPostventaScheduler } = require('./src/jobs/postventa.scheduler');

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
  try {
    // Validar variables de entorno críticas antes de arrancar
    validateCriticalEnv();

    // await prisma.$connect();
    logger.info('Aviso: Conexión explícita a PostgreSQL desactivada temporalmente en el arranque.');

    app.listen(PORT, () => {
      logger.info(`Servidor CRM escuchando en http://localhost:${PORT}`);
    });

    // Arrancar el scheduler de notificaciones de postventa
    startPostventaScheduler();
    logger.info('Scheduler de postventa iniciado');
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

main();

module.exports = { app, prisma };
