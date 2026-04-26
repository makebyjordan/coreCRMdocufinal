require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Renombrando columnas a camelCase...');

  const renames = [
    // base_documents
    [`ALTER TABLE "base_documents" RENAME COLUMN "is_template" TO "isTemplate"`, 'base_documents.isTemplate'],
    [`ALTER TABLE "base_documents" RENAME COLUMN "template_format" TO "templateFormat"`, 'base_documents.templateFormat'],
    [`ALTER TABLE "base_documents" RENAME COLUMN "requires_signature" TO "requiresSignature"`, 'base_documents.requiresSignature'],
    [`ALTER TABLE "base_documents" RENAME COLUMN "signer_roles" TO "signerRoles"`, 'base_documents.signerRoles'],

    // documents
    [`ALTER TABLE "documents" RENAME COLUMN "source_template_id" TO "sourceTemplateId"`, 'documents.sourceTemplateId'],
    [`ALTER TABLE "documents" RENAME COLUMN "template_data" TO "templateData"`, 'documents.templateData'],
    [`ALTER TABLE "documents" RENAME COLUMN "is_generated" TO "isGenerated"`, 'documents.isGenerated'],
    [`ALTER TABLE "documents" RENAME COLUMN "content_html" TO "contentHtml"`, 'documents.contentHtml'],
    [`ALTER TABLE "documents" RENAME COLUMN "signature_status" TO "signatureStatus"`, 'documents.signatureStatus'],

    // document_signatures - rename table to camelCase and fix columns
    [`ALTER TABLE IF EXISTS "document_signatures" RENAME TO "DocumentSignature"`, 'Tabla DocumentSignature'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "document_id" TO "documentId"`, 'DocumentSignature.documentId'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "signer_role" TO "signerRole"`, 'DocumentSignature.signerRole'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "signer_name" TO "signerName"`, 'DocumentSignature.signerName'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "signer_email" TO "signerEmail"`, 'DocumentSignature.signerEmail'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "agent_id" TO "agentId"`, 'DocumentSignature.agentId'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "client_id" TO "clientId"`, 'DocumentSignature.clientId'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "sign_token" TO "signToken"`, 'DocumentSignature.signToken'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "sign_token_expires_at" TO "signTokenExpiresAt"`, 'DocumentSignature.signTokenExpiresAt'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "signed_at" TO "signedAt"`, 'DocumentSignature.signedAt'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "signature_data" TO "signatureData"`, 'DocumentSignature.signatureData'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "signature_method" TO "signatureMethod"`, 'DocumentSignature.signatureMethod'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "ip_address" TO "ipAddress"`, 'DocumentSignature.ipAddress'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "user_agent" TO "userAgent"`, 'DocumentSignature.userAgent'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "created_at" TO "createdAt"`, 'DocumentSignature.createdAt'],
    [`ALTER TABLE "DocumentSignature" RENAME COLUMN "updated_at" TO "updatedAt"`, 'DocumentSignature.updatedAt'],
  ];

  for (const [sql, label] of renames) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✅', label);
    } catch (err) {
      if (err.message.includes('does not exist') || err.message.includes('already exists')) {
        console.log('⏭️  Ya OK:', label);
      } else {
        console.error('❌', label, '-', err.message.slice(0, 100));
      }
    }
  }

  console.log('\n✅ Renombrado completado');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
