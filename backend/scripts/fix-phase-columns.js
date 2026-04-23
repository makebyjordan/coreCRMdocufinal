const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Converting Phase ENUM columns to TEXT...')

  const queries = [
    `ALTER TABLE checklist_templates ALTER COLUMN "phase" TYPE TEXT USING "phase"::text`,
    `ALTER TABLE checklist_instances ALTER COLUMN "phase" TYPE TEXT USING "phase"::text`,
    `ALTER TABLE documents ALTER COLUMN "phase" TYPE TEXT USING "phase"::text`,
  ]

  for (const sql of queries) {
    try {
      await prisma.$executeRawUnsafe(sql)
      const table = sql.match(/ALTER TABLE (\S+)/)[1]
      console.log(`✓ Converted ${table}.phase to TEXT`)
    } catch (err) {
      if (err.message.includes('does not exist') || err.message.includes('column') && err.message.includes('not exist')) {
        console.log(`  Skipped (column not found): ${sql.split(' ')[4]}`)
      } else {
        console.error(`  Error: ${err.message}`)
      }
    }
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
