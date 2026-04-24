-- Migration: fix_client_relations_and_workflows
-- Fixes: 
-- 1. Add missing updatedAt column to client_relations table
-- 2. Create workflow_rules and workflow_executions tables

-- ============================================
-- BUG 1: Add updatedAt column to client_relations
-- ============================================

-- Check if column exists before adding (PostgreSQL compatible)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'client_relations' 
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "client_relations" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updatedAt column to client_relations';
    ELSE
        RAISE NOTICE 'updatedAt column already exists in client_relations';
    END IF;
END $$;

-- ============================================
-- BUG 2: Create workflow_rules table
-- ============================================

CREATE TABLE IF NOT EXISTS "workflow_rules" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "triggerEvent" TEXT NOT NULL,
  "conditions"   JSONB,
  "actions"      JSONB NOT NULL,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastRunAt"   TIMESTAMP(3),
  "runCount"    INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);

-- Add index for triggerEvent and active
CREATE INDEX IF NOT EXISTS "workflow_rules_triggerEvent_active_idx" 
  ON "workflow_rules"("triggerEvent", "active");

-- Add foreign key to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'workflow_rules_createdById_fkey'
    ) THEN
        ALTER TABLE "workflow_rules" 
        ADD CONSTRAINT "workflow_rules_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- BUG 2: Create workflow_executions table
-- ============================================

CREATE TABLE IF NOT EXISTS "workflow_executions" (
  "id"          TEXT NOT NULL,
  "ruleId"      TEXT NOT NULL,
  "clientId"    TEXT,
  "expedientId" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "input"       JSONB,
  "output"      JSONB,
  "error"       TEXT,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "workflow_executions_ruleId_status_idx" 
  ON "workflow_executions"("ruleId", "status");

CREATE INDEX IF NOT EXISTS "workflow_executions_clientId_createdAt_idx" 
  ON "workflow_executions"("clientId", "startedAt");

-- Add foreign key to workflow_rules
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'workflow_executions_ruleId_fkey'
    ) THEN
        ALTER TABLE "workflow_executions" 
        ADD CONSTRAINT "workflow_executions_ruleId_fkey" 
        FOREIGN KEY ("ruleId") REFERENCES "workflow_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
