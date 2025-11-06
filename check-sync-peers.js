/**
 * Check Sync Peer Discovery Status
 * Queries the database to see what peers are registered
 */

const { PrismaClient } = require('@prisma/client')

async function checkSyncPeers() {
  const prisma = new PrismaClient()

  try {
    console.log('🔍 Checking Sync Peer Status\n')
    console.log('═══════════════════════════════════════════════════════\n')

    // Check if SyncNodes table exists and has data
    const nodes = await prisma.syncNodes.findMany({
      orderBy: { lastSeen: 'desc' }
    })

    if (nodes.length === 0) {
      console.log('❌ No sync nodes found in database')
      console.log('\nPossible reasons:')
      console.log('  • Sync service is not running')
      console.log('  • Peer discovery is not working')
      console.log('  • Database connection issue')
      console.log('\nTo start sync service: npm run service:start')
    } else {
      console.log(`✅ Found ${nodes.length} sync node(s):\n`)

      nodes.forEach((node, index) => {
        const timeSinceLastSeen = Date.now() - new Date(node.lastSeen).getTime()
        const minutesAgo = Math.floor(timeSinceLastSeen / 60000)
        const isActive = node.isActive && minutesAgo < 2

        console.log(`${index + 1}. ${node.nodeName}`)
        console.log(`   Node ID: ${node.nodeId}`)
        console.log(`   Address: ${node.ipAddress}:${node.port}`)
        console.log(`   Status: ${isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`)
        console.log(`   Last Seen: ${minutesAgo} minute(s) ago`)
        console.log(`   Capabilities: ${JSON.stringify(node.capabilities || {})}`)
        console.log('')
      })

      // Check for active peers (excluding self)
      const activePeers = nodes.filter(n => {
        const timeSince = Date.now() - new Date(n.lastSeen).getTime()
        return n.isActive && timeSince < 120000 // Active in last 2 minutes
      })

      if (activePeers.length === 1) {
        console.log('📊 Status: Only this server is active')
        console.log('   The second server is either:')
        console.log('   • Not running the sync service')
        console.log('   • Unable to reach this server on the network')
        console.log('   • Using a different SYNC_REGISTRATION_KEY')
        console.log('   • Blocked by firewall')
      } else if (activePeers.length > 1) {
        console.log(`📊 Status: ${activePeers.length} active peer(s) connected ✅`)
        console.log('   Sync is working correctly!')
      }
    }

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('\n💡 Troubleshooting Commands:')
    console.log('   npm run service:status    - Check service status')
    console.log('   npm run service:start     - Start sync service')
    console.log('   npm run service:stop      - Stop sync service')
    console.log('   npm run service:restart   - Restart sync service')
    console.log('\n═══════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Error checking sync peers:', error.message)
    
    if (error.code === 'P2021') {
      console.log('\n⚠️  SyncNodes table does not exist')
      console.log('   Run: npx prisma db push')
    }
  } finally {
    await prisma.$disconnect()
  }
}

checkSyncPeers()
