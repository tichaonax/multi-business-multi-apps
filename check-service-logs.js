/**
 * Check Sync Service Real-Time Status
 * Shows what messages the service is receiving
 */

const { PrismaClient } = require('@prisma/client')

async function checkServiceActivity() {
  const prisma = new PrismaClient()
  
  console.log('🔍 Checking Sync Service Activity\n')
  console.log('═══════════════════════════════════════════════════════')
  
  try {
    // Check sync nodes
    const nodes = await prisma.syncNodes.findMany({
      orderBy: { lastSeen: 'desc' }
    })
    
    console.log(`\n📊 Sync Nodes in Database: ${nodes.length}\n`)
    
    for (const node of nodes) {
      const timeSince = Math.floor((Date.now() - node.lastSeen.getTime()) / 1000)
      const status = node.isActive && timeSince < 120 ? '🟢 ACTIVE' : '🔴 INACTIVE'
      
      console.log(`${status} ${node.nodeName}`)
      console.log(`   Node ID: ${node.nodeId}`)
      console.log(`   Address: ${node.ipAddress}:${node.port}`)
      console.log(`   Last Seen: ${timeSince}s ago (${node.lastSeen.toLocaleString()})`)
      console.log(`   Is Active Flag: ${node.isActive}`)
      console.log('')
    }
    
    // Check recent sync events (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentEvents = await prisma.syncEvents.count({
      where: {
        timestamp: {
          gte: fiveMinutesAgo
        }
      }
    })
    
    console.log(`📋 Sync Events (last 5 minutes): ${recentEvents}`)
    
    if (recentEvents > 0) {
      const events = await prisma.syncEvents.findMany({
        where: {
          timestamp: {
            gte: fiveMinutesAgo
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 5
      })
      
      console.log('\nRecent Events:')
      for (const event of events) {
        console.log(`  • ${event.eventType} - ${event.tableName} (${event.operation})`)
        console.log(`    From: ${event.sourceNodeId?.substring(0, 8) || 'unknown'}`)
        console.log(`    Time: ${event.timestamp.toLocaleTimeString()}`)
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════')
    console.log('\n💡 Diagnosis:')
    
    if (nodes.length === 1) {
      console.log('❌ Only 1 node in database (should be 2)')
      console.log('   Problem: Service is not storing discovered peers')
      console.log('\n🔧 Possible causes:')
      console.log('   1. Message filtering is rejecting peer broadcasts')
      console.log('   2. Database write is failing silently')
      console.log('   3. Service needs restart to reload configuration')
      console.log('\n💡 Next step: Restart sync service on BOTH servers:')
      console.log('   npm run service:restart')
    } else if (nodes.length >= 2) {
      console.log('✅ Multiple nodes detected!')
      const activeCount = nodes.filter(n => n.isActive).length
      console.log(`   ${activeCount} active nodes`)
      
      if (activeCount >= 2) {
        console.log('\n✅ Peer discovery is working correctly!')
      }
    } else {
      console.log('❌ No nodes in database')
      console.log('   Sync service may not be running')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkServiceActivity()
