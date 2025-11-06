/**
 * Real-time Peer Discovery Debugging Tool
 * Shows exactly what multicast packets are being sent/received
 */

const dgram = require('dgram')
const crypto = require('crypto')
const { networkInterfaces } = require('os')

const MULTICAST_ADDRESS = '224.0.0.251'
const DISCOVERY_PORT = 5353
const REGISTRATION_KEY = process.env.SYNC_REGISTRATION_KEY || 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

function getLocalIPAddress() {
  const interfaces = networkInterfaces()
  const candidates = []

  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        if (!net.internal && net.family === 'IPv4') {
          let priority = 30
          const lowerName = name.toLowerCase()
          const ip = net.address

          // Priority logic
          if (ip.startsWith('169.254.')) priority = 1
          else if (ip.startsWith('10.') && lowerName.includes('docker')) priority = 2
          else if (lowerName.includes('wi-fi') || lowerName === 'wifi') priority = 100
          else if (lowerName.includes('ethernet') || lowerName.startsWith('eth')) priority = 95
          else if (ip.startsWith('192.168.') || ip.startsWith('10.0.')) priority = 50
          else if (lowerName.includes('tailscale') || lowerName.includes('vpn') ||
                   lowerName.includes('virtual') || lowerName.includes('vmware') ||
                   lowerName.includes('hyper-v') || lowerName.includes('bluetooth')) priority = 10

          candidates.push({ name, address: ip, priority })
        }
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0]
}

console.log('\n🔍 PEER DISCOVERY DEBUG TOOL')
console.log('=' .repeat(60))

const localInterface = getLocalIPAddress()
console.log(`\n📡 Local Network Interface:`)
console.log(`   Name: ${localInterface.name}`)
console.log(`   IP: ${localInterface.address}`)
console.log(`   Priority: ${localInterface.priority}`)

const expectedHash = hashKey(REGISTRATION_KEY)
console.log(`\n🔐 Registration Key Hash:`)
console.log(`   ${expectedHash.substring(0, 32)}...`)

console.log(`\n👂 Listening for multicast traffic on ${MULTICAST_ADDRESS}:${DISCOVERY_PORT}`)
console.log(`   (Joining multicast on interface ${localInterface.address})`)
console.log('\n' + '='.repeat(60))

// Create UDP socket
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

socket.on('error', (err) => {
  console.error(`\n❌ Socket error: ${err}`)
  socket.close()
})

socket.on('message', (buffer, remoteInfo) => {
  try {
    const messageStr = buffer.toString('utf8').replace(/\0/g, '').trim()

    if (!messageStr || !messageStr.startsWith('{')) {
      return // Skip non-JSON
    }

    const message = JSON.parse(messageStr)

    const timestamp = new Date().toLocaleTimeString()
    console.log(`\n[${timestamp}] 📨 RECEIVED from ${remoteInfo.address}:${remoteInfo.port}`)
    console.log(`   Type: ${message.type || 'unknown'}`)

    if (message.type === 'presence') {
      console.log(`   Node: ${message.nodeName} (${message.nodeId?.substring(0, 8)}...)`)
      console.log(`   Service: ${message.serviceName}`)
      console.log(`   IP: ${message.ipAddress}:${message.port}`)
      console.log(`   Reg Hash: ${message.registrationKeyHash?.substring(0, 16)}...`)

      // Check if registration key matches
      if (message.registrationKeyHash === expectedHash) {
        console.log(`   ✅ Registration key MATCHES`)
      } else {
        console.log(`   ❌ Registration key MISMATCH`)
        console.log(`      Expected: ${expectedHash.substring(0, 16)}...`)
        console.log(`      Got:      ${message.registrationKeyHash?.substring(0, 16)}...`)
      }
    } else if (message.type === 'goodbye') {
      console.log(`   Node ${message.nodeId?.substring(0, 8)}... leaving`)
    }
  } catch (err) {
    // Ignore parsing errors from other mDNS services
  }
})

socket.on('listening', () => {
  const address = socket.address()
  console.log(`\n✅ Socket bound to ${address.address}:${address.port}`)

  try {
    // Join multicast group on specific interface
    socket.addMembership(MULTICAST_ADDRESS, localInterface.address)
    console.log(`✅ Joined multicast group ${MULTICAST_ADDRESS} on ${localInterface.address}`)
  } catch (err) {
    console.error(`❌ Failed to join multicast: ${err.message}`)
  }

  console.log(`\n⏳ Waiting for multicast packets... (Press Ctrl+C to stop)`)
})

// Bind to discovery port
socket.bind(DISCOVERY_PORT)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...')
  socket.close()
  process.exit(0)
})
