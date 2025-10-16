// Complete sync verification script
const { PrismaClient } = require('@prisma/client')

async function verifySyncStatus() {
  console.log('=== Complete Sync Verification ===\n')
  
  const prisma = new PrismaClient()
  
  try {
    // 1. Check sync events created
    console.log('1️⃣ Checking sync events created...')
    const nodeId = process.env.SYNC_NODE_ID || '2595930f841f02e1'
    
    const allSyncEvents = await prisma.syncEvents.findMany({
      where: { sourceNodeId: nodeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        eventId: true,
        tableName: true,
        operation: true,
        recordId: true,
        processed: true,
        createdAt: true
      }
    })
    
    console.log(`   Found ${allSyncEvents.length} sync events from local node:`)
    allSyncEvents.forEach((event, index) => {
      const status = event.processed ? '✅ Processed' : '⏳ Pending'
      console.log(`   ${index + 1}. ${event.operation} on ${event.tableName} - ${status}`)
      console.log(`      Event ID: ${event.eventId.slice(0,8)}...`)
      console.log(`      Time: ${new Date(event.createdAt).toLocaleString()}`)
    })
    
    // 2. Check users that were modified
    console.log('\n2️⃣ Checking modified users...')
    const modifiedUsers = await prisma.users.findMany({
      where: {
        name: {
          contains: 'Test'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    })
    
    console.log(`   Found ${modifiedUsers.length} test users:`)
    modifiedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`)
      console.log(`      Updated: ${new Date(user.updatedAt).toLocaleString()}`)
    })
    
    // 3. Check sync node status
    console.log('\n3️⃣ Checking sync nodes...')
    const syncNodes = await prisma.syncNodes.findMany({
      where: { isActive: true },
      orderBy: { lastSeen: 'desc' },
      select: {
        nodeId: true,
        nodeName: true,
        ipAddress: true,
        port: true,
        lastSeen: true
      }
    })
    
    console.log(`   Found ${syncNodes.length} active sync nodes:`)
    syncNodes.forEach((node, index) => {
      const lastSeenAgo = Math.floor((Date.now() - new Date(node.lastSeen).getTime()) / 1000)
      console.log(`   ${index + 1}. ${node.nodeName} (${node.nodeId.slice(0,8)}...)`)
      console.log(`      Address: ${node.ipAddress}:${node.port}`)
      console.log(`      Last seen: ${lastSeenAgo}s ago`)
    })
    
    // 4. Summary and instructions
    console.log('\n📋 SYNC STATUS SUMMARY:')
    console.log(`• Local sync events created: ${allSyncEvents.length}`)
    console.log(`• Test users modified: ${modifiedUsers.length}`)
    console.log(`• Active sync nodes: ${syncNodes.length}`)
    
    console.log('\n🎯 WHAT TO CHECK ON REMOTE SERVER:')
    
    if (modifiedUsers.length > 0) {
      console.log('\n👥 Look for these updated users:')
      modifiedUsers.slice(0, 3).forEach((user, index) => {
        console.log(`${index + 1}. "${user.name}"`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Should have been updated at: ${new Date(user.updatedAt).toLocaleString()}`)
      })
    }
    
    if (allSyncEvents.length > 0) {
      console.log('\n📊 Look for these sync events:')
      allSyncEvents.slice(0, 3).forEach((event, index) => {
        console.log(`${index + 1}. Event ID: ${event.eventId}`)
        console.log(`   Table: ${event.tableName}, Operation: ${event.operation}`)
        console.log(`   Created: ${new Date(event.createdAt).toLocaleString()}`)
      })
    }
    
    console.log('\n🔍 Remote Server Commands to Run:')
    console.log('1. Check sync events:')
    console.log('   SELECT * FROM sync_events ORDER BY "createdAt" DESC LIMIT 5;')
    console.log('\n2. Check for updated users:')
    console.log("   SELECT * FROM users WHERE name LIKE '%Test%' ORDER BY \"updatedAt\" DESC;")
    console.log('\n3. Check sync nodes:')
    console.log('   SELECT * FROM "SyncNode" ORDER BY "lastSeen" DESC;')
    
    const pendingEvents = allSyncEvents.filter(e => !e.processed).length
    if (pendingEvents > 0) {
      console.log(`\n⚠️  ${pendingEvents} events are still pending - sync service should process these`)
    } else if (allSyncEvents.length > 0) {
      console.log('\n✅ All sync events processed - check remote server!')
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySyncStatus().catch(console.error)