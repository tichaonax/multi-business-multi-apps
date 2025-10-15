const { PrismaClient } = require('@prisma/client')

async function checkSyncNodes() {
  const prisma = new PrismaClient()
  
  try {
    console.log('📊 Checking sync nodes in database...')
    
    const syncNodes = await prisma.syncNodes.findMany({
      orderBy: { lastSeen: 'desc' }
    })
    
    console.log(`\n✅ Found ${syncNodes.length} sync nodes:`)
    syncNodes.forEach((node, index) => {
      console.log(`\n${index + 1}. Node: ${node.nodeName} (${node.nodeId})`)
      console.log(`   IP: ${node.ipAddress}:${node.port}`)
      console.log(`   Active: ${node.isActive}`)
      console.log(`   Last Seen: ${node.lastSeen}`)
      console.log(`   Created: ${node.createdAt}`)
      if (node.capabilities) {
        console.log(`   Capabilities: ${JSON.stringify(node.capabilities)}`)
      }
    })
    
    // Check for recent activity (last 5 minutes)
    const recentlyActive = syncNodes.filter(node => 
      node.lastSeen && 
      (new Date().getTime() - new Date(node.lastSeen).getTime()) < 5 * 60 * 1000
    )
    
    console.log(`\n🟢 Recently active nodes (last 5 minutes): ${recentlyActive.length}`)
    recentlyActive.forEach(node => {
      const secondsAgo = Math.round((new Date().getTime() - new Date(node.lastSeen).getTime()) / 1000)
      console.log(`   - ${node.nodeName}: ${secondsAgo}s ago`)
    })
    
  } catch (error) {
    console.error('❌ Error checking sync nodes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSyncNodes()