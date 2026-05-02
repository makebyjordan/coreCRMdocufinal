-- Migration: Add Property Media Gallery
-- Created: 2026-04-26

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mediatype') THEN
        CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO', 'FLOOR_PLAN', 'TOUR_360', 'DOCUMENT_MKT');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mediastatus') THEN
        CREATE TYPE "MediaStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
    END IF;
END $$;

-- ─── Tabla property_media ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "property_media" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "expedientId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "type" "MediaType" DEFAULT 'PHOTO',
    "status" "MediaStatus" DEFAULT 'ACTIVE',
    "title" TEXT,
    "description" TEXT,
    "order" INTEGER DEFAULT 0,
    "isCover" BOOLEAN DEFAULT false,
    "portalSync" JSONB DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Foreign Keys ────────────────────────────────────────────────────────────

ALTER TABLE "property_media"
    DROP CONSTRAINT IF EXISTS "property_media_expedientId_fkey",
    DROP CONSTRAINT IF EXISTS "property_media_uploadedById_fkey";

ALTER TABLE "property_media"
    ADD CONSTRAINT "property_media_expedientId_fkey"
        FOREIGN KEY ("expedientId") REFERENCES "expedients"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "property_media_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL;

-- ─── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "property_media_expedientId_type_idx"
    ON "property_media"("expedientId", "type");

CREATE INDEX IF NOT EXISTS "property_media_expedientId_order_idx"
    ON "property_media"("expedientId", "order");

-- ─── Trigger para auto-actualizar updatedAt ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_property_media_updated_at ON "property_media";

CREATE TRIGGER update_property_media_updated_at
    BEFORE UPDATE ON "property_media"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
