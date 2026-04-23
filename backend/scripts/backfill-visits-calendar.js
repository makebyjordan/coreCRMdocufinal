/**
 * Backfill script: Create calendar events for existing visits
 * 
 * This script:
 * 1. Finds all visits without a calendarEventId
 * 2. Creates a corresponding calendar event for each
 * 3. Links the visit to the calendar event
 * 
 * Usage: node scripts/backfill-visits-calendar.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function backfillVisits() {
  console.log('Starting backfill of calendar events for visits...')
  
  try {
    // Find all visits without a calendarEventId
    const visitsWithoutCalendar = await prisma.visit.findMany({
      where: {
        calendarEventId: null
      },
      include: {
        expedient: {
          include: {
            client: true
          }
        }
      }
    })

    console.log(`Found ${visitsWithoutCalendar.length} visits without calendar events`)

    if (visitsWithoutCalendar.length === 0) {
      console.log('No visits to backfill. Exiting.')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const visit of visitsWithoutCalendar) {
      try {
        // Create calendar event
        const calendarEvent = await prisma.calendarEvent.create({
          data: {
            title: `Visita: ${visit.visitorName}`,
            type: 'VISITA',
            startAt: visit.date,
            endAt: new Date(new Date(visit.date).getTime() + 60 * 60 * 1000), // Add 1 hour
            allDay: false,
            notes: visit.feedback || '',
            clientId: visit.expedient?.clientId || null,
            expedientId: visit.expedientId,
            visitId: visit.id
          }
        })

        // Update visit with calendarEventId
        await prisma.visit.update({
          where: { id: visit.id },
          data: { calendarEventId: calendarEvent.id }
        })

        console.log(`✓ Created calendar event ${calendarEvent.id} for visit ${visit.id} (${visit.visitorName})`)
        successCount++
      } catch (error) {
        console.error(`✗ Error processing visit ${visit.id}:`, error.message)
        errorCount++
      }
    }

    console.log('\n=== Backfill Summary ===')
    console.log(`Total visits processed: ${visitsWithoutCalendar.length}`)
    console.log(`Successfully backfilled: ${successCount}`)
    console.log(`Errors: ${errorCount}`)
    
  } catch (error) {
    console.error('Fatal error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
backfillVisits()
  .then(() => {
    console.log('Backfill completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })
