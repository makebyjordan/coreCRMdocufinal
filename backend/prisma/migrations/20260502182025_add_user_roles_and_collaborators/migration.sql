-- CreateTable user_role_assignments
CREATE TABLE "user_role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable expedient_collaborators
CREATE TABLE "expedient_collaborators" (
    "id" TEXT NOT NULL,
    "expedientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collaboratorRole" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "expedient_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for user_role_assignments
CREATE UNIQUE INDEX "user_role_assignments_userId_role_key" ON "user_role_assignments"("userId", "role");
CREATE INDEX "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");

-- CreateIndex for expedient_collaborators
CREATE UNIQUE INDEX "expedient_collaborators_expedientId_userId_key" ON "expedient_collaborators"("expedientId", "userId");
CREATE INDEX "expedient_collaborators_expedientId_idx" ON "expedient_collaborators"("expedientId");
CREATE INDEX "expedient_collaborators_userId_idx" ON "expedient_collaborators"("userId");

-- Migrate existing roles from users table to user_role_assignments
INSERT INTO "user_role_assignments" ("id", "userId", "role", "assignedAt")
SELECT
    concat('role-', id, '-', role),
    "id",
    "role",
    "createdAt"
FROM "users"
WHERE "role" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop commission_forecasts table if it exists
DROP TABLE IF EXISTS "commission_forecasts" CASCADE;

-- Remove role column from users table
ALTER TABLE "users" DROP COLUMN "role";

-- Add foreign key constraints
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expedient_collaborators" ADD CONSTRAINT "expedient_collaborators_expedientId_fkey" FOREIGN KEY ("expedientId") REFERENCES "expedients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expedient_collaborators" ADD CONSTRAINT "expedient_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
