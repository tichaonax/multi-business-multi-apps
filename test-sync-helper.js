const { PrismaClient } = require('@prisma/client')

async function testSyncHelper() {
  console.log('🧪 Testing New Sync Helper Approach...\n')

  try {
    // Import the compiled sync helper
    const { createSyncPrismaClient, generateNodeId } = require('./dist/sync-helper')
    
    console.log('✅ Successfully imported sync helper')
    
    // Create a sync-enabled client
    const nodeId = generateNodeId()
    const syncClient = createSyncPrismaClient({
      nodeId,
      registrationKey: 'test-key',
      enabled: true
    })
    
    console.log(`🔧 Created sync client with Node ID: ${nodeId}`)
    console.log('🔧 Sync helper attached:', !!syncClient.syncHelper)
    
    // Count initial sync events
    const initialEvents = await syncClient.syncEvents.count()
    console.log(`📊 Initial sync events: ${initialEvents}`)
    
    // Find a user to test with
    const user = await syncClient.users.findFirst()
    if (!user) {
      console.log('❌ No users found to test with')
      return
    }
    
    console.log(`👤 Found user: ${user.name}`)
    
    // Update the user and manually track the change
    console.log('\n🔄 Updating user with manual sync tracking...')
    
    const oldData = { ...user }
    const newData = {
      ...user,
      name: user.name.replace(/ \(Sync.*\)$/, '') + ' (Sync Test ' + new Date().toISOString().slice(11,19) + ')',
      updatedAt: new Date()
    }
    
    // Perform the update
    const updatedUser = await syncClient.users.update({
      where: { id: user.id },
      data: {
        name: newData.name,
        updatedAt: newData.updatedAt
      }
    })
    
    console.log(`✅ User updated: ${updatedUser.name}`)
    
    // Manually track the sync event
    await syncClient.syncHelper.trackUpdate('users', user.id, newData, oldData)
    
    console.log('✅ Sync event tracked manually')
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if sync events were created
    const finalEvents = await syncClient.syncEvents.count()
    console.log(`📊 Final sync events: ${finalEvents}`)
    
    if (finalEvents > initialEvents) {
      console.log('🎉 SUCCESS: Sync events were generated!')
      console.log(`   Generated ${finalEvents - initialEvents} sync event(s)`)
      
      // Show the new events
      const newEvents = await syncClient.syncEvents.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          eventId: true,
          tableName: true,
          operation: true,
          recordId: true,
          processed: true,
          priority: true,
          createdAt: true
        }
      })
      
      console.log('\n📋 New sync events:')
      newEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.operation} on ${event.tableName}`)
        console.log(`   Event ID: ${event.eventId}`)
        console.log(`   Record ID: ${event.recordId}`)
        console.log(`   Priority: ${event.priority}`)
        console.log(`   Processed: ${event.processed}`)
        console.log(`   Created: ${new Date(event.createdAt).toLocaleString()}`)
        console.log('')
      })
      
    } else {
      console.log('❌ No sync events were generated')
    }
    
    await syncClient.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    
    if (error.message.includes('Cannot find module')) {
      console.log('💡 The compiled sync helper was not found')
      console.log('   Try running: npx tsc src/lib/sync/sync-helper.ts --outDir ./dist --target es2020 --module commonjs')
    }
  }
}

testSyncHelper()