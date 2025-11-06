const { networkInterfaces } = require('os')

function getInterfacePriority(interfaceName, ipAddress) {
  // Exclude APIPA/link-local addresses (169.254.x.x)
  if (ipAddress.startsWith('169.254.')) {
    return 1 // Very low priority
  }

  // Exclude other reserved/private ranges that shouldn't be used for sync
  if (ipAddress.startsWith('10.') && interfaceName.toLowerCase().includes('docker')) {
    return 2 // Low priority for Docker interfaces
  }

  const lowerName = interfaceName.toLowerCase()

  // High priority for standard network interfaces
  if (lowerName.includes('wi-fi') || lowerName === 'wifi') {
    return 100 // Highest priority for Wi-Fi
  }
  if (lowerName.includes('ethernet') || lowerName.startsWith('eth')) {
    return 95 // High priority for Ethernet
  }

  // Medium priority for standard private networks
  if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.0.')) {
    return 50
  }

  // Low priority for VPN and virtual interfaces
  if (lowerName.includes('tailscale') || lowerName.includes('vpn') ||
      lowerName.includes('virtual') || lowerName.includes('vmware') ||
      lowerName.includes('hyper-v') || lowerName.includes('bluetooth')) {
    return 10
  }

  // Default priority for other interfaces
  return 30
}

function getLocalIPAddress() {
  const interfaces = networkInterfaces()
  const candidates = []

  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        // Skip internal interfaces and IPv6
        if (!net.internal && net.family === 'IPv4') {
          const priority = getInterfacePriority(name, net.address)
          candidates.push({ name, address: net.address, priority })
          console.log(`  ${name}: ${net.address} (priority: ${priority})`)
        }
      }
    }
  }

  // Sort by priority (higher is better) and return the best candidate
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority)
    console.log(`\n✅ SELECTED: ${candidates[0].address} from ${candidates[0].name} (priority: ${candidates[0].priority})`)
    return candidates[0].address
  }

  return '127.0.0.1' // Fallback
}

console.log('🔍 Testing interface selection:\n')
getLocalIPAddress()
