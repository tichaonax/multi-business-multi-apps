/**
 * Check Windows Firewall Rules for Sync Service
 * Verifies that firewall allows UDP multicast discovery on port 5353
 */

const { execSync } = require('child_process')

console.log('🔥 Checking Windows Firewall Rules for Sync Service')
console.log('═══════════════════════════════════════════════════\n')

try {
  // Check for sync-related firewall rules
  console.log('📋 Searching for sync-related firewall rules...\n')

  try {
    const rules = execSync('netsh advfirewall firewall show rule name=all | findstr /i "sync multi-business 5353 8765"', { encoding: 'utf8' })
    console.log('✅ Found firewall rules:')
    console.log(rules)
  } catch (err) {
    console.log('⚠️  No sync-related firewall rules found\n')
  }

  // Check specifically for UDP 5353
  console.log('\n📋 Checking for UDP port 5353 rules...\n')

  try {
    const udpRules = execSync('netsh advfirewall firewall show rule name=all | findstr /i "5353"', { encoding: 'utf8' })
    console.log('✅ Found rules for port 5353:')
    console.log(udpRules)
  } catch (err) {
    console.log('❌ No firewall rules found for port 5353\n')
  }

  // Check firewall state
  console.log('\n📋 Checking Windows Firewall status...\n')

  try {
    const firewallState = execSync('netsh advfirewall show allprofiles state', { encoding: 'utf8' })
    console.log(firewallState)
  } catch (err) {
    console.log('⚠️  Could not check firewall status:', err.message)
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('💡 RECOMMENDATIONS')
  console.log('═══════════════════════════════════════════════════\n')

  console.log('If no UDP 5353 rule was found, add one with:')
  console.log('\n📝 PowerShell (Run as Administrator):\n')
  console.log('New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" `')
  console.log('  -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow\n')
  console.log('New-NetFirewallRule -DisplayName "Multi-Business Sync Data" `')
  console.log('  -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow\n')

  console.log('📝 Or using netsh (Run as Administrator):\n')
  console.log('netsh advfirewall firewall add rule name="Multi-Business Sync Discovery" dir=in action=allow protocol=UDP localport=5353')
  console.log('netsh advfirewall firewall add rule name="Multi-Business Sync Data" dir=in action=allow protocol=TCP localport=8765\n')

  console.log('═══════════════════════════════════════════════════')
  console.log('🧪 TESTING')
  console.log('═══════════════════════════════════════════════════\n')

  console.log('After adding firewall rules:')
  console.log('1. Run this script again to verify rules were added')
  console.log('2. Restart sync service: npm run sync-service:restart')
  console.log('3. Check logs: tail -50 data/sync/sync-service.log')
  console.log('4. Look for "Discovered new peer" messages\n')

} catch (error) {
  console.error('❌ Error checking firewall:', error.message)
  console.error('\n⚠️  Make sure you\'re running this on Windows with administrator privileges\n')
}
