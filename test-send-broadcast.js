/**
 * Test if this server can SEND multicast packets
 */

const dgram = require('dgram')
const crypto = require('crypto')
const os = require('os')

const MULTICAST_ADDRESS = '224.0.0.251'
const DISCOVERY_PORT = 5353
const NODE_ID = 'fbb213cb6067502f'
const NODE_NAME = 'sync-node-dell-hwandaza'
const REGISTRATION_KEY = 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        if (!net.internal && net.family === 'IPv4' && net.address.startsWith('192.168.0.')) {
          return net.address
        }
      }
    }
  }
  return '127.0.0.1'
}

const localIP = getLocalIP()
const regHash = crypto.createHash('sha256').update(REGISTRATION_KEY).digest('hex')

console.log(`\n🧪 MANUAL BROADCAST TEST`)
console.log(`=`.repeat(50))
console.log(`Local IP: ${localIP}`)
console.log(`Node: ${NODE_NAME} (${NODE_ID})`)
console.log(`Target: ${MULTICAST_ADDRESS}:${DISCOVERY_PORT}`)
console.log(`=`.repeat(50))

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

socket.on('error', (err) => {
  console.error(`\n❌ Socket error: ${err}`)
  socket.close()
  process.exit(1)
})

const message = {
  type: 'presence',
  nodeId: NODE_ID,
  nodeName: NODE_NAME,
  ipAddress: localIP,
  port: 8765,
  serviceName: 'multi-business-sync',
  registrationKeyHash: regHash,
  capabilities: ['sync-v1', 'compression', 'encryption'],
  timestamp: new Date().toISOString(),
  version: '1.0.0'
}

const messageBuffer = Buffer.from(JSON.stringify(message))

console.log(`\n📤 Sending broadcast...`)
console.log(`   Message size: ${messageBuffer.length} bytes`)

socket.send(
  messageBuffer,
  0,
  messageBuffer.length,
  DISCOVERY_PORT,
  MULTICAST_ADDRESS,
  (err) => {
    if (err) {
      console.error(`\n❌ Send failed: ${err}`)
    } else {
      console.log(`\n✅ Broadcast sent successfully!`)
      console.log(`\n💡 Now run debug-peer-discovery.js on Server 2 to see if it receives this.`)
    }

    socket.close()
    process.exit(err ? 1 : 0)
  }
)
