// Create a test sync event manually
const fs = require('fs')
const crypto = require('crypto')

async function createTestSyncEvent() {
  console.log('=== Creating Test Sync Event ===')
  
  // Generate a test sync event
  const timestamp = new Date().toISOString()
  const testId = crypto.randomUUID()
  
  const syncEvent = {
    id: testId,
    tableName: 'TestSync',
    operation: 'INSERT',
    recordId: `test-${Date.now()}`,
    data: {
      message: 'This is a test sync message',
      timestamp: timestamp,
      server: 'local-server',
      testValue: Math.floor(Math.random() * 1000)
    },
    nodeId: 'local-node',
    createdAt: timestamp,
    version: 1
  }
  
  // Create a test file that simulates sync data
  const testSyncFile = 'test-sync-events.json'
  
  try {
    let existingEvents = []
    if (fs.existsSync(testSyncFile)) {
      const content = fs.readFileSync(testSyncFile, 'utf8')
      existingEvents = JSON.parse(content)
    }
    
    existingEvents.push(syncEvent)
    fs.writeFileSync(testSyncFile, JSON.stringify(existingEvents, null, 2))
    
    console.log('✅ Test sync event created:')
    console.log(`   Event ID: ${syncEvent.id}`)
    console.log(`   Table: ${syncEvent.tableName}`)
    console.log(`   Operation: ${syncEvent.operation}`)
    console.log(`   Record ID: ${syncEvent.recordId}`)
    console.log(`   Timestamp: ${syncEvent.createdAt}`)
    console.log(`   Test Value: ${syncEvent.data.testValue}`)
    console.log('')
    console.log('📍 Test Instructions:')
    console.log(`1. Check if file "${testSyncFile}" exists on this server`)
    console.log('2. Check if the same file appears on the other server')
    console.log('3. The file should contain the test event with the same data')
    console.log('')
    console.log('🔍 You can also check the sync status at:')
    console.log('   Local: http://localhost:8080/admin/sync')
    console.log('   Remote: http://[remote-server-ip]:8080/admin/sync')
    
    return syncEvent
    
  } catch (error) {
    console.error('Error creating test sync event:', error.message)
    return null
  }
}

createTestSyncEvent().then(event => {
  if (event) {
    console.log('\n🎯 Sync test completed! Check the other server for the test file.')
  }
}).catch(console.error)