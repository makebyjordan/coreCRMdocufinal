/**
 * Script para aplicar la migración de plantillas de documentos
 * Añade columnas a base_documents y documents, y crea DocumentSignature
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Aplicando migración de plantillas...');

  // Ejecutar SQL raw para añadir columnas
  const migrations = [
    // BaseDocument - campos de plantilla
    `ALTER TABLE "base_documents" ADD COLUMN IF NOT EXISTS "is_template" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "base_documents" ADD COLUMN IF NOT EXISTS "template_format" TEXT`,
    `ALTER TABLE "base_documents" ADD COLUMN IF NOT EXISTS "placeholders" JSONB`,
    `ALTER TABLE "base_documents" ADD COLUMN IF NOT EXISTS "requires_signature" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "base_documents" ADD COLUMN IF NOT EXISTS "signer_roles" JSONB`,

    // Document - campos de documentos generados
    `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "source_template_id" TEXT`,
    `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "template_data" JSONB`,
    `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_generated" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "content_html" TEXT`,
    `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "signature_status" TEXT`,

    // Tabla DocumentSignature
    `CREATE TABLE IF NOT EXISTS "document_signatures" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "document_id" TEXT NOT NULL,
      "signer_role" TEXT NOT NULL,
      "signer_name" TEXT NOT NULL,
      "signer_email" TEXT NOT NULL,
      "agent_id" TEXT,
      "client_id" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "order" INTEGER NOT NULL DEFAULT 0,
      "sign_token" TEXT UNIQUE,
      "sign_token_expires_at" TIMESTAMP(3),
      "signed_at" TIMESTAMP(3),
      "signature_data" TEXT,
      "signature_method" TEXT,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // Foreign key de document_signatures a documents
    `ALTER TABLE "document_signatures" ADD CONSTRAINT IF NOT EXISTS "document_signatures_document_id_fkey"
     FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE`,

    // Foreign key de documents a base_documents (plantilla origen)
    `ALTER TABLE "documents" ADD CONSTRAINT IF NOT EXISTS "documents_source_template_id_fkey"
     FOREIGN KEY ("source_template_id") REFERENCES "base_documents"("id") ON DELETE SET NULL`,
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✅', sql.slice(0, 60) + '...');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('⏭️  Ya existe:', sql.slice(0, 60) + '...');
      } else {
        console.error('❌ Error:', err.message);
        console.error('   SQL:', sql.slice(0, 100));
      }
    }
  }

  console.log('\n✅ Migración completada');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
