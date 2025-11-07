/**
 * Test UDP Multicast Sender
 * Broadcasts test messages on multicast address to verify sending works
 * Run this script on the machine that others cannot see
 */

const dgram = require('dgram')
const os = require('os')

const MULTICAST_ADDR = '224.0.0.251'
const PORT = 5353
const INTERVAL = 3000 // Send every 3 seconds

console.log('📡 UDP Multicast Sender Test')
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
console.log(`   Interval: ${INTERVAL}ms\n`)

// Create UDP socket
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

let messageCount = 0

socket.on('listening', () => {
  const address = socket.address()
  console.log(`✅ Socket listening on ${address.address}:${address.port}\n`)
  console.log('📤 Starting to broadcast test messages...')
  console.log('   (Press Ctrl+C to stop)\n')
  console.log('─────────────────────────────────────────────────────\n')

  // Send test messages periodically
  setInterval(() => {
    messageCount++

    const message = {
      type: 'test',
      sender: localInterface.address,
      interface: localInterface.name,
      messageNumber: messageCount,
      timestamp: new Date().toISOString(),
      hostname: os.hostname()
    }

    const messageBuffer = Buffer.from(JSON.stringify(message))

    socket.send(messageBuffer, 0, messageBuffer.length, PORT, MULTICAST_ADDR, (err) => {
      if (err) {
        console.error(`❌ Error sending message ${messageCount}:`, err.message)
      } else {
        console.log(`✅ Sent message ${messageCount} at ${new Date().toLocaleTimeString()}`)
        console.log(`   From: ${message.sender} (${message.interface})`)
        console.log(`   To: ${MULTICAST_ADDR}:${PORT}\n`)
      }
    })
  }, INTERVAL)
})

socket.on('error', (err) => {
  console.error('❌ Socket error:', err)
  socket.close()
  process.exit(1)
})

// Bind to any address
socket.bind(PORT)

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\n📊 Test Summary:')
  console.log(`   Total messages sent: ${messageCount}`)
  console.log('\n✅ Shutting down sender...')
  socket.close()
  process.exit(0)
})

console.log('⏳ Initializing sender...\n')
