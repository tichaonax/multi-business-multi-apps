/**
 * Test Peer Discovery Network Connectivity
 * Listens for multicast discovery messages and shows what's being broadcast
 */

const dgram = require('dgram')
const crypto = require('crypto')

const MULTICAST_ADDRESS = '224.0.0.251'
const MULTICAST_PORT = 5353
const SERVICE_NAME = 'multi-business-sync'

console.log('🔍 Testing Peer Discovery Network\n')
console.log('═══════════════════════════════════════════════════════')
console.log(`Listening on: ${MULTICAST_ADDRESS}:${MULTICAST_PORT}`)
console.log(`Service: ${SERVICE_NAME}`)
console.log('═══════════════════════════════════════════════════════\n')

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
const discoveredPeers = new Set()

socket.on('message', (buffer, rinfo) => {
  try {
    const message = JSON.parse(buffer.toString())
    
    if (message.serviceName === SERVICE_NAME) {
      const peerId = `${message.nodeId}-${message.nodeName}`
      
      if (!discoveredPeers.has(peerId)) {
        discoveredPeers.add(peerId)
        
        console.log(`📡 Discovery Message Received:`)
        console.log(`   From: ${rinfo.address}:${rinfo.port}`)
        console.log(`   Node Name: ${message.nodeName}`)
        console.log(`   Node ID: ${message.nodeId}`)
        console.log(`   IP Address: ${message.ipAddress}`)
        console.log(`   Port: ${message.port}`)
        console.log(`   Message Type: ${message.messageType}`)
        console.log(`   Registration Key Hash: ${message.registrationKeyHash ? message.registrationKeyHash.substring(0, 16) + '...' : 'NONE'}`)
        console.log(`   Capabilities: ${JSON.stringify(message.capabilities || [])}`)
        console.log(`   Timestamp: ${new Date(message.timestamp).toLocaleTimeString()}`)
        console.log('')
      }
    }
  } catch (error) {
    // Ignore non-JSON messages
  }
})

socket.on('error', (error) => {
  console.error('❌ Socket error:', error.message)
  process.exit(1)
})

socket.on('listening', () => {
  const address = socket.address()
  console.log(`✅ Socket listening on ${address.address}:${address.port}`)
  console.log('\n⏳ Waiting for discovery messages...')
  console.log('   (This will show broadcasts from both servers)\n')
  
  try {
    socket.addMembership(MULTICAST_ADDRESS)
    console.log(`✅ Joined multicast group ${MULTICAST_ADDRESS}\n`)
  } catch (error) {
    console.error(`❌ Failed to join multicast group: ${error.message}`)
    console.log('\nThis could mean:')
    console.log('  • Network adapter doesn\'t support multicast')
    console.log('  • Firewall is blocking multicast traffic')
    console.log('  • Network driver issue\n')
  }
})

// Bind to the multicast port
socket.bind(MULTICAST_PORT, () => {
  console.log(`✅ Bound to port ${MULTICAST_PORT}\n`)
})

// Show status every 30 seconds
setInterval(() => {
  console.log(`📊 Status: ${discoveredPeers.size} unique peer(s) discovered so far`)
  
  if (discoveredPeers.size === 0) {
    console.log('   ⚠️  No peers detected. Check:')
    console.log('      • Is the sync service running? (npm run service:status)')
    console.log('      • Is firewall blocking UDP 5353?')
    console.log('      • Are both servers on the same network?')
  } else {
    console.log('   ✅ Receiving discovery broadcasts')
  }
  console.log('')
}, 30000)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📊 Final Summary:')
  console.log(`   Total unique peers discovered: ${discoveredPeers.size}`)
  console.log('\n✅ Test complete')
  socket.close()
  process.exit(0)
})

console.log('💡 Press Ctrl+C to stop listening\n')
console.log('═══════════════════════════════════════════════════════\n')
