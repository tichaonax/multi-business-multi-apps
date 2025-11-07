/**
 * Check Registered Sync Peers
 * Shows all registered peers in the database
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPeers() {
  console.log('🔍 Checking Registered Sync Peers')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get all sync nodes
    const nodes = await prisma.syncNodes.findMany({
      orderBy: { lastSeen: 'desc' }
    })

    if (nodes.length === 0) {
      console.log('❌ No sync peers found in database\n')
      console.log('This might mean:')
      console.log('  • Sync service hasn\'t started yet')
      console.log('  • Peer discovery isn\'t working')
      console.log('  • Database migration hasn\'t run\n')
      await prisma.$disconnect()
      return
    }

    console.log(`📊 Found ${nodes.length} sync node(s):\n`)

    nodes.forEach((node, index) => {
      const status = node.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'
      const lastSeen = node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'

      console.log(`${index + 1}. ${node.nodeName} ${status}`)
      console.log(`   Node ID: ${node.nodeId}`)
      console.log(`   IP Address: ${node.ipAddress || 'Unknown'}:${node.port || 'Unknown'}`)
      console.log(`   Last Seen: ${lastSeen}`)
      console.log(`   Capabilities: ${Array.isArray(node.capabilities) ? node.capabilities.join(', ') : 'None'}`)
      console.log('')
    })

    // Get sync sessions
    console.log('═══════════════════════════════════════════════════')
    console.log('📝 Recent Sync Sessions (last 10):\n')

    const sessions = await prisma.syncSessions.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' }
    })

    if (sessions.length === 0) {
      console.log('❌ No sync sessions found\n')
    } else {
      sessions.forEach((session, index) => {
        const duration = session.completedAt && session.startedAt
          ? `${((new Date(session.completedAt) - new Date(session.startedAt)) / 1000).toFixed(2)}s`
          : 'N/A'

        const status = session.status === 'completed' ? '✅' :
                      session.status === 'failed' ? '❌' : '⏳'

        console.log(`${index + 1}. ${status} ${session.status.toUpperCase()}`)
        console.log(`   Session ID: ${session.id}`)
        console.log(`   Target Node: ${session.targetNodeId}`)
        console.log(`   Started: ${new Date(session.startedAt).toLocaleString()}`)
        console.log(`   Events Sent: ${session.eventsSent || 0}`)
        console.log(`   Events Received: ${session.eventsReceived || 0}`)
        console.log(`   Duration: ${duration}`)
        if (session.error) {
          console.log(`   Error: ${session.error}`)
        }
        console.log('')
      })
    }

    // Get sync events
    console.log('═══════════════════════════════════════════════════')
    console.log('📤 Pending Sync Events:\n')

    const pendingEvents = await prisma.syncEvents.count({
      where: {
        synced: false
      }
    })

    const totalEvents = await prisma.syncEvents.count()

    console.log(`   Pending: ${pendingEvents}`)
    console.log(`   Total: ${totalEvents}`)
    console.log('')

    if (pendingEvents > 0) {
      console.log('   📋 Sample pending events (first 5):\n')

      const sampleEvents = await prisma.syncEvents.findMany({
        where: { synced: false },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })

      sampleEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.operation} on ${event.tableName}`)
        console.log(`      Record ID: ${event.recordId}`)
        console.log(`      Created: ${new Date(event.createdAt).toLocaleString()}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error checking sync peers:', error.message)
    console.error('\nFull error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPeers()
