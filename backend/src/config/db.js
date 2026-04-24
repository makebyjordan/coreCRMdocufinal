/**
 * Database Connection Singleton
 * PrismaClient singleton para evitar múltiples instancias (problema de connection pool)
 * 
 * Uso: const { prisma } = require('../config/db');
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Configuración de logging de queries (solo en desarrollo)
const logQueries = process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERIES === 'true';

const prismaOptions = {
  log: logQueries
    ? ['query', 'info', 'warn', 'error']
    : ['error', 'warn'],
};

// Singleton instance
let prisma;

if (!global.__prisma) {
  global.__prisma = new PrismaClient(prismaOptions);
  
  // Middleware para log de queries lentos (más de 1s)
  if (logQueries) {
    global.__prisma.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn(`[Slow Query] ${params.model}.${params.action} took ${duration}ms`);
      }
      
      return result;
    });
  }

  logger.info('[DB] PrismaClient singleton inicializado');
}

prisma = global.__prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('[DB] PrismaClient desconectado');
});

module.exports = { prisma };
