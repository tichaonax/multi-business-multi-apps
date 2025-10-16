// Test sync with a simple manual approach
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

async function createSyncEventManually() {
  console.log('=== Manual Sync Event Creation Test ===\n')
  
  const prisma = new PrismaClient()
  
  try {
    // Get a user to test with
    const user = await prisma.users.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }
    
    console.log(`👤 Testing with user: ${user.name} (${user.email})`)
    
    // Update the user
    const timestamp = new Date().toISOString().slice(11,19)
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { 
        name: user.name.replace(/ \(.*Test.*\)$/, '') + ` (Manual Sync ${timestamp})`,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ User updated: ${updatedUser.name}`)
    
    // Manually create sync event
    const nodeId = 'local-manual-test'
    const eventId = crypto.randomUUID()
    
    console.log('📝 Creating sync event manually...')
    const syncEvent = await prisma.syncEvents.create({
      data: {
        eventId: eventId,
        sourceNodeId: nodeId,
        tableName: 'Users',
        operation: 'UPDATE',
        recordId: user.id,
        changeData: updatedUser,
        beforeData: user,
        vectorClock: { [nodeId]: 1 },
        processed: false,
        priority: 5
      }
    })
    
    console.log('✅ Sync event created!')
    console.log(`   Event ID: ${syncEvent.eventId}`)
    console.log(`   Table: ${syncEvent.tableName}`)
    console.log(`   Operation: ${syncEvent.operation}`)
    console.log(`   Record ID: ${syncEvent.recordId}`)
    
    // Check all sync events
    const allEvents = await prisma.syncEvents.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        eventId: true,
        tableName: true,
        operation: true,
        recordId: true,
        sourceNodeId: true,
        processed: true,
        createdAt: true
      }
    })
    
    console.log('\n📋 Recent sync events:')
    allEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
      console.log(`   Record ID: ${event.recordId}`)
      console.log(`   Source Node: ${event.sourceNodeId}`)
      console.log(`   Processed: ${event.processed}`)
      console.log(`   Time: ${new Date(event.createdAt).toLocaleString()}`)
    })
    
    console.log('\n🎯 SUCCESS! Sync event created. Now check:')
    console.log('1. Remote server database for this sync event')
    console.log('2. Remote server UI for the updated user')
    console.log(`3. Look for user: "${updatedUser.name}"`)
    console.log(`4. Event ID: ${syncEvent.eventId}`)
    
  } catch (error) {
    console.error('❌ Failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSyncEventManually().catch(console.error)