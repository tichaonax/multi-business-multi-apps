/**
 * Check Sync Events
 * Shows pending and processed sync events
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSyncEvents() {
  console.log('📤 Checking Sync Events')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Count by processing status
    const pending = await prisma.syncEvents.count({
      where: { processed: false }
    })

    const processed = await prisma.syncEvents.count({
      where: { processed: true }
    })

    const total = await prisma.syncEvents.count()

    console.log('📊 Event Summary:')
    console.log(`   Pending: ${pending}`)
    console.log(`   Processed: ${processed}`)
    console.log(`   Total: ${total}\n`)

    if (pending === 0 && processed === 0) {
      console.log('⚠️  NO SYNC EVENTS FOUND\n')
      console.log('This means:')
      console.log('  • No data changes have been made')
      console.log('  • OR the change tracker is not working')
      console.log('  • OR change tracking is not enabled\n')

      console.log('To test sync, try:')
      console.log('  1. Create a test record in the database')
      console.log('  2. Update an existing record')
      console.log('  3. Check if sync_events table gets new rows\n')
    } else {
      console.log('═══════════════════════════════════════════════════')
      console.log('📋 Pending Events (first 10):\n')

      const pendingEvents = await prisma.syncEvents.findMany({
        where: { processed: false },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })

      if (pendingEvents.length === 0) {
        console.log('  No pending events\n')
      } else {
        pendingEvents.forEach((event, index) => {
          console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
          console.log(`   Event ID: ${event.eventId}`)
          console.log(`   Record ID: ${event.recordId}`)
          console.log(`   Source Node: ${event.sourceNodeId}`)
          console.log(`   Created: ${new Date(event.createdAt).toLocaleString()}`)
          if (event.processingError) {
            console.log(`   Error: ${event.processingError}`)
          }
          console.log('')
        })
      }

      console.log('═══════════════════════════════════════════════════')
      console.log('✅ Processed Events (first 10):\n')

      const processedEvents = await prisma.syncEvents.findMany({
        where: { processed: true },
        take: 10,
        orderBy: { processedAt: 'desc' }
      })

      if (processedEvents.length === 0) {
        console.log('  No processed events\n')
      } else {
        processedEvents.forEach((event, index) => {
          console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
          console.log(`   Event ID: ${event.eventId}`)
          console.log(`   Record ID: ${event.recordId}`)
          console.log(`   Processed: ${event.processedAt ? new Date(event.processedAt).toLocaleString() : 'N/A'}`)
          console.log('')
        })
      }
    }

  } catch (error) {
    console.error('❌ Error checking sync events:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkSyncEvents()
