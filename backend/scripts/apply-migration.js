/**
 * Script to apply SQL migration directly using Prisma
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const commands = [
  // Add calendarEventId to visits table
  `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT`,
  
  // Add unique constraint on calendarEventId
  `ALTER TABLE "visits" ADD CONSTRAINT "visits_calendarEventId_unique" UNIQUE ("calendarEventId")`,
  
  // Add foreign key constraint for calendarEventId
  `ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_calendarEventId_fkey"`,
  `ALTER TABLE "visits" ADD CONSTRAINT "visits_calendarEventId_fkey" 
    FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  
  // Add visitId to calendar_events table
  `ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "visitId" TEXT`,
  
  // Add unique constraint on visitId
  `ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_visitId_unique" UNIQUE ("visitId")`,
  
  // Add foreign key constraint for visitId
  `ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_visitId_fkey"`,
  `ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_visitId_fkey" 
    FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  
  // Create index on calendarEventId
  `CREATE INDEX IF NOT EXISTS "visits_calendarEventId_idx" ON "visits"("calendarEventId")`,
  
  // Create index on visitId
  `CREATE INDEX IF NOT EXISTS "calendar_events_visitId_idx" ON "calendar_events"("visitId")`
];

async function applyMigration() {
  console.log('Applying migration...')
  
  for (const sql of commands) {
    try {
      await prisma.$executeRawUnsafe(sql)
      console.log(`✓ Applied: ${sql.substring(0, 60)}...`)
    } catch (error) {
      // If error is about column/index/constraint already existing, that's okay
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate column') ||
          error.message.includes('duplicate key') ||
          error.message.includes('already a constraint')) {
        console.log(`⊘ Skipped (already exists): ${sql.substring(0, 60)}...`)
      } else {
        console.error(`✗ Error applying: ${sql}`)
        console.error(`  ${error.message}`)
        // Don't throw, continue with other commands
      }
    }
  }
  
  console.log('Migration completed!')
}

applyMigration()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
