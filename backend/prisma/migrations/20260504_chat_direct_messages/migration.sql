-- Make expedientId optional in chat_threads
ALTER TABLE "chat_threads" ALTER COLUMN "expedientId" DROP NOT NULL;

-- Add isDirect flag
ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "isDirect" BOOLEAN NOT NULL DEFAULT false;

-- Drop old FK constraint if exists and re-add as optional
ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_expedientId_fkey";
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_expedientId_fkey" 
  FOREIGN KEY ("expedientId") REFERENCES "expedients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
