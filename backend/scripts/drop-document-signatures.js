/**
 * Script para eliminar la tabla document_signatures de la base de datos
 * Ejecutar: cd backend && node scripts/drop-document-signatures.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Eliminando tabla document_signatures...');
  
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS document_signatures CASCADE;');
    console.log('✅ Tabla document_signatures eliminada correctamente');
  } catch (err) {
    console.error('❌ Error al eliminar tabla:', err.message);
    process.exit(1);
  }
  
  await prisma.$disconnect();
}

main();
