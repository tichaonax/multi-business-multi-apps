const { PrismaClient } = require('@prisma/client')
const path = require('path')

async function testUserSync() {
  console.log('🧪 Testing User Sync Event Generation...\n')
  
  const prisma = new PrismaClient()
  
  try {
    // Check current sync events
    const initialEvents = await prisma.syncEvents.count()
    console.log(`📊 Initial sync events: ${initialEvents}`)
    
    // Check recent sync events
    const recentEvents = await prisma.syncEvents.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        eventId: true,
        tableName: true,
        operation: true,
        processed: true,
        createdAt: true,
        recordId: true
      }
    })
    
    console.log('\n📋 Recent sync events:')
    if (recentEvents.length === 0) {
      console.log('   No sync events found')
    } else {
      recentEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
        console.log(`   Event ID: ${event.eventId}`)
        console.log(`   Record ID: ${event.recordId}`)
        console.log(`   Processed: ${event.processed}`)
        console.log(`   Created: ${new Date(event.createdAt).toLocaleString()}`)
        console.log('')
      })
    }
    
    // Find a user to test with
    const user = await prisma.users.findFirst()
    if (!user) {
      console.log('❌ No users found to test with')
      return
    }
    
    console.log(`👤 Testing with user: ${user.name} (${user.email})`)
    console.log(`   Current updated time: ${user.updatedAt}`)
    
    // Let's update the user and see what happens
    console.log('\n🔄 Updating user...')
    const timestamp = new Date().toISOString().slice(11,19)
    
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { 
        name: user.name.replace(/ \(Test.*\)$/, '') + ` (Test ${timestamp})`,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ User updated: ${updatedUser.name}`)
    console.log(`   New updated time: ${updatedUser.updatedAt}`)
    
    // Wait a moment for potential async processing
    console.log('\n⏳ Waiting for sync processing...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check for new sync events
    const finalEvents = await prisma.syncEvents.count()
    console.log(`📊 Final sync events: ${finalEvents}`)
    
    if (finalEvents > initialEvents) {
      console.log('🎉 SUCCESS: Sync events were generated!')
      console.log(`   New events created: ${finalEvents - initialEvents}`)
      
      // Show the new events
      const newEvents = await prisma.syncEvents.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          eventId: true,
          tableName: true,
          operation: true,
          processed: true,
          createdAt: true,
          recordId: true
        }
      })
      
      console.log('\n📋 New sync events:')
      newEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
        console.log(`   Event ID: ${event.eventId}`)
        console.log(`   Record ID: ${event.recordId}`)
        console.log(`   Processed: ${event.processed}`)
        console.log(`   Created: ${new Date(event.createdAt).toLocaleString()}`)
        console.log('')
      })
      
    } else {
      console.log('❌ No sync events were generated')
      console.log('💡 This indicates the sync middleware is not working on database operations')
      
      // Let's check what might be wrong
      console.log('\n🔍 Diagnostic Information:')
      
      // Check if we have any sync events at all
      const totalEvents = await prisma.syncEvents.count()
      console.log(`   Total sync events in database: ${totalEvents}`)
      
      // Check sync nodes
      const syncNodes = await prisma.syncNodes.findMany({
        select: {
          nodeId: true,
          ipAddress: true,
          port: true,
          lastSeen: true,
          active: true
        }
      })
      
      console.log(`   Sync nodes: ${syncNodes.length}`)
      syncNodes.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.nodeId} (${node.ipAddress}:${node.port})`)
        console.log(`      Active: ${node.active}, Last seen: ${new Date(node.lastSeen).toLocaleString()}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testUserSync()