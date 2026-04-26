const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "DocumentSignature" RENAME TO "document_signatures"
    `);
    console.log('✅ Tabla renombrada a document_signatures');
  } catch (err) {
    if (err.message.includes('does not exist')) {
      console.log('⚠️  Tabla DocumentSignature no existe, posiblemente ya renombrada');
    } else {
      console.error('❌ Error:', err.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
