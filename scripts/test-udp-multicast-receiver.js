/**
 * Test UDP Multicast Receiver
 * Listens for multicast messages to verify receiving works
 * Run this script on the machine that cannot see the other
 */

const dgram = require('dgram')
const os = require('os')

const MULTICAST_ADDR = '224.0.0.251'
const PORT = 5353

console.log('📡 UDP Multicast Receiver Test')
console.log('═══════════════════════════════════════════════════\n')

// Get local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        if (!net.internal && net.family === 'IPv4') {
          const priority = getInterfacePriority(name, net.address)
          candidates.push({ name, address: net.address, priority })
        }
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates.length > 0 ? candidates[0] : { name: 'unknown', address: '127.0.0.1', priority: 0 }
}

function getInterfacePriority(interfaceName, ipAddress) {
  if (ipAddress.startsWith('169.254.')) return 1
  if (ipAddress.startsWith('10.') && interfaceName.toLowerCase().includes('docker')) return 2

  const lowerName = interfaceName.toLowerCase()
  if (lowerName.includes('wi-fi') || lowerName === 'wifi') return 100
  if (lowerName.includes('ethernet') || lowerName.startsWith('eth')) return 95
  if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.0.')) return 50
  if (lowerName.includes('tailscale') || lowerName.includes('vpn') ||
      lowerName.includes('virtual') || lowerName.includes('vmware') ||
      lowerName.includes('hyper-v') || lowerName.includes('bluetooth')) return 10

  return 30
}

const localInterface = getLocalIPAddress()
console.log(`📍 Local Interface: ${localInterface.name}`)
console.log(`   IP Address: ${localInterface.address}`)
console.log(`   Priority: ${localInterface.priority}`)
console.log(`\n📡 Multicast Configuration:`)
console.log(`   Address: ${MULTICAST_ADDR}:${PORT}`)
console.log(`   Interface: ${localInterface.address}\n`)

// Create UDP socket
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

let messageCount = 0
let lastMessageTime = null

socket.on('listening', () => {
  const address = socket.address()
  console.log(`✅ Socket bound to ${address.address}:${address.port}`)

  // Join multicast group on the specific interface
  try {
    socket.addMembership(MULTICAST_ADDR, localInterface.address)
    console.log(`✅ Joined multicast group ${MULTICAST_ADDR} on ${localInterface.address}\n`)
  } catch (err) {
    console.error(`❌ Failed to join multicast group:`, err.message)
    console.error(`   This might be a firewall or network configuration issue\n`)
  }

  console.log('👂 Listening for multicast messages...')
  console.log('   (Press Ctrl+C to stop)\n')
  console.log('─────────────────────────────────────────────────────\n')

  // Set a timeout to check if we're receiving messages
  setTimeout(() => {
    if (messageCount === 0) {
      console.log('⚠️  No messages received after 15 seconds')
      console.log('\n💡 Possible issues:')
      console.log('   1. Firewall blocking UDP port 5353')
      console.log('   2. No sender running on the network')
      console.log('   3. Different subnet or network')
      console.log('   4. VPN or virtual network interfering')
      console.log('\n   Try running check-sync-firewall.js to diagnose\n')
    }
  }, 15000)
})

socket.on('message', (buffer, remoteInfo) => {
  messageCount++
  lastMessageTime = new Date()

  try {
    // Clean null bytes and parse
    const messageStr = buffer.toString('utf8').replace(/\0/g, '').trim()

    if (!messageStr || !messageStr.startsWith('{')) {
      console.log(`📨 Received non-JSON message from ${remoteInfo.address}:${remoteInfo.port}`)
      console.log(`   Length: ${buffer.length} bytes\n`)
      return
    }

    const message = JSON.parse(messageStr)

    console.log(`✅ Received message ${messageCount} at ${lastMessageTime.toLocaleTimeString()}`)
    console.log(`   From: ${remoteInfo.address}:${remoteInfo.port}`)
    console.log(`   Type: ${message.type || 'unknown'}`)

    if (message.type === 'test') {
      console.log(`   Sender: ${message.sender} (${message.interface})`)
      console.log(`   Hostname: ${message.hostname}`)
      console.log(`   Message #: ${message.messageNumber}`)
      console.log(`   Sent: ${message.timestamp}`)
    } else if (message.type === 'presence') {
      console.log(`   Node: ${message.nodeName} (${message.nodeId})`)
      console.log(`   Service: ${message.serviceName}`)
    }

    console.log('')
  } catch (err) {
    console.log(`📨 Received message ${messageCount} (parse error)`)
    console.log(`   From: ${remoteInfo.address}:${remoteInfo.port}`)
    console.log(`   Length: ${buffer.length} bytes`)
    console.log(`   Error: ${err.message}\n`)
  }
})

socket.on('error', (err) => {
  console.error('❌ Socket error:', err)

  if (err.code === 'EADDRINUSE') {
    console.error('\n⚠️  Port 5353 is already in use')
    console.error('   The sync service might be running. Stop it with:')
    console.error('   npm run sync-service:stop\n')
  }

  socket.close()
  process.exit(1)
})

// Bind to the port
socket.bind(PORT)

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\n📊 Test Summary:')
  console.log(`   Total messages received: ${messageCount}`)
  if (lastMessageTime) {
    console.log(`   Last message: ${lastMessageTime.toLocaleTimeString()}`)
  } else {
    console.log(`   Last message: None`)
  }
  console.log('\n✅ Shutting down receiver...')
  socket.close()
  process.exit(0)
})

console.log('⏳ Initializing receiver...\n')
