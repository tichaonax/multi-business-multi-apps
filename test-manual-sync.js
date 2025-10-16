// Manual Sync Test - demonstrates how to use sync tracking with Prisma 6.x
const { PrismaClient } = require('@prisma/client')

async function testManualSync() {
  console.log('=== Testing Manual Sync (Prisma 6.x Compatible) ===\n')
  
  const prisma = new PrismaClient()
  
  try {
    // Check if sync helper is available on the main prisma instance
    const syncHelperAvailable = !!prisma.syncHelper
    console.log(`🔧 Sync Helper Available: ${syncHelperAvailable}`)
    
    if (!syncHelperAvailable) {
      console.log('❌ Sync helper not available - this explains why sync is not working!')
      console.log('💡 The main application Prisma client needs sync helper installed')
      return
    }
    
    // Get a user to test with
    const user = await prisma.users.findFirst()
    if (!user) {
      console.log('❌ No users found to test with')
      return
    }
    
    console.log(`👤 Testing with user: ${user.name} (${user.email})`)
    
    // Check initial sync events count
    const initialEvents = await prisma.syncEvents.count()
    console.log(`📊 Initial sync events: ${initialEvents}`)
    
    // Update user - but now we need to manually track the change
    console.log('\n🔄 Updating user with MANUAL sync tracking...')
    const timestamp = new Date().toISOString().slice(11,19)
    
    // Get the old data before update
    const oldUserData = await prisma.users.findUnique({
      where: { id: user.id }
    })
    
    // Perform the update
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { 
        name: user.name.replace(/ \(Test.*\)$/, '') + ` (Manual Test ${timestamp})`,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ User updated: ${updatedUser.name}`)
    
    // MANUALLY track the sync event using sync helper
    if (prisma.syncHelper) {
      console.log('📝 Manually tracking sync event...')
      await prisma.syncHelper.trackUpdate(
        'Users', 
        user.id, 
        updatedUser, 
        oldUserData
      )
      console.log('✅ Sync event manually tracked!')
    }
    
    // Check if sync event was created
    const finalEvents = await prisma.syncEvents.count()
    console.log(`📊 Final sync events: ${finalEvents}`)
    
    if (finalEvents > initialEvents) {
      console.log('🎉 SUCCESS: Manual sync tracking worked!')
      console.log(`   New events created: ${finalEvents - initialEvents}`)
      
      // Show the new events
      const newEvents = await prisma.syncEvents.findMany({
        take: 2,
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
      })
      
    } else {
      console.log('❌ Manual sync tracking failed')
    }
    
    console.log('\n💡 SOLUTION: To fix sync, you need to manually call sync tracking after each database operation:')
    console.log('   - After CREATE: await prisma.syncHelper.trackCreate(tableName, recordId, data)')
    console.log('   - After UPDATE: await prisma.syncHelper.trackUpdate(tableName, recordId, newData, oldData)')
    console.log('   - After DELETE: await prisma.syncHelper.trackDelete(tableName, recordId, data)')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testManualSync().catch(console.error)