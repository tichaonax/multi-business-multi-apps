// Proper sync test with correct nodeId and registration key
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

async function createProperSyncEvent() {
  console.log('=== Creating Proper Sync Event (with valid credentials) ===\n')
  
  const prisma = new PrismaClient()
  
  try {
    // Use the actual nodeId and registration key from .env
    const nodeId = process.env.SYNC_NODE_ID || '2595930f841f02e1'
    const registrationKey = process.env.SYNC_REGISTRATION_KEY || 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'
    
    console.log(`🔧 Using Node ID: ${nodeId}`)
    console.log(`🔐 Registration Key: ${registrationKey ? 'Set' : 'Not set'}`)
    
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
        name: user.name.replace(/ \(.*Test.*\)$/, '') + ` (Authorized Test ${timestamp})`,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ User updated: ${updatedUser.name}`)
    
    // Create sync event with proper credentials
    const eventId = crypto.randomUUID()
    
    console.log('📝 Creating authorized sync event...')
    const syncEvent = await prisma.syncEvents.create({
      data: {
        eventId: eventId,
        sourceNodeId: nodeId,  // Use proper nodeId from .env
        tableName: 'Users',
        operation: 'UPDATE',
        recordId: user.id,
        changeData: updatedUser,
        beforeData: user,
        vectorClock: { [nodeId]: Date.now() }, // Use timestamp for vector clock
        processed: false,
        priority: 5
      }
    })
    
    console.log('✅ Authorized sync event created!')
    console.log(`   Event ID: ${syncEvent.eventId}`)
    console.log(`   Source Node: ${syncEvent.sourceNodeId}`)
    console.log(`   Table: ${syncEvent.tableName}`)
    console.log(`   Operation: ${syncEvent.operation}`)
    
    // Check recent events
    const recentEvents = await prisma.syncEvents.findMany({
      where: { sourceNodeId: nodeId },
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
    
    console.log(`\n📋 Recent events from node ${nodeId}:`)
    recentEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
      console.log(`   Event ID: ${event.eventId.slice(0,8)}...`)
      console.log(`   Record ID: ${event.recordId.slice(0,8)}...`)
      console.log(`   Processed: ${event.processed}`)
      console.log(`   Time: ${new Date(event.createdAt).toLocaleString()}`)
    })
    
    console.log('\n🎯 SUCCESS! Properly authorized sync event created.')
    console.log('This should NOT be rejected by the sync service.')
    console.log('\nNext steps:')
    console.log('1. Check remote server for this sync event')
    console.log('2. Verify no "Rejected unauthorized event" messages')
    console.log(`3. Look for user: "${updatedUser.name}"`)
    
    return { syncEvent, updatedUser }
    
  } catch (error) {
    console.error('❌ Failed:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
}

createProperSyncEvent().then(result => {
  if (result) {
    console.log('\n🔄 Authorized sync test completed!')
  }
}).catch(console.error)