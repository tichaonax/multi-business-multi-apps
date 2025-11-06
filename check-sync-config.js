/**
 * Quick Sync Service Diagnostic
 * Tests if sync configuration is working and shows registration key hash
 */

const crypto = require('crypto')
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Sync Service Configuration Check\n')
console.log('═══════════════════════════════════════════════════════\n')

const syncConfig = {
  nodeId: process.env.SYNC_NODE_ID,
  nodeName: process.env.SYNC_NODE_NAME,
  registrationKey: process.env.SYNC_REGISTRATION_KEY,
  servicePort: process.env.SYNC_SERVICE_PORT,
  discoveryPort: 5353
}

console.log('📋 Configuration:')
console.log(`   Node ID: ${syncConfig.nodeId}`)
console.log(`   Node Name: ${syncConfig.nodeName}`)
console.log(`   Service Port: ${syncConfig.servicePort}`)
console.log(`   Discovery Port: ${syncConfig.discoveryPort}`)

if (syncConfig.registrationKey) {
  const hash = crypto.createHash('sha256')
    .update(syncConfig.registrationKey)
    .digest('hex')
  
  console.log(`\n🔑 Registration Key:`)
  console.log(`   Length: ${syncConfig.registrationKey.length} characters`)
  console.log(`   Hash: ${hash}`)
  console.log(`   Short Hash: ${hash.substring(0, 16)}...`)
} else {
  console.log('\n❌ SYNC_REGISTRATION_KEY is not set!')
}

console.log('\n═══════════════════════════════════════════════════════')
console.log('\n💡 On Server 2, run this same script and compare:')
console.log('   • Registration Key Hash must MATCH exactly')
console.log('   • Node ID must be DIFFERENT')
console.log('   • Node Name must be DIFFERENT')
console.log('\n═══════════════════════════════════════════════════════\n')
