/**
 * Crear tabla document_signatures si no existe
 * Compatible con Supabase pooler
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SQL_COMMANDS = [
  `CREATE TABLE IF NOT EXISTS "document_signatures" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerType" TEXT NOT NULL,
    "signerUserId" TEXT,
    "signerClientId" TEXT,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "signatureData" TEXT,
    "signatureMethod" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "signToken" TEXT UNIQUE,
    "signTokenExpiresAt" TIMESTAMP(3),
    "signedPdfPath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "document_signatures_documentId_idx" ON "document_signatures"("documentId")`,
  `CREATE INDEX IF NOT EXISTS "document_signatures_signToken_idx" ON "document_signatures"("signToken")`,
];

async function main() {
  console.log('🔧 Creando tabla document_signatures si no existe...\n');

  for (const sql of SQL_COMMANDS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✅ Comando ejecutado');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  Ya existe, ignorando');
      } else {
        console.error('❌ Error:', err.message);
      }
    }
  }

  // Verificar
  const result = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'document_signatures'
    ORDER BY ordinal_position;
  `;

  console.log('\n📋 Columnas en document_signatures:');
  console.table(result);

  console.log('\n✨ Listo para crear Foreign Keys');
  console.log('   Ejecuta ahora: node scripts/add-template-fks.js');
}

main()
  .catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
