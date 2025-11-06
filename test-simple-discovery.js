/**
 * Simple UDP Multicast Test
 * Tests if UDP multicast is working on your network
 */

const dgram = require('dgram')

const MULTICAST_ADDR = '224.0.0.251'
const MULTICAST_PORT = 5353

console.log('🧪 Testing UDP Multicast Communication\n')
console.log('This will:')
console.log('  1. Join multicast group 224.0.0.251')
console.log('  2. Listen for ANY messages on port 5353')
console.log('  3. Send a test broadcast every 5 seconds')
console.log('  4. Show what messages are received\n')
console.log('Run this on BOTH servers simultaneously\n')
console.log('═══════════════════════════════════════════════════════\n')

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
let messageCount = 0

socket.on('message', (msg, rinfo) => {
  messageCount++
  console.log(`📨 Message ${messageCount} received:`)
  console.log(`   From: ${rinfo.address}:${rinfo.port}`)
  console.log(`   Size: ${msg.length} bytes`)
  
  try {
    const parsed = JSON.parse(msg.toString())
    console.log(`   Content: ${JSON.stringify(parsed, null, 2)}`)
  } catch (e) {
    console.log(`   Content (raw): ${msg.toString().substring(0, 100)}`)
  }
  console.log('')
})

socket.on('listening', () => {
  console.log('✅ Socket bound and listening')
  
  try {
    socket.addMembership(MULTICAST_ADDR)
    console.log(`✅ Joined multicast group ${MULTICAST_ADDR}`)
    console.log(`✅ Listening on port ${MULTICAST_PORT}\n`)
    
    // Send test message every 5 seconds
    setInterval(() => {
      const testMsg = JSON.stringify({
        test: 'discovery-test',
        timestamp: new Date().toISOString(),
        from: require('os').hostname()
      })
      
      socket.send(testMsg, MULTICAST_PORT, MULTICAST_ADDR, (err) => {
        if (err) {
          console.log(`❌ Send error: ${err.message}`)
        } else {
          console.log(`📤 Test broadcast sent from ${require('os').hostname()}`)
        }
      })
    }, 5000)
    
  } catch (err) {
    console.error(`❌ Failed to join multicast group: ${err.message}`)
  }
})

socket.on('error', (err) => {
  console.error(`❌ Socket error: ${err.message}`)
})

socket.bind(MULTICAST_PORT)

console.log('⏳ Waiting for messages...')
console.log('   Press Ctrl+C to stop\n')

// Show summary every 30 seconds
setInterval(() => {
  console.log(`📊 Messages received so far: ${messageCount}`)
  if (messageCount === 0) {
    console.log('   ⚠️  Not receiving any multicast traffic')
    console.log('   This could mean:')
    console.log('      • Firewall blocking UDP 5353')
    console.log('      • Network doesn\'t support multicast')
    console.log('      • Sync service not broadcasting')
  }
  console.log('')
}, 30000)
