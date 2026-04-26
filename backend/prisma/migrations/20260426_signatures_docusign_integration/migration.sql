-- Migration: signatures_docusign_integration
-- Generated for DocuSign integration and multi-signer support

-- Add new columns to Signature table
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "envelopeId" TEXT;
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "signingOrder" TEXT NOT NULL DEFAULT 'PARALLEL';
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "signedDocumentPath" TEXT;

-- Create unique index for envelopeId
CREATE UNIQUE INDEX IF NOT EXISTS "signatures_envelopeId_key" ON "signatures"("envelopeId");

-- Create index for documentId
CREATE INDEX IF NOT EXISTS "signatures_documentId_idx" ON "signatures"("documentId");

-- Add foreign key constraint for documentId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'signatures_documentId_fkey'
    ) THEN
        ALTER TABLE "signatures" 
        ADD CONSTRAINT "signatures_documentId_fkey" 
        FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Create SignatureSigner table
CREATE TABLE IF NOT EXISTS "signature_signers" (
    "id" TEXT NOT NULL,
    "signatureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "routingOrder" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "signedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declinedReason" TEXT,
    "recipientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_signers_pkey" PRIMARY KEY ("id")
);

-- Create index for signatureId
CREATE INDEX IF NOT EXISTS "signature_signers_signatureId_idx" ON "signature_signers"("signatureId");

-- Add foreign key constraint for signatureId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'signature_signers_signatureId_fkey'
    ) THEN
        ALTER TABLE "signature_signers" 
        ADD CONSTRAINT "signature_signers_signatureId_fkey" 
        FOREIGN KEY ("signatureId") REFERENCES "signatures"("id") ON DELETE CASCADE;
    END IF;
END $$;
