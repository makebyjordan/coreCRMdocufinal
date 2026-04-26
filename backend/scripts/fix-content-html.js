/**
 * Script para regenerar contentHtml de documentos existentes que no lo tengan
 * Ejecutar: cd backend && node scripts/fix-content-html.js
 */

const { PrismaClient } = require('@prisma/client');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const prisma = new PrismaClient();

async function main() {
  console.log('Buscando documentos generados sin contentHtml...');
  
  // Buscar documentos generados que no tengan contentHtml
  const docs = await prisma.$queryRawUnsafe(`
    SELECT id, "filePath", name, "isGenerated"
    FROM documents
    WHERE "isGenerated" = true 
    AND ("contentHtml" IS NULL OR "contentHtml" = '')
    AND "filePath" IS NOT NULL
  `);
  
  console.log(`Encontrados ${docs.length} documentos sin contentHtml`);
  
  for (const doc of docs) {
    try {
      // Verificar que el archivo existe
      if (!doc.filePath) {
        console.log(`  ⚠️ ${doc.name} - sin filePath`);
        continue;
      }
      
      await fs.access(doc.filePath);
      
      // Convertir a HTML
      const result = await mammoth.convertToHtml({ path: doc.filePath });
      const contentHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;padding:40px;max-width:800px;margin:0 auto;background:#fff;color:#333;} h1,h2{color:#1a365d;} table{border-collapse:collapse;width:100%;margin:20px 0;} th,td{border:1px solid #e2e8f0;padding:12px;text-align:left;} th{background:#f7fafc;}</style>
        </head><body>${result.value}</body></html>`;
      
      // Actualizar documento
      await prisma.$executeRawUnsafe(`
        UPDATE documents 
        SET "contentHtml" = '${contentHtml.replace(/'/g, "''")}'
        WHERE id = '${doc.id}'
      `);
      
      console.log(`  ✅ ${doc.name} - HTML generado`);
    } catch (err) {
      console.log(`  ❌ ${doc.name} - ${err.message}`);
    }
  }
  
  console.log('\nProceso completado');
  await prisma.$disconnect();
}

main();
