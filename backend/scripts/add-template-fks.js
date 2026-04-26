/**
 * Script para crear Foreign Keys del sistema de plantillas y firmas
 * Usa bloques DO $$ para manejar errores de duplicados en PostgreSQL
 * Compatible con Supabase pooler (no usa prepared statements problemáticos)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FK_DEFINITIONS = [
  {
    name: 'document_signatures_documentId_fkey',
    table: 'document_signatures',
    column: 'documentId',
    references: 'documents(id)',
    onDelete: 'CASCADE',
  },
  {
    name: 'document_signatures_agentId_fkey',
    table: 'document_signatures',
    column: 'signerUserId',
    references: 'users(id)',
    onDelete: 'SET NULL',
  },
  {
    name: 'document_signatures_clientId_fkey',
    table: 'document_signatures',
    column: 'signerClientId',
    references: 'clients(id)',
    onDelete: 'SET NULL',
  },
  {
    name: 'documents_sourceTemplateId_fkey',
    table: 'documents',
    column: 'sourceTemplateId',
    references: 'base_documents(id)',
    onDelete: 'SET NULL',
  },
];

const INDEX_DEFINITIONS = [
  {
    name: 'document_signatures_signToken_unique',
    table: 'document_signatures',
    column: 'signToken',
    unique: true,
  },
];

async function main() {
  console.log('🔧 Creando Foreign Keys para sistema de plantillas...\n');

  // Crear Foreign Keys
  for (const fk of FK_DEFINITIONS) {
    try {
      const sql = `
        DO $$ BEGIN
          ALTER TABLE "${fk.table}"
          ADD CONSTRAINT "${fk.name}"
          FOREIGN KEY ("${fk.column}")
          REFERENCES ${fk.references}
          ON DELETE ${fk.onDelete};
        EXCEPTION WHEN duplicate_object THEN
          RAISE NOTICE 'Constraint ${fk.name} ya existe, ignorando...';
        END $$;
      `;
      
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ FK ${fk.name} creada o ya existente`);
    } catch (err) {
      console.error(`❌ Error creando FK ${fk.name}:`, err.message);
    }
  }

  // Crear índices únicos
  for (const idx of INDEX_DEFINITIONS) {
    try {
      const sql = `
        DO $$ BEGIN
          CREATE ${idx.unique ? 'UNIQUE' : ''} INDEX "${idx.name}" 
          ON "${idx.table}" ("${idx.column}");
        EXCEPTION WHEN duplicate_table THEN
          RAISE NOTICE 'Index ${idx.name} ya existe, ignorando...';
        END $$;
      `;
      
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Index ${idx.name} creado o ya existente`);
    } catch (err) {
      console.error(`❌ Error creando index ${idx.name}:`, err.message);
    }
  }

  // Verificar creación consultando information_schema
  console.log('\n📋 Verificando constraints creadas...\n');
  
  const verifyResult = await prisma.$queryRaw`
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('document_signatures', 'documents')
    ORDER BY tc.table_name, tc.constraint_name;
  `;

  console.log('Foreign Keys existentes en las tablas:')
  console.table(verifyResult);

  // Verificar índice único
  const indexResult = await prisma.$queryRaw`
    SELECT 
      indexname,
      tablename,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'document_signatures'
    AND indexname LIKE '%signToken%'
  `;

  console.log('\nÍndices en document_signatures:')
  console.table(indexResult);

  console.log('\n✨ Script completado');
}

main()
  .catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
