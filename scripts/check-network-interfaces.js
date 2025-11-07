/**
 * Check Network Interfaces
 * Shows all network interfaces and their priorities for sync service
 */

const os = require('os')

console.log('🌐 Network Interface Analysis for Sync Service')
console.log('═══════════════════════════════════════════════════\n')

console.log(`💻 Hostname: ${os.hostname()}`)
console.log(`🖥️  Platform: ${os.platform()} ${os.release()}\n`)

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

function getPriorityLabel(priority) {
  if (priority >= 90) return '🟢 HIGHEST (Will be selected)'
  if (priority >= 50) return '🟡 HIGH'
  if (priority >= 30) return '🟠 MEDIUM'
  if (priority >= 10) return '🔴 LOW'
  return '⚫ VERY LOW'
}

const interfaces = os.networkInterfaces()
const candidates = []

console.log('📋 All Network Interfaces:\n')

for (const [name, nets] of Object.entries(interfaces)) {
  console.log(`🔌 ${name}`)

  if (nets) {
    for (const net of nets) {
      const isIPv4 = net.family === 'IPv4'
      const icon = isIPv4 ? '  📍' : '  📍'

      console.log(`${icon} ${net.family}: ${net.address}`)
      console.log(`     MAC: ${net.mac}`)
      console.log(`     Internal: ${net.internal ? 'Yes' : 'No'}`)

      if (isIPv4 && !net.internal) {
        const priority = getInterfacePriority(name, net.address)
        const label = getPriorityLabel(priority)
        console.log(`     Priority: ${priority} - ${label}`)

        candidates.push({
          name,
          address: net.address,
          mac: net.mac,
          priority,
          label
        })
      }

      console.log('')
    }
  }
}

console.log('═══════════════════════════════════════════════════')
console.log('🎯 Interface Selection for Sync Service')
console.log('═══════════════════════════════════════════════════\n')

if (candidates.length === 0) {
  console.log('❌ No suitable network interfaces found!')
  console.log('   Make sure you have an active network connection\n')
} else {
  candidates.sort((a, b) => b.priority - a.priority)

  console.log('📊 Ranked Interfaces (highest priority first):\n')

  candidates.forEach((candidate, index) => {
    const marker = index === 0 ? '👉' : '  '
    console.log(`${marker} ${index + 1}. ${candidate.name}`)
    console.log(`     Address: ${candidate.address}`)
    console.log(`     Priority: ${candidate.priority} - ${candidate.label}`)
    console.log('')
  })

  const selected = candidates[0]
  console.log('═══════════════════════════════════════════════════')
  console.log('✅ SELECTED INTERFACE')
  console.log('═══════════════════════════════════════════════════\n')

  console.log(`   Name: ${selected.name}`)
  console.log(`   IP Address: ${selected.address}`)
  console.log(`   Priority: ${selected.priority}`)
  console.log(`   ${selected.label}\n`)

  console.log('This interface will be used for:')
  console.log('  • Sending multicast discovery broadcasts')
  console.log('  • Receiving multicast discovery messages')
  console.log('  • Sync data transfer\n')
}

console.log('═══════════════════════════════════════════════════')
console.log('💡 TROUBLESHOOTING')
console.log('═══════════════════════════════════════════════════\n')

console.log('If the wrong interface is selected:')
console.log('  1. Disable VPN/virtual adapters temporarily')
console.log('  2. Check that Wi-Fi or Ethernet has priority > 50')
console.log('  3. Ensure both machines are on the same network\n')

console.log('Common issues:')
console.log('  • VPN active (Tailscale, etc.) - priority 10')
console.log('  • Link-local address (169.254.x.x) - priority 1')
console.log('  • Docker network active - priority 2')
console.log('  • Wrong interface selected due to naming\n')

console.log('To check what the sync service is using:')
console.log('  tail -50 data/sync/sync-service.log | grep "Selected IP"\n')
