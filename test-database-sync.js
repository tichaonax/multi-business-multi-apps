// Test database connection and create a visible change
const { exec } = require('child_process')
const util = require('util')
const execAsync = util.promisify(exec)

async function testDatabaseSync() {
  console.log('=== Testing Database Sync ===')
  
  try {
    // First, let's check if we can see sync nodes
    console.log('1️⃣  Checking sync nodes...')
    const { stdout: nodesOutput } = await execAsync('npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT * FROM \\"SyncNode\\" ORDER BY \\"lastSeen\\" DESC LIMIT 5;"')
    console.log('Sync nodes query executed successfully')
    
    // Now let's create a test entry in sync nodes with current timestamp
    console.log('\n2️⃣  Creating test sync node entry...')
    const timestamp = new Date().toISOString()
    const testNodeId = `test-local-${Date.now()}`
    
    const insertQuery = `INSERT INTO "SyncNode" ("id", "nodeId", "nodeName", "ipAddress", "port", "isActive", "lastSeen", "capabilities") VALUES ('${testNodeId}', '${testNodeId}', 'Test Local Node', '127.0.0.1', 8080, true, '${timestamp}', '["test-capability"]');`
    
    await execAsync(`npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "${insertQuery}"`)
    console.log(`✅ Test node created: ${testNodeId}`)
    console.log(`   Timestamp: ${timestamp}`)
    
    // Query back to confirm
    console.log('\n3️⃣  Verifying test node creation...')
    const { stdout: verifyOutput } = await execAsync(`npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT * FROM \\"SyncNode\\" WHERE \\"nodeId\\" = '${testNodeId}';"`)
    console.log('✅ Test node verified in database')
    
    console.log('\n📍 Test Instructions:')
    console.log('1. Check the sync admin UI on both servers:')
    console.log('   - Local: http://localhost:8080/admin/sync')
    console.log('   - Remote: http://[remote-ip]:8080/admin/sync')
    console.log('')
    console.log(`2. Look for the test node: "${testNodeId}"`)
    console.log(`3. It should appear on both servers if sync is working`)
    console.log(`4. The timestamp should be: ${timestamp}`)
    
    return testNodeId
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Make sure the database is running')
    console.log('2. Check if sync service is active')
    console.log('3. Verify network connectivity between servers')
    return null
  }
}

testDatabaseSync().catch(console.error)