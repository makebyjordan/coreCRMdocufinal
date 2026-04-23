const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const commands = [
  `ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "signatureId" TEXT UNIQUE`,
  `ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN DEFAULT false`,
  `ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT UNIQUE`,
  `ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_signatureId_fkey"`,
  `ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "signatures"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "signatures" DROP CONSTRAINT IF EXISTS "signatures_calendarEventId_fkey"`,
  `ALTER TABLE "signatures" ADD CONSTRAINT "signatures_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `CREATE INDEX IF NOT EXISTS "calendar_events_signatureId_idx" ON "calendar_events"("signatureId")`,
  `CREATE INDEX IF NOT EXISTS "signatures_calendarEventId_idx" ON "signatures"("calendarEventId")`,
  `CREATE INDEX IF NOT EXISTS "calendar_events_completed_idx" ON "calendar_events"("completed")`,
  `CREATE INDEX IF NOT EXISTS "calendar_events_type_idx" ON "calendar_events"("type")`
];

async function apply() {
  console.log('Applying migration...');
  for (const sql of commands) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✓ Applied:', sql.substring(0, 60) + '...');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('⊘ Skipped:', sql.substring(0, 60) + '...');
      } else {
        console.error('✗ Error:', err.message);
      }
    }
  }
  console.log('Migration completed!');
}

apply().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
