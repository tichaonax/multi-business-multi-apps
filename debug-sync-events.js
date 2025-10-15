const { PrismaClient } = require('@prisma/client')

async function checkSyncEvents() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Checking Sync Events...\n')
    
    // Check sync events
    const events = await prisma.syncEvents.count()
    console.log(`📊 Total sync events: ${events}`)
    
    if (events > 0) {
      const recentEvents = await prisma.syncEvents.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventType: true,
          tableName: true,
          operation: true,
          processed: true,
          createdAt: true,
          retryCount: true
        }
      })
      
      console.log('\n📋 Recent sync events:')
      recentEvents.forEach((event, index) => {
        const status = event.processed ? '✅ Processed' : '⏳ Pending'
        console.log(`${index + 1}. ${event.eventType} on ${event.tableName}`)
        console.log(`   Operation: ${event.operation}`)
        console.log(`   Status: ${status}`)
        console.log(`   Created: ${event.createdAt}`)
        console.log(`   Retries: ${event.retryCount}`)
        console.log('')
      })
    }
    
    // Check sync sessions
    const sessions = await prisma.syncSessions.count()
    console.log(`📊 Total sync sessions: ${sessions}`)
    
    if (sessions > 0) {
      const recentSessions = await prisma.syncSessions.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        select: {
          sessionId: true,
          sourceNodeId: true,
          targetNodeId: true,
          status: true,
          startedAt: true,
          endedAt: true,
          metadata: true
        }
      })
      
      console.log('\n📋 Recent sync sessions:')
      recentSessions.forEach((session, index) => {
        console.log(`${index + 1}. Session ${session.sessionId.substring(0, 8)}...`)
        console.log(`   Source: ${session.sourceNodeId?.substring(0, 8)}...`)
        console.log(`   Target: ${session.targetNodeId?.substring(0, 8)}...`)
        console.log(`   Status: ${session.status}`)
        console.log(`   Started: ${session.startedAt}`)
        console.log(`   Ended: ${session.endedAt}`)
        if (session.metadata) {
          console.log(`   Metadata: ${JSON.stringify(session.metadata)}`)
        }
        console.log('')
      })
    }
    
    // Check if sync is enabled for users table
    console.log('🔍 Checking database triggers and sync setup...')
    
    // Check if there are any recent changes to users table
    const recentUsers = await prisma.users.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
        createdAt: true
      }
    })
    
    console.log('\n👥 Recent user changes:')
    recentUsers.forEach((user, index) => {
      const isRecent = (new Date().getTime() - new Date(user.updatedAt).getTime()) < 60 * 60 * 1000 // Last hour
      const indicator = isRecent ? '🔥 RECENT' : '📅 OLD'
      
      console.log(`${index + 1}. ${indicator} ${user.name} (${user.email})`)
      console.log(`   Updated: ${user.updatedAt}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error checking sync events:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSyncEvents()