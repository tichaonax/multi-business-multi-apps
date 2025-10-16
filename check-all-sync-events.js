// Check all sync events (not just from local node)
const { PrismaClient } = require('@prisma/client')

async function checkAllSyncEvents() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== All Sync Events Check ===\n')
    
    // Check all recent sync events
    const allEvents = await prisma.syncEvents.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        eventId: true,
        sourceNodeId: true,
        tableName: true,
        operation: true,
        recordId: true,
        processed: true,
        createdAt: true
      }
    })
    
    console.log(`Found ${allEvents.length} total sync events:`)
    allEvents.forEach((event, index) => {
      const status = event.processed ? '✅ Processed' : '⏳ Pending'
      console.log(`${index + 1}. ${event.operation} on ${event.tableName} - ${status}`)
      console.log(`   Event ID: ${event.eventId.slice(0,12)}...`)
      console.log(`   Source Node: ${event.sourceNodeId.slice(0,12)}...`)
      console.log(`   Time: ${new Date(event.createdAt).toLocaleString()}`)
    })
    
    // Check events by source node
    const eventsByNode = await prisma.syncEvents.groupBy({
      by: ['sourceNodeId'],
      _count: {
        eventId: true
      }
    })
    
    console.log(`\n📊 Events by source node:`)
    eventsByNode.forEach((group, index) => {
      console.log(`${index + 1}. Node ${group.sourceNodeId.slice(0,12)}...: ${group._count.eventId} events`)
    })
    
    // Check specific test events
    const testEvents = await prisma.syncEvents.findMany({
      where: {
        OR: [
          { sourceNodeId: 'local-manual-test' },
          { sourceNodeId: '2595930f841f02e1' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
        eventId: true,
        sourceNodeId: true,
        tableName: true,
        operation: true,
        processed: true,
        createdAt: true
      }
    })
    
    console.log(`\n🧪 Test events (manual and authorized):`)
    if (testEvents.length === 0) {
      console.log('   No test events found! This suggests events were not created properly.')
    } else {
      testEvents.forEach((event, index) => {
        const status = event.processed ? '✅ Processed' : '⏳ Pending'
        console.log(`${index + 1}. ${event.operation} on ${event.tableName} - ${status}`)
        console.log(`   Source: ${event.sourceNodeId}`)
        console.log(`   Time: ${new Date(event.createdAt).toLocaleString()}`)
      })
    }
    
    console.log('\n💡 Analysis:')
    if (allEvents.length === 0) {
      console.log('• No sync events in database - sync tracking may not be working')
    } else if (testEvents.length === 0) {
      console.log('• General sync events exist but our test events are missing')
      console.log('• This suggests our manual sync event creation had issues')
    } else {
      console.log('• Sync events are being created successfully!')
      const processed = testEvents.filter(e => e.processed).length
      console.log(`• ${processed}/${testEvents.length} test events processed`)
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllSyncEvents().catch(console.error)