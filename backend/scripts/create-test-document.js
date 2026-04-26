const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expedientId = 'cmobt76360001zt2ja699u4l3';
  const clientId = 'cmobt0cuj0001h75p48x4dx6j';
  const templateId = 'cmodlnotv0000c0vv1tp152ja';
  const documentId = 'test-doc-' + Date.now();
  const now = new Date().toISOString();
  
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO documents (
        id, "expedientId", "ownerClientId", name, "docType", phase, status,
        "filePath", "fileSize", "mimeType", "sourceTemplateId", "templateData",
        "isGenerated", "signatureStatus", "contentHtml", "createdAt", "updatedAt"
      ) VALUES (
        '${documentId}', '${expedientId}', '${clientId}', 'Contrato Test Firmas', 
        'GENERADO', 'GENERAL', 'PENDIENTE',
        '/tmp/test.docx', 1000, 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '${templateId}', '{}',
        true, 'PENDIENTE', '<h1>Contrato de Prueba</h1><p>Contenido para firmar</p>', '${now}', '${now}'
      )
    `);
    
    const doc = await prisma.$queryRawUnsafe(`SELECT * FROM documents WHERE id = '${documentId}'`);
    console.log('✅ Documento creado:');
    console.log(JSON.stringify(doc[0], null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
