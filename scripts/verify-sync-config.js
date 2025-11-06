/**
 * Verify Sync Configuration
 * Checks that critical environment variables are properly set for multi-server sync
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    return null
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}

  content.split('\n').forEach(line => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        env[key] = value
      }
    }
  })

  return env
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16)
}

function verifyConfiguration() {
  console.log('🔍 Verifying Multi-Server Sync Configuration\n')

  const envPath = path.join(process.cwd(), '.env.local')
  const env = loadEnvFile(envPath)

  if (!env) {
    console.error('❌ Could not load .env.local file')
    process.exit(1)
  }

  console.log('📋 Current Configuration:')
  console.log('═══════════════════════════════════════════════════════\n')

  // Critical sync settings that MUST match on all servers
  const criticalSettings = [
    'SYNC_REGISTRATION_KEY',
    'NEXTAUTH_SECRET'
  ]

  // Settings that MUST be unique per server
  const uniqueSettings = [
    'SYNC_NODE_ID',
    'SYNC_NODE_NAME'
  ]

  // Settings that should be consistent
  const consistentSettings = [
    'SYNC_SERVICE_PORT',
    'DATABASE_URL',
    'NEXTAUTH_URL'
  ]

  console.log('🔒 CRITICAL - Must Match on All Servers:')
  console.log('─────────────────────────────────────────────────────────')
  criticalSettings.forEach(key => {
    const value = env[key]
    if (value) {
      const hash = hashValue(value)
      console.log(`  ✅ ${key}: [HASH: ${hash}]`)
      console.log(`     Length: ${value.length} characters`)
    } else {
      console.log(`  ❌ ${key}: NOT SET`)
    }
  })

  console.log('\n🏷️  UNIQUE - Must Be Different on Each Server:')
  console.log('─────────────────────────────────────────────────────────')
  uniqueSettings.forEach(key => {
    const value = env[key]
    if (value) {
      console.log(`  ✅ ${key}: ${value}`)
    } else {
      console.log(`  ❌ ${key}: NOT SET`)
    }
  })

  console.log('\n⚙️  CONFIGURATION - Should Be Consistent:')
  console.log('─────────────────────────────────────────────────────────')
  consistentSettings.forEach(key => {
    const value = env[key]
    if (value) {
      console.log(`  ✅ ${key}: ${value}`)
    } else {
      console.log(`  ⚠️  ${key}: NOT SET`)
    }
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('\n📝 INSTRUCTIONS FOR SECOND SERVER:')
  console.log('─────────────────────────────────────────────────────────')
  console.log('1. Copy these EXACT values to the second server\'s .env.local:')
  console.log('')
  console.log(`   SYNC_REGISTRATION_KEY="${env.SYNC_REGISTRATION_KEY || 'NOT_SET'}"`)
  console.log(`   NEXTAUTH_SECRET="${env.NEXTAUTH_SECRET || 'NOT_SET'}"`)
  console.log(`   SYNC_SERVICE_PORT=${env.SYNC_SERVICE_PORT || '8765'}`)
  console.log('')
  console.log('2. Generate UNIQUE values for the second server:')
  console.log('')
  console.log(`   SYNC_NODE_ID="${crypto.randomBytes(8).toString('hex')}"`)
  console.log(`   SYNC_NODE_NAME="sync-node-<unique-name>"`)
  console.log('')
  console.log('3. Update the database URL for the second server if different')
  console.log('')
  console.log('4. Update NEXTAUTH_URL to match the second server\'s address')
  console.log('')
  console.log('5. Restart both servers after updating configuration')
  console.log('═══════════════════════════════════════════════════════\n')

  // Validation checks
  const issues = []

  if (!env.SYNC_REGISTRATION_KEY || env.SYNC_REGISTRATION_KEY.length < 32) {
    issues.push('❌ SYNC_REGISTRATION_KEY is missing or too short (minimum 32 characters)')
  }

  if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32) {
    issues.push('❌ NEXTAUTH_SECRET is missing or too short (minimum 32 characters)')
  }

  if (!env.SYNC_NODE_ID || env.SYNC_NODE_ID.length < 8) {
    issues.push('⚠️  SYNC_NODE_ID is missing or too short')
  }

  if (!env.SYNC_NODE_NAME || env.SYNC_NODE_NAME.trim() === '') {
    issues.push('⚠️  SYNC_NODE_NAME is missing')
  }

  if (issues.length > 0) {
    console.log('⚠️  CONFIGURATION ISSUES FOUND:')
    console.log('─────────────────────────────────────────────────────────')
    issues.forEach(issue => console.log(`  ${issue}`))
    console.log('')
  } else {
    console.log('✅ All critical settings are properly configured!')
    console.log('')
  }

  console.log('💡 TROUBLESHOOTING TIPS:')
  console.log('─────────────────────────────────────────────────────────')
  console.log('  • Both servers MUST have the same NEXTAUTH_SECRET')
  console.log('  • Both servers MUST have the same SYNC_REGISTRATION_KEY')
  console.log('  • Each server MUST have a unique SYNC_NODE_ID and SYNC_NODE_NAME')
  console.log('  • Check firewall allows UDP 5353 and TCP 8765')
  console.log('  • Verify both servers are on the same network')
  console.log('  • Run "npm run service:status" on both servers')
  console.log('═══════════════════════════════════════════════════════\n')
}

verifyConfiguration()
