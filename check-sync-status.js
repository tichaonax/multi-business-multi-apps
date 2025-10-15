/**
 * Check current sync nodes in database - specifically for admin dashboard visibility
 */

const { PrismaClient } = require('@prisma/client')

async function checkCurrentSyncStatus() {
  console.log('🔍 Checking Current Sync Status...\n')
  
  try {
    const prisma = new PrismaClient()
    
    // Get all sync nodes
    const allNodes = await prisma.syncNodes.findMany({
      orderBy: { lastSeen: 'desc' }
    })
    
    console.log(`📊 Total sync nodes in database: ${allNodes.length}\n`)
    
    // Analyze each node
    allNodes.forEach((node, index) => {
      const now = new Date()
      const lastSeen = new Date(node.lastSeen)
      const secondsAgo = Math.round((now.getTime() - lastSeen.getTime()) / 1000)
      const minutesAgo = Math.round(secondsAgo / 60)
      const isRecent = secondsAgo < 5 * 60 // Last 5 minutes
      
      console.log(`${index + 1}. 🖥️  ${node.nodeName}`)
      console.log(`   📋 Node ID: ${node.nodeId}`)
      console.log(`   🌐 Address: ${node.ipAddress}:${node.port}`)
      console.log(`   🟢 Active: ${node.isActive}`)
      console.log(`   ⏰ Last Seen: ${lastSeen.toLocaleString()}`)
      console.log(`   📏 Time Ago: ${minutesAgo > 0 ? `${minutesAgo}m` : `${secondsAgo}s`} ago`)
      console.log(`   📶 Recent: ${isRecent ? '✅ Yes' : '❌ No'}`)
      
      if (node.capabilities) {
        console.log(`   🛠️  Capabilities: ${JSON.stringify(node.capabilities, null, 2)}`)
      }
      
      console.log('') // Empty line between nodes
    })
    
    // Summary for admin dashboard
    const activeNodes = allNodes.filter(node => node.isActive)
    const recentNodes = allNodes.filter(node => {
      const lastSeen = new Date(node.lastSeen)
      return (new Date().getTime() - lastSeen.getTime()) < 5 * 60 * 1000
    })
    
    console.log('📈 Summary for Admin Dashboard:')
    console.log(`   Total Nodes: ${allNodes.length}`)
    console.log(`   Active Nodes: ${activeNodes.length}`)
    console.log(`   Recently Active: ${recentNodes.length}`)
    console.log(`   Connected Peers: ${recentNodes.length > 1 ? recentNodes.length - 1 : 0}`)
    
    if (recentNodes.length > 1) {
      console.log('\n🔗 Currently Connected Peers:')
      recentNodes.forEach(node => {
        console.log(`   - ${node.nodeName} (${node.ipAddress})`)
      })
    } else {
      console.log('\n📡 No connected peers detected (only current node)')
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Error checking sync status:', error)
    process.exit(1)
  }
}

checkCurrentSyncStatus()