const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Adding missing enum values...')

  const newValues = ['INQUILINO', 'PROPIETARIO', 'INVERSION_HOLDERS']

  for (const val of newValues) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "OperationType" ADD VALUE IF NOT EXISTS '${val}'`
      )
      console.log(`✓ Added OperationType.${val}`)
    } catch (err) {
      console.error(`  Error adding ${val}: ${err.message}`)
    }
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
