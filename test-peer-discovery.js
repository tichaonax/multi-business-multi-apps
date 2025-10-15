/**
 * Manual peer discovery test - check if we can discover other servers
 * This helps debug if the second server is running and discoverable
 */

const dgram = require('dgram')
const crypto = require('crypto')

const MULTICAST_ADDRESS = '224.0.0.251'
const MULTICAST_PORT = 5353
const SERVICE_NAME = 'multi-business-sync'

function createTestMessage() {
  return {
    nodeId: 'test-discovery-' + Date.now(),
    nodeName: `test-node-${require('os').hostname()}`,
    serviceName: SERVICE_NAME,
    ipAddress: '192.168.0.108', // This server's IP
    port: 8765,
    registrationKey: 'test-key',
    messageType: 'presence',
    timestamp: Date.now(),
    capabilities: {
      encryption: true,
      compression: true,
      vectorClocks: true,
      conflictResolution: true
    }
  }
}

async function testPeerDiscovery() {
  console.log('🔍 Testing Peer Discovery...\n')
  
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  let discovered = []
  
  // Listen for responses
  socket.on('message', (buffer, rinfo) => {
    try {
      const message = JSON.parse(buffer.toString())
      
      if (message.serviceName === SERVICE_NAME && message.messageType === 'presence') {
        const isNewPeer = !discovered.find(p => p.nodeId === message.nodeId)
        
        if (isNewPeer) {
          discovered.push(message)
          console.log(`📡 Discovered peer: ${message.nodeName}`)
          console.log(`   📋 Node ID: ${message.nodeId}`)
          console.log(`   🌐 Address: ${message.ipAddress}:${message.port}`) 
          console.log(`   📍 From: ${rinfo.address}:${rinfo.port}`)
          console.log(`   🛠️  Capabilities: ${JSON.stringify(message.capabilities)}`)
          console.log('')
        }
      }
    } catch (error) {
      console.log(`❌ Failed to parse message from ${rinfo.address}: ${error.message}`)
    }
  })
  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error)
  })
  
  // Bind and join multicast group
  await new Promise((resolve, reject) => {
    socket.bind(MULTICAST_PORT, () => {
      try {
        socket.addMembership(MULTICAST_ADDRESS)
        console.log(`📻 Listening on multicast ${MULTICAST_ADDRESS}:${MULTICAST_PORT}`)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
  
  // Send discovery message
  const testMessage = createTestMessage()
  const messageBuffer = Buffer.from(JSON.stringify(testMessage))
  
  console.log('📤 Sending discovery message...')
  socket.send(messageBuffer, MULTICAST_PORT, MULTICAST_ADDRESS, (error) => {
    if (error) {
      console.error('❌ Failed to send discovery message:', error)
    } else {
      console.log('✅ Discovery message sent')
    }
  })
  
  // Wait for responses
  console.log('⏳ Waiting 10 seconds for peer responses...\n')
  
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  // Results
  console.log('📊 Discovery Results:')
  console.log(`   Total peers discovered: ${discovered.length}`)
  
  if (discovered.length === 0) {
    console.log('\n📡 No peers discovered. This could mean:')
    console.log('   - The second server is not running the sync service')
    console.log('   - Network/firewall is blocking multicast traffic')  
    console.log('   - The second server is using a different registration key')
    console.log('   - The service is not using the updated discovery code')
  } else {
    console.log('\n🎉 Found active peers!')
    discovered.forEach((peer, index) => {
      console.log(`${index + 1}. ${peer.nodeName} (${peer.nodeId})`)
      console.log(`   Address: ${peer.ipAddress}:${peer.port}`)
    })
  }
  
  socket.close()
  console.log('\n✅ Peer discovery test completed')
}

testPeerDiscovery().catch(console.error)