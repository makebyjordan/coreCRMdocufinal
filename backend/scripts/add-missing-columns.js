const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Adding missing columns...')

  await prisma.$executeRawUnsafe(`
    ALTER TABLE checklist_templates
    ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0
  `)
  console.log('✓ Added "order" column to checklist_templates')

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
