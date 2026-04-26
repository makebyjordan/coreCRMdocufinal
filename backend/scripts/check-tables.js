const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Listar todas las tablas
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  
  console.log('📋 Tablas existentes:');
  console.table(tables);
  
  // Verificar si document_signatures existe
  const docSig = tables.find(t => 
    t.table_name.toLowerCase() === 'document_signatures'
  );
  
  if (docSig) {
    console.log('\n✅ Tabla document_signatures encontrada:', docSig.table_name);
    
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${docSig.table_name}
      ORDER BY ordinal_position;
    `;
    console.log('\n📋 Columnas:');
    console.table(columns);
  } else {
    console.log('\n❌ Tabla document_signatures NO existe');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
