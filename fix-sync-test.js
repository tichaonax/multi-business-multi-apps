// Quick fix test - install sync helper manually and test
const { PrismaClient } = require('@prisma/client')
const { SyncHelper } = require('./src/lib/sync/sync-helper')
const { generateNodeId } = require('./src/lib/sync/sync-helper')

async function fixAndTestSync() {
  console.log('=== Manual Sync Helper Installation Test ===\n')
  
  const prisma = new PrismaClient()
  
  try {
    // Manually install sync helper (like the main app should do)
    const nodeId = generateNodeId()
    const registrationKey = process.env.SYNC_REGISTRATION_KEY || 'default-key'
    
    console.log(`🔧 Installing sync helper manually...`)
    console.log(`   Node ID: ${nodeId}`)
    console.log(`   Registration Key: ${registrationKey ? 'Set' : 'Not set'}`)
    
    const syncHelper = new SyncHelper(prisma, {
      nodeId,
      registrationKey,
      enabled: true
    })
    
    // Attach to prisma client
    prisma.syncHelper = syncHelper
    console.log('✅ Sync helper installed manually')
    
    // Now test it
    const user = await prisma.users.findFirst()
    if (!user) {
      console.log('❌ No users found to test with')
      return
    }
    
    console.log(`👤 Testing with user: ${user.name} (${user.email})`)
    
    // Check initial sync events
    const initialEvents = await prisma.syncEvents.count()
    console.log(`📊 Initial sync events: ${initialEvents}`)
    
    // Update user with manual tracking
    const timestamp = new Date().toISOString().slice(11,19)
    
    const oldUserData = { ...user }
    
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { 
        name: user.name.replace(/ \(.*Test.*\)$/, '') + ` (Fixed Sync ${timestamp})`,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ User updated: ${updatedUser.name}`)
    
    // Track the change manually
    console.log('📝 Tracking sync event...')
    await syncHelper.trackUpdate('Users', user.id, updatedUser, oldUserData)
    console.log('✅ Sync event tracked!')
    
    // Check results
    const finalEvents = await prisma.syncEvents.count()
    console.log(`📊 Final sync events: ${finalEvents}`)
    
    if (finalEvents > initialEvents) {
      console.log('🎉 SUCCESS: Sync is now working!')
      console.log(`   Events created: ${finalEvents - initialEvents}`)
      
      // Show recent events
      const recentEvents = await prisma.syncEvents.findMany({
        take: 2,
        orderBy: { createdAt: 'desc' },
        select: {
          eventId: true,
          tableName: true,
          operation: true,
          recordId: true,
          nodeId: true,
          processed: true,
          createdAt: true
        }
      })
      
      console.log('\n📋 Recent sync events:')
      recentEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
        console.log(`   Record ID: ${event.recordId}`)
        console.log(`   Node ID: ${event.nodeId}`)
        console.log(`   Processed: ${event.processed}`)
        console.log(`   Created: ${new Date(event.createdAt).toLocaleString()}`)
      })
      
      console.log('\n🔍 Next Step: Check the remote server to see if this sync event appears!')
      console.log('   The sync service should pick up this event and transmit it.')
      
    } else {
      console.log('❌ Sync event creation failed')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAndTestSync().catch(console.error)