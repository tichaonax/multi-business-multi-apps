/**
 * Test Sync API Endpoint
 * Tests the /api/sync/receive endpoint with proper authentication
 */

require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')

async function testSyncAPI() {
  const nodeId = process.env.SYNC_NODE_ID
  const regKey = process.env.SYNC_REGISTRATION_KEY || ''
  const hash = crypto.createHash('sha256').update(regKey).digest('hex')

  console.log('🧪 Testing Sync API Endpoint')
  console.log('═══════════════════════════════════════════════════\n')

  console.log('📋 Authentication Info:')
  console.log(`   Node ID: ${nodeId}`)
  console.log(`   Reg Hash: ${hash.substring(0, 32)}...\n`)

  const targetIP = '192.168.0.112' // Machine A
  const port = 8080

  const payload = {
    sessionId: 'test-session-' + Date.now(),
    events: [],
    sourceNodeId: nodeId
  }

  console.log(`📡 Testing connection to: http://${targetIP}:${port}/api/sync/receive\n`)

  try {
    const response = await fetch(`http://${targetIP}:${port}/api/sync/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Node-ID': nodeId,
        'X-Registration-Hash': hash
      },
      body: JSON.stringify(payload)
    })

    console.log(`✅ HTTP Status: ${response.status} ${response.statusText}\n`)

    const data = await response.json()
    console.log('📨 Response:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    if (response.ok) {
      console.log('✅ SUCCESS! Sync API is working correctly!')
      console.log('   The sync service should be able to communicate.\n')
    } else {
      console.log('❌ FAILED! Response indicates an error.')
      console.log('   Check the error message above.\n')
    }

  } catch (error) {
    console.error('❌ Connection Error:', error.message)
    console.error('\nPossible issues:')
    console.error('  1. Next.js app not running on Machine A')
    console.error('  2. Firewall blocking port 8080')
    console.error('  3. Machine A is offline')
    console.error('  4. Network connectivity issues\n')
  }

  // Also test local endpoint
  console.log('═══════════════════════════════════════════════════')
  console.log('📡 Testing local endpoint: http://localhost:${port}/api/sync/receive\n')

  try {
    const response = await fetch(`http://localhost:${port}/api/sync/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Node-ID': nodeId,
        'X-Registration-Hash': hash
      },
      body: JSON.stringify(payload)
    })

    console.log(`✅ HTTP Status: ${response.status} ${response.statusText}\n`)

    const data = await response.json()
    console.log('📨 Response:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    if (response.ok) {
      console.log('✅ SUCCESS! Local sync API is working correctly!\n')
    }

  } catch (error) {
    console.error('❌ Local Connection Error:', error.message)
    console.error('   The Next.js app might not be running on this machine.\n')
  }
}

testSyncAPI()
